// The voiced script's version 2 (features/roster_v2.md): every line the free-roam features, the
// chatter and the barks say aloud, and who says it. script.js's allLines() adds these after version
// 1's parts (a line it already has keeps its part). Pure, as script.js: it imports only the data files.
//
//   featureLines() -> yields [who, text, part]
//     who: a role key (CHARS, models.js), or '@<what>' for a speaker with no key: '@tourist' (a
//       Swedish tourist), '@local' (a Spanish local), or a nameless figure with lines of his own
//       ('@foreman', '@guaguaDriver', ...). The Guardia Civil is 'guardia'.
//     part: 'feature:<table>' (the table's export name in lower case; METERS.skandal's free-roam
//       parts 'feature:closet', 'feature:kyrkfrid', 'feature:paintshop'), 'chatter' (CHATTER,
//       CHATTER_FLIGHT, OLE_STATS, an unlock's chatter), 'barks' (BARKS' tables).
//   A line built while the game runs is listed in every form it takes; one with endless forms (a
//   time, a score) is not. Shown-only text (toasts, banners, prompts, cards, labels, records) and
//   animal sounds are not lines.
//
// Who says what is written out per table below, as its module says it: a bubble (game.say), the
// radio (game.radio) or the dialogue box (game.dialog). Not tables of lines: HOMES_ISLAND,
// MAP_LABELS_ISLAND, NAMED_CARS (names: HYTT_TVA's), LEVEL_OUTFITS_ISLAND, LOCAL_CAST and STAFF_CAST
// (the barks' speakers); TALK_ISLAND is script.js's own (part 'talk'). Lines written in a module's
// code (peds.js's dodge shouts, cabin.js's passengers and trolley) stay there.

import { BAGGAGE_BELT, BALKONG, BARKS, BATHERS, BATTUR, BERRA_JOB, BIRDS, BRODROST, BUNGALOW_SOLD, BUTANERO, BUTIK,
  CHATTER, COLLECTIBLES, DAY, DOGS, ESLOV, FISKE, FRUKTSTAND, FYREN, GAGS, GATLOPP, GLASS, GLIDE, GOLFBIL,
  GRISFEST_FREE, GUAGUA, GUARDIA_JEEP, HELAN, HITTELON, HOMES_ISLAND, HONK, HYTT_TVA, KAFFE, KIKARE, KORT,
  KRANEN, LAPPLISA, LIFTA, LOCAL_CAST, LOPANDE_BAND, MARKNADSTAK, MIKROFON, NAMED_CARS, PIG_TRUCK,
  POOL_FEST, POOL_JUDGES, RINGKLOCKA, RUM107, SKIDOR, SOLKRAM, STAFF_CAST, STIG_SORRY, STORCH_FILM,
  STRANDKYSSEN, STUNTHOPP, SYSTRARNA, TAKHOPP, TERRAZA, TORG, TOWER, TRAKTORN, TRAMPBAT, UNLOCKS, UTFLYKT,
  VOLLEY } from './island.js';
import { CHATTER_FLIGHT, OLE_STATS } from './flight.js';
import { METERS } from '../meters.js';
import { S, fmt, pta } from '../strings.js';

// The cast that barks in Swedish (main.js bark: not Ole, LOCAL_CAST or STAFF_CAST) and has a body to
// bark with; main.js builds no NPC for the player, RADIO_ONLY or CABIN_OWNED (NO_BODY).
const NO_BODY = ['stig', 'levander', 'kapten', 'pa', 'guardia', 'pax', 'telefonist', 'vardinna2'];
const SV_CAST = ['majsan', 'siv', 'berra', 'robban', 'angerud', 'herrStorch', 'fruStorch', 'sulan', 'vardinna',
  'kontrollant', 'eslov'];

// Every form of `text`: each `{k}` filled with each of vars[k]'s values (a value or a list; every
// combination). Fills every occurrence; a module that fills only the first builds its own.
function forms(text, vars) {
  let out = [text];
  for (const [k, v] of Object.entries(vars)) {
    const vs = Array.isArray(v) ? v : [v], tag = '{' + k + '}';
    out = out.flatMap((t) => (t.includes(tag) ? vs.map((x) => t.split(tag).join(String(x))) : [t]));
  }
  return out;
}

export function* featureLines() {
  for (const gen of [bungalowSold, chatter, chatterFlight, barks, stigSorry, pigTruck, lapplisa, guardiaJeep,
    collectibles, hittelon, brodrost, rum107, solkram, glide, berraJob, grisfestFree, poolJudges, tower,
    takhopp, fyren, ringklocka, mikrofon, birds, strandkyssen, stunthopp, honk, day, storchFilm, eslov,
    skidor, gatlopp, poolFest, baggageBelt, fruktstand, marknadstak, bathers, balkong, dogs, golfbil,
    hyttTva, butik, gags, battur, kaffe, fiske, lifta, kikare, lopandeBand, volley, kort, guagua,
    utflykt, traktorn, butanero, systrarna, kranen, trampbat, terraza, ljud, glass, torg, helan, closet, kyrkfrid,
    paintshop]) yield* gen();
}

// Bungalowen är såld (§10.3, feature 138): the seller's lines after the end are the `bodega` unlock's
// chatter (bubbles), listed first so that they keep the feature's part (and its clips: the chatter waits
// for version 2).
function* bungalowSold() {
  for (const t of BUNGALOW_SOLD.saljare) yield ['saljare', t, 'feature:bungalow_sold'];
}

// Chatter (main.js, bubbles): an idle NPC near Stig says one of his lines; on the island an unlock's
// `chatter` replaces that key's CHATTER (main.js chatterOverrides). UNLOCKS has no other line.
function* chatter() {
  for (const [who, list] of Object.entries(CHATTER)) for (const t of list) yield [who, t, 'chatter'];
  for (const u of Object.values(UNLOCKS)) {
    for (const [who, list] of Object.entries(u.chatter || {})) for (const t of list) yield [who, t, 'chatter'];
  }
}

// The flight level's chatter (cabin.js in the cabin, main.js at the gate, bubbles) and Ole's
// statistics barks (cabin.js, a bubble).
function* chatterFlight() {
  for (const [who, list] of Object.entries(CHATTER_FLIGHT)) for (const t of list) yield [who, t, 'chatter'];
  for (const t of OLE_STATS) yield ['ole', t, 'chatter'];
}

// Barks (main.js bark(ch, kind), bubbles), from the speaker's table: Ole's, the local one
// (LOCAL_CAST, a `local` pedestrian), SunTrip staff's (STAFF_CAST) where the kind has one, else the
// Swedish one. `ouch` (run over, kicked down) and `getUp` by anyone; `kicked` by the cast only
// (main.js kicks this.npcs; pedestrians and extras say `ouch`); `carjack` by a pedestrian only.
function* barks() {
  const body = (k) => !NO_BODY.includes(k), cast = (k) => !k.startsWith('@');
  const by = {
    sv: [...SV_CAST, '@tourist'], ole: ['ole'], local: [...LOCAL_CAST.filter(body), '@local'], staff: STAFF_CAST.filter(body),
  };
  for (const [kind, t] of Object.entries(BARKS)) {
    const ok = kind === 'kicked' ? cast : kind === 'carjack' ? (k) => !cast(k) : () => true;
    for (const [table, list] of Object.entries(by)) {
      for (const who of list.filter(ok)) for (const l of t[table] || t.sv) yield [who, l, 'barks'];
    }
  }
}

// Förlåt, förlåt! (§10.14, stigSorry.js): Stig's bubbles by kind; after his carjack question a
// Swedish (not `local`) pedestrian driver's "Nej." from the asphalt.
function* stigSorry() {
  const t = STIG_SORRY, p = 'feature:stig_sorry';
  for (const k of [...Object.keys(t.chance), 'carjack']) for (const text of t[k]) yield ['stig', text, p];
  yield ['@tourist', t.no, p];
}

// Grisarna ramlar av grisbilen (§10.15, pigTruck.js): bubbles by Stig, Lasse and the grisbonde; the
// pig's NÖFF, the cards and the toast are not said.
function* pigTruck() {
  const t = PIG_TRUCK, p = 'feature:pig_truck';
  for (const text of [t.fall, ...t.pickup, t.ask, t.sick]) yield ['stig', text, p];
  yield ['lasse', t.refuse, p];
  for (const text of [t.thanks, t.missing]) yield ['grisbonde', text, p];
}

// Lapplisan Majsan (§10.17, lapplisa.js): bubbles, the film scene's dialogue, Siv's reply and Angerud's
// mutter (his chatter until the next mission); the GRÚA sign and the toast are shown only.
function* lapplisa() {
  const t = LAPPLISA, p = 'feature:lapplisa';
  for (const text of [t.ask, t.tow, t.praise, t.film.job]) yield ['majsan', text, p];
  for (const text of [t.no, t.noHyrbil, t.film.why]) yield ['stig', text, p];
  for (const text of new Set([...t.film.outburst, ...t.mutter])) yield ['angerud', text, p];
  yield ['siv', t.praiseReply, p];
}

// Låna Guardia-jeepen (§10.34, guardiaJeep.js): bubbles by Stig, the busting officer (shame.officer,
// CHARS.guardia) and Angerud at the siren; the prompt and the toasts are shown only.
function* guardiaJeep() {
  const t = GUARDIA_JEEP, p = 'feature:guardia_jeep';
  for (const text of [t.borrow, t.no, t.surprised]) yield ['stig', text, p];
  yield ['guardia', t.ask, p];
  for (const text of t.angerud.lines) yield ['angerud', text, p];
}

// Collectible sets (§10.1, main.js collect): an item's `line` (Ole), a set's `first` and `complete` on
// the radio; a lost bag's `say` is Stig's bubble as he lifts it (lostBags.js). Labels are shown only.
function* collectibles() {
  const p = 'feature:collectibles';
  for (const set of Object.values(COLLECTIBLES)) {
    for (const k of ['first', 'complete']) if (set[k]) yield [set[k][0], set[k][1], p];
    for (const it of set.items) {
      if (it.line) yield ['ole', it.line, p];
      if (it.say) yield ['stig', it.say, p];
    }
  }
}

// Hittelön (§10.52, lostBags.js): Stig's bubble at the first lift and the counter's dialogue with the
// clerk; the card, the prompt and the toast are shown only.
function* hittelon() {
  const t = HITTELON, p = 'feature:hittelon';
  yield ['stig', t.pickFirst, p];
  for (const [who, text] of t.lines) yield [who, text, p];
}

// Kontrollerad av G17 (§10.24, toasters.js): Stig's bubble at the pop; a burnt one's line by the nearer
// free sister (either). The toasts, prompts and the card are shown only.
function* brodrost() {
  const t = BRODROST, p = 'feature:brodrost';
  for (const text of Object.values(t.lines)) yield ['stig', text, p];
  for (const who of t.sister.keys) yield [who, t.sister.line, p];
}

// Rum 107 (§10.25, §10.36, room107.js): Stig's bubbles; Ole on the radio: his gadget count (1-6 by
// `nums`, 0 `none`, all `full`), the boombox and the wardrobe's outfits. Prompts are shown only.
function* rum107() {
  const { shelf, giraffe, radio, wardrobe } = RUM107, p = 'feature:rum107';
  for (const text of [shelf.line, shelf.empty, giraffe.line]) yield ['stig', text, p];
  const counts = forms(shelf.count, { n: shelf.nums.slice(1, COLLECTIBLES.prylar.items.length) });
  for (const text of [shelf.none, ...counts, shelf.full]) yield ['ole', text, p];
  for (const text of [radio.line, radio.again, radio.quartz]) yield ['ole', text, p];
  for (const l of Object.values(wardrobe.lines)) {
    if (l.say) yield ['stig', l.say, p];
    if (l.radio) yield [l.radio[0], l.radio[1], p];
  }
}

// Smörj in Majsans rygg (§10.26, solkram.js): `ask` and `again` in the dialogue box, the result's and
// `giveUp`'s bubbles; Siv's cards, the scores and the meter's texts are shown only.
function* solkram() {
  const t = SOLKRAM, part = 'feature:solkram';
  for (const [who, text] of t.ask) yield [who, text, part];
  for (const ex of t.again) for (const [who, text] of ex) yield [who, text, part];
  for (const k of Object.values(t.kinds)) for (const [, who, text] of k.lines) yield [who, text, part];
  for (const [, who, text] of t.giveUp) yield [who, text, part];
}

// Jag kan flyga (§10.7, glide.js): Lasse's pool line on the radio, Ole's shout as a bubble; the
// mantra's bubble is S.mantraLine (v1), the unlock's toast is shown only.
function* glide() {
  const t = GLIDE, part = 'feature:glide';
  yield [t.poolRadio[0], t.poolRadio[1], part];
  yield [t.oleShout[0], t.oleShout[1], part];
}

// Bärra hem Berra (§10.6, berraJob.js): the ask and the desk in the dialogue box (the pay in every
// docked form), Robban's drop line and Berra's sleep talk as bubbles; the snores are sounds.
function* berraJob() {
  const t = BERRA_JOB, part = 'feature:berra_job';
  for (const s of t.spots) for (const text of s.sleep) if (text !== t.snore) yield ['berra', text, part];
  for (const [who, text] of t.ask) yield [who, text, part];
  yield [t.drop[0], t.drop[1], part];
  yield [t.home[0], t.home[1], part];
  yield ['robban', t.thanks, part];
  // deliver(): the pay less `perDrop` a drop, never under `minPay` (75, 50, 25 today).
  for (let pay = t.pay - t.perDrop; pay + t.perDrop > t.minPay; pay -= t.perDrop) {
    yield ['robban', fmt(t.thanksDocked, { n: pta(Math.max(t.minPay, pay)) }), part];
  }
}

// Grisfest varje torsdag (§10.18, grisfestFree.js): the gate's, the host's, Ole's, Stig's and Fru
// Storch's bubbles; the invitation in the dialogue box. Prompts and banners are shown only.
function* grisfestFree() {
  const t = GRISFEST_FREE, part = 'feature:grisfest_free';
  for (const [, who, text] of t.greet) yield [who, text, part];
  yield [t.host, t.short, part];
  yield [t.host, t.sangria.line, part];
  yield ['ole', t.heia.line, part];
  yield ['stig', t.ask.line, part];
  yield ['stig', t.ask.scared, part];
  for (const [who, text] of t.invite) yield [who, text, part];
  for (const [who, text] of [t.accept, t.seen, t.coffee.ask, t.coffee.reply]) yield [who, text, part];
}

// Siv och Majsan sätter poäng (§10.8, poolJudges.js): Stig's call, the verdicts' lines and Siv's tease
// as bubbles (Majsan's "Tio!" twice in the table, once here); cards, results and records are shown.
function* poolJudges() {
  const t = POOL_JUDGES, part = 'feature:pool_judges';
  yield [t.call[0], t.call[1], part];
  for (const k of Object.values(t.kinds)) for (const [, who, text] of k.lines) yield [who, text, part];
  yield [t.tease[0], t.tease[1], part];
}

// Från fjärde våningen (§10.20, diveTower.js): Stig's "Oj." as a bubble, Lasse on the radio (the same
// line as GLIDE.poolRadio); the mantra off the tower is S.mantraLine (v1).
function* tower() {
  const t = TOWER, part = 'feature:tower';
  yield ['stig', t.oj, part];
  yield [t.radio[0], t.radio[1], part];
}

// Hoppet mellan hotelltaken (§10.29, roofJump.js): Stig's bubbles at the top and at the view; the
// mantra over the gap is S.mantraLine (v1), the prompts are shown only.
function* takhopp() {
  const t = TAKHOPP, part = 'feature:takhopp';
  yield ['stig', t.top, part];
  yield ['stig', t.view.line, part];
}

// Uppför fyren (§10.35, lighthouse.js): Stig's bubbles on the gallery; the banners and prompts are
// shown only, the exercise's mantra is main.js's S.mantraLine (v1).
function* fyren() {
  const t = FYREN, part = 'feature:fyren';
  yield ['stig', t.arrive, part];
  yield ['stig', t.remind.line, part];
}

// Ringklockan i receptionen (§10.37, receptionBell.js): bubbles from the porter and a departing guest
// (a tourist), Lasse on the radio, Stig's sorry. The *pling*, the prompt and the card are not said.
function* ringklocka() {
  const t = RINGKLOCKA, part = 'feature:ringklocka';
  yield [t.porter, t.momento, part];
  yield ['@tourist', t.ask, part];
  yield ['lasse', t.lasse, part];
  yield ['stig', t.sorry, part];
}

// Mikrofonen på scenen (§10.30, mic.js): bubbles. Stig's announcements (the clock in every form), the
// terrace guests', the crowd's and the bathers' lines (tourists) and the gang's. The prompt is shown only.
function* mikrofon() {
  const t = MIKROFON, c = t.crowd, k = t.klocka, h = t.hajar, part = 'feature:mikrofon';
  // mic.js clockWords: "tre", "halv fyra" (a quarter past to a quarter to), "fyra"; 12 hours and 12 halves.
  const w = (n) => t.hours[((n % 12) + 12) % 12];
  const words = (x) => {
    const H = Math.floor(x), m = Math.floor((x - H) * 60 + 1e-6);
    return m < 15 ? w(H) : m < 45 ? fmt(t.half, { h: w(H + 1) }) : w(H + 1);
  };
  for (const id of t.order) {
    const L = t.lines[id];
    if (id !== 'klocka') yield ['stig', L.text, part];
    else for (let i = 0; i < 24; i++) yield ['stig', fmt(L.text, { tid: words(i * 0.5) }), part];
  }
  for (const s of t.terrace.spit) yield ['@tourist', s, part];
  for (const s of c.cheer) yield ['@tourist', s, part];
  yield ['robban', c.robban, part];
  for (const [who, text] of c.qa) yield [who, text, part];
  yield ['@tourist', c.slump, part];
  yield ['berra', c.berraSlump, part];
  yield ['ole', k.ole, part];
  yield ['ole', k.oleLost, part];
  yield ['@tourist', k.other, part];
  for (const s of h.cries) yield ['@tourist', s, part];
  yield ['lasse', h.lasse, part];
  yield ['stig', h.stig, part];
}

// Fåglarna som lyfter (§10.31, birds.js): bubbles; Stig's sorry among the birds, and the stork scene's
// Stig and Fru Storch.
function* birds() {
  const t = BIRDS, s = t.stork, part = 'feature:birds';
  yield ['stig', t.sorry.line, part];
  yield ['stig', s.stig, part];
  yield [s.correct[0], s.correct[1], part];
}

// Strandkyssen i bränningen (§10.33, beachDream.js): bubbles; the dream's Majsan (a double of her def),
// Stig, Siv's score, Majsan's invitation after the end and his answer. DAGDRÖM and the prompt are shown only.
function* strandkyssen() {
  const t = STRANDKYSSEN, part = 'feature:strandkyssen';
  for (const [who, text] of [t.whisper, t.siv.line, t.after.line]) yield [who, text, part];
  yield ['stig', t.blott, part];
  yield ['stig', t.after.answer, part];
}

// Stunthopp med G17-stämpel (§10.27, stunts.js): Stig's bubbles at the plank's stamp and after a failed
// jump. The result line, card, stamps and jump names are shown only; the mantra in the air is v1's.
function* stunthopp() {
  const t = STUNTHOPP, part = 'feature:stunthopp';
  for (const text of Object.values(t.dreamLine)) yield ['stig', text, part];
  yield ['stig', t.failLine, part];
}

// Tutan som folk reagerar på (§10.9, honk.js): bubbles; the cast's own answers (the grisbil's `pig` ones),
// the class lines from the rest of the island's cast, Stig's sorry and his reply to the tease. NÖFF! is
// not said.
function* honk() {
  const t = HONK, part = 'feature:honk';
  for (const tab of [t.lines, t.pig]) {
    for (const [who, list] of Object.entries(tab)) for (const text of list) yield [who, text, part];
  }
  // The class lines: every NPC shown on the island between missions (a home there) without `lines` of
  // his own, `local` for LOCAL_CAST, `sv` for the rest; the rollerskier (ESLOV.who) answers himself.
  const homes = [HOMES_ISLAND, ...Object.values(UNLOCKS).map((u) => u.home || {})];
  const keys = [...new Set(homes.flatMap((m) => Object.keys(m).filter((key) => m[key])))];
  for (const key of keys) {
    if (key in t.lines || key === ESLOV.who) continue;
    for (const text of LOCAL_CAST.includes(key) ? t.local : t.sv) yield [key, text, part];
  }
  yield ['stig', t.sorry, part];
  yield ['stig', t.teaseReply, part];
}

// Dygnet runt (§10.10, dayClock.js): the nap's bubbles, Ole's alarm and Stig's line on waking at night.
// Zzz…, the banners, the clock and the toast are not said; `chatter` only times CHATTER lines.
function* day() {
  const n = DAY.nap, part = 'feature:day';
  yield ['ole', n.ole, part];
  yield ['stig', n.night, part];
}

// Lite film. (§10.11, storchFilm.js): Herr Storch's bubbles when he films and offers the film night;
// the viewfinder's lines and the film night's are shown in the HUD only.
function* storchFilm() {
  const t = STORCH_FILM;
  for (const text of [t.say, t.offer]) yield [t.who, text, 'feature:storch_film'];
}

// Heja Eslöv! (§10.12, eslov.js): the skier's and Stig's bubbles (sayDue); prompts, banners and toasts
// are shown only.
function* eslov() {
  const t = ESLOV, part = 'feature:eslov';
  const skier = [t.spar.call, ...t.heja.replies, ...t.heja.won, t.race.offer, t.race.win.line, t.race.lose.line];
  for (const text of skier) yield [t.who, text, part];
  for (const text of [t.spar.sorry, t.heja.stig, t.race.yes, t.race.win.stig]) yield ['stig', text, part];
}

// Låna rullskidorna (§10.39, rollerskis.js): bubbles; the skier is ESLOV.who, the "Heja Eslöv!" shout
// Berra's or a Swedish pedestrian's. The hint, the trial's card, result list and place caption are shown only.
function* skidor() {
  const t = SKIDOR, part = 'feature:skidor';
  const stig = [t.lend.ask, t.back.stig, t.fall.sand, ...t.fall.getUp, t.heja.answer];
  const skier = [t.lend.yes, t.back.clean, t.back.fell, t.back.sand, ...t.trial.lines];
  for (const text of stig) yield ['stig', text, part];
  for (const text of skier) yield [ESLOV.who, text, part];
  for (const who of ['berra', '@tourist']) yield [who, t.heja.shout, part];
}

// Gatlopp (§10.38, streetRace.js): José's, Stig's, Berra's, Robban's and the sisters' bubbles; the race's
// `radio` lines on the radio (kinds/core.js RadioSeq). Banners, toasts and the board shown only.
function* gatlopp() {
  const t = GATLOPP, part = 'feature:gatlopp';
  for (const r of t.races) {
    yield [t.who, r.offer, part];
    for (const [who, text] of r.radio) yield [who, text, part];
  }
  yield ['stig', t.offer.yes, part];
  for (const [, who, text] of [...t.win.lines, ...t.lose.lines, ...t.sisters.lines]) yield [who, text, part];
  yield ['berra', t.bet.berra, part];
  yield ['robban', t.bet.robban, part];
  yield ['berra', t.bet.poor, part];
}

// Små grodorna (§10.13, poolFest.js): bubbles (sayOnce); the TAKT counter and the pay toast are shown only.
function* poolFest() {
  const t = POOL_FEST, part = 'feature:pool_fest';
  for (const [, who, text] of t.ask) yield [who, text, part];
  yield [t.porter.who, t.porter.line, part];
  yield ['stig', t.join.line, part];
  yield [t.cheer[0], t.cheer[1], part];
  yield [t.leader, t.payLine, part];
}

// Åk bagageband (§10.16, baggageBelt.js): Stig's bubbles and Lasse on the radio; the lap counts are toasts.
function* baggageBelt() {
  const t = BAGGAGE_BELT, part = 'feature:baggage_belt';
  for (const text of [...t.board, t.luggage]) yield ['stig', text, part];
  yield [t.lasse[0], t.lasse[1], part];
}

// Rakt genom fruktståndet (§10.19, fruitStands.js): the fruit seller's bubble (a figure of her own, key
// 'frutera') and the souvenir seller's swear; Stig's sorry is STIG_SORRY's.
function* fruktstand() {
  const t = FRUKTSTAND;
  yield ['@fruitSeller', t.vendorLine, 'feature:fruktstand'];
  yield ['souvenir', t.swearLine, 'feature:fruktstand'];
}

// Pesetas på marknadstaken (§10.46, marketRoofs.js): the souvenir seller's bubbles and Stig's sorry.
function* marknadstak() {
  const t = MARKNADSTAK;
  for (const text of [t.no, t.swearLine]) yield ['souvenir', text, 'feature:marknadstak'];
  yield ['stig', t.sorry, 'feature:marknadstak'];
}

// Badgäster på solstolarna (§10.22, bathers.js): the wake's bubbles, Berra's sleep talk (bare snores
// skipped); the bathers' cries are BARKS, the prompt is shown.
function* bathers() {
  const s = BATHERS.stekt, w = s.wake;
  for (const [who, list] of Object.entries(s.snore)) for (const text of list) {
    if (/[^\sz….]/i.test(text)) yield [who, text, 'feature:bathers'];
  }
  yield ['stig', w.stig, 'feature:bathers'];
  yield ['berra', w.berra, 'feature:bathers'];
  yield ['robban', w.robban, 'feature:bathers'];
}

// Balkongerna lever (§10.42, residents.js): bubbles of the residents (randomPed tourists, the señora a
// local woman) and Stig's sorry.
function* balkong() {
  const t = BALKONG;
  for (const text of [t.call, t.sea, t.park.line]) yield ['@tourist', text, 'feature:balkong'];
  yield ['@local', t.yell, 'feature:balkong'];
  yield ['stig', t.sorry, 'feature:balkong'];
}

// Fin hund… (§10.21, dogs.js): each dog's unseen owner calls it (a bubble at the door: a local's in
// Spanish, a Swede's in Swedish), Stig's bubbles (`up`'s null is the mantra); the barks are dog sounds.
function* dogs() {
  const t = DOGS;
  const spanish = (s) => /^(¡[^!]*!\s*)+$/.test(s);
  for (const d of [...t.pack, t.farm]) yield [spanish(d.call) ? '@local' : '@tourist', d.call, 'feature:dogs'];
  for (const text of [t.first, ...t.ground, ...t.up.map((l) => l ?? S.mantraLine), t.thanks]) {
    yield ['stig', text, 'feature:dogs'];
  }
}

// Golfbilen (§10.40, golfCart.js): Stig's bubbles in a bunker and the pond; `blocked` is a toast.
function* golfbil() {
  for (const k of ['sand', 'pond']) yield ['stig', GOLFBIL[k].line, 'feature:golfbil'];
}

// Hytt två! (§10.43, phoneBooth.js): the telefonist on the radio, Stig's bubbles (the order with each
// car's NAMED_CARS name, fmt); prompt, menu and toast are shown.
function* hyttTva() {
  const t = HYTT_TVA;
  for (const text of [t.booth, t.pay, t.full]) yield [t.who, text, 'feature:hytt_tva'];
  for (const name of t.cars) yield ['stig', fmt(t.order, { name: NAMED_CARS[name] || name }), 'feature:hytt_tva'];
  for (const text of [t.thanks, t.pig]) yield ['stig', text, 'feature:hytt_tva'];
}

// SunTrip-butiken (§10.23, suntripShop.js): the clerk's bubbles (a figure of his own, key 'resesaljare'),
// Stig's sighs and bag line, Ole's at the hat; receipts, instalments and prompts are toasts.
function* butik() {
  const t = BUTIK;
  const total = (it) => it.base + it.add.reduce((a, [, n]) => a + n, 0);
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
  for (const it of t.items) yield ['@shopClerk', it.sell, 'feature:butik'];
  // `short` only when the part paid now is over `poorBelow` (else `poor`), with the item's whole total.
  for (const it of t.items) {
    const sum = total(it), now = it.trapp ? Math.ceil(sum / t.trapp.parts) : sum;
    if (now > t.poorBelow) yield ['@shopClerk', fill(t.short, { n: sum }), 'feature:butik'];
  }
  for (const text of [t.poor, t.greet, t.paketet]) yield ['@shopClerk', text, 'feature:butik'];
  for (const it of t.items) yield ['stig', it.sigh, 'feature:butik'];
  yield ['stig', t.bagTaken, 'feature:butik'];
  yield ['ole', t.ole, 'feature:butik'];
}

// Gags på E (§10.32, gags.js): each gag's lines in the dialogue box.
function* gags() {
  for (const gag of GAGS.list) for (const [who, text] of gag.lines) yield [who, text, 'feature:gags'];
}

// Båtturen med PALOMA (§10.41, boatTrip.js): bubbles of Stig and the doubles (each has its cast key);
// the Rio trip's Ole line is the plain trip's, yielded once; the banner is shown only.
function* battur() {
  for (const v of ['plain', 'rio']) for (const [, who, text] of BATTUR[v].lines) yield [who, text, 'feature:battur'];
}

// Poolbaren öppnar (§10.44, poolBar.js): bubbles of the bartender (the 'camarero' Character), Stig,
// Berra and Fru Storch; the prompts, the box under the meter and the pay toast are shown only.
function* kaffe() {
  const t = KAFFE, p = 'feature:kaffe';
  yield [t.barman, t.buy.thanks, p];
  yield ['stig', t.buy.stig, p];
  yield ['stig', t.buy.more, p];
  yield [t.barman, t.short.barman, p];
  yield ['stig', t.short.stig, p];
  for (const [, who, text] of [...t.berra.lines, ...t.storch.lines]) yield [who, text, p];
}

// Meta från piren (§10.45, fishing.js): Stig's bubbles; the toasts, names, card and hints are shown only.
function* fiske() {
  const t = FISKE, p = 'feature:fiske';
  for (const list of Object.values(t.lines)) for (const text of list) yield ['stig', text, p];
  for (const text of [t.early, t.late, t.allLine]) yield ['stig', text, p];
}

// Vi liftar (§10.47, hitch.js): Stig's bubbles and the farmer's (an anchor over the bust at the wheel,
// drawn from CHARS[LIFTA.driver]); the pig's NÖFF!, the card and the toast are not said.
function* lifta() {
  const t = LIFTA, p = 'feature:lifta';
  for (const k of ['please', 'stink', 'sick', 'thanks']) yield ['stig', t[k], p];
  for (const k of ['hopIn', 'adios']) yield [t.driver, t[k], p];
}

// Livräddarens kikare (§10.48, binoculars.js): only the last find's line is a bubble (Stig's); the
// warning and the targets' lines are the overlay's subtitle under the picture, shown only.
function* kikare() {
  yield ['stig', KIKARE.allLine, 'feature:kikare'];
}

// Stig på löpande band (§10.49, packhus.js): bubbles of the foreman (a random local, no CHARS key),
// Stig and Siv; the stamp is a banner, the card, label, signs and bar are shown only.
function* lopandeBand() {
  const t = LOPANDE_BAND, p = 'feature:lopande_band';
  const boss = [t.call, t.callAgain, t.intro, ...t.faster, ...Object.values(t.wrong), t.rasBoss, t.rasAfter, t.done,
    t.quit];
  for (const text of boss) yield ['@foreman', text, p];
  for (const text of [t.stigIntro, t.firstBox, t.rasStig, t.doneStig]) yield ['stig', text, p];
  yield ['siv', t.siv, p];
}

// Strandvolley (§10.50, volley.js): bubbles over Ole, Berra, Robban (its own say queue); the board's
// `why`, the banners, prompts, keys and the serve hint are shown only.
function* volley() {
  const t = VOLLEY, p = 'feature:volley';
  for (const [, who, text] of t.intro) yield [who, text, p];
  for (const [who, text] of [...t.ours, ...t.theirs]) yield [who, text, p];
  for (const [who, text] of Object.entries(t.outCall)) yield [who, text, p];
  for (const set of t.thirst) for (const [, who, text] of set) yield [who, text, p];
  for (const k of ['win', 'lose', 'quit']) for (const [, who, text] of t[k].lines) yield [who, text, p];
}

// Kort på oss (§10.51, touristPhoto.js): the nameless couple's bubbles (her ask, his hand-over, the thanks);
// Stig's `omelett` and her `miss` come up in the viewfinder (hud.setKort), shown only, like stamps and tips.
function* kort() {
  const t = KORT, p = 'feature:kort', by = { han: '@coupleMan', hon: '@coupleWoman' };
  for (const s of t.spots) yield [by.hon, s.ask, p];
  yield [by.han, t.hand, p];
  for (const [who, text] of Object.values(t.lines)) yield [by[who], text, p];
}

// Guaguan (§10.53, guagua.js): bubbles; the driver ('chofer') and Ole's bust from anchors at their seats,
// Stig over himself; Ole's film line goes to the driver (`oleAlt`) when the real Ole is in sight.
function* guagua() {
  const t = GUAGUA, p = 'feature:guagua', driver = '@guaguaDriver', by = (who) => (who === 'chofer' ? driver : who);
  for (const k of ['hello', 'fareLine', 'bye', 'byeLine']) yield [driver, t[k], p];
  for (const set of [t.film, ...t.rides]) for (const [, who, text] of set.lines) yield [by(who), text, p];
  yield [driver, t.oleAlt, p];
  yield ['stig', t.thanks, p];
}

// Utflykt med Lasse (§10.58, utflykt.js): Lasse on the radio (his `call` a bubble when he is near), Affe's
// and the window tourist's bubbles from anchors in the bus, Stig's own; cards and stop names shown only.
function* utflykt() {
  const t = UTFLYKT, p = 'feature:utflykt', by = (who) => (who === 'turist' ? '@tourist' : who);
  yield [t.call[0], t.call[1], p];
  for (const set of [t.legs, t.arrive]) {
    for (const list of Object.values(set)) for (const [, who, text] of list) yield [by(who), text, p];
  }
  for (const k of ['offLine', 'warnLine', 'backLine', 'stayLine', 'missed']) yield ['lasse', t[k], p];
  yield ['stig', t.missedStig, p];
  yield ['affe', t.byeLine, p];
  yield ['stig', t.thanks, p];
}

// Traktorn med släpkärran (§10.54, traktor.js): bubbles. The farmer is a Character of TRAKTORN.farmer
// (ours, not the grisbonde: no key, '@farmer'); `prompt` and `blocked` (a toast) are shown only.
function* traktorn() {
  const t = TRAKTORN, part = 'feature:traktorn';
  yield ['stig', t.borrow, part];
  for (const s of t.shouts) yield ['@farmer', s, part];
  for (const s of t.answers) yield ['stig', s, part];
  yield ['@farmer', t.giveUp, part];
  yield ['@farmer', t.back, part];
  yield ['stig', t.backStig, part];
  for (const s of [...t.sick, ...t.honked]) yield ['stig', s, part];
}

// Butaneron och gasolbilen (§10.65, butano.js): bubbles. The butanero is a Character of BUTANERO.man
// (ours, no key: '@butanero', a voice of the passers-by's pool, features/roster_v2.md), his call from the
// cab a bubble at the wheel; a house's resident a passer-by ('@local', '@tourist'); Stig over himself.
// The toast and the card are shown only.
function* butanero() {
  const t = BUTANERO, part = 'feature:butanero';
  for (const s of [t.call, t.thanks, t.offer.ask, t.offer.thanks, ...t.robbed]) yield ['@butanero', s, part];
  yield ['@local', t.buy.local, part];
  yield ['@tourist', t.buy.tourist, part];
  for (const s of [t.offer.yes, t.offer.after, t.popLine]) yield ['stig', s, part];
}

// Systrarnas balkong (§10.55, sisters.js): `ask` and `deliver` in the dialogue box; the shops' lines,
// `remind` and `park` bubbles ('shop' is the cashier's voice over SUPERMERCADO's door, '@grocer');
// prompts, the card, the toast shown only.
function* systrarna() {
  const t = SYSTRARNA, part = 'feature:systrarna';
  for (const [who, text] of [...t.ask, ...t.deliver]) yield [who, text, part];
  for (const s of t.shops) for (const [, who, text] of s.lines) yield [who === 'shop' ? '@grocer' : who, text, part];
  yield ['siv', t.remind, part];
  yield ['majsan', t.park.line, part];
  yield ['siv', t.park.reply, part];
}

// Åk med byggkranen (§10.56, crane.js): Stig's bubble after a thud; `view.line` is a toast. (His mantra on
// the pallet is S.mantraLine, v1's 'mantra'.)
function* kranen() {
  yield ['stig', KRANEN.thud.line, 'feature:kranen'];
}

// Hyr en trampbåt (§10.57, trampbat.js): bubbles, 'stig' Stig and the rest Ole's double (key 'ole');
// the prompts, `farOut` and `reset` (toasts) are shown only.
function* trampbat() {
  const t = TRAMPBAT, part = 'feature:trampbat';
  for (const list of [t.start, t.rio.lines, t.shark.lines, t.land]) {
    for (const [, who, text] of list) yield [who, text, part];
  }
  for (const [who, text] of [t.raft.line, t.raft.done]) yield [who, text, part];
  yield ['stig', t.wet, part];
}

// Takterrassen på La Medina (§10.59, terraza.js): bubbles. The brochure pair by two guests (random
// non-local peds), the bartender (his own look); `zzz`, the banner, the toast and the prompt not said.
function* terraza() {
  const t = TERRAZA, part = 'feature:terraza';
  yield ['@tourist', t.brochure.line, part];
  yield ['@tourist', t.brochure.reply, part];
  for (const s of [...t.barman.greet, t.barman.burnt, t.barman.ole]) yield ['@bartender', s, part];
  const stig = new Set([t.nap.line, t.nap.wake, t.nap.ouch, t.burn.aj]);
  for (const s of stig) yield ['stig', s, part];
}

// Ljudlandskap per kvarter (§10.60, soundscape.js): sounds only (the band plays, nobody speaks).
function* ljud() {
}

// Glass till Majsan (§10.61, glass.js): bubbles; `sold` from the kiosk window (an anchor, no body), the rest
// Stig's and Majsan's; the prompt, toasts, record and objective card are shown only.
function* glass() {
  const t = GLASS, part = 'feature:glass';
  yield ['@kiosk', t.sold, part];
  for (const k of ['stig', 'half', 'melted']) yield ['stig', t[k], part];
  for (const set of [...t.give, t.strut]) for (const [, who, text] of set.lines) yield [who, text, part];
}

// Liv på torget (§10.62, torgliv.js): bubbles; the market vendors' calls, the church square's greetings
// and the plaza sitters' mutter (keyless locals), the souvenir seller's giraffe and Stig's answer.
function* torg() {
  const t = TORG, part = 'feature:torg';
  for (const s of new Set([...t.calls, ...t.vendors.map((v) => v.call).filter(Boolean)])) yield ['@vendor', s, part];
  for (const [, s] of t.greet) yield ['@local', s, part];
  yield ['@local', t.suecos, part];
  yield ['souvenir', t.giraffe.line, part];
  yield ['stig', t.giraffe.stig, part];
}

// Helan går från balkongen (§10.63, helanGar.js): bubbles; guests a and b (keyless Swedes, `guests` true: a
// woman), Stig and Affe's double; `sung` is the song's lyric (not said), the napkin's toast shown only.
function* helan() {
  const t = HELAN, part = 'feature:helan';
  const guest = (w) => (w ? '@partyGuestWoman' : '@partyGuestMan');
  const who = { a: guest(t.guests[0]), b: guest(t.guests[1]) };
  for (const [, w, text] of [...t.first, ...t.again]) yield [who[w] || w, text, part];
  yield [who.a, t.skal, part];
  yield ['affe', t.sigh, part];
}

// Skjortbytet (§7.2, closet.js): Stig's bubbles at the wardrobe, the officer's on the patio, Ole's radio;
// `taunt` is a core taunt (only filtered here), the prompts and banner shown only.
function* closet() {
  const h = METERS.skandal.hideouts.find((x) => x.outfit), part = 'feature:closet';
  yield ['stig', h.line, part];
  yield ['guardia', h.passBy.line, part];
  yield ['stig', h.passBy.reply, part];
  yield [h.radio[0], h.radio[1], part];
  yield ['stig', h.back.line, part];
  yield [h.back.radio[0], h.back.radio[1], part];
}

// Kyrkfrid (§7.2, church.js): the officer's bubbles at the sign and his shout (today a core taunt too),
// Stig's out of the door; the prompt, card and banner shown only.
function* kyrkfrid() {
  const c = METERS.skandal.kyrkfrid, part = 'feature:kyrkfrid';
  for (const text of [c.readLine, c.spell, c.shout]) yield ['guardia', text, part];
  yield ['stig', c.line, part];
}

// The paint shop (§7.2, paintshop.js): Ole's radio tip, the bay's dialog, the passing Land Rover's
// bubble (an anchor at the jeep: its officer); the banner, card and toasts shown only.
function* paintshop() {
  const c = METERS.skandal.paintshop, part = 'feature:paintshop';
  yield [c.tip[0], c.tip[1], part];
  for (const [who, text] of c.lines) yield [who, text, part];
  yield ['guardia', c.driveBy.line, part];
}
