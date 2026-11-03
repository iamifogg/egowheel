/* EgoWheel — narrative arc templates.
 * Each template: detect() finds credible beginnings in the real state; pulse() develops the arc after
 * each fixture from match facts; scene() offers a stage-specific decision (once per stage);
 * critical() offers an in-match critical moment; modifiers() changes real odds while the arc is live.
 * Choice effects may include `arc:{advance|resolve|pressure|flags}` (applied to the owning arc).
 * Odds are success probabilities; EW.decisions turns them into exact distributions.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const sig = x => 1 / (1 + Math.exp(-x));
  const R = (c, id) => c.rels[id] || { respect: 30, rivalry: 0, compat: 45, trust: 25, hostility: 5, read: 0, enc: {}, partnership: {} };
  const N = (c, id) => c.players[id]?.name || 'Someone';
  const S = (c, id) => c.players[id]?.short || 'They';
  const P = (c, id) => EW.relationships.persOf(c.players[id]);
  const L = (c, id, sit) => EW.relationships.line(c.players[id], sit);
  const active = (c, id) => c.players[id] && c.players[id].status !== 'eliminated';
  const inOpp = (c, id) => (c.opps || []).includes(id);
  const inMine = (c, id) => (c.mates || []).includes(id);
  const named = (c, ids) => (ids || []).filter(id => c.players[id]?.named && active(c, id));
  const st = c => c.stats;
  const weapon = c => c.W?.primary?.name || 'your weapon';
  const adaptSkill = c => (st(c).vision + st(c).technique + st(c).reactions) / 3 + (['Adaptation Addict', 'Puzzle Solver', 'Devourer', 'World Devourer', 'Evolution Addict'].includes(c.egoStyle) ? 7 : 0);
  const famSkill = c => { const f = EW.weapons.FAMILIES[c.W?.primary?.family] || EW.weapons.FAMILIES.finish; return f.stats.reduce((t, k) => t + (st(c)[k] || 60), 0) / f.stats.length; };
  const role = c => c.role; // att | mid | def
  const C = (base, mods, tier) => EW.decisions.chance(base, mods, tier);

  // Shared in-match critical moment builder: trust / adapt / abandon.
  function crisisCritical(c, arc, actor, flavour) {
    const att = role(c) !== 'def', q = c.players[actor];
    const their = q ? q.ovr : 80, mine = famSkill(c) + (c.W?.primary?.level || 0) * 2.5;
    const counter = Math.min(0.75, (R(c, actor).read || 0) / 8 + (R(c, actor).enc.counters || 0) * 0.08);
    const trust = C(0.5 + (mine - their) / 40 - counter * 0.45, [], 'conservative');
    const adapt = C(0.28 + (adaptSkill(c) - their) / 45 + (c.pressureMods?.adapt || 0) / 100 + (arc.flags.prepared ? 0.08 : 0), [], 'ambitious');
    const abandon = C(0.06 + Math.max(0, st(c).ego - 70) / 300 + c.pressure.identity / 900 + (arc.flags.awakeningSeed ? 0.05 : 0), [], 'extreme');
    const goalC = att ? { goals: 1, shots: 1, bonusRating: 1.2 } : { tackles: 1, blocks: 1, bonusRating: 0.9, oppSuppress: 1 };
    const chanceC = att ? { shots: 1, keyPasses: 1, bonusRating: 0.35 } : { tackles: 1, bonusRating: 0.35, oppSuppress: 1 };
    return {
      title: flavour.title, text: flavour.text, actor,
      options: [
        { key: 'trust', label: 'Trust ' + weapon(c), hint: 'Back what got you here.', risk: 'conservative', odds: trust, reward: att ? 'A clear chance' : 'A clean stop', failHint: S(c, actor) + ' reads it again',
          success: { contrib: chanceC, eff: { arc: { pressure: -6 } } }, mixed: { contrib: att ? { shots: 1 } : { tackles: 1 }, eff: {} },
          fail: { contrib: { ratingPenalty: 0.3, mistakes: 1 }, eff: { rel: { read: 1 }, arc: { pressure: 8 } } } },
        { key: 'adapt', label: 'Adapt in the moment', hint: 'Change the solution while ' + S(c, actor) + ' is watching.', risk: 'ambitious', odds: adapt, reward: (att ? 'Goal' : 'Decisive stop') + ' + major weapon progress', failHint: 'They learn even more about you',
          success: { contrib: goalC, eff: { xpBonus: 14, evolveTrigger: true, readReset: actor, rel: { respect: 10, rivalry: 8 }, arc: { resolve: 'adapted', note: 'Adapted mid-match against ' + S(c, actor) }, moment: { title: 'Adaptation', tone: 'triumph', text: 'Under ' + S(c, actor) + '’s eyes, you rewrote your own weapon.' } } },
          mixed: { contrib: chanceC, eff: { xpBonus: 6, arc: { pressure: -4, flags: { prepared: true } } } },
          fail: { contrib: { ratingPenalty: 0.45, mistakes: 1, oppChance: att ? 0 : 1 }, eff: { rel: { read: 2, respect: -4 }, conf: -5, arc: { pressure: 10 } } } },
        { key: 'abandon', label: 'Abandon everything you know', hint: 'Throw away your established game and trust your ego completely.', risk: 'extreme', irreversible: true, odds: abandon, reward: 'A new weapon pathway (Ego Awakening)', failHint: 'Confidence collapse and an identity crisis',
          success: { contrib: Object.assign({}, goalC, { bonusRating: 1.6 }), eff: { awaken: true, potential: 2, rel: { respect: 18, rivalry: 12 }, arc: { resolve: 'awakened', note: 'Ego awakening against ' + S(c, actor) }, moment: { title: 'Ego Awakening', tone: 'triumph', text: 'You stopped being the player ' + S(c, actor) + ' had studied. Something new was born.' }, milestone: 'Ego Awakening against ' + N(c, actor) + '.' } },
          mixed: { contrib: { shots: 1, bonusRating: 0.2 }, eff: { conf: -3, arc: { flags: { awakeningSeed: true }, pressure: 6 } } },
          fail: { contrib: { ratingPenalty: 0.8, mistakes: 1, oppChance: 1 }, eff: { conf: -12, form: -1, rel: { read: 2 }, spawnArc: { type: 'identity_crisis', actors: ['me'], causes: ['failed_awakening'] }, arc: { resolve: 'broken', note: 'The gamble against ' + S(c, actor) + ' failed' }, moment: { title: 'Collapse', tone: 'tragedy', text: 'You let go of everything — and nothing caught you.' }, milestone: 'Failed an ego awakening against ' + N(c, actor) + '.' } } }
      ]
    };
  }

  const T = [];

  // 1. WEAPON COUNTER — an analytic rival solves your weapon.
  T.push({ type: 'weapon_counter', label: 'Weapon Under Siege', major: true, cooldown: 6, startChance: 0.8,
    detect: c => named(c, Object.keys(c.rels)).filter(id => (R(c, id).read || 0) >= 3 && P(c, id).analytic >= 0.55).map(id => ({ actors: ['me', id], causes: ['weapon_read'], pressure: 30 + R(c, id).read * 4 })),
    pulse: (c, a) => { const id = a.actors[1], f = c.facts || {}; let p = 0, touched = false;
      if (f.oppIds?.includes(id)) { touched = true; p += f.countered ? 14 : f.weaponUses >= 2 ? 6 : -4; if (f.duel?.oppId === id) p += ['beaten', 'humiliated'].includes(f.duel.result) ? 12 : -10; }
      if ((R(c, id).read || 0) <= 1) return { resolve: 'adapted', note: 'They no longer have a read on you' };
      return { pressure: p, touched, advance: a.pressure + p >= [0, 45, 62, 999][a.stage + 1] || (a.stage === 0 && touched) }; },
    modifiers: (c, a) => ({ duel: { [a.actors[1]]: 0.15 + a.stage * 0.06 }, weapon: 1 - a.stage * 0.03, adapt: a.stage * 3 }),
    scene: (c, a) => { const id = a.actors[1];
      if (a.stage === 1) return { title: S(c, id) + ' Has Solved You', actor: id, cat: 'rivalry', text: N(c, id) + ' doesn’t gloat. They simply stand where your ' + weapon(c) + ' used to work. "' + L(c, id, 'read') + '"',
        choices: [
          { key: 'refine', label: 'Refine it until it cuts anyway', hint: 'Grind the same weapon harder.', risk: 'conservative', odds: C(0.72, [], 'conservative'), reward: 'Mastery', failHint: 'Wasted week',
            success: { text: 'Hours of repetition. It’s sharper, but they still know it.', xpBonus: 6, arc: { pressure: 4 } }, mixed: { text: 'Small gains.', xpBonus: 3 }, fail: { text: 'The same wall, every rep.', conf: -3, arc: { pressure: 6 } } },
          { key: 'study', label: 'Study how they read you', hint: 'Prepare an adaptation for the next meeting.', risk: 'ambitious', odds: C(0.3 + (st(c).vision - 60) / 120, [], 'ambitious'), reward: 'Far better odds when you adapt against them', failHint: 'Lost confidence',
            success: { text: 'You see the tell they’ve been watching for. Next time you’ll move differently.', adaptBonus: { [id]: 14 }, arc: { flags: { prepared: true }, advance: true } }, mixed: { text: 'Half an answer.', adaptBonus: { [id]: 6 } }, fail: { text: 'You can’t find it. Doubt creeps in.', conf: -5, pressure: { identity: 8 } } },
          { key: 'secondary', label: 'Hide behind your secondary weapon', hint: 'Avoid the problem for now.', risk: 'conservative', odds: 0.8, reward: 'Read halves, arc cools', failHint: 'Nothing changes',
            success: { text: 'You give them a different problem.', readHalf: id, arc: { pressure: -12 } }, mixed: { text: 'It buys time.', arc: { pressure: -5 } }, fail: { text: 'Your secondary weapon isn’t ready.', temp: { performance: -0.03 } } }
        ] };
      if (a.stage === 2) return { title: 'Identity Under Pressure', actor: id, cat: 'personal', text: 'Every time you reach for ' + weapon(c) + ', ' + S(c, id) + ' is already there. Your coaches have started using the word "predictable".',
        choices: [
          { key: 'gamble', label: 'Seek a breakthrough in training', hint: 'Push your weapon into territory you don’t understand yet.', risk: 'extreme', odds: C(0.1 + Math.max(0, st(c).ego - 70) / 250, [], 'extreme'), reward: 'Immediate weapon evolution', failHint: 'Form collapse and fatigue', irreversible: false,
            success: { text: 'At 2 a.m. it clicks. The weapon has a new branch.', evolveNow: true, readReset: id, arc: { resolve: 'adapted' }, moment: { title: 'Breakthrough', tone: 'triumph', text: 'Alone on the training pitch, your weapon evolved.' } },
            mixed: { text: 'You feel the edge of something.', xpBonus: 8, arc: { flags: { awakeningSeed: true } } }, fail: { text: 'You break yourself trying.', fitness: -15, form: -1, conf: -6 } },
          { key: 'patience', label: 'Accept it and wait for the match', hint: 'The answer will come under real pressure — or it won’t.', risk: 'conservative', odds: 0.85, reward: 'Arc reaches its critical moment', failHint: 'More pressure',
            success: { text: 'You stop forcing it. Next time you meet, something will have to give.', arc: { advance: true } }, mixed: { text: 'You wait, uneasily.', arc: { advance: true, pressure: 5 } }, fail: { text: 'The waiting eats at you.', pressure: { identity: 10 }, arc: { advance: true } } }
        ] };
      return null; },
    critical: (c, a) => a.stage >= 3 && inOpp(c, a.actors[1]) ? crisisCritical(c, a, a.actors[1], { title: 'Critical Moment: ' + S(c, a.actors[1]) + ' Is Waiting', text: 'Late in the match, the ball comes to you. ' + N(c, a.actors[1]) + ' is already in position. They know exactly what you want to do.' }) : null
  });

  // 2. RIVALRY ASCENT — an ordinary rivalry becomes a career-defining one.
  T.push({ type: 'rivalry_ascent', label: 'Rivalry', major: true, cooldown: 8, startChance: 0.55,
    detect: c => named(c, Object.keys(c.rels)).filter(id => R(c, id).rivalry >= 45 && (R(c, id).enc.against + R(c, id).enc.with) >= 2 && R(c, id).arc !== 'conquered').map(id => ({ actors: ['me', id], causes: ['rivalry_' + Math.round(R(c, id).rivalry)], pressure: R(c, id).rivalry / 2 })),
    pulse: (c, a) => { const id = a.actors[1], f = c.facts || {}, r = R(c, id); let p = 0, touched = false;
      if (f.oppIds?.includes(id) || f.mateIds?.includes(id)) { touched = true; p += 6; if (f.duel?.oppId === id) p += 10; }
      if (f.overtakenBy === id || f.overtook === id) { touched = true; p += 8; }
      if (r.arc === 'conquered' || r.arc === 'lost') return { resolve: r.arc === 'conquered' ? 'won' : 'lost', note: 'The rivalry was settled' };
      return { pressure: p - 2, touched, advance: touched && a.pressure + p > [0, 45, 65, 999][a.stage + 1] }; },
    modifiers: (c, a) => ({ duel: { [a.actors[1]]: 0.1 + a.stage * 0.08 }, star: 1 + a.stage * 0.03, card: 1 + a.stage * 0.04 }),
    scene: (c, a) => { const id = a.actors[1], p = P(c, id);
      if (a.stage === 1) return { title: 'The Board Has Two Names', actor: id, cat: 'rivalry', text: 'Players have started comparing you and ' + N(c, id) + ' openly. "' + L(c, id, 'rival') + '"',
        choices: [
          { key: 'declare', label: 'Declare it publicly', hint: 'Make the rivalry official. Raises the stakes of every meeting.', risk: 'ambitious', odds: C(0.45 + (st(c).ego - 65) / 100, [], 'ambitious'), reward: 'Rivalry escalates; duels with them far more likely; respect if you back it up', failHint: 'Looks like insecurity',
            success: { text: 'Everyone heard it. So did ' + S(c, id) + '.', rel: { rivalry: 12, respect: 6 }, arc: { advance: true }, conf: 4 }, mixed: { text: 'It lands awkwardly.', rel: { rivalry: 8 } }, fail: { text: 'They laugh it off, and so does the room.', conf: -6, rel: { respect: -6, rivalry: 6 } } },
          { key: 'quiet', label: 'Let the football answer', hint: 'No words. Just better performances.', risk: 'conservative', odds: 0.8, reward: 'Steady form', failHint: 'Nothing',
            success: { text: 'You keep your head down and your standards up.', form: 0.5, xpMult: 1.3 }, mixed: { text: 'A quiet week.' }, fail: { text: 'Silence feels like retreat.', conf: -2 } }
        ] };
      if (a.stage === 2) return { title: 'Training to Beat ' + S(c, id), actor: id, cat: 'rivalry', text: 'You notice ' + N(c, id) + ' staying late, drilling situations that look a lot like the ones you create.' + (p.analytic > 0.6 ? ' They are preparing for you specifically.' : ' They hate losing to you.'),
        choices: [
          { key: 'mirror', label: 'Out-train them', hint: 'Match their obsession hour for hour.', risk: 'ambitious', odds: C(0.4 + (st(c).stamina - 60) / 120, [], 'ambitious'), reward: 'Attribute growth + edge in your next duel', failHint: 'Exhaustion',
            success: { text: 'You are both better for it. You are slightly better.', stats: { [c.strongKey]: 2 }, duelBonus: { [id]: 8 }, fitness: -8, arc: { advance: true } }, mixed: { text: 'Even.', fitness: -8, arc: { advance: true } }, fail: { text: 'You burn out before the match.', fitness: -16, form: -1 } },
          { key: 'scout', label: 'Scout what they are building', hint: 'Prepare for the counter they are developing.', risk: 'conservative', odds: C(0.55 + (st(c).vision - 60) / 120, [], 'conservative'), reward: 'Adapting against them becomes much easier', failHint: 'Nothing found',
            success: { text: 'You see what they’re planning.', adaptBonus: { [id]: 12 }, arc: { advance: true } }, mixed: { text: 'Some clues.', adaptBonus: { [id]: 5 }, arc: { advance: true } }, fail: { text: 'They hide it well.', arc: { advance: true } } }
        ] };
      if (a.stage === 3 && inOpp(c, id) && c.importance >= 1.3) return { title: 'Decisive Confrontation: ' + S(c, id), actor: id, cat: 'rivalry', major: true, text: 'Everything between you and ' + N(c, id) + ' leads to this match. Win the duel and the rivalry is settled in your favour. Lose it and the story becomes theirs.',
        choices: [
          { key: 'allin', label: 'Stake everything on the duel', hint: 'A guaranteed decisive duel. Permanent consequences for both careers.', risk: 'ambitious', odds: 0.85, reward: 'Settle the rivalry (+2 potential if you win)', failHint: 'Lose it and they gain the potential instead', irreversible: true,
            success: { text: 'You will meet them head-on.', duelForce: id, decisive: id, conf: 3 }, mixed: { text: 'Nervous, but ready.', duelForce: id, decisive: id }, fail: { text: 'The weight is crushing.', duelForce: id, decisive: id, conf: -5 } },
          { key: 'refuse', label: 'Refuse to make it personal', hint: 'Play for the team. The rivalry stays unresolved.', risk: 'conservative', odds: 0.8, reward: 'Team boost', failHint: 'Distraction',
            success: { text: 'You choose control over ego.', temp: { mateGoals: 0.2 }, arc: { pressure: -20, regress: true } }, mixed: { text: 'You try to switch it off.', arc: { regress: true } }, fail: { text: 'You can’t stop looking for them.', temp: { performance: -0.04 } } }
        ] };
      return null; }
  });

  // 3. OVERSHADOWED PARTNER — recognition breaks or forges a partnership.
  T.push({ type: 'overshadowed', label: 'In Their Shadow', major: true, cooldown: 7, startChance: 0.6,
    detect: c => named(c, Object.keys(c.rels)).filter(id => (R(c, id).trust >= 55 || (R(c, id).partnership?.stage || 0) >= 1) && c.players[id].rank && c.me.rank && Math.abs(c.players[id].rank - c.me.rank) >= 6).map(id => ({ actors: ['me', id], causes: [c.players[id].rank < c.me.rank ? 'partner_ahead' : 'me_ahead'], flags: { meAhead: c.players[id].rank > c.me.rank }, pressure: 25 })),
    pulse: (c, a) => { const id = a.actors[1], f = c.facts || {}; let p = 0, touched = false;
      if (f.mateIds?.includes(id)) { touched = true; const fedThem = f.assistsTo?.[id] || 0, fedMe = f.assistedBy === id; p += a.flags.meAhead ? (fedMe ? -6 : 8) : (fedThem ? 6 : -2); if (f.objective === 'goals' || f.objective === 'showcase') p += 6; }
      const gap = Math.abs((c.players[id].rank || 99) - (c.me.rank || 99));
      if (gap < 3) return { resolve: 'balanced', note: 'You found yourselves level again' };
      return { pressure: p, touched, advance: touched && a.pressure + p > [0, 40, 58, 999][a.stage + 1] }; },
    modifiers: (c, a) => ({ combo: 1 - a.stage * 0.12 }),
    scene: (c, a) => { const id = a.actors[1];
      if (a.stage === 1) return { title: a.flags.meAhead ? S(c, id) + ' Is Falling Behind' : 'Everyone Talks About ' + S(c, id), actor: id, cat: 'team', text: a.flags.meAhead ? N(c, id) + ' has gone quiet. You are #' + c.me.rank + '; they are #' + c.players[id].rank + '. The partnership feels lopsided.' : 'The cameras follow ' + N(c, id) + ' now. You made half of those goals possible. Nobody says your name.',
        choices: [
          { key: 'feed', label: a.flags.meAhead ? 'Feed them chances' : 'Keep making them look good', hint: 'Protect the partnership at the cost of your own numbers.', risk: 'conservative', odds: 0.75, reward: 'Trust, partnership growth', failHint: 'Your ranking stalls',
            success: { text: 'The link-ups keep coming.', rel: { trust: 10, compat: 6 }, partnership: { xp: 6 }, temp: { assistP: 0.012, goalP: -0.006 }, arc: { pressure: -12 } }, mixed: { text: 'It holds, for now.', rel: { trust: 4 } }, fail: { text: 'They notice the charity and resent it.', rel: { hostility: 8 }, arc: { pressure: 8 } } },
          { key: 'compete', label: 'Make it a competition', hint: 'Blue Lock rewards egoists. Push each other — or push each other away.', risk: 'ambitious', odds: C(0.42 + R(c, id).respect / 300, [], 'ambitious'), reward: 'Both of you improve; rivalry respect', failHint: 'Partnership damaged',
            success: { text: 'You make each other dangerous. Healthily.', rel: { respect: 10, rivalry: 10 }, stats: { [c.strongKey]: 1 }, arc: { advance: true } }, mixed: { text: 'Friction, and some sparks.', rel: { rivalry: 8, trust: -4 }, arc: { advance: true } }, fail: { text: 'It turns sour quickly.', rel: { trust: -12, hostility: 10 }, partnership: { tension: 2 }, arc: { advance: true, pressure: 10 } } }
        ] };
      if (a.stage >= 2) return { title: 'Breaking Point with ' + S(c, id), actor: id, cat: 'team', major: a.stage >= 3, text: '"' + (a.flags.meAhead ? 'You don’t need me any more. Admit it.' : 'I’m not your supporting act.') + '" ' + N(c, id) + ' wants an answer, and the whole dressing room is listening.',
        choices: [
          { key: 'reconcile', label: 'Rebuild it properly', hint: 'Honesty and a plan that works for both of you.', risk: 'ambitious', odds: C(0.35 + R(c, id).compat / 220 + R(c, id).trust / 400, [], 'ambitious'), reward: 'Partnership survives stronger (may unlock signature technique)', failHint: 'It ends anyway',
            success: { text: 'You come out of it with a clearer partnership than before.', rel: { trust: 18, compat: 10 }, partnership: { xp: 12, tension: -3 }, arc: { resolve: 'reforged' }, moment: { title: 'Partnership Reforged', tone: 'triumph', text: 'You and ' + S(c, id) + ' chose each other again.' } },
            mixed: { text: 'A truce. Fragile.', rel: { trust: 6 }, arc: { regress: true, pressure: -10 } }, fail: { text: 'Some things don’t mend.', rel: { trust: -20, hostility: 15 }, partnership: { break: true }, arc: { resolve: 'broken' } } },
          { key: 'split', label: 'Go separate ways', hint: 'End the partnership. They become a rival with history.', risk: 'conservative', odds: 0.9, irreversible: true, reward: 'Freedom; a rival who knows you', failHint: 'A bitter feud',
            success: { text: '"Then I’ll beat you too." You both mean it.', rel: { trust: -25, rivalry: 30, respect: 8 }, partnership: { break: true }, arc: { resolve: 'split' }, moment: { title: 'Partners to Rivals', tone: 'tragedy', text: S(c, id) + ' was your partner. Now they are the player you most want to beat.' } },
            mixed: { text: 'Cold silence.', rel: { trust: -25, rivalry: 20 }, partnership: { break: true }, arc: { resolve: 'split' } }, fail: { text: 'It becomes ugly and public.', rel: { trust: -30, rivalry: 25, hostility: 25 }, partnership: { break: true }, arc: { resolve: 'split' } } }
        ] };
      return null; }
  });

  // 4. SELECTION CRISIS — survival is at stake.
  T.push({ type: 'selection_crisis', label: 'On the Edge', major: true, cooldown: 4, startChance: 0.9, survivesElimination: true,
    detect: c => c.atRisk ? [{ actors: ['me'], causes: ['at_risk_' + c.worldStage], pressure: 40 }] : [],
    pulse: (c, a) => { if (!c.atRisk) return { resolve: 'survived', note: 'You climbed back above the line' }; return { pressure: 8, touched: true, advance: a.stage < 2 || (a.stage === 2 && c.lastChanceFixture) }; },
    modifiers: (c, a) => ({ star: 1 + a.stage * 0.04, perf: a.stage * 0.01 }),
    scene: (c, a) => a.stage >= 1 ? { title: 'The Line Is Right There', cat: 'selection', major: a.stage >= 2, text: c.riskText || 'One more bad match and you are out.',
      choices: [
        { key: 'allin', label: 'Play like there is no tomorrow', hint: 'Showcase objective: higher highs, lower lows.', risk: 'ambitious', odds: 0.7, reward: 'Big performance upside', failHint: 'Mistakes are punished',
          success: { text: 'Nothing to lose.', objective: 'showcase', temp: { performance: 0.07 }, conf: 4 }, mixed: { text: 'Committed, but tense.', objective: 'showcase' }, fail: { text: 'You arrive wired and sleepless.', objective: 'showcase', conf: -6 } },
        { key: 'calm', label: 'Trust your process', hint: 'Fewer errors, steadier rating.', risk: 'conservative', odds: C(0.55 + (st(c).reactions - 60) / 150, [], 'conservative'), reward: 'Composure', failHint: 'Nerves',
          success: { text: 'Same habits, same weapon. Breathe.', temp: { performance: 0.03, errorDown: 1 } }, mixed: { text: 'Mostly calm.', temp: { errorDown: 1 } }, fail: { text: 'Calm is impossible.', conf: -4 } },
        { key: 'beg', label: 'Ask a teammate to build the match around you', hint: 'If they agree, you get the ball in the moments that matter.', risk: 'ambitious', odds: C(0.3 + (c.bestMateTrust || 0) / 200, [], 'ambitious'), reward: 'Far more decisive moments', failHint: 'Humiliating refusal',
          success: { text: 'They nod. "Then make it count."', temp: { shots: 0.4, assistP: 0.01, goalP: 0.008 } }, mixed: { text: 'They’ll try.', temp: { shots: 0.2 } }, fail: { text: '"Everyone is fighting for their life. Why would I?"', conf: -6 } }
      ] } : null
  });

  // 5. REVENGE — humiliated by someone; it will not go away.
  T.push({ type: 'revenge', label: 'Unfinished Business', major: false, cooldown: 5, startChance: 0.7,
    detect: c => named(c, Object.keys(c.flags).filter(k => k.startsWith('beatenBy_')).map(k => k.slice(9))).map(id => ({ actors: ['me', id], causes: ['humiliated'], pressure: 35 })),
    pulse: (c, a) => { const id = a.actors[1], f = c.facts || {};
      if (f.duel?.oppId === id && ['win', 'decisive'].includes(f.duel.result)) return { resolve: 'avenged', note: 'You got the better of ' + S(c, id) };
      if (f.oppIds?.includes(id) && f.rating >= 7.6 && f.result === 'WIN') return { resolve: 'avenged', note: 'You beat them, and played well doing it' };
      if (f.duel?.oppId === id && ['beaten', 'humiliated'].includes(f.duel.result)) return { pressure: 15, touched: true, advance: true, note: 'Beaten again' };
      return { pressure: -2, touched: f.oppIds?.includes(id), advance: a.stage < 1 && f.oppIds?.includes(id) }; },
    modifiers: (c, a) => ({ duel: { [a.actors[1]]: 0.12 + a.stage * 0.05 } }),
    scene: (c, a) => { const id = a.actors[1]; if (!inOpp(c, id)) return null;
      return { title: 'Rematch: ' + S(c, id), actor: id, cat: 'rivalry', text: 'Last time, ' + N(c, id) + ' made you look ordinary. "' + L(c, id, 'beatYou') + '" They’re on the other side again.',
        choices: [
          { key: 'obsess', label: 'Build the whole week around them', hint: 'Guaranteed duel with an edge, but you arrive tired.', risk: 'ambitious', odds: 0.7, reward: 'Duel + bonus', failHint: 'Fatigue',
            success: { text: 'You know every habit they have.', duelForce: id, duelBonus: { [id]: 10 }, fitness: -6 }, mixed: { text: 'Hungry and heavy-legged.', duelForce: id, fitness: -9 }, fail: { text: 'You overcook it.', fitness: -14, form: -0.5 } },
          { key: 'release', label: 'Let it go', hint: 'The grudge ends here. Clear head.', risk: 'conservative', odds: 0.8, reward: 'Confidence', failHint: 'It lingers',
            success: { text: 'You put it in its place.', conf: 4, clearFlag: 'beatenBy_' + id, arc: { resolve: 'released' } }, mixed: { text: 'Mostly gone.', clearFlag: 'beatenBy_' + id, arc: { resolve: 'released' } }, fail: { text: 'It sits in your stomach.', form: -0.5 } }
        ] }; }
  });

  // 6. OBSESSION — fixated on the name directly above yours.
  T.push({ type: 'obsession', label: 'The Name Above Yours', major: false, cooldown: 6, startChance: 0.35,
    detect: c => { const above = c.rankings?.[(c.me.rank || 2) - 2]; return above && c.players[above]?.named && c.me.rank <= 40 ? [{ actors: ['me', above], causes: ['rank_neighbour'], pressure: 20 }] : []; },
    pulse: (c, a) => { const id = a.actors[1], them = c.players[id]; if (!them?.rank) return { fizzle: true };
      if (c.me.rank < them.rank) return { resolve: 'overtaken', note: 'You passed ' + S(c, id) };
      return { pressure: 4, touched: true, advance: a.stage < 2 && a.pressure > 30 }; },
    modifiers: (c, a) => ({ star: 1.03 }),
    scene: (c, a) => { const id = a.actors[1]; if (a.stage !== 1) return null;
      return { title: 'Always One Place Behind ' + S(c, id), actor: id, cat: 'personal', text: 'You check the board after every match. ' + N(c, id) + ' (#' + c.players[id].rank + '). You (#' + c.me.rank + ').',
        choices: [
          { key: 'chase', label: 'Chase their numbers', hint: 'Copy what the board rewards for their role.', risk: 'ambitious', odds: 0.6, reward: 'Ranking momentum', failHint: 'You lose your own identity a little',
            success: { text: 'You hunt the stats that matter.', temp: { performance: 0.05 }, rel: { rivalry: 6 } }, mixed: { text: 'Some progress.', temp: { performance: 0.02 } }, fail: { text: 'You stop playing your own game.', pressure: { identity: 10 } } },
          { key: 'ignore', label: 'Stop looking at the board', hint: 'Healthy, boring, effective.', risk: 'conservative', odds: 0.85, reward: 'Arc fades, steady focus', failHint: 'You look anyway',
            success: { text: 'You delete the rankings tab from your mind.', form: 0.5, arc: { resolve: 'let_go' } }, mixed: { text: 'Mostly.', arc: { pressure: -10 } }, fail: { text: 'You looked. Twice.', conf: -2 } }
        ] }; }
  });

  // 7. BREAKTHROUGH OPPORTUNITY — mastery plus pressure opens a door.
  T.push({ type: 'breakthrough', label: 'On the Verge', major: true, cooldown: 8, startChance: 0.5, survivesElimination: true,
    detect: c => (c.W?.primary && c.W.primary.level >= 2 && c.W.primary.tier < 3 && (c.pressure.identity + c.pressure.competitive >= 30 || c.lastRating >= 8)) ? [{ actors: ['me'], causes: ['mastery_' + c.W.primary.level], pressure: 30 }] : [],
    pulse: (c, a) => { const f = c.facts || {}; if (c.W?.primary?.tier > (a.flags.tier0 ?? (a.flags.tier0 = c.W.primary.tier))) return { resolve: 'evolved', note: 'Your weapon evolved' };
      return { pressure: (f.rating >= 7.5 ? 8 : 2) + (f.flow ? 12 : 0), touched: true, advance: a.pressure > [0, 35, 50, 999][a.stage + 1] }; },
    modifiers: (c, a) => ({ adapt: a.stage * 4 }),
    scene: (c, a) => { if (a.stage < 2) return null;
      return { title: 'The Edge of Your Weapon', cat: 'personal', major: a.stage >= 3, text: 'Your ' + weapon(c) + ' is close to becoming something else. You can feel it in the half-second before contact. You can push for it now, or let it come naturally.',
        choices: [
          { key: 'natural', label: 'Let it come naturally', hint: 'Keep training normally. Safe mastery gains.', risk: 'conservative', odds: 0.85, reward: 'Mastery', failHint: 'Nothing',
            success: { text: 'Steady work.', xpBonus: 6 }, mixed: { text: 'A little.', xpBonus: 3 }, fail: { text: 'A flat week.' } },
          { key: 'push', label: 'Force the evolution', hint: 'Intense sessions designed to break through.', risk: 'ambitious', odds: C(0.25 + (c.W?.primary?.level || 0) * 0.06 + c.pressure.identity / 400, [], 'ambitious'), reward: 'Weapon evolution now', failHint: 'Fatigue and doubt',
            success: { text: 'It breaks open.', evolveNow: true, arc: { resolve: 'evolved' }, moment: { title: 'Weapon Evolution', tone: 'triumph', text: weapon(c) + ' became something new.' } }, mixed: { text: 'Closer than ever.', xpBonus: 10, arc: { flags: { awakeningSeed: true } } }, fail: { text: 'Your body refuses.', fitness: -12, conf: -4, pressure: { identity: 8 } } },
          { key: 'reinvent', label: 'Reinvent your identity entirely', hint: 'Abandon the evolution path and awaken a new weapon from your ego.', risk: 'extreme', irreversible: true, odds: C(0.05 + Math.max(0, st(c).ego - 75) / 260, [], 'extreme'), reward: 'Ego Awakening: a new signature opportunity on the wheel', failHint: 'Identity crisis',
            success: { text: 'Something entirely yours.', awaken: true, potential: 1, arc: { resolve: 'awakened' }, moment: { title: 'Ego Awakening', tone: 'triumph', text: 'You stopped improving your weapon and became a different weapon.' }, milestone: 'Reinvented your football identity through an Ego Awakening.' },
            mixed: { text: 'A glimpse, then gone.', conf: -2, arc: { flags: { awakeningSeed: true } } }, fail: { text: 'You threw away a working weapon for nothing.', conf: -10, xpPenalty: 10, spawnArc: { type: 'identity_crisis', actors: ['me'], causes: ['failed_reinvention'] }, arc: { resolve: 'broken' } } }
        ] }; }
  });

  // 8. LEADERSHIP — two strong egos, one team.
  T.push({ type: 'leadership', label: 'Who Leads This Team?', major: false, cooldown: 8, startChance: 0.45,
    detect: c => named(c, c.mates).filter(id => c.players[id].rank && c.me.rank && Math.abs(c.players[id].rank - c.me.rank) <= 6 && P(c, id).pride >= 0.6).slice(0, 1).map(id => ({ actors: ['me', id], causes: ['hierarchy'], pressure: 25 })),
    pulse: (c, a) => ({ touched: c.facts?.mateIds?.includes(a.actors[1]), pressure: c.facts?.mateIds?.includes(a.actors[1]) ? 6 : -6, fizzle: !c.facts?.mateIds?.includes(a.actors[1]) && a.stage === 0 && c.fxNo - a.startedFx > 2 }),
    modifiers: (c, a) => ({ mate: a.flags.leader === 'me' ? 1.08 : a.flags.leader ? 0.95 : 1 }),
    scene: (c, a) => { const id = a.actors[1]; if (!inMine(c, id)) return null;
      return { title: 'The Captain’s Armband', actor: id, cat: 'team', text: 'The coaches want one voice on the pitch. It’s you or ' + N(c, id) + '. They’re already acting like it’s theirs.',
        choices: [
          { key: 'claim', label: 'Claim it', hint: 'Lead the team. More influence, more scrutiny.', risk: 'ambitious', odds: C(0.4 + (st(c).ego + st(c).vision - 130) / 140, [], 'ambitious'), reward: 'Team plays through you (team scoring up)', failHint: 'Public loss of face',
            success: { text: 'They follow your lead.', arc: { resolve: 'leader', flags: { leader: 'me' } }, rel: { rivalry: 10 }, temp: { mateGoals: 0.15 } }, mixed: { text: 'Shared, awkwardly.', arc: { resolve: 'shared' } }, fail: { text: 'The team picks them.', conf: -6, rel: { respect: -6 }, arc: { resolve: 'follower', flags: { leader: id } } } },
          { key: 'support', label: 'Back them as leader', hint: 'Trust grows; your voice shrinks.', risk: 'conservative', odds: 0.85, reward: 'Trust and team chemistry', failHint: 'Seen as weak',
            success: { text: 'They remember it.', rel: { trust: 12, compat: 6 }, arc: { resolve: 'supported' } }, mixed: { text: 'Fine.', rel: { trust: 6 }, arc: { resolve: 'supported' } }, fail: { text: 'Some think you gave up.', conf: -3, arc: { resolve: 'supported' } } }
        ] }; }
  });

  // 9. TEAMMATE SURVIVAL — someone you care about might be eliminated.
  T.push({ type: 'teammate_survival', label: 'Save Them', major: false, cooldown: 6, startChance: 0.7, survivesElimination: true, needsActive: false,
    stageFilter: c => ['second', 'third', 'nel'].includes(c.worldStage),
    detect: c => named(c, Object.keys(c.rels)).filter(id => (R(c, id).trust >= 55 || (R(c, id).partnership?.stage || 0) >= 1) && c.players[id].rank && c.players[id].rank > c.cutLine * 0.85).slice(0, 1).map(id => ({ actors: ['me', id], causes: ['partner_at_risk'], pressure: 30 })),
    pulse: (c, a) => { const id = a.actors[1], q = c.players[id];
      if (q?.status === 'eliminated') return { resolve: 'lost', note: S(c, id) + ' was eliminated' };
      if (q?.rank && q.rank < c.cutLine * 0.6) return { resolve: 'saved', note: S(c, id) + ' is safe' };
      return { pressure: 5, touched: true }; },
    scene: (c, a) => { const id = a.actors[1]; if (a.stage > 0) return null;
      return { title: S(c, id) + ' Is in Danger', actor: id, cat: 'team', text: N(c, id) + ' is ranked #' + c.players[id].rank + '. The next cut could take them. You could help — at a cost to yourself.',
        choices: [
          { key: 'help', label: 'Spend your week helping them', hint: 'Extra sessions together. Their form improves; yours may not.', risk: 'ambitious', odds: C(0.5 + (st(c).passing + st(c).vision - 120) / 200, [], 'ambitious'), reward: 'Their survival odds rise; deep trust', failHint: 'You both stagnate',
            success: { text: 'You see them believe again.', npc: { id, ovr: 1.5, form: 1 }, rel: { trust: 14, compat: 6 }, fitness: -6, xpPenalty: 3, arc: { advance: true } }, mixed: { text: 'It helps a little.', npc: { id, ovr: 0.6 }, rel: { trust: 8 }, fitness: -6 }, fail: { text: 'Neither of you improves.', fitness: -8, conf: -2 } },
          { key: 'self', label: 'Focus on your own survival', hint: 'This is Blue Lock.', risk: 'conservative', odds: 0.9, reward: 'Your preparation is untouched', failHint: 'Guilt',
            success: { text: 'You do what Blue Lock demands.', form: 0.5, rel: { trust: -4 } }, mixed: { text: 'It weighs on you.', rel: { trust: -4 } }, fail: { text: 'You can’t stop thinking about them.', rel: { trust: -6 }, conf: -2 } }
        ] }; }
  });

  // 10. IDENTITY CRISIS — aftermath of failure.
  T.push({ type: 'identity_crisis', label: 'Identity Crisis', major: true, cooldown: 8, startChance: 0.5, survivesElimination: true,
    detect: c => (c.recentRatings.length >= 3 && c.recentRatings.slice(-3).every(r => r < 6.2) && c.pressure.identity >= 25) ? [{ actors: ['me'], causes: ['slump'], pressure: 40 }] : [],
    pulse: (c, a) => { const f = c.facts || {}; if (f.rating >= 7.6) return { resolve: 'recovered', note: 'You found yourself again' }; return { pressure: f.rating < 6.2 ? 8 : -6, touched: true, advance: a.stage < 2 && a.pressure > 35 }; },
    modifiers: (c, a) => ({ weapon: 0.9, adapt: 6, perf: -0.02 }),
    scene: (c, a) => a.stage >= 1 ? { title: 'Who Are You Now?', cat: 'personal', major: true, text: 'Nothing you trusted works. Your weapon feels like someone else’s. You have to decide what kind of footballer you are going to be.',
      choices: [
        { key: 'rebuild', label: 'Rebuild from the foundations', hint: 'Simple football, repeated until confidence returns.', risk: 'conservative', odds: 0.75, reward: 'Recovery', failHint: 'Slow',
          success: { text: 'Small successes stack up.', conf: 10, form: 1, pressure: { identity: -25 }, arc: { resolve: 'rebuilt' } }, mixed: { text: 'Better.', conf: 5, pressure: { identity: -10 } }, fail: { text: 'Still lost.', conf: 1 } },
        { key: 'secondary', label: 'Make your secondary weapon your main identity', hint: 'A permanent change in who you are on the pitch.', risk: 'ambitious', irreversible: true, odds: C(0.45 + (c.W?.secondary?.level || 0) * 0.07, [], 'ambitious'), reward: 'Your secondary weapon becomes primary (keeps its mastery)', failHint: 'A wasted transition',
          success: { text: 'You become a different player, and a dangerous one.', swapWeapons: true, conf: 8, pressure: { identity: -40 }, arc: { resolve: 'reinvented' }, milestone: 'Rebuilt your identity around a new primary weapon.' }, mixed: { text: 'Halfway there.', conf: 2 }, fail: { text: 'Neither weapon feels like yours.', conf: -6, form: -1 } },
        { key: 'rage', label: 'Burn it all with ego', hint: 'Play angry. Volatile, sometimes brilliant.', risk: 'ambitious', odds: C(0.3 + (st(c).ego - 60) / 120, [], 'ambitious'), reward: 'Big upside, more cards', failHint: 'Self-destruction',
          success: { text: 'The anger becomes fuel.', form: 1.5, conf: 6, temp: { performance: 0.06, cardRisk: 1 }, arc: { resolve: 'raged_through' } }, mixed: { text: 'Fired up, reckless.', temp: { cardRisk: 1 } }, fail: { text: 'It turns inward.', conf: -6, temp: { cardRisk: 1 } } }
      ] } : null
  });

  // 11. JEALOUSY — a teammate resents your rise.
  T.push({ type: 'jealousy', label: 'Resentment', major: false, cooldown: 6, startChance: 0.5,
    detect: c => named(c, c.mates).filter(id => P(c, id).pride >= 0.65 && P(c, id).selfish >= 0.55 && (R(c, id).overtaken || c.facts?.overtook === id)).slice(0, 1).map(id => ({ actors: ['me', id], causes: ['overtaken_by_you'], pressure: 30 })),
    pulse: (c, a) => { const id = a.actors[1]; if (!c.facts?.mateIds?.includes(id)) return { pressure: -4 }; return { touched: true, pressure: c.facts.rating >= 7.5 ? 8 : 2, advance: a.stage < 1 }; },
    modifiers: (c, a) => ({ combo: 0.9 }),
    scene: (c, a) => { const id = a.actors[1]; if (a.stage < 1 || !inMine(c, id)) return null;
      return { title: S(c, id) + ' Resents You', actor: id, cat: 'team', text: 'Since you passed them in the rankings, ' + N(c, id) + ' has stopped looking at you in possession. "' + (L(c, id, 'refuse') || L(c, id, 'rival')) + '"',
        choices: [
          { key: 'confront', label: 'Confront it head-on', hint: 'Respect is earned by force.', risk: 'ambitious', odds: C(0.35 + (st(c).ego + st(c).physical - 130) / 150, [], 'ambitious'), reward: 'Respect; passes start coming', failHint: 'Open feud',
            success: { text: 'They respect strength.', rel: { respect: 12, hostility: -8 }, arc: { resolve: 'respected' } }, mixed: { text: 'Heated, unresolved.', rel: { hostility: 8 } }, fail: { text: 'Now it’s public.', rel: { hostility: 18, rivalry: 12 }, arc: { resolve: 'feud' } } },
          { key: 'credit', label: 'Credit them publicly', hint: 'Swallow your ego for the team.', risk: 'conservative', odds: 0.75, reward: 'Tension eases', failHint: 'Seen as condescending',
            success: { text: 'It disarms them.', rel: { hostility: -12, trust: 8 }, arc: { resolve: 'eased' } }, mixed: { text: 'Grudging nod.', rel: { hostility: -5 } }, fail: { text: '"Don’t patronise me."', rel: { hostility: 8 } } }
        ] }; }
  });

  // 12. MANAGER CONFIDENCE (professional) — the coach is losing faith.
  T.push({ type: 'manager_doubt', label: 'The Manager Doubts You', major: true, cooldown: 6, startChance: 0.8, stageFilter: c => c.worldStage === 'pro',
    detect: c => c.pro && c.pro.managerTrust < 40 ? [{ actors: ['me'], causes: ['manager_trust_' + Math.round(c.pro.managerTrust)], pressure: 40 }] : [],
    pulse: (c, a) => { if (!c.pro) return { fizzle: true }; if (c.pro.managerTrust >= 60) return { resolve: 'trusted', note: 'The manager believes in you again' }; return { touched: true, pressure: c.facts?.rating < 6.5 ? 10 : -6, advance: a.stage < 2 }; },
    modifiers: (c, a) => ({ perf: -0.01 * a.stage }),
    scene: (c, a) => a.stage >= 1 ? { title: 'A Meeting in the Manager’s Office', cat: 'pro', major: a.stage >= 2, text: 'The manager doesn’t offer you a seat. "Your role isn’t guaranteed any more. Show me why it should be."',
      choices: [
        { key: 'prove', label: 'Promise to earn it on the pitch', hint: 'Accept a tougher role and prove him wrong.', risk: 'ambitious', odds: 0.65, reward: 'Manager trust if you perform', failHint: 'Benched',
          success: { text: 'He nods once.', managerTrust: 12, temp: { performance: 0.04 } }, mixed: { text: '"We’ll see."', managerTrust: 4 }, fail: { text: 'He has already made up his mind.', managerTrust: -6, pressure: { selection: 10 } } },
        { key: 'transfer', label: 'Ask to leave', hint: 'Request a transfer this window.', risk: 'conservative', odds: 0.85, irreversible: true, reward: 'Transfer offers at season end', failHint: 'Club refuses',
          success: { text: 'He doesn’t argue. Your agent starts calling.', transferRequest: true, arc: { resolve: 'leaving' }, rep: { conduct: -3 } }, mixed: { text: 'They’ll consider offers.', transferRequest: true, arc: { resolve: 'leaving' } }, fail: { text: '"You’re under contract."', managerTrust: -4 } },
        { key: 'argue', label: 'Tell him he’s wrong', hint: 'Ego. Could earn respect — or end the relationship.', risk: 'extreme', odds: C(0.12 + (st(c).ego - 70) / 200, [], 'extreme'), reward: 'Guaranteed starter status and a captaincy path', failHint: 'Frozen out; media story',
          success: { text: 'He stares, then laughs. "Good. That’s what I wanted to see."', managerTrust: 30, rep: { football: 4 }, arc: { resolve: 'won_over' }, moment: { title: 'Won Over', tone: 'triumph', text: 'You stood up to your manager and he respected it.' } }, mixed: { text: 'Tense. You’re still in the squad.', managerTrust: -4 }, fail: { text: 'You’re training with the reserves next week.', managerTrust: -20, rep: { media: 6, conduct: -8 }, pressure: { public: 15 } } }
      ] } : null
  });

  // 13. PUBLIC EXPECTATION (professional) — the fee, the salary, the headlines.
  T.push({ type: 'expectation', label: 'Under the Spotlight', major: false, cooldown: 6, startChance: 0.7, stageFilter: c => c.worldStage === 'pro',
    detect: c => c.pro && c.pressure.public >= 30 ? [{ actors: ['me'], causes: ['public_' + Math.round(c.pressure.public)], pressure: 30 }] : [],
    pulse: (c, a) => { if (c.pressure.public < 15) return { resolve: 'faded', note: 'The noise died down' }; return { touched: true, pressure: c.facts?.rating >= 7.8 ? -10 : 4, advance: a.stage < 1 }; },
    scene: (c, a) => a.stage >= 1 ? { title: 'The Headlines', cat: 'pro', text: 'A newspaper runs your salary next to your goal record. The comparison isn’t kind.',
      choices: [
        { key: 'media', label: 'Answer them in an interview', hint: 'Win the narrative with words.', risk: 'ambitious', odds: C(0.35 + (st(c).ego - 60) / 150, [], 'ambitious'), reward: 'Media reputation, pressure relief', failHint: 'A worse headline',
          success: { text: 'Your answer goes viral for the right reasons.', rep: { media: 8 }, pressure: { public: -20 }, arc: { resolve: 'answered' } }, mixed: { text: 'A mixed reception.', rep: { media: 2 } }, fail: { text: 'One quote is taken out of context.', rep: { media: -6, conduct: -3 }, pressure: { public: 10 } } },
        { key: 'silence', label: 'Say nothing, score goals', hint: 'Only the football matters.', risk: 'conservative', odds: 0.8, reward: 'Focus', failHint: 'The story grows',
          success: { text: 'You shut everything out.', form: 0.5 }, mixed: { text: 'Mostly.', }, fail: { text: 'Silence becomes its own story.', pressure: { public: 6 } } }
      ] } : null
  });

  // 14. REUNION (professional) — an old partner or rival reappears.
  T.push({ type: 'reunion', label: 'Old Faces', major: false, cooldown: 4, startChance: 0.8, stageFilter: c => c.worldStage === 'pro',
    detect: c => named(c, [...(c.opps || []), ...(c.mates || [])]).filter(id => { const r = R(c, id); return (r.rivalry >= 40 || r.trust >= 55) && (r.lastSeenFx ?? 0) < c.fxNo - 6; }).slice(0, 1).map(id => ({ actors: ['me', id], causes: [inMine(c, id) ? 'same_club' : 'opponents'], flags: { mate: inMine(c, id) }, pressure: 30 })),
    pulse: (c, a) => ({ resolve: c.facts?.oppIds?.includes(a.actors[1]) || c.facts?.mateIds?.includes(a.actors[1]) ? 'met' : null, note: 'You met again' }),
    scene: (c, a) => { const id = a.actors[1], r = R(c, id), partner = r.trust >= 55 && r.rivalry < 50;
      return { title: (a.flags.mate ? 'Teammates Again: ' : 'Across the Pitch: ') + S(c, id), actor: id, cat: 'pro', text: (partner ? 'Years after Blue Lock, ' + N(c, id) + ' grins when they see you. ' : N(c, id) + ' hasn’t forgotten anything. ') + '"' + L(c, id, partner ? 'partner' : 'rival') + '"',
        choices: a.flags.mate ? [
          { key: 'reunite', label: 'Pick up where you left off', hint: 'Old patterns, new level.', risk: 'conservative', odds: C(0.5 + r.compat / 200, [], 'conservative'), reward: 'Partnership progress', failHint: 'Awkward',
            success: { text: 'It’s like no time passed.', rel: { trust: 8 }, partnership: { xp: 8 } }, mixed: { text: 'It takes a while.', rel: { trust: 3 } }, fail: { text: 'You’ve both changed.', rel: { compat: -6 } } },
          { key: 'compete', label: 'Compete for the same role', hint: 'Only one of you starts.', risk: 'ambitious', odds: 0.5, reward: 'Starter status', failHint: 'Bench',
            success: { text: 'The role is yours.', managerTrust: 8, rel: { rivalry: 12 } }, mixed: { text: 'Rotation.', rel: { rivalry: 6 } }, fail: { text: 'They start. You don’t.', managerTrust: -6, pressure: { selection: 10 } } }
        ] : [
          { key: 'respect', label: 'Shake hands', hint: 'Mutual respect. Cooler rivalry.', risk: 'conservative', odds: 0.85, reward: 'Respect', failHint: 'Snubbed',
            success: { text: 'A long handshake.', rel: { respect: 10, hostility: -6 } }, mixed: { text: 'Polite.', rel: { respect: 4 } }, fail: { text: 'They walk past your hand.', rel: { hostility: 8 } } },
          { key: 'reignite', label: 'Reignite it', hint: 'A guaranteed duel, like old times.', risk: 'ambitious', odds: 0.75, reward: 'Duel; rivalry escalates', failHint: 'Distraction',
            success: { text: 'Old fire.', duelForce: id, rel: { rivalry: 12 } }, mixed: { text: 'Smouldering.', duelForce: id }, fail: { text: 'You think about them more than the match.', temp: { performance: -0.03 } } }
        ] }; }
  });

  EW.data = Object.assign(EW.data || {}, { ARC_TEMPLATES: T });
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
})(typeof globalThis !== 'undefined' ? globalThis : this);
