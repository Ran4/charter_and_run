// Everything you hear is synthesised: an engine drone, tyre squeal, cartoon blips, the cabin drone
// and the music. No samples to load. (DESIGN §12; WP-H owns the tunes and the SFX recipes.)
//   Music: a TUNES table of { bpm, beats, bar(api, t, n) }; setTune(name) switches at the next bar.
//   Music bus -> low-pass (the fear effect, setMusicLowpass) -> master.
//   Cabin drone: its own channel (drone(level, bright)), never touched by the car-engine code.

let ctx, master, sfx, musicBus, musicFilter, noiseBuf;
let eng, skid, hornNodes, music, drone, siren;
let tuneName = 'muzak', pendingTune = null;

export const TUNES = {};
export function registerTune(name, def) { TUNES[name] = def; }

function makeNoise() {
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

export const audio = {
  muted: false,
  musicOn: true,
  get ready() { return !!ctx; },

  init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.7;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    master.connect(comp).connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master);
    musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 20000; musicFilter.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(musicFilter);
    noiseBuf = makeNoise();

    // Cabin drone: a looped noise buffer through a low-pass plus a low saw.
    drone = { g: ctx.createGain(), f: ctx.createBiquadFilter(), s: ctx.createBufferSource(), o: ctx.createOscillator(), og: ctx.createGain() };
    drone.s.buffer = noiseBuf; drone.s.loop = true;
    drone.f.type = 'lowpass'; drone.f.frequency.value = 300;
    drone.o.type = 'sawtooth'; drone.o.frequency.value = 45; drone.og.gain.value = 0.25;
    drone.g.gain.value = 0;
    drone.s.connect(drone.f).connect(drone.g);
    drone.o.connect(drone.og).connect(drone.g);
    drone.g.connect(sfx);
    drone.s.start(); drone.o.start();
    if (this._drone) this.drone(...this._drone);

    // Engine: two detuned saws through a low-pass, pitched by revs.
    eng = { g: ctx.createGain(), f: ctx.createBiquadFilter(), o1: ctx.createOscillator(), o2: ctx.createOscillator() };
    eng.o1.type = 'sawtooth'; eng.o2.type = 'square';
    eng.f.type = 'lowpass'; eng.f.Q.value = 4;
    eng.g.gain.value = 0;
    eng.o1.connect(eng.f); eng.o2.connect(eng.f); eng.f.connect(eng.g).connect(sfx);
    eng.o1.start(); eng.o2.start();

    skid = { g: ctx.createGain(), f: ctx.createBiquadFilter(), s: ctx.createBufferSource() };
    skid.s.buffer = noiseBuf; skid.s.loop = true;
    skid.f.type = 'bandpass'; skid.f.frequency.value = 1700; skid.f.Q.value = 6;
    skid.g.gain.value = 0;
    skid.s.connect(skid.f).connect(skid.g).connect(sfx);
    skid.s.start();
    if (this.musicOn) startMusic();
  },

  setMuted(m) {
    this.muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.05);
  },
  setMusic(on) {
    this.musicOn = on;
    if (!ctx) return;
    musicBus.gain.setTargetAtTime(on ? 0.32 : 0, ctx.currentTime, 0.2);
    if (on && !music) startMusic();
  },
  duckMusic(amount) { if (ctx && this.musicOn) musicBus.gain.setTargetAtTime(0.32 * amount, ctx.currentTime, 0.3); },

  // Switch the music at the next bar (unknown names fall back to the placeholder tune).
  setTune(name) { if (name && name !== tuneName) pendingTune = name; },
  get tune() { return pendingTune || tuneName; },
  // Fear low-pass on the music bus: hz, or null for wide open.
  setMusicLowpass(hz) {
    if (!ctx) return;
    musicFilter.frequency.setTargetAtTime(hz == null ? 20000 : Math.max(200, hz), ctx.currentTime, 0.15);
  },
  // Cabin drone: level 0..1 (gain level * 0.08), bright 0..1 (low-pass 300 -> 900 Hz).
  drone(level = 0, bright = 0) {
    this._drone = [level, bright];
    if (!ctx) return;
    const t = ctx.currentTime;
    drone.g.gain.setTargetAtTime(Math.max(0, level) * 0.08, t, 0.4);
    drone.f.frequency.setTargetAtTime(300 + 600 * Math.max(0, Math.min(1, bright)), t, 0.4);
  },
  // Two-tone 650/500 Hz square while on (Guardia Civil pursuit).
  siren(on) {
    this.sirenOn = !!on;
    if (!ctx) return;
    if (on && !siren) {
      const g = ctx.createGain(); g.gain.value = 0.05; g.connect(sfx);
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 650; o.connect(g); o.start();
      let hi = true;
      const iv = setInterval(() => { hi = !hi; o.frequency.setValueAtTime(hi ? 650 : 500, ctx.currentTime); }, 450);
      siren = { g, o, iv };
    } else if (!on && siren) {
      clearInterval(siren.iv);
      siren.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      siren.o.stop(ctx.currentTime + 0.2);
      siren = null;
    }
  },
  // Silence the looping channels (pause).
  pauseLoops() { if (!ctx) return; drone.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); if (siren) siren.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); },
  resumeLoops() { if (this._drone) this.drone(...this._drone); if (siren) siren.g.gain.setTargetAtTime(0.05, ctx.currentTime, 0.05); },

  engine(on, revs, load) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const f = 38 + revs * 95;
    eng.o1.frequency.setTargetAtTime(f, t, 0.05);
    eng.o2.frequency.setTargetAtTime(f * 0.5 + 1.5, t, 0.05);
    eng.f.frequency.setTargetAtTime(260 + revs * 900 + load * 600, t, 0.05);
    eng.g.gain.setTargetAtTime(on ? 0.035 + load * 0.04 : 0, t, on ? 0.08 : 0.25);
  },
  skid(amount) {
    if (!ctx) return;
    skid.g.gain.setTargetAtTime(Math.min(0.16, amount * 0.16), ctx.currentTime, 0.05);
  },

  tone(freq, dur, type = 'square', vol = 0.12, slideTo = null, delay = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(sfx);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol = 0.2, freq = 1000, type = 'lowpass', delay = 0, q = 1) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(sfx);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  },

  coin() { this.tone(988, 0.07, 'square', 0.07); this.tone(1319, 0.16, 'square', 0.07, null, 0.06); },
  jump() { this.tone(260, 0.16, 'square', 0.06, 620); },
  kick() { this.noise(0.12, 0.25, 900, 'bandpass', 0, 2); this.tone(140, 0.08, 'sine', 0.2, 70); },
  smash() { this.noise(0.25, 0.3, 2400, 'highpass'); this.tone(420, 0.12, 'square', 0.05, 160); this.noise(0.3, 0.2, 500, 'lowpass', 0.03); },
  crash(i = 1) { i = Math.min(1, i); this.noise(0.35, 0.45 * i, 700); this.tone(90, 0.3, 'sine', 0.45 * i, 40); this.noise(0.2, 0.2 * i, 3000, 'highpass', 0.04); },
  thud() { this.tone(110, 0.12, 'sine', 0.25, 60); },
  boing() { this.tone(180, 0.35, 'sine', 0.2, 720); this.tone(240, 0.25, 'triangle', 0.08, 900, 0.05); },
  ouch() { this.tone(520, 0.18, 'triangle', 0.12, 260); },
  splash() { this.noise(0.5, 0.35, 1200, 'bandpass', 0, 0.7); },
  door() { this.tone(160, 0.06, 'square', 0.1, 120); this.noise(0.08, 0.15, 800, 'lowpass', 0.04); },
  pickup() { [660, 880, 1320].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.1, null, i * 0.07)); },
  squash() { this.noise(0.15, 0.3, 1800, 'bandpass', 0, 3); this.tone(900, 0.1, 'sawtooth', 0.06, 200); },
  talk(pitch) { this.tone(pitch * (0.82 + Math.random() * 0.36), 0.055, 'triangle', 0.07); },
  checkpoint() { this.tone(784, 0.1, 'square', 0.08); this.tone(1175, 0.18, 'square', 0.08, null, 0.08); },
  tick() { this.tone(1500, 0.03, 'square', 0.05); },
  horn(on) {
    if (!ctx) return;
    if (on && !hornNodes) {
      const g = ctx.createGain(); g.gain.value = 0.07; g.connect(sfx);
      const a = ctx.createOscillator(), b = ctx.createOscillator();
      a.type = b.type = 'square'; a.frequency.value = 392; b.frequency.value = 494;
      a.connect(g); b.connect(g); a.start(); b.start();
      hornNodes = { g, a, b };
    } else if (!on && hornNodes) {
      const h = hornNodes; hornNodes = null;
      h.g.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      h.a.stop(ctx.currentTime + 0.1); h.b.stop(ctx.currentTime + 0.1);
    }
  },
  jingle(kind) {
    const seq = {
      start: [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32]],
      complete: [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.5], [1047, 0.62]],
      fail: [[392, 0], [370, 0.18], [349, 0.36], [262, 0.56]],
      pryl: [[440, 0], [554, 0.08], [659, 0.16], [880, 0.26]],
    }[kind];
    if (!seq) return;
    seq.forEach(([f, d]) => this.tone(f, kind === 'fail' ? 0.3 : 0.18, kind === 'fail' ? 'sawtooth' : 'square', 0.08, null, d));
  },
  // §12.3 sound effects. Phase 0: one shared placeholder tone per name (pitched by the name so they
  // can be told apart); WP-H writes the real recipes.
  chime() { placeholder(this, 'chime'); },
  pling() { placeholder(this, 'pling'); },
  dingdong() { placeholder(this, 'dingdong'); },
  beep() { placeholder(this, 'beep'); },
  applause(secs = 2) { for (let k = 0; k < Math.round(secs * 6); k++) this.noise(0.06, 0.06, 2500, 'bandpass', Math.random() * secs, 1.5); },
  heartbeat() { this.tone(55, 0.14, 'sine', 0.35); this.tone(55, 0.14, 'sine', 0.28, null, 0.22); },
  rattle() { this.noise(0.3, 0.15, 300); },
  flush() { placeholder(this, 'flush'); },
  squeak() { placeholder(this, 'squeak'); },
  laugh() { placeholder(this, 'laugh'); },
  knock() { placeholder(this, 'knock'); },
  slap() { placeholder(this, 'slap'); },
  doorSlam() { placeholder(this, 'doorSlam'); },
  ambulance() { placeholder(this, 'ambulance'); },
  baa() { placeholder(this, 'baa'); },
  oink() { placeholder(this, 'oink'); },
  helanGar() { this.trad('helanGar'); },
  // Public-domain traditional cues (smaGrodorna, hejTomtegubbar, helanGar): WP-H. No-op for now.
  trad(name) { /* WP-H */ },
  shameBell() {
    if (!ctx) return;
    [0, 0.9].forEach((d) => {
      this.tone(98, 1.4, 'sine', 0.35, null, d);
      this.tone(196, 1.0, 'triangle', 0.12, null, d);
      this.tone(293, 0.8, 'sine', 0.06, null, d);
    });
  },
};

// The music scheduler: one bar at a time from the current tune; a pending setTune() takes over at
// the next bar. Catch-up guard: after a stall it skips ahead instead of playing every missed bar.
function startMusic() {
  if (music) return;
  let bar = 0, next = ctx.currentTime + 0.2;
  music = setInterval(() => {
    if (!ctx || !audio.musicOn) return;
    if (next < ctx.currentTime) next = ctx.currentTime + 0.05;
    while (next < ctx.currentTime + 0.6) {
      if (pendingTune) { tuneName = pendingTune; pendingTune = null; bar = 0; }
      const tune = TUNES[tuneName] || TUNES.placeholder;
      const beat = 60 / tune.bpm;
      tune.bar(API, next, bar, beat);
      next += beat * (tune.beats || 4);
      bar++;
    }
  }, 200);
}

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
// What a tune's bar() gets: helpers that play on the music bus.
const API = {
  mtof,
  bass: (f, t, d) => bassNote(f, t, d),
  brush: (t, v) => brush(t, v),
  stab: (f, t, v) => keyStab(f, t, v),
  tone(f, t, d, type = 'square', v = 0.1) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(musicBus); o.start(t); o.stop(t + d + 0.05);
  },
  get ctx() { return ctx; },
  get bus() { return musicBus; },
  get noise() { return noiseBuf; },
};

// Placeholder: Bigmouth's swung walking-bass loop, registered under every tune name until WP-H
// writes muzak, sol, skandal, vals, jul and samba.
const PROG = [[48, 52, 55, 57], [53, 57, 60, 62], [48, 52, 55, 58], [55, 59, 62, 53]];
const placeholderTune = {
  bpm: 132, beats: 4,
  bar(api, t0, bar, beat) {
    const chord = PROG[bar % PROG.length];
    for (let b = 0; b < 4; b++) {
      const t = t0 + b * beat;
      api.bass(mtof(chord[b] - 12), t, beat * 0.9);
      api.brush(t + beat * 0.66, 0.04);
      if (b % 2 === 1) api.brush(t, 0.07);
    }
    if (bar % 2 === 0) chord.slice(1).forEach((n) => api.stab(mtof(n + 12), t0 + beat * 1.66, 0.15));
  },
};
for (const n of ['placeholder', 'muzak', 'sol', 'skandal', 'vals', 'jul', 'samba']) registerTune(n, placeholderTune);

function placeholder(a, name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
  a.tone(300 + (h % 700), 0.14, 'triangle', 0.08);
}

function bassNote(f, t, d) {
  const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
  o.type = 'triangle'; o.frequency.value = f;
  fl.type = 'lowpass'; fl.frequency.value = 600;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(fl).connect(g).connect(musicBus);
  o.start(t); o.stop(t + d + 0.05);
}
function brush(t, v) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 5000;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  s.connect(f).connect(g).connect(musicBus);
  s.start(t, Math.random() * 0.5); s.stop(t + 0.15);
}
function keyStab(f, t, v) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v * 0.5, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g).connect(musicBus);
  o.start(t); o.stop(t + 0.4);
}
