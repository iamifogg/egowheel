'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createGame } = require('./harness');

test('distributions always sum to exactly 1', () => {
  const { EW } = createGame({ seed: 'd0' });
  for (let i = 0; i <= 100; i++) for (const ms of [0, .25, .4, .6, 1]) {
    const d = EW.decisions.distribution(i / 100, ms);
    assert.ok(Math.abs(d.success + d.mixed + d.failure - 1) < 1e-9);
    assert.ok(d.success >= 0 && d.mixed >= 0 && d.failure >= 0);
  }
});

test('the scene wheel resolves Success at exactly the displayed probability (large sample)', () => {
  const g = createGame({ seed: 'odds-sample' });
  const a = g.api; a.quickBuild();
  for (const odds of [0.12, 0.38, 0.8]) {
    for (const withMixed of [true, false]) {
      const choice = { key: 'x', label: 'X', odds, success: { text: 's' }, mixed: withMixed ? { text: 'm' } : undefined, fail: { text: 'f' } };
      a.state.run.pendingScene = { scene: { title: 'T' }, choice };
      const stage = a.sceneStage();
      const norm = g.EW.decisions.normalizeChoice(choice);
      const N = 60000, counts = { success: 0, mixed: 0, fail: 0 };
      for (let i = 0; i < N; i++) counts[a.choose(stage).opt.meta.tier]++;
      const se = Math.sqrt(norm.dist.success * (1 - norm.dist.success) / N);
      assert.ok(Math.abs(counts.success / N - norm.dist.success) < 5 * se + 1e-3, 'success ' + (counts.success / N).toFixed(4) + ' vs displayed ' + norm.dist.success);
      assert.ok(Math.abs(norm.dist.success - odds) < 1e-9, 'displayed success equals the option odds');
      assert.ok(Math.abs(counts.mixed / N - norm.dist.mixed) < 0.01);
      assert.ok(Math.abs(counts.fail / N - norm.dist.failure) < 0.01);
      if (!withMixed) assert.strictEqual(counts.mixed, 0, 'no partial outcome when none is offered');
    }
  }
});

test('regression: an 80% option is no longer secretly 56%', () => {
  const g = createGame({ seed: 'odds80' });
  const a = g.api; a.quickBuild();
  a.state.run.pendingScene = { scene: { title: 'T' }, choice: { key: 'x', label: 'X', odds: 0.8, success: {}, mixed: {}, fail: {} } };
  const stage = a.sceneStage(), tot = stage.options.reduce((t, o) => t + o.weight, 0);
  assert.ok(Math.abs(stage.options.find(o => o.meta.tier === 'success').weight / tot - 0.8) < 1e-9);
});
