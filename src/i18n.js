/**
 * Every string the page shows, in English and Turkish, plus card names and
 * the rules text. Pure data and lookups: no DOM access.
 */

/** @typedef {'en'|'tr'} Lang */
/** @typedef {import('./cards.js').Card} Card */
/** @typedef {{ title: string, items: string[] }} RulesSection */

/** @type {readonly Lang[]} */
export const LANGS = Object.freeze(['en', 'tr']);
/** English is the default; the page switches only when asked. */
export const DEFAULT_LANG = 'en';

/** @type {Record<Lang, Record<string, string>>} */
const STRINGS = {
  en: {
    pageTitle: 'Pişti · Turkish card game',
    appName: 'Pişti',
    newMatch: 'New match',
    rules: 'Rules',
    langButton: 'TR',
    langSwitch: 'TR: switch to Turkish',
    footerLicense: 'MIT',
    footerSource: 'Source on GitHub',
    tableLabel: 'Card table',
    you: 'You',
    computer: 'Computer',
    cards_one: '{n} card',
    cards_other: '{n} cards',
    emptyTable: 'Empty table',
    pistiSummary_one: '{n} pişti · +{points}',
    pistiSummary_other: '{n} piştis · +{points}',
    yourHand: 'Your hand',
    cpuHand: 'Computer’s hand: {cards}',
    playCard: 'Play the {card}',
    pileLabel: 'Table: {cards}, top card {card}',
    pileFaceDown: 'Table: {cards}, face down',
    deckLabel: 'Deck: {cards}',
    captureLabel: '{name}, captured: {cards}',
    yourTurn: 'Your turn',
    hintKeys: 'Click a card or press 1–4',
    hintTouch: 'Tap a card to play it',
    thinking: 'Computer is thinking…',
    dealing: 'Dealing…',
    roundOver: 'Round over',
    nextRound: 'Next round',
    playAgain: 'Play again',
    youWinMatch: 'You win the match!',
    cpuWinsMatch: 'The computer wins the match',
    roundMeta: 'Round {n} · to {target}',
    roundStartYou: 'Round {n} · you lead',
    roundStartCpu: 'Round {n} · the computer leads',
    pistiBurst: 'Pişti!',
    pistiBy: '{name} +{points}',
    jackReturned: 'The {card} was turned up, so it goes back into the deck',
    lastTakeYou: 'You take the cards left on the table',
    lastTakeCpu: 'The computer takes the cards left on the table',
    match: 'Match',
    matchMeta: 'to {target} · {level}',
    level_easy: 'Easy',
    level_normal: 'Normal',
    thisRound: 'This round',
    roundN: 'Round {n}',
    rowCards: 'Cards',
    rowCardPoints: 'Card points',
    rowPistis: 'Piştis',
    rowSoFar: 'Points so far',
    rounds: 'Rounds',
    noRounds: 'No finished rounds yet',
    summaryTitle: 'Round {n} result',
    roundWonYou: 'You won this round',
    roundWonCpu: 'The computer won this round',
    roundDrawn: 'This round is a draw',
    sumCards: 'Cards taken',
    sumMajority: 'Most cards',
    sumJacks: 'Jacks',
    sumAces: 'Aces',
    sumTwoClubs: '2 of clubs',
    sumTenDiamonds: '10 of diamonds',
    sumPistis: 'Piştis',
    sumTotal: 'Round total',
    matchScore: 'Match score',
    firstTo: 'First to {target} wins',
    close: 'Close',
    targetLabel: 'Target score',
    targetOption: '{n} points',
    levelLabel: 'Computer level',
    newMatchNote: 'The current match ends when the new one starts.',
    start: 'Start',
    cancel: 'Cancel',
    rulesTitle: 'How to play Pişti',
  },
  tr: {
    pageTitle: 'Pişti · Türk kart oyunu',
    appName: 'Pişti',
    newMatch: 'Yeni oyun',
    rules: 'Kurallar',
    langButton: 'EN',
    langSwitch: 'EN: İngilizceye geç',
    footerLicense: 'MIT',
    footerSource: 'Kaynak kodu GitHub’da',
    tableLabel: 'Oyun masası',
    you: 'Sen',
    computer: 'Bilgisayar',
    cards_one: '{n} kart',
    cards_other: '{n} kart',
    emptyTable: 'Yer boş',
    pistiSummary_one: '{n} pişti · +{points}',
    pistiSummary_other: '{n} pişti · +{points}',
    yourHand: 'Elin',
    cpuHand: 'Bilgisayarın eli: {cards}',
    playCard: 'Oyna: {card}',
    pileLabel: 'Yerde {cards}, en üstte {card}',
    pileFaceDown: 'Yerde {cards}, kapalı',
    deckLabel: 'Deste: {cards}',
    captureLabel: '{name}, toplanan: {cards}',
    yourTurn: 'Sıra sende',
    hintKeys: 'Bir karta tıkla ya da 1–4 tuşuna bas',
    hintTouch: 'Oynamak için bir karta dokun',
    thinking: 'Bilgisayar düşünüyor…',
    dealing: 'Kartlar dağıtılıyor…',
    roundOver: 'El bitti',
    nextRound: 'Sonraki el',
    playAgain: 'Yeniden oyna',
    youWinMatch: 'Oyunu kazandın!',
    cpuWinsMatch: 'Oyunu bilgisayar kazandı',
    roundMeta: '{n}. el · {target} puana',
    roundStartYou: '{n}. el · sen başlıyorsun',
    roundStartCpu: '{n}. el · bilgisayar başlıyor',
    pistiBurst: 'Pişti!',
    pistiBy: '{name} +{points}',
    jackReturned: 'Açılan kart {card}; desteye geri konuyor',
    lastTakeYou: 'Yerde kalan kartları sen alıyorsun',
    lastTakeCpu: 'Yerde kalan kartları bilgisayar alıyor',
    match: 'Oyun',
    matchMeta: '{target} puana · {level}',
    level_easy: 'Kolay',
    level_normal: 'Normal',
    thisRound: 'Bu el',
    roundN: '{n}. el',
    rowCards: 'Kart',
    rowCardPoints: 'Kart puanı',
    rowPistis: 'Pişti',
    rowSoFar: 'Şu ana kadar puan',
    rounds: 'Eller',
    noRounds: 'Henüz biten el yok',
    summaryTitle: '{n}. elin sonucu',
    roundWonYou: 'Bu eli sen kazandın',
    roundWonCpu: 'Bu eli bilgisayar kazandı',
    roundDrawn: 'Bu el berabere',
    sumCards: 'Alınan kart',
    sumMajority: 'Çok kart',
    sumJacks: 'Valeler',
    sumAces: 'Aslar',
    sumTwoClubs: 'Sinek ikilisi',
    sumTenDiamonds: 'Karo onlusu',
    sumPistis: 'Piştiler',
    sumTotal: 'El toplamı',
    matchScore: 'Oyun skoru',
    firstTo: '{target} puana ilk ulaşan kazanır',
    close: 'Kapat',
    targetLabel: 'Hedef puan',
    targetOption: '{n} puan',
    levelLabel: 'Bilgisayar seviyesi',
    newMatchNote: 'Yeni oyun başlayınca süren oyun biter.',
    start: 'Başla',
    cancel: 'Vazgeç',
    rulesTitle: 'Pişti nasıl oynanır',
  },
};

/** Card names: the rank names cover the letter cards; number cards keep their number. */
const CARD_NAMES = {
  en: {
    pattern: '{rank} of {suit}',
    ranks: { A: 'ace', J: 'jack', Q: 'queen', K: 'king' },
    suits: { C: 'clubs', D: 'diamonds', H: 'hearts', S: 'spades' },
  },
  tr: {
    pattern: '{suit} {rank}',
    ranks: { A: 'ası', J: 'valesi', Q: 'kızı', K: 'papazı' },
    suits: { C: 'sinek', D: 'karo', H: 'kupa', S: 'maça' },
  },
};

/** @type {Record<Lang, RulesSection[]>} */
const RULES = {
  en: [
    { title: 'Goal', items: [
      'Score more points than the computer over several rounds. The first player to reach the target score ({target} unless you pick another) wins the match.',
    ] },
    { title: 'The deal', items: [
      'Four cards go on the table and only the top one is face up. If it is a Jack, it goes back into the deck and the next card is turned up.',
      'Each player gets four cards. Whenever both hands are empty, four more each are dealt until the deck runs out.',
    ] },
    { title: 'Playing', items: [
      'Take turns playing one card onto the pile.',
      'A card of the same rank as the top card takes the whole pile.',
      'A Jack takes the pile whatever is on top.',
      'When all cards are played, whoever took a pile last also takes the cards left on the table.',
    ] },
    { title: 'Pişti', items: [
      'Taking a pile of exactly one card with a card of the same rank is a pişti: {pisti} points.',
      'A Jack on a single Jack is worth {jackPisti} points.',
      'A Jack on any other single card takes it, but that is not a pişti.',
    ] },
    { title: 'Scoring', items: [
      'Each Jack and each Ace: 1 point. 2 of clubs: 2 points. 10 of diamonds: 3 points.',
      'Most cards: {majority} points (nobody gets them on 26–26).',
      'Pişti points are added on top.',
    ] },
    { title: 'Controls', items: [
      'Tap or click a card to play it.',
      'Keyboard: press 1–4 to play the card in that position. Tab and Enter work too.',
    ] },
  ],
  tr: [
    { title: 'Amaç', items: [
      'Birkaç el boyunca bilgisayardan çok puan topla. Hedef puana (başka bir değer seçmezsen {target}) ilk ulaşan oyunu kazanır.',
    ] },
    { title: 'Dağıtım', items: [
      'Yere dört kart konur, yalnız en üstteki açıktır. Açılan kart vale ise desteye geri konur ve sıradaki kart açılır.',
      'Her oyuncuya dört kart verilir. İki elde de kart kalmayınca deste bitene kadar dörder kart daha dağıtılır.',
    ] },
    { title: 'Oynayış', items: [
      'Sırayla yere birer kart atılır.',
      'Yerdeki en üst kartla aynı değerde kart atan, yerdeki bütün kartları alır.',
      'Vale, en üstte ne olursa olsun yerdeki bütün kartları alır.',
      'Kartlar bitince yerde kalanları en son kart alan oyuncu toplar.',
    ] },
    { title: 'Pişti', items: [
      'Yerde tek kart varken onu aynı değerde bir kartla almak piştidir: {pisti} puan.',
      'Tek valenin üstüne vale atmak {jackPisti} puandır.',
      'Başka bir tek kartı vale ile almak pişti sayılmaz.',
    ] },
    { title: 'Puanlar', items: [
      'Her vale ve her as 1 puan, sinek ikilisi 2 puan, karo onlusu 3 puan.',
      'En çok kartı alan {majority} puan alır (26–26 berabere kalırsa kimse alamaz).',
      'Bunlara pişti puanları eklenir.',
    ] },
    { title: 'Kontroller', items: [
      'Oynamak için bir karta dokun ya da tıkla.',
      'Klavye: 1–4 tuşları o sıradaki kartı oynar. Tab ve Enter da çalışır.',
    ] },
  ],
};

/**
 * @typedef {object} Translator
 * @property {Lang} lang
 * @property {(key: string, params?: Record<string, string|number>) => string} t A string with its {placeholders} filled in.
 * @property {(key: string, n: number, params?: Record<string, string|number>) => string} plural
 *   The "_one" or "_other" form of a key for the count n, which fills {n}.
 * @property {(card: Card) => string} card A card's name, e.g. "queen of spades" or "maça kızı".
 * @property {(params: Record<string, string|number>) => RulesSection[]} rules The rules text.
 */

/**
 * Creates the lookups for one language; an unknown language falls back to English.
 * @param {string} lang
 * @returns {Translator}
 */
export function createTranslator(lang) {
  const code = /** @type {Lang} */ (LANGS.includes(/** @type {Lang} */ (lang)) ? lang : DEFAULT_LANG);
  const strings = STRINGS[code];
  const names = CARD_NAMES[code];
  const pluralRules = new Intl.PluralRules(code);
  const t = (key, params = {}) => fill(strings[key] ?? key, params);
  return {
    lang: code,
    t,
    plural: (key, n, params = {}) => t(`${key}_${pluralRules.select(n) === 'one' ? 'one' : 'other'}`, { ...params, n }),
    card: (card) => fill(names.pattern, { rank: names.ranks[card.rank] ?? card.rank, suit: names.suits[card.suit] }),
    rules: (params) => RULES[code].map(({ title, items }) => ({ title, items: items.map((item) => fill(item, params)) })),
  };
}

/** Replaces each {name} in the template with params[name]; unknown names stay as they are. */
function fill(template, params) {
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}
