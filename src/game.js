/**
 * Game controller for the UI: owns the seeded random streams and the current
 * match state, and turns UI actions into events to animate. No DOM access.
 */
import { chooseCard } from './ai.js';
import { createDeck, shuffle } from './cards.js';
import { COMPUTER, HUMAN, applyMove, createMatch, startNextRound } from './match.js';
import { playerView } from './rules.js';
import { createRng } from './rng.js';

/** @typedef {import('./match.js').MatchState} MatchState */
/** @typedef {import('./match.js').MatchEvent} MatchEvent */
/** @typedef {import('./ai.js').AiLevel} AiLevel */

/**
 * @typedef {object} Game
 * @property {MatchEvent[]} openingEvents The open and deal events of round 1, which is dealt
 *   when the game is created, so the UI can animate them.
 * @property {() => MatchState} getState The current state; treat it as read-only.
 * @property {(cardId: string) => MatchEvent[]} play Your move. Returns [] and changes nothing
 *   when it is not your turn or the card is not in your hand.
 * @property {() => MatchEvent[]} playAi The computer's move; [] when it is not its turn.
 * @property {() => MatchEvent[]} nextRound Deals the next round once a round is over; [] otherwise.
 */

/** Salt that gives the computer a random stream of its own, apart from the shuffles. */
const AI_STREAM = 0x9e3779b9;

/**
 * Creates a game; round 1 is dealt at once and you lead. The same seed and
 * the same moves always give the same game.
 * @param {{ seed?: number, target?: number, aiLevel?: AiLevel }} [options]
 * @returns {Game}
 */
export function createGame({ seed = 1, target, aiLevel } = {}) {
  const shuffleRng = createRng(seed);
  const aiRng = createRng(seed ^ AI_STREAM);
  const newDeck = () => shuffle(createDeck(), shuffleRng);
  const opening = createMatch({ deck: newDeck(), rng: shuffleRng, target, aiLevel });
  let { state } = opening;

  /** Keeps the new state and hands back its events. */
  function commit(result) {
    state = result.state;
    return result.events;
  }

  /** Whether the given player may move now. */
  function isTurnOf(player) {
    return state.phase === 'playing' && state.round.turn === player;
  }

  return {
    openingEvents: opening.events,
    getState: () => state,
    play(cardId) {
      const inHand = state.round.hands[HUMAN].some((card) => card.id === cardId);
      return isTurnOf(HUMAN) && inHand ? commit(applyMove(state, cardId)) : [];
    },
    playAi() {
      if (!isTurnOf(COMPUTER)) return [];
      const card = chooseCard(playerView(state.round, COMPUTER), state.aiLevel, aiRng);
      return commit(applyMove(state, card.id));
    },
    nextRound() {
      return state.phase === 'roundOver' ? commit(startNextRound(state, newDeck(), shuffleRng)) : [];
    },
  };
}
