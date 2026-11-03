/* EgoWheel — consolidated injury & fitness model.
 *
 * One injury state, one lifecycle, one place that decides probabilities.
 *  - A fixture has ONE injury opportunity (calibrated per match, not per spin).
 *  - Training and between-game injuries use the same state and recurrence rules.
 *  - Severity is rolled once; severe outcomes are much rarer than knocks.
 *  - Recurrence protection stops absurd streaks of match-ending injuries.
 * Pure functions: callers pass a context and an rng; nothing touches the DOM.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const SEVERITY = {
    knock:   { key: 'knock',   label: 'Minor Knock',            matchEnding: false, out: 0, limited: 1, penalty: 3, weight: 0 },
    offKnock:{ key: 'offKnock',label: 'Precautionary Withdrawal', matchEnding: true, out: 0, limited: 1, penalty: 4, weight: 52 },
    strain:  { key: 'strain',  label: 'Muscle Strain',          matchEnding: true,  out: 1, limited: 1, penalty: 6, weight: 33 },
    serious: { key: 'serious', label: 'Serious Injury',         matchEnding: true,  out: 2, limited: 2, penalty: 8, weight: 12 },
    severe:  { key: 'severe',  label: 'Major Ligament Damage',  matchEnding: true,  out: 4, limited: 2, penalty: 10, weight: 2.7 },
    career:  { key: 'career',  label: 'Career-Threatening Injury', matchEnding: true, out: 6, limited: 3, penalty: 12, weight: 0.3 }
  };

  const HEALTHY_MATCH_ENDING = 0.009; // ~0.9% per fixture for a fresh, healthy player
  const MAX_MATCH_ENDING = 0.075;
  const FITNESS_FLOOR = 25;

  function fatigueMultiplier(fitness) {
    const deficit = Math.max(0, 75 - fitness) / 25;
    return 1 + Math.pow(deficit, 1.4) * 1.5;
  }
  function staminaMultiplier(stamina) { return clamp(1.3 - (stamina || 60) / 200, 0.85, 1.15); }

  /** Recent match-ending injuries within `window` fixtures of `fixtureNo`. */
  function recentMatchEnding(log, fixtureNo, window) {
    return (log || []).filter(e => e.matchEnding && fixtureNo - e.fx <= window && fixtureNo - e.fx >= 0).length;
  }

  /**
   * Probability that THIS fixture produces a match-ending injury, plus the
   * separate chance of a non-match-ending knock. Both are per fixture.
   * ctx: { fitness, stamina, fixtureNo, log, carrying (injury obj|null), rushed, planLoad, importance }
   */
  function matchRisk(ctx) {
    const fitness = clamp(ctx.fitness ?? 100, 0, 100);
    let p = HEALTHY_MATCH_ENDING * fatigueMultiplier(fitness) * staminaMultiplier(ctx.stamina);
    p *= 1 + (ctx.planLoad || 0) * 0.03;
    p *= 1 + Math.max(0, (ctx.importance || 1) - 1) * 0.15; // high-intensity fixtures
    if (ctx.carrying && ctx.carrying.limited > 0) p *= ctx.rushed ? 2.0 : 1.4;
    const fx = ctx.fixtureNo || 0;
    const last2 = recentMatchEnding(ctx.log, fx - 1, 1);   // previous fixture or the one before
    const last6 = recentMatchEnding(ctx.log, fx - 1, 5);
    const reasons = [];
    if (last2) { p *= 0.5; reasons.push('managed minutes after recent injury'); }
    if (last6 >= 2) { p = Math.min(p, 0.004); reasons.push('recurrence protection'); }
    p = clamp(p, 0.002, MAX_MATCH_ENDING);
    const knock = clamp(p * 1.25, 0.004, 0.09);
    return { matchEnding: p, knock, reasons, fatigue: fatigueMultiplier(fitness) };
  }

  /** Convert a per-match probability into a per-spin wheel share over n spins. */
  function perSpinShare(pMatch, spins) {
    const n = Math.max(1, spins || 6);
    return 1 - Math.pow(1 - clamp(pMatch, 0, 0.95), 1 / n);
  }
  /** Weight for a wheel slice so that it has `share` of the final wheel, given the other weights' total. */
  function sliceWeightForShare(share, otherTotal) {
    const s = clamp(share, 0, 0.9);
    return s / (1 - s) * otherTotal;
  }

  function rollSeverity(rng, ctx = {}) {
    const keys = ['offKnock', 'strain', 'serious', 'severe', 'career'];
    const fatigue = fatigueMultiplier(ctx.fitness ?? 100);
    const last6 = recentMatchEnding(ctx.log, (ctx.fixtureNo || 0) - 1, 5);
    const pick = rng.weighted(keys, k => {
      let w = SEVERITY[k].weight;
      if (k !== 'offKnock' && k !== 'strain') w *= 0.8 + Math.min(1.2, (fatigue - 1) * 0.25); // exhaustion → worse
      if (last6 >= 1 && (k === 'severe' || k === 'career')) w *= 0.35;  // limit escalation
      if (ctx.blueLockPhase && k === 'career') w *= 0.5;
      return w;
    });
    return pick;
  }

  function makeInjury(sevKey, source, fixtureNo) {
    const s = SEVERITY[sevKey] || SEVERITY.knock;
    return { key: s.key, name: s.label, severity: s.key, out: s.out, limited: s.limited, penalty: s.penalty, source, since: fixtureNo,
      matches: s.out + s.limited }; // `matches` kept for old UI/save compatibility
  }

  /** Training-session injury weights (as wheel weights, comparable to other slices of that wheel). */
  function trainingRisk(ctx) {
    const fatigue = fatigueMultiplier(ctx.fitness ?? 100);
    const recent = recentMatchEnding(ctx.log, ctx.fixtureNo || 0, 2) + (ctx.carrying ? 1 : 0);
    const protect = recent ? 0.4 : 1;
    const risk = ctx.risk || 0;
    return {
      minor: (0.6 + risk * 9) * (0.7 + (fatigue - 1) * 0.6) * protect,
      serious: (0.15 + risk * 1.6) * (0.6 + (fatigue - 1) * 0.7) * protect
    };
  }

  /** Between-game "training injury scare" event weight (comparable to that wheel's weights). */
  function scareWeight(ctx) {
    const recent = recentMatchEnding(ctx.log, ctx.fixtureNo || 0, 2);
    if (ctx.carrying || recent) return 0.4;
    return 1.8 * (0.6 + (fatigueMultiplier(ctx.fitness ?? 100) - 1) * 0.5);
  }

  /** Fitness recovered between fixtures: faster when depleted, so fatigue cannot spiral. */
  function recoveryBetweenFixtures(fitness, stamina) {
    const deficit = Math.max(0, 80 - fitness);
    return Math.round(6 + (stamina || 60) / 22 + deficit * 0.22);
  }
  function matchFitnessLoss(stamina, importance, planLoad, minutes) {
    const raw = 7 + (importance || 1) * 2 + (planLoad || 0) * 0.35;
    const share = clamp((minutes ?? 90) / 90, 0.25, 1);
    return Math.max(2, Math.round(raw * clamp(1.18 - (stamina || 60) / 190, 0.62, 1.02) * share));
  }

  /** Advance an injury by one fixture. Returns {injury, healed}. */
  function tick(injury, mode) {
    if (!injury) return { injury: null, healed: false };
    const next = Object.assign({}, injury);
    if (next.out > 0) {
      next.out -= (mode === 'rehab' ? 1 : 1);
      if (mode === 'rehab' && next.out > 0 && next.out <= 1) next.out = 0; // rehab can shave the tail
    } else if (next.limited > 0) next.limited -= 1;
    next.matches = Math.max(0, (next.out || 0) + (next.limited || 0));
    if (next.out <= 0 && next.limited <= 0) return { injury: null, healed: true };
    return { injury: next, healed: false };
  }

  /** Normalise any historical injury object (v7 used {name,matches,penalty}). */
  function normalize(inj) {
    if (!inj) return null;
    if (inj.severity) { inj.matches = Math.max(0, (inj.out || 0) + (inj.limited || 0)); return inj; }
    const m = Math.max(0, inj.matches || 0);
    if (!m) return null;
    return { key: 'legacy', name: inj.name || 'Injury', severity: 'knock', out: 0, limited: m, penalty: inj.penalty || 5, source: 'legacy', since: 0, matches: m };
  }

  EW.injuries = { SEVERITY, HEALTHY_MATCH_ENDING, MAX_MATCH_ENDING, FITNESS_FLOOR, matchRisk, perSpinShare, sliceWeightForShare,
    rollSeverity, makeInjury, trainingRisk, scareWeight, recoveryBetweenFixtures, matchFitnessLoss, tick, normalize, recentMatchEnding, fatigueMultiplier };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.injuries;
})(typeof globalThis !== 'undefined' ? globalThis : this);
