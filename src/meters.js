// The two meter configurations (DESIGN §5.9, §7.1), consumed by shame.configure(). Owner: WP-H.
//   flygradsla: mode 'panic' (flight). At 100: PANIK, never a pursuit.
//   skandal: mode 'pursuit' (island). At 100: the Guardia Civil. gain and carBust are the user's
//   balance change (feature SKANDAL), read by shame.js. hideouts (the porter bribe; room 107's
//   wardrobe, feature 36, read by game/closet.js), kyrkfrid (the church door, feature 60, read by
//   game/church.js),
//   witnessToast (Herr Storch) and bustRadio are P1 polish read by shame.js; paintshop (the
//   free-roam paint shop at Gasolina) is read by game/paintshop.js.

export const METERS = {
  flygradsla: {
    mode: 'panic', label: 'FLYGRÄDSLA', cls: 'fear', hot: 70,
    decayIdle: 2, idleDelay: 4,
    panicBanner: ['PANIK!', 'Jag kan flyga… jag kan flyga…'],          // [F*]
    panicFailText: 'Stig-Helmer fick panik! Håll J: ”Jag kan flyga, jag är inte rädd.”',   // [N] · the mantra [F]: how to avoid it
    panicFee: 50, panicResetTo: 40, flailSecs: 2.5,
  },
  skandal: {
    mode: 'pursuit', label: 'SKANDAL', cls: 'skandal', hot: 70,
    // Phase 2 balance (calibrate case 'pursuit'): at 28 km/h-ish Land Rovers spawned 70–150 m off
    // and the old bands ([[42, 9], [22, 3]]: free after 11 s beyond 42 m) every escape took 11.1 s
    // and the Guardia never came within 75 m, even for a driver at 80 % of top speed.
    vehicle: 'guardia', vehicleCount: 2, vehicleMaxSpeed: 33, spawnDist: [40, 80], catchUp: [70, 1.3], pursuerDef: 'guardia',
    pursuerPhysics: 'walk', onFootSpeed: 7.0,          // sprint 8.8 outruns him, walking does not
    penalty: { share: 0.2, min: 250, max: 1500 },      // fine = clamp(round25(0.2·coins), 250, 1500), floored at coins
    bustFreeze: 3,                                      // s frozen beside the officer after a bust
    // The user's balance change (feature SKANDAL, 2026-10-14): every offence adds `gain` × its
    // main.js amount, and the meter waits `idleDelay` s (was 4) before it sinks.
    gain: 3,
    decayIdle: 5, idleDelay: 10, bands: [[70, 3], [35, 1]], allDeadDecay: 12,
    // Busted in a car (feature SKANDAL; the first touch no longer is): crawling or stopped (below
    // `speed` m/s) with a Land Rover within `r` m for `secs` s, or rammed by Land Rovers twice inside
    // `ramWindow` s (an invisible clock from the first ram; a contact less than `ramGap` s after the
    // last one is the same ram: a shove reports an impact on several steps).
    carBust: { secs: 4, r: 10, speed: 4, ramWindow: 14, ramGap: 1 },
    siren: true,
    taunts: ['¡Alto! ¡Guardia Civil!', '¡Documentación, por favor!', '¡Usted! ¡El de la camisa!',   // [N]
      '¡Turistas!',                                                                                // [N]
      'De där svenskarna är heltokiga!'],                                                          // [F*] (Spaniards at the julfest)
    bannerStart: ['¡GUARDIA CIVIL!', 'Nu blev det skandal'],                                       // [N]
    bannerCaught: ['¡MULTA!', 'Guardia Civil tog {n} pesetas i böter', 'Du har inga pesetas kvar att förlora'], // [N]
    bannerEscape: ['SKANDALEN TYSTAD', 'Guardia Civil gav upp'],                                   // [N]
    bustedFailText: 'Guardia Civil tog dig!',                                                      // [N]
    bustLine: '¡Documentación!',                                                                   // [N]
    bustRadio: ['lasse', 'Friskotek i morgon bitti, Olsson!'],                                     // [N] P1 flavour after a bust
    hideouts: [{                                                                                   // P1 (WP-H)
      at: 'flamencoRecepcion', r: 2.6, cost: 500,
      prompt: '<b>E</b> Muta portiern (500 pta)',
      line: ['portier', '…för 500 pesetas kanske vi kommer överens.'],                              // [F*]
      banner: ['PORTIERN TITTADE BORT', 'Skandalen är som bortblåst'],                             // [N]
      cooldown: 60,                                                                                // s
    }, {
      // Skjortbytet (feature 36, free roam only; game/closet.js, §7.2): room 107's wardrobe. In the
      // shirt (`need`, not under SunTrip-butiken's `cover`) Stig changes into `to` in `secs` s, frozen;
      // the officer looks for the shirt and walks past him (`passBy`: offsets [x, z] from `at`).
      at: 'rum107Garderob', r: 1.2, cost: 0, cooldown: 60,                                         // s, its own clock
      outfit: { need: 'hawaii', to: 'kostym', cover: 'skjorta' },
      prompt: '<b>E</b> Byt till kostymen',                                                        // [N]
      secs: 2.5, shutSecs: 0.8, bannerAt: 0.5,                                                     // s
      line: 'De letar ju efter skjortan… inte efter mig.',                                         // [N] Stig, as he changes
      banner: ['INGEN KÄNDE IGEN DIG', 'Guardia Civil letar efter skjortan'],                      // [N]
      taunt: '¡Usted! ¡El de la camisa!',                                                          // shouted only while the shirt shows
      radio: ['ole', 'Du kan ikke gå sånn her nede! Den buksa og det slipset!'],                   // [F*] room 107 in buss17's outro, shortened, on the radio
      passBy: { at: 'flamencoPatio', look: [0.5, -0.4], front: [0.5, 1.6], ends: [[-13, 1.6], [10.5, 2]],
        reach: 25, run: 4.5, walk: 2.2, slowR: 8, comeSecs: 16, leaveSecs: 10,                     // m, m/s, s
        lookSecs: 3.4, replyAt: 1.5, replyR: 9, radioAt: 1.2,                                       // s, m
        cam: { at: 'rum107Cam', dist: 7.5, height: 2.4 },                                           // the scene's shot: julafton's knock cut
        line: '¿Dónde está el de la camisa?',                                                      // [N] the officer on the patio
        reply: 'Buenas tardes.' },                                                                 // [N] Stig
      back: { prompt: '<b>E</b> Byt till hawaiiskjortan', secs: 1.5, radioAt: 0.6,                // [N]
        line: 'Är den inte lite skrikig?',                                                         // [F*] Stig in room 107 (buss17's outro), relocated
        radio: ['ole', 'Du skal ha sterke farger, du som er mørk.'] },                              // [F*] Ole's answer there, on the radio
    }],
    // Kyrkfrid (feature 60, free roam only; game/church.js, §7.2): Templo Ecuménico's door. On foot in
    // a pursuit Stig walks in (`enterSecs` s, frozen: the officer can still take him) and the door
    // slams; out on the plaza the officer reads the sisters' sign, the Land Rovers wait at the street
    // and the meter sinks over `secs` s (held at `floor` until he has read it), then they give up.
    // Free; its own cooldown. Offsets [x, z] from `at` (yaw 0: block-local (0.8, 2.2) + [x, z]).
    kyrkfrid: {
      at: 'kyrkaPuerta', r: 1.8, cooldown: 120,                                                    // m, s
      prompt: '<b>E</b> Sök skydd i kyrkan',                                                       // [N]
      enterSecs: 0.8, secs: 9, floor: 4,                                                           // s, s, meter
      cam: { at: 'kyrkaCam', dist: 12, height: 3 }, shotR: 70, shotMargin: 0.05,                   // the wait's shot from the plaza; what it sees (m, rad)
      door: [0, -0.75], leaf: [0, -1.06], out: [0, 4.4],                                           // the doorway (the right leaf), where he steps out to
      read: [-5.0, 9.0], sign: [-7.2, 7.4], mid: [-3.0, 10.8], midSouth: 1.5,                     // the officer at the sign ES UNA IGLESIA
      entry: [-2.3, 27.8], away: [1.8, 12.0], exit: [1.8, 31.3], kerb: [0, 33.4], reach: 30,       // his way on and off the plaza (off east of the shot's eye)
      run: 4.5, walk: 2.2, slowR: 6, comeSecs: 12, leaveSecs: 12,                                  // m/s, m, s
      stops: [[11.2, 35.05], [-10.8, 35.05]], stopYaw: -Math.PI / 2, stopClear: 5.5, blink: 0.3,     // the Land Rovers at the street (north lane, west)
      readLine: 'Es una iglesia…', readSecs: 2.0,                                                  // [F*] the sisters' language record, relocated to him
      spell: 'Det… är… en… kyr-ka.', spellSecs: 2.4, scratchSecs: 2.0,                             // [F*] the record's Swedish, spelt out
      shout: 'De där svenskarna är heltokiga!', shoutSecs: 2.4,                                    // [F*] the Spaniards at the julfest
      peekAt: 1.6, peekSecs: 1.3, peekLook: 0.8, stepSecs: 1.6, lineAt: 0.3, lineSecs: 2.6,         // s; rad
      line: 'Hoppas vi inte får användning för det.',                                              // [F*] a sister at the record, relocated to Stig
      card: { title: 'Kyrkfrid', text: 'Guardia Civil väntar utanför' },                           // [N]
      banner: ['KYRKFRID', 'Guardia Civil gav upp'],                                                // [N]
    },
    witnessToast: { who: 'herrStorch', r: 20, text: 'Ingen fara: linsskyddet sitter på.', cooldown: 60, // [N] P1; offence adds 0
      say: 'Lite film.' },                                                                         // [F*] Herr Storch's bubble while he "films"
    // The paint shop at Gasolina's workshop (free roam only; game/paintshop.js, §7.2). Stop a car
    // for holdSecs in the zone (r m round `at`) with no Land Rover within clearR m: it is painted
    // like a dalahäst and repaired for `cost` (the purse must hold it), and Guardia Civil does not
    // know it. The cooldown is the porter's (shame.hideoutT). Wet paint for wetSecs: SKICK at 0 and
    // they know it again. One coat per car. Ordinary bodies only (`types`).
    paintshop: {
      at: 'pintura', r: 4, holdSecs: 1, clearR: 35, cost: 1000, cooldown: 60, wetSecs: 12,
      types: ['sedan', 'hatch', 'wagon', 'van', 'pickup'], color: 0xb8202a,
      cam: { at: 'pinturaCam', dist: 7.5, height: 2.6 },
      rollOut: { yaw: Math.PI / 2, camYaw: Math.PI },   // the painted car faces the road; the eye starts on its flank, swings behind
      tip: ['ole', 'Kjør til verkstedet ved Gasolina! For tusen pesetas maler vi bilen.'],         // [N] the first free-roam pursuit
      lines: [['ole', 'Og så maler vi den rød.'],                                                   // [F*](t) relocated from asnan's paint scene
        ['stig', 'Och blommor där.']],                                                              // [F*](t) relocated from asnan's paint scene
      banner: ['COCHE FOLCLORISTICO NATIVO', 'Guardia Civil känner inte igen bilen'],               // [F*] "Caballo folcloristico nativo." with a car · [N]
      driveBy: { line: 'En målad bil…?', speed: 6, delay: 1.5 },                                    // [N] echoes Levander's "En målad åsna…?" [F]
      wet: { title: 'Våt färg', text: 'Kör försiktigt – färgen torkar ({n} s)', label: 'SKICK' },   // [N]
      wetFail: 'Färgen blev förstörd – Guardia Civil känner igen bilen!',                           // [N]
      dry: 'Färgen har torkat.',                                                                     // [N]
      known: 'Guardia Civil känner igen dalahästen. Skaffa en ny bil!',                             // [N]
      noFit: 'Den bilen kan inte målas här.',                                                        // [N]
      seen: 'Guardia Civil ser dig! Skaka av dem först.',                                            // [N]
      stop: 'Stanna i den gula rutan – ny färg för {n} pta.',                                        // [N]
      busy: 'Verkstaden är upptagen en stund till.',                                                 // [N] the hideout cooldown
      poor: 'Målningen kostar {n} pta.',                                                             // [N]
    },
  },
};
