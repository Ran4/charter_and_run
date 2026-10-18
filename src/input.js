// Keyboard, mouse (pointer lock) and gamepad, folded into a handful of game actions.

const down = new Set();
const pressed = new Set();
let mdx = 0, mdy = 0;
let padPrev = [], padNow = [], padAxes = [0, 0, 0, 0];

const KEYS = {
  jump: ['Space'],
  attack: ['KeyJ', 'Mouse0', 'KeyK'],
  interact: ['KeyE', 'KeyF', 'Enter'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  handbrake: ['Space'],
  horn: ['KeyH'],
  pause: ['Escape', 'KeyP'],
  map: ['KeyM', 'Tab'],
  camReset: ['KeyC'],
  lookBack: ['KeyB'],
  skip: ['Space', 'KeyE', 'Enter', 'Mouse0'],
  mute: ['KeyN'],
  reset: ['KeyR'],
  // A choice menu (Hytt två!'s cars, §10.43): W/S or the arrows choose, Q hangs up.
  menuUp: ['KeyW', 'ArrowUp'],
  menuDown: ['KeyS', 'ArrowDown'],
  hangUp: ['KeyQ', 'Backspace'],
  // The packing shed's belt (Stig på löpande band, §10.49): a tomato into ROJOS, the bucket, VERDES.
  sortRed: ['KeyA', 'ArrowLeft'],
  sortRotten: ['KeyS', 'ArrowDown'],
  sortGreen: ['KeyD', 'ArrowRight'],
  snap: ['Space', 'Mouse0'],
  turnCam: ['Mouse2', 'KeyV'],
};
// Standard gamepad layout (Start = button 9 = pause; the d-pad's up, down, left and right = 12–15).
const PAD = { jump: [0], handbrake: [0], sprint: [1], attack: [2], interact: [3], horn: [10], pause: [9], map: [8], skip: [0, 3], lookBack: [11], menuUp: [12], menuDown: [13], hangUp: [1], sortRed: [14], sortRotten: [13], sortGreen: [15], snap: [0], turnCam: [4] };

export const input = {
  locked: false,
  canvas: null,
  onUnlock: null,

  init(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) pressed.add(e.code);
      down.add(e.code);
    });
    window.addEventListener('keyup', (e) => down.delete(e.code));
    window.addEventListener('blur', () => down.clear());
    window.addEventListener('mousemove', (e) => {
      if (this.locked) { mdx += e.movementX; mdy += e.movementY; }
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.locked && this.wantLock) { this.lock(); return; }
      pressed.add('Mouse' + e.button);
      down.add('Mouse' + e.button);
    });
    window.addEventListener('mouseup', (e) => down.delete('Mouse' + e.button));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === canvas;
      if (was && !this.locked && this.onUnlock) this.onUnlock();
    });
  },

  wantLock: false,
  lock() {
    if (this.canvas.requestPointerLock) {
      try {
        const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
        if (p && p.catch) p.catch(() => this.canvas.requestPointerLock());
      } catch (e) { /* ignored: some browsers refuse outside a gesture */ }
    }
  },
  unlock() { if (document.exitPointerLock) document.exitPointerLock(); },

  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && [...pads].find((p) => p && p.connected);
    padPrev = padNow;
    if (gp) {
      padNow = gp.buttons.map((b) => b.value);
      padAxes = gp.axes.slice(0, 4).map((a) => (Math.abs(a) < 0.15 ? 0 : a));
    } else {
      padNow = [];
      padAxes = [0, 0, 0, 0];
    }
  },

  key: (code) => down.has(code),
  keyPressed: (code) => pressed.has(code),
  down(action) {
    if (KEYS[action]?.some((k) => down.has(k))) return true;
    return !!PAD[action]?.some((b) => padNow[b] > 0.5);
  },
  pressed(action) {
    if (KEYS[action]?.some((k) => pressed.has(k))) return true;
    return !!PAD[action]?.some((b) => padNow[b] > 0.5 && !(padPrev[b] > 0.5));
  },
  // Gamepad only (keyboard Esc/P cannot re-take pointer lock, so only pad Start resumes a pause).
  padPressed(action) { return !!PAD[action]?.some((b) => padNow[b] > 0.5 && !(padPrev[b] > 0.5)); },
  // Movement axes: x = right, y = forward.
  moveX() { return clamp1((down.has('KeyD') || down.has('ArrowRight') ? 1 : 0) - (down.has('KeyA') || down.has('ArrowLeft') ? 1 : 0) + padAxes[0]); },
  moveY() { return clamp1((down.has('KeyW') || down.has('ArrowUp') ? 1 : 0) - (down.has('KeyS') || down.has('ArrowDown') ? 1 : 0) - padAxes[1]); },
  throttle() { return Math.max(down.has('KeyW') || down.has('ArrowUp') ? 1 : 0, padNow[7] || 0, padAxes[1] < -0.5 && !padNow.length ? 1 : 0); },
  brake() { return Math.max(down.has('KeyS') || down.has('ArrowDown') ? 1 : 0, padNow[6] || 0); },
  steer() { return this.moveX(); },
  look() {
    const r = { x: mdx + padAxes[2] * 14, y: mdy + padAxes[3] * 10 };
    return r;
  },
  endFrame() { pressed.clear(); mdx = 0; mdy = 0; },
  // Test hooks: lets the headless driver hold keys without synthesising DOM events.
  _press(code) { pressed.add(code); down.add(code); },
  _release(code) { down.delete(code); },
};

function clamp1(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }
