const crypto = require('node:crypto');
const fs = require('node:fs');
const readline = require('node:readline');

const categories = ['Texto', 'Interface', 'Correção', 'Testes', 'Pesquisa', 'Outros'];
function classify(text) {
  if (/t[ií]tulo|texto|ortografia|copy|redigir/i.test(text)) return 'Texto';
  if (/bug|erro|corrigir|falha|debug/i.test(text)) return 'Correção';
  if (/layout|design|css|bot[aã]o|interface/i.test(text)) return 'Interface';
  if (/testar|teste|testes|validar/i.test(text)) return 'Testes';
  if (/pesquis|investig|analis/i.test(text)) return 'Pesquisa';
  return 'Outros';
}
const numeric = value => Number.isFinite(value) && value >= 0 ? value : 0;
function counters(value) {
  return { input: numeric(value?.input_tokens), cache: numeric(value?.cached_input_tokens), output: numeric(value?.output_tokens) };
}
function createParser(source) {
  let previous = null, current = null, model = 'Desconhecido', effort = 'não informado', index = 0, quota = null, lastPrompt = null;
  const rows = new Map();
  function signalCurrent(state, reason) {
    const candidates = [...rows.values()].filter(row => row.index === current?.index);
    // A reply cannot identify which model succeeded when several contributed.
    if (candidates.length === 1) candidates[0].signal = { state, reason };
  }
  return {
    accept(event) {
      const p = event.payload || {};
      if (event.type === 'turn_context') { model = p.model || model; effort = p.effort || 'não informado'; }
      const message = event.type === 'event_msg' && p.type === 'user_message' ? p.message
        : event.type === 'response_item' && p.type === 'message' && p.role === 'user' && Array.isArray(p.content)
          ? p.content.filter(c => c.type === 'input_text' || c.type === 'text').map(c => c.text || '').join('\n') : null;
      if (typeof message === 'string') {
        const text = message.replace(/<environment_context>[\s\S]*?<\/environment_context>/g, '').trim();
        const duplicate = lastPrompt && lastPrompt.text === text && lastPrompt.source !== event.type && !lastPrompt.counted;
        if (text && !/^# AGENTS\.md instructions|^<recommended_plugins>|^<permissions instructions>/.test(text) && !duplicate) {
          if (/^(?:funcionou|deu certo) (?:com|ap[oó]s) (?:os )?ajustes[.!\s]*$/i.test(text)) signalCurrent('adjusted', 'Você confirmou que funcionou após ajustes na mensagem seguinte.');
          else if (/^(?:funcionou|deu certo) de primeira[.!\s]*$/i.test(text)) signalCurrent('first', 'Você confirmou que funcionou de primeira na mensagem seguinte.');
          else if (/^(?:agora )?(?:funcionou|deu certo|ficou certo|est[aá] funcionando)[.!\s]*$/i.test(text)) signalCurrent('positive', 'Você confirmou o funcionamento na mensagem seguinte.');
          else if (/^(?:ainda )?(?:n[aã]o funcionou|n[aã]o deu certo|continua com erro)[.!\s]*$/i.test(text)) signalCurrent('negative', 'Você relatou uma falha na mensagem seguinte.');
          current = { index: ++index, title: text.slice(0, 220), category: classify(text), started: event.timestamp };
          lastPrompt = { text, source: event.type, counted: false };
        }
      }
      if (event.type === 'event_msg' && ['task_complete', 'task_aborted'].includes(p.type)) {
        const state = p.type === 'task_aborted' || p.error ? 'interrupted' : 'completed';
        const existing = [...rows.values()].find(row => row.index === current?.index)?.signal;
        if (!existing || !['positive','negative','first','adjusted'].includes(existing.state)) signalCurrent(state, state === 'completed' ? 'Codex encerrou a resposta. O funcionamento ainda não foi confirmado.' : 'A execução terminou com erro ou foi interrompida; isso não avalia a qualidade do modelo.');
      }
      if (event.type !== 'event_msg' || p.type !== 'token_count') return;
      if (p.rate_limits && (!p.rate_limits.limit_id || p.rate_limits.limit_id === 'codex')) quota = { ...p.rate_limits, observedAt: event.timestamp };
      if (!p.info?.total_token_usage) return;
      const total = counters(p.info.total_token_usage);
      // A fork may inherit a cumulative counter. The first observation uses only its last request.
      const reset = previous && (total.input < previous.input || total.output < previous.output);
      const delta = !previous || reset ? counters(p.info.last_token_usage) : {
        input: total.input - previous.input, output: total.output - previous.output,
        cache: Math.max(0, total.cache - previous.cache),
      };
      previous = total;
      if (!current || !(delta.input + delta.output)) return;
      if (lastPrompt) lastPrompt.counted = true;
      const id = crypto.createHash('sha256').update(`${source}:${current.index}:${model}:${effort}`).digest('hex');
      const row = rows.get(id) || { ...current, id, model, effort, input: 0, output: 0, cache: 0, calls: 0, outcome: 'pending', provider: 'Codex' };
      row.input += delta.input; row.output += delta.output; row.cache += Math.min(delta.input, delta.cache); row.calls++;
      row.updated = event.timestamp || row.started;
      row.context = numeric(p.info.last_token_usage?.input_tokens);
      row.contextLimit = numeric(p.info.model_context_window);
      rows.set(id, row);
    },
    result() { return { rows: [...rows.values()], quota }; },
  };
}
async function parseFile(file) {
  const parser = createParser(file);
  const stream = fs.createReadStream(file, { encoding: 'utf8' });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of lines) {
    try { parser.accept(JSON.parse(line)); } catch { /* Incomplete trailing JSONL is retried on next refresh. */ }
  }
  return parser.result();
}
function recommendations(rows, category) {
  const buckets = new Map();
  for (const row of rows) {
    if (!Number.isFinite(row.input) || !Number.isFinite(row.output) || row.outcome === 'pending' || (category && row.category !== category)) continue;
    const key = `${row.provider || 'Codex'}|${row.category}|${row.model}|${row.effort}`;
    const bucket = buckets.get(key) || { provider: row.provider || 'Codex', category: row.category, model: row.model, effort: row.effort, count: 0, success: 0, first: 0, tokens: [] };
    bucket.count++; bucket.success += row.outcome !== 'failed' ? 1 : 0; bucket.first += row.outcome === 'first' ? 1 : 0;
    bucket.tokens.push(row.input + row.output); buckets.set(key, bucket);
  }
  return [...buckets.values()].map(({ tokens, ...b }) => {
    tokens.sort((a, b) => a - b); const middle = Math.floor(tokens.length / 2);
    return { ...b, medianTokens: tokens.length % 2 ? tokens[middle] : (tokens[middle - 1] + tokens[middle]) / 2,
      successRate: b.success / b.count, eligible: b.count >= 5 && b.success / b.count >= .8 };
  }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.medianTokens - b.medianTokens);
}
function observations(rows) {
  const buckets = new Map();
  for (const row of rows) {
    const key = `${row.provider || 'Codex'}|${row.category}|${row.model}|${row.effort}`;
    if (!Number.isFinite(row.input) || !Number.isFinite(row.output) || !Number.isFinite(row.cache)) continue;
    const b = buckets.get(key) || { provider: row.provider || 'Codex', category: row.category, model: row.model, effort: row.effort, count: 0, input: 0, output: 0, cache: 0, positive: 0, negative: 0, confirmed: 0, samples: [] };
    b.count++; b.input += row.input; b.output += row.output; b.cache += row.cache;
    b.positive += row.signal?.state === 'positive' ? 1 : 0; b.negative += row.signal?.state === 'negative' ? 1 : 0;
    b.confirmed += row.outcome !== 'pending' ? 1 : 0; b.samples.push(row.input + row.output); buckets.set(key, b);
  }
  return [...buckets.values()].map(({ samples, ...b }) => { samples.sort((a,b) => a-b); const i=Math.floor(samples.length/2); return { ...b, medianTokens: samples.length%2 ? samples[i] : (samples[i-1]+samples[i])/2, cacheRate: b.input ? b.cache/b.input : 0 }; }).sort((a,b) => b.input+b.output-a.input-a.output);
}
module.exports = { categories, classify, createParser, parseFile, recommendations, observations };
