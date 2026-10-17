// Livräddarens kikare (free roam, DESIGN §10.48; feature 108): kikare, kikareshots.
//   kikare: at index 9 between missions, the binoculars on the SOCORRISTA tower's south railing; no prompt
//           from the sand under the platform, "E Ta kikaren" up on it. E stands Stig in the middle with
//           them at his eyes (hidden, the eye ahead of his face), the view narrow (12°) and round, the
//           list (eight, none checked), the bar KIKAREN · HITTAT 0 / 8, the keys, and on the first look
//           Ole's warning in Stig's mouth; W/S/A/D and the mouse turn it, W does not move him; Herr Storch
//           turns to the tower and films it. The aim ring fills on a target held in the middle, and after
//           `hold` s it is found: checked, 25 pta, Stig's line, the name on the bar, records.kikare saved;
//           a glance away resets it. E lowers them: the pair back on the railing, Stig free, the camera
//           behind him under the tower's roof (its new camera ceiling), Herr Storch back to the sea. A fin
//           already taken counts as found. All eight: "Alla åtta!", the cut to Stig from the sand with the
//           binoculars at his chest and "Inga hajar. Bara svenskar.", then free; a later look opens with
//           that line. No prompt in a car, in a pursuit or in a mission; a mission start mid-look puts them
//           down. Seven found and the fin taken since: the next look makes eight and ends at once. Shots
//           `kikare_prompt`, `_upp`, `_ring`, `_fynd`, `_ner`, `_slut`.
//   kikareshots: every target through the binoculars, aimed at it (`kikare_<id>`), and Stig on the
//           platform from outside with them at his eyes (`kikare_stig`).
import { check } from '../lib.mjs';

const raf = (T, fn, timeout = 20000, ...a) => T.page.waitForFunction(fn, { timeout, polling: 'raf' }, ...a);

async function spies(T) {
  await T.ev(async () => {
    const g = __game, { hud } = await import('/src/game/hud.js');
    window.__said = []; window.__toasts = [];
    const say = g.say.bind(g);
    g.say = (t, text, secs) => { window.__said.push([t === g.player ? 'stig' : t?.key || 'x', text]); return say(t, text, secs); };
    const toast = hud.toast.bind(hud);
    hud.toast = (text, ...a) => { window.__toasts.push(text.replace(/<[^>]+>/g, '')); return toast(text, ...a); };
    window.__hud = hud;
  });
}
// Stig on foot on the platform, `back` m behind its middle (towards the ramp), facing the sea.
async function onTower(T, back = 0.6, yaw = 0) {
  await T.ev(({ back, yaw }) => {
    const g = __game, s = window.__lm('kikare'), p = g.player;
    if (g.playerCar) g.exitCar(true);
    if (g.kikare.busy) g.kikare.end('down');
    p.state = 'normal';
    p.x = s.x; p.z = s.z - back; p.y = s.y; p.yaw = yaw; p.vx = p.vz = p.vy = 0; p.onGround = true;
    g.cam.yaw = yaw; g.cam.pitch = 0.3; g.cam.snapNext = true;
  }, { back, yaw });
  await T.frames(10);
}
const st = (T) => T.ev(() => {
  const g = __game, K = g.kikare, p = g.player, s = window.__lm('kikare'), e = document.getElementById('kikare');
  const it = g.nearestInteractable(), sc = K.sc;
  return {
    up: K.up, busy: K.busy, out: !!sc?.out, aim: sc?.aim ?? null, k: sc ? +sc.k.toFixed(2) : null, lastAim: K.lastAim,
    found: K.found.slice(), last: K.last, coins: g.coins,
    prompt: window.__hud._prompt || '', near: it?.type === 'it' ? it.it.id : it?.type || null,
    inDialog: g.inDialog, scope: g.cam.scope ? { fov: g.cam.scope.fov, yaw: +g.cam.scope.yaw.toFixed(3), pitch: +g.cam.scope.pitch.toFixed(3) } : null,
    camFov: +g.cam.fov.toFixed(1), cine: !!g.cam.cine, pose: p.anim.kikare || null, visible: p.root.visible, rest: K.rest.visible,
    overlay: e.classList.contains('show') ? {
      title: e.querySelector('.kk-title').textContent, rows: [...e.querySelectorAll('.kk-row')].map((r) => (r.classList.contains('found') ? '+' : '-') + r.textContent),
      bar: e.querySelector('.kk-count').textContent, news: e.querySelector('.kk-new').textContent, line: e.querySelector('.kk-line').textContent,
      keys: e.querySelector('.kk-keys').textContent, ring: e.classList.contains('aim'),
    } : null,
    storch: (() => { const n = g.npcs.herrStorch; return { film: !!n.anim.film, yaw: +n.yaw.toFixed(3), x: +n.x.toFixed(2), z: +n.z.toFixed(2) }; })(),
    ms: g.missions.state, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3),
    eye: { x: +g.cam.pos.x.toFixed(2), y: +g.cam.pos.y.toFixed(2), z: +g.cam.pos.z.toFixed(2) },
  };
});
// Aim the binoculars at target `id` (its first point, or its live one), off by `off`° to the side.
const aimAt = (T, id, off = 0) => T.ev(({ id, off }) => {
  const K = __game.kikare, t = K.cfg.targets.find((q) => q.id === id), q = K.points(t)[0], e = __game.cam.scope.pos;
  K.sc.yaw = Math.atan2(q.x - e.x, q.z - e.z) + off * Math.PI / 180;
  K.sc.pitch = Math.atan2(q.y - e.y, Math.hypot(q.x - e.x, q.z - e.z));
  K.place();
}, { id, off });
const window_clear = (T) => T.ev(() => { window.__said = []; window.__toasts = []; });
async function look(T) {
  await onTower(T);
  await T.tap('KeyE');
  await T.frames(3);
}

export const SCENARIOS = {
  async kikare(T) {
    await T.fresh('&mission=9');
    await spies(T);
    check(await T.ev(() => __game.missions.state === 'idle' && __game.level === 'island'), 'free roam on the island');
    let r = await st(T);
    check(r.rest && !r.overlay && r.found.length === 0, `the binoculars on the railing, nothing found (${JSON.stringify(r)})`);

    // 1. No prompt from the sand under the platform; on it "E Ta kikaren".
    await T.ev(() => { const s = window.__lm('kikare'); __game.debugWarp(s.x + 1.9, s.z, 0); });
    await T.frames(6);
    r = await st(T);
    check(r.near !== 'kikare' && r.y < 1, `no prompt on the sand beside the tower (${r.near}, y ${r.y})`);
    await onTower(T);
    r = await st(T);
    T.log('on the tower', JSON.stringify(r));
    check(r.near === 'kikare' && /Ta kikaren/.test(r.prompt), `the prompt "E Ta kikaren" on the platform (${r.near}, "${r.prompt}")`);
    await T.shot('kikare_prompt');

    // 2. E: the binoculars up.
    await T.tap('KeyE');
    await T.frames(4);
    r = await st(T);
    T.log('up', JSON.stringify(r));
    const s0 = await T.L('kikare');
    check(r.up && r.inDialog && r.scope && r.scope.fov === 12 && r.camFov === 12 && r.pose === 'eyes' && !r.visible && !r.rest,
      `E: the binoculars up, the 12° view, Stig hidden with them at his eyes, the railing empty (${JSON.stringify(r)})`);
    check(Math.hypot(r.x - s0.x, r.z - s0.z) < 0.01 && Math.abs(r.y - 2.75) < 0.01, `in the middle of the platform (${r.x}, ${r.y}, ${r.z})`);
    check(Math.abs(r.eye.y - (2.75 + 2.3)) < 0.02 && Math.abs(Math.hypot(r.eye.x - r.x, r.eye.z - r.z) - 0.45) < 0.02, `the eye at his, at the binoculars before his face (${JSON.stringify(r.eye)})`);
    check(r.overlay && r.overlay.title === 'SPANING' && r.overlay.rows.length === 8 && r.overlay.rows.every((x) => x[0] === '-') && r.overlay.bar === 'KIKAREN · HITTAT 0 / 8' && !r.overlay.news,
      `the overlay: SPANING, eight unchecked, KIKAREN · HITTAT 0 / 8 (${JSON.stringify(r.overlay)})`);
    check(/Underströmmar, solsting och hajar/.test(r.overlay.line) && /Spana/.test(r.overlay.keys) && /Sänk kikaren/.test(r.overlay.keys), `Ole's warning in Stig's mouth, the keys (${r.overlay.line} | ${r.overlay.keys})`);
    check(r.prompt === '' || !/Ta kikaren/.test(r.prompt), `no prompt while they are up ("${r.prompt}")`);
    await T.frames(30);
    r = await st(T);
    check(r.storch.film && Math.abs(Math.atan2(Math.sin(r.storch.yaw - Math.atan2(s0.x - r.storch.x, s0.z - r.storch.z)), Math.cos(r.storch.yaw - Math.atan2(s0.x - r.storch.x, s0.z - r.storch.z)))) < 0.3,
      `Herr Storch turns to the tower and films it (${JSON.stringify(r.storch)})`);
    await T.shot('kikare_upp');

    // 3. The keys turn it; W does not move him.
    const y0 = r.scope.yaw, p0 = r.scope.pitch;
    await T.hold(['KeyD'], 400);
    r = await st(T);
    check(r.scope.yaw < y0 - 0.05 && Math.hypot(r.x - s0.x, r.z - s0.z) < 0.01, `D turns the view right (${y0} -> ${r.scope.yaw}), he stays put`);
    await T.hold(['KeyW'], 300);
    r = await st(T);
    check(r.scope.pitch > p0 + 0.03 && Math.hypot(r.x - s0.x, r.z - s0.z) < 0.01, `W tilts it up (${p0} -> ${r.scope.pitch}), he stays put`);
    await T.hold(['KeyW'], 2500);
    r = await st(T);
    check(r.scope.pitch <= 0.32 + 1e-6, `the pitch stops at 0.32 (${r.scope.pitch})`);

    // 4. A target held in the middle: the ring fills; away resets; held `hold` s it is found.
    await aimAt(T, 'flotte');
    await T.frames(6);
    r = await st(T);
    check(r.aim === 'flotte' && r.k > 0 && r.k < 1 && r.overlay.ring, `the raft in the middle: the ring fills (${r.aim}, ${r.k})`);
    await T.shot('kikare_ring');
    await aimAt(T, 'flotte', 25);
    await T.frames(40);
    r = await st(T);
    check(r.aim === null && r.k === 0 && !r.overlay.ring, `away from it the ring empties (${r.aim}, ${r.k})`);
    await aimAt(T, 'flotte');
    const c0 = r.coins;
    await raf(T, () => __game.kikare.found.includes('flotte'), 8000);
    await T.frames(3);
    r = await st(T);
    T.log('found the raft', JSON.stringify(r));
    check(r.found.join() === 'flotte' && r.coins === c0 + 25 && r.overlay.rows[2] === '+Flotten' && r.overlay.bar === 'KIKAREN · HITTAT 1 / 8' && r.overlay.news === 'FLOTTEN',
      `found: checked, +25 pta, HITTAT 1 / 8 · FLOTTEN (${JSON.stringify(r.overlay)}, ${r.coins})`);
    check(/En flotte/.test(r.overlay.line) && r.last.kind === 'flotte' && r.last.n === 1 && !r.last.all, `Stig's line (${r.overlay.line})`);
    const saved = await T.ev(() => JSON.parse(localStorage.getItem('charter-and-run-v1')).records.kikare);
    check(JSON.stringify(saved) === '["flotte"]', `records.kikare saved (${JSON.stringify(saved)})`);
    await T.shot('kikare_fynd');
    await T.frames(20);
    r = await st(T);
    check(r.aim !== 'flotte', `a found one is not aimed at again (${r.aim}: the fin is 2° from the raft, inside the buoy line)`);

    // 5. E lowers them: the pair back on the railing, Stig free, the camera behind him; Storch back.
    await T.tap('KeyE');
    await T.frames(4);
    r = await st(T);
    T.log('down', JSON.stringify(r));
    check(!r.busy && !r.inDialog && !r.scope && !r.overlay && r.rest && r.visible && !r.pose && r.camFov > 55 && r.last.kind === 'down',
      `E: down, the pair on the railing, Stig free and seen (${JSON.stringify(r)})`);
    check(!r.storch.film, `Herr Storch stops filming (${JSON.stringify(r.storch)})`);
    await T.frames(90);
    r = await st(T);
    check(Math.abs(r.storch.yaw) < 0.02, `and turns back to the sea (${r.storch.yaw})`);
    await T.frames(20);
    await T.shot('kikare_ner');
    // The tower's roof (2.75 over the platform, a camera ceiling) never between the chase eye and his head.
    const cam = await T.ev(async () => {
      const { ceilingHit } = await import('/src/world/collision.js');
      const g = __game, p = g.player, e = g.cam.pos, out = {};
      return { y: +e.y.toFixed(2), z: +e.z.toFixed(2), roof: !!ceilingHit(e.x, e.y, e.z, p.x, p.y + 2.2, p.z, -1, out, 0, 0) };
    });
    check(!cam.roof, `the chase eye sees his head, no roof between (${JSON.stringify(cam)})`);

    // 6. A fin already taken counts as found (no pay, no line); Q lowers them too.
    await T.ev(() => { const g = __game, c = g.collectibles.fenor.find((k) => k.id === 'fena_hav'); g.collect('fenor', c); });
    await look(T);
    r = await st(T);
    check(r.found.includes('fena') && r.overlay.rows[0] === '+Hajfena' && r.overlay.bar === 'KIKAREN · HITTAT 2 / 8' && !/Underströmmar/.test(r.overlay.line),
      `the taken fin counts, no second warning (${JSON.stringify(r.overlay)})`);
    await T.tap('KeyQ');
    await T.frames(4);
    r = await st(T);
    check(!r.busy && !r.inDialog && r.last.kind === 'down', `Q lowers them (${r.busy}, ${r.last.kind})`);

    // 7. All eight: the last brings "Alla åtta!", the cut to him from the sand, "Inga hajar. Bara svenskar."
    await look(T);
    for (const id of ['storch', 'trampbat', 'farja', 'fiskebat', 'fyr']) {
      await aimAt(T, id);
      await raf(T, (id) => __game.kikare.found.includes(id), 8000, id).catch(async (e) => { T.log('not found', id, JSON.stringify(await st(T))); throw e; });
      await T.frames(2);
    }
    r = await st(T);
    check(r.found.length === 7 && !r.last.all, `seven found (${r.found})`);
    await window_clear(T);
    await aimAt(T, 'handdukar');
    await raf(T, () => __game.kikare.found.includes('handdukar'), 8000);
    await T.frames(3);
    r = await st(T);
    T.log('eighth', JSON.stringify(r));
    check(r.last.all && r.overlay.bar === 'ALLA ÅTTA!' && r.overlay.rows.every((x) => x[0] === '+'), `all eight: ALLA ÅTTA!, every row checked (${JSON.stringify(r.overlay)})`);
    await raf(T, () => __game.kikare.sc?.out, 10000);
    await T.frames(20);
    r = await st(T);
    T.log('lowered', JSON.stringify(r));
    check(r.out && r.cine && !r.scope && !r.overlay && r.visible && r.pose === 'low' && Math.abs(r.yaw) < 0.01 && r.inDialog,
      `the cut to him from the sand, the binoculars at his chest, facing the sea (${JSON.stringify(r)})`);
    check((await T.ev(() => window.__said.slice())).some(([w, t]) => w === 'stig' && t === 'Inga hajar. Bara svenskar.'), 'Stig: "Inga hajar. Bara svenskar."');
    check((await T.ev(() => window.__toasts.slice())).some((t) => /alla åtta hittade/.test(t)), 'the toast at the cut');
    await T.shot('kikare_slut');
    await raf(T, () => !__game.kikare.busy, 10000);
    await T.frames(4);
    r = await st(T);
    check(!r.inDialog && r.last.kind === 'done' && r.rest && !r.pose && !r.cine, `then free (${JSON.stringify(r)})`);
    await look(T);
    r = await st(T);
    check(/Inga hajar. Bara svenskar./.test(r.overlay.line) && r.overlay.bar === 'ALLA ÅTTA!', `a later look opens with his line (${r.overlay.line})`);
    await T.tap('KeyE');
    await T.frames(4);

    // 8. No prompt in a car, in a pursuit or in a mission; a mission start mid-look.
    await T.ev(() => { const g = __game; g.records.kikare = ['flotte']; });
    await T.ev(() => { const g = __game, s = window.__lm('kikare'), c = g.ensureNamedCar('hyrbil'); c.place(s.x - 30, s.z - 30, 0); g.enterCar(c); });
    await T.frames(4);
    await T.ev(() => { const s = window.__lm('kikare'); __game.playerCar.place(s.x - 5, s.z - 6, 0); });
    await T.frames(6);
    r = await st(T);
    check(r.near !== 'kikare' && !/Ta kikaren/.test(r.prompt), `no prompt at the wheel (${r.near}, "${r.prompt}")`);
    await T.ev(() => { const g = __game; g.exitCar(true); const c = g.named.hyrbil; c.place(c.home.x, c.home.z, c.home.yaw); });
    await onTower(T);
    await T.ev(() => { const s = __game.shame; s.v = 0; s.add(100, { force: true }); });   // forced: Herr Storch's witness rule covers the tower
    await T.frames(4);
    r = await st(T);
    const pur = await T.ev(() => __game.shame.pursuit);
    check(pur && r.near !== 'kikare', `no prompt in a pursuit (${pur}, ${r.near})`);
    await T.ev(() => { const s = __game.shame; if (s.pursuit) { s.v = 0; s.endPursuit(true); } s.forced = false; });
    await T.frames(4);
    await look(T);
    await aimAt(T, 'storch');
    await T.frames(4);
    await T.ev(() => { __game.missions.begin(); });
    await T.frames(6);
    r = await st(T);
    T.log('mission mid-look', JSON.stringify(r));
    check(r.ms !== 'idle' && !r.busy && r.last.kind === 'gone' && !r.scope && !r.overlay && r.rest && r.visible && !r.pose && !r.storch.film,
      `a mission start mid-look: down at once, nothing left (${JSON.stringify(r)})`);
    await T.until(() => __game.missions.state === 'running', 60000);
    await onTower(T);
    r = await st(T);
    check(r.ms === 'running' && r.near !== 'kikare' && !/Ta kikaren/.test(r.prompt), `in the mission no prompt (${r.ms}, ${r.near}, "${r.prompt}")`);
    await T.ev(() => __game.kikare.start());
    r = await st(T);
    check(!r.busy && !r.scope, 'and no look by hand');
    await T.ev(() => __game.missions.abort());
    await T.frames(4);
    await onTower(T);
    r = await st(T);
    check(r.ms === 'idle' && r.near === 'kikare', `after the mission (Q) the prompt again (${r.ms}, ${r.near})`);

    // 9. Seven found and the fin taken since: the next look has all eight, and the end comes at once.
    await T.ev(() => { __game.records.kikare = ['storch', 'flotte', 'trampbat', 'farja', 'fiskebat', 'fyr', 'handdukar']; });
    await look(T);
    r = await st(T);
    check(r.found.length === 8 && r.overlay.bar === 'ALLA ÅTTA!', `the taken fin makes eight (${r.found}, ${r.overlay?.bar})`);
    await raf(T, () => __game.kikare.sc?.out, 10000);
    await raf(T, () => !__game.kikare.busy, 10000);
    r = await st(T);
    check(r.last.kind === 'done' && !r.inDialog, `the end shot, then free (${JSON.stringify(r.last)})`);
  },

  async kikareshots(T) {
    await T.fresh('&mission=9');
    await spies(T);
    // Every target through the binoculars, aimed at its middle.
    await look(T);
    for (const id of ['fena', 'storch', 'flotte', 'trampbat', 'farja', 'fiskebat', 'fyr', 'handdukar']) {
      await aimAt(T, id);
      await T.frames(id === 'storch' ? 30 : 6);
      const r = await st(T);
      T.log(id, r.aim, r.lastAim, JSON.stringify(r.scope));
      check(r.aim === id, `aimed at ${id} (${r.aim})`);
      await T.shot('kikare_' + id);
      await aimAt(T, id, 30);   // off it, so it is not found and the next shot has no line
      await T.frames(30);
    }
    // The other pedal boats, the lighthouse's top and a look straight down at the sand.
    await T.ev(() => { const K = __game.kikare; K.sc.yaw = Math.atan2(72 - 17, 322 - 258); K.sc.pitch = -0.05; K.place(); });
    await T.shot('kikare_trampbat2');
    await T.ev(() => { const K = __game.kikare; K.sc.yaw = Math.PI; K.sc.pitch = -0.62; K.place(); });
    await T.shot('kikare_ner_mot_sanden');
    await T.tap('KeyE');
    await T.frames(4);
    // Stig on the platform from outside: the binoculars at his eyes, then at his chest.
    for (const [pose, name] of [['eyes', 'kikare_stig'], ['low', 'kikare_stig_low']]) {
      await T.ev((pose) => {
        const g = __game, s = window.__lm('kikare'), p = g.player;
        p.x = s.x; p.z = s.z; p.y = s.y; p.yaw = 0; g.inDialog = true; p.anim.kikare = pose;
        g.cam.cutTo({ x: s.x + 1.2, y: s.y + 1.9, z: s.z + 4.2 }, { x: s.x, y: s.y + 1.8, z: s.z });
      }, pose);
      await T.frames(30);
      await T.shot(name);
    }
    await T.ev(() => { const g = __game; g.player.anim.kikare = false; g.inDialog = false; g.cam.release(); });
  },
};
