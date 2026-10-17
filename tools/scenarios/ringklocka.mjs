// Ringklockan i receptionen – "Och när ska vi lämna rummen?" (free roam, DESIGN §10.37; feature 59):
// ringklocka, ringshots.
//   ringklocka: at index 7 (free roam, Ole the giver at `flamenco`) the queue is out once Stig is away
//               with the desk out of view (not while he looks at its spots): three tourists (no locals)
//               on their spots, each facing the one ahead, the first the porter; a suitcase at each
//               one's right hand, solid (Stig walks into one and stops), the guests counted as people.
//               The bell's mesh on the desk. Its prompt "Plinga på klockan" at the bell, none 2 m off,
//               the toaster's in front of the toaster beside it, none with the porter away, none in a
//               pursuit. Through a pling's rest and the call E stays the bell's (no prompt in the call). Plings 1–9: the pling sound, "*pling*"
//               over the bell, Stig's hand on it (`tap`) and the porter's "Momento."; E again within
//               `rest` s is no pling. The 10th: no "Momento.", the porter (posed) turns his back and
//               the phone rings, Lasse in the radio box "Klockan 12. Ställ väskorna utanför
//               receptionen.", the first guest's "Och när ska vi lämna rummen?" with the radio still
//               up, Stig's "Förlåt…", the porter turned to the bell and the bell gone under the desk;
//               no prompt there. Stig 25 m off with the desk out of view: the bell back with the card
//               (PLINGA EN GÅNG · TOQUE UNA VEZ) beside it, and the prompt; the count from 0 again.
//               By the desk a guest asks now and then and the porter answers "Momento." A kick bowls
//               a guest over (SKANDAL up) and he walks back to his spot. A mission start: the queue,
//               its solids and the card gone at once, the bell on the desk, no prompt; the flight
//               level: inert.
//   ringshots:  the queue from the porch, the bell's prompt, a pling from the side (the hand on the
//               bell, "*pling*", "Momento."), the 10th's radio box with the guest's question, the empty
//               desk, the bell back with the card, and the queue from the sketch's angle.
import { check } from '../lib.mjs';

const PI = Math.PI;
const near = (T) => T.ev(() => { const it = __game.nearestInteractable(); return it ? (it.type === 'it' ? it.it.id : it.type) : null; });
const prompt = (T) => T.ev(() => document.getElementById('prompt')?.classList.contains('show') ? document.getElementById('prompt').textContent : '');
// Stig at block-local (x, z) of Hotel Flamenco's block, facing yaw, the camera behind him (or `cam`).
async function stand(T, x, z, yaw, cam = yaw) {
  await T.ev((x, z, yaw, cam) => {
    const g = __game, B = g.bell, p = g.player;
    if (g.playerCar) g.exitCar(true);
    p.state = 'normal';
    p.teleport(B.ox + x, B.oz + z, yaw);
    p.wishX = p.wishZ = 0;
    g.cam.yaw = cam; g.cam.snapNext = true;
  }, x, z, yaw, cam);
  await T.frames(6);
}
// A fixed shot: eye and look in block-local [x, height, z].
async function shotFrom(T, name, eye, look, keep = false) {
  await T.ev((eye, look) => {
    const g = __game, B = g.bell;
    g.cam.cutTo({ x: B.ox + eye[0], y: eye[1], z: B.oz + eye[2] }, { x: B.ox + look[0], y: look[1], z: B.oz + look[2] });
    g.cam.snapNext = true;
  }, eye, look);
  await T.frames(4);
  await T.shot(name);
  if (!keep) await T.ev(() => { __game.cam.release(); __game.cam.snapNext = true; });
}
// Counts the pling and phone sounds and the radio lines; the module's own `said` has the bubbles.
const watch = (T) => T.ev(async () => {
  const g = __game;
  window.__ring = { pling: 0, phone: 0, radio: [] };
  if (window.__ringWrapped) return;
  window.__ringWrapped = true;
  const { audio } = await import('/src/audio.js');
  const p = audio.pling.bind(audio), ph = audio.phone.bind(audio), r = g.radio.bind(g);
  audio.pling = () => { window.__ring.pling++; return p(); };
  audio.phone = () => { window.__ring.phone++; return ph(); };
  g.radio = (who, text) => { window.__ring.radio.push([who, text]); return r(who, text); };
});
const st = (T) => T.ev(() => {
  const g = __game, B = g.bell, n = g.npc('portier'), m = B.bellMesh;
  return { phase: B.phase, count: B.count, signed: B.signed, signOn: B.signOn, card: B.card.visible, bell: m.visible,
    bellAt: [+(m.position.x - B.bellAt.x).toFixed(2), +(m.position.y - B.cfg.top).toFixed(2), +(m.position.z - B.bellAt.z).toFixed(2)],
    shown: B.shown, extras: B.extras.length, posed: g.npcPosed('portier'), porterYaw: +n.yaw.toFixed(2), tap: g.player.anim.tap,
    said: B.said.length, ring: { ...window.__ring, radio: window.__ring?.radio.length } };
});
// A pling now: E at the bell, `rest` s on.
async function pling(T) {
  await T.until(() => __game.bell.canUse(), 4000);
  await T.tap('KeyE');
}
// Stig far off on the beach road, facing away from the hotel: the desk out of view.
async function away(T) {
  await stand(T, 0, 30, 0);
  await T.frames(20);
}

export const SCENARIOS = {
  async ringklocka(T) {
    await T.fresh('&mission=7');
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam');
    await watch(T);
    const cfg = await T.ev(() => JSON.parse(JSON.stringify(__game.bell.cfg)));

    // 1. The queue: not while he looks at its spots, out once the desk is out of view.
    await stand(T, 1.5, -2.5, PI);   // on the porch's south edge facing the desk: the spots in view
    await T.frames(40);              // past the warp's cut
    await T.ev(() => __game.bell.hideQueue());
    await T.frames(40);
    let r = await st(T);
    check(!r.shown, 'the queue not out in view');
    await away(T);
    r = await st(T);
    check(r.shown && r.extras === 3, 'the queue out once the desk is out of view');
    const q = await T.ev(() => {
      const g = __game, B = g.bell, n = g.npc('portier');
      return { guests: B.guests.map((x) => ({ d: +Math.hypot(x.ch.x - x.spot.x, x.ch.z - x.spot.z).toFixed(2), local: !!x.ch.def.local, held: x.ch.def.held || null, state: x.ch.state })),
        faces: B.spots.map((s, k) => { const a = k ? B.spots[k - 1] : n; return +Math.abs(Math.atan2(Math.sin(Math.atan2(a.x - s.x, a.z - s.z) - s.yaw), Math.cos(Math.atan2(a.x - s.x, a.z - s.z) - s.yaw))).toFixed(3); }),
        cases: B.cases.map((c, k) => { const s = B.spots[k]; return { d: +Math.hypot(c.x - s.x, c.z - s.z).toFixed(2), right: +((c.x - s.x) * -Math.cos(s.yaw) + (c.z - s.z) * Math.sin(s.yaw)).toFixed(2), dead: c.block.dead, vis: c.mesh.visible }; }),
        people: g.allChars().filter((c) => B.extras.includes(c)).length };
    });
    T.log('queue', JSON.stringify(q));
    check(q.guests.every((x) => x.d < 0.05 && !x.local && !x.held && x.state === 'normal'), 'three tourists on their spots');
    check(q.faces.every((a) => a < 0.01), 'each faces the one ahead, the first the porter');
    check(q.cases.every((c) => Math.abs(c.right - cfg.queue.caseOut) < 0.01 && !c.dead && c.vis), 'a suitcase at each one\'s right hand, solid and shown');
    check(q.people === 3, 'the guests are people (allChars)');

    // 2. A suitcase is solid: Stig walks into the middle one and stops.
    const walk = await T.ev(() => {
      const B = __game.bell, c = B.cases[1], s = B.spots[1], ox = -Math.cos(s.yaw), oz = Math.sin(s.yaw);
      return { x: c.x - B.ox + ox * 1.4, z: c.z - B.oz + oz * 1.4, yaw: Math.atan2(-ox, -oz) };
    });
    await stand(T, walk.x, walk.z, walk.yaw);
    await T.hold(['KeyW'], 1200);
    r = await T.ev(() => { const B = __game.bell, c = B.cases[1], p = __game.player; return { d: +Math.hypot(p.x - c.x, p.z - c.z).toFixed(2), r: p.r }; });
    T.log('into the suitcase', JSON.stringify(r));
    check(r.d > cfg.queue.caseR + r.r - 0.06, 'the suitcase stops him');

    // 3. The prompt at the bell; none 2 m off, none with the porter away, none in a pursuit.
    await stand(T, 3.0, -10.3, PI);
    r = { near: await near(T), prompt: await prompt(T), mesh: await T.ev(() => { const B = __game.bell; return B.bellMesh.visible && Math.hypot(B.bellMesh.position.x - B.bellAt.x, B.bellMesh.position.z - B.bellAt.z) < 0.01; }) };
    T.log('bell', JSON.stringify(r));
    check(r.near === 'ringklocka' && /Plinga på klockan/.test(r.prompt) && r.mesh, 'the bell\'s prompt, the bell on the desk');
    await stand(T, 3.0, -8.3, PI);
    check(await near(T) !== 'ringklocka', 'none 2 m off');
    await stand(T, 3.75, -10.3, PI);   // in front of the G17 toaster east of the bell (brodrost_portier)
    r = { toaster: await near(T) };
    await stand(T, 3.0, -10.42, PI);
    r.bell = await near(T);
    T.log('toaster', JSON.stringify(r));
    check(r.toaster === 'brodrost:portier' && r.bell === 'ringklocka', 'in front of the toaster its prompt, in front of the bell the bell\'s');
    await T.ev(() => __game.hideNpc('portier'));
    await stand(T, 3.0, -10.3, PI);
    check(await near(T) !== 'ringklocka', 'none with the porter away');
    await T.ev(() => __game.placeNpcs(true));
    await stand(T, 3.0, -10.3, PI);
    await T.ev(() => { __game.shame.v = 100; __game.shame.startPursuit(); });
    r = { pursuit: await near(T) };
    await T.ev(() => { __game.shame.endPursuit(false); __game.shame.v = 0; });
    await T.frames(3);
    r.after = await near(T);
    T.log('pursuit', JSON.stringify(r));
    check(r.pursuit !== 'ringklocka' && r.after === 'ringklocka', 'none in a pursuit (the porter\'s bribe), back after it');

    // 4. Plings 1–9: the sound, "*pling*", the hand, "Momento."; E again at once is no pling.
    await watch(T);
    await T.ev(() => { __game.bell.said.length = 0; });
    for (let k = 1; k <= 9; k++) {
      await pling(T);
      const a = await st(T);
      await T.frames(2);
      const tap = a.tap;
      if (k === 3) {
        const held = await near(T);
        await T.tap('KeyE');   // within `rest`: nothing (and never the toaster beside the bell)
        check(held === 'ringklocka' && (await st(T)).count === 3 && !(await T.ev(() => __game.toasters.active)), 'E again within rest is no pling, nor the toaster');
      }
      await T.until(() => __game.bell.said.filter((s) => s[0] === 'portier').length >= __game.bell.count, 3000);
      if (k === 1) T.log('pling 1', JSON.stringify(a));
      check(a.count === k && tap, `pling ${k}: counted, his hand on the bell`);
    }
    r = await T.ev(() => ({ said: __game.bell.said.map((s) => [s[0], s[1]]), ring: window.__ring }));
    T.log('plings 1-9', JSON.stringify(r));
    check(r.ring.pling === 9 && r.ring.phone === 0 && !r.ring.radio.length, 'nine plings, no phone, no radio');
    check(r.said.filter((s) => s[0] === 'bell' && s[1] === cfg.pling).length === 9 && r.said.filter((s) => s[0] === 'portier' && s[1] === cfg.momento).length === 9, '"*pling*" and "Momento." each time');

    // 5. The 10th: the call.
    await T.ev(() => { __game.bell.said.length = 0; });
    await pling(T);
    await T.frames(2);
    const c0 = await st(T);
    await T.until(() => __game.bell.callDone.has('turn') && __game.npc('portier').yaw > 2.6, 3000);
    const c1 = await st(T);
    await T.until(() => __game.bell.callDone.has('ask'), 8000);
    const radioUp = await T.ev(() => [...document.querySelectorAll('.toast.radio')].some((t) => !t.classList.contains('out') && /Klockan 12/.test(t.textContent)));
    const callNear = { near: await near(T), prompt: await prompt(T) };
    await T.until(() => __game.bell.phase === 'away', 8000);
    await T.frames(4);
    const c2 = await st(T);
    check(callNear.near === 'ringklocka' && callNear.prompt === '', 'in the call E is the bell\'s, with no prompt');
    r = { said: await T.ev(() => __game.bell.said.map((s) => [s[0], s[1]])), ring: await T.ev(() => window.__ring), c0, c1, c2, radioUp, near: await near(T) };
    T.log('the 10th', JSON.stringify(r));
    check(c0.phase === 'call' && c0.count === 0 && c0.posed, 'the call, the porter held');
    check(c1.porterYaw > 2.6, 'he turns his back to ring');
    check(r.ring.pling === 10 && r.ring.phone === 1 && JSON.stringify(r.ring.radio) === JSON.stringify([['lasse', cfg.lasse]]), 'the 10th pling, the phone, Lasse in the radio box');
    check(JSON.stringify(r.said) === JSON.stringify([['bell', cfg.pling], ['lasse', cfg.lasse], ['gäst', cfg.ask], ['stig', cfg.sorry]]), 'no "Momento.", then Lasse, the guest\'s question, Stig\'s sorry');
    check(radioUp, 'the question with Lasse\'s radio box still up');
    check(!c2.bell && c2.phase === 'away' && !c2.posed && r.near !== 'ringklocka', 'the bell under the desk, no prompt');

    // 6. Back once he has been away: the bell and the card; the count from 0.
    await away(T);
    await T.frames(10);
    r = await st(T);
    T.log('back', JSON.stringify(r));
    check(r.phase === 'bell' && r.bell && r.signed && r.signOn && r.card && JSON.stringify(r.bellAt) === '[0,0,0]', 'the bell back with the card');
    await stand(T, 3.0, -10.3, PI);
    check(await near(T) === 'ringklocka', 'the prompt again');
    check((await st(T)).count === 0, 'the count from 0');

    // 7. By the desk a guest asks now and then; the porter answers.
    await T.ev(() => { __game.bell.said.length = 0; __game.bell.plingT = -Infinity; });
    await stand(T, 3.0, -4.5, PI);
    await T.until(() => __game.bell.said.some((s) => s[0] === 'portier'), 30000);
    r = await T.ev(() => __game.bell.said.map((s) => [s[0], s[1], s[2]]));
    T.log('the queue asks', JSON.stringify(r));
    check(r[0][0] === 'gäst' && r[0][1] === cfg.ask && r[1][0] === 'portier' && r[1][1] === cfg.momento && Math.abs(r[1][2] - r[0][2] - cfg.queue.replyAt) < 0.25, 'a guest asks, the porter answers');

    // 8. A kick bowls a guest over; he walks back to his spot.
    const k0 = await T.ev(() => { const B = __game.bell, s = B.spots[2]; return { x: s.x - B.ox, z: s.z - B.oz, yaw: s.yaw, v: __game.shame.v }; });
    await stand(T, k0.x - Math.sin(k0.yaw + PI) * 1.0, k0.z - Math.cos(k0.yaw + PI) * 1.0, k0.yaw + PI);
    await T.tap('KeyJ');
    await T.frames(20);
    r = await T.ev(() => { const B = __game.bell, ch = B.guests[2].ch; return { state: ch.state, v: __game.shame.v }; });
    T.log('kicked', JSON.stringify(r), 'skandal before', k0.v);
    check((r.state === 'flung' || r.state === 'down') && r.v > k0.v, 'the kick bowls him over, SKANDAL up');
    await stand(T, 0, 30, 0);   // out of the way
    await T.until(() => { const x = __game.bell.guests[2]; return x.ch.state === 'normal' && Math.hypot(x.ch.x - x.spot.x, x.ch.z - x.spot.z) < 0.15; }, 15000);
    await T.ev(() => { __game.shame.v = 0; });

    // 9. A mission start: the queue, its solids and the card gone, the bell on the desk.
    await T.ev(() => __game.missions.begin());
    await T.until(() => __game.missions.state !== 'idle', 5000);
    await T.frames(3);
    r = { ...(await st(T)), dead: await T.ev(() => __game.bell.cases.every((c) => c.block.dead)), hidden: await T.ev(() => __game.bell.guests.every((x) => x.ch.state === 'hidden' && !x.ch.root.visible)) };
    await stand(T, 3.0, -10.3, PI);
    r.near = await near(T);
    T.log('mission', JSON.stringify(r));
    check(!r.shown && !r.extras && r.dead && r.hidden && !r.card && r.bell && r.phase === 'bell' && JSON.stringify(r.bellAt) === '[0,0,0]' && r.near !== 'ringklocka', 'a mission start: the queue and the card gone, the bell on the desk, no prompt');

    // 10. The flight level: inert.
    await T.fresh('&mission=2');
    r = await T.ev(() => ({ live: __game.bell.live, shown: __game.bell.shown, level: __game.level }));
    T.log('flight', JSON.stringify(r));
    check(r.level !== 'island' && !r.live && !r.shown, 'the flight level: nothing');
  },

  async ringshots(T) {
    await T.fresh('&mission=7');
    await watch(T);
    await away(T);
    await shotFrom(T, 'ring_queue', [4.8, 3.0, -3.2], [0.4, 1.2, -10.0]);
    await stand(T, 3.0, -10.3, PI);
    await T.shot('ring_prompt');
    // A pling seen from the side: his hand on the bell, "*pling*", then "Momento.".
    await pling(T);
    await T.ev(() => { __game.bell.tapT = 3; });   // the hand held on the bell for the shot
    await shotFrom(T, 'ring_tap', [5.4, 1.9, -9.7], [3.2, 1.5, -10.5]);   // from his right: the hand on the bell
    await pling(T);
    await T.frames(3);
    await shotFrom(T, 'ring_pling', [6.4, 2.2, -8.6], [2.6, 1.4, -10.4], true);
    await T.frames(20);
    await T.shot('ring_momento');
    await T.ev(() => { __game.cam.release(); __game.cam.snapNext = true; });
    for (let k = 3; k <= 9; k++) { await pling(T); await T.frames(4); }
    await pling(T);
    await T.frames(3);
    await T.ev(() => { const g = __game, B = g.bell; g.cam.cutTo({ x: B.ox + 6.4, y: 2.6, z: B.oz - 6.4 }, { x: B.ox + 1.2, y: 1.4, z: B.oz - 10.0 }); g.cam.snapNext = true; });
    await T.until(() => __game.bell.callDone.has('turn') && __game.npc('portier').yaw > 2.6, 3000);
    await T.shot('ring_call');
    await T.until(() => __game.bell.callDone.has('ask'), 8000);
    await T.frames(10);
    await T.shot('ring_ask');
    await T.until(() => __game.bell.callDone.has('sorry'), 8000);
    await T.frames(6);
    await T.shot('ring_sorry');
    await T.until(() => __game.bell.takeT > 0.25, 8000);
    await T.shot('ring_take');
    await T.until(() => __game.bell.phase === 'away', 8000);
    await T.ev(() => { __game.cam.release(); __game.cam.snapNext = true; });
    await stand(T, 3.0, -9.6, PI);
    await T.frames(10);
    await T.shot('ring_empty');
    await away(T);
    await stand(T, 3.0, -9.6, PI);
    await T.frames(10);
    await T.shot('ring_back');
    await stand(T, 5.5, -7.5, PI);
    await shotFrom(T, 'ring_card', [3.2, 2.0, -8.9], [3.0, 1.3, -10.95]);
    await shotFrom(T, 'ring_sketch', [5.2, 2.3, -8.0], [-1.6, 1.4, -9.6]);
  },
};
