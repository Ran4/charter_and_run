// The paint shop at Gasolina's workshop (free roam; DESIGN §7.2 "Paint shop"; invented, §1.6).
// Owned by Shame: configured from METERS.skandal.paintshop, updated every frame. During a SKANDAL
// pursuit with no mission running, an ordinary car stopped for `holdSecs` in the zone in front of
// the workshop's left bay, with no Land Rover within `clearR` m, is painted. The fee is paid, the
// pursuit ends quietly and the hideout cooldown starts at once, and only then the scene plays: a
// fade to Ole and Stig at the car in the bay with the two lines from asnan's paint scene, and a
// fade back to the car rolling out red with dalahäst flowers and not a dent. Then the banner, a
// Land Rover that slows as it rolls past ("En målad bil…?") and the wet paint: a SKICK bar for
// `wetSecs` (asnan's RideMeter), and at 0 Guardia Civil knows the car again (a new pursuit). A car
// is painted once; next time they know the dalahäst.

import { Car } from '../actors/car.js';
import { AIDriver, LanePath } from '../actors/drivers.js';
import { CHARS } from '../actors/models.js';
import { landmarks } from '../world/layout.js';
import { RideMeter } from './missions/kinds/core.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { fmt, pta } from '../strings.js';
import { dist, yawTo } from '../util.js';

// The Land Rover's way past the painted car, as `pintura` offsets (x and z, the landmark faces +z):
// in from the x = 120 road's kerb, west across the forecourt 5 m in front of the car's nose, over
// the west kerb 5 m clear of its postcard stand and onto the x = 40 road's −z lane, where it
// carries on as traffic. The `pintura` scenario keeps it clear of props and solids.
export const DRIVE_BY = [[22.75, 5.25], [12.75, 5.25], [0.75, 5.25], [-11.25, 4.5], [-23.25, 4], [-35.25, 2], [-42.25, 0], [-48.5, -5], [-48.5, -17]];
const WHITE = 'rgba(255,255,255,0.95)';

export class PaintShop {
  constructor(shame) {
    this.sh = shame;
    this.g = shame.game;
    this.cfg = null;
    this.tipped = false;     // Ole's radio tip: the first free-roam pursuit of the session
    this.busy = false;       // the scene is playing
    this.reset();
  }

  reset() { this.holdT = 0; this.warned = null; this.wet = null; this.jeep = null; }
  configure(cfg) { this.cfg = cfg || null; this.reset(); }
  clear() { this.reset(); }

  get zone() { return (this.cfg && landmarks[this.cfg.at]) || null; }
  // Free roam on the island only (like bustRadio): a mission's own chase or wreck is never fixed here.
  get open() { const g = this.g; return !!this.cfg && g.level === 'island' && g.missions.state === 'idle'; }
  paintable(car) { return !car.spec.build && this.cfg.types.includes(car.type); }

  // Why this car cannot be painted now (a toast), or null (`stop` is update's).
  blocker(car) {
    const g = this.g, sh = this.sh, c = this.cfg;
    if (!this.paintable(car)) return c.noFit;
    if (car.painted) return c.known;
    if (sh.hideoutT > 0) return c.busy;
    if (g.coins < c.cost) return fmt(c.poor, { n: pta(c.cost) });
    if (sh.pursuers.some((h) => !h.dead && dist(h.x, h.z, car.x, car.z) < c.clearR)) return c.seen;
    return null;
  }

  // shame.startPursuit: Ole's tip once the ¡GUARDIA CIVIL! banner has gone.
  onPursuit() {
    const g = this.g, c = this.cfg;
    if (this.tipped || !this.open || !c.tip || !g.wait) return;
    this.tipped = true;
    g.wait(3).then(() => { if (this.sh.pursuit && this.open) g.radio(c.tip[0], c.tip[1]); else this.tipped = false; });
  }

  update(dt) {
    const g = this.g, sh = this.sh, c = this.cfg;
    if (!c || this.busy) return;
    if (this.wet) this.tickWet(dt);
    if (this.jeep) this.tickJeep();
    const car = g.playerCar, z = this.zone;
    const inZone = sh.pursuit && this.open && car && z && !g.inDialog && !g.inCutaway && !(g.frozenT > 0)
      && dist(car.x, car.z, z.x, z.z) < c.r;
    if (!inZone) { this.holdT = 0; this.warned = null; return; }
    // One toast per reason and visit: why not, or (still rolling) stop here.
    const why = this.blocker(car) || (car.speed >= 1 ? fmt(c.stop, { n: pta(c.cost) }) : null);
    if (why) {
      this.holdT = 0;
      if (why !== this.warned) { hud.toast(why); this.warned = why; }
      return;
    }
    this.holdT += dt;
    if (this.holdT >= c.holdSecs) this.paint(car);
  }

  async paint(car) {
    const g = this.g, sh = this.sh, c = this.cfg;
    this.busy = true;
    this.holdT = 0;
    // Paid, the pursuit over and the cooldown running before the scene: a Land Rover that rammed
    // the parked car during it would be a bust (shame.onRam).
    await g.pay(c.cost);
    sh.v = 0;
    sh.hideoutT = Math.max(sh.hideoutT, c.cooldown);
    sh.endPursuit(true);
    audio.coin();
    car.painted = true;
    try { await this.scene(car); } finally { this.busy = false; }
  }

  async scene(car) {
    const g = this.g, c = this.cfg;
    const ole = g.npc('ole');
    const was = ole && { x: ole.x, z: ole.z, yaw: ole.yaw, state: ole.state, busy: ole.busy, spot: ole.spot };
    hud.flashColor(WHITE);
    // The car in the left bay, nose out and its tail clear of the tyre stacks; Ole by the paint
    // tins on its left, Stig in front of the pillar on its right, both half turned to the camera.
    g.exitCar(true);
    const bay = g.lmOffset(c.at, 0, -7.3 + car.spec.len / 2);
    car.place(bay.x, bay.z, bay.yaw);
    if (ole) g.placeNpc('ole', c.at, -1.85, -2.2, 0.6);
    g.placeNpc('stig', c.at, 1.75, -1.6, -0.6);
    g.cinematic(ole || g.player, g.player);
    g.cutTo(c.cam);
    await g.dialog(c.lines);
    // Fade back: the car rolls out red with flowers, every dent gone; Ole is back where he was.
    hud.flashColor(WHITE);
    car.repaint(c.color, { dala: true });
    car.repair();
    // It stands in the box facing the road, the eye on its flank (the flowers, the bay behind) and
    // swinging in behind it as the chase camera does (§14.5).
    const out = g.lmOffset(c.at);
    car.place(out.x, out.z, c.rollOut.yaw);
    if (was) this.restoreOle(ole, was);
    g.endCut();
    g.endCinematic();
    g.enterCar(car);
    g.cam.yaw = c.rollOut.camYaw;
    g.cam.snapNext = true;
    hud.showBanner(c.banner[0], c.banner[1], 'good', 3200);
    hud.flashColor('rgba(184,32,42,0.4)');
    audio.jingle('complete');
    this.wet = { car, t: c.wetSecs, ride: new RideMeter('fragile', { label: c.wet.label }) };
    // The Land Rover comes once the banner is nearly gone (it is drawn over bubbles).
    g.wait(c.driveBy.delay).then(() => { if (this.open && !this.sh.pursuit) this.driveBy(); });
  }

  restoreOle(n, w) {
    const g = this.g;
    if (w.state === 'hidden') { g.hideNpc('ole'); n.busy = w.busy; return; }
    n.teleport(w.x, w.z, w.yaw);
    n.state = 'normal';
    n.busy = w.busy;
    n.spot = w.spot;
  }

  // A Guardia Land Rover rolls past the painted car, slows beside it and wonders.
  driveBy() {
    const g = this.g, sh = this.sh, c = this.cfg;
    const pts = DRIVE_BY.map(([dx, dz]) => g.lmOffset(c.at, dx, dz));
    const jeep = new Car(sh.cfg.vehicle || 'guardia');
    jeep.place(pts[0].x, pts[0].z, yawTo(pts[1].x - pts[0].x, pts[1].z - pts[0].z));
    jeep.locked = true;
    jeep.bust = g.addBust(CHARS[sh.cfg.pursuerDef || 'guardia'], jeep);
    const path = new LanePath([]);
    path.pts = pts.slice(1).map((q) => ({ x: q.x, z: q.z }));
    jeep.ai = new AIDriver(jeep, {
      mode: 'route', path, cruise: c.driveBy.speed,
      onArrive: () => { jeep.ai = new AIDriver(jeep, { mode: 'traffic', cruise: 12 }); },
    });
    g.addCar(jeep);
    sh.leaving.push({ car: jeep, t: 45 });
    this.jeep = { car: jeep };
  }

  tickJeep() {
    const g = this.g, c = this.cfg, car = this.jeep.car;
    if (!g.cars.includes(car) || car.dead || car.ai?.mode !== 'route') { this.jeep = null; return; }
    const f = g.focus(), d = dist(car.x, car.z, f.x, f.z);
    car.ai.cruise = d < 14 ? c.driveBy.speed * 0.5 : c.driveBy.speed;
    if (d < 10) {
      g.say({ get x() { return car.x; }, get y() { return car.y; }, get z() { return car.z; }, height: 2.6 }, c.driveBy.line, 2.6);
      this.jeep = null;
    }
  }

  tickWet(dt) {
    const g = this.g, sh = this.sh, c = this.cfg, w = this.wet;
    if (!this.open || sh.pursuit || w.car.dead || !g.cars.includes(w.car)) { this.wet = null; return; }
    w.t -= dt;
    if (g.playerCar === w.car) w.ride.tick(g, dt); else w.ride.prev = null;
    if (w.ride.failed) {
      this.wet = null;
      hud.toast(c.wetFail);
      sh.add(100, { force: true });
      return;
    }
    if (w.t <= 0) { this.wet = null; hud.toast(c.dry); }
  }

  // The objective card while the paint is wet (main.updateHud, when no mission is running).
  objective() {
    const w = this.wet, c = this.cfg;
    if (!w || !this.open) return null;
    return { title: c.wet.title, text: fmt(c.wet.text, { n: Math.max(1, Math.ceil(w.t)) }), ...w.ride.obj() };
  }

  // The minimap marker during a pursuit, while this car could be painted here (main.mapMarkers).
  markers() {
    const g = this.g, z = this.zone, car = g.playerCar;
    if (!z || this.busy || !this.sh.pursuit || !this.open || !car) return [];
    const why = this.blocker(car);
    return !why || why === this.cfg.seen ? [{ type: 'friend', x: z.x, z: z.z, edge: true }] : [];
  }
}
