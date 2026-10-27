/**
 * Computer players. Each level picks a card from a PlayerView, never from the
 * full round, so the computer knows only what a person at the table could.
 */
import { SUITS, cardPoints, isJack, sumPoints } from './cards.js';
import { PISTI_POINTS } from './rules.js';
import { randomInt } from './rng.js';

/** @typedef {import('./cards.js').Card} Card */
/** @typedef {import('./rules.js').PlayerView} PlayerView */
/** @typedef {'easy'|'normal'} AiLevel */

/** @type {readonly AiLevel[]} */
export const AI_LEVELS = Object.freeze(['easy', 'normal']);

/** How often the easy level notices a same-rank capture. */
const EASY_CAPTURE_CHANCE = 0.5;
/**
 * The normal level spends a Jack only on a pile of at least this many cards,
 * or on one holding a card that scores. Both thresholds won the most points
 * in seeded self-play (6000 rounds against neighbouring values).
 */
const JACK_PILE_SIZE = 3;
const JACK_PILE_POINTS = 1;

/**
 * Chooses the computer's card.
 * @param {PlayerView} view What the computer can see (see playerView in rules.js).
 * @param {AiLevel} level
 * @param {() => number} rng Used by the easy level.
 * @returns {Card} Always one of view.hand.
 */
export function chooseCard(view, level, rng) {
  return level === 'easy' ? chooseEasy(view, rng) : chooseNormal(view);
}

/** Easy: takes a same-rank capture half the time, otherwise plays a random card. */
function chooseEasy(view, rng) {
  const top = view.pile.at(-1);
  const capture = top && view.hand.find((card) => card.rank === top.rank);
  if (capture && rng() < EASY_CAPTURE_CHANCE) return capture;
  return view.hand[randomInt(rng, view.hand.length)];
}

/**
 * Normal: makes a pişti when it can, captures with a matching card, saves
 * Jacks for big piles and otherwise discards the card the opponent is least
 * likely to match, remembering every card already played.
 */
function chooseNormal(view) {
  return pistiCard(view) ?? matchingCard(view) ?? jackForBigPile(view) ?? safestDiscard(view);
}

/** A card that makes a pişti now; on a lone Jack only a Jack matches (20 points). */
function pistiCard(view) {
  if (view.pileCount !== 1) return undefined;
  return view.hand.find((card) => card.rank === view.pile[0].rank);
}

/** A non-Jack card of the top card's rank: it takes the pile and keeps the Jacks. */
function matchingCard(view) {
  const top = view.pile.at(-1);
  if (!top) return undefined;
  return view.hand.find((card) => !isJack(card) && card.rank === top.rank);
}

/** A Jack, but only when the pile is worth spending it on. */
function jackForBigPile(view) {
  const worthIt = view.pileCount >= JACK_PILE_SIZE || sumPoints(view.pile) >= JACK_PILE_POINTS;
  return worthIt ? view.hand.find(isJack) : undefined;
}

/** The card least likely to give the opponent a capture or a pişti; a Jack only as a last resort. */
function safestDiscard(view) {
  const others = view.hand.filter((card) => !isJack(card));
  const pool = others.length > 0 ? others : view.hand;
  return pool.reduce((best, card) => (discardRisk(view, card) < discardRisk(view, best) ? card : best));
}

/**
 * Expected loss from leaving the card on top: the opponent may hold an unseen
 * copy of its rank. On an empty pile that copy makes a pişti, otherwise it
 * takes the pile; the card's own points are at stake either way.
 */
function discardRisk(view, card) {
  const stake = view.pileCount === 0 ? PISTI_POINTS : view.pileCount + sumPoints(view.pile);
  return unseenCopies(view, card.rank) * (stake + cardPoints(card)) + cardPoints(card);
}

/** Copies of a rank that are neither in the hand nor already seen face up. */
function unseenCopies(view, rank) {
  const known = [...view.seen, ...view.hand].filter((card) => card.rank === rank).length;
  return SUITS.length - known;
}
