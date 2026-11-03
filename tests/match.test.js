'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createGame } = require('./harness');
const { playCareer } = require('./autoplay');

test('match reports stay logically consistent across many careers', () => {
  let n = 0;
  for (let i = 0; i < 25; i++) {
    playCareer({ seed: 'mc-' + i, continuePro: true, onMatch(r) {
      if (r.type !== 'match') return;
      n++;
      assert.ok(r.goals <= r.teamGoals, 'player goals within team goals');
      assert.ok(r.goals + r.assists <= r.teamGoals + (r.decidedBy ? 1 : 0), 'goals + assists within team goals');
      const tlTeam = r.timeline.filter(e => ['goal', 'assist', 'mate'].includes(e.t)).length;
      const tlOpp = r.timeline.filter(e => ['opp', 'og'].includes(e.t)).length;
      const extra = r.decidedBy === 'AET' ? 1 : 0;
      assert.ok(Math.abs((tlTeam + tlOpp) - (r.teamGoals + r.oppGoals)) <= extra, 'timeline goals match the score');
      const resultOk = r.decidedBy === 'PENALTIES' ? r.teamGoals === r.oppGoals : (r.result === 'WIN' ? r.teamGoals > r.oppGoals : r.result === 'LOSS' ? r.teamGoals < r.oppGoals : r.teamGoals === r.oppGoals);
      assert.ok(resultOk, 'result matches score');
      const labels = r.contributionLabels;
      const endIdx = labels.findIndex(l => ['Straight Red Card', 'Forced Off Injured'].includes(l));
      if (endIdx >= 0) { assert.strictEqual(endIdx, labels.length - 1, 'nothing after a red card or injury'); assert.ok(r.minutes < 90); }
      if (r.redCards) assert.ok(r.minutes < 90, 'sent-off player did not play 90');
    } });
  }
  assert.ok(n > 300, 'matches checked: ' + n);
});

test('stronger relevant attributes meaningfully improve the odds', () => {
  const g = createGame({ seed: 'attr' });
  const a = g.api; a.quickBuild(); a.forcePosition('Centre Forward');
  const s = a.state; s.run.career.prepPhase = 'ready'; s.run.career.prepared = true; s.run.career.betweenDone = true;
  const share = (name) => {
    s.run.pendingMatch = { spinIndex: 0, targetSpins: 6, contributions: { yellowCards: 0, labels: [] }, ctx: { tg: 0, og: 0, mom: 0, timeline: [], flow: false, base: { mate: 1, opp: 1 } } };
    const st = a.contributionStage(); const tot = st.options.reduce((t, o) => t + o.weight, 0);
    return st.options.find(o => o.name === name).weight / tot;
  };
  s.run.development.finishing = -20; const low = share('Goal');
  s.run.development.finishing = 25; const high = share('Goal');
  assert.ok(high > low * 1.3, 'finishing raises goal share: ' + low.toFixed(3) + ' → ' + high.toFixed(3));
});

test('objectives and match context change the wheel', () => {
  const g = createGame({ seed: 'obj' });
  const a = g.api; a.quickBuild(); a.forcePosition('Centre Forward');
  const s = a.state, c = s.run.career; c.prepPhase = 'ready';
  const mk = (ctx) => ({ spinIndex: 4, targetSpins: 6, contributions: { yellowCards: 0, labels: [] }, ctx: Object.assign({ tg: 0, og: 0, mom: 0, timeline: [], flow: false, base: { mate: 1, opp: 1 } }, ctx) });
  const shareOf = (name) => { const st = a.contributionStage(); const tot = st.options.reduce((t, o) => t + o.weight, 0); return st.options.find(o => o.name === name).weight / tot; };
  c.objectiveKey = 'balanced'; s.run.pendingMatch = mk({}); const base = shareOf('Goal');
  c.objectiveKey = 'goals'; s.run.pendingMatch = mk({}); const hunt = shareOf('Goal');
  c.objectiveKey = 'create'; s.run.pendingMatch = mk({}); const create = shareOf('Key Pass');
  c.objectiveKey = 'balanced'; s.run.pendingMatch = mk({}); const baseKP = shareOf('Key Pass');
  s.run.pendingMatch = mk({ tg: 0, og: 1 }); const trailing = shareOf('Goal');
  assert.ok(hunt > base * 1.15, 'Hunt Goals raises goal share');
  assert.ok(create > baseKP * 1.15, 'Create Chances raises key-pass share');
  assert.ok(trailing > base * 1.1, 'trailing late pushes for goals');
});

test('Flow is rare and duels happen but are not routine', () => {
  let m = 0, flow = 0, duel = 0;
  for (let i = 0; i < 30; i++) playCareer({ seed: 'fl-' + i, continuePro: true, onMatch(r) { if (r.type !== 'match') return; m++; if (r.flow) flow++; if (r.duel) duel++; } });
  const f = flow / m, d = duel / m;
  assert.ok(f > 0.005 && f < 0.09, 'flow per match ' + (f * 100).toFixed(1) + '%');
  assert.ok(d > 0.04 && d < 0.35, 'duels per match ' + (d * 100).toFixed(1) + '%');
});

test('weapon mastery grows only through relevant actions and evolutions are earned', () => {
  const { EW } = createGame({ seed: 'wpn' });
  const W = { primary: { name: 'Direct Shot', family: 'finish', xp: 0, level: 0, tier: 0, uses: 0 }, secondary: null, combos: [], evolutions: [], counter: {} };
  EW.weapons.award(W, ['def', 'duel']);
  assert.strictEqual(W.primary.xp, 0, 'defending does not train a finishing weapon');
  for (let i = 0; i < 40; i++) EW.weapons.award(W, ['finish', 'goal']);
  assert.ok(W.primary.level >= 2);
  const rng = EW.rng.createRng('evo');
  const none = EW.weapons.tryEvolve(W, { rating: 6.0, importance: 1 }, rng);
  assert.strictEqual(none.length, 0, 'no evolution from a poor display');
  assert.strictEqual(EW.weapons.familyOf('Passing-Lane Reading'), 'defend');
  assert.strictEqual(EW.weapons.familyOf('Spatial Awareness'), 'vision');
  assert.strictEqual(EW.weapons.familyOf('Puppet Passing'), 'pass');
});
