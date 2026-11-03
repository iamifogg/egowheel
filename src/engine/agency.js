/* EgoWheel — character agency.
 * Named footballers pursue their own ambitions, form relationships with each other, adapt to the
 * protagonist after repeated defeats, and initiate scenes of their own. All lightweight: only named
 * characters are modelled in depth; procedural players stay in the background.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // Personal ambitions: key + how progress is measured. target 'rival' resolves to a living player.
  const AMBITIONS = {
    isagi:    { key: 'devour', label: 'Devour the best player in front of him', target: 'top' },
    barou:    { key: 'king', label: 'Be the undisputed top scorer of his team' },
    bachira:  { key: 'monster', label: 'Find a player who can keep up with his monster' },
    nagi:     { key: 'spark', label: 'Find something worth trying hard for' },
    reo:      { key: 'independence', label: 'Prove he is more than Nagi’s partner', target: 'nagi' },
    rin:      { key: 'number_one', label: 'Stand alone at number one', target: 'top' },
    chigiri:  { key: 'speed', label: 'Prove his speed decides matches' },
    kunigami: { key: 'hero', label: 'Become a complete, unstoppable forward' },
    shidou:   { key: 'chaos', label: 'Score the most outrageous goals in the world' },
    karasu:   { key: 'analyse', label: 'Dismantle the most-hyped player in Blue Lock', target: 'top' },
    hiori:    { key: 'runner', label: 'Find the runner who matches his passes' },
    yukimiya: { key: 'beat_time', label: 'Prove himself before his eyes fail him' },
    niko:     { key: 'read', label: 'Read every attacker in the programme' },
    aiku:     { key: 'wall', label: 'Find the defender who will replace him' },
    otoya:    { key: 'shadow', label: 'Be the goal nobody saw coming' },
    tokimitsu:{ key: 'nerve', label: 'Stop being afraid of his own power' },
    aryu:     { key: 'style', label: 'Win with style, never ugly' },
    kurona:   { key: 'partner', label: 'Be the perfect partner for a great player' },
    gagamaru: { key: 'instinct', label: 'Find out how far his body can go' },
    raichi:   { key: 'mark', label: 'Erase the most dangerous attacker he faces', target: 'top' }
  };
  const SEED_PAIRS = [['isagi', 'bachira', 'duo'], ['nagi', 'reo', 'duo'], ['rin', 'isagi', 'rivals'], ['barou', 'isagi', 'rivals'], ['chigiri', 'kunigami', 'duo'],
    ['hiori', 'yukimiya', 'rivals'], ['shidou', 'rin', 'rivals'], ['karasu', 'otoya', 'duo'], ['niko', 'aiku', 'rivals'], ['bachira', 'rin', 'rivals']];

  function pairKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
  function ensure(w) {
    if (w.social) return w;
    w.social = {};
    for (const [a, b, kind] of SEED_PAIRS) if (w.players[a] && w.players[b]) w.social[pairKey(a, b)] = { a, b, bond: kind === 'duo' ? 45 : 15, rivalry: kind === 'rivals' ? 45 : 10, kind };
    for (const [id, amb] of Object.entries(AMBITIONS)) if (w.players[id]) w.players[id].amb = { key: amb.key, label: amb.label, target: amb.target || null, progress: 0, achieved: false };
    return w;
  }

  function topRival(w, id) { const ids = (w.rankings || []).filter(x => x !== id); return ids[0] || null; }
  function relKind(s) { return s.bond >= 60 && s.rivalry >= 50 ? 'rival duo' : s.bond >= 55 ? 'duo' : s.rivalry >= 55 ? 'rivals' : s.bond <= 15 && s.rivalry >= 35 ? 'strained' : 'acquaintances'; }

  /** One round of character agency. Returns significant events (named, tier-1-ish only). */
  function tick(w, ctx, rng) {
    ensure(w);
    const ev = [];
    const named = Object.values(w.players).filter(p => p.named && p.status === 'active');
    // Ambitions: progress from their own results; achieving one gives a permanent lift.
    for (const p of named) {
      const a = p.amb; if (!a || a.achieved) continue;
      const tgt = a.target === 'top' ? topRival(w, p.id) : a.target;
      let gain = 0;
      if (p.last) gain += (p.last.r - 6.6) * 6 + p.last.g * 4 + (p.pos === 'CB' || p.pos === 'DM' ? p.last.d * 0.6 : 0);
      if (tgt && w.players[tgt] && p.rank && w.players[tgt].rank) gain += p.rank < w.players[tgt].rank ? 10 : -2;
      a.target_now = tgt; a.progress = clamp(a.progress + gain, 0, 100);
      if (a.progress >= 100) {
        a.achieved = true; p.pot = Math.min(99, p.pot + 1); p.ovr = Math.min(p.pot, p.ovr + 1);
        const line = p.name + ' achieves a personal goal: ' + a.label.toLowerCase() + '.';
        ev.push({ type: 'ambition', id: p.id, text: line }); EW.world.addNews(w, line, 'ambition');
      }
    }
    // NPC relationships: teammates bond after shared wins; same-position teammates compete.
    const groups = {};
    for (const p of named) { const g = w.nel && p.club ? p.club : p.team; if (g) (groups[g] = groups[g] || []).push(p); }
    for (const list of Object.values(groups)) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const A = list[i], B = list[j]; if (!A.last || !B.last) continue;
        const k = pairKey(A.id, B.id), s = w.social[k] || (w.social[k] = { a: A.id, b: B.id, bond: 20, rivalry: 10, kind: 'acquaintances' });
        const before = relKind(s);
        const won = A.last.r > 6.6 && B.last.r > 6.6;
        s.bond = clamp(s.bond + (won ? 3 : -0.5) + (A.last.a && B.last.g ? 4 : 0), 0, 100);
        if (A.pos === B.pos) s.rivalry = clamp(s.rivalry + 2 + Math.abs(A.last.r - B.last.r), 0, 100);
        s.kind = relKind(s);
        if (s.kind !== before && ['duo', 'rivals', 'rival duo'].includes(s.kind) && (A.tier === 1 || B.tier === 1)) {
          const line = s.kind === 'duo' ? A.short + ' and ' + B.short + ' have become a dangerous duo.' : s.kind === 'rivals' ? A.short + ' and ' + B.short + ' are now open rivals.' : A.short + ' and ' + B.short + ' push each other to new levels.';
          ev.push({ type: 'social', ids: [A.id, B.id], text: line }); EW.world.addNews(w, line, 'social');
        }
        // Duos lift each other; rivalries accelerate development.
        if (s.kind === 'duo' || s.kind === 'rival duo') { A.form = clamp(A.form + 0.15, -3, 3); B.form = clamp(B.form + 0.15, -3, 3); }
        if (s.rivalry >= 55) { A.ovr = Math.min(A.pot, A.ovr + 0.08); B.ovr = Math.min(B.pot, B.ovr + 0.08); }
      }
    }
    return ev;
  }

  /** Rivals evolve because of the protagonist. Returns events for drama lines. */
  function rivalAdaptation(w, rels, fx, rng) {
    const ev = [];
    for (const [id, r] of Object.entries(rels)) {
      const q = w.players[id]; if (!q || q.status === 'eliminated' || !q.named) continue;
      const beaten = (r.enc.duelWins || 0) + Math.max(0, (r.enc.wins || 0) - (r.enc.losses || 0));
      if (beaten < 2 || r.rivalry < 40 || (r.adaptedFx ?? -99) > fx - 5) continue;
      if (!rng.chance(0.35 + r.rivalry / 400)) continue;
      const pers = EW.relationships.persOf(q);
      r.adaptedFx = fx; r.enc.counters = (r.enc.counters || 0) + 1;
      if (pers.analytic >= 0.6) { r.read = Math.min(12, (r.read || 0) + 2); q.ovr = Math.min(q.pot + 1, q.ovr + 1); }
      else { q.ovr = Math.min(q.pot + 2, q.ovr + 2); q.pot = Math.min(99, q.pot + 1); }
      const text = q.name + (pers.analytic >= 0.6 ? ' has studied your matches and built a counter to your weapon.' : ' has been training obsessively to stop losing to you.');
      r.moments.push({ text: 'Evolved to beat you.', fx }); r.moments = r.moments.slice(-14);
      ev.push({ type: 'rival_evolved', id, text }); EW.world.addNews(w, text, 'evolution');
    }
    return ev;
  }

  function socialFor(w, id) {
    ensure(w);
    return Object.values(w.social).filter(s => (s.a === id || s.b === id) && s.kind !== 'acquaintances').map(s => ({ other: s.a === id ? s.b : s.a, kind: s.kind, bond: s.bond, rivalry: s.rivalry }));
  }

  /** Director catalogue entries for character-initiated scenes. */
  function initiatedEvents() {
    const R = (c, id) => c.rels[id] || { respect: 30, rivalry: 0, compat: 45, trust: 25, hostility: 5, enc: {}, partnership: {} };
    const S = (c, id) => c.players[id]?.short || 'They', Nm = (c, id) => c.players[id]?.name || 'Someone';
    const L = (c, id, s) => EW.relationships.line(c.players[id], s), P = (c, id) => EW.relationships.persOf(c.players[id]);
    const live = (c, ids) => (ids || []).filter(id => c.players[id]?.named && c.players[id].status !== 'eliminated');
    const best = (ids, f) => ids.slice().sort((a, b) => f(b) - f(a))[0] || null;
    return [
      { id: 'npc_challenge', cat: 'initiated', cooldown: 5,
        actor: c => best(live(c, c.opps).filter(id => c.players[id].amb?.target_now === 'me' || (R(c, id).rivalry >= 35 && P(c, id).pride >= 0.7)), id => R(c, id).rivalry),
        weight: (c, a) => a ? 3.5 : 0, title: (c, a) => S(c, a) + ' Calls You Out',
        text: (c, a) => Nm(c, a) + ' finds you before kick-off. They didn’t come to talk. "' + L(c, a, 'rival') + '"',
        choices: (c, a) => [
          { key: 'accept', label: 'Accept the challenge', hint: 'A direct duel this match.', risk: 'ambitious', odds: 0.8, reward: 'Duel + rivalry', failHint: 'Rattled',
            success: { text: 'Game on.', duelForce: a, rel: { rivalry: 10, respect: 6 } }, mixed: { text: 'You accept a little too fast.', duelForce: a, rel: { rivalry: 8 } }, fail: { text: 'They already got in your head.', duelForce: a, conf: -5 } },
          { key: 'decline', label: '"Not today."', hint: 'Deny them the stage.', risk: 'conservative', odds: 0.75, reward: 'Composure', failHint: 'Mockery',
            success: { text: 'They walk off annoyed. Good.', form: 0.5, rel: { hostility: 4 } }, mixed: { text: 'Shrugged off.' }, fail: { text: '"Scared?" It follows you onto the pitch.', conf: -4, rel: { respect: -6 } } }
        ] },
      { id: 'npc_combo_offer', cat: 'initiated', cooldown: 6,
        actor: c => best(live(c, c.mates).filter(id => P(c, id).warmth >= 0.6 && R(c, id).compat >= 50 && (R(c, id).partnership?.stage || 0) < 2), id => R(c, id).compat),
        weight: (c, a) => a ? 3 : 0, title: (c, a) => S(c, a) + ' Has an Idea',
        text: (c, a) => Nm(c, a) + ' drags you to an empty pitch. "Watch this. If you move here, and I do this…" It’s half genius, half nonsense.',
        choices: (c, a) => [
          { key: 'try', label: 'Drill it with them', hint: 'Partnership progress toward a signature technique.', risk: 'ambitious', odds: Math.min(0.75, 0.3 + R(c, a).compat / 180), reward: 'Big partnership progress', failHint: 'Wasted evening',
            success: { text: 'On the fortieth try, it works. You both laugh.', partnership: { xp: 12, id: a }, rel: { trust: 8, compat: 6 } }, mixed: { text: 'Promising.', partnership: { xp: 5, id: a } }, fail: { text: 'It never comes together.', rel: { compat: -3 } } },
          { key: 'pass', label: 'Politely pass', hint: 'Your own training comes first.', risk: 'conservative', odds: 0.85, reward: 'Focus', failHint: 'They feel brushed off',
            success: { text: 'They shrug and find someone else.', xpMult: 1.2 }, mixed: { text: 'A little awkward.', rel: { compat: -2 } }, fail: { text: 'They’re hurt.', rel: { compat: -6, trust: -4 } } }
        ] },
      { id: 'npc_study', cat: 'initiated', cooldown: 8,
        actor: c => best(Object.values(c.players).filter(p => p.named && p.status === 'active' && p.rank && p.rank < c.rank && EW.relationships.persOf(p).analytic >= 0.7 && !c.opps?.includes(p.id)).map(p => p.id), id => -c.players[id].rank),
        weight: (c, a) => a && c.W?.primary?.level >= 2 ? 1.8 : 0, title: (c, a) => S(c, a) + ' Wants to Learn Your Weapon',
        text: (c, a) => Nm(c, a) + ', ranked #' + c.players[a].rank + ', has been watching your ' + (c.W?.primary?.name || 'weapon') + '. "Show me how you do that." In Blue Lock, nobody asks for free.',
        choices: (c, a) => [
          { key: 'trade', label: 'Teach it — in exchange for theirs', hint: 'Both of you grow. They will understand you better.', risk: 'ambitious', odds: 0.6, reward: 'Learn a fragment of their game', failHint: 'They take more than they give',
            success: { text: 'A fair trade between egoists.', learnFrom: a, rel: { trust: 8, respect: 6, read: 2 } }, mixed: { text: 'You learn a little.', xpBonus: 4, rel: { read: 2 } }, fail: { text: 'They take your secret and give nothing.', rel: { read: 4, hostility: 6 } } },
          { key: 'refuse', label: 'Refuse', hint: 'Keep your weapon yours.', risk: 'conservative', odds: 0.9, reward: 'Your weapon stays unread', failHint: 'They’ll study you anyway',
            success: { text: '"Figure it out yourself."', rel: { rivalry: 8 } }, mixed: { text: 'They smile. They’ll figure it out.', rel: { read: 1, rivalry: 6 } }, fail: { text: 'They watch even harder.', rel: { read: 2 } } }
        ] },
      { id: 'npc_mentor', cat: 'initiated', cooldown: 10,
        actor: c => { const id = c.role === 'def' ? 'aiku' : c.myPos === 'CF' ? 'barou' : c.role === 'mid' ? 'hiori' : 'chigiri'; return c.players[id] && c.players[id].status !== 'eliminated' && R(c, id).respect >= 45 && c.rank && c.rank <= 40 ? id : null; },
        weight: (c, a) => a ? 1.6 : 0, title: (c, a) => S(c, a) + ' Takes an Interest',
        text: (c, a) => Nm(c, a) + ' has seen enough of you to have an opinion. "' + L(c, a, 'notice') + '" They offer to show you something — on their terms.',
        choices: (c, a) => [
          { key: 'learn', label: 'Accept their lesson', hint: 'They push you hard and expect you to keep up.', risk: 'ambitious', odds: 0.6, reward: 'Attribute growth + respect', failHint: 'They lose interest',
            success: { text: 'You leave the session a different player.', learnFrom: a, rel: { respect: 10, trust: 6 } }, mixed: { text: 'You keep up. Barely.', stats: { [c.strongKey]: 1 }, rel: { respect: 4 } }, fail: { text: '"Not ready." They walk away.', conf: -4, rel: { respect: -4 } } },
          { key: 'rival', label: '"I’ll surpass you instead."', hint: 'Turn the mentor into a target.', risk: 'conservative', odds: 0.8, reward: 'Rivalry and motivation', failHint: 'Arrogant',
            success: { text: 'They grin. "Good."', rel: { rivalry: 14, respect: 6 }, conf: 3 }, mixed: { text: 'They shrug.', rel: { rivalry: 8 } }, fail: { text: 'You sound like a child.', rel: { respect: -6 } } }
        ] },
      { id: 'npc_duo_threat', cat: 'initiated', cooldown: 6,
        actor: c => { const w = c.world; if (!w?.social) return null; const s = Object.values(w.social).find(x => (x.kind === 'duo' || x.kind === 'rival duo') && c.opps?.includes(x.a) && c.opps?.includes(x.b)); return s ? s.a : null; },
        weight: (c, a) => a ? 2.6 : 0, title: () => 'A Duo Waiting for You',
        text: (c, a) => { const s = Object.values(c.world.social).find(x => x.a === a && c.opps.includes(x.b)); return S(c, a) + ' and ' + S(c, s.b) + ' have built a partnership the whole programme is talking about. You face them next.'; },
        choices: (c, a) => [
          { key: 'split', label: 'Plan to split them apart', hint: 'Target the link between them.', risk: 'ambitious', odds: Math.min(0.75, 0.3 + (c.stats.vision + c.stats.defense) / 300), reward: 'Their team weaker; defensive actions more likely', failHint: 'Out of position all match',
            success: { text: 'You find the pass that holds them together.', temp: { oppDefense: 0.15, defense: 0.4 } }, mixed: { text: 'Partly.', temp: { oppDefense: 0.06 } }, fail: { text: 'They punish your gamble.', temp: { oppDefense: -0.1 } } },
          { key: 'own', label: 'Play your own game', hint: 'Let them worry about you.', risk: 'conservative', odds: 0.8, reward: 'Normal preparation', failHint: 'Nerves',
            success: { text: 'You won’t play their match.', form: 0.5 }, mixed: { text: 'Fine.' }, fail: { text: 'You keep picturing their link-up.', conf: -2 } }
        ] },
      { id: 'npc_former_partner', cat: 'initiated', cooldown: 8,
        actor: c => best(Object.keys(c.rels).filter(id => c.players[id]?.named && c.players[id].status !== 'eliminated' && R(c, id).trust >= 60 && !c.mates?.includes(id) && (c.worldStage === 'nel' || c.worldStage === 'pro')), id => R(c, id).trust),
        weight: (c, a) => a ? 1.5 : 0, title: (c, a) => 'A Message from ' + S(c, a),
        text: (c, a) => 'Your phone buzzes. It’s ' + Nm(c, a) + ', now at ' + (c.players[a].club || 'another club') + '. "Still alive? Good. Don’t get soft without me."',
        choices: (c, a) => [
          { key: 'keep', label: 'Stay in touch', hint: 'Keep the bond alive across clubs.', risk: 'conservative', odds: 0.9, reward: 'Trust; future reunion opportunities', failHint: 'Nothing',
            success: { text: 'You talk for an hour.', rel: { trust: 6 }, conf: 2 }, mixed: { text: 'A short reply.', rel: { trust: 2 } }, fail: { text: 'You forget to answer.', rel: { trust: -4 } } },
          { key: 'needle', label: 'Promise to beat them', hint: 'Friendly rivalry across clubs.', risk: 'conservative', odds: 0.85, reward: 'Rivalry with respect', failHint: 'Misread tone',
            success: { text: '"Bring it."', rel: { rivalry: 10, respect: 4 } }, mixed: { text: 'A laughing emoji.', rel: { rivalry: 5 } }, fail: { text: 'They take it badly.', rel: { trust: -6 } } }
        ] }
    ];
  }

  EW.agency = { AMBITIONS, ensure, tick, rivalAdaptation, socialFor, initiatedEvents, pairKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.agency;
})(typeof globalThis !== 'undefined' ? globalThis : this);
