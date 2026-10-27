/**
 * Rules of one Pişti round (one pass through the deck) as pure functions.
 * A round is never mutated: every move returns a new round plus the events
 * that happened, in order, so the UI can animate them.
 */
import { isJack } from './cards.js';
import { randomInt } from './rng.js';

/** @typedef {import('./cards.js').Card} Card */
/** @typedef {0|1} Player 0 = you, 1 = the computer. */
/** @typedef {{ card: Card, points: number }} Pisti The card that made a pişti and its points (10 or 20). */
/** @typedef {{ player: Player, card: Card }} DealtCard */

/**
 * @typedef {object} Round
 * @property {Player} dealer The dealer plays last; the other player leads.
 * @property {Player} turn Whose move it is.
 * @property {Card[]} deck Undealt cards; deck[0] is dealt next.
 * @property {Card[]} pile Cards on the table; the last one is on top.
 * @property {number} hidden Face-down cards at the bottom of the pile: 3 at the opening, 0 after the first capture.
 * @property {Card[][]} hands hands[player]: the cards in each hand.
 * @property {Card[][]} captured captured[player]: each player's capture pile.
 * @property {Pisti[][]} pistis pistis[player]: each player's piştis.
 * @property {Player|null} lastCapturer Who took a pile last. Never null at the end: at least one Jack is
 *   always dealt, and a Jack played on a pile that was never taken captures it.
 * @property {Card[]} seen Every card shown face up this round: the opening card, then each played card.
 * @property {Card[]} returned Jacks turned up at the opening that went back into the deck.
 * @property {boolean} finished True once all 52 cards are in capture piles.
 */

/**
 * @typedef {{ type: 'open', table: Card[], returned: Card[] }
 *   | { type: 'deal', cards: DealtCard[] }
 *   | { type: 'play', player: Player, card: Card }
 *   | { type: 'capture', player: Player, cards: Card[], pisti: number }
 *   | { type: 'lastTake', player: Player, cards: Card[] }} RoundEvent
 */

/**
 * @typedef {object} PlayerView
 * @property {Card[]} hand The player's own cards.
 * @property {Card[]} pile The face-up cards on the table, top card last.
 * @property {number} pileCount All cards on the table, face-down ones included.
 * @property {Card[]} seen Every card shown face up this round.
 */

/** Cards laid on the table at the opening; the last one is face up. */
export const TABLE_SIZE = 4;
/** Cards each player gets per deal. */
export const HAND_SIZE = 4;
/** Points for a pişti. */
export const PISTI_POINTS = 10;
/** Points for a pişti made by a Jack on a single Jack. */
export const JACK_PISTI_POINTS = 20;

/**
 * The other player.
 * @param {Player} player
 * @returns {Player}
 */
export function otherPlayer(player) {
  return player === 0 ? 1 : 0;
}

/**
 * Lays out the opening table from the top of the deck: four cards, the last
 * one face up. While the face-up card is a Jack, the next card is turned up
 * instead. Each Jack turned up goes back into the deck at a random place, so
 * nobody can tell who will be dealt it.
 * @param {readonly Card[]} deck A shuffled deck; deck[0] is on top.
 * @param {() => number} rng Picks where the returned Jacks go.
 * @returns {{ table: Card[], deck: Card[], returned: Card[] }} returned lists the Jacks turned up, in order.
 */
export function openTable(deck, rng) {
  const under = deck.slice(0, TABLE_SIZE - 1);
  const rest = deck.slice(TABLE_SIZE - 1);
  const faceUpAt = rest.findIndex((card) => !isJack(card));
  const returned = rest.slice(0, faceUpAt);
  const remaining = rest.slice(faceUpAt + 1);
  for (const jack of returned) remaining.splice(randomInt(rng, remaining.length + 1), 0, jack);
  return { table: [...under, rest[faceUpAt]], deck: remaining, returned };
}

/**
 * Deals four cards to each player from the top of the deck, one at a time,
 * starting with the non-dealer.
 * @param {readonly Card[]} deck
 * @param {Player} dealer
 * @returns {{ hands: Card[][], deck: Card[], dealt: DealtCard[] }} dealt lists the cards in dealing order.
 */
export function dealHands(deck, dealer) {
  const first = otherPlayer(dealer);
  const dealt = deck
    .slice(0, 2 * HAND_SIZE)
    .map((card, i) => ({ player: i % 2 === 0 ? first : dealer, card }));
  const hands = [0, 1].map((player) => dealt.filter((d) => d.player === player).map((d) => d.card));
  return { hands, deck: deck.slice(2 * HAND_SIZE), dealt };
}

/**
 * Starts a round: opens the table, then deals the first hands. The non-dealer leads.
 * @param {readonly Card[]} deck A shuffled 52-card deck.
 * @param {Player} dealer
 * @param {() => number} rng Puts a Jack turned up at the opening back into the deck at a random place.
 * @returns {{ round: Round, events: RoundEvent[] }}
 */
export function createRound(deck, dealer, rng) {
  const opening = openTable(deck, rng);
  const deal = dealHands(opening.deck, dealer);
  const round = {
    dealer,
    turn: otherPlayer(dealer),
    deck: deal.deck,
    pile: opening.table,
    hidden: TABLE_SIZE - 1,
    hands: deal.hands,
    captured: [[], []],
    pistis: [[], []],
    lastCapturer: null,
    seen: [opening.table[TABLE_SIZE - 1]],
    returned: opening.returned,
    finished: false,
  };
  const events = [
    { type: 'open', table: opening.table, returned: opening.returned },
    { type: 'deal', cards: deal.dealt },
  ];
  return { round, events };
}

/**
 * Whether the card takes the pile: same rank as the top card, or a Jack on any non-empty pile.
 * @param {readonly Card[]} pile
 * @param {Card} card
 * @returns {boolean}
 */
export function canCapture(pile, card) {
  const top = pile[pile.length - 1];
  return top !== undefined && (card.rank === top.rank || isJack(card));
}

/**
 * Pişti points for playing the card on the pile: 10 for taking a single card
 * of the same rank, 20 for a Jack on a single Jack, else 0 (a Jack on a
 * single non-Jack card is an ordinary capture).
 * @param {readonly Card[]} pile
 * @param {Card} card
 * @returns {number}
 */
export function pistiValue(pile, card) {
  if (pile.length !== 1 || pile[0].rank !== card.rank) return 0;
  return isJack(card) ? JACK_PISTI_POINTS : PISTI_POINTS;
}

/**
 * Plays a card from the hand of the player whose turn it is. Takes care of the
 * capture, the next deal once both hands are empty and, after the last card,
 * the last capturer taking the cards left on the table.
 * @param {Round} round
 * @param {string} cardId Id of a card in the current player's hand.
 * @returns {{ round: Round, events: RoundEvent[] }}
 */
export function playCard(round, cardId) {
  const player = round.turn;
  const card = round.hands[player].find((c) => c.id === cardId);
  if (!card) throw new Error(`Illegal move: ${cardId}`);
  const moved = {
    ...round,
    turn: otherPlayer(player),
    hands: withEntry(round.hands, player, round.hands[player].filter((c) => c !== card)),
    seen: [...round.seen, card],
  };
  /** @type {RoundEvent} */
  const played = { type: 'play', player, card };
  if (!canCapture(round.pile, card)) {
    return afterPlay({ ...moved, pile: [...round.pile, card] }, [played]);
  }
  const taken = takePile(moved, player, card);
  return afterPlay(taken.round, [played, taken.event]);
}

/**
 * What a player may know: the own hand, the face-up cards on the table and
 * every card seen so far. The computer decides from this view only, so it
 * never sees the other hand or the deck.
 * @param {Round} round
 * @param {Player} player
 * @returns {PlayerView}
 */
export function playerView(round, player) {
  return {
    hand: round.hands[player],
    pile: round.pile.slice(round.hidden),
    pileCount: round.pile.length,
    seen: round.seen,
  };
}

/** Copy of a two-player list with one entry replaced. */
function withEntry(list, index, value) {
  return list.map((item, i) => (i === index ? value : item));
}

/** The player takes the whole pile with the card; records a pişti if it is one. */
function takePile(round, player, card) {
  const cards = [...round.pile, card];
  const pisti = pistiValue(round.pile, card);
  const pistis = pisti > 0
    ? withEntry(round.pistis, player, [...round.pistis[player], { card, points: pisti }])
    : round.pistis;
  return {
    round: {
      ...round,
      pile: [],
      hidden: 0,
      lastCapturer: player,
      captured: withEntry(round.captured, player, [...round.captured[player], ...cards]),
      pistis,
    },
    event: /** @type {RoundEvent} */ ({ type: 'capture', player, cards, pisti }),
  };
}

/** Deals again when both hands are empty, or ends the round when the deck is empty too. */
function afterPlay(round, events) {
  if (round.hands.some((hand) => hand.length > 0)) return { round, events };
  if (round.deck.length > 0) {
    const deal = dealHands(round.deck, round.dealer);
    return {
      round: { ...round, hands: deal.hands, deck: deal.deck },
      events: [...events, { type: 'deal', cards: deal.dealt }],
    };
  }
  return finishRound(round, events);
}

/** The last capturer takes what is left on the table; this is never a pişti. */
function finishRound(round, events) {
  const finished = { ...round, finished: true };
  if (round.pile.length === 0) return { round: finished, events };
  const taker = /** @type {Player} */ (round.lastCapturer);
  return {
    round: {
      ...finished,
      pile: [],
      captured: withEntry(round.captured, taker, [...round.captured[taker], ...round.pile]),
    },
    events: [...events, { type: 'lastTake', player: taker, cards: round.pile }],
  };
}
