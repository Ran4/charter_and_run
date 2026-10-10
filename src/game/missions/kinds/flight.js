// Stage kinds, part 2 (DESIGN §9.2): collect sit interact carry mantra timeline. Frozen after
// Phase 0 (owner none). Despite the file name, collect / carry / mantra also run on the island
// (julafton round-up, Bärra hem Berra, the duet). Cabin seconds: timeline and mantra advance by
// dt * g.timeScale, like the cabin phases they share a clock with; plain timers are unscaled.

import { common, at, lineSecs } from './core.js';
import { Collectible } from '../../../actors/pickups.js';
import { CABIN_X } from '../../../world/cabin.js';
import { audio } from '../../../audio.js';
import { hud } from '../../hud.js';
import { fx } from '../../fx.js';
import { S, fmt } from '../../../strings.js';
import { dist, yawTo } from '../../../util.js';

const sitDown = (seat) => fmt('sitDown', { seat });

// Lines played as world bubbles one after another ('stig' = the player). Resolves when done;
// stops early (without the rest) once the mission it belongs to is over, or as soon as a dialogue
// or cutaway starts: then the live bubble comes down that frame and it resolves false.
async function bubbles(g, m, lines) {
  const scene = () => g.inDialog || g.inCutaway;
  for (const [who, text, cue] of lines || []) {
    if (g.missions.m !== m) return true;
    if (scene()) return false;
    if (cue) g.cue(cue);
    const secs = lineSecs(g, text), n = g.npc(who);
    g.say(n, text, secs);
    await new Promise((resolve) => {
      let t = 0;
      const tick = (dt) => {
        t += dt;
        // The speaker's bubble comes down at the HUD this frame (an empty `say` used to replace it,
        // which Game.say's minimum reading time then held up as an empty pill for 1 s).
        if (scene()) g.unsay(n);
        if (scene() || t >= secs * 0.8) { g.offFrame(tick); resolve(); }
      };
      g.onFrame(tick);
    });
  }
  return !scene();
}

// The camera for a dialogue the player triggers: framed on the first speaker who is a visible NPC,
// else on the player alone.
function frameFor(g, lines) {
  const who = (lines || []).map((l) => l[0]).find((k) => k !== 'stig' && g.npcs[k] && g.npcs[k].state !== 'hidden');
  if (who) g.cinematic(g.npc(who), g.player);
  else g.cinematicOne(g.player);
}

// ---------------------------------------------------------------------------------------------
// collect: items? [{x, z, y?} | landmark] + kind + motion = 'spin' ('spin' | 'bob' | 'roll'), or
// who? [keys] with standAt? (flight: {key: [x, z]} world; unseated and stood there) / findAt?
// (island: {key: [lm, dx, dz]}) and seatOnTouch? (flight: back to its HOMES seat) / sendTo?
// (island: {key: [lm, dx, dz]}) · lines? {key: [[who, text]]} (bubbles on touch) · radius = 1.0 ·
// carRadius? (= 4) · inCar = false (touching from a car counts) · timer? · barLabel · failText
// Roll motion (flight): items slide along the aisle (|x - 3000| <= 0.45) at 0.6–1.4 m/s, reflect at
// lz +12.5 / -16, roll out from under the serving trolley towards the player's side (a bottle
// beyond a trolley stopped at a row could not be reached for 20 s or more, which made the timer a
// lottery; Phase 2) and get kicked ±1.5 m/s by every turbulence jolt (cabin.onJolt).

export const collect = (o) => common(o, {
  text: o.text,
  init(g, m) {
    this.list = [];
    this.got = 0;
    this.t = o.timer ?? null;
    this.m = m;
    if (o.who) {
      for (const key of o.who) {
        const n = g.npc(key);
        if (!n) { console.warn('collect: unknown character', key); continue; }
        if (o.standAt?.[key]) {
          const [x, z] = o.standAt[key];
          g.unseatAny(n);
          n.standAt(x, z, n.yaw);
          n.root.visible = true;
          n.busy = true;
        } else if (o.findAt?.[key]) g.placeNpc(key, ...o.findAt[key]);
        this.list.push({ key, npc: n, alive: true, get x() { return n.x; }, get z() { return n.z; }, get y() { return n.y; } });
      }
    } else {
      const motion = o.motion || 'spin';
      (o.items || []).forEach((it, k) => {
        const p = typeof it === 'string' ? at(it) : it;
        const gy = g.groundAt(p.x, p.z);
        const y = it.y ?? (motion === 'roll' ? gy + 0.15 : gy + 1.0);
        const c = new Collectible(g.scene, o.kind || 'pryl', `collect${k}`, p.x, y, p.z, { motion });
        if (motion === 'roll') {
          c.x = CABIN_X + Math.max(-0.45, Math.min(0.45, p.x - CABIN_X));
          c.vz = (0.6 + Math.random() * 0.8) * (Math.random() < 0.5 ? -1 : 1);
          c.mesh.rotation.y = Math.PI / 2;
        }
        this.list.push(c);
        m.items.push(() => { c.remove(); g.scene.remove(c.mesh); });
      });
      if (motion === 'roll' && g.cabin) {
        this.offJolt = g.cabin.onJolt(() => { for (const c of this.list) if (c.alive) c.vz += (Math.random() < 0.5 ? -1.5 : 1.5); });
        m.items.push(() => this.offJolt?.());
      }
    }
    this.total = this.list.length;
  },
  pos(e) { return e.key ? { x: e.x, z: e.z, y: e.y } : { x: e.px, z: e.pz, y: e.mesh.position.y }; },
  target(g) {
    const f = g.focus();
    let best = null, bd = Infinity;
    for (const e of this.list) if (e.alive) { const p = this.pos(e); const d = dist(f.x, f.z, p.x, p.z); if (d < bd) { bd = d; best = p; } }
    return best ? { x: best.x, z: best.z, r: 0 } : null;
  },
  markers() { return this.list.filter((e) => e.alive).map((e) => { const p = this.pos(e); return { type: 'item', x: p.x, z: p.z, edge: true }; }); },
  obj() { return { timer: this.t, bar: this.got / Math.max(1, this.total), barLabel: `${o.barLabel || ''} ${this.got}/${this.total}`.trim(), barColor: '#ffffff' }; },
  update(g, m, dt) {
    if (this.t != null) {
      this.t -= dt;
      if (this.t <= 0) return { fail: o.failText || S.outOfTime };
    }
    const roll = !o.who && o.motion === 'roll';
    for (const c of this.list) {
      if (!c.alive || c.key) continue;
      if (roll) {
        c.vz = Math.max(-2.9, Math.min(2.9, c.vz));
        c.z += c.vz * dt;
        if (c.z > 12.5) { c.z = 12.5; c.vz = -Math.abs(c.vz); }
        if (c.z < -16) { c.z = -16; c.vz = Math.abs(c.vz); }
        const tr = g.cabin?.trolley;
        if (tr && Math.abs(tr.x - CABIN_X) < 0.6) {
          // Never out of reach behind the trolley: a bottle at it or beyond it (seen from the
          // player) rolls out from under it towards the player's side.
          const half = (tr.spec.len || 0.85) / 2 + 0.12, side = Math.sign(g.player.z - tr.z) || -1;
          if ((c.z - tr.z) * side < half) c.vz = side * Math.max(Math.abs(c.vz), 0.9);
        }
        c.mesh.position.set(c.x, c.y, c.z);
        c.mesh.rotation.x += (c.vz * dt) / 0.12;
      } else c.tick(g.time, dt);
    }
    const f = g.focus();
    const inCar = !!g.playerCar;
    this.sub = inCar && !o.inCar ? S.exitCar : null;
    const r = inCar ? (o.inCar ? o.carRadius ?? 4 : -1) : o.radius ?? 1.0;
    for (const e of this.list) {
      if (!e.alive) continue;
      const p = this.pos(e);
      if (dist(f.x, f.z, p.x, p.z) >= r || Math.abs(f.y + 0.8 - p.y) > 2.5) continue;
      this.got++;
      if (e.key) this.touched(g, m, e);
      else {
        e.remove();
        audio.pickup();
        fx.sparkle(p.x, p.y + 0.3, p.z, 0xffd23f, 16);
      }
      if (o.barLabel) hud.toast(fmt('caught', { label: o.barLabel, n: this.got, m: this.total }));
    }
    if (this.got >= this.total) return 'done';
  },
  cleanup() { this.offJolt?.(); this.offJolt = null; },
  // A rounded-up character: bubbles, then back to the plane seat or off to where they belong. A
  // scene that starts meanwhile (julafton's party right after the last guest) cuts the bubbles and
  // has placed the guest itself: a late sendTo would pull him out of the group shot.
  touched(g, m, e) {
    e.alive = false;
    audio.pickup();
    (async () => {
      if (!(await bubbles(g, m, o.lines?.[e.key]))) return;
      if (g.missions.m !== m) return;
      const n = e.npc;
      if (o.seatOnTouch) {
        const home = g.levelDef.homes(g)[e.key];
        if (home?.seat) { g.unseatAny(n); n.state = 'normal'; g.cabin.seatCharacter(n, home.seat); }
      } else if (o.sendTo?.[e.key]) g.placeNpc(e.key, ...o.sendTo[e.key]);
    })();
  },
});

// ---------------------------------------------------------------------------------------------
// sit: seat · timer? · failText?   done: g.player.seatId === seat

export const sit = (o) => common(o, {
  text: o.text,
  init(g) { this.seat = g.cabin.seats[o.seat]; this.t = o.timer ?? null; },
  target(g) { return g.player.seatId === o.seat || !this.seat ? null : { x: this.seat.x, z: this.seat.z, r: 0.8 }; },
  obj() { return { timer: this.t }; },
  update(g, m, dt) {
    if (g.player.seatId === o.seat) return 'done';
    if (this.t != null) {
      this.t -= dt;
      if (this.t <= 0) return { fail: o.failText || S.outOfTime };
    }
    this.sub = g.player.seatId ? sitDown(o.seat) : null;
  },
});

// ---------------------------------------------------------------------------------------------
// interact: at (landmark, {x, z, y?} or (g) => {x, z}) · radius = 1.4 · prompt · whileSeated =
// false · seat? (only from this seat) · enabled?(g) · lines? · use?: async (g, m) · useCue?
// Registers one interactable at init (removed in cleanup); a function `at` is re-read every frame.
// On use: useCue, then use(), then the lines; the stage is done when they have finished. `seat`
// is also the stage's seat (as timeline's), so "E Sätt dig" offers it first (cabin.bestSeat;
// juice's 14B gag offered 14C from the aisle).

export const interact = (o) => common(o, {
  text: o.text,
  seat: o.seat,
  init(g, m) {
    this.g = g;
    this.used = false;
    this.finished = false;
    const fn = typeof o.at === 'function' ? o.at : null;
    const fixed = fn ? null : at(o.at);
    const self = this;
    this.it = {
      id: `stage:${typeof o.at === 'string' ? o.at : 'interact'}`,
      r: o.radius ?? 1.4, prompt: o.prompt, priority: 5, whileSeated: !!o.whileSeated,
      pos(gg) { const p = fn ? fn(gg) : fixed; return p ? { x: p.x, z: p.z, y: p.y ?? (o.whileSeated ? 0.55 : 0.15) } : null; },
      enabled(gg) { return !self.used && (!o.seat || gg.player.seatId === o.seat) && (!o.enabled || !!o.enabled(gg)); },
      use(gg) { self.fire(gg, m); },
    };
    this.remove = g.addInteractable(this.it);
    m.items.push(this.remove);
  },
  get at() { return this.g ? this.it.pos(this.g) : null; },
  get ready() { return !!this.g && this.it.enabled(this.g); },
  fire(g, m) {
    if (this.used) return;
    this.used = true;
    this.remove();
    (async () => {
      if (o.useCue) g.cue(o.useCue);
      if (o.use) await o.use(g, m);
      if (o.lines?.length && g.missions.m === m) {
        frameFor(g, o.lines);
        await g.dialog(o.lines);
        g.endCut();
        g.endCinematic();
      }
      if (g.missions.m === m) this.finished = true;
    })();
  },
  target(g) {
    if (this.used) return null;
    if (o.seat && o.whileSeated && g.player.seatId !== o.seat) { const s = g.cabin.seats[o.seat]; return { x: s.x, z: s.z, r: 0.8 }; }
    const p = this.it.pos(g);
    return p ? { x: p.x, z: p.z, r: o.radius ?? 1.4 } : null;
  },
  update(g) {
    if (this.finished) return 'done';
    this.sub = !this.used && o.seat && g.player.seatId !== o.seat ? sitDown(o.seat) : null;
  },
  cleanup() { this.remove?.(); },
});

// ---------------------------------------------------------------------------------------------
// carry: item? ('juice': a mesh above the head) or who? (an NPC over the shoulders; walk only) ·
// to · radius = 1.2 · walkSpeed? · failOn { bumped = true, fall = true, sprintSecs? } · failText
// Sets g.carrying; bumped reads g.bumpedT > 0 (trolley, turbulence fall, PANIK), fall = the player
// flung/down, sprintSecs = continuous sprint time.

export const carry = (o) => common(o, {
  text: o.text,
  init(g, m) {
    this.to = at(o.to);
    this.sprintT = 0;
    this.failOn = { bumped: true, fall: true, ...(o.failOn || {}) };
    const p = g.player;
    if (o.who) {
      // He is lifted onto the shoulders once the player is on foot (until then he keeps his seat).
      this.npc = g.npc(o.who);
      this.lifted = false;
      g.carrying = { who: o.who };
    } else {
      this.mesh = new Collectible(g.scene, o.item || 'juice', 'carry', p.x, p.y + p.height + 0.2, p.z, { motion: 'none' });
      const c = this.mesh;
      m.items.push(() => { c.remove(); g.scene.remove(c.mesh); });
      g.carrying = { item: o.item || 'juice' };
      if (o.walkSpeed) g.speedCap = o.walkSpeed;
      p.anim.cupUp = true;
    }
    g.bumpedT = 0;
  },
  target() { return { x: this.to.x, z: this.to.z, r: o.radius ?? 1.2 }; },
  lift(g) {
    const n = this.npc, p = g.player;
    g.unseatAny(n);
    n.state = 'seated';
    n.root.visible = true;
    n.anim.slump = true;
    n.busy = true;
    p.anim.carryOver = true;
    g.speedCap = o.walkSpeed ?? g.levelDef.speeds.walk;
    g.bumpedT = 0;
    this.lifted = true;
  },
  update(g, m, dt) {
    const p = g.player, F = this.failOn;
    if (this.npc && !this.lifted) {
      if (g.playerCar || p.state !== 'normal') { this.sub = S.exitCar; return; }
      this.lift(g);
    }
    if (F.bumped && g.bumpedT > 0) return { fail: o.failText || S.outOfTime };
    if (F.fall && (p.state === 'flung' || p.state === 'down')) return { fail: o.failText || S.outOfTime };
    if (F.sprintSecs != null) {
      if (p.anim.sprint && p.speed > 1) this.sprintT += dt; else this.sprintT = 0;
      if (this.sprintT > F.sprintSecs) return { fail: o.failText || S.outOfTime };
    }
    if (this.npc) {
      // Across his shoulders on the raised hands: the roll about z goes first (XYZ Euler), so the
      // body lies along Stig's right, and the feet (the root) sit half a body to his left. (Yaw
      // + π/2 laid it along his forward: Berra stuck out of Stig's face, feet in his head.)
      const n = this.npc, h = n.height * 0.5, y = p.y + p.height;
      n.x = p.x + Math.cos(p.yaw) * h; n.y = y; n.z = p.z - Math.sin(p.yaw) * h; n.yaw = p.yaw;
      n.root.position.set(n.x, y, n.z);
      n.root.rotation.set(0, p.yaw, Math.PI / 2);
    } else if (this.mesh) {
      const fx_ = Math.sin(p.yaw), fz = Math.cos(p.yaw);
      this.mesh.mesh.position.set(p.x + fx_ * 0.25, p.y + p.height + 0.15, p.z + fz * 0.25);
    }
    this.sub = g.playerCar ? S.exitCar : null;
    if (!g.playerCar && p.state === 'normal' && dist(p.x, p.z, this.to.x, this.to.z) < (o.radius ?? 1.2)) return 'done';
  },
  cleanup(g) {
    const p = g.player;
    g.carrying = null;
    g.speedCap = null;
    p.anim.carryOver = false;
    p.anim.cupUp = false;
    if (this.mesh) { this.mesh.remove(); g.scene.remove(this.mesh.mesh); }
    if (this.npc && this.lifted) {
      const n = this.npc;
      n.anim.slump = false;
      n.root.rotation.set(0, 0, 0);
      const s = g.freeSpot(p.x, p.z, 0.8, 1.6);
      n.standAt(s.x, s.z, yawTo(p.x - s.x, p.z - s.z));
      n.busy = true;
    }
  },
});

// ---------------------------------------------------------------------------------------------
// mantra: secs (scaled) · at? + radius? (= 2.2) · seated?: seatId · duet?: key (NPC copies the
// pose) · waitPhase? (also wait for cabin.phase) · fillCue? (applied when the bar fills; its
// `phase` only if cabin.phase is still the phase the stage started in)
// The bar fills only while J is held (g.mantraOn, after the wind-up) in place. Sets
// g.mantraMode = true (island J = mantra) for the stage. `seated` is the stage's seat (as
// timeline's `seat`): "E Sätt dig" offers it first.

export const mantra = (o) => common(o, {
  text: o.text,
  seat: o.seated,
  init(g) {
    this.t = 0;
    this.secs = o.secs;
    this.filled = false;
    this.startPhase = g.cabin ? g.cabin.phase : null;
    this.spot = o.at ? at(o.at) : null;
    this.duet = o.duet ? g.npc(o.duet) : null;
    g.mantraMode = true;
  },
  inPlace(g) {
    const p = g.player;
    if (o.seated) return p.seatId === o.seated;
    if (this.spot) return !g.playerCar && dist(p.x, p.z, this.spot.x, this.spot.z) < (o.radius ?? 2.2);
    return !g.playerCar;
  },
  target(g) {
    if (this.filled || this.inPlace(g)) return null;
    if (o.seated) { const s = g.cabin.seats[o.seated]; return { x: s.x, z: s.z, r: 0.8 }; }
    return this.spot ? { x: this.spot.x, z: this.spot.z, r: o.radius ?? 2.2 } : null;
  },
  obj() { return { bar: Math.min(1, this.t / this.secs), barLabel: o.barLabel || '', barColor: '#7fb8ef' }; },
  update(g, m, dt) {
    g.mantraMode = true;
    if (this.duet && this.duet.state === 'normal') {
      const p = g.player;
      this.duet.anim.wings = !!p.anim.wings;
      if (dist(this.duet.x, this.duet.z, p.x, p.z) < 6) this.duet.yaw = yawTo(p.x - this.duet.x, p.z - this.duet.z);
    }
    if (!this.filled) {
      const ok = this.inPlace(g);
      this.sub = ok ? null : o.seated ? sitDown(o.seated) : null;
      if (ok && g.mantraOn) this.t += dt * g.timeScale;
      if (this.t >= this.secs) {
        this.filled = true;
        audio.pickup();
        if (o.fillCue) {
          const c = { ...o.fillCue };
          if (c.phase !== undefined && (!g.cabin || g.cabin.phase !== this.startPhase)) delete c.phase;
          g.cue(c);
        }
      }
    }
    if (this.filled && (!o.waitPhase || g.cabin?.phase === o.waitPhase)) return 'done';
  },
  cleanup(g) {
    g.mantraMode = false;
    if (this.duet) this.duet.anim.wings = false;
  },
});

// ---------------------------------------------------------------------------------------------
// timeline: secs · seat? (time pauses unless seated there; sub "Sätt dig på 14B!") · lockSeat?
// (with seat: "Res dig" hidden and R ignored, so time never pauses) · events [[t, cue]] (scaled
// seconds; the stage's own list, not the runner's timedCues) · barLabel?

export const timeline = (o) => common(o, {
  text: o.text,
  seat: o.seat,
  lockSeat: !!o.lockSeat,
  init() {
    this.t = 0;
    this.ei = 0;
    this.events = (o.events || []).slice().sort((a, b) => a[0] - b[0]);
  },
  target(g) {
    if (!o.seat || g.player.seatId === o.seat) return null;
    const s = g.cabin.seats[o.seat];
    return { x: s.x, z: s.z, r: 0.8 };
  },
  obj() { return { bar: Math.min(1, this.t / o.secs), barLabel: o.barLabel || '', barColor: '#7fb8ef' }; },
  update(g, m, dt) {
    const seated = !o.seat || g.player.seatId === o.seat;
    this.sub = seated ? null : sitDown(o.seat);
    if (!seated) return;
    this.t += dt * g.timeScale;
    while (this.ei < this.events.length && this.events[this.ei][0] <= this.t) g.cue(this.events[this.ei++][1]);
    if (this.t >= o.secs) return 'done';
  },
});
