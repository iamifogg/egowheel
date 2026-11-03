/* EgoWheel — weapon identity: families, mastery, evolutions, combinations.
 * Mastery is earned only through RELEVANT actions on the wheel. Evolutions need both mastery
 * and a pressure trigger; each tier unlocks a new wheel opportunity instead of flat stat bloat.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};

  const FAMILIES = {
    finish:  { label: 'Finishing', tags: ['finish', 'goal'], neg: ['finish'], stats: ['finishing', 'shotPower', 'reactions'],
      evo: ['Refined Timing', 'Adaptive Shooting Angles', '{w}: Zero-Window Strike'], flow: 'Predatory Strike' },
    move:    { label: 'Movement', tags: ['finish', 'goal', 'shot'], neg: [], stats: ['offBall', 'reactions', 'acceleration'],
      evo: ['Blind-Side Timing', 'Ghost Runs', '{w}: Vanishing Point'], flow: 'Untracked Arrival' },
    vision:  { label: 'Spatial Vision', tags: ['vision', 'create', 'read', 'goal'], neg: ['error'], stats: ['vision', 'offBall', 'reactions'],
      evo: ['Advanced Scanning', 'Predictive Movement', 'Metavision'], flow: 'Field Prediction' },
    dribble: { label: 'Dribbling', tags: ['dribble', 'carry'], neg: ['duel'], stats: ['dribbling', 'control', 'acceleration'],
      evo: ['Rhythm Shift', 'Reading the Defender', '{w}: Untouchable Rhythm'], flow: 'Unstoppable Run' },
    pass:    { label: 'Passing', tags: ['pass', 'create'], neg: ['error'], stats: ['passing', 'vision', 'technique'],
      evo: ['Weighted Delivery', 'Line Manipulation', '{w}: Puppet Field'], flow: 'Conductor’s Pass' },
    speed:   { label: 'Speed', tags: ['carry', 'dribble', 'shot'], neg: [], stats: ['acceleration', 'speed', 'offBall'],
      evo: ['Explosive First Step', 'Space Devourer', '{w}: Zero-to-Top'], flow: 'Red-Line Burst' },
    control: { label: 'Control', tags: ['control', 'carry', 'shot'], neg: ['error'], stats: ['control', 'technique', 'reactions'],
      evo: ['Dead-Ball Touch', 'Orientation Touch', '{w}: Absolute Trap'], flow: 'Impossible Trap' },
    defend:  { label: 'Defending', tags: ['def', 'read', 'duel', 'block'], neg: ['duel', 'error'], stats: ['defense', 'reactions', 'vision'],
      evo: ['Predictive Interception', 'Defensive Field Control', '{w}: Total Erasure'], flow: 'Erase the Attack' },
    aerial:  { label: 'Aerial', tags: ['aerial'], neg: [], stats: ['physical', 'reactions', 'defense'],
      evo: ['Timed Leap', 'Aerial Dominance', '{w}: Sky Throne'], flow: 'Owning the Sky' },
    adapt:   { label: 'Adaptation', tags: ['star', 'create', 'goal', 'def'], neg: [], stats: ['technique', 'vision', 'ego'],
      evo: ['Fragment Copying', 'Live Adaptation', '{w}: Mirror Ego'], flow: 'Copy and Surpass' }
  };

  const NAME_RULES = [
    [/meta|spatial|scan|vision|third-man|half-space/i, 'vision'],
    [/lane|duel|intercept|press|tackl|marking|erase|block|counter-press|second-ball|reading|libero|destroyer instinct/i, 'defend'],
    [/leap|aerial|header/i, 'aerial'],
    [/chameleon|fusion|copy|adapt|mirror|ambidext/i, 'adapt'],
    [/pass|puppet|laser|cutback|chip|bounce|disguise|delivery|one-touch|line-break|switch/i, 'pass'],
    [/dribbl|elastic|carry|street|1v1|rhythm/i, 'dribble'],
    [/accel|burst|speed|sprint/i, 'speed'],
    [/trap|control|touch|keeping|half-turn/i, 'control'],
    [/off-ball|movement|stealth|vanish|run/i, 'move'],
    [/shot|finish|predator|strike|knuckle|volley|direct|trivela|acrobat|two-stage|reflex/i, 'finish']
  ];
  const STAT_FAMILY = { finishing: 'finish', shotPower: 'finish', offBall: 'move', vision: 'vision', dribbling: 'dribble', passing: 'pass', acceleration: 'speed',
    speed: 'speed', control: 'control', technique: 'control', defense: 'defend', physical: 'aerial', reactions: 'defend', ego: 'adapt', weakFoot: 'finish', stamina: 'defend' };

  function familyOf(name, effects) {
    for (const [re, fam] of NAME_RULES) if (re.test(name || '')) return fam;
    const top = Object.entries(effects || {}).sort((a, b) => b[1] - a[1])[0];
    return top ? (STAT_FAMILY[top[0]] || 'finish') : 'finish';
  }

  const LEVELS = [0, 12, 32, 62, 100];
  function levelFor(xp) { let l = 0; LEVELS.forEach((t, i) => { if (xp >= t) l = i; }); return l; }
  function nextLevelAt(xp) { return LEVELS.find(t => t > xp) ?? null; }

  function blank(weaponName, effects) { return { name: weaponName || '—', family: familyOf(weaponName, effects), xp: 0, level: 0, tier: 0, uses: 0 }; }

  function ensure(run, selections) {
    run.weapons = run.weapons || {};
    const W = run.weapons;
    const p = selections.primaryWeapon, s = selections.secondaryWeapon;
    if (p && (!W.primary || W.primary.name !== p.name)) W.primary = blank(p.name, p.effects);
    if (s && (!W.secondary || W.secondary.name !== s.name)) W.secondary = blank(s.name, s.effects);
    W.combos = W.combos || [];
    W.evolutions = W.evolutions || [];
    W.counter = W.counter || {}; // family -> pressure from opponents who have read it
    return W;
  }

  function slots(W) { return [W.primary, W.secondary].filter(Boolean); }

  /** Wheel weight multiplier for an outcome with `tags`. counterVs: pressure applied by this opponent. */
  function weightMultiplier(W, tags, opts = {}) {
    if (!W) return 1;
    let m = 1;
    for (const slot of slots(W)) {
      const fam = FAMILIES[slot.family]; if (!fam) continue;
      const scale = slot === W.primary ? 1 : 0.6;
      const counter = Math.min(0.75, (opts.counter && opts.counter[slot.family]) || 0);
      if (tags.some(t => fam.tags.includes(t)) && !tags.includes('neg')) m *= 1 + (0.07 * slot.level + 0.05 * slot.tier) * scale * (1 - counter);
      if (tags.includes('neg') && tags.some(t => fam.neg.includes(t))) m *= Math.max(0.6, 1 - 0.05 * slot.level * scale) * (1 + counter * 0.4);
    }
    return m;
  }

  /** Award mastery for a resolved outcome. Returns list of {slot, levelUp}. */
  function award(W, tags, opts = {}) {
    const out = [];
    for (const slot of slots(W)) {
      const fam = FAMILIES[slot.family]; if (!fam || tags.includes('neg')) continue;
      if (!tags.some(t => fam.tags.includes(t))) continue;
      let xp = (slot === W.primary ? 1 : 0.7) * (tags.includes('star') ? 1.5 : 1) * (opts.mult || 1);
      const before = slot.level;
      slot.xp = Math.round((slot.xp + xp) * 10) / 10; slot.uses++;
      slot.level = levelFor(slot.xp);
      if (slot.level > before) out.push({ slot, levelUp: slot.level });
    }
    return out;
  }

  function evolutionName(slot) {
    const fam = FAMILIES[slot.family];
    return fam.evo[Math.min(2, slot.tier)].replace('{w}', slot.name);
  }

  /**
   * Try to evolve after a match. trigger: {rating, importance, duelWin, adapted, flow, decisive}
   * Tier 1 needs mastery L2 + a strong display; tier 2 needs L3 + a big match/duel/adaptation;
   * tier 3 needs L4 + Flow or a decisive duel/adaptation. Returns evolution events.
   */
  function tryEvolve(W, trigger, rng) {
    const events = [];
    for (const slot of slots(W)) {
      if (slot.tier >= 3) continue;
      if (slot === W.secondary && W.primary && W.secondary.family === W.primary.family) continue; // same family reinforces, does not duplicate
      const need = slot.tier + 2;
      if (slot.level < need) continue;
      let ok = false, how = '';
      if (slot.tier === 0 && trigger.rating >= 7.5) { ok = rng.chance(slot === W.primary ? 0.3 : 0.2); how = 'a strong display'; }
      if (slot.tier === 1 && (trigger.importance >= 1.5 && trigger.rating >= 7.6 || trigger.duelWin || trigger.adapted)) { ok = rng.chance(trigger.adapted ? 0.8 : 0.45); how = trigger.adapted ? 'adapting mid-duel' : trigger.duelWin ? 'winning a direct duel' : 'a big-match performance'; }
      if (slot.tier === 2 && (trigger.flow || trigger.decisive || (trigger.adapted && trigger.importance >= 1.6))) { ok = rng.chance(trigger.flow ? 0.6 : 0.4); how = trigger.flow ? 'a Flow state' : 'a decisive confrontation'; }
      if (!ok) continue;
      const name = evolutionName(slot);
      slot.tier++;
      const ev = { slot: slot === W.primary ? 'primary' : 'secondary', family: slot.family, base: slot.name, name, tier: slot.tier, how };
      W.evolutions.push(ev);
      events.push(ev);
    }
    return events;
  }

  /** Special wheel opportunities unlocked by evolutions. Each returns option-ish specs. */
  function specialSlices(W, ctx) {
    const out = [];
    for (const slot of slots(W)) {
      if (!slot.tier) continue;
      const fam = FAMILIES[slot.family];
      const name = evolutionName({ family: slot.family, tier: slot.tier - 1, name: slot.name });
      const scale = (slot === W.primary ? 1 : 0.65) * slot.tier;
      const spec = SPECIAL[slot.family];
      if (spec && (!spec.roles || spec.roles(ctx))) out.push(Object.assign({ name, weight: spec.weight * scale, tags: fam.tags.concat(['star', 'evolved']) }, spec.effect(slot.tier)));
    }
    if (W.awakened) {
      const aw = W.awakened, fam = FAMILIES[aw.family] || FAMILIES.adapt;
      out.push({ name: aw.name, weight: 1.2 + aw.level * 0.5, tags: fam.tags.concat(['star', 'awakened']), desc: 'Your awakened ego takes over the moment.',
        contrib: ['defend', 'aerial'].includes(aw.family) ? { interceptions: 1, tackles: 1, blocks: 1, bonusRating: 1.1 + aw.level * 0.1, oppSuppress: 1 } : { goals: 1, shots: 1, keyPasses: 1, bonusRating: 1.35 + aw.level * 0.1 } });
    }
    for (const combo of W.combos || []) {
      const def = COMBOS.find(c => c.key === combo); if (!def) continue;
      out.push({ name: def.name, weight: def.weight, tags: def.tags.concat(['star', 'combo']), desc: def.desc, contrib: def.contrib });
    }
    return out;
  }

  const SPECIAL = {
    finish:  { weight: 1.3, effect: t => ({ desc: 'Your evolved finishing creates a shot the keeper never sees coming.', contrib: t >= 3 ? { goals: 1, shots: 1, bonusRating: 1.35 } : { goals: 1, shots: 1, bonusRating: 1.12 } }) },
    move:    { weight: 1.3, effect: t => ({ desc: 'You arrive in space nobody tracked and finish.', contrib: { goals: 1, shots: 1, bonusRating: 1.1 + t * .08 } }) },
    vision:  { weight: 1.4, effect: t => ({ desc: 'You see the whole pitch a moment early and exploit it.', contrib: t >= 2 ? { assists: 1, keyPasses: 1, interceptions: 1, bonusRating: 1.0 } : { keyPasses: 2, bonusRating: .45 } }) },
    dribble: { weight: 1.4, effect: t => ({ desc: 'Your rhythm breaks a defensive line on its own.', contrib: t >= 2 ? { dribbles: 2, keyPasses: 1, assists: t >= 3 ? 1 : 0, bonusRating: .55 + t * .15 } : { dribbles: 2, bonusRating: .4 } }) },
    pass:    { weight: 1.4, effect: t => ({ desc: 'A pass that rearranges the whole defence.', contrib: t >= 2 ? { assists: 1, keyPasses: 1, bonusRating: .85 + t * .1 } : { keyPasses: 2, bonusRating: .4 } }) },
    speed:   { weight: 1.3, effect: t => ({ desc: 'Separation so sudden the defender cannot even foul you.', contrib: t >= 2 ? { dribbles: 1, goals: 1, shots: 1, bonusRating: 1.05 } : { dribbles: 2, shots: 1, bonusRating: .4 } }) },
    control: { weight: 1.3, effect: t => ({ desc: 'An impossible ball dies at your feet and becomes a chance.', contrib: t >= 2 ? { goals: 1, shots: 1, bonusRating: 1.05 } : { shots: 1, keyPasses: 1, bonusRating: .38 } }) },
    defend:  { weight: 1.5, effect: t => ({ desc: 'You read the attack before it exists and erase it.', contrib: { interceptions: 1, tackles: 1, blocks: t >= 2 ? 1 : 0, keyPasses: t >= 3 ? 1 : 0, bonusRating: .55 + t * .15, oppSuppress: 1 } }) },
    aerial:  { weight: 1.3, effect: t => ({ desc: 'Nothing in the air belongs to anyone else.', contrib: t >= 2 ? { aerialDuels: 2, goals: 1, setPieceGoals: 1, shots: 1, bonusRating: 1.1 } : { aerialDuels: 2, clearances: 1, bonusRating: .35 } }) },
    adapt:   { weight: 1.3, effect: t => ({ desc: 'You copy the best idea on the pitch and do it better.', contrib: t >= 2 ? { goals: 1, shots: 1, keyPasses: 1, bonusRating: 1.1 } : { keyPasses: 1, dribbles: 1, bonusRating: .45 } }) }
  };

  const COMBOS = [
    { key: 'blindBurst', name: 'Blind-Side Burst', desc: 'Off-ball cunning plus explosive acceleration: you vanish, then you are gone.', tags: ['finish', 'goal', 'speed'],
      req: s => s.acceleration >= 82 && s.offBall >= 82, actions: c => (c.goals || 0) >= 4, weight: 1.2, contrib: { goals: 1, shots: 1, bonusRating: 1.15 } },
    { key: 'conductor', name: 'Field Conductor', desc: 'Elite vision and passing fuse into control of the whole match.', tags: ['pass', 'create', 'vision'],
      req: s => s.passing >= 82 && s.vision >= 84, actions: c => (c.keyPasses || 0) >= 12, weight: 1.3, contrib: { assists: 1, keyPasses: 2, bonusRating: 1.0 } },
    { key: 'skyFortress', name: 'Sky Fortress', desc: 'Height, timing and defensive reading: you dominate both boxes in the air.', tags: ['aerial', 'def', 'goal'],
      req: (s, h) => h >= 186 && s.reactions >= 78 && s.defense >= 76, actions: c => (c.aerialDuels || 0) >= 8, weight: 1.2, contrib: { aerialDuels: 2, clearances: 1, goals: 1, setPieceGoals: 1, shots: 1, bonusRating: 1.1 } },
    { key: 'counterSpear', name: 'Counter Spear', desc: 'You win the ball and release the killer pass in the same motion.', tags: ['def', 'read', 'create'],
      req: s => s.defense >= 78 && s.passing >= 76 && s.vision >= 76, actions: c => (c.interceptions || 0) >= 10, weight: 1.3, contrib: { interceptions: 1, assists: 1, keyPasses: 1, bonusRating: .95 } },
    { key: 'pressPredator', name: 'Press Predator', desc: 'Endless engine and timing turn pressing into a scoring weapon.', tags: ['def', 'press', 'goal'],
      req: s => s.stamina >= 84 && s.defense >= 70 && s.acceleration >= 78, actions: c => (c.recoveries || 0) >= 12, weight: 1.2, contrib: { recoveries: 1, goals: 1, shots: 1, bonusRating: 1.05 } },
    { key: 'twoFooted', name: 'Two-Footed Executioner', desc: 'There is no safe side to show you.', tags: ['finish', 'goal'],
      req: s => s.weakFoot >= 84 && s.finishing >= 84, actions: c => (c.goals || 0) >= 6, weight: 1.2, contrib: { goals: 1, shots: 1, bonusRating: 1.15 } },
    { key: 'elasticEscape', name: 'Elastic Escape', desc: 'Touch, balance and technique make pressure meaningless.', tags: ['dribble', 'carry', 'create'],
      req: s => s.dribbling >= 84 && s.control >= 84 && s.technique >= 80, actions: c => (c.dribbles || 0) >= 14, weight: 1.3, contrib: { dribbles: 2, keyPasses: 1, bonusRating: .7 } },
    { key: 'cannon', name: 'Cannon Volley', desc: 'Raw power with clean technique: from anywhere, at any height.', tags: ['finish', 'goal', 'shot'],
      req: s => s.shotPower >= 86 && s.technique >= 80, actions: c => (c.shots || 0) >= 18, weight: 1.1, contrib: { goals: 1, shots: 1, bonusRating: 1.2 } }
  ];

  function checkCombos(W, stats, heightCm, totals) {
    const unlocked = [];
    for (const c of COMBOS) {
      if (W.combos.includes(c.key)) continue;
      if (c.req(stats, heightCm) && c.actions(totals)) { W.combos.push(c.key); unlocked.push(c); }
    }
    return unlocked;
  }

  function flowExpression(W) {
    const fam = FAMILIES[W?.primary?.family] || FAMILIES.finish;
    return { family: W?.primary?.family || 'finish', name: fam.flow, tags: fam.tags };
  }

  EW.weapons = { FAMILIES, COMBOS, LEVELS, familyOf, levelFor, nextLevelAt, ensure, weightMultiplier, award, tryEvolve, specialSlices, checkCombos, flowExpression, evolutionName };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.weapons;
})(typeof globalThis !== 'undefined' ? globalThis : this);
