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

test('rendering is deterministic and expressions actually change the face', () => {
  const a = A.NAMED.isagi, kit = A.kitFor('Bastard München');
  assert.deepStrictEqual(S.render(a, 'neutral', kit).px, S.render(a, 'neutral', kit).px);
  const faces = new Set(S.EXPRESSIONS.map(ex => S.render(a, ex, kit).px.join(',')));
  assert.strictEqual(faces.size, S.EXPRESSIONS.length, 'all eight expressions are distinct');
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
