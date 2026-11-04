/* EgoWheel — professional-life catalogue (prices in ¥k; ¥1m = 1000).
 * Benefits are deliberately modest and situational: comfort helps recovery and wellbeing, image
 * affects media profile; nothing converts money directly into large attribute gains.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};

  const HOUSING = [
    { id: 'dorm', name: 'Club Dormitory Room', rent: 60, buy: 0, comfort: 0, image: 0, desc: 'A bed, a desk and a view of the training pitch.' },
    { id: 'studio', name: 'Small Rented Apartment', rent: 180, buy: 0, comfort: 1, image: 0, desc: 'Your own place. Thin walls, short commute.' },
    { id: 'comfy', name: 'Comfortable Apartment', rent: 450, buy: 0, comfort: 2, image: 1, desc: 'Space to recover properly and a decent kitchen.' },
    { id: 'upscale', name: 'Upscale City Apartment', rent: 1400, buy: 0, comfort: 3, image: 2, desc: 'Concierge, gym downstairs, skyline windows.' },
    { id: 'penthouse', name: 'Luxury Penthouse', rent: 0, buy: 380000, comfort: 4, image: 4, desc: 'The whole top floor. A statement.' },
    { id: 'estate', name: 'Private Home with Recovery Suite', rent: 0, buy: 900000, comfort: 5, image: 3, desc: 'Cryotherapy room, private pitch, total privacy.' }
  ];

  const ITEMS = [
    // cosmetic & accessories (unlock in the avatar editor)
    { id: 'acc_headband', cat: 'style', name: 'Signature Headband', price: 40, image: 0, desc: 'Unlocks the headband in your look.' },
    { id: 'acc_glasses', cat: 'style', name: 'Designer Frames', price: 600, image: 1, desc: 'Unlocks glasses in your look.' },
    { id: 'acc_earring', cat: 'style', name: 'Diamond Earring', price: 1200, image: 1, desc: 'Unlocks the earring in your look.' },
    { id: 'wardrobe1', cat: 'style', name: 'Tailored Wardrobe', price: 2500, image: 2, satisfaction: 1, desc: 'Look the part at every event.' },
    { id: 'watch', cat: 'luxury', name: 'Swiss Watch', price: 8000, image: 2, satisfaction: 1, desc: 'Expensive, precise, unnecessary.' },
    // vehicles
    { id: 'car1', cat: 'vehicle', name: 'Reliable Hatchback', price: 2600, upkeep: 15, image: 0, satisfaction: 1, desc: 'Gets you to training.' },
    { id: 'car2', cat: 'vehicle', name: 'Sports Coupé', price: 18000, upkeep: 90, image: 2, satisfaction: 2, desc: 'Everyone at the club notices it.' },
    { id: 'car3', cat: 'vehicle', name: 'Hypercar', price: 280000, upkeep: 600, image: 4, satisfaction: 3, desc: 'A rolling headline.' },
    // home & recovery
    { id: 'console', cat: 'home', name: 'Gaming Setup', price: 450, satisfaction: 1, desc: 'For the nights you can’t switch off.' },
    { id: 'recovery', cat: 'home', name: 'Home Recovery Kit', price: 3500, recovery: 3, desc: 'Compression boots and an ice bath. +3 fitness recovery per period.' },
    { id: 'chef', cat: 'home', name: 'Personal Chef', price: 0, monthly: 600, recovery: 2, satisfaction: 1, desc: 'Monthly service. Better nutrition, better recovery.' },
    { id: 'art', cat: 'luxury', name: 'Contemporary Artwork', price: 40000, image: 1, satisfaction: 2, desc: 'Your penthouse needed something on the walls.' }
  ];

  // Training investments: per-season purchases with caps and diminishing returns.
  const TRAINING = [
    { id: 'coach_tech', name: 'Private Technical Coach', price: 9000, stats: ['technique', 'control', 'weakFoot'], points: 3, desc: 'One season of private sessions.' },
    { id: 'coach_phys', name: 'Conditioning Specialist', price: 7000, stats: ['stamina', 'physical', 'speed'], points: 3, desc: 'Strength, speed and durability programme.' },
    { id: 'analyst', name: 'Personal Video Analyst', price: 6000, stats: ['vision', 'reactions', 'offBall'], points: 3, xp: 6, desc: 'Breaks down your matches and your rivals.' },
    { id: 'rehab', name: 'Recovery & Injury Prevention Programme', price: 5000, injury: 0.75, desc: 'Lowers injury risk for the season.' },
    { id: 'mental', name: 'Performance Psychologist', price: 4500, stress: -15, desc: 'Reduces stress; steadier under pressure.' }
  ];

  const SPONSORS = [
    { id: 'drink', brand: 'Volt Hydration', tier: 1, monthly: 300, obligations: 1, media: 2, desc: 'Sports drink. Two adverts a season.' },
    { id: 'boots', brand: 'Apex Boots', tier: 2, monthly: 1200, obligations: 1, media: 4, perfBonus: true, desc: 'Boot deal with goal bonuses.' },
    { id: 'watchbrand', brand: 'Kairos Watches', tier: 3, monthly: 4000, obligations: 2, media: 6, desc: 'Luxury ambassador. Events and shoots.' },
    { id: 'telecom', brand: 'NovaLink Mobile', tier: 3, monthly: 6500, obligations: 3, media: 8, desc: 'National TV campaign. Very demanding.' },
    { id: 'game', brand: 'PixelPitch Games', tier: 2, monthly: 1800, obligations: 1, media: 5, desc: 'Cover athlete for a football game.' },
    { id: 'apparel', brand: 'Kaze Apparel', tier: 4, monthly: 15000, obligations: 3, media: 10, desc: 'Signature clothing line. Global exposure.' }
  ];

  const PRO_CLUBS = [
    { name: 'Bastard München', prestige: 94, league: 'Germany' }, { name: 'Manshine City', prestige: 92, league: 'England' }, { name: 'FC Barcha', prestige: 91, league: 'Spain' },
    { name: 'Ubers', prestige: 90, league: 'Italy' }, { name: 'Paris X Gen', prestige: 93, league: 'France' }, { name: 'Royale Madrid', prestige: 98, league: 'Spain' },
    { name: 'Rhein Adler', prestige: 95, league: 'Germany' }, { name: 'London Red', prestige: 94, league: 'England' }, { name: 'Berserk Dortmund', prestige: 92, league: 'Germany' },
    { name: 'Torino Ubers', prestige: 93, league: 'Italy' }, { name: 'Tokyo Verdy Blue', prestige: 82, league: 'Japan' }, { name: 'Osaka Lions', prestige: 80, league: 'Japan' },
    { name: 'Lisbon Navigators', prestige: 87, league: 'Portugal' }, { name: 'Amsterdam Ajaxians', prestige: 86, league: 'Netherlands' }
  ];

  EW.data = Object.assign(EW.data || {}, { HOUSING, ITEMS, TRAINING, SPONSORS, PRO_CLUBS });
  if (typeof module !== 'undefined' && module.exports) module.exports = { HOUSING, ITEMS, TRAINING, SPONSORS, PRO_CLUBS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
