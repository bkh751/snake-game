Original prompt: 3D Snake 게임으로 발전시켜서 커밋해줘

- Initialized 3D migration plan:
  - Replace 2D grid DOM rendering with canvas-based pseudo-3D projection.
  - Expand game state from (x,y) to (x,y,z) with six movement directions.
  - Update controls, text-state output, and tests.

- Implemented 3D gameplay core:
  - Added `depth` dimension and six-way movement (`up/down/left/right/in/out`).
  - Updated collision, food placement, and state restart logic for 3D coordinates.
- Replaced DOM cell board with canvas pseudo-3D renderer and 3D control mappings.
- Updated unit tests to cover z-axis movement and 3D bounds/food logic.

- Validation:
  - Unit tests: `node --test snake-core.test.mjs` passed (8/8).
  - Playwright skill client run completed; screenshots and text-state outputs generated under `output/web-game/`.
  - Visual inspection confirms 3D bounding box, snake segments, and food are rendered.
  - No runtime console errors observed during automated run.
- Notes:
  - Current spawn/direction can still lead to fast game-over if no turn input is provided.
  - Added deterministic `window.advanceTime(ms)` for reliable automation stepping.

TODO for next agent:
- Consider adding onboarding/start state so first move choice is explicit before ticking.
- Add depth indicator UI (current z-layer of head/food) for easier human play.

- Follow-up improvements completed:
  - Added explicit `ready` start state: game does not tick until first direction input.
  - Added depth HUD (`Head Z`, `Food Z`, and depth progress bar).
  - Added fullscreen toggle on `F` and resize handling on fullscreen change.
  - Extended `render_game_to_text` with `mode: ready` and depth fields.
- Validation (follow-up):
  - Unit tests: `node --test snake-core.test.mjs` passed (8/8).
  - Playwright checks:
    - Ready scenario output: `output/web-game-ready/state-0.json` with `"mode":"ready"`.
    - Movement scenario output: `output/web-game-move-safe2/state-0.json` with `"mode":"running"`.
  - Screenshot inspection confirms ready overlay and in-game movement rendering.
  - No `errors-*.json` produced (no console/page errors captured).

TODO for next agent:
- Improve depth readability by tinting blocks by z-layer (currently only HUD values/bar).
- Consider a soft boundary warning before imminent wall collision.
