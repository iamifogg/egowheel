/* EgoWheel — procedural layered pixel-art portraits and environments.
 * No image assets: every portrait is assembled from parameterised layers on a 40×44 logical grid
 * (body/kit, neck, face shape, ears, eyes, brows, nose, mouth, back hair, front hair, facial hair,
 * marks, accessories), drawn to a colour grid first (testable in Node), then blitted to a canvas
 * at integer scale with nearest-neighbour filtering. Results are cached as data URLs.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const W = 40, H = 44, CX = 20;

  // ---------- palettes ----------
  const SKIN = { porcelain: ['#fde7d6', '#f2c9b0', '#c99278'], fair: ['#f9d9bf', '#e9b796', '#b9806a'], light: ['#f3c9a3', '#dea67f', '#a8705a'], warm: ['#e7b48a', '#cc9168', '#94604a'],
    tan: ['#d39b6c', '#b47a50', '#7e5139'], olive: ['#c89466', '#a7744b', '#6f4a33'], brown: ['#a8714b', '#8a5737', '#5a3725'], deep: ['#7b4f35', '#623b26', '#3c2318'] };
  const HAIR = { black: ['#2a2d3c', '#191b26', '#4a5068'], navy: ['#253456', '#16203a', '#3f5a8c'], brown: ['#5c3b28', '#3d2619', '#86593c'], chestnut: ['#7a4a2a', '#54311b', '#a8693f'],
    blonde: ['#e7c66a', '#c39b42', '#fbe7a1'], platinum: ['#e8e6e0', '#bdb9b0', '#ffffff'], white: ['#eef2f6', '#c3cbd6', '#ffffff'], red: ['#b8343b', '#841f27', '#e0606a'],
    pink: ['#e78aa8', '#bf5f80', '#f8b8cc'], orange: ['#e0782e', '#b4561b', '#f6a45e'], purple: ['#6d4aa8', '#4b3079', '#9878d4'], teal: ['#2c6d6c', '#1b4847', '#4f9d9b'],
    green: ['#3f7a44', '#285129', '#68a86c'], silver: ['#a7adb8', '#7c828d', '#d4d9e2'], blue: ['#3d6fd6', '#2a4ea0', '#73a0f0'], ash: ['#8a8a86', '#62625e', '#b3b3ad'] };
  const EYES = { brown: '#6b4128', hazel: '#8a6a2a', amber: '#c98a1c', green: '#2f8a4a', teal: '#1f8f8a', blue: '#2f6fd0', grey: '#7c8796', violet: '#7a4cc0', red: '#b8303a', gold: '#d8b030' };
  const OUT = '#141018';
  const ACCENTS = ['#1598ff', '#ff5d73', '#ffd166', '#46e08a', '#b786ff', '#7de7ff', '#ff9f43', '#f2f2f2'];

  const OPTIONS = {
    skin: Object.keys(SKIN), hairColor: Object.keys(HAIR), hairTip: ['none'].concat(Object.keys(HAIR)), eyeColor: Object.keys(EYES),
    hairStyle: ['messy', 'spiky', 'swept', 'parted', 'bowl', 'curtain', 'wild', 'long', 'ponytail', 'buzz', 'undercut', 'mohawk', 'bob', 'tousled'],
    eyeShape: ['standard', 'sharp', 'round', 'narrow', 'droopy'], brow: ['neutral', 'thick', 'thin', 'arched'], face: ['oval', 'sharp', 'round', 'square'],
    facialHair: ['none', 'stubble', 'goatee'], mark: ['none', 'scar', 'bandage', 'mole', 'paint', 'freckles'], accessory: ['none', 'headband', 'glasses', 'earring', 'hairclip', 'wristband'],
    accent: ACCENTS
  };
  const EXPRESSIONS = ['neutral', 'confident', 'angry', 'surprised', 'frustrated', 'focused', 'elated', 'defeated'];

  function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }

  // ---------- grid ----------
  function grid() { return { w: W, h: H, px: new Array(W * H).fill(null) }; }
  function set(g, x, y, c) { if (x >= 0 && y >= 0 && x < g.w && y < g.h && c) g.px[y * g.w + x] = c; }
  function get(g, x, y) { return x >= 0 && y >= 0 && x < g.w && y < g.h ? g.px[y * g.w + x] : null; }
  function hline(g, x0, x1, y, c) { for (let x = x0; x <= x1; x++) set(g, x, y, c); }

  // Face half-widths per row from y=10.
  const FACES = {
    oval:   [4, 6, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 6, 6, 5, 4, 3, 2],
    sharp:  [4, 6, 7, 7, 8, 8, 8, 8, 8, 8, 8, 7, 7, 6, 6, 5, 4, 3, 2, 2, 1],
    round:  [5, 6, 7, 8, 8, 8, 8, 9, 9, 9, 9, 9, 8, 8, 8, 7, 7, 6, 5, 4, 3],
    square: [5, 6, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 7, 6, 5, 4]
  };
  const FACE_Y = 10;

  function drawBody(g, a, kit) {
    const k = kit || { main: '#1d3f78', trim: '#f2f2f2', dark: '#132a52' };
    const skin = SKIN[a.skin] || SKIN.light;
    // neck
    for (let y = 29; y <= 35; y++) hline(g, CX - 3, CX + 2, y, y <= 30 ? skin[1] : skin[0]);
    hline(g, CX - 3, CX + 2, 31, skin[1]);
    // shoulders & shirt
    for (let y = 35; y < H; y++) {
      const t = Math.min(1, (y - 35) / 5), half = Math.round(7 + t * 11);
      hline(g, CX - half, CX + half - 1, y, k.main);
      set(g, CX - half, y, OUT); set(g, CX + half - 1, y, OUT);
      set(g, CX - half + 1, y, k.dark); set(g, CX + half - 2, y, k.dark);
    }
    hline(g, CX - 7, CX + 6, 35, OUT);
    // collar V and trim
    for (let i = 0; i <= 4; i++) { set(g, CX - 4 + i, 35 + i, k.trim); set(g, CX + 3 - i, 35 + i, k.trim); }
    for (let i = 1; i <= 3; i++) for (let x = CX - 4 + i; x <= CX + 3 - i; x++) if (35 + i < 39) set(g, x, 35 + i, skin[1]);
    // shoulder seam highlight
    hline(g, CX - 15, CX - 11, 41, mix(k.main, '#ffffff', 0.18)); hline(g, CX + 10, CX + 14, 41, mix(k.main, '#ffffff', 0.18));
    if (a.number) { // tiny shirt number (3x5 digits)
      const digits = String(a.number).slice(0, 2).split(''), D = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111' };
      let x0 = CX + 6 - (digits.length - 1) * 2;
      digits.forEach((d, di) => { const m = D[d]; for (let i = 0; i < 15; i++) if (m[i] === '1') set(g, x0 + di * 4 + (i % 3), 38 + Math.floor(i / 3), k.trim); });
    }
  }

  function drawFace(g, a) {
    const skin = SKIN[a.skin] || SKIN.light, rows = FACES[a.face] || FACES.oval;
    rows.forEach((hw, i) => {
      const y = FACE_Y + i;
      hline(g, CX - hw, CX + hw - 1, y, skin[0]);
      set(g, CX - hw - 1, y, OUT); set(g, CX + hw, y, OUT);
      // side shading (light from the left)
      set(g, CX + hw - 1, y, skin[1]); if (hw > 6) set(g, CX + hw - 2, y, i > 12 ? skin[1] : skin[0]);
    });
    hline(g, CX - rows[rows.length - 1], CX + rows[rows.length - 1] - 1, FACE_Y + rows.length, OUT);
    // ears
    for (let y = 18; y <= 22; y++) { const hw = rows[y - FACE_Y]; set(g, CX - hw - 1, y, skin[1]); set(g, CX - hw - 2, y, OUT); set(g, CX + hw, y, skin[1]); set(g, CX + hw + 1, y, OUT); }
    set(g, CX - rows[8] - 1, 20, skin[2]); set(g, CX + rows[8], 20, skin[2]);
    // nose
    set(g, CX, 24, skin[1]); set(g, CX, 25, skin[2]);
    // chin shadow
    hline(g, CX - 2, CX + 1, FACE_Y + rows.length - 1, skin[1]);
  }

  function drawEyes(g, a, ex) {
    const skin = SKIN[a.skin] || SKIN.light, iris = EYES[a.eyeColor] || EYES.brown, dark = mix(iris, '#000000', 0.45), lash = OUT;
    const shape = a.eyeShape || 'standard';
    const eyes = [{ x: CX - 6, dir: -1 }, { x: CX + 2, dir: 1 }];
    for (const e of eyes) {
      const x0 = e.x, x1 = e.x + 3;
      if (ex === 'elated') { // closed happy eyes ^ ^
        set(g, x0, 21, lash); set(g, x0 + 1, 20, lash); set(g, x0 + 2, 20, lash); set(g, x0 + 3, 21, lash); continue;
      }
      const half = ex === 'defeated' || ex === 'focused' || shape === 'narrow';
      const tall = ex === 'surprised' || shape === 'round';
      const top = half ? 20 : 19;
      hline(g, x0, x1, top, lash);
      if (shape === 'sharp' || ex === 'angry') set(g, e.dir < 0 ? x0 - 1 : x1 + 1, top - 1, lash);
      if (shape === 'droopy') set(g, e.dir < 0 ? x0 - 1 : x1 + 1, top + 1, lash);
      const irisRows = half ? [top + 1] : tall ? [top + 1, top + 2, top + 3] : [top + 1, top + 2];
      irisRows.forEach((y, i) => {
        set(g, e.dir < 0 ? x0 : x1, y, '#f4f6fb'); // white on the outer side
        const ix0 = e.dir < 0 ? x0 + 1 : x0, ix1 = e.dir < 0 ? x1 : x1 - 1;
        hline(g, ix0, ix1, y, i === irisRows.length - 1 && irisRows.length > 1 ? iris : dark);
        if (i === 0 && !half) set(g, ix0, y, '#ffffff'); // catchlight
      });
      if (ex === 'surprised') set(g, e.dir < 0 ? x0 + 2 : x0 + 1, top + 2, OUT);
      const lowY = irisRows[irisRows.length - 1] + 1;
      hline(g, x0 + 1, x1 - 1, lowY, skin[1]);
    }
  }

  function drawBrows(g, a, ex) {
    const hairC = (HAIR[a.hairColor] || HAIR.black)[1];
    const th = a.brow === 'thick', thin = a.brow === 'thin', arched = a.brow === 'arched';
    const y = ex === 'surprised' ? 16 : ex === 'focused' || ex === 'angry' ? 18 : 17;
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? CX - 7 : CX + 2, xs = [0, 1, 2, 3, 4].map(i => x0 + i);
      xs.forEach((x, i) => {
        let dy = 0;
        const inner = side < 0 ? i >= 3 : i <= 1, outer = side < 0 ? i === 0 : i === 4;
        if (ex === 'angry' || ex === 'confident') dy = inner ? 1 : outer ? -1 : 0;
        if (ex === 'frustrated' || ex === 'defeated') dy = inner ? -1 : outer ? 1 : 0;
        if (arched && !inner && !outer) dy -= 1;
        if (ex === 'confident' && side > 0) dy -= 1;
        if (thin && outer) return;
        set(g, x, y + dy, hairC);
        if (th) set(g, x, y + dy + 1, hairC);
      });
    }
  }

  function drawMouth(g, a, ex) {
    const skin = SKIN[a.skin] || SKIN.light, lip = mix(skin[2], '#7a2b3a', 0.35), m = 27;
    switch (ex) {
      case 'confident': set(g, CX - 2, m, lip); set(g, CX - 1, m, lip); set(g, CX, m, lip); set(g, CX + 1, m - 1, lip); break;
      case 'angry': hline(g, CX - 2, CX + 1, m, OUT); hline(g, CX - 1, CX, m + 1, '#f4f4f4'); set(g, CX - 2, m + 1, lip); set(g, CX + 1, m + 1, lip); break;
      case 'surprised': set(g, CX - 1, m, OUT); set(g, CX, m, OUT); set(g, CX - 1, m + 1, '#5a1f2a'); set(g, CX, m + 1, '#5a1f2a'); break;
      case 'frustrated': set(g, CX - 2, m + 1, lip); set(g, CX - 1, m, lip); set(g, CX, m + 1, lip); set(g, CX + 1, m, lip); break;
      case 'focused': hline(g, CX - 1, CX, m, lip); break;
      case 'elated': hline(g, CX - 2, CX + 1, m, OUT); hline(g, CX - 2, CX + 1, m + 1, '#5a1f2a'); hline(g, CX - 1, CX, m + 1, '#f8f8f8');
        set(g, CX - 6, 24, '#f19aa6'); set(g, CX - 5, 24, '#f19aa6'); set(g, CX + 4, 24, '#f19aa6'); set(g, CX + 5, 24, '#f19aa6'); break;
      case 'defeated': set(g, CX - 2, m + 1, lip); set(g, CX - 1, m, lip); set(g, CX, m, lip); set(g, CX + 1, m + 1, lip); break;
      default: hline(g, CX - 1, CX + 1, m, lip);
    }
  }

  // ---------- hair ----------
  // Returns {top(x), bang(x), side, back} contours for a style. x is relative to CX.
  function hairShape(style, len) {
    const L = len || 0;
    const zig = (x, a) => ((x % 3) + 3) % 3 === 0 ? a : ((x % 3) + 3) % 3 === 1 ? Math.round(a / 2) : 0;
    const S = {
      messy:    { top: x => 7 - (Math.abs(x) < 6 ? 1 : 0) - ((x * 7 + 3) % 5 === 0 ? 1 : 0), bang: x => 15 + [0, 2, 1, 3, 1, 2, 0, 2][(x + 16) % 8], side: 22 + L * 2, back: 0 },
      spiky:    { top: x => 5 + zig(x + 1, 3) - (Math.abs(x) < 4 ? 1 : 0), bang: x => 14 + zig(x, 3), side: 21 + L * 2, back: 0 },
      swept:    { top: x => 7 - (x > -3 && x < 6 ? 1 : 0), bang: x => 12 + Math.round((x + 9) * 0.35), side: 21 + L * 2, back: 0 },
      parted:   { top: x => 7, bang: x => Math.abs(x + 1) < 2 ? 11 : 13 + Math.min(4, Math.round(Math.abs(x + 1) * 0.45)), side: 23 + L * 2, back: 0, part: -1 },
      bowl:     { top: x => 7, bang: x => 16, side: 22 + L, back: 0 },
      curtain:  { top: x => 7, bang: x => Math.abs(x) < 2 ? 12 : 14 + Math.min(4, Math.abs(x) >> 1), side: 25 + L * 2, back: 0, part: 0 },
      wild:     { top: x => 4 + zig(x, 3) + (Math.abs(x) > 8 ? 2 : 0), bang: x => 14 + zig(x + 2, 2), side: 24 + L * 2, back: 0 },
      long:     { top: x => 7, bang: x => Math.abs(x + 1) < 2 ? 12 : 14 + Math.min(3, Math.abs(x + 1) >> 1), side: 32 + L * 3, back: 34 + L * 3, part: -1 },
      ponytail: { top: x => 7, bang: x => 13 + Math.round(Math.abs(x) * 0.25), side: 20, back: 0, tail: true },
      buzz:     { top: x => 8, bang: x => 11, side: 17, back: 0, short: true },
      undercut: { top: x => 6 - (x > -2 && x < 7 ? 1 : 0), bang: x => 12 + Math.round((x + 9) * 0.3), side: 15, back: 0, undercut: true },
      mohawk:   { top: x => Math.abs(x) <= 2 ? 3 : 9, bang: x => Math.abs(x) <= 2 ? 12 : 10, side: 15, back: 0, undercut: true },
      bob:      { top: x => 7, bang: x => 15 + (Math.abs(x) > 5 ? 1 : 0), side: 28 + L, back: 29 + L, part: 2 },
      tousled:  { top: x => 6 + ((x * 5 + 2) % 4 === 0 ? -1 : 0), bang: x => 14 + [1, 3, 0, 2, 3, 1, 2, 0][(x + 16) % 8], side: 23 + L * 2, back: 0 }
    };
    return S[style] || S.messy;
  }

  function drawHair(g, a, layer) {
    const pal = HAIR[a.hairColor] || HAIR.black, tip = a.hairTip && a.hairTip !== 'none' ? HAIR[a.hairTip] : null;
    const sh = hairShape(a.hairStyle, a.hairLen), rows = FACES[a.face] || FACES.oval, hwAt = y => rows[Math.max(0, Math.min(rows.length - 1, y - FACE_Y))] || 6;
    const base = pal[0], shade = pal[1], hi = pal[2];
    const colorAt = (x, y, bottom) => { if (tip && bottom - y <= 1) return tip[0]; return y >= bottom - 1 ? shade : base; };
    if (layer === 'back') {
      if (sh.back) for (let y = 12; y <= sh.back; y++) { const hw = Math.max(hwAt(Math.min(y, 26)), 7) + 2; for (let x = CX - hw; x < CX + hw; x++) if (!get(g, x, y) || y > 30) set(g, x, y, y > sh.back - 2 && tip ? tip[1] : shade); }
      if (sh.tail) for (let y = 14; y <= 30; y++) { const x = CX + 10 + Math.round(Math.sin(y / 4) * 1); set(g, x, y, base); set(g, x + 1, y, shade); set(g, x - 1, y, OUT); set(g, x + 2, y, OUT); }
      return;
    }
    const minX = -10, maxX = 9;
    for (let rx = minX; rx <= maxX; rx++) {
      const x = CX + rx, hwTop = hwAt(13) + 1;
      if (Math.abs(rx + 0.5) > hwTop + 0.5) continue;
      const ar = Math.abs(rx + 0.5), round = ar >= hwTop - 0.5 ? 2 : ar >= hwTop - 1.5 ? 1 : 0;
      const top = sh.top(rx) + round, bang = Math.min(sh.bang(rx), sh.short ? 11 : 17);
      const edge = ar >= hwTop - 1;
      let bottom = edge ? Math.max(bang, sh.side) : bang;
      if (sh.undercut && Math.abs(rx + 0.5) > 5) bottom = Math.min(bottom, 13);
      for (let y = top; y <= bottom; y++) {
        // keep eyes and the lower face mostly visible: side locks frame the face
        const insideFace = y >= FACE_Y && Math.abs(rx + 0.5) < hwAt(y) - 1;
        if (insideFace && y > bang) continue;
        set(g, x, y, colorAt(x, y, bottom));
      }
      set(g, x, top - 1, OUT);
      if (!(sh.undercut && Math.abs(rx + 0.5) > 5)) set(g, x, bottom + 1, bottom + 1 > FACE_Y && Math.abs(rx + 0.5) < hwAt(bottom + 1) ? mix(base, OUT, 0.55) : OUT);
    }
    // outline the dome sides
    for (let y = 4; y <= 36; y++) for (let x = 1; x < W - 1; x++) {
      const c = get(g, x, y); if (c !== base && c !== shade && (!tip || (c !== tip[0] && c !== tip[1]))) continue;
      if (!get(g, x - 1, y)) set(g, x - 1, y, OUT); if (!get(g, x + 1, y)) set(g, x + 1, y, OUT);
    }
    if (sh.undercut) for (let y = 14; y <= 19; y++) { const hw = hwAt(y); set(g, CX - hw, y, mix((SKIN[a.skin] || SKIN.light)[1], shade, 0.5)); set(g, CX + hw - 1, y, mix((SKIN[a.skin] || SKIN.light)[1], shade, 0.5)); }
    // anime shine band
    const shineY = Math.max(sh.top(-4), sh.top(3)) + 2;
    [[-5, 1], [-4, 0], [-3, 0], [-2, 1]].forEach(([rx, dy]) => { const c = get(g, CX + rx, shineY + dy); if (c === base) set(g, CX + rx, shineY + dy, hi); });
    if (sh.part !== undefined) for (let y = sh.top(sh.part) + 1; y <= sh.top(sh.part) + 3; y++) set(g, CX + sh.part, y, shade);
  }

  function drawExtras(g, a) {
    const skin = SKIN[a.skin] || SKIN.light, hairC = (HAIR[a.hairColor] || HAIR.black)[1], acc = a.accent || '#1598ff';
    if (a.facialHair === 'stubble') for (let x = CX - 5; x <= CX + 4; x++) for (let y = 27; y <= 29; y++) if ((x + y) % 2 === 0 && get(g, x, y) === skin[0]) set(g, x, y, mix(skin[0], hairC, 0.35));
    if (a.facialHair === 'goatee') { hline(g, CX - 1, CX, 29, hairC); hline(g, CX - 2, CX + 1, 28, mix(skin[0], hairC, 0.6)); }
    if (a.mark === 'scar') { set(g, CX - 6, 22, '#b8606a'); set(g, CX - 5, 23, '#b8606a'); set(g, CX - 4, 24, '#b8606a'); }
    if (a.mark === 'bandage') { hline(g, CX + 3, CX + 5, 24, '#f2e2c6'); hline(g, CX + 3, CX + 5, 25, '#dccaa8'); set(g, CX + 4, 24, '#e8d4b0'); }
    if (a.mark === 'mole') set(g, CX + 4, 23, skin[2]);
    if (a.mark === 'paint') { hline(g, CX - 6, CX - 4, 23, acc); hline(g, CX + 3, CX + 5, 23, acc); }
    if (a.mark === 'freckles') [[CX - 5, 23], [CX - 3, 24], [CX + 3, 23], [CX + 5, 24], [CX - 4, 22], [CX + 4, 22]].forEach(([x, y]) => set(g, x, y, mix(skin[1], '#8a4a2a', 0.4)));
    if (a.accessory === 'headband') { hline(g, CX - 9, CX + 8, 13, acc); hline(g, CX - 9, CX + 8, 14, mix(acc, '#000000', 0.25)); }
    if (a.accessory === 'glasses') { for (const x0 of [CX - 7, CX + 1]) { hline(g, x0, x0 + 5, 18, OUT); hline(g, x0, x0 + 5, 23, OUT); set(g, x0, 19, OUT); set(g, x0, 20, OUT); set(g, x0, 21, OUT); set(g, x0, 22, OUT); set(g, x0 + 5, 19, OUT); set(g, x0 + 5, 20, OUT); set(g, x0 + 5, 21, OUT); set(g, x0 + 5, 22, OUT); } set(g, CX - 1, 19, OUT); set(g, CX, 19, OUT); }
    if (a.accessory === 'earring') { const hw = (FACES[a.face] || FACES.oval)[12]; set(g, CX + hw, 23, '#ffd166'); }
    if (a.accessory === 'hairclip') { set(g, CX - 7, 13, acc); set(g, CX - 6, 13, acc); set(g, CX - 7, 14, '#ffffff'); }
    if (a.accessory === 'wristband') { hline(g, CX - 16, CX - 13, 42, acc); hline(g, CX - 16, CX - 13, 43, acc); }
  }

  function render(a, ex, kit) {
    const g = grid(), e = EXPRESSIONS.includes(ex) ? ex : 'neutral';
    drawHair(g, a, 'back');
    drawBody(g, a, kit);
    drawFace(g, a);
    drawEyes(g, a, e);
    drawBrows(g, a, e);
    drawMouth(g, a, e);
    drawExtras(g, Object.assign({}, a, { accessory: a.accessory === 'glasses' ? 'none' : a.accessory }));
    drawHair(g, a, 'front');
    if (a.accessory === 'glasses') drawExtras(g, { accessory: 'glasses' });
    if (a.accessory === 'headband') drawExtras(g, { accessory: 'headband', accent: a.accent });
    return g;
  }

  // ---------- canvas output ----------
  const cache = new Map();
  function canDraw() { try { const c = root.document && root.document.createElement('canvas'); return !!(c && typeof c.getContext === 'function' && c.getContext('2d') && typeof c.getContext('2d').fillRect === 'function' && typeof c.toDataURL === 'function'); } catch (_) { return false; } }
  let DRAWABLE = null;
  function toDataURL(g, scale = 1, bg) {
    if (DRAWABLE === null) DRAWABLE = canDraw();
    if (!DRAWABLE) return '';
    const c = root.document.createElement('canvas'); c.width = g.w * scale; c.height = g.h * scale;
    const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const col = g.px[y * g.w + x]; if (col) { ctx.fillStyle = col; ctx.fillRect(x * scale, y * scale, scale, scale); } }
    const url = c.toDataURL('image/png');
    return typeof url === 'string' ? url : '';
  }
  function portrait(a, ex, kit) {
    const key = JSON.stringify([a, ex, kit]);
    if (cache.has(key)) return cache.get(key);
    let url = '';
    try { url = toDataURL(render(a, ex, kit), 1); } catch (_) { url = ''; }
    if (cache.size > 600) cache.clear();
    cache.set(key, url);
    return url;
  }

  // ---------- environments (64×36) ----------
  function env(name) {
    const key = 'env:' + name;
    if (cache.has(key)) return cache.get(key);
    const g = { w: 64, h: 36, px: new Array(64 * 36).fill(null) };
    const S = (x, y, c) => { if (x >= 0 && y >= 0 && x < 64 && y < 36) g.px[y * 64 + x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) S(x, y, c); };
    const dither = (x0, y0, x1, y1, c1, c2) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) S(x, y, (x + y) % 2 ? c1 : c2); };
    const grad = (y0, y1, a, b) => { for (let y = y0; y <= y1; y++) { const t = (y - y0) / Math.max(1, y1 - y0); rect(0, y, 63, y, mix(a, b, Math.round(t * 4) / 4)); } };
    switch (name) {
      case 'pitch': grad(0, 17, '#050a1a', '#13274f'); for (let i = 0; i < 4; i++) { const x = 6 + i * 17; rect(x, 2, x + 3, 3, '#fff6c8'); S(x + 1, 4, '#bfb98a'); dither(x - 2, 5, x + 5, 9, '#13274f', '#1f3a6a'); }
        rect(0, 14, 63, 17, '#0e1a30'); for (let x = 0; x < 64; x += 2) S(x, 15, '#2a4a7a');
        for (let y = 18; y < 36; y++) rect(0, y, 63, y, ((y >> 2) % 2) ? '#2f7a3a' : '#2a6e34'); rect(0, 26, 63, 26, '#d8f0d8'); for (let x = 22; x < 42; x++) S(x, 30 + Math.round(Math.abs(x - 32) / 6), '#d8f0d8'); break;
      case 'corridor': rect(0, 0, 63, 35, '#070b14'); for (let x = 0; x < 64; x++) { const t = Math.abs(x - 32) / 32; rect(x, 0, x, Math.round(6 + t * 4), '#0c1424'); rect(x, 35 - Math.round(4 + t * 6), x, 35, '#0a1220'); }
        for (let x = 4; x < 64; x += 14) { rect(x, 8, x + 6, 26, '#0f1a2e'); rect(x + 1, 9, x + 5, 25, '#132342'); S(x + 3, 12, '#1598ff'); S(x + 3, 13, '#7de7ff'); }
        for (let x = 0; x < 64; x += 3) { S(x, 30, '#1598ff'); S(x + 1, 31, '#0b4f8f'); } rect(0, 4, 63, 4, '#1a2a44'); break;
      case 'locker': grad(0, 35, '#141a26', '#0a0e16'); for (let x = 2; x < 64; x += 10) { rect(x, 4, x + 8, 28, '#26324a'); rect(x + 1, 5, x + 7, 27, '#2f3e5c'); for (let y = 7; y < 12; y += 2) rect(x + 2, y, x + 6, y, '#1c263a'); S(x + 6, 17, '#c9d4e8'); }
        rect(0, 29, 63, 31, '#3b2a1e'); rect(0, 29, 63, 29, '#5a4030'); break;
      case 'gym': grad(0, 20, '#1b1e26', '#262a34'); rect(0, 21, 63, 35, '#2e2620'); for (let x = 0; x < 64; x += 4) S(x, 22, '#3e342a');
        for (const x of [8, 40]) { rect(x, 12, x + 14, 13, '#7c828d'); rect(x - 1, 9, x + 1, 16, '#2a2d34'); rect(x + 13, 9, x + 15, 16, '#2a2d34'); } rect(26, 6, 36, 18, '#11141a'); rect(27, 7, 35, 17, '#1d3f78'); break;
      case 'training': grad(0, 15, '#0d1626', '#1b2c48'); for (let x = 0; x < 64; x += 8) rect(x, 0, x, 15, '#22385c'); for (let y = 16; y < 36; y++) rect(0, y, 63, y, ((y >> 1) % 2) ? '#2c6b38' : '#286232');
        for (const [x, y] of [[10, 24], [22, 27], [34, 24], [46, 27], [56, 24]]) { S(x, y, '#ff8a2a'); S(x - 1, y + 1, '#ff8a2a'); S(x + 1, y + 1, '#ff8a2a'); } break;
      case 'office': grad(0, 35, '#2a2620', '#1a1712'); rect(36, 4, 60, 20, '#16213a'); rect(37, 5, 59, 19, '#2b4e8a'); for (let x = 38; x < 59; x += 3) rect(x, 12 + (x % 5), x + 1, 19, '#1a2a48'); rect(47, 5, 48, 19, '#16213a');
        rect(4, 24, 34, 26, '#5a3e28'); rect(5, 27, 7, 35, '#3e2a1c'); rect(31, 27, 33, 35, '#3e2a1c'); rect(10, 20, 18, 23, '#c9d4e8'); break;
      case 'apartment': grad(0, 35, '#1f1a24', '#120f16'); rect(30, 3, 61, 22, '#0b1124'); for (let x = 31; x < 61; x += 2) { const h = 8 + ((x * 7) % 9); rect(x, 22 - h, x + 1, 21, '#141c36'); if ((x * 13) % 4 === 0) S(x, 22 - h + 2, '#ffd166'); }
        rect(45, 3, 46, 22, '#1f1a24'); rect(2, 22, 28, 28, '#4b3a5c'); rect(2, 20, 6, 28, '#5a4870'); rect(24, 20, 28, 28, '#5a4870'); rect(0, 29, 63, 35, '#2a2230'); break;
      case 'city': grad(0, 20, '#0a0f24', '#3a2a5a'); for (let x = 0; x < 64; x += 3) { const h = 6 + ((x * 11) % 15); rect(x, 30 - h, x + 2, 35, '#121830'); for (let y = 32 - h; y < 34; y += 3) if ((x + y) % 4 === 0) S(x + 1, y, '#ffd166'); }
        S(10, 4, '#ffffff'); S(40, 2, '#ffffff'); S(55, 6, '#ffffff'); break;
      default: grad(0, 35, '#0b1222', '#05070b');
    }
    const url = toDataURL(g, 1);
    cache.set(key, url);
    return url;
  }

  EW.sprites = { W, H, OPTIONS, EXPRESSIONS, SKIN, HAIR, EYES, ACCENTS, render, portrait, env, mix, canDraw };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.sprites;
})(typeof globalThis !== 'undefined' ? globalThis : this);
