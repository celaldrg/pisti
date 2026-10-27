/**
 * Round scoring: card points, the majority bonus and pişti points.
 */
import { isJack, sumPoints } from './cards.js';

/** @typedef {import('./cards.js').Card} Card */
/** @typedef {import('./rules.js').Pisti} Pisti */

/**
 * @typedef {object} RoundScore
 * @property {number} cards Cards in the capture pile.
 * @property {number} jacks Jacks captured (1 point each).
 * @property {number} aces Aces captured (1 point each).
 * @property {boolean} twoOfClubs Holds the 2 of clubs (2 points).
 * @property {boolean} tenOfDiamonds Holds the 10 of diamonds (3 points).
 * @property {number} cardPoints Points from the cards above; both players together always have 13.
 * @property {number} majority 3 for the player with more cards, 0 for both on a 26-26 tie.
 * @property {number} pistiCount
 * @property {number} pistiPoints 10 per pişti, 20 for a Jack on a Jack.
 * @property {number} total
 */

/** Bonus for capturing more cards than the opponent. */
export const MAJORITY_POINTS = 3;

/**
 * Scores both capture piles. Also works mid-round as a running tally.
 * @param {{ captured: Card[][], pistis: Pisti[][] }} round
 * @returns {RoundScore[]} [you, computer]
 */
export function scoreRound({ captured, pistis }) {
  return [0, 1].map((player) => scorePlayer(captured[player], captured[1 - player].length, pistis[player]));
}

/** Score of one capture pile against the size of the other one. */
function scorePlayer(cards, opponentCards, pistis) {
  const cardPoints = sumPoints(cards);
  const majority = cards.length > opponentCards ? MAJORITY_POINTS : 0;
  const pistiPoints = pistis.reduce((total, pisti) => total + pisti.points, 0);
  return {
    cards: cards.length,
    jacks: cards.filter(isJack).length,
    aces: cards.filter((card) => card.rank === 'A').length,
    twoOfClubs: cards.some((card) => card.id === '2C'),
    tenOfDiamonds: cards.some((card) => card.id === '10D'),
    cardPoints,
    majority,
    pistiCount: pistis.length,
    pistiPoints,
    total: cardPoints + majority + pistiPoints,
  };
}
