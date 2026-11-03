/* EgoWheel — save schema, migration, backups and JSON export/import.
 *
 * Rules:
 *  - Never silently start a new career because a field is missing: normalise instead.
 *  - Before migrating an old save, copy its raw string to a backup key.
 *  - Corrupt data is preserved under a backup key before falling back.
 *  - A rolling "previous" copy protects against interrupted/bad writes.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};

  const VERSION = 8;
  // Preview builds use their own namespace so they can never overwrite live data on a shared origin.
  const PREVIEW = EW.channel === 'preview';
  const NS = PREVIEW ? 'egowheel.preview.' : 'egowheel.';
  const KEY = NS + 'save.v8';
  const PREV_KEY = KEY + '.prev';
  const LEGACY_KEY_RE = /^egowheel\.save\.v(\d+)$/; // live saves: only ever READ by a preview build
  const BACKUP_PREFIX = NS + 'backup.';

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  function legacyKeys(storage) {
    const out = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      const m = k && k.match(LEGACY_KEY_RE);
      if (m && Number(m[1]) < VERSION) out.push({ key: k, v: Number(m[1]) });
    }
    return out.sort((a, b) => b.v - a.v);
  }

  function backup(storage, label, raw) {
    try {
      const key = BACKUP_PREFIX + label;
      if (storage.getItem(key) === null) storage.setItem(key, raw);
      return key;
    } catch (_) { return null; }
  }

  /**
   * Normalise a state object of any known version into the v8 shape.
   * `defaults` = { state(): fresh state, run(): fresh run } supplied by the app.
   */
  function normalize(raw, defaults) {
    const fresh = defaults.state();
    const st = isObj(raw) ? raw : {};
    const out = Object.assign({}, fresh, st);
    out.version = VERSION;
    out.archive = Array.isArray(st.archive) ? st.archive.filter(isObj).map(normalizeArchiveEntry) : [];
    out.ui = Object.assign({}, fresh.ui, isObj(st.ui) ? st.ui : {});
    out.run = normalizeRun(isObj(st.run) ? st.run : null, defaults);
    out.meta = Object.assign({ createdVersion: st.version || VERSION, migratedFrom: st.version && st.version !== VERSION ? st.version : (st.meta && st.meta.migratedFrom) || null }, isObj(st.meta) ? st.meta : {});
    return out;
  }

  function normalizeRun(run, defaults) {
    const fresh = defaults.run();
    if (!run) return fresh;
    const r = Object.assign({}, fresh, run);
    for (const k of ['selections', 'baseStats', 'development', 'lastChanges']) if (!isObj(r[k])) r[k] = fresh[k];
    for (const k of Object.keys(fresh.baseStats)) if (typeof r.baseStats[k] !== 'number') r.baseStats[k] = fresh.baseStats[k];
    for (const k of Object.keys(fresh.development)) if (typeof r.development[k] !== 'number') r.development[k] = 0;
    if (!Array.isArray(r.learnedWeapons)) r.learnedWeapons = [];
    if (!Array.isArray(r.injuryLog)) r.injuryLog = [];
    for (const [k, lo, hi, d] of [['confidence', 0, 100, 52], ['form', -3, 3, 0], ['fitness', 0, 100, 100]]) {
      const v = Number(r[k]);
      r[k] = Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d;
    }
    if (EW.injuries) r.injury = EW.injuries.normalize(r.injury);
    if (r.career && !isObj(r.career)) r.career = null;
    if (r.career) normalizeCareer(r.career);
    if (typeof r.mode !== 'string') r.mode = r.career ? 'career' : 'build';
    return r;
  }

  function normalizeCareer(c) {
    if (!Array.isArray(c.fixtures)) c.fixtures = [];
    if (!Array.isArray(c.history)) c.history = [];
    if (!Array.isArray(c.log)) c.log = [];
    if (!Array.isArray(c.bidHistory)) c.bidHistory = [];
    if (!Array.isArray(c.trophies)) c.trophies = [];
    if (!Array.isArray(c.recentRatings)) c.recentRatings = [];
    if (!Array.isArray(c.milestones)) c.milestones = [];
    if (!isObj(c.totals)) c.totals = {};
    for (const k of ['apps', 'goals', 'assists', 'shots', 'keyPasses', 'dribbles', 'tackles', 'interceptions', 'blocks', 'clearances', 'recoveries', 'aerialDuels', 'yellowCards', 'redCards', 'setPieceGoals', 'ratingTotal', 'nelApps', 'nelGoals', 'nelAssists', 'nelDefActions', 'nelRatingTotal'])
      if (typeof c.totals[k] !== 'number') c.totals[k] = 0;
    if (typeof c.fixtureIndex !== 'number') c.fixtureIndex = 0;
    if (typeof c.fxNo !== 'number') c.fxNo = c.history.length;
    if (typeof c.firstSelectionPoints !== 'number') c.firstSelectionPoints = 0;
    if (typeof c.bid !== 'number') c.bid = 0;
    if (!isObj(c.flags)) c.flags = {};
    return c;
  }

  function normalizeArchiveEntry(e) {
    const out = Object.assign({}, e);
    out.name = out.name || 'Unnamed Egoist';
    for (const k of ['overall', 'bid', 'goals', 'assists', 'apps', 'defActions']) if (typeof out[k] !== 'number') out[k] = out[k] == null ? null : Number(out[k]) || 0;
    out.status = out.status || 'Archived';
    return out;
  }

  /**
   * Load: returns { state, notes[] } and never throws.
   */
  function load(storage, defaults) {
    const notes = [];
    const tryParse = (raw) => { try { return JSON.parse(raw); } catch (_) { return undefined; } };
    const raw8 = storage.getItem(KEY);
    if (raw8 !== null) {
      const parsed = tryParse(raw8);
      if (isObj(parsed)) return { state: normalize(parsed, defaults), notes };
      backup(storage, 'corrupt.' + Date.now(), raw8);
      notes.push('Current save was unreadable; a copy was kept as a backup.');
      const prev = tryParse(storage.getItem(PREV_KEY));
      if (isObj(prev)) { notes.push('Restored the previous good save.'); return { state: normalize(prev, defaults), notes }; }
    }
    for (const { key, v } of legacyKeys(storage)) {
      const raw = storage.getItem(key);
      const parsed = tryParse(raw);
      if (!isObj(parsed)) { backup(storage, 'corrupt.v' + v + '.' + Date.now(), raw); continue; }
      if (!PREVIEW) backup(storage, 'v' + v, raw);
      notes.push(PREVIEW ? 'Preview: copied your existing v' + v + ' career into the preview. Your live save was only read, never changed.' : 'Migrated your v' + v + ' save to v' + VERSION + ' (original kept as backup).');
      return { state: normalize(parsed, defaults), notes, migratedFrom: v };
    }
    return { state: defaults.state(), notes };
  }

  let writes = 0;
  function save(storage, state) {
    const raw = JSON.stringify(state);
    if (writes++ % 8 === 0) {
      const cur = storage.getItem(KEY);
      if (cur !== null) { try { JSON.parse(cur); storage.setItem(PREV_KEY, cur); } catch (_) {} }
    }
    storage.setItem(KEY, raw);
    return raw.length;
  }

  function exportJSON(state) {
    return JSON.stringify({ format: 'egowheel-backup', version: VERSION, exportedAt: new Date().toISOString(), state }, null, 1);
  }
  function importJSON(text, defaults) {
    const parsed = JSON.parse(text);
    const st = parsed && parsed.format === 'egowheel-backup' ? parsed.state : parsed;
    if (!isObj(st) || (!st.run && !st.archive)) throw new Error('This file is not an EgoWheel backup.');
    return normalize(st, defaults);
  }

  EW.save = { VERSION, NS, PREVIEW, KEY, PREV_KEY, BACKUP_PREFIX, load, save, normalize, exportJSON, importJSON, legacyKeys };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.save;
})(typeof globalThis !== 'undefined' ? globalThis : this);
