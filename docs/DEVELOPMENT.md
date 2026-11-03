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
