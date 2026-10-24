// The voices (DESIGN §12.4): pre-recorded clips from assets/voice/ (made by tools/voice/voice.mjs;
// index.json is keyed by who and the exact text, the subtitle), and the turns they take. Copied from
// the Saab game's voice.js and adapted. Nobody talks over anybody:
//   - two slots: 'main' (the dialogue box, the radio, the PA) and 'bubble' (speech bubbles), one
//     voice in each, never two at once;
//   - a dialogue line breaks in on everything (it stops a bubble); radio lines queue behind whoever
//     is talking for `wait` s (6) and are dropped after that (`must`: a stage's radio, never);
//   - a bubble's voice plays only when it is quiet, else it waits up to 2.5 s and is dropped (the
//     bubble itself shows anyway); a bubble never talks over a main line;
//   - the same speaker waits for himself: his next line waits until the last one is said.
// A line without a clip (none made yet: the free-roam features, the chatter and the barks until
// version 2; a role with no voice; a file that won't load) gets no voice: play() returns null and
// the caller does what it always did (the dialogue box and the radio beep, a bubble is silent), and
// it takes no turn. With the voices off (the setting, or ?test without &voice) play() returns null
// for every line.
//
//   voice.play(who, text, { slot, mode, at, ch, wait, must, now, delay, start, drop, tag })  -> handle | null
//       now: a line of the dialogue box (hud.runDialog): it breaks in, it never waits; delay: s before
//       it may start (a PA line after the chime); ch: the Character whose mouth moves with it
//       handle: { who, text, clip, dur, state ('queued' | 'playing' | 'done' | 'dropped'), ended
//       (Promise), t0 (when it started, voice.now()), mouth() (0..1 or null), stop(fade), left()
//       (s still to say), speaking() (queued or playing) }
//       mode: 'dialog' (dry, centred), 'radio' (a walkie-talkie: 300-3400 Hz, a little grit),
//       'pa' (a loudspeaker: band-passed, a little room), 'car' (a passenger beside Stig), 'world'
//       (from `at`, a character or an anchor, panned and fading with distance; muffled while Stig
//       sits in a car), 'film' (Herr Storch's film night: low-passed, the projector). start(handle):
//       when it is actually said (a radio toast goes up then); drop(): when the queue gave up on it.
//   voice.secs(who, text, fallback)   how long the line takes: its clip, else `fallback`
//   voice.quiet()                     nobody is talking and nothing waits
//   voice.waitQuiet(min, max)         Promise: quiet, waiting at least min and at most max s
//   voice.prefetch(lines)             [[who, text], ...]: fetch and decode now
//   voice.voiceFor(target)            the role key a target speaks with: a key, an anchor's `who`,
//                                     a character's key or def (the Guardia Civil's two voices take
//                                     turns among the officers), a car's driver; else null
//   voice.stop(slot), voice.hush()    stop a slot / everything and drop what waits
//   voice.update(game)                main.js, every frame: the queue, positions, mouths
import { audio } from './audio.js';
import { CHARS } from './actors/models.js';
import { camera } from './gfx.js';

const BASE = 'assets/voice/';
const KEEP = 24;                      // decoded clips kept in memory
const WAIT = { main: 6, bubble: 2.5 };
const LIP = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
const SETTINGS_KEY = 'charter-and-run-voice';
const P = new URLSearchParams(location.search);

const lipVal = (s, i) => { const k = LIP.indexOf(s[i]); return k < 0 ? 0 : k / 63; };
const defKey = new Map(Object.entries(CHARS).map(([k, d]) => [d, k]));

class Utterance {
  constructor(who, text, clip, o) {
    Object.assign(this, { who, text, clip, slot: o.slot || 'bubble', mode: o.mode || 'dialog', at: o.at || null, ch: o.ch || null, must: !!o.must, onStart: o.start, onDrop: o.drop });
    this.dur = clip.d;
    this.state = 'queued';
    this.t0 = null;
    this.queuedAt = voice.now();
    this.notBefore = this.queuedAt + (o.delay || 0);   // (a PA line waits for the chime)
    this.deadline = this.must ? Infinity : this.notBefore + (o.wait ?? WAIT[this.slot]);
    this.ended = new Promise((ok) => { this._end = ok; });
    this.mouthV = null;
  }
  left() {
    if (this.state === 'queued') return this.dur;
    if (this.state !== 'playing') return 0;
    // (held by the pause menu where it was)
    return Math.max(0, this.dur - (voice._paused && this.pausedAt != null ? this.pausedAt : voice.now() - this.t0));
  }
  speaking() { return this.state === 'queued' || this.state === 'playing'; }
  mouth() { return this.state === 'playing' ? this.mouthV : null; }
  stop(fade = 0.08) { voice._finish(this, fade); }
}

export const voice = {
  enabled: false,          // the setting (and not ?test without &voice)
  setting: true,           // the player's choice (the pause menu's RÖSTER)
  manifest: null,
  playing: { main: null, bubble: null },
  queue: [],
  log: [],                 // every voiced line asked for: { who, text, slot, mode, asked, t0, t1, dur, cut, dropped } (tests)
  said: [],                // every line said with the voices on, voiced or not: { who, text, at, ctx } (vstory: lines outside the script)
  failed: new Set(),       // clips that would not load: no voice for the rest of the session
  inCar: () => false,      // main.js: Stig sits in a car
  held: () => false,       // main.js: the dialogue box is up (nothing queued starts between two of its lines)
  ctx: () => null,         // main.js: the mission runner's state, kept with each line in `said` (tests)
  _bufs: new Map(),
  _turn: new Map(),
  _officer: new WeakMap(),
  _officers: 0,
  _mouths: new Set(),
  _paused: false,

  init() {
    const test = P.has('test');
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); } catch (e) { s = null; }
    this.setting = s?.on !== false;
    this.enabled = test ? P.has('voice') : this.setting;
    const url = P.get('voicemanifest') || BASE + 'index.json';
    // (a test without &voice never asks for the manifest: nothing on the wire, no 404 to count)
    this.ready = (test && !this.enabled ? Promise.resolve({}) : fetch(url).then((r) => (r.ok ? r.json() : {}))).catch(() => ({})).then((m) => {
      this.manifest = m || {};
      this.fps = m?._fps || 30;
    });
    return this.ready;
  },
  // The pause menu's RÖSTER: off means the beeps of before.
  setSetting(on) {
    this.setting = !!on;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ on: this.setting })); } catch (e) { /* private mode */ }
    if (!P.has('test')) this.setEnabled(this.setting);
  },
  setEnabled(on) { this.enabled = !!on; if (!on) this.hush(); },
  now() { return audio.ctx ? audio.ctx.currentTime : performance.now() / 1000; },
  // The clip for a line, or null. A line with several takes (lines.json `takes`: the mantra) says
  // them in turn.
  clipOf(who, text, peek = false) {
    const v = who && this.manifest?.[who]?.[text];
    if (!v) return null;
    let c = v;
    if (Array.isArray(v)) {
      const k = who + '\0' + text, i = this._turn.get(k) || 0;
      if (!peek) this._turn.set(k, i + 1);
      c = v[i % v.length];
    }
    return c && !this.failed.has(c.f) ? c : null;
  },
  has(who, text) { return this.enabled && !!audio.ctx && !!this.clipOf(who, text, true); },
  secs(who, text, fallback) {
    const c = this.enabled ? this.clipOf(who, text, true) : null;
    return c ? c.d : fallback;
  },
  voiceFor(t) {
    if (!t) return null;
    if (typeof t === 'string') return t;
    if (t.who) return t.who;                                // an anchor with a speaker
    const def = t.def || (t.key && CHARS[t.key]);
    if (t.key && CHARS[t.key] && t.key !== 'guardia') return t.key;
    if (def === CHARS.guardia || t.key === 'guardia') {
      // (two officers' voices, taking turns among the officers as they come)
      if (!this._officer.has(t)) this._officer.set(t, this._officers++ % 2 ? 'guardia2' : 'guardia');
      return this._officer.get(t);
    }
    if (def && defKey.has(def)) return defKey.get(def);
    if (t.driver) return this.voiceFor(t.driver);           // a car speaks with its driver's voice
    return null;                                            // a passer-by: the pool is version 2
  },
  quiet() { return !this.playing.main && !this.playing.bubble && !this.queue.length; },
  // Quiet, waiting at least min s (a beat after the last line) and at most max s.
  waitQuiet(min = 0, max = 8) {
    const t0 = performance.now();
    return new Promise((ok) => {
      const tick = () => {
        const s = (performance.now() - t0) / 1000;
        if ((s >= min && (this.quiet() || !this.enabled)) || s >= max) ok(); else setTimeout(tick, 50);
      };
      tick();
    });
  },
  talking(who) {
    for (const u of [this.playing.main, this.playing.bubble]) if (u && u.who === who) return u;
    return null;
  },

  play(who, text, o = {}) {
    if (!text) return null;
    if (this.enabled) this.note(who, text);
    if (!this.enabled || !audio.ctx || !who) return null;
    const clip = this.clipOf(who, text);
    if (!clip) return null;
    const u = new Utterance(who, text, clip, o);
    const rec = { who, text, slot: u.slot, mode: u.mode, tag: o.tag || null, asked: u.queuedAt, t0: null, t1: null, dur: u.dur, cut: 0, dropped: false };
    u.rec = rec;
    this.log.push(rec);
    if (this.log.length > 2000) this.log.shift();
    this._load(clip);
    if (o.now) {
      // A dialogue line breaks in: the bubble stops, and whatever was in the main slot.
      this.interrupt();
      this._start(u);
      return u;
    }
    this.queue.push(u);
    // Main lines before bubbles; otherwise first come, first served.
    this.queue.sort((a, b) => (a.slot === b.slot ? a.queuedAt - b.queuedAt : a.slot === 'main' ? -1 : 1));
    this._pump();
    return u;
  },
  // Every line said while the voices are on, with a clip or not (vstory checks them against the script).
  note(who, text) {
    this.said.push({ who, text, at: performance.now(), ctx: this.ctx() });
    if (this.said.length > 4000) this.said.shift();
  },
  // A dialogue line starts (with a clip or not): nobody else goes on talking under it, and the
  // bubbles that wait are dropped.
  interrupt() {
    this._finish(this.playing.bubble, 0.08);
    this._finish(this.playing.main, 0.08);
    this.queue = this.queue.filter((q) => q.slot !== 'bubble' || (this._drop(q), false));
  },
  prefetch(lines) {
    if (!this.enabled || !audio.ctx) return;
    for (const [who, text] of lines) { const c = this.clipOf(who, text, true); if (c) this._load(c); }
  },
  stop(slot) {
    this._finish(this.playing[slot], 0.08);
    this.queue = this.queue.filter((q) => q.slot !== slot || (this._drop(q), false));
  },
  // Drop queued lines that match.
  unqueue(fn) { this.queue = this.queue.filter((q) => !fn(q) || (this._drop(q), false)); },
  hush() { for (const s of ['main', 'bubble']) this.stop(s); },
  // The pause menu: what is being said stops where it is and goes on afterwards.
  pause(on) {
    if (this._paused === !!on) return;
    this._paused = !!on;
    const t = this.now();
    for (const u of [this.playing.main, this.playing.bubble]) {
      if (!u) continue;
      if (on) { u.pausedAt = t - u.t0; this._stopSource(u, 0.03); }
      else { u.t0 = t - u.pausedAt; if (u.buf) this._source(u, u.pausedAt); }
    }
    for (const q of this.queue) if (on) q.pauseT = t; else if (q.pauseT != null) { q.deadline += t - q.pauseT; q.pauseT = null; }
  },

  // ---------------------------------------------------------------------------------------------
  _load(c) {
    const url = BASE + c.f;
    let p = this._bufs.get(url);
    if (!p) {
      p = fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then((b) => audio.ctx.decodeAudioData(b));
      p.catch(() => { this.failed.add(c.f); this._bufs.delete(url); });
      p.buf = null;
      p.then((b) => { p.buf = b; }, () => {});
    }
    this._bufs.delete(url); this._bufs.set(url, p);
    if (this._bufs.size > KEEP) this._bufs.delete(this._bufs.keys().next().value);
    return p;
  },
  _pump() {
    if (this._paused) return;
    const t = this.now(), held = this.held();
    for (let k = 0; k < this.queue.length; k++) {
      const u = this.queue[k];
      if (t > u.deadline) { this.queue.splice(k--, 1); this._drop(u); continue; }
      if (held || t < u.notBefore) continue;   // (what waits still runs out of time while the dialogue box is up)
      const busyMain = !!this.playing.main, busyBubble = !!this.playing.bubble;
      const self = [this.playing.main, this.playing.bubble].some((p) => p && p.who === u.who);
      // Main lines wait for both slots (a radio line waits for a bubble); bubbles wait for quiet and
      // for any main line still waiting ahead of them.
      const ahead = this.queue.slice(0, k).some((q) => q.slot === 'main');
      if (self || busyMain || busyBubble || (u.slot === 'bubble' && ahead)) continue;
      this.queue.splice(k--, 1);
      this._start(u);
    }
  },
  _start(u) {
    const t = this.now();
    // (heard from inside Stig's car: the world outside is muffled)
    u.muffle = u.mode === 'world' && this.inCar();
    u.state = 'playing';
    u.t0 = t;
    u.rec.t0 = t;
    this.playing[u.slot] = u;
    const p = this._load(u.clip);
    // (not decoded yet: it starts as soon as it is, from the top; the turn is counted from then)
    if (p.buf) { u.buf = p.buf; this._source(u, 0); }
    else p.then((b) => { if (u.state === 'playing' && !u.src && !this._paused) { u.buf = b; u.t0 = this.now(); u.rec.t0 = u.t0; this._source(u, 0); } }, () => this._finish(u, 0));
    u.onStart?.(u);
    audio.voiceDuck?.(true);
  },
  _place(u) {
    if (!u.chain?.panner || !u.at) return;
    const a = u.at;
    u.chain.setPos(a.x, (a.y || 0) + (a.root ? 1.6 : (a.height || 1.6)), a.z);
  },
  _source(u, offset) {
    const c = audio.ctx;
    const src = c.createBufferSource();
    src.buffer = u.buf;
    const chain = audio.voiceChain(u.mode, { muffle: u.muffle });
    src.connect(chain.input);
    src.start(c.currentTime, Math.min(offset, u.buf.duration - 0.01));
    u.src = src; u.chain = chain;
    this._place(u);
    src.onended = () => { if (u.src === src && !this._paused) this._finish(u, 0); };
  },
  _stopSource(u, fade) {
    if (!u.src) return;
    const c = audio.ctx, src = u.src, chain = u.chain;
    u.src = null;
    try {
      chain.out.gain.setTargetAtTime(0, c.currentTime, Math.max(0.005, fade / 3));
      src.stop(c.currentTime + fade + 0.02);
    } catch (e) { /* already stopped */ }
    setTimeout(() => chain.dispose(), (fade + 0.2) * 1000);
  },
  _finish(u, fade) {
    if (!u || u.state === 'done' || u.state === 'dropped') return;
    const t = this.now();
    if (u.state === 'queued') { const k = this.queue.indexOf(u); if (k >= 0) this.queue.splice(k, 1); }
    if (u.state === 'playing') {
      u.rec.t1 = t;
      u.rec.cut = Math.max(0, u.t0 + u.dur - t);
      this._stopSource(u, fade);
      if (this.playing[u.slot] === u) this.playing[u.slot] = null;
    }
    u.state = 'done';
    u._end();
    if (!this.playing.main && !this.playing.bubble) audio.voiceDuck?.(false);
    this._pump();
  },
  _drop(u) {
    if (u.state !== 'queued') return;
    u.state = 'dropped';
    u.rec.dropped = true;
    u.onDrop?.(u);
    u._end();
  },

  // Every frame: start what may start, end what has been said, move the voices with their
  // speakers, and give each speaker's mouth the loudness of what they are saying (anim.mouth,
  // models.js; null when they are not).
  update() {
    const now = new Set();
    if (this.enabled && audio.ctx) {
      const t = this.now();
      if (camera) {
        const e = camera.matrixWorld.elements;
        audio.setListener?.(e[12], e[13], e[14], -e[8], -e[9], -e[10], e[4], e[5], e[6]);
      }
      for (const slot of ['main', 'bubble']) {
        const u = this.playing[slot];
        if (!u || this._paused) continue;
        const s = t - u.t0;
        if (u.src) this._place(u);
        const i = Math.floor(s * this.fps);
        u.mouthV = u.src && u.clip.lip && i >= 0 && i < u.clip.lip.length ? lipVal(u.clip.lip, i) : 0;
        if (!u.src && s > u.dur + 0.3) this._finish(u, 0);   // (a clip that never decoded)
        if (u.ch?.anim && u.state === 'playing') { u.ch.anim.mouth = u.mouthV; now.add(u.ch); }
      }
      this._pump();
    }
    for (const ch of this._mouths) if (!now.has(ch)) ch.anim.mouth = null;
    this._mouths = now;
  },
};
