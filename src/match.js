/**
 * A match: rounds are dealt until a player reaches the target score. Pure
 * state transitions on plain objects; game.js wraps them for the UI.
 */
import { AI_LEVELS } from './ai.js';
import { createRound, otherPlayer, playCard } from './rules.js';
import { scoreRound } from './scoring.js';

/** @typedef {import('./cards.js').Card} Card */
/** @typedef {import('./rules.js').Player} Player */
/** @typedef {import('./rules.js').Round} Round */
/** @typedef {import('./rules.js').RoundEvent} RoundEvent */
/** @typedef {import('./scoring.js').RoundScore} RoundScore */
/** @typedef {import('./ai.js').AiLevel} AiLevel */
/** @typedef {'playing'|'roundOver'|'matchOver'} Phase */

/**
 * @typedef {object} MatchState
 * @property {number} target Score that ends the match.
 * @property {AiLevel} aiLevel
 * @property {Phase} phase
 * @property {number} roundNumber The current round, starting at 1.
 * @property {number[]} scores Match totals [you, computer].
 * @property {RoundScore[][]} history Breakdown [you, computer] of every finished round.
 * @property {Player|null} winner Set once the match is over.
 * @property {Round} round The current, or just finished, round.
 */

/**
 * @typedef {RoundEvent
 *   | { type: 'roundEnd', breakdown: RoundScore[], scores: number[] }
 *   | { type: 'matchEnd', winner: Player, scores: number[] }} MatchEvent
 */

/** Player index of the person at the screen. */
export const HUMAN = 0;
/** Player index of the computer. */
export const COMPUTER = 1;
/** Match targets the UI offers. */
export const TARGETS = Object.freeze([51, 101, 151]);
/** The usual match target. */
export const DEFAULT_TARGET = 101;

/**
 * Starts a match. The computer deals the first round, so you lead.
 * A missing or unknown target or level falls back to 101 / 'normal'.
 * @param {{ deck: Card[], rng: () => number, target?: number, aiLevel?: AiLevel }} options
 *   deck: a shuffled deck for round 1; rng: puts a Jack turned up at the opening back into the deck.
 * @returns {{ state: MatchState, events: MatchEvent[] }}
 */
export function createMatch({ deck, rng, target, aiLevel }) {
  const { round, events } = createRound(deck, COMPUTER, rng);
  const state = {
    target: TARGETS.includes(target) ? target : DEFAULT_TARGET,
    aiLevel: AI_LEVELS.includes(aiLevel) ? aiLevel : 'normal',
    phase: 'playing',
    roundNumber: 1,
    scores: [0, 0],
    history: [],
    winner: null,
    round,
  };
  return { state, events };
}

/**
 * Plays a card for whoever's turn it is and scores the round after its last card.
 * @param {MatchState} state Must be in the 'playing' phase.
 * @param {string} cardId A card in the current player's hand.
 * @returns {{ state: MatchState, events: MatchEvent[] }}
 */
export function applyMove(state, cardId) {
  if (state.phase !== 'playing') throw new Error(`Cannot play during ${state.phase}`);
  const { round, events } = playCard(state.round, cardId);
  const next = { ...state, round };
  return round.finished ? endRound(next, events) : { state: next, events };
}

/**
 * Deals the next round; the dealer alternates every round.
 * @param {MatchState} state Must be in the 'roundOver' phase.
 * @param {Card[]} deck A shuffled 52-card deck.
 * @param {() => number} rng Puts a Jack turned up at the opening back into the deck.
 * @returns {{ state: MatchState, events: MatchEvent[] }}
 */
export function startNextRound(state, deck, rng) {
  if (state.phase !== 'roundOver') throw new Error(`Cannot deal during ${state.phase}`);
  const { round, events } = createRound(deck, otherPlayer(state.round.dealer), rng);
  return { state: { ...state, round, phase: 'playing', roundNumber: state.roundNumber + 1 }, events };
}

/**
 * The match winner: whoever is ahead once someone has reached the target.
 * A tie on or above the target means one more round.
 * @param {number[]} scores [you, computer]
 * @param {number} target
 * @returns {Player|null}
 */
export function matchWinner([you, computer], target) {
  if (Math.max(you, computer) < target || you === computer) return null;
  return you > computer ? HUMAN : COMPUTER;
}

/** Adds the finished round to the match totals and checks for a winner. */
function endRound(state, events) {
  const breakdown = scoreRound(state.round);
  const scores = state.scores.map((score, player) => score + breakdown[player].total);
  const winner = matchWinner(scores, state.target);
  const roundEnd = { type: 'roundEnd', breakdown, scores };
  return {
    state: {
      ...state,
      scores,
      winner,
      history: [...state.history, breakdown],
      phase: winner === null ? 'roundOver' : 'matchOver',
    },
    events: winner === null
      ? [...events, roundEnd]
      : [...events, roundEnd, { type: 'matchEnd', winner, scores }],
  };
}
