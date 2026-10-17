// Båtturen med PALOMA – slutbilden, fast på riktigt (free roam, DESIGN §10.41; feature 76): battur,
// batturrio.
//   battur:    the table (every line and prompt in BATTUR tagged in the file); PALOMA her own mesh on her
//              mooring with the name board a child, bobbing with the harbour, her collider as before
//              the break-out (the same footprint and top, eleven boat solids in the marina); at index 7
//              (asnan) the kiosk's prompt "E Båttur till fyren (300 pta)" within 1.6 m, not 2.5 m off,
//              not in a car, not in a SKANDAL pursuit, not at night; the flight level has none. E: 300
//              pta paid, the letterbox, Stig seated on PALOMA holding on, Ole's double standing at her
//              bow pointing at the fin in the basin, PALOMA gliding out, his statistics; the beach:
//              PALOMA at sea gliding west with the camera; the lighthouse: the sunset, the three Rio lines
//              in order; the pier: the clock's palette back, PALOMA moored, Stig and Ole on the quay;
//              free roam again (no letterbox, no cinematic camera, Stig standing, the real Ole unmoved, no
//              coin picked up), Ole's double gone once Stig is off. With 100 pta Ole pays (the toast, the
//              purse kept); E at 2 s goes straight to the pier and ends the trip within 3 s. A mission
//              start mid-trip puts everything back at once. Shots battur_*.
//   batturrio: after the end (index 13): the prompt "E Slutbilden igen – båttur (300 pta)"; the samba
//              from the first shot, Stig in his Rio suit, Ole's double in his, Majsan's and Siv's behind
//              them, a cup before each chest; at the lighthouse Ole's Rio line, the cups raised, the end
//              card's banner; on the quay his own clothes and the island's tune back, all four standing;
//              the real three unmoved. Shots batturrio_*.
import fs from 'fs';
import path from 'path';
import { check, ROOT } from '../lib.mjs';

const atKiosk = (T, back = 0) => T.ev((back) => {
  const g = __game, l = __lm('battur');
  if (g.playerCar) g.exitCar(true);
  g.player.state = 'normal';
  g.debugWarp(l.x - Math.sin(l.yaw) * back, l.z - Math.cos(l.yaw) * back, l.yaw);
  g.cam.yaw = l.yaw; g.cam.pitch = 0.3; g.cam.snapNext = true;
}, back);
const tripAt = (T, t) => T.until((t) => !__game.battur.sc || __game.battur.sc.t >= t, 40000, t);
const done = (T) => T.until(() => !__game.battur.sc, 40000);
const st = (T) => T.ev(() => {
  const g = __game, b = g.battur, p = g.player, m = b.sc, P = window.__paloma;
  const dbl = (d) => d ? { st: d.state, vis: d.root.visible, x: +d.x.toFixed(2), y: +d.y.toFixed(2), z: +d.z.toFixed(2), point: !!d.anim.point, cup: d.anim.cupHeld, wave: !!d.anim.wave, bowtie: d.def.bowtie ?? null } : null;
  const real = (k) => { const n = g.npc(k); return { x: +n.x.toFixed(2), z: +n.z.toFixed(2), st: n.state, outfit: n.outfit }; };
  return {
    t: m ? +m.t.toFixed(2) : null, clip: m?.clip?.id ?? null, variant: m?.variant ?? null,
    pst: p.state, px: +p.x.toFixed(2), py: +p.y.toFixed(2), pz: +p.z.toFixed(2), pyaw: +p.yaw.toFixed(2), hold: !!p.anim.hold, cup: p.anim.cupHeld, outfit: p.outfit,
    coins: g.coins, sky: g.sky, tune: window.__audioTune(), inDialog: g.inDialog,
    letterbox: document.getElementById('letterbox').classList.contains('on'), cine: !!g.cam.cine,
    cam: { x: +g.cam.pos.x.toFixed(1), y: +g.cam.pos.y.toFixed(1), z: +g.cam.pos.z.toFixed(1) },
    banner: document.getElementById('banner').classList.contains('show') ? document.getElementById('banner').textContent : null,
    toasts: [...document.querySelectorAll('#toasts > *')].map((e) => e.textContent),
    boat: { x: +P.mesh.position.x.toFixed(2), y: +P.mesh.position.y.toFixed(3), z: +P.mesh.position.z.toFixed(2), yaw: +P.mesh.rotation.y.toFixed(2), away: P.away },
    fin: { vis: b.fin.visible, x: +b.fin.position.x.toFixed(2), z: +b.fin.position.z.toFixed(2) },
    real: { ole: real('ole'), majsan: real('majsan'), siv: real('siv') },
    ole: dbl(b.doubles.ole), majsan: dbl(b.doubles.majsan), siv: dbl(b.doubles.siv),
    ashore: b.ashore ? b.ashore.keys : null,
    prompt: document.getElementById('prompt')?.textContent || '', it: g.nearestInteractable()?.it?.id ?? null, can: b.canUse(),
    last: b.last && JSON.parse(JSON.stringify(b.last)), state: g.missions.state,
  };
});

async function setup(T) {
  await T.ev(async () => {
    window.__audioMod = (await import('/src/audio.js')).audio; window.__audioTune = () => window.__audioMod.tune;
    window.__paloma = (await import('/src/world/blocks/coast.js')).PALOMA;
  });
}

// One whole trip from E to free roam; the state at each step.
async function trip(T, name) {
  await atKiosk(T);
  await T.frames(8);
  const seen = { before: await st(T) };
  await T.tap('KeyE');
  seen.start = await st(T);
  for (const [k, t] of [['hamn1', 1.2], ['hamn2', 5.6], ['playa1', 8.4], ['playa2', 12.6], ['fyren1', 15.0], ['fyren2', 18.2], ['fyren3', 20.4], ['pier', 24.4]]) {
    await tripAt(T, t);
    seen[k] = await st(T);
    await T.shot(`${name}_${k}`);
  }
  await done(T);
  await T.frames(6);
  seen.after = await st(T);
  await T.shot(`${name}_efter`);
  return seen;
}

const near = (a, b, tol) => Math.abs(a - b) <= tol;
// On her deck or benches: inside her footprint round where she is now.
const aboard = (s, x, z) => Math.hypot(x - s.boat.x, z - s.boat.z) < 6.2;

function checkRestored(s, before, label) {
  check(s.pst === 'normal' && !s.inDialog && !s.letterbox && !s.cine && s.t === null, `${label}: free roam again (${JSON.stringify({ pst: s.pst, inDialog: s.inDialog, letterbox: s.letterbox, cine: s.cine })})`);
  check(!s.boat.away && s.boat.x === 176.6 && s.boat.z === 254 && s.boat.yaw === 0 && !s.fin.vis, `${label}: PALOMA moored, the fin gone (${JSON.stringify(s.boat)}, ${s.fin.vis})`);
  check(s.sky === before.sky && s.tune === before.tune && s.outfit === before.outfit, `${label}: sky, music and clothes as before (${s.sky}/${before.sky}, ${s.tune}/${before.tune}, ${s.outfit}/${before.outfit})`);
  check(JSON.stringify(s.real) === JSON.stringify(before.real), `${label}: the real Ole, Majsan and Siv unmoved (${JSON.stringify(s.real)})`);
}

export const SCENARIOS = {
  async battur(T) {
    await T.fresh('&mission=7');
    await setup(T);

    // ---- 1. The table: every line and prompt tagged.
    const texts = await T.ev(() => { const c = __game.battur.cfg; return [c.prompt, c.promptRio, ...c.plain.lines.map((l) => l[2]), ...c.rio.lines.map((l) => l[2])]; });
    const src = fs.readFileSync(path.join(ROOT, 'src/content/island.js'), 'utf8');
    const block = src.slice(src.indexOf('export const BATTUR'), src.indexOf('\n};\n', src.indexOf('export const BATTUR')));
    const bad = [];
    for (const text of texts) {
      const row = block.split('\n').find((l) => l.includes(`'${text}'`));
      if (!row) bad.push(`not in the block: ${text}`);
      else if (!/\/\/ \[(F\*?|N)\]/.test(row)) bad.push(`untagged: ${text}`);
    }
    check(!bad.length, `BATTUR's lines tagged (${bad.join(' · ')})`);

    // ---- 2. PALOMA: her own mesh, the board a child, bobbing; the collider as before the break-out.
    const pal = await T.ev(async () => {
      const C = await import('/src/world/collision.js'), P = window.__paloma, m = P.mesh;
      const boats = C.blocks.filter((b) => b.kind === 'boat' && b.minX > 120 && b.minX < 200 && b.minZ > 200 && b.maxZ < 280).map((b) => [b.minX, b.minZ, b.maxX, b.maxZ, b.top].map((v) => +v.toFixed(3)));
      const y0 = m.position.y;
      await new Promise((r) => setTimeout(r, 700));
      return { boats, own: m.parent === __game.scene, kids: m.children.filter((c) => c.name !== 'outline').length, x: m.position.x, z: m.position.z, y0, y1: m.position.y };
    });
    check(pal.boats.length === 11 && pal.boats.some((b) => JSON.stringify(b) === JSON.stringify([174.98, 248.6, 178.22, 259.4, 0.7])), `PALOMA's collider unchanged, eleven boat solids in the marina (${JSON.stringify(pal.boats)})`);
    check(pal.own && pal.kids >= 1 && pal.x === 176.6 && pal.z === 254 && pal.y0 !== pal.y1, `PALOMA her own mesh on her mooring, the board aboard, bobbing (${JSON.stringify(pal)})`);

    // ---- 3. The prompt, and where it is not.
    await atKiosk(T);
    await T.frames(6);
    let s = await st(T);
    check(s.it === 'battur' && s.prompt.includes('Båttur till fyren (300 pta)') && s.can, `the kiosk's prompt (${s.prompt}, ${s.it})`);
    await atKiosk(T, 2.5);
    await T.frames(6);
    s = await st(T);
    check(s.it !== 'battur', `no prompt 2.5 m off (${s.it})`);
    await atKiosk(T);
    const blocked = await T.ev(async () => {
      const g = __game, b = g.battur, out = {};
      const car = g.cars.find((c) => Math.hypot(c.x - 184, c.z - 231.5) < 2);   // the marina's parked pickup
      g.enterCar(car);
      out.car = b.canUse();
      g.exitCar(true);
      g.shame.add(100, { force: true });
      out.pursuit = !!g.shame.pursuit && !b.canUse();
      g.shame.clear();
      window.__audioMod.setTune(g.levelTune());   // clear() leaves the pursuit's tune to its caller
      g.day.set(22);
      out.night = b.canUse();
      g.day.set(15); g.day.write();
      out.day = b.canUse();
      return out;
    });
    check(blocked.car === false && blocked.pursuit && blocked.night === false && blocked.day, `no trip in a car, a pursuit or at night (${JSON.stringify(blocked)})`);

    // ---- 4. The trip.
    await T.ev(() => { __game.addCoins(1000 - __game.coins); });
    await T.until(() => !__game.shame.pursuit && __game.player.state === 'normal', 15000);
    await T.sleep(3000);   // the pursuit's banner and toast gone
    const r = await trip(T, 'battur');
    const b0 = r.before;
    T.log('before', JSON.stringify({ coins: b0.coins, sky: b0.sky, tune: b0.tune, outfit: b0.outfit, real: b0.real }));
    check(b0.tune === 'sol' && r.start.coins === 700 && r.start.last.paid && r.start.letterbox && r.start.inDialog && r.start.cine, `E: 300 pta paid, the letterbox and the shot (${JSON.stringify({ coins: r.start.coins, paid: r.start.last.paid })})`);
    const h1 = r.hamn1, h2 = r.hamn2;
    check(h1.clip === 'hamn' && h1.pst === 'seated' && h1.hold && aboard(h1, h1.px, h1.pz) && near(h1.py, 0.15 + 1.05 + h1.boat.y, 0.02), `the basin: Stig seated on PALOMA holding on (${JSON.stringify({ pst: h1.pst, hold: h1.hold, p: [h1.px, h1.py, h1.pz], boat: h1.boat })})`);
    check(h1.ole?.vis && h1.ole.st === 'normal' && h1.ole.point && aboard(h1, h1.ole.x, h1.ole.z) && near(h1.ole.y, 0.15 + 0.65 + h1.boat.y, 0.02), `Ole's double standing at her bow, pointing (${JSON.stringify(h1.ole)})`);
    check(h1.fin.vis && h2.boat.z > 254 + 2 && h2.boat.away, `the fin in the basin, PALOMA gliding out (${JSON.stringify(h2.boat)})`);
    check(h2.last.said[0]?.[0] === 'ole' && h2.last.said[0][1].startsWith('Farlige saker.'), `his statistics (${JSON.stringify(h2.last.said)})`);
    const p1 = r.playa1, p2 = r.playa2;
    check(p1.clip === 'playa' && near(p1.boat.z, 352, 0.1) && p2.boat.x < p1.boat.x - 5 && p1.boat.x <= 58 && p2.boat.x >= 43 && !p1.fin.vis, `the beach: PALOMA at sea gliding west (${p1.boat.x} -> ${p2.boat.x})`);
    check(aboard(p2, p2.px, p2.pz) && p2.ole.st === 'seated' && aboard(p2, p2.ole.x, p2.ole.z) && Math.hypot(p2.cam.x - p2.boat.x, p2.cam.z - p2.boat.z) < 16, `with Stig and Ole aboard, the camera with her (${JSON.stringify(p2.cam)})`);
    const f1 = r.fyren1, f3 = r.fyren3;
    check(f1.clip === 'fyren' && f1.sky === 'sunset' && f3.sky === 'sunset' && Math.hypot(f1.boat.x + 240, f1.boat.z - 232) < 125 && !f1.hold, `the lighthouse in the sunset (${f1.sky}, ${JSON.stringify(f1.boat)})`);
    const said = f3.last.said.map(([w, t]) => `${w}: ${t}`);
    check(said.length === 4 && said[1] === 'ole: Tenk å sitte her i desember. Det er som i Rio.' && said[2] === 'stig: Har du varit i Rio?' && said[3] === 'ole: Nei, men jeg skal reise dit.', `the Rio exchange in order (${JSON.stringify(said)})`);
    const pr = r.pier;
    check(pr.clip === 'pier' && pr.sky === b0.sky && pr.boat.x === 176.6 && pr.boat.z === 254 && pr.pst === 'normal' && pr.ole.st === 'normal' && pr.py < 0.3, `the quay by day, PALOMA moored, Stig and Ole ashore (${JSON.stringify({ sky: pr.sky, boat: pr.boat, p: [pr.px, pr.py, pr.pz], ole: pr.ole })})`);
    checkRestored(r.after, b0, 'after');
    check(r.after.last.ended === 'done' && r.after.coins === 700 && r.after.ashore?.[0] === 'ole' && r.after.ole.vis, `the end: no coin picked up, Ole's double still on the quay (${r.after.coins}, ${r.after.ashore})`);
    check(r.after.last.clips.join() === 'hamn,playa,fyren,pier', `four shots (${r.after.last.clips})`);
    // Off: the double goes once Stig is far from it (and the camera).
    await T.ev(() => { const g = __game; g.debugWarp(120, 236, -Math.PI / 2); g.cam.yaw = -Math.PI / 2; g.cam.snapNext = true; });
    const gone = await T.until(() => !__game.battur.ashore, 20000).then(() => true, () => false);
    s = await st(T);
    check(gone && !s.ole.vis && s.ole.st === 'hidden', `Ole's double gone once Stig is off (${JSON.stringify(s.ole)})`);

    // ---- 5. Ole pays; E skips to the pier.
    await T.ev(() => { __game.addCoins(100 - __game.coins); });
    await atKiosk(T);
    await T.frames(6);
    await T.tap('KeyE');
    s = await st(T);
    check(s.t !== null && s.coins === 100 && s.last.paid === false && s.toasts.some((t) => t.includes('Ole betalade 300 pta')), `with 100 pta Ole pays (${s.coins}, ${JSON.stringify(s.toasts)})`);
    await tripAt(T, 2.0);
    const tSkip = await T.ev(() => __game.time);
    await T.tap('KeyE');
    s = await st(T);
    check(s.clip === 'pier' && s.pst === 'normal' && s.boat.x === 176.6 && s.boat.z === 254, `E: straight to the pier (${s.clip}, ${s.t})`);
    await T.shot('battur_hoppa');
    await done(T);
    s = await st(T);
    const took = await T.ev((t0) => __game.time - t0, tSkip);
    checkRestored(s, b0, 'skip');
    check(s.last.ended === 'skip' && took < 3.2 && s.last.clips.join() === 'hamn,pier', `the skip ended the trip in ${took.toFixed(2)} s (${s.last.ended}, ${s.last.clips})`);

    // ---- 6. A mission start mid-trip puts everything back at once.
    await T.ev(() => { const g = __game, b = g.battur; b.endAshore(); g.addCoins(1000); });
    await atKiosk(T);
    await T.frames(6);
    await T.tap('KeyE');
    await tripAt(T, 15.0);
    s = await st(T);
    check(s.clip === 'fyren' && s.sky === 'sunset', `mid-trip at the lighthouse (${s.clip}, ${s.sky})`);
    await T.ev(() => { __game.missions.begin(); });
    await T.frames(4);
    s = await st(T);
    check(s.t === null && s.last.ended === 'reset' && !s.boat.away && s.boat.x === 176.6 && !s.fin.vis && s.sky !== 'sunset' && s.pst === 'normal' && s.py < 0.3 && !s.ole.vis && s.ashore === null,
      `a mission start: all back at once (${JSON.stringify({ ended: s.last.ended, boat: s.boat, sky: s.sky, pst: s.pst, py: s.py, ole: s.ole, state: s.state })})`);

    // ---- 7. The flight level: no trip.
    await T.fresh('&mission=2');
    const fl = await T.ev(() => ({ level: __game.level, can: __game.battur.canUse() }));
    check(fl.level === 'flight' && fl.can === false, `no trip from the flight level (${JSON.stringify(fl)})`);
  },

  async batturrio(T) {
    await T.fresh('&mission=13');
    await setup(T);
    await T.ev(() => { __game.addCoins(1000 - __game.coins); });
    await atKiosk(T);
    await T.frames(6);
    let s = await st(T);
    check(s.it === 'battur' && s.prompt.includes('Slutbilden igen – båttur (300 pta)'), `after the end the prompt sells the end card (${s.prompt})`);
    const r = await trip(T, 'batturrio');
    const b0 = r.before, h = r.hamn1;
    T.log('before', JSON.stringify({ coins: b0.coins, sky: b0.sky, tune: b0.tune, outfit: b0.outfit, real: b0.real }));
    check(h.variant === 'rio' && h.tune === 'samba' && h.outfit === 'rio' && h.cup === 'low' && !h.hold, `the reprise: the samba, Stig in his Rio suit with a cup (${JSON.stringify({ tune: h.tune, outfit: h.outfit, cup: h.cup })})`);
    check(h.ole?.st === 'seated' && h.ole.bowtie != null && h.ole.cup === 'low' && !h.ole.point, `Ole's double seated in his Rio suit with a cup (${JSON.stringify(h.ole)})`);
    check(h.majsan?.st === 'seated' && h.siv?.st === 'seated' && h.majsan.cup === 'low' && h.siv.cup === 'low' && aboard(h, h.majsan.x, h.majsan.z) && aboard(h, h.siv.x, h.siv.z), `Majsan and Siv behind them (${JSON.stringify([h.majsan, h.siv])})`);
    const f2 = r.fyren2, said = f2.last.said.map(([w, t]) => `${w}: ${t}`);
    check(f2.sky === 'sunset' && f2.tune === 'samba' && f2.cup === true && f2.ole.cup === true && f2.majsan.cup === true && f2.banner?.includes('RIO…?'), `the lighthouse: the cups raised under the end card's banner (${JSON.stringify({ cup: f2.cup, banner: f2.banner })})`);
    check(said.length === 1 && said[0] === 'ole: Tenk å sitte her i desember. Det er som i Rio.', `Ole's Rio line (${JSON.stringify(said)})`);
    const pr = r.pier;
    check(pr.outfit === b0.outfit && pr.tune === b0.tune && [pr.ole, pr.majsan, pr.siv].every((d) => d.st === 'normal' && d.vis && d.y < 0.7) && pr.ole.bowtie == null, `the quay: his own clothes, the island's tune, all four standing (${JSON.stringify({ outfit: pr.outfit, tune: pr.tune })})`);
    checkRestored(r.after, b0, 'after the reprise');
    check(r.after.last.banner && r.after.ashore?.length === 3, `the reprise played its banner, three doubles on the quay (${r.after.ashore})`);
  },
};
