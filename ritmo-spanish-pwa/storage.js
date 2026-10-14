import { DEFAULT_SETTINGS, freshProgress } from './srs.js';
import { WORD_BY_ID } from './data.js';

const DB_NAME = 'ritmo-spanish-v1';
const STORE = 'app';
const KEY = 'progress';
const BACKUP_KEY = 'ritmo-spanish-fallback-v1';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('IndexedDB unavailable'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open storage'));
    request.onblocked = () => reject(new Error('Storage blocked'));
  });
}

async function idbGet() {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error || new Error('Read failed'));
      transaction.onerror = () => reject(transaction.error || new Error('Read transaction failed'));
    });
  } finally { db.close(); }
}

async function idbPut(progress) {
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(progress, KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Save failed'));
      transaction.onabort = () => reject(transaction.error || new Error('Save aborted'));
    });
  } finally { db.close(); }
}

function localGet() {
  const raw = localStorage.getItem(BACKUP_KEY);
  return raw ? JSON.parse(raw) : null;
}

function localPut(progress) {
  localStorage.setItem(BACKUP_KEY, JSON.stringify(progress));
}

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

// Validate imported material. Only recognised word IDs, settings and numeric
// history enter the app, so a malformed backup cannot break the screen.
export function sanitiseProgress(raw) {
  if (!raw || raw.version !== 1 || typeof raw !== 'object' ||
      !raw.cards || typeof raw.cards !== 'object' || Array.isArray(raw.cards)) return null;
  const progress = freshProgress();
  const settings = raw.settings || {};
  progress.settings = {
    dailyLimit: [5, 10, 15, 20].includes(settings.dailyLimit) ? settings.dailyLimit : DEFAULT_SETTINGS.dailyLimit,
    answerMode: ['reveal', 'type'].includes(settings.answerMode) ? settings.answerMode : DEFAULT_SETTINGS.answerMode,
    reviewDirection: ['both', 'en-to-es'].includes(settings.reviewDirection) ? settings.reviewDirection : DEFAULT_SETTINGS.reviewDirection,
    ignoreAccents: typeof settings.ignoreAccents === 'boolean' ? settings.ignoreAccents : DEFAULT_SETTINGS.ignoreAccents
  };
  for (const [id, card] of Object.entries(raw.cards)) {
    if (!Object.hasOwn(WORD_BY_ID, id) || !card || !Number.isInteger(card.stage) ||
        card.stage < 0 || card.stage > 8 || !Number.isFinite(card.introducedAt)) continue;
    if (card.stage < 8 && !Number.isFinite(card.dueAt)) continue;
    progress.cards[id] = {
      stage: card.stage,
      introducedAt: card.introducedAt,
      dueAt: card.stage === 8 ? null : card.dueAt,
      lastReviewedAt: Number.isFinite(card.lastReviewedAt) ? card.lastReviewedAt : null,
      reviewCount: safeCount(card.reviewCount),
      correct: safeCount(card.correct),
      incorrect: safeCount(card.incorrect)
    };
  }
  if (Array.isArray(raw.events)) {
    progress.events = raw.events.filter(event =>
      event && Object.hasOwn(WORD_BY_ID, event.id) && Number.isFinite(event.at) &&
      ['lesson', 'review', 'practice'].includes(event.type) &&
      ['learnt', 'correct', 'again'].includes(event.result)
    ).slice(-20000).map(event => ({ id: event.id, at: event.at, type: event.type, result: event.result }));
  }
  return progress;
}

export async function loadProgress() {
  let idbHealthy = false;
  try {
    const raw = await idbGet();
    idbHealthy = true;
    const progress = sanitiseProgress(raw);
    if (progress) return { progress, mode: 'indexeddb' };
  } catch (error) { console.warn('IndexedDB load unavailable:', error); }
  try {
    const progress = sanitiseProgress(localGet());
    if (progress) {
      if (idbHealthy) {
        try { await idbPut(progress); return { progress, mode: 'indexeddb' }; }
        catch { /* Keep functioning with localStorage. */ }
      }
      return { progress, mode: 'localstorage' };
    }
    // Check write access at first run so the UI can warn about private browsing.
    if (!idbHealthy) { localStorage.setItem(BACKUP_KEY + '-probe', '1'); localStorage.removeItem(BACKUP_KEY + '-probe'); }
    return { progress: freshProgress(), mode: idbHealthy ? 'indexeddb' : 'localstorage' };
  } catch (error) {
    console.warn('Persistent browser storage unavailable:', error);
    return { progress: freshProgress(), mode: 'memory' };
  }
}

export async function saveProgress(progress, preferredMode = 'indexeddb') {
  if (preferredMode === 'memory') return 'memory';
  if (preferredMode !== 'localstorage') {
    try { await idbPut(progress); return 'indexeddb'; }
    catch (error) { console.warn('IndexedDB save unavailable:', error); }
  }
  try { localPut(progress); return 'localstorage'; }
  catch (error) { console.warn('Local storage save unavailable:', error); return 'memory'; }
}
