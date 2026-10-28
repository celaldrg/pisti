/**
 * Entry point: connects the page to the game. Runs the match flow, routes
 * taps, clicks and the keys 1–4 to it, and switches the language.
 */
import { animateEvent } from './animate.js';
import { createDemoGame } from './demo.js';
import { createDialogs } from './dialogs.js';
import { burst, createToast, flyCard, wait } from './fx.js';
import { createGame } from './game.js';
import { LANGS, createTranslator } from './i18n.js';
import { COMPUTER, HUMAN } from './match.js';
import { renderPanel } from './panel.js';
import { JACK_PISTI_POINTS, PISTI_POINTS } from './rules.js';
import { MAJORITY_POINTS } from './scoring.js';
import { normalizeSettings } from './settings.js';
import { loadValue, saveValue } from './storage.js';
import { newMatchView, viewFromState } from './table-model.js';
import { createTableView } from './table-view.js';

/** The computer's pause before each move, so you can follow the game. */
const THINK_MS = 700;
/** Keys that play the first to fourth card of your hand. */
const CARD_KEYS = ['1', '2', '3', '4'];
/** The button under the status line once a round or the match is over. */
const STATUS_ACTIONS = { roundOver: 'nextRound', matchOver: 'playAgain' };
const SETTINGS_KEY = 'settings';

const byId = (id) => document.getElementById(id);

const dom = {
  yourHand: byId('your-hand'),
  seats: [byId('seat-you'), byId('seat-cpu')],
  seatScores: [byId('your-score'), byId('cpu-score')],
  statusMeta: byId('status-meta'),
  statusText: byId('status-text'),
  statusHint: byId('status-hint'),
  statusAction: byId('status-action'),
  flights: byId('flights'),
  bursts: byId('burst-layer'),
};

const table = createTableView({
  yourHand: dom.yourHand,
  cpuHand: byId('cpu-hand'),
  pile: byId('pile'),
  pileCount: byId('pile-count'),
  deck: byId('deck'),
  captures: [byId('your-capture'), byId('cpu-capture')],
});

const panel = {
  matchMeta: byId('match-meta'),
  scores: [byId('panel-you'), byId('panel-cpu')],
  bars: [byId('bar-you'), byId('bar-cpu')],
  roundTitle: byId('round-title'),
  tally: byId('tally-body'),
  history: byId('history'),
};

const { show: showToast, clear: clearToast } = createToast(byId('toast'));
const settings = normalizeSettings(loadValue(SETTINGS_KEY));

/**
 * What changes while the page is open. status is 'dealing', 'yourTurn',
 * 'thinking', 'roundOver' or 'matchOver'; busy means your card is still
 * moving; token changes with every match, which stops the old animations.
 */
const app = {
  settings,
  tr: createTranslator(settings.lang),
  /** @type {import('./game.js').Game|null} */
  game: null,
  view: newMatchView(),
  status: 'dealing',
  busy: false,
  token: 0,
};

const dialogs = createDialogs({
  translator: () => app.tr,
  onNext: advance,
  onStart: (choice) => {
    saveSettings(choice);
    newMatch();
  },
});

/** Starts a match and deals it, or for ?demo jumps straight to the demo position. */
async function newMatch(demo = false) {
  app.token += 1;
  const { token } = app;
  dialogs.closeAll();
  dom.flights.replaceChildren();
  dom.bursts.replaceChildren();
  table.hide([]);
  app.busy = false;
  if (demo) {
    app.game = createDemoGame();
    app.view = viewFromState(app.game.getState());
    setStatus('yourTurn');
    return;
  }
  const { target, aiLevel } = app.settings;
  app.game = createGame({ seed: randomSeed(), target, aiLevel });
  app.view = newMatchView();
  setStatus('dealing');
  await runEvents(app.game.openingEvents, token);
  await beginRound(token);
}

/** Says who leads the round just dealt, then plays on. */
async function beginRound(token) {
  if (token !== app.token) return;
  const { roundNumber, round } = app.game.getState();
  showToast(app.tr.t(round.turn === HUMAN ? 'roundStartYou' : 'roundStartCpu', { n: roundNumber }));
  await continuePlay(token);
}

/** Lets the computer move while it is its turn; then it is your turn, or the round is over. */
async function continuePlay(token) {
  while (token === app.token) {
    const { phase, round } = app.game.getState();
    if (phase !== 'playing') {
      finishRound();
      return;
    }
    if (round.turn === HUMAN) {
      setStatus('yourTurn');
      return;
    }
    setStatus('thinking');
    await wait(THINK_MS);
    if (token === app.token) await runEvents(app.game.playAi(), token);
  }
}

/** Plays one of your cards, if it is your turn and nothing is moving. */
async function playYourCard(cardId) {
  if (app.status !== 'yourTurn' || app.busy) return;
  const events = app.game.play(cardId);
  if (events.length === 0) return;
  const { token } = app;
  app.busy = true;
  await runEvents(events, token);
  if (token !== app.token) return;
  app.busy = false;
  await continuePlay(token);
}

/** Shows the summary of the round that just ended; the match may be over too. */
function finishRound() {
  const { phase, roundNumber, history, scores, target, winner } = app.game.getState();
  setStatus(phase === 'matchOver' ? 'matchOver' : 'roundOver');
  dialogs.showSummary({ roundNumber, breakdown: history.at(-1), scores, target, winner });
}

/** Deals the next round; once the match is over, starts a new one. */
async function advance() {
  if (app.status === 'matchOver') {
    newMatch();
    return;
  }
  if (app.status !== 'roundOver') return;
  const { token } = app;
  dialogs.closeAll();
  setStatus('dealing');
  await runEvents(app.game.nextRound(), token);
  await beginRound(token);
}

/** Animates events in order; stops as soon as another match has started. */
async function runEvents(events, token) {
  const stage = createStage(token);
  for (const event of events) {
    if (token !== app.token) return;
    await animateEvent(stage, event);
  }
}

/**
 * The stage the animations of one match draw on; it goes quiet once another match starts.
 * @param {number} token
 * @returns {import('./animate.js').Stage}
 */
function createStage(token) {
  const live = () => token === app.token;
  return {
    get view() {
      return app.view;
    },
    get tr() {
      return app.tr;
    },
    show(view, hidden = []) {
      if (!live()) return;
      app.view = view;
      table.hide(hidden);
      draw();
    },
    reveal(keys) {
      if (live()) table.reveal(keys);
    },
    spot: (key) => (live() ? table.spotOf(key) : null),
    pileSpots: () => (live() ? table.pileSpots() : []),
    fly: (flight) => (live() && flight.from && flight.to ? flyCard(dom.flights, flight, app.tr.rank) : Promise.resolve()),
    setDeckCount(count) {
      if (live()) table.setDeckCount(count, app.tr);
    },
    toast(text) {
      if (live()) showToast(text);
    },
    burst: (title, subtitle) => (live() ? burst(dom.bursts, title, subtitle) : Promise.resolve()),
  };
}

function setStatus(status) {
  app.status = status;
  draw();
}

/** Redraws the table, the seats, the status line and the panel. */
function draw() {
  const state = app.game.getState();
  const canPlay = app.status === 'yourTurn' && !app.busy;
  table.render(app.view.table, { tr: app.tr, canPlay });
  for (const player of [HUMAN, COMPUTER]) dom.seatScores[player].textContent = String(app.view.scores[player]);
  dom.seats[HUMAN].classList.toggle('is-turn', app.status === 'yourTurn');
  dom.seats[COMPUTER].classList.toggle('is-turn', app.status === 'thinking');
  drawStatus(state, canPlay);
  renderPanel(panel, {
    view: app.view,
    tr: app.tr,
    target: state.target,
    aiLevel: state.aiLevel,
    roundNumber: state.roundNumber,
  });
}

function drawStatus({ roundNumber, target, winner }, canPlay) {
  const { t } = app.tr;
  dom.statusMeta.textContent = t('roundMeta', { n: roundNumber, target });
  dom.statusText.textContent = app.status === 'matchOver'
    ? t(winner === HUMAN ? 'youWinMatch' : 'cpuWinsMatch')
    : t(app.status);
  dom.statusHint.textContent = canPlay ? t(finePointer() ? 'hintKeys' : 'hintTouch') : '';
  const action = STATUS_ACTIONS[app.status];
  dom.statusAction.hidden = !action;
  dom.statusAction.textContent = action ? t(action) : '';
}

/** A tap or click plays a card when the press starts and ends on it. */
function wireHand() {
  let pressed = null;
  const cardAt = (target) => (target instanceof Element ? target.closest('[data-card]') : null);
  dom.yourHand.addEventListener('pointerdown', (event) => {
    const card = event.isPrimary && event.button === 0 ? cardAt(event.target) : null;
    pressed = card ? card.dataset.card : null;
  });
  dom.yourHand.addEventListener('pointerup', (event) => {
    const card = cardAt(document.elementFromPoint(event.clientX, event.clientY));
    if (pressed && card?.dataset.card === pressed) playYourCard(pressed);
    pressed = null;
  });
  dom.yourHand.addEventListener('pointercancel', () => {
    pressed = null;
  });
  // Enter or Space on a focused card, and screen readers, give clicks without a pointer press.
  dom.yourHand.addEventListener('click', (event) => {
    const card = cardAt(event.target);
    if (card && event.detail === 0) playYourCard(card.dataset.card);
  });
}

/** Keys 1–4 play the card in that position of your hand. */
function onKeyDown(event) {
  const index = CARD_KEYS.indexOf(event.key);
  if (index < 0 || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (document.querySelector('dialog[open]')) return;
  const card = app.view.table.hands[HUMAN][index];
  if (!card) return;
  event.preventDefault();
  playYourCard(card.id);
}

/** Switches between English and Turkish and remembers the choice; a toast or burst in the old language goes at once. */
function toggleLanguage() {
  const lang = LANGS[(LANGS.indexOf(app.tr.lang) + 1) % LANGS.length];
  saveSettings({ lang });
  app.tr = createTranslator(lang);
  clearToast();
  dom.bursts.replaceChildren();
  translatePage();
  dialogs.refresh();
  draw();
}

/** Puts the current language on the page's fixed texts and labels, its title and <html lang>. */
function translatePage() {
  const { t, lang } = app.tr;
  document.documentElement.lang = lang;
  document.title = t('pageTitle');
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-label]')) node.setAttribute('aria-label', t(node.dataset.i18nLabel));
}

function showRules() {
  dialogs.showRules({
    target: app.game.getState().target,
    pisti: PISTI_POINTS,
    jackPisti: JACK_PISTI_POINTS,
    majority: MAJORITY_POINTS,
  });
}

function saveSettings(changes) {
  app.settings = { ...app.settings, ...changes };
  saveValue(SETTINGS_KEY, app.settings);
}

/** A fresh seed for each match; all randomness in the game flows from it. */
function randomSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

/** Whether a mouse or trackpad is the main pointer, so the key hints make sense. */
function finePointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

byId('rules-button').addEventListener('click', showRules);
byId('new-button').addEventListener('click', () => dialogs.showNewMatch(app.settings));
byId('lang-button').addEventListener('click', toggleLanguage);
dom.statusAction.addEventListener('click', advance);
document.addEventListener('keydown', onKeyDown);
wireHand();
translatePage();
newMatch(new URLSearchParams(window.location.search).has('demo'));
