/* EgoWheel — portrait art pipeline (v27 "Project Ego Portrait").
 *
 * Portraits are illustrations, not assembled sprites:
 *   1. Each named character is a bespoke vector illustration (src/art/portrait-named.js): its own head shape,
 *      jaw, neck, build, hair masses, eyes and expression set, drawn as line art + flat cel shading.
 *      Procedural footballers are built from an authored component library (src/art/portrait-proc.js).
 *   2. The illustration is rasterised at the native portrait resolution (96×128) with crisp (aliased) edges.
 *   3. A pixel cleanup pass snaps every pixel to the illustration's palette, removes stray single pixels and
 *      thins doubled line pixels, so the result is clean pixel art rather than a blurred downscale.
 *   4. Results are cached (memory) and named characters can be prebuilt to PNG sprite sheets
 *      (tools/build-portraits.js → assets/portraits/<id>.png, one 96×128 frame per expression), which are
 *      preferred at runtime. An artist can replace any sheet with hand-made art of the same layout.
 * Browser-only (needs canvas + SVG image decoding). Without it, callers fall back to EW.sprites.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const W = 96, H = 128;
  const EXPRESSIONS = ['neutral', 'focused', 'confident', 'angry', 'frustrated', 'smirk', 'surprised', 'defeated', 'elated', 'flow'];
  // Requests from older code map onto the art set.
  const ALIAS = { intense: 'focused', bored: 'neutral', manic: 'elated' };

  // ---------- SVG helpers (shared by named + procedural art) ----------
  const f2 = n => Math.round(n * 100) / 100;
  function path(d, fill, o) {
    o = o || {};
    return '<path d="' + d + '" fill="' + (fill || 'none') + '"' + (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + (o.w || 1) + '" stroke-linecap="round" stroke-linejoin="round"' : '') + (o.clip ? ' clip-path="url(#' + o.clip + ')"' : '') + (o.op != null ? ' opacity="' + o.op + '"' : '') + (o.rule ? ' fill-rule="' + o.rule + '"' : '') + '/>';
  }
  function ellipse(cx, cy, rx, ry, fill, o) { o = o || {}; return '<ellipse cx="' + f2(cx) + '" cy="' + f2(cy) + '" rx="' + f2(rx) + '" ry="' + f2(ry) + '" fill="' + fill + '"' + (o.clip ? ' clip-path="url(#' + o.clip + ')"' : '') + (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + (o.w || 1) + '"' : '') + '/>'; }
  function rect(x, y, w, h, fill, o) { o = o || {}; return '<rect x="' + f2(x) + '" y="' + f2(y) + '" width="' + f2(w) + '" height="' + f2(h) + '" fill="' + fill + '"' + (o.clip ? ' clip-path="url(#' + o.clip + ')"' : '') + '/>'; }
  function group(body, t) { return '<g' + (t ? ' transform="' + t + '"' : '') + '>' + body + '</g>'; }
  function clip(id, d) { return '<clipPath id="' + id + '"><path d="' + d + '"/></clipPath>'; }
  function svg(body, defs) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" shape-rendering="crispEdges"><defs>' + (defs || '') + '</defs>' + body + '</svg>'; }

  // Colour utilities
  function hex2rgb(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb2hex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }

  // ---------- rasterise + pixel cleanup ----------
  function canDraw() { try { const c = root.document && root.document.createElement('canvas'); return !!(c && c.getContext && c.getContext('2d') && typeof root.Image === 'function' && typeof c.toDataURL === 'function'); } catch (_) { return false; } }
  function paletteOf(svgStr) { const set = new Set((svgStr.match(/#[0-9a-fA-F]{6}\b/g) || []).map(s => s.toLowerCase())); return [...set].map(h => ({ h, rgb: hex2rgb(h) })); }
  function snap(rgb, pal) { let best = pal[0], bd = 1e9; for (const p of pal) { const d = (p.rgb[0] - rgb[0]) ** 2 * 0.3 + (p.rgb[1] - rgb[1]) ** 2 * 0.59 + (p.rgb[2] - rgb[2]) ** 2 * 0.11; if (d < bd) { bd = d; best = p; } } return best.rgb; }
  function cleanup(data, pal) {
    const d = data.data, n = W * H, idx = (x, y) => (y * W + x) * 4;
    for (let i = 0; i < n; i++) { const k = i * 4; if (d[k + 3] < 110) { d[k + 3] = 0; continue; } d[k + 3] = 255; if (pal.length) { const s = snap([d[k], d[k + 1], d[k + 2]], pal); d[k] = s[0]; d[k + 1] = s[1]; d[k + 2] = s[2]; } }
    // remove orphan pixels: a pixel unlike all four neighbours that themselves agree takes their colour
    const copy = new Uint8ClampedArray(d);
    const same = (a, b) => copy[a + 3] === copy[b + 3] && (copy[a + 3] === 0 || (copy[a] === copy[b] && copy[a + 1] === copy[b + 1] && copy[a + 2] === copy[b + 2]));
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const k = idx(x, y), u = idx(x, y - 1), dn = idx(x, y + 1), l = idx(x - 1, y), r = idx(x + 1, y);
      if (!same(k, u) && !same(k, dn) && !same(k, l) && !same(k, r) && same(u, dn) && same(l, r) && same(u, l)) { for (let j = 0; j < 4; j++) d[k + j] = copy[u + j]; }
    }
    return data;
  }
  function rasterize(svgStr) {
    return new Promise(resolve => {
      if (!canDraw()) return resolve('');
      const img = new root.Image();
      img.onload = () => {
        try {
          const c = root.document.createElement('canvas'); c.width = W; c.height = H;
          const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(img, 0, 0, W, H);
          const data = ctx.getImageData(0, 0, W, H); cleanup(data, paletteOf(svgStr)); ctx.putImageData(data, 0, 0);
          resolve(c.toDataURL('image/png'));
        } catch (_) { resolve(''); }
      };
      img.onerror = () => resolve('');
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
    });
  }

  // ---------- sources ----------
  const cache = new Map(), pending = new Map(), sheets = new Map();
  let manifest = null; // { ids: [...], v } of prebuilt PNG sheets (assets/portraits/manifest.json)
  function setManifest(m) { manifest = m && Array.isArray(m.ids) ? m : null; }
  function exprOf(ex) { const e = ALIAS[ex] || ex; return EXPRESSIONS.includes(e) ? e : 'neutral'; }
  function svgFor(id, ex, opts) {
    const e = exprOf(ex);
    if (EW.portraitNamed && EW.portraitNamed.has(id)) return EW.portraitNamed.svg(id, e, opts);
    if (EW.portraitProc) return EW.portraitProc.svg(id, e, opts);
    return '';
  }
  function keyOf(id, ex, opts) { return id + '|' + exprOf(ex) + '|' + (opts && opts.kit ? opts.kit.main + opts.kit.trim : '') + '|' + (opts && opts.look ? JSON.stringify(opts.look) : ''); }
  function fromSheet(id, ex) {
    if (!manifest || !manifest.ids.includes(id) || !canDraw()) return null;
    const i = EXPRESSIONS.indexOf(exprOf(ex));
    let sp = sheets.get(id);
    if (!sp) {
      sp = new Promise(res => { const img = new root.Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = 'assets/portraits/' + id + '.png?v=' + (manifest.v || 1); });
      sheets.set(id, sp);
    }
    return sp.then(img => {
      if (!img) return '';
      const c = root.document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, i * W, 0, W, H, 0, 0, W, H); return c.toDataURL('image/png');
    });
  }
  /** Async: resolves to a PNG data URL ('' when the browser can't draw). */
  function render(id, ex, opts) {
    const k = keyOf(id, ex, opts);
    if (cache.has(k)) return Promise.resolve(cache.get(k));
    if (pending.has(k)) return pending.get(k);
    const useSheet = !(opts && (opts.kit || opts.look)) ? fromSheet(id, ex) : null;
    const pr = (useSheet || Promise.resolve(null)).then(u => u || rasterize(svgFor(id, ex, opts))).then(url => { cache.set(k, url); pending.delete(k); if (cache.size > 900) cache.clear(); return url; });
    pending.set(k, pr);
    return pr;
  }
  /** Sync: the cached portrait if already rendered, else ''. */
  function peek(id, ex, opts) { return cache.get(keyOf(id, ex, opts)) || ''; }

  /** Portrait-specific backdrop (CSS background) so cards are not all the same square. */
  function backdrop(id) {
    const acc = (EW.portraitNamed && EW.portraitNamed.has(id) && EW.portraitNamed.accent(id)) || (EW.portraitProc && EW.portraitProc.accent(id)) || '#1598ff';
    return 'radial-gradient(120% 85% at 50% 30%,' + mix(acc, '#14213a', 0.62) + ' 0,#0c1528 60%,' + mix(acc, '#05070c', 0.85) + ' 100%)';
  }

  EW.portraitArt = { W, H, EXPRESSIONS, ALIAS, path, ellipse, rect, group, clip, svg, mix, hex2rgb, rgb2hex, rasterize, cleanup, render, peek, svgFor, backdrop, setManifest, canDraw, exprOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.portraitArt;
})(typeof globalThis !== 'undefined' ? globalThis : this);
