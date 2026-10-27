import test from 'node:test';
import assert from 'node:assert/strict';
import { AI_LEVELS, chooseCard } from '../src/ai.js';
import { createDeck, parseCard, shuffle } from '../src/cards.js';
import { createRng } from '../src/rng.js';
import { createRound, playCard, playerView } from '../src/rules.js';
import { scoreRound } from '../src/scoring.js';

const cards = (...list) => list.map(parseCard);
const noRandom = () => 0;

/** A player view built from card ids; pileCount defaults to the visible pile. */
function view({ hand, pile = [], pileCount = pile.length, seen = [] }) {
  return { hand: cards(...hand), pile: cards(...pile), pileCount, seen: cards(...seen) };
}

const normal = (fields) => chooseCard(view(fields), 'normal', noRandom).id;

test('normal makes a pişti when it can', () => {
  assert.equal(normal({ hand: ['2S', '7C', 'KD'], pile: ['7H'] }), '7C');
});

test('normal makes the 20-point pişti with a Jack on a lone Jack', () => {
  assert.equal(normal({ hand: ['3H', 'JC'], pile: ['JD'] }), 'JC');
});

test('normal captures with a matching card rather than a Jack', () => {
  assert.equal(normal({ hand: ['JS', '9D', '4C'], pile: ['3C', '9H'] }), '9D');
});

test('normal keeps its Jack for big piles', () => {
  const hand = ['JS', 'KD', '4H'];
  assert.notEqual(normal({ hand, pile: ['5C', '8D'] }), 'JS', 'two pointless cards');
  assert.notEqual(normal({ hand, pile: ['8D'] }), 'JS', 'a Jack on a lone card is no pişti');
  assert.equal(normal({ hand, pile: ['5C', '8D', '3H'] }), 'JS', 'three cards');
  assert.equal(normal({ hand, pile: ['6S'], pileCount: 4 }), 'JS', 'opening pile with face-down cards');
  assert.equal(normal({ hand, pile: ['10D', '6S'] }), 'JS', 'a pile with the 10 of diamonds');
  assert.equal(normal({ hand, pile: ['AC'] }), 'JS', 'an Ace is worth a Jack');
});

test('normal remembers played cards to avoid leaving a pişti chance', () => {
  assert.equal(normal({ hand: ['9C', '4D'], seen: ['4C', '4H', '4S'] }), '4D', 'no other 4 is left');
  assert.equal(normal({ hand: ['9C', '4D'], seen: ['9D', '9H', '9S'] }), '9C', 'no other 9 is left');
  assert.equal(normal({ hand: ['9C', '4D', '4S'] }), '4D', 'it holds another 4 itself');
});

test('normal keeps valuable cards and Jacks off an empty table', () => {
  assert.equal(normal({ hand: ['AH', '6C'] }), '6C');
  assert.equal(normal({ hand: ['10D', '5C'] }), '5C');
  assert.equal(normal({ hand: ['JH', '8S'] }), '8S');
  assert.equal(normal({ hand: ['JH'] }), 'JH', 'a lone Jack must be played');
});

test('easy takes a capture only some of the time', () => {
  const rng = createRng(4);
  const tally = new Map();
  for (let i = 0; i < 400; i += 1) {
    const id = chooseCard(view({ hand: ['2S', '7C', 'KD', '5H'], pile: ['3D', '7H'] }), 'easy', rng).id;
    tally.set(id, (tally.get(id) ?? 0) + 1);
  }
  const captures = tally.get('7C') / 400;
  assert.ok(captures > 0.5 && captures < 0.75, `captured ${captures}`);
  assert.equal(tally.size, 4, 'every card gets played sometimes');
});

/** Plays one seeded round with the computer on both sides; calls onChoice for every decision. */
function playSeededRound(seed, levels, onChoice = () => {}) {
  const rng = createRng(seed);
  let { round } = createRound(shuffle(createDeck(), rng), seed % 2, rng);
  while (!round.finished) {
    const seat = round.turn;
    const seen = playerView(round, seat);
    const card = chooseCard(seen, levels[seat], rng);
    onChoice({ round, seat, view: seen, card });
    round = playCard(round, card.id).round;
  }
  return scoreRound(round);
}

test('the AI only ever plays a card from its own hand (1000 seeded games, every level pairing)', () => {
  let decisions = 0;
  for (let seed = 1; seed <= 1000; seed += 1) {
    const levels = [AI_LEVELS[seed % 2], AI_LEVELS[(seed >> 1) % 2]];
    playSeededRound(seed, levels, ({ round, seat, view: seen, card }) => {
      assert.ok(seen.hand.includes(card));
      assert.ok(round.hands[seat].includes(card));
      decisions += 1;
    });
  }
  assert.equal(decisions, 1000 * 48);
});

test('normal clearly beats easy over 400 seeded rounds', () => {
  let normalTotal = 0;
  let easyTotal = 0;
  for (let seed = 1; seed <= 400; seed += 1) {
    const normalSeat = seed % 2;
    const levels = normalSeat === 0 ? ['normal', 'easy'] : ['easy', 'normal'];
    const scores = playSeededRound(seed, levels);
    normalTotal += scores[normalSeat].total;
    easyTotal += scores[1 - normalSeat].total;
  }
  assert.ok(normalTotal > 1.5 * easyTotal, `normal ${normalTotal} vs easy ${easyTotal}`);
});
