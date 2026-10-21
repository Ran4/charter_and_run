// Ljudlandskap per kvarter (free roam, DESIGN §10.60; feature 131): ljud, ljudklipp.
//   ljud: at index 9 between missions. At Flamenco's pool deck no layer is heard (between the zones only
//         the tune). On the beach the surf's layer is up alone (its bed sounding) and a wave comes; on the
//         quay the marina's (with the surf a little), gulls, creaks and lapping; at Fataga's fold the
//         fold's (its wind sounding), the sheep's bells; at Templo Ecuménico the church's and a peal of
//         its bells; before the SunTrip stage the stage's with the band: Affe's and Gabbe's notes on the
//         tune's own bars (sol's beat, every note on a sixteenth), the stage's layer sounding and the tune
//         ducked; with the samba the band follows it; past 23:00, with Affe hidden or after the end (Affe
//         and Gabbe at Flamenco's pool) no band; at La Medina the bar's (its murmur sounding), chatter and
//         glasses, and after ten at night Tonga Tonga's bass on the tune's beats. Every one-shot kind
//         sounds in its layer (each one's peak level logged). The sides: the surf heard from the side the
//         sea is on, the other way round with the camera turned. Lowered in a car, not in the pedal boat;
//         halved in a pursuit; out under a dialogue box, under the letterbox, during a mission (and back
//         after its abort), with `enabled` false; the pause menu silences the channel and brings it back;
//         nothing in the flight level.
//   ljudklipp: the game's own output (music and soundscape, at ts 1) and the soundscape alone recorded
//         at seven places as WAV files in OUT for listening (`LJUD_SECS` s each, 12 by default): the deck,
//         the beach, the quay, the fold, the church (with a peal), the stage and La Medina by night.
import fs from 'fs';
import path from 'path';
import { check } from '../lib.mjs';

const near = (a, b, e = 0.02) => Math.abs(a - b) <= e;
// Stig on foot at (x, z) facing yaw, the camera behind him.
const at = (T, x, z, yaw = 0) => T.ev((x, z, yaw) => {
  const g = __game;
  if (g.playerCar) g.exitCar(true);
  g.player.state = 'normal';
  g.debugWarp(x, z, yaw); g.cam.yaw = yaw; g.cam.snapNext = true;
}, x, z, yaw);
const atLm = async (T, name, ahead = 0, yaw = null) => {
  const L = await T.L(name);
  const y = yaw ?? L.yaw;
  await at(T, L.x + Math.sin(L.yaw) * ahead, L.z + Math.cos(L.yaw) * ahead, y);
};
// The soundscape and the channel now.
const st = (T) => T.ev(() => {
  const g = __game, J = g.ljud, a = window.__audio.ambState();
  const r2 = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +v.toFixed(3)]));
  return { levels: r2(J.levels), out: r2(J.out), pans: r2(J.pans), mix: +J.mix.toFixed(3), band: J.band, club: J.club, duck: J.musicDuck,
    counts: { ...J.counts }, right: J.right, a, h: g.day.h, ms: g.missions.state, x: +g.focus().x.toFixed(1), z: +g.focus().z.toFixed(1) };
});
const allOff = (o, but = []) => Object.entries(o).every(([k, v]) => but.includes(k) || v < 0.01);
// The peak RMS of the channel and of every layer, sampled every 100 ms for `ms`.
const peaks = (T, ms) => T.ev(async (ms) => {
  const out = { all: 0 };
  for (let t = 0; t < ms; t += 100) {
    const a = window.__audio.ambState();
    out.all = Math.max(out.all, a.rms);
    for (const [k, L] of Object.entries(a.layers)) out[k] = Math.max(out[k] || 0, L.rms);
    await new Promise((r) => setTimeout(r, 100));
  }
  return out;
}, ms);
const settle = (T, ms = 1600) => T.sleep(ms);

// Records `secs` s of master (what the player hears, before the compressor) and of the soundscape's
// channel alone at the same time into two 16-bit stereo WAVs, `file`.wav and `file`_bara.wav.
async function record(T, file, secs) {
  const [b1, b2] = await T.ev(async (secs) => {
    const { master, ambient } = window.__audio.ambNodes();
    const ctx = master.context, n = Math.round(secs * ctx.sampleRate);
    const ch = [0, 1, 2, 3].map(() => new Float32Array(n));
    let k = 0;
    const merger = ctx.createChannelMerger(4), s1 = ctx.createChannelSplitter(2), s2 = ctx.createChannelSplitter(2);
    master.connect(s1); ambient.connect(s2);
    s1.connect(merger, 0, 0); s1.connect(merger, 1, 1); s2.connect(merger, 0, 2); s2.connect(merger, 1, 3);
    const sp = ctx.createScriptProcessor(4096, 4, 1), sink = ctx.createGain();
    sink.gain.value = 0;
    await new Promise((done) => {
      sp.onaudioprocess = (e) => {
        const m = Math.min(e.inputBuffer.length, n - k);
        for (let c = 0; c < 4; c++) ch[c].set(e.inputBuffer.getChannelData(c).subarray(0, m), k);
        k += m;
        if (k >= n) done();
      };
      merger.connect(sp); sp.connect(sink).connect(ctx.destination);
    });
    master.disconnect(s1); ambient.disconnect(s2); sp.disconnect(); merger.disconnect();
    const wav = (L, R) => {
      const pcm = new Int16Array(n * 2);
      for (let i = 0; i < n; i++) { pcm[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; pcm[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
      const head = new DataView(new ArrayBuffer(44)), sr = ctx.sampleRate;
      const s = (o, t) => { for (let i = 0; i < t.length; i++) head.setUint8(o + i, t.charCodeAt(i)); };
      s(0, 'RIFF'); head.setUint32(4, 36 + pcm.byteLength, true); s(8, 'WAVE'); s(12, 'fmt ');
      head.setUint32(16, 16, true); head.setUint16(20, 1, true); head.setUint16(22, 2, true); head.setUint32(24, sr, true);
      head.setUint32(28, sr * 4, true); head.setUint16(32, 4, true); head.setUint16(34, 16, true); s(36, 'data'); head.setUint32(40, pcm.byteLength, true);
      const bytes = new Uint8Array(44 + pcm.byteLength);
      bytes.set(new Uint8Array(head.buffer), 0); bytes.set(new Uint8Array(pcm.buffer), 44);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    };
    return [wav(ch[0], ch[1]), wav(ch[2], ch[3])];
  }, secs);
  fs.writeFileSync(file + '.wav', Buffer.from(b1, 'base64'));
  fs.writeFileSync(file + '_bara.wav', Buffer.from(b2, 'base64'));
  T.log('recorded', file + '.wav', '+ _bara.wav');
}

const audioUp = (T) => T.ev(async () => {
  window.__audio = (await import('/src/audio.js')).audio;
  window.__hud = (await import('/src/game/hud.js')).hud;
  return window.__audio.ready && window.__audio.level().state === 'running';
});

export const SCENARIOS = {
  async ljud(T) {
    await T.fresh('&mission=9');
    check(await audioUp(T), 'the audio context runs');
    let r;

    // 0. Flamenco's pool deck, between the zones: nothing but the tune.
    await settle(T, 2000);
    r = await st(T);
    const music = await T.ev(async () => { let m = 0; for (let k = 0; k < 20; k++) { m = Math.max(m, window.__audio.level().rms); await new Promise((d) => setTimeout(d, 100)); } return +m.toFixed(4); });
    T.log('deck', JSON.stringify({ levels: r.levels, mix: r.mix, rms: r.a.rms, musicPeak: music }));
    check(r.ms === 'idle' && r.mix === 1 && allOff(r.levels) && r.a.rms < 0.002 && !r.band, `the pool deck: no layer (${JSON.stringify(r.levels)}, rms ${r.a.rms})`);

    // 1. The beach, 8 m from the foam line: the surf alone, its bed sounding, a wave within its pause.
    await at(T, 40, 292.5, Math.PI);
    await settle(T);
    r = await st(T);
    T.log('beach', JSON.stringify({ levels: r.levels, layers: r.a.layers.waves, pans: r.pans }));
    check(r.levels.waves === 1 && allOff(r.levels, ['waves']) && r.a.layers.waves.gain > 0.9 && r.a.layers.waves.rms > 0.004, `the beach: the surf alone and sounding (${JSON.stringify(r.levels)}, ${JSON.stringify(r.a.layers.waves)})`);
    const w0 = r.counts.wave;
    await T.until((n) => __game.ljud.counts.wave > n, 9000, w0).catch(() => {});
    r = await st(T);
    check(r.counts.wave > w0, `a wave comes (${w0} -> ${r.counts.wave})`);
    // The sides: 60 m up the beach the surf comes from the sea's side, the other way round turned round.
    await at(T, 40, 240, Math.PI / 2);
    await T.frames(20);
    r = await st(T);
    const sea1 = { pan: r.pans.waves, right: r.right };
    await at(T, 40, 240, -Math.PI / 2);
    await T.frames(20);
    r = await st(T);
    const sea2 = { pan: r.pans.waves, right: r.right };
    T.log('sides', JSON.stringify({ sea1, sea2, level: r.levels.waves }));
    check(r.levels.waves > 0.15 && r.levels.waves < 0.5 && Math.sign(sea1.pan) === Math.sign(sea1.right.z) && Math.abs(sea1.pan) > 0.5 && near(sea2.pan, -sea1.pan, 0.06),
      `the surf heard from the sea's side, the other side turned round (${JSON.stringify({ sea1, sea2 })})`);

    // 2. The marina's quay: its layer up (the surf a little), gulls, creaks and lapping.
    await atLm(T, 'hamn');
    await T.ev(() => { const n = __game.ljud.next; n.gulls = Math.min(n.gulls, 1); n.creak = Math.min(n.creak, 1.5); });
    await settle(T, 6000);
    r = await st(T);
    T.log('hamn', JSON.stringify({ levels: r.levels, counts: r.counts }));
    check(r.levels.hamn === 1 && r.levels.waves > 0.2 && r.levels.waves < 0.6 && allOff(r.levels, ['hamn', 'waves']), `the quay: the marina's layer and a little surf (${JSON.stringify(r.levels)})`);
    check(r.counts.gulls > 0 && r.counts.creak > 0 && r.counts.lap > 0, `gulls, creaks and lapping (${JSON.stringify(r.counts)})`);

    // 3. Fataga's fold: its layer alone, the wind sounding, the sheep's bells.
    await atLm(T, 'fatagaFold');
    await settle(T, 5000);
    r = await st(T);
    T.log('fold', JSON.stringify({ levels: r.levels, layer: r.a.layers.fold, counts: r.counts }));
    check(r.levels.fold === 1 && allOff(r.levels, ['fold']) && r.a.layers.fold.rms > 0.002 && r.counts.tinkle > 0, `the fold: its layer alone, the wind and the bells (${JSON.stringify({ l: r.levels, f: r.a.layers.fold, n: r.counts.tinkle })})`);

    // 4. Every one-shot kind sounds in its layer (forced here; their peak levels for the mix).
    const kinds = { waves: ['wave'], hamn: ['gulls', 'creak', 'lap', 'halyard'], fold: ['tinkle', 'baa', 'villageBell'], kyrka: ['peal'], bar: ['chatter', 'laugh', 'clink'] };
    const lmOf = { waves: null, hamn: 'hamn', fold: 'fatagaFold', kyrka: 'kyrka', bar: 'kasbah' };
    const peaksOf = {};
    for (const [layer, list] of Object.entries(kinds)) {
      if (lmOf[layer]) await atLm(T, lmOf[layer]); else await at(T, 40, 292.5, Math.PI);
      // Only the forced one: the layer's own one-shots held off and its beds muted meanwhile.
      await T.ev(() => { for (const k in __game.ljud.next) __game.ljud.next[k] = 99; for (const b of Object.values(window.__audio.ambNodes().beds)) b.g.gain.value = 0; });
      await settle(T);
      const base = (await peaks(T, 600))[layer];
      for (const k of list) {
        await T.ev((k) => window.__audio.amb[k](), k);
        const p = await peaks(T, k === 'peal' || k === 'villageBell' || k === 'wave' ? 4000 : 1600);
        peaksOf[k] = +Math.sqrt(Math.max(0, p[layer] ** 2 - base ** 2)).toFixed(4);   // its own, the bed's power taken off
        await T.sleep(k === 'peal' ? 3500 : 400);
      }
    }
    await T.ev(() => { const B = window.__audio.ambNodes().beds; B.sea.g.gain.value = 0.32; B.wind.g.gain.value = 0.1; B.murmur.g.gain.value = 0.14; B.murmur2.g.gain.value = 0.05; });
    T.log('one-shot peaks (own RMS in the layer; × 0.3 on master)', JSON.stringify(peaksOf));
    check(Object.values(peaksOf).every((v) => v > 0.004), `every one-shot sounds in its layer (${JSON.stringify(peaksOf)})`);
    await T.ev(() => { for (const [k, s] of Object.entries(__game.ljud.cfg.shots)) __game.ljud.next[k] = s.every[0]; });

    // 5. Templo Ecuménico: its layer, a peal of its bells in its hours.
    await atLm(T, 'kyrka');
    await T.ev(() => { __game.ljud.next.peal = 0.5; });
    await settle(T, 2500);
    r = await st(T);
    T.log('kyrka', JSON.stringify({ levels: r.levels, peal: r.counts.peal }));
    check(r.levels.kyrka === 1 && r.counts.peal > 0, `the church: its layer and a peal (${JSON.stringify(r.levels)}, ${r.counts.peal})`);

    // 6. The SunTrip stage: the band on the tune's bars, its layer sounding, the tune ducked.
    await atLm(T, 'scen', 8, Math.PI);
    await settle(T, 4000);
    r = await st(T);
    const sol = r.a.bandLog;
    T.log('stage', JSON.stringify({ levels: r.levels, out: r.out, band: r.band, duck: r.duck, bandLog: sol, layer: r.a.layers.scen, tune: r.a.tune }));
    const p = await peaks(T, 2500);
    check(r.band && r.levels.scen > 0.9 && r.a.tune === 'sol' && sol.tune === 'sol' && sol.bars >= 2 && sol.offGrid === 0 && near(sol.beat, 60 / 116, 1e-6) && p.scen > 0.01 && r.duck <= 0.8,
      `the stage: the band on sol's bars, sounding, the tune ducked (${JSON.stringify({ band: r.band, sol, rms: p.scen, duck: r.duck })})`);
    // Affe's solo while sol's lead rests (bars 24–31 of 32), not before.
    check(sol.solos === 0, `no solo in sol's first bars (${sol.solos})`);
    await T.ev(() => window.__audio.jumpBar(24));
    await T.until(() => window.__audio.ambState().bandLog.solos > 0, 6000).catch(() => {});
    r = await st(T);
    check(r.a.bandLog.solos > 0 && r.a.bandLog.bar >= 24 && r.a.bandLog.offGrid === 0, `Affe's solo in bars 24–31 (${JSON.stringify(r.a.bandLog)})`);
    // The samba: the band follows it (its beat, on the grid).
    await T.ev(() => { __game.setIslandTune('samba'); });
    await T.until(() => window.__audio.ambState().bandLog.tune === 'samba', 12000).catch(() => {});
    await T.sleep(3000);
    r = await st(T);
    T.log('samba', JSON.stringify(r.a.bandLog));
    check(r.a.bandLog.tune === 'samba' && near(r.a.bandLog.beat, 0.6, 1e-6) && r.a.bandLog.offGrid === 0 && r.band, `the band follows the samba (${JSON.stringify(r.a.bandLog)})`);
    await T.ev(() => { __game.setIslandTune('sol'); });
    // A pursuit's skandal has no band part: no new bars, the layers halved.
    await T.ev(() => window.__audio.setTune('skandal'));
    await T.until(() => window.__audio.ambState().tune === 'skandal', 8000).catch(() => {});
    const b0 = (await st(T)).a.bandLog.bars;
    await T.sleep(2500);
    r = await st(T);
    check(r.a.bandLog.bars === b0, `no band in skandal (${b0} -> ${r.a.bandLog.bars})`);
    await T.ev(() => window.__audio.setTune(__game.levelTune()));
    // Past 23:00, with Affe hidden: no band, the stage's layer out, the tune not ducked.
    await T.ev(() => { __game.day.set(23.2); });
    await T.frames(10);
    r = await st(T);
    check(!r.band && r.out.scen === 0 && r.duck === 1, `past 23:00 no band (${JSON.stringify({ band: r.band, out: r.out.scen, duck: r.duck })})`);
    await T.ev(() => { __game.day.set(15); __game.npcs.affe.state = 'hidden'; __game.npcs.affe.root.visible = false; });
    await T.frames(10);
    r = await st(T);
    check(!r.band && r.out.scen === 0, `Affe gone: no band (${r.band})`);
    await T.ev(() => { __game.placeNpcs(true); });
    await T.frames(10);
    r = await st(T);
    check(r.band, `Affe back: the band (${r.band})`);

    // 7. La Medina: the bar's layer (its murmur sounding), chatter and glasses; Tonga Tonga's bass after ten.
    await atLm(T, 'kasbah');
    await settle(T, 4000);
    r = await st(T);
    T.log('bar', JSON.stringify({ levels: r.levels, layer: r.a.layers.bar, counts: r.counts, club: r.club }));
    check(r.levels.bar === 1 && allOff(r.levels, ['bar']) && r.a.layers.bar.rms > 0.004 && r.counts.chatter > 0 && !r.club, `La Medina: the murmur and the chatter, no club by day (${JSON.stringify({ l: r.levels, b: r.a.layers.bar, c: r.counts.chatter, club: r.club })})`);
    await T.ev(() => { __game.day.set(22.5); });
    await T.sleep(3000);
    r = await st(T);
    T.log('club', JSON.stringify({ club: r.club, bars: r.a.clubBars, gulls: r.counts.gulls }));
    check(r.club && r.a.clubBars > 0, `after ten Tonga Tonga's bass (${r.club}, ${r.a.clubBars})`);
    await T.ev(() => { __game.day.set(15); });

    // 8. Lowered in a car (not the pedal boat), halved in a pursuit.
    await at(T, 40, 292.5, Math.PI);
    await settle(T, 600);
    await T.ev(() => {
      const g = __game, p = g.player;
      const car = g.cars.find((c) => !c.locked && !c.dead && !c.ai && !c.noEnter && !c.traffic && !c.spec.pigs && !c.spec.boat && c.spec.len < 5);
      car.place(p.x + 3, p.z, 0); g.enterCar(car); car.place(40, 286, Math.PI / 2); car.vx = car.vz = 0;
    });
    await T.frames(10);
    r = await st(T);
    check(near(r.mix, 0.55) && r.out.waves > 0.4 && r.out.waves < 0.6, `in a car × 0.55 (${r.mix}, ${r.out.waves})`);
    await T.ev(() => __game.exitCar(true));
    await T.ev(() => __game.shame.add(100, { force: true }));
    await T.until(() => __game.shame.pursuit, 8000).catch(() => {});
    await T.frames(5);
    r = await st(T);
    check(r.mix === 0.5, `a pursuit × 0.5 (${r.mix})`);
    await T.ev(() => __game.shame.clear());
    await T.frames(10);

    // 9. Out under a dialogue box, the letterbox, a mission; back after the abort; `enabled`.
    await T.ev(() => { __game.autoDialog = false; window.__dlg = __game.dialog([['stig', 'Hör du måsarna?']]); });
    await T.frames(10);
    r = await st(T);
    check(r.mix === 0 && r.out.waves === 0, `under a dialogue box: out (${r.mix})`);
    await T.tap('Space');
    await T.until(() => !window.__hud.dialogActive, 5000);
    await T.ev(() => { __game.autoDialog = true; });
    await T.frames(5);
    check((await st(T)).mix === 1, 'back after it');
    await T.ev(() => window.__hud.letterbox(true));
    await T.frames(5);
    r = await st(T);
    check(r.mix === 0, `under the letterbox: out (${r.mix})`);
    await T.ev(() => window.__hud.letterbox(false));
    await T.ev(() => __game.missions.begin());
    await T.frames(10);
    r = await st(T);
    await settle(T, 2000);
    const rm = await st(T);
    check(r.ms !== 'idle' && r.mix === 0 && allOff(r.out) && rm.a.layers.waves.gain < 0.02, `a mission: every layer out (${r.ms}, ${JSON.stringify(r.out)}, gain ${rm.a.layers.waves.gain})`);
    await T.ev(() => __game.missions.abort());
    await T.until(() => __game.missions.state === 'idle', 8000);
    await at(T, 40, 292.5, Math.PI);
    await T.frames(10);
    r = await st(T);
    check(r.mix === 1 && r.out.waves === 1, `after the abort back (${r.mix}, ${r.out.waves})`);
    await T.ev(() => { __game.ljud.enabled = false; });
    await settle(T);
    r = await st(T);
    check(r.mix === 0 && r.a.layers.waves.gain < 0.03, `enabled false: out (${r.mix}, ${r.a.layers.waves.gain})`);
    await T.ev(() => { __game.ljud.enabled = true; });

    // 10. The pause menu silences the channel and brings it back.
    await T.ev(() => window.__audio.pauseLoops());
    await T.sleep(500);
    r = await st(T);
    check(r.a.paused && r.a.gain < 0.01, `paused: the channel silent (${r.a.gain})`);
    await T.ev(() => window.__audio.resumeLoops());
    await T.sleep(500);
    r = await st(T);
    check(!r.a.paused && near(r.a.gain, 0.3, 0.01), `resumed (${r.a.gain})`);

    // 11. After the end: Affe and Gabbe at Flamenco's pool, no band at the stage.
    await T.ev(() => { const g = __game; g.unlock('bodega'); g.placeNpcs(true); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
    await atLm(T, 'scen', 8, Math.PI);
    await T.frames(20);
    r = await st(T);
    check(r.levels.scen > 0.9 && !r.band && r.out.scen === 0, `after the end no band at the stage (${r.band})`);

    // 12. The flight level: nothing.
    await T.fresh('&mission=2');
    await audioUp(T);
    await settle(T, 2000);
    r = await st(T);
    check(r.mix === 0 && allOff(r.out) && r.a.rms < 0.001, `the flight level: nothing (${r.mix}, ${r.a.rms})`);
  },

  async ljudklipp(T) {
    const out = process.env.OUT ? path.resolve(process.env.OUT) : 'out';
    fs.mkdirSync(out, { recursive: true });
    await T.fresh('&mission=9&ts=1');
    check(await audioUp(T), 'the audio context runs');
    const secs = +(process.env.LJUD_SECS || 12);
    const places = [
      ['ljud_daeck', () => T.ev(() => 0)],
      ['ljud_strand', () => at(T, 40, 292.5, Math.PI)],
      ['ljud_hamn', () => atLm(T, 'hamn')],
      ['ljud_fataga', () => atLm(T, 'fatagaFold')],
      ['ljud_kyrka', async () => { await atLm(T, 'kyrka'); await T.ev(() => { __game.ljud.next.peal = 1; }); }],
      ['ljud_scen', () => atLm(T, 'scen', 8, Math.PI)],
      ['ljud_medina_natt', async () => { await T.ev(() => __game.day.set(22.5)); await atLm(T, 'kasbah'); }],
    ];
    for (const [name, go] of places) {
      await go();
      await settle(T, 2000);
      await record(T, path.join(out, name), secs);
      const r = await st(T);
      T.log(name, JSON.stringify({ out: r.out, band: r.band, club: r.club }));
    }
  },
};
