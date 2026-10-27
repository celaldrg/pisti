import test from 'node:test';
import assert from 'node:assert/strict';
import { TOTAL_CARD_POINTS } from '../src/cards.js';
import { createGame } from '../src/game.js';
import { COMPUTER, HUMAN, TARGETS } from '../src/match.js';

/** Plays for you with a simple rule: always the first, or always the last, card in hand. */
function playYourTurn(game, pick = 'first') {
  const hand = game.getState().round.hands[HUMAN];
  return game.play((pick === 'first' ? hand[0] : hand.at(-1)).id);
}

/** Makes the next move: the next deal, the computer's move or yours. It must change the game, so loops always end. */
function nextMove(game, pick) {
  const { phase, round } = game.getState();
  let events;
  if (phase === 'roundOver') events = game.nextRound();
  else if (round.turn === COMPUTER) events = game.playAi();
  else events = playYourTurn(game, pick);
  assert.notEqual(events.length, 0, 'a move that changes nothing would loop forever');
  return events;
}

/** Drives a game to the end of the match; returns every event. */
function playMatch(game, pick) {
  const events = [];
  while (game.getState().phase !== 'matchOver') events.push(...nextMove(game, pick));
  return events;
}

test('a new game deals round 1 at once and you lead', () => {
  const state = createGame({ seed: 12 }).getState();
  assert.equal(state.phase, 'playing');
  assert.equal(state.roundNumber, 1);
  assert.equal(state.target, 101);
  assert.equal(state.aiLevel, 'normal');
  assert.equal(state.round.turn, HUMAN);
  assert.deepEqual(state.round.hands.map((hand) => hand.length), [4, 4]);
});

test('the opening events open the table and deal round 1, exactly as the state holds it', () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const game = createGame({ seed });
    const { round } = game.getState();
    const [open, deal, ...more] = game.openingEvents;
    assert.deepEqual(more, []);
    assert.equal(open.type, 'open');
    assert.deepEqual(open.table, round.pile);
    assert.deepEqual(open.returned, round.returned);
    assert.equal(deal.type, 'deal');
    for (const player of [HUMAN, COMPUTER]) {
      assert.deepEqual(deal.cards.filter((dealt) => dealt.player === player).map((dealt) => dealt.card), round.hands[player]);
    }
  }
});

test('the same seed and the same moves replay the same game; another seed deals differently', () => {
  const a = createGame({ seed: 99, aiLevel: 'easy' });
  const b = createGame({ seed: 99, aiLevel: 'easy' });
  assert.deepEqual(playMatch(a), playMatch(b));
  assert.deepEqual(a.getState(), b.getState());
  assert.notDeepEqual(createGame({ seed: 100 }).getState().round, createGame({ seed: 99 }).getState().round);
});

test('the deals depend only on the seed, not on how anyone plays', () => {
  const a = createGame({ seed: 31 });
  const b = createGame({ seed: 31 });
  for (const [game, pick] of [[a, 'first'], [b, 'last']]) {
    while (game.getState().phase === 'playing') nextMove(game, pick);
    game.nextRound();
  }
  assert.notDeepEqual(a.getState().history, b.getState().history);
  assert.deepEqual(a.getState().round, b.getState().round);
});

test('out-of-turn and unknown moves are ignored and change nothing', () => {
  const game = createGame({ seed: 4 });
  const start = game.getState();
  assert.deepEqual(game.playAi(), [], 'not the computer\'s turn');
  assert.deepEqual(game.play(start.round.hands[COMPUTER][0].id), [], 'not your card');
  assert.deepEqual(game.play('XX'), []);
  assert.deepEqual(game.nextRound(), [], 'the round is still on');
  assert.equal(game.getState(), start);

  const events = playYourTurn(game);
  assert.equal(events[0].type, 'play');
  const afterYou = game.getState();
  assert.equal(afterYou.round.turn, COMPUTER);
  assert.deepEqual(playYourTurn(game), [], 'you cannot move twice');
  assert.equal(game.getState(), afterYou);
  assert.equal(game.playAi()[0].type, 'play');
  assert.equal(game.getState().round.turn, HUMAN);
});

test('full matches end with a winner on or above the target and consistent totals', () => {
  for (let seed = 1; seed <= 60; seed += 1) {
    const target = TARGETS[seed % TARGETS.length];
    const game = createGame({ seed, target, aiLevel: seed % 2 ? 'easy' : 'normal' });
    const events = playMatch(game, seed % 3 ? 'first' : 'last');
    const state = game.getState();
    const { winner, scores, history } = state;
    assert.equal(state.phase, 'matchOver');
    assert.ok(scores[winner] >= target && scores[winner] > scores[1 - winner]);
    assert.equal(history.length, state.roundNumber);
    for (const player of [HUMAN, COMPUTER]) {
      assert.equal(scores[player], history.reduce((sum, round) => sum + round[player].total, 0));
    }
    for (const [you, computer] of history) assert.equal(you.cardPoints + computer.cardPoints, TOTAL_CARD_POINTS);
    assert.equal(events.filter((e) => e.type === 'roundEnd').length, history.length);
    assert.deepEqual(events.at(-1), { type: 'matchEnd', winner, scores });
    assert.deepEqual(game.nextRound(), [], 'no rounds after the match');
  }
});
