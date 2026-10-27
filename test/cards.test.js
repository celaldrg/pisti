import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RANKS, SUITS, TOTAL_CARD_POINTS, cardPoints, createDeck, isJack, parseCard, shuffle, sumPoints,
} from '../src/cards.js';
import { createRng, randomInt } from '../src/rng.js';

const ids = (cards) => cards.map((card) => card.id);

test('the deck has 52 distinct cards: 13 of each suit, 4 of each rank', () => {
  const deck = createDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(ids(deck)).size, 52);
  for (const suit of SUITS) assert.equal(deck.filter((card) => card.suit === suit).length, 13);
  for (const rank of RANKS) assert.equal(deck.filter((card) => card.rank === rank).length, 4);
});

test('parseCard reads rank + suit ids and rejects unknown ones', () => {
  assert.deepEqual(parseCard('10D'), { id: '10D', rank: '10', suit: 'D' });
  assert.deepEqual(parseCard('JS'), { id: 'JS', rank: 'J', suit: 'S' });
  assert.ok(Object.isFrozen(parseCard('AH')));
  assert.throws(() => parseCard('1C'), /Unknown card/);
  assert.throws(() => parseCard('KX'), /Unknown card/);
  assert.throws(() => parseCard(''), /Unknown card/);
});

test('only the four Jacks are Jacks', () => {
  assert.deepEqual(ids(createDeck().filter(isJack)), ['JC', 'JD', 'JH', 'JS']);
});

test('card points: Jack and Ace 1, 2 of clubs 2, 10 of diamonds 3, everything else 0', () => {
  const points = (id) => cardPoints(parseCard(id));
  assert.equal(points('JH'), 1);
  assert.equal(points('AS'), 1);
  assert.equal(points('2C'), 2);
  assert.equal(points('10D'), 3);
  assert.equal(points('2D'), 0);
  assert.equal(points('10C'), 0);
  assert.equal(points('KH'), 0);
  assert.equal(TOTAL_CARD_POINTS, 13);
  assert.equal(sumPoints(createDeck()), TOTAL_CARD_POINTS);
});

test('shuffle is a seeded permutation and leaves its input untouched', () => {
  const deck = Object.freeze(createDeck());
  const first = shuffle(deck, createRng(42));
  assert.deepEqual(first, shuffle(deck, createRng(42)));
  assert.notDeepEqual(first, shuffle(deck, createRng(43)));
  assert.notDeepEqual(first, deck);
  assert.deepEqual([...ids(first)].sort(), [...ids(deck)].sort());
});

test('the RNG replays the same sequence for a seed and stays in [0, 1)', () => {
  const a = createRng(7);
  const b = createRng(7);
  const other = createRng(8);
  let differs = false;
  for (let i = 0; i < 1000; i += 1) {
    const value = a();
    assert.equal(value, b());
    assert.ok(value >= 0 && value < 1);
    differs ||= value !== other();
  }
  assert.ok(differs);
});

test('randomInt covers [0, max) evenly enough', () => {
  const rng = createRng(3);
  const counts = new Array(6).fill(0);
  for (let i = 0; i < 6000; i += 1) {
    const n = randomInt(rng, 6);
    assert.ok(Number.isInteger(n) && n >= 0 && n < 6);
    counts[n] += 1;
  }
  for (const count of counts) assert.ok(count > 850 && count < 1150, `bucket ${count}`);
});
