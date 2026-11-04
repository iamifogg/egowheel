/* Simple autopilot used by balance tests: plays a career through the real UI functions. */
'use strict';
const { createGame } = require('./harness');

function defaultPolicy(api, ctx) {
  return {
    training: () => api.TRAINING_ACTIONS[Math.floor(api.EW_rng() * api.TRAINING_ACTIONS.length)].key,
    plan: () => 'balanced',
    injury: (opts) => (opts.some(o => o.key === 'rehab') ? 'rehab' : opts[0].key),
    scene: (choices) => choices[Math.floor(api.EW_rng() * choices.length)].key,
    objective: (list) => list[0].key,
    duel: (list) => list[Math.floor(api.EW_rng() * list.length)].key,
    pick: (list) => list[0].key
  };
}

/**
 * Plays one career. Returns {game, state, matches[], events[]}.
 * opts: { seed, positionName, maxSteps, policy, onMatch(report, state), continuePro }
 */
function drive(api, opts = {}) {
  const policy = Object.assign(defaultPolicy(api), opts.policy || {});
  const matches = [];
  let steps = 0, lastReport = null;
  const max = opts.maxSteps || 6000;
  while (steps++ < max) {
    const s = api.state, m = s.run.mode, c = s.run.career;
    if (opts.stopAtPro && s.run.career?.pro) break;
    if (m === 'complete') {
      if (opts.continuePro && c && !c.eliminated && !c.postNelStarted) { api.continueProCareer(); continue; }
      break;
    }
    if (api.pendingProDecision && api.pendingProDecision()) { api.resolveProDecision(policy); continue; }
    if (m === 'career' || m === 'pro') {
      if (api.pendingDecision && api.pendingDecision()) { api.resolveDecision(policy); continue; }
      if (c.report) {
        if (c.report !== lastReport && (c.report.type === 'match' || c.report.type === 'absent')) { matches.push(c.report); if (opts.onMatch) opts.onMatch(c.report, s, api); }
        lastReport = c.report;
        api.advanceFixture();
        continue;
      }
      if (api.injuryBlocksFixture && api.injuryBlocksFixture()) { api.chooseInjuryRoom(policy.injury(api.injuryRoomOptions())); continue; }
      if (c.prepPhase === 'event') { api.startBetweenEvent(); continue; }
      if (c.prepPhase === 'training') { api.applyTraining(policy.training()); continue; }
      if (api.chooseObjective && api.objectiveOptions) { const list = api.objectiveOptions(); if (list && list.length && !c.objectiveKey) api.chooseObjective(policy.objective(list)); }
      api.choosePlan(policy.plan(c));
      api.playFixture();
      continue;
    }
    if (api.pendingWheelChoice && api.pendingWheelChoice()) { api.resolveWheelChoice(policy); continue; }
    const st = api.currentWheelStage();
    if (!s.run.selections[st.key]) api.spinCurrent(); else api.nextBuild();
  }
  return { matches, steps };
}

function playCareer(opts = {}) {
  const game = createGame({ seed: opts.seed ?? 1, headless: opts.headless !== false });
  const api = game.api;
  api.EW_rng = () => game.EW.rng.next();
  api.quickBuild();
  if (opts.positionName && api.forcePosition) api.forcePosition(opts.positionName);
  if (opts.setup) opts.setup(api, game);
  const r = drive(api, opts);
  return { game, api, state: api.state, matches: r.matches, steps: r.steps };
}

module.exports = { playCareer, drive };
