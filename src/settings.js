/**
 * The player's saved preferences: language, match target and computer level.
 */
import { AI_LEVELS } from './ai.js';
import { DEFAULT_LANG, LANGS } from './i18n.js';
import { DEFAULT_TARGET, TARGETS } from './match.js';

/** @typedef {import('./i18n.js').Lang} Lang */
/** @typedef {import('./ai.js').AiLevel} AiLevel */
/** @typedef {{ lang: Lang, target: number, aiLevel: AiLevel }} Settings */

/** The level a new player meets first. */
const DEFAULT_LEVEL = 'normal';

/**
 * Turns whatever was saved (possibly nothing, or something old or broken)
 * into valid settings: each unknown value falls back to its default.
 * @param {any} saved
 * @returns {Settings}
 */
export function normalizeSettings(saved) {
  const value = saved !== null && typeof saved === 'object' ? saved : {};
  return {
    lang: LANGS.includes(value.lang) ? value.lang : DEFAULT_LANG,
    target: TARGETS.includes(value.target) ? value.target : DEFAULT_TARGET,
    aiLevel: AI_LEVELS.includes(value.aiLevel) ? value.aiLevel : DEFAULT_LEVEL,
  };
}
