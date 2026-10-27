/**
 * The standard 52-card deck, card points and a seeded shuffle.
 */
import { randomInt } from './rng.js';

/** @typedef {'C'|'D'|'H'|'S'} Suit Clubs, diamonds, hearts, spades. */
/** @typedef {'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'} Rank */
/** @typedef {{ readonly id: string, readonly rank: Rank, readonly suit: Suit }} Card */

/** @type {readonly Suit[]} */
export const SUITS = Object.freeze(['C', 'D', 'H', 'S']);

/** @type {readonly Rank[]} */
export const RANKS = Object.freeze(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);

/** Card points in every round: 4 Jacks + 4 Aces + 2 of clubs (2) + 10 of diamonds (3). */
export const TOTAL_CARD_POINTS = 13;

/** Cards worth more than their rank alone. */
const SPECIAL_CARDS = Object.freeze({ '2C': 2, '10D': 3 });

/**
 * Builds a card from its id: rank followed by suit, e.g. "10D" or "JS".
 * @param {string} id
 * @returns {Card}
 */
export function parseCard(id) {
  const rank = /** @type {Rank} */ (id.slice(0, -1));
  const suit = /** @type {Suit} */ (id.slice(-1));
  if (!RANKS.includes(rank) || !SUITS.includes(suit)) throw new Error(`Unknown card: ${id}`);
  return Object.freeze({ id, rank, suit });
}

/**
 * Creates a fresh, ordered 52-card deck.
 * @returns {Card[]}
 */
export function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => parseCard(rank + suit)));
}

/**
 * Returns a shuffled copy of the cards (Fisher-Yates); the input is not changed.
 * @param {readonly Card[]} cards
 * @param {() => number} rng A generator from createRng.
 * @returns {Card[]}
 */
export function shuffle(cards, rng) {
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Tells whether a card is a Jack, the card that takes any pile.
 * @param {Card} card
 * @returns {boolean}
 */
export function isJack(card) {
  return card.rank === 'J';
}

/**
 * Points a captured card is worth when the round is scored.
 * @param {Card} card
 * @returns {number} 1 for a Jack or an Ace, 2 for the 2 of clubs, 3 for the 10 of diamonds, else 0.
 */
export function cardPoints(card) {
  if (card.rank === 'J' || card.rank === 'A') return 1;
  return SPECIAL_CARDS[card.id] ?? 0;
}

/**
 * Adds up the card points of a list of cards.
 * @param {readonly Card[]} cards
 * @returns {number}
 */
export function sumPoints(cards) {
  return cards.reduce((total, card) => total + cardPoints(card), 0);
}
