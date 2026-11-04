# EgoWheel — The Ego Awakens (v26.1)

Unofficial, fan-made Blue Lock career RPG. A static, offline-capable PWA: no backend, no accounts,
no paid services. Blue Lock and related names belong to their respective rights holders; no
official artwork is used.

Spin a player into existence, then survive a living Blue Lock programme: 300 egoists, rankings
that move every fixture, rivals who remember you, an NEL auction for 23 places, and a professional
career beyond it. The wheel decides; your build, choices and history shape the wheel.

## Play
Open `index.html` in a browser, or serve the folder statically (GitHub Pages deploys the repo root).
Works offline after the first load. `?seed=anything` reproduces a run exactly. `?debug=1` shows the
developer panel (state, odds, injury risk, rankings and auction calculations).

## How the game works
| System | What it does |
|---|---|
| **Player creation** | Position, footedness, height, physique, potential, weapons, ego style, archetype and 16 rolled attributes. Quick Build skips the animation. |
| **Living world** | ~300 participants (named characters with their own identities + seeded procedural egoists) play, develop, get eliminated and sign for NEL clubs. |
| **Rankings** | Stage-aware, position-fair Blue Lock rankings decide First Selection individual survival, Second Selection odds and the U-20 squad. |
| **Matches** | 6–7 wheel spins, each a timed segment with a live score and momentum. Objectives, context (trailing late, clutch moments), Flow, duels with named stars and weapon mastery all reshape the wheel. |
| **Weapons** | Families, action-based mastery, evolutions earned under pressure, and combination weapons. |
| **Relationships** | Respect, rivalry, compatibility, trust and hostility with every named player you meet. Partners add combination plays; analytic rivals read your weapon; decisive duels settle rivalries. |
| **Event director** | Short conditional scenes with 2–3 choices whose odds depend on your attributes, ego and relationships, resolved on the wheel, with persistent consequences. |
| **Injuries** | One injury opportunity per fixture, recurrence protection, missed fixtures and a medical room with recovery choices. |
| **NEL auction** | Every NEL player is valued by the same market model; only the top 23 Blue Lock players continue. |
| **Narrative engine** | Pressure in six dimensions, 14 kinds of multi-stage storylines, rivals with their own ambitions who evolve to beat you, partnerships with signature techniques, risk-tiered decisions with exact odds, critical moments and Ego Awakenings. |
| **Flow** | A rare heightened state that rebuilds the wheel around exceptional, weapon-specific actions, nearly eliminates routine errors, is never wasted by timing, and rewards what you achieve inside it. |
| **Pixel art** | Hand-tuned pixel portrait renderer: bespoke designs for major named characters, personas that shape their expressions, and a full stable look for all 300 entrants; customise your own footballer. |
| **Professional life** | Contracts, monthly salary, a traceable ledger, transfers, sponsors, housing and lifestyle, free time between fixtures, reputation, seasons with playable highlights, fast-forward and retirement. |
| **Archive** | Completed careers keep their milestones, rivals, weapons and summary. Export/import JSON backups. |

## Development
- No build step. Engines live in `src/engine/*.js` and data in `src/data/*.js` as classic scripts
  registering on `globalThis.EW` (works over `file://`). `app.js` integrates them with the UI.
- Tests: `npm test` (Node ≥ 18, built-in `node:test`). The harness loads the real browser scripts
  into a Node VM with a fake DOM and autoplays complete careers.
- Balance report: `npm run balance` (or `node tests/balance-report.js 200`).
- When changing any script, bump the `?v=` query in `index.html` and the cache name/asset list in
  `service-worker.js`.
- Docs: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (structure, save schema, checklist) and
  [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) (living log, balancing decisions, known issues).
