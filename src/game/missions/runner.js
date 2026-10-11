// The mission runner (DESIGN §9.4). A mission def:
//   { id, title, level, giver, at, reward, cost?, extra?, unlock?, bustFails?, panicFails?,
//     intro: [[who, text, cue?]], stages: [() => stage], outro: [[who, text, cue?]],
//     outroPlace?: { key: [lm, dx, dz, yaw?] }, outroCam?: 'player' | [a, b] | { at, dist, height },
//     outroHide?: [key],   // hidden from the UPPDRAG KLART! wait until an outro cue shows them
//     idleAnim?: { key: flag | [flags] },   // held on the giver/extras while idle at `at`
//     onEnd?(g, reason) }   // reason: 'complete' | 'fail' | 'abort'
// States: idle | intro | running | outro | failed. Frozen after Phase 0 (owner none).
// A checkpoint stage may carry `retryAt` (where a retry starts), `retryCar` (the car waiting
// there; kinds/core.js retryCar) and `retryFear` (a retry gives back the meter it first started at).

import { MISSIONS } from './index.js';
import { retryCar } from './kinds/core.js';
import { lm, routeAim } from '../../world/layout.js';
import { audio } from '../../audio.js';
import { hud } from '../hud.js';
import { S, fmt, pta } from '../../strings.js';
import { METERS } from '../../meters.js';
import { dist, yawTo } from '../../util.js';

// Cue fields a checkpoint retry re-applies from the stages before the checkpoint (§9.4 item 3).
const AMBIENT = ['sky', 'music', 'phase', 'seatbelt', 'outfit', 'trolley', 'blockers'];

export class MissionRunner {
  constructor(game) {
    this.g = game;
    this.index = 0;          // next mission to offer
    this.state = 'idle';     // idle | intro | running | outro | failed
    this.m = null;
    this.stage = null;
    this.stageI = 0;
    this.cpI = 0;            // last checkpoint stage
    this.stageT = 0;         // scaled seconds in the current stage
    this.posed = [];         // [key, flag] pairs set by syncIdleAnim
    this.lastCar = null;     // the car the player last drove in this mission (retryCar)
    this.cpFear = {};        // meter at a `retryFear` checkpoint's first start, by stage index
  }

  get current() { return MISSIONS[this.index] || null; }
  get active() { return this.state !== 'idle'; }
  get count() { return MISSIONS.length; }

  async begin() {
    const g = this.g, def = this.current;
    if (!def || this.state !== 'idle') return;
    this.state = 'intro';
    this.syncIdleAnim();     // the idle pose ends when the talk starts
    const giver = g.npc(def.giver);
    g.player.wishX = g.player.wishZ = 0;
    g.player.vx = g.player.vz = 0;
    if (g.player.state === 'normal') g.player.yaw = yawTo(giver.x - g.player.x, giver.z - g.player.z);
    if (giver.state === 'normal') giver.yaw = yawTo(g.player.x - giver.x, g.player.z - giver.z);
    g.cinematic(giver, g.player);
    // The title card rides in the top letterbox bar while the intro plays (cls `intro`), clear of
    // the framed faces, so stage 0 (often timed: ombord's 7 s seat dash) starts on a clear screen.
    // Without an intro it follows the talk as before, shorter.
    const intro = def.intro || [], sub = fmt('missionSub', { i: this.index + 1, n: MISSIONS.length });
    if (intro.length) { hud.showBanner(def.title, sub, 'mission intro', 3200); audio.jingle('start'); }
    await g.dialog(intro);
    if (hud.banner.classList.contains('intro')) hud.hideBanner();
    g.endCut();
    g.endCinematic();
    if (def.cost) await g.pay(def.cost);
    if (!intro.length) { hud.showBanner(def.title, sub, 'mission', 1400); audio.jingle('start'); }
    this.cpI = 0;
    this.lastCar = null;
    this.cpFear = {};
    this.startMission(0);
    if (intro.length) this.faceTimedGuide();
  }

  // §9.4 `idleAnim`: the flags the current mission holds on `key` while it waits (idle, in its own
  // level), else null. main.js calls syncIdleAnim() every frame; posed NPCs neither wave, turn to
  // the player nor chatter.
  idlePose(key) {
    const def = this.state === 'idle' ? this.current : null;
    if (!def?.idleAnim || def.level !== this.g.level || def.idleAnim[key] == null) return null;
    return [].concat(def.idleAnim[key]);
  }
  syncIdleAnim() {
    const g = this.g, def = this.state === 'idle' ? this.current : null;
    const want = [];
    if (def?.idleAnim && def.level === g.level) {
      for (const key of Object.keys(def.idleAnim)) {
        const n = g.npcs[key];
        if (n && n.state !== 'hidden') for (const f of [].concat(def.idleAnim[key])) want.push([key, f]);
      }
    }
    for (const [key, f] of this.posed) {
      if (!want.some(([k, w]) => k === key && w === f) && g.npcs[key]) g.npcs[key].anim[f] = false;
    }
    for (const [key, f] of want) g.npcs[key].anim[f] = true;
    this.posed = want;
  }

  // `before(m)` runs on the fresh `m` before the first stage starts (a retry's `retryCar`).
  startMission(from = 0, before = null) {
    const def = this.current;
    this.m = { def, cars: [], items: [], data: {} };
    this.stageI = from;
    this.state = 'running';
    before?.(this.m);
    this.startStage();
  }

  startStage() {
    const g = this.g;
    this.stage?.cleanup?.(g, this.m);
    const st = (this.stage = this.m.def.stages[this.stageI]());
    if (st.checkpoint) this.cpI = this.stageI;
    if (st.retryFear) this.cpFear[this.stageI] ??= g.shame.v;   // the first start only (retry())
    g.shame.locked = g.shame.mode === 'pursuit' && !!st.lockMeter;
    g.shame.forced = !!st.shame;
    this.stageT = 0;
    this.timedI = 0;
    this.framed = false;
    if (st.startCue) g.cue(st.startCue);
    st.init?.(g, this.m);
  }

  update(dt) {
    if (this.state !== 'running') return;
    const g = this.g, st = this.stage;
    // Kept while on foot, so a stage failed on foot (grisfest's plates) still finds the car he left.
    if (g.playerCar) this.lastCar = g.playerCar;
    this.stageT += dt * g.timeScale;
    const tc = st.timedCues;
    if (tc) while (this.timedI < tc.length && tc[this.timedI][0] <= this.stageT) g.cue(tc[this.timedI++][1]);
    if (g.inDialog) this.framed = true;   // the stage played a framed dialogue (a scene, interact lines)
    const r = st.update(g, this.m, dt);
    if (this.state !== 'running' || this.stage !== st) return;
    if (r === 'done') {
      if (st.doneCue) g.cue(st.doneCue);
      this.stageI++;
      if (this.stageI >= this.m.def.stages.length) this.complete();
      else {
        const framed = this.framed;
        audio.checkpoint();
        this.startStage();
        if (framed) this.faceTimedGuide();
      }
    } else if (r && r.fail) this.fail(r.fail);
  }

  // On foot he and the camera face the running stage's guide (the arrow's aim: along the road route
  // on the island, straight in the flight level); in a car, or for a stage without a target (a
  // scene), nothing changes.
  faceGuide() {
    const g = this.g, p = g.player, t = this.state === 'running' && !g.playerCar && p.state === 'normal' ? this.target() : null;
    if (!t) return;
    const a = g.levelDef.routeAim ? routeAim(p.x, p.z, t.x, t.z) : t;
    if (dist(a.x, a.z, p.x, p.z) > 0.3) p.yaw = g.cam.yaw = yawTo(a.x - p.x, a.z - p.z);
  }
  // A timed stage that starts as the intro or a framed dialogue ends turns him and the camera to its
  // guide, as a retry does (Phase 3 r3): the camera kept its yaw from before the dialogue, and the
  // first gate dash started 168° off its route, ombord's seat dash 121° (at the stewardess), the
  // Tonga drive at the dancers.
  faceTimedGuide() { if (this.objective()?.timer != null) this.faceGuide(); }

  objective() {
    if (this.state !== 'running' || !this.stage) return null;
    const o = this.stage.obj?.(this.g) || {};
    return { title: this.m.def.title, text: this.stage.sub || this.stage.text, ...o };
  }
  target() {
    if (this.state !== 'running' || !this.stage) return null;
    return this.stage.altTarget?.(this.g) || this.stage.target?.(this.g) || null;
  }
  markers() { return this.state === 'running' ? this.stage?.markers?.(this.g) || [] : []; }

  cleanupMission() {
    const g = this.g;
    this.stage?.cleanup?.(g, this.m);
    this.stage = null;
    if (!this.m) return;
    for (const c of this.m.cars) {
      for (const p of [c.driver, ...c.passengers]) if (p && p !== g.player) g.unseat(p);
      g.removeRiders?.(c);
      g.removeCar(c);
    }
    for (const f of this.m.items) f();
    this.m.items = [];
    g.shame.forced = false;
    g.shame.locked = false;
    g.freezeCar = false;
    g.carrying = null;
    g.speedCap = null;
    g.holding = false;
    g.mantraMode = false;
    for (const f of ['carryOver', 'cupUp', 'cupHeld', 'wings', 'oath', 'dance', 'shoeOff']) g.player.anim[f] = false;
    if (g.playerCar) g.removeRiders?.(g.playerCar);
    for (const k of Object.keys(g.npcs)) {
      const n = g.npcs[k];
      if (n.car && n.car === g.playerCar) { const e = g.exitSpot(n.car, -1); g.unseat(n, e.x, e.z); }
      if (n.state === 'hidden' && n.hiddenBy === 'mission') { n.state = 'normal'; n.root.visible = true; }
      n.hiddenBy = null;
      n.busy = false;
    }
    if (g.level === 'flight') g.cabin.setAisleBlockers(false);
    // Everyone back to the home set (seated cast re-seated, mission-moved NPCs home).
    g.placeNpcs(true);
  }

  async complete() {
    const g = this.g, def = this.m.def;
    this.state = 'outro';
    this.cleanupMission();
    if (g.shame.pursuit) g.shame.endPursuit(true);
    if (g.shame.mode === 'pursuit') g.shame.v = 0;
    hud.showBanner(S.complete, fmt('completeSub', { reward: pta(def.reward) }), 'good', 2400);
    audio.applause(2);
    audio.jingle('complete');
    g.addCoins(def.reward);
    g.placeNpcs(true);
    // The forced placement shows everyone with a home again; `outroHide` keeps the ones an outro
    // reveals later out of the banner wait (Phase 3 r3: Angerud at his bar door through asnan's).
    for (const k of def.outroHide || []) g.hideNpc(k);
    await g.wait(1.6);
    // The outro: exit the car, place people, pick the speaker and the camera.
    if (g.playerCar) g.exitCar(true);
    let speaker = null;
    if (def.outroPlace) {
      for (const [key, v] of Object.entries(def.outroPlace)) {
        if (key === 'stig') continue;
        g.placeNpc(key, ...v);
        speaker ??= g.npc(key);
      }
      if (def.outroPlace.stig) {
        g.placeNpc('stig', ...def.outroPlace.stig);
        // A 4th tuple element is an absolute yaw and wins; otherwise face the speaker.
        if (speaker && def.outroPlace.stig[3] === undefined) g.player.yaw = yawTo(speaker.x - g.player.x, speaker.z - g.player.z);
      } else if (speaker && !def.outroCam && dist(speaker.x, speaker.z, g.player.x, g.player.z) > 8) {
        const fx = Math.sin(speaker.yaw), fz = Math.cos(speaker.yaw);
        const s = g.spotFree(speaker.x + fx * 2, speaker.z + fz * 2) ? { x: speaker.x + fx * 2, z: speaker.z + fz * 2 } : g.freeSpot(speaker.x, speaker.z, 1.8, 3);
        if (g.player.seatId) g.standPlayer();
        g.player.teleport(s.x, s.z, yawTo(speaker.x - s.x, speaker.z - s.z));
        g.cam.snapNext = true;
      }
    } else {
      const who = (def.outro || []).map(([w]) => w).find((w) => {
        const n = w !== 'stig' && g.npcs[w];
        return n && !n.busy && !n.car && n.state === 'normal';
      });
      const n = who && g.npc(who);
      if (n) {
        const f = g.focus();
        const p = g.freeSpot(f.x, f.z, 2.5, 4);
        n.teleport(p.x, p.z, yawTo(f.x - p.x, f.z - p.z));
        speaker = n;
      }
    }
    const oc = def.outroCam;
    if (oc === 'player') g.cinematicOne(g.player);
    else if (Array.isArray(oc)) g.cinematic(g.npc(oc[0]), g.npc(oc[1]));
    else if (oc) { g.cutTo(oc); g.inDialog = true; hud.letterbox(true); }
    else if (speaker) g.cinematic(speaker, g.player);
    else g.cinematicOne(g.player);
    hud.hideBanner();   // UPPDRAG KLART! (2.4 s) would sit over the framed faces of the first line
    await g.dialog(def.outro || []);
    g.endCut();
    g.endCinematic();
    def.onEnd?.(g, 'complete');
    this.index++;
    // Before the end card the unlock holds its toast and shows it back on the island (Phase 3 r3:
    // julafton's "Pepes Bodega har öppnat…" lay over the Rio card and was gone before the pool).
    const endCard = g.pendingEndCard && this.index >= MISSIONS.length;
    const heldToast = def.unlock ? g.unlock(def.unlock, { holdToast: endCard }) : null;
    this.m = null;
    g.save();
    let transitioned = false;
    if (this.index < MISSIONS.length && g.levelFor(this.index) !== g.level) {
      await g.transitionTo(g.levelFor(this.index));
      transitioned = true;
    }
    this.state = 'idle';
    g.placeNpcs(true);
    if (this.index >= MISSIONS.length) {
      if (g.pendingEndCard) { g.pendingEndCard = false; await g.playEndCard(); if (heldToast) hud.toast(heldToast); }
      else { hud.showBanner(S.gameComplete, S.gameCompleteSub, 'good', 5000); audio.jingle('complete'); }
    } else if (!transitioned) {
      hud.toast(fmt('newMission', { name: g.charDef(this.current.giver).name }));
    }
  }

  fail(reason) {
    const g = this.g;
    if (this.state !== 'running') return;
    const def = this.m.def;
    this.state = 'failed';
    if (g.playerCar) this.lastCar = g.playerCar;
    audio.jingle('fail');
    hud.showBanner(S.failed, reason, 'bad', 0);
    this.cleanupMission();
    g.shame.clear();
    def.onEnd?.(g, 'fail');
    g.restoreAmbience();
    this.failT = 0;
  }

  // While failed: E retries from the last checkpoint, Q gives up. No time-out: giving up loses the
  // checkpoint and a restart pays `cost` again, so it is always the player's choice.
  updateFailed(dt) {
    if (this.state !== 'failed') return;
    this.failT += dt;
    const g = this.g;
    hud.setPrompt(this.failT > 0.8 ? S.retryPrompt : '');
    if (this.failT > 0.8 && g.input.pressed('interact')) this.retry();
    else if (this.failT > 0.8 && g.input.keyPressed('KeyQ')) this.abort();
  }

  retry() {
    const g = this.g;
    hud.hideBanner();
    hud.setPrompt('');
    const def = this.current;
    // Re-apply the ambient cue fields of every stage before the checkpoint (phase always instant).
    // On the retry's fresh `m` (startMission's `before`): a manual trolley mode belongs to the run
    // that set it (cabin.stopTrolley), and set under the failed run's `m` it fell back to auto at
    // once (Phase 3 r3: landning's re-parked trolley set off down the aisle in the 14B dash).
    const ambient = () => {
      for (let k = 0; k < this.cpI; k++) {
        const st = def.stages[k]();
        for (const cue of [st.startCue, st.doneCue]) {
          if (!cue) continue;
          const amb = {};
          for (const f of AMBIENT) if (cue[f] !== undefined) amb[f] = cue[f];
          if (amb.phase !== undefined) amb.phase = [Array.isArray(amb.phase) ? amb.phase[0] : amb.phase, { instant: true }];
          if (Object.keys(amb).length) g.cue(amb);
        }
      }
    };
    const cp = def.stages[this.cpI]();
    const spot = g.approachSpot(cp.retryAt ?? def.at);
    const prev = g.playerCar || this.lastCar;
    if (g.playerCar) g.exitCar(true);
    if (g.player.seatId) g.standPlayer();
    g.player.state = 'normal';
    g.player.teleport(spot.x, spot.z, spot.yaw);
    g.cam.yaw = spot.yaw;
    g.cam.snapNext = true;
    // A toast, not a banner: the stage clock runs from here, and a mid-screen banner hid Stig and
    // the aisle for 2 of ombord's 7 s (the objective card names the mission anyway).
    hud.toast(S.retryToast);
    audio.jingle('start');
    // `retryCar`: the car waits at its spot (the player at the wheel unless `park`) before the
    // checkpoint stage's init, which may read g.playerCar (destroy.playerDamageScale). It becomes
    // `lastCar`, so a second failure on foot (grisfest's plates again) finds the car parked for him.
    // `retryFear`: the meter (emptied by the fail) gets back what it had when the checkpoint first
    // started, so a retry starts from the same fear as the first attempt (Phase 3 r3: the gate's
    // statistics rebuilt only their own +48 and the retried dash started at 48, not ≈ 70).
    const fear = cp.retryFear ? this.cpFear[this.cpI] : 0;
    this.startMission(this.cpI, (m) => {
      ambient();
      if (fear > 0) g.shame.add(fear);
      if (cp.retryCar) this.lastCar = retryCar(g, m, cp.retryCar, prev);
    });
    // On foot he and the camera face the retried stage's guide; a stage without a target (a scene)
    // keeps the spot's yaw. Phase 3 r3: the camera kept the yaw it had when the stage failed, and the
    // spots face their landmark, not the way to go: ombord's seat dash looked at the cockpit door,
    // sprit's sweep at the rear galley, landning's 14B dash at row 16's seats and the Tonga walk away
    // from the car.
    this.faceGuide();
  }

  abort() {
    const g = this.g;
    hud.hideBanner();
    hud.setPrompt('');
    const def = this.m?.def || this.current;
    if (this.state === 'running') this.cleanupMission();
    this.state = 'idle';
    this.lastCar = null;
    this.m = null;
    this.stage = null;
    def?.onEnd?.(g, 'abort');
    g.restoreAmbience();
    g.placeNpcs(true);
  }

  onBusted() {
    if (this.state === 'running' && this.m.def.bustFails) this.fail(METERS.skandal.bustedFailText);
  }

  // PANIK: true (and the mission fails) when the stage or the mission says panicFails.
  onPanic() {
    if (this.state !== 'running') return false;
    if (this.stage?.panicFails || this.m.def.panicFails) { this.fail(METERS.flygradsla.panicFailText); return true; }
    return false;
  }
}
