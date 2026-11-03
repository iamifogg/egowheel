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

  const VERSION = 9;
  // Preview builds use their own namespace so they can never overwrite live data on a shared origin.
  const PREVIEW = EW.channel === 'preview';
  const NS = PREVIEW ? 'egowheel.preview.' : 'egowheel.';
  const KEY = NS + 'save.v' + VERSION;
  const OWN_LEGACY_RE = new RegExp('^' + NS.replace(/\./g, '\\.') + 'save\\.v(\\d+)$'); // this channel's older saves
  const PREV_KEY = KEY + '.prev';
  const LEGACY_KEY_RE = /^egowheel\.save\.v(\d+)$/; // live saves: only ever READ by a preview build
  const BACKUP_PREFIX = NS + 'backup.';

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  /** Older saves: this channel's own previous versions first (writable channel data), then live keys (read-only in preview). */
  function legacyKeys(storage) {
    const own = [], live = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (!k) continue;
      const mo = k.match(OWN_LEGACY_RE);
      if (mo && Number(mo[1]) < VERSION) { own.push({ key: k, v: Number(mo[1]), own: true }); continue; }
      const ml = k.match(LEGACY_KEY_RE);
      if (ml && Number(ml[1]) < VERSION && (PREVIEW || NS === 'egowheel.')) live.push({ key: k, v: Number(ml[1]), own: !PREVIEW });
    }
    const by = (a, b) => b.v - a.v;
    return own.sort(by).concat(live.filter(x => !own.some(o => o.key === x.key)).sort(by));
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
    if (r.appearance !== undefined && r.appearance !== null && !isObj(r.appearance)) r.appearance = null;
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
    // v9: narrative pressure engine
    if (!isObj(c.narrative)) c.narrative = {};
    const n = c.narrative;
    if (!Array.isArray(n.arcs)) n.arcs = [];
    if (!Array.isArray(n.history)) n.history = [];
    if (!isObj(n.pressure)) n.pressure = {};
    for (const k of ['competitive', 'identity', 'relationship', 'selection', 'public', 'stress']) if (typeof n.pressure[k] !== 'number') n.pressure[k] = 0;
    if (!isObj(n.flags)) n.flags = {};
    if (typeof n.nextId !== 'number') n.nextId = 1;
    if (!isObj(c.relations)) c.relations = {};
    Object.values(c.relations).forEach(r => {
      if (!isObj(r)) return;
      if (!isObj(r.enc)) r.enc = {};
      for (const k of ['with', 'against', 'wins', 'losses', 'duels', 'duelWins', 'assistsTo', 'assistsFrom', 'goalsVs', 'linked', 'overtakes', 'counters']) if (typeof r.enc[k] !== 'number') r.enc[k] = 0;
      if (!Array.isArray(r.moments)) r.moments = [];
      if (!isObj(r.partnership)) r.partnership = { stage: 0, xp: 0, technique: null, tension: 0 };
    });
    // v9: professional life (null until the first contract)
    if (c.pro !== undefined && c.pro !== null && !isObj(c.pro)) c.pro = null;
    if (isObj(c.pro)) normalizePro(c.pro);
    if (typeof c.bid !== 'number') c.bid = 0;
    if (!isObj(c.flags)) c.flags = {};
    return c;
  }

  function normalizePro(p) {
    if (!isObj(p.finances)) p.finances = {};
    const f = p.finances;
    if (typeof f.cash !== 'number') f.cash = 0;
    if (!Array.isArray(f.ledger)) f.ledger = [];
    if (!isObj(f.paid)) f.paid = {};
    if (!isObj(p.lifestyle)) p.lifestyle = {};
    if (!Array.isArray(p.lifestyle.owned)) p.lifestyle.owned = [];
    if (!isObj(p.reputation)) p.reputation = { football: 40, media: 30, conduct: 60 };
    if (!Array.isArray(p.history)) p.history = [];
    if (!Array.isArray(p.sponsors)) p.sponsors = [];
    if (!Array.isArray(p.offers)) p.offers = [];
    return p;
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
    for (const { key, v, own } of legacyKeys(storage)) {
      const raw = storage.getItem(key);
      const parsed = tryParse(raw);
      if (!isObj(parsed)) { backup(storage, 'corrupt.v' + v + '.' + Date.now(), raw); continue; }
      if (own) backup(storage, 'v' + v, raw); // original kept untouched under its own key AND a backup key
      notes.push(own ? 'Upgraded your v' + v + ' save to v' + VERSION + ' (original kept as backup).' : 'Preview: copied your existing v' + v + ' career into the preview. Your live save was only read, never changed.');
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
