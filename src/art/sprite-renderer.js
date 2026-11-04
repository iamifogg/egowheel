/* EgoWheel — pixel portrait renderer (v2).
 *
 * No image assets: every portrait is drawn from parameters onto a 48×56 colour grid (testable in
 * Node), then scaled up with nearest-neighbour filtering. The renderer works like a pixel artist:
 *   • every material (skin, hair, eyes, kit) uses a hue-shifted 6-tone ramp (warm highlights,
 *     cool shadows) for a consistent palette;
 *   • hair is built from tapered strands, clumps and volume blobs, then shaded with top-left light,
 *     a broken highlight band, and dark separation lines between clumps;
 *   • faces have proper proportions: shaped jaw and chin, ears, a hairline shadow, and anime-style
 *     eyes (heavy upper lash, shaded iris, pupil, catchlights);
 *   • a final selective-outline pass draws each silhouette in a darker tone of its own colour
 *     instead of flat black;
 *   • expressions change eyes, brows, mouth and cheeks, and named characters can carry a persona
 *     (cold, manic, bored, fierce, sunny) that flavours how each expression reads.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const W = 48, H = 56, CX = 24;

  // ---------- colour ----------
  function hex2rgb(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb2hex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function toHsl(c) {
    let [r, g, b] = hex2rgb(c).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgb2hex(f(0) * 255, f(8) * 255, f(4) * 255);
  }
  function toward(h, target, amt) { let d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), amt); }
  /** 6-tone ramp: hi, lt, base, sh, dk, ln (outline). Shadows rotate toward `cool`, highlights toward warm. */
  function ramp(base, cool = 250, minSat = 0) {
    const [h, s0, l] = toHsl(base), s = Math.max(s0, minSat);
    return {
      hi: fromHsl(toward(h, 50, 12), s * 0.85, Math.min(0.96, l + 0.2)),
      lt: fromHsl(toward(h, 50, 6), s * 0.95, Math.min(0.92, l + 0.09)),
      base,
      sh: fromHsl(toward(h, cool, 10), Math.min(0.88, s * 0.98 + 0.03), Math.max(0.07, l - 0.12)),
      dk: fromHsl(toward(h, cool, 20), Math.min(0.8, s * 0.92 + 0.04), Math.max(0.05, l - 0.24)),
      ln: fromHsl(toward(h, cool, 26), Math.min(0.62, s * 0.75 + 0.08), Math.max(0.035, l * 0.3 - 0.01))
    };
  }
  const RAMPS = new Map();
  function R(base, cool, minSat) { const k = base + cool + minSat; if (!RAMPS.has(k)) RAMPS.set(k, cool === 355 ? skinRamp(base) : ramp(base, cool, minSat)); return RAMPS.get(k); }
  /** Skin needs controlled warm shadows rather than saturated hue shifts. */
  function skinRamp(base) {
    const l = toHsl(base)[2];
    return { hi: mix(base, '#fff8ef', 0.55), lt: mix(base, '#fff1e2', 0.3), base, sh: mix(base, l > 0.55 ? '#b5644f' : '#5a2e22', l > 0.55 ? 0.32 : 0.3), dk: mix(base, l > 0.55 ? '#8a3f38' : '#3a1a14', l > 0.55 ? 0.48 : 0.45), ln: mix(base, '#24110f', l > 0.55 ? 0.78 : 0.68) };
  }

  // ---------- palettes (first entry = swatch / base) ----------
  const SKIN = { porcelain: ['#fbe4d4'], fair: ['#f6d4ba'], light: ['#eec29d'], warm: ['#e2ad84'], tan: ['#cf9567'], olive: ['#c08c5c'],
    bronze: ['#b07a4e'], brown: ['#9a6440'], deep: ['#774a30'], ebony: ['#5a3624'] };
  const HAIR = { black: ['#2b2c3a'], charcoal: ['#3d3a42'], navy: ['#283a64'], brown: ['#5e3c29'], chestnut: ['#7e4a2b'], auburn: ['#8e3a26'],
    blonde: ['#e8c76c'], gold: ['#d9a53c'], platinum: ['#e7e3d7'], white: ['#eef1f6'], silver: ['#a9b0bd'], ash: ['#8c8b88'],
    red: ['#bd3540'], crimson: ['#8f1f30'], pink: ['#ea8bab'], orange: ['#e27a2f'], purple: ['#6e4aa9'], lilac: ['#a993d8'],
    teal: ['#2b6e6d'], green: ['#3e7a45'], blue: ['#3c6fd6'] };
  const EYES = { brown: '#7a4a2a', hazel: '#8f7030', amber: '#d08f1e', gold: '#d9b437', green: '#2f9050', teal: '#1f9a90', cyan: '#2cb8d8',
    blue: '#3570d8', grey: '#7f8a9a', violet: '#7d4cc6', pink: '#d0508a', red: '#c22e3c' };
  const ACCENTS = ['#1598ff', '#ff5d73', '#ffd166', '#46e08a', '#b786ff', '#7de7ff', '#ff9f43', '#f2f2f2'];

  const HAIR_STYLES = ['messy', 'spiky', 'swept', 'parted', 'bowl', 'curtain', 'wild', 'long', 'ponytail', 'buzz', 'undercut', 'mohawk', 'bob', 'tousled',
    'fluffy', 'slick', 'sidefringe', 'quiff', 'afro', 'twists', 'waves', 'topknot', 'crop', 'shaggy'];
  const OPTIONS = {
    skin: Object.keys(SKIN), hairColor: Object.keys(HAIR), hairTip: ['none'].concat(Object.keys(HAIR)), eyeColor: Object.keys(EYES),
    hairStyle: HAIR_STYLES, eyeShape: ['standard', 'sharp', 'round', 'narrow', 'droopy', 'lidded', 'fierce'],
    brow: ['neutral', 'thick', 'thin', 'arched', 'straight', 'short'], face: ['oval', 'sharp', 'round', 'square', 'long', 'soft'],
    nose: ['button', 'sharp', 'long'], facialHair: ['none', 'stubble', 'goatee', 'beard'],
    mark: ['none', 'scar', 'bandage', 'mole', 'paint', 'freckles', 'tattoo'], accessory: ['none', 'headband', 'glasses', 'earring', 'hairclip', 'wristband', 'chain'],
    accent: ACCENTS
  };
  const EXPRESSIONS = ['neutral', 'confident', 'intense', 'angry', 'frustrated', 'smirk', 'surprised', 'defeated', 'elated', 'focused'];
  const EXTRA_EXPRESSIONS = ['bored', 'manic'];
  // Persona → how an expression request reads on that character.
  const PERSONA = {
    cold:   { neutral: 'neutral', confident: 'smirk', elated: 'smirk', focused: 'intense' },
    manic:  { confident: 'manic', elated: 'manic', smirk: 'manic', neutral: 'smirk' },
    bored:  { neutral: 'bored', confident: 'bored', focused: 'bored', smirk: 'bored' },
    fierce: { neutral: 'intense', confident: 'smirk', elated: 'smirk', focused: 'angry' },
    sunny:  { neutral: 'confident', confident: 'elated', focused: 'confident' },
    proud:  { neutral: 'neutral', confident: 'smirk', elated: 'confident' },
    shy:    { confident: 'neutral', elated: 'confident', angry: 'frustrated' }
  };
  function resolveExpression(a, ex) {
    const e = EXPRESSIONS.includes(ex) || EXTRA_EXPRESSIONS.includes(ex) ? ex : 'neutral';
    const p = a && PERSONA[a.persona];
    return (p && p[e]) || e;
  }

  // ---------- grid ----------
  function grid() { return { w: W, h: H, px: new Array(W * H).fill(null), ol: new Array(W * H).fill(null), m: new Array(W * H).fill(0) }; }
  // material ids: 1 skin, 2 hair, 3 eye, 4 kit, 5 accessory, 6 mouth/brow detail, 7 back hair
  function set(g, x, y, c, ol, mat) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H || !c) return; const i = y * W + x; g.px[i] = c; if (ol) g.ol[i] = ol; if (mat) g.m[i] = mat; }
  function get(g, x, y) { return x >= 0 && y >= 0 && x < W && y < H ? g.px[y * W + x] : null; }
  function mat(g, x, y) { return x >= 0 && y >= 0 && x < W && y < H ? g.m[y * W + x] : 0; }
  /** Symmetric span: pixel i is inside when |i + 0.5 - CX| <= hw. */
  function span(hw) { const a = Math.ceil(CX - hw - 0.5 + 1e-6), b = Math.floor(CX + hw - 0.5 - 1e-6); return [a, b]; }

  // ---------- deterministic variation ----------
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; }; }

  // ---------- face geometry ----------
  const FACE_TOP = 13, EYE_Y = 24;
  const FACES = {
    oval:   { cheek: 10.5, jaw: 27, chin: 3.4, chinY: 37, k: 1.7 },
    sharp:  { cheek: 10.2, jaw: 26, chin: 2.0, chinY: 37, k: 1.05 },
    round:  { cheek: 11.0, jaw: 28, chin: 5.2, chinY: 37, k: 2.5 },
    square: { cheek: 11.0, jaw: 30, chin: 6.2, chinY: 37, k: 3.2 },
    long:   { cheek: 9.6,  jaw: 29, chin: 3.4, chinY: 38, k: 1.7 },
    soft:   { cheek: 10.6, jaw: 28, chin: 4.4, chinY: 36, k: 2.1 }
  };
  function faceOf(a) { return FACES[a.face] || FACES.oval; }
  function faceHW(f, y) {
    if (y < FACE_TOP) return 0;
    if (y > f.chinY) return 0;
    if (y < 17) return f.cheek - (17 - y) * (y === FACE_TOP ? 1.6 : 0.75);
    if (y <= f.jaw) return f.cheek + (y >= 23 && y <= 26 ? 0.25 : 0);
    const t = (y - f.jaw) / (f.chinY - f.jaw);
    return f.chin + (f.cheek - f.chin) * (1 - Math.pow(t, f.k));
  }

  // ---------- body ----------
  function drawBody(g, a, kit) {
    const k = kit || { main: '#1d3f78', trim: '#f2f2f2', dark: '#132a52' };
    const sk = R(SKIN[a.skin]?.[0] || SKIN.light[0], 355, 0.2), km = R(k.main, 245, 0.1), kt = R(k.trim || '#f2f2f2', 240, 0.05);
    // neck
    for (let y = 34; y <= 44; y++) {
      const hw = 4.3 + (y > 40 ? (y - 40) * 0.6 : 0), [x0, x1] = span(hw);
      for (let x = x0; x <= x1; x++) set(g, x, y, x >= x1 - 1 ? sk.sh : sk.base, sk.ln, 1);
    }
    // shoulders / shirt
    const collar = a.collar || ['crew', 'v', 'polo'][(a.number || 0) % 3];
    for (let y = 42; y < H; y++) {
      const t = Math.min(1, (y - 42) / 6), hw = 8.5 + Math.pow(t, 0.6) * 14 + (y > 48 ? 0.5 : 0), [x0, x1] = span(hw);
      for (let x = x0; x <= x1; x++) {
        const rel = (x + 0.5 - CX) / hw;
        let c = rel < -0.55 ? km.lt : rel > 0.62 ? km.sh : km.base;
        if (rel > 0.85) c = km.dk;
        set(g, x, y, c, km.ln, 4);
      }
    }
    // folds from neck toward shoulders
    for (let i = 0; i < 5; i++) { set(g, CX + 7 + i, 45 + i, km.sh, null, 4); set(g, CX - 9 - i, 46 + i, km.base, null, 4); }
    // shoulder trim stripes
    for (let i = 0; i < 6; i++) { set(g, CX - 16 + i, 44 + Math.floor(i / 2), kt.base, km.ln, 4); set(g, CX + 10 + i, 44 + Math.floor((5 - i) / 2), kt.sh, km.ln, 4); }
    // collar
    if (collar === 'v') {
      for (let i = 0; i <= 5; i++) { for (let x = CX - 4 + i; x <= CX + 3 - i; x++) set(g, x, 42 + i, i === 0 ? sk.sh : sk.base, null, 1); set(g, CX - 5 + i, 42 + i, kt.base, null, 4); set(g, CX + 4 - i, 42 + i, kt.sh, null, 4); }
    } else if (collar === 'polo') {
      for (let i = 0; i < 4; i++) { set(g, CX - 6 + i, 42 + i, kt.base, km.ln, 4); set(g, CX - 5 + i, 42 + i, kt.lt, null, 4); set(g, CX + 5 - i, 42 + i, kt.sh, km.ln, 4); set(g, CX + 4 - i, 42 + i, kt.base, null, 4); }
      set(g, CX - 1, 46, kt.dk, null, 4); set(g, CX, 47, kt.dk, null, 4);
    } else {
      const [x0, x1] = span(5.2); for (let x = x0; x <= x1; x++) { set(g, x, 42, kt.base, km.ln, 4); set(g, x, 43, x > CX + 2 ? kt.sh : kt.lt, null, 4); }
      const [y0, y1] = span(4.2); for (let x = y0; x <= y1; x++) set(g, x, 42, sk.sh, null, 1);
    }
    // number on the chest
    if (a.number) {
      const D = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111' };
      const digits = String(a.number).slice(0, 2).split(''); let x0 = CX + 7 - (digits.length - 1) * 2;
      digits.forEach((d, di) => { const m = D[d]; for (let i = 0; i < 15; i++) if (m[i] === '1') set(g, x0 + di * 4 + (i % 3), 47 + Math.floor(i / 3), kt.base, null, 4); });
    }
    // crest
    set(g, CX - 9, 47, a.accent || '#1598ff', null, 4); set(g, CX - 8, 47, a.accent || '#1598ff', null, 4); set(g, CX - 9, 48, mix(a.accent || '#1598ff', '#000000', 0.35), null, 4); set(g, CX - 8, 48, mix(a.accent || '#1598ff', '#000000', 0.2), null, 4);
  }

  // ---------- head ----------
  function drawFace(g, a) {
    const sk = R(SKIN[a.skin]?.[0] || SKIN.light[0], 355, 0.2), f = faceOf(a);
    for (let y = FACE_TOP; y <= f.chinY; y++) {
      const hw = faceHW(f, y), [x0, x1] = span(hw);
      for (let x = x0; x <= x1; x++) {
        const rel = (x + 0.5 - CX) / hw;
        let c = sk.base;
        if (rel > 0.72) c = sk.sh;
        else if (rel < -0.55 && y >= 19 && y <= 30) c = sk.lt;
        if (y >= f.jaw + 2 && rel > 0.45) c = sk.sh;
        if (y === f.chinY && Math.abs(rel) < 0.7) c = sk.sh;
        set(g, x, y, c, sk.ln, 1);
      }
    }
    // cheekbone highlight
    set(g, CX - 7, 27, sk.lt, null, 1); set(g, CX - 6, 28, sk.lt, null, 1);
    // ears
    for (let y = 23; y <= 29; y++) {
      const hw = faceHW(f, y), [x0, x1] = span(hw), d = y === 23 || y === 29 ? 1 : 2;
      for (let i = 1; i <= d; i++) { set(g, x0 - i, y, i === d ? sk.sh : sk.base, sk.ln, 1); set(g, x1 + i, y, i === d ? sk.dk : sk.sh, sk.ln, 1); }
    }
    set(g, span(faceHW(f, 26))[0] - 1, 26, sk.dk, null, 1); set(g, span(faceHW(f, 26))[1] + 1, 26, sk.dk, null, 1);
    // nose
    const nose = a.nose || (a.face === 'sharp' || a.face === 'long' ? 'sharp' : 'button');
    if (nose === 'sharp') { set(g, CX, 27, sk.sh, null, 1); set(g, CX, 28, sk.sh, null, 1); set(g, CX - 1, 29, sk.lt, null, 1); set(g, CX, 29, sk.dk, null, 1); }
    else if (nose === 'long') { set(g, CX, 26, sk.sh, null, 1); set(g, CX, 27, sk.sh, null, 1); set(g, CX, 28, sk.sh, null, 1); set(g, CX, 29, sk.dk, null, 1); set(g, CX - 1, 29, sk.dk, null, 1); }
    else { set(g, CX, 28, sk.sh, null, 1); set(g, CX, 29, sk.dk, null, 1); set(g, CX - 1, 28, sk.lt, null, 1); }
    // chin & jaw contour shadow on the neck
    for (let x = CX - 4; x <= CX + 4; x++) if (mat(g, x, f.chinY + 1) === 1) set(g, x, f.chinY + 1, sk.dk, null, 1);
    for (let x = CX - 4; x <= CX + 4; x++) if (mat(g, x, f.chinY + 2) === 1 && x > CX - 3) set(g, x, f.chinY + 2, sk.sh, null, 1);
  }

  // Eye geometry by shape. h = open rows, lash = upper-lash thickness at the outer end, flick = outer corner offset.
  const EYE_SHAPES = {
    standard: { w: 6, h: 4, lash: 2, flick: 0, iris: 3 },
    sharp:    { w: 6, h: 3, lash: 2, flick: -1, iris: 3, almond: true },
    round:    { w: 6, h: 4, lash: 1, flick: 0, iris: 4, big: true },
    narrow:   { w: 6, h: 2, lash: 2, flick: -1, iris: 3 },
    droopy:   { w: 6, h: 4, lash: 1, flick: 1, iris: 3 },
    lidded:   { w: 6, h: 2, lash: 1, flick: 1, iris: 3, lid: true },
    fierce:   { w: 6, h: 3, lash: 2, flick: -1, iris: 2, almond: true }
  };
  function drawEyes(g, a, ex) {
    const sk = R(SKIN[a.skin]?.[0] || SKIN.light[0], 355, 0.2), ir = R(EYES[a.eyeColor] || EYES.brown, 255, 0.3);
    const hairDk = R(HAIR[a.hairColor]?.[0] || HAIR.black[0], 255, 0.1).ln, lash = mix(hairDk, '#0c0910', 0.55);
    const base = EYE_SHAPES[a.eyeShape] || EYE_SHAPES.standard, gap = a.eyeGap ?? 3;
    for (const side of [-1, 1]) {
      const s = Object.assign({}, base);
      let slant = 0, look = 0, irisW = s.iris, lid = !!s.lid, closed = false, small = false;
      switch (ex) {
        case 'angry': slant = 1; s.h = Math.max(2, s.h - 1); small = true; break;
        case 'intense': s.h = Math.max(2, s.h - 1); slant = s.almond ? 1 : 0; break;
        case 'focused': s.h = Math.max(2, s.h - 1); break;
        case 'surprised': s.h = Math.min(5, s.h + 1); irisW = 2; small = true; break;
        case 'frustrated': slant = -1; break;
        case 'defeated': lid = true; s.h = 2; look = 1; break;
        case 'bored': lid = true; s.h = 2; break;
        case 'elated': closed = true; break;
        case 'smirk': if (side > 0) s.h = Math.max(2, s.h - 1); break;
        case 'manic': s.h = Math.min(5, s.h + 1); irisW = 2; small = true; slant = 1; break;
      }
      const x0 = side < 0 ? CX - gap - s.w : CX + gap, x1 = x0 + s.w - 1, outer = side < 0 ? x0 : x1, inner = side < 0 ? x1 : x0;
      const top = EYE_Y;
      // y of the upper lash at column x (slant: inner end lower when angry)
      const lashY = x => { const tIn = side < 0 ? (x - x0) / (s.w - 1) : (x1 - x) / (s.w - 1); return top + Math.round(slant * (tIn - 0.4)) + (x === outer ? s.flick : 0); };
      if (closed) { // happy closed arcs
        for (let x = x0; x <= x1; x++) { const t = Math.abs((x - x0) - (s.w - 1) / 2); set(g, x, top + 1 + (t >= 2 ? 1 : 0), lash, null, 3); }
        continue;
      }
      for (let x = x0; x <= x1; x++) {
        const ly = lashY(x), rows = s.h - (s.almond && x === inner ? 1 : 0);
        for (let r = 1; r <= rows; r++) {
          const y = ly + r;
          let c = r === 1 ? '#cfd2e4' : '#f6f4fa';
          if (lid && r === 1) c = sk.sh;
          set(g, x, y, c, null, 3);
        }
        set(g, x, ly, lash, null, 3);
        const outerness = side < 0 ? (x1 - x) : (x - x0);
        if (s.lash >= 2 && outerness >= s.w - 3) set(g, x, ly - 1, lash, null, 3);
        if (lid) set(g, x, ly - 1, sk.sh, null, 1);
      }
      set(g, side < 0 ? x0 - 1 : x1 + 1, lashY(outer) + (s.flick > 0 ? 0 : -0) , lash, null, 3); // outer lash tail
      // iris
      const ix0 = side < 0 ? x0 + Math.ceil((s.w - irisW) / 2) + 0 : x0 + Math.floor((s.w - irisW) / 2), ix1 = ix0 + irisW - 1;
      for (let x = ix0; x <= ix1; x++) {
        const ly = lashY(x), rows = s.h;
        for (let r = 1 + (lid ? 1 : 0) + (look > 0 ? 0 : 0); r <= rows; r++) {
          const y = ly + r;
          if (mat(g, x, y) !== 3) continue;
          let c = r === 1 + (lid ? 1 : 0) ? ir.dk : r === rows ? ir.lt : ir.base;
          if (small && (r === 1)) c = '#f6f4fa';
          set(g, x, y, c, null, 3);
        }
      }
      // pupil and catchlights
      const pc = Math.round((ix0 + ix1) / 2), ly = lashY(pc);
      if (s.h >= 3 && !lid) { set(g, pc, ly + 2, ir.ln, null, 3); if (s.h >= 4) set(g, pc, ly + 3, ir.ln, null, 3); }
      else set(g, pc, ly + s.h, ir.dk, null, 3);
      if (!small || ex === 'surprised') { const cx = side < 0 ? ix0 : ix0; if (mat(g, cx, ly + 1 + (lid ? 1 : 0)) === 3) set(g, cx, ly + 1 + (lid ? 1 : 0), '#ffffff', null, 3); }
      if (s.big && s.h >= 4) set(g, ix1, ly + s.h - 1, mix(ir.hi, '#ffffff', 0.5), null, 3);
      // lower lid / lash hint
      const by = top + s.h + 1 + (slant > 0 ? 0 : 0);
      for (let x = x0; x <= x1; x++) { const o = side < 0 ? x - x0 : x1 - x; if (o <= 2 && mat(g, x, by) === 1) set(g, x, by, sk.sh, null, 1); }
      if (ex === 'surprised' || ex === 'manic') for (let x = x0 + 1; x < x1; x++) if (mat(g, x, top - 1) === 1) set(g, x, top - 1, sk.sh, null, 1);
      if (ex === 'defeated' || ex === 'bored') { for (let x = x0; x <= x1; x++) if (mat(g, x, by + 1) === 1 && (side < 0 ? x > x0 : x < x1)) set(g, x, by + 1, mix(sk.base, sk.sh, 0.5), null, 1); }
    }
  }

  function drawBrows(g, a, ex) {
    const hr = R(HAIR[a.hairColor]?.[0] || HAIR.black[0], 255, 0.1), c = hr.dk === hr.base ? hr.ln : mix(hr.dk, hr.ln, 0.4), c2 = hr.sh;
    const type = a.brow || 'neutral', gap = (a.eyeGap ?? 3) - 1;
    const len = type === 'short' ? 4 : type === 'thin' ? 5 : 6, thick = type === 'thick' || type === 'straight' ? 2 : 1;
    let baseY = 20;
    for (const side of [-1, 1]) {
      let inDy = 0, outDy = 0, mid = type === 'arched' ? -1 : type === 'straight' ? 0 : (type === 'neutral' ? -0.5 : 0);
      switch (ex) {
        case 'angry': inDy = 2; outDy = -1; break;
        case 'intense': inDy = 1; outDy = 0; break;
        case 'focused': inDy = 1; outDy = 0; break;
        case 'frustrated': inDy = -1; outDy = 1; break;
        case 'defeated': inDy = -1; outDy = 1; break;
        case 'surprised': inDy = -2; outDy = -2; break;
        case 'smirk': if (side > 0) { inDy = -1; outDy = -2; } else { inDy = 1; } break;
        case 'confident': if (side > 0) { inDy = -1; outDy = -1; } break;
        case 'manic': inDy = 1; outDy = -2; break;
        case 'bored': inDy = 0; outDy = 1; break;
        case 'elated': inDy = -1; outDy = -1; break;
      }
      for (let i = 0; i < len; i++) {
        const x = side < 0 ? CX - gap - 1 - i : CX + gap + i, t = i / (len - 1);
        const dy = Math.round(inDy * (1 - t) + outDy * t + (t > 0.2 && t < 0.8 ? mid : 0));
        const y = baseY + dy;
        if (thick === 2 || (type === 'neutral' && t < 0.5)) set(g, x, y + 1, i === len - 1 ? c2 : c, null, 6);
        set(g, x, y, c, null, 6);
      }
    }
  }

  function drawMouth(g, a, ex) {
    const sk = R(SKIN[a.skin]?.[0] || SKIN.light[0], 355, 0.2), lip = mix(sk.dk, '#6e2234', 0.35), dark = mix(sk.ln, '#3a0d1a', 0.4), inner = '#5b1b2a', teeth = '#f4f1ee', tongue = '#d8697a';
    const y = 32, P = (x, yy, c) => set(g, x, yy, c, null, 6);
    switch (ex) {
      case 'confident': P(CX - 2, y, lip); P(CX - 1, y + 1, lip); P(CX, y + 1, lip); P(CX + 1, y, lip); P(CX + 2, y - 1, lip); break;
      case 'smirk': P(CX - 2, y + 1, lip); P(CX - 1, y + 1, lip); P(CX, y + 1, lip); P(CX + 1, y, lip); P(CX + 2, y - 1, dark); P(CX + 3, y - 1, sk.sh); P(CX + 1, y + 1, teeth); break;
      case 'angry': for (let x = CX - 3; x <= CX + 2; x++) { P(x, y, dark); P(x, y + 2, dark); P(x, y + 1, (x - CX) % 2 ? teeth : mix(teeth, '#b8b2b0', 0.4)); } P(CX - 4, y + 1, dark); P(CX + 3, y + 1, dark); break;
      case 'surprised': P(CX - 1, y, dark); P(CX, y, dark); P(CX - 2, y + 1, dark); P(CX + 1, y + 1, dark); P(CX - 1, y + 1, inner); P(CX, y + 1, inner); P(CX - 1, y + 2, dark); P(CX, y + 2, dark); break;
      case 'frustrated': P(CX - 3, y + 1, lip); P(CX - 2, y, lip); P(CX - 1, y, dark); P(CX, y + 1, dark); P(CX + 1, y, lip); P(CX + 2, y + 1, lip); P(CX - 1, y + 1, teeth); break;
      case 'defeated': P(CX - 2, y + 1, lip); P(CX - 1, y, lip); P(CX, y, lip); P(CX + 1, y + 1, lip); break;
      case 'elated': for (let x = CX - 3; x <= CX + 2; x++) { P(x, y, dark); P(x, y + 1, x === CX - 3 || x === CX + 2 ? dark : teeth); } for (let x = CX - 2; x <= CX + 1; x++) P(x, y + 2, x === CX - 2 || x === CX + 1 ? dark : tongue); P(CX - 1, y + 3, dark); P(CX, y + 3, dark); break;
      case 'manic': for (let x = CX - 4; x <= CX + 3; x++) { P(x, y - (x === CX - 4 || x === CX + 3 ? 1 : 0), dark); P(x, y + 1, (x + 1) % 2 ? teeth : '#d9d4d0'); P(x, y + 2, Math.abs(x - CX + 0.5) < 2 ? tongue : inner); } P(CX - 3, y + 3, dark); for (let x = CX - 2; x <= CX + 1; x++) P(x, y + 3, Math.abs(x - CX + 0.5) < 1 ? tongue : dark); P(CX + 2, y + 3, dark); break;
      case 'intense': P(CX - 1, y, dark); P(CX, y, dark); P(CX + 1, y, lip); P(CX - 2, y, lip); break;
      case 'focused': P(CX - 1, y, lip); P(CX, y, lip); P(CX + 1, y, lip); break;
      case 'bored': P(CX - 1, y, lip); P(CX, y, lip); break;
      default: P(CX - 2, y, sk.sh); P(CX - 1, y, lip); P(CX, y, lip); P(CX + 1, y, sk.sh); P(CX - 1, y + 2, mix(sk.base, sk.sh, 0.5)); P(CX, y + 2, mix(sk.base, sk.sh, 0.5));
    }
    if (ex === 'elated' || ex === 'manic') { const bl = mix(sk.base, '#f0607a', 0.4); [[CX - 8, 29], [CX - 7, 29], [CX + 6, 29], [CX + 7, 29]].forEach(([x, yy]) => mat(g, x, yy) === 1 && set(g, x, yy, bl, null, 1)); }
    if (ex === 'angry' || ex === 'manic') { set(g, CX - 1, 26, sk.sh, null, 1); set(g, CX, 26, sk.sh, null, 1); }
    if (ex === 'frustrated' || ex === 'defeated') { set(g, CX + 8, 21, '#9ad6ff', null, 6); set(g, CX + 8, 22, '#6fb8f0', null, 6); }
  }

  // ---------- hair ----------
  // Shapes (x relative to centre line, y absolute):
  //   cap   {k:'cap'}                         skull volume above the hairline
  //   s     {k:'s', b:[x,y], t:[x,y], w, tw, c:[dx,dy], over}   tapered (bezier) strand
  //   e     {k:'e', c:[x,y], r:[rx,ry]}       volume blob
  //   shave {k:'shave', y}                    shaved sides below y
  const st = (bx, by, tx, ty, w, o) => Object.assign({ k: 's', b: [bx, by], t: [tx, ty], w }, o || {});
  const el = (cx, cy, rx, ry, o) => Object.assign({ k: 'e', c: [cx, cy], r: [rx, ry] }, o || {});
  const mirror = s => s.k === 's' ? Object.assign({}, s, { b: [-s.b[0], s.b[1]], t: [-s.t[0], s.t[1]], c: s.c ? [-s.c[0], s.c[1]] : undefined }) : s.k === 'e' ? Object.assign({}, s, { c: [-s.c[0], s.c[1]] }) : s;
  const both = arr => arr.concat(arr.map(mirror));

  function fringe(r, n, x0, x1, yb, len, tilt, w, jit, o) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1), x = x0 + (x1 - x0) * t, l = len + (r() - 0.5) * 2 * jit, tl = (typeof tilt === 'function' ? tilt(t) : tilt) + (r() - 0.5) * jit * 0.6;
      out.push(st(x, yb, x + tl, yb + l + 2.5, w * 1.3, Object.assign({ c: [tl * 0.25, -1] }, o || {})));
    }
    return out;
  }
  function sideLocks(r, hw, len, w) { return both([st(-hw - 0.5, 14, -hw + 0.6, 22 + len, w || 3.2, { c: [-1, 0] }), st(-hw + 1.5, 15, -hw + 2.2, 20 + len * 0.7, 2.6, { c: [-0.5, 0] })]); }

  /** Radial spikes from the crown: wide bases that merge into the mass, tips pointing outward. */
  function spikes(n, a0, a1, len, w, o) {
    const out = [], cy = 19.5, rx = 11.5, ry = 13.5;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1), a = (a0 + (a1 - a0) * t) * Math.PI / 180, l = Array.isArray(len) ? len[i % len.length] : len;
      const bx = Math.cos(a) * rx * 0.55, by = cy + Math.sin(a) * ry * 0.55, tx = Math.cos(a) * (rx * 0.62 + l), ty = cy + Math.sin(a) * (ry * 0.62 + l);
      out.push(st(bx, by, tx, ty, w, Object.assign({ c: [Math.sin(a) * -1.2, 0] }, o || {})));
    }
    return out;
  }
  /** Library styles. P: { hw (face cheek half-width), L (0-2 length), r (rng) }. */
  const STYLES = {
    messy: P => ({ vol: 0.5, front: [{ k: 'cap' }, ...fringe(P.r, 7, -P.hw + 1.5, P.hw - 1.5, 11, 7.5, t => (t - 0.5) * 3, 3.2, 1.6), ...sideLocks(P.r, P.hw, 2 + P.L * 3), st(-2, 7, -4, 2.5, 2.4), st(2, 7, 4.5, 3, 2.2)] }),
    spiky: P => ({ vol: 0.8, front: [{ k: 'cap' }, ...spikes(6, -160, -20, [5, 7, 8, 8, 7, 5], 6), ...fringe(P.r, 6, -P.hw + 2, P.hw - 2, 12, 6, t => (t - 0.5) * 3, 3, 1), ...sideLocks(P.r, P.hw, P.L * 2)] }),
    swept: P => ({ vol: 0.5, front: [{ k: 'cap' }, ...fringe(P.r, 6, -P.hw + 1, P.hw - 3, 10, 8, 4.5, 3.4, 0.8), ...sideLocks(P.r, P.hw, 1 + P.L * 3)] }),
    parted: P => ({ vol: 0.3, part: -3, front: [{ k: 'cap' }, ...fringe(P.r, 3, -4, -P.hw + 1.5, 10, 7, -2.5, 3.4, 0.6), ...fringe(P.r, 4, -2, P.hw - 1.5, 10, 7.5, 2.5, 3.4, 0.6), ...sideLocks(P.r, P.hw, 3 + P.L * 3)] }),
    bowl: P => ({ vol: 1, front: [{ k: 'cap' }, ...fringe(P.r, 8, -P.hw + 0.5, P.hw - 0.5, 10, 9, 0, 3.6, 0.3, { blunt: true }), ...both([st(-P.hw - 0.5, 13, -P.hw, 25 + P.L * 2, 3.4)])] }),
    curtain: P => ({ vol: 0.5, part: 0, front: [{ k: 'cap' }, ...both([st(-1, 10, -6, 20, 3.4, { c: [0, -2] }), st(-3, 10, -9, 22, 3.2, { c: [-1, -1] }), st(-5, 11, -P.hw - 0.5, 26 + P.L * 3, 3.4, { c: [-1, 0] })])] }),
    wild: P => ({ vol: 1.6, front: [{ k: 'cap' }, ...spikes(8, -175, -5, [6, 8, 9, 7, 9, 8, 6, 7], 5.6), ...both([st(-P.hw, 18, -P.hw - 3, 23, 3)]), ...fringe(P.r, 6, -P.hw + 2, P.hw - 2, 12, 7, t => (t - 0.5) * 4, 3.2, 1.6)] }),
    long: P => ({ vol: 0.5, part: -2, back: [el(0, 24, P.hw + 3.5, 14), ...both([st(-P.hw - 2, 22, -P.hw - 3, 46 + P.L * 3, 6, { tw: 3 })])], front: [{ k: 'cap' }, ...fringe(P.r, 3, -3, -P.hw + 2, 10, 8, -2, 3.4, 0.6), ...fringe(P.r, 4, -1, P.hw - 2, 10, 8.5, 2, 3.4, 0.6), ...both([st(-P.hw - 0.5, 13, -P.hw - 1, 38 + P.L * 3, 3.6, { c: [-1, 0] })])] }),
    ponytail: P => ({ vol: 0.3, back: [st(5, 12, 13, 34 + P.L * 3, 4.5, { tw: 2, c: [4, 2] })], front: [{ k: 'cap' }, ...fringe(P.r, 5, -P.hw + 2, P.hw - 3, 10, 6.5, 3, 3, 0.6), ...sideLocks(P.r, P.hw, 1)] }),
    buzz: P => ({ vol: -1, hairline: [12, 19], texture: true, front: [{ k: 'cap' }] }),
    undercut: P => ({ vol: 0.5, shave: 16, front: [{ k: 'cap' }, ...fringe(P.r, 5, -6, 5, 8, 9, 5, 4, 0.8)] }),
    mohawk: P => ({ vol: -0.5, shave: 30, front: [{ k: 'cap', within: 3 }, ...[-1.5, 1.5].map((x, i) => st(x, 13 - i, x * 0.5, 1 + i, 4.2)), st(0, 11, 0, -1, 4.6)] }),
    bob: P => ({ vol: 1.2, front: [{ k: 'cap' }, ...fringe(P.r, 7, -P.hw + 1, P.hw - 1, 10, 8, t => (t - 0.5) * 1.5, 3.6, 0.6), ...both([st(-P.hw - 1, 13, -P.hw + 1.5, 31 + P.L * 2, 4.6, { c: [-2.5, 0] })])] }),
    tousled: P => ({ vol: 1, front: [{ k: 'cap' }, ...fringe(P.r, 7, -P.hw + 1.5, P.hw - 1.5, 11, 7, t => (t - 0.5) * 4, 3.4, 2, { c: [1.5, 0] }), ...sideLocks(P.r, P.hw, 2 + P.L * 2), st(-1, 6, 2, 2, 2.8)] }),
    fluffy: P => ({ vol: 2.2, front: [{ k: 'cap' }, ...[[-8, 9, 4.2], [-3, 6.5, 4.4], [3, 6.5, 4.4], [8, 9, 4.2], [-P.hw, 14, 3.6], [P.hw, 14, 3.6], [-P.hw - 0.5, 19, 3], [P.hw + 0.5, 19, 3]].map(([x, y, r]) => el(x, y, r, r * 0.85)),
      ...[-7, -3.5, 0, 3.5, 7].map((x, i) => el(x, 15 + (i % 2), 2.6, 2.6)), ...fringe(P.r, 5, -6, 6, 13, 4.5, t => (t - 0.5) * 3, 3.2, 1.2)] }),
    slick: P => ({ vol: 0.6, hairline: [12, 18], lines: true, front: [{ k: 'cap' }, ...both([st(-P.hw - 0.5, 12, -P.hw - 1, 20 + P.L * 2, 2.6)])] }),
    sidefringe: P => ({ vol: 0.6, front: [{ k: 'cap' }, st(-P.hw + 1, 10, 3, 26, 4.6, { c: [-2, -2], over: true }), st(-3, 10, 7, 25, 3.6, { c: [0, -2], over: true }), st(2, 10, 9, 22, 3.2, { c: [0, -1] }), st(P.hw - 2, 11, P.hw, 20, 3), ...sideLocks(P.r, P.hw, 2 + P.L * 2)] }),
    quiff: P => ({ vol: 0.5, shave: 18, front: [{ k: 'cap' }, el(-1, 6, 7.5, 4.5), st(-6, 9, 3, 3, 4.2, { c: [-2, -3] }), st(-2, 9, 6, 4, 4, { c: [0, -3] }), st(3, 10, 7, 13, 2.6)] }),
    afro: P => ({ vol: 4, texture: true, front: [{ k: 'cap' }, el(0, 11, P.hw + 5, 9.5), ...both([el(-P.hw - 2, 17, 4, 5)])] }),
    twists: P => ({ vol: 1.5, front: [{ k: 'cap' }, ...[-9, -6, -3, 0, 3, 6, 9].map((x, i) => st(x, 8 + Math.abs(x) * 0.3, x * 1.15, 16 + (i % 2) * 2 + P.L * 2, 2.4, { tw: 1.8 })), ...both([st(-P.hw - 1, 14, -P.hw - 1.5, 24 + P.L * 3, 2.4, { tw: 1.8 })])] }),
    waves: P => ({ vol: 1, front: [{ k: 'cap' }, ...fringe(P.r, 6, -P.hw + 1.5, P.hw - 1.5, 10, 8, t => (t - 0.5) * 2, 3.6, 1, { c: [2.2, 0] }), ...both([st(-P.hw - 0.5, 13, -P.hw - 0.5, 28 + P.L * 3, 3.4, { c: [-2.5, 0] })])] }),
    topknot: P => ({ vol: 0, hairline: [12, 19], texture: true, front: [{ k: 'cap' }, el(0, 4.5, 4, 3.2), st(-3, 8, -5, 13, 2)] }),
    crop: P => ({ vol: 0, hairline: [13, 19], front: [{ k: 'cap' }, ...fringe(P.r, 6, -P.hw + 3, P.hw - 3, 10, 4.5, 0.5, 3, 0.8)] }),
    shaggy: P => ({ vol: 1.2, front: [{ k: 'cap' }, ...fringe(P.r, 8, -P.hw + 1, P.hw - 1, 11, 8.5, t => (t - 0.5) * 2.5, 3.2, 2.2), ...both([st(-P.hw - 0.5, 13, -P.hw - 1.5, 30 + P.L * 2, 3.4, { c: [-1, 0] }), st(-P.hw + 1, 14, -P.hw + 0.5, 26 + P.L * 2, 2.8)])] })
  };

  /** Bespoke signature hair for major named characters (original pixel interpretations). */
  const SIGNATURE = {
    // Short dark hair, slightly parted fringe, two antenna strands curling up from the crown.
    isagi: P => ({ vol: 0.6, part: -2, front: [{ k: 'cap' }, ...fringe(P.r, 3, -3, -P.hw + 1.5, 10, 8, -2, 3.4, 0.5), ...fringe(P.r, 4, -1, P.hw - 1.5, 10, 8.5, 2.2, 3.4, 0.5), ...sideLocks(P.r, P.hw, 3),
      st(0, 7, 3, -1, 1.6, { c: [-2.5, -1], tw: 0.6 }), st(1.5, 7, 5.5, 0.5, 1.4, { c: [-1, -1.5], tw: 0.6 })] }),
    // Rounded two-tone bob: dark crown, bright lower half, choppy fringe.
    bachira: P => ({ vol: 2.2, tipY: 15, front: [{ k: 'cap' }, ...fringe(P.r, 7, -P.hw + 1, P.hw - 1, 10, 7.5, t => (t - 0.5) * 2.5, 3.6, 1.6), ...both([st(-P.hw - 1, 11, -P.hw - 3.5, 28, 5.4, { c: [-1.5, 2] }), st(-P.hw, 13, -P.hw + 1.5, 25, 3.4), st(-P.hw - 2, 20, -P.hw - 5, 26, 3, { c: [0, 1] })])] }),
    // A cloud of soft white clumps, big volume, fringe of rounded tufts.
    nagi: P => ({ vol: 2.6, front: [{ k: 'cap' }, ...[[-9, 10, 4.6], [-4, 6.2, 4.8], [2, 5.8, 5], [7.5, 8.5, 4.6], [-P.hw - 1, 15, 3.8], [P.hw + 1, 15, 3.8], [-P.hw - 1, 20.5, 3], [P.hw + 1, 20.5, 3]].map(([x, y, r]) => el(x, y, r, r * 0.82)),
      el(-7, 14.5, 3, 2.8), el(-2.5, 15.5, 3, 2.6), el(2.5, 15, 2.8, 2.7), el(7, 14.5, 3, 2.6), ...fringe(P.r, 5, -7, 7, 14, 4.5, t => (t - 0.5) * 3, 3, 1)] }),
    // Neat medium hair, side part, long fringe sweeping right, locks to the jaw.
    reo: P => ({ vol: 0.8, part: -4, front: [{ k: 'cap' }, ...fringe(P.r, 2, -5, -P.hw + 1.5, 10, 8, -2, 3.6, 0.3), ...fringe(P.r, 5, -3, P.hw - 1, 9.5, 10, 3.2, 3.6, 0.6), ...both([st(-P.hw - 0.5, 13, -P.hw, 31, 3.8, { c: [-1, 0] })])] }),
    // Swept-back mane with a dramatic forward crest and a V hairline.
    barou: P => ({ vol: 1, hairline: [12.5, 18], lines: true, front: [{ k: 'cap' }, ...spikes(5, -150, -35, [6, 9, 11, 10, 8], 8, { c: [2.5, 0] }), st(-1, 10, 9, 5, 6, { c: [0, -2] }),
      st(2, 11, 6.5, 18, 2.6, { c: [1.5, -1], tw: 0.6 }), ...both([st(-P.hw - 0.5, 13, -P.hw - 2.5, 19, 3)])] }),
    // Back-swept crest with flaring spikes, shaved sides, bright tips.
    shidou: P => ({ vol: 0.4, tipFrom: 0.62, hairline: [12.5, 18], front: [{ k: 'cap' }, ...spikes(5, -168, -12, [9, 10.5, 11, 10.5, 9], 9.5), st(0, 9, 0, 0, 7),
      ...both([st(-P.hw - 0.5, 13, -P.hw - 3.5, 19, 4, { c: [-1, 0] })])] }),
    // Long side fringe falling across the right eye; short and sharp elsewhere.
    rin: P => ({ vol: 0.6, front: [{ k: 'cap' }, st(-P.hw + 1, 9, 5, 25.5, 6.4, { c: [-1, -3], over: true }), st(0, 10, 8.5, 25, 4.6, { c: [1, -2], over: true }), st(3, 10, 10, 22, 3.2, { c: [0, -1] }), st(-P.hw + 0.5, 11, -P.hw - 0.5, 21, 3),
      st(P.hw - 0.5, 12, P.hw + 0.5, 23, 3), ...fringe(P.r, 2, -7, -5, 10, 7, -1, 2.8, 0.4)] }),
    // Short, tidy curtain fringe, calm and precise.
    sae: P => ({ vol: 0.4, part: 1, front: [{ k: 'cap' }, st(1, 10, -5, 19.5, 3.6, { c: [0, -2] }), st(-1, 10, -9, 19, 3.4, { c: [-1, -1] }), st(2, 10, 7, 19.5, 3.4, { c: [0, -2] }), st(4, 10, 10, 20, 3, { c: [1, -1] }), ...sideLocks(P.r, P.hw, 1)] }),
    // Long straight hair past the shoulders, side-parted, framing a sharp face.
    chigiri: P => ({ vol: 0.6, part: -3, back: [el(0, 25, P.hw + 4, 15), ...both([st(-P.hw - 3, 22, -P.hw - 4, 54, 7, { tw: 4 })])], front: [{ k: 'cap' }, ...fringe(P.r, 2, -5, -P.hw + 1.5, 10, 9, -2.5, 3.6, 0.4), ...fringe(P.r, 5, -3, P.hw - 1, 10, 10, 2.6, 3.6, 0.6),
      ...both([st(-P.hw - 0.5, 13, -P.hw - 1.5, 44, 4, { c: [-1, 0] })])] }),
    // Short swept-up hair with clipped sides, strong square jaw.
    kunigami: P => ({ vol: 0.6, shave: 19, front: [{ k: 'cap' }, st(-6, 11, -4, 4, 4.4, { c: [-2, -1] }), st(-2, 10, 2, 3, 4.4, { c: [-1, -1] }), st(3, 10, 7, 4, 4.2), st(6, 12, 10, 8, 3.6), st(-3, 12, 1, 15, 2.8, { c: [-1, -1] })] }),
    // Long side-swept fringe, light colour fading to vivid tips.
    kaiser: P => ({ vol: 0.8, tipFrom: 0.72, front: [{ k: 'cap' }, ...fringe(P.r, 6, -P.hw + 1, P.hw - 2, 9.5, 10, 4.2, 3.8, 0.6), ...both([st(-P.hw - 0.5, 13, -P.hw - 0.5, 27, 3.6, { c: [-1, 0] })]), st(P.hw - 1, 13, P.hw + 1, 30, 3.4)] }),
    // Long hair tied back low, loose strands at the temples.
    aiku: P => ({ vol: 0.6, back: [st(3, 14, 9, 40, 5, { tw: 2.5, c: [4, 2] })], front: [{ k: 'cap' }, ...fringe(P.r, 4, -5, 5, 10, 6, t => (t - 0.5) * 6, 3, 0.8), ...both([st(-P.hw + 1, 14, -P.hw, 27, 2.2, { c: [-1, 0] })])] }),
    // Neat side-parted black hair, combed flat.
    karasu: P => ({ vol: 0.3, part: -4, lines: true, front: [{ k: 'cap' }, ...fringe(P.r, 2, -5, -P.hw + 1, 10, 6, -2, 3.2, 0.3), ...fringe(P.r, 5, -3, P.hw - 1, 9.5, 7, 3.4, 3.4, 0.4), ...sideLocks(P.r, P.hw, 1)] }),
    // Long messy blond hair hiding most of the forehead.
    tokimitsu: P => ({ vol: 1.4, back: [el(0, 24, P.hw + 3, 14), ...both([st(-P.hw - 2, 22, -P.hw - 3, 44, 6, { tw: 3 })])], front: [{ k: 'cap' }, ...fringe(P.r, 8, -P.hw + 1, P.hw - 1, 10, 11, t => (t - 0.5) * 2, 3.6, 2), ...both([st(-P.hw - 0.5, 13, -P.hw - 1, 36, 3.6)])] }),
    // Loose wild black curls.
    lorenzo: P => ({ vol: 2, front: [{ k: 'cap' }, ...[[-8, 8, 3.6], [-3, 6, 3.8], [3, 6, 3.8], [8, 8, 3.6], [-P.hw - 0.5, 14, 3.2], [P.hw + 0.5, 14, 3.2]].map(([x, y, r]) => el(x, y, r, r)), ...fringe(P.r, 6, -7, 7, 12, 5.5, t => (t - 0.5) * 3, 3, 1.4, { c: [1.5, 0] })] })
  };

  function hairSpec(a, hw) {
    const r = rng(1 + (a.var || 0) * 7919 + (a.hairStyle || '').length * 131), P = { hw, L: a.hairLen || 0, r };
    const fn = (a.sig && SIGNATURE[a.sig]) || STYLES[a.hairStyle] || STYLES.messy;
    return fn(P);
  }

  function rasterHair(spec, layer, f, hw) {
    const id = new Int16Array(W * H).fill(-1), tt = new Float32Array(W * H), over = new Uint8Array(W * H);
    const vol = spec.vol || 0, rx = hw + 1.6 + vol * 0.55, ry = 13 + vol * 0.8, cy = 19.5;
    const hl = spec.hairline || [13.5, 20];
    const mark = (x, y, i, t, ov) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const k = y * W + x; if (id[k] < 0 || t < tt[k]) { id[k] = i; tt[k] = t; } if (ov) over[k] = 1; };
    const shapes = layer === 'back' ? (spec.back || []) : (spec.front || []);
    shapes.forEach((s, i) => {
      if (s.k === 'cap') {
        for (let y = 0; y < 28; y++) for (let x = 0; x < W; x++) {
          const dx = (x + 0.5 - CX) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy > 1) continue;
          const ax = Math.abs(x + 0.5 - CX);
          if (s.within && ax > s.within) continue;
          const hy = hl[0] + (hl[1] - hl[0]) * Math.min(1, Math.pow(ax / (hw + 0.5), 2));
          const fh = faceHW(f, y);
          if (y >= hy && ax < fh - 0.2) continue;   // forehead/face stays visible below the hairline
          if (y > 22 && ax >= fh - 0.2) continue;   // no hair over the ears/cheeks from the cap
          mark(x, y, i, 0);
        }
      } else if (s.k === 'e') {
        const [ecx, ecy] = s.c, [erx, ery] = s.r;
        for (let y = Math.floor(ecy - ery - 1); y <= Math.ceil(ecy + ery + 1); y++) for (let x = Math.floor(CX + ecx - erx - 1); x <= Math.ceil(CX + ecx + erx + 1); x++) {
          const dx = (x + 0.5 - CX - ecx) / erx, dy = (y + 0.5 - ecy) / ery;
          if (dx * dx + dy * dy <= 1) mark(x, y, i, Math.max(0, dy) * 0.4);
        }
      } else if (s.k === 's') {
        const [bx, by] = s.b, [tx, ty] = s.t, mx = (bx + tx) / 2 + (s.c ? s.c[0] : 0), my = (by + ty) / 2 + (s.c ? s.c[1] : 0);
        const n = Math.max(10, Math.ceil(Math.hypot(tx - bx, ty - by) * 3));
        for (let j = 0; j <= n; j++) {
          const t = j / n, u = 1 - t, x = u * u * bx + 2 * u * t * mx + t * t * tx, y = u * u * by + 2 * u * t * my + t * t * ty;
          const rr = ((s.w || 3) * Math.pow(u, s.blunt ? 0.15 : 0.6) + (s.tw || 0) * t) / 2;
          for (let py = Math.floor(y - rr - 1); py <= Math.ceil(y + rr + 1); py++) for (let px = Math.floor(CX + x - rr - 1); px <= Math.ceil(CX + x + rr + 1); px++) {
            const ddx = px + 0.5 - CX - x, ddy = py + 0.5 - y;
            if (ddx * ddx + ddy * ddy <= rr * rr + 0.12) {
              if (layer === 'front' && !s.over && py >= EYE_Y - 1 && Math.abs(px + 0.5 - CX) < faceHW(f, py) - 1) continue; // keep eyes clear
              mark(px, py, i, t, s.over);
            }
          }
        }
      }
    });
    return { id, tt, over, rx, ry, cy };
  }

  function paintHair(g, a, layer, f) {
    const hw = f.cheek, spec = hairSpec(a, hw), mask = rasterHair(spec, layer, f, hw);
    const base = HAIR[a.hairColor]?.[0] || HAIR.black[0], light = toHsl(base)[2] > 0.75;
    const hr = R(base, light ? 230 : 255, light ? 0.14 : 0.1), tip = a.hairTip && a.hairTip !== 'none' && HAIR[a.hairTip] ? R(HAIR[a.hairTip][0], 255, 0.1) : null;
    const tipFrom = spec.tipFrom ?? 0.62, sk = R(SKIN[a.skin]?.[0] || SKIN.light[0], 355, 0.2);
    const { id, tt, rx, ry, cy } = mask;
    const isHair = (x, y) => x >= 0 && y >= 0 && x < W && y < H && id[y * W + x] >= 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x, i = id[k]; if (i < 0) continue;
      if (layer === 'back' && mat(g, x, y) && mat(g, x, y) !== 7) continue;
      const nx = (x + 0.5 - CX) / rx, ny = (y + 0.5 - cy) / ry;
      let light2 = -0.55 * nx - 0.7 * ny - tt[k] * 0.35 + (layer === 'back' ? -0.45 : 0);
      const P = tip && (tt[k] >= tipFrom || (spec.tipY != null && y >= spec.tipY + Math.round(Math.sin(x * 1.3) * 1.2 - Math.pow(Math.abs(x + 0.5 - CX) / rx, 2) * 3)) || (spec.tipFrom != null && spec.tipY == null && y > 15 + (1 - tipFrom) * 10)) ? tip : hr;
      let c = light2 > 0.62 ? P.lt : light2 > -0.05 ? P.base : light2 > -0.5 ? P.sh : P.dk;
      // clump separation lines (below / right neighbour is a different clump)
      const tipish = tt[k] > 0.42, d = tipish && isHair(x, y + 1) && id[k + W] !== i && tt[k + W] > 0.42, rgt = tipish && isHair(x + 1, y) && id[k + 1] !== i && tt[k + 1] > 0.42, lft = tipish && isHair(x - 1, y) && id[k - 1] !== i && tt[k - 1] > 0.42 && !isHair(x, y + 1);
      if ((d || rgt || lft) && (spec.front || []).length > 1) c = P.sh === c ? P.dk : P.sh;
      // broken anime highlight band on the crown
      const rr = Math.sqrt(nx * nx + ny * ny);
      if (layer === 'front' && tt[k] < 0.3 && ny < -0.2 && nx > -0.75 && nx < 0.3) { if (rr > 0.6 && rr < 0.69) c = P.hi; else if (rr >= 0.69 && rr < 0.76 && nx < 0.1) c = P.lt; }
      // slick: comb lines
      if (spec.lines && tt[k] === 0 && (x * 3 + y) % 7 === 0 && light2 < 0.6) c = P.sh;
      // texture for very short hair
      if (spec.texture && (x + y * 2) % 3 === 0) c = c === P.base ? P.sh : c === P.lt ? P.base : c;
      // shaved sides
      if (spec.shave && tt[k] === 0 && y >= 9 && Math.abs(x + 0.5 - CX) > (spec.shave >= 30 ? 3.5 : rx * 0.62) && y > (spec.shave >= 30 ? 0 : spec.shave - 6)) {
        c = mix(sk.sh, hr.dk, (x * 7 + y * 3) % 5 === 0 ? 0.5 : 0.36);
        set(g, x, y, c, sk.ln, 1); continue;
      }
      set(g, x, y, c, P.ln, layer === 'back' ? 7 : 2);
    }
    if (layer !== 'front') return;
    // shadow cast by the fringe on the forehead, and dark edge where hair meets skin
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
      if (mat(g, x, y) !== 1 || mat(g, x, y - 1) !== 2) continue;
      set(g, x, y - 1, hr.ln === get(g, x, y - 1) ? hr.ln : mix(get(g, x, y - 1), hr.ln, 0.6), null, 2);
      if (y <= 30) { set(g, x, y, sk.sh, null, 1); if (y + 1 < EYE_Y - 1 && mat(g, x, y + 1) === 1 && (x + y) % 2 === 0) set(g, x, y + 1, mix(sk.base, sk.sh, 0.5), null, 1); }
    }
    if (spec.part != null) { const px = CX + Math.round(spec.part); for (let y = 7; y <= 10; y++) if (mat(g, px, y) === 2) set(g, px, y, hr.dk, null, 2); }
  }

  // ---------- extras ----------
  function drawExtras(g, a, phase) {
    const sk = R(SKIN[a.skin]?.[0] || SKIN.light[0], 355, 0.2), hr = R(HAIR[a.hairColor]?.[0] || HAIR.black[0], 255, 0.1), acc = a.accent || '#1598ff', ac = R(acc, 245, 0.2), f = faceOf(a);
    if (phase === 'face') {
      if (a.facialHair === 'stubble' || a.facialHair === 'beard') for (let y = 29; y <= f.chinY; y++) { const hw = faceHW(f, y); for (let x = Math.ceil(CX - hw); x < CX + hw; x++) { if (mat(g, x, y) !== 1) continue; const rel = Math.abs(x + 0.5 - CX) / hw; if (y < 31 && rel < 0.55) continue; if (a.facialHair === 'beard' ? (y >= 31 || rel > 0.6) : (x * 2 + y) % 3 === 0 && (y >= 32 || rel > 0.7)) set(g, x, y, a.facialHair === 'beard' ? ((x + y) % 3 ? hr.sh : hr.dk) : mix(get(g, x, y), hr.dk, 0.25), null, 1); } }
      if (a.facialHair === 'goatee') { for (let x = CX - 2; x <= CX + 1; x++) { set(g, x, 35, hr.sh, null, 1); set(g, x, 36, hr.dk, null, 1); } set(g, CX - 1, 37, hr.dk, null, 1); set(g, CX, 37, hr.dk, null, 1); }
      if (a.mark === 'scar') { [[CX - 8, 26], [CX - 7, 27], [CX - 6, 28], [CX - 5, 29]].forEach(([x, y]) => set(g, x, y, mix(sk.base, '#b04a5a', 0.55), null, 1)); set(g, CX - 7, 28, mix(sk.base, '#b04a5a', 0.3), null, 1); }
      if (a.mark === 'bandage') { for (let x = CX - 2; x <= CX + 2; x++) { set(g, x, 27, '#f3e4c8', null, 5); set(g, x, 28, x === CX + 2 ? '#d1bd99' : '#e8d6b2', null, 5); } set(g, CX - 1, 27, '#d9c6a2', null, 5); set(g, CX + 1, 28, '#d9c6a2', null, 5); }
      if (a.mark === 'mole') set(g, CX + 6, 28, sk.dk, null, 1);
      if (a.mark === 'paint') for (const x0 of [CX - 8, CX + 4]) { for (let x = x0; x < x0 + 4; x++) set(g, x, 29, '#15151c', null, 5); }
      if (a.mark === 'freckles') [[CX - 7, 28], [CX - 5, 29], [CX - 6, 30], [CX + 5, 28], [CX + 6, 29], [CX + 4, 30], [CX - 3, 28], [CX + 2, 28]].forEach(([x, y]) => mat(g, x, y) === 1 && set(g, x, y, mix(sk.sh, '#8a4a2a', 0.35), null, 1));
      if (a.mark === 'tattoo') { [[CX + 2, 39], [CX + 3, 40], [CX + 2, 41], [CX + 3, 42], [CX + 1, 40], [CX + 2, 43]].forEach(([x, y]) => set(g, x, y, mix(sk.sh, '#2a3a8a', 0.6), null, 1)); set(g, CX + 2, 40, mix('#c83a5a', sk.sh, 0.3), null, 1); }
      return;
    }
    if (phase === 'over') {
      if (a.accessory === 'headband') { for (let x = 0; x < W; x++) { const y = 14 + Math.round(Math.pow((x + 0.5 - CX) / 12, 2) * 1.5); if (Math.abs(x + 0.5 - CX) < f.cheek + 2.2 && (mat(g, x, y) === 2 || mat(g, x, y) === 1)) { set(g, x, y, ac.base, ac.ln, 5); set(g, x, y + 1, ac.sh, ac.ln, 5); } } }
      if (a.accessory === 'glasses') { const gap = a.eyeGap ?? 3, fr = '#1c1a24'; for (const x0 of [CX - gap - 7, CX + gap - 1]) { for (let x = x0; x <= x0 + 7; x++) { set(g, x, EYE_Y - 1, fr, null, 5); set(g, x, EYE_Y + 4, fr, null, 5); } for (let y = EYE_Y - 1; y <= EYE_Y + 4; y++) { set(g, x0, y, fr, null, 5); set(g, x0 + 7, y, fr, null, 5); } set(g, x0 + 1, EYE_Y, '#cfe8ff', null, 5); } for (let x = CX - gap; x < CX + gap - 1; x++) set(g, x, EYE_Y, fr, null, 5); }
      if (a.accessory === 'earring') { const x = span(faceHW(f, 28))[1] + 1; set(g, x, 29, '#ffd166', '#7a5a10', 5); set(g, x, 30, '#e0a826', '#7a5a10', 5); }
      if (a.accessory === 'hairclip') { set(g, CX - 7, 14, ac.lt, ac.ln, 5); set(g, CX - 6, 14, ac.base, ac.ln, 5); set(g, CX - 5, 14, ac.lt, ac.ln, 5); set(g, CX - 6, 13, '#ffffff', ac.ln, 5); }
      if (a.accessory === 'wristband') { for (let x = CX - 22; x <= CX - 15; x++) { set(g, x, 52, ac.base, ac.ln, 5); set(g, x, 53, ac.sh, ac.ln, 5); } }
      if (a.accessory === 'chain') { for (let i = 0; i < 9; i++) { const x = CX - 4 + i, y = 45 + Math.round(Math.sin(i / 8 * Math.PI) * 2.5); set(g, x, y, i % 2 ? '#f2d27a' : '#c9a23c', null, 5); } }
    }
  }

  // ---------- selective outline ----------
  function outline(g) {
    const add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g.px[y * W + x]) continue;
      let best = null;
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const k = yy * W + xx; if (g.px[k]) { best = g.ol[k] || mix(g.px[k], '#0b0a12', 0.7); if (dy === 1 || dy === -1) break; } }
      if (best) add.push([x, y, best]);
    }
    for (const [x, y, c] of add) { g.px[y * W + x] = c; g.m[y * W + x] = 9; }
    // inner contour between face and hair sides / chin and neck
    return g;
  }

  function render(a, ex, kit) {
    a = a || {};
    const g = grid(), e = resolveExpression(a, ex), f = faceOf(a);
    paintHair(g, a, 'back', f);
    drawBody(g, a, kit);
    drawFace(g, a);
    drawExtras(g, a, 'face');
    drawEyes(g, a, e);
    drawBrows(g, a, e);
    drawMouth(g, a, e);
    paintHair(g, a, 'front', f);
    drawExtras(g, a, 'over');
    outline(g);
    return { w: g.w, h: g.h, px: g.px };
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
    if (cache.size > 700) cache.clear();
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
      case 'flow': grad(0, 35, '#06142a', '#1a0f3a'); for (let i = 0; i < 40; i++) { const x = (i * 23) % 64, y = (i * 11) % 36; S(x, y, i % 3 ? '#7de7ff' : '#b786ff'); } for (let x = 0; x < 64; x++) { S(x, 18 + Math.round(Math.sin(x / 5) * 3), '#1e5a8a'); } break;
      default: grad(0, 35, '#0b1222', '#05070b');
    }
    const url = toDataURL(g, 1);
    cache.set(key, url);
    return url;
  }

  EW.sprites = { W, H, OPTIONS, EXPRESSIONS, EXTRA_EXPRESSIONS, PERSONA, SKIN, HAIR, EYES, ACCENTS, STYLES, SIGNATURE, render, portrait, env, mix, ramp, resolveExpression, canDraw };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.sprites;
})(typeof globalThis !== 'undefined' ? globalThis : this);
