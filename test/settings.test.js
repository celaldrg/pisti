import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings } from '../src/settings.js';

const DEFAULTS = { lang: 'en', target: 101, aiLevel: 'normal' };

test('nothing saved, or something that is not an object, gives the defaults', () => {
  for (const saved of [null, undefined, 'tr', 51, true, []]) {
    assert.deepEqual(normalizeSettings(saved), DEFAULTS, JSON.stringify(saved));
  }
});

test('valid saved settings are kept as they are; unknown fields are dropped', () => {
  const saved = { lang: 'tr', target: 151, aiLevel: 'easy' };
  assert.deepEqual(normalizeSettings(saved), saved);
  assert.deepEqual(normalizeSettings({ ...saved, theme: 'light' }), saved);
});

test('each invalid value falls back to its default on its own', () => {
  const valid = { lang: 'tr', target: 51, aiLevel: 'easy' };
  assert.deepEqual(normalizeSettings({ ...valid, lang: 'de' }), { ...valid, lang: 'en' });
  assert.deepEqual(normalizeSettings({ ...valid, target: '51' }), { ...valid, target: 101 });
  assert.deepEqual(normalizeSettings({ ...valid, target: 75 }), { ...valid, target: 101 });
  assert.deepEqual(normalizeSettings({ ...valid, aiLevel: 'hard' }), { ...valid, aiLevel: 'normal' });
});
