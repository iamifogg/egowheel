/* EgoWheel — professional football life.
 * Season calendar (10 months), contracts, salary/bonuses/expenses through the ledger, routine
 * matches simulated between a handful of playable highlight fixtures, end-of-season awards,
 * transfers, sponsorships, reputation and retirement. The same rules power fast-forward and the
 * retirement simulation, so skipping never awards anything playing wouldn't.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const F = () => EW.finances, D = () => EW.data;
  const MONTHS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const ROLE_APPS = { starter: 0.95, rotation: 0.6, prospect: 0.35 };
  const GOAL_RATE = { CF: .55, WG: .34, AM: .32, CM: .14, DM: .06, FB: .05, CB: .07 };
  const ASSIST_RATE = { CF: .18, WG: .3, AM: .34, CM: .24, DM: .12, FB: .17, CB: .05 };
  const DEF_RATE = { CF: 1.4, WG: 2, AM: 2.1, CM: 4, DM: 6, FB: 5.3, CB: 6.8 };

  function club(name) { return D().PRO_CLUBS.find(c => c.name === name) || { name, prestige: 88, league: 'Europe' }; }
  function period(pro) { return 'S' + pro.season + '-' + MONTHS[pro.month] ; }

  function create(ctx) {
    const pro = { version: 1, club: null, age: ctx.age || 18, startAge: ctx.age || 18, season: 1, month: 0, contract: null,
      finances: F().ensure({ cash: 0 }), lifestyle: { home: 'dorm', owned: [], monthly: [], satisfaction: 0 }, reputation: { football: clamp(30 + (ctx.bidRank ? 23 - ctx.bidRank : 0), 15, 60), media: 25, conduct: 60 },
      managerTrust: 55, wellbeing: 60, sponsors: [], offers: [], history: [], seasonStats: blankSeason(), seasonLog: [], trainingBought: {}, freeTime: 0, honours: [], awards: [], transfers: [],
      obligationsDone: 0, retired: false, intlSelected: false };
    return pro;
  }
  function blankSeason() { return { apps: 0, g: 0, a: 0, d: 0, rt: 0, highlights: 0, points: 0, played: 0, cleanSheets: 0 }; }

  /** Market valuation in ¥m from the current profile. */
  function valuation(ctx, pro) {
    const s = pro ? pro.seasonStats : null, n = s && s.apps ? s.apps : 0;
    const perf = n ? ((s.rt / n) - 6.6) * 30 + s.g * 3 + s.a * 2 + s.d * 0.15 : 0;
    const age = pro ? pro.age : 18, ageF = age <= 23 ? 1.15 : age <= 27 ? 1 : age <= 30 ? 0.8 : 0.55;
    return Math.max(15, (Math.pow(Math.max(0, ctx.ovr - 60), 1.6) * 0.62 + clamp((ctx.pot || ctx.ovr) - ctx.ovr, 0, 15) * 0.9 + perf + (pro ? pro.reputation.football * 0.6 : 0)) * ageF + (ctx.bid || 0) * 0.35);
  }
  function roleFor(ovr, prestige) { return ovr >= prestige - 5 ? 'starter' : ovr >= prestige - 11 ? 'rotation' : 'prospect'; }

  /** Build 2–4 contract offers. Elite clubs pay more but promise less football. */
  function offers(pro, ctx, rng, opts = {}) {
    const val = valuation(ctx, pro), clubs = D().PRO_CLUBS.slice();
    const out = [], cur = opts.current;
    const candidates = rng.shuffle(clubs.filter(c => c.name !== cur && c.prestige <= ctx.ovr + 14 && c.prestige >= Math.min(92, ctx.ovr - 8)));
    const pickNames = [];
    if (opts.includeCurrent && cur) pickNames.push(cur);
    if (opts.nelClub && !pickNames.includes(opts.nelClub)) pickNames.push(opts.nelClub);
    for (const c of candidates) { if (pickNames.length >= (opts.count || 3)) break; if (!pickNames.includes(c.name)) pickNames.push(c.name); }
    if (pickNames.length < Math.min(2, opts.count || 3)) clubs.slice().sort((a, b) => a.prestige - b.prestige).forEach(c => { if (pickNames.length < Math.min(2, opts.count || 3) && c.name !== cur && !pickNames.includes(c.name)) pickNames.push(c.name); });
    pickNames.forEach((name, i) => {
      const c = club(name), role = roleFor(ctx.ovr, c.prestige);
      const prestigeF = 0.75 + (c.prestige - 80) / 40, roleF = role === 'starter' ? 1 : role === 'rotation' ? 0.92 : 0.8;
      const salary = Math.round(val * 1000 * 0.33 * prestigeF * roleF * (0.92 + rng.next() * 0.16) / 10) * 10;
      const years = role === 'prospect' ? 4 + Math.floor(rng.next() * 2) : 2 + Math.floor(rng.next() * 3);
      out.push({ id: 'off-' + pro.season + '-' + name.replace(/\W/g, '') + '-' + i, club: name, prestige: c.prestige, league: c.league, salary, years, role,
        signing: Math.round(salary * (opts.renewal && name === cur ? 0.05 : 0.12)), bonuses: { goal: Math.round(salary * 0.004), assist: Math.round(salary * 0.003), cleanSheet: Math.round(salary * 0.003), win: Math.round(salary * 0.001) },
        promise: role === 'starter' ? 'Guaranteed starter' : role === 'rotation' ? 'Squad rotation, chances to earn more' : 'Development role: fewer minutes',
        current: name === cur, rivals: [], partners: [] });
    });
    return out;
  }

  function sign(pro, offer) {
    const prev = pro.club;
    if (prev && prev !== offer.club) {
      const h = pro.history[pro.history.length - 1]; if (h && !h.to) h.to = pro.season - (pro.month > 0 ? 0 : 1);
      pro.transfers.push(prev + ' → ' + offer.club + ' (Age ' + pro.age + ')');
    }
    if (!pro.history.length || prev !== offer.club) pro.history.push({ club: offer.club, from: pro.season, to: null, apps: 0, g: 0, a: 0, d: 0, rt: 0, honours: [], how: prev ? (pro.transferRequest ? 'Transfer request' : 'Transfer') : 'First professional contract' });
    pro.club = offer.club;
    pro.contract = { id: offer.id, club: offer.club, salary: offer.salary, years: offer.years, endsSeason: pro.season + offer.years - 1, role: offer.role, bonuses: offer.bonuses, promise: offer.promise, signedSeason: pro.season };
    pro.managerTrust = offer.role === 'starter' ? 62 : offer.role === 'rotation' ? 50 : 42;
    pro.transferRequest = false; pro.offers = [];
    F().add(pro.finances, 'sign-' + offer.id, 'Signing bonus · ' + offer.club, offer.signing, 'contract', period(pro));
    return pro.contract;
  }

  /** Highlight fixtures for the coming season. ctx: {myClub, rivalClubs[], intl:{selected, tournament}} */
  function seasonFixtures(pro, ctx, rng) {
    const myC = club(pro.club), league = D().PRO_CLUBS.filter(c => c.name !== pro.club);
    const rivalClubs = (ctx.rivalClubs || []).filter(n => n !== pro.club);
    const pickOpp = (pref) => { const pool = pref && pref.length ? pref : league.map(c => c.name); return pool[Math.floor(rng.next() * pool.length)]; };
    const S = pro.season, base = 'Season ' + S, out = [];
    const strength = n => club(n).prestige + 2, own = myC.prestige + 2;
    const fx = (k, month, stage, opp, imp, extra = {}) => out.push(Object.assign({ id: 's' + S + '-' + k, stage, type: 'match', team: pro.club, opponent: opp, stars: [], strength: strength(opp), teamStrength: own, venue: base + ' · ' + MONTHS[month] + ' · ' + stage, importance: imp, season: S, month, pro: true }, extra));
    fx('l1', 0, 'League', pickOpp(), 1.45, { venue: base + ' · Opening Day' });
    fx('l2', 2, 'League', pickOpp(rivalClubs), 1.6, { venue: base + ' · ' + (rivalClubs.length ? 'Grudge Match' : 'Big Match') });
    if (ctx.intl?.window && ctx.intl.selected) fx('i1', 3, 'International', ctx.intl.windowOpp || 'South Korea', 1.6, { team: 'Japan', strength: 97, teamStrength: 98 });
    fx('l3', 4, 'League', pickOpp(rivalClubs), 1.55);
    if (myC.prestige >= 90 || ctx.ccQualified) {
      const ko = league.filter(c => c.prestige >= 92).map(c => c.name);
      fx('cq', 6, 'Champions Cup', pickOpp(rivalClubs.filter(n => club(n).prestige >= 90).concat(ko)), 1.8, { competition: 'Champions Cup ' + S, knockout: true, venue: base + ' · Champions Cup Quarter-Final' });
      fx('cs', 7, 'Champions Cup', pickOpp(ko), 1.9, { competition: 'Champions Cup ' + S, knockout: true, venue: base + ' · Champions Cup Semi-Final' });
      fx('cf', 9, 'Champions Cup', pickOpp(ko), 2.0, { competition: 'Champions Cup ' + S, knockout: true, final: true, venue: base + ' · Champions Cup Final' });
    }
    fx('l4', 8, 'League', pickOpp(), 1.7, { venue: base + ' · Title Run-In', leagueDecider: true });
    if (ctx.intl?.tournament && ctx.intl.selected) {
      const t = ctx.intl.tournament, tn = t.name + ' ' + S, nat = t.u20 ? 'Japan U-20' : 'Japan', senior = t.name === 'Senior World Cup';
      const sb = t.u20 ? 95 : senior ? 104 : 96, team = t.u20 ? 96 : senior ? 98 : 98;
      const opps = t.opps;
      out.push(...[
        { k: 'tg', st: 'Group', opp: opps[0], s: sb, imp: 1.75 },
        { k: 'tq', st: 'Quarter-Final', opp: opps[1], s: sb + 2, imp: 1.9, ko: true },
        { k: 'ts', st: 'Semi-Final', opp: opps[2], s: sb + 4, imp: 2.0, ko: true },
        { k: 'tf', st: 'Final', opp: opps[3], s: sb + (senior ? 8 : 6), imp: 2.15, ko: true, fin: true }
      ].map(x => ({ id: 's' + S + '-' + x.k, stage: t.name, type: 'match', team: nat, opponent: x.opp, stars: [], strength: x.s, teamStrength: team, venue: tn + ' · ' + x.st, importance: x.imp, season: S, month: 9, pro: true, competition: x.ko ? tn : undefined, knockout: !!x.ko, final: !!x.fin, international: true })));
    }
    out.sort((a, b) => a.month - b.month);
    return out;
  }

  function tournamentFor(pro) {
    if (pro.season === 1 && pro.age <= 20) return { name: 'U-20 World Cup', u20: true, opps: ['Germany U-20', 'England U-20', 'France U-20', 'Spain U-20'] };
    if (pro.season % 4 === 0) return { name: 'Senior World Cup', opps: ['Brazil', 'Germany', 'France', 'World Champions'] };
    if (pro.season % 4 === 2) return { name: 'Asian Cup', opps: ['Saudi Arabia', 'Iran', 'Australia', 'South Korea'] };
    return null;
  }

  /** Simulate one appearance (routine or skipped highlight). Returns {r,g,a,d,played}. */
  function simAppearance(ctx, pro, rng, imp = 1) {
    const roleApps = ROLE_APPS[pro.contract?.role || 'rotation'];
    if (rng.next() > roleApps) return { played: false };
    const pos = ctx.pos || 'CF', ovr = ctx.ovr, lg = club(pro.club).prestige - 2;
    const r = clamp(rng.normal(6.6 + (ovr - lg) * 0.045 + (ctx.form || 0) * 0.12 + (pro.wellbeing - 60) / 200, 0.65), 4.2, 9.8);
    const q = Math.max(0.3, (ovr - 60) / 25) * (0.7 + (r - 6) * 0.25);
    const g = poisson(rng, GOAL_RATE[pos] * q), a = poisson(rng, ASSIST_RATE[pos] * q), d = poisson(rng, DEF_RATE[pos] * clamp(ovr / 80, 0.7, 1.3));
    return { played: true, r, g, a, d };
  }
  function poisson(rng, l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rng.next(); } while (p > L && k < 12); return k - 1; }

  function recordApp(pro, app, win, cleanSheet) {
    const s = pro.seasonStats, h = pro.history[pro.history.length - 1];
    const rt = pro.routineTotals || (pro.routineTotals = { apps: 0, g: 0, a: 0, d: 0, rt: 0 });
    rt.apps++; rt.g += app.g; rt.a += app.a; rt.d += app.d; rt.rt += app.r;
    s.apps++; s.g += app.g; s.a += app.a; s.d += app.d; s.rt += app.r; if (cleanSheet) s.cleanSheets++;
    if (h) { h.apps++; h.g += app.g; h.a += app.a; h.d += app.d; h.rt += app.r; }
    const b = pro.contract?.bonuses || {}, id = 'b-' + pro.season + '-' + pro.month + '-' + s.apps;
    const bonus = app.g * (b.goal || 0) + app.a * (b.assist || 0) + (cleanSheet ? b.cleanSheet || 0 : 0) + (win ? b.win || 0 : 0);
    if (bonus > 0) F().add(pro.finances, id, 'Performance bonuses', bonus, 'bonus', period(pro));
    pro.managerTrust = clamp(pro.managerTrust + (app.r - 6.7) * 2.2, 0, 100);
    pro.reputation.football = clamp(pro.reputation.football + (app.r - 6.8) * 0.5 + app.g * 0.3, 0, 100);
  }

  /** One month of professional life: routine fixtures, salary, expenses, sponsors, wellbeing. */
  function monthTick(pro, ctx, rng) {
    const per = period(pro), f = pro.finances, lg = club(pro.club).prestige;
    const sal = pro.contract ? Math.round(pro.contract.salary / 10) : 0;
    if (sal) { F().add(f, 'sal-' + per, 'Salary · ' + pro.club, sal, 'salary', per); F().add(f, 'agent-' + per, 'Agent fee (4%)', -Math.round(sal * 0.04), 'fees', per); }
    const home = D().HOUSING.find(h => h.id === pro.lifestyle.home) || D().HOUSING[0];
    if (home.rent) F().add(f, 'rent-' + per, 'Rent · ' + home.name, -home.rent, 'housing', per);
    let upkeep = 0; pro.lifestyle.owned.forEach(id => { const it = D().ITEMS.find(x => x.id === id); if (it?.upkeep) upkeep += it.upkeep; if (it?.monthly) upkeep += it.monthly; });
    if (upkeep) F().add(f, 'upk-' + per, 'Upkeep & services', -upkeep, 'lifestyle', per);
    F().add(f, 'living-' + per, 'Living costs', -Math.round(40 + home.comfort * 25 + pro.lifestyle.satisfaction * 15), 'living', per);
    pro.sponsors.forEach(sp => F().add(f, 'sp-' + sp.id + '-' + per, 'Sponsor · ' + sp.brand, sp.monthly, 'sponsor', per));
    // routine league matches (≈4 per month)
    let pts = 0;
    for (let i = 0; i < 4; i++) {
      const res = rng.next(), strengthEdge = (lg - 92) * 0.02 + (ctx.ovr - lg) * 0.008;
      const outcome = res < 0.45 + strengthEdge ? 'W' : res < 0.72 + strengthEdge * 0.5 ? 'D' : 'L';
      pts += outcome === 'W' ? 3 : outcome === 'D' ? 1 : 0; pro.seasonStats.played++;
      const app = simAppearance(ctx, pro, rng, 1);
      if (app.played) recordApp(pro, app, outcome === 'W', outcome !== 'L' && rng.next() < 0.4);
    }
    pro.seasonStats.points += pts;
    // wellbeing & reputation drift
    const satisfaction = pro.lifestyle.satisfaction;
    const target = 50 + home.comfort * 5 + satisfaction * 3 - (ctx.stress || 0) / 3 + (pro.socialRecent ? 6 : 0);
    pro.wellbeing = clamp(Math.round(pro.wellbeing * 0.7 + target * 0.3), 0, 100);
    pro.reputation.media = clamp(pro.reputation.media * 0.98 + home.image * 0.4 + pro.sponsors.reduce((t, s) => t + s.media * 0.05, 0), 0, 100);
    pro.socialRecent = false;
    pro.month++;
  }

  /** End of season: table position, trophies, awards, contract clock, offers, sponsors. Returns a summary. */
  function seasonEnd(pro, ctx, rng) {
    const s = pro.seasonStats, lg = club(pro.club).prestige, gp = Math.max(1, s.played);
    const ppg = s.points / gp + (ctx.ovr - lg) * 0.01 + (s.apps ? (s.rt / s.apps - 6.7) * 0.15 : 0);
    const position = clamp(Math.round(10 - ppg * 4.2 + (lg - 90) * -0.35 + rng.normal(0, 1.2)), 1, 18);
    const honours = [], awards = [];
    if (position === 1) honours.push('League Title — ' + pro.club);
    if (rng.next() < clamp(0.08 + (lg - 88) * 0.02 + (position <= 4 ? 0.08 : 0), 0.04, 0.35)) honours.push('Domestic Cup — ' + pro.club);
    const avg = s.apps ? s.rt / s.apps : 0;
    if (s.g >= 25) awards.push('Golden Boot');
    if (['CB', 'DM', 'FB'].includes(ctx.pos) && s.d >= s.apps * 4.5 && avg >= 7.3) awards.push('Defender of the Year');
    if (avg >= 7.6 && s.apps >= 20 && rng.next() < 0.5) awards.push('League Player of the Year');
    if (ctx.ovr >= 92 && avg >= 7.4 && rng.next() < 0.45) awards.push('World Best XI');
    if (ctx.ovr >= 96 && avg >= 7.8 && rng.next() < 0.25) awards.push('World Player of the Year');
    honours.forEach(h => pro.honours.push(h + ' (Age ' + pro.age + ')'));
    awards.forEach(a => pro.awards.push(a + ' — Age ' + pro.age));
    const h = pro.history[pro.history.length - 1]; if (h) h.honours.push(...honours.map(x => x.split(' — ')[0] + ' ' + pro.season));
    pro.reputation.football = clamp(pro.reputation.football + honours.length * 4 + awards.length * 5 + (position <= 3 ? 3 : 0), 0, 100);
    // sponsor obligations
    const owed = pro.sponsors.reduce((t, sp) => t + sp.obligations, 0), unmet = Math.max(0, owed - pro.obligationsDone);
    const dropped = [];
    if (unmet > 0) { const sp = pro.sponsors.sort((a, b) => b.obligations - a.obligations)[0]; if (sp) { dropped.push(sp.brand); pro.sponsors = pro.sponsors.filter(x => x !== sp); pro.reputation.conduct = clamp(pro.reputation.conduct - 6, 0, 100); } }
    pro.sponsors = pro.sponsors.filter(sp => sp.untilSeason > pro.season);
    const summary = { season: pro.season, age: pro.age, club: pro.club, position, apps: s.apps, g: s.g, a: s.a, d: s.d, avg: s.apps ? +(avg).toFixed(2) : 0, honours, awards, ovr: ctx.ovr,
      income: F().summary(pro.finances, 'S' + pro.season + '-'), droppedSponsors: dropped };
    pro.seasonLog.push(summary);
    pro.lastPosition = position;
    // offers & sponsors for next season
    const expiring = pro.contract && pro.contract.endsSeason <= pro.season;
    const wantsMove = pro.transferRequest || expiring || (avg >= 7.5 && rng.next() < 0.6) || rng.next() < 0.25;
    pro.offers = wantsMove ? offers(pro, ctx, rng, { current: pro.club, includeCurrent: expiring || !pro.transferRequest, renewal: true, count: expiring ? 3 : 2 }).filter(o => !(o.current && pro.transferRequest)) : [];
    pro.sponsorOffers = sponsorOffers(pro, ctx, rng);
    pro.seasonStats = blankSeason(); pro.month = 0; pro.season++; pro.age++; pro.obligationsDone = 0;
    return summary;
  }

  function sponsorOffers(pro, ctx, rng) {
    const appeal = pro.reputation.football * 0.55 + pro.reputation.media * 0.45, have = pro.sponsors.map(s => s.id);
    return D().SPONSORS.filter(sp => !have.includes(sp.id) && appeal >= sp.tier * 16 && rng.next() < 0.55).slice(0, 2).map(sp => Object.assign({}, sp, { offerId: 'sp-' + pro.season + '-' + sp.id, years: 1 + Math.floor(rng.next() * 3) }));
  }
  function acceptSponsor(pro, sp) {
    if (pro.sponsors.some(x => x.id === sp.id)) return false;
    pro.sponsors.push({ id: sp.id, brand: sp.brand, monthly: sp.monthly, obligations: sp.obligations, media: sp.media, untilSeason: pro.season + (sp.years || 1) - 1, perfBonus: !!sp.perfBonus });
    pro.reputation.media = clamp(pro.reputation.media + sp.media, 0, 100);
    return true;
  }

  function canRetire(pro) { return pro.age >= 32 || pro.retireSuggested; }
  function mustRetire(pro, ovr) { return pro.age >= 38 || (pro.age >= 34 && ovr < 72); }

  /** Age curve applied at season end (returns OVR delta for the protagonist). */
  function ageDelta(age, rng, physical) {
    if (age <= 23) return rng.next() < 0.5 ? 1 : 0;
    if (age <= 28) return rng.next() < 0.3 ? 1 : 0;
    if (age <= 31) return rng.next() < 0.35 ? -1 : 0;
    return -(1 + (rng.next() < 0.5 ? 1 : 0) + (physical < 65 && age >= 33 ? 1 : 0));
  }

  EW.pro = { MONTHS, create, valuation, roleFor, offers, sign, seasonFixtures, tournamentFor, simAppearance, recordApp, monthTick, seasonEnd, sponsorOffers, acceptSponsor, canRetire, mustRetire, ageDelta, club, period, blankSeason };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.pro;
})(typeof globalThis !== 'undefined' ? globalThis : this);
