const { app, BrowserWindow, Menu, protocol, net, session, ipcMain, clipboard } = require('electron');
const { join, resolve, sep } = require('node:path');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([{ scheme: 'apex', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
const root = resolve(__dirname, '..');
let gameWindow;
let localServer;
async function hostServer(){
  if(!localServer){
    const {startServer}=await import('../online/server.js');
    localServer=await startServer({port:Number(process.env.PORT||8787)});
  }
  const addresses=Object.values(require('node:os').networkInterfaces()).flat().filter(i=>i.family==='IPv4'&&!i.internal).map(i=>`ws://${i.address}:${localServer.port}`);
  return {endpoint:`ws://127.0.0.1:${localServer.port}`,addresses};
}

async function createWindow() {
  gameWindow = new BrowserWindow({
    title: 'NEON APEX', width: 1366, height: 900, minWidth: 960, minHeight: 720,
    backgroundColor: '#080f20', show: false, autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true,preload:join(__dirname,'preload.cjs'),autoplayPolicy:'no-user-gesture-required',backgroundThrottling:false },
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
        if ((document.documentElement.dataset.gameReady && document.documentElement.dataset.musicPlaying === 'true') || performance.now() > deadline) resolve();
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
      selection: document.querySelector('.course[aria-pressed="true"]')?.dataset.track,
      renderer: document.documentElement.dataset.renderer,
      characters: document.querySelectorAll('[data-character]').length,
      karts: document.querySelectorAll('[data-kart]').length,
      modeSelection: !!document.getElementById('single-mode') && !!document.getElementById('multi-mode'),
      internetEntry: !!document.getElementById('internet-host'),
      musicPlaying: document.documentElement.dataset.musicPlaying === 'true',
      previewRemoved: !document.getElementById('sound-test'),
      boostAboveGauge: document.getElementById('boost-inventory').nextElementSibling?.classList.contains('drift-meter'),
      graphicsError: document.getElementById('world').getContext('webgl2')?.getError()
    })`);
    const sound = process.argv.includes('--audio-check') ? await gameWindow.webContents.executeJavaScript(`import('apex://game/desktop/audio-smoke.mjs').then(module => module.verifyAudio())`) : null;
    let online = null;
    if(process.argv.includes('--server-check')){
      const info=await hostServer();
      online=await gameWindow.webContents.executeJavaScript(`new Promise(resolve=>{
        const socket=new WebSocket(${JSON.stringify(info.addresses[0]||info.endpoint)});
        const timeout=setTimeout(()=>{socket.close();resolve(false);},4000);
        socket.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.type==='hello'){clearTimeout(timeout);socket.close();resolve(msg.protocol===1);}};
        socket.onerror=()=>{clearTimeout(timeout);resolve(false);};
      })`);
    }
    const ok = result.ready && result.canvasWidth > 0 && result.controls.includes('CTRL') && result.courses === 5 && result.renderer === 'webgl-3d' && result.characters === 6 && result.karts === 5 && result.graphicsError === 0 && result.modeSelection && result.musicPlaying && result.previewRemoved && result.boostAboveGauge && (!sound || Object.values(sound).every(layer => layer.audibleSignal));
    require('node:fs').writeFileSync(join(app.getPath('temp'), 'neon-apex-smoke.json'), JSON.stringify({ ok:ok&&online!==false, ...result, sound, online }, null, 2));
    app.exit(ok && online!==false && result.internetEntry ? 0 : 1);
  }
}

if (!process.argv.includes('--server')&&!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (gameWindow) { if (gameWindow.isMinimized()) gameWindow.restore(); gameWindow.focus(); } });
  app.whenReady().then(async () => {
    if(process.argv.includes('--server')){const info=await hostServer();console.log('NEON APEX server',info);return;}
    ipcMain.handle('online:host',async event=>{
      if(event.sender!==gameWindow?.webContents)throw new Error('Invalid sender');
      try{return await hostServer();}catch(error){throw new Error(error.code==='EADDRINUSE'?'8787 포트가 사용 중입니다. 실행 중인 서버 주소로 방을 만들어 주세요.':'서버를 시작하지 못했습니다.');}
    });
    ipcMain.handle('online:copy-invite',(event,text)=>{
      if(event.sender!==gameWindow?.webContents||typeof text!=='string'||text.length>1024||!text.startsWith('NEONAPEX '))return false;
      clipboard.writeText(text);return true;
    });
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
