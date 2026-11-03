'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createGame } = require('./harness');
const { playCareer } = require('./autoplay');

test('the programme starts with ~300 persistent, uniquely named participants', () => {
  const g = createGame({ seed: 'pop' });
  g.api.quickBuild();
  const w = g.api.worldOf();
  const bl = Object.values(w.players).filter(p => p.blueLock && p.status === 'active');
  assert.ok(bl.length >= 295 && bl.length <= 305, 'participants ' + bl.length);
  const names = new Set(Object.values(w.players).map(p => p.name));
  assert.strictEqual(names.size, Object.keys(w.players).length, 'names unique');
  assert.ok(w.players.isagi && w.players.isagi.team === 'Team Z');
  assert.ok(w.players.me.rank > 0, 'protagonist ranked from day one');
  const before = JSON.stringify(Object.values(w.players).map(p => p.name));
  g.api.renderAll();
  assert.strictEqual(JSON.stringify(Object.values(w.players).map(p => p.name)), before, 'population stable across renders');
});

test('same seed reproduces the same world', () => {
  const a = createGame({ seed: 'rep' }); a.api.quickBuild();
  const b = createGame({ seed: 'rep' }); b.api.quickBuild();
  assert.deepStrictEqual(Object.keys(a.api.worldOf().players), Object.keys(b.api.worldOf().players));
  assert.strictEqual(a.api.worldOf().players.p10.name, b.api.worldOf().players.p10.name);
});

test('rankings move with simulated performance and other careers progress', () => {
  const r = playCareer({ seed: 'rank-move', maxSteps: 400 });
  const w = r.state.run.career.world;
  const movers = Object.values(w.players).filter(p => p.prevRank && p.rank && p.prevRank !== p.rank);
  assert.ok(movers.length > 20, 'many players changed rank');
  const played = Object.values(w.players).filter(p => !p.isMe && p.st.apps > 0);
  assert.ok(played.length > 100, 'background players accumulate appearances');
  assert.ok(w.players.isagi.ovr !== 63 || w.players.rin.ovr !== 77, 'named characters develop');
});

test('world consistency: eliminated players never reappear in later casts', () => {
  for (let i = 0; i < 12; i++) {
    const r = playCareer({ seed: 'consist-' + i, continuePro: false });
    const c = r.state.run.career, w = c.world;
    for (const f of c.fixtures) {
      if (!f.cast) continue;
      const fi = c.fixtures.indexOf(f);
      for (const id of [...f.cast.mine, ...f.cast.opp]) {
        const p = w.players[id];
        if (!p || p.isMe || p.status !== 'eliminated') continue;
        const elimIdx = c.fixtures.findIndex(x => x.stage === p.elimStage);
        // A player may appear in fixtures up to (and including) the stage they were eliminated in.
        const lastStageIdx = c.fixtures.map(x => x.stage).lastIndexOf(p.elimStage);
        assert.ok(fi <= lastStageIdx || elimIdx < 0, p.name + ' appeared in ' + f.id + ' after elimination in ' + p.elimStage);
      }
    }
  }
});

test('market: performance moves valuations and defenders can be valuable', () => {
  const { EW } = createGame({ seed: 'mkt' });
  const base = { ovr: 82, pot: 90, pos: 'CF', nel: { g: 0, d: 0 }, nelLog: [] };
  const quiet = EW.market.valuate(Object.assign({}, base, { nelLog: [{ r: 6.2, v: -0.3, opp: 88 }, { r: 6.4, v: -0.1, opp: 88 }, { r: 6.3, v: -0.2, opp: 88 }] }));
  const hat = EW.market.valuate(Object.assign({}, base, { nel: { g: 3, d: 0 }, nelLog: [{ r: 6.4, v: -0.1, opp: 88 }, { r: 6.6, v: .1, opp: 88 }, { r: 9.4, v: 6.4, opp: 91 }] }));
  assert.ok(hat.value > quiet.value * 1.3, 'hat-trick raises value substantially: ' + quiet.value.toFixed(0) + ' → ' + hat.value.toFixed(0));
  const cb = EW.market.valuate({ ovr: 84, pot: 90, pos: 'CB', nel: { g: 0, d: 40 }, nelLog: Array.from({ length: 5 }, () => ({ r: 7.9, v: EW.world.evalValue({ pos: 'CB' }, 0, 0, 8, 7.9), opp: 90 })) });
  const cf = EW.market.valuate({ ovr: 84, pot: 90, pos: 'CF', nel: { g: 3, d: 5 }, nelLog: Array.from({ length: 5 }, () => ({ r: 7.2, v: EW.world.evalValue({ pos: 'CF' }, .6, .2, 1, 7.2), opp: 90 })) });
  assert.ok(cb.value > cf.value * 0.9, 'dominant CB comparable to a decent CF: ' + cb.value.toFixed(0) + ' vs ' + cf.value.toFixed(0));
  assert.strictEqual(cb.club, 'Ubers', 'defensive club bids highest for a defender');
});

test('NEL qualification uses the real top-23 cutoff', () => {
  let checked = 0;
  for (let i = 0; i < 40 && checked < 4; i++) {
    const r = playCareer({ seed: 'nelq-' + i });
    const c = r.state.run.career;
    if (!c.world?.nel || c.finalMarketPos == null) continue;
    checked++;
    const pos = r.api.ctx ? 0 : c.finalMarketPos;
    if (c.eliminated) assert.ok(c.finalMarketPos > 23, 'eliminated only outside top 23 (was ' + c.finalMarketPos + ')');
    else assert.ok(c.finalMarketPos <= 23, 'qualified inside top 23 (was ' + c.finalMarketPos + ')');
    const board = Object.values(c.world.players).filter(p => p.blueLock && p.status === 'active' && p.club);
    assert.ok(board.length >= 30, 'genuine competition for 23 places: ' + board.length);
  }
  assert.ok(checked >= 1, 'at least one career reached the end of the NEL');
});
