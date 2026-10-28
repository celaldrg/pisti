import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AI_LEVELS } from '../src/ai.js';
import { parseCard } from '../src/cards.js';
import { DEFAULT_LANG, LANGS, createTranslator } from '../src/i18n.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const UI_SOURCES = ['main', 'animate', 'table-view', 'panel', 'dialogs'].map((name) => read(`src/${name}.js`)).join('\n');
const translators = LANGS.map(createTranslator);
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
const allMatches = (text, pattern) => [...text.matchAll(pattern)].flatMap((match) => match.slice(1));

/** The keys of one language in the string table, read from the source because the table is private. */
function sourceKeys(lang) {
  const source = read('src/i18n.js');
  const table = source.slice(source.indexOf('const STRINGS = {'), source.indexOf('\n};', source.indexOf('const STRINGS = {')));
  const start = table.indexOf(`  ${lang}: {`);
  const end = LANGS.map((other) => table.indexOf(`  ${other}: {`)).filter((index) => index > start).sort((a, b) => a - b)[0];
  return allMatches(table.slice(start, end), /^ {4}(\w+):/gm).sort();
}

/** Every key the page looks up: in index.html, in t() and plural() calls, in the row tables and the status names. */
function usedKeys() {
  const html = read('index.html');
  const statuses = [...allMatches(UI_SOURCES, /setStatus\('(\w+)'\)/g), 'roundOver'];
  const statusActions = allMatches(UI_SOURCES.match(/STATUS_ACTIONS = \{([^}]*)\}/)[1], /'(\w+)'/g);
  return {
    plain: [...new Set([
      ...allMatches(html, /data-i18n(?:-label)?="(\w+)"/g),
      ...allMatches(UI_SOURCES, /\bt\('(\w+)'/g),
      ...allMatches(UI_SOURCES, /\bt\((?:[^'()]|\(\))*\?\s*'(\w+)'\s*:\s*'(\w+)'/g),
      ...allMatches(UI_SOURCES, /\[\s*'(\w+)',\s*\(score\)/g),
      ...statuses,
      ...statusActions,
      ...AI_LEVELS.map((level) => `level_${level}`),
    ])],
    plural: [...new Set(allMatches(UI_SOURCES, /\bplural\('(\w+)'/g))],
  };
}

test('English and Turkish have exactly the same string keys', () => {
  const [english, ...others] = LANGS.map(sourceKeys);
  assert.ok(english.length > 60, `${english.length} keys`);
  for (const keys of others) assert.deepEqual(keys, english);
});

test('every key the page uses exists in both languages, with the same placeholders', () => {
  const { plain, plural } = usedKeys();
  assert.ok(plain.length > 60, `${plain.length} keys found in the UI`);
  assert.deepEqual(plural.sort(), ['cards', 'pistiSummary']);
  const [english, ...others] = translators;
  for (const tr of translators) {
    for (const key of plain) assert.notEqual(tr.t(key), key, `${tr.lang}: ${key}`);
    for (const key of plural) {
      for (const form of ['one', 'other']) assert.notEqual(tr.t(`${key}_${form}`), `${key}_${form}`, `${tr.lang}: ${key}_${form}`);
    }
  }
  for (const tr of others) {
    for (const key of sourceKeys('en')) assert.deepEqual(placeholders(tr.t(key)), placeholders(english.t(key)), `${tr.lang}: ${key}`);
  }
});

test('the language button names the other language, and its label starts with that visible text', () => {
  for (const tr of translators) {
    const other = LANGS.find((lang) => lang !== tr.lang);
    assert.equal(tr.t('langButton'), other.toUpperCase());
    assert.ok(tr.t('langSwitch').startsWith(`${tr.t('langButton')}: `), `${tr.lang}: ${tr.t('langSwitch')}`);
  }
  const en = createTranslator('en');
  const [tag, text] = read('index.html').match(/<button[^>]*id="lang-button"[^>]*>([^<]*)</);
  assert.equal(text, en.t('langButton'), 'the page starts with the English button');
  assert.ok(tag.includes(`aria-label="${en.t('langSwitch')}"`), tag);
});

test('placeholders are filled in; unknown names are left alone', () => {
  const { t } = createTranslator('en');
  assert.equal(t('roundMeta', { n: 2, target: 101 }), 'Round 2 · to 101');
  assert.equal(t('roundMeta', { n: 2 }), 'Round 2 · to {target}');
  assert.equal(createTranslator('tr').t('roundMeta', { n: 2, target: 101 }), '2. el · 101 puana');
});

test('plurals: English counts one and other, Turkish keeps the noun singular', () => {
  const en = createTranslator('en');
  const tr = createTranslator('tr');
  assert.deepEqual([0, 1, 2, 5].map((n) => en.plural('cards', n)), ['0 cards', '1 card', '2 cards', '5 cards']);
  assert.deepEqual([1, 2].map((n) => tr.plural('cards', n)), ['1 kart', '2 kart']);
  assert.equal(en.plural('pistiSummary', 2, { points: 30 }), '2 piştis · +30');
});

test('card names in both languages', () => {
  const en = createTranslator('en');
  const tr = createTranslator('tr');
  assert.equal(en.card(parseCard('QS')), 'queen of spades');
  assert.equal(en.card(parseCard('10D')), '10 of diamonds');
  assert.equal(tr.card(parseCard('QS')), 'maça kızı');
  assert.equal(tr.card(parseCard('JC')), 'sinek valesi');
  assert.equal(tr.card(parseCard('7H')), 'kupa 7');
});

test('corner indices follow the language', () => {
  const en = createTranslator('en');
  const tr = createTranslator('tr');
  const ids = ['AS', '10D', 'JC', 'QH', 'KS'];
  assert.deepEqual(ids.map((id) => en.rank(parseCard(id))), ['A', '10', 'J', 'Q', 'K']);
  assert.deepEqual(ids.map((id) => tr.rank(parseCard(id))), ['A', '10', 'V', 'K', 'P']);
});

test('the rules have the same sections in both languages, with every number filled in', () => {
  const params = { target: 101, pisti: 10, jackPisti: 20, majority: 3 };
  const [english, ...others] = translators.map((tr) => tr.rules(params));
  assert.ok(english.length >= 5);
  for (const rules of others) {
    assert.deepEqual(rules.map((section) => section.items.length), english.map((section) => section.items.length));
  }
  for (const rules of [english, ...others]) {
    const text = rules.flatMap((section) => [section.title, ...section.items]).join('\n');
    assert.doesNotMatch(text, /[{}]/);
    for (const value of Object.values(params)) assert.match(text, new RegExp(`\\b${value}\\b`));
  }
});

test('English is the default and an unknown language falls back to it', () => {
  assert.equal(DEFAULT_LANG, 'en');
  const tr = createTranslator('de');
  assert.equal(tr.lang, 'en');
  assert.equal(tr.t('newMatch'), 'New match');
  assert.equal(createTranslator('tr').t('newMatch'), 'Yeni oyun');
});
