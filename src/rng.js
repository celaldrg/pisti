/**
 * Seeded pseudo-random numbers (mulberry32). Every random decision in the game
 * goes through a generator made here, so the same seed replays the same game.
 */

/**
 * Creates a deterministic random number generator.
 * @param {number} seed Any number; only its lowest 32 bits are used.
 * @returns {() => number} A function returning floats in [0, 1).
 */
export function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Picks a random integer in [0, max).
 * @param {() => number} rng A generator from createRng.
 * @param {number} max Exclusive upper bound, at least 1.
 * @returns {number}
 */
export function randomInt(rng, max) {
  return Math.floor(rng() * max);
}
