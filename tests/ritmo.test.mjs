import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WORDS, WORD_BY_ID, UNITS } from '../data.js';
import {
  STAGES, HOUR, DAY, TEN_MINUTES, introduceCard, gradeCard,
  isDue, dueIds, matchesAnswer, normalizeAnswer, lessonAllowance, freshProgress,
  localDayKey, dayStreak
} from '../srs.js';
import { sanitiseProgress } from '../storage.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const NOW = new Date(2026, 9, 14, 12, 30).getTime();

test('exactly 100 unique words in ten sequential units', () => {
  assert.equal(WORDS.length, 100);
  assert.equal(new Set(WORDS.map(w => w.id)).size, 100);
  assert.equal(UNITS.length, 10);
  UNITS.forEach((_, i) => assert.equal(WORDS.filter(w => w.unit === i).length, 10));
  WORDS.forEach(w => {
    assert.ok(w.es.trim()); assert.ok(w.en.trim());
    assert.ok(w.exampleEs.trim()); assert.ok(w.exampleEn.trim());
    assert.equal(WORD_BY_ID[w.id], w);
  });
});

test('new lessons are Apprentice I and due after four hours', () => {
  const word = introduceCard(NOW);
  assert.equal(word.stage, 0);
  assert.equal(word.dueAt, NOW + 4 * HOUR);
  assert.equal(isDue(word, NOW + 4 * HOUR - 1), false);
  assert.equal(isDue(word, NOW + 4 * HOUR), true);
});

test('eight correct reviews reach Burned and remove further dues', () => {
  let card = introduceCard(NOW);
  let now = card.dueAt;
  for (let i = 1; i <= 8; i += 1) {
    card = gradeCard(card, true, now);
    assert.equal(card.stage, i);
    assert.equal(card.correct, i);
    if (i < 8) {
      assert.equal(card.dueAt, now + STAGES[i].interval);
      now = card.dueAt;
    }
  }
  assert.equal(card.dueAt, null);
  assert.equal(isDue(card, NOW + 1000 * DAY), false);
});

test('wrong answers drop two stages and schedule a ten-minute retry', () => {
  let card = introduceCard(NOW);
  card = gradeCard(card, true, NOW + 4 * HOUR);
  card = gradeCard(card, true, NOW + 12 * HOUR);
  assert.equal(card.stage, 2);
  const wrong = gradeCard(card, false, NOW + DAY);
  assert.equal(wrong.stage, 0);
  assert.equal(wrong.dueAt, NOW + DAY + TEN_MINUTES);
  assert.equal(wrong.correct, 2);
  assert.equal(wrong.incorrect, 1);
  assert.equal(wrong.reviewCount, 3);
});

test('dues are sorted by scheduled time, not lesson order', () => {
  const p = freshProgress();
  p.cards[WORDS[0].id] = introduceCard(NOW - 8 * HOUR);
  p.cards[WORDS[1].id] = introduceCard(NOW - 5 * HOUR);
  p.cards[WORDS[2].id] = introduceCard(NOW);
  assert.deepEqual(dueIds(p, NOW), [WORDS[0].id, WORDS[1].id]);
});

test('Spanish matching tolerates optional accents and punctuation, but keeps articles', () => {
  assert.equal(matchesAnswer(' ¡ HOLA! ', WORD_BY_ID.hello, 'en-to-es'), true);
  assert.equal(matchesAnswer('si', WORD_BY_ID.yes, 'en-to-es'), true);
  assert.equal(matchesAnswer('si', WORD_BY_ID.yes, 'en-to-es', false), false);
  assert.equal(matchesAnswer('casa', WORD_BY_ID.house, 'en-to-es'), false);
  assert.equal(matchesAnswer('La Casa', WORD_BY_ID.house, 'en-to-es'), true);
  assert.equal(matchesAnswer('el jugo', WORD_BY_ID.juice, 'en-to-es'), true);
  assert.equal(matchesAnswer('the house', WORD_BY_ID.house, 'es-to-en'), true);
  assert.equal(matchesAnswer('house', WORD_BY_ID.house, 'es-to-en'), true);
  assert.equal(matchesAnswer('make', WORD_BY_ID['to-do'], 'es-to-en'), true);
  assert.equal(normalizeAnswer('¿Por   Qué?'), 'por que');
  assert.equal(matchesAnswer('el ano', WORD_BY_ID.year, 'en-to-es'), false);
  assert.equal(matchesAnswer('el año', WORD_BY_ID.year, 'en-to-es'), true);
});

test('daily lesson allowance resets at local midnight', () => {
  const p = freshProgress();
  const yesterday = NOW - DAY;
  p.events = [
    { id: 'hello', at: yesterday, type: 'lesson', result: 'learnt' },
    { id: 'yes', at: NOW, type: 'lesson', result: 'learnt' },
    { id: 'no', at: NOW, type: 'review', result: 'correct' }
  ];
  assert.equal(lessonAllowance(p, NOW), 9);
  assert.notEqual(localDayKey(NOW), localDayKey(yesterday));
});

test('streak counts consecutive local study days', () => {
  const p = freshProgress();
  p.events = [
    { id: 'hello', at: NOW - 2 * DAY, type: 'lesson', result: 'learnt' },
    { id: 'hello', at: NOW - DAY, type: 'review', result: 'correct' },
    { id: 'yes', at: NOW, type: 'practice', result: 'again' }
  ];
  assert.equal(dayStreak(p, NOW), 3);
});

test('malformed and foreign backup content is ignored, valid progress survives', () => {
  const p = freshProgress();
  p.cards.hello = introduceCard(NOW);
  p.cards.malicious = { stage: 0, introducedAt: NOW, dueAt: NOW + HOUR };
  p.cards.goodbye = { stage: 1000, introducedAt: NOW, dueAt: NOW + HOUR };
  p.events = [
    { id: 'hello', at: NOW, type: 'lesson', result: 'learnt' },
    { id: 'malicious', at: NOW, type: 'lesson', result: 'learnt' }
  ];
  p.settings.dailyLimit = 999;
  const clean = sanitiseProgress(p);
  assert.equal(Object.keys(clean.cards).length, 1);
  assert.equal(clean.settings.dailyLimit, 10);
  assert.equal(clean.events.length, 1);
  assert.equal(sanitiseProgress({ version: 2, cards: {} }), null);
});

test('all offline assets in the service worker cache exist on disk', () => {
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  const assets = sw.match(/const ASSET_PATHS = \[([\s\S]*?)\];/)[1];
  for (const match of assets.matchAll(/'\.\/(.*?)'/g)) {
    if (match[1]) assert.ok(existsSync(join(root, match[1])), match[1]);
  }
});

test('localStorage fallback persists and restores a completed lesson', async () => {
  const { loadProgress, saveProgress } = await import('../storage.js');
  const previousLocalStorage = globalThis.localStorage;
  const previousIndexedDB = globalThis.indexedDB;
  const map = new Map();
  globalThis.localStorage = {
    getItem(key) { return map.get(key) ?? null; },
    setItem(key, value) { map.set(key, value); },
    removeItem(key) { map.delete(key); }
  };
  delete globalThis.indexedDB;
  try {
    const p = freshProgress();
    p.cards.hello = introduceCard(NOW);
    p.events.push({ id: 'hello', type: 'lesson', result: 'learnt', at: NOW });
    assert.equal(await saveProgress(p, 'localstorage'), 'localstorage');
    const restored = await loadProgress();
    assert.equal(restored.mode, 'localstorage');
    assert.equal(restored.progress.cards.hello.dueAt, NOW + 4 * HOUR);
    assert.equal(restored.progress.events.length, 1);
  } finally {
    if (previousLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousLocalStorage;
    if (previousIndexedDB === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = previousIndexedDB;
  }
});

test('service worker installs the app shell and serves cached files without fetch', async () => {
  const { runInNewContext } = await import('node:vm');
  const handlers = {};
  const cached = new Map();
  const scope = 'https://example.github.io/ritmo-spanish/';
  const cache = {
    async addAll(urls) { urls.forEach(url => cached.set(url, { ok: true, url })); },
    async match(request) { return cached.get(typeof request === 'string' ? request : request.href || request.url) ?? null; },
    async put(request, value) { cached.set(request.url, value); }
  };
  const self = {
    registration: { scope },
    location: { origin: 'https://example.github.io' },
    addEventListener(type, handler) { handlers[type] = handler; },
    async skipWaiting() {}, clients: { async claim() {} }
  };
  const mocks = {
    self, caches: { async open() { return cache; }, async keys() { return []; } },
    URL, fetch: async () => { throw Error('Network is offline'); },
    Response: { error() { throw Error('No cached response'); } }
  };
  runInNewContext(readFileSync(join(root, 'sw.js'), 'utf8'), mocks);
  let installWork;
  handlers.install({ waitUntil(p) { installWork = p; } });
  await installWork;
  assert.ok(cached.has(scope + 'data.js'));
  assert.ok(cached.has(scope + 'index.html'));
  assert.ok(cached.has(scope + 'icon-192.png'));
  let fetchWork;
  handlers.fetch({
    request: { method: 'GET', url: scope + 'data.js', mode: 'cors' },
    respondWith(p) { fetchWork = p; }
  });
  const response = await fetchWork;
  assert.equal(response.url, scope + 'data.js');
});
