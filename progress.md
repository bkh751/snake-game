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

- Perspective + guidance update:
  - Kept world size fixed to `9x9x9` and surfaced it in UI/ready overlay.
  - Applied perspective scaling in projection: farther z cells render smaller; near cells render larger.
  - Localized gameplay status and controls guide to Korean with detailed command descriptions.
- Tuned perspective intensity:
  - Projection now uses weighted position distance (`x/y/z`) instead of only z.
  - Increased near/far scale contrast so depth change is visually clearer.
- Validation (perspective + Korean guide):
  - Unit tests: `node --test snake-core.test.mjs` passed (8/8).
  - Playwright ready check: `output/web-game-kr-ready2/state-0.json` -> `"mode":"ready"`.
  - Playwright movement check: `output/web-game-kr-move2/state-0.json` -> `"mode":"running"`.
  - Visual inspection: ready overlay text is Korean and perspective scaling is active (distance-based projection).
  - No `errors-*.json` found.

TODO for next agent:
- Playwright client key map currently favors arrow-style labels; add explicit `Q/E` aliases in client script if automated z-axis control coverage is required.
- Cube render upgrade:
  - Replaced heuristic projection with camera-based 3D projection (yaw/pitch/perspective).
  - Updated world guide rendering to draw sorted cube faces + edges for a stable cube silhouette.
  - Updated snake/food block drawing with distance-scaled size, shadow, and depth-aware color tone.
  - Added game-over overlay panel for clearer restart guidance.
- Validation (cube render polish):
  - Unit tests: `node --test snake-core.test.mjs` passed (8/8).
  - Playwright ready capture: `output/web-game-cube-ready/state-0.json` (`"mode":"ready"`).
  - Visual check: cube silhouette is now stable with face shading and perspective-scaled block size.
  - Playwright run captures showed frequent early `game_over` under scripted input timing, but rendering/controls/hud worked and no console error logs were produced.
- Added visual targeting aids:
  - Added floor-projected shadows (size/alpha vary by altitude and type).
  - Added green laser target guide from snake head to food.
  - Added target rings at food point and projected floor point.
- Validation (laser + shadow guide):
  - Unit tests: `node --test snake-core.test.mjs` passed (8/8).
  - Playwright captures confirm green target laser and floor-projected shadows are rendered.
  - No `errors-*.json` detected.
- Feature debug (Q/E/R key handling):
  - Added keyboard event parser module using `event.code` first, then key fallback.
  - Added tests for Q/E direction and R action mapping (including Korean layout key+code).
  - Verified in browser with synthetic keydown events: KeyQ(ㅂ), KeyE(ㄷ), KeyR(ㄱ) now map correctly.
- First-person view feature:
  - Added `V` view toggle action (`3인칭` <-> `1인칭`) with keyboard/button support.
  - Added first-person rendering pipeline (horizon/corridor/forward reticle/target marker).
  - Added HUD view indicator and control guide update.
- Keyboard mapping updates:
  - Added `KeyV` action mapping with Korean layout fallback (`ㅍ`).
- Validation:
  - Unit tests: `node --test keyboard-input.test.mjs snake-core.test.mjs` passed (15/15).
  - Browser verification (Playwright): `viewMode` transitions
    - before: `third_person`
    - after `V`: `first_person`
    - after Korean `KeyV(ㅍ)`: `third_person`
- View mode UX update (1인칭 + 3인칭):
  - Replaced single toggle button with explicit `3인칭` and `1인칭` selection buttons.
  - Added `view-mode.mjs` helper module for mode normalization/toggle/label.
  - Retained `V` key toggle while enabling direct mode selection.
  - Added active button styling for current view mode.
- Validation:
  - Added/ran `view-mode.test.mjs` (mode set/boundary/toggle/label).
  - Full test suite pass: `view-mode + keyboard-input + snake-core` => 19/19.
  - Playwright verification: third -> first (button), first -> third (button), third -> first (V key).
