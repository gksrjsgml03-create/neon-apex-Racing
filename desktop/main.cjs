const { app, BrowserWindow, Menu, protocol, net, session } = require('electron');
const { join, resolve, sep } = require('node:path');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([{ scheme: 'apex', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
const root = resolve(__dirname, '..');
let gameWindow;

async function createWindow() {
  gameWindow = new BrowserWindow({
    title: 'NEON APEX', width: 1366, height: 900, minWidth: 960, minHeight: 720,
    backgroundColor: '#080f20', show: false, autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  gameWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  gameWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  gameWindow.webContents.on('before-input-event', (event, input) => {
    // Ctrl/Shift are gameplay inputs; never invoke Chromium menu shortcuts.
    gameWindow.webContents.setIgnoreMenuShortcuts(input.control || input.shift);
    if (input.key === 'F11' && input.type === 'keyDown') {
      event.preventDefault();
      gameWindow.setFullScreen(!gameWindow.isFullScreen());
    }
  });
  gameWindow.once('ready-to-show', () => gameWindow.show());
  await gameWindow.loadURL('apex://game/index.html');
  // Opt-in packaged launch smoke: verify the actual renderer, then exit.
  if (process.argv.includes('--smoke-test')) {
    await gameWindow.webContents.executeJavaScript(`new Promise(resolve => {
      const deadline = performance.now() + 5000;
      function check() {
        if (document.documentElement.dataset.gameReady || performance.now() > deadline) resolve();
        else requestAnimationFrame(check);
      }
      check();
    })`);
    const result = await gameWindow.webContents.executeJavaScript(`({
      ready: document.documentElement.dataset.gameReady === 'true',
      title: document.title,
      controls: document.getElementById('guide').textContent,
      canvasWidth: document.getElementById('world').width,
      courses: document.querySelectorAll('.course').length,
      selection: document.querySelector('.course[aria-pressed="true"]')?.dataset.track
    })`);
    const sound = await gameWindow.webContents.executeJavaScript(`import('apex://game/desktop/audio-smoke.mjs').then(module => module.verifyAudio())`);
    const ok = result.ready && result.canvasWidth > 0 && result.controls.includes('CTRL') && result.courses === 5 && Object.values(sound).every(layer => layer.audibleSignal);
    require('node:fs').writeFileSync(join(app.getPath('temp'), 'neon-apex-smoke.json'), JSON.stringify({ ok, ...result, sound }, null, 2));
    app.exit(ok ? 0 : 1);
  }
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (gameWindow) { if (gameWindow.isMinimized()) gameWindow.restore(); gameWindow.focus(); } });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    protocol.handle('apex', (request) => {
      const url = new URL(request.url);
      const file = resolve(root, '.' + decodeURIComponent(url.pathname));
      if (url.host !== 'game' || !file.startsWith(root + sep)) return new Response('Forbidden', { status: 403 });
      return net.fetch(pathToFileURL(file).toString());
    });
    await createWindow();
  }).catch(error => { console.error(error); app.exit(1); });
  app.on('window-all-closed', () => app.quit());
}
