/**
 * The score panel: the match score with progress toward the target, a
 * running tally of the round being played and the finished rounds.
 */
import { el, tableRow } from './dom.js';
import { COMPUTER, HUMAN } from './match.js';
import { scoreRound } from './scoring.js';

/** @typedef {import('./ai.js').AiLevel} AiLevel */
/** @typedef {import('./i18n.js').Translator} Translator */
/** @typedef {import('./scoring.js').RoundScore} RoundScore */
/** @typedef {import('./table-model.js').View} View */

/**
 * @typedef {object} PanelNodes
 * @property {HTMLElement} matchMeta
 * @property {HTMLElement[]} scores [yours, the computer's]
 * @property {HTMLElement[]} bars [yours, the computer's]
 * @property {HTMLElement} roundTitle
 * @property {HTMLElement} tally
 * @property {HTMLElement} history
 */

/** Rows of the round tally: label key and the value for one player. */
const TALLY_ROWS = [
  ['rowCards', (score) => score.cards],
  ['rowCardPoints', (score) => score.cardPoints],
  ['rowPistis', (score) => score.pistiCount],
];

/**
 * Redraws the panel.
 * @param {PanelNodes} nodes
 * @param {{ view: View, tr: Translator, target: number, aiLevel: AiLevel, roundNumber: number }} data
 */
export function renderPanel(nodes, { view, tr, target, aiLevel, roundNumber }) {
  nodes.matchMeta.textContent = tr.t('matchMeta', { target, level: tr.t(`level_${aiLevel}`) });
  for (const player of [HUMAN, COMPUTER]) {
    nodes.scores[player].textContent = String(view.scores[player]);
    nodes.bars[player].style.width = `${Math.min(100, (100 * view.scores[player]) / target)}%`;
  }
  nodes.roundTitle.textContent = tr.t('roundN', { n: roundNumber });
  const score = scoreRound(view.table);
  nodes.tally.replaceChildren(
    ...TALLY_ROWS.map(([key, value]) => tableRow(tr.t(key), score.map(value))),
    tableRow(tr.t('rowSoFar'), score.map((side) => side.total), 'total'),
  );
  nodes.history.replaceChildren(...historyItems(view.history, tr));
}

/** One line per finished round, marked with who won it. */
function historyItems(history, tr) {
  if (history.length === 0) return [el('li', { class: 'empty', text: tr.t('noRounds') })];
  return history.map((breakdown, i) => {
    const [you, cpu] = breakdown.map((score) => score.total);
    return el('li', { class: roundResult(you, cpu) }, [
      el('span', { text: tr.t('roundN', { n: i + 1 }) }),
      el('span', { class: 'history-score', text: `${you} – ${cpu}` }),
    ]);
  });
}

/** Class name for a round you won, lost or drew. */
function roundResult(you, cpu) {
  if (you === cpu) return 'is-draw';
  return you > cpu ? 'is-won' : 'is-lost';
}
