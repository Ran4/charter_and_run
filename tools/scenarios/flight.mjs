// Flight scenarios (WP-A1, DESIGN §16.4): gate, cabin, trolley, turbulence, panic.
//   gate        the Arlanda set: shots (arch, lounge, toilets, bridge), walls hold, the arch is the
//               only way out of the landside pocket, the kontrollant and gateQueue spots are free
//   cabin       one shot per phase, walls hold, camera above the walls, seated heads clear of the
//               overhead (aisle view and two-shots), row strip, Ole in 14A after ?mission=2 and an
//               outfit swap, the camera at the cabin ends, juice's 14B offered across the aisle
//   trolley     bowling, dodging into a row, waiting for an NPC, manual modes fall back to auto,
//               an excused stower takes his seat, landning parks it in the front galley (a
//               checkpoint retry too)
//   turbulence  unheld falls, held does not; seatbelt sign and drone; a mission-set sign stays lit
//   panic       PANIK in the cabin and at the gate, panicFails in ombord, deferred in dialogue
// Shots go to $OUT (contact sheets: montage … -tile 3x3 -geometry 640x360+4+4).
import { check } from '../lib.mjs';

const X = (lx) => 3000 + lx;

// Put the player at local (lx, z) facing yaw with the camera looking `camYaw`.
async function stand(T, lx, z, yaw, camYaw = yaw) {
  await T.ev((x, z, yaw, cy) => { const g = __game; g.debugWarp(x, z, yaw); g.cam.yaw = cy; g.cam.snapNext = true; }, X(lx), z, yaw, camYaw);
  await T.frames(4);
}
// A fixed overview shot (camera only), then back to the player camera.
async function overview(T, name, pos, look) {
  await T.ev((p, l) => __game.cam.cutTo(p, l), pos, look);
  await T.frames(4);
  await T.shot(name);
  await T.ev(() => __game.cam.release());
}
// In the page: how much of each seated head the cabin's overhead covers from the current camera. A
// 9×9 grid of rays over the head's screen box; a sample that hits the head counts (`seen`), and is
// covered (`occ`) when the first thing in front of it is cabin geometry over head height inside the
// walls (y > 1.9, |lx| < 2.42): racks, rails, service units. The cut-away walls do not count.
async function overhead(T, keys) {
  return T.ev(async (keys) => {
    const THREE = await import('three');
    const g = __game, cam = g.cam.cam, rc = new THREE.Raycaster();
    cam.updateMatrixWorld();
    const roots = [g.player.root, ...Object.values(g.npcs).map((n) => n.root)];
    const own = (o) => { for (; o; o = o.parent) if (roots.includes(o)) return true; return false; };
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const out = {};
    for (const key of keys) {
      const head = (key === 'stig' ? g.player : g.npc(key)).model.head;
      const box = new THREE.Box3().setFromObject(head), c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2;
      let seen = 0, occ = 0;
      const what = new Set();
      for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
        const p = c.clone().addScaledVector(right, (i / 4 - 1) * r).addScaledVector(up, (j / 4 - 1) * r);
        rc.set(cam.position, p.sub(cam.position).normalize());
        rc.far = 40;
        const hh = rc.intersectObject(head, true);
        if (!hh.length) continue;
        seen++;
        const first = rc.intersectObjects(g.scene.children, true).find((h) => h.distance < hh[0].distance - 0.01 && h.object.visible && h.object.name !== 'outline' && !h.object.material?.transparent && !own(h.object));
        if (first && first.point.y > 1.9 && Math.abs(first.point.x - 3000) < 2.42) { occ++; what.add(`y${first.point.y.toFixed(2)}/x${(first.point.x - 3000).toFixed(2)}`); }
      }
      out[key] = { seen, occ, what: [...what].slice(0, 4) };
    }
    return out;
  }, keys);
}

// In the page: flood fill over a 0.25 m grid of spots where a 0.33 m body fits, from `start`
// (local), inside `box` = [x0, x1, z0, z1]; with `forbidArch` the arch corridor is removed.
// Returns the westmost reached x and whether `goal` was reached.
async function reach(T, start, box, forbidArch, goal) {
  return T.ev(async (start, box, forbidArch, goal) => {
    const col = await import('/src/world/collision.js');
    const step = 0.25;
    const free = (x, z) => !col.queryBlocks(x - 0.4, z - 0.4, x + 0.4, z + 0.4, []).some((b) => b.top > 0.6 && col.circleVsBlock(x, z, 0.33, b, {}));
    const nx = Math.round((box[1] - box[0]) / step), nz = Math.round((box[3] - box[2]) / step);
    const seen = new Uint8Array((nx + 1) * (nz + 1));
    const q = [[Math.round((start[0] - box[0]) / step), Math.round((start[1] - box[2]) / step)]];
    let minX = 1e9, reachedGoal = false;
    while (q.length) {
      const [i, j] = q.pop();
      if (i < 0 || j < 0 || i > nx || j > nz) continue;
      const k = i * (nz + 1) + j;
      if (seen[k]) continue;
      seen[k] = 1;
      const lx = box[0] + i * step, z = box[2] + j * step;
      if (forbidArch && lx > 31 && lx < 35 && z > 3.6 && z < 6.4) continue;
      if (!free(3000 + lx, z)) continue;
      minX = Math.min(minX, lx);
      if (goal && Math.hypot(lx - goal[0], z - goal[1]) < 0.4) reachedGoal = true;
      q.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
    }
    return { minX, reachedGoal };
  }, start, box, forbidArch, goal);
}

export const SCENARIOS = {
  // ---------------------------------------------------------------------------------------------
  async gate(T) {
    const ph = await T.ev(() => __game.cabin.phase);
    check(ph === 'gate', `mission 0 boots in phase gate (got ${ph})`);
    // Shots with the play camera.
    await stand(T, 36.5, 5.0, -Math.PI / 2);
    await T.shot('gate_arch');
    await stand(T, 24.0, 10.0, Math.PI, Math.PI * 0.8);
    await T.shot('gate_lounge');
    await stand(T, 33.0, 25.5, Math.PI / 2, Math.PI * 0.35);
    await T.shot('gate_toilet');
    await stand(T, 10.0, 14.7, -Math.PI / 2);
    await T.shot('gate_bridge');
    await stand(T, 18.5, 20.5, -Math.PI / 2, -Math.PI * 0.6);
    await T.shot('gate_desk');
    // Overviews (camera only).
    await overview(T, 'gate_overview', { x: X(44), y: 30, z: -8 }, { x: X(22), y: 0, z: 14 });
    await overview(T, 'gate_ladies', { x: X(27), y: 10, z: 17.5 }, { x: X(34), y: 0, z: 18.5 });
    await overview(T, 'gate_plane', { x: X(22), y: 9, z: 4 }, { x: X(2), y: 1, z: 14 });
    // Every gate wall holds for 2 s of walking into it.
    const walls = [
      [15.0, 5.0, -Math.PI / 2, 'window wall'], [15.0, 22.0, -Math.PI / 2, 'window wall north'],
      [20.0, 1.0, Math.PI, 'south wall'], [20.0, 29.0, 0, 'north wall'], [37.0, 5.0, Math.PI / 2, 'east wall (pocket)'],
      [37.0, 9.0, 0, 'pocket partition'], [36.0, 25.0, Math.PI / 2, 'east wall (men)'], [33.0, 23.5, Math.PI, 'men south wall'],
      [31.5, 28.5, -Math.PI / 2, 'men west wall'], [28.5, 18.4, Math.PI / 2, 'ladies door'], [8.0, 14.7, 0, 'bridge north'],
      [8.0, 14.7, Math.PI, 'bridge south'], [36.0, 2.0, -Math.PI / 2, 'barrier'], [20.0, 9.5, Math.PI, 'bench'],
    ];
    for (const [lx, z, yaw, name] of walls) {
      await stand(T, lx, z, yaw);
      await T.hold(['KeyW'], 2000);
      const r = await T.ev(() => { const g = __game, p = g.player; return { inside: g.cabin.inside(p.x, p.z), x: +(p.x - 3000).toFixed(2), z: +p.z.toFixed(2) }; });
      T.log('gate wall', name, JSON.stringify(r));
      check(r.inside, `still inside after walking into the ${name}`);
    }
    // Out of the bridge through the open door into the cabin: inside all the way.
    await stand(T, 5.0, 14.7, -Math.PI / 2);
    await T.hold(['KeyW'], 2500);
    const intoCabin = await T.ev(() => { const g = __game, p = g.player; return { inside: g.cabin.inside(p.x, p.z), inCabin: g.cabin.inCabin(p.x, p.z), x: +(p.x - 3000).toFixed(2) }; });
    T.log('bridge -> cabin', JSON.stringify(intoCabin));
    check(intoCabin.inside && intoCabin.inCabin, 'walked from the bridge into the cabin');
    // The landside pocket: with the arch corridor removed nothing west of x 30 is reachable; with
    // it, the lounge is.
    const blocked = await reach(T, [36.5, 5.0], [13.0, 39.0, -1.0, 31.0], true, [22.0, 16.0]);
    const open = await reach(T, [36.5, 5.0], [13.0, 39.0, -1.0, 31.0], false, [22.0, 16.0]);
    T.log('pocket', JSON.stringify({ blocked, open }));
    check(!blocked.reachedGoal && blocked.minX > 30, 'the arch is the only way out of the landside pocket');
    check(open.reachedGoal, 'through the arch the lounge is reachable');
    // The kontrollant and the gateQueue approach spot are not inside a solid.
    const spots = await T.ev(async () => {
      const col = await import('/src/world/collision.js');
      const g = __game;
      const free = (x, z) => !col.queryBlocks(x - 0.4, z - 0.4, x + 0.4, z + 0.4, []).some((b) => b.top > 0.6 && col.circleVsBlock(x, z, 0.3, b, {}));
      const k = g.npc('kontrollant'), q = g.approachSpot('gateQueue');
      return { kontrollant: free(k.x, k.z) && k.state !== 'hidden', queue: free(q.x, q.z), kx: +(k.x - 3000).toFixed(2), kz: +k.z.toFixed(2), qx: +(q.x - 3000).toFixed(2), qz: +q.z.toFixed(2) };
    });
    T.log('spots', JSON.stringify(spots));
    check(spots.kontrollant, 'kontrollant stands on free floor');
    check(spots.queue, 'the gateQueue approach spot is free');
  },

  // ---------------------------------------------------------------------------------------------
  async cabin(T) {
    await T.fresh('&mission=2');
    // Ole is in 14A after boot and after an outfit swap.
    const ole = async () => T.ev(() => {
      const g = __game, n = g.npc('ole'), s = g.cabin.seats['14A'];
      const v = n.root.getWorldPosition(n.root.position.clone());
      return { seat: g.cabin.seatOf(n), d: +Math.hypot(v.x - s.x, v.z - s.z).toFixed(2) };
    });
    const o1 = await ole();
    await T.ev(() => __game.setNpcOutfit('ole', 'flyg'));
    await T.frames(3);
    const o2 = await ole();
    T.log('ole', JSON.stringify({ o1, o2 }));
    check(o1.seat === '14A' && o1.d < 0.5 && o2.seat === '14A' && o2.d < 0.5, 'Ole in 14A (boot and after setNpcOutfit)');
    // One shot per phase (from the default spawn view).
    for (const ph of ['gate', 'takeoff', 'climb', 'cruise', 'approach', 'landing', 'landed']) {
      await T.ev((ph) => __game.cabin.setPhase(ph, { instant: true, hold: true }), ph);
      await T.frames(10);
      await T.shot('cabin_' + ph);
    }
    await T.ev(() => __game.cabin.setPhase('cruise', { instant: true }));
    await stand(T, 0, 8.0, Math.PI, Math.PI);
    await T.shot('cabin_aisle_aft');
    await stand(T, 0, -8.0, 0, 0);
    await T.shot('cabin_aisle_fwd');
    // Seated faces clear of the overhead (§5.3: racks and service units are down-facing planes): no
    // rack, rail or service unit between the camera and any part of a seated head, from the default
    // camera beside row 14 and from the seat-mates' dialogue two-shots.
    await stand(T, 0.25, -2.1, Math.PI / 2, Math.PI / 2);
    await T.frames(6);
    const over = {};
    over.aisle = await overhead(T, ['ole', 'majsan', 'siv', 'jose']);
    await T.shot('cabin_row14');
    await T.ev(() => { const g = __game; g.sitPlayer('14B'); g.cinematic(g.npc('ole'), g.player); g.cam.snapNext = true; });
    await T.frames(10);
    over.row14 = await overhead(T, ['ole', 'stig']);
    await T.shot('cabin_frame_row14');
    await T.ev(() => { const g = __game; g.endCinematic(); g.cinematic(g.npc('majsan'), g.npc('siv')); g.cam.snapNext = true; });
    await T.frames(10);
    over.row16 = await overhead(T, ['majsan', 'siv']);
    await T.shot('cabin_frame_row16');
    await T.ev(() => { const g = __game; g.endCinematic(); g.standPlayer(); });
    T.log('overhead over seated heads', JSON.stringify(over));
    for (const [view, r] of Object.entries(over)) for (const [key, v] of Object.entries(r)) check(v.seen > 4 && v.occ === 0, `${key}'s head is clear of the overhead (${view}: ${v.occ} of ${v.seen} samples behind ${v.what.join(' ')})`);
    // The row-number strip "…11 12 14 15…".
    await overview(T, 'cabin_strip', { x: X(-1.0), y: 2.4, z: -0.8 }, { x: X(2.45), y: 1.6, z: -0.8 });
    await overview(T, 'cabin_cutaway', { x: X(-9), y: 11, z: -24 }, { x: X(0), y: 0, z: -4 });
    // Walk into each cabin wall for 2 s: still inside, camera above the walls.
    for (const [yaw, key] of [[Math.PI / 2, 'port'], [-Math.PI / 2, 'starboard'], [0, 'nose'], [Math.PI, 'tail']]) {
      await T.ev((yaw) => { const g = __game; const s = window.__lm('cabinCentre'); g.debugWarp(s.x, s.z - 0.6, yaw); g.cam.yaw = yaw; }, yaw);
      await T.hold(['KeyW'], 2000);
      const r = await T.ev(() => { const g = __game, p = g.player; return { inside: g.cabin.inCabin(p.x, p.z), camY: g.cam.cam.position.y, x: p.x.toFixed(2), z: p.z.toFixed(2) }; });
      T.log('wall', key, JSON.stringify(r));
      check(r.inside, `still inside after walking ${key}`);
      check(r.camY > 4, 'camera above the walls');
    }
    // The cabin ends facing the nose: the eye stays in the cabin's z range, above the walls, and no
    // airframe mesh sits between the camera and the player.
    for (const lm of ['galleyBack', 'toiletBackL']) {
      await T.ev((lm) => { const g = __game, l = window.__lm(lm); g.debugWarp(l.x, l.z, 0); g.cam.yaw = 0; g.cam.pitch = 0.9; g.cam.snapNext = true; }, lm);
      await T.frames(20);
      const r = await T.ev(async () => {
        const THREE = await import('three');
        const g = __game, cam = g.cam.cam, p = g.player;
        const to = new THREE.Vector3(p.x, p.y + 1.0, p.z);
        const dir = to.clone().sub(cam.position);
        const rc = new THREE.Raycaster(cam.position.clone(), dir.clone().normalize(), 0, dir.length());
        const hits = rc.intersectObject(g.cabin.scenery.airframe, true).filter((h) => h.object.visible);
        return { camY: +cam.position.y.toFixed(2), camZ: +cam.position.z.toFixed(2), hits: hits.length };
      });
      T.log('end view', lm, JSON.stringify(r));
      check(r.hits === 0, `no airframe between camera and player at ${lm}`);
      check(r.camY > 4 && r.camZ >= -19.3, `camera inside the cabin and above the walls at ${lm}`);
      await T.shot('cabin_end_' + lm);
    }
    // The stage's seat across its row (§5.10): juice [0] names 14B, and from the D half of the aisle
    // (14B 1.7-1.8 m off) E offers 14B, not 14D (Phase 3 r3: "Res dig" from 14D put him back where E
    // offered 14D again, while the objective said "Sätt dig på 14B!").
    await T.fresh('&mission=2');
    await T.startMission();
    await T.until(() => __game.missions.state === 'running' && !__game.inDialog, 60000);
    for (const [lx, yaw] of [[-0.3, Math.PI / 2], [-0.3, -Math.PI / 2], [-0.2, Math.PI], [0.25, Math.PI / 2]]) {
      await T.ev((x, yaw) => __game.debugWarp(x, -2.1, yaw), X(lx), yaw);
      await T.frames(3);
      const r = await T.ev(() => { const g = __game, it = g.nearestInteractable(); return { best: g.cabin.bestSeat(g)?.id ?? null, it: it?.it?.id ?? null }; });
      T.log('juice seat prompt', lx, yaw.toFixed(2), JSON.stringify(r));
      check(r.best === '14B' && r.it === 'seat:14B', `juice [0]: E offers 14B from the aisle at x ${lx} (got ${r.it})`);
    }
    await T.ev((x) => __game.debugWarp(x, -2.1, Math.PI / 2), X(-0.3));
    await T.frames(3);
    await T.tap('KeyE');
    await T.frames(6);
    const sat = await T.ev(() => __game.player.seatId);
    check(sat === '14B', `juice [0]: E from the D half of the aisle seats him in 14B (got ${sat})`);
  },

  // ---------------------------------------------------------------------------------------------
  async trolley(T) {
    await T.fresh('&mission=2');
    // No idle turbulence during this test (its jolts would shove him out of the dodge row).
    await T.ev(() => { const c = __game.cabin; c.setPhase('cruise', { instant: true }); c._idleTurbT = 1e9; });
    // Stand in the aisle ahead of it until it bowls him over.
    const v0 = await T.ev(() => { const g = __game; g.cabin.trolley.place(3000, 16.2, Math.PI); g.cabin._t.wait = 0; g.cabin._t.stopAt = null; g.cabin.startTrolley(); return g.shame.v; });
    await stand(T, 0, 7.0, 0, Math.PI);
    await T.until(() => __game.cabin.stats.bowled >= 1, 40000);
    await T.frames(2);
    await T.shot('trolley_bowl');
    const b = await T.ev(() => { const g = __game, t = g.cabin.trolley; return { bowled: g.cabin.stats.bowled, v: g.shame.v, tz: t.z, tx: t.x, nan: !Number.isFinite(t.x + t.z + g.player.x + g.player.z) }; });
    T.log('bowled', JSON.stringify(b), 'fear before', v0);
    check(b.bowled >= 1 && b.v > v0 && !b.nan, 'the trolley bowls a standing player over; fear rose; no NaN');
    // Dodge: step into the leg room of a free row ahead of it; it rolls past without a bowl.
    await T.ev(() => { const g = __game; g.cabin.stopTrolley(); g.shame.v = 0; });
    await T.until(() => __game.player.state === 'normal', 8000);
    const dodge = await T.ev(() => {
      const g = __game, rz = (r) => 12.4 - 1.2 * (r <= 12 ? r - 1 : r - 2), c = g.cabin;
      c.trolley.place(3000, 16.2, Math.PI); c._t.wait = 0; c._t.pauseT = 0; c._t.stopAt = null;
      const row = 8;
      g.debugWarp(3001.0, rz(row) + 0.31, Math.PI / 2);
      c.startTrolley();
      return { row, z: rz(row) + 0.31, bowled: c.stats.bowled };
    });
    await T.until((z) => __game.cabin.trolley.z < z + 1.6, 30000, dodge.z);
    await T.shot('trolley_dodge');
    await T.until((z) => __game.cabin.trolley.z < z - 1.5 || __game.cabin.trolley.z > 16, 40000, dodge.z);
    const after = await T.ev(() => ({ bowled: __game.cabin.stats.bowled, state: __game.player.state }));
    T.log('dodge', JSON.stringify({ dodge, after }));
    check(after.bowled === dodge.bowled && after.state === 'normal', 'stepping into a row lets the trolley pass');
    // An NPC standing in the aisle makes it wait (not shoved): the row-3 stower.
    await T.ev(() => { const g = __game; g.debugWarp(3001.0, -6, 0); g.cabin.setAisleBlockers(true); g.cabin.trolley.place(3000, 16.2, Math.PI); g.cabin._t.wait = 0; g.cabin._t.stopAt = null; g.cabin.startTrolley(); });
    const bz = await T.ev(() => __game.cabin.blockers[0].z);
    await T.until((bz) => __game.cabin.trolley.z - bz < 2.0, 30000, bz);
    await T.sleep(4000);
    const w = await T.ev(() => { const c = __game.cabin, bl = c.blockers[0]; return { gap: +(c.trolley.z - 0.425 - bl.z).toFixed(2), bz: bl.z, stopped: c.trolleyStopped }; });
    T.log('waits', JSON.stringify(w));
    await T.shot('trolley_waits');
    check(w.gap > 0.3 && Math.abs(w.bz - bz) < 0.01 && w.stopped, 'the trolley waits behind a standing NPC');
    // The stowers: "Ursäkta!" seats him in his dodge row; the player cannot sit on him.
    const st = await T.ev(() => {
      const g = __game, c = g.cabin, ch = c.blockers[1];
      c._excuseBlocker(ch, 8, g);
      const seat = c.seats[ch.seatId];
      g.debugWarp(3000, seat.z + 0.6, Math.PI);
      const ok = g.sitPlayer(seat.id);
      return { seat: ch.seatId, taken: seat.taken, playerSat: ok, state: ch.state };
    });
    T.log('stower', JSON.stringify(st));
    check(st.seat && st.taken === 'blocker1' && st.playerSat === false && st.state === 'seated', 'an excused stower takes his seat');
    await T.shot('trolley_stower');
    await T.ev(() => __game.cabin.setAisleBlockers(false));
    // Manual modes belong to the mission run that set them: after an abort it is 'auto' again.
    await T.startMission();
    await T.ev(() => __game.cue({ trolley: false }));
    const during = await T.ev(() => __game.cabin._t.mode);
    await T.ev(() => __game.missions.abort());
    await T.frames(5);
    const mode = await T.ev(() => __game.cabin._t.mode);
    T.log('mode after abort', during, '->', mode);
    check(during === 'stop' && mode === 'auto', 'a cue stopTrolley falls back to auto when the mission ends');
    // Phase 3 r3: landning's round-up parks it in the front galley (`trolley: 'park'`; `false`
    // froze it where the intro had caught it, mid-aisle between Stig and a standing passenger), and
    // a checkpoint retry re-parks it under the retried run (re-applied on the failed run's `m`, the
    // stop fell back to auto at once and it set off down the aisle in the 14B dash).
    await T.fresh('&mission=4');
    // The auto trolley on its way to row 19 (aft of the giver's row 16) when the talk starts.
    await T.ev(() => {
      const g = __game, c = g.cabin;
      c._idleTurbT = 1e9; g.sitPlayer('14B'); c.trolley.place(3000, -5.5, Math.PI); Object.assign(c._t, { wait: 0, pauseT: 0, stopAt: -8.0, stopRow: 19 });
      window.__caught = null;
      g.onFrame(() => { if (g.missions.state === 'intro' && window.__caught === null) window.__caught = c.trolley.z; });
    });
    await T.startMission();
    const caught = await T.ev(() => window.__caught);
    await T.sleep(1500);
    const tr = () => T.ev(() => { const c = __game.cabin; return { z: +c.trolley.z.toFixed(2), mode: c._t.mode, running: c._t.running, stage: __game.missions.stageI, st: __game.missions.state }; });
    const parked = await tr();
    await T.ev(() => { const m = __game.missions; m.stage.update = () => 'done'; });
    await T.until(() => __game.missions.stageI >= 1, 5000);
    await T.ev(() => __game.missions.fail('test'));
    await T.sleep(1000);
    await T.ev(() => __game.missions.retry());
    await T.sleep(2500);
    const retried = await tr();
    T.log('landning trolley', JSON.stringify({ caught: caught == null ? null : +caught.toFixed(2), parked, retried }));
    await T.ev(() => __game.missions.abort());
    check(caught < -5.5 && caught > -8.5 && Math.abs(parked.z - 16.2) < 0.05 && parked.mode === 'stop' && parked.stage === 0, 'landning\'s round-up has the trolley parked in the front galley, not frozen mid-aisle');
    check(retried.stage === 1 && retried.st === 'running' && Math.abs(retried.z - 16.2) < 0.05 && retried.mode === 'stop' && !retried.running, 'a landning checkpoint retry keeps it parked (the ambient cue belongs to the retried run)');
  },

  // ---------------------------------------------------------------------------------------------
  async turbulence(T) {
    await T.fresh('&mission=3');
    await T.ev(() => { const g = __game; g.cabin.setPhase('cruise', { instant: true }); g.cabin.stopTrolley(); g.cabin.trolley.place(3000, 16.2, Math.PI); });
    await stand(T, 0, 4.0, 0, 0);
    const drone = () => T.ev(async () => (await import('/src/audio.js')).audio._drone?.[0] ?? -1);
    const before = await T.ev(() => ({ belt: __game.cabin.seatbelt, falls: __game.cabin.stats.falls }));
    const d0 = await drone();
    await T.ev(() => __game.cabin.turbulence(0.8, 6));
    await T.until(() => __game.cabin.turbulent, 5000);
    await T.until(() => __game.cabin.stats.jolts >= 2, 8000);
    const d1 = await drone();
    await T.shot('turbulence_unheld');
    await T.until(() => !__game.cabin.turbulent, 10000);
    const unheld = await T.ev(() => ({ falls: __game.cabin.stats.falls, belt: __game.cabin.seatbelt }));
    await T.until(() => !__game.cabin._turb, 6000);
    const beltAfter = await T.ev(() => __game.cabin.seatbelt);
    const d2 = await drone();
    T.log('unheld', JSON.stringify({ before, unheld, beltAfter, drone: [d0, d1, d2] }));
    check(unheld.falls >= before.falls + 1, 'standing, not holding: he falls');
    check(!before.belt && unheld.belt && !beltAfter, 'the sign lights for the turbulence and goes off after it');
    check(Math.abs(d1 - d0 * 1.3) < 0.01 && Math.abs(d2 - d0) < 0.01, 'the drone rises by 30 % while it shakes');
    // Holding Space: no fall. A mission-set sign stays on afterwards.
    await T.until(() => __game.player.state === 'normal', 8000);
    await stand(T, 0, 4.0, 0, 0);
    const f0 = await T.ev(() => { const g = __game; g.cabin.setSeatbelt(true); g.cabin.turbulence(0.8, 6); return g.cabin.stats.falls; });
    await T.page.keyboard.down('Space');
    try {
      await T.until(() => __game.cabin.turbulent, 5000);
      await T.until((n) => __game.cabin.stats.jolts >= n, 9000, (await T.ev(() => __game.cabin.stats.jolts)) + 3);
      await T.shot('turbulence_held');
      await T.until(() => !__game.cabin._turb, 15000);
    } finally { await T.page.keyboard.up('Space'); }
    const held = await T.ev(() => ({ falls: __game.cabin.stats.falls, belt: __game.cabin.seatbelt, state: __game.player.state }));
    T.log('held', JSON.stringify({ f0, held }));
    check(held.falls === f0, 'holding Space: no fall');
    check(held.belt, 'a mission-set sign stays lit after the turbulence');
    // Seated: jolts add fear; the busts bob.
    await T.ev(() => { const g = __game; g.cabin.setSeatbelt(false); g.sitPlayer('14B'); g.cabin.turbulence(0.6, 4); });
    const j0 = await T.ev(() => __game.cabin.stats.jolts);
    await T.until((n) => __game.cabin.stats.jolts >= n, 9000, j0 + 2);
    await T.shot('turbulence_seated');
  },

  // ---------------------------------------------------------------------------------------------
  // Review shots (not part of the §16.4 table): door to the bridge, the lit seatbelt sign, the
  // trolley serving, aisle walkers, the big map in both plans, render stats.
  async flightshots(T) {
    await T.fresh('&mission=1');
    const stats = async (what) => T.log('stats', what, JSON.stringify(await T.ev(() => window.__stats())));
    await stand(T, 0.8, 14.7, Math.PI / 2, Math.PI / 2);
    await T.shot('fs_door_bridge');
    await stats('gate phase, cabin door');
    T.log('heaviest meshes', JSON.stringify(await T.ev(() => {
      const out = [];
      __game.scene.traverse((o) => { if (o.isMesh && o.geometry) { const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); const p = new o.position.constructor(); o.getWorldPosition(p); out.push([o.name || o.parent?.name || o.type, Math.round(n), Math.round(p.x), Math.round(g.boundingSphere?.center.x ?? 0)]); } });
      return out.sort((a, b) => b[1] - a[1]).slice(0, 14);
    })));
    await T.tap('KeyM');
    await T.frames(4);
    await T.shot('fs_map_gate');
    await T.tap('KeyM');
    await T.ev(() => __game.cabin.setAisleBlockers(true));
    await stand(T, 0, 12.6, Math.PI, Math.PI);
    await T.shot('fs_stowers');
    await T.ev(() => __game.cabin.setAisleBlockers(false));
    await T.ev(() => { const g = __game; g.cabin.setPhase('takeoff', { instant: true, hold: true }); g.cabin.setSeatbelt(true); });
    await stand(T, 0, 9.0, 0, 0);
    await T.shot('fs_belt_sign');
    await T.ev(() => { const g = __game; g.cabin.setSeatbelt(false); g.cabin.setPhase('climb', { instant: true, hold: true }); });
    await stand(T, 0.25, -2.1, Math.PI / 2, Math.PI / 2);
    await T.shot('fs_climb');
    await T.fresh('&mission=2');
    await T.ev(() => { const g = __game; g.cabin.setPhase('cruise', { instant: true }); g.cabin.trolley.place(3000, 16.2, Math.PI); g.cabin._t.wait = 0; g.cabin._t.stopAt = null; g.cabin.startTrolley(); });
    await stand(T, 1.0, 12.4 - 1.2 * 7 + 0.31, -Math.PI / 2, Math.PI);
    await T.until(() => __game.cabin._t.serving, 30000);
    await T.frames(10);
    await T.shot('fs_trolley_serving');
    { const tz = await T.ev(() => __game.cabin.trolley.z); await overview(T, 'fs_trolley_close', { x: X(-1.6), y: 3.2, z: tz - 2.6 }, { x: X(0), y: 0.9, z: tz + 0.3 }); }
    await stats('cruise, trolley');
    await T.tap('KeyM');
    await T.frames(4);
    await T.shot('fs_map_cabin');
    await T.tap('KeyM');
    // Walkers: wait until one is up and about.
    await T.ev(() => { const g = __game; g.cabin.stopTrolley(); for (const w of g.cabin.walkers) w.t = Math.min(w.t, 1); });
    await T.until(() => __game.cabin.walkers.some((w) => w.mode === 'walk' || w.mode === 'dodge'), 20000);
    const wz = await T.ev(() => { const w = __game.cabin.walkers.find((v) => v.mode === 'walk' || v.mode === 'dodge'); return { z: w.ch.z, goal: w.goal?.z }; });
    const up = wz.goal > wz.z;
    await stand(T, 0, up ? wz.z + 3.5 : wz.z - 3.5, up ? Math.PI : 0, up ? Math.PI : 0);
    await T.until(() => __game.cabin.walkers.some((w) => w.mode === 'dodge'), 15000).catch(() => {});
    await T.frames(20);
    await T.shot('fs_walker');
    T.log('walkers', JSON.stringify(await T.ev(() => __game.cabin.walkers.map((w) => [w.mode, +(w.ch.x - 3000).toFixed(2), +w.ch.z.toFixed(2)]))));
  },

  // ---------------------------------------------------------------------------------------------
  async panic(T) {
    await T.fresh('&mission=2');
    await T.ev(() => { const g = __game; g.cabin.setPhase('cruise', { instant: true }); g.cabin.stopTrolley(); });
    // In the cabin, no mission running: back in 14B, -50 pta, meter at 40.
    await stand(T, 0, 6.0, 0, 0);
    await T.frames(10);
    await T.ev(() => { const g = __game; g.addCoins(100 - g.coins); g.shame.add(100, { force: true }); });
    await T.frames(5);
    await T.shot('panic_cabin');
    await T.until(() => __game.player.seatId === '14B', 8000);
    const r1 = await T.ev(() => ({ seat: __game.player.seatId, coins: __game.coins, v: Math.round(__game.shame.v) }));
    T.log('panic in cabin', JSON.stringify(r1));
    check(r1.seat === '14B' && r1.coins === 50 && r1.v <= 40 && r1.v >= 36, 'PANIK in the cabin: seated in 14B, coins 50, meter 40 (minus seated relief)');
    // In the lounge (gate phase): to gateOle with the gate toast.
    await T.fresh('');
    await stand(T, 22.0, 16.0, 0, 0);
    await T.ev(() => { const g = __game; g.addCoins(100); g.shame.add(100, { force: true }); });
    await T.until(() => { const g = __game, l = window.__lm('gateOle'); return Math.hypot(g.player.x - l.x, g.player.z - l.z) < 2.2; }, 8000);
    const toast = await T.ev(() => document.getElementById('hud').innerText);
    T.log('panic at the gate', /gate 8/i.test(toast) ? 'gate toast' : toast.slice(0, 200));
    check(/gate 8/i.test(toast), 'gate panic toast');
    await T.shot('panic_gate');
    // During ombord's takeoff timeline (panicFails): the mission fails with the panic text.
    await T.fresh('&mission=1');
    await T.startMission();
    await T.sit('14B');
    await T.until(() => __game.missions.stageI >= 1, 15000);
    await T.ev(() => __game.shame.add(100, { force: true }));
    await T.until(() => __game.missions.state === 'failed', 10000);
    const failText = await T.ev(() => document.getElementById('hud').innerText);
    T.log('ombord fail', /fick panik/i.test(failText));
    check(/fick panik/i.test(failText), 'ombord fails with the panic text');
    await T.shot('panic_fail');
    await T.ev(() => __game.missions.abort());
    // PANIK during a scene is deferred until it ends.
    await T.fresh('&mission=2');
    await T.ev(() => { const g = __game; g.cabin.setPhase('cruise', { instant: true }); g.cabin.stopTrolley(); g.debugWarp(3000, 4, 0); });
    await T.ev(() => { __game.dialog([['ole', 'Du vet vel at det er 50 prosent sjanse å overleve en flyulykke.'], ['stig', 'Nej…'], ['ole', 'Det er farligere å kjøre bil enn å fly.']]); });
    await T.until(() => __game.inDialog, 3000);
    await T.ev(() => __game.shame.add(100, { force: true }));
    await T.frames(5);
    const mid = await T.ev(() => ({ v: __game.shame.v, panicT: __game.shame.panicT, inDialog: __game.inDialog }));
    await T.until(() => !__game.inDialog, 20000);
    const fired = await T.until(() => __game.shame.panicT > 0 || __game.player.seatId === '14B', 5000).then(() => true, () => false);
    T.log('deferred', JSON.stringify({ mid, fired }));
    check(mid.inDialog && mid.v <= 95 && mid.panicT === 0, 'no PANIK in the middle of a scene');
    check(fired, 'the deferred PANIK fires when the scene ends');
  },
};
