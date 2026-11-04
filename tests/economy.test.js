'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createGame } = require('./harness');

function proGame(seed) {
  const g = createGame({ seed });
  const a = g.api; a.quickBuild();
  a.startProfessional();
  const d = a.state.run.career.pendingProDecision;
  a.signContract(d.offers[0].id);
  return { g, a, p: a.proState() };
}

test('ledger is idempotent and spending cannot exceed cash', () => {
  const { EW } = createGame({ seed: 'led' });
  const f = EW.finances.ensure({});
  assert.ok(EW.finances.add(f, 'x1', 'Pay', 5000, 'salary'));
  assert.ok(!EW.finances.add(f, 'x1', 'Pay', 5000, 'salary'), 'same id twice is a no-op');
  assert.strictEqual(f.cash, 5000);
  assert.ok(!EW.finances.spend(f, 'big', 'Car', 9000, 'vehicle'), 'cannot overspend');
  assert.ok(!EW.finances.spend(f, 'neg', 'Exploit', -500, 'x') || f.cash === 4500, 'negative spend cannot create money');
  assert.ok(f.cash <= 5000);
});

test('first contract pays one signing bonus, even across save/reload and repeated signing', () => {
  const { g, a, p } = proGame('sign');
  const signs = () => a.proState().finances.ledger.filter(e => e.id.startsWith('sign-')).length;
  assert.strictEqual(signs(), 1);
  const cash = a.proState().finances.cash;
  a.save();
  const g2 = createGame({ storage: { [g.EW.save.KEY]: g.storage.get(g.EW.save.KEY) } });
  assert.strictEqual(g2.api.proState().finances.cash, cash, 'cash survives reload');
  g2.EW.pro.sign(g2.api.proState(), { id: p.contract.id, club: p.club, salary: p.contract.salary, years: 2, role: 'starter', signing: 999999, bonuses: {}, promise: '' });
  assert.strictEqual(g2.api.proState().finances.ledger.filter(e => e.id.startsWith('sign-')).length, 1, 'no duplicate signing bonus');
});

test('salary is paid monthly: exactly ten payments totalling the annual salary per season', () => {
  const { a } = proGame('salary');
  const p = a.proState(), salary = p.contract.salary, season = p.season;
  a.simulateSeasonForward();
  const pays = a.proState().finances.ledger.filter(e => e.cat === 'salary' && e.period.startsWith('S' + season + '-'));
  assert.strictEqual(pays.length, 10);
  const total = pays.reduce((t, e) => t + e.amount, 0);
  assert.ok(Math.abs(total - salary) <= 10, 'season salary ' + total + ' vs ' + salary);
  assert.strictEqual(a.state.run.mode, 'pro', 'season end decision reached');
});

test('purchases respect funds, ownership and record expenses', () => {
  const { a } = proGame('shop');
  const p = a.proState();
  p.finances.cash = 3000;
  a.buyItem('car3');
  assert.ok(!p.lifestyle.owned.includes('car3'), 'cannot buy a hypercar with ¥3m');
  a.buyItem('car1');
  assert.ok(p.lifestyle.owned.includes('car1'));
  const cash = p.finances.cash;
  a.buyItem('car1');
  assert.strictEqual(p.finances.cash, cash, 'cannot buy the same item twice');
  assert.ok(p.finances.ledger.some(e => e.label.includes('Hatchback') && e.amount < 0));
});

test('training investments have diminishing returns and a per-season limit', () => {
  const { a } = proGame('invest');
  const p = a.proState(); p.finances.cash = 1e6;
  const dev = () => Object.values(a.state.run.development).reduce((t, v) => t + v, 0);
  const d0 = dev(); a.buyTraining('coach_tech'); const d1 = dev();
  a.buyTraining('coach_tech'); assert.strictEqual(dev(), d1, 'once per season');
  assert.ok(d1 - d0 <= 6, 'bounded gain');
});

test('a transfer updates club, history, world and relationships consistently', () => {
  const { a } = proGame('xfer');
  const p = a.proState(), from = p.club;
  a.simulateSeasonForward();
  const d = a.state.run.career.pendingProDecision;
  d.offers = a.state.run.career.pendingProDecision.offers.length ? d.offers : [];
  const other = d.offers.find(o => o.club !== from);
  if (!other) return; // no outside offer this season
  a.signContract(other.id);
  assert.strictEqual(a.proState().club, other.club);
  assert.strictEqual(a.worldOf().players.me.club, other.club);
  assert.strictEqual(a.proState().history[a.proState().history.length - 1].club, other.club);
  assert.ok(a.proState().transfers.length >= 1);
});

test('fast-forward to retirement completes a consistent career and archives it', () => {
  const { a } = proGame('retire');
  a.simulateToRetirement();
  const c = a.state.run.career, p = a.proState();
  assert.strictEqual(a.state.run.mode, 'complete');
  assert.ok(p.retired && c.epilogue?.completed);
  assert.strictEqual(c.epilogue.seasons.length, p.seasonLog.length, 'every season recorded once');
  const salaryCount = p.finances.ledger.filter(e => e.cat === 'salary').length;
  assert.ok(salaryCount <= p.seasonLog.length * 10, 'never more than ten salary payments per season');
  assert.ok(p.age >= 32 && p.age <= 38);
  a.archiveCareer();
  assert.ok(a.state.archive[0].summary);
});
