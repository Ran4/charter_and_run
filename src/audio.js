// Everything you hear is synthesised: an engine drone, tyre squeal, cartoon blips, the cabin drone
// and the music. No samples to load. (DESIGN §12; owner WP-H.)
//   Music: a TUNES table of { bpm, beats, bar(api, t, n, beat) }; setTune(name) switches at the next
//   bar. Tunes (§12.1, all original): muzak (flight), sol (island), skandal (pursuit), vals
//   (grisfest night), jul (julafton), samba (Ole's boombox, Tonga Tonga, Rio, unlock).
//   Public-domain traditional one-shots (audio.trad): smaGrodorna, hejTomtegubbar, helanGar. They
//   are written down from memory (traditional tunes, so any faithful variant is free to use).
//   Graph:  music voices -> musicBus (duckMusic) -> tradDuck (ducked under a trad cue)
//             -> musicFilter (FLYGRÄDSLA low-pass) -> vduck -> master
//           trad voices -> tradBus -> vduck -> master;  sfx -> sfx -> master;  cabin drone -> sfx
//           engine -> engDuck -> sfx;  voice clips (voice.js) -> voiceChain(mode) -> voiceBus -> master
//           island soundscape: a layer's voices -> its gain -> its panner -> ambient -> master
//   Cabin drone: its own channel (drone(level, bright)), never touched by the car-engine code.
//   Soundscape (feature 131, §10.60): the `ambient` channel straight into master, so the fear
//   low-pass, tradDuck and duckMusic leave it alone; game/soundscape.js sets its layers. Its layer
//   `fest` (feature 134, §10.63: gain -> a low-pass -> panner) carries the balcony party's Helan går,
//   on a clock of its own; game/helanGar.js sets it.
//   The voices (DESIGN §12.4) are the one thing that is not synthesised: recorded clips, played by
//   voice.js through a chain per mode (voiceChain). While anyone speaks the music and the trad tunes
//   step back ~8 dB and the engine ~4 dB (voiceDuck: its own gain nodes, so the pursuit's duckMusic,
//   set every frame, multiplies with it).

let ctx, master, sfx, musicBus, tradDuck, musicFilter, tradBus, noiseBuf, vduck, engDuck, voiceBus, voiceVerb;
let eng, skid, hornNodes, music, drone, siren;
let tuneName = 'muzak', pendingTune = null;
let duckNow = 1, lowpassNow = null;
let amb = null, into = null;   // the soundscape's channel; `into`: where tone/noise/sweep/baa/gull go (sfx)
let barJump = null;             // test hook (jumpBar): the next bar's number

const MUSIC_GAIN = 0.3;
const VOICE_GAIN = 1.0;
// A walkie-talkie's grit (the radio mode): a soft clip.
const RADIO_CURVE = (() => { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); } return c; })();
export const TUNES = {};
export function registerTune(name, def) { TUNES[name] = def; }

// A short synthesised room: stereo noise decaying over `secs`, darker as it goes.
function makeRoom(secs) {
  const n = Math.round(ctx.sampleRate * secs), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < n; i++) { const k = i / n; lp += (Math.random() * 2 - 1 - lp) * (0.6 - 0.45 * k); d[i] = lp * Math.pow(1 - k, 3); }
  }
  return b;
}

function makeNoise() {
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
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
    // (under speech the music and the trad tunes step back: voiceDuck)
    vduck = ctx.createGain(); vduck.gain.value = 1; vduck.connect(master);
    musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 20000; musicFilter.Q.value = 0.9; musicFilter.connect(vduck);
    tradDuck = ctx.createGain(); tradDuck.gain.value = 1; tradDuck.connect(musicFilter);
    musicBus = ctx.createGain(); musicBus.gain.value = this.musicOn ? MUSIC_GAIN * duckNow : 0; musicBus.connect(tradDuck);
    tradBus = ctx.createGain(); tradBus.gain.value = 0.55; tradBus.connect(vduck);
    noiseBuf = makeNoise();
    // The voices (voice.js): their own bus beside the effects and the music, and a small room for
    // the loudspeakers and the voices in the world.
    voiceBus = ctx.createGain(); voiceBus.gain.value = VOICE_GAIN; voiceBus.connect(master);
    voiceVerb = ctx.createConvolver(); voiceVerb.buffer = makeRoom(0.9); voiceVerb.connect(master);
    engDuck = ctx.createGain(); engDuck.gain.value = 1; engDuck.connect(sfx);

    // Cabin drone (§12.2): looped noise through a low-pass 300 -> 900 Hz (bright), a 45 Hz saw for
    // the airframe rumble, and a faint turbine whine that rises with `bright`. A slow LFO on the
    // low-pass keeps the hiss breathing. Gain = level * 0.08.
    drone = {
      g: ctx.createGain(), f: ctx.createBiquadFilter(), s: ctx.createBufferSource(),
      o: ctx.createOscillator(), og: ctx.createGain(), of: ctx.createBiquadFilter(),
      w: ctx.createOscillator(), wg: ctx.createGain(), lfo: ctx.createOscillator(), lg: ctx.createGain(),
    };
    drone.s.buffer = noiseBuf; drone.s.loop = true;
    drone.f.type = 'lowpass'; drone.f.frequency.value = 300; drone.f.Q.value = 0.6;
    drone.o.type = 'sawtooth'; drone.o.frequency.value = 45; drone.og.gain.value = 0.22;
    drone.of.type = 'lowpass'; drone.of.frequency.value = 160;
    drone.w.type = 'sine'; drone.w.frequency.value = 2300; drone.wg.gain.value = 0;
    drone.lfo.type = 'sine'; drone.lfo.frequency.value = 0.13; drone.lg.gain.value = 40;
    drone.g.gain.value = 0;
    drone.lfo.connect(drone.lg).connect(drone.f.frequency);
    drone.s.connect(drone.f).connect(drone.g);
    drone.o.connect(drone.of).connect(drone.og).connect(drone.g);
    drone.w.connect(drone.wg).connect(drone.g);
    drone.g.connect(sfx);
    drone.s.start(); drone.o.start(); drone.w.start(); drone.lfo.start();
    if (this._drone) this.drone(...this._drone);
    buildAmbient();

    // Engine: two detuned saws through a low-pass, pitched by revs.
    eng = { g: ctx.createGain(), f: ctx.createBiquadFilter(), o1: ctx.createOscillator(), o2: ctx.createOscillator() };
    eng.o1.type = 'sawtooth'; eng.o2.type = 'square';
    eng.f.type = 'lowpass'; eng.f.Q.value = 4;
    eng.g.gain.value = 0;
    eng.o1.connect(eng.f); eng.o2.connect(eng.f); eng.f.connect(eng.g).connect(engDuck);
    eng.o1.start(); eng.o2.start();

    skid = { g: ctx.createGain(), f: ctx.createBiquadFilter(), s: ctx.createBufferSource() };
    skid.s.buffer = noiseBuf; skid.s.loop = true;
    skid.f.type = 'bandpass'; skid.f.frequency.value = 1700; skid.f.Q.value = 6;
    skid.g.gain.value = 0;
    skid.s.connect(skid.f).connect(skid.g).connect(sfx);
    skid.s.start();
    if (this.sirenOn) { this.sirenOn = false; this.siren(true); }
    if (this.musicOn) startMusic();
  },

  setMuted(m) {
    this.muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.05);
  },
  setMusic(on) {
    this.musicOn = on;
    if (!ctx) return;
    musicBus.gain.setTargetAtTime(on ? MUSIC_GAIN * duckNow : 0, ctx.currentTime, 0.2);
    if (on && !music) startMusic();
  },
  // Called every frame by main (a pursuit ducks to 0.5): only schedules on a change.
  duckMusic(amount) {
    if (amount === duckNow) return;
    duckNow = amount;
    if (ctx && this.musicOn) musicBus.gain.setTargetAtTime(MUSIC_GAIN * amount, ctx.currentTime, 0.3);
  },

  // Switch the music at the next bar (unknown names fall back to the placeholder tune). Asking for
  // the tune that is already playing cancels a pending switch.
  setTune(name) {
    if (!name) return;
    pendingTune = name === tuneName ? null : name;
  },
  get tune() { return pendingTune || tuneName; },
  // Fear low-pass on the music bus: hz, or null for wide open. Called every frame by main while hot.
  setMusicLowpass(hz) {
    const v = hz == null ? null : Math.max(200, Math.round(hz / 20) * 20);
    if (v === lowpassNow || !ctx) return;
    lowpassNow = v;
    musicFilter.frequency.setTargetAtTime(v == null ? 20000 : v, ctx.currentTime, 0.15);
  },
  // Cabin drone: level 0..1 (gain level * 0.08), bright 0..1 (low-pass 300 -> 900 Hz, whine).
  drone(level = 0, bright = 0) {
    this._drone = [level, bright];
    if (!ctx) return;
    const t = ctx.currentTime, b = Math.max(0, Math.min(1, bright)), l = Math.max(0, level);
    drone.g.gain.setTargetAtTime(l * 0.08, t, 0.4);
    drone.f.frequency.setTargetAtTime(300 + 600 * b, t, 0.4);
    drone.of.frequency.setTargetAtTime(140 + 120 * b, t, 0.4);
    drone.w.frequency.setTargetAtTime(1900 + 900 * b, t, 1.2);
    drone.wg.gain.setTargetAtTime(0.004 + 0.012 * b * b, t, 0.6);
  },

  // Guardia Civil siren (§7.2, §12.3): two-tone 650/500 Hz square alternating every 0.45 s, gain
  // 0.05 while on. Scheduled on the audio clock (no timer jitter), softened by a low-pass and a
  // slight vibrato; sirenNear(d) lowers it while the nearest pursuer is far away.
  siren(on) {
    this.sirenOn = !!on;
    if (!ctx) return;
    if (on && !siren) {
      const g = ctx.createGain(), f = ctx.createBiquadFilter(), o = ctx.createOscillator(), v = ctx.createOscillator(), vg = ctx.createGain();
      g.gain.value = 0; g.gain.setTargetAtTime(0.05, ctx.currentTime, 0.1);
      f.type = 'lowpass'; f.frequency.value = 2600; f.Q.value = 0.7;
      o.type = 'square'; v.type = 'sine'; v.frequency.value = 6; vg.gain.value = 5;
      v.connect(vg).connect(o.frequency);
      o.connect(f).connect(g).connect(sfx);
      const s = { g, o, v, level: 0.05, t: ctx.currentTime + 0.02, hi: true };
      s.sched = () => { while (s.t < ctx.currentTime + 1.2) { o.frequency.setValueAtTime(s.hi ? 650 : 500, s.t); s.hi = !s.hi; s.t += 0.45; } };
      s.sched();
      o.start(); v.start();
      s.iv = setInterval(s.sched, 400);
      siren = s;
    } else if (!on && siren) {
      const s = siren; siren = null;
      clearInterval(s.iv);
      s.g.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      s.o.stop(ctx.currentTime + 0.5); s.v.stop(ctx.currentTime + 0.5);
    }
  },
  // Siren loudness by the distance (m) to the nearest pursuer: 0.05 within 15 m, 0.02 beyond 100 m.
  sirenNear(d) {
    if (!ctx || !siren) return;
    const lv = Math.round((0.02 + 0.03 * Math.max(0, Math.min(1, 1 - (d - 15) / 85))) * 200) / 200;
    if (lv === siren.level) return;
    siren.level = lv;
    siren.g.gain.setTargetAtTime(lv, ctx.currentTime, 0.3);
  },
  // Silence the looping channels (pause), the island's soundscape with them (§10.60).
  pauseLoops() {
    if (!ctx) return;
    drone.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); if (siren) siren.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    amb.paused = true; amb.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  },
  resumeLoops() {
    if (!ctx) return;
    if (this._drone) this.drone(...this._drone); if (siren) siren.g.gain.setTargetAtTime(siren.level, ctx.currentTime, 0.05);
    amb.paused = false; amb.g.gain.setTargetAtTime(AMB_GAIN, ctx.currentTime, 0.05);
  },

  // `electric` (the golf cart, §10.40): a quiet hum rising to a thin whine instead of the motor.
  // `diesel` (the tractor, §10.54): a low, dark putt-putt that hardly rises.
  engine(on, revs, load, electric = false, diesel = false) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const f = electric ? 150 + revs * 420 : diesel ? 26 + revs * 30 : 38 + revs * 95;
    eng.o1.frequency.setTargetAtTime(f, t, 0.05);
    eng.o2.frequency.setTargetAtTime(electric ? f * 1.004 : diesel ? f * 0.5 : f * 0.5 + 1.5, t, 0.05);
    eng.f.frequency.setTargetAtTime(electric ? 500 + revs * 1100 : diesel ? 200 + revs * 360 + load * 260 : 260 + revs * 900 + load * 600, t, 0.05);
    eng.g.gain.setTargetAtTime(on ? (electric ? 0.008 + load * 0.01 : diesel ? 0.05 + load * 0.035 : 0.035 + load * 0.04) : 0, t, on ? 0.08 : 0.25);
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
    o.connect(g).connect(into || sfx);
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
    s.connect(f).connect(g).connect(into || sfx);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  },
  // A noise burst whose filter sweeps from f0 to f1 (flush, splash).
  sweep(dur, vol, f0, f1, type = 'bandpass', q = 1.2, delay = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.08);
    g.gain.setValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(into || sfx);
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
  glide() { this.sweep(0.7, 0.06, 450, 1500, 'bandpass', 1.1); this.sweep(0.5, 0.03, 900, 2400, 'bandpass', 2, 0.15); },   // arms out: a whoosh of air
  // k (0..2): 0 a hop into the pool, 1 a fall from the 10 m tower, 2 the cannonball (a boom under it).
  splash(k = 0) {
    this.noise(0.5 + 0.35 * k, 0.35 + 0.08 * k, 1200 - 250 * k, 'bandpass', 0, 0.7); this.sweep(0.35 + 0.2 * k, 0.12 + 0.04 * k, 3000, 700, 'bandpass', 1.5, 0.05);
    if (k > 1) this.tone(75, 0.4, 'sine', 0.3 * (k - 1), 38);
  },
  door() { this.tone(160, 0.06, 'square', 0.1, 120); this.noise(0.08, 0.15, 800, 'lowpass', 0.04); },
  pickup() { [660, 880, 1320].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.1, null, i * 0.07)); },
  squash() { this.noise(0.15, 0.3, 1800, 'bandpass', 0, 3); this.tone(900, 0.1, 'sawtooth', 0.06, 200); },
  talk(pitch) { this.tone(pitch * (0.82 + Math.random() * 0.36), 0.055, 'triangle', 0.07); },
  checkpoint() { this.tone(784, 0.1, 'square', 0.08); this.tone(1175, 0.18, 'square', 0.08, null, 0.08); },
  tick() { this.tone(1500, 0.03, 'square', 0.05); },
  // The G17 toasters (§10.24): the lever going down with a clack, the bread popping up.
  toasterDown() { this.noise(0.05, 0.18, 1800, 'bandpass', 0, 2); this.tone(170, 0.07, 'square', 0.07, 110); },
  pop() { this.noise(0.04, 0.26, 2600, 'bandpass', 0, 3); this.tone(380, 0.1, 'sine', 0.16, 900); },
  // The sun cream (§10.26): a squeeze of the bottle while E is held, and too much landing on her back.
  squirt() { this.noise(0.07, 0.12, 900 + Math.random() * 300, 'bandpass', 0, 4); this.tone(240, 0.06, 'sine', 0.04, 170); },
  // The G17 stamp coming down on a jump (§10.27): a rubber thump on paper; UNDERKÄND adds a low buzz.
  stamp() { this.noise(0.05, 0.36, 1500, 'bandpass', 0, 1.1); this.tone(96, 0.16, 'sine', 0.38, 52); this.noise(0.14, 0.2, 420, 'lowpass', 0.02, 1.3); },
  stampFail() { this.stamp(); this.tone(196, 0.32, 'square', 0.05, 98, 0.1); this.tone(147, 0.36, 'square', 0.04, 74, 0.12); },
  splat() { this.noise(0.22, 0.3, 600, 'lowpass', 0, 1.2); this.sweep(0.3, 0.1, 1400, 400, 'bandpass', 2, 0.03); },
  // The golf cart's horn (§10.40): a short, feeble pip-pip.
  pipHorn() { for (const d of [0, 0.14]) { this.tone(1245, 0.08, 'square', 0.035, 1175, d); this.tone(2490, 0.06, 'sine', 0.01, null, d); } },
  // The butanero's spanner on a full butano bottle (§10.65): a dull tick and the steel's ring, its upper
  // partials dying first; `v` 0..1 (his caller's distance).
  clonk(v = 1) {
    if (!ctx || v <= 0) return;
    const t = ctx.currentTime, f = 610 * (1 + 0.02 * (Math.random() - 0.5));
    this.noise(0.03, 0.22 * v, 2200, 'bandpass', 0, 2);
    partials(BOTTLE_RING, f, t, 0.75, 0.07 * v, into || sfx);
  },
  // A butano bottle off the gas truck bursting where it lands (§10.65): a bang, the gas's hiss.
  gasPop(v = 1) {
    if (!ctx || v <= 0) return;
    this.noise(0.32, 0.42 * v, 900, 'lowpass', 0, 1.2);
    this.tone(78, 0.28, 'sine', 0.32 * v, 42);
    this.sweep(0.6, 0.1 * v, 3200, 700, 'bandpass', 1.4, 0.04);
  },
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
  // start: a sunny four-note fanfare; complete: the same with a cadence (the applause comes from
  // the runner); fail: a sagging trombone; pryl: Ole's gadget arpeggio with a digital-watch bleep.
  jingle(kind) {
    if (!ctx) return;
    if (kind === 'start') {
      [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32]].forEach(([f, d]) => { this.tone(f, 0.2, 'square', 0.06, null, d); this.tone(f / 2, 0.2, 'triangle', 0.08, null, d); });
    } else if (kind === 'complete') {
      [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.52], [1047, 0.64]].forEach(([f, d]) => this.tone(f, 0.2, 'square', 0.06, null, d));
      [[262, 0], [392, 0.24], [523, 0.52]].forEach(([f, d]) => this.tone(f, 0.28, 'triangle', 0.1, null, d));
      [659, 784, 1047].forEach((f) => this.tone(f, 0.7, 'triangle', 0.05, null, 0.64));
    } else if (kind === 'fail') {
      [[392, 0], [370, 0.22], [349, 0.44]].forEach(([f, d]) => this.tone(f, 0.24, 'sawtooth', 0.06, null, d));
      this.tone(330, 0.9, 'sawtooth', 0.06, 247, 0.66);
    } else if (kind === 'pryl') {
      [[440, 0], [554, 0.08], [659, 0.16], [880, 0.26]].forEach(([f, d]) => this.tone(f, 0.16, 'square', 0.06, null, d));
      this.tone(2093, 0.05, 'square', 0.04, null, 0.42); this.tone(2093, 0.05, 'square', 0.04, null, 0.52);
    }
  },

  // ---- §12.3 sound effects ------------------------------------------------------------------
  // Seatbelt sign "pling-plong".
  chime() { this.tone(659, 0.5, 'sine', 0.1); this.tone(1318, 0.3, 'sine', 0.015); this.tone(523, 0.8, 'sine', 0.1, null, 0.4); this.tone(1046, 0.4, 'sine', 0.015, null, 0.4); },
  // The call button.
  pling() { this.tone(1300, 0.35, 'sine', 0.12); this.tone(2600, 0.12, 'sine', 0.02); },
  // The porter's desk phone ringing for the site manager (the reception's bell, §10.37): two trills.
  phone() { for (const d of [0, 0.55]) for (let k = 0; k < 10; k++) this.tone(k % 2 ? 1180 : 960, 0.028, 'square', 0.035, null, d + k * 0.03); },
  // PA "ding-dong" before an announcement.
  dingdong() { this.tone(659, 0.45, 'sine', 0.11); this.tone(1318, 0.2, 'sine', 0.012); this.tone(523, 0.45, 'sine', 0.11, null, 0.45); this.tone(1046, 0.2, 'sine', 0.012, null, 0.45); },
  // The metal-detector arch.
  beep() { for (let k = 0; k < 3; k++) this.tone(880, 0.14, 'square', 0.07, null, k * 0.2); },
  // Ole's calculator alarm (the nap in room 107, §10.10): a digital watch's PIP-PIP-PIP, twice.
  pip() { for (let k = 0; k < 6; k++) this.tone(2794, 0.06, 'square', 0.045, null, (k % 3) * 0.12 + (k >= 3 ? 0.55 : 0)); },
  // Templo Ecuménico's bells at the town's turns (Liv på torget, §10.62): the soundscape's peal (G, E, C
  // rung down, `rounds` times) on the sfx channel at `vol` (the caller's falloff), so the market and the
  // plaza hear it too, not only the church's layer.
  bells(rounds = 3, vol = 0.05) {
    if (!ctx || vol <= 0.002) return;
    const t = ctx.currentTime;
    let d = 0;
    for (let r = 0; r < rounds; r++) for (const f of [392, 330, 262]) { partials(BELL, f, t + d, 3.2, vol, sfx); d += 0.62; }
    this.bellLog = (this.bellLog || 0) + 1;
  },
  // The charter flight's landing applause: ~30 hand claps a second, swelling then thinning out.
  applause(secs = 2) {
    if (!ctx) return;
    const n = Math.round(secs * 30);
    for (let k = 0; k < n; k++) {
      const d = Math.pow(Math.random(), 0.8) * secs;
      const swell = Math.min(1, d / 0.3) * (1 - 0.6 * (d / secs));
      this.noise(0.035 + Math.random() * 0.03, (0.04 + Math.random() * 0.05) * swell + 0.004, 1400 + Math.random() * 1600, 'bandpass', d, 1.4);
    }
  },
  // Lub-dub: two short sine thumps with a pitch drop and a soft click.
  heartbeat() {
    this.tone(70, 0.16, 'sine', 0.38, 42); this.noise(0.04, 0.05, 180, 'lowpass');
    this.tone(64, 0.14, 'sine', 0.28, 40, 0.22); this.noise(0.04, 0.035, 160, 'lowpass', 0.22);
  },
  // Herr Storch's film camera (§10.11): the clockwork motor's whirr, a run of soft clicks over a hum.
  whirr(secs = 1.2) {
    const n = Math.round(secs * 18);
    for (let k = 0; k < n; k++) this.noise(0.016, 0.035, 2600, 'bandpass', k / 18, 5);
    this.tone(118, secs, 'sawtooth', 0.01, 112);
  },
  // Ole's camera (the gag at his bag, §10.32): the flash's pop and the shutter's double click, then
  // the flash charging again, a faint whine rising 1.8 → 5 kHz.
  shutter() {
    this.noise(0.05, 0.3, 2600, 'bandpass', 0, 1.5);
    this.noise(0.03, 0.22, 3800, 'bandpass', 0.06, 3);
    this.tone(1800, 0.9, 'sine', 0.018, 5000, 0.15);
  },
  // Turbulence: cabin rattle with a few loose clinks.
  rattle() {
    this.noise(0.3, 0.15, 300);
    for (let k = 0; k < 4; k++) this.noise(0.03, 0.04, 3200 + Math.random() * 1800, 'bandpass', Math.random() * 0.25, 8);
  },
  // Toilet flush: a noise sweep 2 kHz -> 300 Hz over 1.2 s, with a gurgle.
  flush() { this.sweep(1.2, 0.16, 2000, 300, 'bandpass', 1.1); this.tone(180, 0.25, 'sine', 0.05, 90, 0.9); },
  // Fin pop: 900 -> 1400 Hz in 0.12 s.
  squeak() { this.tone(900, 0.12, 'sine', 0.11, 1400); this.tone(1800, 0.08, 'triangle', 0.02, 2800); },
  // Crowd laugh: eight short formant-ish "ha" bursts, two voices.
  laugh() {
    for (let k = 0; k < 8; k++) {
      const d = k * 0.13 + Math.random() * 0.03, f = k % 2 ? 1100 : 750;
      this.noise(0.09, 0.08 * (1 - k / 11), f + Math.random() * 120, 'bandpass', d, 6);
      this.noise(0.08, 0.04 * (1 - k / 11), f * 2.6, 'bandpass', d, 8);
    }
  },
  knock() { for (let k = 0; k < 3; k++) { this.noise(0.06, 0.3, 500, 'lowpass', k * 0.16, 2); this.tone(150, 0.06, 'sine', 0.18, 90, k * 0.16); } },
  slap() { this.noise(0.08, 0.45, 2400, 'bandpass', 0, 0.8); this.noise(0.05, 0.2, 5000, 'highpass', 0.005); },
  doorSlam() { this.noise(0.28, 0.5, 260, 'lowpass', 0, 1.5); this.tone(80, 0.3, 'sine', 0.4, 45); this.noise(0.08, 0.15, 2600, 'bandpass', 0.02, 3); },
  // Angerud's ambulance (§1.2): a distant two-tone 960/770 Hz, fading in and out over 4 s.
  ambulance() {
    if (!ctx) return;
    const t = ctx.currentTime, g = ctx.createGain(), o = ctx.createOscillator(), f = ctx.createBiquadFilter();
    o.type = 'sine'; f.type = 'lowpass'; f.frequency.value = 1800;
    for (let k = 0; k < 9; k++) o.frequency.setValueAtTime(k % 2 ? 770 : 960, t + k * 0.45);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045, t + 1.6);
    g.gain.setValueAtTime(0.045, t + 2.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    o.connect(f).connect(g).connect(sfx);
    o.start(t); o.stop(t + 4.05);
  },
  // A sheep: 420 -> 300 Hz with a bleating vibrato through a nasal band-pass; `p` scales the pitch
  // (Fataga's sheep, §10.60).
  baa(p = 1) {
    if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), v = ctx.createOscillator(), vg = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(420 * p, t); o.frequency.exponentialRampToValueAtTime(300 * p, t + 0.6);
    v.frequency.value = 9; vg.gain.value = 18 * p; v.connect(vg).connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2.5;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    o.connect(f).connect(g).connect(into || sfx);
    o.start(t); v.start(t); o.stop(t + 0.7); v.stop(t + 0.7);
  },
  // The grisbil's horn (P2): two nasal grunts.
  oink() {
    for (const d of [0, 0.22]) { this.tone(190, 0.16, 'sawtooth', 0.07, 120, d); this.noise(0.12, 0.06, 600, 'bandpass', d, 3); }
  },
  // A watchdog (Fin hund…, §10.21): `n` short rough barks, a sawtooth jumping up and falling through a
  // mouth-like band-pass with a breath of noise on each; `size` 1 a medium dog, under 1 yaps higher (the
  // poodle 0.72), over 1 lower; `vol` 0..1 for the distance.
  woof(size = 1, n = 2, vol = 1) {
    if (!ctx) return;
    for (let k = 0; k < n; k++) {
      const d = k * 0.23 + Math.random() * 0.03, t = ctx.currentTime + d, f0 = (300 + Math.random() * 50) / size;
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0 * 0.8, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.2, t + 0.03); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.15);
      f.type = 'bandpass'; f.frequency.value = 950 / size; f.Q.value = 1.4;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.17 * vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
      o.connect(f).connect(g).connect(sfx);
      o.start(t); o.stop(t + 0.22);
      this.noise(0.08, 0.07 * vol, 1500 / size, 'bandpass', d, 1.5);
    }
  },
  // A dog's owner whistling it home from the house (§10.21): a short note up, then a long one sliding down.
  whistle() { this.tone(1700, 0.14, 'sine', 0.07, 2400); this.tone(2350, 0.36, 'sine', 0.07, 1500, 0.2); },
  // A flock lifting (Fåglarna som lyfter, §10.31): `n` birds' wing claps, soft band-passed noise
  // bursts a little apart (more and longer for more birds), over a rising whoosh; `vol` 0..1 for the
  // distance.
  flap(n = 1, vol = 1) {
    const k = Math.min(12, 3 + n * 2);
    for (let i = 0; i < k; i++) this.noise(0.05, 0.1 * vol * (1 - i / (k + 4)), 800 + Math.random() * 800, 'bandpass', i * 0.05 + Math.random() * 0.04, 0.9);
    this.sweep(0.25 + Math.min(n, 8) * 0.04, 0.05 * vol, 500, 1700, 'bandpass', 0.8);
  },
  // A gull's cry (§10.31): a nasal sawtooth gliding up, then a longer one down ("kie-ow"), through a
  // band-pass; `low` under 1 lowers it into a heron's hoarse croak (with a breath of noise). `delay` s
  // (the marina's gulls answering each other, §10.60).
  gull(vol = 1, low = 1, delay = 0) {
    if (!ctx) return;
    for (const [d, f0, f1, len] of [[0, 1150, 1650, 0.14], [0.17, 1550, 880, 0.34]]) {
      const t = ctx.currentTime + delay + d, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0 * low, t); o.frequency.exponentialRampToValueAtTime(f1 * low, t + len);
      f.type = 'bandpass'; f.frequency.value = 1900 * low; f.Q.value = 1.6;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(f).connect(g).connect(into || sfx);
      o.start(t); o.stop(t + len + 0.05);
    }
    if (low < 0.6) this.noise(0.4, 0.06 * vol, 700, 'bandpass', delay, 1.2);
  },
  helanGar() { this.trad('helanGar'); },

  // Public-domain traditional cue (§12.1): a one-shot accordion melody with an oom-pah under it,
  // over a ducked music bus. opts.vol (0..1) scales it (helanGar is "faint" by default); opts.duck
  // is the music bus's level under it (0.3; the pool fest's faint far rounds duck less, §10.13).
  // Returns the length in seconds (0: no context, muted or music off). `tradAt` is the audio-clock
  // time of the cue's beat 0 (read with `clock()`; the pool fest dances on it).
  trad(name, opts = {}) {
    const m = TRAD[name];
    if (!m || !ctx || this.muted || !this.musicOn) return 0;
    const vol = opts.vol ?? (name === 'helanGar' ? 0.55 : 1);
    const beat = 60 / m.bpm, t0 = ctx.currentTime + 0.12;
    this.tradAt = t0;
    let end = 0;
    for (const [b, n, d] of m.notes) {
      if (n > 0) accordion(mtof(n), t0 + b * beat, d * beat * 0.92, 0.07 * vol, tradBus);
      end = Math.max(end, b + d);
    }
    for (let b = 0; b < end; b++) {
      const ch = m.chords[Math.floor(b / m.beatsPerChord) % m.chords.length];
      const t = t0 + b * beat;
      if (b % 2 === 0) bassNote(mtof(ch[0] - 12), t, beat * 0.8, 0.32 * vol, tradBus);
      else stab(ch.slice(1).map(mtof), t, beat * 0.4, 0.035 * vol, tradBus, 'triangle');
    }
    const len = end * beat + 0.4;
    clearTimeout(this._tradT);
    tradDuck.gain.setTargetAtTime(opts.duck ?? 0.3, ctx.currentTime, 0.15);
    this._tradT = setTimeout(() => { if (ctx) tradDuck.gain.setTargetAtTime(1, ctx.currentTime, 0.4); }, len * 1000);
    return len;
  },
  // ------------------------------------------------------------------------------------------
  // Voices (voice.js plays the clips; the chain they go through is here, DESIGN §12.4)

  get ctx() { return ctx; },
  get duckLevel() { return vduck ? vduck.gain.value : 1; },   // the music under speech (tests)
  // While anybody speaks the music and the trad tunes drop ~8 dB and the engine ~4 dB (0.1 s down,
  // 0.6 s back).
  voiceDuck(on) {
    if (!ctx) return;
    const t = ctx.currentTime;
    vduck.gain.setTargetAtTime(on ? 0.4 : 1, t, on ? 0.035 : 0.2);
    engDuck.gain.setTargetAtTime(on ? 0.63 : 1, t, on ? 0.035 : 0.2);
  },
  // The ears: the camera (position, forward, up).
  setListener(x, y, z, fx, fy, fz, ux, uy, uz) {
    const L = ctx?.listener;
    if (!L) return;
    if (L.positionX) {
      const t = ctx.currentTime;
      L.positionX.setValueAtTime(x, t); L.positionY.setValueAtTime(y, t); L.positionZ.setValueAtTime(z, t);
      L.forwardX.setValueAtTime(fx, t); L.forwardY.setValueAtTime(fy, t); L.forwardZ.setValueAtTime(fz, t);
      L.upX.setValueAtTime(ux, t); L.upY.setValueAtTime(uy, t); L.upZ.setValueAtTime(uz, t);
    } else { L.setPosition(x, y, z); L.setOrientation(fx, fy, fz, ux, uy, uz); }
  },
  // One line's way to the voice bus, by mode: 'dialog' dry and centred; 'radio' a walkie-talkie
  // (300-3400 Hz, a little grit); 'pa' a loudspeaker (band-passed, a little room); 'car' a
  // passenger, a little to the right; 'world' from where the speaker stands (setPos), fading with
  // distance, with a little room; 'film' the film night's projector (low-passed, a faint hum).
  // muffle: heard from inside a car. Pitch and tempo are never touched.
  voiceChain(mode = 'dialog', { muffle = false } = {}) {
    const c = ctx, nodes = [], srcs = [];
    const mk = (n) => { nodes.push(n); return n; };
    const filt = (type, f, q = 0.8) => { const b = mk(c.createBiquadFilter()); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const input = mk(c.createGain()), out = mk(c.createGain());
    let head = input, panner = null, room = 0;
    if (mode === 'radio') {
      const sh = mk(c.createWaveShaper()), g = mk(c.createGain());
      sh.curve = RADIO_CURVE; g.gain.value = 1.2;
      head.connect(filt('highpass', 300)).connect(filt('lowpass', 3400, 0.9)).connect(sh).connect(g);
      head = g;
    } else if (mode === 'pa') {
      const g = mk(c.createGain()); g.gain.value = 1.15;
      head.connect(filt('highpass', 380, 0.7)).connect(filt('peaking', 2200, 1)).connect(filt('lowpass', 5200, 0.7)).connect(g);
      head = g; room = 0.35;
    } else if (mode === 'car') {
      const p = mk(c.createStereoPanner());
      p.pan.value = 0.3;
      head.connect(p); head = p;
    } else if (mode === 'world') {
      panner = mk(c.createPanner());
      Object.assign(panner, { panningModel: 'equalpower', distanceModel: 'inverse', refDistance: 4, rolloffFactor: 1.1, maxDistance: 90 });
      head.connect(panner); head = panner; room = 0.1;
    } else if (mode === 'film') {
      const lp = filt('lowpass', 2800, 0.7);
      head.connect(filt('highpass', 220, 0.7)).connect(lp); head = lp;
      const hum = c.createBufferSource(), hg = mk(c.createGain());
      hum.buffer = noiseBuf; hum.loop = true; hg.gain.value = 0.012;
      hum.connect(filt('bandpass', 1400, 0.6)).connect(hg).connect(out);
      hum.start(); srcs.push(hum); nodes.push(hum);
    }
    if (muffle) { const lp = filt('lowpass', 1100, 0.5); head.connect(lp); head = lp; }
    head.connect(out).connect(voiceBus);
    if (room) { const v = mk(c.createGain()); v.gain.value = room; out.connect(v).connect(voiceVerb); }
    return {
      input, out, panner,
      setPos(x, y, z) { if (panner.positionX) { const t = c.currentTime; panner.positionX.setTargetAtTime(x, t, 0.03); panner.positionY.setTargetAtTime(y, t, 0.03); panner.positionZ.setTargetAtTime(z, t, 0.03); } else panner.setPosition(x, y, z); },
      dispose() { for (const s of srcs) { try { s.stop(); } catch (e) { /* stopped */ } } for (const n of nodes) { try { n.disconnect(); } catch (e) { /* gone */ } } },
    };
  },
  // Tests: the RMS (dBFS) of the music (after the voices' duck) and of the voices as they leave
  // their buses, over ~0.7 s (analysers made on first use).
  levels() {
    if (!ctx) return null;
    if (!this._meters) {
      this._meters = {};
      for (const [k, node] of [['music', vduck], ['voice', voiceBus]]) { const a = ctx.createAnalyser(); a.fftSize = 32768; node.connect(a); this._meters[k] = a; }
    }
    const out = {};
    for (const [k, a] of Object.entries(this._meters)) {
      const d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d);
      let e = 0; for (const v of d) e += v * v;
      out[k] = +(10 * Math.log10(e / d.length + 1e-12)).toFixed(1);
    }
    return out;
  },

  // The audio clock in seconds while the context runs, else null (none yet, or suspended).
  clock() { return ctx && ctx.state === 'running' ? ctx.currentTime : null; },
  // Test hook (tools/scenarios/meter.mjs): RMS of the master output over the last ~40 ms, the
  // context state and the tune that is playing now.
  level() {
    if (!ctx) return { rms: 0, state: 'none', tune: tuneName };
    if (!this._an) { this._an = ctx.createAnalyser(); this._an.fftSize = 2048; master.connect(this._an); this._buf = new Float32Array(2048); }
    this._an.getFloatTimeDomainData(this._buf);
    let s = 0;
    for (let i = 0; i < this._buf.length; i++) s += this._buf[i] * this._buf[i];
    return { rms: Math.sqrt(s / this._buf.length), state: ctx.state, tune: tuneName };
  },
  // Kept from Bigmouth for any caller that still uses it.
  shameBell() {
    if (!ctx) return;
    [0, 0.9].forEach((d) => {
      this.tone(98, 1.4, 'sine', 0.35, null, d);
      this.tone(196, 1.0, 'triangle', 0.12, null, d);
      this.tone(293, 0.8, 'sine', 0.06, null, d);
    });
  },
};

// ---- the music scheduler -----------------------------------------------------------------------
// One bar at a time from the current tune; a pending setTune() takes over at the next bar.
// Catch-up guard: after a stall it skips ahead instead of playing every missed bar.
function startMusic() {
  if (music) return;
  let bar = 0, next = ctx.currentTime + 0.2;
  music = setInterval(() => {
    if (!ctx || !audio.musicOn) return;
    if (next < ctx.currentTime) next = ctx.currentTime + 0.05;
    while (next < ctx.currentTime + 0.6) {
      if (pendingTune) { tuneName = pendingTune; pendingTune = null; bar = 0; }
      if (barJump != null) { bar = barJump; barJump = null; }
      const tune = TUNES[tuneName] || TUNES.placeholder;
      const beat = 60 / tune.bpm;
      tune.bar(API, next, bar, beat);
      if (amb) ambBar(tuneName, next, bar, beat, tune.beats || 4);
      next += beat * (tune.beats || 4);
      bar++;
    }
  }, 200);
}

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- music voices (all on the music bus unless a destination is given) ------------------------
function envGain(t, a, peak, d, dest) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.01, d));
  g.connect(dest);
  return g;
}
function osc(type, f, t, d, dest) {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.value = f;
  o.connect(dest); o.start(t); o.stop(t + d + 0.05);
  return o;
}
function bassNote(f, t, d, v = 0.45, dest = musicBus) {
  const fl = ctx.createBiquadFilter();
  fl.type = 'lowpass'; fl.frequency.value = 520;
  fl.connect(envGain(t, 0.012, v, d, dest));
  osc('triangle', f, t, d, fl);
  osc('sine', f / 2, t, d * 0.7, fl);
}
function brush(t, v, hp = 6000, len = 0.09) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(f).connect(g).connect(musicBus);
  s.start(t, Math.random() * 1.5); s.stop(t + len + 0.03);
}
function snare(t, v) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.7;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  s.connect(f).connect(g).connect(musicBus);
  s.start(t, Math.random() * 1.5); s.stop(t + 0.16);
  osc('triangle', 185, t, 0.06, envGain(t, 0.002, v * 0.6, 0.07, musicBus));
}
// Several notes through one filter and one envelope (chord stabs).
function stab(fs, t, d, v, dest = musicBus, type = 'square', cutoff = 1400, a = 0.008) {
  const fl = ctx.createBiquadFilter();
  fl.type = 'lowpass'; fl.frequency.value = cutoff;
  fl.connect(envGain(t, a, v, d, dest));
  for (const f of fs) osc(type, f, t, d, fl);
}
// Accordion: a detuned square pair, 5 Hz tremolo, low-passed.
function accordion(f, t, d, v, dest = musicBus) {
  const fl = ctx.createBiquadFilter(), g = ctx.createGain(), trem = ctx.createOscillator(), tg = ctx.createGain();
  fl.type = 'lowpass'; fl.frequency.value = 1700; fl.Q.value = 0.8;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.03);
  g.gain.setValueAtTime(v, t + Math.max(0.04, d - 0.06));
  g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.04);
  trem.frequency.value = 5; tg.gain.value = v * 0.28;
  trem.connect(tg).connect(g.gain);
  fl.connect(g).connect(dest);
  osc('square', f, t, d + 0.04, fl);
  osc('square', f * 1.006, t, d + 0.04, fl);
  trem.start(t); trem.stop(t + d + 0.1);
}
// A soft sine bell (the muzak chime).
function chimeNote(f, t, d, v) {
  osc('sine', f, t, d, envGain(t, 0.005, v, d, musicBus));
  osc('sine', f * 3.01, t, d * 0.3, envGain(t, 0.003, v * 0.12, d * 0.3, musicBus));
}
// A slow sine pad.
function pad(fs, t, d, v) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.4, d * 0.3));
  g.gain.setValueAtTime(v, t + d * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  g.connect(musicBus);
  for (const f of fs) { osc('sine', f, t, d, g); osc('triangle', f * 1.003, t, d, g); }
}
// Conga (sine 220 -> 170 low, 330 -> 250 high).
function conga(t, hi, v = 0.22, dest = musicBus) {
  const o = ctx.createOscillator(), g = envGain(t, 0.004, v, 0.18, dest);
  o.type = 'sine';
  o.frequency.setValueAtTime(hi ? 330 : 220, t); o.frequency.exponentialRampToValueAtTime(hi ? 250 : 170, t + 0.12);
  o.connect(g); o.start(t); o.stop(t + 0.22);
}
// Timple (the Canarian little guitar): a triangle pluck.
function pluck(f, t, v = 0.05, d = 0.22) { osc('triangle', f, t, d, envGain(t, 0.003, v, d, musicBus)); }
// Brass: a filtered saw pair whose filter opens on the attack.
function brass(f, t, d, v) {
  const fl = ctx.createBiquadFilter();
  fl.type = 'lowpass'; fl.Q.value = 2;
  fl.frequency.setValueAtTime(500, t); fl.frequency.exponentialRampToValueAtTime(2600, t + 0.05); fl.frequency.exponentialRampToValueAtTime(1100, t + Math.max(0.1, d));
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02);
  g.gain.setValueAtTime(v * 0.8, t + Math.max(0.03, d - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.03);
  fl.connect(g).connect(musicBus);
  osc('sawtooth', f, t, d + 0.03, fl);
  osc('sawtooth', f * 1.004, t, d + 0.03, fl);
}
// Surdo: sine 60 -> 45 Hz.
function surdo(t, v) {
  const o = ctx.createOscillator(), g = envGain(t, 0.004, v, 0.45, musicBus);
  o.type = 'sine'; o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.3);
  o.connect(g); o.start(t); o.stop(t + 0.5);
}
// Agogô: two square bells.
function agogo(t, hi, v = 0.03) {
  const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = hi ? 1250 : 940; fl.Q.value = 4;
  fl.connect(envGain(t, 0.002, v, 0.16, musicBus));
  osc('square', hi ? 1250 : 940, t, 0.16, fl);
}
// Sleigh bells: a cluster of tiny high noise ticks.
function sleigh(t, v) { for (let k = 0; k < 3; k++) brush(t + k * 0.018, v * (1 - k * 0.25), 7500, 0.05); }
// A soft whistle-like lead (sine with vibrato) for the samba.
function flute(f, t, d, v) {
  const g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.04);
  g.gain.setValueAtTime(v, t + Math.max(0.05, d - 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.05);
  g.connect(musicBus);
  const o = osc('sine', f, t, d + 0.05, g);
  vib.frequency.value = 5.5; vg.gain.value = f * 0.008; vib.connect(vg).connect(o.frequency);
  vib.start(t); vib.stop(t + d + 0.1);
  osc('triangle', f * 2, t, d * 0.5, envGain(t, 0.02, v * 0.08, d * 0.5, musicBus));
}

// What a tune's bar() gets (registerTune callers too): the voices above, on the music bus.
const API = {
  mtof, bass: bassNote, brush, snare, stab, accordion, chime: chimeNote, pad, conga, pluck, brass, surdo, agogo, sleigh, flute,
  tone(f, t, d, type = 'square', v = 0.1) { osc(type, f, t, d, envGain(t, 0.01, v, d, musicBus)); },
  get ctx() { return ctx; },
  get bus() { return musicBus; },
  get noise() { return noiseBuf; },
};

// Play a melody bar: notes [beatOffset, midi, beats] (midi <= 0 = rest).
function line(notes, t0, beat, fn) { for (const [b, n, d] of notes) if (n > 0) fn(mtof(n), t0 + b * beat, d * beat); }

// ---- muzak: 92 bpm bossa-muzak, Dmaj7–Bm7–Em7–A7 (flight level; title on a fresh save) ------------
// Soft sine pad, brushed hats, a rim-click clave, bossa bass and a sine chime phrase every 8 bars.
const MUZAK_CH = [
  { root: 38, fifth: 45, v: [57, 61, 62, 66] },   // Dmaj7
  { root: 35, fifth: 42, v: [57, 59, 62, 66] },   // Bm7
  { root: 40, fifth: 47, v: [55, 59, 62, 64] },   // Em7
  { root: 33, fifth: 40, v: [55, 61, 64, 67] },   // A7
];
const MUZAK_CHIME = {
  0: [[0, 78, 1], [1, 76, 0.5], [1.5, 73, 1.5], [3, 74, 1]],
  1: [[0, 71, 1.5], [1.5, 73, 0.5], [2, 78, 2]],
  4: [[0.5, 81, 0.5], [1, 78, 1], [2, 76, 0.5], [2.5, 73, 1.5]],
  5: [[0, 74, 1], [1, 71, 1], [2, 69, 2]],
};
registerTune('muzak', {
  bpm: 92, beats: 4,
  bar(api, t0, bar, beat) {
    const c = MUZAK_CH[bar % 4];
    pad(c.v.map(mtof), t0, beat * 4, 0.018);
    for (const [b, n, d] of [[0, c.root, 1.4], [1.5, c.fifth, 0.45], [2, c.fifth, 1.4], [3.5, c.root, 0.45]]) bassNote(mtof(n), t0 + b * beat, d * beat, 0.3);
    // Bossa comping (an electric-piano-ish triangle stab) and the 3-2 rim clave.
    for (const b of (bar % 2 ? [1, 2.5] : [0, 1.5, 3])) stab(c.v.map((n) => mtof(n + 12)), t0 + b * beat, beat * 0.45, 0.022, musicBus, 'triangle', 2200);
    for (const b of (bar % 2 ? [1, 2] : [0, 1.5, 3])) pluck(1750, t0 + b * beat, 0.012, 0.03);
    for (let k = 0; k < 8; k++) brush(t0 + k * beat * 0.5, k % 2 ? 0.035 : 0.018);
    const ph = MUZAK_CHIME[bar % 8];
    if (ph) line(ph, t0, beat, (f, t, d) => chimeNote(f, t, d + 0.6, bar % 8 >= 4 ? 0.045 : 0.06));
  },
});

// ---- sol: 116 bpm charter schlager in A minor, Am–G–F–E (island) ---------------------------------
// Accordion lead (an original 8-bar phrase), congas, timple arpeggios, root–fifth bass and
// off-beat accordion chords. `jul` reuses it re-voiced in A major with sleigh bells.
const SOL_CH = [
  { root: 45, fifth: 52, v: [57, 60, 64] },   // Am
  { root: 43, fifth: 50, v: [55, 59, 62] },   // G
  { root: 41, fifth: 48, v: [53, 57, 60] },   // F
  { root: 40, fifth: 47, v: [56, 59, 64] },   // E
];
const SOL_LEAD = [
  [[0, 76, 1], [1, 74, 0.5], [1.5, 72, 0.5], [2, 71, 0.5], [2.5, 72, 0.5], [3, 69, 1]],
  [[0, 71, 1], [1, 74, 1], [2, 79, 1.5], [3.5, 77, 0.5]],
  [[0, 76, 0.5], [0.5, 77, 0.5], [1, 76, 0.5], [1.5, 74, 0.5], [2, 72, 1], [3, 69, 1]],
  [[0, 68, 1.5], [1.5, 69, 0.5], [2, 71, 1], [3, 64, 1]],
  [[0, 69, 0.5], [0.5, 72, 0.5], [1, 76, 1], [2, 81, 1], [3, 79, 0.5], [3.5, 77, 0.5]],
  [[0, 79, 1.5], [1.5, 77, 0.5], [2, 74, 1], [3, 71, 1]],
  [[0, 77, 0.5], [0.5, 76, 0.5], [1, 74, 0.5], [1.5, 72, 0.5], [2, 71, 1], [3, 72, 0.5], [3.5, 71, 0.5]],
  [[0, 68, 2], [2, 64, 1.5]],
];
// A minor -> A major: C, F, G become C#, F#, G# (the G bar becomes E7/G#, the F bar F#m).
const toMajor = (n) => { const pc = ((n % 12) + 12) % 12; return pc === 0 || pc === 5 || pc === 7 ? n + 1 : n; };
const JUL_CH = [
  { root: 45, fifth: 52, v: [57, 61, 64] },   // A
  { root: 44, fifth: 52, v: [56, 59, 62] },   // E7/G#
  { root: 42, fifth: 49, v: [54, 57, 61] },   // F#m
  { root: 40, fifth: 47, v: [56, 59, 64] },   // E
];
function solBar(t0, bar, beat, major) {
  const c = (major ? JUL_CH : SOL_CH)[bar % 4];
  bassNote(mtof(c.root), t0, beat * 0.9, 0.4);
  bassNote(mtof(c.fifth), t0 + 2 * beat, beat * 0.9, 0.36);
  if (bar % 2) bassNote(mtof(c.root + 12), t0 + 3.5 * beat, beat * 0.4, 0.25);
  for (const b of [1, 3]) stab(c.v.map((n) => mtof(n + 12)), t0 + b * beat, beat * 0.35, 0.03, musicBus, 'square', 1300);
  // Timple: chord tones up and down in eighths.
  const v = c.v;
  for (let k = 0; k < 8; k++) {
    const n = [v[0], v[1], v[2], v[1] + 12, v[2] + 12, v[1] + 12, v[2], v[1]][k];
    pluck(mtof(n + 12), t0 + k * beat * 0.5, k % 2 ? 0.022 : 0.032, 0.18);
  }
  for (const [b, hi] of [[0, 0], [1.5, 1], [2, 0], [2.5, 1], [3.5, 1]]) conga(t0 + b * beat, hi, 0.17);
  for (let k = 0; k < 8; k++) {
    if (major) sleigh(t0 + k * beat * 0.5, k % 2 ? 0.022 : 0.04);
    else if (k % 2) brush(t0 + k * beat * 0.5, 0.02);
  }
  // The lead rests for 8 of every 32 bars so the loop breathes.
  if (bar % 32 < 24) {
    for (const [b, n, d] of SOL_LEAD[bar % 8]) accordion(mtof(major ? toMajor(n) : n), t0 + b * beat, d * beat * 0.95, major ? 0.05 : 0.055);
  }
}
registerTune('sol', { bpm: 116, beats: 4, bar(api, t0, bar, beat) { solBar(t0, bar, beat, false); } });
registerTune('jul', { bpm: 112, beats: 4, bar(api, t0, bar, beat) { solBar(t0, bar, beat, true); } });

// ---- skandal: 132 bpm 2/4 paso-doble, Am–E7–Am–Dm–E7 (island pursuit; the siren plays on top) ---
const AM = { root: 45, fifth: 52, v: [57, 60, 64] }, E7 = { root: 40, fifth: 47, v: [56, 59, 62] }, DM = { root: 38, fifth: 45, v: [57, 62, 65] };
const SKANDAL_CH = [AM, AM, E7, E7, AM, DM, E7, E7];
const SKANDAL_LEAD = [
  [[0, 76, 0.5], [0.5, 76, 0.25], [0.75, 76, 0.25], [1, 81, 1]],
  [[0, 79, 0.5], [0.5, 77, 0.5], [1, 76, 1]],
  [[0, 74, 0.5], [0.5, 74, 0.25], [0.75, 74, 0.25], [1, 80, 1]],
  [[0, 77, 0.5], [0.5, 76, 0.5], [1, 74, 1]],
  [[0, 72, 0.5], [0.5, 76, 0.5], [1, 81, 0.5], [1.5, 84, 0.5]],
  [[0, 81, 0.5], [0.5, 77, 0.5], [1, 74, 1]],
  [[0, 76, 0.5], [0.5, 77, 0.5], [1, 76, 0.5], [1.5, 74, 0.5]],
  [[0, 71, 0.5], [0.5, 68, 0.5], [1, 64, 1]],
];
registerTune('skandal', {
  bpm: 132, beats: 2,
  bar(api, t0, bar, beat) {
    const k = bar % 8, c = SKANDAL_CH[k];
    bassNote(mtof(c.root), t0, beat * 0.7, 0.55);
    bassNote(mtof(c.fifth - 12), t0 + beat, beat * 0.55, 0.38);
    stab(c.v.map(mtof), t0 + beat, beat * 0.3, 0.065, musicBus, 'sawtooth', 1800);
    stab(c.v.map(mtof), t0 + beat * 1.5, beat * 0.2, 0.04, musicBus, 'sawtooth', 1500);
    // A snare roll into the turnaround (bars 7–8), otherwise the paso-doble back-beat.
    if (k >= 6) for (let s = 0; s < 8; s++) snare(t0 + s * beat * 0.25, 0.04 + 0.05 * ((k - 6) * 8 + s) / 16);
    else { snare(t0 + beat, 0.1); snare(t0 + beat * 1.5, 0.05); }
    if (bar % 16 < 8 || k >= 4) line(SKANDAL_LEAD[k], t0, beat, (f, t, d) => brass(f, t, d * 0.9, 0.09));
  },
});

// ---- vals: 3/4 at 150 bpm oom-pah, C–G7–G7–C / F–C–G7–C (grisfest night) ------------------------
const VC = { root: 36, alt: 43, v: [60, 64, 67] }, VG7 = { root: 43, alt: 38, v: [59, 62, 65] }, VF = { root: 41, alt: 36, v: [60, 65, 69] };
const VALS_CH = [VC, VG7, VG7, VC, VF, VC, VG7, VC];
const VALS_LEAD = [
  [[0, 67, 1], [1, 72, 1], [2, 76, 1]], [[0, 79, 2], [2, 77, 1]], [[0, 74, 1], [1, 71, 1], [2, 74, 1]], [[0, 76, 2], [2, 72, 1]],
  [[0, 77, 1], [1, 81, 1], [2, 77, 1]], [[0, 76, 1], [1, 79, 1], [2, 76, 1]], [[0, 74, 1], [1, 77, 1], [2, 71, 1]], [[0, 72, 2]],
];
registerTune('vals', {
  bpm: 150, beats: 3,
  bar(api, t0, bar, beat) {
    const k = bar % 8, c = VALS_CH[k];
    bassNote(mtof(bar % 16 < 8 ? c.root : c.alt), t0, beat * 0.8, 0.42);
    for (const b of [1, 2]) stab(c.v.map(mtof), t0 + b * beat, beat * 0.35, 0.035, musicBus, 'square', 1200);
    brush(t0 + beat, 0.02); brush(t0 + 2 * beat, 0.02);
    line(VALS_LEAD[k], t0, beat, (f, t, d) => accordion(f, t, d * 0.92, 0.055));
  },
});

// ---- samba: 100 bpm, Dm7–G7–Cmaj7–A7 (Ole's boombox, Tonga Tonga, Rio, the unlock) ----------------
const SAMBA_CH = [
  { root: 38, fifth: 45, v: [60, 65, 69, 72] },   // Dm7
  { root: 43, fifth: 50, v: [59, 62, 65, 69] },   // G7
  { root: 36, fifth: 43, v: [59, 64, 67, 71] },   // Cmaj7
  { root: 45, fifth: 52, v: [61, 64, 67, 69] },   // A7
];
const SAMBA_LEAD = [
  [[0.5, 77, 0.5], [1, 76, 0.5], [1.5, 74, 1], [2.5, 72, 0.5], [3, 74, 1]],
  [[0, 71, 1.5], [1.5, 74, 0.5], [2, 77, 0.5], [2.5, 79, 1.5]],
  [[0, 76, 2], [2.5, 72, 0.5], [3, 71, 1]],
  [[0, 73, 1], [1, 76, 0.75], [1.75, 79, 0.75], [2.5, 81, 1.5]],
];
// 16th-note patterns: tamborim, agogô high / low, cavaquinho chord chops.
const TAMB = '1011011010110110', AG_HI = '1000001000100000', AG_LO = '0010100010001010', CAVACO = '0010100100101001';
registerTune('samba', {
  bpm: 100, beats: 4,
  bar(api, t0, bar, beat) {
    const c = SAMBA_CH[bar % 4], s16 = beat / 4;
    for (const [b, n, d] of [[0, c.root, 0.8], [1.5, c.fifth, 0.4], [2, c.root, 0.8], [3.5, c.fifth, 0.4]]) bassNote(mtof(n), t0 + b * beat, d * beat, 0.38);
    surdo(t0, 0.22); surdo(t0 + beat, 0.5); surdo(t0 + 2 * beat, 0.22); surdo(t0 + 3 * beat, 0.5);
    for (let k = 0; k < 16; k++) {
      const t = t0 + k * s16;
      if (TAMB[k] === '1') brush(t, k % 4 === 0 ? 0.05 : 0.03, 5200, 0.05);
      if (AG_HI[k] === '1') agogo(t, true);
      if (AG_LO[k] === '1') agogo(t, false);
      if (CAVACO[k] === '1') stab(c.v.map((n) => mtof(n + 12)), t, s16 * 1.4, 0.02, musicBus, 'triangle', 2600);
    }
    if (bar % 8 < 4) line(SAMBA_LEAD[bar % 4], t0, beat, (f, t, d) => flute(f, t, d * 0.95, 0.08));
  },
});

// Unknown tune names fall back to this (Bigmouth's swung walking bass).
const PROG = [[48, 52, 55, 57], [53, 57, 60, 62], [48, 52, 55, 58], [55, 59, 62, 53]];
registerTune('placeholder', {
  bpm: 132, beats: 4,
  bar(api, t0, bar, beat) {
    const chord = PROG[bar % PROG.length];
    for (let b = 0; b < 4; b++) {
      const t = t0 + b * beat;
      bassNote(mtof(chord[b] - 12), t, beat * 0.9);
      brush(t + beat * 0.66, 0.04);
      if (b % 2 === 1) brush(t, 0.07);
    }
    if (bar % 2 === 0) stab(chord.slice(1).map((n) => mtof(n + 12)), t0 + beat * 1.66, 0.35, 0.05, musicBus, 'sine', 4000);
  },
});

// ---- Ljudlandskap per kvarter: the island's soundscape (free roam; feature 131, DESIGN §10.60) --
// One channel `ambient` (gain AMB_GAIN) straight into master and, per layer, a gain (its level, set by
// game/soundscape.js from where Stig is) and a stereo panner (the side it is heard from). The beds
// loop under their layer's gain from init on: the sea further out (waves), the murmur at La Medina's
// tables (bar) and Fataga's mountain air (fold). Everything else is a one-shot in `audio.amb`, played
// into its layer while the layer is heard (soundscape.js times them). The SunTrip stage's band is no
// loop of its own: while the stage is open (`ambBand`) the music scheduler hands every bar of `sol` or
// `samba` to `ambBar`, which schedules Affe's accordion and Gabbe's congas into the stage's layer on
// that bar's own clock and chords; and while Tonga Tonga is open (`ambClub`) a muffled kick on every
// beat of the tune comes through La Medina's wall. Own random draws (`arnd`), never Math.random's.
const AMB_GAIN = 0.3;
// `fest`: the balcony party's Helan går (feature 134, §10.63; the layer's own low-pass muffles it with
// distance), set by game/helanGar.js.
export const AMB_LAYERS = ['waves', 'hamn', 'fold', 'kyrka', 'scen', 'bar', 'fest'];
// Each layer's gain at level 1: the mix, so that each sits under the tune (about 7–12 dB at the surf
// and the stage) and none is lost under it. The party is the scene where it is: over the ducked tune.
const AMB_MIX = { waves: 1, hamn: 1.4, fold: 1.6, kyrka: 1.2, scen: 0.8, bar: 1.8, fest: 1.6 };
const arnd = (() => { let a = 131; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();

function buildAmbient() {
  const g = ctx.createGain();
  g.gain.value = AMB_GAIN;
  g.connect(master);
  // A noise buffer of its own, long enough that a bed's loop is never heard repeating.
  const buf = ctx.createBuffer(1, ctx.sampleRate * 7, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = arnd() * 2 - 1;
  amb = { g, buf, paused: false, band: false, club: false, layers: {}, beds: {}, clubBars: 0,
    bandLog: { bars: 0, solos: 0, notes: 0, offGrid: 0, tune: null, t0: 0, beat: 0, bar: 0 } };
  for (const k of AMB_LAYERS) {
    const lg = ctx.createGain(), pan = ctx.createStereoPanner();
    lg.gain.value = 0;
    if (k === 'fest') {
      amb.festLp = ctx.createBiquadFilter();
      amb.festLp.type = 'lowpass'; amb.festLp.frequency.value = 6500; amb.festLp.Q.value = 0.5;
      lg.connect(amb.festLp).connect(pan);
    } else lg.connect(pan);
    pan.connect(g);
    amb.layers[k] = { g: lg, pan, level: 0, side: 0 };
  }
  // A looped noise bed: a filter, a low-pass taking the hiss off (`top` Hz) and its gain.
  const bed = (layer, type, f, q, v, top) => {
    const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), bg = ctx.createGain();
    src.buffer = buf; src.loop = true;
    fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    lp.type = 'lowpass'; lp.frequency.value = top; lp.Q.value = 0.5;
    bg.gain.value = v;
    src.connect(fl).connect(lp).connect(bg).connect(amb.layers[layer].g);
    src.start(0, arnd() * 6.5);
    return { f: fl, g: bg };
  };
  amb.beds.sea = bed('waves', 'lowpass', 380, 0.5, 0.32, 1200);
  amb.beds.murmur = bed('bar', 'bandpass', 520, 0.9, 0.14, 1800);
  amb.beds.murmur2 = bed('bar', 'bandpass', 1150, 1.6, 0.05, 2200);
  amb.beds.wind = bed('fold', 'bandpass', 320, 0.5, 0.1, 700);
  const lfo = ctx.createOscillator(), lg = ctx.createGain();
  lfo.frequency.value = 0.07; lg.gain.value = 110;
  lfo.connect(lg).connect(amb.beds.wind.f.frequency);
  lfo.start();
}
// Play tone/noise/sweep/gull/baa/laugh into a layer instead of sfx, `k` times as loud.
function via(layer, fn, k = 1) {
  const prev = into;
  if (k === 1) into = amb.layers[layer].g;
  else { into = ctx.createGain(); into.gain.value = k; into.connect(amb.layers[layer].g); }
  try { fn(); } finally { into = prev; }
}

// A church bell: the hum, the prime, the minor third, the fifth and the nominal, the upper partials
// dying first.
const BELL = [[0.5, 0.6, 1], [1, 1, 0.7], [1.19, 0.5, 0.55], [1.5, 0.3, 0.45], [2, 0.55, 0.4], [2.52, 0.18, 0.2], [3.01, 0.12, 0.15]];
// A sheep's bell and a glass: [partial, level, decay] of sine partials, dying fast.
const SHEEP_BELL = [[1, 1, 1], [2.76, 0.55, 0.6], [5.4, 0.3, 0.35], [8.93, 0.15, 0.2]];
const GLASS = [[1, 1, 1], [1.58, 0.45, 0.7], [2.33, 0.25, 0.4]];
// A full butano bottle struck with a spanner (§10.65): a steel shell's inharmonic ring, damped by the gas.
const BOTTLE_RING = [[1, 1, 1], [2.32, 0.5, 0.55], [4.1, 0.3, 0.3], [6.3, 0.14, 0.18]];
function partials(parts, f, t, d, v, dest) { for (const [m, a, k] of parts) osc('sine', f * m, t, d * k, envGain(t, 0.003, v * a, d * k, dest)); }
// A conga slap: a sharp band-passed crack over a short high tone.
function slapVoice(t, v, dest) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = amb.buf; f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 1.1;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  src.connect(f).connect(g).connect(dest);
  src.start(t, arnd() * 6.5); src.stop(t + 0.09);
  osc('triangle', 420, t, 0.06, envGain(t, 0.002, v * 0.5, 0.06, dest));
}
// An accordion chord: the detuned square pairs of `accordion` through one filter and one envelope.
function accChord(fs, t, d, v, dest) { stab(fs.flatMap((f) => [f, f * 1.006]), t, d, v, dest, 'square', 1700, 0.02); }
// Tonga Tonga's bass through La Medina's wall: a low thump, the high end gone.
function clubKick(t, dest) {
  const o = ctx.createOscillator(), g = envGain(t, 0.005, 0.12, 0.22, dest);
  o.type = 'sine'; o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
  o.connect(g); o.start(t); o.stop(t + 0.26);
}

// The stage's band (§10.60). Affe: the left hand's oom-pah all through (the root on 1, the chord on 2,
// the fifth on 3, the chord on 4; in the samba the chord on every off-beat), and his own 8-bar phrase
// while the tune's lead rests (sol: bars 24–31 of 32; samba: 4–7 of 8). Gabbe: a conga pattern in
// `grid` beats (`O` open low, `H` open high, `S` slap, `T` a muffled touch, `.` rest). The phrases are
// original (never a film's melody, §1.5), written over the tunes' own chords.
const SOL_SOLO = [
  [[0, 69, 0.5], [0.5, 72, 0.5], [1, 76, 1], [2, 74, 0.5], [2.5, 72, 0.5], [3, 71, 0.5], [3.5, 72, 0.5]],
  [[0, 74, 1.5], [1.5, 71, 0.5], [2, 67, 1], [3, 71, 1]],
  [[0, 72, 0.5], [0.5, 69, 0.5], [1, 65, 1], [2, 69, 0.5], [2.5, 72, 0.5], [3, 77, 1]],
  [[0, 76, 1.5], [1.5, 74, 0.5], [2, 71, 0.5], [2.5, 68, 0.5], [3, 64, 1]],
  [[0, 81, 0.5], [0.5, 80, 0.5], [1, 81, 0.5], [1.5, 76, 0.5], [2, 72, 1], [3, 76, 1]],
  [[0, 79, 0.5], [0.5, 77, 0.5], [1, 74, 1], [2, 71, 0.5], [2.5, 74, 0.5], [3, 79, 1]],
  [[0, 77, 1], [1, 76, 0.5], [1.5, 74, 0.5], [2, 72, 0.5], [2.5, 71, 0.5], [3, 69, 1]],
  [[0, 68, 1], [1, 71, 0.5], [1.5, 74, 0.5], [2, 76, 2]],
];
const SAMBA_SOLO = [
  [[0, 69, 0.5], [0.5, 72, 0.5], [1, 77, 0.75], [1.75, 76, 0.75], [2.5, 74, 0.5], [3, 72, 1]],
  [[0, 71, 0.75], [0.75, 74, 0.75], [1.5, 77, 0.5], [2, 79, 1], [3, 77, 0.5], [3.5, 74, 0.5]],
  [[0, 76, 1.5], [1.5, 79, 0.5], [2, 83, 1], [3, 79, 1]],
  [[0, 81, 0.75], [0.75, 79, 0.75], [1.5, 76, 0.5], [2, 73, 1], [3, 76, 1]],
];
const BAND = {
  sol: { ch: SOL_CH, solo: (bar) => (bar % 32 >= 24 ? SOL_SOLO[bar % 8] : null), push: [1, 3], chordLen: 0.4, grid: 0.5, congas: 'THSTTTOO' },
  samba: { ch: SAMBA_CH, solo: (bar) => (bar % 8 >= 4 ? SAMBA_SOLO[bar % 4] : null), push: [0.5, 1.5, 2.5, 3.5], chordLen: 0.22, grid: 0.25, congas: 'T.SH..OOT.SH.HOO' },
};
// Called by the music scheduler for every bar it schedules (`name` the tune, `beats` its bar).
function ambBar(name, t0, bar, beat, beats) {
  if (amb.paused) return;
  const B = amb.band && BAND[name];
  if (B) {
    const c = B.ch[bar % 4], dest = amb.layers.scen.g, L = amb.bandLog;
    const at = (b) => { L.notes++; if (Math.abs(b * 4 - Math.round(b * 4)) > 1e-6) L.offGrid++; return t0 + b * beat; };
    accordion(mtof(c.root + 12), at(0), beat * 0.5, 0.05, dest);
    accordion(mtof(c.fifth + 12), at(2), beat * 0.5, 0.045, dest);
    for (const b of B.push) accChord(c.v.map(mtof), at(b), beat * B.chordLen, 0.02, dest);
    const solo = B.solo(bar);
    if (solo) for (const [b, n, d] of solo) accordion(mtof(n), at(b), d * beat * 0.92, 0.06, dest);
    for (let k = 0; k < B.congas.length; k++) {
      const ch = B.congas[k];
      if (ch === '.') continue;
      const t = at(k * B.grid);
      if (ch === 'O') conga(t, false, 0.26, dest);
      else if (ch === 'H') conga(t, true, 0.22, dest);
      else if (ch === 'S') slapVoice(t, 0.2, dest);
      else conga(t, false, 0.06, dest);
    }
    Object.assign(L, { bars: L.bars + 1, solos: L.solos + !!solo, tune: name, t0, beat, bar });
  }
  if (amb.club) {
    for (let k = 0; k < beats; k++) clubKick(t0 + k * beat, amb.layers.bar.g);
    amb.clubBars++;
  }
}

Object.assign(audio, {
  // The layer `name` at `level` 0..1 (its gain: × AMB_MIX), heard from `side` −1..1 (left..right of the camera).
  // Schedules only on a change (levels in 1/50, sides in 1/20); the gain glides there (0.35 s).
  ambLayer(name, level, side = 0) {
    const L = amb?.layers[name];
    if (!L) return;
    const lv = Math.round(Math.max(0, Math.min(1, level)) * 50) / 50, sd = Math.round(Math.max(-1, Math.min(1, side)) * 20) / 20;
    if (lv !== L.level) { L.level = lv; L.g.gain.setTargetAtTime(lv * AMB_MIX[name], ctx.currentTime, 0.35); }
    if (sd !== L.side) { L.side = sd; L.pan.pan.setTargetAtTime(sd, ctx.currentTime, 0.25); }
  },
  // The stage's band and Tonga Tonga's bass: scheduled with the tune's next bars while on.
  ambBand(on) { if (amb) amb.band = !!on; },
  ambClub(on) { if (amb) amb.club = !!on; },
  // Test hook (tools/scenarios/ljud.mjs): the channel's gain, every layer's level, side, gain now and
  // RMS (over the last ~40 ms, after its gain), the band's and the club's log and the channel's RMS.
  ambState() {
    if (!amb) return null;
    const rms = (an) => { an.getFloatTimeDomainData(amb.tmp); let s = 0; for (let i = 0; i < amb.tmp.length; i++) s += amb.tmp[i] * amb.tmp[i]; return Math.sqrt(s / amb.tmp.length); };
    const tap = (node) => { const an = ctx.createAnalyser(); an.fftSize = 2048; node.connect(an); return an; };
    if (!amb.an) { amb.tmp = new Float32Array(2048); amb.an = tap(amb.g); for (const k of AMB_LAYERS) amb.layers[k].an = tap(amb.layers[k].g); }
    const layers = {};
    for (const k of AMB_LAYERS) { const L = amb.layers[k]; layers[k] = { level: L.level, side: L.side, gain: +L.g.gain.value.toFixed(3), rms: +rms(L.an).toFixed(4) }; }
    return { gain: +amb.g.gain.value.toFixed(3), paused: amb.paused, band: amb.band, club: amb.club, layers,
      bandLog: { ...amb.bandLog }, clubBars: amb.clubBars, rms: +rms(amb.an).toFixed(4), tune: tuneName };
  },
  // Test hook: the music's next bar is bar `n` of its tune (a tune's bar-dependent parts without waiting).
  jumpBar(n) { barJump = n; },
  // Test hook: the channel's node, master's (a scenario records what they play) and the beds' { f, g }.
  ambNodes() { return amb && { ambient: amb.g, master, beds: amb.beds }; },
});

// The one-shots, each into its layer (soundscape.js plays them while the layer is heard).
audio.amb = {
  // A wave: the wash coming up the sand (a low-passed noise swelling as its filter opens to about
  // 1.1–1.7 kHz) and the foam drawing back (a soft hiss from the crest on). `len` s.
  wave(len = 6) {
    if (!amb) return;
    const t = ctx.currentTime, up = len * 0.42, dest = amb.layers.waves.g;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = amb.buf; s.loop = true;
    f.type = 'lowpass'; f.Q.value = 0.6;
    f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(1100 + 600 * arnd(), t + up); f.frequency.exponentialRampToValueAtTime(360, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55, t + up); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f).connect(g).connect(dest);
    const h = ctx.createBufferSource(), hf = ctx.createBiquadFilter(), hg = ctx.createGain();
    h.buffer = amb.buf; h.loop = true;
    hf.type = 'bandpass'; hf.frequency.value = 3400; hf.Q.value = 0.6;
    hg.gain.setValueAtTime(0.0001, t); hg.gain.setValueAtTime(0.0001, t + up);
    hg.gain.exponentialRampToValueAtTime(0.06, t + up + 0.9); hg.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.6);
    h.connect(hf).connect(hg).connect(dest);
    s.start(t, arnd() * 6.5); s.stop(t + len + 0.1);
    h.start(t, arnd() * 6.5); h.stop(t + len + 0.7);
  },
  // The marina's gulls: one cry, or two birds answering each other (`gull`, pitched 0.88–1.14).
  gulls() {
    if (!amb) return;
    via('hamn', () => {
      audio.gull(0.7, 0.88 + 0.26 * arnd());
      if (arnd() < 0.4) audio.gull(0.45, 0.9 + 0.24 * arnd(), 0.5 + 0.6 * arnd());
    }, 3);
  },
  // A moored boat creaking at its rope: a slow sawtooth (each cycle a tick, 20 → 36 Hz or back)
  // through a narrow band-pass, swelling and dying in under a second.
  creak() {
    if (!amb) return;
    const t = ctx.currentTime, d = 0.45 + 0.5 * arnd(), rise = arnd() < 0.5;
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(rise ? 20 : 36, t); o.frequency.linearRampToValueAtTime(rise ? 36 : 20, t + d);
    f.type = 'bandpass'; f.frequency.value = 520 + 420 * arnd(); f.Q.value = 9;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.8, t + d * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(f).connect(g).connect(amb.layers.hamn.g);
    o.start(t); o.stop(t + d + 0.05);
  },
  // Water lapping at the quay and the hulls.
  lap() {
    if (!amb) return;
    via('hamn', () => { audio.noise(0.32 + 0.2 * arnd(), 0.24, 420 + 200 * arnd(), 'lowpass', 0, 0.9); audio.sweep(0.3, 0.04, 1200, 450, 'bandpass', 1.4, 0.04); });
  },
  // A sailboat's halyard tapping its mast: two or three light metal tinks.
  halyard() {
    if (!amb) return;
    const f = 1700 + 700 * arnd(), n = arnd() < 0.5 ? 2 : 3;
    via('hamn', () => { for (let k = 0, d = 0; k < n; k++, d += 0.22 + 0.1 * arnd()) { audio.tone(f, 0.22, 'triangle', 0.03, null, d); audio.tone(f * 2.71, 0.08, 'sine', 0.012, null, d); } });
  },
  // A sheep's bell in Fataga's fold: two to four tinkles as it moves its head, each bell its own pitch.
  tinkle() {
    if (!amb) return;
    const t = ctx.currentTime, f = 900 + 600 * arnd(), n = 2 + Math.floor(arnd() * 3);
    for (let k = 0, d = 0; k < n; k++, d += 0.12 + 0.16 * arnd()) partials(SHEEP_BELL, f * (1 + 0.01 * arnd()), t + d, 0.5, 0.05 * (1 - 0.15 * k), amb.layers.fold.g);
  },
  // A bleat from the fold (`baa`, pitched 0.85–1.2).
  baa() { if (amb) via('fold', () => audio.baa(0.85 + 0.35 * arnd()), 2.5); },
  // Fataga's church bell in its gable: `n` strokes 1.3 s apart.
  villageBell(n = 3) {
    if (!amb) return;
    const t = ctx.currentTime;
    for (let k = 0; k < n; k++) partials(BELL, 660, t + k * 1.3, 2.2, 0.03, amb.layers.fold.g);
  },
  // Templo Ecuménico's bells: three (G, E, C) rung down in turn, `rounds` times.
  peal(rounds = 3) {
    if (!amb) return;
    const t = ctx.currentTime;
    let d = 0;
    for (let r = 0; r < rounds; r++) for (const f of [392, 330, 262]) { partials(BELL, f, t + d, 3.2, 0.045, amb.layers.kyrka.g); d += 0.62; }
  },
  // Someone at La Medina's tables talking: three to seven syllables of formant-ish band-passed noise.
  chatter() {
    if (!amb) return;
    const f0 = arnd() < 0.5 ? 420 + 200 * arnd() : 700 + 300 * arnd(), n = 3 + Math.floor(arnd() * 5);
    via('bar', () => { for (let k = 0, d = 0; k < n; k++, d += 0.11 + 0.1 * arnd()) audio.noise(0.07 + 0.09 * arnd(), 0.26 + 0.14 * arnd(), f0 * (0.85 + 0.3 * arnd()), 'bandpass', d, 4); });
  },
  // A table laughing (`laugh`).
  laugh() { if (amb) via('bar', () => audio.laugh(), 5); },
  // Glasses: a clink, or two for a toast.
  clink() {
    if (!amb) return;
    const t = ctx.currentTime, f = 2600 + 1500 * arnd(), n = arnd() < 0.35 ? 2 : 1;
    for (let k = 0; k < n; k++) partials(GLASS, f * (1 + 0.04 * k), t + k * 0.09, 0.3, 0.035, amb.layers.bar.g);
  },
  // The murmur rising and falling: a new level for its two bands within a quarter of a second.
  stir() {
    if (!amb) return;
    const t = ctx.currentTime;
    amb.beds.murmur.g.gain.setTargetAtTime(0.08 + 0.1 * arnd(), t, 0.15);
    amb.beds.murmur2.g.gain.setTargetAtTime(0.025 + 0.045 * arnd(), t, 0.12);
  },
};

// ---- Helan går från balkongen: the balcony party's song (free roam; feature 134, DESIGN §10.63) ---
// The soundscape channel's `fest` layer and a loop on a clock of its own, not the music scheduler's: the
// party sings TRAD.helanGar at its own 104 bpm whatever the island tune is (game/helanGar.js ducks the
// tune near it instead). A cycle is the melody's 8 bars and `rest` bars of oom-pah; `festStart()` sets the
// party's beat 0 at its start, so the song is wherever the party has got to when Stig comes into earshot
// and `festPos()` tells the game which bar sounds now. Affe's accordion has the melody and his left hand
// the oom-pah (the root on 1, the fifth on 3, the chord on 2 and 4), Gabbe plays `THSTTTOO` in eighths
// (as on the stage, §10.60), and three guests sing along a little apart from each other (a sawtooth
// through the two formants of an "a", in unison and an octave down); the end of a round is a cheer and
// glasses. Scheduled 0.6 s ahead every 200 ms while `ambFest(true)` and the music is on.
let fest = null;   // { t0, on, next, rest, log }
// One guest singing: a sawtooth with a late vibrato through an "a" vowel's two formants.
function singer(f, t, d, v, dest) {
  const o = ctx.createOscillator(), vib = ctx.createOscillator(), vg = ctx.createGain(), g = ctx.createGain();
  const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g2 = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = f;
  vib.frequency.value = 5 + arnd(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.3, d));
  vib.connect(vg).connect(o.frequency);
  f1.type = 'bandpass'; f1.frequency.value = 730; f1.Q.value = 4;
  f2.type = 'bandpass'; f2.frequency.value = 1090; f2.Q.value = 6; g2.gain.value = 0.6;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.06);
  g.gain.setValueAtTime(v, t + Math.max(0.07, d - 0.08));
  g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.06);
  o.connect(f1).connect(g); o.connect(f2).connect(g2).connect(g); g.connect(dest);
  o.start(t); o.stop(t + d + 0.1); vib.start(t); vib.stop(t + d + 0.1);
}
// Bar `n` of the party's song (counted from its beat 0) at audio time `t0`.
function festBar(n, t0, beat) {
  const m = TRAD.helanGar, dest = amb.layers.fest.g, L = fest.log, cyc = 8 + fest.rest;
  const k = n % cyc, ch = m.chords[k < 8 ? k : 7], root = ch[0];
  const at = (b) => { L.notes++; if (Math.abs(b * 4 - Math.round(b * 4)) > 1e-6) L.offGrid++; return t0 + b * beat; };
  bassNote(mtof(root), at(0), beat * 0.8, 0.3, dest);
  bassNote(mtof(root + 7), at(2), beat * 0.8, 0.26, dest);
  for (const b of [1, 3]) accChord([root + 12, ...ch.slice(1)].map(mtof), at(b), beat * 0.4, 0.024, dest);
  for (let q = 0; q < 8; q++) {
    const c = 'THSTTTOO'[q], t = at(q * 0.5);
    if (c === 'O') conga(t, false, 0.22, dest);
    else if (c === 'H') conga(t, true, 0.18, dest);
    else if (c === 'S') slapVoice(t, 0.16, dest);
    else conga(t, false, 0.05, dest);
  }
  if (k < 8) {
    for (const [b, note, d] of m.notes) {
      if (b < k * 4 || b >= k * 4 + 4 || note <= 0) continue;
      const t = at(b - k * 4), len = d * beat * 0.92;
      accordion(mtof(note), t, len, 0.06, dest);
      // The guests: two in unison a few cents apart, one an octave down, each a little late or early.
      singer(mtof(note) * 1.004, t + 0.012 * arnd(), len, 0.05, dest);
      singer(mtof(note) * 0.994, t + 0.02 * arnd(), len, 0.045, dest);
      singer(mtof(note - 12), t + 0.016 * arnd(), len, 0.055, dest);
      L.sung++;
    }
    if (k === 0) L.rounds++;
  } else if (k === 8) {
    // Skål!: the guests' shout, clapping and glasses on the pause's first beat.
    const t = at(0), d0 = Math.max(0, t - ctx.currentTime);
    via('fest', () => {
      for (let j = 0; j < 3; j++) audio.noise(0.32 + 0.08 * arnd(), 0.22, 560 + 260 * arnd(), 'bandpass', d0 + 0.03 * j, 3);
      for (let j = 0; j < 40; j++) {
        const d = Math.pow(arnd(), 0.8) * 1.4, swell = Math.min(1, d / 0.3) * (1 - 0.6 * (d / 1.4));
        audio.noise(0.035 + 0.03 * arnd(), (0.04 + 0.05 * arnd()) * swell + 0.004, 1400 + 1600 * arnd(), 'bandpass', d0 + 0.35 + d, 1.4);
      }
    }, 0.9);
    for (let j = 0; j < 4; j++) partials(GLASS, (2600 + 1500 * arnd()) * (1 + 0.03 * j), t + 0.15 + j * 0.11 + 0.05 * arnd(), 0.3, 0.03, dest);
    L.skal++;
  }
  L.bars++;
  L.bar = n;
}
function festTick() {
  if (!ctx || !amb || !fest?.on || fest.t0 == null || amb.paused || !audio.musicOn) return;
  const beat = 60 / TRAD.helanGar.bpm, bar = beat * 4, now = ctx.currentTime;
  // From the next bar to start (the bar under way is let go; a just-due one plays a few ms late).
  if (fest.next == null || fest.t0 + fest.next * bar < now - 0.02) fest.next = Math.max(0, Math.ceil((now - 0.02 - fest.t0) / bar));
  while (fest.t0 + fest.next * bar < now + 0.6) { festBar(fest.next, fest.t0 + fest.next * bar, beat); fest.next++; }
}

Object.assign(audio, {
  // The party's beat 0 now (its start; `rest` bars of oom-pah between two rounds of the melody).
  festStart(rest = 3) {
    if (!ctx || !amb) return;
    fest ??= { on: false, iv: setInterval(festTick, 200), log: { bars: 0, rounds: 0, notes: 0, offGrid: 0, sung: 0, skal: 0, bar: -1 } };
    fest.t0 = ctx.currentTime + 0.3;   // past the next tick (every 0.2 s): its first bar is scheduled
    fest.next = null;
    fest.rest = rest;
  },
  // The song scheduled (while the party is heard) or not; the `fest` layer itself is set by ambLayer.
  ambFest(on) {
    if (!fest) return;
    on = !!on;
    if (on && !fest.on) fest.next = null;   // on again: from the bar the party has got to
    fest.on = on;
  },
  // The `fest` layer's low-pass (Hz; scheduled on a change of 50 Hz).
  festLowpass(hz) {
    if (!amb) return;
    const v = Math.round(hz / 50) * 50;
    if (v === amb.festHz) return;
    amb.festHz = v;
    amb.festLp.frequency.setTargetAtTime(v, ctx.currentTime, 0.3);
  },
  // Where the party's song is by the audio clock (also with the music off, while the context runs):
  // { bars (since beat 0), cycle, k (its bar in the cycle: 0–7 the melody), beat (s) }, else null.
  festPos() {
    if (!ctx || ctx.state !== 'running' || fest?.t0 == null) return null;
    const beat = 60 / TRAD.helanGar.bpm, bars = (ctx.currentTime - fest.t0) / (beat * 4);
    if (bars < 0) return null;
    const cyc = 8 + fest.rest, n = Math.floor(bars);
    return { bars, cycle: Math.floor(n / cyc), k: n % cyc, beat };
  },
  // Test hook (tools/scenarios/helan.mjs): the loop's state and log.
  festState() { return fest && { on: fest.on, t0: fest.t0, rest: fest.rest, hz: amb.festHz ?? 6500, log: { ...fest.log } }; },
});

// ---- public-domain traditional melodies (§1.5, §12.1) ----------------------------------------
// notes: [beat, midi, beats] (midi -1 = rest); chords: [bass, ...chord] per `beatsPerChord` beats.
const D4 = 62, Fs = 66, G = 67, A = 69, B = 71, C5 = 72, D5 = 74, E5 = 76, F5 = 77;
const TRAD = {
  // Små grodorna (julafton pool dance), in C, 2/4 at a lively 132.
  smaGrodorna: {
    bpm: 132, beatsPerChord: 2,
    chords: [[48, 64, 67], [48, 64, 67], [43, 62, 65], [48, 64, 67], [48, 64, 67], [48, 64, 67], [43, 62, 65], [48, 64, 67],
      [48, 64, 67], [43, 62, 65], [48, 64, 67], [43, 62, 65], [48, 64, 67], [43, 62, 65], [43, 62, 65], [48, 64, 67]],
    notes: [
      // Små grodorna, små grodorna är lustiga att se
      [0, G, 0.5], [0.5, C5, 0.5], [1, C5, 0.5], [1.5, C5, 0.5], [2, G, 0.5], [2.5, C5, 0.5], [3, C5, 0.5], [3.5, C5, 0.5],
      [4, D5, 0.5], [4.5, D5, 0.5], [5, E5, 0.5], [5.5, D5, 0.5], [6, C5, 1.5],
      // Ej öron, ej öron, ej svansar hava de
      [8, G, 0.5], [8.5, C5, 0.5], [9, C5, 0.5], [9.5, C5, 0.5], [10, G, 0.5], [10.5, C5, 0.5], [11, C5, 0.5], [11.5, C5, 0.5],
      [12, D5, 0.5], [12.5, D5, 0.5], [13, B, 0.5], [13.5, D5, 0.5], [14, C5, 1.5],
      // Kou ack ack ack, kou ack ack ack, kou ack ack ack ack kaa
      [16, E5, 0.5], [16.5, E5, 0.25], [16.75, E5, 0.25], [17, E5, 0.5],
      [18, D5, 0.5], [18.5, D5, 0.25], [18.75, D5, 0.25], [19, D5, 0.5],
      [20, E5, 0.5], [20.5, E5, 0.25], [20.75, E5, 0.25], [21, D5, 0.5], [21.5, B, 0.5],
      [22, C5, 0.5], [23, C5, 1],
      // …and once more to the end
      [24, E5, 0.5], [24.5, E5, 0.25], [24.75, E5, 0.25], [25, E5, 0.5],
      [26, D5, 0.5], [26.5, D5, 0.25], [26.75, D5, 0.25], [27, D5, 0.5],
      [28, F5, 0.5], [28.5, E5, 0.5], [29, D5, 0.5], [29.5, B, 0.5], [30, C5, 2],
    ],
  },
  // Hej tomtegubbar (julafton toast), in G, 2/4 at 120.
  hejTomtegubbar: {
    bpm: 120, beatsPerChord: 2,
    chords: [[43, 59, 62], [43, 59, 62], [38, 60, 66], [43, 59, 62], [43, 59, 62], [38, 60, 66], [38, 60, 66], [43, 59, 62],
      [38, 60, 66], [43, 59, 62], [38, 60, 66], [43, 59, 62], [43, 59, 62], [38, 60, 66], [38, 60, 66], [43, 59, 62]],
    notes: [
      // Hej tomtegubbar slå i glasen
      [0, D4, 0.5], [0.5, G, 0.5], [1, G, 0.5], [1.5, G, 0.5], [2, B, 0.5], [2.5, A, 0.5], [3, A, 0.5], [3.5, A, 0.5], [4, C5, 0.5],
      // och låt oss lustiga vara
      [4.5, B, 0.5], [5, B, 0.5], [5.5, A, 0.5], [6, A, 0.5], [6.5, G, 0.5], [7, Fs, 0.5], [7.5, G, 1],
      // En liten tid vi leva här
      [9, D5, 0.5], [9.5, D5, 0.5], [10, D5, 0.5], [10.5, E5, 0.5], [11, D5, 0.5], [11.5, C5, 0.5], [12, B, 1],
      // med mycken möda och stort besvär
      [13, C5, 0.5], [13.5, C5, 0.5], [14, C5, 0.5], [14.5, D5, 0.5], [15, C5, 0.5], [15.5, B, 0.5], [16, A, 1],
      // Hej tomtegubbar slå i glasen och låt oss lustiga vara!
      [17, D4, 0.5], [17.5, G, 0.5], [18, G, 0.5], [18.5, G, 0.5], [19, B, 0.5], [19.5, A, 0.5], [20, A, 0.5], [20.5, A, 0.5], [21, C5, 0.5],
      [21.5, B, 0.5], [22, B, 0.5], [22.5, A, 0.5], [23, A, 0.5], [23.5, G, 0.5], [24, Fs, 0.5], [24.5, G, 1.5],
    ],
  },
  // Helan går (faint, end of the buss17 outro), in G, 4/4 at 104.
  helanGar: {
    bpm: 104, beatsPerChord: 4,
    chords: [[43, 59, 62], [38, 60, 66], [43, 59, 62], [38, 60, 66], [43, 59, 62], [36, 60, 64], [38, 60, 66], [43, 59, 62]],
    notes: [
      // Helan går, sjung hopp faderallan lallan lej
      [0, D5, 1], [1, D5, 1], [2, B, 2],
      [4, C5, 0.5], [4.5, C5, 0.5], [5, B, 0.5], [5.5, A, 0.5], [6, G, 0.5], [6.5, A, 0.5], [7, B, 1],
      // Helan går, sjung hopp faderallan lej
      [8, D5, 1], [9, D5, 1], [10, B, 2],
      [12, C5, 0.5], [12.5, C5, 0.5], [13, A, 0.5], [13.5, Fs, 0.5], [14, G, 2],
      // Och den som inte helan tar, han inte heller halvan får
      [16, G, 0.5], [16.5, G, 0.5], [17, A, 0.5], [17.5, B, 0.5], [18, C5, 0.5], [18.5, D5, 0.5], [19, E5, 1],
      [20, E5, 0.5], [20.5, D5, 0.5], [21, C5, 0.5], [21.5, B, 0.5], [22, A, 0.5], [22.5, B, 0.5], [23, A, 1],
      // Helan går, sjung hopp faderallan lej
      [24, D5, 1], [25, D5, 1], [26, B, 2],
      [28, C5, 0.5], [28.5, C5, 0.5], [29, A, 0.5], [29.5, Fs, 0.5], [30, G, 2],
    ],
  },
};
export const TRAD_NAMES = Object.keys(TRAD);
// A melody's tempo and length in beats (its last note's end): the pool fest's beat clock (§10.13).
export function tradInfo(name) {
  const m = TRAD[name];
  return m && { bpm: m.bpm, beats: Math.max(...m.notes.map(([b, , d]) => b + d)) };
}
