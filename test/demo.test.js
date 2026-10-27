import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeck } from '../src/cards.js';
import { createDemoGame } from '../src/demo.js';
import { createGame } from '../src/game.js';
import { COMPUTER, HUMAN } from '../src/match.js';

/** A game maker whose games ignore your moves: play changes nothing and returns these events. */
const ignoringYou = (events) => (options) => ({ ...createGame(options), play: () => events });

test('?demo: round 2 mid-round, your turn, a 5-card pile and one pişti already scored', () => {
  const { phase, roundNumber, scores, round } = createDemoGame().getState();
  assert.equal(phase, 'playing');
  assert.equal(roundNumber, 2);
  assert.ok(scores[HUMAN] + scores[COMPUTER] > 0, 'round 1 has been scored');
  assert.equal(round.turn, HUMAN);
  assert.equal(round.pile.length, 5);
  assert.equal(round.hidden, 0);
  assert.equal(round.pistis[HUMAN].length, 1);
  assert.equal(round.pistis[COMPUTER].length, 0);
  assert.ok(round.captured[HUMAN].length > 0 && round.captured[COMPUTER].length > 0);
  assert.ok(round.hands[HUMAN].length >= 3);
  assert.ok(round.deck.length > 0);
  const everyId = [...round.deck, ...round.pile, ...round.hands.flat(), ...round.captured.flat()].map((card) => card.id);
  assert.deepEqual(everyId.sort(), createDeck().map((card) => card.id).sort());
});

test('?demo is the same position every time', () => {
  assert.deepEqual(createDemoGame().getState(), createDemoGame().getState());
});

test('a demo replay that stops moving throws at once instead of looping forever', () => {
  assert.throws(() => createDemoGame(ignoringYou([])), /stuck/, 'a refused move');
  assert.throws(() => createDemoGame(ignoringYou([{ type: 'play' }])), /stuck/, 'a move that reports events but changes nothing');
});

test('play goes on normally from the demo position', () => {
  const game = createDemoGame();
  const card = game.getState().round.hands[HUMAN][0];
  assert.equal(game.play(card.id)[0].type, 'play');
  assert.equal(game.getState().round.turn, COMPUTER);
  assert.equal(game.playAi()[0].type, 'play');
  assert.equal(game.getState().round.turn, HUMAN);
});
