'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createGame } = require('./harness');
const { playCareer } = require('./autoplay');

function setup(seed, pos) {
  const g = createGame({ seed });
  const a = g.api; a.quickBuild(); if (pos) a.forcePosition(pos);
  const s = a.state; s.run.career.prepPhase = 'ready'; s.run.career.prepared = true; s.run.career.betweenDone = true;
  return { g, a, s, EW: g.ctx.EW };
}
const mk = (ctx, extra) => Object.assign({ spinIndex: 2, targetSpins: 6, contributions: { yellowCards: 0, labels: [] }, ctx: Object.assign({ tg: 0, og: 0, mom: 0, timeline: [], flow: false, base: { mate: 1, opp: 1 } }, ctx) }, extra || {});
const shares = (st) => { const tot = st.options.reduce((t, o) => t + o.weight, 0); const by = n => (st.options.find(o => o.name === n)?.weight || 0) / tot;
  return { by, flow: st.options.filter(o => o.meta.flow && !o.meta.flowFail).reduce((t, o) => t + o.weight, 0) / tot,
    neg: st.options.filter(o => (o.meta.tags || []).includes('neg') && !o.meta.flowFail).reduce((t, o) => t + o.weight, 0) / tot,
    quiet: by('Quiet Phase') }; };

test('Flow visibly rebuilds the wheel: exceptional actions dominate, routine errors nearly vanish', () => {
  const { a, s } = setup('flow-wheel', 'Centre Forward');
  s.run.pendingMatch = mk({}); const normal = shares(a.contributionStage());
  s.run.pendingMatch = mk({ flow: true, flowed: true, flowLeft: 3 }); const st = a.contributionStage(); const flow = shares(st);
  assert.ok(st.flow && /FLOW STATE/.test(st.chapter), 'stage is presented as a Flow stage');
  assert.ok(flow.flow >= 0.38, 'Flow actions share ' + flow.flow.toFixed(3));
  assert.ok(flow.by('Major Error') < normal.by('Major Error') * 0.1, 'Major Error suppressed: ' + normal.by('Major Error').toFixed(4) + ' → ' + flow.by('Major Error').toFixed(4));
  assert.ok(flow.neg < normal.neg * 0.2, 'routine negatives suppressed: ' + normal.neg.toFixed(3) + ' → ' + flow.neg.toFixed(3));
  assert.ok(flow.quiet < normal.quiet * 0.15, 'quiet phases mostly gone');
  assert.ok(flow.by('Goal') > normal.by('Goal'), 'standard exceptional outcomes also rise');
  assert.ok(st.options.some(o => o.meta.flowFail), 'a dramatic Flow failure remains possible');
});

test('Flow actions are distinct per weapon family and role', () => {
  const { EW } = setup('flow-fam');
  const fams = Object.keys(EW.weapons.FAMILIES);
  for (const f of fams) {
    const acts = EW.flow.actionsFor(f, 'mid');
    assert.ok(acts.length >= 3, f + ' has ≥3 Flow actions');
    const kinds = new Set(acts.map(x => x.kind));
    assert.ok(kinds.size >= 2, f + ' Flow actions are not all the same kind');
  }
  const def = EW.flow.actionsFor('finish', 'def').map(x => x.name);
  assert.ok(def.includes('Read the Whole Attack'), 'a defender with a finishing weapon gets a defensive Flow action');
  const goalsOnly = fams.filter(f => EW.flow.ACTIONS[f].every(x => x.contrib.goals));
  assert.strictEqual(goalsOnly.length, 0, 'no family is just "+1 goal"');
});

test('Flow in practice: most Flow moments produce something exceptional, major errors are rare', () => {
  let moments = 0, feats = 0, errors = 0, fails = 0;
  for (const pos of ['Centre Forward', 'Centre Back', 'Central Midfielder', 'Left Wing']) {
    const { a, s, EW } = setup('flow-mc-' + pos, pos);
    for (let i = 0; i < 400; i++) {
      s.run.pendingMatch = mk({ flow: true, flowed: true, flowLeft: 3 }, { fixtureId: a.currentFixture().id });
      const st = a.contributionStage(); const tot = st.options.reduce((t, o) => t + o.weight, 0);
      let r = EW.rng.current.next() * tot, o = st.options[0];
      for (const x of st.options) { r -= x.weight; if (r <= 0) { o = x; break; } }
      moments++;
      if (o.name === 'Major Error') errors++;
      if (o.meta.flowFail) fails++;
      const tags = o.meta.tags || [];
      if (!o.meta.flowFail && !tags.includes('neg') && (o.meta.flow || tags.includes('goal') || tags.includes('star') || o.name === 'Assist')) feats++;
    }
  }
  assert.ok(feats / moments > 0.5, 'exceptional rate ' + (feats / moments).toFixed(3));
  assert.ok(errors / moments < 0.01, 'major error rate ' + (errors / moments).toFixed(4));
  assert.ok(fails / moments > 0.01 && fails / moments < 0.15, 'dramatic failure rate ' + (fails / moments).toFixed(3));
});

test('late Flow is never wasted: stoppage-time moments are added', () => {
  const { a, s } = setup('flow-late', 'Centre Forward');
  s.run.pendingMatch = mk({}, { spinIndex: 5, fixtureId: a.currentFixture().id, forceFlow: true });
  a.resolveContributionOutcome({ name: 'Key Pass', meta: { contrib: { keyPasses: 1 } } });
  const p = s.run.pendingMatch;
  assert.ok(p.ctx.flow, 'Flow triggered');
  assert.strictEqual(p.targetSpins, 8, 'two stoppage-time Flow moments added');
  assert.strictEqual(p.baseSpins, 6);
  assert.ok(a.momentMinute(p, 6) > 90 && a.momentMinute(p, 7) > a.momentMinute(p, 6), 'extra moments are in stoppage time');
  assert.ok(a.momentMinute(p, 5) <= 90, 'regular minutes unchanged');
  // Mid-match Flow adds nothing
  s.run.pendingMatch = mk({}, { spinIndex: 2, fixtureId: a.currentFixture().id, forceFlow: true });
  a.resolveContributionOutcome({ name: 'Key Pass', meta: { contrib: { keyPasses: 1 } } });
  assert.strictEqual(s.run.pendingMatch.targetSpins, 6);
});

test('Flow window lasts a fixed number of moments and records feats', () => {
  const { a, s } = setup('flow-window', 'Centre Forward');
  s.run.pendingMatch = mk({}, { spinIndex: 1, fixtureId: a.currentFixture().id, forceFlow: true });
  a.resolveContributionOutcome({ name: 'Key Pass', meta: { contrib: { keyPasses: 1 } } });
  const p = s.run.pendingMatch;
  for (let i = 0; i < 3; i++) { p.spinIndex++; a.resolveContributionOutcome({ name: 'Impossible-Angle Finish', meta: { flow: true, contrib: { goals: 1, shots: 1, bonusRating: 1.6 }, tags: ['finish', 'goal', 'star', 'flowmove'] } }); }
  assert.ok(!p.ctx.flow && p.ctx.flowed, 'Flow ended after the window');
  assert.strictEqual(p.ctx.flowLog.length, 3);
  assert.strictEqual(p.flowFeats, 3);
  assert.ok(p.evo.flow, 'feats (not the trigger) unlock the Flow evolution trigger');
  assert.ok(p.ctx.timeline.some(e => e.t === 'flow' && /Flow fades/.test(e.txt)));
});

test('a Flow without feats does not count as a Flow evolution trigger', () => {
  const { a, s } = setup('flow-nofeat', 'Centre Forward');
  s.run.pendingMatch = mk({}, { spinIndex: 1, fixtureId: a.currentFixture().id, forceFlow: true });
  a.resolveContributionOutcome({ name: 'Key Pass', meta: { contrib: { keyPasses: 1 } } });
  const p = s.run.pendingMatch; p.spinIndex++;
  a.resolveContributionOutcome({ name: 'Flow Overreach', meta: { flow: true, flowFail: true, contrib: { shots: 1 }, tags: ['flowfail'] } });
  assert.ok(!p.evo?.flow, 'triggering Flow alone is not the reward');
});

test('Flow raises critical-moment odds truthfully', () => {
  const { a, s, EW } = setup('flow-crit', 'Centre Forward');
  const opt = { key: 'x', label: 'Try it', risk: 'ambitious', odds: 0.3, mixed: true };
  s.run.pendingMatch = mk({});
  const base = a.flowCritical(opt).dist.success;
  s.run.pendingMatch = mk({ flow: true, flowed: true, flowLeft: 2 });
  const fl = a.flowCritical(opt).dist;
  assert.ok(fl.success > base + 0.1, base + ' → ' + fl.success);
  assert.ok(Math.abs(fl.success + fl.mixed + fl.failure - 1) < 1e-3, 'distribution still sums to 1');
});

test('played careers: Flow stays rare and the report explains what happened', () => {
  let m = 0, flows = 0, withSummary = 0, feats = 0;
  for (let i = 0; i < 14; i++) playCareer({ seed: 'flowc-' + i, onMatch(r) { if (r.type !== 'match') return; m++; if (r.flow) { flows++; if (r.flowSummary && r.flowLog) withSummary++; feats += r.flowSummary?.feats || 0; } } });
  assert.ok(flows / m < 0.1, 'flow per match ' + (flows / m * 100).toFixed(1) + '%');
  assert.strictEqual(withSummary, flows, 'every Flow match has a Flow report');
  if (flows >= 3) assert.ok(feats / flows >= 1, 'average feats per Flow ' + (feats / flows).toFixed(2));
});
