/**
 * What the screen shows, rebuilt one game event at a time. The UI animates
 * each step, and replaying a move's events always lands exactly on the real
 * game state (the tests check this move by move). Pure functions, no DOM.
 */
import { TABLE_SIZE } from './rules.js';

/** @typedef {import('./cards.js').Card} Card */
/** @typedef {import('./rules.js').Pisti} Pisti */
/** @typedef {import('./match.js').MatchState} MatchState */
/** @typedef {import('./match.js').MatchEvent} MatchEvent */
/** @typedef {import('./scoring.js').RoundScore} RoundScore */

/**
 * @typedef {object} TableView
 * @property {number} deck Cards left in the deck.
 * @property {Card[]} pile Cards on the table, top card last.
 * @property {number} hidden Face-down cards at the bottom of the pile.
 * @property {Card[][]} hands Both hands; the computer's is drawn face down.
 * @property {Card[][]} captured Both capture piles of the current round.
 * @property {Pisti[][]} pistis Both players' piştis this round.
 */

/**
 * @typedef {object} View
 * @property {TableView} table
 * @property {number[]} scores Match totals as last announced.
 * @property {RoundScore[][]} history Breakdown of every round announced so far.
 */

const DECK_SIZE = 52;

/**
 * The view at the start of a match, before the first card is laid out.
 * @returns {View}
 */
export function newMatchView() {
  return { table: freshTable(), scores: [0, 0], history: [] };
}

/**
 * The view of a match state as it is now.
 * @param {MatchState} state
 * @returns {View}
 */
export function viewFromState({ round, scores, history }) {
  return {
    table: {
      deck: round.deck.length,
      pile: round.pile,
      hidden: round.hidden,
      hands: round.hands,
      captured: round.captured,
      pistis: round.pistis,
    },
    scores,
    history,
  };
}

/**
 * Applies one event to the view. An 'open' event starts a new round's table;
 * one holding only the first few opening cards gives the in-between table the
 * deal animation shows, and an empty one gives the full deck before the deal.
 * @param {View} view
 * @param {MatchEvent} event
 * @returns {View}
 */
export function applyEvent(view, event) {
  if (event.type === 'roundEnd') {
    return { ...view, scores: event.scores, history: [...view.history, event.breakdown] };
  }
  const table = nextTable(view.table, event);
  return table === view.table ? view : { ...view, table };
}

/** The table after one event; events that do not touch the table leave it as it is. */
function nextTable(table, event) {
  switch (event.type) {
    case 'open':
      return {
        ...freshTable(),
        deck: DECK_SIZE - event.table.length,
        pile: event.table,
        hidden: Math.min(event.table.length, TABLE_SIZE - 1),
      };
    case 'deal':
      return {
        ...table,
        deck: table.deck - event.cards.length,
        hands: table.hands.map((hand, player) => [
          ...hand,
          ...event.cards.filter((dealt) => dealt.player === player).map((dealt) => dealt.card),
        ]),
      };
    case 'play':
      return {
        ...table,
        pile: [...table.pile, event.card],
        hands: replaceAt(table.hands, event.player, table.hands[event.player].filter((card) => card.id !== event.card.id)),
      };
    case 'capture':
      return {
        ...takeAll(table, event.player, event.cards),
        pistis: event.pisti > 0
          ? replaceAt(table.pistis, event.player, [...table.pistis[event.player], { card: event.cards.at(-1), points: event.pisti }])
          : table.pistis,
      };
    case 'lastTake':
      return takeAll(table, event.player, event.cards);
    default:
      return table;
  }
}

/** A round's table before anything is laid out: the whole deck, nothing else. */
function freshTable() {
  return { deck: DECK_SIZE, pile: [], hidden: 0, hands: [[], []], captured: [[], []], pistis: [[], []] };
}

/** The player moves the cards from the table to the own capture pile. */
function takeAll(table, player, cards) {
  return { ...table, pile: [], hidden: 0, captured: replaceAt(table.captured, player, [...table.captured[player], ...cards]) };
}

/** Copy of a two-player list with one entry replaced. */
function replaceAt(list, index, value) {
  return list.map((item, i) => (i === index ? value : item));
}
