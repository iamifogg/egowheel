/* EgoWheel — professional-life scenes (only fire once the protagonist is a professional).
 * Registered into the event director's catalogue. ctx.pro is the professional state.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const sig = x => 1 / (1 + Math.exp(-x));
  const S = (c, id) => c.players[id]?.short || 'They', N = (c, id) => c.players[id]?.name || 'Someone';
  const R = (c, id) => c.rels[id] || { trust: 25, rivalry: 0, compat: 45 };
  const fmt = k => EW.finances ? EW.finances.fmt(k) : '¥' + k + 'k';
  const isPro = c => !!(c.pro && c.pro.contract && c.worldStage === 'pro');

  const EVENTS = [
    { id: 'pro_sponsor_load', cat: 'pro', cooldown: 6,
      actor: c => isPro(c) && c.pro.sponsors.reduce((t, s) => t + s.obligations, 0) >= 3 ? 'self' : null, weight: () => 3,
      title: () => 'Too Much Attention',
      text: c => 'Your agent forwards this week’s schedule: two shoots, a launch event and a TV interview — the day before a match.',
      choices: c => [
        { key: 'all', label: 'Do everything', hint: 'Full commercial value; stress and fatigue.', risk: 'conservative', odds: 0.8, reward: 'Obligations met, media profile up', failHint: 'Exhausted',
          success: { text: 'You smile for every camera.', obligations: 2, rep: { media: 6 }, pressure: { stress: 12 }, fitness: -6 }, mixed: { text: 'You get through it, barely.', obligations: 2, pressure: { stress: 16 }, fitness: -10 }, fail: { text: 'You arrive at the match empty.', obligations: 2, fitness: -14, form: -1 } },
        { key: 'scale', label: 'Negotiate a lighter schedule', hint: 'Keep the deal, lose some goodwill.', risk: 'ambitious', odds: sig((c.pro.reputation.football - 50) / 15), reward: 'Obligations reduced', failHint: 'The sponsor is annoyed',
          success: { text: 'They agree. You matter more to them than they do to you.', obligations: 1, rep: { media: 2 } }, mixed: { text: 'A compromise.', obligations: 1, rep: { conduct: -2 } }, fail: { text: '"Contract is contract."', rep: { conduct: -4 }, pressure: { stress: 8 } } },
        { key: 'football', label: 'Cancel and focus on football', hint: 'Protect your performance; risk the deal.', risk: 'conservative', odds: 0.75, reward: 'Fresh legs, calm mind', failHint: 'Sponsor threatens to walk',
          success: { text: 'Your manager notices the priorities.', managerTrust: 5, pressure: { stress: -10 } }, mixed: { text: 'The sponsor grumbles.', pressure: { stress: -6 }, rep: { media: -3 } }, fail: { text: 'The sponsor publicly criticises you.', rep: { media: -6, conduct: -3 } } }
      ] },
    { id: 'pro_cost_of_ambition', cat: 'pro', cooldown: 4,
      actor: c => isPro(c) && c.importance >= 1.7 ? 'self' : null, weight: () => 3.2,
      title: () => 'The Cost of Ambition',
      text: c => 'One free evening before one of the biggest matches of your season. Everyone wants a piece of it.',
      choices: c => {
        const mate = (c.mates || []).find(id => c.players[id]?.named && R(c, id).trust >= 45);
        return [
          { key: 'train', label: 'Train alone until midnight', hint: 'Sharper weapon, heavier legs.', risk: 'ambitious', odds: 0.6, reward: 'Mastery + match edge', failHint: 'Fatigue',
            success: { text: 'One more rep. Then another.', xpBonus: 6, temp: { performance: 0.04 }, fitness: -6 }, mixed: { text: 'Useful, tiring.', xpBonus: 3, fitness: -8 }, fail: { text: 'Your hamstring complains all night.', fitness: -14 } },
          { key: 'rest', label: 'Rest and recover', hint: 'Boring. Effective.', risk: 'conservative', odds: 0.9, reward: 'Fitness, calm', failHint: 'Restless night',
            success: { text: 'Eight hours of sleep.', fitness: 12, pressure: { stress: -8 } }, mixed: { text: 'Some rest.', fitness: 6 }, fail: { text: 'You stare at the ceiling.', pressure: { stress: 4 } } },
          mate ? { key: 'mate', label: 'Dinner with ' + S(c, mate), hint: 'Relationship over preparation.', risk: 'conservative', odds: 0.8, reward: 'Trust; better link-ups tomorrow', failHint: 'Late night',
            success: { text: 'You talk tactics and nonsense until late.', relOther: { [mate]: { trust: 8, compat: 4 } }, temp: { mateGoals: 0.1 } }, mixed: { text: 'Nice, but late.', relOther: { [mate]: { trust: 5 } }, fitness: -4 }, fail: { text: 'Too late, too much food.', fitness: -6 } } : null,
          { key: 'event', label: 'Attend the commercial gala', hint: 'Money and profile; distraction.', risk: 'ambitious', odds: 0.55, reward: 'Appearance fee and media profile', failHint: 'Headlines about partying',
            success: { text: 'You charm the room.', money: { label: 'Gala appearance fee', amount: 1500 }, rep: { media: 5 } }, mixed: { text: 'Paid, tired.', money: { label: 'Gala appearance fee', amount: 1500 }, fitness: -6 }, fail: { text: 'A photo of you at 2 a.m. goes viral.', money: { label: 'Gala appearance fee', amount: 1500 }, rep: { conduct: -6, media: 3 }, managerTrust: -6 } }
        ].filter(Boolean);
      } },
    { id: 'pro_loyalty', cat: 'pro', cooldown: 10,
      actor: c => { if (!isPro(c) || c.pro.reputation.football < 55) return null; const p = (c.mates || []).find(id => c.players[id]?.named && (R(c, id).trust >= 55 || (R(c, id).partnership?.stage || 0) >= 2)); return p || null; }, weight: () => 2.2,
      title: () => 'A Call from Your Agent',
      text: (c, a) => 'A bigger club is asking about you. Leaving would mean more money — and leaving ' + N(c, a) + ', the partner who makes your football work.',
      choices: (c, a) => [
        { key: 'commit', label: 'Tell the club you’re staying', hint: 'Loyalty. Your partner and manager will remember.', risk: 'conservative', odds: 0.85, reward: 'Trust and manager confidence', failHint: 'Nothing changes',
          success: { text: '"Good. We’re not done here."', rel: { trust: 10 }, managerTrust: 8, rep: { conduct: 4 } }, mixed: { text: 'Quietly appreciated.', rel: { trust: 5 } }, fail: { text: 'Nobody noticed.' } },
        { key: 'explore', label: 'Let your agent explore it', hint: 'Transfer offers at season end; your partner may feel betrayed.', risk: 'ambitious', odds: 0.6, reward: 'Better offers this summer', failHint: 'It leaks to the press',
          success: { text: 'Discreet conversations begin.', transferRequest: true }, mixed: { text: 'Offers will come — so will questions.', transferRequest: true, rel: { trust: -6 } }, fail: { text: 'It leaks. ' + S(c, a) + ' reads about it online.', transferRequest: true, rel: { trust: -14, hostility: 6 }, managerTrust: -8 } }
      ] },
    { id: 'pro_media_storm', cat: 'pro', cooldown: 6,
      actor: c => isPro(c) && c.lastRating && c.lastRating < 6.3 && c.pro.reputation.media >= 40 ? 'self' : null, weight: () => 2.6,
      title: () => 'Media Storm',
      text: () => 'A pundit calls you "a Blue Lock experiment that failed". It’s trending.',
      choices: c => [
        { key: 'clap', label: 'Fire back publicly', hint: 'Win the narrative or make it worse.', risk: 'extreme', odds: sig((c.stats.ego - 80) / 10) * 0.35 + 0.05, reward: 'Huge media boost and swagger', failHint: 'A scandal',
          success: { text: 'Your reply becomes a meme — on your side.', rep: { media: 12 }, conf: 8, pressure: { public: -20 } }, mixed: { text: 'Divisive.', rep: { media: 3, conduct: -3 } }, fail: { text: 'It goes badly wrong. Club statement incoming.', rep: { media: -8, conduct: -10 }, managerTrust: -10, pressure: { public: 18 } } },
        { key: 'ignore', label: 'Ignore it', hint: 'Let the next match answer.', risk: 'conservative', odds: 0.8, reward: 'Calm', failHint: 'It festers',
          success: { text: 'You mute everything.', pressure: { public: -6 } }, mixed: { text: 'It still gets to you.' }, fail: { text: 'You read every comment at 3 a.m.', pressure: { stress: 8 } } }
      ] },
    { id: 'pro_youngster', cat: 'pro', cooldown: 10,
      actor: c => isPro(c) && c.pro.age >= 24 ? 'self' : null, weight: () => 1.4,
      title: () => 'The Academy Kid',
      text: () => 'A 17-year-old from the academy asks if you’ll watch his finishing. He reminds you of yourself in Blue Lock.',
      choices: () => [
        { key: 'mentor', label: 'Mentor him', hint: 'Time and energy, but you learn by teaching.', risk: 'conservative', odds: 0.8, reward: 'Conduct, vision, wellbeing', failHint: 'Tiring',
          success: { text: 'Explaining your game makes you understand it better.', stats: { vision: 1 }, rep: { conduct: 6 }, wellbeing: 6 }, mixed: { text: 'Rewarding.', rep: { conduct: 4 } }, fail: { text: 'He doesn’t listen.', pressure: { stress: 4 } } },
        { key: 'no', label: 'Politely decline', hint: 'Your career comes first.', risk: 'conservative', odds: 0.9, reward: 'Focus', failHint: 'Bad look',
          success: { text: 'He understands.' }, mixed: { text: 'He looks disappointed.' }, fail: { text: 'Someone films the moment.', rep: { conduct: -4 } } }
      ] },
    { id: 'pro_nightlife', cat: 'pro', cooldown: 8,
      actor: c => isPro(c) && c.pro.finances.cash > 20000 ? 'self' : null, weight: () => 1.4,
      title: () => 'An Invitation',
      text: () => 'Famous people, a private club, a night off. Your phone keeps buzzing.',
      choices: () => [
        { key: 'go', label: 'Go out', hint: 'You’ve earned it. Probably.', risk: 'ambitious', odds: 0.55, reward: 'Wellbeing and connections', failHint: 'Tabloids and a tired body',
          success: { text: 'A great night, quietly.', wellbeing: 10, rep: { media: 3 } }, mixed: { text: 'Fun, expensive.', wellbeing: 5, money: { label: 'Night out', amount: -800 } }, fail: { text: 'Photos. Headlines. A furious manager.', rep: { conduct: -10 }, managerTrust: -10, fitness: -8 } },
        { key: 'stay', label: 'Stay home', hint: 'Football first.', risk: 'conservative', odds: 0.9, reward: 'Recovery', failHint: 'FOMO',
          success: { text: 'Early night.', fitness: 6 }, mixed: { text: 'You doomscroll.', pressure: { stress: 3 } }, fail: { text: 'You feel your life passing by.', wellbeing: -4 } }
      ] },
    { id: 'pro_charity', cat: 'pro', cooldown: 10,
      actor: c => isPro(c) ? 'self' : null, weight: c => c.pro.reputation.conduct < 50 ? 2 : 0.9,
      title: () => 'Charity Match',
      text: () => 'Your club asks you to headline a charity match for flood victims in your hometown region.',
      choices: () => [
        { key: 'yes', label: 'Play and donate', hint: 'A fitness cost and a donation.', risk: 'conservative', odds: 0.9, reward: 'Conduct and public affection', failHint: 'Tiring',
          success: { text: 'The crowd chants your name.', rep: { conduct: 10, media: 4 }, money: { label: 'Charity donation', amount: -500 }, fitness: -4 }, mixed: { text: 'A good day.', rep: { conduct: 6 }, money: { label: 'Charity donation', amount: -500 } }, fail: { text: 'You tweak a muscle.', rep: { conduct: 6 }, fitness: -10 } },
        { key: 'no', label: 'Send a donation instead', hint: 'Protect your body.', risk: 'conservative', odds: 0.85, reward: 'Some goodwill', failHint: 'Looks cold',
          success: { text: 'Appreciated.', rep: { conduct: 3 }, money: { label: 'Charity donation', amount: -1000 } }, mixed: { text: 'Fine.', money: { label: 'Charity donation', amount: -1000 } }, fail: { text: '"Couldn’t even show up."', rep: { conduct: -2 }, money: { label: 'Charity donation', amount: -1000 } } }
      ] },
    { id: 'pro_raise', cat: 'pro', cooldown: 12,
      actor: c => isPro(c) && c.pro.managerTrust >= 65 && c.pro.reputation.football >= 55 ? 'self' : null, weight: () => 1.6,
      title: () => 'Worth More Than They Pay',
      text: c => 'You’re one of the team’s best players on ' + fmt(c.pro.contract.salary) + ' a year. Your agent thinks you should ask for more.',
      choices: c => [
        { key: 'ask', label: 'Ask for a raise', hint: 'Polite but firm.', risk: 'ambitious', odds: 0.5, reward: '+20% salary for the rest of your contract', failHint: 'Board irritation',
          success: { text: 'The board agrees.', raise: 0.2 }, mixed: { text: 'A small bump.', raise: 0.08 }, fail: { text: '"You signed the contract."', managerTrust: -6 } },
        { key: 'demand', label: 'Demand a new deal — or you leave', hint: 'All or nothing.', risk: 'extreme', odds: 0.18, reward: '+60% salary', failHint: 'Frozen out and transfer-listed',
          success: { text: 'They blink first.', raise: 0.6, rep: { media: 4 } }, mixed: { text: 'A grudging raise.', raise: 0.15, managerTrust: -6 }, fail: { text: 'They call your bluff. You’re transfer-listed.', transferRequest: true, managerTrust: -20, rep: { conduct: -6 } } },
        { key: 'wait', label: 'Let your football do the talking', hint: 'Patience.', risk: 'conservative', odds: 0.85, reward: 'Goodwill', failHint: 'Nothing',
          success: { text: 'The manager respects the focus.', managerTrust: 4 }, mixed: { text: 'Fine.' }, fail: { text: 'You feel undervalued.', pressure: { stress: 4 } } }
      ] }
  ];
  function register() { if (EW.director && !EW.director.CATALOGUE.some(e => e.id === 'pro_sponsor_load')) EW.director.CATALOGUE.push(...EVENTS); }
  register();
  EW.data = Object.assign(EW.data || {}, { PRO_EVENTS: EVENTS });
})(typeof globalThis !== 'undefined' ? globalThis : this);
