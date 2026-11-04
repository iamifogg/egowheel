/* EgoWheel — bespoke named-character portraits.
 * Each character is an individually authored illustration: its own head, jaw, ears, neck, build, hair masses,
 * eye design, brows and expression set. They share only the drawing "hand" (src/art/portrait-kit.js).
 * Designs are original pixel interpretations based on the characters' published descriptions
 * (hair, eyes, build and signature features), not traced or copied official artwork.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const P = () => EW.portraitArt, K = () => EW.portraitKit;

  // ---------- shared palettes ----------
  const SKIN = {
    pale:  { hi: '#fff4ee', base: '#f6e3d8', sh: '#dcbcb0', dk: '#b8928a', line: '#6a4644', blush: '#f0a8a8' },
    fair:  { hi: '#fff0e2', base: '#f6dcc4', sh: '#e0b496', dk: '#bd8a72', line: '#6e4236', blush: '#f19a8e' },
    light: { hi: '#ffe9d2', base: '#efc7a2', sh: '#d49f7c', dk: '#ad7558', line: '#633a2a', blush: '#ec8f7e' },
    tan:   { hi: '#f6d2a8', base: '#d9a172', sh: '#b97c52', dk: '#935a3a', line: '#4e2c1c', blush: '#d97a5e' },
    brown: { hi: '#d9a679', base: '#a86e48', sh: '#8a5536', dk: '#6a3c24', line: '#341c10', blush: '#b8644a' }
  };
  const KIT = { main: '#14305e', trim: '#7de7ff', dark: '#0b1c3a' };

  const C = {}; // character registry

  // ======================= SEISHIRO NAGI =======================
  // Very tall, long calm face, pale; soft voluminous white hair with a V-shaped fringe between the eyes;
  // large grey eyes under heavy, bored lids. Expressions stay understated (detached genius).
  C.nagi = {
    accent: '#e8ecf6', skin: SKIN.pale,
    hair: { hi: '#ffffff', base: '#e9ecf3', sh: '#c3c9d9', dk: '#949bb2', line: '#5b6079' },
    eyes: { iris: ['#555c6e', '#8a92a4', '#c3c9d6', '#22252e'], lash: '#3c3f4f' },
    mouth: { neutral: 'flat', confident: 'softsmile', smirk: 'softsmile', elated: 'softsmile', angry: 'focused' },
    draw(ex, k, o) {
      const p = P(), s = this.skin, h = this.hair, E = K().EXPR[ex], cx = 48;
      let b = '';
      // back hair: fluffy nape clumps visible either side of the neck
      b += p.path('M25,38 Q16,47 21,57 Q24,54 27,58 Q28,52 31,50 L31,40Z', h.sh, { stroke: h.line, w: 1 });
      b += p.path('M71,38 Q80,47 75,57 Q72,54 69,58 Q68,52 65,50 L65,40Z', h.dk, { stroke: h.line, w: 1 });
      // body
      b += K().body({ cx, neckTop: 66, neckW: 6.6, chinY: 77, shoulderY: 88, shoulderW: 37, slope: 7, skin: s, kit: k, collar: 'v', adam: true, number: o.number });
      // ears
      b += p.path('M31,50 C27,48 25,53 27,58 C28,61 30,62 32,61Z', s.base, { stroke: s.line, w: 1 }) + p.path('M29.5,53 C28.5,55 29,58 30.5,59', 'none', { stroke: s.sh, w: 0.8 });
      b += p.path('M65,50 C69,48 71,53 69,58 C68,61 66,62 64,61Z', s.sh, { stroke: s.line, w: 1 });
      // face (long, gentle jaw)
      const face = 'M31,38 C30,51 31,60 34,66 C38,73 43,77.5 48,79 C53,77.5 58,73 62,66 C65,60 66,51 65,38Z';
      b += p.path(face, s.base, { stroke: s.line, w: 1 });
      b += p.path('M59,44 C62,52 62,60 59,66 C56,71 52,75 48,78 C53,76.5 58,72.5 61.5,66 C64.5,60 65.5,52 64.8,44Z', s.sh);
      b += p.path('M34,58 C35,63 37,66 40,69', 'none', { stroke: s.hi, w: 1 });
      // eyes: large grey irises under heavy, bored lids
      const eo = { w: 12, h: 4.8, irisR: 4.5, iris: this.eyes.iris, lash: this.eyes.lash, skin: s, ex: E, heavyLid: 0.34, tilt: -0.5, lashW: 1.5 };
      b += K().eye(Object.assign({}, eo, { cx: 39.3, cy: 55, side: -1, id: 'nagiL' }));
      b += K().eye(Object.assign({}, eo, { cx: 56.7, cy: 55, side: 1, id: 'nagiR' }));
      b += K().brow({ x: 44, y: 46.8, side: -1, len: 9.5, th: 1.1, arch: 0.6, col: h.dk, ex: E });
      b += K().brow({ x: 52, y: 46.8, side: 1, len: 9.5, th: 1.1, arch: 0.6, col: h.dk, ex: E });
      b += p.path('M49.5,60 L50.5,64 L48.2,64.5', 'none', { stroke: s.dk, w: 0.9 });
      b += K().mouth({ x: 48.5, y: 70.5, w: 6, line: s.line, style: this.mouth }, ex);
      if (E.blush) b += p.rect(33, 63, 5, 1.2, s.blush) + p.rect(58, 63, 5, 1.2, s.blush);
      if (E.sweat) b += p.path('M66,44 q-1.5,3 0,4 q1.5,-1 0,-4Z', '#cfeaff', { stroke: '#6aa6d8', w: 0.6 });
      // front hair: a soft cloud with bumpy clumped edges and a V fringe meeting between the eyes
      const crown = 'M26,47 Q19,39 24,32 Q18,24 26,18 Q24,9 34,9.5 Q39,2.5 48,5.5 Q57,1.5 63,8 Q72,7 72,16 Q79,21 74,29 Q79,37 71,42 L70,47 C68,43 65,41 61,41.5 C56,43 52,47 48.5,53 C45,47 40,43 35,41.5 C31,41 28,43 26,47Z';
      b += p.path(crown, h.base, { stroke: h.line, w: 1 });
      // fringe clumps
      b += p.path('M38,33.5 C40,38 41,43 41.5,47 C43.5,44 46,46 48.5,53 C46,44 42,38 38,33.5Z', h.base, { stroke: h.line, w: 0.9 });
      b += p.path('M58,33.5 C56,38 55,43 55,47 C53,44.5 51,46 48.5,53 C51,44 54,38 58,33.5Z', h.sh, { stroke: h.line, w: 0.9 });
      b += p.path('M26,47 C25,51 26,55 28.5,58 C28.5,53 30,49 33,45.5 C31,43.5 28.5,44 26,47Z', h.base, { stroke: h.line, w: 0.9 });
      b += p.path('M70,47 C71.5,51 70.5,55 68,58 C68,53 66.5,49 63.5,45.5 C65.5,43.5 68,44 70,47Z', h.sh, { stroke: h.line, w: 0.9 });
      // shading: right side and under the clumps, light band upper left
      b += p.path('M58,33.5 C62,35 66,39 70,47 L71,42 Q79,37 74,29 Q79,21 72,16 C72,24 68,29 63,31Z', h.sh);
      b += p.path('M71,42 Q79,37 74,29 C74,34 72,38 69,40Z', h.dk);
      b += p.path('M32,15 Q40,9 50,9 Q44,11 38,14 Q34,17 31,21Z', h.hi);
      b += p.path('M24,32 Q27,27 31,25', 'none', { stroke: h.hi, w: 1.1 });
      // clump separation strokes
      b += p.path('M41,13 C41,19 40,26 38,33 M52,12 C53,19 55,27 58,33 M31,22 C30,28 29,35 28,42 M64,16 C66,22 67,30 68,38 M46,20 C46,26 46.5,34 47,40', 'none', { stroke: h.dk, w: 0.9 });
      b += p.path('M33,36 C35,40 36,44 36.5,48 C38,45 40,44 42,45 C40,41 37,38 33,36Z', h.base, { stroke: h.line, w: 0.9 }) + p.path('M63,36 C61,40 60,44 59.5,48 C58,45 56,44 54,45 C56,41 59,38 63,36Z', h.sh, { stroke: h.line, w: 0.9 });
      return b;
    }
  };

  // ---------- generic layered drawer for authored characters ----------
  // A character supplies its own paths for every layer; items are [d, fillKey, lineWidth?] where fillKey is a
  // palette key (hair: base/sh/dk/hi/line, tip: tbase/tsh, skin: s.base…) or a literal colour.
  function fillOf(c, key) {
    if (!key) return 'none';
    if (key[0] === '#') return key;
    const [grp, k] = key.includes('.') ? key.split('.') : ['h', key];
    const pal = grp === 's' ? c.skin : grp === 't' ? c.tip : c.hair;
    return (pal && pal[k]) || key;
  }
  function layer(c, items, lineCol) {
    const p = P(); let out = '';
    for (const it of items || []) {
      const [d, key, w, line] = it;
      const fill = fillOf(c, key);
      if (w === -1) out += p.path(d, 'none', { stroke: fill, w: line || 1 });
      else out += p.path(d, fill, w ? { stroke: line ? fillOf(c, line) : lineCol, w } : null);
    }
    return out;
  }
  function drawStd(c, id, ex, k, o) {
    const p = P(), KK = K(), s = c.skin, h = c.hair, e = (c.map && c.map[ex]) || ex, E = Object.assign({}, KK.EXPR[e], (c.exOver || {})[e] || {});
    let b = '', hd = '';
    const pose = c.pose || {}, T = 'translate(' + (pose.dx || 0) + ',' + (pose.dy || 0) + ') rotate(' + (pose.rot || 0) + ',48,72)';
    b += p.group(layer(c, c.back, h.line), T);
    b += KK.body(Object.assign({ cx: 48, skin: s, kit: k, collar: 'v', adam: true, number: o.number }, c.body));
    b += layer(c, c.overBody, h.line);
    b += '<g transform="' + T + '">';
    b += layer(c, c.ears, s.line);
    b += p.path(c.face, s.base, { stroke: s.line, w: 1 });
    b += layer(c, c.faceShade, s.line);
    b += layer(c, c.underFeatures, s.line);
    const eo = Object.assign({ iris: c.eyes.iris, lash: c.eyes.lash, skin: s, ex: E }, c.eyes.o);
    b += KK.eye(Object.assign({}, eo, { cx: c.eyes.x[0], cy: c.eyes.y, side: -1, id: id + 'L' }));
    b += KK.eye(Object.assign({}, eo, { cx: c.eyes.x[1], cy: c.eyes.y, side: 1, id: id + 'R', w: eo.w * (eo.nearScale || 1) }));
    const bo = Object.assign({ col: h.dk, ex: E }, c.brows.o);
    b += KK.brow(Object.assign({}, bo, { x: c.brows.x[0], y: c.brows.y, side: -1 }));
    b += KK.brow(Object.assign({}, bo, { x: c.brows.x[1], y: c.brows.y, side: 1 }));
    b += p.path(c.nose, 'none', { stroke: s.dk, w: 0.9 });
    b += KK.mouth(Object.assign({ line: s.line, style: c.mouthStyle }, c.mouth), e);
    if (E.blush) b += p.rect(c.eyes.x[0] - 6, c.eyes.y + 8, 5, 1.2, s.blush) + p.rect(c.eyes.x[1] + 1, c.eyes.y + 8, 5, 1.2, s.blush);
    if (E.sweat) b += p.path('M' + (c.eyes.x[1] + 10) + ',' + (c.eyes.y - 10) + ' q-1.5,3 0,4 q1.5,-1 0,-4Z', '#cfeaff', { stroke: '#6aa6d8', w: 0.6 });
    if (E.shadow) b += p.path(c.face, '#1a1430', { op: 0.18 });
    // hair
    const hairUnion = (c.front || []).map(it => it[0]).join(' ');
    b += layer(c, c.front, h.line);
    if (c.tip) {
      const cid = id + 'tip';
      b += '<defs>' + p.clip(cid, hairUnion) + '</defs>';
      for (const r of c.tip.rects) b += p.path(r[0], fillOf(c, r[1]), { clip: cid, rule: r[2] });
    }
    b += layer(c, c.shade, h.line);
    b += layer(c, c.lines, h.line);
    b += layer(c, c.over, h.line);
    if (E.glow) b += p.path(c.face, '#7de7ff', { op: 0.06 });
    b += '</g>';
    b += layer(c, c.overAll, h.line);
    return b;
  }

  // ======================= RIN ITOSHI =======================
  // Cold, controlled; very dark green hair with a long fringe falling over his right eye; narrow upturned teal
  // eyes with heavy upper and lower lashes; slim sharp jaw.
  C.rin = {
    accent: '#3fd0c0', skin: SKIN.fair,
    hair: { hi: '#58806f', base: '#2f4a42', sh: '#20352f', dk: '#14231f', line: '#0a1311' },
    eyes: { x: [39.5, 56.5], y: 55.5, iris: ['#0d5650', '#1fa093', '#86e0d2', '#06201e'], lash: '#0c1917', o: { w: 11, h: 3.5, irisR: 3.4, tilt: 1.1, lowerLash: true, lashW: 1.9, flick: 0.6 } },
    brows: { x: [44, 52], y: 49, o: { len: 9, th: 1.2, arch: 0.4, tilt: 0.6 } },
    nose: 'M49.5,61 L50.3,64.5 L48.5,65', mouth: { x: 48.5, y: 70.5, w: 5.5 },
    mouthStyle: { neutral: 'flat', confident: 'smirk', elated: 'smirk', smirk: 'smirk', flow: 'sneer' },
    exOver: { neutral: { browIn: 0.8 }, confident: { browRaise: 0 } },
    body: { neckTop: 66, neckW: 6.2, chinY: 77, shoulderY: 88, shoulderW: 37, slope: 7 },
    pose: { rot: -2.5, dx: -1 },
    back: [['M27,40 Q24,51 27.5,59 L32.5,52Z', 'sh', 1], ['M69,40 Q72,51 68.5,59 L63.5,52Z', 'dk', 1]],
    ears: [['M31.5,50 C27.5,48.5 26,53 28,58 C29,60.5 31,61 32.5,60Z', 's.base', 1], ['M64.5,50 C68.5,48.5 70,53 68,58 C67,60.5 65,61 63.5,60Z', 's.sh', 1]],
    face: 'M31.5,39 C31,50 32,59 35,65 C39,71.5 44,76 48,77.5 C52,76 57,71.5 61,65 C64,59 65,50 64.5,39Z',
    faceShade: [['M58.5,44 C61.5,52 61.5,59 58.5,65 C55.5,70 52,74 48,77 C52.5,75.5 57,71.5 60.6,65 C63.6,59 64.6,51 64.2,44Z', 's.sh']],
    front: [
      ['M27,47 C23,32 29,16 45,12 C61,9 73,20 71,36 L69.5,48 C67,42 63,40 59,40 C57,36 55,33 53,31 C48,36 43,42 40,49 C36,44 31,43 27,47Z', 'base', 1],
      ['M68.5,42 C70,50 69.5,57 67.5,63 C66.5,57 65.5,51 63,47 C65,45 67,44 68.5,42Z', 'sh', 1],
      ['M28,42 C26,50 27,58 29.5,64 C30.5,57 32,51 34.5,46 C32,44 30,43 28,42Z', 'base', 1],
      ['M58,21 C60,29 63,36 67,45 C64,41 61,40 58,41 C57.5,34 57.5,27 58,21Z', 'sh', 1],
      ['M49,19 C43,29 40,40 41,51 C43,46 46,41 50,37 C49,31 49,25 49,19Z', 'base', 1],
      ['M56,16 C45,23 37,37 33.5,58 C36,55 38.5,54 41,55.5 C42.5,45 46,37 53,30 C54,25 55,20 56,16Z', 'base', 1]
    ],
    shade: [['M58,21 C62,26 66,32 69,40 L71,36 C72,28 69,22 64,17Z', 'sh'], ['M53,30 C46,37 42.5,45 41,55.5 C43,47 46,40 51,35Z', 'sh'], ['M33,22 Q40,15 50,14 Q43,17 37,21Z', 'hi'], ['M30,32 Q31,27 34,24', 'hi', -1, 1.1]],
    lines: [['M44,16 C42,24 39,32 36,40 M52,15 C53,21 55,26 57,31 M62,18 C64,24 66,30 68,37', 'dk', -1, 0.9]]
  };

  // ======================= SHOEI BAROU =======================
  // Imposing, broad and heavy-set; long black hair slicked up into a crown of spikes; narrow red eyes under thick,
  // angled brows; strong square jaw; sneering, overwhelming confidence.
  C.barou = {
    accent: '#ff4d5e', skin: SKIN.light,
    hair: { hi: '#4e5062', base: '#2b2b35', sh: '#1c1c24', dk: '#121218', line: '#06060a' },
    map: { neutral: 'focused' },
    eyes: { x: [39, 57], y: 56, iris: ['#5e0c16', '#c2283a', '#f2737f', '#260407'], lash: '#120a0c', o: { w: 10.5, h: 3.1, irisR: 3.1, tilt: 1.5, lashW: 1.9, flick: 0.8 } },
    brows: { x: [44.5, 51.5], y: 49.5, o: { len: 10, th: 2.3, arch: 0.3, tilt: 2.4 } },
    exOver: { focused: { browIn: 2.6 }, confident: { browIn: 1.8, browRaise: 0 } },
    nose: 'M49.5,60 L51,65 L48,65.6 M46.5,65 L47.5,65.4', mouth: { x: 48.5, y: 71.5, w: 7 },
    mouthStyle: { neutral: 'focused', focused: 'focused', confident: 'sneer', smirk: 'sneer', elated: 'manic', flow: 'sneer' },
    body: { neckTop: 67, neckW: 8.4, chinY: 78, shoulderY: 86, shoulderW: 43, slope: 5 },
    back: [['M26,44 Q21,55 25,64 L31.5,57Z', 'sh', 1], ['M70,44 Q75,55 71,64 L64.5,57Z', 'dk', 1]],
    ears: [['M30,51 C26,49.5 24.5,54 26.5,59 C27.5,61.5 29.5,62 31,61Z', 's.base', 1], ['M66,51 C70,49.5 71.5,54 69.5,59 C68.5,61.5 66.5,62 65,61Z', 's.sh', 1]],
    face: 'M29.5,40 C29,53 30,62 33.5,68 L42,76.5 C45,78.5 51,78.5 54,76.5 L62.5,68 C66,62 67,53 66.5,40Z',
    faceShade: [['M60.5,45 C63.5,53 63.5,61 60.5,67 L53,75.5 C51,77 49,77.4 48,77.5 C51,78 53,77.5 54,76.5 L62.5,68 C66,62 67,53 66.3,45Z', 's.sh'], ['M41,62 C42,64 43,66 44,67 M55,62 C54,64 53,66 52,67', 's.sh', -1, 0.8]],
    front: [
      ['M28,49 C25,39 27,27 33,21 L28.5,8 L38,16.5 L39.5,2.5 L46,13 L50,0.5 L54,13 L60,2.5 L61.5,16.5 L70,8 L64,21.5 C70,28 71,39 68,49 C66,42 63,37 58,35 C55,34.5 51.5,35.5 48,39.5 C44.5,35.5 41,34.5 38,35 C33,37 30,42 28,49Z', 'base', 1]
    ],
    shade: [['M58,35 C63,37 66,42 68,49 C71,39 70,28 64,21.5 L70,8 L61.5,16.5 L60,2.5 L54,13 C56,20 58,28 58,35Z', 'sh'], ['M64,21.5 L70,8 L66,13Z', 'dk'], ['M33,21 L28.5,8 L35,15Z', 'hi'], ['M38,16.5 L39.5,2.5 L41.5,12Z', 'hi']],
    lines: [['M38,35 L35,22 M43.5,36 L42.5,19 M52.5,36 L54,19 M58,35 L61,22 M48,39 L48,14', 'dk', -1, 0.9]]
  };

  // ======================= RYUSEI SHIDOU =======================
  // Tall, tanned and feral; spiky blond hair swept up and back, fading to pink tips, with two strands falling at
  // each side of the face; pink cat-like eyes with slit pupils; manic grin.
  C.shidou = {
    accent: '#ff7ab0', skin: SKIN.tan,
    hair: { hi: '#fff4b8', base: '#f0d26a', sh: '#cfa340', dk: '#a87828', line: '#57390e' },
    tip: { tbase: '#f27aa8', tsh: '#cc4c84', rects: [['M-10,-10 H106 V140 H-10Z M48,10.5 A22,18.5 0 1,0 48.01,10.5Z', 't.tbase', 'evenodd'], ['M0,56 H96 V75 H0Z', 't.tbase']] },
    map: { neutral: 'smirk' },
    eyes: { x: [39.5, 56.5], y: 55.5, iris: ['#8a1f50', '#e5579c', '#ffb3d6', '#2a0716'], lash: '#2a1208', o: { w: 11, h: 4.1, irisR: 3.7, tilt: 1.4, slit: true, lashW: 1.7, flick: 1 } },
    brows: { x: [44, 52], y: 47.5, o: { len: 8, th: 1.1, arch: 1.2, tilt: 1.2 } },
    exOver: { smirk: { browRaise: 1.2 } },
    nose: 'M49.5,60.5 L50.4,64.5 L48.4,65', mouth: { x: 48.5, y: 70.5, w: 6 },
    mouthStyle: { neutral: 'smirk', smirk: 'smirk', confident: 'manic', elated: 'manic', flow: 'manic', angry: 'angry', focused: 'smirk' },
    body: { neckTop: 66, neckW: 6.6, chinY: 77, shoulderY: 88, shoulderW: 38, slope: 6 },
    pose: { rot: -6, dx: 1 },
    back: [['M27,42 Q22,53 26,62 L32,54Z', 'sh', 1], ['M69,42 Q74,53 70,62 L64,54Z', 'dk', 1]],
    ears: [['M31,50 C27,48.5 25.5,53 27.5,58 C28.5,60.5 30.5,61 32,60Z', 's.base', 1], ['M65,50 C69,48.5 70.5,53 68.5,58 C67.5,60.5 65.5,61 64,60Z', 's.sh', 1]],
    face: 'M31,40 C30.5,51 31.5,60 34.5,66 C38.5,72.5 43.5,76.5 48,78 C52.5,76.5 57.5,72.5 61.5,66 C64.5,60 65.5,51 65,40Z',
    faceShade: [['M59,45 C62,53 62,60 59,66 C56,71 52,75 48,77.5 C53,76 57.5,72.5 61.2,66 C64.2,60 65.2,51 64.8,45Z', 's.sh']],
    front: [
      ['M28,47 C24,40 23,33 26,27 L13,22 L27,20 L20,8 L33,14.5 L34,1.5 L42.5,11 L49,-1 L53.5,10.5 L63,1 L63,13.5 L76,6 L68.5,19.5 L82,19 L70,27.5 C73,34 72,41 68,47 C65,41 61,38.5 57,38.5 C54,38.5 51,39.5 48,41 C45,39.5 42,38.5 39,38.5 C35,38.5 31,41 28,47Z', 'base', 1],
      ['M33.5,39 C31,47 31,56 33.5,66 C34.5,58 35.5,50 38,43.5 C36.5,41.5 35,40 33.5,39Z', 'base', 1],
      ['M62.5,39 C65,47 65,56 62.5,66 C61.5,58 60.5,50 58,43.5 C59.5,41.5 61,40 62.5,39Z', 'sh', 1]
    ],
    shade: [['M57,38.5 C61,38.5 65,41 68,47 C72,41 73,34 70,27.5 L82,19 L68.5,19.5 L76,6 L63,13.5 C63,24 60,32 57,38.5Z', 'sh'], ['M36,22 Q42,17 50,17 Q44,20 39,25Z', 'hi']],
    lines: [['M39,38.5 L33,24 M44,39 L41,19 M52,39 L54,19 M57,38.5 L63,24 M30,40 L22,30 M66,40 L74,30', 'dk', -1, 0.9]],
    over: [['M26.6,58 a1.4,1.4 0 1,0 0.1,0', '#ffd166', -1, 0.9], ['M69.4,58 a1.4,1.4 0 1,0 0.1,0', '#e0a826', -1, 0.9]]
  };

  // ======================= MICHAEL KAISER =======================
  // Refined, arrogant; blond mullet whose ends are dyed blue, trailing into two blue rat-tails; blue eyes with red
  // liner; a blue rose tattoo from the neck down to the shoulder.
  C.kaiser = {
    accent: '#3f78e8', skin: SKIN.pale,
    hair: { hi: '#fff7cf', base: '#f2dc8a', sh: '#d6b45e', dk: '#ad8a3c', line: '#584413' },
    tip: null,
    map: { neutral: 'neutral' },
    eyes: { x: [39.5, 56.5], y: 55.5, iris: ['#1b3c96', '#3f7ae8', '#a9c9ff', '#0a1640'], lash: '#2b2016', o: { w: 11, h: 3.8, irisR: 3.5, tilt: 1.2, liner: '#d3374a', lashW: 1.7, flick: 0.6 } },
    brows: { x: [44, 52], y: 48.5, o: { len: 9, th: 1.1, arch: 0.8, tilt: 1 } },
    nose: 'M49.5,60 L50.5,64.5 L48.3,65', mouth: { x: 48.5, y: 70.5, w: 6 },
    mouthStyle: { neutral: 'softsmile', confident: 'smirk', elated: 'smirk', smirk: 'smirk', flow: 'smirk' },
    exOver: { neutral: { browRaise: 0.6 } },
    body: { neckTop: 66, neckW: 6.3, chinY: 77, shoulderY: 88, shoulderW: 37, slope: 7 },
    pose: { rot: 3, dy: -0.5 },
    back: [['M25,40 C20,54 21,68 26,80 L31,76 C33,70 34,62 34,54Z', 'sh', 1], ['M71,40 C76,54 75,68 70,80 L65,76 C63,70 62,62 62,54Z', 'dk', 1],
      ['M21.5,64 C22,70 23.5,75 26,80 L31,76 C32,72 33,68 33.5,64Z', '#3e6ee0', 1, '#14245a'], ['M74.5,64 C74,70 72.5,75 70,80 L65,76 C64,72 63,68 62.5,64Z', '#2a4fb0', 1, '#14245a']],
    overBody: [['M31.5,56 C28,68 28,82 31,100 L34,100 C32.5,84 33,70 35,60Z', '#3e6ee0', 1, '#14245a'], ['M64.5,56 C68,68 68,82 65,100 L62,100 C63.5,84 63,70 61,60Z', '#2a4fb0', 1, '#14245a'],
      ['M31.5,56 C30.5,60 30,63 29.8,66 L33.6,66 C34,63 34.5,61 35,60Z', 'base', 1], ['M64.5,56 C65.5,60 66,63 66.2,66 L62.4,66 C62,63 61.5,61 61,60Z', 'sh', 1]],
    ears: [['M31.5,50 C27.5,48.5 26,53 28,58 C29,60.5 31,61 32.5,60Z', 's.base', 1], ['M64.5,50 C68.5,48.5 70,53 68,58 C67,60.5 65,61 63.5,60Z', 's.sh', 1]],
    face: 'M31.5,39 C31,50 32,59 35,65.5 C39,72 44,76.5 48,78 C52,76.5 57,72 61,65.5 C64,59 65,50 64.5,39Z',
    faceShade: [['M58.5,44 C61.5,52 61.5,59 58.5,65.5 C55.5,70.5 52,74.5 48,77.5 C52.5,76 57,72 60.6,65.5 C63.6,59 64.6,51 64.2,44Z', 's.sh']],
    front: [
      ['M28,47 C25,33 31,16 47,13 C62,11 72,22 70,37 L69,47 C66,42 62,40 58,40 C52,41 47,44 43,49 C42,44 39,41 35,41 C32,41 29,43 28,47Z', 'base', 1],
      ['M66,30 C68.5,38 69.5,46 67,54 C65,48 63,44 60,42.5 C62,38 64,34 66,30Z', 'sh', 1],
      ['M29.5,40 C27.5,47 28,53 30.5,58 C31,52 32.5,48 35,45 C33,43 31,41 29.5,40Z', 'base', 1],
      ['M64,24 C57,30 51,37 47,48 C50,45 53,44 56,45 C58,37 61,31 64,27Z', 'sh', 1],
      ['M61,17 C50,21 40,30 33,47 C37,44 41,43 44,45 C47,35 53,27 61,22Z', 'base', 1]
    ],
    shade: [['M61,22 C53,27 47,35 44,45 C47,38 52,31 59,25Z', 'sh'], ['M64,18 C68,23 70,30 70,37 L69,30 C67,26 66,22 64,18Z', 'sh'], ['M34,22 Q41,15 52,14.5 Q44,17.5 38,22Z', 'hi']],
    lines: [['M45,15 C42,22 39,29 36,37 M55,15 C54,20 52,25 50,29', 'dk', -1, 0.9]],
    underFeatures: [],
    over: [['M58,80 c2,-2 4,-1 4,1 c0,2 -2,3 -4,2 c-2,-1 -1,-3 0,-3Z', '#3a64d8', 0.8, '#1a2f7a'], ['M60,80.6 c0.8,-0.6 1.6,0 1.2,0.8', '#1a2f7a', -1, 0.7], ['M60,83 C61,86 63,88 66,90 M61.5,85.5 l1.4,-0.4 M64,88 l1,-1', '#1a2f7a', -1, 0.8], ['M54,79 c1.5,-1.2 3,-0.6 3,0.6 c-0.4,1.4 -2,1.6 -3,0.8Z', '#2f56c8', 0.7, '#1a2f7a']]
  };

  // ======================= HYOMA CHIGIRI =======================
  // Elegant "princess"; long straight red hair falling past the shoulders with a side part and framing locks;
  // delicate face and large pink eyes with long lashes.
  C.chigiri = {
    accent: '#ff5d7d', skin: SKIN.fair,
    hair: { hi: '#ff8c9c', base: '#d6425c', sh: '#ac2a46', dk: '#7e1a32', line: '#45091a' },
    map: { neutral: 'neutral' },
    eyes: { x: [39.5, 56.5], y: 55.5, iris: ['#8a1a4a', '#e3518e', '#ffb2d0', '#2e0718'], lash: '#3a0c18', o: { w: 11.5, h: 4.5, irisR: 4.1, tilt: 0.7, lashW: 1.8, flick: 1 } },
    brows: { x: [44, 52], y: 48, o: { len: 9, th: 1, arch: 1.1, tilt: 0.6 } },
    nose: 'M49.5,61 L50.2,64.2 L48.6,64.6', mouth: { x: 48.5, y: 70, w: 5 },
    mouthStyle: { neutral: 'default', confident: 'confident', smirk: 'smirk' },
    body: { neckTop: 65, neckW: 5.6, chinY: 76.5, shoulderY: 89, shoulderW: 35, slope: 7 },
    pose: { rot: 4 },
    back: [['M24,40 C17,62 18,92 21,128 L75,128 C78,92 79,62 72,40 L64,44 L32,44Z', 'dk', 1]],
    overBody: [['M28.5,46 C25,62 25.5,88 29,116 C32.5,102 34,84 34.5,64 C34.5,56 33,50 31,46Z', 'base', 1], ['M67.5,46 C71,62 70.5,88 67,116 C63.5,102 62,84 61.5,64 C61.5,56 63,50 65,46Z', 'sh', 1],
      ['M29.5,60 C29,76 30,92 31.5,106 M66.5,60 C67,76 66,92 64.5,106', 'dk', -1, 0.9]],
    ears: [['M31.5,50 C27.5,48.5 26,53 28,58 C29,60.5 31,61 32.5,60Z', 's.base', 1], ['M64.5,50 C68.5,48.5 70,53 68,58 C67,60.5 65,61 63.5,60Z', 's.sh', 1]],
    face: 'M31.5,40 C31,51 32,59 35,65 C38.5,71 43.5,75.5 48,77 C52.5,75.5 57.5,71 61,65 C64,59 65,51 64.5,40Z',
    faceShade: [['M58.5,45 C61.5,52 61.5,59 58.5,65 C55.5,70 52,74 48,76.5 C52.5,75 57,71 60.6,65 C63.6,59 64.6,52 64.2,45Z', 's.sh']],
    front: [
      ['M27,49 C24,33 30,15 46,12 C62,10 73,21 70,38 L69,50 C66,44 62,42 58,42 C54,41 50,38 46,35 C42,40 37,43 32,44.5 C30,45.5 28,47 27,49Z', 'base', 1],
      ['M46,14 C42,22 38,32 35,48 C38,45 41,44 43.5,45 C44,34 45,24 46,14Z', 'base', 1],
      ['M50,16 C49,26 50.5,36 55,46.5 C56,43 58,42 61,43 C56.5,34 53,25 50,16Z', 'sh', 1],
      ['M29,42 C26.5,50 27,58 29.5,64 C30.5,57 32,51 34.5,46 C32.5,44 30.5,43 29,42Z', 'base', 1],
      ['M67.5,42 C70,50 69.5,57 67,63 C66,57 64.5,51 62,47 C64,45 66,43.5 67.5,42Z', 'sh', 1]
    ],
    shade: [['M58,42 C62,42 66,44 69,50 L70,38 C70,30 67,24 62,19 C64,28 62,36 58,42Z', 'sh'], ['M33,23 Q40,15.5 50,14.5 Q43,17.5 37,22Z', 'hi'], ['M46,14 L46,12', 'line', -1, 1]],
    lines: [['M42,16 C40,24 37,32 35,40 M55,16 C57,23 60,30 63,37', 'dk', -1, 0.9]]
  };
  ['rin', 'barou', 'shidou', 'kaiser', 'chigiri'].forEach(id => { C[id].draw = function (ex, k, o) { return drawStd(this, id, ex, k, o); }; });

  function has(id) { return !!C[id]; }
  function accent(id) { return C[id] ? C[id].accent : null; }
  function svgFor(id, ex, opts) {
    const c = C[id]; if (!c) return '';
    const kit = (opts && opts.kit) || KIT, o = { number: opts && opts.number };
    return P().svg(c.draw(ex, kit, o));
  }
  EW.portraitNamed = { has, accent, svg: svgFor, ids: () => Object.keys(C), SKIN, C };
})(typeof globalThis !== 'undefined' ? globalThis : this);
