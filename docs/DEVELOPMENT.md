# Development Log (living document)

## How to run
- Play: open `index.html` (or serve the folder statically). No build.
- Tests: `npm test` (Node ≥ 18; uses the built-in `node:test`).
- Balance report: `npm run balance` (added in Phase 5).
- Reproduce a run: add `?seed=anything` to the URL (Phase 1 debug tools).

## Phase 0 — Stabilisation (v25)

### Injury investigation (root cause)
Measured with the headless harness against the untouched v24 code (400 autoplayed careers, 6,657 matches):
- Normal single-spin play: **1.67%** of matches ended "Forced Off Injured"; longest streak 2.
- Heavy-load play (sprint training + pressing plan): **2.34%**; 7.7% of matches played at ≤30 fitness.
- Per-match risk at fitness 20 with an existing injury: **13–15%** (per-spin slice ≈ 2.4%).

Contributing causes, all fixed:
1. **Career wheels never locked.** The SPIN button stayed enabled after a result, so every extra
   press re-rolled the moment *and kept the previous result's effects*. Each re-spin was another
   injury ticket (and an exploit for stacking goals). With three presses per moment at low fitness
   the per-match forced-off chance reached ~38%, which makes five-in-a-row plausible over a career.
   This is the most likely explanation for the owner's streak.
2. **Three overlapping injury generators per fixture**: an in-match slice on every spin, an
   independent post-match roll in `applyPostMatch`, and training/between-game injuries — each able
   to overwrite the others.
3. **Per-spin (not per-match) calibration**: risk scaled with the number of spins, including the
   extra spins granted by breakthroughs.
4. **Fatigue drain**: fixed +5–9 recovery vs 9–12 loss per match pushed fitness toward the floor (20),
   where risk tripled, and match injuries cost another 14 fitness.

### New model (`src/engine/injuries.js`)
- One injury opportunity per fixture. The wheel still shows "Forced Off Injured" and "Picks Up a Knock"
  but their slice weights are derived from a per-match probability and re-derived for remaining spins.
  Once either fires, both disappear for the rest of the match.
- Healthy risk ≈ 0.9% per match; fatigue multiplier ×2.5 at 50 fitness, ×5 at 25; hard cap 7.5%.
- Recurrence protection: ×0.5 in the fixtures right after a match-ending injury; capped at 0.4% after
  two match-ending injuries in six fixtures. Severity escalation is damped after a recent injury.
- Severities: precautionary withdrawal (52%), strain (33%, misses 1), serious (12%, misses 2),
  ligament damage (2.7%, misses 4), career-threatening (0.3%).
- Missed fixtures are real: the team plays without you. A medical room offers **Rest Fully**,
  **Prioritise Rehabilitation**, or (for 1-fixture strains) **Take the Risk — Play** at higher risk.
- Knocks can be treated by skipping the week's event (**Reduce load & treat the knock**).
- Recovery between fixtures scales with the fitness deficit (no spiral); floor raised 20 → 25.
- Results across 150 autoplayed careers (2,333 matches): forced off **1.80%**, knocks **3.0%**,
  longest forced-off streak **1**, never more than one injury incident in a match.

### Other Phase 0 changes
- Removed unreachable `matchPerformanceStage/simulateMatch/simulateChallenge/resolveMatchOutcome`.
- `src/engine/rng.js`: seedable RNG used for all game randomness.
- Save v8 with migration from v7 (raw backup kept at `egowheel.backup.v7`), rolling `.prev` copy,
  corrupt-save preservation, JSON export/import in the Archive view.
- ⚡ toggle for quick spin animations (outcomes unchanged).

### Decisions for the owner
- Player-creation wheels can still be re-spun (as before); only career wheels are locked.

## Phase 1 — Living world & competition (v25)

### Population (`src/data/characters.js`, `src/engine/world.js`)
- 300 Blue Lock participants: 25 First Selection teams of 12 in 5 buildings (yours is Building 5,
  Teams V–Z, matching the original team strengths). Named characters keep their identities
  (position, archetype, weapon, potential, ego, personality, development style); the rest are
  seeded procedural egoists with a position, weapon, strength, weakness, potential and dev style.
- Club players (Kaiser, Ness, Lorenzo, Chevalier, Agi) and Japan U-20 (Sae, Sendou, Darai, Neru,
  Niou, Aiku) exist as external players. Aiku joins Blue Lock for the NEL.
- Same seed ⇒ same world (`?seed=` in the URL).

### Background simulation
- Every protagonist fixture advances the world: First Selection round-robins in all five
  buildings; abstract matches for everyone else in later stages; NEL rounds for the other clubs.
- The protagonist's real result is recorded into the world: teammate goals are credited to named
  teammates (your assists link to the scorer), opponents receive ratings that reflect your defending.
- Development: headroom × performance × stage multiplier, shaped by development style
  (explosive early, late bloomers in the NEL, adaptive leaps after bad defeats, volatile noise).
- Named characters can be eliminated. Eliminated players never appear in later casts (tested).

### Rankings (`EW.world.rankScore`)
`score = OVR + k_stage × (position-fair stage evaluation, shrunk by apps) + 1.2 × career evaluation
+ First Selection team ppg term + survival bonus.` Ego's evaluation weights goals/assists/defensive
actions differently per role so centre-backs and holding midfielders are judged fairly.

Consequences:
- **First Selection**: top two teams per building, *or* your team's top scorer, *or* Ego's
  individual evaluation (top 24 overall) survive. Live building tables are shown.
- **Second Selection**: 2v2/3v3/4v4 casts are drawn from the living field. Win and you choose a
  loser to join you; lose and the winners decide (survival odds include your rank). Your side
  carries over, so you can lose a teammate or be taken by a former opponent. Field culls:
  ~135 → 112 → 92 → 75 → 60.
- **Third Selection**: rank ≤14 starts the U-20 match, 15–30 spins a tense selection wheel
  (left out / bench (4 moments from 55') / starter), >30 is left out.
- Rank movement nudges confidence (climbing builds belief, sliding hurts).

### NEL auction (`src/engine/market.js`)
- 8 matchdays (double round robin). Every NEL player is valued by the same function: ability,
  potential, recency-weighted position-fair performance, volume, big-game displays, consistency,
  each club's positional demand (Ubers love defenders, Bastard strikers, Barcha technicians…).
  The highest club valuation is the bid and the bidding club is shown.
- Qualification = top 23 Blue Lock players by final bid. 24th is eliminated, and the report says so.
- Auction drama is derived from real changes: surprise club bids, value surges, break-ins to the
  top 23, a new most-valuable player, rivals overtaking you, crossing the cutoff.

### UI
- Career dashboard (rank + movement, value or OVR, main rival) and a qualification strip with the
  exact stakes for the current stage.
- RANKS view: Blue Lock rankings (top 30 + your neighbourhood + fallen named players), building /
  NEL tables, auction leaderboard with cutoff line, news feed. Every row opens a dossier.
- Match report: scorers with assist links, standout player, rank and value movement, market news.

### Balance notes
- 100 Goal Challenge made role-aware (defenders lean on reactions/technique/composure); it was
  eliminating ~45% of careers, mostly non-strikers. Now ~15%.
- Careers migrated from v7 mid-run get a world fast-forwarded to their current stage.

## Phase 2 — Match & weapon overhaul (v25)

### Contextual matches (wheel preserved)
- Each contribution spin is a **segment of the match** with a minute stamp. The score is live:
  your goals/assists, plus teammates and opponents scoring in that segment (Poisson from team
  strengths, momentum, and what you just did — a defensive action suppresses that segment, an
  error inflates it and may be punished immediately).
- **Momentum** (−3…+3) rises with good actions and goals and decays each moment.
- **Context modifiers**: trailing late pushes attacking slices and cards; leading late favours
  defending and tactical fouls; level late in big matches raises clutch outcomes.
- **Team hierarchy**: the highest-ranked player in your side gets more shooting moments.
- Sent off / forced off: remaining segments are simulated (ten men concede more).
- Final score, timeline and result all come from the same events (tested over 300+ matches).

### Objectives (position-tailored)
Play Your Game · Hunt Goals · Create Chances (Build From the Back for defenders) · Defensive
Dominance · Target the Star (Mark Their Star; only when a named star is present) · Develop Your
Weapon (×1.8 mastery, some wasted phases) · Play for the Result · Individual Showcase (higher highs,
lower lows). Each multiplies tagged outcomes; none is strictly dominant.

### Attribute sensitivity
Goal odds now hinge on finishing (with movement, reactions, power as secondary); creation on
passing > vision > control; defending on defence > reactions/physical; carrying on dribbling.
An elite finisher has ~2.5× the goal share of a poor one.

### Flow
Per-moment chance from ability-vs-challenge (peaks when the opponent is slightly stronger), ego
style, importance, confidence, weapon mastery, rivalry with the duel opponent, form and momentum.
Measured: **~3% of matches**. In Flow, the archetype's family is amplified (×1.7), mistakes halve,
a unique "FLOW: …" slice appears (e.g. *Field Prediction* for vision players, *Erase the Attack* for
defenders), mastery XP doubles, and the wheel visibly changes.

### Confrontations (duels) & devouring
When the opposition contains a named star (or a rival), a duel can be scheduled (~13% of matches,
much more with *Target the Star*). You pick an approach — **Force Your Weapon** (mastery helps,
rivals who have read you resist), **Adapt Mid-Duel** (harder, success can evolve your weapon),
**Exploit a Weakness** (your secondary strengths vs their weakest area) — then spin a
matchup-weighted wheel (Decisive / Win / Stalemate / Beaten / Humiliated) shown split-screen.

### Weapons (`src/engine/weapons.js`)
- Every weapon maps to a family (finish, move, vision, dribble, pass, speed, control, defend,
  aerial, adapt). Mastery XP only comes from relevant outcomes (levels at 12/32/62/100).
- Mastery raises the weight of the family's outcomes and suppresses its failure modes.
- **Evolutions** need mastery *and* a pressure trigger: tier 1 (L2 + strong display), tier 2
  (L3 + big match, duel win or adaptation), tier 3 (L4 + Flow or decisive duel). Each tier adds
  a new wheel opportunity (e.g. Spatial → Advanced Scanning → Predictive Movement → Metavision).
- **Combination weapons** (Blind-Side Burst, Field Conductor, Sky Fortress, Counter Spear, Press
  Predator, Two-Footed Executioner, Elastic Escape, Cannon Volley) need attribute thresholds *and*
  a history of relevant actions.
- Mid-match breakthroughs are rarer (≈0.4–3.5% per moment) and no longer grant Flow.

### Reports
Timeline with minutes, Flow banner, duel line, scorers with assist links, weapon events.
Invented report lines (random "duel with X") were removed; only real events are reported.

### Known balance issues (for Phase 5)
- Centre-backs average higher ratings (≈7.7) and too many goals (≈0.3/app) vs forwards (≈7.0).
- Senior World Cup won too often; attribute growth still generous.

## Phase 3 — Rivalries, personalities & emergent drama (v25)

### Relationships (`src/engine/relationships.js`)
- Every named footballer you encounter gets a persistent record: respect, rivalry, compatibility,
  trust, hostility (independent 0–100 axes), encounter history (with/against, W-L, duels, assists
  to/from), "has read your weapon" counter, and up to 14 remembered moments.
- Status is derived: Stranger → Acquaintance → Emerging Rival → Rival / Respected Rival → Nemesis;
  Partner / Trusted Partner; Strained; Conquered Rival; Eliminated.
- Formation is credible: scoring against them (proud characters react harder), being dominated by
  them (creates a *revenge* memory), duels, overtaking them in the rankings, drafting or snubbing
  them in the Second Selection, being chosen by them, assists between you.
- The old random "X is emerging as a defining rival" overwrite (48% after every match) is gone;
  the main rival is the highest-rivalry relationship.

### Mechanical effects
- Partners on your side boost creation and add a **Combination Play** wheel slice.
- Selfish, hostile teammates suppress your assists.
- Rivals on the other side raise star moments; volatile ones raise card risk.
- **Analytic characters read your weapon** (Isagi, Rin, Karasu, Niko, Aiku…): each time you force
  it against them the read grows; it counters your mastery in matches and duels against them, which
  can force you to adapt (Example C from the brief).
- **Decisive confrontations**: once a rivalry is intense, a big fixture can stake it all on one duel.
  Win and the rivalry is settled (your potential +2, theirs −2). Lose and theirs rises instead.

### Personalities & voice
33 personality profiles (selfishness, analytic reading, pride, warmth, volatility) drive behaviour;
each main personality has its own short lines for noticing you, beating you, losing to you, offering
a partnership, reading your weapon, refusing to pass. Original writing, no quotes from the source.

### Event director (`src/engine/director.js`)
- 20 conditional scenes across rivalry, team, personal, selection, market and exceptional
  categories. Each has an actor chosen from the real state, prerequisites, a weight, a cooldown,
  repetition decay and category variety.
- Pacing: ~0.35 scenes per fixture (measured), more around high-stakes fixtures; major scenes
  (decisive rivalry, last chance, cutoff race) are almost guaranteed when their conditions hold.
- Choices show odds computed from attributes, ego style and relationships; the chosen option is
  resolved on the wheel (Success / Mixed / Backfire). Effects are persistent: relationship axes,
  guaranteed duels, duel/adaptation bonuses, temporary match modifiers, mastery, potential, forced
  objectives, read resets, evolution triggers, milestones.
- Memory: event history, per-event last fixture and counts, narrative flags (e.g. `beatenBy_<id>`,
  `decisive`, first rival/partner). Scenes are saved the moment they are decided (no reload re-rolls).

### Professional continuity
Pro fixtures against Paris X Gen / Ubers use the real NEL rosters (your rivals are there); Japan
fixtures put the best surviving Blue Lock players on your side; club fixtures use your NEL club.

## Phase 5 — Balancing pass 1 (v25)
Tool: `npm run balance` autoplays careers spread evenly over all 18 positions.

| Metric | Before pass | After pass |
|---|---|---|
| CB goals / app | 0.31 | 0.14 |
| CM goals / app | 0.60 | 0.40 |
| Avg rating CB vs CF | 7.81 vs 7.40 | 7.20 vs 7.05 |
| NPC rating CB vs CF | 7.33 vs 6.72 | 6.98 vs 6.69 |
| Senior World Cup (all careers) | 25% | ~10% |
| Reached NEL | 51% | ~44% |
| Qualified top 23 (of NEL) | 87% | ~75% |
| Match-ending injuries | 2.3% | ~2.0% (longest streak 1–2) |
| Flow / duels per match | 3.8% / 18% | ~2.5–3.4% / ~18% |

Changes and reasons:
- **Goal slice** no longer has a 0.8 floor; form bonuses scale with the role's shooting profile.
  **Assists** scale more steeply with the role's creation profile. Corner header goals halved.
- **Ratings**: baseline lowered 5.85 → 5.68, defensive action and clean-sheet weights reduced, key
  passes and dribbles rewarded more (wingers/creators were under-rated). Growth, confidence and form
  thresholds moved with the new scale so development did not silently slow down.
- **NPC ratings** aligned with the protagonist scale (rankings compare both).
- **Team scoring is now matchup-relative**: teammates' scoring used to ignore the opponent, so strong
  opponents only conceded more and never scored fewer. Defensive help was also counted twice.
- Momentum and per-segment defensive suppression softened (a dominant player could make a 108-rated
  side score ~1 goal per game).
- Late knockout opponents strengthened; NEL field widened to 40 for a real top-23 race.

Current outcome spread (108 careers): First Selection out ~21–25%, 100 Goal Challenge ~13–16%,
Second Selection ~13–15%, U-20 defeat ~3–5%, NEL cut ~8–11%, professional ~35–45%.

Known remaining issues:
- Attacking-midfield group (includes Second Striker / False Nine) scores slightly above wingers.
- First Selection is the single biggest eliminator; could use another individual-survival lever.
- Event mix leans on `rival_notice`, `partnership_offer`, `refuse_pass`, `obsession`.

## Phase 4 — Presentation & history (v25)
- **Milestones** recorded from real events: first goal, hat-tricks, first 9+ display, top-10 / #1
  rank, survived selections (and how), close NEL survival, decisive duel wins vs elite players,
  weapon evolutions and combinations, first Flow, first rival/partner, trophies, eliminations.
- **Career biography** on the completion screen and in the archive: peak OVR, best rank, top bid,
  output, Flow count, weapons and evolutions, combos, main rivals (with duel record), partners,
  trophies and the 8 most defining moments. Pre-v25 archive entries show a fallback note; their
  missing statistics are shown as "—", never invented.
- **Debug panel** (`?debug=1`): seed, injury risk, rank score, market breakdown, live wheel odds,
  Flow chance, director candidates and weights, relationship axes, copy-state and full-fitness tools.
- **Sound cues** for Flow, confrontations and evolutions (generated tones; no assets).
- **Bug fixed (pre-existing in v24)**: the stylesheet had no global `[hidden]` rule, so the match-prep
  area stayed visible under the career-complete screen. Added `[hidden]{display:none!important}`.
- Verified in Chromium at 390px and 1280px: no console errors, no horizontal scroll; offline reload
  via the service worker loads every engine and starts a career.

## Preview deployment (for owner testing)
- URL: `https://iamifogg.github.io/egowheel/preview/` — deployed by `.github/workflows/preview.yml`
  on every push to the overhaul branch. The live game at `/egowheel/` is re-published from `main`
  unchanged. The yellow **PREVIEW** badge in the header shows the deployed commit.
- Isolation (same origin as the live game, so this matters):
  - `src/channel.js` sets `EW.channel = 'preview'`. Saves, backups and audio settings use the
    `egowheel.preview.*` namespace. The live keys (`egowheel.save.v7`, `egowheel.audio.v1`) are only
    ever *read*: on first visit the preview copies your live v24 career so you can test migration,
    and never writes back. Tested (`preview builds never write to the live game's storage keys`).
  - The preview service worker uses the `egowheel-preview-*` cache namespace, is scoped to
    `/egowheel/preview/`, and only deletes its own old caches.
- A push to `main` redeploys the live site without `/preview/`; re-run the preview workflow.
- Before merging: set `EW.channel = 'stable'`, restore the stable cache naming, delete
  `preview.yml`. Stable saves then use `egowheel.save.v8` and migrate from v7 with a backup.

---
# v26 — The Ego Awakens

## Decision probabilities (critical fix)
v25's scene wheel weighted outcomes as `Success p×70 / Mixed 30 / Backfire (1−p)×70`, so an option
shown as 80% actually succeeded 56% of the time. `src/engine/decisions.js` now owns one exact
distribution per choice `{success, mixed, failure}` (sums to 1). The wheel segments *are* those
probabilities; cards show tier, reward, failure severity and an odds bar. Verified over 60,000-spin
samples (`tests/decisions.test.js`).

Risk tiers: **conservative** (45–95% success, modest reward), **ambitious** (18–75%, meaningful
reward/setback), **extreme** (4–35%, transformative reward, severe failure). Tier limits clamp the
attribute/relationship-derived odds so extremes stay rare.

## Pillar 1 — narrative pressure engine
- `pressure.js`: six dimensions (competitive, identity, relationship, selection, expectation,
  stress) fed by real match facts (loss streaks, a rival outshining you, your weapon being countered,
  big misses, partner tension, falling below the line, salary vs performance, sponsor load…). They
  change real odds: errors/star moments/cards, weapon reliability, adaptation success, combo
  frequency, Flow, injury risk. Some ego styles thrive under pressure; perfectionists crack.
- `arcs.js` + `data/arc-templates.js`: 14 multi-stage arc types — weapon counter, rivalry ascent,
  overshadowed partner, selection crisis, revenge, obsession, breakthrough, leadership, teammate
  survival, identity crisis, jealousy, manager doubt, public expectation, reunion. Arcs store facts
  (actors, stage, pressure, causes, flags, history), start from credible state, develop from match
  facts, can fizzle (actor absent/eliminated, nothing happening), and resolve in several ways.
  Max 3 major / 5 total live arcs. Critical stages create *opportunities*, never automatic wins.
- In-match **critical moments**: trust your weapon (conservative) / adapt in the moment (ambitious,
  weapon progress) / abandon everything (extreme: Ego Awakening, a new permanent wheel opportunity —
  or a collapse that spawns an identity crisis). Triggered by critical-stage arcs or close, important
  late matches (~6% of matches).
- `agency.js`: personal ambitions for 20 named characters (Isagi devours the top player, Reo wants
  independence from Nagi, Barou wants to be top scorer…), an NPC-to-NPC network (seeded duos/rivalries
  that evolve: duos lift each other's form, rivalries accelerate development), **rivals who evolve to
  beat you** (analytic ones build counters that reduce your weapon's effect; proud ones get stronger),
  and six character-initiated scenes (challenges, combination ideas, mentors, weapon trades, duo
  threats, messages from former partners).
- `partnerships.js`: stages (Initial Understanding → Developing → Established Combination →
  Signature Technique → Exceptional Synchronisation) earned from shared matches and *linked actions*;
  higher stages need real history, a big shared win, and (top stage) a Flow moment together.
  17 pair-specific signatures (Monster Relay with Bachira, Trap & Release Circuit with Nagi, Red
  Lightning Overlap with Chigiri, Twin Wall Read with Aiku…) plus generic ones. Tension can drop a
  stage or end the partnership; ended partners become rivals with history.
- Multiple simultaneous identities per relationship (e.g. "Signature Partner · Rival · Deep Respect").
- Career-defining moments: full-screen overlay with portraits, recorded in history and the archive.
- Event catalogue: 20 generic + 6 character-initiated + 9 professional scenes + ~26 arc stage
  scenes ≈ 61 templates, all state-driven. Measured pacing ≈ 0.41 scenes per fixture.

## Pillar 2 — a face for your ego
- `src/art/sprite-renderer.js`: procedural layered 40×44 pixel portraits — 14 hairstyles with
  lengths and two-tone tips, 4 face shapes, 5 eye shapes, 4 brows, facial hair, marks, accessories,
  kits with shirt numbers, 8 expressions — drawn to a colour grid (testable in Node) and blitted at
  integer scale. 8 pixel environments (pitch, corridor, locker room, gym, training ground, office,
  apartment, city). No image assets, no external services.
- `src/art/character-appearances.js`: fixed original interpretations for 38 named characters,
  deterministic looks for all procedural players, team/club/national kits.
- `src/ui/avatar-editor.js`: live preview, colour swatches, option cycling, expression preview,
  randomise/reset/save; free before turning pro, professional styling has prices (barber, dyes,
  accessories that can be bought in the Life hub).
- Portraits appear in the dossier, rankings, player dossiers, rival cards, scene stages (both
  characters facing each other in an environment), duels, critical moments, career-defining moments,
  the Life hub, contract screens and the archive. Expressions follow the scene.

## Pillar 3 — beyond Blue Lock
- Auction value and money are separate. After NEL qualification you choose between real contract
  offers (prestige vs minutes; salary, length, signing bonus, role, bonuses, who is already there).
- `pro-career.js`: 10-month seasons; 6–10 playable highlights (league, grudge matches against clubs
  where your rivals/partners play, Champions Cup knockouts for strong clubs, international windows,
  U-20 World Cup / Asian Cup / Senior World Cup in the right seasons if you are in Japan's 23); the
  rest is simulated monthly (≈4 matches a month). Monthly salary, agent fee, rent, upkeep, living
  costs, sponsor income; performance bonuses; manager trust and squad role; reputation (football,
  media, conduct); wellbeing; end-of-season table, cups, awards; contract clock, renewals,
  transfers, NPC transfers, sponsorship offers and obligations; ageing; retirement (32+, forced 38).
- `finances.js`: every transaction has a unique id; re-applying it is a no-op (no duplicate salary,
  bonuses or signing fees after reloads). No overspending; ledger visible in the Life hub.
- Life hub: dashboard, free time between fixtures (one action: extra training, recovery, time with a
  teammate/rival, sponsor commitments, specialist sessions), housing (dorm → penthouse/estate),
  lifestyle items (style, vehicles, home recovery), capped once-per-season training investments with
  diminishing returns, sponsors, club history, ledger.
- Fast-forward: next fixture / rest of season / to retirement — same rules as playing.
- The career epilogue is now built from the real season history (no double counting).

## Integration examples that now happen
Former Blue Lock rivals appear at offered clubs and as opponents; reunion arcs fire in professional
football; partners make staying at a club attractive (and a loyalty scene can damage a partnership);
pressure from salary expectations feeds the narrative engine; manager-doubt arcs use the professional
manager-trust value; awakened weapons and signature techniques carry into professional matches.

## Balancing decisions (v26)
- **Professional stat inflation**: in v26 previews, playing every professional highlight drove peak
  OVR to 103 (the Blue Lock growth loop ran ~140 more times). All positive development now tapers
  with age once professional (×0.55 at ≤20 … ×0.05 at 30+), applied once in `changeStat`. Potential
  bonus cap lowered 18 → 10. Result: played careers peak ~86–96; simulated careers ~73–92.
- Scene pacing reduced from 0.50 to ~0.41 per fixture (full report: 0.38–0.39); generic critical
  moments only fire when the score is close late on.
- Duels were 33% of matches once professional calendars (full of named rivals) were added: base
  chance lowered and professional fixtures ×0.75 → ~21%. Flow importance factor capped (≈5%).
- Professional superstar double counting: in pro/international fixtures your rating now only nudges
  team strength relative to an 80-rated baseline (your goals/assists are already counted), and
  attacking outcomes scale with the matchup gap (±2.5%/point, 0.7–1.15). Senior World Cup opponents
  strengthened. Strong careers that play every highlight now win a World Cup in ~60% of 17-season
  careers (four attempts, ~20% each), down from 100%.
- Legacy thresholds raised (+5–7). Fast-forwarded careers mostly end as Elite Veteran/Club Legend;
  fully played ones spread from Club Legend to All-Time Great.

Latest full report (45 careers, all positions): First Selection out 22%, Second Selection 24%,
100 Goal Challenge 13%, NEL cut 11%, professional careers 29%; injuries 2.4% (longest streak 2);
Flow 5.2%; duels 21%; 0.39 scenes per fixture.

## Known limitations
- Played-every-highlight careers still earn more awards than fast-forwarded ones (they have higher
  ratings); the gap is much smaller than before but not zero.
- The professional league table is abstract (position from points and strength), not a full league.
- Pixel art is procedural; the named-character looks are interpretations, not reproductions.
- Romance is intentionally not part of the social system.

# v26.1 — Flow & visual identity pass

## Flow state overhaul (`src/engine/flow.js`)
Flow already existed, but in play it didn't feel different: it added a small hidden weight change and a single
"FLOW:" slice, so players entered Flow and still rolled Major Errors. It has been rebuilt:

- **The wheel is rebuilt, visibly.** While Flow is active `EW.flow.reshape` adds 3–4 *exceptional actions* that
  take 44% of the wheel. They are drawn as cyan/violet glowing slices marked ◆, with an animated aura ring around the wheel.
  - Routine negatives are cut hard. Major Error ×0.06, Own Goal ×0.04, a straight red ×0.08, Lose Important Duel ×0.16, Waste Big Chance ×0.22.
  - Quiet phases drop to ×0.12 and mundane actions to ×0.55. Star outcomes (goals, assists, last-man stops) rise ×1.6.
  - Measured: routine-negative share fell from 24% to 3% for a forward and from 13% to 1.3% for a centre-back. The major-error rate inside Flow is under 1%.
- **Distinct actions per weapon family and role.** Every family has three actions of at least two different kinds.
  - Examples: finisher (Impossible-Angle Finish, Instinctive Volley, Killer Run → penalty); dribbler (Break Two Defenders → teammate chance, Glide Through Pressure → momentum surge, Dribble Into the Chance); defender (Read the Whole Attack, Dominate the Duel, Erase a Certain Chance → suppresses opponent goals).
  - A role action is added when the family doesn't cover the role (Ruthless Instinct / Dictate the Tempo / Read the Whole Attack).
  - New contribution effects: `penalty` (78% scored), `chanceFor` (62% teammate goal), `surge` (momentum +2.2) and `endFlow`.
- **Failure is dramatic, not sloppy.** Flow failure takes two forms. *Flow Overreach* (3.5–9.5%) is an impossible attempt that nearly works.
  *Flow Shatters* (only in hard contexts) is a mistake that ends Flow. Their weight scales with how outmatched you are (`difficulty(gap, importance)`).
- **Never wasted by timing.** Flow lasts a 3-moment window, and at least 2 Flow moments are guaranteed. If it triggers on the last or second-last moment,
  extra stoppage-time moments (90+2', 90+4') are added (`p.baseSpins` / `p.flowExtra`). These short segments carry only 2.5% of match
  time each, so the score model stays fair. Flow can trigger at most once per match.
- **Achievement is the reward.** A *feat* is a successful Flow action, goal, assist or star outcome inside Flow. Feats, not the trigger, unlock:
  - weapon XP ×2 (×3.2 for Flow actions);
  - the Flow evolution trigger, which now also counts for tiers 0 and 1, at 55–65%;
  - breakthrough chance +3% per feat;
  - confidence;
  - rivalry and respect from the opposing star who watched;
  - partnership XP with your best partner on the pitch;
  - the Stage 5 partnership "shared Flow" gate;
  - milestones: First exceptional Flow action, Flow Masterclass (2 feats), Flow Masterpiece (3+).
- **Duels and critical moments in Flow.** Duels in Flow give +8 to your duel strength. Critical-moment success odds become ×1.3 + 10%, capped above the tier
  maximum. The raised odds are shown on the cards and on the wheel (`flowCritical`).
- **Presentation.**
  - A Flow burst banner shows your portrait, the Flow name and how many moments are left (or "Time bends — +N stoppage-time moments").
  - The HUD shows a pulsing "FLOW · N" chip, and the stage is retitled "◆ FLOW STATE · <name>".
  - There is a new sound cue, plus a chime for each feat.
  - Timeline entries are marked ◆ (feat) or ◇ (failure), with "Flow fades" or "Flow shattered".
  - The post-match **Flow report card** gives a verdict (Masterpiece / Masterclass / Breakthrough / Denied / Without Reward), lists each Flow moment, and states the
    rivalry and partnership consequences.
  - Reduced-motion users get no animation.
- **Rarity kept.** The trigger rate was trimmed slightly (×0.86, cap 2.6% per moment). Flow appears in about 5.5% of matches (5.2% before).
  - Over 30 autoplayed careers, a match with Flow averages a 9.1 rating against 8.0 overall, with 1.6 feats per Flow.
  - Verdict mix: Masterclass 45%, Breakthrough 32%, Masterpiece 12%, Without Reward 7%, Denied 4%.
  - Flow can be strong without guaranteeing anything: it is not free goals and not an automatic win.
- Tests are in `tests/flow.test.js`. They cover the wheel shape, distinct actions, a 1,600-moment Monte Carlo, late-trigger stoppage time, the window
  and feat recording, "trigger alone is not the reward", truthful critical odds, and rarity and reporting in played careers.

## Portrait system v2 (`src/art/sprite-renderer.js`, `src/art/character-appearances.js`)
The v26 renderer was a proof of concept (40×44, a generic hair dome with recolours). It has been rewritten to work the way a
pixel artist would:
- **48×56 grid with better proportions.** It has a shaped jaw and chin per face type (oval, sharp, round, square, long, soft), ears, neck shading, and
  three collar types with shoulder trim, folds, crest and number.
- **Palette discipline.** Every material uses a hue-shifted 6-tone ramp (warm highlights, cool shadows). Skin uses hand-tuned warm
  shadow mixes so that no tone goes neon.
- **Selective outlining.** Silhouettes are outlined in a dark tone of their own colour, never flat black. The fringe casts a dithered shadow
  on the forehead.
- **Strand-based hair.** Hair is built from tapered bezier strands, volume blobs, a skull cap with a hairline, shaved sides and back hair.
  - Shading comes from top-left light, with a clean arc highlight and tip separation (dark notches between strand tips only).
  - Comb lines on slick styles, texture on short styles, two-tone tips (by strand length or by height), and radial spikes with wide bases.
  - There are 24 library styles: messy, spiky, swept, parted, bowl, curtain, wild, long, ponytail, buzz, undercut, mohawk, bob, tousled, fluffy, slick,
    sidefringe, quiff, afro, twists, waves, topknot, crop and shaggy.
- **Anime eyes in seven shapes:** standard, sharp, round, narrow, droopy, lidded, fierce. Each has a heavy upper lash, shaded iris, pupil,
  catchlights and a lower-lid hint, plus eye spacing, three nose types and six brow types.
- **Expressions.** There are 10 public expressions (neutral, confident, intense, angry, frustrated, smirk, surprised, defeated, elated, focused) plus
  bored and manic. Each changes the eyes, brows, mouth and cheeks (blush, sweat drop, nose wrinkle).
- **Personas** (cold, manic, bored, fierce, sunny, proud, shy) remap requests per character. For example, Shidou's "confident" is a manic grin,
  Nagi's "neutral" is bored, and Rin's "confident" is a cold smirk. Procedural players get a persona from their personality.
- **Named characters.** 15 have **bespoke signature hair designs** (isagi, bachira, nagi, reo, barou, shidou, rin, sae, chigiri, kunigami,
  kaiser, aiku, karasu, tokimitsu, lorenzo) with tuned face, eyes, brows, nose, marks and accessories. The other 23 named characters use tuned
  library styles. All 38 portraits are unique (tested), and the signatures differ substantially from the generic style.
  These are original pixel interpretations, not official artwork.
- **Every footballer has a portrait.** Procedural players derive a full look from their id: weighted hair colours, 14 skin tones (with
  textured styles for darker skin), face, eyes, spacing, nose, brows, marks, accessories, a variation seed for strand jitter, and a persona.
  - In tests, 120 of 120 sampled procedural portraits are unique, and each look is stable per id. The ranking list now shows a portrait for every row.
- **UI staging.**
  - Portraits sit in a frame keyed to the character's accent and kit colour. Named characters get a gold-tinted frame and Flow a cyan glow.
  - The dossier opens on a **portrait stage**: a scene background, a large portrait in a relationship-driven mood, a name plate, identity tags and a mood strip of
    four expressions.
  - The duel, critical-moment, Flow burst and Flow report portraits react to Flow.
  - The editor gains nose and eye-spacing options.
- **Compatibility.** Appearance `v:2` adds `nose`, `eyeGap`, `var`, `sig` and `persona`. `normalize()` upgrades v1 appearances from older saves in
  place (tested), and unknown signatures or personas are dropped. Everything is still parameter-generated (no image files), deterministic,
  cached as data URLs, and works offline.

## Known limits (v26.1)
- These are original pixel interpretations, so resemblance relies on silhouette, colour, expression and signature traits rather than exact
  likeness. Characters with similar real-world designs (short dark hair) are told apart mainly by their signature details.
- Procedural strands use a seeded jitter. Two players can share a style and colour and still differ, but some combinations are close.
- Flow during simulated or fast-forwarded pro seasons is not modelled as individual moments. Only played matches use the Flow wheel.
