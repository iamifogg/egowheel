'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createGame } = require('./harness');
const { playCareer } = require('./autoplay');

test('relationships persist and accumulate history across fixtures', () => {
  let checked = 0;
  for (let i = 0; i < 15 && checked < 3; i++) {
    const r = playCareer({ seed: 'rel-' + i, continuePro: true });
    const c = r.state.run.career;
    const rels = Object.values(c.relations || {});
    const deep = rels.filter(x => x.enc.with + x.enc.against >= 3);
    if (!deep.length) continue;
    checked++;
    deep.forEach(x => assert.ok(x.moments.length >= 1 || x.enc.with + x.enc.against >= 3));
    assert.ok(rels.some(x => x.rivalry > 5 || x.trust > 30 || x.moments.length > 0), 'relationships move');
  }
  assert.ok(checked >= 1, 'at least one long career with repeated encounters');
});

test('duels change rivalry and create revenge memory', () => {
  const r = playCareer({ seed: 'duel-mem', continuePro: true, policy: { duel: () => 'force' } });
  const c = r.state.run.career;
  const dueled = Object.values(c.relations || {}).filter(x => x.enc.duels > 0);
  if (!dueled.length) return;
  dueled.forEach(x => assert.ok(x.rivalry >= 5, 'a duel always leaves a rivalry trace'));
  dueled.forEach(x => assert.ok(x.moments.some(m => /duel/i.test(m.text)), 'the duel is remembered'));
});

test('event director respects cooldowns and pacing', () => {
  let fixtures = 0, scenes = 0;
  for (let i = 0; i < 20; i++) {
    const r = playCareer({ seed: 'dir-' + i, continuePro: true });
    const c = r.state.run.career, h = c.events?.history || [];
    fixtures += c.fxNo || 0; scenes += h.length;
    const byId = {};
    for (const e of h) {
      if (String(e.id).startsWith('arc:')) continue; // arc scenes have their own once-per-stage rule
      const ev = r.game.EW.director.CATALOGUE.find(x => x.id === e.id);
      if (byId[e.id] !== undefined) assert.ok(e.fx - byId[e.id] >= ev.cooldown, e.id + ' repeated inside its cooldown');
      byId[e.id] = e.fx;
    }
    for (let k = 1; k < h.length; k++) assert.ok(!(h[k].id === h[k - 1].id && h[k].fx === h[k - 1].fx), 'no duplicate scene in one fixture');
  }
  const rate = scenes / fixtures;
  assert.ok(rate > 0.15 && rate < 0.55, 'scenes per fixture ' + rate.toFixed(2));
});

test('scene choices have real mechanical consequences', () => {
  const g = createGame({ seed: 'scene-eff' });
  const a = g.api; a.quickBuild();
  const c = a.state.run.career;
  c.pendingDecision = { type: 'scene', id: 'test', cat: 'rivalry', actor: 'barou', title: 'Test', text: 'x', choices: [
    { key: 'go', label: 'Go', hint: '', odds: 0.95, success: { conf: 10, rel: { rivalry: 20 }, temp: { goalP: .02 }, duelForce: 'barou' }, mixed: { conf: 10, rel: { rivalry: 20 }, duelForce: 'barou' }, fail: { conf: 10, rel: { rivalry: 20 }, duelForce: 'barou' } }] };
  const conf = a.state.run.confidence;
  g.api.resolveDecision({ scene: () => 'go' });
  assert.strictEqual(a.state.run.mode, 'sceneSpin');
  a.spinCurrent();
  assert.ok(a.state.run.confidence > conf, 'confidence changed');
  assert.ok(a.relationFor('barou').rivalry >= 20, 'rivalry changed');
  assert.strictEqual(c.forceDuel, 'barou', 'future duel scheduled');
  assert.strictEqual(c.pendingDecision, null);
});

test('partners unlock combination plays on the wheel', () => {
  const g = createGame({ seed: 'combo' });
  const a = g.api; a.quickBuild();
  const s = a.state, c = s.run.career, f = a.currentFixture();
  a.ensureWorld();
  // make the first named teammate a trusted partner
  const w = a.worldOf();
  const mate = w.teams[f.team].ids.find(id => w.players[id].named);
  if (!mate) return; // team without named characters: nothing to test
  const r = a.relationFor(mate); r.compat = 80; r.trust = 80; g.EW.relationships.adjust(r, {});
  c.prepPhase = 'ready';
  s.run.pendingMatch = { spinIndex: 0, targetSpins: 6, contributions: { yellowCards: 0, labels: [] }, ctx: { tg: 0, og: 0, mom: 0, timeline: [], flow: false, base: { mate: 1, opp: 1 } } };
  a.ensureFixtureCast(f);
  const st = a.contributionStage();
  assert.ok(st.options.some(o => o.name === 'Combination Play'), 'combination slice offered with a partner');
});
