// The two meter configurations (DESIGN §5.9, §7.1), consumed by shame.configure(). Owner: WP-H.
//   flygradsla: mode 'panic' (flight). At 100: PANIK, never a pursuit.
//   skandal: mode 'pursuit' (island). At 100: the Guardia Civil. hideouts (the porter bribe),
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
    decayIdle: 5, idleDelay: 4, bands: [[70, 3], [35, 1]], allDeadDecay: 12,
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
    }],
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
