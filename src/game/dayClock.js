// Dygnet runt – the island's clock, its evenings and a nap in room 107 (free roam; feature 30,
// DESIGN §10.10). Between missions time goes by, an hour a minute by day and twice as fast at night,
// and the sky glides through the island palettes (§13.3; no new ones): day by morning and afternoon,
// the sunset from seven, dusk and night after it, the town's night lights and the lighthouse at
// eight, dawn at six. Once Stig has Ole's watch (pryl `klocka`) it sits under the pesetas with the
// Spanish time, and the Norwegian and Swedish time beside it (an hour on: the same time twice, as on
// Ole's watch). E at Stig's bed in room 107 is a nap ("Kvarta en stund"): black, the clock spins on
// to the next part of the day, and Ole wakes him with his calculator's alarm.
// Missions are never touched: the clock stands still while one runs (every state but idle), and a
// mission talked to in the evening or at night fades to NÄSTA MORGON, the clock to nine and the day
// palette, before it starts (runner.begin awaits `toMorning`), so every timer still runs by day.
// Test mode: the clock does not run by itself (`run`), so story, fullstory and calibrate play at
// 15:00 in the day palette as before. Config: DAY (content/island.js). Owned by Game as `day`:
// main.js calls `update` once a frame, filters the chatter through `lineOk` and hides the giver's
// "!" while `napping`; the runner (a mission's end) and restoreAmbience call `resync`, so the
// clock's palette comes back once a mission has handed the sky back.

import { DAY } from '../content/index.js';
import { ISLAND_PALETTES } from '../level.js';
import { THREE, setSkyPalette, setNightLights } from '../gfx.js';
import { lm } from '../world/layout.js';
import { hud } from './hud.js';
import { audio } from '../audio.js';
import { fmt } from '../strings.js';

const COLORS = ['top', 'horizon', 'sun', 'hemiSky', 'hemiGround', 'cloudRim'], NUMS = ['fogNear', 'fogFar', 'sunI', 'hemiI'];
const _a = new THREE.Color(), _b = new THREE.Color();
const wrap = (h) => ((h % 24) + 24) % 24;
const ease = (k) => k * k * (3 - 2 * k);
// "20:10" for 20.1667 (whole minutes, rounded down).
export const hhmm = (h) => {
  const m = Math.floor(wrap(h) * 60 + 1e-6) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export class DayClock {
  constructor(game, cfg = DAY) {
    this.g = game;
    this.cfg = cfg;
    this.h = cfg.start;            // Spanish time in hours, 0 <= h < 24
    this.run = !game.testMode;     // ticks by itself between missions (tests set it)
    this.busy = false;             // the nap or the morning cut is playing
    this.napping = false;
    this.over = false;             // the HUD clock is drawn over the black fade
    this.spinH = null;             // the hour the HUD clock shows while it spins on
    this.shown = this.key(this.h); // the palette state last written (null: write at the next free-roam frame)
    this.last = null;              // for tests: the last nap or morning cut { kind, from, to, part?, ole? }
    const n = cfg.nap;
    this.removeBed = game.addInteractable({
      id: 'kvarta', r: n.r, prompt: n.prompt,
      pos: () => lm(n.lm),
      enabled: () => this.canNap(),
      use: () => { this.nap(); },
    });
  }

  // On the island between missions, outside any dialogue, the nap and the morning cut.
  get live() { const g = this.g; return g.level === 'island' && g.missions.state === 'idle' && !g.inDialog && !this.busy; }
  isDay(h = this.h) { const [a, b] = this.cfg.dayHours; return h >= a && h < b; }
  // Not the day palette: a mission talked to now starts the next morning.
  get dark() { return !this.isDay(); }
  lit(h = this.h) { const [on, off] = this.cfg.lit; return h >= on || h < off; }
  hourSecs(h = this.h) { const [a, b] = this.cfg.night; return h >= a || h < b ? this.cfg.nightHourSecs : this.cfg.hourSecs; }

  // The palette blend at h: { a, b, s } (palette names, s eased 0..1) between the `sky` key frames.
  blend(h) {
    const K = this.cfg.sky;
    for (let i = 0; i < K.length; i++) {
      const [h0, a] = K[i], [h1, b] = K[(i + 1) % K.length];
      const len = wrap(h1 - h0) || 24, t = wrap(h - h0);
      if (t < len) return { a, b, s: a === b ? 0 : ease(t / len) };
    }
    return { a: 'day', b: 'day', s: 0 };
  }
  // What a write at h would show: the blend to 1/200 and the lights.
  key(h) { const { a, b, s } = this.blend(h); return `${a}>${b}:${Math.round(s * 200)}${this.lit(h) ? '*' : ''}`; }
  // The island palette at h, blended as the cabin's (cabin.stepPalette): colours in linear light,
  // the numbers straight. The sun's direction swings with the blend towards the sunset (the long
  // evening shadows), but towards night with its cube, late, when the light is weak, so the shadows
  // do not wheel round over the town at dusk. `name`: the nearer palette (game.sky).
  palette(h) {
    const { a, b, s } = this.blend(h), A = ISLAND_PALETTES[a], B = ISLAND_PALETTES[b];
    if (!s) return { pal: A, name: a };
    const p = {}, d = b === 'night' ? s ** 3 : s;
    for (const k of COLORS) p[k] = _a.setHex(A[k]).lerp(_b.setHex(B[k]), s).getHex();
    for (const k of NUMS) p[k] = A[k] + (B[k] - A[k]) * s;
    p.sunDir = A.sunDir.map((v, i) => v + (B.sunDir[i] - v) * d);
    return { pal: p, name: s < 0.5 ? a : b };
  }
  // Sky, fog, light and the night lights for the clock's hour, now.
  write() {
    const { pal, name } = this.palette(this.h);
    setSkyPalette(pal);
    setNightLights(this.lit());
    this.g.sky = name;
    this.shown = this.key(this.h);
  }
  // The sky was set by someone else (a mission, the end card): the clock's own comes back at the
  // next free-roam frame.
  resync() { this.shown = null; }
  set(h) { this.h = wrap(h); this.resync(); }

  update(dt) {
    const g = this.g;
    if (this.live) {
      if (this.run) this.h = wrap(this.h + (dt * g.timeScale) / this.hourSecs());
      if (this.key(this.h) !== this.shown) this.write();
    }
    this.showHud();
  }

  // Ole's watch under the pesetas, once found, on the island (hidden in the flight level and, with
  // the coins, under the letterbox, unless drawn over the fade).
  showHud() {
    const g = this.g, c = this.cfg;
    if (g.level !== 'island' || !g.collected.prylar.has('klocka')) { hud.setClock(null); return; }
    const h = this.spinH ?? this.h, o = hhmm(h + 1);
    hud.setClock(hhmm(h), c.zone, fmt(c.others, { no: o, sv: o }), this.over);
  }
  // The shown clock spins from `from` on to `to` (forwards) over `spinSecs`.
  spin(from, to) {
    const g = this.g, len = wrap(to - from), secs = this.cfg.spinSecs;
    let t = 0;
    this.spinH = from;
    return new Promise((done) => {
      const fn = (dt) => {
        t += dt;
        const k = Math.min(1, t / secs);
        this.spinH = from + len * ease(k);
        if (k >= 1) { g.offFrame(fn); this.spinH = null; done(); }
      };
      g.onFrame(fn);
    });
  }

  // CHATTER lines tied to a time of day (DAY.chatter) only within their hours. Only while the clock
  // runs: with it held (test mode) the chatter is as before.
  lineOk(text) {
    const w = this.cfg.chatter[text];
    return !w || !this.run || (this.h >= w[0] && this.h < w[1]);
  }

  // runner.begin, before the talk: outside the day hours black, NÄSTA MORGON, the clock spun on to
  // `morning` with the day palette, and back; the mission then starts as by day.
  async toMorning() {
    const g = this.g, c = this.cfg, from = this.h;
    this.busy = true;
    g.inDialog = true;
    this.over = true;
    hud.fade(true);
    await g.wait(c.fadeSecs);
    hud.showBanner(c.morningBanner[0], c.morningBanner[1], 'mission', 0);
    await this.spin(from, c.morning);
    this.set(c.morning);
    this.write();
    this.last = { kind: 'morning', from, to: this.h };
    await g.wait(c.holdSecs);
    hud.hideBanner();
    hud.fade(false);
    await g.wait(c.fadeSecs);
    this.over = false;
    g.inDialog = false;
    this.busy = false;
  }

  // ---------------------------------------------------------------------------------------------
  // The nap in room 107.

  // E at the bed: free roam, on foot and standing, no pursuit, nothing carried.
  canNap() {
    const g = this.g, p = g.player;
    return this.live && !g.shame.pursuit && !g.carrying && !g.playerCar && p.state === 'normal' && p.onGround;
  }
  // The next part of the day to wake to: the first `wake` hour at least `minGap` h on. [h, part]
  nextWake(h = this.h) {
    const n = this.cfg.nap;
    let best = null;
    for (const [w, part] of n.wake) { const d = wrap(w - h); if (d >= n.minGap && (!best || d < best[2])) best = [w, part, d]; }
    return best;
  }
  // Ole can come to the bed: shown, standing, not held by the Berra job, the judges or an idle pose.
  oleFree() {
    const g = this.g, n = g.npcs.ole;
    return !!n && n.state === 'normal' && n.root.visible && !n.car && !n.seatId && !g.missions.idlePose('ole') && !g.berraJob.posed('ole') && !g.judges.posed('ole');
  }
  // Does the waiting mission need Ole at its place (its giver or an extra)? placeNpcs puts him there
  // at once, so he is sent there in the dark.
  oleNeeded() {
    const cur = this.g.missions.current;
    return !!cur && cur.level === 'island' && (cur.giver === 'ole' || !!cur.extra?.some((e) => e === 'ole' || (Array.isArray(e) && e[0] === 'ole')));
  }

  async nap() {
    if (!this.canNap()) return;
    const g = this.g, c = this.cfg, n = c.nap, p = g.player, from = this.h, [to, part] = this.nextWake();
    const ole = this.oleFree() ? g.npcs.ole : null;
    this.busy = this.napping = true;
    g.inDialog = true;
    p.wishX = p.wishZ = p.vx = p.vz = 0;
    hud.letterbox(true);
    this.over = true;
    hud.fade(true);
    await g.wait(c.fadeSecs);
    // In the dark: Stig on his back on his bed, Ole beside it, the camera at the room's open front.
    hud.showBanner(n.banner, '', 'mission', 0);
    const bed = lm(n.lm), at = (o) => g.lmOffset(bed, o[0], o[1]);
    p.teleport(bed.x, bed.z, bed.yaw);   // onto the mattress (teleport snaps to the 0.70 top)
    p.tumble(1e9, 1e-3);                  // Character.tumble, past its roll: lying on his back
    p.tumbleT = 1;
    if (ole) g.placeNpc('ole', bed, n.oleAt[0], n.oleAt[1], n.oleAt[2]);
    const cp = at(n.cam), lk = at(n.look);
    g.cam.cutTo({ x: cp.x, y: n.cam[2], z: cp.z }, { x: lk.x, y: n.look[2], z: lk.z });
    await this.spin(from, to);
    this.set(to);
    this.write();
    if (this.lit()) setSkyPalette(n.lamp);   // Ole has the ceiling lamp on (the scene only)
    this.last = { kind: 'nap', from, to: this.h, part, ole: !!ole, pips: 0 };
    hud.hideBanner();
    hud.fade(false);
    await g.wait(c.fadeSecs);
    this.over = false;
    g.say(p, n.zzz, 1.6);
    // The alarm: Ole holds up his calculator; Stig sleeps on, then the second PIP gets him up.
    await g.wait(n.pipAt);
    audio.pip();
    this.last.pips++;
    if (ole) { ole.anim.calc = true; g.say(ole, n.ole, 2.6); }
    await g.wait(n.sleepOn);
    g.say(p, n.zzz, 1.2);
    await g.wait(n.wakeAt);
    audio.pip();
    this.last.pips++;
    this.wake(p, at(n.stigAt), n.stigAt[2]);
    if (ole) ole.anim.calc = false;
    hud.toast(fmt(n.toast, { part }));
    if (part === 'natten') g.say(p, n.night, 3);
    await g.wait(n.after);
    // Ole is let go: the home placement (main.placeNpcs) leaves him by the bed until Stig is 50 m
    // off (it never pops anyone in front of him), but takes him at once to the place of a mission
    // that needs him, so that is done in the dark.
    const fadeOut = ole && this.oleNeeded();
    if (fadeOut) { hud.fade(true); await g.wait(c.fadeSecs); }
    if (ole) { ole.busy = false; ole.spot = null; }
    g.cam.release();
    g.cam.yaw = p.yaw;
    g.cam.snapNext = true;
    this.write();   // the lamp's light off again: the clock's palette
    hud.letterbox(false);
    if (fadeOut) { await g.wait(0.1); hud.fade(false); }
    g.inDialog = false;
    this.busy = this.napping = false;
  }
  // Off the bed, on his feet at `s` facing yaw.
  wake(p, s, yaw) {
    p.state = 'normal';
    p.timer = 0;
    p.tumbleT = null;
    p.root.rotation.order = 'XYZ';
    p.vx = p.vz = p.vy = 0;
    p.teleport(s.x, s.z, yaw);
  }
}
