/* EgoWheel — Flow state.
 *
 * Flow is a rare, heightened state. It doesn't guarantee success, but while it lasts the player
 * can do things they normally can't:
 *   • the wheel is rebuilt: weapon-family and role-specific exceptional actions take up a large,
 *     clearly marked share of it;
 *   • routine errors (Major Error, Own Goal, cards, sloppy duels) are strongly suppressed, and
 *     failure becomes a dramatic "overreach" instead of business-as-usual sloppiness;
 *   • a Flow window lasts a fixed number of moments and is never wasted by timing: if it
 *     triggers too late, extra stoppage-time moments are added;
 *   • the reward comes from what you achieve inside Flow (feats), not from triggering it.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const WINDOW = 3;        // Flow moments after the trigger
  const MIN_MOMENTS = 2;   // guaranteed Flow moments even when triggered late
  const SHARE = 0.44;      // share of the wheel taken by exceptional Flow actions

  // kind: goal | create | carry | defend | aerial | surge — used for the report and rewards.
  const A = (name, label, desc, kind, contrib, tags) => ({ name, label, desc, kind, contrib, tags });
  const ACTIONS = {
    finish: [
      A('Impossible-Angle Finish', 'ANGLE SHOT', 'From a position nobody else would shoot from, the ball finds the only gap in the world.', 'goal', { goals: 1, shots: 1, bonusRating: 1.65 }, ['finish', 'goal', 'star']),
      A('Instinctive Volley', 'VOLLEY', 'No thought, no setup. The ball drops and your body has already decided.', 'goal', { goals: 1, shots: 1, bonusRating: 1.5 }, ['finish', 'goal', 'star']),
      A('Killer Run Into Space', 'KILLER RUN', 'You arrive in the space before it exists. They can only stop you illegally: penalty.', 'surge', { shots: 1, penalty: 1, bonusRating: 0.75 }, ['finish', 'star'])
    ],
    move: [
      A('Untracked Arrival', 'UNTRACKED', 'Four defenders, and none of them saw you arrive. One touch. Goal.', 'goal', { goals: 1, shots: 1, bonusRating: 1.55 }, ['finish', 'goal', 'star']),
      A('Blind-Side Ghost', 'GHOST RUN', 'You vanish behind the last man and reappear at the far post.', 'goal', { goals: 1, shots: 1, bonusRating: 1.45 }, ['finish', 'goal', 'star']),
      A('Decoy Opens the Lane', 'DECOY', 'Your run drags two markers away; the lane you opened is gift-wrapped for a teammate.', 'create', { keyPasses: 1, chanceFor: 1, bonusRating: 0.8 }, ['create', 'star'])
    ],
    vision: [
      A('Field Prediction', 'PREDICTION', 'You see the next three passes. You intercept the first and play the decisive one.', 'create', { interceptions: 1, assists: 1, keyPasses: 1, bonusRating: 1.2 }, ['read', 'create', 'star']),
      A('Split the Defence', 'SPLIT THEM', 'A pass through a gap that only appeared for half a second.', 'create', { assists: 1, keyPasses: 1, bonusRating: 1.15 }, ['pass', 'create', 'star']),
      A('Read the Whole Pitch', 'FULL READ', 'Every movement makes sense. You reposition the whole attack with one touch.', 'surge', { keyPasses: 2, surge: 1, chanceFor: 1, bonusRating: 0.85 }, ['vision', 'create', 'star'])
    ],
    dribble: [
      A('Break Two Defenders', 'BREAK TWO', 'Two defenders commit. Neither touches you. The defence is torn open behind them.', 'carry', { dribbles: 2, keyPasses: 1, chanceFor: 1, bonusRating: 0.95 }, ['dribble', 'carry', 'star']),
      A('Glide Through Pressure', 'GLIDE', 'Pressure arrives from three sides and simply slides off you. The stadium rises.', 'surge', { dribbles: 2, surge: 1, bonusRating: 0.8 }, ['dribble', 'carry', 'star']),
      A('Dribble Into the Chance', 'SOLO GOAL', 'You keep going until there is nobody left between you and the net.', 'goal', { dribbles: 1, goals: 1, shots: 1, bonusRating: 1.55 }, ['dribble', 'goal', 'star'])
    ],
    pass: [
      A('Impossible Assist', 'MAGIC PASS', 'A pass nobody else on the pitch could see, weighted to the centimetre.', 'create', { assists: 1, keyPasses: 2, bonusRating: 1.35 }, ['pass', 'create', 'star']),
      A('Split the Defence', 'SPLIT THEM', 'One ball breaks two lines and leaves your striker alone with the keeper.', 'create', { assists: 1, keyPasses: 1, bonusRating: 1.15 }, ['pass', 'create', 'star']),
      A('Instant Read', 'READ IT', 'You know where the ball is going before they do: intercept and release in one motion.', 'surge', { interceptions: 1, keyPasses: 1, chanceFor: 1, bonusRating: 0.85 }, ['pass', 'read', 'star'])
    ],
    speed: [
      A('Explosive Breakaway', 'BREAKAWAY', 'Halfway line to goal before the defence turns around.', 'goal', { dribbles: 1, goals: 1, shots: 1, bonusRating: 1.5 }, ['carry', 'goal', 'star']),
      A('Burst Into the Box', 'BURST', 'One burst takes you past everyone; the last defender has to bring you down.', 'surge', { dribbles: 1, shots: 1, penalty: 1, bonusRating: 0.8 }, ['carry', 'shot', 'star']),
      A('Recovery Sprint', 'RECOVERY', 'Their counter looks certain. You cover forty metres and take it back.', 'defend', { tackles: 1, recoveries: 1, oppSuppress: 1, surge: 1, bonusRating: 0.75 }, ['def', 'carry', 'star'])
    ],
    control: [
      A('Impossible Trap', 'DEAD TRAP', 'A ball that should be uncontrollable dies on your foot, and you finish before anyone reacts.', 'goal', { goals: 1, shots: 1, bonusRating: 1.55 }, ['control', 'goal', 'star']),
      A('Orientation Touch', 'TURN TWO', 'Your first touch turns you away from two markers and into open grass.', 'carry', { dribbles: 2, keyPasses: 1, chanceFor: 1, bonusRating: 0.9 }, ['control', 'carry', 'star']),
      A('Dead-Ball Masterpiece', 'FREE KICK', 'The free kick bends round the wall and into the top corner.', 'goal', { goals: 1, shots: 1, setPieceGoals: 1, bonusRating: 1.5 }, ['control', 'goal', 'star'])
    ],
    defend: [
      A('Read the Whole Attack', 'READ ALL', 'You see the entire move before it starts: intercept it, then launch a counter.', 'defend', { interceptions: 2, keyPasses: 1, oppSuppress: 1, surge: 1, bonusRating: 1.0 }, ['def', 'read', 'star']),
      A('Dominate the Duel', 'DOMINATE', 'Their best attacker tries you three times. Three times you win the ball cleanly.', 'defend', { tackles: 2, recoveries: 1, surge: 1, bonusRating: 0.9 }, ['def', 'duel', 'star']),
      A('Erase a Certain Chance', 'ERASE', 'An open goal, a shot already struck — and somehow you are there.', 'defend', { blocks: 1, clearances: 1, tackles: 1, oppSuppress: 2, bonusRating: 1.1 }, ['def', 'block', 'star'])
    ],
    aerial: [
      A('Dominate the Box', 'OWN BOX', 'Every high ball in your area belongs to you. Their aerial plan simply stops working.', 'aerial', { aerialDuels: 2, clearances: 1, oppSuppress: 1, bonusRating: 0.9 }, ['aerial', 'def', 'star']),
      A('Attack the Cross', 'ATTACK BALL', 'You meet the delivery at its highest point and power it in.', 'goal', { aerialDuels: 1, goals: 1, shots: 1, setPieceGoals: 1, bonusRating: 1.5 }, ['aerial', 'goal', 'star']),
      A('Win Both Phases', '2ND BALL', 'First header, second ball: you win both and set the attack moving.', 'aerial', { aerialDuels: 2, keyPasses: 1, chanceFor: 1, bonusRating: 0.95 }, ['aerial', 'create', 'star'])
    ],
    adapt: [
      A('Copy and Surpass', 'SURPASS', 'You take the move their star just used and do it better, right in front of him.', 'goal', { goals: 1, shots: 1, bonusRating: 1.55 }, ['star', 'goal']),
      A('Mirror Their Star', 'MIRROR', 'You become the counter to their best player and switch the game off for them.', 'defend', { tackles: 1, dribbles: 1, oppSuppress: 1, surge: 1, bonusRating: 0.9 }, ['star', 'def']),
      A('Rewrite the Pattern', 'REWRITE', 'Halfway through the move you change everything, and the defence is left reading the old script.', 'create', { assists: 1, keyPasses: 1, bonusRating: 1.15 }, ['star', 'create'])
    ]
  };
  // Role layer: one extra action from the player's on-pitch role so a defender in a finishing
  // family still gets a defensive Flow option and a forward with a defensive weapon gets a shot.
  const ROLE = {
    att: A('Ruthless Instinct', 'RUTHLESS', 'Half a chance, a split second: it is already in the net.', 'goal', { goals: 1, shots: 1, bonusRating: 1.45 }, ['finish', 'goal', 'star']),
    mid: A('Dictate the Tempo', 'TEMPO', 'For a whole spell the match moves at the speed you choose, and your side takes over.', 'surge', { keyPasses: 2, recoveries: 1, surge: 1, chanceFor: 1, bonusRating: 0.9 }, ['create', 'pass', 'star']),
    def: A('Read the Whole Attack', 'READ ALL', 'You see the entire move before it starts: intercept it, then launch a counter.', 'defend', { interceptions: 2, keyPasses: 1, oppSuppress: 1, surge: 1, bonusRating: 1.0 }, ['def', 'read', 'star'])
  };
  const FAIL = {
    overreach: A('Flow Overreach', 'OVERREACH', 'You attempt something impossible and it doesn\'t quite come off. Nobody who saw it will forget it.', 'fail', { shots: 1, ratingPenalty: 0.05 }, ['flowfail']),
    shatter: A('Flow Shatters', 'SHATTERED', 'They finally solve you. The silence in your head breaks and the Flow is gone.', 'fail', { mistakes: 1, ratingPenalty: 0.35, endFlow: 1 }, ['neg', 'flowfail'])
  };

  // Routine negatives in Flow: kept only as rare outliers.
  const NEG_MULT = { 'Major Error': 0.06, 'Own Goal': 0.04, 'Straight Red Card': 0.08, 'Second Yellow': 0.12, 'Yellow Card': 0.25, 'Lose Important Duel': 0.16, 'Waste Big Chance': 0.22 };
  const MUNDANE = ['Foul Won', 'Ball Recovery', 'Switch of Play', 'Cross Creates Chance', 'Tactical Foul', 'Shot on Target', 'Key Pass', 'Corner Header Won', 'Dominant Clearance'];

  function actionsFor(family, role) {
    const list = (ACTIONS[family] || ACTIONS.finish).map(a => Object.assign({ weight: 1 }, a));
    const r = ROLE[role];
    if (r && !list.some(a => a.name === r.name) && !(role === 'att' && ['finish', 'move'].includes(family)) && !(role === 'def' && family === 'defend')) list.push(Object.assign({ weight: 0.7 }, r));
    return list;
  }

  /** How hard the context is (0 = comfortable, 1 = vastly outmatched). Keeps some failure alive. */
  function difficulty(gap, importance) { return clamp((gap - 2) / 14, 0, 1) * 0.8 + clamp(((importance || 1) - 1) / 3, 0, 0.2); }

  /**
   * Rebuild a contribution wheel for a Flow moment.
   * opts: weighted options (name, weight, meta.tags). make(name, desc, weight, label, meta) builds a slice.
   * ctx: { family, role, gap, importance }
   */
  function reshape(opts, ctx, make) {
    const d = difficulty(ctx.gap || 0, ctx.importance || 1);
    const famTags = (EW.weapons?.FAMILIES[ctx.family] || {}).tags || [];
    for (const o of opts) {
      const tags = o.meta?.tags || [];
      if (tags.includes('injury')) { o.weight *= 0.5; continue; }
      const neg = tags.includes('neg'), has = t => tags.includes(t);
      let m = 1;
      if (neg) m = (NEG_MULT[o.name] ?? 0.2) * (1 + 2.2 * d);
      else if (has('card')) m = 0.3;
      else if (has('quiet')) m = 0.12;
      else if (has('star') || has('goal') || o.name === 'Assist') m = 1.6;
      else if (MUNDANE.includes(o.name)) m = 0.55;
      if (!neg && famTags.some(t => has(t))) m *= 1.35;
      o.weight = Math.max(0.005, o.weight * m);
    }
    const base = opts.reduce((t, o) => t + o.weight, 0);
    const acts = actionsFor(ctx.family, ctx.role), wsum = acts.reduce((t, a) => t + a.weight, 0);
    // Flow actions take SHARE of the final wheel: x / (base + x) = SHARE.
    const flowTotal = base * SHARE / (1 - SHARE);
    const added = [];
    for (const a of acts) added.push(make(a.name, a.desc, flowTotal * a.weight / wsum, a.label, { contrib: a.contrib, tags: a.tags.concat(['flowmove']), special: true, flow: true, kind: a.kind }));
    added.push(make(FAIL.overreach.name, FAIL.overreach.desc, (base + flowTotal) * (0.035 + 0.06 * d), FAIL.overreach.label, { contrib: FAIL.overreach.contrib, tags: FAIL.overreach.tags, flow: true, flowFail: true, kind: 'fail' }));
    if (d > 0.15) added.push(make(FAIL.shatter.name, FAIL.shatter.desc, (base + flowTotal) * 0.04 * d, FAIL.shatter.label, { contrib: FAIL.shatter.contrib, tags: FAIL.shatter.tags, flow: true, flowFail: true, kind: 'fail' }));
    opts.push(...added);
    return { difficulty: d, flowShare: SHARE };
  }

  /** Begin a Flow window. Returns the number of extra stoppage-time moments to add. */
  function start(ctx, minute, spinIndex, lastIndex) {
    ctx.flow = true; ctx.flowed = true; ctx.flowMinute = minute; ctx.flowLeft = WINDOW; ctx.flowLog = ctx.flowLog || [];
    const remaining = Math.max(0, lastIndex - spinIndex);
    return Math.max(0, MIN_MOMENTS - remaining);
  }

  /** Record one Flow moment's outcome. Returns { feat, ended }. */
  function record(ctx, outcome, tags, minute) {
    if (!ctx || !ctx.flow) return { feat: false, ended: false };
    const meta = outcome.meta || {};
    const isFail = !!meta.flowFail || tags.includes('neg');
    const feat = !isFail && (!!meta.flow || tags.includes('goal') || tags.includes('star') || outcome.name === 'Assist');
    ctx.flowLog = ctx.flowLog || [];
    ctx.flowLog.push({ m: minute, name: outcome.name, kind: meta.kind || (feat ? 'star' : isFail ? 'fail' : 'routine'), feat, flowAction: !!meta.flow && !meta.flowFail, fail: isFail });
    ctx.flowLeft = (ctx.flowLeft ?? WINDOW) - 1;
    let ended = false;
    if (ctx.flowLeft <= 0 || meta.contrib?.endFlow) { ctx.flow = false; ended = true; ctx.flowEnd = minute; }
    return { feat, ended };
  }

  function summary(log) {
    const l = log || [], feats = l.filter(x => x.feat).length, actions = l.filter(x => x.flowAction).length, fails = l.filter(x => x.fail).length;
    const verdict = feats >= 3 ? 'Flow Masterpiece' : feats >= 2 ? 'Flow Masterclass' : feats === 1 ? 'Flow Breakthrough' : fails ? 'Flow Denied' : 'Flow Without Reward';
    return { feats, actions, fails, moments: l.length, verdict };
  }

  EW.flow = { WINDOW, MIN_MOMENTS, SHARE, ACTIONS, ROLE, FAIL, NEG_MULT, actionsFor, difficulty, reshape, start, record, summary };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.flow;
})(typeof globalThis !== 'undefined' ? globalThis : this);
