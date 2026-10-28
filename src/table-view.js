/**
 * Draws the felt from a table view: both hands, the deck, the pile and the
 * capture piles. It also tells the animations where each card is drawn.
 *
 * Cards are found by key: a card's id while it is in a hand or on the pile,
 * 'deck' for the top of the deck, 'capture0' and 'capture1' for the top of
 * your and the computer's capture piles. Keys stay out of the DOM, so the
 * page never reveals a face-down card.
 */
import { cardBack, cardFace } from './cardview.js';
import { el } from './dom.js';
import { motionOk } from './fx.js';
import { COMPUTER, HUMAN } from './match.js';

/** @typedef {import('./cards.js').Card} Card */
/** @typedef {import('./i18n.js').Translator} Translator */
/** @typedef {import('./table-model.js').TableView} TableView */

/**
 * @typedef {object} Spot Where a card is drawn, in viewport pixels.
 * @property {number} x Centre.
 * @property {number} y Centre.
 * @property {number} w Width, not counting rotation.
 * @property {number} h Height, not counting rotation.
 * @property {number} r Rotation in degrees.
 */

/**
 * @typedef {object} Zones
 * @property {HTMLElement} yourHand
 * @property {HTMLElement} cpuHand
 * @property {HTMLElement} pile
 * @property {HTMLElement} pileCount
 * @property {HTMLElement} deck
 * @property {HTMLElement[]} captures [yours, the computer's]
 */

/** Pile cards drawn; older ones lie underneath, out of sight. */
const PILE_SHOWN = 5;
/** Card backs drawn in the deck and capture stacks. */
const STACK_SHOWN = 3;
/** How long the cards left in a hand take to close the gap. */
const SLIDE_MS = 220;

/**
 * Creates the view of the felt.
 * @param {Zones} zones
 */
export function createTableView(zones) {
  /** @type {Map<string, { node: HTMLElement, r: number, inHand?: boolean, pile?: { card: Card, faceUp: boolean } }>} */
  const drawn = new Map();
  /** @type {Set<string>} */
  let hidden = new Set();

  /** Remembers where a card is drawn; it stays invisible while its key is hidden. */
  function track(key, node, extra = {}) {
    drawn.set(key, { node, r: 0, ...extra });
    if (hidden.has(key)) node.classList.add('is-hidden');
    return node;
  }

  function drawYourHand(hand, tr, canPlay) {
    zones.yourHand.classList.toggle('is-active', canPlay);
    zones.yourHand.setAttribute('aria-label', tr.t('yourHand'));
    zones.yourHand.replaceChildren(...hand.map((card, i) => el('button', {
      type: 'button',
      class: 'hand-card',
      'data-card': card.id,
      'aria-label': tr.t('playCard', { card: tr.card(card) }),
      'aria-disabled': String(!canPlay),
    }, [
      track(card.id, cardFace(card, tr.rank(card)), { inHand: true }),
      el('span', { class: 'key-hint', 'aria-hidden': 'true', text: i + 1 }),
    ])));
  }

  function drawCpuHand(hand, tr) {
    zones.cpuHand.replaceChildren(...hand.map((card) => track(card.id, cardBack(), { inHand: true })));
    zones.cpuHand.setAttribute('aria-label', tr.t('cpuHand', { cards: tr.plural('cards', hand.length) }));
  }

  function drawPile({ pile, hidden: faceDown }, tr) {
    const first = Math.max(0, pile.length - PILE_SHOWN);
    zones.pile.replaceChildren(...pile.slice(first).map((card, i) => {
      const faceUp = first + i >= faceDown;
      const node = faceUp ? cardFace(card, tr.rank(card)) : cardBack();
      const { x, y, r } = scatter(card.id);
      node.setAttribute('style', `--x:${x}px;--y:${y}px;--r:${r}deg`);
      return track(card.id, node, { r, pile: { card, faceUp } });
    }));
    const cards = tr.plural('cards', pile.length);
    let label = tr.t('emptyTable');
    if (pile.length > faceDown) label = tr.t('pileLabel', { cards, card: tr.card(pile.at(-1)) });
    else if (pile.length > 0) label = tr.t('pileFaceDown', { cards });
    zones.pile.setAttribute('aria-label', label);
    zones.pileCount.textContent = pile.length > 0 ? cards : tr.t('emptyTable');
  }

  /** A stack of card backs with a count badge, or an empty outline. */
  function drawStack(key, count) {
    const backs = Array.from({ length: Math.min(count, STACK_SHOWN) }, (_, i) => {
      const back = cardBack();
      back.style.setProperty('--i', String(i));
      return back;
    });
    const top = backs.at(-1) ?? el('div', { class: 'card slot' });
    track(key, top);
    return el('div', { class: 'stack' }, [...(backs.length > 0 ? backs : [top]), el('span', { class: 'badge', text: count })]);
  }

  function drawCapture({ captured, pistis }, player, tr) {
    const zone = zones.captures[player];
    const name = tr.t(player === HUMAN ? 'you' : 'computer');
    const count = captured[player].length;
    const made = pistis[player];
    const points = made.reduce((total, pisti) => total + pisti.points, 0);
    const label = tr.t('captureLabel', { name, cards: tr.plural('cards', count) });
    zone.replaceChildren(drawStack(`capture${player}`, count));
    zone.setAttribute('aria-label', label);
    if (made.length === 0) return;
    const summary = tr.plural('pistiSummary', made.length, { points });
    zone.append(el('span', { class: 'pisti-chip', text: summary }));
    zone.setAttribute('aria-label', `${label} · ${summary}`);
  }

  /** The hand cards' positions, to slide the cards that stay from where they were. */
  function handRects() {
    const rects = new Map();
    for (const [key, entry] of drawn) {
      if (entry.inHand) rects.set(key, entry.node.getBoundingClientRect());
    }
    return rects;
  }

  function slideHands(before) {
    for (const [key, rect] of before) {
      const entry = drawn.get(key);
      if (!entry?.inHand) continue;
      const now = entry.node.getBoundingClientRect();
      const dx = rect.left - now.left;
      if (Math.abs(dx) > 1) {
        entry.node.animate([{ translate: `${dx}px 0` }, { translate: '0 0' }], { duration: SLIDE_MS, easing: 'ease-out' });
      }
    }
  }

  /** Which hand card has the keyboard focus, so a redraw can keep it there. */
  function focusedCard() {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !zones.yourHand.contains(active)) return null;
    return { id: active.dataset.card, index: [...zones.yourHand.children].indexOf(active) };
  }

  /** Where a card is drawn now; null when no card with this key is drawn. */
  function spotOf(key) {
    const entry = drawn.get(key);
    if (!entry) return null;
    const box = entry.node.getBoundingClientRect();
    return {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      w: entry.node.offsetWidth,
      h: entry.node.offsetHeight,
      r: entry.r,
    };
  }

  function restoreFocus(focus) {
    if (!focus) return;
    const buttons = [...zones.yourHand.querySelectorAll('button')];
    const target = buttons.find((button) => button.dataset.card === focus.id) ?? buttons[Math.min(Math.max(focus.index, 0), buttons.length - 1)];
    (target ?? zones.yourHand).focus({ preventScroll: true });
  }

  return {
    /**
     * Redraws the whole felt.
     * @param {TableView} table
     * @param {{ tr: Translator, canPlay: boolean }} options canPlay: your cards can be played now.
     */
    render(table, { tr, canPlay }) {
      const before = motionOk() ? handRects() : new Map();
      const focus = focusedCard();
      drawn.clear();
      drawYourHand(table.hands[HUMAN], tr, canPlay);
      drawCpuHand(table.hands[COMPUTER], tr);
      drawPile(table, tr);
      zones.deck.replaceChildren(drawStack('deck', table.deck));
      zones.deck.setAttribute('aria-label', tr.t('deckLabel', { cards: tr.plural('cards', table.deck) }));
      drawCapture(table, HUMAN, tr);
      drawCapture(table, COMPUTER, tr);
      slideHands(before);
      restoreFocus(focus);
    },

    /**
     * Sets the cards that the next render draws invisible, because they are still on their way.
     * @param {string[]} keys
     */
    hide(keys) {
      hidden = new Set(keys);
    },

    /**
     * Shows cards that were drawn invisible.
     * @param {string[]} keys
     */
    reveal(keys) {
      for (const key of keys) {
        hidden.delete(key);
        drawn.get(key)?.node.classList.remove('is-hidden');
      }
    },

    /**
     * Where a card is drawn now.
     * @type {(key: string) => Spot|null} null when no card with this key is drawn.
     */
    spotOf,

    /**
     * The drawn pile cards, bottom to top, and where they are now.
     * @returns {{ card: Card, faceUp: boolean, spot: Spot }[]}
     */
    pileSpots() {
      return [...drawn]
        .filter(([, entry]) => entry.pile)
        .map(([key, entry]) => ({ ...entry.pile, spot: spotOf(key) }));
    },

    /**
     * Updates the deck count while cards are being dealt.
     * @param {number} count
     * @param {Translator} tr
     */
    setDeckCount(count, tr) {
      const badge = zones.deck.querySelector('.badge');
      if (badge) badge.textContent = String(count);
      zones.deck.setAttribute('aria-label', tr.t('deckLabel', { cards: tr.plural('cards', count) }));
    },
  };
}

/**
 * A small fixed offset and tilt per card, so the pile looks thrown rather than
 * stacked. FNV-1a mixes the short card ids well enough to tilt both ways.
 */
function scatter(id) {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return { x: (hash % 15) - 7, y: ((hash >>> 8) % 9) - 4, r: ((hash >>> 16) % 21) - 10 };
}
