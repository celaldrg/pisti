import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, isJack, parseCard, shuffle } from '../src/cards.js';
import { createRng } from '../src/rng.js';
import {
  HAND_SIZE, JACK_PISTI_POINTS, PISTI_POINTS, TABLE_SIZE,
  canCapture, createRound, dealHands, openTable, otherPlayer, pistiValue, playCard, playerView,
} from '../src/rules.js';

const cards = (...list) => list.map(parseCard);
const ids = (list) => list.map((card) => card.id);

/** A full deck that starts with the given cards; the rest follow in standard order. */
function deckStartingWith(...top) {
  return [...cards(...top), ...createDeck().filter((card) => !top.includes(card.id))];
}

/** A hand-made round for rule tests; only the fields a test names differ from an empty table. */
function makeRound(fields) {
  return {
    dealer: 1,
    turn: 0,
    deck: [],
    pile: [],
    hidden: 0,
    hands: [[], []],
    captured: [[], []],
    pistis: [[], []],
    lastCapturer: null,
    seen: [],
    returned: [],
    finished: false,
    ...fields,
  };
}

/** Freezes an object graph so that any mutation throws (ES modules are strict). */
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

test('otherPlayer swaps 0 and 1', () => {
  assert.equal(otherPlayer(0), 1);
  assert.equal(otherPlayer(1), 0);
});

/** Every card dealt in a round, with who got it and in which deal (0 to 5); plays the first card in hand each turn. */
function dealtCards(start) {
  const deals = start.events.filter((e) => e.type === 'deal');
  let { round } = start;
  while (!round.finished) {
    const result = playCard(round, round.hands[round.turn][0].id);
    round = result.round;
    deals.push(...result.events.filter((e) => e.type === 'deal'));
  }
  return deals.flatMap((deal, number) => deal.cards.map(({ player, card }) => ({ player, card, number })));
}

test('the opening table takes four cards from the top; the last one is face up', () => {
  const deck = deckStartingWith('3C', '9D', 'KH', '7S');
  const { table, deck: rest, returned } = openTable(deck, createRng(1));
  assert.deepEqual(ids(table), ['3C', '9D', 'KH', '7S']);
  assert.deepEqual(rest, deck.slice(TABLE_SIZE));
  assert.deepEqual(returned, []);
});

test('opening Jack rule: a face-up Jack goes back into the deck at a random place and the next card is turned up', () => {
  const deck = Object.freeze(deckStartingWith('3C', '9D', 'KH', 'JS', 'JH', '7S'));
  const { table, deck: rest, returned } = openTable(deck, createRng(3));
  assert.deepEqual(ids(table), ['3C', '9D', 'KH', '7S']);
  assert.deepEqual(ids(returned), ['JS', 'JH']);
  assert.equal(rest.length, 48);
  assert.equal(new Set(ids([...table, ...rest])).size, 52);
  assert.deepEqual(ids(rest.filter((card) => !returned.includes(card))), ids(deck.slice(6)), 'the other cards keep their order');
  assert.deepEqual(openTable(deck, createRng(3)), openTable(deck, createRng(3)), 'the same random stream puts them back the same way');
});

test('opening Jack rule: the returned Jack can land on any of the 48 places in the deck, top to bottom', () => {
  const deck = deckStartingWith('3C', '9D', 'KH', 'JS');
  const places = new Set();
  for (let seed = 1; seed <= 1000; seed += 1) {
    places.add(openTable(deck, createRng(seed)).deck.findIndex((card) => card.id === 'JS'));
  }
  assert.equal(places.size, 52 - TABLE_SIZE);
});

test('opening Jack rule: Jacks among the face-down cards stay on the table', () => {
  const { table, returned } = openTable(deckStartingWith('JC', 'JD', 'JH', '5S'), createRng(1));
  assert.deepEqual(ids(table), ['JC', 'JD', 'JH', '5S']);
  assert.deepEqual(returned, []);
});

test('opening Jack rule over 1000 seeded rounds: the face-up card is never a Jack, and either player may be dealt a returned one in any deal', () => {
  const receivers = [];
  for (let seed = 1; seed <= 1000; seed += 1) {
    const rng = createRng(seed);
    const start = createRound(shuffle(createDeck(), rng), seed % 2, rng);
    const { round } = start;
    const faceUp = round.pile[TABLE_SIZE - 1];
    assert.equal(isJack(faceUp), false);
    assert.deepEqual(round.seen, [faceUp]);
    if (round.returned.length === 0) continue;
    assert.ok(round.returned.every(isJack));
    const dealt = dealtCards(start);
    for (const jack of round.returned) {
      const { player, number } = dealt.find(({ card }) => card.id === jack.id);
      receivers.push({ toDealer: player === round.dealer, number });
    }
  }
  assert.ok(receivers.length > 20, `${receivers.length} returned Jacks`);
  assert.ok(receivers.some((r) => r.toDealer) && receivers.some((r) => !r.toDealer), 'both the dealer and the other player get them');
  assert.equal(new Set(receivers.map((r) => r.number)).size, 6, 'in each of the six deals');
});

test('dealHands gives four cards each, one at a time, starting with the non-dealer', () => {
  const deck = createDeck();
  const { hands, deck: rest, dealt } = dealHands(deck, 1);
  assert.deepEqual(dealt.map((d) => d.player), [0, 1, 0, 1, 0, 1, 0, 1]);
  assert.deepEqual(ids(dealt.map((d) => d.card)), ids(deck.slice(0, 2 * HAND_SIZE)));
  assert.deepEqual(ids(hands[0]), ['AC', '3C', '5C', '7C']);
  assert.deepEqual(ids(hands[1]), ['2C', '4C', '6C', '8C']);
  assert.deepEqual(rest, deck.slice(2 * HAND_SIZE));
  assert.deepEqual(ids(dealHands(deck, 0).hands[1]), ['AC', '3C', '5C', '7C']);
});

test('createRound opens the table first, then deals; the non-dealer leads', () => {
  const deck = shuffle(createDeck(), createRng(9));
  const { round, events } = createRound(deck, 1, createRng(2));
  const opening = openTable(deck, createRng(2));
  assert.deepEqual(events.map((e) => e.type), ['open', 'deal']);
  assert.deepEqual(round.pile, opening.table);
  assert.equal(round.hidden, TABLE_SIZE - 1);
  assert.deepEqual(round.hands, dealHands(opening.deck, 1).hands);
  assert.equal(round.deck.length, 52 - TABLE_SIZE - 2 * HAND_SIZE);
  assert.equal(round.dealer, 1);
  assert.equal(round.turn, 0);
  assert.equal(round.lastCapturer, null);
  assert.equal(round.finished, false);
});

test('deal sequence: four more each whenever both hands are empty, six deals in all, dealer plays last', () => {
  for (const dealer of [0, 1]) {
    const first = otherPlayer(dealer);
    const rng = createRng(11 + dealer);
    let { round } = createRound(shuffle(createDeck(), rng), dealer, rng);
    const deckSizes = [round.deck.length];
    let lastMover = null;
    while (!round.finished) {
      const before = round;
      const result = playCard(round, round.hands[round.turn][0].id);
      round = result.round;
      lastMover = before.turn;
      const deal = result.events.find((e) => e.type === 'deal');
      if (!deal) continue;
      assert.equal(before.turn, dealer, 'the dealer plays the last card of each deal');
      assert.equal(before.hands[dealer].length, 1);
      assert.equal(before.hands[first].length, 0);
      assert.deepEqual(deal.cards.map((d) => d.player), [first, dealer, first, dealer, first, dealer, first, dealer]);
      assert.deepEqual(ids(deal.cards.map((d) => d.card)), ids(before.deck.slice(0, 2 * HAND_SIZE)));
      assert.deepEqual(round.hands.map((hand) => hand.length), [HAND_SIZE, HAND_SIZE]);
      assert.equal(round.turn, first);
      deckSizes.push(round.deck.length);
    }
    assert.deepEqual(deckSizes, [40, 32, 24, 16, 8, 0]);
    assert.equal(lastMover, dealer);
  }
});

test('canCapture: same rank as the top card, or a Jack on any non-empty pile', () => {
  const pile = cards('4H', '9C');
  assert.equal(canCapture(pile, parseCard('9S')), true);
  assert.equal(canCapture(pile, parseCard('JD')), true);
  assert.equal(canCapture(pile, parseCard('4S')), false, 'only the top card counts');
  assert.equal(canCapture(pile, parseCard('KS')), false);
  assert.equal(canCapture([], parseCard('JD')), false);
  assert.equal(canCapture([], parseCard('5D')), false);
});

test('pişti detection: a lone same-rank card is 10, Jack on a lone Jack is 20, Jack on a lone non-Jack is none', () => {
  assert.equal(pistiValue(cards('7H'), parseCard('7S')), PISTI_POINTS);
  assert.equal(PISTI_POINTS, 10);
  assert.equal(pistiValue(cards('JH'), parseCard('JS')), JACK_PISTI_POINTS);
  assert.equal(JACK_PISTI_POINTS, 20);
  assert.equal(pistiValue(cards('7H'), parseCard('JS')), 0);
  assert.equal(pistiValue(cards('2D', '7H'), parseCard('7S')), 0);
  assert.equal(pistiValue(cards('8H'), parseCard('7S')), 0);
  assert.equal(pistiValue([], parseCard('7S')), 0);
});

test('playing a matching card on a single card scores a pişti and takes the pile', () => {
  const round = makeRound({ turn: 1, pile: cards('7H'), hands: [cards('2D'), cards('7S', 'KD')] });
  const { round: next, events } = playCard(round, '7S');
  assert.deepEqual(events, [
    { type: 'play', player: 1, card: parseCard('7S') },
    { type: 'capture', player: 1, cards: cards('7H', '7S'), pisti: 10 },
  ]);
  assert.deepEqual(next.pile, []);
  assert.deepEqual(ids(next.captured[1]), ['7H', '7S']);
  assert.deepEqual(next.pistis, [[], [{ card: parseCard('7S'), points: 10 }]]);
  assert.equal(next.lastCapturer, 1);
  assert.equal(next.turn, 0);
  assert.deepEqual(ids(next.hands[1]), ['KD']);
  assert.deepEqual(ids(next.seen), ['7S']);
});

test('a Jack on a single Jack is a pişti worth 20', () => {
  const round = makeRound({ pile: cards('JD'), hands: [cards('JC', '4S'), cards('5H')] });
  const { round: next, events } = playCard(round, 'JC');
  assert.deepEqual(events[1], { type: 'capture', player: 0, cards: cards('JD', 'JC'), pisti: 20 });
  assert.deepEqual(next.pistis[0], [{ card: parseCard('JC'), points: 20 }]);
});

test('a Jack on a single non-Jack card is an ordinary capture, not a pişti', () => {
  const round = makeRound({ pile: cards('5C'), hands: [cards('JD', '4S'), cards('5H')] });
  const { round: next, events } = playCard(round, 'JD');
  assert.deepEqual(events[1], { type: 'capture', player: 0, cards: cards('5C', 'JD'), pisti: 0 });
  assert.deepEqual(next.pistis, [[], []]);
  assert.deepEqual(ids(next.captured[0]), ['5C', 'JD']);
});

test('a Jack takes the whole pile, face-down opening cards included', () => {
  const round = makeRound({ pile: cards('4H', '9C', 'QD', '2S'), hidden: 3, hands: [cards('JD', '4S'), cards('5H')] });
  const { round: next } = playCard(round, 'JD');
  assert.deepEqual(ids(next.captured[0]), ['4H', '9C', 'QD', '2S', 'JD']);
  assert.equal(next.hidden, 0);
  assert.deepEqual(next.pistis, [[], []]);
});

test('a card that does not capture goes on top of the pile', () => {
  const round = makeRound({ pile: cards('4H', '9C'), hands: [cards('4S', 'KD'), cards('5H')] });
  const { round: next, events } = playCard(round, '4S');
  assert.deepEqual(events, [{ type: 'play', player: 0, card: parseCard('4S') }]);
  assert.deepEqual(ids(next.pile), ['4H', '9C', '4S']);
  assert.equal(next.lastCapturer, null);
});

test('a Jack on an empty table just lies there', () => {
  const round = makeRound({ hands: [cards('JD', '4S'), cards('5H')] });
  const { round: next } = playCard(round, 'JD');
  assert.deepEqual(ids(next.pile), ['JD']);
  assert.deepEqual(next.captured, [[], []]);
});

test('playing a card that is not in the current hand throws', () => {
  const round = makeRound({ pile: cards('9C'), hands: [cards('4S'), cards('9H')] });
  assert.throws(() => playCard(round, '9H'), /Illegal move/);
  assert.throws(() => playCard(round, 'AH'), /Illegal move/);
});

test('the last capturer takes the cards left on the table, even when the other player played last', () => {
  const round = makeRound({
    pile: cards('KH', 'QS'),
    hands: [cards('3C'), cards('4D')],
    captured: [cards('9H', '9S'), []],
    lastCapturer: 0,
  });
  const middle = playCard(round, '3C').round;
  const { round: end, events } = playCard(middle, '4D');
  assert.equal(end.finished, true);
  assert.deepEqual(events.at(-1), { type: 'lastTake', player: 0, cards: cards('KH', 'QS', '3C', '4D') });
  assert.deepEqual(ids(end.captured[0]), ['9H', '9S', 'KH', 'QS', '3C', '4D']);
  assert.deepEqual(end.captured[1], []);
  assert.deepEqual(end.pile, []);
});

test('a single card left on the table goes to the last capturer without a pişti', () => {
  const round = makeRound({ turn: 1, hands: [[], cards('QD')], lastCapturer: 0 });
  const { round: end, events } = playCard(round, 'QD');
  assert.deepEqual(events.at(-1), { type: 'lastTake', player: 0, cards: cards('QD') });
  assert.deepEqual(end.pistis, [[], []]);
  assert.equal(end.finished, true);
});

test('no last take when the final card captures the pile', () => {
  const round = makeRound({ turn: 1, pile: cards('2H', '9C'), hands: [[], cards('9D')], lastCapturer: 0 });
  const { round: end, events } = playCard(round, '9D');
  assert.deepEqual(events.map((e) => e.type), ['play', 'capture']);
  assert.deepEqual(ids(end.captured[1]), ['2H', '9C', '9D']);
  assert.equal(end.finished, true);
});

test('rounds are never mutated: a whole round plays on deep-frozen states', () => {
  const rng = createRng(5);
  let { round } = createRound(shuffle(createDeck(), rng), 0, rng);
  while (!round.finished) {
    deepFreeze(round);
    round = playCard(round, round.hands[round.turn].at(-1).id).round;
  }
  assert.equal(round.captured[0].length + round.captured[1].length, 52);
});

test('a player view holds only what that player may know', () => {
  const rng = createRng(21);
  const { round } = createRound(shuffle(createDeck(), rng), 0, rng);
  const view = playerView(round, 1);
  assert.deepEqual(Object.keys(view).sort(), ['hand', 'pile', 'pileCount', 'seen']);
  assert.deepEqual(view.hand, round.hands[1]);
  assert.deepEqual(view.pile, [round.pile[TABLE_SIZE - 1]], 'face-down cards stay hidden');
  assert.equal(view.pileCount, TABLE_SIZE);
  const secret = new Set(ids([...round.hands[0], ...round.deck, ...round.pile.slice(0, round.hidden)]));
  assert.ok([...view.hand, ...view.pile, ...view.seen].every((card) => !secret.has(card.id)));
});
