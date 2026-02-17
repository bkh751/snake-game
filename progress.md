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
