import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCard } from '../src/cards.js';
import { createDemoGame } from '../src/demo.js';
import { createGame } from '../src/game.js';
import { COMPUTER, HUMAN } from '../src/match.js';
import { createRng, randomInt } from '../src/rng.js';
import { TABLE_SIZE } from '../src/rules.js';
import { applyEvent, newMatchView, viewFromState } from '../src/table-model.js';

const cards = (...list) => list.map(parseCard);
const ids = (list) => list.map((card) => card.id);

/** Makes the next move of a match: yours with a seeded random card, the computer's, or the next deal. */
function nextMove(game, rng) {
  const { phase, round } = game.getState();
  if (phase === 'roundOver') return game.nextRound();
  if (round.turn === COMPUTER) return game.playAi();
  const hand = round.hands[HUMAN];
  return game.play(hand[randomInt(rng, hand.length)].id);
}

test('replaying every move\'s events reproduces the game state exactly (150 seeded matches)', () => {
  let moves = 0;
  for (let seed = 1; seed <= 150; seed += 1) {
    const game = createGame({ seed, target: 51, aiLevel: seed % 2 ? 'easy' : 'normal' });
    const rng = createRng(seed * 7);
    let view = game.openingEvents.reduce(applyEvent, newMatchView());
    assert.deepEqual(view, viewFromState(game.getState()), 'after the opening deal');
    while (game.getState().phase !== 'matchOver') {
      const events = nextMove(game, rng);
      assert.notEqual(events.length, 0, 'a move that changes nothing would loop forever');
      view = events.reduce(applyEvent, view);
      assert.deepEqual(view, viewFromState(game.getState()));
      moves += 1;
    }
  }
  assert.ok(moves > 150 * 48, `${moves} moves`);
});

test('a new match view holds the whole deck and nothing else', () => {
  const { table, scores, history } = newMatchView();
  assert.equal(table.deck, 52);
  assert.deepEqual([table.pile, table.hands, table.captured, table.pistis], [[], [[], []], [[], []], [[], []]]);
  assert.equal(table.hidden, 0);
  assert.deepEqual(scores, [0, 0]);
  assert.deepEqual(history, []);
});

test('partial opening events give the in-between tables of the opening animation', () => {
  const opening = cards('3C', '9D', 'KH', '7S');
  const counts = [0, 1, 2, 3, 4].map((n) => {
    const { table } = applyEvent(newMatchView(), { type: 'open', table: opening.slice(0, n), returned: [] });
    return [table.deck, table.pile.length, table.hidden];
  });
  assert.deepEqual(counts, [[52, 0, 0], [51, 1, 1], [50, 2, 2], [49, 3, 3], [48, 4, TABLE_SIZE - 1]]);
});

test('an opening clears the previous round but keeps the match scores and history', () => {
  const game = createDemoGame();
  const before = viewFromState(game.getState());
  const { table, scores, history } = applyEvent(before, { type: 'open', table: [], returned: [] });
  assert.equal(table.deck, 52);
  assert.deepEqual(table.captured, [[], []]);
  assert.deepEqual(table.pistis, [[], []]);
  assert.equal(scores, before.scores);
  assert.equal(history, before.history);
});

test('single dealt cards can be applied one at a time', () => {
  let view = applyEvent(newMatchView(), { type: 'open', table: cards('3C', '9D', 'KH', '7S'), returned: [] });
  const dealt = [{ player: 0, card: parseCard('AS') }, { player: 1, card: parseCard('2D') }, { player: 0, card: parseCard('QH') }];
  for (const one of dealt) view = applyEvent(view, { type: 'deal', cards: [one] });
  assert.equal(view.table.deck, 45);
  assert.deepEqual(view.table.hands.map(ids), [['AS', 'QH'], ['2D']]);
});

test('events outside the table (match end) change nothing', () => {
  const view = viewFromState(createGame({ seed: 3 }).getState());
  assert.equal(applyEvent(view, { type: 'matchEnd', winner: HUMAN, scores: [101, 40] }), view);
});
