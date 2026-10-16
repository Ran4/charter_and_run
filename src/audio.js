// Everything you hear is synthesised: an engine drone, tyre squeal, cartoon blips, the cabin drone
// and the music. No samples to load. (DESIGN §12; owner WP-H.)
//   Music: a TUNES table of { bpm, beats, bar(api, t, n, beat) }; setTune(name) switches at the next
//   bar. Tunes (§12.1, all original): muzak (flight), sol (island), skandal (pursuit), vals
//   (grisfest night), jul (julafton), samba (Ole's boombox, Tonga Tonga, Rio, unlock).
//   Public-domain traditional one-shots (audio.trad): smaGrodorna, hejTomtegubbar, helanGar. They
//   are written down from memory (traditional tunes, so any faithful variant is free to use).
//   Graph:  music voices -> musicBus (duckMusic) -> tradDuck (ducked under a trad cue)
//             -> musicFilter (FLYGRÄDSLA low-pass) -> master
//           trad voices -> tradBus -> master;  sfx -> sfx -> master;  cabin drone -> sfx
//   Cabin drone: its own channel (drone(level, bright)), never touched by the car-engine code.

let ctx, master, sfx, musicBus, tradDuck, musicFilter, tradBus, noiseBuf;
let eng, skid, hornNodes, music, drone, siren;
let tuneName = 'muzak', pendingTune = null;
let duckNow = 1, lowpassNow = null;

const MUSIC_GAIN = 0.3;
export const TUNES = {};
export function registerTune(name, def) { TUNES[name] = def; }

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
    musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 20000; musicFilter.Q.value = 0.9; musicFilter.connect(master);
    tradDuck = ctx.createGain(); tradDuck.gain.value = 1; tradDuck.connect(musicFilter);
    musicBus = ctx.createGain(); musicBus.gain.value = this.musicOn ? MUSIC_GAIN * duckNow : 0; musicBus.connect(tradDuck);
    tradBus = ctx.createGain(); tradBus.gain.value = 0.55; tradBus.connect(master);
    noiseBuf = makeNoise();

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
  // Silence the looping channels (pause).
  pauseLoops() { if (!ctx) return; drone.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); if (siren) siren.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); },
  resumeLoops() { if (!ctx) return; if (this._drone) this.drone(...this._drone); if (siren) siren.g.gain.setTargetAtTime(siren.level, ctx.currentTime, 0.05); },

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
  // PA "ding-dong" before an announcement.
  dingdong() { this.tone(659, 0.45, 'sine', 0.11); this.tone(1318, 0.2, 'sine', 0.012); this.tone(523, 0.45, 'sine', 0.11, null, 0.45); this.tone(1046, 0.2, 'sine', 0.012, null, 0.45); },
  // The metal-detector arch.
  beep() { for (let k = 0; k < 3; k++) this.tone(880, 0.14, 'square', 0.07, null, k * 0.2); },
  // Ole's calculator alarm (the nap in room 107, §10.10): a digital watch's PIP-PIP-PIP, twice.
  pip() { for (let k = 0; k < 6; k++) this.tone(2794, 0.06, 'square', 0.045, null, (k % 3) * 0.12 + (k >= 3 ? 0.55 : 0)); },
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
  // A sheep: 420 -> 300 Hz with a bleating vibrato through a nasal band-pass.
  baa() {
    if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), v = ctx.createOscillator(), vg = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.6);
    v.frequency.value = 9; vg.gain.value = 18; v.connect(vg).connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2.5;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    o.connect(f).connect(g).connect(sfx);
    o.start(t); v.start(t); o.stop(t + 0.7); v.stop(t + 0.7);
  },
  // The grisbil's horn (P2): two nasal grunts.
  oink() {
    for (const d of [0, 0.22]) { this.tone(190, 0.16, 'sawtooth', 0.07, 120, d); this.noise(0.12, 0.06, 600, 'bandpass', d, 3); }
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
      const tune = TUNES[tuneName] || TUNES.placeholder;
      const beat = 60 / tune.bpm;
      tune.bar(API, next, bar, beat);
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
function conga(t, hi, v = 0.22) {
  const o = ctx.createOscillator(), g = envGain(t, 0.004, v, 0.18, musicBus);
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
