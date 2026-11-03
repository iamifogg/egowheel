/* EgoWheel — named footballer database.
 * Numbers are game-balance values on EgoWheel's own attribute scale (Blue Lock entry ≈ 55–76,
 * world class ≈ 95+). They are not canonical statistics.
 * pos groups: CF forward, WG winger, AM attacking mid/second striker, CM, DM, FB full/wing-back, CB.
 * prof: dossier profile {sh shooting, pa pace, dr dribbling, ps passing, vi vision, df defending, ph physical}
 * dev: development style — adaptive (big jumps after setbacks), explosive (fast, volatile),
 *      steady (consistent), late (accelerates later), volatile (high variance form).
 * pers: personality key used for behaviour and voice (see personalities below).
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};

  const P = (id, name, short, pos, role, arch, weapon, ovr, pot, ego, pers, dev, team, nel, tier, prof, extra = {}) =>
    Object.assign({ id, name, short, pos, role, arch, weapon, ovr, pot, ego, pers, dev, team, nel, tier, prof, blueLock: true }, extra);

  const CHARACTERS = [
    P('isagi', 'Yoichi Isagi', 'Isagi', 'CF', 'Centre Forward', 'Adaptive Striker', 'Spatial Awareness', 63, 97, 86, 'adaptive', 'adaptive', 'Team Z', 'Bastard München', 1, { sh: 70, pa: 66, dr: 62, ps: 66, vi: 84, df: 50, ph: 60 }),
    P('bachira', 'Meguru Bachira', 'Bachira', 'AM', 'Attacking Midfielder', 'Monster Dribbler', 'Creative Dribbling', 68, 92, 80, 'freeSpirit', 'explosive', 'Team Z', 'FC Barcha', 1, { sh: 64, pa: 74, dr: 88, ps: 68, vi: 66, df: 44, ph: 58 }),
    P('chigiri', 'Hyoma Chigiri', 'Chigiri', 'WG', 'Right Wing', 'Speed Demon', 'Acceleration', 66, 90, 78, 'proud', 'late', 'Team Z', 'Manshine City', 1, { sh: 68, pa: 92, dr: 70, ps: 60, vi: 58, df: 46, ph: 52 }),
    P('kunigami', 'Rensuke Kunigami', 'Kunigami', 'CF', 'Centre Forward', 'Power Striker', 'Long Shot', 67, 91, 76, 'hero', 'steady', 'Team Z', 'Bastard München', 1, { sh: 80, pa: 66, dr: 56, ps: 58, vi: 56, df: 56, ph: 84 }),
    P('gagamaru', 'Gin Gagamaru', 'Gagamaru', 'CB', 'Centre Back', 'Elastic Reactor', 'Instinctive Reaction', 61, 86, 62, 'instinct', 'late', 'Team Z', null, 2, { sh: 50, pa: 66, dr: 58, ps: 50, vi: 56, df: 72, ph: 80 }),
    P('raichi', 'Jingo Raichi', 'Raichi', 'DM', 'Defensive Midfielder', 'Lockdown Marker', 'Man-Marking', 60, 83, 74, 'brash', 'steady', 'Team Z', null, 2, { sh: 48, pa: 64, dr: 46, ps: 52, vi: 56, df: 78, ph: 76 }),
    P('igarashi', 'Gurimu Igarashi', 'Igarashi', 'CF', 'Pressing Forward', 'Scrapper', 'Never-Say-Die Pressing', 50, 74, 60, 'clown', 'steady', 'Team Z', null, 2, { sh: 52, pa: 56, dr: 50, ps: 50, vi: 50, df: 52, ph: 52 }),
    P('kuon', 'Wataru Kuon', 'Kuon', 'CB', 'Centre Back', 'Aerial Enforcer', 'Leap & Block', 61, 81, 66, 'schemer', 'steady', 'Team Z', null, 2, { sh: 50, pa: 62, dr: 48, ps: 54, vi: 58, df: 72, ph: 74 }),
    P('barou', 'Shoei Barou', 'Barou', 'CF', 'Centre Forward', 'The King', 'Predator Charge', 72, 93, 99, 'king', 'adaptive', 'Team X', 'Ubers', 1, { sh: 86, pa: 74, dr: 76, ps: 52, vi: 70, df: 54, ph: 86 }),
    P('naruhaya', 'Asahi Naruhaya', 'Naruhaya', 'CF', 'Centre Forward', 'Opportunist', 'Off-Ball Movement', 62, 81, 70, 'hunter', 'steady', 'Team X', null, 2, { sh: 66, pa: 70, dr: 58, ps: 54, vi: 62, df: 44, ph: 50 }),
    P('niko', 'Ikki Niko', 'Niko', 'CB', 'Sweeper', 'Interception Reader', 'Passing-Lane Reading', 65, 87, 70, 'cautious', 'steady', 'Team Y', 'Ubers', 2, { sh: 46, pa: 58, dr: 50, ps: 64, vi: 80, df: 78, ph: 58 }),
    P('nanase', 'Nijiro Nanase', 'Nanase', 'WG', 'Left Wing', 'Disciple Winger', 'Elastic Copy', 59, 84, 66, 'earnest', 'late', 'Team Y', 'Paris X Gen', 2, { sh: 58, pa: 72, dr: 72, ps: 60, vi: 58, df: 48, ph: 50 }),
    P('wanima_j', 'Junichi Wanima', 'J. Wanima', 'CM', 'Central Midfielder', 'Combination Engine', 'Twin Link', 62, 80, 64, 'twin', 'steady', 'Team W', null, 2, { sh: 56, pa: 64, dr: 62, ps: 70, vi: 64, df: 58, ph: 60 }),
    P('wanima_k', 'Keisuke Wanima', 'K. Wanima', 'WG', 'Left Wing', 'Combination Engine', 'Twin Link', 62, 80, 64, 'twin', 'steady', 'Team W', null, 2, { sh: 62, pa: 70, dr: 66, ps: 64, vi: 60, df: 50, ph: 58 }),
    P('nagi', 'Seishiro Nagi', 'Nagi', 'CF', 'Centre Forward', 'Trap Genius', 'Trapping', 70, 97, 64, 'lazyGenius', 'explosive', 'Team V', 'Manshine City', 1, { sh: 80, pa: 70, dr: 76, ps: 62, vi: 66, df: 42, ph: 70 }),
    P('reo', 'Reo Mikage', 'Reo', 'CM', 'Central Midfielder', 'Chameleon', 'Chameleon Technique', 69, 91, 82, 'heir', 'steady', 'Team V', 'Manshine City', 1, { sh: 66, pa: 72, dr: 70, ps: 74, vi: 72, df: 66, ph: 70 }),
    P('zantetsu', 'Zantetsu Tsurugi', 'Zantetsu', 'WG', 'Right Wing', 'Speed Demon', 'Acceleration', 66, 86, 72, 'blunt', 'steady', 'Team V', 'Paris X Gen', 2, { sh: 62, pa: 90, dr: 64, ps: 50, vi: 46, df: 50, ph: 66 }),
    P('rin', 'Rin Itoshi', 'Rin', 'AM', 'Second Striker', 'Complete Forward', 'Precision Route', 77, 98, 94, 'coldPerfectionist', 'steady', 'Team A', 'Paris X Gen', 1, { sh: 86, pa: 78, dr: 82, ps: 82, vi: 86, df: 60, ph: 72 }),
    P('shidou', 'Ryusei Shidou', 'Shidou', 'CF', 'Centre Forward', 'Chaos Egoist', 'Impossible-Angle Finish', 75, 95, 97, 'devil', 'volatile', 'Team C', 'Paris X Gen', 1, { sh: 90, pa: 76, dr: 72, ps: 54, vi: 66, df: 46, ph: 82 }),
    P('karasu', 'Tabito Karasu', 'Karasu', 'CM', 'Central Midfielder', 'Analytic Disruptor', 'Targeted Duel', 72, 90, 80, 'cynic', 'steady', 'Team F', 'Paris X Gen', 1, { sh: 62, pa: 68, dr: 70, ps: 72, vi: 80, df: 74, ph: 70 }),
    P('otoya', 'Eita Otoya', 'Otoya', 'WG', 'Left Wing', 'Shadow Runner', 'Blind-Side Vanish', 70, 88, 74, 'ninja', 'steady', 'Team F', 'FC Barcha', 2, { sh: 66, pa: 80, dr: 70, ps: 62, vi: 70, df: 52, ph: 58 }),
    P('hiori', 'Yo Hiori', 'Hiori', 'CM', 'Central Midfielder', 'Deep-Lying Playmaker', 'Threaded Pass', 66, 92, 62, 'observer', 'late', 'Team K', 'Bastard München', 1, { sh: 56, pa: 66, dr: 66, ps: 86, vi: 84, df: 56, ph: 54 }),
    P('yukimiya', 'Kenyu Yukimiya', 'Yukimiya', 'WG', 'Left Wing', '1v1 Destroyer', 'Street Duel', 71, 91, 84, 'model', 'adaptive', 'Team K', 'Bastard München', 1, { sh: 74, pa: 76, dr: 86, ps: 60, vi: 60, df: 46, ph: 64 }),
    P('kurona', 'Ranze Kurona', 'Kurona', 'FB', 'Left Wing-Back', 'Support Engine', 'Planet Hotline', 63, 87, 60, 'loyal', 'steady', 'Team K', 'Bastard München', 2, { sh: 54, pa: 74, dr: 64, ps: 72, vi: 70, df: 62, ph: 56 }),
    P('aryu', 'Jyubei Aryu', 'Aryu', 'CB', 'Centre Back', 'Aerial Enforcer', 'Long-Reach Aerials', 69, 88, 78, 'stylish', 'steady', 'Team A', 'Ubers', 2, { sh: 54, pa: 62, dr: 52, ps: 58, vi: 64, df: 82, ph: 84 }),
    P('tokimitsu', 'Aoshi Tokimitsu', 'Tokimitsu', 'CF', 'Target Forward', 'Anxious Monster', 'Anxious Engine', 67, 90, 58, 'anxious', 'explosive', 'Team A', 'Paris X Gen', 2, { sh: 70, pa: 78, dr: 60, ps: 52, vi: 54, df: 60, ph: 90 }),
    P('kiyora', 'Kiyora Jin', 'Jin', 'FB', 'Right Back', 'Wide Destroyer', 'Overlap & Recover', 61, 82, 60, 'quiet', 'steady', 'Team B', 'Bastard München', 2, { sh: 50, pa: 72, dr: 56, ps: 62, vi: 60, df: 72, ph: 64 }),
    // Japan U-20 and later-arriving players
    P('aiku', 'Oliver Aiku', 'Aiku', 'CB', 'Sweeper', 'Defensive General', 'Defensive Reading', 79, 94, 84, 'captain', 'steady', 'Japan U-20', 'Ubers', 1, { sh: 52, pa: 74, dr: 62, ps: 68, vi: 88, df: 90, ph: 76 }, { joinsAt: 'nel' }),
    P('sae', 'Sae Itoshi', 'Sae', 'CM', 'Attacking Midfielder', 'World-Class Conductor', 'World-Class Delivery', 88, 99, 90, 'aloof', 'steady', 'Japan U-20', null, 1, { sh: 80, pa: 76, dr: 86, ps: 96, vi: 96, df: 60, ph: 66 }, { blueLock: false }),
    P('sendou', 'Shuto Sendou', 'Sendou', 'CF', 'Centre Forward', 'Box Predator', 'Box Timing', 76, 88, 86, 'arrogant', 'steady', 'Japan U-20', null, 2, { sh: 82, pa: 74, dr: 66, ps: 56, vi: 64, df: 40, ph: 72 }, { blueLock: false }),
    P('darai', 'Miroku Darai', 'Darai', 'CB', 'Stopper', 'Wall', 'Body Check', 74, 84, 74, 'blunt', 'steady', 'Japan U-20', null, 2, { sh: 44, pa: 60, dr: 44, ps: 50, vi: 60, df: 82, ph: 90 }, { blueLock: false }),
    P('neru', 'Teppei Neru', 'Neru', 'CM', 'Central Midfielder', 'Silent Engine', 'Screening', 72, 82, 60, 'quiet', 'steady', 'Japan U-20', null, 3, { sh: 54, pa: 66, dr: 62, ps: 74, vi: 72, df: 70, ph: 66 }, { blueLock: false }),
    P('niou', 'Kazuma Niou', 'Niou', 'AM', 'Attacking Midfielder', 'Showboat Creator', 'Disguised Pass', 73, 83, 80, 'mocker', 'steady', 'Japan U-20', null, 3, { sh: 62, pa: 70, dr: 76, ps: 74, vi: 68, df: 46, ph: 56 }, { blueLock: false }),
    P('kaiser', 'Michael Kaiser', 'Kaiser', 'CF', 'Centre Forward', 'Emperor Striker', 'Impact Strike', 89, 99, 98, 'emperor', 'steady', null, 'Bastard München', 1, { sh: 96, pa: 84, dr: 86, ps: 80, vi: 88, df: 50, ph: 76 }, { blueLock: false }),
    P('ness', 'Alexis Ness', 'Ness', 'AM', 'Attacking Midfielder', 'Magic Passer', 'Magic Delivery', 84, 93, 80, 'devoted', 'steady', null, 'Bastard München', 2, { sh: 66, pa: 72, dr: 82, ps: 90, vi: 86, df: 50, ph: 56 }, { blueLock: false }),
    P('lorenzo', 'Don Lorenzo', 'Lorenzo', 'DM', 'Defensive Midfielder', 'Zombie Destroyer', 'Zombie Carry', 86, 93, 84, 'mocker', 'steady', null, 'Ubers', 2, { sh: 56, pa: 74, dr: 80, ps: 70, vi: 76, df: 90, ph: 84 }, { blueLock: false }),
    P('chevalier', 'Charles Chevalier', 'Chevalier', 'CM', 'Central Midfielder', 'Playful Maestro', 'Line-Breaking Pass', 85, 94, 82, 'freeSpirit', 'steady', null, 'Paris X Gen', 2, { sh: 66, pa: 70, dr: 84, ps: 90, vi: 86, df: 54, ph: 56 }, { blueLock: false }),
    P('agi', 'Agi', 'Agi', 'DM', 'Defensive Midfielder', 'Anchor', 'Screening', 82, 88, 70, 'quiet', 'steady', null, 'Manshine City', 2, { sh: 54, pa: 66, dr: 62, ps: 76, vi: 78, df: 84, ph: 80 }, { blueLock: false })
  ].filter(c => !c.skip);

  /* Personality profiles: how a character behaves, not just how they talk.
   * selfish: tendency to refuse passes; analytic: reads & counters your weapon;
   * pride: how hard they react to being beaten; warmth: openness to partnerships;
   * volatility: chance of confrontation. All 0..1. */
  const PERSONALITIES = {
    adaptive:          { label: 'Adaptive analyst', selfish: .45, analytic: .95, pride: .6, warmth: .65, volatility: .25 },
    freeSpirit:        { label: 'Free spirit', selfish: .45, analytic: .3, pride: .4, warmth: .9, volatility: .3 },
    proud:             { label: 'Proud sprinter', selfish: .55, analytic: .35, pride: .8, warmth: .5, volatility: .35 },
    hero:              { label: 'Righteous hero', selfish: .35, analytic: .4, pride: .7, warmth: .7, volatility: .2 },
    instinct:          { label: 'Pure instinct', selfish: .3, analytic: .15, pride: .3, warmth: .6, volatility: .2 },
    brash:             { label: 'Loud and brash', selfish: .5, analytic: .2, pride: .7, warmth: .45, volatility: .75 },
    clown:             { label: 'Desperate clown', selfish: .5, analytic: .1, pride: .2, warmth: .7, volatility: .4 },
    schemer:           { label: 'Calculating schemer', selfish: .6, analytic: .6, pride: .5, warmth: .3, volatility: .4 },
    king:              { label: 'Self-proclaimed king', selfish: .98, analytic: .5, pride: .98, warmth: .15, volatility: .8 },
    hunter:            { label: 'Opportunist hunter', selfish: .7, analytic: .5, pride: .4, warmth: .4, volatility: .3 },
    cautious:          { label: 'Cautious reader', selfish: .3, analytic: .9, pride: .55, warmth: .35, volatility: .25 },
    earnest:           { label: 'Earnest disciple', selfish: .2, analytic: .35, pride: .3, warmth: .85, volatility: .1 },
    twin:              { label: 'Twin-minded', selfish: .3, analytic: .4, pride: .5, warmth: .5, volatility: .3 },
    lazyGenius:        { label: 'Bored genius', selfish: .5, analytic: .35, pride: .5, warmth: .5, volatility: .15 },
    heir:              { label: 'Ambitious heir', selfish: .45, analytic: .6, pride: .8, warmth: .6, volatility: .45 },
    blunt:             { label: 'Blunt', selfish: .5, analytic: .1, pride: .55, warmth: .45, volatility: .35 },
    coldPerfectionist: { label: 'Cold perfectionist', selfish: .85, analytic: .9, pride: .95, warmth: .1, volatility: .7 },
    devil:             { label: 'Chaotic devil', selfish: .9, analytic: .3, pride: .85, warmth: .25, volatility: .95 },
    cynic:             { label: 'Cerebral cynic', selfish: .55, analytic: .95, pride: .7, warmth: .35, volatility: .5 },
    ninja:             { label: 'Smiling shadow', selfish: .5, analytic: .6, pride: .4, warmth: .55, volatility: .2 },
    observer:          { label: 'Quiet observer', selfish: .25, analytic: .8, pride: .35, warmth: .65, volatility: .1 },
    model:             { label: 'Composed perfectionist', selfish: .7, analytic: .5, pride: .75, warmth: .4, volatility: .35 },
    loyal:             { label: 'Loyal supporter', selfish: .15, analytic: .5, pride: .3, warmth: .85, volatility: .1 },
    stylish:           { label: 'Style obsessive', selfish: .5, analytic: .4, pride: .7, warmth: .55, volatility: .35 },
    anxious:           { label: 'Anxious monster', selfish: .4, analytic: .3, pride: .45, warmth: .55, volatility: .45 },
    quiet:             { label: 'Reserved', selfish: .3, analytic: .45, pride: .4, warmth: .5, volatility: .1 },
    captain:           { label: 'Defensive captain', selfish: .35, analytic: .85, pride: .75, warmth: .6, volatility: .3 },
    aloof:             { label: 'Aloof prodigy', selfish: .6, analytic: .9, pride: .9, warmth: .1, volatility: .3 },
    arrogant:          { label: 'Arrogant star', selfish: .8, analytic: .3, pride: .85, warmth: .25, volatility: .6 },
    emperor:           { label: 'Emperor', selfish: .95, analytic: .7, pride: 1, warmth: .05, volatility: .7 },
    devoted:           { label: 'Devoted lieutenant', selfish: .4, analytic: .5, pride: .6, warmth: .3, volatility: .55 },
    mocker:            { label: 'Grinning mocker', selfish: .6, analytic: .55, pride: .8, warmth: .3, volatility: .7 },
    procedural:        { label: 'Determined', selfish: .5, analytic: .4, pride: .5, warmth: .5, volatility: .35 }
  };

  const NEL_CLUB_PROFILE = {
    'Bastard München': { pos: { CF: 1.22, WG: 1.08, AM: 1.06, CM: 1.0, DM: .92, FB: .95, CB: .95 }, likes: 'finishing', style: 'Ruthless striker economy' },
    'Manshine City':   { pos: { CF: 1.0, WG: 1.05, AM: 1.12, CM: 1.16, DM: 1.05, FB: 1.0, CB: .98 }, likes: 'versatility', style: 'Systems and versatility' },
    'FC Barcha':       { pos: { CF: .98, WG: 1.2, AM: 1.2, CM: 1.08, DM: .9, FB: .98, CB: .9 }, likes: 'dribbling', style: 'Joyful technical football' },
    'Ubers':           { pos: { CF: 1.1, WG: .95, AM: .95, CM: .98, DM: 1.14, FB: 1.04, CB: 1.26 }, likes: 'defending', style: 'Defensive ruthlessness' },
    'Paris X Gen':     { pos: { CF: 1.12, WG: 1.04, AM: 1.1, CM: 1.08, DM: 1.0, FB: .98, CB: 1.0 }, likes: 'completeness', style: 'Complete, elite players' }
  };

  const GIVEN = ['Haruto', 'Ren', 'Sora', 'Kaito', 'Riku', 'Yuto', 'Minato', 'Akira', 'Hayate', 'Shun', 'Taiga', 'Itsuki', 'Rei', 'Kou', 'Haru', 'Toma', 'Kei', 'Nao', 'Ryota', 'Seiya',
    'Daichi', 'Hinata', 'Kenta', 'Masato', 'Naoki', 'Ryo', 'Shota', 'Takumi', 'Tsubasa', 'Yamato', 'Yuma', 'Asahi', 'Eiji', 'Fumiya', 'Genki', 'Hiroto', 'Isamu', 'Jun', 'Kazuki', 'Kohei',
    'Makoto', 'Noboru', 'Osamu', 'Ryusuke', 'Satoru', 'Tatsuya', 'Tetsu', 'Wataru', 'Yusuke', 'Yuki', 'Arata', 'Banri', 'Chihiro', 'Dai', 'Go', 'Hikaru', 'Ibuki', 'Jiro', 'Kanta', 'Mamoru'];
  const FAMILY = ['Amano', 'Kisaragi', 'Mizuno', 'Takeda', 'Shirakawa', 'Kanzaki', 'Aoyama', 'Kuroda', 'Fujimoto', 'Asakura', 'Naruse', 'Ishida', 'Sakurai', 'Hayashi', 'Morita', 'Tsukino', 'Endo', 'Kagawa', 'Matsuda', 'Kirishima',
    'Ogawa', 'Hoshino', 'Murakami', 'Nishida', 'Okabe', 'Saeki', 'Tachibana', 'Uchida', 'Wakabayashi', 'Yoshida', 'Arai', 'Chiba', 'Danno', 'Ebara', 'Furuya', 'Goto', 'Hanada', 'Iwasaki', 'Jinno', 'Kamata',
    'Kudo', 'Minami', 'Nagase', 'Oda', 'Sakaki', 'Takagi', 'Ueno', 'Yagami', 'Zaizen', 'Akiyama', 'Fukuda', 'Hattori', 'Ikeda', 'Kawai', 'Mochizuki', 'Nomura', 'Onishi', 'Sano', 'Tamura', 'Yokoyama'];

  EW.data = Object.assign(EW.data || {}, { CHARACTERS, PERSONALITIES, NEL_CLUB_PROFILE, GIVEN, FAMILY });
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.data;
})(typeof globalThis !== 'undefined' ? globalThis : this);
