/* EgoWheel — generated footballers in the same reference style as the named cast.
 * Built from an authored component library: 12 hairstyles drawn for the 3/4 head, 5 face structures, eye and brow
 * designs, palettes and small details. Selection is deterministic per player id and stratified (consecutive ids
 * step through styles, colours and faces at different rates) so the roster doesn't repeat itself, and looks that
 * would collide with a named character's signature (same style family + hair colour) are skipped.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const P = () => EW.portraitArt;

  const SHADE = 'M60,14 C66,18 70,26 69,36 L67,48 C65,42 63,39 60,38 C63,30 63,22 60,14Z';
  const HAIR = {
    messy:   { front: ['M31,45 C27,35 29,22 38,16 L36,11 L42,14 C46,10 52,10 56,12 L60,9 L60,14 C66,17 70,25 69,34 L71,37 L68,40 L67,46 C65,41 62,38 59,37 L56,42 L53,38 L49,44 L46,39 L42,44 L40,40 L36,45 L34,42Z'], strands: 'M44,17 C42,25 40,32 38,38 M55,15 C57,22 59,28 61,34' },
    swept:   { front: ['M32,45 C28,33 31,20 42,15 C52,11 63,14 68,22 C71,29 70,38 67,46 C64,41 61,39 57,39 C51,40 44,42 37,47 C35,46 33.5,45.5 32,45Z', 'M64,21 C54,25 44,33 37,47 C41,44 44,43 47,44 C51,36 57,30 65,26Z'], strands: 'M50,18 C46,25 42,31 39,38' },
    spiky:   { front: ['M32,44 C29,35 30,27 34,22 L29,14 L38,17 L39,7 L45,14 L50,5 L53,14 L60,8 L60,17 L68,14 L65,22 C69,29 69,37 66,45 C63,39 59,36 55,35 C49,34 43,35 39,37 C36,39 33.5,41 32,44Z'], strands: 'M41,36 L38,22 M48,35 L48,16 M55,35 L57,18' },
    buzz:    { front: ['M33,42 C31,31 35,21 44,18 C53,15 63,18 66,26 C68,32 67,38 65,44 C62,38 58,35 52,34.5 C45,34.5 38,37 33,42Z'], strands: '', noShade: true },
    curtain: { front: ['M31,47 C27,34 30,20 41,15 C51,11 63,13 68,21 C72,28 71,38 67,48 C65,42 61,38 56,37 L50,24 L45,37 C40,39 35,42 31,47Z', 'M50,22 C46,30 41,38 36,48 C39,45 41,44 43,45 C45,37 47,30 50,22Z', 'M50,22 C53,30 57,36 62,42 C59,41 57,41 55,42 C53,35 51,29 50,22Z'], strands: 'M43,19 C42,25 40,31 38,37' },
    ponytail:{ back: ['M63,30 C74,36 77,50 72,68 C70,57 67,48 61,42Z'], front: ['M32,45 C28,33 31,20 42,15 C52,11 63,14 68,22 C71,29 70,38 67,46 C64,41 61,39 57,39 C51,40 44,42 37,47 C35,46 33.5,45.5 32,45Z'], strands: 'M45,17 C47,24 52,30 58,34 M40,22 C43,29 47,34 52,38' },
    curly:   { front: ['M31,46 Q25,40 29,33 Q25,26 31,21 Q30,13 38,13 Q42,7 49,9 Q56,6 61,11 Q69,11 69,19 Q75,24 71,31 Q75,38 69,43 L67,47 Q64,41 59,40 Q55,43 50,41 Q46,44 42,41 Q38,45 34,43Z'], strands: 'M40,20 q3,3 0,6 M50,16 q3,3 0,6 M58,22 q3,3 0,6 M44,30 q3,3 0,6 M54,32 q3,3 0,5' },
    slick:   { front: ['M33,40 C31,29 35,19 44,15 C53,12 64,15 68,24 C71,31 70,39 67,46 C65,40 62,35 57,33 C51,31 44,32 39,35 C36,36 34,38 33,40Z'], strands: 'M40,34 C41,26 44,20 48,17 M47,32 C48,25 51,19 56,16 M54,32 C56,25 60,20 64,19' },
    shaggy:  { back: ['M30,48 C28,56 29,64 32,71 L35,60Z', 'M67,46 C69,56 68,64 65,71 L62,58Z'], front: ['M30,52 C25,38 28,22 38,16 C48,10 62,12 68,20 C73,28 72,42 68,54 C66,47 63,43 59,42 L57,47 L54,42 L50,48 L47,42 L43,48 L41,43 L37,48 L35,44 C33,46 31,49 30,52Z'], strands: 'M44,16 C42,25 41,33 40,41 M56,15 C58,23 60,31 61,40' },
    undercut:{ front: ['M36,36 C34,27 38,18 47,14 C56,11 65,15 68,23 C69,29 67,34 64,38 C60,34 55,32 49,33 C44,34 40,35 36,36Z', 'M34,45 C32,40 33,37 36,36 L40,37 C37,39 35,41 34,45Z'], strands: 'M42,33 C44,25 49,19 56,16 M50,32 C53,25 57,21 63,19' },
    long:    { back: ['M30,42 C25,58 26,82 30,104 L70,104 C72,82 72,58 67,42Z'], front: ['M31,47 C27,34 30,20 41,15 C51,11 63,13 68,21 C72,28 71,38 67,48 C65,42 61,38 56,37 L50,24 L45,37 C40,39 35,42 31,47Z', 'M50,22 C46,30 41,38 36,48 C39,45 41,44 43,45 C45,37 47,30 50,22Z'], strands: 'M43,19 C42,25 40,31 38,37 M57,18 C59,24 62,30 64,37' },
    bowl:    { front: ['M30,48 C27,34 31,19 43,15 C53,12 64,15 69,23 C72,31 71,40 68,48 L62,46 L57,47 L52,46 L47,47 L42,46 L37,47 L33,46Z'], strands: 'M44,17 C43,26 42,34 42,42 M55,16 C56,25 57,34 57,42' }
  };
  const HAIR_KEYS = Object.keys(HAIR);
  const FACES = {
    base:   { face: 'M36,31 C34,39 33,44 33.5,49 C33,54 34,58 36,62 C38,66 41,69.5 44,71 C50,70 55,67 59,63 C61.5,60 63,56 63.5,50 L64,31Z' },
    slim:   { face: 'M36.5,31 C34.5,39 34,44 34.5,49 C34,54 35,58 37,62 C39,66 42,69.5 45,70.5 C50,69.5 55,66.5 58.5,62.5 C61,59.5 62.5,55.5 63,50 L63.5,31Z' },
    square: { face: 'M35.5,30 C33.5,38 32.5,44 33,49 C32.5,55 33.5,60 36,64 L43,72 C50,71.5 56,68.5 60,64 C62.5,60.5 63.5,55.5 64,49 L64.5,30Z' },
    round:  { face: 'M35.5,31 C33,39 32.5,45 33,50 C33,56 35,60 37.5,64 C40,67.5 42.5,69.5 45,70 C51,69.5 56,67 60,63 C62.5,60 63.5,56 63.8,50 L64,31Z' },
    long:   { face: 'M36,31 C34,39 33,44 33.5,49 C33,55 34,59 36,63 C38.5,67.5 41.5,71 44.5,72.5 C50.5,71.5 55.5,68 59.5,63.5 C62,60 63,56 63.5,50 L64,31Z', mouth: { x: 46.5, y: 66.5, w: 5 } }
  };
  const FACE_KEYS = Object.keys(FACES);
  const HAIR_COL = [
    ['black', '#22202a', '#45414f'], ['black', '#1d1b22', '#3a3644'], ['darkbrown', '#3b2a22', '#5a4234'], ['brown', '#5a3a28', '#7b5236'], ['chestnut', '#7b4628', '#9c6038'],
    ['navy', '#283a64', '#40568a'], ['blond', '#e9cc72', '#c9a44c'], ['ash', '#9c9a96', '#c4c2bd'], ['red', '#b8343e', '#8a2230'], ['orange', '#d8742e', '#b0561c'],
    ['silver', '#c9ced8', '#a2a9b8'], ['teal', '#2b6e6d', '#438c8a'], ['purple', '#6a4aa6', '#8a6cc4'], ['green', '#3e7a45', '#5a9a60'], ['white', '#eef1f6', '#c6ccd8'], ['black', '#26232b', '#4a4552']
  ];
  const SKIN = ['#fbe4d4', '#f6dcc4', '#f2d2b4', '#efc7a2', '#e2ad84', '#d39b6c', '#b07a4e', '#8a5737', '#6a4129'];
  const ACCENT = ['#3a7bd5', '#2fa36b', '#d0533a', '#8a5cd0', '#c79a2a', '#1fa5a5', '#d04a7a', '#5a6b85', '#a0522d', '#4a90c8', '#c0392b', '#27ae60'];
  const MOUTHS = [{}, { neutral: 'flat' }, { neutral: 'softsmile', confident: 'smirk' }, { confident: 'sneer', smirk: 'sneer' }, { elated: 'manic' }, { neutral: 'focused' }];
  // Named signatures to avoid duplicating (style family + colour).
  const RESERVED = ['fluffy:white', 'spiky:black', 'spiky:blond', 'swept:blond', 'long:red', 'curtain:red'];

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function num(id) { const m = /(\d+)$/.exec(String(id)); return m ? Number(m[1]) : hash(String(id)) % 9973; }

  function build(id) {
    const key = String(id).replace(/^proc:/, ''), n = num(key), h = hash(key), pick = (arr, a, b) => arr[((n * a + (h >>> b)) % arr.length + arr.length) % arr.length];
    let style = pick(HAIR_KEYS, 7, 3), hc = pick(HAIR_COL, 5, 7);
    for (let t = 0; RESERVED.includes(style + ':' + hc[0]) && t < 6; t++) hc = HAIR_COL[(HAIR_COL.indexOf(hc) + 3) % HAIR_COL.length];
    const face = pick(FACE_KEYS, 3, 11), skin = pick(SKIN, 2, 13), accent = pick(ACCENT, 11, 5), hd = HAIR[style];
    const r = k => ((h >>> k) & 255) / 255;
    const ink = P().mix(hc[1], '#120f14', 0.72);
    const c = {
      pal: { bg: P().mix(accent, '#f2ede4', 0.8), ink, skin, hair: hc[1], hair2: hc[2], accent, white: '#ffffff' },
      geo: FACES[face], pose: { rot: Math.round((r(2) - 0.5) * 10) },
      eyes: { tilt: Math.round((r(4) * 2 - 0.5) * 10) / 10, h: 0.8 + r(6) * 0.35, irisScale: 0.9 + r(8) * 0.2, lid: r(10) > 0.82 ? 0.45 : 0, lowerLash: r(12) > 0.7, flick: r(14) },
      brows: { th: 1 + r(16) * 1.4, tilt: r(18) * 2, arch: r(20) * 1.2 },
      mouthMap: MOUTHS[(n + (h >>> 9)) % MOUTHS.length],
      back: hd.back || [], front: hd.front, hairShade: hd.noShade ? [] : [SHADE], hairHi: style === 'buzz' ? '' : 'M38,19 Q46,14.5 56,15.5', strands: hd.strands || '',
      flip: (n + (h >>> 21)) % 2 === 1
    };
    const extra = (h >>> 23) % 9;
    c.extras = (pal, p) => {
      if (extra === 0) return p.path('M33,49 h12 v6 h-12Z M48,49 h12 v6 h-12Z M45,51 h3', 'none', { stroke: pal.ink, w: 0.9 });
      if (extra === 1) return p.path('M38,59 h1 M41,60 h1 M55,59 h1 M58,60 h1 M39,61 h1', 'none', { stroke: pal.accent, w: 1 });
      if (extra === 2) return p.path('M55,57 l4,3', 'none', { stroke: pal.accent, w: 1 });
      if (extra === 3) return p.path('M66,59 a1.4,1.4 0 1,0 0.1,0', pal.accent, { stroke: pal.ink, w: 0.7 });
      if (extra === 4) return p.path('M32,37 C42,33 56,32 68,35 L68,38 C56,35 42,36 32,40Z', pal.accent, { stroke: pal.ink, w: 0.8 });
      return '';
    };
    return c;
  }
  function svg(id, ex, opts) { const c = build(id); return P().svg(EW.portraitNamed.draw(String(id), ex, opts && opts.kit, c)); }
  function accent(id) { return build(id).pal.accent; }
  EW.portraitProc = { build, svg, accent, HAIR, FACES };
})(typeof globalThis !== 'undefined' ? globalThis : this);
