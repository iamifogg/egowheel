/* EgoWheel — narrative pressure.
 * Six separate dimensions (0–100), each fed by specific gameplay facts and each changing different
 * odds. Pressure decays every fixture; it creates opportunities and risks, never automatic rewards.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const DIMS = {
    competitive:  { label: 'Competitive', desc: 'A rival is outperforming you.' },
    identity:     { label: 'Identity', desc: 'Your weapon is being solved; who are you without it?' },
    relationship: { label: 'Relationship', desc: 'Tension with a teammate or partner.' },
    selection:    { label: 'Selection', desc: 'Your place or survival is at risk.' },
    public:       { label: 'Expectation', desc: 'Everyone expects more than you are giving.' },
    stress:       { label: 'Stress', desc: 'Off-pitch load and fatigue.' }
  };
  const THRIVE = ['Pressure Junkie', 'Limit Breaker', 'Apex Mentality', 'Pressure Sovereign', 'Singularity', 'Challenger', 'Revenge Engine', 'Transcendent Ego'];
  const CRACK = ['Perfectionist', 'Rationalist', 'Disciple'];

  function blank() { return { competitive: 0, identity: 0, relationship: 0, selection: 0, public: 0, stress: 0 }; }

  /** Apply one fixture's facts. Returns the deltas (for history/UI). */
  function update(p, f) {
    const before = Object.assign({}, p);
    for (const k of Object.keys(DIMS)) p[k] = p[k] * (k === 'stress' ? 0.8 : 0.82);
    const add = (k, v) => { p[k] = clamp(p[k] + v, 0, 100); };
    if (f.lossStreak >= 2) add('competitive', 6 * (f.lossStreak - 1));
    if (f.rivalOutshone) add('competitive', 14);
    if (f.lostDuel) add('competitive', 10);
    if (f.overtakenByRival) add('competitive', 10);
    if (f.countered) add('identity', 16);
    if (f.weaponFailed) add('identity', 7);
    if (f.bigMisses >= 2) add('identity', 6);
    if (f.rating != null && f.rating < 6) add('identity', 5);
    if (f.partnerTension) add('relationship', 12 + f.partnerTension * 4);
    if (f.hostileTeammates) add('relationship', 6 * f.hostileTeammates);
    if (f.atRisk) add('selection', 18);
    if (f.rankDrop >= 5) add('selection', Math.min(14, f.rankDrop));
    if (f.benched) add('selection', 15);
    if (f.expectation) add('public', f.expectation);
    if (f.mediaHeat) add('public', f.mediaHeat);
    if (f.stressLoad) add('stress', f.stressLoad);
    if (f.rating != null && f.rating >= 7.8) { p.competitive *= 0.8; p.identity *= 0.8; p.selection *= 0.85; p.public *= 0.85; }
    if (f.relief) for (const k of Object.keys(DIMS)) p[k] *= 1 - f.relief;
    const delta = {};
    for (const k of Object.keys(DIMS)) { p[k] = Math.round(p[k] * 10) / 10; delta[k] = Math.round((p[k] - before[k]) * 10) / 10; }
    return delta;
  }

  /**
   * Gameplay modifiers. thrives: ego style handles pressure well (positive variance),
   * cracks: struggles. Returns multipliers keyed by outcome tags, plus flow/adapt/injury factors.
   */
  function modifiers(p, egoStyle) {
    const thrive = THRIVE.includes(egoStyle), crack = CRACK.includes(egoStyle);
    const comp = p.competitive / 100, ident = p.identity / 100, rel = p.relationship / 100, sel = p.selection / 100, pub = p.public / 100;
    const negMult = 1 + (sel * 0.25 + pub * 0.2 + comp * 0.1) * (thrive ? -0.6 : crack ? 1.4 : 1);
    const starMult = 1 + (sel * 0.2 + comp * 0.18) * (thrive ? 1.5 : crack ? 0.4 : 1);
    return {
      neg: clamp(negMult, 0.8, 1.45), star: clamp(starMult, 0.9, 1.4),
      weapon: clamp(1 - ident * 0.3, 0.7, 1),          // a weapon in crisis works less often...
      adapt: ident * 18 + comp * 6,                      // ...but adapting becomes more likely to click
      combo: clamp(1 - rel * 0.5, 0.5, 1), card: 1 + comp * 0.35 + rel * 0.2,
      flow: clamp(1 + (comp + sel) * (thrive ? 0.6 : 0.15) - ident * 0.3 - pub * 0.2, 0.6, 1.8),
      injury: 1 + p.stress / 220, recovery: 1 - p.stress / 300
    };
  }

  function top(p, n = 2) {
    return Object.keys(DIMS).map(k => ({ key: k, value: p[k], label: DIMS[k].label, desc: DIMS[k].desc })).filter(x => x.value >= 15).sort((a, b) => b.value - a.value).slice(0, n);
  }

  EW.pressure = { DIMS, THRIVE, CRACK, blank, update, modifiers, top };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.pressure;
})(typeof globalThis !== 'undefined' ? globalThis : this);
