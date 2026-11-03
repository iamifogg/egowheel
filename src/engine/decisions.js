/* EgoWheel — shared decision & probability model.
 *
 * Every consequential choice resolves through ONE outcome distribution
 *   { success, mixed, failure }   (sums to exactly 1)
 * and the wheel segments, labels and resolution all use those exact numbers.
 * If an option says "35% Success", the Success segment is exactly 35% of the wheel.
 *
 * Risk tiers make low-probability options worth considering:
 *   conservative — high success, modest reward, gentle failure
 *   ambitious    — moderate success, meaningful reward and setback
 *   extreme      — low success, transformative reward, severe failure
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const round4 = n => Math.round(n * 10000) / 10000;

  const TIERS = {
    conservative: { label: 'Conservative', color: '#46e08a', mixedShare: 0.45, min: 0.45, max: 0.95, severity: 'minor' },
    ambitious:    { label: 'Ambitious',    color: '#ffd166', mixedShare: 0.40, min: 0.18, max: 0.75, severity: 'moderate' },
    extreme:      { label: 'Extreme',      color: '#ff5d73', mixedShare: 0.25, min: 0.04, max: 0.35, severity: 'severe' }
  };

  /**
   * Build an exact outcome distribution.
   * success: probability of the full Success outcome (already includes all modifiers).
   * mixedShare: fraction of the non-success remainder that becomes Mixed (0 = no partial outcome).
   */
  function distribution(success, mixedShare) {
    const s = clamp(success, 0.01, 0.99);
    const m = clamp((1 - s) * clamp(mixedShare ?? 0.4, 0, 1), 0, 1 - s);
    const s4 = round4(s), m4 = round4(m);
    return { success: s4, mixed: m4, failure: round4(1 - s4 - m4) };
  }

  /** Probability for a choice from base odds, attribute/context modifiers and its tier limits. */
  function chance(base, modifiers, tierKey) {
    const t = TIERS[tierKey] || TIERS.ambitious;
    const total = (modifiers || []).reduce((sum, m) => sum + (m.value || 0), base);
    return clamp(total, t.min, t.max);
  }

  /** Normalise any director/arc choice into one with an exact `dist`. Legacy `odds` = success probability. */
  function normalizeChoice(ch) {
    const tier = ch.risk || (ch.odds >= 0.65 ? 'conservative' : ch.odds >= 0.3 ? 'ambitious' : 'extreme');
    const t = TIERS[tier] || TIERS.ambitious;
    const success = ch.dist ? ch.dist.success : clamp(ch.odds ?? 0.5, 0.03, 0.97);
    const mixedShare = ch.mixedShare ?? (ch.mixed ? t.mixedShare : 0);
    const dist = ch.dist || distribution(success, mixedShare);
    return Object.assign({}, ch, { risk: tier, dist, odds: dist.success, severity: ch.severity || t.severity });
  }

  /** Wheel options (weights == probabilities) for a resolved choice. */
  function wheelOptions(ch, weighted) {
    const d = ch.dist;
    const opts = [weighted('Success', ch.success?.text || 'It works.', d.success, {}, 'SUCCESS', { tier: 'success' })];
    if (d.mixed > 0) opts.push(weighted('Mixed', ch.mixed?.text || 'Partly.', d.mixed, {}, 'MIXED', { tier: 'mixed' }));
    opts.push(weighted(ch.risk === 'extreme' ? 'Collapse' : 'Backfire', ch.fail?.text || 'It goes wrong.', d.failure, {}, ch.risk === 'extreme' ? 'COLLAPSE' : 'BACKFIRE', { tier: 'fail' }));
    return opts;
  }

  /** Resolve with an rng using the exact distribution (used by tests and auto-resolution). */
  function roll(dist, rng) {
    const r = rng.next();
    if (r < dist.success) return 'success';
    if (r < dist.success + dist.mixed) return 'mixed';
    return 'fail';
  }

  /** Short, honest label for UI. */
  function label(ch) {
    const d = ch.dist, pct = x => (x * 100 < 1 ? (x * 100).toFixed(1) : Math.round(x * 100)) + '%';
    return pct(d.success) + ' success' + (d.mixed > 0 ? ' · ' + pct(d.mixed) + ' partial' : '') + ' · ' + pct(d.failure) + ' ' + (ch.risk === 'extreme' ? 'collapse' : 'failure');
  }

  /** Rough "value" of a choice for balance tests (reward magnitude × probability minus failure cost). */
  function expectedValue(ch, valueOf) {
    const d = ch.dist;
    return d.success * valueOf(ch.success) + d.mixed * valueOf(ch.mixed) + d.failure * valueOf(ch.fail);
  }

  EW.decisions = { TIERS, distribution, chance, normalizeChoice, wheelOptions, roll, label, expectedValue };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.decisions;
})(typeof globalThis !== 'undefined' ? globalThis : this);
