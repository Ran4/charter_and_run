// Bränsletillägg tillkommer – SunTrip-butiken (free roam, DESIGN §10.23; feature 34): butik, butikbil.
//   butik:    at index 6 (free roam after buss17, the hawaii shirt): the counter's group shown and its
//             solids live, the travel agent behind it; the greeting; E at the hat short of 50 pta
//             ("…inte ens till bränsletillägget.") and of 75 ("…225 pta, tyvärr."), nothing bought;
//             with the purse: the hat on the Trapp Trull account (75 now), the receipt's lines one by
//             one (KVITTO, 100 + four add-ons = 225, the account's line), the sell line, Stig's sigh
//             after the total, the hat on his head (hatSun) and the bag by the counter; "Paketet!" when
//             he walks 8 m off without it, not again until he has been back; E takes the bag. The
//             sunglasses (275), the dotted shirt (350), the nose guard (0 + 50: "Nässkydd – det får du
//             också gratis.", "Gratis… plus bränsletillägg."): the full look; E takes the glasses off
//             and puts them on again. The instalments (75 each, 2 of 3 and 3 of 3) after the account's
//             free-roam time, held back while the purse is short. Ole's line with the hat on. The save
//             and a reload (not fresh): everything back on him. A mission start (friskotek): the group,
//             the clerk and the layer gone and the solids dead; an abort: all back. The Rio outfit
//             gets no layer.
//   butikbil: the full look seated in every enterable car type the player meets (the head with the
//             hat under the roof, the brim inside the body's width), shots from the side.
import { check } from '../lib.mjs';

const PI = Math.PI;
const resetSaid = (T) => T.ev(() => {
  const g = __game;
  if (!window.__said) {
    const o = g.say.bind(g);
    g.say = (t, text, secs) => {
      window.__said.push([typeof t === 'string' ? t : t === g.player ? 'stig' : t.key || '?', text, +g.time.toFixed(2)]);
      return o(t, text, secs);
    };
  }
  window.__said = [];
});
const said = (T) => T.ev(() => window.__said.slice());
const clearPeds = (T, x, z) => T.ev((x, z) => {
  __game.peds.forEach((ped) => { if (Math.hypot(ped.char.x - x, ped.char.z - z) < 45) ped.char.teleport(x + 300, z + 300); });
}, x, z);
async function stand(T, x, z, yaw, cam = 0) {
  await T.ev((x, z, yaw, cam) => {
    const g = __game, p = g.player;
    if (g.playerCar) g.exitCar(true);
    p.state = 'normal';
    p.teleport(x, z, yaw);
    p.vx = p.vz = 0;
    g.cam.yaw = yaw + cam; g.cam.snapNext = true;
  }, x, z, yaw, cam);
  await T.frames(8);
}
const cut = (T, from, to) => T.ev((a, b) => __game.cam.cutTo(a, b), from, to);
const release = (T) => T.ev(() => __game.cam.release());
const shopState = (T) => T.ev(() => {
  const g = __game, s = g.shop, d = g.player.def, k = s.clerk;
  return {
    live: s.live, group: !!window.__shop?.group?.visible, bag: !!window.__shop?.bag?.visible, dead: window.__shop?.blocks.map((b) => b.dead),
    clerk: k ? { up: k.root.visible, x: +k.x.toFixed(2), z: +k.z.toFixed(2) } : null,
    owned: [...s.owned], off: [...s.off], worn: s.worn, trapp: s.trapp, trappT: +s.trappT.toFixed(1), bagTaken: s.bag, coins: g.coins,
    look: { hat: d.hat, hatSun: !!d.hatSun, shades: d.shades ?? null, glasses: d.glasses ?? null, print: d.printStyle ?? null, noseGuard: d.noseGuard ?? null, suit: d.suit ?? null },
    outfit: g.player.outfit, headTop: +g.player.model.headTop.toFixed(3), last: s.last,
  };
});
const prompt = (T) => T.ev(() => document.getElementById('prompt')?.textContent || '');
// In front of ware `id` (0.55 m out from the counter's front), facing it.
const atWare = (T, id) => T.ev((id) => window.__shop.wares[id], id).then((w) => stand(T, w.x, w.z + 1.25, PI));

export const SCENARIOS = {
  async butik(T) {
    await T.fresh('&mission=6');
    await resetSaid(T);
    await T.ev(async () => { window.__shop = (await import('/src/world/blocks/hotels.js')).SUNTRIP_SHOP; });
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island' && __game.player.outfit === 'hawaii'), 'free roam at index 6, the hawaii shirt');
    const cfg = await T.ev(() => __game.shop.cfg);
    const L = await T.L('butik');
    T.log('butik', JSON.stringify(L), 'wares', JSON.stringify(await T.ev(() => window.__shop.wares)));
    await clearPeds(T, L.x, L.z);
    await T.ev(() => { __game.coins = 0; });

    // 0. The shop between missions: group, clerk, live solids; the greeting.
    await stand(T, L.x + 1.5, L.z + 7, PI + 0.2);
    let S = await shopState(T);
    T.log('state', JSON.stringify(S));
    check(S.live && S.group && !S.bag && S.dead.every((d) => !d), 'the counter shown, its solids live, no bag yet');
    check(S.clerk?.up && Math.hypot(S.clerk.x - L.x, S.clerk.z - (L.z - 1.9)) < 0.1, 'the travel agent behind the counter');
    check(await T.ev(() => { const w = window.__shop.blocks.find((b) => b.kind === 'counter'); return !!w && w.top > 1.1; }), 'the counter is a wall');
    await cut(T, { x: L.x + 4.2, y: 2.1, z: L.z + 4.8 }, { x: L.x - 0.6, y: 1.1, z: L.z - 0.9 });
    await T.sleep(400);
    await T.shot('butik_disk');
    await release(T);
    await stand(T, L.x, L.z, PI);
    await T.sleep(300);
    let s = await said(T);
    check(s.some(([w, l]) => w === 'resesaljare' && l === cfg.greet), `the greeting (${JSON.stringify(s)})`);

    // 1. Short of the money: the hat needs 75 now.
    await atWare(T, 'hatt');
    check((await prompt(T)).includes('Köp solhatten (100 pta)'), `the hat's prompt (${await prompt(T)})`);
    await resetSaid(T);
    await T.ev(() => { __game.coins = 30; });
    await T.tap('KeyE'); await T.sleep(200);
    s = await said(T);
    check(s.some(([w, l]) => w === 'resesaljare' && l === cfg.poor) && (await shopState(T)).owned.length === 0, `30 pta: "${cfg.poor}" (${JSON.stringify(s)})`);
    await T.ev(() => { __game.coins = 60; __game.unsay(__game.shop.clerk); });
    await resetSaid(T);
    await T.tap('KeyE'); await T.sleep(200);
    s = await said(T);
    check(s.some(([w, l]) => w === 'resesaljare' && l.includes('225 pta')) && (await T.ev(() => __game.coins)) === 60, `60 pta: the total, nothing paid (${JSON.stringify(s)})`);

    // 2. The hat on the Trapp Trull account.
    await T.ev(() => { __game.coins = 1500; __game.unsay(__game.shop.clerk); });
    await resetSaid(T);
    const top0 = (await shopState(T)).headTop;
    await T.tap('KeyE');
    await T.sleep(250);
    const rc = await T.ev(() => { const r = [...document.querySelectorAll('.toast.receipt')].pop(); return r ? { text: r.textContent, spans: [...r.querySelectorAll('span')].map((e) => +getComputedStyle(e).opacity) } : null; });
    T.log('receipt early', JSON.stringify(rc));
    check(rc && rc.spans.length === 7 && rc.spans[0] > 0 && rc.spans[6] === 0, 'the receipt comes line by line (7 lines, the last still hidden)');
    await T.sleep(1500);
    await cut(T, { x: L.x - 2.6, y: 1.9, z: L.z + 2.3 }, { x: L.x - 0.6, y: 1.5, z: L.z - 0.6 });
    await T.sleep(1000);
    await T.shot('butik_kvitto');
    await release(T);
    S = await shopState(T);
    T.log('after hat', JSON.stringify(S));
    const text = await T.ev(() => [...document.querySelectorAll('.toast.receipt')].pop()?.textContent || '');
    check(text.includes('Kvitto') && text.includes('solhatt 100') && text.includes('+ högsäsong 25') && text.includes('+ avbeställningsskydd 25') && text.includes('+ reseförsäkring 25') && text.includes('+ bränsletillägg 50') && text.includes('= 225 pta') && text.includes('75 pta nu'), `the receipt (${text})`);
    check(S.coins === 1425 && S.owned.join() === 'hatt' && S.trapp === 2 && S.bag && !S.bagTaken, `75 paid, two instalments left, the bag by the counter (${S.coins})`);
    check(S.look.hat === 'bucket' && S.look.hatSun && S.worn === 'hatt' && S.headTop > top0, 'the SunTrip hat on his head (headTop up)');
    s = await said(T);
    const sell = s.find(([w, l]) => w === 'resesaljare' && l === cfg.items[0].sell), sigh = s.find(([w, l]) => w === 'stig' && l === cfg.items[0].sigh);
    check(!!sell && !!sigh && sigh[2] > sell[2] + 0.9 * 5 * cfg.lineSecs, `the sell line, Stig's sigh after the total (${JSON.stringify(s)})`);

    // 3. "Paketet!" walking off without the bag; once; again after coming back. Then the bag.
    await resetSaid(T);
    await stand(T, L.x + 2, L.z + 5, 0);
    await T.hold(['KeyW'], 1200);
    await T.sleep(300);
    s = await said(T);
    check(s.filter(([w, l]) => w === 'resesaljare' && l === cfg.paketet).length === 1, `"Paketet!" (${JSON.stringify(s)})`);
    {
      const p = await T.ev(() => ({ x: __game.player.x, z: __game.player.z }));
      await cut(T, { x: p.x + 2.5, y: 2.3, z: p.z + 4.5 }, { x: L.x, y: 1.3, z: L.z - 1 });
      await T.sleep(250);
      await T.shot('butik_paketet');
      await release(T);
    }
    await stand(T, L.x + 2, L.z + 12, 0);
    await T.sleep(400);
    check((await said(T)).filter(([, l]) => l === cfg.paketet).length === 1, 'not twice in one departure');
    await stand(T, L.x - 1.5, L.z, PI);
    await stand(T, L.x + 2, L.z + 12, 0);
    await T.sleep(300);
    check((await said(T)).filter(([, l]) => l === cfg.paketet).length === 2, 'again after he came back');
    await T.ev(() => window.__shop.wares.bag).then((b) => stand(T, b.x + 0.5, b.z + 0.7, PI + 0.6));
    check((await prompt(T)).includes('Ta strandväskan'), `the bag's prompt (${await prompt(T)})`);
    await resetSaid(T);
    await T.tap('KeyE'); await T.sleep(200);
    S = await shopState(T);
    s = await said(T);
    check(S.bagTaken && !S.bag && s.some(([w, l]) => w === 'stig' && l === cfg.bagTaken), 'E takes the bag, "Paketet. Ja. Tack."');
    await stand(T, L.x + 2, L.z + 12, 0);
    await T.sleep(300);
    check(!(await said(T)).some(([, l]) => l === cfg.paketet), 'no "Paketet!" once he has it');

    // 4. The sunglasses, the shirt, the nose guard.
    for (const [id, cost] of [['glas', 275], ['skjorta', 350], ['nasa', 50]]) {
      await atWare(T, id);
      await T.ev(() => { __game.unsay(__game.shop.clerk); __game.unsay(__game.player); });
      await resetSaid(T);
      const c0 = await T.ev(() => __game.coins);
      await T.tap('KeyE');
      await T.sleep(id === 'nasa' ? 1500 : 300);
      S = await shopState(T);
      check(S.coins === c0 - cost && S.owned.includes(id), `${id}: ${cost} pta (${c0} → ${S.coins})`);
      if (id === 'nasa') {
        const t = await T.ev(() => [...document.querySelectorAll('.toast.receipt')].pop()?.textContent || '');
        s = await said(T);
        check(t.includes('nässkydd 0') && t.includes('+ bränsletillägg 50') && t.includes('= 50 pta'), `the nose guard's receipt (${t})`);
        check(s.some(([w, l]) => w === 'resesaljare' && l === 'Nässkydd – det får du också gratis.') && s.some(([w, l]) => w === 'stig' && l === cfg.items[3].sigh), `"Nässkydd – det får du också gratis." (${JSON.stringify(s)})`);
        await T.shot('butik_nasskydd');
      }
    }
    S = await shopState(T);
    T.log('full look', JSON.stringify(S.look), S.worn);
    check(S.worn === 'hatt glas skjorta nasa' && S.look.shades && S.look.glasses === null && S.look.print === 'dots' && S.look.noseGuard && S.look.suit === null, 'the full look');
    await T.ev(() => { __game.unsay(__game.shop.clerk); __game.unsay(__game.player); });
    await T.sleep(2500);
    // Facing the camera on the open forecourt: the whole look, then his head.
    const F = { x: L.x + 3.5, z: L.z + 5 };
    await stand(T, F.x, F.z, 0.35);
    const hy = await T.ev(() => __game.player.y + __game.player.model.headTop);
    await cut(T, { x: F.x + Math.sin(0.35) * 3.4, y: 1.7, z: F.z + Math.cos(0.35) * 3.4 }, { x: F.x, y: 1.25, z: F.z });
    await T.sleep(500);
    await T.shot('butik_look');
    await cut(T, { x: F.x + Math.sin(0.55) * 1.15, y: hy - 0.25, z: F.z + Math.cos(0.55) * 1.15 }, { x: F.x, y: hy - 0.38, z: F.z });
    await T.sleep(500);
    await T.shot('butik_look_nara');
    await release(T);

    // 5. Off and on at the counter.
    await atWare(T, 'glas');
    check((await prompt(T)).includes('Ta av solglasögonen'), `owned: "Ta av" (${await prompt(T)})`);
    const c1 = await T.ev(() => __game.coins);
    await T.tap('KeyE'); await T.sleep(150);
    S = await shopState(T);
    check(S.off.includes('glas') && !S.look.shades && S.look.glasses && S.worn === 'hatt skjorta nasa' && S.coins === c1, 'E takes the glasses off (his own back on), free');
    check((await prompt(T)).includes('Ta på solglasögonen'), 'then "Ta på"');
    await T.tap('KeyE'); await T.sleep(150);
    S = await shopState(T);
    check(!S.off.length && S.look.shades && S.worn === 'hatt glas skjorta nasa', 'and on again');

    // 6. The instalments: 2 of 3 and 3 of 3, held back while the purse is short.
    await stand(T, L.x + 20, L.z + 10, 0);
    await T.ev((e) => { const s = __game.shop; s.trappT = e - 0.5; __game.coins = 40; }, cfg.trapp.every);
    await T.sleep(1200);
    S = await shopState(T);
    check(S.trapp === 2 && S.coins === 40 && S.trappT < cfg.trapp.every - cfg.trapp.retry + 2, `short: no instalment, tried again later (${S.trappT})`);
    await T.ev((e) => { const s = __game.shop; s.trappT = e - 0.5; __game.coins = 500; }, cfg.trapp.every);
    await T.sleep(1200);
    S = await shopState(T);
    let toasts = await T.ev(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent));
    check(S.trapp === 1 && S.coins === 425 && toasts.some((t) => t.includes('avbetalning 2 av 3, 75 pta')), `instalment 2 of 3 (${JSON.stringify(toasts)})`);
    await T.shot('butik_avbetalning');
    await T.ev((e) => { __game.shop.trappT = e - 0.5; }, cfg.trapp.every);
    await T.sleep(1200);
    S = await shopState(T);
    toasts = await T.ev(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent));
    check(S.trapp === 0 && S.coins === 350 && toasts.some((t) => t.includes('avbetalning 3 av 3') && t.includes('är betalt')), `instalment 3 of 3, the account paid (${JSON.stringify(toasts)})`);

    // 7. Ole sees the hat.
    const ole = await T.ev(() => { const o = __game.npc('ole'); return { x: o.x, z: o.z, yaw: o.yaw }; });
    await resetSaid(T);
    await stand(T, ole.x + Math.sin(ole.yaw) * 3, ole.z + Math.cos(ole.yaw) * 3, ole.yaw + PI);
    await T.until(() => !__game.shop.oleDue, 6000).catch(() => {});
    s = await said(T);
    check(s.some(([w, l]) => w === 'ole' && l === cfg.ole), `Ole: "${cfg.ole}" (${JSON.stringify(s)})`);
    {
      const p = await T.ev(() => ({ x: __game.player.x, z: __game.player.z }));
      const mx = (p.x + ole.x) / 2, mz = (p.z + ole.z) / 2, nx = -(ole.z - p.z) / 3, nz = (ole.x - p.x) / 3;
      await cut(T, { x: mx + nx * 4.5, y: 2.0, z: mz + nz * 4.5 }, { x: mx, y: 1.5, z: mz });
    }
    await T.sleep(300);
    await T.shot('butik_ole');
    await release(T);

    // 8. Saved, and back on him after a reload.
    await T.ev(() => __game.save());
    const saved = await T.ev(() => JSON.parse(localStorage.getItem('charter-and-run-v1')).shop);
    T.log('saved', JSON.stringify(saved));
    check(saved.owned.length === 4 && saved.bag === true && saved.trapp === 0, 'the save holds the purchases');
    await T.page.goto(`http://127.0.0.1:${T.port}/index.html?test=1`, { waitUntil: 'load' });
    await T.page.waitForFunction('window.__ready === true', { timeout: 120000, polling: 250 });
    await T.ev(async () => { window.__shop = (await import('/src/world/blocks/hotels.js')).SUNTRIP_SHOP; });
    await T.frames(10);
    S = await shopState(T);
    T.log('reloaded', JSON.stringify(S));
    check(S.live && S.owned.length === 4 && S.worn === 'hatt glas skjorta nasa' && S.look.hatSun && S.look.noseGuard && S.outfit === 'hawaii', 'after a reload he wears it all again');
    await T.sleep(2000);
    check(!(await T.ev(() => __game.shop.oleDue || __game.shop.last?.kind === 'ole')), 'Ole says nothing about a hat he has seen');
    await T.ev(() => { __game.coins = 0; });

    // 9. A mission start (friskotek, Lasse at the lawn): the shop and the layer gone, the solids
    //    dead; an abort: back.
    await T.startMission();
    await T.frames(6);
    S = await shopState(T);
    T.log('in mission', JSON.stringify(S));
    check(!S.live && !S.group && !S.bag && S.dead.every((d) => d) && !S.clerk.up, 'in a mission: no counter, no clerk, its solids dead');
    check(S.worn === '' && S.look.hat == null && !S.look.hatSun && !S.look.noseGuard && S.look.print === 'floral', 'in a mission: his own hawaii look');
    await T.ev(() => __game.missions.abort());
    await T.frames(6);
    S = await shopState(T);
    check(S.live && S.group && S.dead.every((d) => !d) && S.clerk.up && S.worn === 'hatt glas skjorta nasa', 'back in free roam: the shop and his look');

    // 10. The Rio outfit takes no layer.
    const rio = await T.ev(() => { const g = __game; g.setPlayerOutfit('rio', { persist: false }); const d = g.player.def; const r = { hat: d.hat ?? null, nose: d.noseGuard ?? null, bowtie: d.bowtie ?? null }; return r; });
    await T.frames(4);
    const rio2 = await T.ev(() => ({ worn: __game.shop.worn, hat: __game.player.def.hat ?? null }));
    check(!rio.hat && !rio.nose && rio.bowtie && rio2.worn === '' && !rio2.hat, `rio: no layer (${JSON.stringify([rio, rio2])})`);
    await T.ev(() => { const g = __game; g.applyOutfits(); });
    await T.frames(4);
    check((await shopState(T)).look.hatSun, 'back to the island outfit: the layer again');
    T.log('butik ok');
  },

  async butikbil(T) {
    await T.fresh('&mission=9');
    await T.ev(async () => { window.__shop = (await import('/src/world/blocks/hotels.js')).SUNTRIP_SHOP; });
    await T.ev(() => { const s = __game.shop; for (const id of ['hatt', 'glas', 'skjorta', 'nasa']) s.owned.add(id); s.bag = true; });
    await T.frames(4);
    check(await T.ev(() => __game.shop.worn === 'hatt glas skjorta nasa' && __game.player.def.hatSun), 'the full look on');
    const types = ['hatch', 'sedan', 'taxi', 'wagon', 'pickup', 'grisbil', 'van', 'icecream', 'guardia', 'bus'];
    const L = await T.L('flamencoDrive');
    await clearPeds(T, L.x, L.z);
    const rows = [];
    for (const type of types) {
      const r = await T.ev((type, x, z) => {
        const g = __game, p = g.player;
        if (g.playerCar) g.exitCar(true);
        p.state = 'normal';
        p.teleport(x + 3, z, 0);
        const car = g.spawnParked({ type, x, z, yaw: Math.PI / 2 });
        car.locked = false;
        g.enterCar(car);
        return g.cars.indexOf(car);
      }, type, L.x, L.z);
      await T.frames(10);
      const m = await T.ev((i) => {
        const g = __game, car = g.cars[i], p = g.player, head = p.model.head;
        car.tilt.updateMatrixWorld(true);
        const inv = car.tilt.matrixWorld.clone().invert();
        const pos = head.geometry.attributes.position, v = head.position.clone();
        let maxY = -1e9, maxX = -1e9, minX = 1e9;
        for (let k = 0; k < pos.count; k++) {
          v.fromBufferAttribute(pos, k).applyMatrix4(head.matrixWorld).applyMatrix4(inv);
          maxY = Math.max(maxY, v.y); maxX = Math.max(maxX, v.x); minX = Math.min(minX, v.x);
        }
        return { type: car.type, seated: p.car === car, roof: +car.roofY().toFixed(3), top: +maxY.toFixed(3), x: [+minX.toFixed(3), +maxX.toFixed(3)], half: car.spec.wid / 2, scale: +p.root.scale.x.toFixed(3) };
      }, r);
      rows.push(m);
      T.log('seat', type, JSON.stringify(m));
      // From the driver's side (the car faces +x: its left, where he sits, is −z).
      await T.ev(() => { const g = __game, c = g.playerCar, d = c.spec.len * 0.12; g.cam.cutTo({ x: c.x + 1.2 + d, y: c.y + 2.0, z: c.z - 4.2 }, { x: c.x + d, y: c.y + 1.3, z: c.z - 0.4 }); });
      await T.sleep(350);
      await T.shot(`butikbil_${type}`);
      await T.ev(() => __game.cam.release());
      await T.ev((i) => { const g = __game, car = g.cars[i]; g.exitCar(true); g.removeCar(car); }, r);
      await T.frames(4);
    }
    for (const m of rows) {
      check(m.seated, `${m.type}: seated`);
      check(m.top <= m.roof + 0.02, `${m.type}: the hat under the roof (${m.top} ≤ ${m.roof})`);
      check(m.x[1] < m.half && m.x[0] > -m.half, `${m.type}: the brim inside the body (${m.x} within ±${m.half})`);
    }
    check(await T.ev(() => { const g = __game; return !g.playerCar && g.shop.worn === 'hatt glas skjorta nasa' && g.player.def.hatSun; }), 'on foot again with the full look');
    T.log('butikbil ok');
  },
};
