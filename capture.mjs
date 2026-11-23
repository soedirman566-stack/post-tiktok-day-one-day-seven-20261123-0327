// Deterministic frame capture for VAULTBREAK via CDP.
// Stubs the page clock (performance.now + requestAnimationFrame) before the
// game loads, then pumps fixed 30 fps steps and steers the thief along a
// waypoint path with synthetic key events. Same script + same path in both
// builds = the identical moment, frame for frame.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const [url, outDir, maxFramesArg] = process.argv.slice(2);
const MAX_FRAMES = parseInt(maxFramesArg || '400', 10);
mkdirSync(outDir, { recursive: true });

const chrome = spawn(process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell', [
  '--disable-gpu', '--no-sandbox', '--mute-audio',
  '--autoplay-policy=no-user-gesture-required',
  '--window-size=1320,950', '--remote-debugging-port=9333', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function version() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9333/json/version');
      if (res.ok) return res.json();
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('chrome did not start');
}

const { webSocketDebuggerUrl } = await version();
const ws = new WebSocket(webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let nextId = 1;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) rej(new Error(JSON.stringify(msg.error)));
    else res(msg.result);
  }
};
function send(method, params = {}, sessionId) {
  const id = nextId++;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  ws.send(JSON.stringify(payload));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);

await S('Page.enable');
await S('Runtime.enable');

const stub = `
  window.__vt = 0;
  window.__rafQ = [];
  window.requestAnimationFrame = (cb) => { window.__rafQ.push(cb); return window.__rafQ.length; };
  performance.now = () => window.__vt;
  window.__pump = (n, stepMs) => {
    for (let i = 0; i < n; i++) {
      window.__vt += stepMs;
      const q = window.__rafQ; window.__rafQ = [];
      for (const cb of q) cb(window.__vt);
    }
  };
`;
await S('Page.addScriptToEvaluateOnNewDocument', { source: stub });
await S('Page.navigate', { url });

async function evalJs(expression) {
  const r = await S('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('page error: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
}

// wait for the game object
for (let i = 0; i < 100; i++) {
  if (await evalJs('!!window.__vaultbreak')) break;
  await sleep(100);
}

const driver = `
  window.__held = new Set();
  window.__wp = [
    [140, 420], [500, 420], [500, 380], [700, 380], [700, 340],
    [780, 340], [780, 420], [900, 420], [900, 580], [1140, 580],
    [1140, 660], [1212, 660]
  ];
  window.__wpi = 0;
  window.__setKeys = (want) => {
    for (const c of [...window.__held]) if (!want.has(c)) {
      dispatchEvent(new KeyboardEvent('keyup', { code: c })); window.__held.delete(c);
    }
    for (const c of want) if (!window.__held.has(c)) {
      dispatchEvent(new KeyboardEvent('keydown', { code: c })); window.__held.add(c);
    }
  };
  window.__step = () => {
    const g = window.__vaultbreak, p = g.player;
    const want = new Set();
    if (g.state === 'play' && window.__wpi < window.__wp.length) {
      const t = window.__wp[window.__wpi];
      const dx = t[0] - p.x, dy = t[1] - p.y;
      if (Math.hypot(dx, dy) < 9) window.__wpi++;
      else if (Math.abs(dx) > 6) want.add(dx > 0 ? 'KeyD' : 'KeyA');
      else if (Math.abs(dy) > 6) want.add(dy > 0 ? 'KeyS' : 'KeyW');
    }
    window.__setKeys(want);
    window.__pump(1, 1000 / 30);
    return { x: Math.round(p.x), y: Math.round(p.y), state: g.state,
             alarm: Math.round(g.alarm), wp: window.__wpi,
             loot: g.lootValue, time: g.time.toFixed(1) };
  };
  window.__shot = () => document.getElementById('game').toDataURL('image/jpeg', 0.87);
  'driver-injected';
`;
await evalJs(driver);

let captured = 0;
let lastInfo = null;
for (let f = 0; f < MAX_FRAMES; f++) {
  lastInfo = await evalJs('window.__step()');
  if (f % 2 === 0) {
    const data = await evalJs('window.__shot()');
    const b64 = data.split(',')[1];
    writeFileSync(`${outDir}/f${String(captured).padStart(4, '0')}.jpg`, Buffer.from(b64, 'base64'));
    captured++;
  }
  if (f % 60 === 0 || lastInfo.state !== 'play') {
    console.log(`frame ${f}`, JSON.stringify(lastInfo));
  }
  if (lastInfo.state !== 'play') { console.log('STOP state=', lastInfo.state); break; }
  if (lastInfo.wp >= 12 && f > 60) { console.log('STOP path done'); break; }
}
console.log('captured', captured, 'frames; last:', JSON.stringify(lastInfo));
ws.close();
chrome.kill();
process.exit(0);
