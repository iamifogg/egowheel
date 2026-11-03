/* Balance report: autoplays many careers across every position and prints outcome distributions.
 * Usage: node tests/balance-report.js [careers=126]   (npm run balance) */
'use strict';
const { playCareer } = require('./autoplay');
const N = Number(process.argv[2] || 126);
const POS = ['Centre Forward', 'Second Striker', 'Left Wing', 'Right Wing', 'False Nine', 'Attacking Midfielder', 'Target Forward', 'Pressing Forward',
  'Central Midfielder', 'Defensive Midfielder', 'Left Back', 'Right Back', 'Left Wing-Back', 'Right Wing-Back', 'Centre Back', 'Ball-Playing Centre Back', 'Stopper', 'Sweeper'];
const pct = (a, b) => (b ? (a / b * 100).toFixed(1) + '%' : '—');
const q = (arr, p) => { const a = arr.slice().sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null; };
const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length) : 0;
const status = {}, gate = {}, byGroup = {}, ovrStart = [], ovrEnd = [], bids = [], events = {};
let matches = 0, offs = 0, flow = 0, duels = 0, reachedNEL = 0, qualifiedNEL = 0, worldCup = 0, careers = 0, scenes = 0, fixtures = 0, maxStreak = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const positionName = POS[i % POS.length];
  let first = true, streak = 0;
  const r = playCareer({ seed: 'bal-' + i, positionName, continuePro: true, onMatch(rep, s, api) {
    if (first) { ovrStart.push(api.overall()); first = false; }
    if (rep.type !== 'match') return;
    matches++;
    const g = s.run.career.world.players.me.pos;
    const b = byGroup[g] = byGroup[g] || { n: 0, rating: [], goals: 0, assists: 0, def: 0, apps: 0, careers: new Set(), elim: 0, nel: 0 };
    b.rating.push(rep.rating); b.goals += rep.goals; b.assists += rep.assists; b.apps++; b.careers.add(i);
    b.def += (rep.tackles || 0) + (rep.interceptions || 0) + (rep.blocks || 0) + (rep.clearances || 0) + (rep.recoveries || 0);
    if (rep.contributionLabels.includes('Forced Off Injured')) { offs++; streak++; maxStreak = Math.max(maxStreak, streak); } else streak = 0;
    if (rep.flow) flow++; if (rep.duel) duels++;
  } });
  careers++;
  const c = r.state.run.career, st = (c.finalStatus || 'UNFINISHED').replace(/\s*\(.*\)/, '');
  status[st] = (status[st] || 0) + 1;
  if (c.eliminated) gate[st] = (gate[st] || 0) + 1;
  ovrEnd.push(r.api.overall());
  const g = c.world?.players.me.pos;
  if (g && byGroup[g]) { if (c.eliminated) byGroup[g].elim++; if (c.world.nel) byGroup[g].nel++; }
  if (c.world?.nel) { reachedNEL++; bids.push(c.world.players.me.bid); if (!c.eliminated || c.postNelStarted) qualifiedNEL++; }
  if ((c.trophies || []).includes('Senior World Cup')) worldCup++;
  (c.events?.history || []).forEach(e => { events[e.id] = (events[e.id] || 0) + 1; scenes++; });
  fixtures += c.fxNo || 0;
}
console.log('\n=== EgoWheel balance report: ' + careers + ' careers, ' + matches + ' matches (' + ((Date.now() - t0) / 1000).toFixed(0) + 's) ===');
console.log('\nFinal status:'); Object.entries(status).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k.padEnd(40) + v + '  ' + pct(v, careers)));
console.log('\nReached NEL: ' + pct(reachedNEL, careers) + ' · qualified top 23 (of those): ' + pct(qualifiedNEL, reachedNEL) + ' · Senior World Cup won: ' + pct(worldCup, careers));
console.log('Match-ending injuries: ' + pct(offs, matches) + ' (longest streak ' + maxStreak + ') · Flow: ' + pct(flow, matches) + ' · Duels: ' + pct(duels, matches));
console.log('Scenes per fixture: ' + (scenes / Math.max(1, fixtures)).toFixed(2));
console.log('OVR start p10/50/90: ' + [q(ovrStart, .1), q(ovrStart, .5), q(ovrStart, .9)].join('/') + ' · end: ' + [q(ovrEnd, .1), q(ovrEnd, .5), q(ovrEnd, .9)].join('/'));
console.log('Final NEL bids p10/50/90: ¥' + [q(bids, .1), q(bids, .5), q(bids, .9)].join('m/¥') + 'm');
console.log('\nBy position group:  careers  elim%  NEL%  avgRating  goals/app  assists/app  def/app');
Object.entries(byGroup).forEach(([g, b]) => console.log('  ' + g.padEnd(4) + String(b.careers.size).padStart(9) + pct(b.elim, b.careers.size).padStart(8) + pct(b.nel, b.careers.size).padStart(7) + avg(b.rating).toFixed(2).padStart(10) + (b.goals / b.apps).toFixed(2).padStart(11) + (b.assists / b.apps).toFixed(2).padStart(12) + (b.def / b.apps).toFixed(1).padStart(9)));
console.log('\nEvents fired:'); Object.entries(events).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k.padEnd(22) + v));
