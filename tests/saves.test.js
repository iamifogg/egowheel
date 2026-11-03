'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { createGame } = require('./harness');

const V7 = fs.readFileSync(path.join(__dirname, 'fixtures', 'v7-save.json'), 'utf8');

test('a real v7 save migrates without losing the career or archive', () => {
  const g = createGame({ storage: { 'egowheel.save.v7': V7 } });
  const st = g.api.state, old = JSON.parse(V7);
  assert.strictEqual(st.version, 8);
  assert.strictEqual(st.archive.length, old.archive.length, 'archive preserved');
  assert.strictEqual(st.archive[0].name, old.archive[0].name);
  assert.strictEqual(st.run.name, old.run.name, 'current character preserved');
  assert.deepStrictEqual(st.run.baseStats, old.run.baseStats, 'attributes preserved');
  assert.strictEqual(st.run.career.totals.apps, old.run.career.totals.apps, 'statistics preserved');
  assert.strictEqual(st.run.career.fixtureIndex, old.run.career.fixtureIndex, 'progression preserved');
  assert.strictEqual(g.storage.get('egowheel.backup.v7'), V7, 'raw v7 backup kept');
});

test('the migrated career remains playable to the end', () => {
  const g = createGame({ seed: 'mig', storage: { 'egowheel.save.v7': V7 } });
  const a = g.api;
  let n = 0;
  while (n++ < 6000 && a.state.run.mode !== 'complete') {
    const s = a.state, c = s.run.career;
    if (s.run.mode === 'career') {
      if (a.pendingDecision && a.pendingDecision()) { a.resolveDecision({}); continue; }
      if (c.report) { a.advanceFixture(); continue; }
      if (a.injuryBlocksFixture()) { a.chooseInjuryRoom('rest'); continue; }
      if (c.prepPhase === 'event') { a.startBetweenEvent(); continue; }
      if (c.prepPhase === 'training') { a.applyTraining('film'); continue; }
      a.playFixture(); continue;
    }
    if (a.pendingWheelChoice && a.pendingWheelChoice()) { a.resolveWheelChoice({}); continue; }
    if (a.pendingDecision && a.pendingDecision()) { a.resolveDecision({}); continue; }
    const st = a.currentWheelStage();
    if (!s.run.selections[st.key]) a.spinCurrent(); else a.nextBuild();
  }
  assert.strictEqual(a.state.run.mode, 'complete');
});

test('missing fields are filled instead of resetting the career', () => {
  const old = JSON.parse(V7);
  delete old.run.career.totals.blocks; delete old.run.injury; delete old.ui; delete old.run.learnedWeapons;
  const g = createGame({ storage: { 'egowheel.save.v7': JSON.stringify(old) } });
  assert.strictEqual(g.api.state.run.name, old.run.name);
  assert.strictEqual(g.api.state.run.career.totals.blocks, 0);
});

test('corrupt current save falls back to previous copy and is backed up', () => {
  const good = createGame({ seed: 'c1' });
  good.api.quickBuild();
  for (let i = 0; i < 10; i++) good.api.save();
  const prev = good.storage.get('egowheel.save.v8.prev');
  assert.ok(prev, 'rolling backup written');
  const g = createGame({ storage: { 'egowheel.save.v8': '{broken', 'egowheel.save.v8.prev': prev } });
  assert.strictEqual(g.api.state.run.name, JSON.parse(prev).run.name);
  assert.ok(Array.from(g.storage.keys()).some(k => k.startsWith('egowheel.backup.corrupt.')));
});

test('export/import round trip', () => {
  const g = createGame({ seed: 'exp' });
  g.api.quickBuild();
  const text = g.EW.save.exportJSON(g.api.state);
  const back = g.EW.save.importJSON(text, { state: () => ({ version: 8, run: {}, archive: [], ui: {} }), run: () => g.api.state.run });
  assert.strictEqual(back.run.name, g.api.state.run.name);
  assert.throws(() => g.EW.save.importJSON('{"hello":1}', { state: () => ({}), run: () => ({}) }));
});

test('archived entries lacking newer fields still load', () => {
  const st = { version: 7, run: null, archive: [{ name: 'Old Timer', status: 'ELIMINATED', bid: 12 }], ui: {} };
  const g = createGame({ storage: { 'egowheel.save.v7': JSON.stringify(st) } });
  assert.strictEqual(g.api.state.archive[0].name, 'Old Timer');
  assert.strictEqual(g.api.state.archive[0].goals, null, 'unknown stats stay unknown, not invented');
});

test('archiving stores a career biography built from real events', () => {
  const { playCareer } = require('./autoplay');
  const r = playCareer({ seed: 'arch-bio', continuePro: true });
  const a = r.api, c = r.state.run.career;
  if (!c.eliminated && c.postNelStarted) a.simulateCareerEpilogue();
  a.archiveCareer();
  const entry = a.state.archive[0];
  assert.ok(entry && entry.summary, 'summary stored');
  assert.ok(Array.isArray(entry.summary.milestones) && entry.summary.milestones.length >= 1, 'milestones recorded');
  assert.strictEqual(entry.summary.goals, c.totals.goals, 'biography numbers match recorded totals');
  a.renderAll();
});
