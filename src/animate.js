/**
 * Plays game events on screen. Each step draws the table as it is after the
 * event, with the moving cards still invisible, flies copies of them from
 * where they were, then shows them. The screen therefore always ends on the
 * real game state (table-model.test.js replays whole matches to check it).
 */
import { motionOk, wait } from './fx.js';
import { HUMAN } from './match.js';
import { TABLE_SIZE } from './rules.js';
import { applyEvent } from './table-model.js';

/** @typedef {import('./cards.js').Card} Card */
/** @typedef {import('./fx.js').Flight} Flight */
/** @typedef {import('./i18n.js').Translator} Translator */
/** @typedef {import('./match.js').MatchEvent} MatchEvent */
/** @typedef {import('./table-model.js').View} View */
/** @typedef {import('./table-view.js').Spot} Spot */

/**
 * @typedef {object} Stage What the animations draw on. Once a new match has
 *   started, every call does nothing, so an old animation stops quietly.
 * @property {View} view The view on screen.
 * @property {Translator} tr
 * @property {(view: View, hidden?: string[]) => void} show Draws a view; the cards with these keys stay invisible.
 * @property {(keys: string[]) => void} reveal
 * @property {(key: string) => Spot|null} spot Where a card is drawn now.
 * @property {() => { card: Card, faceUp: boolean, spot: Spot }[]} pileSpots
 * @property {(flight: { card: Card|null, from: Spot|null, to: Spot|null, faceUpFrom: boolean, faceUpTo: boolean }) => Promise<void>} fly
 * @property {(count: number) => void} setDeckCount
 * @property {(text: string) => void} toast
 * @property {(title: string, subtitle: string) => Promise<void>} burst
 */

/** Time between two dealt cards. */
const DEAL_GAP_MS = 90;
/** Time between two cards swept into a capture pile. */
const SWEEP_GAP_MS = 45;
/** A look at the capturing card before the pile is taken. */
const CAPTURE_PAUSE_MS = 450;
const LAST_TAKE_PAUSE_MS = 800;
/** Time to read why a Jack turned up at the opening goes back. */
const RETURN_PAUSE_MS = 1200;

/**
 * Plays one event.
 * @param {Stage} stage
 * @param {MatchEvent} event
 * @returns {Promise<void>}
 */
export async function animateEvent(stage, event) {
  switch (event.type) {
    case 'open':
      return openTable(stage, event);
    case 'deal':
      return deal(stage, event);
    case 'play':
      return play(stage, event);
    case 'capture':
      return capture(stage, event);
    case 'lastTake':
      return lastTake(stage, event);
    default:
      return stage.show(applyEvent(stage.view, event));
  }
}

/** Lays the opening cards one by one; a Jack turned up is shown, then put back into the deck. */
async function openTable(stage, { table, returned }) {
  const under = table.slice(0, -1);
  stage.show(opened(stage.view, []));
  for (let count = 1; count <= under.length; count += 1) await layOpening(stage, under.slice(0, count));
  for (const jack of returned) await returnJack(stage, under, jack);
  await layOpening(stage, table);
}

/** The view with only these opening cards laid out. */
function opened(view, cards) {
  return applyEvent(view, { type: 'open', table: cards, returned: [] });
}

/** Flies the last of the given opening cards from the deck to the table; only the fourth lands face up. */
async function layOpening(stage, cards) {
  const card = cards.at(-1);
  const from = stage.spot('deck');
  stage.show(opened(stage.view, cards), [card.id]);
  await stage.fly({ card, from, to: stage.spot(card.id), faceUpFrom: false, faceUpTo: cards.length === TABLE_SIZE });
  stage.reveal([card.id]);
}

async function returnJack(stage, under, jack) {
  await layOpening(stage, [...under, jack]);
  stage.toast(stage.tr.t('jackReturned', { card: stage.tr.card(jack) }));
  await wait(RETURN_PAUSE_MS);
  const from = stage.spot(jack.id);
  stage.show(opened(stage.view, under));
  await stage.fly({ card: jack, from, to: stage.spot('deck'), faceUpFrom: true, faceUpTo: false });
}

/** Deals one card at a time from the deck; yours land face up. */
async function deal(stage, event) {
  const from = stage.spot('deck');
  const left = stage.view.table.deck;
  const gap = motionOk() ? DEAL_GAP_MS : 0;
  stage.show(applyEvent(stage.view, event), event.cards.map(({ card }) => card.id));
  stage.setDeckCount(left);
  await Promise.all(event.cards.map(async ({ player, card }, i) => {
    await wait(i * gap);
    stage.setDeckCount(left - i - 1);
    const yours = player === HUMAN;
    await stage.fly({ card: yours ? card : null, from, to: stage.spot(card.id), faceUpFrom: false, faceUpTo: yours });
    stage.reveal([card.id]);
  }));
}

/** Moves a card from a hand onto the pile; the computer's card turns over on the way. */
async function play(stage, event) {
  const { player, card } = event;
  const from = stage.spot(card.id);
  stage.show(applyEvent(stage.view, event), [card.id]);
  await stage.fly({ card, from, to: stage.spot(card.id), faceUpFrom: player === HUMAN, faceUpTo: true });
  stage.reveal([card.id]);
}

/** A short look at the match, the burst if it is a pişti, then the pile goes to the taker. */
async function capture(stage, event) {
  await wait(CAPTURE_PAUSE_MS);
  if (event.pisti > 0) {
    const name = stage.tr.t(event.player === HUMAN ? 'you' : 'computer');
    await stage.burst(stage.tr.t('pistiBurst'), stage.tr.t('pistiBy', { name, points: event.pisti }));
  }
  await sweep(stage, event);
}

/** After the last card, whoever took a pile last also takes the cards left on the table. */
async function lastTake(stage, event) {
  stage.toast(stage.tr.t(event.player === HUMAN ? 'lastTakeYou' : 'lastTakeCpu'));
  await wait(LAST_TAKE_PAUSE_MS);
  await sweep(stage, event);
}

/** Sweeps the pile into the taker's capture pile, face down. */
async function sweep(stage, event) {
  const cards = stage.pileSpots();
  stage.show(applyEvent(stage.view, event));
  const to = stage.spot(`capture${event.player}`);
  const gap = motionOk() ? SWEEP_GAP_MS : 0;
  await Promise.all(cards.map(async ({ card, faceUp, spot }, i) => {
    await wait(i * gap);
    await stage.fly({ card, from: spot, to, faceUpFrom: faceUp, faceUpTo: false });
  }));
}
