/**
 * The ?demo position used for the README screenshot: round 2 of a match,
 * five cards on the table and one pişti already in your capture pile.
 */
import { chooseCard } from './ai.js';
import { createGame } from './game.js';
import { COMPUTER, HUMAN } from './match.js';
import { playerView } from './rules.js';
import { createRng } from './rng.js';

/** @typedef {import('./game.js').Game} Game */
/** @typedef {import('./match.js').MatchState} MatchState */

/** First seed tried; it reaches the position directly. */
const DEMO_SEED = 155;
/** Further seeds tried if the rules or the AI ever change. */
const SEEDS_TO_TRY = 200;
const DEMO_ROUND = 2;
const DEMO_PILE_SIZE = 5;
const DEMO_MIN_HAND = 3;
/** A round takes fewer moves than it has cards (48 plays, then the next deal), so a replay still going after this is stuck. */
const MAX_MOVES = DEMO_ROUND * 52;

/**
 * Builds the demo position deterministically: the normal AI plays both sides
 * of seeded games until the position appears. Play continues normally from it.
 * @param {(options: { seed: number }) => Game} [makeGame] Makes the game for a seed; tests pass a broken one.
 * @returns {Game}
 * @throws {Error} When no seed reaches the position, or when a move changes nothing (rather than looping forever).
 */
export function createDemoGame(makeGame = createGame) {
  for (let seed = DEMO_SEED; seed < DEMO_SEED + SEEDS_TO_TRY; seed += 1) {
    const game = playToDemo(makeGame({ seed }), seed);
    if (game) return game;
  }
  throw new Error('No demo position found');
}

/** Plays a seeded game up to the demo position; null if round 2 ends without it. */
function playToDemo(game, seed) {
  const yourRng = createRng(seed);
  for (let moves = 0; moves < MAX_MOVES; moves += 1) {
    const state = game.getState();
    if (isDemoPosition(state)) return game;
    if (state.roundNumber > DEMO_ROUND || state.phase === 'matchOver') return null;
    if (nextMove(game, state, yourRng).length === 0) break;
  }
  throw new Error(`The demo replay of seed ${seed} is stuck`);
}

/** Deals the next round, or makes the next move: the computer's, or yours picked by the Normal player. */
function nextMove(game, { phase, round }, yourRng) {
  if (phase === 'roundOver') return game.nextRound();
  if (round.turn === COMPUTER) return game.playAi();
  return game.play(chooseCard(playerView(round, HUMAN), 'normal', yourRng).id);
}

/**
 * Round 2, your turn mid-round, a 5-card pile, both capture piles started and
 * exactly one pişti, yours.
 * @param {MatchState} state
 * @returns {boolean}
 */
function isDemoPosition({ roundNumber, phase, round }) {
  return roundNumber === DEMO_ROUND
    && phase === 'playing'
    && round.turn === HUMAN
    && round.pile.length === DEMO_PILE_SIZE
    && round.pistis[HUMAN].length === 1
    && round.pistis[COMPUTER].length === 0
    && round.captured[COMPUTER].length > 0
    && round.hands[HUMAN].length >= DEMO_MIN_HAND
    && round.deck.length > 0;
}
