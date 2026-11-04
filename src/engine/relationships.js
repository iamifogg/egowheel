/* EgoWheel — persistent relationships with named footballers.
 * Five independent axes (0–100): respect, rivalry, compatibility, trust, hostility.
 * A character can respect you AND be your fiercest rival. Status is derived, never stored blindly.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const AXES = ['respect', 'rivalry', 'compat', 'trust', 'hostility'];
  const COMPLEMENT = { CF: { AM: 14, WG: 10, CM: 8, CF: -6 }, AM: { CF: 14, WG: 8, AM: -4 }, WG: { CF: 10, AM: 8, FB: 6 }, CM: { CF: 8, DM: 8, AM: 6 },
    DM: { CB: 10, CM: 8 }, FB: { WG: 8, CB: 6 }, CB: { CB: 6, DM: 10, FB: 6 } };

  function create(p, me) {
    const pers = EW.data.PERSONALITIES[p.pers] || EW.data.PERSONALITIES.procedural;
    const comp = (COMPLEMENT[me.pos] || {})[p.pos] || 0;
    return {
      id: p.id, respect: clamp(Math.round(30 + (me.ovr - p.ovr) * 1.5), 5, 70), rivalry: 0,
      compat: clamp(Math.round(42 + pers.warmth * 22 + comp - pers.selfish * 10), 10, 85), trust: 25, hostility: Math.round(pers.volatility * 8),
      read: 0, enc: { with: 0, against: 0, wins: 0, losses: 0, duels: 0, duelWins: 0, assistsTo: 0, assistsFrom: 0, goalsVs: 0, linked: 0, overtakes: 0, counters: 0 },
      partnership: { stage: 0, xp: 0, technique: null, tension: 0 },
      moments: [], status: 'Stranger', arc: null, lastFx: -1
    };
  }

  function adjust(rel, delta) {
    for (const k of AXES) if (delta[k]) rel[k] = clamp(Math.round((rel[k] + delta[k]) * 10) / 10, 0, 100);
    if (delta.read) rel.read = clamp((rel.read || 0) + delta.read, 0, 12);
    rel.status = deriveStatus(rel);
    return rel;
  }

  function deriveStatus(r) {
    if (r.eliminated) return 'Eliminated';
    if (r.arc === 'conquered') return 'Conquered Rival';
    if (r.hostility >= 60 && r.rivalry >= 60) return 'Nemesis';
    if (r.rivalry >= 55) return r.respect >= 55 ? 'Respected Rival' : 'Rival';
    if (r.compat >= 62 && r.trust >= 55) return r.trust >= 75 ? 'Trusted Partner' : 'Partner';
    if (r.hostility >= 45) return 'Strained';
    if (r.rivalry >= 30) return 'Emerging Rival';
    if (r.enc.with + r.enc.against >= 1) return 'Acquaintance';
    return 'Stranger';
  }

  /** All relevant identities at once (a partner can also be your fiercest rival). */
  function identities(r) {
    const out = [];
    const ps = r.partnership || {};
    if (ps.stage >= 1) out.push((['', 'Understanding', 'Partner', 'Combination Partner', 'Signature Partner', 'Synchronised Partner'])[ps.stage]);
    else if (r.compat >= 62 && r.trust >= 55) out.push('Partner');
    if (r.formerPartnerBroken) out.push('Former Partner');
    if (r.rivalry >= 55) out.push(r.hostility >= 60 ? 'Nemesis' : 'Rival'); else if (r.rivalry >= 30) out.push('Emerging Rival');
    if (r.respect >= 70) out.push('Deep Respect');
    if (r.hostility >= 45) out.push('Hostile');
    if ((r.read || 0) >= 3) out.push('Has Read You');
    if (r.arc === 'conquered') out.push('Conquered');
    if (r.eliminated) out.push('Eliminated');
    return out.length ? out : [r.status || 'Acquaintance'];
  }
  function moment(rel, text, meta = {}) {
    rel.moments.push(Object.assign({ text }, meta));
    rel.moments = rel.moments.slice(-24);
  }

  /** Personality-driven reaction scale for a character. */
  function persOf(p) { return EW.data.PERSONALITIES[p?.pers] || EW.data.PERSONALITIES.procedural; }

  // --- Voices: short, distinctive, original lines per personality and situation. ---
  const VOICE = {
    adaptive:   { notice: 'I watched how you moved last match. Every pattern can be read.', beatYou: 'I adjusted. You didn’t.', lostTo: 'Okay. Now I know what that looks like. Next time I’ll be ready.', partner: 'If our runs line up, we both eat. Want to try?', read: 'Your weapon has a rhythm. I’ve counted it.', rival: 'You’re the variable I can’t solve yet.' },
    freeSpirit: { notice: 'Hey, you’re fun to play against! Do that thing again!', beatYou: 'Too slow! The monster wanted that one.', lostTo: 'Ahaha, that was nasty. Let’s go again!', partner: 'You see the same weird gaps I do. Play with me!', read: 'I can feel where you’re going before you go.', rival: 'Playing against you makes my monster hungry.' },
    proud:      { notice: 'Don’t get comfortable. I’m faster than whatever you think you are.', beatYou: 'Did you see that? That’s the gap between us.', lostTo: 'Tch. It won’t happen twice.', partner: 'Give me space to run and I’ll make you look good.', read: 'You always cut inside. Predictable.', rival: 'Every sprint, I’m racing you now.' },
    hero:       { notice: 'You fight fair. I respect that.', beatYou: 'Good contest. I won’t apologise for winning it.', lostTo: 'You earned it. I’ll be stronger next time.', partner: 'Let’s win this properly, together.', read: 'You lean on the same move when you’re tired.', rival: 'I’ll beat you head-on. No tricks.' },
    king:       { notice: 'Who said you could exist on my pitch?', beatYou: 'Know your place. This field belongs to the king.', lostTo: '...Enjoy it. You just declared war.', partner: 'I don’t pass. If you want the ball, take it from me.', read: 'Your little weapon? I’ve already crushed it in my head.', rival: 'You’re the first servant who’s tried to steal the crown.', refuse: 'Pass? To you? Kneel first.' },
    coldPerfectionist: { notice: 'Hm. Barely worth noticing. Barely.', beatYou: 'Exactly as calculated.', lostTo: 'Don’t mistake one moment for a reversal of the hierarchy.', partner: 'Be useful or be invisible. Those are your options.', read: 'Your weapon has three exits. I closed all of them.', rival: 'I’ll destroy you. Completely.', refuse: 'You weren’t the correct option.' },
    devil:      { notice: 'Ohh, you smell like someone who wants to win. Cute.', beatYou: 'Hahaha! Feel that? That’s what losing tastes like!', lostTo: 'That was HOT. Do it again so I can kill you properly.', partner: 'Feed me and I’ll make the stadium scream.', read: 'You think you’re unpredictable? Adorable.', rival: 'You’re my favourite toy now.', refuse: 'Nah. I’m the main act.' },
    lazyGenius: { notice: 'Huh. You’re kind of interesting.', beatYou: 'That was easy. Kind of boring.', lostTo: '...Okay. That was actually fun.', partner: 'If you do the running, I’ll do the scoring. Deal?', read: 'You always want the same ball. Easy to steal.', rival: 'Beating you might actually be worth trying hard for.' },
    heir:       { notice: 'I collect talent. Let me see if you’re worth it.', beatYou: 'I can do anything you can. Better.', lostTo: 'Fine. Now I’ll copy that and improve it.', partner: 'We’d be a good investment. Let’s make it work.', read: 'I’ve already learned your move.', rival: 'I don’t lose to people twice.' },
    cynic:      { notice: 'I ran the numbers on you. You’re overrated, but not useless.', beatYou: 'Told you. Data doesn’t lie.', lostTo: 'Statistical outlier. Enjoy it while it lasts.', partner: 'I’ll organise. You execute. Don’t argue.', read: 'Your weapon succeeds 70% of the time from the left. I’ll force you right.', rival: 'You’re the one equation I want to break.' },
    captain:    { notice: 'You’re loud on the pitch. Good. I like it when attackers think.', beatYou: 'Nice try. But I read that two passes ago.', lostTo: 'Ha! Finally, someone who makes me work.', partner: 'Stay in my line and nobody gets past us.', read: 'I know exactly what you want to do. That’s my job.', rival: 'Come at me again. I’ll be waiting.' },
    emperor:    { notice: 'A new insect. How charming.', beatYou: 'Kneel. This is my stage.', lostTo: 'You’ve made a powerful enemy today.', partner: 'You may assist me. That’s an honour.', read: 'I’ve already taken your weapon apart.', rival: 'I’ll break you in front of everyone.', refuse: 'The ball belongs to the emperor.' },
    observer:   { notice: 'You see angles other people don’t. I noticed.', beatYou: 'Sorry. I saw that one early.', lostTo: 'That was clever. I’ll remember it.', partner: 'If you move, I’ll find you. Every time.', read: 'You glance before you shoot. It tells me everything.', rival: 'I want to see how far your vision goes.' },
    model:      { notice: 'Your technique is sloppy. But there’s something there.', beatYou: 'Elegance wins.', lostTo: '...Annoying. You were better today.', partner: 'Clear the lane. I’ll handle the beauty part.', read: 'You drop your shoulder too early.', rival: 'I’ll prove my game is superior to yours.' },
    cautious:   { notice: 'You’re dangerous. I’ll be watching your feet.', beatYou: 'I calculated that lane before you saw it.', lostTo: 'Unexpected. I underestimated your timing.', partner: 'Let me cover. You commit.', read: 'You only have two habits under pressure.', rival: 'You’re the attacker I’m studying hardest.' },
    mocker:     { notice: 'Ooh, a new face! Let’s see how you cry.', beatYou: 'Aww, that’s embarrassing for you.', lostTo: 'Hehe. Okay, now I’m interested.', partner: 'Play with me and I promise the chaos is worth it.', read: 'I know your trick. It’s cute.', rival: 'You’re my new favourite victim.' },
    anxious:    { notice: 'W-why are you looking at me like that? Are you going to beat me?', beatYou: 'I won? I actually won? Sorry!', lostTo: 'I knew it. I knew I wasn’t enough.', partner: 'Can I... run with you? I won’t mess it up.', read: 'I see your move. I’m scared of it, but I see it.', rival: 'I don’t want to lose to you. I really don’t.' },
    brash:      { notice: 'Oi! You! Don’t think I’m scared of you!', beatYou: 'HA! Eat that!', lostTo: 'That was a fluke! A FLUKE!', partner: 'Fine! I’ll mark the dangerous one, you go score!', read: 'I’ve marked you before. I know your tricks!', rival: 'I’m gonna glue myself to you every match!' },
    procedural: { notice: 'I’ve seen your name climbing. I’m coming for it.', beatYou: 'Not today.', lostTo: 'Next time.', partner: 'We work well together. Let’s keep it going.', read: 'I’ve figured you out.', rival: 'I’m not letting you leave me behind.' }
  };
  const VOICE_ALIAS = { instinct: 'freeSpirit', clown: 'brash', schemer: 'cynic', hunter: 'adaptive', earnest: 'hero', twin: 'procedural', blunt: 'brash', ninja: 'observer', loyal: 'observer', stylish: 'model', quiet: 'observer', aloof: 'coldPerfectionist', arrogant: 'king', devoted: 'mocker' };

  function line(p, situation) {
    const key = VOICE[p?.pers] ? p.pers : (VOICE_ALIAS[p?.pers] || 'procedural');
    return (VOICE[key] && VOICE[key][situation]) || VOICE.procedural[situation] || '';
  }

  EW.relationships = { AXES, create, adjust, deriveStatus, identities, moment, persOf, line, VOICE };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.relationships;
})(typeof globalThis !== 'undefined' ? globalThis : this);
