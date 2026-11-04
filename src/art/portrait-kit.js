/* EgoWheel — portrait drawing kit: the shared "hand" of the art style.
 * Every portrait (bespoke or procedural) uses these routines so the cast looks like one artist drew it:
 * 1px dark-tinted line art, light from the upper left, 2–3 tone cel shading, anime eyes with heavy upper
 * lashes, a shaded iris, pupil and two catchlights. Characters supply their own geometry and palettes.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const PA = () => EW.portraitArt;
  const f = n => Math.round(n * 100) / 100;

  /** Expression → modifiers shared by every face (characters may override per expression). */
  const EXPR = {
    neutral:    { open: 1, lid: 0, look: 0, browIn: 0, browOut: 0, iris: 1 },
    focused:    { open: 0.78, lid: 0.15, look: 0, browIn: 2, browOut: 0, iris: 0.95 },
    confident:  { open: 0.86, lid: 0.1, look: 0, browIn: -0.5, browOut: -1, iris: 1, browRaise: 1 },
    angry:      { open: 0.82, lid: 0.12, look: 0, browIn: 3.2, browOut: -1.2, iris: 0.8, slant: 1 },
    frustrated: { open: 0.9, lid: 0.05, look: 0.6, browIn: -2.4, browOut: 1, iris: 0.92, sweat: true },
    smirk:      { open: 0.84, lid: 0.12, look: 0, browIn: 0.6, browOut: -0.4, iris: 1, wink: true, browRaise: 1.6 },
    surprised:  { open: 1.28, lid: 0, look: 0, browIn: -3, browOut: -3, iris: 0.78 },
    defeated:   { open: 0.55, lid: 0.45, look: 1.4, browIn: -2.6, browOut: 1.2, iris: 1, shadow: true },
    elated:     { closed: true, browIn: -1.5, browOut: -1.5, blush: true },
    flow:       { open: 1.05, lid: 0, look: 0, browIn: 1.6, browOut: -0.6, iris: 0.9, glow: true }
  };

  /**
   * Anime eye. o: { cx, cy, w, h, side(-1 viewer-left / 1 viewer-right), tilt (outer corner up, px), irisR,
   *   iris:[dark, mid, light], lash, skin:{base, sh, line}, ex (EXPR entry), lowerLash, slit, liner, id, heavyLid, lashW }
   */
  function eye(o) {
    const P = PA(), e = o.ex || EXPR.neutral, s = o.side, id = o.id;
    const w = o.w, h = o.h * (e.open ?? 1), xi = o.cx - s * w / 2, xo = o.cx + s * w / 2, tilt = (o.tilt || 0) - (e.slant ? 1.2 : 0);
    const yi = o.cy + (e.slant ? 0.6 : 0), yo = o.cy - tilt;
    let out = '';
    if (e.closed) {
      // happy closed eye: an upward arc with a small outer flick
      out += P.path('M' + f(xi) + ',' + f(yi + 0.5) + ' Q' + f(o.cx) + ',' + f(o.cy - o.h * 0.9) + ' ' + f(xo) + ',' + f(yo + 0.5), 'none', { stroke: o.lash, w: o.lashW || 1.6 });
      out += P.path('M' + f(xo) + ',' + f(yo + 0.5) + ' l' + f(s * 1.6) + ',' + f(1.2), 'none', { stroke: o.lash, w: 1 });
      return out;
    }
    const upCx1 = xi + s * w * 0.22, upCy1 = o.cy - h * (e.slant ? 0.7 : 1.05), upCx2 = xo - s * w * 0.22, upCy2 = o.cy - h * 1.05 - tilt;
    const up = 'M' + f(xi) + ',' + f(yi) + ' C' + f(upCx1) + ',' + f(upCy1) + ' ' + f(upCx2) + ',' + f(upCy2) + ' ' + f(xo) + ',' + f(yo);
    const lo = 'C' + f(xo - s * w * 0.18) + ',' + f(o.cy + h * 0.62) + ' ' + f(xi + s * w * 0.28) + ',' + f(o.cy + h * 0.6) + ' ' + f(xi) + ',' + f(yi);
    const shape = up + ' ' + lo + 'Z';
    const defs = P.clip(id, shape);
    out += P.path(shape, '#f7f4f6');
    // iris
    const r = o.irisR * (e.iris ?? 1), icx = o.cx + s * (o.lookX || 0) - s * 0.3, icy = o.cy + h * 0.05 + (e.look || 0) * 0.8 + (e.lid || 0) * h * 0.4;
    out += P.ellipse(icx, icy, r * 0.86, r, o.iris[1], { clip: id });
    out += P.ellipse(icx, icy - r * 0.55, r * 0.9, r * 0.62, o.iris[0], { clip: id });
    out += P.ellipse(icx, icy + r * 0.55, r * 0.6, r * 0.38, o.iris[2], { clip: id });
    if (o.slit) out += P.ellipse(icx, icy, r * 0.18, r * 0.78, '#1a0f14', { clip: id });
    else out += P.ellipse(icx, icy, r * 0.36, r * 0.48, o.iris[3] || '#15121c', { clip: id });
    if (e.glow) { out += P.ellipse(icx, icy + r * 0.3, r * 0.5, r * 0.3, '#9ff3ff', { clip: id }); }
    // catchlights
    out += P.rect(icx - s * r * 0.55 - 0.6, icy - r * 0.6, 1.6, 1.8, '#ffffff', { clip: id });
    out += P.rect(icx + s * r * 0.3 - 0.4, icy + r * 0.35, 1, 1, '#ffffff', { clip: id });
    // shadow under the upper lid
    out += P.path(up + ' L' + f(xo) + ',' + f(yo + 1.3) + ' C' + f(upCx2) + ',' + f(upCy2 + 1.6) + ' ' + f(upCx1) + ',' + f(upCy1 + 1.6) + ' ' + f(xi) + ',' + f(yi + 1.1) + 'Z', o.iris[0], { clip: id, op: 0.55 });
    // heavy lid (sleepy / defeated / bored characters)
    const lid = Math.max(o.heavyLid || 0, e.lid || 0);
    if (lid > 0.05) {
      const ly = (t) => o.cy - h * (1.05 - lid * 1.4);
      out += P.path('M' + f(xi - s) + ',' + f(yi - 4) + ' L' + f(xo + s) + ',' + f(yo - 4) + ' L' + f(xo) + ',' + f(ly() - tilt * 0.5) + ' Q' + f(o.cx) + ',' + f(ly() - 0.6) + ' ' + f(xi) + ',' + f(ly() + 0.3) + 'Z', o.skin.base, { clip: id });
      out += P.path('M' + f(xi) + ',' + f(ly() + 0.3) + ' Q' + f(o.cx) + ',' + f(ly() - 0.6) + ' ' + f(xo) + ',' + f(ly() - tilt * 0.5), 'none', { stroke: o.lash, w: o.lashW || 1.6 });
    } else {
      out += P.path(up, 'none', { stroke: o.lash, w: o.lashW || 1.7 });
    }
    // lid crease
    out += P.path('M' + f(xi + s * w * 0.15) + ',' + f(o.cy - h * 1.25 - 1.2) + ' Q' + f(o.cx + s * w * 0.1) + ',' + f(o.cy - h * 1.55 - 1.4) + ' ' + f(xo - s * w * 0.05) + ',' + f(yo - h * 0.55 - 1.2), 'none', { stroke: o.skin.sh, w: 0.8 });
    // outer lash flick
    out += P.path('M' + f(xo - s * 1.5) + ',' + f(yo - 0.6) + ' L' + f(xo + s * 1.9) + ',' + f(yo - 1.6 - (o.flick || 0)) + ' L' + f(xo + s * 0.2) + ',' + f(yo + 0.8) + 'Z', o.lash);
    if (o.liner) out += P.path('M' + f(xo - s * w * 0.35) + ',' + f(o.cy + h * 0.55) + ' Q' + f(xo) + ',' + f(o.cy + h * 0.3) + ' ' + f(xo + s * 2.2) + ',' + f(yo - 1.2), 'none', { stroke: o.liner, w: 1 });
    // lower lid line
    out += P.path('M' + f(xo) + ',' + f(yo + 0.4) + ' C' + f(xo - s * w * 0.18) + ',' + f(o.cy + h * 0.62) + ' ' + f(xi + s * w * 0.5) + ',' + f(o.cy + h * 0.66) + ' ' + f(xi + s * w * 0.35) + ',' + f(o.cy + h * 0.6), 'none', { stroke: o.lowerLash ? o.lash : o.skin.line, w: o.lowerLash ? 1 : 0.7, op: o.lowerLash ? 1 : 0.8 });
    if (o.lowerLash) out += P.path('M' + f(xo - s * w * 0.12) + ',' + f(o.cy + h * 0.6) + ' l' + f(s * 0.8) + ',' + f(1.4) + ' M' + f(xo - s * w * 0.32) + ',' + f(o.cy + h * 0.68) + ' l' + f(s * 0.4) + ',' + f(1.4), 'none', { stroke: o.lash, w: 0.8 });
    return '<defs>' + defs + '</defs>' + out;
  }

  /** Eyebrow from inner (x,y) toward the outside. o: { x, y, side, len, th, arch, col, ex, tilt } */
  function brow(o) {
    const P = PA(), e = o.ex || EXPR.neutral, s = o.side;
    let inY = o.y + (e.browIn || 0), outY = o.y - (o.tilt || 0) + (e.browOut || 0);
    if (e.browRaise && s === (o.raiseSide || 1)) { inY -= e.browRaise; outY -= e.browRaise * 1.2; }
    const xo = o.x + s * o.len, mx = o.x + s * o.len * 0.55, my = Math.min(inY, outY) - (o.arch || 1);
    const th = o.th || 1.6;
    const top = 'M' + f(o.x) + ',' + f(inY) + ' Q' + f(mx) + ',' + f(my) + ' ' + f(xo) + ',' + f(outY);
    const bot = ' L' + f(xo - s * 0.6) + ',' + f(outY + th * 0.6) + ' Q' + f(mx) + ',' + f(my + th) + ' ' + f(o.x) + ',' + f(inY + th) + 'Z';
    return P.path(top + bot, o.col) + P.path(top, 'none', { stroke: o.col, w: 0.9 });
  }

  /** Mouth by expression. o: { x, y, w, line, lip, inner, teeth, tongue, ex, style } — styles flavour per character. */
  function mouth(o, exName) {
    const P = PA(), x = o.x, y = o.y, w = o.w || 6, L = o.line, st = o.style || {};
    const kind = st[exName] || exName;
    const teeth = o.teeth || '#f6f2ef', inner = o.inner || '#5b1e2c', tongue = o.tongue || '#d8697a';
    switch (kind) {
      case 'confident': return P.path('M' + f(x - w / 2) + ',' + f(y) + ' Q' + f(x) + ',' + f(y + 2) + ' ' + f(x + w / 2) + ',' + f(y - 1), 'none', { stroke: L, w: 1 });
      case 'smirk': return P.path('M' + f(x - w / 2) + ',' + f(y + 0.5) + ' Q' + f(x + w * 0.1) + ',' + f(y + 1.2) + ' ' + f(x + w / 2 + 1) + ',' + f(y - 2), 'none', { stroke: L, w: 1 }) + P.path('M' + f(x + w / 2 + 1) + ',' + f(y - 2) + ' l0.8,-0.6', 'none', { stroke: L, w: 0.8 });
      case 'sneer': return P.path('M' + f(x - w / 2) + ',' + f(y + 0.5) + ' L' + f(x + w / 2 + 1) + ',' + f(y - 1.6) + ' L' + f(x + w / 2 - 1) + ',' + f(y + 1.6) + ' L' + f(x - w * 0.1) + ',' + f(y + 1.4) + 'Z', inner, { stroke: L, w: 0.9 }) + P.rect(x - w * 0.1, y - 0.6, w * 0.55, 1.2, teeth);
      case 'angry': return P.path('M' + f(x - w / 2 - 1) + ',' + f(y) + ' L' + f(x + w / 2 + 1) + ',' + f(y) + ' L' + f(x + w / 2) + ',' + f(y + 3) + ' L' + f(x - w / 2) + ',' + f(y + 3) + 'Z', teeth, { stroke: L, w: 1 }) + P.path('M' + f(x - w / 2) + ',' + f(y + 1.5) + ' L' + f(x + w / 2) + ',' + f(y + 1.5), 'none', { stroke: '#c9c0bd', w: 0.6 });
      case 'frustrated': return P.path('M' + f(x - w / 2 - 0.5) + ',' + f(y + 1) + ' Q' + f(x - w / 4) + ',' + f(y - 0.5) + ' ' + f(x) + ',' + f(y + 0.6) + ' Q' + f(x + w / 4) + ',' + f(y + 1.6) + ' ' + f(x + w / 2 + 0.5) + ',' + f(y), 'none', { stroke: L, w: 1 });
      case 'surprised': return P.ellipse(x, y + 1, 1.6, 2.1, inner, { stroke: L, w: 0.9 });
      case 'defeated': return P.path('M' + f(x - w / 2) + ',' + f(y + 1.2) + ' Q' + f(x) + ',' + f(y - 1) + ' ' + f(x + w / 2) + ',' + f(y + 1.2), 'none', { stroke: L, w: 1 });
      case 'elated': return P.path('M' + f(x - w / 2 - 1) + ',' + f(y - 0.6) + ' Q' + f(x) + ',' + f(y) + ' ' + f(x + w / 2 + 1) + ',' + f(y - 0.6) + ' Q' + f(x + w * 0.35) + ',' + f(y + 5) + ' ' + f(x) + ',' + f(y + 5) + ' Q' + f(x - w * 0.35) + ',' + f(y + 5) + ' ' + f(x - w / 2 - 1) + ',' + f(y - 0.6) + 'Z', inner, { stroke: L, w: 1 })
        + P.path('M' + f(x - w / 2) + ',' + f(y + 0.2) + ' Q' + f(x) + ',' + f(y + 1.1) + ' ' + f(x + w / 2) + ',' + f(y + 0.2) + ' L' + f(x + w / 2 - 0.5) + ',' + f(y + 1.4) + ' L' + f(x - w / 2 + 0.5) + ',' + f(y + 1.4) + 'Z', teeth) + P.ellipse(x, y + 3.8, w * 0.26, 1.2, tongue);
      case 'manic': { const ww = w + 4; return P.path('M' + f(x - ww / 2) + ',' + f(y - 1.5) + ' Q' + f(x) + ',' + f(y + 0.5) + ' ' + f(x + ww / 2) + ',' + f(y - 1.5) + ' Q' + f(x + ww * 0.3) + ',' + f(y + 6) + ' ' + f(x) + ',' + f(y + 6) + ' Q' + f(x - ww * 0.3) + ',' + f(y + 6) + ' ' + f(x - ww / 2) + ',' + f(y - 1.5) + 'Z', inner, { stroke: L, w: 1 })
        + P.path('M' + f(x - ww / 2 + 1) + ',' + f(y - 0.8) + ' L' + f(x + ww / 2 - 1) + ',' + f(y - 0.8) + ' L' + f(x + ww / 2 - 2) + ',' + f(y + 0.8) + ' L' + f(x - ww / 2 + 2) + ',' + f(y + 0.8) + 'Z', teeth) + P.path('M' + f(x - 1.5) + ',' + f(y + 3) + ' Q' + f(x) + ',' + f(y + 8.5) + ' ' + f(x + 1.8) + ',' + f(y + 3) + 'Z', tongue, { stroke: L, w: 0.7 })
        + P.path('M' + f(x - ww / 2 + 2) + ',' + f(y + 0.8) + ' l0.6,1.3 l0.6,-1.3 M' + f(x + ww / 2 - 3.2) + ',' + f(y + 0.8) + ' l0.6,1.3 l0.6,-1.3', teeth); }
      case 'flow': return P.path('M' + f(x - w / 2) + ',' + f(y) + ' Q' + f(x) + ',' + f(y + 1.6) + ' ' + f(x + w / 2) + ',' + f(y) + ' Q' + f(x) + ',' + f(y + 2.6) + ' ' + f(x - w / 2) + ',' + f(y) + 'Z', inner, { stroke: L, w: 0.9 });
      case 'flat': return P.path('M' + f(x - w * 0.35) + ',' + f(y) + ' L' + f(x + w * 0.35) + ',' + f(y), 'none', { stroke: L, w: 0.9 });
      case 'softsmile': return P.path('M' + f(x - w * 0.35) + ',' + f(y) + ' Q' + f(x) + ',' + f(y + 1.2) + ' ' + f(x + w * 0.4) + ',' + f(y - 0.3), 'none', { stroke: L, w: 0.9 });
      case 'focused': return P.path('M' + f(x - w * 0.4) + ',' + f(y + 0.3) + ' L' + f(x + w * 0.4) + ',' + f(y - 0.1), 'none', { stroke: L, w: 1 });
      default: return P.path('M' + f(x - w * 0.42) + ',' + f(y) + ' Q' + f(x) + ',' + f(y + 0.7) + ' ' + f(x + w * 0.42) + ',' + f(y), 'none', { stroke: L, w: 0.95 });
    }
  }

  /**
   * Torso, neck and kit. o: { cx, neckTop, neckW, chinY, shoulderY, shoulderW, slope, build, skin:{base,sh,dk,line}, kit:{main,trim,dark}, collar, number, lean }
   */
  function body(o) {
    const P = PA(), k = o.kit || { main: '#1d3f78', trim: '#f2f2f2', dark: '#132a52' }, sk = o.skin, cx = o.cx, nw = o.neckW, sy = o.shoulderY, sw = o.shoulderW, sl = o.slope || 6;
    const km = k.main, kd = k.dark || P.mix(km, '#000000', 0.38), kl = P.mix(km, '#ffffff', 0.16), line = P.mix(kd, '#05060c', 0.55);
    let out = '';
    // neck with jaw shadow
    out += P.path('M' + f(cx - nw) + ',' + f(o.neckTop) + ' L' + f(cx - nw - 0.5) + ',' + f(sy + 4) + ' L' + f(cx + nw + 0.5) + ',' + f(sy + 4) + ' L' + f(cx + nw) + ',' + f(o.neckTop) + 'Z', sk.base, { stroke: sk.line, w: 1 });
    out += P.path('M' + f(cx - nw) + ',' + f(o.chinY - 2) + ' Q' + f(cx) + ',' + f(o.chinY + 5) + ' ' + f(cx + nw) + ',' + f(o.chinY - 3) + ' L' + f(cx + nw) + ',' + f(o.chinY + 6) + ' Q' + f(cx) + ',' + f(o.chinY + 9) + ' ' + f(cx - nw) + ',' + f(o.chinY + 5) + 'Z', sk.sh);
    out += P.path('M' + f(cx + nw * 0.35) + ',' + f(o.chinY + 4) + ' L' + f(cx + nw) + ',' + f(o.chinY + 2) + ' L' + f(cx + nw + 0.4) + ',' + f(sy + 3) + ' L' + f(cx + nw * 0.5) + ',' + f(sy + 3) + 'Z', sk.sh);
    if (o.adam) out += P.path('M' + f(cx - 0.5) + ',' + f(o.chinY + 9) + ' q1,1.5 0,3', 'none', { stroke: sk.dk, w: 0.8 });
    // torso
    const tl = cx - sw, tr = cx + sw;
    const torso = 'M' + f(cx - nw - 1) + ',' + f(sy) + ' C' + f(cx - nw - 6) + ',' + f(sy + 1) + ' ' + f(tl + 4) + ',' + f(sy + sl - 2) + ' ' + f(tl) + ',' + f(sy + sl + 4) + ' L' + f(tl - 4) + ',' + 128 + ' L' + f(tr + 4) + ',' + 128 + ' L' + f(tr) + ',' + f(sy + sl + 4) + ' C' + f(tr - 4) + ',' + f(sy + sl - 2) + ' ' + f(cx + nw + 6) + ',' + f(sy + 1) + ' ' + f(cx + nw + 1) + ',' + f(sy) + 'Z';
    out += P.path(torso, km, { stroke: line, w: 1 });
    // light / shade planes
    out += P.path('M' + f(tl) + ',' + f(sy + sl + 4) + ' C' + f(tl + 4) + ',' + f(sy + sl - 2) + ' ' + f(cx - nw - 6) + ',' + f(sy + 1) + ' ' + f(cx - nw - 1) + ',' + f(sy) + ' L' + f(cx - nw - 3) + ',' + f(sy + 6) + ' C' + f(tl + 8) + ',' + f(sy + sl + 3) + ' ' + f(tl + 4) + ',' + f(sy + sl + 10) + ' ' + f(tl + 2) + ',128 L' + f(tl - 4) + ',128Z', kl);
    out += P.path('M' + f(tr) + ',' + f(sy + sl + 4) + ' L' + f(tr + 4) + ',128 L' + f(tr - 7) + ',128 C' + f(tr - 5) + ',' + f(sy + sl + 14) + ' ' + f(tr - 3) + ',' + f(sy + sl + 8) + ' ' + f(tr - 6) + ',' + f(sy + sl + 4) + 'Z', kd);
    // shoulder seams / trim
    out += P.path('M' + f(tl + 3) + ',' + f(sy + sl + 1) + ' C' + f(tl + 7) + ',' + f(sy + sl + 6) + ' ' + f(tl + 7) + ',' + f(sy + sl + 14) + ' ' + f(tl + 5) + ',' + f(sy + sl + 22), 'none', { stroke: k.trim, w: 1.2 });
    out += P.path('M' + f(tr - 3) + ',' + f(sy + sl + 1) + ' C' + f(tr - 7) + ',' + f(sy + sl + 6) + ' ' + f(tr - 7) + ',' + f(sy + sl + 14) + ' ' + f(tr - 5) + ',' + f(sy + sl + 22), 'none', { stroke: P.mix(k.trim, kd, 0.35), w: 1.2 });
    // folds
    out += P.path('M' + f(cx + nw + 4) + ',' + f(sy + 8) + ' q4,6 3,14', 'none', { stroke: kd, w: 1 });
    out += P.path('M' + f(cx - nw - 5) + ',' + f(sy + 9) + ' q-3,7 -1,15', 'none', { stroke: P.mix(km, kd, 0.5), w: 1 });
    // collar
    const c = o.collar || 'v';
    if (c === 'v') {
      out += P.path('M' + f(cx - nw - 1.5) + ',' + f(sy - 0.5) + ' L' + f(cx) + ',' + f(sy + 9) + ' L' + f(cx + nw + 1.5) + ',' + f(sy - 0.5) + ' L' + f(cx + nw - 0.5) + ',' + f(sy - 1) + ' L' + f(cx) + ',' + f(sy + 6.5) + ' L' + f(cx - nw + 0.5) + ',' + f(sy - 1) + 'Z', k.trim, { stroke: line, w: 0.8 });
      out += P.path('M' + f(cx - nw + 0.5) + ',' + f(sy - 1) + ' L' + f(cx) + ',' + f(sy + 6.5) + ' L' + f(cx + nw - 0.5) + ',' + f(sy - 1) + 'Z', sk.sh);
    } else if (c === 'polo') {
      out += P.path('M' + f(cx - nw - 2) + ',' + f(sy - 2) + ' L' + f(cx - 1) + ',' + f(sy + 7) + ' L' + f(cx - nw - 7) + ',' + f(sy + 5) + 'Z', k.trim, { stroke: line, w: 0.8 });
      out += P.path('M' + f(cx + nw + 2) + ',' + f(sy - 2) + ' L' + f(cx + 1) + ',' + f(sy + 7) + ' L' + f(cx + nw + 7) + ',' + f(sy + 5) + 'Z', P.mix(k.trim, kd, 0.25), { stroke: line, w: 0.8 });
    } else {
      out += P.path('M' + f(cx - nw - 2) + ',' + f(sy - 0.5) + ' Q' + f(cx) + ',' + f(sy + 5) + ' ' + f(cx + nw + 2) + ',' + f(sy - 0.5), 'none', { stroke: k.trim, w: 2 });
    }
    if (o.number) {
      out += '<text x="' + f(cx + sw * 0.45) + '" y="' + f(sy + 24) + '" font-family="monospace" font-weight="bold" font-size="9" fill="' + k.trim + '" text-anchor="middle">' + o.number + '</text>';
    }
    return out;
  }

  /** Simple cel helper: draw a filled shape with a line. */
  function shape(d, fill, line, w) { return PA().path(d, fill, line ? { stroke: line, w: w || 1 } : null); }

  EW.portraitKit = { EXPR, eye, brow, mouth, body, shape };
})(typeof globalThis !== 'undefined' ? globalThis : this);
