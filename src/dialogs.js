/**
 * The round summary, rules and new match dialogs, built on native <dialog>.
 */
import { AI_LEVELS } from './ai.js';
import { cardPoints, parseCard } from './cards.js';
import { el, tableRow } from './dom.js';
import { COMPUTER, HUMAN, TARGETS } from './match.js';

/** @typedef {import('./ai.js').AiLevel} AiLevel */
/** @typedef {import('./i18n.js').Translator} Translator */
/** @typedef {import('./scoring.js').RoundScore} RoundScore */

/**
 * @typedef {object} RoundSummary
 * @property {number} roundNumber
 * @property {RoundScore[]} breakdown [yours, the computer's]
 * @property {number[]} scores Match totals after the round.
 * @property {number} target
 * @property {0|1|null} winner The match winner, once the match is over.
 */

const TWO_OF_CLUBS = cardPoints(parseCard('2C'));
const TEN_OF_DIAMONDS = cardPoints(parseCard('10D'));

/** Summary rows: label key and the value for one player; zero points show as a dash. */
const SUMMARY_ROWS = [
  ['sumMajority', (score) => score.majority],
  ['sumJacks', (score) => score.jacks],
  ['sumAces', (score) => score.aces],
  ['sumTwoClubs', (score) => (score.twoOfClubs ? TWO_OF_CLUBS : 0)],
  ['sumTenDiamonds', (score) => (score.tenOfDiamonds ? TEN_OF_DIAMONDS : 0)],
  ['sumPistis', (score) => score.pistiPoints],
];

/**
 * Wires the three dialogs.
 * @param {{ translator: () => Translator, onNext: () => void, onStart: (choice: { target: number, aiLevel: AiLevel }) => void }} handlers
 *   onNext: the summary's main button (next round, or a new match once the match is over).
 *   onStart: the new match dialog was confirmed.
 */
export function createDialogs({ translator, onNext, onStart }) {
  const byId = (id) => document.getElementById(id);
  const summaryDialog = byId('summary-dialog');
  const rulesDialog = byId('rules-dialog');
  const newDialog = byId('new-dialog');
  const nextButton = byId('summary-next');
  const targetSelect = byId('target-select');
  const levelSelect = byId('level-select');
  const all = [summaryDialog, rulesDialog, newDialog];
  /** @type {RoundSummary|null} */
  let summary = null;
  let rulesParams = {};

  for (const dialog of all) {
    dialog.addEventListener('click', (event) => closeOnBackdrop(dialog, event));
    for (const button of dialog.querySelectorAll('[data-close]')) button.addEventListener('click', () => dialog.close());
  }
  nextButton.addEventListener('click', () => {
    summaryDialog.close();
    onNext();
  });
  newDialog.addEventListener('close', () => {
    if (newDialog.returnValue === 'start') onStart({ target: Number(targetSelect.value), aiLevel: levelSelect.value });
  });

  function drawSummary() {
    const tr = translator();
    const { roundNumber, breakdown, scores, target, winner } = summary;
    byId('summary-title').textContent = tr.t('summaryTitle', { n: roundNumber });
    byId('summary-headline').textContent = headline(tr, breakdown, winner);
    byId('summary-body').replaceChildren(
      tableRow(tr.t('sumCards'), breakdown.map((score) => score.cards)),
      ...SUMMARY_ROWS.map(([key, value]) => tableRow(tr.t(key), breakdown.map((score) => value(score) || '–'))),
      tableRow(tr.t('sumTotal'), breakdown.map((score) => score.total), 'total'),
      tableRow(tr.t('matchScore'), [scores[HUMAN], scores[COMPUTER]], 'match'),
    );
    byId('summary-match').textContent = tr.t('firstTo', { target });
    nextButton.textContent = tr.t(winner === null ? 'nextRound' : 'playAgain');
  }

  function drawRules() {
    byId('rules-body').replaceChildren(...translator().rules(rulesParams).map(({ title, items }) => el('section', {}, [
      el('h3', { text: title }),
      el('ul', {}, items.map((item) => el('li', { text: item }))),
    ])));
  }

  function drawNewMatch(target, aiLevel) {
    const tr = translator();
    targetSelect.replaceChildren(...TARGETS.map((n) => el('option', { value: n, text: tr.t('targetOption', { n }), selected: n === target })));
    levelSelect.replaceChildren(...AI_LEVELS.map((level) => el('option', { value: level, text: tr.t(`level_${level}`), selected: level === aiLevel })));
  }

  return {
    /**
     * Opens the summary of the round just finished.
     * @param {RoundSummary} data
     */
    showSummary(data) {
      summary = data;
      drawSummary();
      open(summaryDialog);
    },

    /**
     * Opens the rules.
     * @param {Record<string, number>} params Numbers the rules text mentions: target, pisti, jackPisti, majority.
     */
    showRules(params) {
      rulesParams = params;
      drawRules();
      open(rulesDialog);
    },

    /**
     * Opens the new match dialog with the current choices selected.
     * @param {{ target: number, aiLevel: AiLevel }} current
     */
    showNewMatch({ target, aiLevel }) {
      drawNewMatch(target, aiLevel);
      newDialog.returnValue = '';
      open(newDialog);
    },

    /** Closes every open dialog. */
    closeAll() {
      for (const dialog of all) {
        if (dialog.open) dialog.close();
      }
    },

    /** Redraws the open dialog in the current language. */
    refresh() {
      if (summaryDialog.open) drawSummary();
      if (rulesDialog.open) drawRules();
      if (newDialog.open) drawNewMatch(Number(targetSelect.value), levelSelect.value);
    },
  };
}

/** Opens a dialog as a modal unless it is open already. */
function open(dialog) {
  if (!dialog.open) dialog.showModal();
}

/** Closes a dialog when a click lands on its backdrop, outside the box. */
function closeOnBackdrop(dialog, event) {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  const inside = event.clientX >= box.left && event.clientX <= box.right
    && event.clientY >= box.top && event.clientY <= box.bottom;
  if (!inside) dialog.close();
}

/** The match result once the match is over, else who won the round. */
function headline(tr, breakdown, winner) {
  if (winner !== null) return tr.t(winner === HUMAN ? 'youWinMatch' : 'cpuWinsMatch');
  const [you, cpu] = breakdown.map((score) => score.total);
  if (you === cpu) return tr.t('roundDrawn');
  return tr.t(you > cpu ? 'roundWonYou' : 'roundWonCpu');
}
