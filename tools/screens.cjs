// Desktop check: load the launcher at 1920x1080, walk each style with the arrow keys,
// fail on any page error, and save a screenshot per style.
// Usage: node tools/screens.cjs <path-to-playwright> <out-dir>
const { chromium } = require(process.argv[2]);
const path = require('path');
const out = process.argv[3];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../app/index.html'));
  await page.waitForTimeout(800);
  const styles = ['marquee', 'shelf', 'wall', 'cast'];
  for (let i = 0; i < styles.length; i++) {
    for (let k = 0; k < 3; k++) await page.keyboard.press('ArrowUp');
    for (let k = 0; k < 6; k++) await page.keyboard.press('ArrowLeft');
    for (let k = 0; k < i; k++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    if (styles[i] === 'shelf') { await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight'); }
    await page.waitForTimeout(900);
    const cls = await page.evaluate(() => document.body.className);
    if (cls.indexOf('style-' + styles[i]) < 0) errors.push('style not applied: ' + styles[i] + ' got ' + cls);
    await page.screenshot({ path: path.join(out, `tv-${i + 1}-${styles[i]}.png`) });
  }
  await browser.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log('ok', styles.length, 'styles');
})().catch(e => { console.error(e); process.exit(1); });
