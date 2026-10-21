// Ljudlandskap per kvarter (free roam; feature 131, DESIGN §10.60). Under the island's tune each part
// of the island gets a sound of its own that fades in as Stig comes near and out as he leaves: the surf
// along the south shore, gulls, creaking boats, lapping water and a halyard in the marina, sheep bells,
// a bleat, the wind and the village bell in Fataga, the bells of Templo Ecuménico, Affe's accordion and
// Gabbe's congas on the SunTrip stage (in time and in key with the island's tune: the music scheduler
// plays them with its own bars, audio.js `ambBar`) and the murmur and glasses at La Medina, with Tonga
// Tonga's bass through its wall after ten at night. Each layer is heard from its side of the camera.
// Sound only: no mission, stage, timer, actor, collider or random draw of the world or of Math.random is
// touched, and nothing is saved. Live on the island with `missions.state === 'idle'`; a mission, a
// dialogue box, a cut (the letterbox), the clock's nap or morning cut and the other level fade every
// layer out, a car (not the pedal boat) and a pursuit lower them. Config: LJUD (content/island.js).
// Owned by Game as `ljud`: main.updateAudio calls `update` once a frame and ducks the island tune by
// `musicDuck` while the band plays; tests read the levels and the counts and may set `enabled` false.

import { LJUD } from '../content/index.js';
import { audio } from '../audio.js';
import { THREE, camera } from '../gfx.js';
import { lm } from '../world/layout.js';
import { hud } from './hud.js';
import { clamp, dist, mulberry32 } from '../util.js';

const smooth = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
// h in [a, b) of the clock, across midnight when a > b.
export const hourIn = (h, [a, b]) => (a <= b ? h >= a && h < b : h >= a || h < b);
const _dir = new THREE.Vector3();

export class Soundscape {
  constructor(game, cfg = LJUD) {
    this.g = game;
    this.cfg = cfg;
    this.enabled = true;     // tests switch it off (meter.mjs's check that every tune sounds)
    this.rnd = mulberry32(cfg.seed);
    this.levels = {};        // each zone's level where he is, 0..1
    this.out = {};           // what its layer was sent: the level × the mix (0 for the stage without its band)
    this.pans = {};          // −1..1: left..right of the camera
    this.right = { x: 1, z: 0 };   // the camera's right on the ground (tests)
    this.mix = 0;            // live, not quiet, × car × pursuit
    this.band = false;       // Affe and Gabbe are playing
    this.club = false;       // Tonga Tonga's bass
    this.musicDuck = 1;      // the island tune's level while the band plays
    this.next = {};          // s till each one-shot kind (while its layer is heard)
    this.counts = {};        // one-shots played by kind (tests)
    this.log = [];           // the last one-shots { kind, t } (not the murmur's chatter and stir)
    for (const k in cfg.zones) { this.levels[k] = 0; this.out[k] = 0; this.pans[k] = 0; }
    this.shots = Object.entries(cfg.shots);
    for (const [k, s] of this.shots) { this.next[k] = s.every[0] * this.rnd(); this.counts[k] = 0; }
  }

  get live() { const g = this.g; return this.enabled && g.level === 'island' && g.missions.state === 'idle' && !g.day.busy; }
  // A dialogue box or a cut.
  get quiet() { return hud.dialogActive || hud.letterboxed; }
  rr([a, b]) { return a + (b - a) * this.rnd(); }

  // A zone's level and side at (x, z) with the camera's right (rx, rz).
  zone(z, x, zz, rx = 1, rz = 0) {
    let d, dx = 0, dz = 1;
    if (z.line != null) d = Math.max(0, z.line - zz);
    else {
      const L = lm(z.lm);
      dx = L.x - x; dz = L.z - zz; d = Math.hypot(dx, dz);
      if (d > 1e-3) { dx /= d; dz /= d; }
    }
    return { d, level: 1 - smooth((d - z.near) / (z.far - z.near)), side: this.cfg.pan * clamp((d - z.near) / z.near, 0, 1) * (dx * rx + dz * rz) };
  }

  update(dt) {
    if (!audio.ready) return;
    const g = this.g, c = this.cfg, f = g.focus(), h = g.day.h;
    camera.getWorldDirection(_dir);
    const fl = Math.hypot(_dir.x, _dir.z) || 1, rx = -_dir.z / fl, rz = _dir.x / fl;
    this.right = { x: rx, z: rz };
    for (const k in c.zones) {
      const r = this.zone(c.zones[k], f.x, f.z, rx, rz);
      this.levels[k] = r.level;
      this.pans[k] = r.side;
    }
    const car = g.playerCar, veh = car ? (car.spec.boat ? 1 : c.car) : g.guagua.riding || g.utflykt.riding ? c.car : 1;
    this.mix = this.live && !this.quiet ? veh * (g.shame.pursuit ? c.pursuit : 1) : 0;
    // The band: the stage heard, its hours, Affe and Gabbe there (not at the pool fest's ring, hidden by
    // a mission or anywhere else).
    const S = lm('scen'), there = (n) => n && n.state !== 'hidden' && n.root.visible && dist(n.x, n.z, S.x, S.z) < c.band.r;
    this.band = this.mix > 0 && this.levels.scen > 0.005 && hourIn(h, c.band.hours) && there(g.npcs.affe) && there(g.npcs.gabbe);
    this.club = this.mix > 0 && this.levels.bar > 0.005 && hourIn(h, c.club);
    audio.ambBand(this.band);
    audio.ambClub(this.club);
    for (const k in c.zones) {
      this.out[k] = k === 'scen' && !this.band ? 0 : this.levels[k] * this.mix;
      audio.ambLayer(k, this.out[k], this.pans[k]);
    }
    this.musicDuck = this.band ? Math.round((1 - c.duck * this.out.scen) * 20) / 20 : 1;
    // The one-shots: only while their layer is heard, each after its own pause.
    for (const [kind, s] of this.shots) {
      if (this.out[s.layer] < c.min || (s.hours && !hourIn(h, s.hours))) continue;
      if ((this.next[kind] -= dt) > 0) continue;
      this.next[kind] = this.rr(s.every);
      if (s.len) audio.amb[kind](this.rr(s.len)); else audio.amb[kind]();
      this.counts[kind]++;
      if (kind !== 'chatter' && kind !== 'stir') {
        this.log.push({ kind, t: +g.time.toFixed(2) });
        if (this.log.length > 40) this.log.shift();
      }
    }
  }
}
