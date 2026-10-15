// Åk bagageband – the baggage belt carries Stig (free roam; feature 25, DESIGN §10.16). The belt of
// CINTA 2 in Gando's arrivals hall has always turned under the suitcases; now it carries Stig-Helmer
// too: he goes round in the ring's own time (a turn in about 20 s), and standing still a while he sits
// down on the nearest bag and rides on like any other luggage. The session's first ride he sighs "Min
// väska har inte kommit." (after julafton, with the bag back, "Det är faktiskt rätt rogivande."); a
// toast for every turn, Lasse on the radio after the first (before julafton), and after the third he
// is luggage himself: "Den här väskan ska till Las Palmas." Space hops him off the bag, E steps him
// off the belt. Only on the island with no mission running (`missions.state === 'idle'`): no mission,
// timer or calibration pool sees it. Config: BAGGAGE_BELT (content/island.js); the belt itself is
// coast.js's `BELT`. Owned by Game as `belt`; main.js calls `carry` after the player's physics step,
// hands it Space and E while he sits (`standUp`), lets go of the bag before R (`release`), shows its
// prompt and calls `update` once a frame.

import { BAGGAGE_BELT } from '../content/index.js';
import { BELT } from '../world/blocks/coast.js';
import { groundAt, groundInfo } from '../world/collision.js';
import { audio } from '../audio.js';
import { hud } from './hud.js';
import { angleDiff } from '../util.js';

const TAU = Math.PI * 2;
const ease = (k) => k * k * (3 - 2 * k);

export class BaggageBelt {
  constructor(game, cfg = BAGGAGE_BELT) {
    this.g = game;
    this.cfg = cfg;
    this.onBelt = false;    // standing on the belt at the last fixed step (and carried by it)
    this.riding = false;    // a ride: on the belt, sitting on a bag, or off it for under `offSecs`
    this.offT = 0;
    this.angle = 0;         // radians the belt has carried him this ride
    this.laps = 0;          // full turns this ride
    this.stillT = 0;        // seconds standing still on the belt
    this.seat = null;       // while he sits on a bag: { bag, t, a0, r0, y0, dyaw0, pose }
    this.boarded = false;   // the session's first ride had its line
    this.lasseDone = false; // Lasse's answer, once a session
    this.lines = [];        // [{ at, until, who: 'stig' | 'radio', text, ride }] still to say (g.time)
    this.last = null;       // tests: { t, what: 'board' | 'lap' | 'sit' | 'hop' | 'off' | 'lasse' | 'luggage', n?, text? }
    this.events = [];       // tests: the last 40 of them
    this.rides = 0;         // tests: rides this session
  }

  get seated() { return !!this.seat; }
  get spec() { return BELT; }
  // Julafton has brought his bag back (§8.13).
  get bagBack() { return this.g.missions.index >= this.cfg.bagBackIndex; }
  active() {
    const g = this.g;
    return g.level === 'island' && g.missions.state === 'idle' && !!BELT.block;
  }
  ringAngle() { return this.g.time * BELT.spin; }
  // His angle round the belt's middle (world: at (sin, cos)) and his distance from it.
  polar(x, z) { return [Math.atan2(x - BELT.x, z - BELT.z), Math.hypot(x - BELT.x, z - BELT.z)]; }

  // fixedStep, after the player's step: standing on the belt, it turns him (and his facing) round its
  // middle by its spin, as the ring turns (coast.js).
  carry(h) {
    const g = this.g, p = g.player;
    this.onBelt = false;
    if (!this.active() || g.playerCar || p.state !== 'normal' || !p.onGround) return;
    if (Math.abs(p.x - BELT.x) > BELT.r1 || Math.abs(p.z - BELT.z) > BELT.r1) return;
    const y = groundAt(p.x, p.z, p.y, 0.02);
    if (groundInfo.block !== BELT.block || Math.abs(y - p.y) > 0.02) return;
    const a = BELT.spin * h, c = Math.cos(a), s = Math.sin(a), dx = p.x - BELT.x, dz = p.z - BELT.z;
    p.x = BELT.x + dx * c + dz * s;
    p.z = BELT.z - dx * s + dz * c;
    p.yaw += a;
    this.onBelt = true;
    this.turn(a);
  }

  // The angle the belt carried him; every full turn a lap.
  turn(a) {
    if (!this.riding) this.start();
    this.angle += a;
    const n = Math.floor(this.angle / TAU + 1e-9);
    if (n > this.laps) { this.laps = n; this.lap(n); }
  }

  start() {
    const c = this.cfg;
    this.riding = true;
    this.angle = 0; this.laps = 0; this.offT = 0;
    this.rides++;
    if (!this.boarded) this.queue(c.boardAt, 'stig', c.board[this.bagBack ? 1 : 0], true, 'board');
  }

  lap(n) {
    const g = this.g, c = this.cfg;
    const text = c.laps[n - 1] || c.lapN.replace('{n}', n);
    hud.toast(text);
    this.note({ t: g.time, what: 'lap', n, text });
    if (n === 1 && !this.lasseDone && !this.bagBack) { this.lasseDone = true; this.queue(c.lasseAt, 'radio', c.lasse[1], false, 'lasse'); }
    if (n === c.luggageLap) this.queue(c.luggageAt, 'stig', c.luggage, true, 'luggage');
  }

  note(e) {
    this.last = e;
    this.events.push(e);
    if (this.events.length > 40) this.events.shift();
  }

  queue(at, who, text, ride, what) {
    const t = this.g.time + at;
    this.lines.push({ at: t, until: t + 4, who, text, ride, what });
  }

  // The ride is over: the bag let go of (where he sits, on the belt), the lines of the ride dropped.
  end() {
    if (this.seat) this.release(true);
    if (!this.riding) return;
    this.riding = false;
    this.angle = 0; this.laps = 0; this.offT = 0; this.stillT = 0;
    this.lines = this.lines.filter((l) => !l.ride);
  }

  canSit() {
    const g = this.g, p = g.player;
    return !g.inDialog && !g.carrying && p.state === 'normal' && p.onGround && Math.hypot(p.wishX, p.wishZ) < 0.1
      && p.speed < 0.3 && !p.anim.wings && !(g.kickT > 0) && !g.holding && !(g.frozenT > 0) && !(g.shame.panicT > 0);
  }

  // Down on the nearest bag (by its angle round the middle), facing out; he slides there in
  // `sitSecs` s.
  sit() {
    const g = this.g, p = g.player, ring = this.ringAngle();
    const [pa, pr] = this.polar(p.x, p.z);
    let bag = null, bd = Infinity;
    for (const b of BELT.bags) { const d = Math.abs(angleDiff(pa, b.a + ring)); if (d < bd) { bd = d; bag = b; } }
    if (!bag) return;
    p.seatAt({ x: p.x, y: p.y, z: p.z, yaw: p.yaw });
    p.anim.sprint = false;
    // From where he stands: his hips stay where they were and come down onto the lid.
    this.seat = { bag, t: 0, a0: pa - ring, r0: pr, y0: p.y + p.model.legLen - 0.1, dyaw0: angleDiff(pa, p.yaw), pose: p.seatPose };
    this.stillT = 0;
    this.note({ t: g.time, what: 'sit', n: bag.k });
    this.placeSeat(0);
  }

  // His seat this frame: the bag's place in the turning ring (eased in from where he sat down).
  placeSeat(dt) {
    const g = this.g, p = g.player, s = this.seat, b = s.bag, c = this.cfg;
    s.t = Math.min(c.sitSecs, s.t + dt);
    const k = ease(s.t / c.sitSecs), ring = this.ringAngle();
    const a = s.a0 + angleDiff(s.a0, b.a) * k + ring, r = s.r0 + (b.out - c.seatIn - s.r0) * k;
    const pose = s.pose;
    pose.x = BELT.x + Math.sin(a) * r;
    pose.z = BELT.z + Math.cos(a) * r;
    pose.y = s.y0 + (b.top - s.y0) * k;
    pose.yaw = a + s.dyaw0 * (1 - k);
    p.x = pose.x; p.y = pose.y; p.z = pose.z; p.yaw = pose.yaw;
    p.placeSeated(pose);
  }

  // Off the bag: Space ('hop') stands him up where he sat and hops; E ('off') steps him off the belt
  // onto the hall floor, facing out.
  standUp(how) {
    const g = this.g, p = g.player, c = this.cfg;
    if (!this.seat) return;
    const [a] = this.polar(p.x, p.z);
    this.release(false);
    if (how === 'off') {
      p.standAt(BELT.x + Math.sin(a) * c.offR, BELT.z + Math.cos(a) * c.offR, a);
      this.end();
    } else {
      p.standAt(p.x, p.z, a);
      p.y = BELT.top;
      if (p.jump(c.hopV)) { g.jumps = 1; audio.jump(); }
    }
    this.note({ t: g.time, what: how });
  }

  // Let go of the bag: up on his feet where he sits (`stand`, on the island), or only out of the
  // seat (R and the other level place him themselves).
  release(stand) {
    const g = this.g, p = g.player;
    if (!this.seat) return;
    const own = p.state === 'seated' && p.seatPose === this.seat.pose;
    this.seat = null;
    this.stillT = 0;
    if (!own) return;
    if (stand && g.level === 'island') { p.standAt(p.x, p.z, p.yaw); p.y = BELT.top; }
    else { p.state = 'normal'; p.anim.planeSeat = false; p.seatPose = null; }
  }

  update(dt) {
    const g = this.g, p = g.player, c = this.cfg;
    if (!this.active()) { this.end(); this.lines.length = 0; return; }
    // Someone else seated or moved him: the bag is not his any more.
    if (this.seat && (p.state !== 'seated' || p.seatPose !== this.seat.pose)) this.seat = null;
    if (this.seat) { this.turn(BELT.spin * dt); this.placeSeat(dt); }
    if (this.riding && !this.onBelt && !this.seat) {
      // In the air over the belt (a hop) the ride goes on.
      const [, r] = this.polar(p.x, p.z);
      const over = !p.onGround && p.state === 'normal' && r < BELT.r1 + 0.3 && p.y > BELT.top - 0.1;
      if (over) this.offT = 0;
      else if ((this.offT += dt) >= c.offSecs) this.end();
    } else this.offT = 0;
    // Standing still on the belt: down on a bag.
    if (this.onBelt && !this.seat && this.canSit()) { if ((this.stillT += dt) >= c.sitAfter) this.sit(); }
    else this.stillT = 0;
    this.say();
  }

  say() {
    const g = this.g, p = g.player;
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i];
      if (l.at > g.time) continue;
      // Not over a dialogue or a line of his own: it waits (at most until `until`).
      const busy = g.inDialog || (l.who === 'stig' && g.saying(p));
      if (busy && g.time < l.until) continue;
      this.lines.splice(i--, 1);
      if (busy) continue;
      if (l.who === 'stig') g.say(p, l.text, 2.4);
      else g.radio(this.cfg.lasse[0], l.text);
      if (l.what === 'board') this.boarded = true;
      this.note({ t: g.time, what: l.what, text: l.text });
    }
  }
}
