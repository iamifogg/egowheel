/* EgoWheel — persistent narrative threads ("arcs").
 * An arc stores facts, not prose: type, actors, stage, pressure, causes, flags, history.
 * Templates (src/data/arc-templates.js) decide how arcs start, develop, fizzle and what they offer.
 * Stages are flexible: incited → developing → escalating → critical → resolved | failed | fizzled.
 * Reaching "critical" creates an OPPORTUNITY (a scene or an in-match critical moment), never a win.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const STAGES = ['incited', 'developing', 'escalating', 'critical'];
  const MAX_MAJOR = 3, MAX_TOTAL = 5;

  function templates() { return (EW.data && EW.data.ARC_TEMPLATES) || []; }
  function tpl(type) { return templates().find(t => t.type === type); }
  function active(n) { return n.arcs.filter(a => !a.resolution); }
  function stageName(a) { return STAGES[Math.min(a.stage, STAGES.length - 1)]; }

  function start(n, t, cand, fx) {
    const arc = { id: 'arc_' + t.type + '_' + (n.nextId++), type: t.type, major: !!t.major, actors: cand.actors || [], stage: 0, state: 'incited',
      pressure: clamp(cand.pressure ?? 25, 0, 100), startedFx: fx, lastFx: fx, causes: cand.causes || [], flags: Object.assign({}, cand.flags), history: [], shown: {}, resolution: null };
    arc.history.push({ fx, stage: 'incited', event: (cand.causes || []).join(', ') || 'started' });
    n.arcs.push(arc);
    return arc;
  }

  /**
   * After every fixture: develop existing arcs, then look for new ones.
   * Returns { started:[], advanced:[], ended:[] } for UI/drama lines.
   */
  function tick(n, ctx, rng) {
    const out = { started: [], advanced: [], ended: [] }, fx = ctx.fxNo;
    for (const arc of active(n)) {
      const t = tpl(arc.type); if (!t) continue;
      // Participants must still exist in a state where the story can continue.
      const gone = arc.actors.filter(id => id !== 'me' && (!ctx.players[id] || (t.needsActive !== false && ctx.players[id].status === 'eliminated')));
      if (gone.length && !t.survivesElimination) { end(n, arc, 'fizzled', fx, 'A participant left the story'); out.ended.push(arc); continue; }
      const r = t.pulse ? t.pulse(ctx, arc) || {} : {};
      if (r.pressure) arc.pressure = clamp(arc.pressure + r.pressure, 0, 100);
      if (r.flags) Object.assign(arc.flags, r.flags);
      if (r.note) arc.history.push({ fx, stage: stageName(arc), event: r.note });
      if (r.resolve) { end(n, arc, r.resolve, fx, r.note || r.resolve); out.ended.push(arc); continue; }
      const idle = fx - arc.lastFx;
      if (r.fizzle || idle > (t.maxIdle || 8)) { end(n, arc, 'fizzled', fx, r.fizzle ? (r.note || 'The tension faded') : 'Nothing happened for a long time'); out.ended.push(arc); continue; }
      if (r.touched) arc.lastFx = fx;
      if (r.advance && arc.stage < STAGES.length - 1) { arc.stage++; arc.state = stageName(arc); arc.lastFx = fx; arc.history.push({ fx, stage: arc.state, event: r.note || 'escalated' }); out.advanced.push(arc); }
      arc.history = arc.history.slice(-16);
    }
    const act = active(n);
    for (const t of templates()) {
      if (act.length + out.started.length >= MAX_TOTAL) break;
      if (t.major && act.filter(a => a.major).length + out.started.filter(a => a.major).length >= MAX_MAJOR) continue;
      if (t.stageFilter && !t.stageFilter(ctx)) continue;
      const cool = n.flags['cool_' + t.type];
      if (cool !== undefined && fx < cool) continue;
      let cands = [];
      try { cands = t.detect(ctx) || []; } catch (_) { cands = []; }
      for (const cand of cands) {
        const key = t.type + ':' + (cand.actors || []).join(',');
        if (act.some(a => a.type + ':' + a.actors.join(',') === key) || out.started.some(a => a.type + ':' + a.actors.join(',') === key)) continue;
        if (n.history.some(h => h.key === key && fx - h.fx < (t.restartGap || 10))) continue;
        if (rng.next() > (t.startChance ?? 0.6)) continue;
        out.started.push(start(n, t, cand, fx));
        break;
      }
    }
    return out;
  }

  function end(n, arc, resolution, fx, note) {
    arc.resolution = resolution; arc.state = resolution; arc.lastFx = fx;
    arc.history.push({ fx, stage: resolution, event: note || resolution });
    n.history.push({ key: arc.type + ':' + arc.actors.join(','), id: arc.id, type: arc.type, actors: arc.actors, resolution, fx, flags: arc.flags });
    n.history = n.history.slice(-60);
    const t = tpl(arc.type);
    if (t && t.cooldown) n.flags['cool_' + arc.type] = fx + t.cooldown;
    // Keep resolved arcs briefly for the aftermath, then prune.
    n.arcs = n.arcs.filter(a => !a.resolution || fx - a.lastFx < 6 || a === arc);
  }

  /** Apply a scene/critical outcome to an arc. op: {id, advance, resolve, pressure, flags, spawn} */
  function apply(n, op, ctx, fx) {
    const arc = n.arcs.find(a => a.id === op.id); if (!arc || arc.resolution) return null;
    if (op.pressure) arc.pressure = clamp(arc.pressure + op.pressure, 0, 100);
    if (op.flags) Object.assign(arc.flags, op.flags);
    arc.lastFx = fx;
    if (op.note) arc.history.push({ fx, stage: stageName(arc), event: op.note });
    if (op.advance && arc.stage < STAGES.length - 1) { arc.stage++; arc.state = stageName(arc); arc.history.push({ fx, stage: arc.state, event: op.note || 'escalated' }); }
    if (op.regress && arc.stage > 0) { arc.stage--; arc.state = stageName(arc); }
    if (op.resolve) end(n, arc, op.resolve, fx, op.note);
    return arc;
  }

  /** The scene an arc wants to show for this fixture (once per stage), most urgent first. */
  function pendingScene(n, ctx) {
    const list = active(n).map(arc => ({ arc, t: tpl(arc.type) })).filter(x => x.t && x.t.scene)
      .filter(x => !x.arc.shown[x.arc.stage] && ctx.fxNo - (x.arc.lastSceneFx ?? -9) >= (x.t.sceneGap || 3))
      .sort((a, b) => (b.arc.stage - a.arc.stage) || (b.arc.pressure - a.arc.pressure));
    for (const { arc, t } of list) {
      let sc = null;
      try { sc = t.scene(ctx, arc); } catch (_) { sc = null; }
      if (sc) return { arc, scene: sc };
    }
    return null;
  }
  function markShown(arc, fx) { arc.shown[arc.stage] = fx; arc.lastSceneFx = fx; }

  /** In-match critical moment offered by a critical-stage arc relevant to this fixture. */
  function criticalFor(n, ctx) {
    for (const arc of active(n).filter(a => a.stage >= 3).sort((a, b) => b.pressure - a.pressure)) {
      const t = tpl(arc.type);
      if (!t || !t.critical) continue;
      if (arc.flags.criticalUsedFx === ctx.fxNo) continue;
      const c = t.critical(ctx, arc);
      if (c) return { arc, spec: c };
    }
    return null;
  }

  /** Aggregate gameplay modifiers from all active arcs. */
  function modifiers(n, ctx) {
    const m = { duel: {}, combo: 1, weapon: 1, star: 1, card: 1, adapt: 0, mate: 1, perf: 0 };
    for (const arc of active(n)) {
      const t = tpl(arc.type); if (!t || !t.modifiers) continue;
      const x = t.modifiers(ctx, arc) || {};
      if (x.duel) for (const [id, v] of Object.entries(x.duel)) m.duel[id] = (m.duel[id] || 0) + v;
      for (const k of ['combo', 'weapon', 'star', 'card', 'mate']) if (x[k]) m[k] *= x[k];
      if (x.adapt) m.adapt += x.adapt;
      if (x.perf) m.perf += x.perf;
    }
    return m;
  }

  function describe(arc) {
    const t = tpl(arc.type);
    return { label: t ? t.label : arc.type, stage: arc.resolution || stageName(arc), pressure: Math.round(arc.pressure) };
  }

  EW.arcs = { STAGES, MAX_MAJOR, tick, apply, start, end, pendingScene, markShown, criticalFor, modifiers, describe, active, tpl, stageName };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.arcs;
})(typeof globalThis !== 'undefined' ? globalThis : this);
