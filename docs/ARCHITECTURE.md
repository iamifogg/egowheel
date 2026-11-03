# EgoWheel v25+ — Architecture & Overhaul Checklist

## Constraints that shaped the design
- **Static, free, offline.** No build step, no backend, no paid services. GitHub Pages serves the repo root.
- **Classic scripts, not ES modules.** ES modules break when `index.html` is opened from `file://`.
  Each engine file is an IIFE that registers itself on `globalThis.EW` and also exports via
  `module.exports` for Node.
- **The wheel stays central.** Engines compute *weights*; the wheel still decides.

## Layout
```
index.html            UI structure (loads src/engine/*.js, src/data/*.js, then app.js)
app.js                Integration layer: wheel, career flow, rendering (legacy monolith, shrinking)
styles.css
service-worker.js     Offline cache (asset list + version must be bumped with every release)
src/engine/rng.js       Seedable RNG (mulberry32). EW.rng.use(seed) for reproducible runs.
src/engine/injuries.js  Single injury model: per-match risk, severity, recurrence protection, recovery
src/engine/save.js      v8 schema normalisation, v7→v8 migration, backups, export/import
src/data/characters.js  Named Blue Lock footballer profiles & personality voices        (Phase 1/3)
src/engine/world.js     Population (≈300), background simulation, rankings, selections   (Phase 1)
src/engine/market.js    NEL auction valuations for every player, top-23 cutoff            (Phase 1)
src/engine/relationships.js  Respect / rivalry / compatibility / trust / hostility      (Phase 3)
src/engine/director.js  Event director: prerequisites, weights, cooldowns, choices       (Phase 3)
src/engine/weapons.js   Weapon families, mastery XP, evolutions, combinations            (Phase 2)
tests/harness.js        Loads the real scripts into a Node vm with a fake DOM
tests/autoplay.js       Autopilot that plays complete careers through the real functions
tests/*.test.js         node --test suites
```

## Active vs dead code (verified in v24)
| Path | Status |
|---|---|
| `contributionStage` → `resolveContributionOutcome` → `finalizeContributionMatch` → `contributionRating` → `applyPostMatch` | **Active** match path |
| `matchPerformanceStage`, `simulateMatch`, `simulateChallenge`, `resolveMatchOutcome`, `binomial` | **Unreachable** (no mode routed to them) — removed in v25 |

## Save schema (v8)
`{ version: 8, run, archive[], ui{view, fastSpin}, meta{createdVersion, migratedFrom} }`
- `run.injury = {key,name,severity,out,limited,penalty,source,since,matches}` (old `{name,matches,penalty}` is normalised).
- `run.injuryLog = [{fx,severity,source,matchEnding}]`.
- `run.career.fxNo` = fixtures elapsed (drives injury recurrence windows, cooldowns).
- Later phases add `run.career.world`, `run.career.relations`, `run.career.flags`, `run.career.events`,
  `run.career.milestones`, `run.weapons` — all optional and defaulted by `EW.save.normalize`.

Load order: `v8` → (corrupt? back up, try `v8.prev`) → highest legacy `vN` (back up raw string to
`egowheel.backup.vN`, migrate) → fresh state.

## Checklist
- [x] Phase 0: map active paths, remove dead simulation, seeded RNG, injury rebuild, wheel lock,
      save migration + backups + export/import, Node test harness
- [x] Phase 1: living world, rankings, NEL market, top-23, selection pressure UI
- [x] Phase 2: contextual match state, objectives, Flow, duels/devouring, weapon mastery & evolution
- [x] Phase 3: relationships, personalities, event director with choices, arcs
- [ ] Phase 4: dashboard, dossiers, rivalry screens, dramatic match presentation, archive biography
- [ ] Phase 5: large-scale career validation & balancing
