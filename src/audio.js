// Everything you hear is synthesised: an engine drone, tyre squeal, cartoon blips, and a little
// walking-bass loop. No samples to load.

let ctx, master, sfx, musicBus, noiseBuf;
let eng, skid, hornNodes, music;

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
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    noiseBuf = makeNoise();

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
      record: [[440, 0], [554, 0.08], [659, 0.16], [880, 0.26]],
    }[kind];
    if (!seq) return;
    seq.forEach(([f, d]) => this.tone(f, kind === 'fail' ? 0.3 : 0.18, kind === 'fail' ? 'sawtooth' : 'square', 0.08, null, d));
  },
  shameBell() {
    if (!ctx) return;
    [0, 0.9].forEach((d) => {
      this.tone(98, 1.4, 'sine', 0.35, null, d);
      this.tone(196, 1.0, 'triangle', 0.12, null, d);
      this.tone(293, 0.8, 'sine', 0.06, null, d);
    });
  },
};

// A swung walking-bass loop with brushes and a vamping keys stab: the Duke would approve.
function startMusic() {
  if (music) return;
  const bpm = 132, beat = 60 / bpm;
  const prog = [
    [48, 52, 55, 57], [53, 57, 60, 62], [48, 52, 55, 58], [55, 59, 62, 53],
  ];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  let bar = 0, next = ctx.currentTime + 0.2;
  music = setInterval(() => {
    if (!ctx || !audio.musicOn) return;
    while (next < ctx.currentTime + 0.6) {
      const chord = prog[bar % prog.length];
      for (let b = 0; b < 4; b++) {
        const t = next + b * beat;
        const n = chord[b] - 12;
        bassNote(mtof(n), t, beat * 0.9);
        brush(t + beat * 0.66, 0.04);
        if (b % 2 === 1) brush(t, 0.07);
      }
      if (bar % 2 === 0) chord.slice(1).forEach((n) => keyStab(mtof(n + 12), next + beat * 1.66, 0.15));
      next += beat * 4;
      bar++;
    }
  }, 200);
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
