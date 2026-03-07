# PixelMelt Agent Guide

## Product Rules

- Keep the app fully client-side. No backend, auth, database, or cloud API.
- Preserve the core loop: upload image -> convert to materials -> simulate -> interact -> export clip.
- Keep the simulation deterministic and worker-driven.
- Keep the grid near `168x168` unless there is a clear performance or fidelity reason to change it.
- Preserve crisp nearest-neighbor rendering on the main canvas.
- Favor desktop-first interaction quality over extra features.

## Code Shape

- Put shared simulation logic in `src/sim/` so the worker and tests use the same code.
- Keep `src/workers/simulation.worker.ts` thin; orchestration belongs there, rules belong in `src/sim/`.
- Keep UI state in Zustand under `src/store/`.
- Keep upload/raster/export helpers in `src/lib/`.
- Seeded demos live in `public/demo/`.

## Required Checks

- Run `npm run lint`
- Run `npm test`
- Run `npm run build`
- When changing interactive behavior, run a real browser smoke pass before handoff.

## Handy Commands

```bash
npm run dev
npm run preview
npm run check
```
