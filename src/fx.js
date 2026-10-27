/**
 * Effects: cards flying across the page, the "Pişti!" burst and toasts.
 * Card flights are skipped when the player prefers reduced motion.
 */
import { cardBack, cardFace } from './cardview.js';
import { el } from './dom.js';

/** @typedef {import('./cards.js').Card} Card */
/** @typedef {import('./table-view.js').Spot} Spot */

/**
 * @typedef {object} Flight
 * @property {Card|null} card The face to show; null flies a card that stays face down.
 * @property {Spot} from
 * @property {Spot} to
 * @property {boolean} faceUpFrom
 * @property {boolean} faceUpTo
 */

const FLIGHT_MS = 320;
/** How far a flying card rises above its straight path, in pixels. */
const FLIGHT_LIFT = 22;
const SPARKS = 12;
const BURST_MS = 1200;
const TOAST_MS = 2600;

/**
 * Whether animations should run: false when the system asks for reduced motion.
 * @returns {boolean}
 */
export function motionOk() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Resolves after the given time.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Flies a copy of a card from one spot to another in an overlay above the
 * page, turning it over on the way when asked.
 * @param {HTMLElement} layer The fixed overlay for flying cards.
 * @param {Flight} flight
 * @returns {Promise<void>} Resolves when the card has landed.
 */
export async function flyCard(layer, { card, from, to, faceUpFrom, faceUpTo }) {
  if (!motionOk()) return;
  const inner = el('div', { class: 'ghost-inner' }, [card && cardFace(card), cardBack()]);
  const ghost = el('div', { class: 'ghost', style: `--w:${to.w}px` }, [inner]);
  layer.append(ghost);
  const top = {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2 - FLIGHT_LIFT,
    w: Math.max(from.w, to.w) * 1.08,
    r: (from.r + to.r) / 2,
  };
  const timing = { duration: FLIGHT_MS, easing: 'cubic-bezier(.3, .7, .25, 1)', fill: 'forwards' };
  await Promise.all([
    ghost.animate([from, top, to].map((spot) => ({ transform: place(spot, to) })), timing).finished,
    inner.animate([{ transform: side(faceUpFrom) }, { transform: side(faceUpTo) }], timing).finished,
  ]);
  ghost.remove();
}

/**
 * Shows the "Pişti!" burst with flying sparks.
 * @param {HTMLElement} layer Where the burst appears, centred.
 * @param {string} title
 * @param {string} subtitle
 * @returns {Promise<void>} Resolves when it has faded out.
 */
export async function burst(layer, title, subtitle) {
  const sparks = Array.from({ length: SPARKS }, (_, i) => el('i', { class: 'spark', style: `--a:${(360 / SPARKS) * i}deg` }));
  const node = el('div', { class: 'burst' }, [...sparks, el('strong', { text: title }), el('span', { text: subtitle })]);
  layer.replaceChildren(node);
  await wait(BURST_MS);
  node.remove();
}

/**
 * Makes a toast that shows one short message at a time. A message that has
 * faded out is removed, so no stale status stays in the page.
 * @param {HTMLElement} node The toast element.
 * @returns {{ show: (text: string) => void, clear: () => void }} clear removes the message at once.
 */
export function createToast(node) {
  let timer = 0;
  node.addEventListener('transitionend', () => {
    if (!node.classList.contains('is-shown')) node.textContent = '';
  });
  return {
    show(text) {
      node.textContent = text;
      node.classList.add('is-shown');
      clearTimeout(timer);
      timer = setTimeout(() => node.classList.remove('is-shown'), TOAST_MS);
    },
    clear() {
      clearTimeout(timer);
      node.classList.remove('is-shown');
      node.textContent = '';
    },
  };
}

/** The transform that puts the flying card, sized for the landing spot, onto a spot. */
function place(spot, size) {
  return `translate(${spot.x - size.w / 2}px, ${spot.y - size.h / 2}px) rotate(${spot.r}deg) scale(${spot.w / size.w})`;
}

/** Turns the two-sided flying card face up or face down. */
function side(faceUp) {
  return `rotateY(${faceUp ? 0 : 180}deg)`;
}
