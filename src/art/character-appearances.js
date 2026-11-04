/* EgoWheel — persistent visual identities.
 *
 * Every footballer has a stable portrait:
 *   • major named characters get bespoke definitions: a signature hair design drawn specifically for
 *     them (EW.sprites.SIGNATURE), a tuned face, eyes and palette, and a persona that shapes their
 *     expressions (cold, manic, bored, fierce, sunny, proud, shy). These are original pixel
 *     interpretations, not official artwork.
 *   • other named characters use tuned library styles with fixed traits;
 *   • procedural players derive a full look from their id (hair, face, eyes, spacing, nose, skin,
 *     marks, accessories, persona from their personality), so each looks the same every time.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const BASE = { v: 2, skin: 'light', hairStyle: 'messy', hairColor: 'black', hairTip: 'none', hairLen: 0, eyeColor: 'brown', eyeShape: 'standard', eyeGap: 3, brow: 'neutral', face: 'oval', nose: 'button',
    facialHair: 'none', mark: 'none', accessory: 'none', accent: '#1598ff', var: 0 };
  const A = (skin, hairStyle, hairColor, eyeColor, extra = {}) => Object.assign({}, BASE, { skin, hairStyle, hairColor, eyeColor }, extra);

  const NAMED = {
    // —— bespoke signature designs ——
    isagi: A('light', 'parted', 'navy', 'blue', { sig: 'isagi', face: 'oval', eyeShape: 'standard', brow: 'neutral', persona: 'proud', accent: '#1598ff' }),
    bachira: A('light', 'bob', 'black', 'amber', { sig: 'bachira', hairTip: 'gold', face: 'soft', eyeShape: 'round', brow: 'short', persona: 'sunny', accent: '#ffd166' }),
    nagi: A('porcelain', 'fluffy', 'white', 'grey', { sig: 'nagi', face: 'long', eyeShape: 'lidded', brow: 'thin', nose: 'sharp', persona: 'bored', accent: '#f2f2f2' }),
    reo: A('fair', 'parted', 'purple', 'violet', { sig: 'reo', face: 'oval', eyeShape: 'standard', brow: 'arched', persona: 'proud', accent: '#b786ff' }),
    barou: A('warm', 'slick', 'black', 'red', { sig: 'barou', face: 'square', eyeShape: 'fierce', brow: 'thick', nose: 'long', eyeGap: 3, persona: 'fierce', accent: '#ff5d73' }),
    shidou: A('fair', 'mohawk', 'pink', 'red', { sig: 'shidou', hairTip: 'blonde', face: 'sharp', eyeShape: 'fierce', brow: 'short', accessory: 'earring', persona: 'manic', accent: '#ff5d73' }),
    rin: A('fair', 'sidefringe', 'teal', 'teal', { sig: 'rin', face: 'sharp', eyeShape: 'sharp', brow: 'thin', nose: 'sharp', persona: 'cold', accent: '#7de7ff' }),
    sae: A('fair', 'curtain', 'crimson', 'teal', { sig: 'sae', face: 'sharp', eyeShape: 'lidded', brow: 'thin', nose: 'sharp', persona: 'cold', accent: '#ff5d73' }),
    chigiri: A('fair', 'long', 'red', 'pink', { sig: 'chigiri', face: 'sharp', eyeShape: 'sharp', brow: 'thin', persona: 'proud', accent: '#ff5d73' }),
    kunigami: A('light', 'undercut', 'orange', 'amber', { sig: 'kunigami', face: 'square', eyeShape: 'standard', brow: 'thick', nose: 'long', persona: 'fierce', accent: '#ff9f43' }),
    kaiser: A('porcelain', 'swept', 'platinum', 'blue', { sig: 'kaiser', hairTip: 'blue', face: 'sharp', eyeShape: 'sharp', brow: 'thin', nose: 'sharp', mark: 'tattoo', persona: 'cold', accent: '#1598ff' }),
    aiku: A('light', 'ponytail', 'brown', 'brown', { sig: 'aiku', face: 'square', eyeShape: 'droopy', brow: 'straight', facialHair: 'stubble', nose: 'long', persona: 'proud', accent: '#46e08a' }),
    karasu: A('light', 'parted', 'black', 'grey', { sig: 'karasu', face: 'long', eyeShape: 'sharp', brow: 'straight', mark: 'mole', persona: 'cold', accent: '#b786ff' }),
    tokimitsu: A('fair', 'long', 'blonde', 'blue', { sig: 'tokimitsu', face: 'long', eyeShape: 'droopy', brow: 'thin', persona: 'shy', accent: '#ffd166' }),
    lorenzo: A('bronze', 'wild', 'black', 'gold', { sig: 'lorenzo', face: 'long', eyeShape: 'fierce', brow: 'arched', accessory: 'chain', persona: 'manic', accent: '#ffd166' }),
    // —— tuned library designs ——
    gagamaru: A('light', 'crop', 'black', 'grey', { face: 'square', eyeShape: 'droopy', brow: 'short', eyeGap: 4, persona: 'bored' }),
    raichi: A('light', 'spiky', 'blonde', 'brown', { eyeShape: 'fierce', brow: 'thick', face: 'square', persona: 'fierce' }),
    igarashi: A('warm', 'buzz', 'brown', 'brown', { face: 'round', eyeShape: 'round', brow: 'short', persona: 'sunny', eyeGap: 4 }),
    kuon: A('light', 'parted', 'brown', 'brown', { face: 'oval', eyeShape: 'standard', brow: 'straight' }),
    naruhaya: A('light', 'tousled', 'black', 'brown', { face: 'round', eyeShape: 'round', persona: 'shy' }),
    niko: A('light', 'sidefringe', 'black', 'grey', { eyeShape: 'round', face: 'round', accessory: 'glasses', persona: 'shy' }),
    nanase: A('fair', 'bowl', 'silver', 'teal', { face: 'soft', eyeShape: 'round', persona: 'sunny' }),
    wanima_j: A('light', 'messy', 'black', 'brown', { mark: 'paint', accent: '#ffd166', var: 11 }),
    wanima_k: A('light', 'messy', 'black', 'brown', { mark: 'paint', accent: '#46e08a', var: 11 }),
    zantetsu: A('light', 'spiky', 'black', 'brown', { eyeShape: 'sharp', face: 'long', brow: 'thick', var: 4 }),
    otoya: A('light', 'sidefringe', 'black', 'brown', { eyeShape: 'narrow', face: 'sharp', brow: 'thin', persona: 'cold', var: 2 }),
    hiori: A('fair', 'tousled', 'platinum', 'blue', { eyeShape: 'round', face: 'soft', brow: 'thin', persona: 'shy', var: 6 }),
    yukimiya: A('fair', 'swept', 'ash', 'grey', { accessory: 'glasses', face: 'sharp', eyeShape: 'sharp', persona: 'cold' }),
    kurona: A('light', 'shaggy', 'pink', 'red', { face: 'soft', eyeShape: 'round', brow: 'short', persona: 'shy', var: 3 }),
    aryu: A('light', 'long', 'black', 'gold', { face: 'sharp', brow: 'arched', eyeShape: 'lidded', hairLen: 2, persona: 'proud' }),
    kiyora: A('light', 'bob', 'brown', 'brown', { face: 'soft', eyeShape: 'round' }),
    sendou: A('light', 'spiky', 'gold', 'amber', { eyeShape: 'sharp', face: 'sharp', persona: 'fierce', var: 9 }),
    darai: A('warm', 'buzz', 'black', 'brown', { face: 'square', brow: 'thick', eyeShape: 'narrow', nose: 'long' }),
    neru: A('light', 'bowl', 'lilac', 'grey', { eyeShape: 'narrow', face: 'oval', persona: 'cold' }),
    niou: A('light', 'parted', 'blonde', 'green', { eyeShape: 'sharp', brow: 'arched', var: 5 }),
    ness: A('porcelain', 'waves', 'purple', 'violet', { face: 'soft', eyeShape: 'round', brow: 'arched', persona: 'sunny' }),
    chevalier: A('porcelain', 'bob', 'platinum', 'violet', { hairTip: 'pink', eyeShape: 'lidded', face: 'sharp', persona: 'cold' }),
    agi: A('brown', 'crop', 'black', 'brown', { face: 'square', brow: 'thick', nose: 'long', persona: 'proud' })
  };

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function pickBy(key, arr, salt) { return arr[hash(key + ':' + salt) % arr.length]; }
  const PERS_PERSONA = { proud: 'proud', king: 'proud', emperor: 'cold', coldPerfectionist: 'cold', aloof: 'cold', devil: 'manic', mocker: 'manic', lazyGenius: 'bored', freeSpirit: 'sunny', instinct: 'sunny',
    anxious: 'shy', quiet: 'shy', brash: 'fierce', blunt: 'fierce', hunter: 'fierce', cynic: 'cold', hero: 'proud', captain: 'proud', clown: 'sunny' };

  /** Full stable look from an id; skin/hair weighted toward a Japanese programme with variety. */
  function procedural(id, pers) {
    const O = EW.sprites.OPTIONS, key = String(id);
    const hairColor = pickBy(key, ['black', 'black', 'black', 'black', 'charcoal', 'navy', 'brown', 'brown', 'chestnut', 'auburn', 'blonde', 'ash', 'silver', 'red', 'teal', 'orange', 'purple', 'white', 'green', 'pink', 'blue', 'gold', 'lilac', 'crimson'], 'c');
    const skin = pickBy(key, ['porcelain', 'fair', 'fair', 'light', 'light', 'light', 'warm', 'warm', 'tan', 'olive', 'bronze', 'brown', 'deep', 'ebony'], 's');
    const dark = ['brown', 'deep', 'ebony', 'bronze'].includes(skin);
    const styles = dark ? O.hairStyle.concat(['afro', 'twists', 'crop', 'buzz']) : O.hairStyle;
    const h = n => hash(key + n);
    return {
      v: 2, skin, hairStyle: pickBy(key, styles, 'h'), hairColor, hairTip: h('t') % 10 === 0 ? pickBy(key, ['blonde', 'red', 'blue', 'white', 'pink', 'gold'], 'tt') : 'none',
      hairLen: h('l') % 3, eyeColor: pickBy(key, ['brown', 'brown', 'brown', 'hazel', 'grey', 'blue', 'green', 'amber', 'teal', 'gold', 'violet'], 'e'),
      eyeShape: pickBy(key, O.eyeShape, 'es'), eyeGap: 2 + h('g') % 3, brow: pickBy(key, O.brow, 'b'), face: pickBy(key, O.face, 'f'), nose: pickBy(key, O.nose, 'n'),
      facialHair: h('fh') % 9 === 0 ? pickBy(key, ['stubble', 'goatee', 'beard'], 'fhh') : 'none',
      mark: h('m') % 6 === 0 ? pickBy(key, ['scar', 'mole', 'bandage', 'freckles', 'paint'], 'mm') : 'none',
      accessory: h('a') % 7 === 0 ? pickBy(key, ['headband', 'glasses', 'earring', 'hairclip', 'wristband', 'chain'], 'aa') : 'none',
      accent: pickBy(key, O.accent, 'ac'), var: h('v') % 997, persona: PERS_PERSONA[pers] || pickBy(key, [undefined, undefined, undefined, 'proud', 'fierce', 'cold', 'sunny', 'shy'], 'p')
    };
  }

  function forPlayer(p) {
    if (!p) return procedural('unknown');
    if (p.isMe) return null; // the protagonist uses run.appearance
    return NAMED[p.id] || procedural(p.id, p.pers);
  }

  function defaultAppearance() { return A('light', 'messy', 'black', 'brown', { number: 11 }); }
  function randomAppearance(rng) {
    const O = EW.sprites.OPTIONS, r = arr => arr[Math.floor(rng.next() * arr.length)];
    return { v: 2, skin: r(O.skin), hairStyle: r(O.hairStyle), hairColor: r(O.hairColor), hairTip: rng.next() < 0.18 ? r(O.hairColor) : 'none', hairLen: Math.floor(rng.next() * 3),
      eyeColor: r(O.eyeColor), eyeShape: r(O.eyeShape), eyeGap: 2 + Math.floor(rng.next() * 3), brow: r(O.brow), face: r(O.face), nose: r(O.nose), facialHair: rng.next() < 0.12 ? r(['stubble', 'goatee', 'beard']) : 'none',
      mark: rng.next() < 0.2 ? r(['scar', 'bandage', 'mole', 'paint', 'freckles', 'tattoo']) : 'none', accessory: rng.next() < 0.2 ? r(['headband', 'glasses', 'earring', 'hairclip', 'wristband', 'chain']) : 'none',
      accent: r(O.accent), number: 1 + Math.floor(rng.next() * 99), var: Math.floor(rng.next() * 997) };
  }
  /** Repairs any saved appearance (v1 or v2, partial or corrupt) into a valid v2 one. */
  function normalize(a) {
    const O = EW.sprites.OPTIONS, d = defaultAppearance(), out = Object.assign({}, d, a || {});
    for (const k of ['skin', 'hairStyle', 'hairColor', 'eyeColor', 'eyeShape', 'brow', 'face', 'nose', 'facialHair', 'mark', 'accessory']) if (!O[k].includes(out[k])) out[k] = d[k];
    if (!O.hairTip.includes(out.hairTip)) out.hairTip = 'none';
    out.hairLen = Math.max(0, Math.min(2, Number(out.hairLen) || 0));
    out.eyeGap = Math.max(2, Math.min(4, Math.round(Number(out.eyeGap) || 3)));
    out.number = Math.max(1, Math.min(99, Math.round(Number(out.number) || 11)));
    out.var = Math.max(0, Math.min(996, Math.round(Number(out.var) || 0)));
    if (typeof out.accent !== 'string' || !/^#[0-9a-f]{6}$/i.test(out.accent)) out.accent = d.accent;
    if (out.sig && !EW.sprites.SIGNATURE[out.sig]) delete out.sig;
    if (out.persona && !EW.sprites.PERSONA[out.persona]) delete out.persona;
    out.v = 2;
    return out;
  }

  const TEAM_COLORS = ['#c8352e', '#2b6fd6', '#2f9a4a', '#e0a826', '#7a4cc0', '#d6602a', '#1f8f8a', '#b83a7a', '#4a5568', '#e8e8e8'];
  const CLUB_KITS = {
    'Bastard München': { main: '#9a1f2a', trim: '#111111', dark: '#5e1219' }, 'Manshine City': { main: '#76c4ee', trim: '#ffffff', dark: '#4a92bb' },
    'FC Barcha': { main: '#7c1d38', trim: '#2a4fa8', dark: '#4e1123' }, 'Ubers': { main: '#1c1c1c', trim: '#f2f2f2', dark: '#0c0c0c' }, 'Paris X Gen': { main: '#15254c', trim: '#d63a4a', dark: '#0b1530' },
    'Royale Madrid': { main: '#f2f2f2', trim: '#d4af37', dark: '#c8c8c8' }, 'Rhein Adler': { main: '#c22b2b', trim: '#ffffff', dark: '#8c1c1c' }, 'London Red': { main: '#d01f2a', trim: '#ffffff', dark: '#931520' },
    'Berserk Dortmund': { main: '#f2c418', trim: '#141414', dark: '#bb9510' }, 'Torino Ubers': { main: '#f2f2f2', trim: '#141414', dark: '#bdbdbd' },
    'Japan': { main: '#1e3f9a', trim: '#ffffff', dark: '#132a6a' }, 'Japan U-20': { main: '#1e3f9a', trim: '#ffffff', dark: '#132a6a' }, 'Blue Lock': { main: '#0f2a52', trim: '#7de7ff', dark: '#0a1c38' }
  };
  function kitFor(teamOrClub) {
    if (CLUB_KITS[teamOrClub]) return CLUB_KITS[teamOrClub];
    const m = /^Team ([A-Z])$/.exec(teamOrClub || '');
    const main = m ? TEAM_COLORS[(m[1].charCodeAt(0) - 65) % TEAM_COLORS.length] : '#0f2a52';
    return { main, trim: '#f2f2f2', dark: EW.sprites.mix(main, '#000000', 0.35) };
  }

  EW.appearances = { NAMED, procedural, forPlayer, defaultAppearance, randomAppearance, normalize, kitFor, CLUB_KITS };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.appearances;
})(typeof globalThis !== 'undefined' ? globalThis : this);
