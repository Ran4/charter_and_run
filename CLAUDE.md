# Bigmouth & Run

Big Mouth × Simpsons Hit & Run, in plain three.js ES modules (no build step). See README.md
for the player-facing overview and the code map.

## Running and checking changes

- `npm start` serves on :8790. Don't open a browser window for the user; verify headlessly:
  `node tools/shot.mjs <scenarios>` (headless Chrome, real GPU, screenshots in `out/`).
  `montage a.png b.png -tile 2x2 -geometry 640x360+4+4 sheet.png` makes contact sheets.
- `story` plays every mission via debug warps and must end with `#7 idle` and `no errors`.
  Run it after touching missions, drivers, seating or the car/character physics.
- Test mode is `?test=1` (skips the title, no pointer lock, dialogue auto-advances).
  `window.__game`, `__lm(name)`, `__props`, `__stats()` are exposed for scenarios.

## Conventions that bite

- Yaw: forward = (sin yaw, cos yaw), matching three's `rotation.y` on +Z-facing models.
  Right = (-cos yaw, sin yaw) = local -X. Positive steer turns right, which *decreases* yaw.
  Drivers sit on the car's left (+X local).
- Everything off the asphalt is at `CURB` (0.15). Solids are footprints with a top height:
  a wall if `top > y + step`, a floor otherwise (characters step 0.45, cars 0.6). Ramps are
  oriented boxes whose top rises along their yaw.
- Static geometry goes through `GeoBuilder` (vertex colours, merged per block) and gets an
  inverted-hull outline from `toonMesh`. Keep new materials to a minimum.
- `teleport`/`place` snap to ground-level floors only (`groundAt(x, z, 0.2, 0.6)`), never
  roofs; landmarks must not sit inside a building footprint.
- The module `fx` (particles) is easy to shadow with a local `const fx = Math.sin(...)`.
  car.js imports it as `FX` for that reason.
- One-shot inputs (jump, kick, E) are handled once per frame in `handleOneShots`, continuous
  ones in `fixedStep` (60 Hz). `input.pressed` stays true for the whole frame.
