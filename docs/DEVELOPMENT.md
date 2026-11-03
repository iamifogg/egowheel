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
