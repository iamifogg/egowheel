/* EgoWheel — Neo Egoist League auction market.
 * Every NEL player (including the protagonist) is valued by the SAME function:
 * ability, potential, recent position-fair performance, volume, big-game displays,
 * consistency and each club's tactical demand. The highest club valuation is the bid.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const QUALIFY = 23;

  function sd(xs) { if (xs.length < 2) return 0; const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / xs.length); }

  function breakdown(p) {
    const log = p.nelLog || [];
    const ability = Math.pow(Math.max(0, p.ovr - 58), 1.55) * 0.62;
    const potential = clamp((p.pot || p.ovr) - p.ovr, 0, 15) * 0.9;
    let wsum = 0, vsum = 0, total = 0, big = 0;
    log.forEach((e, i) => {
      const wt = Math.pow(0.85, log.length - 1 - i);
      wsum += wt; vsum += e.v * wt; total += Math.max(0, e.v);
      if (e.opp >= 88 && e.r >= 7.8) big += 5;
      if (e.r >= 8.8) big += 4;
    });
    const form = wsum ? (vsum / wsum) * 13 * Math.min(1, log.length / 3) : 0;
    const volume = total * 2.2;
    const consistency = log.length >= 3 ? sd(log.map(e => e.r)) * 4 : 0;
    return { ability, potential, form, volume, big, consistency, base: Math.max(3, ability + potential + form + volume + big - consistency) };
  }

  function clubValue(p, club, base) {
    const prof = EW.data.NEL_CLUB_PROFILE[club];
    let fit = prof ? (prof.pos[p.pos] || 1) : 1;
    if (prof && prof.likes === 'completeness' && p.ovr >= 84) fit *= 1.05;
    if (prof && prof.likes === 'defending' && ['CB', 'DM', 'FB'].includes(p.pos) && (p.nel?.d || 0) >= 20) fit *= 1.06;
    if (prof && prof.likes === 'finishing' && (p.nel?.g || 0) >= 3) fit *= 1.06;
    if (prof && prof.likes === 'dribbling' && ['WG', 'AM'].includes(p.pos)) fit *= 1.03;
    if (prof && prof.likes === 'versatility' && ['CM', 'AM'].includes(p.pos)) fit *= 1.03;
    return base * fit;
  }

  function valuate(p, rng) {
    const b = breakdown(p);
    let best = null;
    for (const club of Object.keys(EW.data.NEL_CLUB_PROFILE)) {
      const v = clubValue(p, club, b.base) * (rng ? 1 + rng.normal(0, 0.035) : 1);
      if (!best || v > best.v) best = { club, v };
    }
    return { value: best.v, club: best.club, breakdown: b };
  }

  function eligible(w) { return Object.values(w.players).filter(p => p.blueLock && p.status === 'active' && p.club); }
  function all(w) { return Object.values(w.players).filter(p => p.club && (p.status === 'active' || p.status === 'external')); }

  /** Update every NEL player's bid. Returns a list of drama items derived from real changes. */
  function updateAll(w, rng, opts = {}) {
    const beforeOrder = leaderboard(w).map(p => p.id);
    const drama = [];
    for (const p of all(w)) {
      const v = valuate(p, rng);
      const next = Math.max(3, Math.round(p.bid ? p.bid * 0.3 + v.value * 0.7 : v.value));
      p.prevBid = p.bid || next;
      const prevClub = p.bidClub;
      p.bid = next; p.bidClub = v.club; p.bids = (p.bids || []).concat([next]).slice(-12);
      if (!opts.initial && prevClub && prevClub !== v.club && next >= 40 && p.blueLock && rng.chance(0.5))
        drama.push({ type: 'newClub', id: p.id, text: v.club + ' make a surprise ¥' + next + 'm bid for ' + p.name + '.' });
    }
    const board = leaderboard(w);
    const afterOrder = board.map(p => p.id);
    if (!opts.initial) {
      const risers = board.filter(p => p.bid - p.prevBid >= 12).sort((a, b) => (b.bid - b.prevBid) - (a.bid - a.prevBid)).slice(0, 2);
      risers.forEach(p => { if (!p.isMe) drama.push({ type: 'surge', id: p.id, text: p.name + "'s value surges to ¥" + p.bid + 'm (+' + (p.bid - p.prevBid) + 'm).' }); });
      const breakers = afterOrder.slice(0, QUALIFY).filter(id => beforeOrder.indexOf(id) >= QUALIFY && id !== 'me');
      breakers.slice(0, 1).forEach(id => drama.push({ type: 'breakin', id, text: w.players[id].name + ' breaks into the top ' + QUALIFY + '.' }));
      if (beforeOrder[0] !== afterOrder[0] && afterOrder[0]) drama.push({ type: 'leader', id: afterOrder[0], text: w.players[afterOrder[0]].name + ' becomes the most valuable Blue Lock player.' });
      const meBefore = beforeOrder.indexOf('me'), meAfter = afterOrder.indexOf('me');
      if (meBefore >= 0 && meAfter >= 0) {
        const overtook = afterOrder.slice(0, meAfter).filter(id => beforeOrder.indexOf(id) > meBefore);
        overtook.slice(0, 1).forEach(id => drama.push({ type: 'overtake', id, text: w.players[id].name + ' overtakes you in the auction rankings.' }));
        if (meBefore >= QUALIFY && meAfter < QUALIFY) drama.push({ type: 'meIn', id: 'me', text: 'You climb inside the top-' + QUALIFY + ' cutoff.' });
        if (meBefore < QUALIFY && meAfter >= QUALIFY) drama.push({ type: 'meOut', id: 'me', text: 'You fall below the top-' + QUALIFY + ' cutoff.' });
      }
    }
    drama.forEach(d => EW.world.addNews(w, d.text, 'market'));
    return drama;
  }

  function leaderboard(w) { return eligible(w).slice().sort((a, b) => b.bid - a.bid || b.ovr - a.ovr); }
  function cutoff(w) { const b = leaderboard(w); return b[QUALIFY - 1] ? b[QUALIFY - 1].bid : 0; }
  function position(w, id) { return leaderboard(w).findIndex(p => p.id === id) + 1; }

  EW.market = { QUALIFY, valuate, breakdown, updateAll, leaderboard, cutoff, position, eligible };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.market;
})(typeof globalThis !== 'undefined' ? globalThis : this);
