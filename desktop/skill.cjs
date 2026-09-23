const fs = require('node:fs');
const path = require('node:path');
function exportSkill(folder, evidencePath) {
  if (fs.existsSync(folder)) throw Error('Já existe uma skill nessa pasta. Escolha outra pasta para preservar a versão anterior.');
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const safe = value => String(value).replace(/[|\r\n<>`]/g, ' ').slice(0, 80);
  const lines = ['Resumo exportado em ' + evidence.generatedAt + '.', '', '| Categoria | Modelo exato | Esforço | Etapas | Mediana de tokens | Aplicativo |', '|---|---|---|---:|---:|---|'];
  for (const g of (evidence.observations || []).slice(0, 15)) lines.push(`| ${safe(g.category)} | ${safe(g.model)} | ${safe(g.effort)} | ${g.count} | ${Math.round(g.medianTokens)} | ${safe(g.provider || 'Codex')} |`);
  if (!evidence.observations?.length) lines.push('', 'Ainda não há consumo importado.');
  lines.push('', 'Esses números medem consumo, não qualidade. Dificuldade ainda não foi medida.');
  const eligible = (evidence.groups || []).filter(g => g.eligible);
  lines.push('', eligible.length ? 'Combinações com evidência inicial de resultado:' : 'Ainda não há combinações com avaliações suficientes para recomendar por qualidade.');
  for (const g of eligible.slice(0, 15)) lines.push(`- ${safe(g.provider || 'Codex')} / ${safe(g.category)}: ${safe(g.model)} / ${safe(g.effort)} — ${g.count} avaliações, ${Math.round(g.successRate*100)}% de sucesso, mediana ${Math.round(g.medianTokens)} tokens. Comparabilidade limitada.`);
  const template = fs.readFileSync(path.join(__dirname, '../skills/task-model-advisor/SKILL.md'), 'utf8');
  fs.mkdirSync(path.join(folder, 'references'), {recursive:true});
  fs.copyFileSync(evidencePath, path.join(folder, 'references/evidence.json'));
  fs.writeFileSync(path.join(folder, 'SKILL.md'), template.replaceAll('{{EVIDENCE_PATH}}', evidencePath.replaceAll('\\','/')).replace('{{HISTORY_SUMMARY}}', lines.join('\n')));
  fs.writeFileSync(path.join(folder,'task-model.json'),JSON.stringify({owner:'task-model',name:'task-model-advisor',version:1,generatedAt:evidence.generatedAt}));
  return folder;
}
function installSkill(folder,evidencePath,backupRoot) {
  if(fs.existsSync(folder)) {
    if(fs.lstatSync(folder).isSymbolicLink()) throw Error('Destino é um link; atualização recusada.');
    const marker=path.join(folder,'task-model.json');
    if(!fs.existsSync(marker) || JSON.parse(fs.readFileSync(marker,'utf8')).owner!=='task-model') throw Error('Pasta não gerenciada pelo Task Model. Preserve-a ou escolha outro destino.');
  }
  const staging=folder+'.staging-'+require('node:crypto').randomUUID();
  exportSkill(staging,evidencePath);
  let backup=null;
  if(fs.existsSync(folder)) {fs.mkdirSync(backupRoot,{recursive:true});backup=path.join(backupRoot,'task-model-advisor-'+Date.now());fs.cpSync(folder,backup,{recursive:true,dereference:false});
    // Exact managed target, verified above; backup exists before replacement.
    fs.rmSync(folder,{recursive:true});
  }
  try {fs.renameSync(staging,folder);} catch(error) {if(backup && !fs.existsSync(folder))fs.cpSync(backup,folder,{recursive:true});throw error;}
  return {folder,backup};
}
module.exports = { exportSkill, installSkill };
