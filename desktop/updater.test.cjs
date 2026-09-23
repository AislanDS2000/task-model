const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createUpdater } = require('./updater.cjs');

function setup(answers = []) {
  const autoUpdater = new EventEmitter();
  const messages = [];
  const app = { isQuitting: false, getVersion: () => '0.3.0' };
  autoUpdater.checkForUpdates = async () => autoUpdater.emit('update-not-available');
  autoUpdater.downloadUpdate = async () => autoUpdater.emit('update-downloaded');
  autoUpdater.quitAndInstall = () => { autoUpdater.installs = (autoUpdater.installs || 0) + 1; };
  const updater = createUpdater({ app, autoUpdater, win: { isDestroyed: () => false }, dialog: {
    async showMessageBox(_, options) { messages.push(options.message); return { response: answers.shift() ?? options.cancelId }; }
  } });
  return { updater, autoUpdater, app, messages };
}

test('manual check reports the current version without downloading', async () => {
  const { updater, autoUpdater, messages } = setup();
  await updater.check(true);
  assert.equal(messages[0], 'Você já está na versão mais recente');
  assert.equal(autoUpdater.autoDownload, false);
  assert.equal(autoUpdater.autoInstallOnAppQuit, false);
});

test('an update needs separate download and installation approval', async () => {
  const { updater, autoUpdater, app, messages } = setup([0, 1, 0]);
  autoUpdater.checkForUpdates = async () => autoUpdater.emit('update-available', { version: '0.4.0' });
  await updater.check();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(autoUpdater.installs || 0, 0);
  assert.equal(app.isQuitting, false);
  await updater.check(true);
  assert.equal(autoUpdater.installs, 1);
  assert.equal(app.isQuitting, true);
  assert.deepEqual(messages, ['Versão 0.4.0 disponível', 'Atualização pronta para instalar', 'Atualização pronta para instalar']);
});

test('declining the download does not install anything', async () => {
  const { updater, autoUpdater, app } = setup([1]);
  autoUpdater.checkForUpdates = async () => autoUpdater.emit('update-available', { version: '0.4.0' });
  await updater.check();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(autoUpdater.installs || 0, 0);
  assert.equal(app.isQuitting, false);
});
