/* EgoWheel — portrait drawing kit ("reference style").
 * Art bible (shared by every portrait, named or generated):
 *   • 96×128 native canvas, tight head-and-shoulders crop, three-quarter view; realistic skull size,
 *     shoulders run off the frame.
 *   • Strict palette per portrait: flat background, ONE dark ink (line art and dark hair), one skin tone,
 *     one or two hair tones, ONE accent colour (eyes, lips/blush, clothing details) and a light/white.
 *   • Clean 1px ink lines, flat fills, almost no shading; a single hair highlight band at most.
 *   • Large simple eyes: heavy upper lid, dark iris with an accent-tinted lower half, two white catchlights.
 * Characters supply geometry + palette; these routines only draw in the shared style.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const PA = () => EW.portraitArt;
  const f = n => Math.round(n * 100) / 100;

  const EXPR = {
    neutral:    { open: 1 },
    focused:    { open: 0.72, browIn: 1.8 },
    confident:  { open: 0.85, browIn: -0.4, browOut: -0.8 },
    angry:      { open: 0.75, browIn: 2.8, browOut: -1, slant: 1, iris: 0.82 },
    frustrated: { open: 0.9, browIn: -2.2, browOut: 0.8, sweat: true, look: 0.8 },
    smirk:      { open: 0.8, browIn: 0.4, browOut: -0.6, raise: 1.4 },
    surprised:  { open: 1.3, browIn: -2.6, browOut: -2.6, iris: 0.74 },
    defeated:   { open: 0.55, browIn: -2.2, browOut: 1.2, look: 1.6, lid: true },
    elated:     { closed: true, browIn: -1.4, browOut: -1.4, blush: true },
    flow:       { open: 1.05, browIn: 1.4, browOut: -0.4, glow: true }
  };

  /**
   * Eye. o: { cx, cy, w, h, dir (-1 = outer corner points left, 1 = right), tilt, ink, iris, accent, white, ex,
   *   lowerLash, slit, liner, lid (0..1 heavy lid), look (-1..1 horizontal gaze) }
   */
  function eye(o) {
    const P = PA(), e = o.ex || EXPR.neutral, d = o.dir, ink = o.ink;
    const w = o.w, h = o.h * (e.open ?? 1), xi = o.cx - d * w / 2, xo = o.cx + d * w / 2;
    const slant = e.slant ? 1.3 : 0, yi = o.cy + slant * 0.6, yo = o.cy - (o.tilt || 0) - slant * 0.4;
    if (e.closed) {
      return P.path('M' + f(xi) + ',' + f(o.cy) + ' Q' + f(o.cx) + ',' + f(o.cy - o.h * 0.9) + ' ' + f(xo) + ',' + f(yo), 'none', { stroke: ink, w: 1.4 })
        + P.path('M' + f(xo) + ',' + f(yo) + ' l' + f(d * 1.5) + ',1', 'none', { stroke: ink, w: 1 });
    }
    const up = 'M' + f(xi) + ',' + f(yi) + ' C' + f(xi + d * w * 0.25) + ',' + f(o.cy - h * (e.slant ? 0.75 : 1.05)) + ' ' + f(xo - d * w * 0.25) + ',' + f(o.cy - h * 1.05 - (o.tilt || 0)) + ' ' + f(xo) + ',' + f(yo);
    const lo = ' C' + f(xo - d * w * 0.2) + ',' + f(o.cy + h * 0.7) + ' ' + f(xi + d * w * 0.3) + ',' + f(o.cy + h * 0.65) + ' ' + f(xi) + ',' + f(yi) + 'Z';
    const id = o.id, shape = up + lo;
    let out = '<defs>' + P.clip(id, shape) + '</defs>' + P.path(shape, o.white);
    const r = h * 0.95 * (e.iris ?? 1) * (o.irisScale || 1), gaze = (o.look || 0) + (e.look ? 0 : 0);
    const icx = o.cx + gaze * w * 0.18, icy = o.cy + 0.3 + (e.look || 0) * 0.7 + (o.lid || e.lid ? h * 0.25 : 0);
    out += P.ellipse(icx, icy, Math.min(w * 0.36, r * 0.82), r, o.iris, { clip: id });
    out += P.ellipse(icx, icy + r * 0.55, Math.min(w * 0.3, r * 0.62), r * 0.45, e.glow ? '#9ff3ff' : o.accent, { clip: id });
    if (o.slit) out += P.ellipse(icx, icy, 0.6, r * 0.8, ink, { clip: id });
    out += P.rect(icx - Math.min(w * 0.3, r * 0.7) * 0.75, icy - r * 0.65, 2, 2, o.white, { clip: id });
    out += P.rect(icx + r * 0.25, icy + r * 0.15, 1, 1, o.white, { clip: id });
    // heavy lid: ink line lowered across the top of the iris
    if (o.lid || e.lid) {
      const ly = o.cy - h * (e.lid ? 0.2 : 0.45);
      out += P.path('M' + f(xi) + ',' + f(yi - 6) + ' L' + f(xo) + ',' + f(yo - 6) + ' L' + f(xo) + ',' + f(yo) + ' Q' + f(o.cx) + ',' + f(ly) + ' ' + f(xi) + ',' + f(yi) + 'Z', o.skin, { clip: id });
      out += P.path('M' + f(xi) + ',' + f(yi) + ' Q' + f(o.cx) + ',' + f(ly) + ' ' + f(xo) + ',' + f(yo), 'none', { stroke: ink, w: 1.6 });
    } else out += P.path(up, 'none', { stroke: ink, w: o.lashW || 1.8 });
    // outer lash flick and lower lid
    out += P.path('M' + f(xo - d * 1.6) + ',' + f(yo - 0.4) + ' L' + f(xo + d * 1.8) + ',' + f(yo - 1.4 - (o.flick || 0)) + ' L' + f(xo + d * 0.1) + ',' + f(yo + 0.9) + 'Z', ink);
    out += P.path('M' + f(xo) + ',' + f(yo + 0.6) + ' C' + f(xo - d * w * 0.2) + ',' + f(o.cy + h * 0.7) + ' ' + f(xo - d * w * 0.45) + ',' + f(o.cy + h * 0.72) + ' ' + f(xo - d * w * 0.55) + ',' + f(o.cy + h * 0.68), 'none', { stroke: ink, w: 1 });
    if (o.lowerLash) out += P.path('M' + f(xo - d * w * 0.15) + ',' + f(o.cy + h * 0.66) + ' l' + f(d * 0.7) + ',1.5', 'none', { stroke: ink, w: 0.9 });
    if (o.liner) out += P.path('M' + f(xo - d * w * 0.5) + ',' + f(o.cy + h * 0.85) + ' Q' + f(xo) + ',' + f(o.cy + h * 0.6) + ' ' + f(xo + d * 2.2) + ',' + f(yo - 1.2), 'none', { stroke: o.liner, w: 1 });
    return out;
  }

  /** Eyebrow from the inner end outward. o: { x, y, dir, len, th, arch, tilt, col, ex, raiseDir } */
  function brow(o) {
    const P = PA(), e = o.ex || EXPR.neutral, d = o.dir;
    let inY = o.y + (e.browIn || 0), outY = o.y - (o.tilt || 0) + (e.browOut || 0);
    if (e.raise && d === (o.raiseDir || 1)) { inY -= e.raise; outY -= e.raise * 1.3; }
    const xo = o.x + d * o.len, mx = o.x + d * o.len * 0.55, my = Math.min(inY, outY) - (o.arch ?? 0.8), th = o.th || 1.4;
    return P.path('M' + f(o.x) + ',' + f(inY) + ' Q' + f(mx) + ',' + f(my) + ' ' + f(xo) + ',' + f(outY) + ' L' + f(xo - d * 0.8) + ',' + f(outY + th * 0.6) + ' Q' + f(mx) + ',' + f(my + th) + ' ' + f(o.x) + ',' + f(inY + th) + 'Z', o.col);
  }

  /** Mouth by expression kind. o: { x, y, w, ink, accent, white } */
  function mouth(o, kind) {
    const P = PA(), x = o.x, y = o.y, w = o.w || 5, ink = o.ink, ac = o.accent, wh = o.white;
    switch (kind) {
      case 'flat': return P.path('M' + f(x - w * 0.4) + ',' + f(y) + ' L' + f(x + w * 0.4) + ',' + f(y), 'none', { stroke: ink, w: 0.9 });
      case 'softsmile': return P.path('M' + f(x - w * 0.4) + ',' + f(y) + ' Q' + f(x) + ',' + f(y + 1.2) + ' ' + f(x + w * 0.45) + ',' + f(y - 0.4), 'none', { stroke: ink, w: 0.9 });
      case 'confident': return P.path('M' + f(x - w / 2) + ',' + f(y - 0.5) + ' Q' + f(x) + ',' + f(y + 2) + ' ' + f(x + w / 2) + ',' + f(y - 1), 'none', { stroke: ink, w: 1 });
      case 'smirk': return P.path('M' + f(x - w / 2) + ',' + f(y + 0.4) + ' Q' + f(x + w * 0.1) + ',' + f(y + 1) + ' ' + f(x + w / 2 + 0.8) + ',' + f(y - 1.8), 'none', { stroke: ink, w: 1 });
      case 'sneer': return P.path('M' + f(x - w / 2) + ',' + f(y + 0.5) + ' L' + f(x + w / 2 + 1) + ',' + f(y - 1.6) + ' L' + f(x + w / 2 - 0.5) + ',' + f(y + 1.5) + ' L' + f(x - w * 0.15) + ',' + f(y + 1.3) + 'Z', wh, { stroke: ink, w: 0.9 });
      case 'angry': return P.path('M' + f(x - w / 2 - 0.5) + ',' + f(y) + ' L' + f(x + w / 2 + 0.5) + ',' + f(y) + ' L' + f(x + w / 2 - 0.3) + ',' + f(y + 2.6) + ' L' + f(x - w / 2 + 0.3) + ',' + f(y + 2.6) + 'Z', wh, { stroke: ink, w: 1 });
      case 'frustrated': return P.path('M' + f(x - w / 2) + ',' + f(y + 1) + ' Q' + f(x - w / 4) + ',' + f(y - 0.6) + ' ' + f(x) + ',' + f(y + 0.6) + ' Q' + f(x + w / 4) + ',' + f(y + 1.6) + ' ' + f(x + w / 2) + ',' + f(y), 'none', { stroke: ink, w: 1 });
      case 'surprised': return P.ellipse(x, y + 1, 1.4, 1.9, ac, { stroke: ink, w: 0.9 });
      case 'defeated': return P.path('M' + f(x - w / 2) + ',' + f(y + 1.2) + ' Q' + f(x) + ',' + f(y - 0.8) + ' ' + f(x + w / 2) + ',' + f(y + 1.2), 'none', { stroke: ink, w: 1 });
      case 'elated': return P.path('M' + f(x - w / 2 - 0.5) + ',' + f(y - 0.6) + ' Q' + f(x) + ',' + f(y) + ' ' + f(x + w / 2 + 0.5) + ',' + f(y - 0.6) + ' Q' + f(x + w * 0.3) + ',' + f(y + 4.2) + ' ' + f(x) + ',' + f(y + 4.2) + ' Q' + f(x - w * 0.3) + ',' + f(y + 4.2) + ' ' + f(x - w / 2 - 0.5) + ',' + f(y - 0.6) + 'Z', ac, { stroke: ink, w: 1 })
        + P.path('M' + f(x - w / 2) + ',' + f(y + 0.1) + ' L' + f(x + w / 2) + ',' + f(y + 0.1) + ' L' + f(x + w / 2 - 0.6) + ',' + f(y + 1.3) + ' L' + f(x - w / 2 + 0.6) + ',' + f(y + 1.3) + 'Z', wh);
      case 'manic': { const ww = w + 3.5; return P.path('M' + f(x - ww / 2) + ',' + f(y - 1.4) + ' Q' + f(x) + ',' + f(y + 0.4) + ' ' + f(x + ww / 2) + ',' + f(y - 1.4) + ' Q' + f(x + ww * 0.3) + ',' + f(y + 5.5) + ' ' + f(x) + ',' + f(y + 5.5) + ' Q' + f(x - ww * 0.3) + ',' + f(y + 5.5) + ' ' + f(x - ww / 2) + ',' + f(y - 1.4) + 'Z', ink)
        + P.path('M' + f(x - ww / 2 + 1) + ',' + f(y - 0.7) + ' L' + f(x + ww / 2 - 1) + ',' + f(y - 0.7) + ' L' + f(x + ww / 2 - 2) + ',' + f(y + 0.8) + ' L' + f(x - ww / 2 + 2) + ',' + f(y + 0.8) + 'Z', wh) + P.path('M' + f(x - 1.3) + ',' + f(y + 2.6) + ' Q' + f(x + 0.2) + ',' + f(y + 7.5) + ' ' + f(x + 1.6) + ',' + f(y + 2.6) + 'Z', ac); }
      case 'flow': return P.path('M' + f(x - w / 2) + ',' + f(y) + ' Q' + f(x) + ',' + f(y + 1.6) + ' ' + f(x + w / 2) + ',' + f(y) + ' Q' + f(x) + ',' + f(y + 2.4) + ' ' + f(x - w / 2) + ',' + f(y) + 'Z', ink);
      case 'focused': return P.path('M' + f(x - w * 0.35) + ',' + f(y + 0.3) + ' L' + f(x + w * 0.35) + ',' + f(y - 0.1), 'none', { stroke: ink, w: 1 });
      default: return P.path('M' + f(x - w * 0.4) + ',' + f(y) + ' Q' + f(x) + ',' + f(y + 0.6) + ' ' + f(x + w * 0.4) + ',' + f(y), 'none', { stroke: ink, w: 0.9 });
    }
  }

  /** Default mouth kind for an expression (characters remap). */
  const MOUTH = { neutral: 'default', focused: 'focused', confident: 'confident', angry: 'angry', frustrated: 'frustrated', smirk: 'smirk', surprised: 'surprised', defeated: 'defeated', elated: 'elated', flow: 'flow' };

  EW.portraitKit = { EXPR, MOUTH, eye, brow, mouth };
})(typeof globalThis !== 'undefined' ? globalThis : this);
