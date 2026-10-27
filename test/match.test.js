import test from 'node:test';
import assert from 'node:assert/strict';
import { cardPoints, createDeck, parseCard, shuffle } from '../src/cards.js';
import {
  COMPUTER, DEFAULT_TARGET, HUMAN, TARGETS, applyMove, createMatch, matchWinner, startNextRound,
} from '../src/match.js';
import { createRng } from '../src/rng.js';

const cards = (...list) => list.map(parseCard);

/** A shuffled deck and the random stream it came from, as a new match or round takes them. */
function seeded(seed) {
  const rng = createRng(seed);
  return { deck: shuffle(createDeck(), rng), rng };
}

/** Deals the next round from a seeded deck. */
function dealNext(state, seed) {
  const { deck, rng } = seeded(seed);
  return startNextRound(state, deck, rng);
}

/**
 * A match on its very last move: the computer plays its last card, which
 * captures nothing, and you take the table as the last capturer. You end the
 * round with 27 cards worth 5 points (+3 majority), the computer with 25
 * cards worth 8, so both score 8 this round.
 */
function lastMoveOfRound(scores) {
  const zero = createDeck().filter((card) => cardPoints(card) === 0);
  const lastCard = zero[0];
  const round = {
    dealer: COMPUTER,
    turn: COMPUTER,
    deck: [],
    pile: [],
    hidden: 0,
    hands: [[], [lastCard]],
    captured: [
      [...cards('JC', 'JD', 'JH', 'JS', 'AS'), ...zero.slice(21)],
      [...cards('10D', '2C', 'AC', 'AD', 'AH'), ...zero.slice(1, 21)],
    ],
    pistis: [[], []],
    lastCapturer: HUMAN,
    seen: [],
    returned: [],
    finished: false,
  };
  const { state } = createMatch(seeded(1));
  return { state: { ...state, scores, roundNumber: 4, round }, lastCard };
}

test('matchWinner: nobody below the target; above it the higher score; a tie means another round', () => {
  assert.equal(matchWinner([100, 90], 101), null);
  assert.equal(matchWinner([101, 90], 101), HUMAN);
  assert.equal(matchWinner([90, 130], 101), COMPUTER);
  assert.equal(matchWinner([120, 110], 101), HUMAN);
  assert.equal(matchWinner([104, 110], 101), COMPUTER);
  assert.equal(matchWinner([105, 105], 101), null);
  assert.equal(matchWinner([51, 50], 51), HUMAN);
});

test('a match starts with round 1 dealt by the computer, so you lead', () => {
  const { state, events } = createMatch(seeded(3));
  assert.equal(state.phase, 'playing');
  assert.equal(state.roundNumber, 1);
  assert.deepEqual(state.scores, [0, 0]);
  assert.deepEqual(state.history, []);
  assert.equal(state.winner, null);
  assert.equal(state.round.dealer, COMPUTER);
  assert.equal(state.round.turn, HUMAN);
  assert.deepEqual(events.map((e) => e.type), ['open', 'deal']);
});

test('the target and level default to 101 and normal, and unknown values fall back to them', () => {
  assert.equal(DEFAULT_TARGET, 101);
  assert.ok(TARGETS.includes(DEFAULT_TARGET));
  const plain = createMatch(seeded(1)).state;
  assert.equal(plain.target, 101);
  assert.equal(plain.aiLevel, 'normal');
  const chosen = createMatch({ ...seeded(1), target: 51, aiLevel: 'easy' }).state;
  assert.equal(chosen.target, 51);
  assert.equal(chosen.aiLevel, 'easy');
  const odd = createMatch({ ...seeded(1), target: 7, aiLevel: 'genius' }).state;
  assert.equal(odd.target, 101);
  assert.equal(odd.aiLevel, 'normal');
});

test('the last move scores the round, adds it to the match and the history', () => {
  const { state, lastCard } = lastMoveOfRound([40, 30]);
  const { state: next, events } = applyMove(state, lastCard.id);
  assert.deepEqual(events.map((e) => e.type), ['play', 'lastTake', 'roundEnd']);
  const [you, computer] = next.history.at(-1);
  assert.deepEqual([you.cards, you.cardPoints, you.majority, you.total], [27, 5, 3, 8]);
  assert.deepEqual([computer.cards, computer.cardPoints, computer.majority, computer.total], [25, 8, 0, 8]);
  assert.deepEqual(next.scores, [48, 38]);
  assert.deepEqual(events.at(-1), { type: 'roundEnd', breakdown: [you, computer], scores: [48, 38] });
  assert.equal(next.phase, 'roundOver');
  assert.equal(next.winner, null);
});

test('reaching the target ends the match with a winner', () => {
  const { state, lastCard } = lastMoveOfRound([95, 93]);
  const { state: next, events } = applyMove(state, lastCard.id);
  assert.deepEqual(next.scores, [103, 101]);
  assert.equal(next.phase, 'matchOver');
  assert.equal(next.winner, HUMAN);
  assert.deepEqual(events.at(-1), { type: 'matchEnd', winner: HUMAN, scores: [103, 101] });
});

test('a tie on the target does not end the match: another round is dealt', () => {
  const { state, lastCard } = lastMoveOfRound([93, 93]);
  const { state: tied } = applyMove(state, lastCard.id);
  assert.deepEqual(tied.scores, [101, 101]);
  assert.equal(tied.phase, 'roundOver');
  assert.equal(tied.winner, null);
  const { state: next, events } = dealNext(tied, 8);
  assert.equal(next.phase, 'playing');
  assert.equal(next.roundNumber, 5);
  assert.deepEqual(events.map((e) => e.type), ['open', 'deal']);
});

test('the dealer alternates every round', () => {
  const { state, lastCard } = lastMoveOfRound([10, 10]);
  const ended = applyMove(state, lastCard.id).state;
  const second = dealNext(ended, 2).state;
  assert.equal(second.round.dealer, HUMAN);
  assert.equal(second.round.turn, COMPUTER);
});

test('moves and deals are refused in the wrong phase', () => {
  const { state } = createMatch(seeded(4));
  assert.throws(() => dealNext(state, 5), /Cannot deal during playing/);
  const over = { ...state, phase: 'roundOver' };
  assert.throws(() => applyMove(over, state.round.hands[HUMAN][0].id), /Cannot play during roundOver/);
});
