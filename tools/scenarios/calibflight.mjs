// Timer calibration and FLYGRÄDSLA balance for the flight missions (DESIGN §8 "Timers and
// difficulty", §5.9). Phase 2 balance pass; based on WP-F's scratch autopilot.
//   PORT=… OUT=… node tools/shot.mjs calibflight                 (every case)
//   FLIGHT=gate/sprint,ombord/careless node tools/shot.mjs calibflight   (a subset)
//   SPRIT_RUNS=n (bottle sweeps, default 5; the stage is random: DESIGN's timer pools 30+ runs),
//   DEBUG_SPRIT=1 (the sweep traced twice a second into the run's log line),
//   DIALOG_CPS=n (dialogue typing speed, default 55 chars/s; 20 is a player who reads every line:
//   FLYGRÄDSLA must not depend on it, §5.9)
// The game runs at timeScale 1 (&ts=1) with dialogue at the real typing speed (55 chars/s). A
// page-side autopilot walks the player through the real collision geometry (waypoints; the camera
// yaw points W at the next one, optional Shift), presses the stage's interactions, holds Space in
// turbulence and J when the meter is hot, as a careful player would. A careless player never holds
// J unless the stage requires it, and dawdles.
// Each timed stage reports its clean time; T_ref = clean time + 0.5 s per target (a human's
// reaction and aim, which the autopilot does not have), timer = T_ref × 1.25 rounded up to a whole
// second (§8). The FLYGRÄDSLA cases check the binding rule: a careful player
// never panics, a careless one does in missions 1, 2 and 5.
import { check, pct, timerRange } from '../lib.mjs';

const FLIGHT = process.env.FLIGHT ? process.env.FLIGHT.split(',') : null;
const want = (id) => !FLIGHT || FLIGHT.includes(id) || FLIGHT.includes(id.split('/')[0]);
const W = (lx) => 3000 + lx;
export const timerFor = (tRef, k = 1.25) => Math.ceil(tRef * k);

// ---- page-side autopilot -------------------------------------------------------------------
async function install(T) {
  await T.ev(async (cps) => {
    const { input } = await import('/src/input.js');
    const g = __game;
    g.dialogSpeed = cps;
    const ap = window.__fap = { pts: [], i: 0, sprint: false, holdSpace: false, mantraAt: 999, mantraTo: 0, mantraOn: false, mantraForce: false, autoSpace: false, t: 0, maxV: 0, panics: 0, log: [], go: false, r: 0.35, wait: null };
    const orig = { moveY: input.moveY.bind(input), moveX: input.moveX.bind(input), down: input.down.bind(input) };
    input.moveY = () => (ap.go ? 1 : orig.moveY());
    input.moveX = () => (ap.go ? 0 : orig.moveX());
    // Space (hold on: he stands still) while the turbulence shakes, not through its 1.5 s warning
    // (`cabin.turbulent` covers both), which overstated a sweep by up to the warning.
    const shaking = () => { const c = g.cabin, t = c._turb; return c.turbulent && t.t - t.delay - t.warn >= 0; };
    input.down = (a) => {
      if (a === 'sprint') return ap.go && ap.sprint;
      if (a === 'jump') return ap.holdSpace || (ap.autoSpace && shaking() && g.player.state === 'normal');
      if (a === 'attack') return ap.mantraOn;
      return orig.down(a);
    };
    let wasPanic = false;
    g.onFrame((dt) => {
      ap.t += dt;
      const v = g.shame.v;
      ap.maxV = Math.max(ap.maxV, v);
      const pan = g.shame.panicT > 0;
      if (pan && !wasPanic) { ap.panics++; ap.log.push(`PANIC t=${ap.t.toFixed(1)}`); }
      wasPanic = pan;
      // Careful mantra: on at mantraAt, off at mantraTo (or forced on).
      if (v >= ap.mantraAt) ap.mantraOn = true;
      if (v <= ap.mantraTo && !ap.mantraForce) ap.mantraOn = false;
      if (ap.mantraForce) ap.mantraOn = true;
      const p = g.player;
      if (!ap.pts.length || ap.i >= ap.pts.length) { ap.go = false; return; }
      if (ap.wait && ap.wait()) { ap.go = false; return; }
      const [x, z] = ap.pts[ap.i];
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < ap.r) { ap.i++; if (ap.i >= ap.pts.length) { ap.go = false; ap.arrivedT = ap.t; } return; }
      g.cam.yaw = Math.atan2(x - p.x, z - p.z);
      g.cam.manualT = 1;
      ap.go = true;
    });
  }, +(process.env.DIALOG_CPS || 55));
}
async function path(T, pts, { sprint = false, r = 0.35 } = {}) {
  await T.ev((pts, sprint, r) => { const ap = window.__fap; ap.pts = pts; ap.i = 0; ap.sprint = sprint; ap.r = r; ap.arrivedT = null; ap.go = true; }, pts, sprint, r);
}
const apState = (T) => T.ev(() => { const g = __game, ap = window.__fap, m = g.missions; return { t: +ap.t.toFixed(2), v: +g.shame.v.toFixed(1), maxV: +ap.maxV.toFixed(1), panics: ap.panics, st: m.state, si: m.stageI, idx: m.index, x: +(g.player.x - 3000).toFixed(2), z: +g.player.z.toFixed(2), ps: g.player.state, seat: g.player.seatId, log: ap.log.slice(-4) }; });
const stageAt = (T, i, to = 120000) => T.until((i) => __game.missions.state !== 'running' || __game.missions.stageI >= i, to, i);
const resetMeters = (T) => T.ev(() => { const ap = window.__fap; ap.maxV = __game.shame.v; ap.panics = 0; ap.t = 0; ap.log = []; });
const stageClock = (T) => T.ev(() => window.__fap.t);
// Time of the current stage's end, as measured on the autopilot clock (game frame dt).
async function timeStage(T, i, to = 60000) {
  const t0 = await stageClock(T);
  await T.until((i) => __game.missions.state !== 'running' || __game.missions.stageI > i, to, i).catch(() => {});
  const s = await apState(T);
  return { secs: +(s.t - t0).toFixed(2), s };
}

const rows = [];
function row(T, id, what, measured, targets, note) {
  const tRef = measured + 0.5 * targets;
  const timer = timerFor(tRef);
  rows.push({ id, what, measured, tRef, timer, note });
  T.log(`CALF ${id} | ${what} | clean ${measured.toFixed(1)} s | T_ref ${tRef.toFixed(1)} | timer ${timer} | ${note}`);
  return { tRef, timer };
}
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
// pct (interpolated percentile) and timerRange (a random stage's bootstrap timer range) are in lib.mjs.

// ---- mission 1 gate: the toilet dash -----------------------------------------------------------
// Careful: sprints the route round the ladies' room. Careless: dawdles 2 s, then walks.
async function gate(T, variant) {
  await T.fresh('&ts=1');
  await install(T);
  await T.startMission();
  await path(T, [[W(33.7), 5.0]]);
  await T.until(() => window.__fap.arrivedT != null, 20000);
  await T.tap('KeyE');
  await stageAt(T, 1);
  await path(T, [[W(30.6), 5.0], [W(28.0), 9.8], [W(25.0), 11.6]]);
  await stageAt(T, 3);
  const s0 = await apState(T);
  const timer = await T.ev(() => __game.missions.stage.o.timer);
  await resetMeters(T);
  const route = [[W(27.6), 12.2], [W(29.0), 24.8], [W(32.2), 25.7]];
  const t0 = await stageClock(T);
  if (variant === 'sprint') await path(T, route, { sprint: true });
  else if (variant === 'walk') await path(T, route);
  else { await T.until((t) => window.__fap.t >= t + 2, 10000, t0); await path(T, route); }
  const d = await timeStage(T, 3, 30000);
  d.secs = +(d.s.t - t0).toFixed(2);
  const s1 = d.s;
  T.log(`gate/${variant}: dash timer ${timer}; fear at the start ${s0.v} -> ${s1.v} (max ${s1.maxV}); ${s1.st === 'failed' ? 'FAILED' : `arrived in ${d.secs} s`}; panics ${s1.panics}`, JSON.stringify(s1.log));
  // Careful players also go on through the mantra and the rest of the mission without panicking.
  if (variant === 'sprint' && s1.st === 'running') {
    await T.ev(() => { window.__fap.mantraForce = true; });
    await stageAt(T, 5);
    await T.ev(() => { window.__fap.mantraForce = false; window.__fap.mantraAt = 80; window.__fap.mantraTo = 40; });
    await stageAt(T, 6);
    // The rest of the mission (the queue, the bodega tip, boarding) has no fear sources.
    const s2 = await apState(T);
    T.log(`gate/${variant}: through the mantra and Berra's scene: stage ${s2.si} ${s2.st}; panics ${s2.panics}; max fear after the dash ${s2.maxV}`);
    return { dash: d.secs, failed: s1.st === 'failed', panics: s2.panics, startFear: s0.v, endFear: s1.v, timer, done: s2.st === 'running' && s2.si >= 6 };
  }
  return { dash: d.secs, failed: s1.st === 'failed', panics: s1.panics, startFear: s0.v, endFear: s1.v, timer };
}

// ---- mission 2 ombord: the seat run, then the takeoff ------------------------------------------
async function ombord(T, variant) {
  await T.fresh('&mission=1&ts=1');
  await install(T);
  await T.startMission();
  await resetMeters(T);
  const timer = await T.ev(() => __game.missions.stage.o.timer);
  // Excuse the stowers on the way (E within reach, as a player would), then sit from the aisle.
  await T.ev(() => {
    const ap = window.__fap, g = __game;
    ap.wait = () => {
      const it = g.nearestInteractable();
      if (it?.type === 'it' && it.it.id?.startsWith('blocker')) { ap.excT = ap.excT ?? -1; if (ap.t - ap.excT > 0.4) { it.it.use(g); ap.excT = ap.t; ap.log.push(`excuse t=${ap.t.toFixed(1)}`); } return true; }
      return false;
    };
  });
  const sprint = variant !== 'walk';
  await path(T, [[W(0.0), 12.6], [W(0.1), -1.5]], { sprint, r: 0.45 });
  const t0 = 0;
  await T.until(() => window.__fap.arrivedT != null || __game.missions.state !== 'running', 30000);
  // E on the seat (the seat interactable reaches 1.6 m).
  await T.ev(() => { window.__fap.wait = null; __game.sitPlayer('14B'); });
  const s0 = await apState(T);
  const seatT = s0.t - t0;
  T.log(`ombord/${variant}: seated after ${seatT.toFixed(2)} s (timer ${timer}), fear ${s0.v}`, JSON.stringify(s0.log));
  if (variant !== 'careless') await T.ev(() => { window.__fap.mantraAt = 70; window.__fap.mantraTo = 35; });
  await T.until(() => __game.missions.state !== 'running', 90000).catch(() => {});
  const s1 = await apState(T);
  T.log(`ombord/${variant}: mission ${s1.st}; panics ${s1.panics}; max fear ${s1.maxV}`, JSON.stringify(s1.log));
  return { seat: seatT, timer, panics: s1.panics, maxV: s1.maxV, state: s1.st };
}

// ---- mission 4 sprit: the bottle sweep with the trolley and turbulence -------------------------
async function sprit(T) {
  await T.fresh('&mission=3&ts=1');
  await install(T);
  await T.startMission();
  await resetMeters(T);
  const shipped = await T.ev(() => __game.missions.stage.o.timer);
  await T.ev(() => { __game.missions.stage.t = 400; });
  await T.ev((debug) => {
    const ap = window.__fap, g = __game, c = g.cabin, tr = c.trolley;
    // DEBUG_SPRIT=1: the player, the trolley and every live bottle twice a second.
    if (debug) {
      let next = 0;
      g.onFrame(() => {
        if (g.missions.stageI !== 0 || ap.t < next) return;
        next = ap.t + 0.5;
        const st = g.missions.stage, p = g.player;
        ap.log.push(`@${ap.t.toFixed(1)} p ${(p.x - 3000).toFixed(2)},${p.z.toFixed(1)} tr ${tr.z.toFixed(1)}${c.trolleyStopped ? 's' : ''}${ap.waiting ? ' wait' : ''} b ${st.list.filter((e) => e.alive).map((e) => `${e.pz.toFixed(1)}/${e.vz.toFixed(1)}`).join(' ')}`);
      });
    }
    ap.autoSpace = true;
    ap.sprint = true;
    ap.waits = 0; ap.got = 0; ap.waiting = false;
    // Free aisle seats (x +0.95) to step into while holding on in turbulence (Space held: he cannot
    // back off, and holding does not stop the trolley bowling him).
    const ROWS_FREE = [3, 8, 12, 15, 18, 20, 23];
    const rowZ = (row) => 12.4 - 1.2 * (row <= 12 ? row - 1 : row - 2);
    g.onFrame(() => {
      if (g.missions.state !== 'running' || g.missions.stageI !== 0) return;
      const p = g.player, st = g.missions.stage;
      if (st.got !== ap.got) { ap.got = st.got; ap.log.push(`bottle ${st.got} t=${ap.t.toFixed(1)} z=${p.z.toFixed(1)} trolley=${tr.z.toFixed(1)}`); }
      if (ap.aside) {
        if (!c.turbulent || tr.z < ap.aside.z - 1.6) ap.aside = null;
        else { ap.pts = [[3000.95, ap.aside.z]]; ap.i = 0; ap.r = 0.2; return; }
      }
      if (c.turbulent && !c.trolleyStopped && tr.z > p.z && tr.z - p.z < 3.5) {
        let z = null;
        for (const r of ROWS_FREE) { const q = rowZ(r) - 0.22; if (q < tr.z - 1.2 && (z == null || Math.abs(q - p.z) < Math.abs(z - p.z))) z = q; }
        if (z != null) { ap.aside = { z }; ap.log.push(`aside t=${ap.t.toFixed(1)}`); return; }
      }
      // Keep clear of the trolley's front: a moving trolley bowls a standing player within 0.95 m
      // of its centre (cabin.js), and one stopped to serve sets off again after 3 s. A bottle at it
      // or beyond it rolls out from under it towards the player (collect's roll rule), so the
      // player waits for it in the aisle out of reach (2.4 m from a moving trolley, 1.7 m from a
      // stopped one) and takes any bottle on his side first. (Phase 2–3 r1 dodged into the nearest
      // free row instead and stood there until the trolley had passed: up to 18 s behind three
      // serve stops while the bottle rolled past him, which made the stage bimodal.)
      const ahead = tr.z > p.z - 0.5 && Math.abs(tr.x - 3000) < 0.6;
      const limit = ahead ? tr.z - (c.trolleyStopped ? 1.7 : 2.4) : Infinity;
      let b = null, bd = 1e9, near = null, nd = 1e9;
      for (const e of st.list) {
        if (!e.alive) continue;
        const d = Math.abs(e.pz - p.z);
        if (d < nd) { nd = d; near = e; }
        if (e.pz <= limit && d < bd) { bd = d; b = e; }
      }
      if (!near) return;
      const wait = !b;
      if (wait && !ap.waiting) { ap.waits++; ap.log.push(`wait t=${ap.t.toFixed(1)}`); }
      ap.waiting = wait;
      ap.pts = [[3000, wait ? limit : b.pz]]; ap.i = 0; ap.r = wait ? 0.2 : 0.3;
    });
  }, !!process.env.DEBUG_SPRIT);
  await T.until(() => __game.missions.stageI >= 1 || __game.missions.state !== 'running', 120000);
  const s0 = await apState(T);
  const stats = await T.ev(() => ({ bowled: __game.cabin.stats.bowled, falls: __game.cabin.stats.falls }));
  const full = await T.ev(() => window.__fap.log);
  T.log(`sprit: bottles done in ${s0.t} s; fear max ${s0.maxV}; panics ${s0.panics}; bowled ${stats.bowled}, falls ${stats.falls}`, JSON.stringify(full));
  return { t: s0.t, panics: s0.panics, clean: !stats.bowled && !stats.falls, shipped };
}

// ---- mission 5 landning: round-up, back to the seat, the approach ------------------------------
async function landning(T, variant) {
  await T.fresh('&mission=4&ts=1');
  await install(T);
  await T.startMission();
  await resetMeters(T);
  const timers = await T.ev(() => __game.missions.stage.o.timer);
  const careful = variant !== 'careless';
  await T.ev((c) => { window.__fap.autoSpace = c; }, careful);
  // Nearest neighbour from row 16: José (-9.2), Berra (-14.4), Herr Storch (3.4); 'reverse' goes
  // forward first and ends at Berra, the far end for the walk back to 14B.
  const order = variant === 'reverse' ? [[W(0.2), 3.4], [W(-0.2), -9.2], [W(0.0), -14.4]] : [[W(-0.2), -9.2], [W(0.0), -14.4], [W(0.2), 3.4]];
  await path(T, order, { r: 0.85 });
  const a = await timeStage(T, 0, 60000);
  T.log(`landning/${variant}: round-up ${a.s.st === 'failed' ? 'FAILED' : `done in ${a.secs} s`} (timer ${timers}); fear ${a.s.v} max ${a.s.maxV}`, JSON.stringify(a.s.log));
  const seatTimer = await T.ev(() => __game.missions.stage?.o?.timer);
  // To the aisle beside 14B (z -2.0), from whichever side he is on (the seat is reached at 1.6 m).
  const aft = await T.ev(() => __game.player.z < -2);
  await path(T, [[W(0.1), aft ? -2.6 : -1.4]], { r: 0.4 });
  const t1 = await stageClock(T);
  await T.until(() => window.__fap.arrivedT != null || __game.missions.state !== 'running', 30000);
  await T.ev(() => __game.sitPlayer('14B'));
  await stageAt(T, 2);
  const back = (await stageClock(T)) - t1;
  const s1 = await apState(T);
  T.log(`landning/${variant}: back in 14B after ${back.toFixed(2)} s (timer ${seatTimer}); fear ${s1.v}`);
  // The approach: careful holds J from the start; careless only once the shaking is over.
  if (careful) await T.ev(() => { window.__fap.mantraForce = true; });
  else await T.ev(() => { const ap = window.__fap, g = __game; g.onFrame(() => { ap.mantraForce = g.missions.stageI === 2 && !g.cabin.turbulent && g.cabin.phase !== 'cruise'; }); });
  await T.until(() => __game.missions.state !== 'running', 90000).catch(() => {});
  const s2 = await apState(T);
  T.log(`landning/${variant}: mission ${s2.st}; panics ${s2.panics}; max fear ${s2.maxV}`, JSON.stringify(s2.log));
  return { roundup: a.secs, back, panics: s2.panics, state: s2.st, failedRoundup: a.s.st === 'failed' };
}

export const SCENARIOS = {
  async calibflight(T) {
    const res = {};
    if (want('gate/sprint')) res.gateSprint = await gate(T, 'sprint');
    if (want('gate/walk')) res.gateWalk = await gate(T, 'walk');
    if (want('gate/dawdle')) res.gateDawdle = await gate(T, 'dawdle');
    if (want('ombord/careful')) res.ombordCareful = await ombord(T, 'careful');
    if (want('ombord/walk')) res.ombordWalk = await ombord(T, 'walk');
    if (want('ombord/careless')) res.ombordCareless = await ombord(T, 'careless');
    if (want('sprit')) {
      const runs = [];
      for (let k = 0; k < +(process.env.SPRIT_RUNS || 5); k++) runs.push(await sprit(T));
      res.sprit = runs;
    }
    if (want('landning/careful')) res.landCareful = await landning(T, 'careful');
    if (want('landning/reverse')) res.landReverse = await landning(T, 'reverse');
    if (want('landning/careless')) res.landCareless = await landning(T, 'careless');

    // ---- the table and the rules ----------------------------------------------------------------
    if (res.gateSprint) {
      const g = res.gateSprint;
      row(T, 'gate[3]', 'toilet dash gateOle -> herrtoa (r 1.8), sprint round the ladies\' room', g.dash, 1, `walk ${res.gateWalk?.dash ?? '-'} s; fear ${g.startFear} -> ${g.endFear}`);
      check(!g.failed && g.panics === 0, 'gate: the careful (sprinting) player makes the dash without panicking');
      if (g.done !== undefined) check(g.done, 'gate: the careful player gets through the mantra stage');
    }
    if (res.gateDawdle) check(res.gateDawdle.panics > 0, 'gate: the careless (dawdling) player panics in the dash');
    if (res.ombordCareful) {
      const o = res.ombordCareful;
      // Targets: the three stowers (E each) and the seat.
      row(T, 'ombord[0]', 'the intro\'s spot at the front door (1.6, 13.55) -> 14B past three stowers (E each), sprint', o.seat, 4, `walk ${res.ombordWalk?.seat?.toFixed(1) ?? '-'} s`);
      check(o.panics === 0 && o.state !== 'failed', 'ombord: the careful player never panics');
    }
    if (res.ombordWalk) check(res.ombordWalk.panics === 0 && res.ombordWalk.state !== 'failed', 'ombord: the careful walker never panics');
    if (res.ombordCareless) check(res.ombordCareless.panics > 0, 'ombord: the careless player (no J) panics in the takeoff');
    if (res.sprit) {
      const ts = res.sprit.map((r) => r.t);
      const p75 = pct(ts, 0.75);
      const { timer } = row(T, 'sprit[0]', `five rolling bottles, sprint, waits clear of the trolley, Space in turbulence (${ts.length} runs, p75: random bottles)`, p75, 5, `runs ${ts.map((t) => t.toFixed(1)).join(' / ')} s; median ${median(ts).toFixed(1)}`);
      // One sample's p75 does not pin a random stage's timer down: the shipped timer against this
      // sample's 90 % bootstrap range (§8; timerRange in lib.mjs).
      const cur = res.sprit[0].shipped, rg = timerRange(ts, (p) => timerFor(p + 0.5 * 5));
      T.log(`CALF CHECK sprit[0]: timer ${timer} s; shipped ${cur} s ${cur === timer ? 'OK' : cur > timer ? 'LOOSER than measured' : 'tighter than measured'}${rg ? `; this sample's 90 % range ${rg[0]}–${rg[1]} s (n ${ts.length}): shipped ${cur >= rg[0] && cur <= rg[1] ? 'inside (consistent)' : 'OUTSIDE (disagrees)'}` : ''}`);
      check(res.sprit.every((r) => r.panics === 0), 'sprit: the careful player never panics');
      // T_ref is a clean run's time: the careful player is never bowled over and never falls.
      check(res.sprit.every((r) => r.clean), `sprit: every run clean (bowled or fell in ${res.sprit.filter((r) => !r.clean).length} of ${res.sprit.length})`);
    }
    if (res.landCareful) {
      const l = res.landCareful;
      const r = res.landReverse || l;
      // Both orders are sensible: the round-up takes the slower, the walk back the far end (Berra).
      row(T, 'landning[0]', 'round-up from row 16, nearest first or forward first (walk; sign lit)', Math.max(l.roundup, r.roundup), 3, `nearest first ${l.roundup} s, forward first ${r.roundup} s`);
      row(T, 'landning[1]', 'back to 14B from the last one rounded up (walk)', Math.max(l.back, r.back), 1, `from Herr Storch ${l.back.toFixed(1)} s, from Berra ${r.back.toFixed(1)} s`);
      check(l.panics === 0 && l.state !== 'failed' && !l.failedRoundup, 'landning: the careful player never panics and lands');
    }
    if (res.landCareless) check(res.landCareless.panics > 0, 'landning: the careless player (no J in the shaking) panics');
    T.log('CALF TABLE id | stage | clean s | T_ref s | timer s | notes');
    for (const r of rows) T.log(`CALF TABLE ${r.id} | ${r.what} | ${r.measured.toFixed(1)} | ${r.tRef.toFixed(1)} | ${r.timer} | ${r.note}`);
    T.log('CALF JSON', JSON.stringify(res));
  },
};
