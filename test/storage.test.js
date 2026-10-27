import test from 'node:test';
import assert from 'node:assert/strict';
import { loadValue, saveValue } from '../src/storage.js';

/** A stand-in for localStorage that keeps strings, as the real one does. */
function memoryStore() {
  const items = new Map();
  return {
    items,
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => {
      items.set(key, String(value));
    },
  };
}

/** Storage that is blocked (private mode) or full: every call throws. */
const brokenStore = {
  getItem() {
    throw new Error('blocked');
  },
  setItem() {
    throw new Error('full');
  },
};

test('a saved value loads back, stored as JSON under a "pisti:" key', () => {
  const store = memoryStore();
  const settings = { lang: 'tr', target: 51, aiLevel: 'easy' };
  saveValue('settings', settings, store);
  assert.deepEqual([...store.items.keys()], ['pisti:settings']);
  assert.deepEqual(JSON.parse(store.items.get('pisti:settings')), settings);
  assert.deepEqual(loadValue('settings', store), settings);
});

test('nothing saved, or something unreadable, loads as null', () => {
  const store = memoryStore();
  assert.equal(loadValue('settings', store), null);
  store.items.set('pisti:settings', '{not json');
  assert.equal(loadValue('settings', store), null);
});

test('blocked or full storage never throws: loads give null and saves are skipped', () => {
  assert.equal(loadValue('settings', brokenStore), null);
  assert.doesNotThrow(() => saveValue('settings', { lang: 'en' }, brokenStore));
});
