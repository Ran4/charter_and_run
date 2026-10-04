# Bigmouth & Run

*Simpsons: Hit & Run*, but it's Bridgeton and everyone's going through puberty. A fan-made
three.js open-world romp: walk, jump, kick, steal cars, smash mailboxes for coins, take missions
from Maurice, Andrew, Coach Steve, Jay, Jessi and Duke Ellington's ghost — and when your
**Shame meter** fills up, the Shame Wizard's hearses come for you.

## Run

```sh
make run           # installs deps if needed, serves on http://127.0.0.1:8790 and opens it
```

Click **Play**. `make serve` serves without opening a browser, `PORT=9000 make run` picks
another port, `make test` plays the whole story headlessly. Modules need an HTTP server; `file://` won't work. The fonts
come from Google Fonts (falls back to Impact offline).

URL options: `?fresh` ignores the save, `?mission=N` starts at mission N (0-6).

## Controls

| key | on foot | in a car |
|---|---|---|
| W A S D | move | drive / steer |
| Mouse | look | look (swings back behind you) |
| Shift | sprint | |
| Space | jump, again in the air for a double jump | handbrake (drift!) |
| Click / J | kick — in the air: ground stomp | |
| E | talk, get in, steal a car | get out (at speed: tumble out) |
| H | | horn |
| B | | look back |
| M | big map | big map |
| N | mute | mute |
| R | stuck? back to the road | stuck? back to the road |
| Esc | pause | pause |

A gamepad works too (A jump/handbrake, X kick, Y interact, triggers drive).

## The game

- **Seven missions**: drive Nick's parents' wagon, get Andrew to school before the bell, follow
  a lost Coach Steve, catch Jay's escaped rabbits, race Jessi (and Connie), wreck the Shame
  Wizard's hearse, and survive the school dance with the Wizard on your tail.
- **Shame meter** (the Hit & Run meter): running people over, smashing cars, breaking stuff and
  carjacking all add shame. Fill it and two hearses hunt you down; on foot the Wizard floats out
  after you. Get caught and you're SHAMED — 50 coins gone. Stay away and it fades.
- **Collectibles**: 7 of Duke's lost records hidden around town (one needs a trampoline), 7 Tito
  Anxiety Mosquitoes to squash, and coins in every mailbox, bin, hydrant and gas pump.
- Progress saves to localStorage. Erase it from the pause menu.

## Code map

```
index.html, style.css      page, HUD styling, title/pause screens
src/main.js                Game: world setup, fixed-step loop, input → player/car, events, save
src/gfx.js                 renderer, toon materials, inverted-hull outlines, GeoBuilder, sky
src/input.js, audio.js     keyboard/mouse/gamepad; synthesized sfx, engine, walking-bass music
src/world/layout.js        street grid, block map, road graph, routing, landmarks
src/world/collision.js     static solids (box/circle/ramp), ground height, SAT for cars
src/world/town.js          builds every block: houses, school, mall, park, construction...
src/world/props.js         breakable instanced street furniture
src/actors/models.js       procedural characters (kids, adults, hormone monsters, ghost, wizard)
src/actors/character.js    on-foot physics, flinging, trampolines, car roofs
src/actors/car.js          car models + arcade physics + car/car impulses
src/actors/drivers.js      lane paths and AI drivers (traffic, route, chase, flee)
src/actors/peds.js         pedestrians
src/actors/pickups.js      coins, records, mosquitoes, rabbits
src/game/missions.js       mission scripts and the mission runner
src/game/shame.js          shame meter and the hearse pursuit
src/game/hud.js            HUD, minimap, dialogue, portraits
src/game/camera.js, fx.js, markers.js
tools/shot.mjs             headless test driver
```

## Headless tests

`tools/shot.mjs` serves the game, runs it in headless Chrome on the real GPU (no window) and
saves screenshots to `out/`:

```sh
node tools/shot.mjs start views drive talk smash foot chaos traffic race flee wizard title
node tools/shot.mjs story          # plays all seven missions start to finish
FROM=4 node tools/shot.mjs story   # ...starting at mission 5
```

Not affiliated with Netflix, Fox, Radical Entertainment or anyone else with lawyers.
