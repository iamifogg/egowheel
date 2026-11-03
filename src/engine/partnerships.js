/* EgoWheel — partnerships and signature combination techniques.
 * Partnerships grow from football (shared matches, linked actions, shared achievements), not
 * friendship points. Techniques are pair-specific: a Bachira partnership plays differently from a
 * Nagi one. Tension can drop a stage or end the partnership entirely.
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const STAGES = ['None', 'Initial Understanding', 'Developing Partnership', 'Established Combination', 'Signature Technique', 'Exceptional Synchronisation'];
  const XP = [0, 8, 22, 42, 66, 95];

  // Pair-specific signatures (partner id → technique). Effects scale with stage.
  const SIGNATURES = {
    bachira:  { name: 'Monster Relay', desc: 'Chaotic dribble-and-release: neither defender knows who has the ball.', tags: ['dribble', 'create', 'goal'], contrib: s => s >= 5 ? { dribbles: 2, assists: 1, goals: 1, shots: 1, bonusRating: 1.5 } : { dribbles: 1, assists: 1, keyPasses: 1, bonusRating: 0.85 } },
    nagi:     { name: 'Trap & Release Circuit', desc: 'An impossible first touch becomes the perfect lay-off.', tags: ['control', 'create', 'goal'], contrib: s => s >= 5 ? { goals: 1, shots: 1, assists: 1, bonusRating: 1.5 } : { keyPasses: 1, goals: 1, shots: 1, bonusRating: 1.0 } },
    chigiri:  { name: 'Red Lightning Overlap', desc: 'Two sprints on one flank; the full-back can only pick one.', tags: ['speed', 'carry', 'create'], contrib: s => ({ dribbles: 1, assists: 1, keyPasses: 1, bonusRating: s >= 5 ? 1.2 : 0.8 }) },
    aiku:     { name: 'Twin Wall Read', desc: 'You and Aiku read the same pass before it is played.', tags: ['def', 'read'], contrib: s => ({ interceptions: 2, tackles: 1, keyPasses: s >= 5 ? 1 : 0, bonusRating: s >= 5 ? 1.1 : 0.7, oppSuppress: 1 }) },
    isagi:    { name: 'Dual Equation', desc: 'Two spatial readers attacking the same space from opposite angles.', tags: ['vision', 'goal', 'create'], contrib: s => s >= 5 ? { goals: 1, assists: 1, shots: 1, bonusRating: 1.5 } : { goals: 1, shots: 1, keyPasses: 1, bonusRating: 1.0 } },
    reo:      { name: 'Chameleon Mirror', desc: 'Reo copies your role mid-move; the defence marks a ghost.', tags: ['create', 'goal'], contrib: s => ({ keyPasses: 1, goals: s >= 4 ? 1 : 0, assists: s >= 4 ? 0 : 1, shots: 1, bonusRating: s >= 5 ? 1.3 : 0.9 }) },
    hiori:    { name: 'Threaded Arrival', desc: 'Hiori’s pass arrives exactly where your run ends.', tags: ['pass', 'goal'], contrib: s => ({ goals: 1, shots: 1, bonusRating: s >= 5 ? 1.35 : 1.0 }) },
    kurona:   { name: 'Planet Relay', desc: 'Rapid triangles that orbit the defence.', tags: ['pass', 'create'], contrib: s => ({ keyPasses: 2, assists: 1, bonusRating: s >= 5 ? 1.2 : 0.8 }) },
    barou:    { name: 'King’s Exception', desc: 'The one pass Barou will ever make — and it is perfect.', tags: ['goal'], contrib: s => ({ goals: 1, shots: 1, bonusRating: s >= 5 ? 1.5 : 1.15 }) },
    rin:      { name: 'Cold Precision Exchange', desc: 'Two touches, zero wasted movement.', tags: ['create', 'goal'], contrib: s => ({ goals: 1, keyPasses: 1, shots: 1, bonusRating: s >= 5 ? 1.45 : 1.05 }) },
    kunigami: { name: 'Hero’s Flank', desc: 'Kunigami holds off two defenders so you can strike.', tags: ['goal', 'finish'], contrib: s => ({ goals: 1, shots: 1, bonusRating: s >= 5 ? 1.3 : 0.95 }) },
    otoya:    { name: 'Shadow Switch', desc: 'You swap marks in the blind spot of the whole defence.', tags: ['goal', 'create'], contrib: s => ({ goals: 1, keyPasses: 1, shots: 1, bonusRating: s >= 5 ? 1.3 : 0.95 }) },
    karasu:   { name: 'Disruption Lock', desc: 'Karasu cuts the lane you were already pressing.', tags: ['def', 'press', 'create'], contrib: s => ({ recoveries: 1, interceptions: 1, keyPasses: 1, bonusRating: s >= 5 ? 1.1 : 0.75 }) },
    niko:     { name: 'Read & Release', desc: 'Niko reads, you release; the counter starts before they know it.', tags: ['def', 'read', 'create'], contrib: s => ({ interceptions: 1, keyPasses: 1, assists: s >= 5 ? 1 : 0, bonusRating: s >= 5 ? 1.1 : 0.75 }) },
    yukimiya: { name: 'Isolation Feint', desc: 'Two isolation dribblers; the defence has to choose wrong.', tags: ['dribble', 'goal'], contrib: s => ({ dribbles: 1, goals: 1, shots: 1, bonusRating: s >= 5 ? 1.3 : 0.95 }) },
    kaiser:   { name: 'Emperor’s Offering', desc: 'Kaiser lets you have the ball, once, to prove a point.', tags: ['goal'], contrib: s => ({ goals: 1, shots: 1, bonusRating: 1.4 }) },
    ness:     { name: 'Magic Delivery', desc: 'A pass that bends around the whole defence.', tags: ['pass', 'goal'], contrib: s => ({ goals: 1, shots: 1, bonusRating: 1.15 }) }
  };
  function genericTechnique(partner, myFamily) {
    const pos = partner.pos;
    if (['CB', 'DM', 'FB'].includes(pos) && ['defend', 'aerial', 'vision'].includes(myFamily)) return { name: 'Shared Shield', desc: 'You and ' + partner.short + ' cover each other’s blind side.', tags: ['def', 'read'], contrib: s => ({ interceptions: 1, blocks: 1, bonusRating: 0.7, oppSuppress: 1 }) };
    if (['CF', 'WG'].includes(pos)) return { name: partner.short + ' One-Two', desc: 'A rehearsed one-two that opens the box.', tags: ['pass', 'goal'], contrib: s => ({ keyPasses: 1, goals: s >= 4 ? 1 : 0, assists: s >= 4 ? 0 : 1, shots: 1, bonusRating: 0.9 }) };
    return { name: partner.short + ' Triangle', desc: 'A practised triangle that breaks the press.', tags: ['pass', 'create'], contrib: s => ({ keyPasses: 2, assists: s >= 4 ? 1 : 0, bonusRating: 0.7 }) };
  }
  function techniqueFor(partner, myFamily) { return SIGNATURES[partner.id] ? Object.assign({ id: partner.id }, SIGNATURES[partner.id]) : Object.assign({ id: 'generic_' + partner.id }, genericTechnique(partner, myFamily)); }

  function ensure(rel) { rel.partnership = rel.partnership || { stage: 0, xp: 0, technique: null, tension: 0 }; return rel.partnership; }

  /** Update after a shared match. facts: {played, linked (assists either way + combination plays), win, importance, flow, selfish} */
  function afterMatch(rel, partner, f, myFamily) {
    const ps = ensure(rel), before = ps.stage;
    if (rel.formerPartnerBroken && ps.stage === 0 && (f.linked || 0) === 0) return null;
    let xp = 0;
    if (f.played) xp += 1.5;
    xp += (f.linked || 0) * 5;
    if (f.win && f.linked) xp += 3 * (f.importance || 1);
    if (f.flow && f.linked) xp += 6;
    xp *= 0.6 + (rel.compat / 100) * 0.6 + (rel.trust / 100) * 0.4;
    if (f.selfish) ps.tension = clamp(ps.tension + 1, 0, 6);
    else if (f.linked) ps.tension = clamp(ps.tension - 0.5, 0, 6);
    ps.xp = Math.round((ps.xp + xp) * 10) / 10;
    let target = 0; XP.forEach((t, i) => { if (ps.xp >= t) target = i; });
    // Higher stages need real shared history, not just volume.
    if (target >= 3 && ((rel.enc.with || 0) < 4 || (rel.enc.linked || 0) < 3)) target = 2;
    if (target >= 4 && !(ps.bigWin || f.importance >= 1.5 && f.win && f.linked)) target = 3;
    if (target >= 5 && !ps.syncMoment && !(f.flow && f.linked)) target = 4;
    if (f.importance >= 1.5 && f.win && f.linked) ps.bigWin = true;
    if (f.flow && f.linked) ps.syncMoment = true;
    ps.stage = Math.max(ps.stage, Math.min(target, ps.stage + 1));
    if (ps.tension >= 5 && ps.stage > 0) { ps.stage--; ps.tension = 3; }
    if (ps.stage >= 4 && !ps.technique) ps.technique = techniqueFor(partner, myFamily).id;
    return ps.stage !== before ? { from: before, to: ps.stage } : null;
  }

  function apply(rel, op) {
    const ps = ensure(rel);
    if (op.xp) ps.xp = Math.max(0, ps.xp + op.xp);
    if (op.tension) ps.tension = clamp(ps.tension + op.tension, 0, 6);
    if (op.break) { ps.stage = 0; ps.xp = 0; ps.technique = null; ps.tension = 0; rel.formerPartnerBroken = true; }
    return ps;
  }

  /** Wheel slice for the strongest partnership on your side this match (stage ≥ 3). */
  function slice(rel, partner, myFamily, total) {
    const ps = ensure(rel); if (ps.stage < 3) return null;
    const t = ps.stage >= 4 ? techniqueFor(partner, myFamily) : genericTechnique(partner, myFamily);
    const weight = total * (ps.stage >= 5 ? 0.05 : ps.stage >= 4 ? 0.035 : 0.022);
    return { name: (ps.stage >= 4 ? '' : 'Combination: ') + t.name, desc: t.desc, weight, tags: t.tags.concat(['combo', 'partner']), contrib: t.contrib(ps.stage), partner: partner.id };
  }

  EW.partnerships = { STAGES, XP, SIGNATURES, ensure, afterMatch, apply, slice, techniqueFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.partnerships;
})(typeof globalThis !== 'undefined' ? globalThis : this);
