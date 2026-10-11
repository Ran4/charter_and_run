// Level 1 "Flygresan" missions, indices 0-4 (DESIGN §8.1-8.5). Owner: WP-F.
// Data only: every stage is a frozen kind from kinds/index.js. Source tags per §1.4 on every
// scripted line: [F] film line, [F*] adapted / relocated / rendered in Norwegian by us, [N] new,
// (t) = the speaker is our interpretation. Ole speaks Norwegian bokmål in every line.
//
// Timers (§8 "Timers and difficulty"; Phase 2 balance pass, scenario `calibflight`, timeScale 1,
// the real collision geometry): T_ref = the clean autopilot time on the sensible route (sprinting
// where sprint fear is small next to the stage's own) + 0.5 s per target (reaction and aim), the
// 75th percentile for the random bottle sweep; timer = ceil(1.25 × T_ref). Gate dash 3.6 s -> 6,
// seat 3.1 s from the intro's spot at the door past three stowers -> 7, bottles p75 7.60 s of 101
// sweeps through the 3-6 s turbulence + 2.5 -> 13 (Phase 3 r2; the pool `sweeper-r2fm/b69c64e`
// in notes/calibration-samples.md, `node tools/pool.mjs`), round-up 7.6 s -> 12, back to 14B from
// the far end 3.2 s -> 5.
//
// FLYGRÄDSLA balance (§5.9; binding: a careful player never panics, a careless one does in
// missions 1, 2 and 5), measured by `calibflight` (careful vs careless autopilots):
//   gate     the toilet dash starts at ~70 (the statistics; at any reading pace since Phase 3 r3,
//            when the idle decay stopped running in scenes); fearRate 5 (Phase 1: 3), so a sprint
//            (3.6 s) arrives at ~96 and a walk (5.1 s) at ~99.4, while a dawdler panics at ~5.2 s,
//            just inside the 6 s timer.
//   ombord   DUNS fear 20 (§8.2: 15) and "Annars…?!" 8 (5): a never-J player panics in the takeoff
//            even after a perfect seat run (measured: PANIK at t 21.5); holding J at 70 peaks ~75.
//   sprit    standing with the sign lit and three held jolts: a careful sweeper peaks 12-17.
//   landning approach turbulence [0.75, 14] (§8.5: [0.7, 10]): no J while it shakes -> PANIK even
//            after a perfect round-up; holding J peaks ~18-20.
// Retries stay short (§8 "Timers and difficulty"): checkpoints on the gate statistics, the takeoff
// and the seat stage before the approach.

import { goto, scene, interact, mantra, sit, timeline, carry, collect } from './kinds/index.js';
import { rowZ } from '../../world/cabin.js';
import { segmentBlocked } from '../../world/collision.js';
import { dist, clamp } from '../../util.js';

const PI = Math.PI;

// Cutaway onto Berra and Robban in 22C/D: the camera stands in the aisle in front of row 22, looking
// aft and down at their faces (a `cut` cue, §9.3).
const ROW22 = { at: 'row22Cam', dist: 0, height: 3.6 };

// Guide decorator: the stage's target (the beacon and the guide arrow, which the flight level aims
// straight, `routeAim: false`) leads through the landmarks `names` in turn, then to the stage's own
// target. It aims at the furthest point of that chain the player is on his way to: one he is nearer
// than the point before it is (or within `pass` m of that point), with a clear line to it (seat
// backs, benches and walls block it). The gate dash's straight line from gateOle to the men's room
// crossed the middle bench row and ran into the toilet block's west wall, pinning an arrow-follower
// on the door jamb; ombord's from the door to 14B ran down the A/B seats and stuck on row 1. Only the
// guide changes: the stage still completes at its own target, which a waypoint carries as `goal` (R
// in the terminal is judged against it, level.js `resetSpot`). In the 0.9 m cabin aisle `pass` is
// small: passed 1.5 m short, the arrow cut the corner into row 1's C seat. Phase 3 r3: re-derived
// every frame (a stored index only stepped forward, so after a PANIK sent Stig back to Ole mid-dash
// the arrow aimed at the men's door through the benches), and the clear line keeps a door from being
// skipped from a room's far corner (the queue's arrow aimed through the men's room wall). When none
// of the points he is on his way to is in clear sight, the arrow looks over the furniture (only what
// stands above head height blocks it: walls, doors, the toilet blocks) at the furthest one he is
// nearer than the point before it is (`pass` is for rounding a waypoint, whose corner is the
// obstacle: over the middle bench's end it sent the dash's arrow-follower into the bench). On his
// way to none (at Ole's after a PANIK) it aims at the first point. Without that pass (r3 repair) a
// player who stepped into a seat row's legroom in ombord's 7 s seat dash (row 3's or row 12's to
// pass a stower, row 15's one row too far) got the arrow at row 1, and north of the back bench row
// the queue's arrow turned back to the men's door. When that look over the furniture picks a
// waypoint (not the stage's own target), the arrow first leads onto the route: to the nearest point
// of the leg into that waypoint, when it is more than 0.3 m off and in clear sight from the hip (in
// a seat row's legroom, the aisle beside him; between the bench rows, the corridor east of them).
// Aimed over the seat backs straight at row 14, an arrow-follower in the forward rows' A/B legroom
// slid along the seat back ahead and stalled on its aisle end (r3 repair2: 13 of 72 legroom cells,
// 1.0-2.5 s), and over the back bench at the men's door one wedged on the bench's east end (7.1 s for
// the 6 s dash).
function via(st, names, pass = 1.5) {
  const target = st.target;
  st.target = function (g) {
    const p = g.player, own = target.call(this, g);
    const pts = names.map((n) => g.lmOffset(n));
    if (own) pts.push(own);
    const furthest = (y, r) => {
      let k = pts.length - 1;
      for (; k > 0; k--) {
        const a = pts[k - 1], b = pts[k];
        const on = dist(p.x, p.z, a.x, a.z) < r || dist(p.x, p.z, b.x, b.z) < dist(a.x, a.z, b.x, b.z);
        if (on && segmentBlocked(p.x, p.z, b.x, b.z, y, 'prop', 0.1) < 0) break;
      }
      return k;
    };
    const k0 = furthest(p.y + 0.5, pass), k = k0 || furthest(p.y + 2.0, 0);
    if (!k0 && k > 0 && k < names.length) {
      const a = pts[k - 1], b = pts[k], dx = b.x - a.x, dz = b.z - a.z;
      const s = clamp(((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
      const qx = a.x + dx * s, qz = a.z + dz * s;
      if (dist(p.x, p.z, qx, qz) > 0.3 && segmentBlocked(p.x, p.z, qx, qz, p.y + 0.5, 'prop', 0.1) < 0) return { x: qx, z: qz, r: 1.0, goal: own };
    }
    return own && k === pts.length - 1 ? own : { x: pts[k].x, z: pts[k].z, r: 1.0, goal: own };
  };
  return st;
}

// Stage decorator (flavour only): runs `tick(g, m, dt)` (this = the stage) every frame after the
// kind's own update while the stage is still going. Used for scene-dressing bubbles that depend on
// where the trolley is; the kinds stay untouched.
function withTick(st, tick) {
  const update = st.update;
  st.update = function (g, m, dt) {
    const r = update.call(this, g, m, dt);
    if (r === undefined) tick.call(this, g, m, dt);
    return r;
  };
  return st;
}

// World bubbles one after another, stopping as soon as the mission is over. `who` is a character
// key or a { x, y, z, height } anchor (for 'pax', a passenger bust with no Character).
async function bubbles(g, m, lines) {
  for (const [who, text, secs = 2.8] of lines) {
    if (g.missions.m !== m) return;
    g.say(who, text, secs);
    await g.wait((secs + 0.1) * (g.testMode ? 0.5 : 1));   // the speaker's bubble has gone (one per speaker)
  }
}

// The row-6 complaint (§8.3 stage 2): plays once, when the serving trolley stands at row 5-7 and
// the player is near enough to see it (within 7.5 m of Angerud in 6C, i.e. on screen). 'pax' is a
// passenger bust across the aisle (the first bust seat of 6D 7D 5D 6E 7C). The stage owns the
// line: the cabin's own row-6 bark is switched off, or Angerud opened with it twice.
function rowSixComplaint(g, m) {
  if (this.complained) return;
  const c = g.cabin, t = c.trolley, p = g.player, a = g.npc('angerud');
  c.skipRowSixBark();
  if (!c.trolleyStopped || Math.abs(t.z - rowZ(6)) > 1.4 || dist(p.x, p.z, a.x, a.z) > 7.5) return;
  this.complained = true;
  const s = ['6D', '7D', '5D', '6E', '7C'].map((id) => c.seats[id]).find((q) => q?.taken === 'bust') || c.seats['6D'];
  const pax = { x: s.x, y: s.y, z: s.z, height: 1.0 };
  bubbles(g, m, [
    ['angerud', 'Kallar ni det här \'varm middag\'? Så ser det inte ut när jag flyger reguljärt.', 3.6],   // [F](t)
    ['angerud', 'Jag har inte fått resan gratis. Jag har betalat 3 000 för den.', 3.2],                    // [F](t)
    [pax, 'Jag betalade bara 995. Sista minuten.', 2.8],                                                   // [F](t)
    ['angerud', 'Det fattades bara det…!', 2.4],                                                         // [F](t)
  ]);
}

export const FLIGHT_MISSIONS = [
  // ===== §8.1 · 0 · gate ======================================================================
  // A beeping arch, Ole's statistics, a timed toilet dash with the heartbeat on, the mantra in
  // the men's room, and the bodega tip in the queue to the plane.
  {
    id: 'gate', title: 'Jag kan flyga, jag är inte rädd', level: 'flight', giver: 'ole', at: 'gateQueue', reward: 200,   // title [F*]
    // In the 3 m landside pocket: side by side across it, facing each other, and a fixed eye-level
    // cut from its south end (the dollhouse showed two hat tops; a side shot ran across the counters).
    intro: [
      ['stig', 'Vad ska de göra?', { place: { ole: ['gateQueue', 0, 1.2, -PI / 2], stig: ['gateQueue', 0, -0.2, PI / 2] }, cut: { at: 'queueCam', dist: 0, height: 2.0 } }],   // [F](t)
      ['ole', 'Rutinekontroll. Narkotika, våpen, bomber…'],                  // [F*](t)
      ['stig', 'Bomber…?!', { fear: 10 }],                                  // [F]
      ['ole', 'Du ser nervøs ut, du. Første gang du flyr?'],                 // [N]
      ['stig', 'Jag kan flyga, jag är inte rädd.'],                          // [F]
    ],
    stages: [
      // [0] the metal detector beeps. Berra waits in the queue behind Stig (local (35.8, 4.6), by the
      // x-ray belt's landside end, clear of the walk from Ole to the arch), so his heckle comes from
      // the shot (from the lounge it came from 14.5 m off screen); stage 5 moves him on.
      () => interact({
        at: 'gateArch', radius: 1.4, prompt: '<b>E</b> Gå genom metallbågen', text: 'Gå genom säkerhetskontrollen',   // [N] · [N]
        startCue: { phase: ['gate', { instant: true }], place: { berra: ['gateArch', -0.4, -2.8] } },
        useCue: { sfx: 'beep', fear: 12, flash: 'rgba(255,60,40,.35)' },
        lines: [
          ['kontrollant', 'Vill ni vara vänlig och ta av er skon.', { anim: { who: 'stig', flag: 'shoeOff', secs: 2 }, sfx: 'laugh' }],   // [F]
          ['berra', 'Kolla terroristen!'],                                                                                             // [F](t)
        ],
      }),
      // [1] to Ole by gate 8 (not "Sätt dig": that is the seat prompt, and there is nothing to sit on)
      () => goto({ to: 'gateOle', radius: 2.5, text: 'Gå till Ole vid gate 8', startCue: { place: { ole: ['gateOle', 0, 0] } } }),   // [N]
      // [2] Ole's statistics. Only Ole's six statistics lines carry fear. Checkpoint: a failed
      // dash replays the statistics, not the arch; `retryFear` gives back the meter the first
      // attempt had here ("Bomber" and the arch), so the replay rebuilds the ≈ 70 the dash needs
      // (the fail empties it: the retried dash started at 48, with no heartbeat). Stig stands on
      // the measured dash start, beside Ole, and a fixed cut from the south frames both (the side
      // two-shot followed the arrival: from the arch it put José's head in the frame).
      () => scene({
        checkpoint: true, retryAt: 'gateOle', retryFear: true, frame: ['ole', 'stig'],
        place: { stig: ['gateOle', -2.0, 0.2, -1.47] }, cam: { at: 'statsCam', dist: 0, height: 1.9 },
        lines: [
          ['ole', 'Du vet vel at det er 50 prosent sjanse å overleve en flyulykke.', { fear: 8 }],   // [F]
          ['ole', 'Det er farligere å kjøre bil enn å fly.', { fear: 8 }],                          // [F]
          ['ole', 'Man regner mellom to og fem millioner flytimer pr. kræsj.', { fear: 8 }],        // [F]
          ['stig', 'Krasch?'],                                                                       // [F]
          ['ole', 'Kræsj.', { fear: 8 }],                                                            // [F*] (bokmål echo; SUB-NO stops at "pr kræsj.")
          ['ole', 'Leste du om en sånn jumbopilot som gjorde en looping?', { fear: 8 }],             // [F]
          ['stig', 'Looping med en jumbo?'],                                                         // [F]
          ['ole', 'Ja. To ganger.', { fear: 8 }],                                                    // [F]
          ['stig', 'Det går väl inte? Kan du se till mitt handbagage ett tag, jag måste…'],          // [F]
        ],
      }),
      // [3] the toilet dash: fear keeps rising as he runs (fearRate 5, see the balance note). The
      // guide follows the measured route: past the end of the middle bench row, up the corridor to
      // the men's door, in.
      () => via(goto({
        to: 'herrtoa', radius: 1.8, fearRate: 5, timer: 6, text: 'Till herrtoaletten – fort!', failText: 'Du hann inte fram…',   // [N] · [N]
        radio: [['ole', 'To ganger, Stig-Helmer! Looping med en jumbo!', { gap: 3, fear: 4 }]],                                   // [F*]
      }), ['herrtoaGang', 'herrtoaDoor']),
      // [4] Levander's exercise
      () => mantra({ at: 'herrtoa', radius: 2.2, secs: 3, text: 'Håll J: sträck ut armarna – Jag kan flyga, jag är inte rädd', barLabel: 'JAG KAN FLYGA' }),   // [N] · [N]
      // [5] Berra comes in: 2.2 m inside the men's room door, turned toward the basins where Stig
      // stands (§8.1 has dz -1.5, which is outside the door in the lounge, behind the wall), and Stig
      // turns to him (the scene left him facing the urinals, his back to Berra). Berra goes back to
      // the lounge when the scene is over (a cue on his last line fires as it starts, and took him
      // out of the shot before his punchline).
      () => scene({
        place: { berra: ['herrtoaDoor', 0, 2.2, 1.25], stig: ['herrtoa', 0, 0, -1.9] }, frame: ['berra', 'stig'],
        doneCue: { place: { berra: ['gateLounge', -1.2, 0] } },
        lines: [
          ['berra', 'Hur mår du?'],                                                          // [F](t)
          ['stig', 'Bra.'],                                                                  // [F]
          ['stig', 'Jag håller på med yoga, avslappningsövningar. Isometrisk träning…'],     // [F]
          ['berra', 'Jaha… Ja, själv tar jag mig ett järn. Ska du ha?'],                      // [F]
          ['stig', 'Nej tack, jag tål inte starksprit.'],                                     // [F]
          ['berra', 'Nej, vem fan gör det?'],                                                 // [F]
        ],
      }),
      // [6] the queue to gate 8: the Stork PA, and the sisters overheard through the ladies' door.
      // The guide leads out of the men's door and down the corridor past the ladies' door (straight
      // at the lounge it aimed through the men's room wall, and from the door across the back bench
      // row).
      () => via(goto({
        to: 'gateLounge', radius: 4, text: 'Ställ dig i kön till gate 8',                                           // [N]
        radio: [['pa', 'Herr Stork ombedes kontakta informationen i avgångshallen.', { gap: 1, pa: true }]],          // [F]
        overhear: [{ at: 'damtoaDoor', r: 8, lines: [
          ['siv', 'Du har väl med dig dom fyra p:na? Pass, pesetas, p-piller, piljetter.'],   // [F](t)
          ['majsan', 'Jag har piral.'],                                                     // [F](t)
          ['siv', 'Pass, pesetas, piral och piljetter!'],                                   // [F](t)
          ['majsan', '…och prit!'],                                                         // [F](t)
        ] }],
        awaitOverhear: true,
      }), ['herrtoaDoor', 'damtoaDoor']),
      // [7] the Stork joke and the bodega tip (a mandatory beat: it sets up missions 9 and 13). The
      // three talk in an arc, half turned to an eye-level cut from south-east of the cluster, with the
      // gate desk and the Storchs behind them; Stig listens side-on at the left of the frame.
      // Unplaced, he came from the men's room and stood between the side two-shot and the speakers
      // (Sulan's face behind Stig's head on all four of Sulan's lines), or walked into the middle of
      // the cluster, and the shot looked away across the security area with the speakers 30 px tall.
      () => scene({
        frame: ['berra', 'sulan'],
        place: { berra: ['gateLounge', -0.8, 0.6, 2.0], robban: ['gateLounge', 0.3, 1.1, 2.66], sulan: ['gateLounge', 1.4, 0.5, -2.6], stig: ['gateLounge', 2.3, 1.2, -1.77] },
        cam: { at: 'loungeCam', dist: 0, height: 1.9 },
        lines: [
          ['robban', 'Han måste vara bror med Lennart Swahn.'],                                          // [F](t)
          ['berra', 'Och Karin Falk!'],                                                                  // [F](t)
          ['robban', 'Och Magnus Uggla!'],                                                               // [F](t)
          ['berra', 'Har du köpt vin?'],                                                                 // [F]
          ['sulan', 'Det är 80-procentig rom.'],                                                         // [F]
          ['sulan', 'Här ligger Pepes Bodega. Det står på skylten.'],                                    // [F]
          ['berra', 'De häller upp och allt är klart?'],                                                 // [F]
          ['sulan', 'Plomberat och klart.'],                                                             // [F]
          ['berra', 'Robban! Sulan har varit på Pepes Bodega. De häller 80-procentig rom på vinflaskor.'],   // [F*] (+ "Robban!")
          ['robban', 'Vad hette det, sa du?'],                                                           // [F]
          ['berra', 'Pepes Bodega.'],                                                                    // [F]
          ['robban', 'Glöm aldrig det, du.'],                                                            // [F]
        ],
      }),
      // [8] boarding. The guide leads to the jet bridge's mouth first (straight at the plane's door
      // it aimed into the window wall north of the opening).
      () => via(goto({ to: 'cabinDoor', radius: 2.0, text: 'Gå ombord – gate 8' }), ['bridgeMouth']),   // [N]
    ],
    // He hands his coat in on the jet bridge, where the sisters catch up with him: Stig and Majsan
    // face each other across the 2 m tube, Siv between them further up it, all turned a little to an
    // eye-level camera at the plane end that looks up the bridge to the GATE 8 sign. (The dollhouse
    // saw them from 51-61° above, Stig under the door frame and Majsan behind Siv.)
    outroPlace: { majsan: ['bridge', 0.55, 1.4, -2.79], siv: ['bridge', -0.15, 0.2, -1.04], stig: ['bridge', -0.55, 1.4, -0.35] },
    outroCam: { at: 'bridgeCam', dist: 0, height: 1.9 },
    outro: [
      ['majsan', 'Nämen… hejsan!', { outfit: { who: 'stig', name: 'kostym' } }],                    // [F](t)
      ['stig', 'Jaså, vi kom på samma resa.'],                                                     // [F](t)
      ['siv', 'Jag dör! Såg du vad han stötte på dig? Han som såg ut som en giraff.'],               // [F]
    ],
  },

  // ===== §8.2 · 1 · ombord ====================================================================
  // Find 14B against the clock past the luggage stowers (there is no row 13), then survive the
  // takeoff in the seat with the mantra while the gear goes DUNS. The cast is already seated.
  {
    id: 'ombord', title: 'Rad 13 finns inte', level: 'flight', giver: 'vardinna', at: 'cabinDoor', reward: 250,   // title [N]
    // At the open front door, forward of the galley curtain: she by the coat closet, Stig just in,
    // facing each other along the cabin and turned a little to a fixed cut from the galley side, with
    // the door and the jet bridge between them. (The dollhouse showed her back and Stig under the
    // door frame; from the aisle the curtain rail, at head height, crossed both faces.)
    intro: [
      ['vardinna', 'God morgon och välkommen ombord!', { place: { vardinna: ['cabinDoor', -0.8, -0.15, 3.49], stig: ['cabinDoor', -0.8, 1.15, -0.35] }, cut: { at: 'doorCam', dist: 0, height: 2.0 } }],   // [N]
      ['stig', 'Fjorton B… Efter rad tolv kommer väl rad tretton?'],             // [N]
      ['vardinna', 'Inte hos oss. Fjorton B ligger mitt i planet.'],             // [N]
      ['vardinna', 'Skynda dig – vi ska taxa ut.'],                               // [N]
    ],
    stages: [
      // [0] find the seat (seatbelt sign lit: standing costs fear; three luggage stowers, E "Ursäkta!").
      // The guide follows the measured route: into the aisle at row 1, down it past the stowers to
      // row 14, then the seat (straight at 14B it ran down the A/B seats into row 1).
      () => via(sit({
        seat: '14B', timer: 7, text: 'Hitta plats 14B och sätt dig', failText: 'Planet kunde inte taxa ut. Kaptenen väntar på dig!',   // [N] · [N]
        startCue: { phase: ['gate', { instant: true }], seatbelt: true, blockers: true }, doneCue: { blockers: false },
      }), ['cabinRow1', 'cabinRow14'], 0.5),
      // [1] the takeoff (scaled seconds, the cabin phases on the same clock; PANIK fails).
      // Checkpoint: a panicked takeoff is retried from row 14, not from the door. The bar is the
      // takeoff's elapsed time (labelled FLYGRÄDSLA it read as the fear meter).
      () => timeline({
        checkpoint: true, retryAt: 'cabinRow14',
        seat: '14B', lockSeat: true, panicFails: true, oleBarks: true, secs: 27, text: 'Starten! Håll J om det blir för mycket', barLabel: 'STARTEN',   // [N] · [N]
        events: [
          [0, { phase: 'takeoff', toast: 'Håll <b>J</b>: Jag kan flyga, jag är inte rädd' }],                                                                      // [N]
          [10, { sfx: 'thud', fear: 20, shake: 0.4, say: ['stig', 'Vad är det för ljud?', 1.5] }],                                                                // [F](t)
          [11.5, { say: ['ole', 'Landingshjulene som går opp. Hydraulikk, vet du.', 2.4] }],                                                                     // [F](t)
          // "Ellers…" is ours: the Norwegian subtitle stops at "få fart", the Swedish one goes on to "annars…".
          [14, { say: ['ole', 'De går opp sånn, og så lukker lemmene seg. Så flyet ikke skal stoppe, men få fart. Ellers…', 3.4] }],                            // [F*](t)
          [17.5, { say: ['stig', 'Annars…?!'], fear: 8 }],                                                                                                       // [N]
          [21, { say: ['majsan', 'Titta, solen!'], applause: 2.5, relieve: 30, seatbelt: false }],                                                                // [F](t)
        ],
      }),
    ],
    outroCam: 'player',
    outro: [
      ['ole', 'Hva er det for et merke du har?'],                                                          // [F*](t)
      ['stig', 'Hammarby. Känner du till Hammarby?'],                                                      // [F]
      ['ole', 'Eneste svenske byene jeg kjenner til er Stockholm og Göteborg og Malmö.'],                  // [F](t)
      ['stig', 'Det här är ett fotbollslag.'],                                                             // [F]
      ['ole', 'Min drøm er å fly med Concorde fra Paris til Rio. 2 300 km i timen. Det er flyging!'],       // [F](t)
      ['ole', 'Tre ganger så fort som en geværkule.'],                                                     // [F](t)
      ['stig', 'Usch…'],                                                                                   // [F](t)
      ['ole', 'Og så Rio! Stranda, jentene og samba.'],                                                    // [F](t)
      ['stig', 'Kanarieöarna är inte så dumt heller.'],                                                    // [F](t)
      ['ole', 'Det får duge.'],                                                                            // [F*](t)
    ],
  },

  // ===== §8.3 · 2 · juice =====================================================================
  // The call-button gag as an interaction, then a trolley-dodging, turbulence-surviving juice run.
  // The player talks to Ole from the aisle (no giver talk while seated) and sits for stage 1.
  {
    id: 'juice', title: 'Mer juice', level: 'flight', giver: 'ole', at: 'cabinRow14', reward: 300,   // title [F*]
    intro: [
      ['kapten', 'Mina damer och herrar, det är kapten. Vi flyger just nu ut över Atlanten.', { pa: true }],                          // [F]
      ['kapten', 'Vi beräknas landa om en timme och 35 minuter. Vädret i Las Palmas är bra – soldis och 22 grader varmt.'],           // [F]
      ['kapten', 'Jag kan även meddela att Stenmark ligger trea efter första åket.', { applause: 2 }],                               // [F]
      ['stig', 'Du, om man vill ha lite mer juice?'],                                                                                // [F]
      ['ole', 'Ja, da trykker du der oppe.'],                                                                                        // [F*]
    ],
    stages: [
      // [0] the call button: on Ole's "Ja." he holds the cup up to it and waits for the juice to come
      // out (as in the film, so "Nei…!" answers the cup). No cup on the press itself: that anim's
      // off-timer would drop the cup again under "Nei…!" when the lines go quickly.
      () => interact({
        at: 'call14', whileSeated: true, seat: '14B', prompt: '<b>E</b> Tryck där uppe', text: 'Sätt dig på 14B och tryck på knappen ovanför',   // [N] · [N]
        startCue: { phase: ['cruise', { instant: true }] },
        useCue: { sfx: 'pling' },
        lines: [
          ['ole', 'Nei…'],                                                              // [F*](t)
          ['stig', 'Där?'],                                                             // [F]
          ['ole', 'Ja.', { anim: { who: 'stig', flag: 'cupHeld', secs: 6 } }],             // [F]
          ['ole', 'Nei…!', { anim: { who: 'ole', flag: 'laugh', secs: 3 } }],             // [F*](t)
          ['ole', 'Så… så kommer flyvertinnen. Juice, whisky.'],                        // [F*]
          ['stig', 'Hon har visst fullt upp.'],                                         // [N]
        ],
      }),
      // [1] fetch it from the serving trolley (only while it stands still); Angerud complains at row 6
      () => withTick(interact({
        at: (g) => g.cabin.trolleyEnd(g), radius: 1.3, enabled: (g) => g.cabin.trolleyStopped, prompt: '<b>E</b> Ta en juice',   // [N]
        text: 'Hämta juicen vid serveringsvagnen – men akta tårna!', checkpoint: true, startCue: { trolley: true },              // [N]
      }), rowSixComplaint),
      // [2] carry it back through the turbulence: hold Space, never run (the text says so: one
      // second of sprinting spills it), keep clear of the trolley
      () => carry({
        item: 'juice', to: 'cabinRow14', radius: 1.2, text: 'Bär juicen till 14B – gå, spring inte!', failText: 'Du spillde juicen!',   // [N] · [N]
        failOn: { bumped: true, sprintSecs: 1.0 }, startCue: { turbulence: [0.6, 5, { delay: 2 }] },
      }),
      // [3] sit down and enjoy it
      () => sit({ seat: '14B', text: 'Sätt dig och njut av juicen', doneCue: { relieve: 30, sfx: 'pickup' } }),   // [N]
    ],
    outro: [
      ['ole', 'Neste gang trykker du og venter, Stig-Helmer.'],   // [N]
      ['stig', 'Usch…'],                                          // [F*]
    ],
  },

  // ===== §8.4 · 3 · sprit =====================================================================
  // A scramble for rolling bottles in a moving aisle while turbulence tips them back and forth and
  // the trolley keeps coming. Berra and Robban stay seated (22C/D); their lines cut to `row22Cam`
  // (in front of row 22, looking aft), since no frame round row 14 or the galley holds them.
  {
    id: 'sprit', title: 'Medhavd sprit', level: 'flight', giver: 'vardinna', at: 'galleyBack', reward: 300, extra: [],   // title [F*]
    intro: [
      ['vardinna', 'Tack. Det är förbjudet att dricka medhavd sprit.'],                                        // [F]
      ['vardinna', 'Tar du det inte lugnt med spriten, kan det bli problem att komma in i Spanien.'],           // [F]
      ['berra', 'Ta det vackert, vi har varit ute och flugit förr.', { cut: ROW22 }],                          // [F]
      ['vardinna', 'Och resten av flaskorna rullar runt i hela planet.', { cut: null }],                        // [N]
      ['stig', 'Jag tål inte starksprit.'],                                                                    // [F*]
      ['vardinna', 'Då är du rätt man.'],                                                                      // [N]
    ],
    stages: [
      // [0] five bottles rolling in the aisle; turbulence warned at 1.5 s, shaking 3-6 s (seatbelt
      // on: hold Space; the jolts kick the bottles), the PA at 8 s
      () => collect({
        kind: 'flaska', motion: 'roll',
        items: [{ x: 3000.2, z: 9.0 }, { x: 2999.8, z: 2.5 }, { x: 3000.3, z: -6.0 }, { x: 2999.7, z: -10.5 }, { x: 3000.0, z: -13.5 }],
        radius: 0.9, timer: 13, text: 'Fånga flaskorna som rullar i gången', barLabel: 'FLASKOR', failText: 'Flaskorna rullade in under sätena.',   // [N] · [N] · [N]
        startCue: { phase: ['cruise', { instant: true }], trolley: true },
        // The film's cabin PA [SUB-SV 00:25:43].
        timedCues: [[1.5, { turbulence: [0.5, 3] }], [8, { radio: ['pa', 'Herr Storch ombedes kontakta kabinpersonalen.'], pa: true }]],   // [F]
      }),
      // [1] hand them in
      () => goto({ to: 'galleyFront', radius: 1.6, text: 'Lämna flaskorna i främre byssan' }),   // [N]
    ],
    // Berra at row 22 first, then back at row 14 with Ole's boombox (his hand luggage: the
    // `flygRadio` outfit; the next mission's home set gives him `flyg` again).
    outroPlace: { stig: ['cabinRow14', 0, 0] },
    outroCam: ['ole', 'stig'],
    outro: [
      ['berra', 'Ja, vad fan, man var ju nykter i morse, men nu börjar det ordna upp sig!', { cut: ROW22, outfit: { who: 'ole', name: 'flygRadio' } }],   // [F*] (Arlanda line, relocated)
      ['stig', 'Är den bra den där?', { cut: null }],                                         // [F]
      ['ole', 'Ja… Kvarts og digital. Level her, input, FM, tape, tape run.'],                 // [F]
      ['ole', 'Hører du? Samba.', { music: { tune: 'samba', secs: 6 } }],                      // [F]
      ['stig', 'Fin musik!'],                                                                 // [F](t)
      ['pax', 'Sch…'],                                                                        // [F](t)
    ],
  },

  // ===== §8.5 · 4 · landning ==================================================================
  // Overhear that you are worth "four points", round up the passengers who won't sit down before
  // the sign goes red, race back to 14B, then hold the mantra through a bumpy approach until the
  // wheels touch Gran Canaria. After the outro the runner hands over to the island (§5.13).
  {
    id: 'landning', title: 'Inflygning Las Palmas', level: 'flight', giver: 'majsan', at: 'cabinRow16', reward: 400,   // title [N]
    // The points scene is just after takeoff in the film (~0:23): every line relocated, the
    // siv/majsan split is ours.
    intro: [
      ['siv', 'Pizza-racern, då? Han får fem poäng.'],                                                                       // [F*](t)
      ['majsan', 'Sex, tycker jag.'],                                                                                       // [F*](t)
      ['siv', 'Giraffen, då? Fyra.'],                                                                                       // [F*](t)
      ['majsan', 'Mindre än pizza-racern?'],                                                                                // [F*](t)
      ['siv', 'Han är så bortkommen. Det blir minuspoäng.'],                                                                // [F*](t)
      ['stig', '…Fyra?'],                                                                                                   // [N]
      ['kapten', 'Vi har påbörjat inflygningen mot Las Palmas. Var vänliga och fäst säkerhetsbältena.', { pa: true, seatbelt: true }],   // [N]
      // She is at the front galley, 16 m behind the row-16 shot's lens: a cut forward to her. The
      // trolley is parked in the galley behind her on that cut, which hides the move (stage 0).
      ['vardinna', 'Alla ska sitta! Hjälp mig få folk på plats, är du snäll.', { cut: { at: 'galleyCam', dist: 0, height: 3.6 }, trolley: 'park' }],   // [N]
    ],
    stages: [
      // [0] the round-up (sign lit: standing costs fear). No turbulence here: a 12 s cue fired on the
      // frame the 12 s timer failed; the approach (stage 2) is the mission's turbulence. The trolley
      // stays parked in the front galley, clear of every route, to the end of the mission (Phase 3
      // r3: `trolley: false` froze it where the intro had caught it, and mid-aisle between Stig and
      // a standing passenger it made the round-up impossible, retries included).
      () => collect({
        who: ['herrStorch', 'jose', 'berra'], standAt: { herrStorch: [3000.2, 3.4], jose: [2999.8, -9.2], berra: [3000.0, -14.4] }, seatOnTouch: true,
        timer: 12, text: 'Få de stående passagerarna att sätta sig', barLabel: 'STÅENDE', failText: 'Värdinnan fick göra det själv.',   // [N] · [N] · [N]
        lines: {
          herrStorch: [['herrStorch', 'Lite film.', { anim: { who: 'herrStorch', flag: 'film', secs: 2 } }]],   // [F*](t) (Arlanda line)
          // Mid-flight in the film (José chatting up Siv), relocated.
          jose: [['siv', 'Vad skönt att komma bort!'], ['jose', 'Jag ska inte bort, jag ska hem.']],            // [F*] · [F*]
          berra: [['berra', 'Ska vi inte landa snart?']],                                                    // [N]
        },
        // The intro's PA lights the sign and its last cut parks the trolley; a retry (no intro)
        // needs both here too.
        startCue: { phase: ['cruise', { instant: true }], trolley: 'park', seatbelt: true },
      }),
      // [1] back to the seat before the approach. Checkpoint: a panicked approach is retried from
      // here (row 16), not from the round-up. The guide follows the measured route, up or down the
      // aisle to row 14, then the seat (straight at 14B an arrow-follower wedged on row 11's or row
      // 16's seats, 6 of 6 from the three round-up ends).
      () => via(sit({
        checkpoint: true, seat: '14B', timer: 5, text: 'Skylten lyser! Tillbaka till 14B', failText: 'Alla måste sitta vid landningen.',   // [N] · [N]
        startCue: { seatbelt: true },   // already lit by the intro; re-lit on a retry
      }), ['cabinRow14'], 0.5),
      // [2] the approach: the bar fills only while J is held; the phase holds until it is full,
      // then the landing runs (touchdown, reverse thrust) and the stage ends on 'landed'. PANIK fails.
      () => mantra({
        seated: '14B', secs: 8, panicFails: true, text: 'Inflygning! Håll J – Jag kan flyga, jag är inte rädd', barLabel: 'JAG KAN FLYGA',   // [N] · [N]
        startCue: { phase: ['approach', { hold: true }], turbulence: [0.75, 14] }, fillCue: { phase: 'landing' }, waitPhase: 'landed',
      }),
    ],
    outroCam: 'player',
    outro: [
      ['berra', 'Om de kraschar, kastar man tomater på piloterna då?', { applause: 3, cut: ROW22 }],   // [F*](t)
      ['robban', 'Nej, skärpning nu, Berra, annars får vi ena jävla problem här.'],                  // [F]
      ['ole', 'Ser du, Stig-Helmer? Hydraulikk, vet du. Helt normalt!', { cut: null }],              // [N]
    ],
  },
];
