const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const START_DELAY_MS = 30 * 1000;

function createUpdater({ app, win, dialog, autoUpdater }) {
  let interval;
  let startDelay;
  let checking = false;
  let downloading = false;
  let downloaded = false;
  let manualCheck = false;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;

  async function ask(message, detail, buttons) {
    if (win.isDestroyed()) return buttons.length - 1;
    const result = await dialog.showMessageBox(win, {
      type: 'info', title: 'Atualização do Task Model', message, detail,
      buttons, defaultId: buttons.length - 1, cancelId: buttons.length - 1,
      noLink: true
    });
    return result.response;
  }

  async function offerInstall() {
    if (!downloaded) return;
    if (await ask('Atualização pronta para instalar', 'O Task Model será fechado e aberto novamente. Seus dados locais serão mantidos.', ['Instalar agora', 'Depois']) !== 0) return;
    app.isQuitting = true; // A janela normalmente é apenas recolhida à bandeja.
    autoUpdater.quitAndInstall(false, true);
  }

  autoUpdater.on('update-available', async info => {
    checking = false;
    const requested = manualCheck;
    manualCheck = false;
    if (downloading || downloaded) return;
    const version = info?.version || 'nova';
    const choice = await ask(`Versão ${version} disponível`, 'Publicada no GitHub oficial do Task Model. Baixar agora? A instalação será confirmada separadamente.', ['Baixar', 'Depois']);
    if (choice !== 0) return;
    downloading = true;
    try { await autoUpdater.downloadUpdate(); }
    catch (error) {
      downloading = false;
      if (requested) await ask('Não foi possível baixar a atualização', error.message, ['OK']);
    }
  });

  autoUpdater.on('update-not-available', async () => {
    checking = false;
    if (manualCheck) await ask('Você já está na versão mais recente', `Versão instalada: ${app.getVersion()}.`, ['OK']);
    manualCheck = false;
  });

  autoUpdater.on('update-downloaded', () => {
    downloading = false;
    downloaded = true;
    void offerInstall();
  });

  autoUpdater.on('error', async error => {
    checking = false;
    downloading = false;
    if (manualCheck) await ask('Não foi possível verificar atualizações', error.message, ['OK']);
    manualCheck = false;
  });

  async function check(manual = false) {
    if (downloaded) return offerInstall();
    if (checking || downloading) return;
    checking = true;
    manualCheck = manual;
    try { await autoUpdater.checkForUpdates(); }
    catch (error) {
      checking = false;
      if (manualCheck) await ask('Não foi possível verificar atualizações', error.message, ['OK']);
      manualCheck = false;
    }
  }

  return {
    check,
    start() {
      startDelay = setTimeout(() => void check(), START_DELAY_MS);
      interval = setInterval(() => void check(), CHECK_INTERVAL_MS);
    },
    stop() { clearTimeout(startDelay); clearInterval(interval); }
  };
}

module.exports = { createUpdater };
