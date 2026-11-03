// On-TV check through the web inspector that `aerotizen inspect TvHome0001.Home` forwards to
// localhost:9222. Reports page errors and app state, steps through every style with remote
// key events, and saves a real screenshot of each.
// Usage: node tools/tv-check.mjs <out-dir>
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || '.';
const [target] = await (await fetch('http://localhost:9222/json')).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const problems = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') problems.push('exception: ' + msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') problems.push('console: ' + msg.params.args.map(a => a.value ?? a.description).join(' '));
};
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value;
const KEYS = { up: 38, down: 40, left: 37, right: 39, enter: 13 };
async function press(name, times = 1) {
  for (let i = 0; i < times; i++) {
    for (const type of ['rawKeyDown', 'keyUp']) {
      await send('Input.dispatchKeyEvent', { type, windowsVirtualKeyCode: KEYS[name], nativeVirtualKeyCode: KEYS[name] });
    }
    await sleep(120);
  }
}

await send('Runtime.enable');
await send('Page.enable');
await send('Performance.enable');
// Keys sent before the app list loads are lost, so wait for the first build.
for (let i = 0; i < 40 && !/^style-/.test(await evaluate('document.body.className') || ''); i++) await sleep(500);
await sleep(Number(process.env.SETTLE_MS || 1000));
console.log('state', JSON.stringify(await evaluate(`({
  style: document.body.className,
  apps: [].map.call(document.querySelectorAll('.tile .name, .item'), n => n.firstChild && n.firstChild.textContent),
  tmdb: TH.art.live, tizen: !!window.tizen, ua: navigator.userAgent.slice(0, 120)
})`)));

const styles = ['marquee', 'shelf', 'wall', 'cast'];
const start = await evaluate('document.body.className');
for (let i = 0; i < styles.length; i++) {
  await press('up', 8); await press('left', 6); await press('right', i); await press('enter');
  await press('down');
  await sleep(1600);
  const t0 = Date.now();
  await press('right');
  const lag = Date.now() - t0;
  await sleep(900);
  // Smoothness while idle on this style: frames drawn in 3 s and frames that took over 50 ms.
  const frames = (await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `new Promise(r => {
    let n = 0, slow = 0, last = performance.now(); const end = last + 3000;
    (function tick(t) { n++; if (t - last > 50) slow++; last = t; t < end ? requestAnimationFrame(tick) : r({ n, slow }); })(last);
  })` })).result?.result?.value;
  const heap = (await send('Performance.getMetrics')).result?.metrics?.find((m) => m.name === 'JSHeapUsedSize')?.value;
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
  if (shot.result?.data) writeFileSync(join(out, `tv-real-${i + 1}-${styles[i]}.jpg`), Buffer.from(shot.result.data, 'base64'));
  console.log(styles[i], 'body:', await evaluate('document.body.className'), 'key round trip ms:', lag, 'fps:', frames && Math.round(frames.n / 3), 'slow frames:', frames && frames.slow, 'heap MB:', heap && (heap / 1048576).toFixed(1), shot.result ? 'shot ok' : 'shot failed ' + JSON.stringify(shot.error));
}
// Leave the TV on the style it started with.
const back = styles.indexOf((start || '').replace('style-', '').split(' ')[0]);
await press('up', 8); await press('left', 6); await press('right', Math.max(0, back)); await press('enter'); await press('down');
console.log(problems.length ? problems.join('\n') : 'no page errors');
ws.close();
