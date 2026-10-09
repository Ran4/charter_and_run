// Every engine/UI string the player sees (DESIGN §11). Swedish; all [N] unless tagged otherwise.
// Engine code uses S.key (and fmt(key, vars) for {placeholders}). Owner: WP-H.

export const S = {
  // §11.5 engine and stage strings
  getInCar: 'Hoppa in i en bil',
  outOfTime: 'Tiden är ute!',
  backInCar: 'Tillbaka in i bilen!',
  goBackFor: 'Åk tillbaka efter {name}!',
  neverLeave: 'Lämna mig aldrig igen!',
  pickUp: 'Hämta {name}',
  slowDown: 'Sakta in så de kan hoppa in!',
  goGoGo: 'Kör, kör, kör!',
  stopCar: 'Stanna bilen!',
  exitCar: 'Kliv ur bilen!',
  losing: 'DU TAPPAR DEM!',
  distance: 'AVSTÅND',
  tooClose: 'FÖR NÄRA!',
  wreckedRide: 'Du kvaddade {name}s bil!',
  lost: 'Du tappade bort {name}!',
  race1: '1:A · KONTROLL {i}/{n}',
  race2: '2:A · KONTROLL {i}/{n}',
  go: 'KÖR!',
  won: '{name} vann!',
  target: 'MÅL',
  gotAway: 'Den kom undan!',
  caught: '{label} {n}/{m}',
  missionSub: 'Uppdrag {i} av {n}',
  complete: 'UPPDRAG KLART!',
  completeSub: '+{reward} pesetas',
  failed: 'UPPDRAG MISSLYCKAT',
  retryPrompt: '<b>E</b> Försök igen &nbsp;·&nbsp; <b>Q</b> Ge upp',
  retryToast: 'Försök igen!',
  newMission: 'Nytt uppdrag: hitta <b>{name}</b> <span class="bang">!</span>',
  firstStart: 'Prata med <b>Ole</b> i säkerhetskontrollen <span class="bang">!</span> – tryck <b>E</b>',
  wrecked: 'KVADDAD!',
  reset: 'Tillbaka på vägen!',
  resetFlight: 'Tillbaka i gången!',
  carBusy: 'Den är upptagen!',
  noCars: 'Det finns inga bilar i ett flygplan.',
  spaceFirst: 'Space: håll i dig (vid turbulens)',
  soundOff: 'Ljud av',
  soundOn: 'Ljud på',
  fatal: 'Något gick sönder: ',
  gameComplete: 'NUEVA ESTOCOLMO KLARAT!',
  gameCompleteSub: 'God jul – och tack för resan!',
  olePays: 'Ole betalade {n} pta.',
  olePaysRadio: 'Jeg spanderer!',
  panicIdle: 'Värdinnan följde dig tillbaka till din plats och bjöd på ett glas vatten. Serviceavgift: −50 pta.',
  panicIdleGate: 'En SunTrip-värdinna gav dig ett glas vatten vid gate 8. Serviceavgift: −50 pta.',
  busted: 'Guardia Civil tog {n} pesetas i böter',
  row13: 'Rad 13 finns inte!',
  turbulence: 'TURBULENS!',
  sitDown: 'Sätt dig på {seat}!',
  // §4.4 the handover to the island
  transitionMain: 'LAS PALMAS',
  transitionSub: 'Soldis och 22 grader varmt.',   // [F*]
  transitionToast: 'Nytt uppdrag: hitta <b>Lasse</b> vid flygplatsen <span class="bang">!</span>',
  // §11.7 banners for Phase 2 / mission content (the grisfest morning, the Rio end card)
  morningAfter: 'MORGONEN EFTER',
  morningAfterSub: 'Julafton på Gran Canaria',
  endCardMain: 'RIO…?',
  endCardSub: 'Svenskarna reser inte till någonting… dom reser från någonting.',   // [F] the film's opening card
  // §11.4 HUD
  coins: '{n} pta',
  dialogNext: 'E ▸',
  promptTalk: '<b>E</b> Prata med {name}',
  promptGetIn: '<b>E</b> Kliv in',
  promptSteal: '<b>E</b> Ta bilen',
  promptSit: '<b>E</b> Sätt dig',
  promptStand: '<b>E</b> Res dig',
  promptLock: '<b>E</b> Lås in dig',
  promptJuice: '<b>E</b> Ta en juice',
  promptExcuse: '<b>E</b> Ursäkta!',
  promptBid: '<b>E</b> Bjud!',
  promptHold: '<b>SPACE</b> Håll i dig!',
  promptMantra: '<b>J</b> håll: Jag kan flyga!',
  mantraLine: 'Jag kan flyga, jag är inte rädd.',   // [F]
  speedUnit: 'KM/H',
  legendClose: 'M stänger',
  legendMission: '! uppdrag',
  mapTitleIsland: 'NUEVA ESTOCOLMO · GRAN CANARIA',
  mapTitleFlight: 'SOL-VIKING SE-SOL',
  mapTitleGate: 'ARLANDA · GATE 8',
  noMap: 'Ingen karta ombord – följ pilen.',   // §5.11 fallback toast
  // §11.2 loading lines
  loading: ['Avisar vingarna…', 'Bygger Nueva Estocolmo…', 'Överbokar Hotell Flamenco…', 'Häller 80-procentig rom på vinflaskor…', 'Målar åsnan röd…', 'Ritar mustascher…'],
  // §11.3 pause (the buttons and keycaps are set in Luckiest Guy: uppercase, §1.3)
  pause: 'Paus',
  resume: 'FORTSÄTT',
  musicOn: 'MUSIK: PÅ',
  musicOff: 'MUSIK: AV',
  musicSamba: 'MUSIK: SAMBA',
  soundBtnOn: 'LJUD: PÅ',
  soundBtnOff: 'LJUD: AV',
  erase: 'RADERA RESAN',
  eraseConfirm: 'Vill du radera resan och börja om på Arlanda?',
};

// fmt('busted', { n: 250 }) -> 'Guardia Civil tog 250 pesetas i böter'. Unknown keys format the key.
export function fmt(key, vars = {}) {
  const t = S[key] ?? key;
  return String(t).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

// Pesetas with thin-space thousands: 1250 -> '1 250'.
export const pta = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
