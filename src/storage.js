/**
 * The only module that touches localStorage. Every access sits in try/catch:
 * in private mode, with storage blocked or full, reads give null, writes are
 * skipped and the game plays on.
 */

/** Keeps this game's keys apart from other pages on the same origin. */
const PREFIX = 'pisti:';

/**
 * Reads a value saved with saveValue.
 * @param {string} key
 * @param {Pick<Storage, 'getItem'>} [store] Defaults to window.localStorage.
 * @returns {unknown} The saved value, or null when nothing usable is saved.
 */
export function loadValue(key, store) {
  try {
    const raw = (store ?? globalThis.localStorage).getItem(PREFIX + key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Saves a value as JSON; does nothing when storage is unavailable.
 * @param {string} key
 * @param {unknown} value
 * @param {Pick<Storage, 'setItem'>} [store] Defaults to window.localStorage.
 */
export function saveValue(key, value, store) {
  try {
    (store ?? globalThis.localStorage).setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage is optional: the setting simply is not remembered.
  }
}
