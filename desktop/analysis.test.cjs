const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createParser, recommendations } = require('./analysis.cjs');
const { openStore } = require('./store.cjs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { observations } = require('./analysis.cjs');
const { exportSkill } = require('./skill.cjs');
const { installSkill } = require('./skill.cjs');
test('model corrections survive import and restore; manual records have no invented tokens',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tm-edit-'));const s=await openStore(dir);
 const row={id:'edit',model:'original',provider:'Codex',title:'Task',category:'Outros',input:10,output:2,cache:0,outcome:'pending'};
 s.importRows('fixture',[row]);s.saveManual({id:'edit',model:'corrected'});s.importRows('fixture',[row]);assert.equal(s.list()[0].model,'corrected');assert.equal(s.list()[0].originalModel,'original');
 s.saveManual({id:'edit',restore:true});assert.equal(s.list()[0].model,'original');
 const id=s.saveManual({model:'custom',provider:'Cursor',title:'Manual task',outcome:'first'});assert.equal(s.list().find(r=>r.id===id).input,null);assert.equal(s.list().find(r=>r.id===id).origin,'manual');s.close();
});
test('managed skill update preserves backup and rejects foreign folders',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tm-install-'));const s=await openStore(dir);const target=path.join(dir,'skills','task-model-advisor');const backups=path.join(dir,'backups');
 installSkill(target,s.exportEvidence(),backups);fs.writeFileSync(path.join(target,'personal-note.txt'),'keep');
 const result=installSkill(target,s.exportEvidence(),backups);assert.equal(fs.readFileSync(path.join(result.backup,'personal-note.txt'),'utf8'),'keep');assert.ok(fs.existsSync(path.join(target,'SKILL.md')));
 const foreign=path.join(dir,'foreign');fs.mkdirSync(foreign);assert.throws(()=>installSkill(foreign,s.exportEvidence(),backups));s.close();
});
const { createClaudeParser, createCursorParser } = require('./providers.cjs');
test('Claude separates cache accounting, deduplicates messages and preserves model IDs',()=>{
  const p=createClaudeParser('fixture');p.accept({type:'user',uuid:'u',message:{content:'Trocar título'}});
  const event={type:'assistant',timestamp:'2026-09-22',message:{id:'m',model:'future-model-123',usage:{input_tokens:10,output_tokens:4,cache_read_input_tokens:50,cache_creation_input_tokens:20}}};
  p.accept(event);p.accept(event);const [r]=p.result().rows;
  assert.equal(p.result().rows.length,1);assert.equal(r.input,80);assert.equal(r.cache,50);assert.equal(r.model,'future-model-123');
  p.accept({...event,message:{...event.message,id:'m2',usage:{input_tokens:10,output_tokens:4}}});assert.equal(p.result().rows[1].input,null);
});
test('Cursor preserves unavailable usage, deduplicates stop and never assumes success',()=>{
  const p=createCursorParser('fixture');const event={hook_event_name:'stop',conversation_id:'c',generation_id:'g',model:'any-model',status:'completed',timestamp:'2026-09-22'};
  p.accept(event);p.accept(event);const [r]=p.result().rows;assert.equal(p.result().rows.length,1);assert.equal(r.input,null);assert.equal(r.outcome,'pending');assert.equal(r.signal.state,'completed');assert.deepEqual(observations([r]),[]);
});
test('aggregates keep identical model names separate across applications',()=>{
  const row={category:'Texto',model:'same',effort:'low',input:10,output:2,cache:3,outcome:'first'};
  assert.equal(observations([{...row,provider:'Codex'},{...row,provider:'Claude Code'}]).length,2);
  assert.equal(recommendations([{...row,provider:'Codex'},{...row,provider:'Claude Code'}]).length,2);
});
test('automatic completion is not success; direct feedback stays separate', () => {
  const p = createParser('signals'); p.accept(user('Trocar título')); p.accept(context('luna')); p.accept(tokens(100, 40, 10));
  p.accept({type:'event_msg',payload:{type:'task_complete'}});
  assert.equal(p.result().rows[0].signal.state, 'completed');
  assert.equal(recommendations(p.result().rows).length, 0);
  p.accept(user('funcionou!')); assert.equal(p.result().rows[0].signal.state, 'positive');
  assert.equal(observations(p.result().rows)[0].positive, 1);
  assert.equal(p.result().rows[0].outcome, 'pending');
  const ambiguous = createParser('multi'); ambiguous.accept(user('Ajuste')); ambiguous.accept(context('luna')); ambiguous.accept(tokens(100,0,10)); ambiguous.accept(context('terra')); ambiguous.accept(tokens(150,0,15)); ambiguous.accept(user('não funcionou'));
  assert.ok(ambiguous.result().rows.every(r => !r.signal));
});
test('skill export is portable, contains aggregates and preserves existing exports', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'task-model-skill-'));
  const store = await openStore(directory);
  store.importRows('fixture', [{id:'one',title:'PRIVATE TITLE',category:'Texto',model:'luna',effort:'low',input:100,output:10,cache:40,outcome:'pending'}]);
  const folder = path.join(directory, 'task-model-advisor'); exportSkill(folder, store.exportEvidence());
  const content = fs.readFileSync(path.join(folder,'SKILL.md'),'utf8');
  assert.ok(content.startsWith('---')); assert.ok(content.includes('| Texto | luna | low | 1 | 110 |')); assert.ok(!content.includes('{{')); assert.ok(!content.includes('PRIVATE TITLE'));
  assert.ok(fs.existsSync(path.join(folder,'references/evidence.json'))); assert.throws(() => exportSkill(folder,store.exportEvidence()));
  console.log('Skill validável:', folder); store.close();
});
const user = text => ({ type: 'event_msg', timestamp: '2026-09-22T10:00:00Z', payload: { type: 'user_message', message: text } });
const context = model => ({ type: 'turn_context', payload: { model, effort: 'low' } });
const tokens = (input, cache, output, lastInput = input, lastOutput = output) => ({ type: 'event_msg', timestamp: '2026-09-22T10:01:00Z', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: input, cached_input_tokens: cache, output_tokens: output }, last_token_usage: { input_tokens: lastInput, cached_input_tokens: Math.min(cache, lastInput), output_tokens: lastOutput } } } });
test('deduplicates cumulative observations and separates model switches', () => {
  const p = createParser('one'); p.accept(user('Trocar título')); p.accept(context('luna')); p.accept(tokens(100, 30, 10)); p.accept(tokens(100, 30, 10)); p.accept(tokens(150, 40, 20)); p.accept(context('terra')); p.accept(tokens(180, 50, 25));
  const rows = p.result().rows; assert.equal(rows.length, 2); assert.equal(rows[0].input, 150); assert.equal(rows[0].output, 20); assert.equal(rows[0].cache, 40); assert.equal(rows[1].input, 30); assert.equal(rows[0].outcome, 'pending');
});
test('fork baseline does not import parent cumulative usage; resets are bounded', () => {
  const p = createParser('fork'); p.accept(user('Ajuste')); p.accept(tokens(10000, 0, 1000, 100, 5)); p.accept(tokens(50, 0, 3)); assert.equal(p.result().rows[0].input, 150); assert.equal(p.result().rows[0].output, 8);
});
test('consumption before a prompt is not attributed to a later task', () => {
  const p = createParser('two'); p.accept(tokens(100, 0, 5)); p.accept(user('Primeiro')); p.accept(tokens(150, 0, 8)); p.accept(user('Segundo')); p.accept(tokens(200, 0, 10)); assert.deepEqual(p.result().rows.map(r => r.input), [50, 50]);
});
test('desktop response_item messages work and duplicate user events do not split a task', () => {
  const p = createParser('desktop');
  p.accept({ type:'response_item', payload:{type:'message',role:'user',content:[{type:'input_text',text:'Trocar título'}]} });
  p.accept(user('Trocar título')); p.accept(context('luna')); p.accept(tokens(100, 30, 10));
  assert.equal(p.result().rows.length, 1); assert.equal(p.result().rows[0].index, 1);
});
test('recommendations exclude pending, require evidence and do not double count cache', () => {
  const row = { model: 'luna', effort: 'low', category: 'Texto', input: 100, output: 10, cache: 80, outcome: 'first' };
  assert.equal(recommendations([{ ...row, outcome: 'pending' }]).length, 0);
  assert.equal(recommendations(Array(4).fill(row))[0].eligible, false);
  const group = recommendations(Array(5).fill(row))[0]; assert.equal(group.eligible, true); assert.equal(group.medianTokens, 110);
});
test('SQLite persists evaluations, imports idempotently, preserves manual correction on new consumption', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'task-model-test-'));
  const p = createParser('sample'); p.accept(user('Trocar título')); p.accept(context('luna')); p.accept(tokens(100, 10, 5));
  let store = await openStore(directory); const rows = p.result().rows;
  store.importRows('sample', rows); store.evaluate(rows[0].id, 'first', 'Texto'); store.importRows('sample', rows); assert.equal(store.list().length, 1); assert.equal(store.list()[0].outcome, 'first'); store.close();
  store = await openStore(directory); assert.equal(store.list()[0].outcome, 'first'); store.importRows('sample', [{...rows[0], input: 200}]); assert.equal(store.list()[0].outcome, 'first'); store.evaluate(rows[0].id, 'pending'); assert.equal(store.list()[0].outcome, 'pending'); assert.ok(fs.existsSync(store.exportEvidence())); store.close();
  fs.rmSync(directory, { recursive: true });
});
