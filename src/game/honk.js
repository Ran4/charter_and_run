// Tutan som folk reagerar på – the horn the island hears (free roam; feature 5, DESIGN §10.9).
// H pressed in a car is an event, not only a sound: pedestrians ahead of the car hop aside with
// their dodge shout, the nearest cast NPCs answer in their own way (Ole's car statistics from
// Arlanda, Lasse's "Hä-pååre!", Angerud's platschef, Berra's "Ra-tara-tara!"), and Stig, the most
// polite man on the island, says sorry. The grisbil grunts instead of honking, and Berra and
// Robban answer it with lines from their lift. Only on the island with no mission running
// (`missions.state === 'idle'`) and no dialogue: in a mission the horn stays a sound, so no dodge,
// mission, timer or calibration pool changes, and the horn adds no SKANDAL. The grisbil's grunt is
// its horn's sound everywhere. Config: HONK (content/island.js). Owned by Game as `honk`; main.js
// hands it the H press in a car (`press`), asks it who waves (`waving`) and calls `update` once a
// frame. The last free-roam press is `game.hornAt` ({ x, z, yaw, t, pigs }), for other features to
// read.

import { HONK, LOCAL_CAST } from '../content/index.js';
import { segmentBlocked } from '../world/collision.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { dist, pick, yawTo, dampAngle } from '../util.js';

export class Honk {
  constructor(game, cfg = HONK) {
    this.g = game;
    this.cfg = cfg;
    this.queue = [];       // [{ at, who, text }] still to say (g.time); who: an NPC key or 'stig'
    this.answered = {};    // NPC key -> g.time of his last answer (castEvery)
    this.said = {};        // table id -> the line it last gave (a session's first answer is its first line)
    this.react = {};       // NPC key -> { until, flag }: turned to Stig, `flag` (a pose) held
    this.sorry = false;    // Stig has said sorry this session
    this.oinkT = 0;
    this.bubbleT = -Infinity;
    this.bed = null;       // the grisbil's bubble anchor
    this.last = null;      // the last free-roam press, for tests: { t, pigs, peds, replies: [[key, text]], stig: [text] }
  }

  // On the island between missions, outside any dialogue.
  active() {
    const g = this.g;
    return g.level === 'island' && g.missions.state === 'idle' && !g.inDialog;
  }
  // An NPC who can answer: standing, shown, and not held by a mission's idle pose, the Berra job,
  // the diving judges, Herr Storch's filming or the pool fest (the same rule as the chatter bubbles).
  free(key) {
    const g = this.g, n = g.npc(key);
    return !!n && n.state === 'normal' && n.root.visible && !g.missions.idlePose(key) && !g.berraJob.posed(key) && !g.judges.posed(key) && !g.film.posed(key)
      && !g.fest.posed(key)
      && !g.eslov.owns(key);   // the rollerskier answers himself (§10.12)
  }
  // main.js syncAll: an answerer whose pose is the wave waves.
  waving(key) { return this.react[key]?.flag === 'wave'; }

  // handleOneShots: H pressed in the player's car. Returns true when the island heard it.
  press() {
    const g = this.g, c = this.cfg, car = g.playerCar;
    if (!car || car.dead || !this.active()) return false;
    const pigs = !!car.spec.pigs;
    g.hornAt = { x: car.x, z: car.z, yaw: car.yaw, t: g.time, pigs };
    const last = this.last = { t: g.time, pigs, peds: 0, replies: [], stig: [] };
    // The bubble over the bed only while a pig is in it (an emptied bed, §10.15, still grunts).
    if (pigs && car.pigs.some((q) => q.in) && g.time - this.bubbleT >= c.bubbleEvery) {
      this.bubbleT = g.time;
      g.say(this.bedAnchor(car), c.oinkBubble, 1.3);
    }
    // Pedestrians ahead hop aside, away from the car's line (the speeding car's dodge, §6.7).
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    const ahead = [];
    if (g.levelDef.sim.peds) for (const ped of g.peds) {
      const ch = ped.char;
      if (ch.state !== 'normal' || Math.abs(ch.y - car.y) > 2.5 || g.time - (ped.honkedAt ?? -Infinity) < c.pedEvery) continue;
      const dx = ch.x - car.x, dz = ch.z - car.z;
      const along = dx * fx + dz * fz, lat = dx * -fz + dz * fx;
      if (along > 0 && along < c.pedR && Math.abs(lat) < c.pedLat + along * c.pedCone) ahead.push({ ped, along, lat });
    }
    ahead.sort((a, b) => a.along - b.along);
    ahead.forEach(({ ped, along, lat }, i) => {
      const s = lat >= 0 ? 1 : -1;
      ped.honkedAt = g.time;
      ped.startle(-fz * s, fx * s, 0.1 + along * 0.02 + Math.random() * 0.15, i === 0 || Math.random() < c.pedShout);
    });
    last.peds = ahead.length;
    // The nearest cast NPCs who can see the car answer (no bubble from behind a hotel), the ones
    // with their own lines first (the gang before the porter).
    const near = [];
    for (const k in g.npcs) {
      if (!this.free(k) || g.time - (this.answered[k] ?? -Infinity) < c.castEvery) continue;
      const n = g.npcs[k], d = dist(n.x, n.z, car.x, car.z);
      if (d < c.castR && this.sees(n, car)) near.push([d + (c.lines[k] || (pigs && c.pig[k]) ? 0 : c.castR), k]);
    }
    near.sort((a, b) => a[0] - b[0]);
    let tease = null;
    const used = [];
    near.slice(0, c.replies).forEach(([, k], i) => {
      const text = this.line(k, pigs, used), at = g.time + c.replyAt[i];
      used.push(text);
      this.answered[k] = g.time;
      this.queue.push({ at, who: k, text });
      last.replies.push([k, text]);
      if (text === c.tease && tease == null) tease = at;
    });
    // Stig: sorry the first time anyone reacts, and red-faced at Berra's whistle.
    // Within reach of the rollerskier Stig cheers "Heja Eslöv!" (§10.12): he meant to honk, no sorry.
    const heja = g.eslov.horn(car);
    if (heja) last.eslov = true;
    if ((ahead.length || near.length) && !this.sorry && !heja) {
      this.sorry = true;
      this.queue.push({ at: g.time + c.sorryAt, who: 'stig', text: c.sorry });
      last.stig.push(c.sorry);
    }
    if (tease != null) {
      this.queue.push({ at: tease + c.teaseGap, who: 'stig', text: c.teaseReply });
      last.stig.push(c.teaseReply);
    }
    return true;
  }

  // Can n see the car: nothing solid across the line at his eye height to its middle, or to a point
  // `seeW` m to either side of it (a palm trunk or a lamp post at the curb does not hide a car; a
  // hotel does).
  sees(n, car) {
    const w = this.cfg.seeW, y = n.y + this.cfg.eye, dx = car.x - n.x, dz = car.z - n.z, l = Math.hypot(dx, dz) || 1;
    const ox = (-dz / l) * w, oz = (dx / l) * w;
    for (const s of [0, 1, -1]) if (segmentBlocked(n.x, n.z, car.x + ox * s, car.z + oz * s, y) < 0) return true;
    return false;
  }

  // His own lines (the grisbil's first: a session's first answer is the first line, later ones
  // another than his last), else a line of his class's table that nobody has said in this press
  // (`used`) and that is not his last.
  line(key, pigs, used) {
    const c = this.cfg, mine = (pigs && c.pig[key]) || c.lines[key];
    const id = (pigs && c.pig[key] ? 'pig:' : '') + key, prev = this.said[id];
    let text;
    if (mine) text = prev == null ? mine[0] : pick(mine.length > 1 ? mine.filter((l) => l !== prev) : mine);
    else {
      const all = LOCAL_CAST.includes(key) ? c.local : c.sv;
      const fresh = all.filter((l) => l !== prev && !used.includes(l));
      text = pick(fresh.length ? fresh : all);
    }
    this.said[id] = text;
    return text;
  }

  // A bubble anchor over the grisbil's bed, behind the cab (tickBubbles reads x, y, z, height).
  bedAnchor(car) {
    if (this.bed?.car === car) return this.bed;
    const back = -car.spec.len * 0.28;
    this.bed = {
      car, height: 2.1,
      get x() { return car.x + Math.sin(car.yaw) * back; },
      get y() { return car.y; },
      get z() { return car.z + Math.cos(car.yaw) * back; },
    };
    return this.bed;
  }

  update(dt) {
    const g = this.g, c = this.cfg, car = g.playerCar;
    // The grisbil's horn is a grunt, again every `oinkEvery` s while H is held (main.updateAudio
    // keeps its horn tone off).
    if (car?.spec.pigs && !car.dead && input.down('horn')) {
      this.oinkT -= dt;
      if (this.oinkT <= 0) { audio.oink(); this.oinkT = c.oinkEvery; }
    } else this.oinkT = 0;
    if (!this.active()) { this.reset(); return; }
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      if (q.at > g.time) continue;
      this.queue.splice(i--, 1);
      if (q.who === 'stig') { g.say(g.player, q.text, 2.2); continue; }
      if (!this.free(q.who)) continue;
      const n = g.npc(q.who), flag = c.poses[q.who] || null;
      g.say(n, q.text, 2.4);
      n.chatT = 7 + Math.random() * 6;   // the chatter clock restarts: no bubble over the answer
      if (flag && flag !== 'wave') n.anim[flag] = true;
      this.react[q.who] = { until: g.time + c.poseSecs, flag };
    }
    const p = g.player;
    for (const k in this.react) {
      const n = g.npc(k);
      if (g.time >= this.react[k].until || !this.free(k)) { this.unpose(k); continue; }
      n.yaw = dampAngle(n.yaw, yawTo(p.x - n.x, p.z - n.z), 6, dt);
    }
  }

  unpose(key) {
    const r = this.react[key], n = this.g.npc(key);
    if (r?.flag && r.flag !== 'wave' && n) n.anim[r.flag] = false;
    delete this.react[key];
  }
  // A mission state, a dialogue or the other level: the answers not yet said go, the poses come down.
  reset() {
    if (this.queue.length) this.queue.length = 0;
    for (const k in this.react) this.unpose(k);
  }
}
