// The two meter configurations (DESIGN §5.9, §7.1), consumed by shame.configure(). Owner: WP-H.
//   flygradsla: mode 'panic' (flight). At 100: PANIK, never a pursuit.
//   skandal: mode 'pursuit' (island). At 100: the Guardia Civil. hideouts (the porter bribe),
//   witnessToast (Herr Storch) and bustRadio are P1 polish read by shame.js.

export const METERS = {
  flygradsla: {
    mode: 'panic', label: 'FLYGRÄDSLA', cls: 'fear', hot: 70,
    decayIdle: 2, idleDelay: 4,
    panicBanner: ['PANIK!', 'Jag kan flyga… jag kan flyga…'],          // [F*]
    panicFailText: 'Stig-Helmer fick panik!',                           // [N]
    panicFee: 50, panicResetTo: 40, flailSecs: 2.5,
  },
  skandal: {
    mode: 'pursuit', label: 'SKANDAL', cls: 'skandal', hot: 70,
    vehicle: 'guardia', vehicleCount: 2, vehicleMaxSpeed: 28, pursuerDef: 'guardia',
    pursuerPhysics: 'walk', onFootSpeed: 7.0,          // sprint 8.8 outruns him, walking does not
    penalty: { share: 0.2, min: 250, max: 1500 },      // fine = clamp(round25(0.2·coins), 250, 1500), floored at coins
    bustFreeze: 3,                                      // s frozen beside the officer after a bust
    decayIdle: 5, idleDelay: 4, bands: [[42, 9], [22, 3]], allDeadDecay: 12,
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
  },
};
