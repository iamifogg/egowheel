/* EgoWheel — the living Blue Lock ecosystem.
 *
 * ~300 persistent participants (named characters + seeded procedural egoists) who play,
 * develop, rank, get eliminated and sign for NEL clubs alongside the protagonist ('me').
 * Background matches use a light abstract model; the protagonist's own fixtures are
 * recorded from the real wheel results so the world stays consistent with what happened.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const r1 = n => Math.round(n * 10) / 10;

  const POS_GROUP = {
    'Centre Forward': 'CF', 'Target Forward': 'CF', 'Pressing Forward': 'CF',
    'Second Striker': 'AM', 'False Nine': 'AM', 'Attacking Midfielder': 'AM',
    'Left Wing': 'WG', 'Right Wing': 'WG',
    'Central Midfielder': 'CM', 'Defensive Midfielder': 'DM',
    'Left Back': 'FB', 'Right Back': 'FB', 'Left Wing-Back': 'FB', 'Right Wing-Back': 'FB',
    'Centre Back': 'CB', 'Ball-Playing Centre Back': 'CB', 'Stopper': 'CB', 'Sweeper': 'CB'
  };
  const GROUP_LABEL = { CF: 'Forward', WG: 'Winger', AM: 'Attacking Mid', CM: 'Midfielder', DM: 'Holding Mid', FB: 'Full-Back', CB: 'Centre-Back' };
  const GOAL_RATE = { CF: .58, WG: .34, AM: .3, CM: .14, DM: .06, FB: .05, CB: .06 };
  const ASSIST_RATE = { CF: .2, WG: .3, AM: .36, CM: .26, DM: .12, FB: .18, CB: .05 };
  const DEF_RATE = { CF: 1.4, WG: 2.0, AM: 2.2, CM: 4.0, DM: 6.0, FB: 5.4, CB: 7.0 };
  // "Ego's evaluation" weights per position: what a strong match looks like for that role.
  const EVAL = {
    CF: { g: 1.0, a: .65, d: .1 }, WG: { g: 1.05, a: .75, d: .12 }, AM: { g: 1.15, a: .8, d: .12 },
    CM: { g: 1.35, a: .85, d: .15 }, DM: { g: 1.5, a: .9, d: .17 }, FB: { g: 1.5, a: .85, d: .17 }, CB: { g: 1.55, a: .95, d: .19 }
  };
  const TEMPLATE = ['CF', 'CF', 'WG', 'WG', 'AM', 'CM', 'CM', 'DM', 'FB', 'FB', 'CB', 'CB'];
  const BUILDINGS = { 1: ['Team A', 'Team B', 'Team C', 'Team D', 'Team E'], 2: ['Team F', 'Team G', 'Team H', 'Team I', 'Team J'],
    3: ['Team K', 'Team L', 'Team M', 'Team N', 'Team O'], 4: ['Team P', 'Team Q', 'Team R', 'Team S', 'Team T'], 5: ['Team V', 'Team W', 'Team X', 'Team Y', 'Team Z'] };
  const PRO_WEAPONS = { CF: ['Direct Shot', 'Power Shot', 'Off-Ball Movement', 'Predator Finishing'], WG: ['Acceleration', 'Creative Dribbling', 'Cutback Delivery'],
    AM: ['Ball Control', 'Puppet Passing', 'Third-Man Run'], CM: ['One-Touch Passing', 'Vertical Laser Pass', 'Pressing Sense'], DM: ['Passing-Lane Reading', 'Counter-Pressing'],
    FB: ['Overlap & Recover', 'Cutback Delivery', 'Pressing Sense'], CB: ['Perfect Duel Sense', 'Vertical Leap', 'Passing-Lane Reading'] };
  const STRENGTH_TAG = { CF: ['finishing', 'shot power', 'movement'], WG: ['pace', 'dribbling', 'crossing'], AM: ['vision', 'touch', 'creativity'],
    CM: ['passing', 'stamina', 'tempo'], DM: ['reading', 'tackling', 'screening'], FB: ['recovery pace', 'overlaps', 'duels'], CB: ['aerials', 'tackling', 'positioning'] };
  const WEAK_TAG = ['weak foot', 'composure', 'pace', 'physicality', 'decision-making', 'concentration', 'first touch', 'stamina'];

  function poisson(rng, lambda) { const L = Math.exp(-lambda); let k = 0, p = 1; do { k++; p *= rng.next(); } while (p > L && k < 12); return k - 1; }
  function groupOf(positionName) { return POS_GROUP[positionName] || 'CF'; }
  const blankStats = () => ({ apps: 0, g: 0, a: 0, d: 0, rt: 0 });

  function makeProcedural(rng, used, pos, base, team, building, idx) {
    let name, guard = 0;
    do { name = rng.pick(EW.data.GIVEN) + ' ' + rng.pick(EW.data.FAMILY); } while (used.has(name) && guard++ < 50);
    used.add(name);
    const ovr = clamp(r1(rng.normal(base - 3, 4.2)), 44, 75);
    const pot = clamp(Math.round(ovr + 8 + rng.normal(10, 6)), Math.round(ovr) + 3, 93);
    const dev = rng.pick(['steady', 'steady', 'steady', 'late', 'explosive', 'adaptive', 'volatile']);
    return { id: 'p' + idx, name, short: name.split(' ')[1], named: false, tier: 3, pos, role: GROUP_LABEL[pos], ovr, pot, ego: Math.round(clamp(rng.normal(65, 12), 30, 95)),
      pers: 'procedural', dev, weapon: rng.pick(PRO_WEAPONS[pos]), strength: rng.pick(STRENGTH_TAG[pos]), weakness: rng.pick(WEAK_TAG),
      team, building, club: null, status: 'active', blueLock: true, form: 0, conf: 55, st: blankStats(), ss: blankStats(), last: null,
      rank: null, prevRank: null, best: null, bid: 0, prevBid: 0, bidClub: null, bids: [], ms: [] };
  }
  function fromCharacter(c) {
    return { id: c.id, name: c.name, short: c.short, named: true, tier: c.tier, pos: c.pos, role: c.role, arch: c.arch, ovr: c.ovr, pot: c.pot, ego: c.ego,
      pers: c.pers, dev: c.dev, weapon: c.weapon, team: c.team, building: null, club: c.blueLock ? null : c.nel, nelPref: c.nel, prof: c.prof,
      status: c.blueLock ? (c.joinsAt ? 'waiting' : 'active') : 'external', blueLock: !!c.blueLock, joinsAt: c.joinsAt || null,
      form: 0, conf: 60, st: blankStats(), ss: blankStats(), last: null, rank: null, prevRank: null, best: null, bid: 0, prevBid: 0, bidClub: null, bids: [], ms: [] };
  }

  /**
   * Create the world. opts: { protagonist: {name, positionName, ovr, team}, teamStrengths: {'Team Z': 61, ...} }
   */
  function create(rng, opts) {
    const w = { v: 1, players: {}, teams: {}, buildings: BUILDINGS, stage: 'first', round: 0, news: [], rankings: [], nel: null, cast: {}, log: [] };
    const used = new Set(EW.data.CHARACTERS.map(c => c.name));
    const me = opts.protagonist;
    // Named characters
    for (const c of EW.data.CHARACTERS) w.players[c.id] = fromCharacter(c);
    // Teams
    let idx = 0;
    for (const [b, names] of Object.entries(BUILDINGS)) {
      for (const tn of names) {
        const base = opts.teamStrengths?.[tn] ?? clamp(Math.round(rng.normal(62, 4)), 55, 70);
        const ids = Object.values(w.players).filter(p => p.team === tn && p.blueLock && p.status !== 'waiting').map(p => p.id);
        ids.forEach(id => { w.players[id].building = Number(b); });
        const slots = TEMPLATE.slice();
        ids.forEach(id => { const k = slots.indexOf(w.players[id].pos); if (k >= 0) slots.splice(k, 1); else slots.pop(); });
        if (tn === me.team) { const k = slots.indexOf(groupOf(me.positionName)); slots.splice(k >= 0 ? k : slots.length - 1, 1); ids.push('me'); }
        for (const pos of slots) { const p = makeProcedural(rng, used, pos, base, tn, Number(b), idx++); w.players[p.id] = p; ids.push(p.id); }
        w.teams[tn] = { name: tn, building: Number(b), ids, base, pts: 0, gf: 0, ga: 0, w: 0, d: 0, l: 0, played: [] };
      }
    }
    w.players.me = { id: 'me', name: me.name, short: me.name.split(' ').slice(-1)[0], named: false, tier: 0, isMe: true, pos: groupOf(me.positionName), role: me.positionName,
      ovr: me.ovr, pot: me.ovr, ego: 70, pers: 'me', dev: 'me', weapon: me.weapon || '—', team: me.team, building: 5, club: null, status: 'active', blueLock: true,
      form: 0, conf: 55, st: blankStats(), ss: blankStats(), last: null, rank: null, prevRank: null, best: null, bid: 0, prevBid: 0, bidClub: null, bids: [], ms: [] };
    for (const t of Object.values(w.teams)) t.strength = teamStrength(w, t.ids, opts.teamStrengths?.[t.name]);
    w.schedule = buildFirstSelectionSchedule(w, rng, me.team, opts.myOrder);
    computeRankings(w);
    w.players.me.prevRank = w.players.me.rank;
    return w;
  }

  function teamStrength(w, ids, fixed) {
    if (fixed) return fixed;
    const ovrs = ids.map(id => w.players[id]?.ovr || 60).sort((a, b) => b - a).slice(0, 9);
    return r1(ovrs.reduce((s, x) => s + x, 0) / Math.max(1, ovrs.length) + 1);
  }

  // Four rounds; the protagonist's team plays its listed order. Other pairings are spread over rounds.
  function buildFirstSelectionSchedule(w, rng, myTeam, myOrder) {
    const rounds = [[], [], [], []];
    for (const [b, names] of Object.entries(BUILDINGS)) {
      const pairs = [];
      for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) pairs.push([names[i], names[j]]);
      if (names.includes(myTeam)) {
        const order = myOrder || names.filter(n => n !== myTeam);
        const mine = order.map(o => pairs.find(p => p.includes(myTeam) && p.includes(o)));
        const rest = pairs.filter(p => !mine.includes(p));
        mine.forEach((p, i) => rounds[i].push({ a: p[0], b: p[1], mine: true }));
        // Pair the others so no team plays twice in a round.
        rng.shuffle(rest).forEach(p => {
          let best = 0, bestLoad = 99;
          for (let r = 0; r < 4; r++) {
            const busy = rounds[r].some(x => x.a === p[0] || x.b === p[0] || x.a === p[1] || x.b === p[1]);
            if (!busy && rounds[r].length < bestLoad) { best = r; bestLoad = rounds[r].length; }
          }
          rounds[best].push({ a: p[0], b: p[1] });
        });
      } else {
        rng.shuffle(pairs).forEach((p, i) => rounds[i % 4].push({ a: p[0], b: p[1] }));
      }
    }
    return rounds;
  }

  function addNews(w, text, tag, fx) {
    w.news.unshift({ text, tag: tag || 'world', fx: fx ?? w.round });
    w.news = w.news.slice(0, 40);
  }

  function evalValue(p, g, a, d, rating) {
    const e = EVAL[p.pos] || EVAL.CF;
    return g * e.g + a * e.a + d * e.d + (rating - 6.5) * 1.2;
  }

  function applyPerformance(w, p, perf, ctx) {
    if (!p) return;
    const s = p.st, ss = p.ss;
    for (const o of [s, ss]) { o.apps++; o.g += perf.g; o.a += perf.a; o.d += perf.d; o.rt += perf.r; }
    if (ctx.nel) { p.nel = p.nel || blankStats(); p.nel.apps++; p.nel.g += perf.g; p.nel.a += perf.a; p.nel.d += perf.d; p.nel.rt += perf.r;
      p.nelLog = (p.nelLog || []).concat([{ r: perf.r, v: evalValue(p, perf.g, perf.a, perf.d, perf.r), opp: ctx.oppStrength || 85 }]).slice(-10); }
    p.last = { r: r1(perf.r), g: perf.g, a: perf.a, d: perf.d, opp: ctx.oppName || null };
    p.form = r1(clamp(p.form * 0.6 + (perf.r - 6.6) * 0.9, -3, 3));
    p.conf = Math.round(clamp(p.conf + (perf.r - 6.6) * 5, 10, 99));
    if (!p.isMe) develop(w, p, perf, ctx);
    if (!p.isMe && (perf.g >= 3 || perf.r >= 9.2)) {
      const line = perf.g >= 3 ? p.name + ' scores a hat-trick' + (ctx.oppName ? ' against ' + ctx.oppName : '') + '.' : p.name + ' produces a ' + perf.r.toFixed(1) + ' masterclass.';
      addNews(w, line, p.named ? 'star' : 'rise');
      if (p.ms.length < 6) p.ms.push(line);
    }
  }

  function develop(w, p, perf, ctx) {
    const head = Math.max(0, p.pot - p.ovr);
    const stageMult = { first: 1, second: 1.1, third: 1.15, u20: 1.1, nel: 1.25, pro: .9 }[w.stage] || 1;
    let gain = head * (0.018 + Math.max(0, perf.r - 6.4) * 0.014) * stageMult;
    if (p.dev === 'explosive') gain *= ['first', 'second'].includes(w.stage) ? 1.45 : 1.05;
    if (p.dev === 'late') gain *= ['nel', 'pro'].includes(w.stage) ? 1.55 : 0.7;
    if (p.dev === 'volatile') gain += ctx.rng.normal(0, 0.45);
    if (p.dev === 'adaptive' && perf.r < 6.1 && ctx.rng.chance(0.3)) {
      const leap = Math.min(head, 1.2 + ctx.rng.next() * 1.8);
      gain += leap;
      if (p.named && leap > 1.6) addNews(w, p.name + ' looks different after a bruising defeat — something has evolved.', 'evolution');
    }
    p.ovr = r1(clamp(p.ovr + gain, 35, Math.max(p.ovr, p.pot)));
  }

  function distribute(rng, w, ids, count, rateTable, exclude) {
    const out = [];
    const pool = ids.map(id => w.players[id]).filter(p => p && p.id !== exclude);
    for (let i = 0; i < count; i++) {
      const p = rng.weighted(pool, q => rateTable[q.pos] * Math.pow(Math.max(30, q.ovr) / 70, 3) * (1 + q.form * 0.08) * (q.isMe ? 0 : 1));
      out.push(p ? p.id : null);
    }
    return out;
  }

  function ratePlayer(rng, p, g, a, d, result, cleanSheet, oppStrength) {
    const defScale = { CB: 1.25, DM: 1.15, FB: 1.1, CM: 1, AM: .8, WG: .8, CF: .7 }[p.pos] || 1;
    let r = 6.3 + 0.95 * g + 0.6 * a + 0.11 * d * defScale + (result > 0 ? .25 : result < 0 ? -.2 : 0) + (p.ovr - oppStrength) * 0.025 + rng.normal(0, 0.5);
    if (cleanSheet && ['CB', 'DM', 'FB'].includes(p.pos)) r += 0.45;
    return clamp(r, 4.3, 9.9);
  }

  /** Simulate a background match between two id lists. Returns {ga, gb, scorers:{A:[],B:[]}} */
  function simulateMatch(w, rng, idsA, idsB, sA, sB, ctx = {}) {
    const lA = clamp(1.25 + (sA - sB) / 14, .25, 3.5), lB = clamp(1.25 + (sB - sA) / 14, .25, 3.5);
    const ga = poisson(rng, lA), gb = poisson(rng, lB);
    const res = { ga, gb, scorers: { A: [], B: [] } };
    for (const [ids, goals, conceded, side, opp, oppName] of [[idsA, ga, gb, 'A', sB, ctx.nameB], [idsB, gb, ga, 'B', sA, ctx.nameA]]) {
      const perf = {};
      ids.forEach(id => { perf[id] = { g: 0, a: 0, d: 0 }; });
      const scorers = distribute(rng, w, ids, goals, GOAL_RATE);
      scorers.forEach(id => {
        if (!id) return; perf[id].g++;
        let assist = null;
        if (rng.chance(0.75)) { assist = distribute(rng, w, ids, 1, ASSIST_RATE, id)[0]; if (assist) perf[assist].a++; }
        res.scorers[side].push({ id, assist });
      });
      const result = Math.sign(goals - conceded);
      ids.forEach(id => {
        const p = w.players[id]; if (!p || p.isMe) return;
        perf[id].d = poisson(rng, DEF_RATE[p.pos] * clamp(p.ovr / 70, .7, 1.4));
        perf[id].r = ratePlayer(rng, p, perf[id].g, perf[id].a, perf[id].d, result, conceded === 0, opp);
        applyPerformance(w, p, perf[id], { rng, oppName, oppStrength: opp, nel: ctx.nel });
      });
    }
    return res;
  }

  /**
   * Record the protagonist's real fixture. mySide/oppSide are id lists (mySide includes 'me').
   * rep: protagonist report. Returns {scorers: [{id,name,assist}], oppScorers, standout}
   */
  function recordProtagonistMatch(w, rng, mySide, oppSide, rep, ctx = {}) {
    const res = { scorers: [], oppScorers: [], standout: null };
    const teamGoals = rep.teamGoals || 0, oppGoals = rep.oppGoals || 0;
    const mates = mySide.filter(id => id !== 'me' && w.players[id]);
    const perf = {};
    mates.concat(oppSide).forEach(id => { perf[id] = { g: 0, a: 0, d: 0 }; });
    const mateGoals = Math.max(0, teamGoals - (rep.goals || 0));
    const mateScorers = mates.length ? distribute(rng, w, mates, mateGoals, GOAL_RATE) : [];
    let myAssists = rep.assists || 0;
    mateScorers.forEach(id => {
      if (!id) return; perf[id].g++;
      let assist = null;
      if (myAssists > 0) { assist = 'me'; myAssists--; }
      else if (rng.chance(0.7)) { assist = distribute(rng, w, mates, 1, ASSIST_RATE, id)[0]; if (assist) perf[assist].a++; }
      res.scorers.push({ id, name: w.players[id].name, assist });
    });
    for (let i = 0; i < (rep.goals || 0); i++) {
      let assist = null;
      if (mates.length && rng.chance(0.65)) { assist = distribute(rng, w, mates, 1, ASSIST_RATE)[0]; if (assist) perf[assist].a++; }
      res.scorers.push({ id: 'me', name: w.players.me.name, assist });
    }
    const oppScorers = oppSide.length ? distribute(rng, w, oppSide, oppGoals, GOAL_RATE) : [];
    oppScorers.forEach(id => { if (!id) return; perf[id].g++; let assist = null; if (rng.chance(0.7)) { assist = distribute(rng, w, oppSide, 1, ASSIST_RATE, id)[0]; if (assist) perf[assist].a++; } res.oppScorers.push({ id, name: w.players[id].name, assist }); });
    const myDef = (rep.tackles || 0) + (rep.interceptions || 0) + (rep.blocks || 0) + (rep.clearances || 0) + (rep.recoveries || 0);
    const myResult = Math.sign(teamGoals - oppGoals);
    let best = null;
    for (const [ids, result, conceded, opp, oppName] of [[mates, myResult, oppGoals, ctx.oppStrength || 70, ctx.oppName], [oppSide, -myResult, teamGoals, ctx.myStrength || 70, ctx.myName]]) {
      ids.forEach(id => {
        const p = w.players[id];
        perf[id].d = poisson(rng, DEF_RATE[p.pos] * clamp(p.ovr / 70, .7, 1.4));
        // The protagonist's defensive dominance suppresses the attackers they faced.
        let r = ratePlayer(rng, p, perf[id].g, perf[id].a, perf[id].d, result, conceded === 0, opp);
        if (ids === oppSide && ['CF', 'WG', 'AM'].includes(p.pos)) r -= Math.min(0.8, myDef * 0.05);
        perf[id].r = clamp(r, 4.3, 9.9);
        applyPerformance(w, p, perf[id], { rng, oppName, oppStrength: opp, nel: ctx.nel });
        if (!best || perf[id].r > best.r) best = { id, name: p.name, r: perf[id].r, side: ids === mates ? 'mate' : 'opp' };
      });
    }
    if (!ctx.absent) applyPerformance(w, w.players.me, { g: rep.goals || 0, a: rep.assists || 0, d: myDef, r: rep.rating || 6 }, { rng, oppName: ctx.oppName, oppStrength: ctx.oppStrength, nel: ctx.nel });
    res.standout = best; res.perf = perf;
    return res;
  }

  function activeBL(w) { return Object.values(w.players).filter(p => p.blueLock && p.status === 'active'); }

  /** Stage-aware ranking score: ability + Ego's position-fair evaluation + team results + survival. */
  function rankScore(w, p) {
    const ss = p.ss, n = ss.apps;
    const perfIdx = n ? evalValue(p, ss.g / n, ss.a / n, ss.d / n, ss.rt / n) * (n / (n + 2)) : 0;
    const career = p.st.apps ? evalValue(p, p.st.g / p.st.apps, p.st.a / p.st.apps, p.st.d / p.st.apps, p.st.rt / p.st.apps) * (p.st.apps / (p.st.apps + 4)) : 0;
    const k = { first: 4.2, second: 3.6, third: 3.6, u20: 3.2, nel: 3.0, pro: 2.5 }[w.stage] || 3.5;
    let score = p.ovr + perfIdx * k + career * 1.2;
    if (w.stage === 'first' && p.team && w.teams[p.team]) {
      const t = w.teams[p.team], gp = t.w + t.d + t.l;
      if (gp) score += ((t.pts / gp) - 1.3) * 2;
    }
    score += (p.survived || 0) * 1.2;
    return r1(score);
  }

  function computeRankings(w) {
    const list = activeBL(w).map(p => ({ id: p.id, score: rankScore(w, p) })).sort((a, b) => b.score - a.score || w.players[b.id].ovr - w.players[a.id].ovr);
    list.forEach((e, i) => {
      const p = w.players[e.id];
      p.prevRank = p.rank ?? i + 1; p.rank = i + 1; p.score = e.score; p.best = Math.min(p.best || 999, p.rank);
    });
    w.rankings = list.map(e => e.id);
    return w.rankings;
  }

  function resetStageStats(w, stage) {
    w.stage = stage;
    Object.values(w.players).forEach(p => { p.ss = blankStats(); });
  }

  function standings(w, building) {
    return BUILDINGS[building].map(n => w.teams[n]).slice().sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || b.strength - a.strength);
  }
  function teamTopScorer(w, team) {
    const ps = team.ids.map(id => w.players[id]).filter(Boolean);
    return ps.slice().sort((a, b) => b.ss.g - a.ss.g || (b.ss.rt / Math.max(1, b.ss.apps)) - (a.ss.rt / Math.max(1, a.ss.apps)))[0];
  }
  function applyResult(t, gf, ga) {
    t.gf += gf; t.ga += ga;
    if (gf > ga) { t.w++; t.pts += 3; } else if (gf === ga) { t.d++; t.pts++; } else t.l++;
  }

  /** Background First Selection round r (0-3) excluding the protagonist's own match. */
  function playFirstSelectionRound(w, rng, r) {
    for (const m of (w.schedule[r] || [])) {
      if (m.mine || m.done) continue;
      const A = w.teams[m.a], B = w.teams[m.b];
      const res = simulateMatch(w, rng, A.ids, B.ids, A.strength, B.strength, { nameA: A.name, nameB: B.name });
      applyResult(A, res.ga, res.gb); applyResult(B, res.gb, res.ga); m.done = true; m.score = [res.ga, res.gb];
    }
    w.round++;
  }
  function recordFirstSelectionResult(w, myTeam, oppTeam, gf, ga) {
    applyResult(w.teams[myTeam], gf, ga); applyResult(w.teams[oppTeam], ga, gf);
    for (const rd of w.schedule) for (const m of rd) if (m.mine && ((m.a === myTeam && m.b === oppTeam) || (m.b === myTeam && m.a === oppTeam))) { m.done = true; m.score = m.a === myTeam ? [gf, ga] : [ga, gf]; }
  }

  /** End of First Selection: top-2 teams per building + each other team's top scorer survive. */
  function resolveFirstSelection(w, rng, egoTop) {
    const result = { me: null };
    computeRankings(w);
    for (const b of Object.keys(BUILDINGS)) {
      const table = standings(w, b);
      table.forEach((t, i) => {
        const qualifies = i < 2;
        const top = teamTopScorer(w, t);
        t.ids.forEach(id => {
          const p = w.players[id]; if (!p) return;
          const survive = qualifies || (top && top.id === id);
          if (p.isMe) result.me = { teamPass: qualifies, position: i + 1, topScorer: top && top.id === id, rank: p.rank };
          else if (!survive) { p.status = 'eliminated'; p.elimStage = 'First Selection'; if (p.named) addNews(w, p.name + ' is eliminated in the First Selection.', 'elimination'); }
          else p.survived = (p.survived || 0) + 1;
        });
      });
    }
    // Ego's individual evaluation: a top-ranked player on a failed team can still survive.
    if (result.me) result.me.egoPass = result.me.rank <= (egoTop || 24);
    return result;
  }

  /** Weighted cull of active players down to `target`, protecting `protect` ids. */
  function cull(w, rng, target, stageLabel, protect = []) {
    computeRankings(w);
    const pool = activeBL(w).filter(p => !p.isMe && !protect.includes(p.id));
    let excess = activeBL(w).length - target;
    const n = pool.length;
    while (excess > 0 && pool.length) {
      const victim = rng.weighted(pool, p => Math.exp(((p.rank || n) / Math.max(1, n)) * 4) * (p.named ? 0.7 : 1));
      victim.status = 'eliminated'; victim.elimStage = stageLabel;
      if (victim.named) addNews(w, victim.name + ' is eliminated during the ' + stageLabel + '.', 'elimination');
      pool.splice(pool.indexOf(victim), 1); excess--;
    }
    activeBL(w).forEach(p => { if (!p.isMe) p.survived = (p.survived || 0) + 0.25; });
    computeRankings(w);
  }

  /** Pick n active players near a target ability, preferring named characters. */
  function pickCast(w, rng, n, target, exclude = []) {
    const out = [];
    let pool = activeBL(w).filter(p => !p.isMe && !exclude.includes(p.id));
    for (let i = 0; i < n && pool.length; i++) {
      const p = rng.weighted(pool, q => (q.named ? (q.tier === 1 ? 4 : 2.2) : 1) * Math.exp(-Math.abs(q.ovr - target) / 4.5));
      out.push(p.id); pool = pool.filter(q => q.id !== p.id);
    }
    return out;
  }

  /** Best available by ranking (for trial sides / U-20 squad). */
  function topRanked(w, n, exclude = []) { computeRankings(w); return w.rankings.filter(id => id !== 'me' && !exclude.includes(id)).slice(0, n); }

  function backgroundRound(w, rng, opts = {}) {
    // Players not in the protagonist's fixture still play: abstract fixtures between random groups.
    const pool = rng.shuffle(activeBL(w).filter(p => !p.isMe && !(opts.exclude || []).includes(p.id)));
    const size = opts.size || 5;
    for (let i = 0; i + size * 2 <= pool.length; i += size * 2) {
      const A = pool.slice(i, i + size).map(p => p.id), B = pool.slice(i + size, i + size * 2).map(p => p.id);
      const sA = teamStrength(w, A), sB = teamStrength(w, B);
      simulateMatch(w, rng, A, B, sA, sB, {});
    }
    w.round++;
  }

  function setupNEL(w, rng, myClub, clubs) {
    resetStageStats(w, 'nel');
    const names = Object.keys(clubs);
    const rosters = {}; names.forEach(n => { rosters[n] = []; });
    const waiting = Object.values(w.players).filter(p => p.status === 'waiting' && p.joinsAt === 'nel');
    waiting.forEach(p => { p.status = 'active'; addNews(w, p.name + ' joins Blue Lock for the Neo Egoist League.', 'arrival'); });
    const bl = activeBL(w);
    w.players.me.club = myClub; rosters[myClub].push('me');
    bl.filter(p => !p.isMe && p.nelPref && rosters[p.nelPref]).forEach(p => { p.club = p.nelPref; rosters[p.club].push(p.id); });
    bl.filter(p => !p.isMe && !p.club).sort((a, b) => b.ovr - a.ovr).forEach(p => {
      const target = names.slice().sort((a, b) => rosters[a].length - rosters[b].length)[0];
      p.club = target; rosters[target].push(p.id);
    });
    Object.values(w.players).filter(p => !p.blueLock && p.club && rosters[p.club]).forEach(p => { p.status = 'external'; rosters[p.club].push(p.id); });
    w.nel = { clubs: {}, round: 0, history: [] };
    names.forEach(n => { w.nel.clubs[n] = { name: n, ids: rosters[n], base: clubs[n].strength, pts: 0, gf: 0, ga: 0, w: 0, d: 0, l: 0 }; });
    Object.values(w.players).forEach(p => { p.nel = blankStats(); p.nelLog = []; });
    computeRankings(w);
  }
  function nelClubStrength(w, club) {
    const c = w.nel.clubs[club];
    return r1(c.base + (teamStrength(w, c.ids) - c.base) * 0.35);
  }
  /** One NEL round: protagonist's match recorded separately; the remaining three clubs play one match. */
  function playNELRound(w, rng, myClub, oppClub) {
    const others = Object.keys(w.nel.clubs).filter(n => n !== myClub && n !== oppClub);
    const r = w.nel.round % 3, pairs = [[0, 1], [1, 2], [2, 0]][r];
    const A = w.nel.clubs[others[pairs[0]]], B = w.nel.clubs[others[pairs[1]]];
    if (A && B) {
      const res = simulateMatch(w, rng, A.ids, B.ids, nelClubStrength(w, A.name), nelClubStrength(w, B.name), { nameA: A.name, nameB: B.name, nel: true });
      applyResult(A, res.ga, res.gb); applyResult(B, res.gb, res.ga);
      w.nel.history.push({ round: w.nel.round, a: A.name, b: B.name, score: [res.ga, res.gb] });
    }
    w.nel.round++; w.round++;
  }

  function playerCard(w, id) { return w.players[id]; }
  function avg(p, k) { return p.st.apps ? p.st[k] / p.st.apps : 0; }

  EW.world = { POS_GROUP, GROUP_LABEL, BUILDINGS, EVAL, create, groupOf, simulateMatch, recordProtagonistMatch, computeRankings, rankScore, resetStageStats,
    standings, teamTopScorer, playFirstSelectionRound, recordFirstSelectionResult, resolveFirstSelection, cull, pickCast, topRanked, backgroundRound,
    setupNEL, nelClubStrength, playNELRound, activeBL, addNews, applyResult, teamStrength, evalValue, playerCard, avg, poisson };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.world;
})(typeof globalThis !== 'undefined' ? globalThis : this);
