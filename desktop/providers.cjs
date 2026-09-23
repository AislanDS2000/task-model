const fs = require('node:fs');
const readline = require('node:readline');
const crypto = require('node:crypto');
const { classify } = require('./analysis.cjs');
const count = n => Number.isFinite(n) && n >= 0 ? n : null;
const sum = values => values.every(n => n !== null) ? values.reduce((a,b)=>a+b,0) : null;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function createClaudeParser(source) {
  let prompt = null;
  const messages = new Map();
  return {
    accept(e) {
      const m=e.message;
      if (e.type==='user' && m && !e.isMeta) {
        const text=typeof m.content==='string' ? m.content : (m.content || []).filter(c=>c.type==='text').map(c=>c.text).join('\n');
        if(text) prompt={title:text.slice(0,220),category:classify(text),id:e.uuid || hash(text)};
      }
      if(e.type!=='assistant' || !prompt || !m?.id || !m.usage || !m.model || m.model==='<synthetic>') return;
      const u=m.usage, cache=count(u.cache_read_input_tokens), write=count(u.cache_creation_input_tokens), raw=count(u.input_tokens);
      // Anthropic reports cache reads/writes separately from uncached input.
      const input=sum([raw,cache,write]);
      messages.set(m.id,{id:hash(`Claude Code:${source}:${m.id}`),provider:'Claude Code',title:prompt.title,category:prompt.category,model:m.model,effort:'não informado',input,output:count(u.output_tokens),cache,cacheWrite:write,calls:1,outcome:'pending',updated:e.timestamp,context:0,contextLimit:0,measurement:'Mensagem do Claude Code; entrada inclui cache lido e criado.'});
    },
    result(){return {rows:[...messages.values()]};}
  };
}
function createCursorParser(source) {
  const rows=new Map();
  return {
    accept(e) {
      if(e.hook_event_name!=='stop' || !e.conversation_id || !e.generation_id) return;
      const id=hash(`Cursor:${e.conversation_id}:${e.generation_id}`);
      // The documented stop contract does not guarantee token usage semantics.
      rows.set(id,{id,provider:'Cursor',title:'Etapa do Cursor',category:'Outros',model:e.model || e.model_id || 'Não informado pelo Cursor',effort:'não informado',input:null,output:null,cache:null,calls:1,outcome:'pending',updated:e.timestamp,context:0,contextLimit:0,measurement:'Evento stop do Cursor. Tokens não disponíveis neste conector.',signal:{state:e.status==='completed'?'completed':'interrupted',reason:'Estado de execução informado pelo Cursor; não confirma o resultado da tarefa.'}});
    },
    result(){return {rows:[...rows.values()]};}
  };
}
async function parseProviderFile(file, provider) {
  const parser=provider==='Claude Code'?createClaudeParser(file):createCursorParser(file);
  const lines=readline.createInterface({input:fs.createReadStream(file,{encoding:'utf8'}),crlfDelay:Infinity});
  for await(const line of lines){let event;try{event=JSON.parse(line);}catch{continue;}parser.accept(event);}
  return parser.result();
}
module.exports={createClaudeParser,createCursorParser,parseProviderFile};
