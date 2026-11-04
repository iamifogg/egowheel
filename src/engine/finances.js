/* EgoWheel — personal finances.
 * Every yen moves through a ledger entry with a unique id. Re-applying an id is a no-op, so reloads,
 * repeated clicks or re-simulated periods can never pay a salary, bonus or signing fee twice.
 * Units: thousands of yen (¥k) as integers. ¥1m = 1000.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};

  function ensure(f) {
    f.cash = typeof f.cash === 'number' ? f.cash : 0;
    f.ledger = Array.isArray(f.ledger) ? f.ledger : [];
    f.paid = f.paid && typeof f.paid === 'object' ? f.paid : {};
    f.totals = f.totals || { income: 0, expense: 0 };
    return f;
  }

  /** Add a transaction. amount > 0 income, < 0 expense. Returns false if the id was already applied. */
  function add(f, id, label, amount, cat, period) {
    ensure(f);
    if (!id || f.paid[id]) return false;
    const amt = Math.round(amount);
    f.paid[id] = 1;
    f.cash += amt;
    if (amt >= 0) f.totals.income += amt; else f.totals.expense += -amt;
    f.ledger.push({ id, label, amount: amt, cat: cat || 'other', period: period || '' });
    if (f.ledger.length > 400) f.ledger = f.ledger.slice(-400);
    return true;
  }

  /** Spend only if affordable. Returns true on success. */
  function spend(f, id, label, cost, cat, period) {
    ensure(f);
    const c = Math.round(Math.abs(cost));
    if (c <= 0 || f.paid[id]) return false;
    if (f.cash < c) return false;
    return add(f, id, label, -c, cat, period);
  }

  function fmt(k) {
    const neg = k < 0, v = Math.abs(k);
    const s = v >= 1000000 ? '¥' + (v / 1000000).toFixed(2) + 'bn' : v >= 1000 ? '¥' + (v / 1000).toFixed(v >= 100000 ? 0 : 1) + 'm' : '¥' + Math.round(v) + 'k';
    return (neg ? '−' : '') + s;
  }

  function summary(f, filterPeriodPrefix) {
    const by = {};
    for (const e of f.ledger) { if (filterPeriodPrefix && !String(e.period).startsWith(filterPeriodPrefix)) continue; by[e.cat] = (by[e.cat] || 0) + e.amount; }
    return by;
  }

  EW.finances = { ensure, add, spend, fmt, summary };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.finances;
})(typeof globalThis !== 'undefined' ? globalThis : this);
