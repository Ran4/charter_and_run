// Uppför fyren – the mantra 51 m up (free roam, DESIGN §10.35; feature 52): fyren.
//   fyren: between missions (friskotek's idle, the clock held at 15:00 in test mode) the lighthouse's
//          solid stops at the gallery floor (51.3, still a wall from the foot and from the keeper's
//          roof terrace), the lantern and a closed railing ring are walls up there; E at the keeper's
//          house's door (GÅ UPP I FYREN) fades to black with "Många trappsteg senare …", the clock
//          spun on to 19:45 (the sunset), and he stands outside the lantern's door facing out over the
//          town: "Femtio meter …" with the camera on him from outside the railing, then the view over
//          the town as he sees it; the vertigo rocks the camera; the railing holds him all the way
//          round, Space does not jump; Levander's advice once if he waits; J held: his back to the
//          lantern, arms out, eyes shut, the mantra, the vertigo gone; held on, the long blink to
//          22:00, the lantern lit and its beam; once a visit; E at the lantern's door (GÅ NER) brings
//          him down by night ("… och lika många ner."), turned away from the door; a climb by night
//          keeps the clock; R from the gallery; the door shut in a SKANDAL pursuit; a mission start
//          with him up there puts him at the door below without a fall.
import { check } from '../lib.mjs';

const st = (T) => T.ev(async () => {
  const g = __game, p = g.player, F = g.fyren, { LIGHTHOUSE: L } = await import('/src/world/blocks/coast.js');
  const out = Math.atan2(p.x - L.x, p.z - L.z), dy = Math.atan2(Math.sin(p.yaw - out), Math.cos(p.yaw - out));
  return { px: +p.x.toFixed(2), py: +p.y.toFixed(2), pz: +p.z.toFixed(2), yaw: +p.yaw.toFixed(2), r: +Math.hypot(p.x - L.x, p.z - L.z).toFixed(2),
    out: +dy.toFixed(2), pst: p.state, onGround: p.onGround, vy: +p.vy.toFixed(2), wings: p.anim.wings, eyes: p.anim.eyesShut, up: F.up, busy: F.busy,
    view: F.view, calm: F.calm, blinked: F.blinked, sway: +F.sway.toFixed(2), last: F.last, climbs: F.climbs, h: +g.day.h.toFixed(2),
    sky: g.sky, lit: g.day.lit(), mantraMode: g.mantraMode, mantraOn: g.mantraOn, cine: !!g.cam.cine, state: g.missions.state,
    fade: !!document.getElementById('fade')?.classList.contains('on'), banner: document.getElementById('banner')?.classList.contains('show') ? document.querySelector('#banner .banner-main')?.textContent : '',
    prompt: document.getElementById('prompt')?.classList.contains('show') ? document.getElementById('prompt').textContent : '' };
});
const said = (T) => T.ev(() => window.__said.slice());
// Stig's lines from now on (game.say; every bubble over him in __bubbles, the mantra's auto-bubble
// goes straight to hud.say), and the player's hard landings.
const resetSaid = (T) => T.ev(async () => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g); g.say = (t, text, secs) => { if (t === g.player || t === 'stig') window.__said.push(text); return o(t, text, secs); };
    const { hud } = await import('/src/game/hud.js'), h = hud.say.bind(hud);
    hud.say = (t, text, secs) => { if (t === g.player) window.__bubbles.push(text); return h(t, text, secs); };
    const l = g.onLand.bind(g); g.onLand = (ch, v, y) => { if (ch === g.player) window.__lands.push(+v.toFixed(1)); return l(ch, v, y); };
    window.__lands = [];
  }
  window.__said = [];
  window.__bubbles = [];
});
// On the gallery by hand (debugWarp snaps to the ground): radius r at angle a round the axis (a yaw),
// facing yaw.
const onGallery = (T, a, r, yaw) => T.ev(async (a, r, yaw) => {
  const g = __game, p = g.player, { LIGHTHOUSE: L } = await import('/src/world/blocks/coast.js');
  p.state = 'normal'; p.x = L.x + Math.sin(a) * r; p.z = L.z + Math.cos(a) * r; p.y = L.deck; p.yaw = yaw;
  p.vx = p.vz = p.vy = 0; p.wishX = p.wishZ = 0; p.onGround = true; g.jumps = 0;
}, a, r, yaw);
// At the keeper's door facing it, then E: up the tower once the fade is over.
async function climb(T) {
  await T.ev(() => { const g = __game, l = __lm('fyrDorr'); g.debugWarp(l.x, l.z, l.yaw); g.cam.yaw = l.yaw; g.cam.snapNext = true; });
  await T.frames(4);
  await T.until(() => __game.nearestInteractable()?.it?.id === 'fyren:upp', 4000);
  await T.tap('KeyE');
  await T.until(() => __game.fyren.up && !__game.fyren.busy, 10000);
}
// The camera's sight line (yaw, pitch) now.
const sight = (T) => T.ev(async () => {
  const { camera, THREE } = await import('/src/gfx.js'), d = camera.getWorldDirection(new THREE.Vector3());
  return { yaw: Math.atan2(d.x, d.z), pitch: Math.asin(d.y) };
});

export const SCENARIOS = {
  async fyren(T) {
    await T.fresh('&mission=6');
    await resetSaid(T);
    // 0. The world: the tower is a wall from the foot and from the roof terrace, its solid stops at
    // the gallery floor; up there the lantern and the railing, a closed ring.
    const geo = await T.ev(async () => {
      const C = await import('/src/world/collision.js'), { LIGHTHOUSE: L } = await import('/src/world/blocks/coast.js'), g = __game;
      const [tower, lantern, ...rail] = L.blocks;
      // A body of Stig's radius just outside the walkway, all the way round: some wall must hold it.
      let gaps = 0;
      for (let k = 0; k < 720; k++) {
        const a = (k / 720) * Math.PI * 2, x = L.x + Math.sin(a) * (L.rOut + 0.08), z = L.z + Math.cos(a) * (L.rOut + 0.08);
        if (!rail.some((b) => C.circleVsBlock(x, z, g.player.r, b, {}))) gaps++;
      }
      const floors = [];
      for (const y of [0.2, 4.0, 20, 51.0]) floors.push(+C.groundAt(L.x + 2.6, L.z, y, 0.45).toFixed(2));
      return { deck: L.deck, tower: tower.top, kind: tower.kind, r: tower.r, lantern: lantern.top, rails: rail.length, gaps, rIn: L.rIn, rOut: L.rOut,
        floors, free: g.spotFree(L.x + 2.6, L.z), roofWall: tower.top > 4.0 + 0.45, pr: g.player.r };
    });
    T.log('geo', JSON.stringify(geo));
    check(geo.deck === 51.3 && geo.tower === 51.3 && geo.kind === 'tower' && geo.r === 3.4 && geo.lantern === 99 && geo.rails === 20, `the tower to the gallery floor, the lantern and 20 railing walls (${JSON.stringify(geo)})`);
    check(geo.gaps === 0, `the railing is closed all round (${geo.gaps} gaps)`);
    check(!geo.free && geo.roofWall && geo.floors[0] < 0.2 && geo.floors[1] === 4 && geo.floors[2] === 4 && geo.floors[3] === 51.3, `a wall from the foot and the roof terrace, a floor only at the gallery (${JSON.stringify(geo.floors)})`);

    // 1. The door: GÅ UPP I FYREN, the fade with its banner, the clock on to the sunset.
    await T.ev(() => { const g = __game, l = __lm('fyrDorr'); g.debugWarp(l.x, l.z, l.yaw); g.cam.yaw = l.yaw; g.cam.snapNext = true; });
    await T.frames(8);
    let r = await st(T);
    T.log('at the door', JSON.stringify(r));
    check(r.prompt.includes('Gå upp i fyren') && r.h === 15 && r.sky === 'day', `the door's prompt by day (${r.prompt}, ${r.h})`);
    await T.shot('fyren_dorr');
    await T.tap('KeyE');
    await T.frames(3);
    r = await st(T);
    check(r.fade && r.busy, 'the climb fades to black');
    await T.until(() => document.getElementById('banner')?.classList.contains('show'), 3000);
    r = await st(T);
    T.log('banner', r.banner);
    check(r.banner === 'MÅNGA TRAPPSTEG SENARE …', `the climb's banner (${r.banner})`);
    await T.until(() => __game.fyren.up && !__game.fyren.busy, 10000);
    await T.frames(3);
    r = await st(T);
    const gal = await T.L('fyrGalleri');
    T.log('up', JSON.stringify(r));
    check(r.up && r.py === 51.3 && r.onGround && Math.hypot(r.px - gal.x, r.pz - gal.z) < 0.05 && Math.abs(r.out) < 0.05 && r.climbs === 1, `on the gallery by the lantern's door, facing out (${JSON.stringify(r)})`);
    check(r.h === 19.75 && r.sky === 'sunset' && !r.lit && r.last?.kind === 'up' && r.last.from === 15 && r.last.to === 19.75, `the climb took the afternoon: the sunset (${r.h}, ${r.sky})`);
    check(r.mantraMode && r.cine && r.view === 'orbit' && !r.fade, `J is the mantra, the gallery's camera (${r.view})`);
    check(r.prompt.includes('Gå ner') && r.prompt.includes('Jag kan flyga'), `the door down and the J hint (${r.prompt})`);

    // 2. "Femtio meter …" with him in the frame, then the view over the town; the vertigo.
    await T.until(() => window.__said.length > 0, 3000);
    await T.frames(10);
    await T.shot('fyren_galleri');
    let s = await said(T);
    check(s[0] === 'Femtio meter … det är ju nästan som att flyga.', `the arrival line (${JSON.stringify(s)})`);
    check((await st(T)).view === 'orbit', 'the camera on him while he talks');
    await T.until(() => __game.fyren.view === 'vista', 9000);
    await T.frames(20);
    r = await st(T);
    const a0 = await sight(T);
    await T.sleep(900);
    const a1 = await sight(T);
    T.log('vista', JSON.stringify(r), 'sight', JSON.stringify(a0), JSON.stringify(a1));
    check(r.sway > 0.9 && !r.calm, `the vertigo is on (${r.sway})`);
    check(a0.pitch < -0.3 && Math.abs(Math.atan2(Math.sin(a0.yaw - 0.75 * Math.PI), Math.cos(a0.yaw - 0.75 * Math.PI))) < 0.35, `the view out over the town, north-east and down (${JSON.stringify(a0)})`);
    check(Math.abs(a1.yaw - a0.yaw) + Math.abs(a1.pitch - a0.pitch) > 0.004, 'the vertigo rocks the camera');
    await T.shot('fyren_utsikt');

    // 3. The railing holds him all the way round, the lantern too; Space does not jump.
    let lo = 9, hi = 0, ylo = 99, yhi = 0;
    const sample = async () => { const q = await st(T); lo = Math.min(lo, q.r); hi = Math.max(hi, q.r); ylo = Math.min(ylo, q.py); yhi = Math.max(yhi, q.py); };
    for (const keys of [['KeyS', 'KeyD'], ['KeyW', 'KeyA'], ['KeyD'], ['KeyS', 'KeyA', 'ShiftLeft']]) {
      for (const k of keys) await T.page.keyboard.down(k);
      try { for (let i = 0; i < 12; i++) { await T.sleep(110); await sample(); } } finally { for (const k of keys) await T.page.keyboard.up(k); }
    }
    T.log('walked round', JSON.stringify({ lo, hi, ylo, yhi }));
    check(lo >= geo.rIn - 0.05 && hi <= geo.rOut + 0.06 && ylo === 51.3 && yhi === 51.3, `inside the walkway all the way round (r ${lo}–${hi}, y ${ylo}–${yhi})`);
    await T.frames(10);
    await T.tap('Space');
    let jumped = false;
    for (let i = 0; i < 8; i++) { const q = await st(T); if (q.py > 51.31 || q.vy > 0 || !q.onGround) jumped = true; await T.frames(2); }
    check(!jumped, 'Space does not jump on the gallery');

    // 4. Levander's advice, once, when he waits.
    await T.ev(() => { __game.fyren.cfg.remind.after = __game.fyren.upT + 0.5; });
    await T.until(() => window.__said.length > 1, 4000);
    await T.frames(6);
    s = await said(T);
    T.log('said', JSON.stringify(s));
    check(s[1] === 'Varje gång du känner tendenser till flygrädsla så gör du övningen…' && (await st(T)).view === 'orbit', `Levander's advice, with him in the frame (${JSON.stringify(s)})`);
    await T.ev(() => { __game.fyren.cfg.remind.after = 10; });

    // 5. The exercise: back to the lantern, arms out, eyes shut, the mantra; the vertigo settles.
    await onGallery(T, 0.75 * Math.PI, 2.5, 0);
    await T.frames(4);
    await T.page.keyboard.down('KeyJ');
    try {
      await T.until(() => __game.mantraOn, 3000);
      await T.sleep(500);
      r = await st(T);
      T.log('exercise', JSON.stringify(r));
      check(r.wings && r.eyes && r.view === 'pose' && Math.abs(r.r - (geo.rIn + 0.02)) < 0.05 && Math.abs(r.out) < 0.1, `his back to the lantern, arms out, eyes shut, facing out (${JSON.stringify(r)})`);
      await T.until(() => __game.fyren.calm, 4000);
      await T.until(() => __game.fyren.sway < 0.3, 3000);
      await T.shot('fyren_ovning');
      const b = await T.ev(() => window.__bubbles.slice());
      check(b.includes('Jag kan flyga, jag är inte rädd.'), `the mantra (${JSON.stringify(b)})`);
      // Held on: the long blink, the clock on to the night, the lantern lit.
      await T.until(() => __game.fyren.busy, 6000);
      await T.frames(3);
      r = await st(T);
      check(r.fade && r.wings && r.eyes && r.blinked, `the long blink: black, still in the exercise (${JSON.stringify(r)})`);
      await T.until(() => !__game.fyren.busy, 8000);
      await T.sleep(1500);
      r = await st(T);
      const beam = await T.ev(async () => (await import('/src/gfx.js')).beaconLit());
      T.log('night', JSON.stringify(r), 'beam', beam);
      check(r.h === 22 && r.lit && r.sky === 'night' && beam && r.last?.kind === 'night' && r.last.from === 19.75, `the night under the lit lantern (${JSON.stringify(r)})`);
      check(r.wings && r.eyes && r.view === 'pose' && r.mantraOn && !r.fade, 'his eyes open on the night, still in the exercise');
      await T.shot('fyren_natt');
    } finally { await T.page.keyboard.up('KeyJ'); }
    await T.frames(10);
    r = await st(T);
    check(!r.wings && !r.eyes, `arms down, eyes open when J is let go (${JSON.stringify(r)})`);
    // Once a visit: a second long hold before the lantern is lit is only the exercise.
    const t0 = r.last.t;
    await T.ev(() => __game.day.set(19.75));
    await T.hold(['KeyJ'], 3500);
    r = await st(T);
    check(r.last.t === t0 && !r.busy, `one long blink a visit (${JSON.stringify(r.last)})`);
    await T.ev(() => __game.day.set(22));

    // 6. GÅ NER: "… och lika många ner.", at the door below turned away from it; the night goes on.
    await onGallery(T, gal.yaw, 2.4, gal.yaw);
    await T.frames(6);
    r = await st(T);
    check(r.prompt.includes('Gå ner'), `the door down (${r.prompt})`);
    await T.tap('KeyE');
    await T.until(() => document.getElementById('banner')?.classList.contains('show'), 3000);
    r = await st(T);
    check(r.banner === '… OCH LIKA MÅNGA NER.', `the way down's banner (${r.banner})`);
    await T.until(() => !__game.fyren.busy, 10000);
    await T.frames(10);
    r = await st(T);
    const door = await T.L('fyrDorr');
    T.log('down', JSON.stringify(r));
    check(!r.up && r.py < 0.5 && Math.hypot(r.px - door.x, r.pz - (door.z + 2.6)) < 0.05 && Math.abs(Math.atan2(Math.sin(r.yaw), Math.cos(r.yaw))) < 0.05 && r.climbs === 2, `out of the door, turned away from it (${JSON.stringify(r)})`);
    check(!r.mantraMode && !r.cine && r.h === 22 && r.sky === 'night' && r.last?.kind === 'down', `the island's J and camera back, the night goes on (${JSON.stringify(r)})`);
    await T.shot('fyren_ner');

    // 7. A climb by night keeps the clock; R from the gallery.
    await climb(T);
    r = await st(T);
    check(r.up && r.h === 22 && r.last.from === 22 && r.last.to === 22, `by night the clock stays (${JSON.stringify(r.last)})`);
    await T.page.keyboard.down('KeyJ');
    await T.until(() => __game.player.anim.eyesShut, 3000);
    await T.page.keyboard.up('KeyJ');
    await T.tap('KeyR');
    await T.frames(10);
    r = await st(T);
    T.log('R', JSON.stringify(r));
    check(!r.up && r.py < 1 && !r.mantraMode && !r.cine && !r.eyes && r.h === 22, `R takes him down to the road (${JSON.stringify(r)})`);

    // 8. A SKANDAL pursuit shuts the door.
    await T.ev(() => { const g = __game, l = __lm('fyrDorr'); g.debugWarp(l.x, l.z, l.yaw); });
    await T.frames(4);
    check((await st(T)).prompt.includes('Gå upp i fyren'), 'the door before the pursuit');
    await T.ev(() => { __game.shame.v = 100; __game.shame.startPursuit(); });
    await T.frames(4);
    r = await st(T);
    await T.tap('KeyE');
    await T.frames(4);
    const r2 = await st(T);
    check(!r.prompt.includes('Gå upp') && !r2.busy && !r2.fade && r2.climbs === r.climbs, `no climb in a pursuit (${r.prompt})`);
    await T.ev(() => __game.shame.endPursuit(false));

    // 9. A mission start with him up there: at the door below, no fall; the door shut in the mission.
    await T.fresh('&mission=6');
    await resetSaid(T);
    await climb(T);
    check((await st(T)).up, 'up the tower before the mission');
    await T.ev(() => { window.__lands = []; __game.missions.begin(); });
    await T.until(() => __game.missions.state !== 'idle', 4000);
    await T.frames(5);
    r = await st(T);
    const lands = await T.ev(() => window.__lands.slice());
    T.log('mission start up there', JSON.stringify(r), 'landings', JSON.stringify(lands));
    check(!r.up && r.py < 0.5 && r.pst === 'normal' && !lands.some((v) => v > 6) && !r.mantraMode, `down at the door without a fall (${JSON.stringify(r)})`);
    await T.until(() => __game.missions.state === 'running', 60000);
    await T.ev(() => { const g = __game, l = __lm('fyrDorr'); g.debugWarp(l.x, l.z, l.yaw); });
    await T.frames(4);
    const it = await T.ev(() => __game.nearestInteractable()?.it?.id ?? null);
    check(it !== 'fyren:upp', `no climb in a mission (${it})`);
  },
};
