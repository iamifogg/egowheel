/* EgoWheel — event director.
 * Looks at the real career state, picks at most one short scene per fixture, and offers 2–3
 * choices whose odds depend on attributes, ego style and relationships. The chosen option is
 * resolved on the wheel (Success / Mixed / Backfire). Every event has prerequisites, a weight,
 * a cooldown and repetition control. Effects are data; the app applies them.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const sig = x => 1 / (1 + Math.exp(-x));
  const L = (ctx, id, sit) => EW.relationships.line(ctx.players[id], sit);
  const N = (ctx, id) => ctx.players[id]?.name || 'Someone';
  const S = (ctx, id) => ctx.players[id]?.short || 'They';
  const P = (ctx, id) => EW.relationships.persOf(ctx.players[id]);
  const R = (ctx, id) => ctx.rels[id] || { respect: 30, rivalry: 0, compat: 45, trust: 25, hostility: 5, read: 0, enc: {}, moments: [] };
  const named = (ctx, ids) => (ids || []).filter(id => ctx.players[id]?.named && ctx.players[id].status !== 'eliminated');
  const best = (ids, f) => ids.slice().sort((a, b) => f(b) - f(a))[0] || null;
  const egoIs = (ctx, list) => list.includes(ctx.egoStyle);

  const CATALOGUE = [
    // ---------------- RIVALRY ----------------
    { id: 'rival_notice', cat: 'rivalry', cooldown: 3,
      actor: c => best(named(c, c.opps).filter(id => R(c, id).rivalry < 40 && !R(c, id).noticed), id => c.players[id].tier === 1 ? 50 + c.players[id].ovr : c.players[id].ovr),
      weight: (c, a) => a ? 2.2 + (c.rank <= c.total * 0.3 ? 1.2 : 0) : 0,
      title: (c, a) => N(c, a) + ' Has Noticed You',
      text: (c, a) => 'Before the match, ' + S(c, a) + ' stops in front of you. "' + L(c, a, 'notice') + '"',
      choices: (c, a) => [
        { key: 'provoke', label: 'Answer back', hint: 'Escalates the rivalry. Ego decides whether it fuels you.', odds: c.stats.ego / 100 * 0.6 + 0.2,
          success: { text: 'Your reply lands. ' + S(c, a) + ' smiles like a predator. This is personal now.', rel: { rivalry: 18, respect: 8 }, conf: 5, flag: 'noticed' },
          mixed: { text: 'Words are exchanged. Nobody wins the corridor.', rel: { rivalry: 12, hostility: 6 }, flag: 'noticed' },
          fail: { text: S(c, a) + ' laughs you off. It stings.', rel: { rivalry: 10, respect: -6 }, conf: -5, flag: 'noticed' } },
        { key: 'study', label: 'Say nothing. Study them.', hint: 'Learn their habits for a future duel.', odds: (c.stats.vision + c.stats.reactions) / 200,
          success: { text: 'You catalogue every habit. If you meet in a duel, you’ll be ready.', rel: { rivalry: 6, respect: 4 }, duelBonus: { [a]: 8 }, flag: 'noticed' },
          mixed: { text: 'You learn a little.', rel: { rivalry: 5 }, duelBonus: { [a]: 4 }, flag: 'noticed' },
          fail: { text: 'You spend so long watching them you forget your own preparation.', rel: { rivalry: 4 }, form: -0.5, flag: 'noticed' } }
      ] },
    { id: 'rival_clash', cat: 'rivalry', cooldown: 3,
      actor: c => best(named(c, c.opps).filter(id => R(c, id).rivalry >= 40), id => R(c, id).rivalry),
      weight: (c, a) => a ? 3 + R(c, a).rivalry / 25 : 0,
      title: (c, a) => 'Collision Course: ' + S(c, a),
      text: (c, a) => 'Your rivalry with ' + N(c, a) + ' (' + R(c, a).status + ') is the talk of the facility. "' + L(c, a, 'rival') + '"',
      choices: (c, a) => [
        { key: 'accept', label: 'Promise a direct duel', hint: 'Guarantees a confrontation with them in this match.', odds: 0.75,
          success: { text: 'The stage is set. You will meet ' + S(c, a) + ' head-on.', rel: { rivalry: 10, respect: 5 }, duelForce: a, conf: 3 },
          mixed: { text: 'You call them out. They accept with a shrug that annoys you.', rel: { rivalry: 8, hostility: 5 }, duelForce: a },
          fail: { text: 'You call them out, then get dragged into a shouting match. Coaches are watching.', rel: { rivalry: 8, hostility: 10 }, duelForce: a, conf: -3, temp: { cardRisk: 1 } } },
        { key: 'mind', label: 'Play mind games', hint: 'Get inside their head. Ego and composure matter.', odds: sig((c.stats.ego - 65) / 10) * 0.8 + 0.1,
          success: { text: S(c, a) + ' is rattled. You’ve won before kick-off.', rel: { rivalry: 8, hostility: 6 }, duelBonus: { [a]: 10 }, temp: { performance: .05 } },
          mixed: { text: 'Neither of you blinks.', rel: { rivalry: 6 } },
          fail: { text: 'It backfires. They’re laughing; you’re the one rattled.', rel: { rivalry: 6, respect: -5 }, conf: -6, duelBonus: { [a]: -6 } } },
        { key: 'walk', label: 'Walk away', hint: 'Save your energy for the pitch.', odds: 0.85,
          success: { text: 'You let the football talk. Your focus is perfect.', form: 0.5, rel: { respect: 2 } },
          mixed: { text: 'You walk away. It eats at you a little.', conf: -1 },
          fail: { text: '"Running already?" The words follow you onto the pitch.', rel: { respect: -6 }, conf: -4 } }
      ] },
    { id: 'revenge', cat: 'rivalry', cooldown: 4,
      actor: c => best(named(c, c.opps).filter(id => c.flags['beatenBy_' + id]), id => R(c, id).rivalry),
      weight: (c, a) => a ? 6 : 0,
      title: (c, a) => 'A Chance for Revenge',
      text: (c, a) => 'Last time, ' + N(c, a) + ' got the better of you. They’re on the other side again. You can still hear it: "' + L(c, a, 'beatYou') + '"',
      choices: (c, a) => [
        { key: 'obsess', label: 'Obsess over the rematch', hint: 'Huge motivation; costs fitness. Your next duel with them is far more likely.', odds: 0.7,
          success: { text: 'Every rep of the week is about them. You arrive sharp and furious.', duelForce: a, duelBonus: { [a]: 8 }, fitness: -6, conf: 4, rel: { rivalry: 8 }, clearFlag: 'beatenBy_' + a },
          mixed: { text: 'You arrive hungry, and a little tired.', duelForce: a, fitness: -8, rel: { rivalry: 6 }, clearFlag: 'beatenBy_' + a },
          fail: { text: 'You overcook it. The obsession leaves you drained.', fitness: -12, form: -0.5, rel: { rivalry: 5 } } },
        { key: 'counter', label: 'Build a counter-plan', hint: 'Prepare an adaptation. If you duel them, adapting becomes much stronger.', odds: (c.stats.vision + c.stats.technique) / 190,
          success: { text: 'You find the crack in their game. Adapting against them now comes naturally.', adaptBonus: { [a]: 14 }, rel: { respect: 5 }, clearFlag: 'beatenBy_' + a },
          mixed: { text: 'You find half an answer.', adaptBonus: { [a]: 7 } },
          fail: { text: 'You can’t find the crack. Not yet.', conf: -2 } },
        { key: 'release', label: 'Let it go', hint: 'Protect your mind. Rivalry cools a little.', odds: 0.8,
          success: { text: 'You put the defeat in its place. You play freer for it.', conf: 3, rel: { rivalry: -8 }, clearFlag: 'beatenBy_' + a },
          mixed: { text: 'You try to let it go.', rel: { rivalry: -4 } },
          fail: { text: 'You can’t. It sits in your stomach all match.', form: -0.5 } }
      ] },
    { id: 'rival_overtook', cat: 'rivalry', cooldown: 4,
      actor: c => best(Object.keys(c.rels).filter(id => c.players[id]?.status === 'active' && R(c, id).rivalry >= 30 && c.players[id].rank && c.players[id].rank < c.rank && c.players[id].prevRank > c.prevRank), id => R(c, id).rivalry),
      weight: (c, a) => a ? 3.5 : 0,
      title: (c, a) => S(c, a) + ' Passes You in the Rankings',
      text: (c, a) => 'The board updates. ' + N(c, a) + ' is now #' + c.players[a].rank + '. You are #' + c.rank + '. They make sure you see them looking.',
      choices: (c, a) => [
        { key: 'fuel', label: 'Turn it into fuel', hint: 'Confidence swings either way. Goals and decisive actions become slightly likelier.', odds: sig((c.stats.ego - 60) / 12),
          success: { text: 'Good. Now you have a target.', conf: 5, temp: { goalP: .01, performance: .04 }, rel: { rivalry: 8 } },
          mixed: { text: 'You grit your teeth.', rel: { rivalry: 6 } },
          fail: { text: 'It gets under your skin and stays there.', conf: -6, rel: { rivalry: 6, hostility: 4 } } },
        { key: 'own', label: 'Focus on your own game', hint: 'Steady preparation.', odds: 0.8,
          success: { text: 'Their rank is not your problem. Your weapon is.', xpMult: 1.4, form: 0.5 },
          mixed: { text: 'You try to ignore the board.', conf: -1 },
          fail: { text: 'You can’t stop refreshing the rankings.', conf: -3 } }
      ] },
    { id: 'reluctant_ally', cat: 'rivalry', cooldown: 4,
      actor: c => best(named(c, c.mates).filter(id => R(c, id).rivalry >= 35), id => R(c, id).rivalry),
      weight: (c, a) => a ? 4 : 0,
      title: (c, a) => 'Same Side as ' + S(c, a),
      text: (c, a) => 'Fate puts your rival ' + N(c, a) + ' on your team. Nobody in the dressing room knows whether that’s a weapon or a disaster.',
      choices: (c, a) => [
        { key: 'combine', label: 'Propose a combination', hint: 'If it works, you gain a dangerous link-up. Compatibility matters.', odds: R(c, a).compat / 100 * 0.6 + 0.2,
          success: { text: 'For ninety minutes the rivalry becomes a weapon. "' + L(c, a, 'partner') + '"', rel: { compat: 12, trust: 12, respect: 6 }, temp: { mateGoals: .25, keyPasses: .3 } },
          mixed: { text: 'An uneasy truce.', rel: { compat: 5, trust: 4 } },
          fail: { text: 'They refuse. "' + (L(c, a, 'refuse') || L(c, a, 'rival')) + '"', rel: { hostility: 8, rivalry: 5 }, temp: { mateGoals: -.1 } } },
        { key: 'compete', label: 'Compete for the shots', hint: 'Goal threat up, creation down. Rivalry grows.', odds: 0.7,
          success: { text: 'Two egos racing for the same goal. The opposition suffers.', temp: { goalP: .015, shots: .3, keyPasses: -.2 }, rel: { rivalry: 10, respect: 4 } },
          mixed: { text: 'You get in each other’s way at times.', temp: { shots: .2 }, rel: { rivalry: 8 } },
          fail: { text: 'You collide twice going for the same ball.', temp: { performance: -.04 }, rel: { rivalry: 8, hostility: 6 } } }
      ] },
    { id: 'weapon_read', cat: 'personal', cooldown: 5,
      actor: c => best(named(c, c.opps).filter(id => (R(c, id).read || 0) >= 3 && P(c, id).analytic >= 0.6), id => R(c, id).read),
      weight: (c, a) => a ? 5 + R(c, a).read : 0,
      title: (c, a) => 'Your Weapon Has Been Read',
      text: (c, a) => N(c, a) + ' has seen your ' + (c.W?.primary?.name || 'weapon') + ' enough times. "' + L(c, a, 'read') + '" Forcing it against them will be harder.',
      choices: (c, a) => [
        { key: 'refine', label: 'Refine it anyway', hint: 'Stubborn: big mastery gain, but they still know it.', odds: 0.65,
          success: { text: 'You sharpen the same weapon until it cuts through anyway.', xpBonus: 8, rel: { respect: 4 } },
          mixed: { text: 'Progress, slowly.', xpBonus: 4 },
          fail: { text: 'You hammer the same idea and hit the same wall.', conf: -4 } },
        { key: 'adapt', label: 'Develop an adaptation', hint: 'Reduce the read. Success can trigger evolution.', odds: (c.stats.vision + c.stats.technique + c.stats.reactions) / 300 + (egoIs(c, ['Adaptation Addict', 'Devourer', 'World Devourer', 'Evolution Addict']) ? .12 : 0),
          success: { text: 'You build a new branch on the weapon. They’ll have to start reading again.', readReset: a, xpBonus: 5, evolveTrigger: true, milestone: 'Adapted after ' + N(c, a) + ' read your weapon.' },
          mixed: { text: 'A partial adjustment.', readHalf: a },
          fail: { text: 'The adaptation feels alien. Your rhythm suffers.', form: -1 } },
        { key: 'secondary', label: 'Lean on your secondary weapon', hint: 'Give them a different problem.', odds: 0.6,
          success: { text: 'Your secondary weapon becomes the main threat for a match.', temp: { performance: .04 }, readHalf: a },
          mixed: { text: 'It helps a bit.', readHalf: a },
          fail: { text: 'Your secondary weapon isn’t ready for this.', temp: { performance: -.03 } } }
      ] },
    { id: 'decisive_rivalry', cat: 'rivalry', major: true, cooldown: 8,
      actor: c => best(named(c, c.opps).filter(id => R(c, id).rivalry >= 70 && R(c, id).arc !== 'conquered' && R(c, id).enc.duels >= 1), id => R(c, id).rivalry),
      weight: (c, a) => a && c.importance >= 1.5 ? 12 : 0,
      title: (c, a) => 'Decisive Confrontation: ' + N(c, a),
      text: (c, a) => 'Everything between you and ' + S(c, a) + ' has led here. Win this duel and the rivalry is settled in your favour. Lose, and it defines them instead of you.',
      choices: (c, a) => [
        { key: 'allin', label: 'Everything on this duel', hint: 'A guaranteed duel with permanent consequences for both careers.', odds: 0.8,
          success: { text: 'The whole facility will be watching.', duelForce: a, decisive: a, conf: 4 },
          mixed: { text: 'Nerves shake you, but you’re ready.', duelForce: a, decisive: a },
          fail: { text: 'The pressure is enormous. You feel heavy.', duelForce: a, decisive: a, conf: -4 } },
        { key: 'team', label: 'Refuse to make it personal', hint: 'Play for the result. The rivalry stays unresolved.', odds: 0.8,
          success: { text: 'You choose the team over your ego. They call it cowardice. You call it control.', temp: { mateGoals: .2 }, rel: { respect: -4, rivalry: -6 } },
          mixed: { text: 'You try to stay calm.', rel: { rivalry: -3 } },
          fail: { text: 'You can’t switch it off. You’re distracted all match.', temp: { performance: -.05 } } }
      ] },

    // ---------------- TEAM ----------------
    { id: 'refuse_pass', cat: 'team', cooldown: 4,
      actor: c => best(named(c, c.mates).filter(id => P(c, id).selfish >= 0.75 && (R(c, id).hostility >= 20 || R(c, id).rivalry >= 25 || c.players[id].rank < c.rank)), id => P(c, id).selfish * 50 + R(c, id).hostility),
      weight: (c, a) => a ? 3.6 : 0,
      title: (c, a) => S(c, a) + ' Won’t Pass',
      text: (c, a) => 'In training, ' + N(c, a) + ' ignores you three times in a row in good positions. "' + (L(c, a, 'refuse') || 'Not this time.') + '" It will happen in the match too.',
      choices: (c, a) => [
        { key: 'confront', label: 'Confront them', hint: 'Escalates the rivalry. Might earn respect or a feud.', odds: sig((c.stats.ego + c.stats.physical - 130) / 15),
          success: { text: 'You stand your ground. ' + S(c, a) + ' respects strength. The ball might actually come now.', rel: { respect: 12, rivalry: 10 }, temp: { assistIn: .1 } },
          mixed: { text: 'A heated exchange. Nothing changes.', rel: { rivalry: 10, hostility: 10 } },
          fail: { text: 'It gets ugly. Coaches separate you. The feud is public now.', rel: { rivalry: 12, hostility: 18 }, conf: -4, temp: { performance: -.04 } } },
        { key: 'exploit', label: 'Exploit their selfishness', hint: 'Move where their shots get blocked or saved. Vision and off-ball movement.', odds: (c.stats.vision + c.stats.offBall) / 190,
          success: { text: 'You position yourself for the rebounds their selfishness creates.', temp: { shots: .35, goalP: .012 }, rel: { respect: 5 } },
          mixed: { text: 'Sometimes it works.', temp: { shots: .15 } },
          fail: { text: 'You end up nowhere near the ball.', temp: { performance: -.03 } } },
        { key: 'combine', label: 'Design a combination for them', hint: 'Give them the glory; you get the assist. Risky for your own numbers.', odds: R(c, a).compat / 100 * 0.5 + c.stats.passing / 250,
          success: { text: 'They take your pass because it leads to their goal. It works.', rel: { compat: 10, trust: 10 }, temp: { assistP: .02, mateGoals: .2, goalP: -.006 } },
          mixed: { text: 'They take the pattern, but not always the pass.', rel: { compat: 4 }, temp: { mateGoals: .1 } },
          fail: { text: 'They run your pattern and shoot from distance anyway.', rel: { hostility: 5 }, temp: { assistP: -.01 } } }
      ] },
    { id: 'partnership_offer', cat: 'team', cooldown: 5,
      actor: c => best(named(c, c.mates).filter(id => R(c, id).compat >= 55 && R(c, id).trust < 70 && R(c, id).rivalry < 50 && P(c, id).warmth >= 0.45), id => R(c, id).compat + R(c, id).trust),
      weight: (c, a) => a ? 3.2 : 0,
      title: (c, a) => 'An Offer from ' + S(c, a),
      text: (c, a) => N(c, a) + ' catches you after training. "' + L(c, a, 'partner') + '"',
      choices: (c, a) => [
        { key: 'accept', label: 'Build the partnership', hint: 'Unlocks combination plays with them. Partnerships in Blue Lock are complicated.', odds: R(c, a).compat / 100 * 0.6 + 0.25,
          success: { text: 'Extra sessions, shared patterns. On the pitch you start finding each other blind.', rel: { compat: 12, trust: 16 }, moment: 'Agreed to build a partnership.' },
          mixed: { text: 'It’s a start.', rel: { compat: 6, trust: 8 } },
          fail: { text: 'Your rhythms don’t match yet.', rel: { compat: -4 } } },
        { key: 'decline', label: 'Stay independent', hint: 'You’re here to become the best, not a duo.', odds: 0.85,
          success: { text: '"Fine. But I’ll remember you said no." Your ego is untouched.', rel: { respect: 4, compat: -6 }, conf: 2 },
          mixed: { text: 'An awkward moment.', rel: { compat: -5 } },
          fail: { text: 'It offends them more than you expected.', rel: { compat: -8, hostility: 8 } } }
      ] },
    { id: 'partner_strain', cat: 'team', cooldown: 5,
      actor: c => best(Object.keys(c.rels).filter(id => ['Partner', 'Trusted Partner'].includes(R(c, id).status) && c.players[id]?.status === 'active' && (c.lastObjective === 'goals' || c.lastObjective === 'showcase' || c.players[id].rank > c.rank)), id => R(c, id).trust),
      weight: (c, a) => a ? 3 : 0,
      title: (c, a) => 'Strain with ' + S(c, a),
      text: (c, a) => 'You’ve been chasing your own numbers. ' + N(c, a) + ' noticed. "Are we still doing this together, or not?"',
      choices: (c, a) => [
        { key: 'recommit', label: 'Recommit to the partnership', hint: 'Restore trust; your own scoring may suffer.', odds: 0.7,
          success: { text: 'You reset. The link-ups return.', rel: { trust: 10, compat: 6 }, temp: { mateGoals: .15 } },
          mixed: { text: 'Words are fine. Actions will tell.', rel: { trust: 4 } },
          fail: { text: 'It sounds hollow, even to you.', rel: { trust: -6 } } },
        { key: 'self', label: 'Put yourself first', hint: 'This is Blue Lock. The partnership may break.', odds: sig((c.stats.ego - 60) / 10),
          success: { text: '"Then I’ll beat you too." The partnership becomes a rivalry with history.', rel: { trust: -15, rivalry: 20, respect: 6 }, temp: { goalP: .012 }, conf: 3 },
          mixed: { text: 'Cold silence between you.', rel: { trust: -12, rivalry: 10 } },
          fail: { text: 'You lose the partner and the edge.', rel: { trust: -18, hostility: 12 }, conf: -3 } }
      ] },
    { id: 'squad_split', cat: 'team', cooldown: 6,
      actor: c => { const m = named(c, c.mates); return m.length >= 2 && c.lastResult === 'LOSS' ? m[0] : null; },
      weight: (c, a) => a ? 2.4 : 0,
      title: () => 'The Dressing Room Splits',
      text: (c, a) => { const m = named(c, c.mates); return 'After the defeat, ' + S(c, m[0]) + ' and ' + S(c, m[1]) + ' blame each other. Everyone turns to see whose side you’re on.'; },
      choices: (c, a) => { const m = named(c, c.mates), x = m[0], y = m[1]; return [
        { key: 'sideA', label: 'Back ' + S(c, x), hint: 'Earn their trust; lose the other’s.', odds: 0.75,
          success: { text: S(c, x) + ' remembers who stood with them.', rel: { trust: 12, compat: 6 }, relOther: { [y]: { hostility: 10, trust: -6 } } },
          mixed: { text: 'It calms nothing.', rel: { trust: 5 }, relOther: { [y]: { hostility: 6 } } },
          fail: { text: 'You make it worse.', rel: { trust: 2 }, relOther: { [y]: { hostility: 14 } }, temp: { mateGoals: -.1 } } },
        { key: 'sideB', label: 'Back ' + S(c, y), hint: 'Earn their trust; lose the other’s.', odds: 0.75,
          success: { text: S(c, y) + ' nods at you. An ally.', relOther: { [y]: { trust: 12, compat: 6 }, [x]: { hostility: 10, trust: -6 } } },
          mixed: { text: 'Lines are drawn.', relOther: { [y]: { trust: 5 }, [x]: { hostility: 6 } } },
          fail: { text: 'Both of them turn on you.', relOther: { [y]: { hostility: 6 }, [x]: { hostility: 12 } }, conf: -3 } },
        { key: 'lead', label: 'Take control of the room', hint: 'Leadership: ego and vision. Could unite or alienate everyone.', odds: (c.stats.ego + c.stats.vision) / 210,
          success: { text: 'You tell them exactly what went wrong and how you’ll fix it. They listen.', relOther: { [x]: { respect: 8 }, [y]: { respect: 8 } }, temp: { mateGoals: .2 }, conf: 4 },
          mixed: { text: 'Half of them listen.', relOther: { [x]: { respect: 3 } } },
          fail: { text: '"Who made you captain?"', relOther: { [x]: { hostility: 6 }, [y]: { hostility: 6 } }, conf: -4 } }
      ]; } },

    // ---------------- PERSONAL DEVELOPMENT ----------------
    { id: 'weakness', cat: 'personal', cooldown: 6,
      actor: c => (c.lastRating && c.lastRating < 6.3) ? 'self' : null,
      weight: (c, a) => a ? 2.4 : 0,
      title: () => 'A Weakness Exposed',
      text: (c) => 'The footage from your last match is brutal. Your weakest area — ' + c.weakLabel + ' — was targeted all game.',
      choices: (c) => [
        { key: 'fix', label: 'Drill the weakness', hint: 'Shore up ' + c.weakLabel + '. Slow, unglamorous growth.', odds: 0.75,
          success: { text: 'Hours of repetition. The hole is smaller.', stats: { [c.weakKey]: 3 }, fitness: -4 },
          mixed: { text: 'A little better.', stats: { [c.weakKey]: 1 }, fitness: -3 },
          fail: { text: 'It doesn’t click, and your confidence takes a hit.', conf: -4, fitness: -3 } },
        { key: 'double', label: 'Double down on your weapon', hint: 'Specialise. Make your strength so dominant the weakness stops mattering.', odds: 0.7,
          success: { text: 'You decide to be undeniable instead of complete.', xpBonus: 6, stats: { [c.strongKey]: 1 }, conf: 3 },
          mixed: { text: 'You sharpen the weapon a little.', xpBonus: 3 },
          fail: { text: 'Opponents keep attacking the weakness anyway.', conf: -3 } }
      ] },
    { id: 'obsession', cat: 'personal', cooldown: 5,
      actor: c => (c.form >= 1 && c.fitness >= 70) ? 'self' : null,
      weight: (c, a) => a ? 1.8 : 0,
      title: () => 'Training Obsession',
      text: () => 'You’re playing the best football of your life. Part of you wants to stay on the training pitch until midnight.',
      choices: (c) => [
        { key: 'more', label: 'Push further', hint: 'Extra growth, real fatigue.', odds: c.stats.stamina / 120,
          success: { text: 'The extra work pays off immediately.', stats: { [c.strongKey]: 2, ego: 1 }, fitness: -9 },
          mixed: { text: 'Some gains, heavy legs.', stats: { [c.strongKey]: 1 }, fitness: -11 },
          fail: { text: 'You overdo it. Your legs are empty.', fitness: -16, form: -1 } },
        { key: 'protect', label: 'Protect the form', hint: 'Rest and stay sharp.', odds: 0.9,
          success: { text: 'You protect what you’ve built.', fitness: 8, conf: 2 },
          mixed: { text: 'A quiet, sensible week.', fitness: 5 },
          fail: { text: 'Resting makes you restless.', form: -0.5 } }
      ] },
    { id: 'slump', cat: 'personal', cooldown: 6,
      actor: c => (c.ratings.length >= 2 && c.ratings.slice(-2).every(r => r < 6.4)) ? 'self' : null,
      weight: (c, a) => a ? 3.2 : 0,
      title: () => 'Rock Bottom',
      text: () => 'Two bad matches in a row. In Blue Lock, nobody waits for you to recover.',
      choices: (c) => [
        { key: 'reflect', label: 'Strip your game back', hint: 'Rebuild calmly. Reliable recovery.', odds: 0.75,
          success: { text: 'You remember what made you dangerous. Confidence returns.', conf: 10, form: 1 },
          mixed: { text: 'Slowly, you steady yourself.', conf: 5 },
          fail: { text: 'The doubt doesn’t leave.', conf: 1 } },
        { key: 'rage', label: 'Get angry', hint: 'Channel it. Big upside; cards and errors more likely.', odds: sig((c.stats.ego - 55) / 12),
          success: { text: 'The anger becomes a weapon.', form: 1.5, conf: 6, temp: { performance: .06, cardRisk: 1 } },
          mixed: { text: 'You’re fired up and a little reckless.', form: .5, temp: { cardRisk: 1 } },
          fail: { text: 'The anger turns inward.', conf: -5, temp: { cardRisk: 1 } } },
        { key: 'devour', label: 'Study someone better', hint: 'Learn from the best player you’ve faced. Can expand your ceiling.', odds: (c.stats.vision + c.stats.technique) / 200,
          success: { text: 'Watching them, you finally see the step you’re missing.', potential: 1, conf: 4, xpBonus: 4 },
          mixed: { text: 'A useful idea.', xpBonus: 3 },
          fail: { text: 'It just makes the gap look bigger.', conf: -3 } }
      ] },

    // ---------------- SELECTION PRESSURE ----------------
    { id: 'last_chance', cat: 'selection', major: true, cooldown: 3,
      actor: c => c.atRisk ? 'self' : null,
      weight: (c, a) => a ? 6 : 0,
      title: () => 'Last Chance',
      text: (c) => c.riskText,
      choices: (c) => [
        { key: 'allin', label: 'All in', hint: 'Showcase mode: much higher ceiling, higher variance, fitness cost.', odds: 0.75,
          success: { text: 'You have nothing to lose. You play like it.', objective: 'showcase', temp: { performance: .07 }, fitness: -6, conf: 4 },
          mixed: { text: 'You commit fully, with nerves.', objective: 'showcase', fitness: -6 },
          fail: { text: 'The pressure crushes your sleep. You arrive tense.', objective: 'showcase', conf: -6 } },
        { key: 'calm', label: 'Trust your process', hint: 'Composure: fewer errors.', odds: (c.stats.reactions + c.stats.ego) / 190,
          success: { text: 'Breathe. Same weapon, same habits.', temp: { performance: .03, errorDown: 1 }, conf: 3 },
          mixed: { text: 'Mostly calm.', temp: { performance: .01 } },
          fail: { text: 'Calm is impossible.', conf: -4 } }
      ] },
    { id: 'elite_invite', cat: 'selection', cooldown: 6,
      actor: c => (c.rank && c.rank <= 10 && c.worldStage !== 'pro') ? 'self' : null,
      weight: (c, a) => a ? 2.6 : 0,
      title: () => 'Invitation: Elite Session',
      text: (c) => 'Ego’s voice comes over the speakers: the top-ranked egoists will train together tonight. You’re #' + c.rank + '. You’re invited.',
      choices: (c) => [
        { key: 'go', label: 'Attend and steal everything', hint: 'Growth and potential; rivals will notice you more.', odds: 0.75,
          success: { text: 'Training with the best rearranges what you think is possible.', potential: 1, stats: { [c.strongKey]: 2 }, fitness: -5, rivalsNotice: 8 },
          mixed: { text: 'You hold your own.', stats: { [c.strongKey]: 1 }, fitness: -5, rivalsNotice: 5 },
          fail: { text: 'You’re out of your depth tonight.', conf: -5, fitness: -5 } },
        { key: 'skip', label: 'Decline and recover', hint: 'Protect your body before the match.', odds: 0.9,
          success: { text: 'You rest while the others burn energy.', fitness: 10 },
          mixed: { text: 'Rest, with some regret.', fitness: 6 },
          fail: { text: 'Word spreads that you skipped it.', conf: -2 } }
      ] },
    { id: 'replace_star', cat: 'selection', cooldown: 6,
      actor: c => best(named(c, c.mates).filter(id => c.players[id].pos === c.myPos && c.players[id].rank > c.rank), id => -c.players[id].rank),
      weight: (c, a) => a ? 2.8 : 0,
      title: (c, a) => 'Taking ' + S(c, a) + '’s Role',
      text: (c, a) => 'You now rank above ' + N(c, a) + ', who plays your position. The staff hint that the role is yours if you take it.',
      choices: (c, a) => [
        { key: 'take', label: 'Take the role', hint: 'More of the decisive moments go through you; they won’t forget.', odds: 0.75,
          success: { text: 'The role is yours.', temp: { performance: .04, shots: .2 }, rel: { rivalry: 15, hostility: 8 }, conf: 4 },
          mixed: { text: 'You share it, uneasily.', temp: { performance: .02 }, rel: { rivalry: 10 } },
          fail: { text: 'The staff change their minds at the last second.', conf: -4, rel: { rivalry: 8 } } },
        { key: 'share', label: 'Offer to play alongside them', hint: 'Partnership potential; less of the spotlight.', odds: R(c, a).compat / 100 * 0.5 + .3,
          success: { text: 'Two players in one role. It works better than anyone expected.', rel: { compat: 10, trust: 10 }, temp: { mateGoals: .2 } },
          mixed: { text: 'It’s a compromise.', rel: { compat: 4 } },
          fail: { text: 'They see it as pity.', rel: { hostility: 10 } } }
      ] },

    // ---------------- MARKET (NEL) ----------------
    { id: 'club_interest', cat: 'market', cooldown: 3,
      actor: c => (c.nel && c.nel.bidClub && c.nel.bidClub !== c.nel.club) ? 'self' : null,
      weight: (c, a) => a ? 2.4 : 0,
      title: (c) => c.nel.bidClub + ' Are Interested',
      text: (c) => c.nel.bidClub + ' currently hold the highest bid for you: ¥' + c.nel.bid + 'm. Their scouts will be at the next match.',
      choices: (c) => [
        { key: 'impress', label: 'Play for their scouts', hint: 'Showcase their philosophy. Bigger swings in value.', odds: 0.65,
          success: { text: 'You play exactly the football they love.', temp: { performance: .05 }, bidBoost: 6 },
          mixed: { text: 'They take notes.', bidBoost: 2 },
          fail: { text: 'You try too hard to impress.', temp: { performance: -.03 } } },
        { key: 'loyal', label: 'Stay loyal to your club’s plan', hint: 'Teammates appreciate it.', odds: 0.85,
          success: { text: 'Your club’s players notice your commitment.', clubTrust: 6, temp: { mateGoals: .1 } },
          mixed: { text: 'Business as usual.', clubTrust: 3 },
          fail: { text: 'Nobody notices either way.' } }
      ] },
    { id: 'cutoff_race', cat: 'market', major: true, cooldown: 2,
      actor: c => (c.nel && c.nel.pos >= 18 && c.nel.pos <= 30 && c.nel.left <= 4) ? best(c.nel.near.filter(id => c.players[id]?.named), id => c.players[id].bid) || 'self' : null,
      weight: (c, a) => a ? 5 : 0,
      title: (c) => 'The Cutoff Race',
      text: (c, a) => 'You’re ' + c.nel.pos + (c.nel.pos === 21 ? 'st' : c.nel.pos === 22 ? 'nd' : c.nel.pos === 23 ? 'rd' : 'th') + ' in the auction with ' + c.nel.left + ' NEL match' + (c.nel.left === 1 ? '' : 'es') + ' left. The 23rd place is at ¥' + c.nel.cutoff + 'm' + (a && a !== 'self' ? '. ' + N(c, a) + ' is right beside you on the board.' : '.'),
      choices: (c, a) => [
        { key: 'numbers', label: 'Chase numbers', hint: 'Goals and assists move bids most. Risky.', odds: 0.7,
          success: { text: 'You go hunting for decisive actions.', objective: c.role === 'def' ? 'defend' : 'goals', temp: { performance: .04 }, rel: a && a !== 'self' ? { rivalry: 8 } : null },
          mixed: { text: 'You chase, a little desperately.', objective: c.role === 'def' ? 'defend' : 'goals' },
          fail: { text: 'Desperation shows.', conf: -5 } },
        { key: 'consistent', label: 'Be consistent', hint: 'Clubs reward reliability too.', odds: 0.8,
          success: { text: 'You do your job perfectly. Scouts value certainty.', temp: { errorDown: 1, performance: .02 } },
          mixed: { text: 'Steady.', temp: { errorDown: 1 } },
          fail: { text: 'Playing safe feels like hiding.', conf: -2 } }
      ] },

    // ---------------- EXCEPTIONAL ----------------
    { id: 'master_watch', cat: 'exceptional', cooldown: 12, once: false,
      actor: c => (c.importance >= 1.6 && c.rank && c.rank <= 15) ? 'self' : null,
      weight: (c, a) => a ? 0.9 : 0,
      title: () => 'Someone Important Is Watching',
      text: (c) => (c.worldStage === 'nel' ? 'Noel Noa himself' : 'A world-class scout') + ' is in the stands. People will talk about this match for years — if you make them.',
      choices: (c) => [
        { key: 'statement', label: 'Make a statement', hint: 'A rare chance to expand your ceiling.', odds: sig((c.stats.ego + c.conf - 120) / 18),
          success: { text: 'You feel your limits move.', potential: 2, temp: { performance: .06 }, milestone: 'Played under the eyes of the world’s best — and rose to it.' },
          mixed: { text: 'You play well, nothing more.', temp: { performance: .02 } },
          fail: { text: 'The weight of it freezes you.', conf: -6, temp: { performance: -.04 } } },
        { key: 'ignore', label: 'Pretend they’re not there', hint: 'No pressure, no extra reward.', odds: 0.9,
          success: { text: 'Just another match.', form: .5 },
          mixed: { text: 'Mostly normal.' },
          fail: { text: 'You keep glancing at the stands.', conf: -2 } }
      ] },
    { id: 'thank_assist', cat: 'team', cooldown: 6,
      actor: c => c.lastAssistedBy && c.players[c.lastAssistedBy]?.named ? c.lastAssistedBy : null,
      weight: (c, a) => a ? 2 : 0,
      title: (c, a) => 'The Pass That Mattered',
      text: (c, a) => N(c, a) + ' set up your goal last match. In Blue Lock, gratitude is complicated.',
      choices: (c, a) => [
        { key: 'thank', label: 'Thank them properly', hint: 'Trust grows.', odds: 0.85,
          success: { text: 'They pretend not to care. They care.', rel: { trust: 12, compat: 6 } },
          mixed: { text: 'An awkward nod.', rel: { trust: 5 } },
          fail: { text: '"Don’t get used to it."', rel: { trust: 2 } } },
        { key: 'own', label: 'Claim it was your goal', hint: 'Ego intact; they may resent it.', odds: sig((c.stats.ego - 60) / 10),
          success: { text: 'You make it clear: the finish made the goal.', conf: 4, rel: { respect: 4, compat: -5 } },
          mixed: { text: 'They roll their eyes.', rel: { compat: -6 } },
          fail: { text: 'They stop passing to you.', rel: { compat: -10, hostility: 8 } } }
      ] }
  ];

  /** Choose an event for this fixture (or null). Pacing: ~1 in 3 fixtures, more when stakes are high. */
  function choose(ctx, rng) {
    const candidates = [];
    for (const ev of CATALOGUE) {
      const last = ctx.last[ev.id];
      if (last !== undefined && ctx.fxNo - last < ev.cooldown) continue;
      if (ev.once && last !== undefined) continue;
      let actor = null;
      try { actor = ev.actor(ctx); } catch (_) { actor = null; }
      if (!actor) continue;
      let w = ev.weight(ctx, actor);
      const count = ctx.counts[ev.id] || 0;
      w *= Math.pow(0.7, count); // repetition control
      if (ctx.lastCat && ctx.lastCat === ev.cat) w *= 0.6;
      if (w > 0) candidates.push({ ev, actor, w });
    }
    if (!candidates.length) return null;
    const total = candidates.reduce((t, c) => t + c.w, 0);
    const hasMajor = candidates.some(c => c.ev.major);
    let p = clamp(0.14 + total * 0.02 + (ctx.importance >= 1.6 ? 0.08 : 0), 0.12, 0.45);
    if (ctx.lastSceneFx === ctx.fxNo - 1 && !hasMajor) p *= 0.4;
    if (hasMajor) p = Math.max(p, 0.75);
    if (rng.next() > p) return null;
    const pick = rng.weighted(candidates, c => c.w * (c.ev.major ? 2 : 1));
    const ev = pick.ev, a = pick.actor;
    const choices = ev.choices(ctx, a).map(ch => EW.decisions.normalizeChoice(Object.assign({}, ch, { odds: clamp(ch.odds ?? 0.5, 0.04, 0.95) })));
    return { id: ev.id, cat: ev.cat, actor: a === 'self' ? null : a, title: ev.title(ctx, a), text: ev.text(ctx, a), choices, major: !!ev.major };
  }

  function catalogueSize() { return CATALOGUE.length; }
  EW.director = { CATALOGUE, choose, catalogueSize };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.director;
})(typeof globalThis !== 'undefined' ? globalThis : this);
