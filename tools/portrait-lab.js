#!/usr/bin/env node
/* Portrait lab: renders portraits from src/art/portrait-art.js in headless Chromium and writes a contact sheet.
 * usage: node tools/portrait-lab.js out.png "nagi:neutral,rin:angry,proc:p12:neutral" [scale] [cols]
 * (needs the pre-installed Playwright; set NODE_PATH to the global node_modules if required) */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const out = process.argv[2] || 'lab.png', list = (process.argv[3] || 'nagi:neutral').split(','), scale = Number(process.argv[4] || 3), cols = Number(process.argv[5] || 8);
const code = ['src/art/sprite-renderer.js', 'src/art/character-appearances.js', 'src/art/portrait-art.js', 'src/art/portrait-kit.js', 'src/art/portrait-named.js', 'src/art/portrait-proc.js'].filter(f => fs.existsSync(path.join(ROOT, f))).map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1800, height: 1200 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.setContent('<html><body style="margin:0;background:#0b1220"></body></html>');
  await pg.addScriptTag({ content: code });
  const r = await pg.evaluate(async ({ list, scale, cols }) => {
    const PA = EW.portraitArt, wrap = document.createElement('div');
    wrap.id = 'sheet'; wrap.style.cssText = 'display:grid;grid-template-columns:repeat(' + cols + ',auto);gap:8px;padding:10px;background:#0b1220;width:max-content';
    for (const item of list) {
      const parts = item.split(':'); let id, ex;
      if (parts[0] === 'proc') { id = 'proc:' + parts[1]; ex = parts[2] || 'neutral'; } else if (parts[0] === 'old') { id = 'old:' + parts[1]; ex = parts[2] || 'neutral'; } else { id = parts[0]; ex = parts[1] || 'neutral'; }
      let url = '';
      if (id.startsWith('old:')) { const k = id.slice(4); const A = EW.appearances; const a = k.startsWith('p') && !A.NAMED[k] ? A.procedural(k) : A.NAMED[k]; url = EW.sprites.portrait(a, ex, A.kitFor('Blue Lock')); }
      else url = await PA.render(id, ex);
      const d = document.createElement('div'); d.style.cssText = 'color:#9ab;font:11px sans-serif;text-align:center';
      const isOld = id.startsWith('old:');
      d.innerHTML = '<img src="' + url + '" style="image-rendering:pixelated;display:block;width:' + (96 * scale) + 'px;height:' + (128 * scale) + 'px;background:' + (isOld ? '#1a2740' : PA.backdrop(id)) + ';object-fit:contain"><span>' + item + '</span>';
      wrap.appendChild(d);
    }
    document.body.appendChild(wrap); const bb = wrap.getBoundingClientRect(); return { w: bb.width, h: bb.height };
  }, { list, scale, cols });
  await pg.setViewportSize({ width: Math.ceil(r.w) + 20, height: Math.ceil(r.h) + 20 });
  await pg.locator('#sheet').screenshot({ path: out });
  if (errs.length) console.log('errors:', errs.slice(0, 5));
  await b.close();
})();
