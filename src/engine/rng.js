/* EgoWheel — injectable, optionally seeded random-number generator.
 * Classic script (no build step, works over file://). Registers on globalThis.EW.
 * Ordinary play uses a time-derived seed so runs feel naturally random; tests and
 * bug reports can pin a seed for exact reproduction. */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};

  function hashSeed(input) {
    const s = String(input);
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  // mulberry32: tiny, fast, statistically fine for a game.
  function createRng(seed) {
    let a = (typeof seed === 'number' ? seed : hashSeed(seed)) >>> 0;
    const rng = {
      seed: seed,
      next() {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      getState() { return a; },
      setState(v) { a = v >>> 0; },
      range(lo, hi) { return rng.next() * (hi - lo) + lo; },
      int(lo, hi) { return Math.floor(rng.range(lo, hi + 1)); },
      pick(arr) { return arr[Math.floor(rng.next() * arr.length)]; },
      chance(p) { return rng.next() < p; },
      normal(mean = 0, sd = 1) {
        let u = 0, v = 0;
        while (u === 0) u = rng.next();
        while (v === 0) v = rng.next();
        return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      },
      weighted(items, weightOf) {
        let total = 0;
        for (const it of items) total += Math.max(0, weightOf(it));
        let roll = rng.next() * total;
        for (const it of items) { roll -= Math.max(0, weightOf(it)); if (roll <= 0) return it; }
        return items[items.length - 1];
      },
      shuffle(arr) {
        const a2 = arr.slice();
        for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; }
        return a2;
      }
    };
    return rng;
  }

  // The live generator used by the game. Replaceable for tests/debug seeds.
  let urlSeed = null;
  try { const m = root.location && /[?&]seed=([^&#]+)/.exec(root.location.search || ''); if (m) urlSeed = decodeURIComponent(m[1]); } catch (_) {}
  let live = createRng(urlSeed !== null ? urlSeed : (Date.now() ^ Math.floor(Math.random() * 1e9)));
  EW.rng = {
    createRng, hashSeed,
    get current() { return live; },
    urlSeed,
    use(seedOrRng) { live = (seedOrRng && typeof seedOrRng.next === 'function') ? seedOrRng : createRng(seedOrRng); return live; },
    next: () => live.next()
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.rng;
})(typeof globalThis !== 'undefined' ? globalThis : this);
