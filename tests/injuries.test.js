'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createGame } = require('./harness');
const { playCareer } = require('./autoplay');

const { EW } = createGame({ seed: 'inj' });
const I = EW.injuries;

test('healthy players are rarely forced off (0.5–2% per match)', () => {
  const r = I.matchRisk({ fitness: 100, stamina: 70, fixtureNo: 10, log: [] });
  assert.ok(r.matchEnding >= 0.005 && r.matchEnding <= 0.02, 'healthy risk ' + r.matchEnding);
});

test('fatigue raises risk without a punishment spiral', () => {
  const fresh = I.matchRisk({ fitness: 95, stamina: 60, fixtureNo: 5, log: [] }).matchEnding;
  const tired = I.matchRisk({ fitness: 50, stamina: 60, fixtureNo: 5, log: [] }).matchEnding;
  const wrecked = I.matchRisk({ fitness: 25, stamina: 40, fixtureNo: 5, log: [], carrying: { limited: 1 }, rushed: true, planLoad: 7, importance: 2 }).matchEnding;
  assert.ok(tired > fresh * 1.8, 'tired should be clearly riskier');
  assert.ok(wrecked <= I.MAX_MATCH_ENDING + 1e-9, 'hard cap respected: ' + wrecked);
});

test('recurrence protection after two recent match-ending injuries', () => {
  const log = [{ fx: 7, matchEnding: true }, { fx: 9, matchEnding: true }];
  const r = I.matchRisk({ fitness: 30, stamina: 45, fixtureNo: 10, log });
  assert.ok(r.matchEnding <= 0.004 + 1e-9, 'protected risk ' + r.matchEnding);
  assert.ok(r.reasons.includes('recurrence protection'));
});

test('per-spin calibration reproduces the per-match probability', () => {
  const p = 0.02, n = 7, q = I.perSpinShare(p, n);
  assert.ok(Math.abs((1 - Math.pow(1 - q, n)) - p) < 1e-9);
});

test('serious injuries are much rarer than withdrawals', () => {
  const rng = EW.rng.createRng('sev');
  const counts = {};
  for (let i = 0; i < 20000; i++) { const k = I.rollSeverity(rng, { fitness: 80, fixtureNo: 3, log: [] }); counts[k] = (counts[k] || 0) + 1; }
  assert.ok(counts.offKnock > counts.serious * 3);
  assert.ok((counts.career || 0) < 200, 'career-threatening must be extremely rare');
});

test('wheel slice for injury matches the calibrated share', () => {
  const g = createGame({ seed: 'slice' });
  const a = g.api; a.quickBuild();
  const s = a.state; s.run.fitness = 100; s.run.injuryLog = [];
  s.run.career.prepPhase = 'ready';
  s.run.pendingMatch = { spinIndex: 0, targetSpins: 6, contributions: { yellowCards: 0, labels: [] } };
  const st = a.contributionStage();
  const total = st.options.reduce((t, o) => t + o.weight, 0);
  const share = st.options.find(o => o.name === 'Forced Off Injured').weight / total;
  const perMatch = 1 - Math.pow(1 - share, 6);
  assert.ok(perMatch > 0.003 && perMatch < 0.03, 'per-match from wheel ' + perMatch);
});

test('full careers: match-ending injury frequency and no absurd streaks', () => {
  let matches = 0, offs = 0, maxStreak = 0, multiInOneMatch = 0;
  for (let i = 0; i < 60; i++) {
    let streak = 0;
    playCareer({ seed: 'career-inj-' + i, continuePro: true, onMatch(rep) {
      if (rep.type !== 'match') { return; }
      matches++;
      const labels = rep.contributionLabels || [];
      const off = labels.filter(l => l === 'Forced Off Injured').length;
      const knocks = labels.filter(l => l === 'Picks Up a Knock').length;
      if (off + knocks > 1) multiInOneMatch++;
      if (off) { offs++; streak++; maxStreak = Math.max(maxStreak, streak); } else streak = 0;
    } });
  }
  const rate = offs / matches;
  assert.ok(matches > 600, 'enough matches simulated: ' + matches);
  assert.ok(rate < 0.035, 'overall match-ending rate ' + (rate * 100).toFixed(2) + '%');
  assert.strictEqual(multiInOneMatch, 0, 'never more than one injury incident per match');
  assert.ok(maxStreak <= 2, 'longest consecutive forced-off streak ' + maxStreak);
});

test('wheel results are locked: re-spinning a career wheel is impossible', () => {
  const g = createGame({ seed: 'lock' });
  const a = g.api; a.quickBuild();
  a.startBetweenEvent();
  a.spinCurrent();
  const first = a.state.run.selections.betweenGame;
  for (let i = 0; i < 20; i++) a.spinCurrent();
  assert.strictEqual(a.state.run.selections.betweenGame, first);
});

test('a forced-off player takes no further part in the match', () => {
  const g = createGame({ seed: 'off' });
  const a = g.api; a.quickBuild();
  const s = a.state; s.run.career.prepPhase = 'ready'; s.run.career.prepared = true; s.run.career.betweenDone = true;
  a.playFixture();
  const p = s.run.pendingMatch;
  p.injuryRisk = { matchEnding: 0.9, knock: 0.0001, reasons: [] };
  let guard = 0;
  while (s.run.mode !== 'career' && guard++ < 50) {
    const st = a.currentWheelStage();
    if (!s.run.selections[st.key]) a.spinCurrent(); else a.nextBuild();
  }
  const rep = s.run.career.report;
  assert.ok(rep, 'match resolved');
  const labels = rep.contributionLabels;
  const idx = labels.indexOf('Forced Off Injured');
  if (idx >= 0) {
    assert.strictEqual(idx, labels.length - 1, 'injury must be the final contribution');
    assert.ok(rep.minutes < 90);
    assert.ok(s.run.injury, 'injury state recorded');
  }
});
