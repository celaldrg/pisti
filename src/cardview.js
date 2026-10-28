/**
 * Playing cards drawn with HTML, CSS and the suit symbols; no images.
 */
import { el, suitIcon } from './dom.js';

/** @typedef {import('./cards.js').Card} Card */

const RED_SUITS = new Set(['D', 'H']);
const COURT_RANKS = new Set(['J', 'Q', 'K']);

/**
 * The face of a card: rank and suit in two corners, a large symbol in the middle.
 * @param {Card} card
 * @param {string} [label] The rank as printed in the current language; defaults to the rank.
 * @returns {HTMLElement}
 */
export function cardFace(card, label = card.rank) {
  const colour = RED_SUITS.has(card.suit) ? 'is-red' : 'is-black';
  return el('div', { class: `card face ${colour}` }, [
    corner(card, label, 'corner'),
    centre(card, label),
    corner(card, label, 'corner corner-end'),
  ]);
}

/**
 * The back of a card.
 * @returns {HTMLElement}
 */
export function cardBack() {
  return el('div', { class: 'card back' }, [el('span', { class: 'back-emblem' })]);
}

/** One corner index: the rank above a small suit. */
function corner(card, label, className) {
  return el('span', { class: className }, [el('b', { text: label }), suitIcon(card.suit, 'pip')]);
}

/** The middle of the card: a big suit, a bigger one for an Ace, a framed letter for J, Q and K. */
function centre(card, label) {
  if (COURT_RANKS.has(card.rank)) {
    return el('span', { class: 'centre court' }, [el('b', { text: label }), suitIcon(card.suit, 'court-suit')]);
  }
  const size = card.rank === 'A' ? 'ace' : 'pips';
  return el('span', { class: `centre ${size}` }, [suitIcon(card.suit, 'big')]);
}
