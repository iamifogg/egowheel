'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createGame } = require('./harness');

const { EW } = createGame({ seed: 'vis' });
const S = EW.sprites, A = EW.appearances;
const HEX = /^#[0-9a-f]{6}$/i;

test('every option value and expression renders a valid, non-empty portrait', () => {
  const base = A.defaultAppearance();
  const kit = A.kitFor('Team Z');
  for (const [key, vals] of Object.entries(S.OPTIONS)) {
    for (const v of vals) for (const ex of S.EXPRESSIONS) {
      const g = S.render(Object.assign({}, base, { [key]: v }), ex, kit);
      const filled = g.px.filter(Boolean);
      assert.ok(filled.length > 600, key + '=' + v + ' ' + ex + ' renders enough pixels');
      filled.forEach(c => assert.ok(HEX.test(c), 'valid colour ' + c + ' for ' + key + '=' + v));
    }
  }
});

test('rendering is deterministic and every expression actually changes the face', () => {
  const kit = A.kitFor('Bastard München');
  assert.deepStrictEqual(S.render(A.NAMED.isagi, 'neutral', kit).px, S.render(A.NAMED.isagi, 'neutral', kit).px);
  assert.ok(S.EXPRESSIONS.length >= 10, 'at least ten expressions');
  for (const req of ['neutral', 'confident', 'intense', 'angry', 'frustrated', 'smirk', 'surprised', 'defeated']) assert.ok(S.EXPRESSIONS.includes(req), req);
  for (const base of [A.defaultAppearance(), Object.assign({}, A.NAMED.isagi, { persona: undefined }), Object.assign({}, A.NAMED.nagi, { persona: undefined })]) {
    const all = S.EXPRESSIONS.concat(S.EXTRA_EXPRESSIONS);
    const faces = new Set(all.map(ex => S.render(base, ex, kit).px.join(',')));
    assert.strictEqual(faces.size, all.length, 'all expressions are distinct');
  }
});

test('personas give named characters characteristic expressions', () => {
  assert.strictEqual(S.resolveExpression(A.NAMED.shidou, 'confident'), 'manic');
  assert.strictEqual(S.resolveExpression(A.NAMED.nagi, 'neutral'), 'bored');
  assert.strictEqual(S.resolveExpression(A.NAMED.rin, 'confident'), 'smirk');
  assert.strictEqual(S.resolveExpression(A.NAMED.bachira, 'confident'), 'elated');
  assert.strictEqual(S.resolveExpression(A.NAMED.barou, 'neutral'), 'intense');
  assert.strictEqual(S.resolveExpression({}, 'angry'), 'angry');
});

test('major named characters use bespoke signature designs, all distinct from each other', () => {
  const kit = A.kitFor('Blue Lock');
  for (const id of ['isagi', 'bachira', 'nagi', 'reo', 'barou', 'shidou', 'rin', 'sae', 'chigiri', 'kunigami', 'kaiser', 'aiku']) {
    assert.ok(A.NAMED[id].sig && S.SIGNATURE[A.NAMED[id].sig], id + ' has a signature hair design');
  }
  const ids = Object.keys(A.NAMED).filter(id => !['wanima_j', 'wanima_k'].includes(id));
  const imgs = new Set(ids.map(id => S.render(A.NAMED[id], 'neutral', kit).px.join(',')));
  assert.strictEqual(imgs.size, ids.length, 'every named portrait is unique');
  // a signature differs substantially from the library style it is based on
  const diff = (p, q) => p.reduce((n, c, i) => n + (c !== q[i] ? 1 : 0), 0);
  for (const id of ['nagi', 'barou', 'shidou', 'rin', 'bachira']) {
    const sig = S.render(A.NAMED[id], 'neutral', kit).px, lib = S.render(Object.assign({}, A.NAMED[id], { sig: undefined }), 'neutral', kit).px;
    assert.ok(diff(sig, lib) > 80, id + ' signature differs from the generic style: ' + diff(sig, lib));
  }
});

test('procedural footballers: full coherent looks with wide variety, stable per id', () => {
  const kit = A.kitFor('Team A');
  const looks = Array.from({ length: 300 }, (_, i) => A.procedural('p' + i, ['proud', 'devil', 'anxious', undefined][i % 4]));
  assert.deepStrictEqual(A.procedural('p7'), A.procedural('p7'));
  for (const k of ['hairStyle', 'hairColor', 'skin', 'face', 'eyeShape', 'brow', 'nose']) {
    const n = new Set(looks.map(l => l[k])).size;
    assert.ok(n >= Math.min(5, S.OPTIONS[k].length), k + ' variety ' + n);
  }
  const imgs = new Set(looks.slice(0, 120).map(l => S.render(l, 'neutral', kit).px.join(',')));
  assert.strictEqual(imgs.size, 120, 'every procedural portrait is unique');
  looks.slice(0, 40).forEach(l => { const g = S.render(l, 'neutral', kit); assert.ok(g.px.filter(Boolean).length > 900, 'full portrait'); });
});

test('old v1 appearances (saved before the overhaul) still render after normalisation', () => {
  const v1 = { v: 1, skin: 'light', hairStyle: 'messy', hairColor: 'navy', hairTip: 'none', hairLen: 1, eyeColor: 'blue', eyeShape: 'standard', brow: 'neutral', face: 'oval', facialHair: 'none', mark: 'none', accessory: 'none', accent: '#1598ff', number: 9 };
  const a = A.normalize(v1);
  assert.strictEqual(a.v, 2); assert.strictEqual(a.hairColor, 'navy'); assert.strictEqual(a.number, 9);
  assert.ok(S.OPTIONS.nose.includes(a.nose) && a.eyeGap >= 2);
  assert.ok(S.render(a, 'confident', A.kitFor('Team Z')).px.filter(Boolean).length > 900);
});

test('procedural NPCs keep a stable, distinct look', () => {
  assert.deepStrictEqual(A.procedural('p42'), A.procedural('p42'));
  const looks = new Set(Array.from({ length: 60 }, (_, i) => JSON.stringify(A.procedural('p' + i))));
  assert.ok(looks.size >= 58, 'procedural appearances are varied: ' + looks.size);
});

test('major named characters have fixed visual identities', () => {
  for (const id of ['isagi', 'bachira', 'rin', 'nagi', 'reo', 'barou', 'chigiri', 'kunigami', 'shidou', 'kaiser', 'aiku', 'sae']) assert.ok(A.NAMED[id], id);
  const ids = Object.keys(A.NAMED).filter(id => !['wanima_j', 'wanima_k'].includes(id));
  const sig = new Set(ids.map(id => { const a = A.NAMED[id]; return [a.hairStyle, a.hairColor, a.hairTip, a.eyeColor, a.accessory, a.skin, a.face].join('|'); }));
  assert.strictEqual(sig.size, ids.length, 'no two named characters look identical');
});

test('appearance normalisation repairs corrupt data instead of failing', () => {
  const a = A.normalize({ skin: 'chartreuse', hairStyle: 42, number: 'abc', accent: 'red', hairLen: 9 });
  assert.ok(S.OPTIONS.skin.includes(a.skin) && S.OPTIONS.hairStyle.includes(a.hairStyle));
  assert.ok(a.number >= 1 && a.number <= 99 && /^#/.test(a.accent) && a.hairLen <= 2);
});

test('protagonist appearance persists through save/load and archive', () => {
  const g = createGame({ seed: 'look' });
  const a = g.api; a.quickBuild();
  a.state.run.appearance = Object.assign(A.defaultAppearance(), { hairStyle: 'mohawk', hairColor: 'pink', number: 7 });
  a.save();
  const raw = g.storage.get(g.EW.save.KEY);
  const g2 = createGame({ storage: { [g.EW.save.KEY]: raw } });
  assert.strictEqual(g2.api.state.run.appearance.hairStyle, 'mohawk');
  assert.strictEqual(g2.api.state.run.appearance.number, 7);
});
