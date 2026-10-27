import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, parseCard } from '../src/cards.js';
import { MAJORITY_POINTS, scoreRound } from '../src/scoring.js';

const deck = createDeck();
const bySuits = (...suits) => deck.filter((card) => suits.includes(card.suit));
const pisti = (id, points) => ({ card: parseCard(id), points });

test('a round score adds Jacks, Aces, 2 of clubs, 10 of diamonds, the majority and piştis', () => {
  const yours = [...bySuits('C', 'S'), parseCard('AH')];
  const theirs = bySuits('D', 'H').filter((card) => card.id !== 'AH');
  const [you, computer] = scoreRound({
    captured: [yours, theirs],
    pistis: [[pisti('7S', 10)], [pisti('JD', 20), pisti('4H', 10)]],
  });
  assert.deepEqual(you, {
    cards: 27,
    jacks: 2,
    aces: 3,
    twoOfClubs: true,
    tenOfDiamonds: false,
    cardPoints: 7,
    majority: MAJORITY_POINTS,
    pistiCount: 1,
    pistiPoints: 10,
    total: 20,
  });
  assert.deepEqual(computer, {
    cards: 25,
    jacks: 2,
    aces: 1,
    twoOfClubs: false,
    tenOfDiamonds: true,
    cardPoints: 6,
    majority: 0,
    pistiCount: 2,
    pistiPoints: 30,
    total: 36,
  });
  assert.equal(you.cardPoints + computer.cardPoints, 13);
});

test('nobody gets the majority bonus on a 26-26 tie', () => {
  const [you, computer] = scoreRound({ captured: [bySuits('C', 'S'), bySuits('D', 'H')], pistis: [[], []] });
  assert.equal(you.cards, 26);
  assert.equal(computer.cards, 26);
  assert.equal(you.majority + computer.majority, 0);
  assert.equal(you.total + computer.total, 13);
});

test('an empty table scores zero, so the score also works as a running tally', () => {
  const [you] = scoreRound({ captured: [[], []], pistis: [[], []] });
  assert.equal(you.total, 0);
  assert.equal(you.majority, 0);
});
