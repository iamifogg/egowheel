/* EgoWheel — persistent visual identities.
 * Named characters get fixed, recognisable (original) pixel interpretations; procedural players get
 * a stable look derived from their id (no stored images, no change between dossier openings).
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const A = (skin, hairStyle, hairColor, eyeColor, extra = {}) => Object.assign({ v: 1, skin, hairStyle, hairColor, hairTip: 'none', hairLen: 0, eyeColor, eyeShape: 'standard', brow: 'neutral', face: 'oval', facialHair: 'none', mark: 'none', accessory: 'none', accent: '#1598ff' }, extra);

  const NAMED = {
    isagi: A('light', 'messy', 'navy', 'blue', { brow: 'neutral' }),
    bachira: A('light', 'bob', 'black', 'amber', { hairTip: 'blonde', face: 'round', eyeShape: 'round' }),
    chigiri: A('fair', 'long', 'red', 'violet', { face: 'sharp', eyeShape: 'sharp', brow: 'thin', hairLen: 1 }),
    kunigami: A('light', 'undercut', 'orange', 'amber', { face: 'square', brow: 'thick' }),
    gagamaru: A('light', 'buzz', 'black', 'grey', { face: 'square', eyeShape: 'droopy' }),
    raichi: A('light', 'spiky', 'blonde', 'brown', { eyeShape: 'sharp', brow: 'thick' }),
    igarashi: A('warm', 'buzz', 'brown', 'brown', { face: 'round', eyeShape: 'round' }),
    kuon: A('light', 'parted', 'brown', 'brown', { face: 'sharp' }),
    barou: A('light', 'wild', 'black', 'red', { face: 'square', eyeShape: 'sharp', brow: 'thick', hairLen: 1 }),
    naruhaya: A('light', 'tousled', 'black', 'brown', { face: 'round' }),
    niko: A('light', 'bowl', 'black', 'grey', { eyeShape: 'round', face: 'round' }),
    nanase: A('fair', 'bowl', 'silver', 'teal', { face: 'round' }),
    wanima_j: A('light', 'messy', 'black', 'brown', { mark: 'paint', accent: '#ffd166' }),
    wanima_k: A('light', 'messy', 'black', 'brown', { mark: 'paint', accent: '#46e08a' }),
    nagi: A('fair', 'tousled', 'white', 'grey', { eyeShape: 'droopy', brow: 'thin' }),
    reo: A('light', 'parted', 'purple', 'violet', { brow: 'arched' }),
    zantetsu: A('light', 'spiky', 'black', 'brown', { eyeShape: 'sharp' }),
    rin: A('fair', 'curtain', 'teal', 'teal', { face: 'sharp', eyeShape: 'sharp', brow: 'thin' }),
    shidou: A('fair', 'mohawk', 'pink', 'red', { hairTip: 'blonde', eyeShape: 'sharp', face: 'sharp', accessory: 'earring' }),
    karasu: A('light', 'parted', 'black', 'grey', { eyeShape: 'sharp', mark: 'mole' }),
    otoya: A('light', 'swept', 'black', 'brown', { eyeShape: 'droopy' }),
    hiori: A('fair', 'tousled', 'platinum', 'blue', { eyeShape: 'round', face: 'round' }),
    yukimiya: A('fair', 'swept', 'ash', 'grey', { accessory: 'glasses', face: 'sharp' }),
    kurona: A('light', 'messy', 'pink', 'red', { face: 'round', eyeShape: 'round' }),
    aryu: A('light', 'long', 'black', 'gold', { face: 'sharp', brow: 'arched', hairLen: 2 }),
    tokimitsu: A('fair', 'long', 'blonde', 'blue', { eyeShape: 'droopy', hairLen: 0 }),
    kiyora: A('light', 'bob', 'brown', 'brown'),
    aiku: A('light', 'ponytail', 'brown', 'brown', { face: 'square', eyeShape: 'droopy', facialHair: 'stubble' }),
    sae: A('fair', 'curtain', 'red', 'teal', { face: 'sharp', eyeShape: 'sharp' }),
    sendou: A('light', 'spiky', 'blonde', 'amber', { eyeShape: 'sharp' }),
    darai: A('warm', 'buzz', 'black', 'brown', { face: 'square', brow: 'thick' }),
    neru: A('light', 'bowl', 'purple', 'grey', { eyeShape: 'narrow' }),
    niou: A('light', 'parted', 'blonde', 'green', { eyeShape: 'sharp' }),
    kaiser: A('porcelain', 'swept', 'blonde', 'blue', { hairTip: 'blue', face: 'sharp', eyeShape: 'sharp', brow: 'thin', hairLen: 1 }),
    ness: A('porcelain', 'curtain', 'purple', 'violet', { face: 'round' }),
    lorenzo: A('tan', 'wild', 'black', 'gold', { accessory: 'earring', eyeShape: 'sharp' }),
    chevalier: A('porcelain', 'bob', 'platinum', 'violet', { hairTip: 'pink' }),
    agi: A('brown', 'buzz', 'black', 'brown', { face: 'square', brow: 'thick' })
  };

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function pickBy(h, arr, salt) { return arr[(hash(h + ':' + salt)) % arr.length]; }

  function procedural(id) {
    const O = EW.sprites.OPTIONS, key = String(id);
    const commonHair = ['black', 'black', 'black', 'navy', 'brown', 'brown', 'chestnut', 'blonde', 'ash', 'red', 'teal', 'silver', 'orange'];
    const skin = pickBy(key, ['fair', 'light', 'light', 'light', 'warm', 'tan', 'olive', 'brown'], 's');
    return { v: 1, skin, hairStyle: pickBy(key, O.hairStyle, 'h'), hairColor: pickBy(key, commonHair, 'c'), hairTip: hash(key + 't') % 9 === 0 ? pickBy(key, ['blonde', 'red', 'blue', 'white'], 'tt') : 'none',
      hairLen: hash(key + 'l') % 3, eyeColor: pickBy(key, ['brown', 'brown', 'hazel', 'grey', 'blue', 'green', 'amber'], 'e'), eyeShape: pickBy(key, O.eyeShape, 'es'), brow: pickBy(key, O.brow, 'b'),
      face: pickBy(key, O.face, 'f'), facialHair: hash(key + 'fh') % 7 === 0 ? 'stubble' : 'none', mark: hash(key + 'm') % 6 === 0 ? pickBy(key, ['scar', 'mole', 'bandage', 'freckles'], 'mm') : 'none',
      accessory: hash(key + 'a') % 8 === 0 ? pickBy(key, ['headband', 'glasses', 'earring', 'wristband'], 'aa') : 'none', accent: pickBy(key, O.accent, 'ac') };
  }

  function forPlayer(p) {
    if (!p) return procedural('unknown');
    if (p.isMe) return null; // the protagonist uses run.appearance
    return NAMED[p.id] || procedural(p.id);
  }

  function defaultAppearance() { return A('light', 'messy', 'black', 'brown', { number: 11 }); }
  function randomAppearance(rng) {
    const O = EW.sprites.OPTIONS, r = arr => arr[Math.floor(rng.next() * arr.length)];
    return { v: 1, skin: r(O.skin), hairStyle: r(O.hairStyle), hairColor: r(O.hairColor), hairTip: rng.next() < 0.18 ? r(O.hairColor) : 'none', hairLen: Math.floor(rng.next() * 3),
      eyeColor: r(O.eyeColor), eyeShape: r(O.eyeShape), brow: r(O.brow), face: r(O.face), facialHair: rng.next() < 0.12 ? r(['stubble', 'goatee']) : 'none',
      mark: rng.next() < 0.2 ? r(['scar', 'bandage', 'mole', 'paint', 'freckles']) : 'none', accessory: rng.next() < 0.2 ? r(['headband', 'glasses', 'earring', 'hairclip', 'wristband']) : 'none',
      accent: r(O.accent), number: 1 + Math.floor(rng.next() * 99) };
  }
  function normalize(a) {
    const O = EW.sprites.OPTIONS, d = defaultAppearance(), out = Object.assign({}, d, a || {});
    for (const k of ['skin', 'hairStyle', 'hairColor', 'eyeColor', 'eyeShape', 'brow', 'face', 'facialHair', 'mark', 'accessory']) if (!O[k].includes(out[k])) out[k] = d[k];
    if (!O.hairTip.includes(out.hairTip)) out.hairTip = 'none';
    out.hairLen = Math.max(0, Math.min(2, Number(out.hairLen) || 0));
    out.number = Math.max(1, Math.min(99, Math.round(Number(out.number) || 11)));
    if (typeof out.accent !== 'string' || !/^#[0-9a-f]{6}$/i.test(out.accent)) out.accent = d.accent;
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
