const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { openStore } = require('./store.cjs');
const { parseFile, categories, recommendations, observations } = require('./analysis.cjs');
const { exportSkill, installSkill } = require('./skill.cjs');
const { parseProviderFile } = require('./providers.cjs');
let win, tray, store, timer, busy = false, error = '', lastScan = null, fileCount = 0;
const seen = new Map();
const compact = process.argv.includes('--compact');
const smoke = process.argv.includes('--smoke-test');
if (smoke) app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'task-model-smoke-')));
else if (process.argv.includes('--preview')) app.setPath('userData', path.join(app.getPath('appData'), 'task-model-preview'));
const page = path.join(__dirname, '../dist/index.html');
async function filesIn(dir, provider = 'Codex') {
  const result = [];
  for (const entry of await fs.promises.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'subagents') result.push(...await filesIn(p, provider));
    else if (entry.isFile() && (provider !== 'Codex' || entry.name.startsWith('rollout-')) && entry.name.endsWith('.jsonl')) {
      const stat = await fs.promises.stat(p); result.push({ p, stamp: `${stat.mtimeMs}:${stat.size}`, time: stat.mtimeMs });
    }
  }
  return result;
}
async function scan() {
  if (busy || store.setting('paused')) return;
  busy = true; error = '';
  try {
    const files = [];
    for (const [provider,key] of [['Codex','sessions'],['Claude Code','claudeSessions'],['Cursor','cursorSessions']]) {
      const folder=store.setting(key); if (!folder) continue;
      try { files.push(...(await filesIn(folder,provider)).sort((a,b)=>b.time-a.time).slice(0,200).map(f=>({...f,provider}))); }
      catch { error += provider + ': pasta indisponível. '; }
    }
    fileCount = files.length;
    for (const file of files) {
      if (seen.get(file.p) === file.stamp) continue;
      const parsed = file.provider === 'Codex' ? await parseFile(file.p) : await parseProviderFile(file.p,file.provider); store.importRows(file.p, parsed.rows);
      const oldQuota = store.setting('quota');
      if (parsed.quota && (!oldQuota || parsed.quota.observedAt > oldQuota.observedAt)) store.setting('quota', parsed.quota);
      seen.set(file.p, file.stamp);
    }
    lastScan = new Date().toISOString(); store.exportEvidence();
  } catch { error = 'Não foi possível ler a pasta. Confira o caminho e tente conectar novamente.'; }
  finally { busy = false; }
}
function mode(value) {
  const bounds = screen.getPrimaryDisplay().workArea;
  win.setAlwaysOnTop(value); win.setMinimumSize(value ? 340 : 780, value ? 430 : 600);
  win.setSize(value ? 390 : Math.min(1100, bounds.width), value ? Math.min(670, bounds.height) : Math.min(800, bounds.height));
  if (value) win.setPosition(bounds.x + bounds.width - 410, bounds.y + Math.max(0, bounds.height - 690));
  else win.center();
  win.loadFile(page, { hash: value ? 'companion' : 'companion-full' }); if (!smoke) win.show();
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { win?.show(); win?.focus(); });
  app.whenReady().then(async () => {
    store = await openStore(app.getPath('userData'));
    const defaultSessions = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions');
    if (!smoke && !store.setting('sessions') && fs.existsSync(defaultSessions)) store.setting('sessions', defaultSessions);
    for (const [key,folder] of [['claudeSessions',path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(),'.claude'),'projects')],['cursorSessions',path.join(os.homedir(),'.task-model','cursor')]]) {
      if (!smoke && !store.setting(key) && fs.existsSync(folder)) store.setting(key,folder);
    }
    if (smoke) {
      store.setting('sessions', 'fixture'); store.setting('paused', true);
      store.importRows('fixture', [{ id:'fixture', title:'Trocar o título da página inicial', model:'gpt-6-luna', effort:'low', category:'Texto', input:12400, output:320, cache:10400, calls:2, context:6200, contextLimit:128000, outcome:'pending', updated:new Date().toISOString() }]);
    }
    Menu.setApplicationMenu(null);
    app.setAppUserModelId('app.taskmodel.companion');
    win = new BrowserWindow({ width: 1100, height: 800, show: false, frame: true, autoHideMenuBar: true, icon: path.join(__dirname, '../public/brand/task-model-mark.png'), title: 'Task Model', backgroundColor: '#f3f5fa',
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event, url) => { if (url.split('#')[0] !== pathToFileURL(page).href) event.preventDefault(); });
    win.on('close', event => { if (!app.isQuitting) { event.preventDefault(); win.hide(); } });
    const image = nativeImage.createFromPath(path.join(__dirname, '../public/brand/task-model-mark.png')).resize({ width: 24, height: 24 });
    tray = new Tray(image); tray.setToolTip('Task Model — histórico local');
    tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Janela compacta', click: () => mode(true) }, { label: 'Abrir painel', click: () => mode(false) }, { type: 'separator' }, { label: 'Sair', click: () => { app.isQuitting = true; app.quit(); } }]));
    tray.on('click', () => win.isVisible() ? win.hide() : win.show());
    ipcMain.handle('tm:snapshot', () => ({ rows: store.list(), observations: observations(store.list()), groups: recommendations(store.list()), quota: store.setting('quota'), connected: !!(store.setting('sessions') || store.setting('claudeSessions') || store.setting('cursorSessions')), paused: !!store.setting('paused'), busy, error, lastScan, fileCount, categories }));
    ipcMain.handle('tm:connect', async (_, provider = 'Codex') => {
      const keys={'Codex':'sessions','Claude Code':'claudeSessions','Cursor':'cursorSessions'};
      if (!keys[provider]) throw Error('Origem inválida');
      const selected = await dialog.showOpenDialog(win, { title: provider === 'Cursor' ? 'Selecione a pasta de eventos do hook Task Model' : 'Selecione a pasta ' + (provider === 'Codex' ? 'sessions do Codex' : 'projects do Claude Code'), properties: ['openDirectory'] });
      if (!selected.canceled) { store.setting(keys[provider], selected.filePaths[0]); store.setting('paused', false); seen.clear(); void scan(); }
    });
    ipcMain.handle('tm:pause', () => store.setting('paused', !store.setting('paused')));
    ipcMain.handle('tm:evaluate', (_, data) => {
      if (typeof data?.id !== 'string' || (data.category && !categories.includes(data.category))) throw Error('Dados inválidos');
      store.evaluate(data.id, data.outcome, data.category); store.exportEvidence();
    });
    ipcMain.handle('tm:compact', (_, value) => mode(value === true));
    ipcMain.handle('tm:hide', () => win.hide());
    ipcMain.handle('tm:minimize', () => win.minimize());
    ipcMain.handle('tm:skill', async () => {
      const selected = await dialog.showOpenDialog(win, { title: 'Pasta de skills do agente (será criada task-model-advisor)', properties: ['openDirectory', 'createDirectory'] });
      if (selected.canceled) return null;
      const folder = path.join(selected.filePaths[0], 'Task-Model-Advisor-v1-' + new Date().toISOString().replace(/[:.]/g,'-'), 'task-model-advisor');
      return exportSkill(folder, store.exportEvidence());
    });
    ipcMain.handle('tm:manual',(_,data)=>{if(!data || typeof data!=='object')throw Error('Dados inválidos');const id=store.saveManual(data);store.exportEvidence();return id;});
    ipcMain.handle('tm:install-skill',async()=>{
      const appChoice=await dialog.showMessageBox(win,{type:'question',message:'Instalar ou atualizar Task Model — Orientador de modelos',detail:'Escolha o aplicativo. Nenhum modelo será trocado automaticamente.',buttons:['Codex','Claude Code','Cursor','Cancelar'],cancelId:3});
      if(appChoice.response===3)return null;
      const scope=await dialog.showMessageBox(win,{message:'Onde disponibilizar a skill?',buttons:['Pessoal neste computador','Somente em um projeto','Cancelar'],cancelId:2});if(scope.response===2)return null;
      let root=os.homedir();
      if(scope.response===1){const selected=await dialog.showOpenDialog(win,{title:'Selecione o projeto',properties:['openDirectory']});if(selected.canceled)return null;root=selected.filePaths[0];}
      const dirs=['.agents','.claude','.cursor'];
      const folder=path.join(root,dirs[appChoice.response],'skills','task-model-advisor');
      const confirm=await dialog.showMessageBox(win,{message:'Confirmar instalação/atualização?',detail:folder+'\nA versão gerenciada anterior será preservada em backup. Recarregue as skills no agente após concluir.',buttons:['Confirmar','Cancelar'],defaultId:1,cancelId:1});if(confirm.response!==0)return null;
      const result=installSkill(folder,store.exportEvidence(),path.join(app.getPath('userData'),'skill-backups'));
      return result.folder;
    });
    if (smoke) {
      const failures = [];
      win.webContents.on('console-message', details => { if (details.level === 'error') failures.push(details.message); });
      win.webContents.once('did-finish-load', async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 1800));
          const initial = await win.webContents.executeJavaScript('document.body.innerText');
          if (!initial.includes('Trocar o título') || !initial.includes('12,7')) throw Error('Dados não renderizados');
          await win.webContents.executeJavaScript("Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Corrigir resultado').click()");
          await new Promise(resolve => setTimeout(resolve, 100));
          await win.webContents.executeJavaScript("Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'De primeira').click()");
          await new Promise(resolve => setTimeout(resolve, 500));
          if (store.list()[0].outcome !== 'first') throw Error('Avaliação não persistida');
          fs.mkdirSync(path.join(process.cwd(), 'release'), {recursive:true});
          fs.writeFileSync(path.join(process.cwd(), 'release/companion-smoke.png'), (await win.webContents.capturePage()).toPNG());
          await win.webContents.executeJavaScript("Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Aprendizados').click()");
          await new Promise(resolve => setTimeout(resolve, 300));
          await win.webContents.executeJavaScript("Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Tarefas').click()");
          await new Promise(resolve => setTimeout(resolve, 150));
          const insights = await win.webContents.executeJavaScript('document.body.innerText');
          if (!insights.includes('Onde seus tokens estão indo')) throw Error('Aprendizados automáticos ausentes');
          fs.writeFileSync(path.join(process.cwd(), 'release/insights-smoke.png'), (await win.webContents.capturePage()).toPNG());
          await win.webContents.executeJavaScript("Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Sugestões').click()");
          await new Promise(resolve => setTimeout(resolve, 150));
          const suggestions = await win.webContents.executeJavaScript('document.body.innerText');
          if (!suggestions.includes('Sugestões por tarefa') || !suggestions.includes('Task Model — Orientador de modelos')) throw Error('Sugestões locais ausentes');
          if (failures.length) throw Error(failures.join('; '));
          console.log('SMOKE OK: renderer, preload, SQLite, avaliação e captura.'); app.isQuitting = true; app.exit(0);
        } catch (err) { console.error(err); app.isQuitting = true; app.exit(1); }
      });
    }
    mode(compact); if (!smoke) { void scan(); timer = setInterval(scan, 15000); }
  }).catch(err => { dialog.showErrorBox('Task Model', `Não foi possível abrir o banco local: ${err.message}`); app.quit(); });
  app.on('before-quit', () => { app.isQuitting = true; clearInterval(timer); });
}
