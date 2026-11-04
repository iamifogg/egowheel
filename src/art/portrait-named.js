/* EgoWheel — bespoke named-character portraits (reference style: tight 3/4 crop, strict palettes, clean ink).
 * Each character is individually authored: own head/jaw geometry, neck and build, hair silhouette, eye design,
 * brows, palette and expression personality. Original pixel interpretations based on published character
 * descriptions — not traced or copied official artwork.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const P = () => EW.portraitArt, K = () => EW.portraitKit;

  // Default 3/4 geometry (head turned toward viewer-left). Characters copy and modify these numbers/paths.
  const BASE = {
    face: 'M36,31 C34,39 33,44 33.5,49 C33,54 34,58 36,62 C38,66 41,69.5 44,71 C50,70 55,67 59,63 C61.5,60 63,56 63.5,50 L64,31Z',
    ear: 'M62.5,47 C66.5,45 69,49 68,54.5 C67,58 65,59 62.5,58Z', earIn: 'M64.5,49.5 C66.5,50 66.8,53 65.5,55.5',
    neck: 'M46.5,72 C46.5,79 46,84 45,92 L66,92 C64.5,84 63,76 62.5,64Z', jawShadow: 'M47,77 Q55,76 61.5,69',
    torso: 'M-6,128 L-6,104 C6,93 28,87 43,85 L68,85 C80,87 94,93 102,101 L102,128Z',
    collar: 'M43,85 L54,99 L68,85 L65,85 L54,95 L46,85Z',
    eyes: { far: { cx: 38.8, cy: 51, w: 8.5, h: 5.4 }, near: { cx: 53, cy: 51, w: 11.5, h: 6 } },
    brows: { far: { x: 41.5, y: 43.5, len: 6.5 }, near: { x: 47.5, y: 43.5, len: 10 } },
    nose: 'M44.5,55 L41.8,59.4 L44.2,60', mouth: { x: 46.5, y: 65.5, w: 5 }
  };

  const C = {};

  C.nagi = { // detached genius: soft white cloud of hair, heavy-lidded grey eyes, long calm face
    pal: { bg: '#a8b6cc', ink: '#262a36', skin: '#f6e6dc', hair: '#f4f6fa', hair2: '#c3cad8', accent: '#7686a6', white: '#ffffff' },
    geo: { face: 'M36,31 C34,39 33,44 33.5,49 C33,55 34,59 36,63 C38.5,67.5 41.5,71 44.5,72.5 C50.5,71.5 55.5,68 59.5,63.5 C62,60 63,56 63.5,50 L64,31Z', mouth: { x: 46.5, y: 66.5, w: 5 } },
    eyes: { lid: 0.5, tilt: -0.3, irisScale: 1.1 },
    mouthMap: { neutral: 'flat', confident: 'softsmile', smirk: 'softsmile', elated: 'softsmile', angry: 'focused' },
    back: ['M30,48 Q24,40 28,32 L34,44Z'],
    front: [
      'M31,45 C27,37 28,26 33,19 Q32,12 39.5,11.5 Q44,6.5 51,8.5 Q59,7 63.5,13 Q71,14.5 70,23 Q74.5,30 69.5,36.5 L67.5,46 C65.5,40.5 63,37.5 60,36.5 C57,40 53,42.5 49,44.5 C47.5,41 45.5,39 43.5,38 C41,41 38.5,43 35.5,44.3 C34,44.6 32.5,44.8 31,45Z',
      'M35.5,40 C35.5,44 36.5,47 38.5,49.5 C39.5,46 41.5,44 43.5,43Z',
      'M47,39 C47,43 48,46.5 50,48.5 C51.5,45 53.5,43 56.5,42Z',
      'M62.5,38 C64.5,43 65.5,48 64.5,53.5 C67.5,49.5 68.5,44 67.5,40Z'
    ],
    hairShade: ['M63.5,13 Q71,14.5 70,23 Q74.5,30 69.5,36.5 L67.5,46 C66,40 64,37 61,35.5 C65,30 66,22 63.5,13Z'],
    hairHi: 'M37,18 Q44,13 53,13',
    strands: 'M44,14 C43,22 41,30 39,37 M53,13 C55,20 57,27 59,33 M35,24 C34,30 33,36 32.5,42 M48,20 C48,28 48.5,34 49,40'
  };

  C.rin = { // cold and controlled: sleek dark-green hair, long bang over his right eye, narrow upturned teal eyes
    pal: { bg: '#cfe2db', ink: '#121c19', skin: '#f7e2cc', hair: '#22362e', hair2: '#3f5d50', accent: '#1fa594', white: '#ffffff' },
    geo: { face: 'M36,31 C34,39 33.5,44 34,49 C33.5,54 34.5,58 36.5,62 C38.5,66 41.5,69.5 44.5,70.5 C50,69.5 55,66.5 59,62.5 C61.5,59.5 63,55.5 63.5,50 L64,31Z' },
    eyes: { tilt: 1.2, lowerLash: true, h: 0.85, lashW: 2 },
    brows: { tilt: 0.8, th: 1.2, arch: 0.3 },
    mouthMap: { neutral: 'flat', confident: 'smirk', elated: 'smirk', flow: 'sneer' },
    exMap: { neutral: { browIn: 0.6 } },
    back: [],
    front: [
      'M31,46 C27,34 30,20 41,15 C51,10 63,13 68,21 C72,28 71,38 67,47 C65,42 63,39 60,38 L55,37 C51,40 47,42.5 43,45 C40,43.5 37,44 34,46Z',
      'M49,20 C42,29 36.5,40 33.5,57 C35.5,55 37.5,54 39.5,55 C40.5,46 43.5,38.5 50,31.5Z',
      'M63,36 C65,43 66,49 65,56 C63,50 61,46 58,44Z'
    ],
    hairShade: ['M50,31.5 C44,38 41,46 39.5,55 C41,47 44.5,41 50,35Z'],
    hairHi: 'M38,19 Q46,14.5 56,15.5',
    strands: 'M45,17 C43,25 41,32 39,38 M57,16 C59,22 61,28 62.5,35'
  };

  C.barou = { // the King: heavy build, black hair slicked up into a crown of spikes, narrow red eyes, square jaw
    pal: { bg: '#e8d2c6', ink: '#17110f', skin: '#efcca9', hair: '#1f1a1b', hair2: '#4a4043', accent: '#d0283a', white: '#ffffff' },
    geo: {
      face: 'M35.5,30 C33.5,38 32.5,44 33,49 C32.5,55 33.5,60 36,64 L43,72 C50,71.5 56,68.5 60,64 C62.5,60.5 63.5,55.5 64,49 L64.5,30Z',
      neck: 'M45.5,72 C45.5,79 44.5,84 43,92 L69,92 C67,84 65,76 64,63Z', jawShadow: 'M46,78 Q55,77 62.5,69.5',
      torso: 'M-8,128 L-8,100 C4,91 26,86 41,84.5 L71,84.5 C84,86 98,92 106,100 L106,128Z', collar: 'M41,84.5 L56,99 L71,84.5 L68,84.5 L56,95 L44,84.5Z',
      nose: 'M44.5,52.5 L41.2,58.6 L44.5,59.4 M42,60 L43,60.4', mouth: { x: 46.5, y: 65.5, w: 6 }
    },
    eyes: { tilt: 1.6, h: 0.75, irisScale: 0.85 },
    brows: { th: 2.3, tilt: 2.2, arch: 0.2 },
    mouthMap: { neutral: 'focused', confident: 'sneer', smirk: 'sneer', elated: 'manic', flow: 'sneer' },
    exMap: { neutral: { browIn: 1.6, open: 0.85 } },
    back: [],
    front: ['M33,40 C31,30 33,22 37,18 L35,8 L41,15 L44,5 L48,13 L53,4 L55.5,13 L61,7 L60.5,16.5 C66,20.5 68,28 67,40 C65,34 61,30.5 56,29.5 C50,28.5 44.5,30.5 40.5,32.5 C37,34.5 34.5,37 33,40Z'],
    hairShade: [],
    hairHi: 'M38,24 L40,17 M45,22 L46,12 M52,21 L53,11', hiCol: 'hair2',
    strands: 'M42,31 L38.5,21 M49,29.5 L48.5,16 M56,29.5 L57.5,17 M61,32 L63,22', strandCol: 'hair2'
  };

  C.shidou = { // feral and unpredictable: tanned, spiky blond hair fading to pink tips, pink slit-pupil eyes, manic grin
    pal: { bg: '#f1dbe5', ink: '#2a1513', skin: '#d79f70', hair: '#f1d36b', hair2: '#ec74a4', accent: '#e5559b', white: '#ffffff' },
    pose: { rot: -7 },
    eyes: { tilt: 1.4, slit: true, flick: 1, irisScale: 0.95 },
    brows: { th: 1.1, arch: 1.4, tilt: 1.2 },
    mouthMap: { neutral: 'smirk', confident: 'manic', smirk: 'manic', elated: 'manic', flow: 'manic' },
    tips: { cx: 49, cy: 26, rx: 17, ry: 14 },
    back: [],
    front: [
      'M32,42 C29,34 29.5,27 33,22 L24,13 L36,15.5 L33,5 L44,11 L46,1.5 L53,9.5 L60,2 L61,12 L71,7 L67,17.5 L78,17 L68,24 C69,31 68,38 65,44 C62,38 58,35 54,34 C48,33 42,34 38,36 C35,38 33,40 32,42Z',
      'M36,37 C34,45 34,53 36,61 C37,54 38,47.5 40.5,42Z',
      'M60,36 C62,44 62,51 61,58 C59,51 58,45.5 56,40.5Z'
    ],
    hairShade: [],
    hairHi: 'M38,22 Q45,18 53,19',
    strands: 'M40,35 L35,21 M46,34 L45,15 M53,34 L57,15 M58,35 L65,22'
  };

  C.kaiser = { // the Emperor: blond mullet dyed blue at the ends with two blue rat-tails, blue eyes with red liner, blue rose tattoo
    pal: { bg: '#dbe3f2', ink: '#1d1913', skin: '#f7e6dc', hair: '#f2dc8a', hair2: '#3f6fe0', accent: '#3f78e8', white: '#ffffff', liner: '#d23a4a' },
    pose: { rot: 3 },
    eyes: { tilt: 1.1, lashW: 1.8 },
    brows: { th: 1.1, arch: 0.9, tilt: 1 },
    mouthMap: { neutral: 'softsmile', confident: 'smirk', elated: 'smirk', smirk: 'smirk', flow: 'smirk' },
    back: ['M61,40 C67,50 68.5,61 66.5,74 L60,72 C61,61 61,51 59,44Z'],
    backTipsY: 62,
    overBody: ['M63.5,68 C66.5,80 66.5,92 63.5,108 L60,108 C62,92 62,80 60,70Z'],
    overBodyCol: 'hair2',
    front: [
      'M32,44 C28,33 31,20 42,15 C52,11 63,14 68,22 C71,29 70,38 67,46 C65,41 62,38 58,38 C52,38 45,40 39,45 C37,44 34.5,44 32,44Z',
      'M62,20 C52,24 42,32 35,46.5 C39,43.5 42,42.5 45,43.5 C49,35 55,29 63,25Z',
      'M66,27 C60,32 55,38 52,45.5 C55,43.5 57,42.5 60,43.5 C61,37 63,33 66,30Z'
    ],
    hairShade: [],
    hairHi: 'M38,20 Q46,15.5 56,16',
    strands: 'M48,17 C44,24 40,31 37,38 M58,18 C55,23 52,28 49,33',
    tattoo: true
  };

  C.chigiri = { // the Princess: long straight red hair past the shoulders, side-parted bangs, large pink eyes
    pal: { bg: '#f2dcd5', ink: '#2b0d14', skin: '#f8e3d0', hair: '#d4405a', hair2: '#a32a44', accent: '#e3518e', white: '#ffffff' },
    pose: { rot: 3 },
    geo: { face: 'M36,31 C34,39 33.5,44 34,49 C33.5,54 34.5,58 36.5,62 C38.5,66 41.5,69 44.5,70 C50,69 55,66 59,62 C61.5,59 63,55.5 63.5,50 L64,31Z', mouth: { x: 46, y: 64.5, w: 4.5 } },
    eyes: { flick: 1.2, irisScale: 1.08, h: 1.08 },
    brows: { th: 1, arch: 1.1, tilt: 0.6 },
    mouthMap: {},
    back: ['M30,40 C23,60 23,92 25,128 L76,128 C78,96 76,64 68,40Z'],
    overBody: ['M62.5,40 C67.5,56 68.5,80 64.5,110 C61.5,94 60.5,76 59.5,56Z', 'M33,42 C30,56 30,72 33,90 C35,76 36,62 37,50Z'],
    front: [
      'M31,46 C27,33 31,19 42,14 C52,10 63,13 68,22 C71,29 70,38 67,46 C64,41 60,38 56,38 C53,37 50,35 47,32 C44,37 39,41 34,44Z',
      'M47,16 C43,25 40,34 37,47 C40,44 42,43 44,44 C45,35 46,26 47,16Z',
      'M50,18 C50,27 52,35 56,44 C57,41 59,40 61,41 C57,34 54,26 50,18Z'
    ],
    hairShade: ['M63,62 C64,78 63.5,92 62.5,104', 'M31.5,60 C31.5,70 32,80 33,86'],
    hairShadeLine: true,
    hairHi: 'M38,19 Q46,14.5 56,15.5',
    strands: 'M43,17 C41,25 39,33 37,40 M55,17 C57,24 60,31 63,38'
  };

  // ---------- drawer ----------
  function draw(id, ex, kit, cOverride) {
    id = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const c = cOverride || C[id], p = P(), KK = K(), pal = c.pal, g = Object.assign({}, BASE, c.geo || {}), E = Object.assign({}, KK.EXPR[ex], (c.exMap || {})[ex] || {});
    const ink = pal.ink, clothes = (kit && kit.main) || pal.accent, trim = (kit && kit.trim) || pal.white;
    let b = p.rect(0, 0, 96, 128, pal.bg);
    const pose = c.pose || {}, T = 'translate(0,5) rotate(' + (pose.rot || 0) + ',52,72)';
    const L = (d, fill, w) => p.path(d, fill, { stroke: ink, w: w || 1 });
    b += p.group((c.back || []).map(d => L(d, pal.hair)).join(''), T);
    if (c.backTipsY) b += p.group('<defs>' + p.clip(id + 'bt', (c.back || []).join(' ')) + '</defs>' + p.rect(0, c.backTipsY, 96, 80, pal.hair2, { clip: id + 'bt' }) + (c.back || []).map(d => p.path(d, 'none', { stroke: ink, w: 1 })).join(''), T);
    b += L(g.torso, clothes) + L(g.neck, pal.skin) + L(g.collar, trim, 0.8);
    if (c.tattoo) b += p.path('M60,77 c2,-2 4,-1 4,1 c0,2 -2,3 -4,2 c-2,-1 -1,-3 0,-3Z', pal.accent, { stroke: ink, w: 0.7 }) + p.path('M61.5,80.5 C62.5,83 63,85 64,87.5 M62.6,83.2 l1.3,-0.5', 'none', { stroke: ink, w: 0.8 });
    b += (c.overBody || []).map(d => L(d, c.overBodyCol ? pal[c.overBodyCol] : pal.hair)).join('');
    let h = L(g.ear, pal.skin) + p.path(g.earIn, 'none', { stroke: ink, w: 0.8 }) + L(g.face, pal.skin);
    const eo = Object.assign({ ink, iris: pal.iris || P().mix(pal.ink, pal.accent, 0.5), accent: pal.accent, white: pal.white, skin: pal.skin, ex: E, liner: pal.liner }, c.eyes || {});
    const eh = (c.eyes && c.eyes.h) || 1;
    h += KK.eye(Object.assign({}, eo, g.eyes.far, { dir: -1, id: id + 'f', h: g.eyes.far.h * eh }));
    h += KK.eye(Object.assign({}, eo, g.eyes.near, { dir: 1, id: id + 'n', h: g.eyes.near.h * eh }));
    const bo = Object.assign({ col: ink, ex: E }, c.brows || {});
    h += KK.brow(Object.assign({}, bo, g.brows.far, { dir: -1 }));
    h += KK.brow(Object.assign({}, bo, g.brows.near, { dir: 1 }));
    h += p.path(g.nose, 'none', { stroke: ink, w: 0.9 });
    h += KK.mouth(Object.assign({ ink, accent: pal.accent, white: pal.white }, g.mouth), (c.mouthMap || {})[ex] || KK.MOUTH[ex]);
    if (E.blush) h += p.path('M36,58 l3,-1.2 M38,59 l3,-1.2 M55,58 l3,-1.2 M57,59 l3,-1.2', 'none', { stroke: pal.accent, w: 0.9 });
    if (E.sweat) h += p.path('M66,38 q-1.5,3 0,4 q1.5,-1 0,-4Z', pal.white, { stroke: ink, w: 0.7 });
    h += (c.front || []).map(d => L(d, pal.hair)).join('');
    if (c.tips) { const t = c.tips; h += '<defs>' + p.clip(id + 'tp', c.front.join(' ')) + '</defs>' + p.path('M-20,-20 H120 V140 H-20Z M' + t.cx + ',' + (t.cy - t.ry) + ' a' + t.rx + ',' + t.ry + ' 0 1,0 0.01,0Z', pal.hair2, { clip: id + 'tp', rule: 'evenodd' }) + p.path('M0,56 H96 V70 H0Z', pal.hair2, { clip: id + 'tp' }) + c.front.map(d => p.path(d, 'none', { stroke: ink, w: 1 })).join(''); }
    h += (c.hairShade || []).map(d => c.hairShadeLine ? p.path(d, 'none', { stroke: pal.hair2, w: 1 }) : p.path(d, pal.hair2)).join('');
    if (c.hairHi) h += p.path(c.hairHi, 'none', { stroke: c.hiCol ? pal[c.hiCol] : pal.white, w: 1.6 });
    h += p.path(c.strands, 'none', { stroke: c.strandCol ? pal[c.strandCol] : ink, w: 0.9 });
    if (E.glow) h += p.path('M70,12 l3,-4 M76,22 l4,-2 M72,30 l4,1', 'none', { stroke: pal.accent, w: 1 });
    b += p.group(h, T);
    if (c.extras) b += p.group(c.extras(pal, p), T);
    if (c.flip) b = p.group(b, 'translate(96,0) scale(-1,1)');
    return b;
  }

  function has(id) { return !!C[id]; }
  function accent(id) { return C[id] ? C[id].pal.accent : null; }
  function svgFor(id, ex, opts) { if (!C[id]) return ''; return P().svg(draw(id, ex, opts && opts.kit)); }
  EW.portraitNamed = { has, accent, svg: svgFor, ids: () => Object.keys(C), BASE, C, draw };
})(typeof globalThis !== 'undefined' ? globalThis : this);
