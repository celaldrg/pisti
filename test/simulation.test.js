// The "done" criterion: 1000 complete seeded games (every card dealt and
// played) with the computer on both sides, checked move by move.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AI_LEVELS, chooseCard } from '../src/ai.js';
import { TOTAL_CARD_POINTS, createDeck, isJack, shuffle } from '../src/cards.js';
import { createRng } from '../src/rng.js';
import { JACK_PISTI_POINTS, PISTI_POINTS, TABLE_SIZE, createRound, playCard, playerView } from '../src/rules.js';
import { MAJORITY_POINTS, scoreRound } from '../src/scoring.js';

const GAMES = 1000;
const ALL_IDS = createDeck().map((card) => card.id).sort();

/** Plays one seeded game; returns every round state and every event in order. */
function playSeededGame(seed) {
  const rng = createRng(seed);
  const levels = [AI_LEVELS[seed % 2], AI_LEVELS[(seed >> 1) % 2]];
  const start = createRound(shuffle(createDeck(), rng), seed % 2, rng);
  const rounds = [start.round];
  const events = [...start.events];
  let { round } = start;
  while (!round.finished) {
    const card = chooseCard(playerView(round, round.turn), levels[round.turn], rng);
    const result = playCard(round, card.id);
    round = result.round;
    rounds.push(round);
    events.push(...result.events);
  }
  return { rounds, events, final: round };
}

const games = Array.from({ length: GAMES }, (_, i) => playSeededGame(i + 1));

/** Ids of every card in the round, wherever it is. */
function everyCardId(round) {
  return [...round.deck, ...round.pile, ...round.hands.flat(), ...round.captured.flat()].map((card) => card.id);
}

test(`card conservation: all 52 cards, each exactly once, after every move of ${GAMES} games`, () => {
  for (const { rounds } of games) {
    for (const round of rounds) assert.deepEqual(everyCardId(round).sort(), ALL_IDS);
  }
});

test(`card conservation: in all ${GAMES} games every card ends in exactly one capture pile`, () => {
  for (const { final } of games) {
    assert.equal(final.finished, true);
    assert.equal(final.deck.length + final.pile.length + final.hands.flat().length, 0);
    const piles = final.captured.flat().map((card) => card.id);
    assert.deepEqual([...piles].sort(), ALL_IDS);
    const yours = new Set(final.captured[0].map((card) => card.id));
    assert.ok(final.captured[1].every((card) => !yours.has(card.id)));
  }
});

test('card points add up to 13 every round, plus 3 for the majority unless it is 26-26', () => {
  let ties = 0;
  for (const { final } of games) {
    const [a, b] = scoreRound(final);
    assert.equal(a.cardPoints + b.cardPoints, TOTAL_CARD_POINTS);
    assert.equal(a.cards + b.cards, 52);
    const tie = a.cards === b.cards;
    ties += tie ? 1 : 0;
    assert.equal(a.majority + b.majority, tie ? 0 : MAJORITY_POINTS);
    if (!tie) assert.equal(a.cards > b.cards ? a.majority : b.majority, MAJORITY_POINTS);
    for (const score of [a, b]) {
      assert.equal(score.total, score.cardPoints + score.majority + score.pistiPoints);
    }
  }
  assert.ok(ties > 0 && ties < GAMES, `both ties and majorities happen (${ties} ties)`);
});

test('every pişti took a lone card of the same rank: 10 points, 20 for a Jack on a Jack', () => {
  let pistis = 0;
  let jackPistis = 0;
  for (const { events, final } of games) {
    const scored = events.filter((e) => e.type === 'capture' && e.pisti > 0);
    for (const { cards, pisti } of scored) {
      assert.equal(cards.length, 2);
      assert.equal(cards[0].rank, cards[1].rank);
      assert.equal(pisti, isJack(cards[1]) ? JACK_PISTI_POINTS : PISTI_POINTS);
    }
    const singleJackTakes = events.filter((e) => e.type === 'capture' && e.cards.length === 2 && !e.pisti);
    for (const { cards } of singleJackTakes) {
      assert.ok(isJack(cards[1]) && !isJack(cards[0]), 'two-card takes without pişti are Jack on non-Jack');
    }
    assert.equal(final.pistis.flat().length, scored.length);
    const [a, b] = scoreRound(final);
    assert.equal(a.pistiPoints + b.pistiPoints, scored.reduce((sum, e) => sum + e.pisti, 0));
    pistis += scored.length;
    jackPistis += scored.filter((e) => e.pisti === JACK_PISTI_POINTS).length;
  }
  assert.ok(pistis > 0 && jackPistis > 0, `${pistis} piştis, ${jackPistis} with Jacks`);
});

test('the last capturer takes the cards left on the table, and that is never a pişti', () => {
  let lastTakes = 0;
  for (const { rounds, events, final } of games) {
    const beforeEnd = rounds.at(-2);
    assert.notEqual(final.lastCapturer, null);
    const lastTake = events.find((e) => e.type === 'lastTake');
    const leftovers = beforeEnd.pile.length + 1;
    const lastPlayCaptured = events.at(-1).type === 'capture';
    if (lastPlayCaptured) {
      assert.equal(lastTake, undefined);
      continue;
    }
    lastTakes += 1;
    assert.equal(lastTake, events.at(-1));
    assert.equal(lastTake.player, final.lastCapturer);
    assert.equal(lastTake.cards.length, leftovers);
    assert.deepEqual(final.captured[lastTake.player].slice(-leftovers), lastTake.cards);
    assert.deepEqual(final.pistis, beforeEnd.pistis, 'the last take adds no pişti');
  }
  assert.ok(lastTakes > 0);
});

test('opening and deals: face-up card never a Jack, six deals of 4 + 4, the non-dealer always leads', () => {
  let returnedJacks = 0;
  for (const { rounds, events } of games) {
    const [first] = rounds;
    assert.equal(isJack(first.pile[TABLE_SIZE - 1]), false);
    returnedJacks += first.returned.length;
    const deals = events.filter((e) => e.type === 'deal');
    assert.equal(deals.length, 6);
    for (const deal of deals) {
      assert.equal(deal.cards.length, 8);
      assert.equal(deal.cards[0].player, 1 - first.dealer);
    }
    assert.equal(events.filter((e) => e.type === 'play').length, 48);
  }
  assert.ok(returnedJacks > 0);
});
