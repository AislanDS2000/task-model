const fs = require('node:fs');
const path = require('node:path');
const initSqlJs = require('sql.js');
const { recommendations, observations } = require('./analysis.cjs');
async function openStore(directory) {
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'task-model.sqlite');
  const SQL = await initSqlJs();
  const db = fs.existsSync(file) ? new SQL.Database(fs.readFileSync(file)) : new SQL.Database();
  db.run('CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, source TEXT NOT NULL, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  function query(sql, values = []) { const statement = db.prepare(sql); try { statement.bind(values); const out = []; while (statement.step()) out.push(statement.getAsObject()); return out; } finally { statement.free(); } }
  function persist() { const tmp = `${file}.tmp`; fs.writeFileSync(tmp, db.export()); fs.renameSync(tmp, file); }
  function list() { return query('SELECT data FROM tasks').map(r => JSON.parse(r.data)).sort((a, b) => (b.updated || '').localeCompare(a.updated || '')); }
  function setting(key, value) { if (value !== undefined) { db.run('INSERT OR REPLACE INTO settings VALUES (?, ?)', [key, JSON.stringify(value)]); persist(); } const r = query('SELECT value FROM settings WHERE key = ?', [key])[0]; return r ? JSON.parse(r.value) : null; }
  function importRows(source, rows) {
    const prior = new Map(query('SELECT data FROM tasks WHERE source = ?', [source]).map(r => { const data = JSON.parse(r.data); return [data.id, data]; }));
    db.run('BEGIN');
    try {
      for (const row of rows) {
        const old = prior.get(row.id);
        const updated = { ...row, originalModel: row.model, model: old?.manualModel || row.model, manualModel: old?.manualModel, category: old?.manualCategory || row.category, manualCategory: old?.manualCategory, outcome: old?.outcome || 'pending' };
        db.run('INSERT OR REPLACE INTO tasks VALUES (?, ?, ?)', [row.id, source, JSON.stringify(updated)]);
      }
      db.run('COMMIT'); persist();
    } catch (error) { db.run('ROLLBACK'); throw error; }
  }
  function evaluate(id, outcome, category) {
    if (!['pending', 'first', 'adjusted', 'failed'].includes(outcome)) throw Error('Resultado inválido');
    const existing = query('SELECT data FROM tasks WHERE id = ?', [id])[0];
    if (!existing) throw Error('Registro não encontrado');
    const row = JSON.parse(existing.data);
    // Category edits pass the stored outcome, never the inferred signal.
    row.outcome = outcome;
    if (category) { row.category = category; row.manualCategory = category; }
    db.run('UPDATE tasks SET data = ? WHERE id = ?', [JSON.stringify(row), id]); persist();
  }
  function exportEvidence() {
    const evidence = { schemaVersion: 2, generatedAt: new Date().toISOString(), minimumSamples: 5, difficulty: 'Não medida. Esforço de raciocínio não é dificuldade da tarefa.', scope: 'Consumo observado no histórico e resultados avaliados pelo usuário em grupos separados. Sinais automáticos não contam como sucesso confirmado.', observations: observations(list()), groups: recommendations(list()) };
    const target = path.join(directory, 'evidence.json'); const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(evidence, null, 2)); fs.renameSync(tmp, target); return target;
  }
  function saveManual(data) {
    const clean = (v,max) => typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null;
    if (data.id) {
      const existing=query('SELECT data FROM tasks WHERE id = ?',[data.id])[0];
      if(!existing) throw Error('Registro não encontrado');
      const row=JSON.parse(existing.data);
      if(data.restore){row.model=row.originalModel || row.model;delete row.manualModel;}
      else {const model=clean(data.model,120);if(!model)throw Error('Informe um modelo com até 120 caracteres');row.originalModel ||= row.model;row.model=model;row.manualModel=model;}
      db.run('UPDATE tasks SET data = ? WHERE id = ?',[JSON.stringify(row),data.id]);persist();return row.id;
    }
    const model=clean(data.model,120),title=clean(data.title,220);
    if(!model || !title || !['Codex','Claude Code','Cursor'].includes(data.provider) || !['pending','first','adjusted','failed'].includes(data.outcome)) throw Error('Confira aplicativo, modelo, tarefa e resultado');
    const id=require('node:crypto').randomUUID();
    const row={id,provider:data.provider,model,title,category:'Outros',effort:'não informado',outcome:data.outcome,input:null,output:null,cache:null,calls:0,context:0,contextLimit:0,origin:'manual',updated:new Date().toISOString(),measurement:'Registro manual; consumo não medido.'};
    db.run('INSERT INTO tasks VALUES (?, ?, ?)',[id,'manual',JSON.stringify(row)]);persist();return id;
  }
  return { list, setting, importRows, evaluate, saveManual, exportEvidence, file, close: () => db.close() };
}
module.exports = { openStore };
