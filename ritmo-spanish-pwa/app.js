import { WORDS, WORD_BY_ID, UNITS } from './data.js';
import {
  STAGES, DAY, DEFAULT_SETTINGS, introduceCard, gradeCard,
  lessonAllowance, dueIds, dayStreak, formatWait, isDue,
  localDayKey, matchesAnswer
} from './srs.js';
import { loadProgress, saveProgress, sanitiseProgress } from './storage.js';

const view = document.querySelector('#view');
const connection = document.querySelector('#connection-badge');
const backupInput = document.querySelector('#backup-file');
let progress;
let storageMode = 'memory';
let offlineReady = false;
let page = 'home';
let session = null;
let selectedUnit = 0;
let selectedWord = null;
let libraryFilter = 'all';
let libraryQuery = '';
let saveChain = Promise.resolve();
let toastTimer;

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const known = word => Object.hasOwn(progress.cards, word.id);
const learntWords = () => WORDS.filter(known);
const unseenWords = () => WORDS.filter(word => !known(word));
const sessionLabel = kind => ({ lesson: 'New lesson', review: 'Scheduled review', practice: 'Free practice' })[kind];
const formatDate = ms => new Date(ms).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
const friendlyDate = () => new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

function currentUnitIndex() {
  const next = unseenWords()[0];
  return next ? next.unit : 9;
}

function unitLearned(index) {
  return WORDS.filter(word => word.unit === index && known(word)).length;
}

function stats() {
  const now = Date.now();
  const due = dueIds(progress, now);
  const total = Object.keys(progress.cards).length;
  const tomorrow = now + DAY;
  const upcoming = Object.values(progress.cards).filter(card =>
    typeof card.dueAt === 'number' && card.dueAt > now && card.dueAt <= tomorrow
  ).length;
  const reviewsToday = progress.events.filter(event => event.type === 'review' && localDayKey(event.at) === localDayKey(now));
  const attemptsToday = reviewsToday.length;
  const correctToday = reviewsToday.filter(event => event.result === 'correct').length;
  return {
    due: due.length, total, remaining: WORDS.length - total,
    allowance: Math.min(lessonAllowance(progress, now), WORDS.length - total),
    upcoming, burned: Object.values(progress.cards).filter(card => card.stage === 8).length,
    streak: dayStreak(progress, now), attemptsToday,
    accuracy: attemptsToday ? Math.round(100 * correctToday / attemptsToday) : null,
    dueNext: Object.values(progress.cards).map(card => card.dueAt).filter(at => typeof at === 'number' && at > now).sort((a, b) => a - b)[0] ?? null
  };
}

function queueSave() {
  // Each completed card is copied and queued for an ordered durable write.
  const snapshot = JSON.parse(JSON.stringify(progress));
  saveChain = saveChain.catch(() => {}).then(async () => {
    storageMode = await saveProgress(snapshot, storageMode);
    updateConnectivity();
  });
  return saveChain;
}

function recordEvent(id, type, result, at) {
  progress.events.push({ id, type, result, at });
  if (progress.events.length > 20000) progress.events.splice(0, progress.events.length - 20000);
  queueSave();
}

function notify(message) {
  const target = document.querySelector('#toast');
  target.textContent = message;
  target.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { target.hidden = true; }, 3500);
}

function updateConnectivity() {
  connection.classList.remove('is-offline', 'is-warning');
  if (storageMode === 'memory') {
    connection.textContent = 'Progress not saving';
    connection.classList.add('is-warning');
  } else if (!navigator.onLine) {
    connection.textContent = offlineReady ? 'Offline & ready' : 'Offline access unconfirmed';
    connection.classList.add(offlineReady ? 'is-offline' : 'is-warning');
  } else {
    connection.textContent = offlineReady ? 'Ready offline' : 'Setting up offline…';
  }
}

async function prepareOffline() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    connection.textContent = 'Install via HTTPS';
    connection.classList.add('is-warning');
    return;
  }
  try {
    await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    offlineReady = true;
    updateConnectivity();
  } catch (error) {
    console.warn('Offline cache installation failed:', error);
    notify('Offline files are not ready. Reopen once online.');
    connection.textContent = 'Offline setup failed';
    connection.classList.add('is-warning');
  }
}

function pageIntro(kicker, title, subtitle) {
  return `<div class="page-title"><p class="eyebrow">${escapeHTML(kicker)}</p><h1>${escapeHTML(title)}</h1><p class="lead">${escapeHTML(subtitle)}</p></div>`;
}

function metric(value, label) {
  return `<div class="metric"><div class="metric-number">${escapeHTML(value)}</div><div class="metric-label">${escapeHTML(label)}</div></div>`;
}

function actionCard(tint, symbol, title, subtitle, action, button, disabled = false) {
  return `<article class="action-card ${tint}">
    <div class="action-head"><div class="action-symbol" aria-hidden="true">${symbol}</div><span class="pill">5–10 min</span></div>
    <div><h3>${escapeHTML(title)}</h3><p class="small muted">${escapeHTML(subtitle)}</p></div>
    <button class="btn btn-primary" data-action="${action}" ${disabled ? 'disabled' : ''}>${escapeHTML(button)} <span aria-hidden="true">→</span></button>
  </article>`;
}

function miniUnits() {
  const current = currentUnitIndex();
  return `<div class="unit-mini-list" aria-label="Spanish learning units">
    ${UNITS.map((unit, index) => {
      const count = unitLearned(index);
      return `<button class="unit-mini ${index === current ? 'current' : ''} ${index > current ? 'locked' : ''}"
        data-action="open-unit" data-unit="${index}">
        <span class="symbol" aria-hidden="true">${unit.symbol}</span>
        <span class="number">UNIT ${String(index + 1).padStart(2, '0')} · ${count}/10</span>
        <span class="name">${escapeHTML(unit.title)}</span>
      </button>`;
    }).join('')}</div>`;
}

function homePage() {
  const s = stats();
  const c = currentUnitIndex();
  const heroAction = s.due > 0 ? ['start-review', `Review ${s.due} ${s.due === 1 ? 'word' : 'words'}`]
    : s.allowance > 0 ? ['start-lesson', 'Learn new words']
    : s.total > 0 ? ['start-practice', 'Practise any time'] : ['open-lessons', 'Explore lessons'];
  const nextReview = s.dueNext ? `Next in ${formatWait(s.dueNext - Date.now())}` : s.total ? 'All scheduled cards completed' : 'After your first lesson';
  return `<section class="hero">
      <div class="stack" style="gap:13px">
        <p class="eyebrow">${escapeHTML(friendlyDate())} · YOUR DAILY SPANISH</p>
        <h1>Little by little.<br>Word by word.</h1>
        <p class="lead">Build a vocabulary that stays with you, even when the train loses reception.</p>
      </div>
      <div class="hero-footer"><button class="btn btn-white" data-action="${heroAction[0]}">${heroAction[1]} <span aria-hidden="true">→</span></button></div>
    </section>
    <section class="stats-grid" aria-label="Your progress">
      ${metric(s.due, 'Reviews due')}${metric(s.allowance, 'New words left today')}${metric(s.total + '/100', 'Words learnt')}
    </section>
    <div class="section-heading"><p class="eyebrow">Your next move</p><h2>Keep the rhythm</h2></div>
    <section class="action-grid">
      ${actionCard('peach', '↻', 'Review', s.due ? `${s.due} words are ready for recall` : nextReview, 'start-review', s.due ? 'Start reviews' : 'Nothing due yet', !s.due)}
      ${actionCard('mint', '✳', 'Learn', s.allowance ? `Unit ${c + 1}: ${UNITS[c].title}` : s.remaining ? 'Daily word allowance reached' : 'You have learnt all 100 words!', 'start-lesson', s.allowance ? `Learn ${s.allowance} new` : 'Come back tomorrow', !s.allowance)}
      ${actionCard('lavender', '∞', 'Free practice', 'Extra practice without changing your review schedule', 'start-practice', 'Practise now', !s.total)}
    </section>
    <div class="section-heading"><p class="eyebrow">Where you stand</p><h2>A little goes a long way</h2></div>
    <section class="overview">
      <article class="panel stack">
        <div class="split"><h3>Course progress</h3><span class="pill">${s.total}%</span></div>
        <div class="meter" role="progressbar" aria-label="Vocabulary learnt" aria-valuenow="${s.total}" aria-valuemin="0" aria-valuemax="100"><span style="width:${s.total}%"></span></div>
        <p class="small muted">${s.remaining} words still to discover across ten beginner units.</p>
        <div class="split"><span class="small muted">Daily streak</span><strong>${s.streak} ${s.streak === 1 ? 'day' : 'days'} ✦</strong></div>
        <div class="split"><span class="small muted">Mastered words</span><strong>${s.burned}</strong></div>
      </article>
      <article class="panel stack">
        <h3>Review forecast</h3>
        <div class="timeline-row"><div><div class="time">Ready now</div><div class="sub">Practise when you have time</div></div><strong>${s.due}</strong></div>
        <div class="timeline-row"><div><div class="time">Next 24 hours</div><div class="sub">Additional cards scheduled</div></div><strong>${s.upcoming}</strong></div>
        <div class="timeline-row"><div><div class="time">Today's accuracy</div><div class="sub">From scheduled reviews</div></div><strong>${s.accuracy === null ? '—' : s.accuracy + '%'}</strong></div>
      </article>
    </section>
    <div class="section-heading split"><div><p class="eyebrow">The learning path</p><h2>Ten small steps</h2></div><button class="btn btn-plain btn-small" data-page="lessons">View all ↗</button></div>
    ${miniUnits()}
    <p class="tiny muted" style="margin:15px 0 0">Your progress stays on this device. Export a backup from Settings if you want a copy.</p>`;
}
function lessonsPage() {
  const s = stats();
  const active = currentUnitIndex();
  const doneToday = progress.events.filter(event => event.type === 'lesson' && localDayKey(event.at) === localDayKey()).length;
  return `${pageIntro('Your course', 'Learn the essentials', '100 useful words, arranged in ten short units. New units open in order as you learn.')}
    <div class="panel stack">
      <div class="split"><div><h3>Today's new words</h3><p class="small muted">${doneToday} of ${progress.settings.dailyLimit} daily lessons completed</p></div><span class="pill">${s.allowance} available</span></div>
      <div class="meter" role="progressbar" aria-valuenow="${doneToday}" aria-valuemin="0" aria-valuemax="${progress.settings.dailyLimit}" aria-label="Daily lesson progress"><span style="width:${Math.min(100, 100 * doneToday / progress.settings.dailyLimit)}%"></span></div>
      <button class="btn btn-primary btn-block" data-action="start-lesson" ${!s.allowance ? 'disabled' : ''}>${s.allowance ? 'Start a new lesson →' : s.remaining ? 'More lessons tomorrow' : 'Course completed'}</button>
    </div>
    <div class="section-heading"><h2>Your learning path</h2></div>
    <div class="unit-list">
      ${UNITS.map((unit, index) => {
        const count = unitLearned(index);
        const status = count === 10 ? 'Complete' : index > active ? 'Up next' : 'In progress';
        return `<button type="button" class="unit-row ${index > active ? 'locked' : ''}" data-action="open-unit" data-unit="${index}">
          <span class="unit-glyph ${unit.colour}" aria-hidden="true">${unit.symbol}</span>
          <span><h3>${String(index + 1).padStart(2, '0')}. ${escapeHTML(unit.title)}</h3><p>${escapeHTML(unit.subtitle)}</p></span>
          <span class="unit-right"><strong>${count}/10</strong><span>${status}</span></span>
        </button>`;
      }).join('')}
    </div>
    <p class="small muted" style="margin-top:18px">New words schedule their first review four hours later. A wrong answer in a lesson gets another immediate try.</p>`;
}

function reviewsPage() {
  const s = stats();
  const upcoming = WORDS.filter(word => known(word) && typeof progress.cards[word.id].dueAt === 'number')
    .sort((a, b) => progress.cards[a.id].dueAt - progress.cards[b.id].dueAt).slice(0, 8);
  return `${pageIntro('Spaced repetition', 'Make it stick', 'You remember a word, it waits longer before returning. Miss it, and it comes back sooner.')}
    <div class="panel stack">
      <div class="split"><div><p class="eyebrow">Ready for you</p><div style="font-size:65px;font-weight:850;line-height:1;letter-spacing:-.08em">${s.due}</div><p class="small muted">reviews waiting</p></div><span class="unit-glyph mint" style="width:75px;height:75px;font-size:39px">↻</span></div>
      <button class="btn btn-primary btn-block" data-action="start-review" ${!s.due ? 'disabled' : ''}>${s.due ? 'Start your reviews →' : 'No reviews due yet'}</button>
      ${s.due === 0 && s.total ? `<p class="small muted">Your next review is ${s.dueNext ? 'in ' + formatWait(s.dueNext - Date.now()) : 'not scheduled'}. You can still practise below.</p>` : ''}
      <button class="btn btn-outline btn-block" data-action="start-practice" ${!s.total ? 'disabled' : ''}>Practise learnt words without rescheduling</button>
    </div>
    <div class="section-heading"><h2>Coming up</h2></div>
    ${upcoming.length ? `<div class="word-list">${upcoming.map(word => {
      const card = progress.cards[word.id];
      return `<button class="word-row" data-action="open-word" data-id="${word.id}">
        <span class="word-avatar">${escapeHTML(word.es.charAt(0).toUpperCase())}</span>
        <span style="flex:1;min-width:0"><span class="word-name">${escapeHTML(word.es)}</span><span class="word-sub">${escapeHTML(word.en)}</span></span>
        <span class="word-status">${formatWait(card.dueAt - Date.now())}<br>${escapeHTML(STAGES[card.stage].short)}</span>
      </button>`;
    }).join('')}</div>` : `<div class="empty"><span class="empty-mark">✳</span><h3>Your queue is clear</h3><p class="small muted">Learn some new words to start your review cycle.</p></div>`}
    <p class="small muted" style="margin-top:19px">Correct → next stage. Missed → two stages lower and retry after 10 minutes. Your review dates are saved directly on this device.</p>`;
}

function unitPage() {
  const unit = UNITS[selectedUnit];
  const count = unitLearned(selectedUnit);
  const words = WORDS.filter(word => word.unit === selectedUnit);
  return `<button class="btn btn-plain btn-small" data-page="lessons">← All lessons</button>
    <div class="panel" style="margin-top:13px">
      <span class="unit-glyph ${unit.colour}" aria-hidden="true">${unit.symbol}</span>
      <p class="eyebrow" style="margin-top:15px">UNIT ${selectedUnit + 1} · ${count}/10 LEARNT</p>
      <h1 style="font-size:35px;margin:8px 0">${escapeHTML(unit.title)}</h1>
      <p class="lead">${escapeHTML(unit.subtitle)}</p>
      <div class="meter" style="margin-top:22px"><span style="width:${count * 10}%"></span></div>
      <p class="small muted" style="margin-top:12px">Words unlock in order. Tapping a word shows its meaning and example.</p>
    </div>
    <div class="section-heading"><h2>Inside this unit</h2></div>
    <div class="word-list">${words.map(word => wordRow(word)).join('')}</div>`;
}

function wordRow(word) {
  const card = progress.cards[word.id];
  const state = !card ? 'Not learnt' : STAGES[card.stage].short;
  return `<button class="word-row" data-action="open-word" data-id="${word.id}">
    <span class="word-avatar">${escapeHTML(word.es.charAt(0).toUpperCase())}</span>
    <span style="min-width:0;flex:1"><span class="word-name">${escapeHTML(word.es)}</span><span class="word-sub">${escapeHTML(word.en)}</span></span>
    <span class="word-status">${escapeHTML(state)}<br>›</span>
  </button>`;
}

function libraryItems() {
  const phrase = libraryQuery.trim().toLocaleLowerCase();
  return WORDS.filter(word => {
    const card = progress.cards[word.id];
    if (libraryFilter === 'learning' && (!card || card.stage === 8)) return false;
    if (libraryFilter === 'locked' && card) return false;
    if (libraryFilter === 'burned' && (!card || card.stage !== 8)) return false;
    return !phrase || [word.en, word.es, word.exampleEs, UNITS[word.unit].title].some(value => value.toLocaleLowerCase().includes(phrase));
  });
}

function libraryResults() {
  const filtered = libraryItems();
  if (!filtered.length) return `<div class="empty"><span class="empty-mark">⌕</span><h3>No words found</h3><p class="small muted">Try a different search or filter.</p></div>`;
  return `<div class="word-list">${filtered.map(wordRow).join('')}</div><p class="tiny muted" style="padding:12px 3px">Showing ${filtered.length} of ${WORDS.length} words</p>`;
}

function libraryPage() {
  const filters = [['all', 'All 100'], ['learning', 'Learning'], ['locked', 'Not learnt'], ['burned', 'Mastered']];
  return `${pageIntro('Offline vocabulary', 'Your word collection', 'Browse every word, check its example and see where it sits in the review system.')}
    <label for="word-search" class="eyebrow" style="display:block;margin-bottom:8px">Find a word</label>
    <input id="word-search" type="search" class="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search in English or Spanish…" value="${escapeHTML(libraryQuery)}">
    <div class="filter-row" role="group" aria-label="Filter vocabulary">
      ${filters.map(([value, title]) => `<button class="filter ${libraryFilter === value ? 'active' : ''}" data-action="library-filter" data-filter="${value}" aria-pressed="${libraryFilter === value}">${title}</button>`).join('')}
    </div>
    <section id="library-results" aria-live="polite">${libraryResults()}</section>`;
}

function wordPage() {
  const word = WORD_BY_ID[selectedWord];
  if (!word) return libraryPage();
  const card = progress.cards[word.id];
  return `<button class="btn btn-plain btn-small" data-page="library">← Back to words</button>
    <article class="panel word-detail" style="margin-top:14px">
      <span class="pill">UNIT ${word.unit + 1} · ${escapeHTML(UNITS[word.unit].title)}</span>
      <h1 class="detail-word" lang="es">${escapeHTML(word.es)}</h1>
      <p class="detail-meaning">${escapeHTML(word.en)}</p>
      <button class="voice-button" data-action="speak" data-id="${word.id}" aria-label="Hear Spanish pronunciation">◖)) Hear pronunciation</button>
      <div class="detail-example"><p class="eyebrow" style="margin-bottom:12px">In a sentence</p><p class="spanish" lang="es">${escapeHTML(word.exampleEs)}</p><p class="english">${escapeHTML(word.exampleEn)}</p></div>
      ${word.note ? `<div class="info-note">✳ ${escapeHTML(word.note)}</div>` : ''}
      <div class="detail-status stack gap-sm"><p class="eyebrow">Review progress</p>
      ${card ? `<h3>${escapeHTML(STAGES[card.stage].name)}</h3><p class="small muted">${card.dueAt === null ? 'Mastered. No further reviews scheduled.' : isDue(card) ? 'Due for review now' : 'Next review in ' + formatWait(card.dueAt - Date.now())}</p><p class="tiny muted">${card.correct} correct · ${card.incorrect} missed</p>` : `<h3>Not learnt yet</h3><p class="small muted">This word will appear in your lessons when its turn arrives.</p>`}
      </div>
    </article>`;
}
function option(value, label, current) {
  return `<option value="${escapeHTML(value)}" ${String(value) === String(current) ? 'selected' : ''}>${escapeHTML(label)}</option>`;
}

function settingsPage() {
  const settings = progress.settings;
  return `${pageIntro('Make it yours', 'Your settings', 'Choose how you learn. Changes are saved on this device immediately.')}
    <div class="section-heading"><h2>Daily learning</h2></div>
    <section class="panel">
      <div class="setting"><div><p class="setting-label">New words per day</p><p class="setting-description">Reviews are unlimited. New words are introduced in course order.</p></div>
        <select data-setting="dailyLimit" aria-label="Daily new word limit">
          ${[5, 10, 15, 20].map(n => option(n, n + ' words', settings.dailyLimit)).join('')}
        </select></div>
      <div class="setting"><div><p class="setting-label">Answer style</p><p class="setting-description">Reveal the answer and rate yourself, or type the word.</p></div>
        <select data-setting="answerMode" aria-label="Answer style">
          ${option('reveal', 'Flashcards', settings.answerMode)}${option('type', 'Type answer', settings.answerMode)}
        </select></div>
      <div class="setting"><div><p class="setting-label">Review direction</p><p class="setting-description">Switch between English → Spanish and Spanish → English after each scheduled review.</p></div>
        <select data-setting="reviewDirection" aria-label="Review direction">
          ${option('both', 'Both ways', settings.reviewDirection)}${option('en-to-es', 'English → Spanish', settings.reviewDirection)}
        </select></div>
      <div class="setting"><div><p class="setting-label">Forgive missing accents</p><p class="setting-description">When enabled, “si” is accepted for “sí”; correct spelling remains visible afterwards.</p></div>
        <input type="checkbox" class="toggle" data-setting="ignoreAccents" aria-label="Forgive missing accents" ${settings.ignoreAccents ? 'checked' : ''}></div>
    </section>
    <div class="section-heading"><h2>Offline & backup</h2></div>
    <section class="panel stack">
      <div class="split wrap"><div><h3>Local progress</h3><p class="small muted">${storageMode === 'indexeddb' ? 'Saved in your device’s offline database' : storageMode === 'localstorage' ? 'Saved in this browser’s local storage' : 'Persistent storage is unavailable'}</p></div><span class="pill ${storageMode === 'memory' ? 'warning' : ''}">${storageMode === 'memory' ? 'Unsaved' : 'Device only'}</span></div>
      <p class="small muted">The app doesn't create an account or send your study data to a server. Each iPhone has its own progress. For safekeeping or a phone transfer, download a backup and import it on the other device.</p>
      <div class="setting-actions">
        <button class="btn btn-secondary" data-action="export">↓ Download backup</button>
        <button class="btn btn-outline" data-action="import">↑ Restore backup</button>
      </div>
      <p class="tiny muted">Restore replaces all existing progress on this phone. Back up your current progress first.</p>
    </section>
    <div class="section-heading"><h2>Install on iPhone</h2></div>
    <section class="panel stack">
      <p class="small">Once you've opened the HTTPS app link in Safari while connected to Wi-Fi:</p>
      <ol class="instructions"><li>Tap Safari's Share button.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Choose <strong>Open as Web App</strong> if prompted, then tap Add.</li><li>Wait for the green “Ready offline” indicator here before testing in Airplane Mode.</li></ol>
      <p class="tiny muted">Written lessons, flashcards, your review schedule and progress work offline. Spoken pronunciation depends on which Spanish voices are installed on the phone.</p>
    </section>
    <div class="section-heading"><h2>Start over</h2></div>
    <section class="panel stack"><p class="small muted">Remove all vocabulary progress, review dates and settings from this device.</p>
      <button class="btn btn-danger" data-action="reset">Reset all learning progress</button>
    </section>
    <p class="tiny muted" style="margin:20px 3px">Ritmo 1.0 · 100 beginner words · Offline-first · No account needed</p>`;
}

function sessionDirection(word, kind) {
  if (kind === 'lesson' || progress.settings.reviewDirection === 'en-to-es') return 'en-to-es';
  const reviews = progress.cards[word.id]?.reviewCount || 0;
  return reviews % 2 === 0 ? 'en-to-es' : 'es-to-en';
}

function currentCard() {
  if (!session || session.position >= session.items.length) return null;
  return WORD_BY_ID[session.items[session.position]];
}

function studyCard(word) {
  return `<div class="session-card">
      <div class="session-card-top peach"><span class="label">Meet your new word</span>
      <div class="question" lang="es">${escapeHTML(word.es)}</div>
      <p class="helper">${escapeHTML(word.en)}</p>
      <button class="voice-button" data-action="speak" data-id="${word.id}">◖)) Listen</button></div>
      <div class="session-card-body">
        <div class="answer-block"><p class="answer-kicker">Example</p><p class="example" lang="es">${escapeHTML(word.exampleEs)}</p><p class="translation">${escapeHTML(word.exampleEn)}</p></div>
        ${word.note ? `<p class="info-note">✳ ${escapeHTML(word.note)}</p>` : ''}
        <p class="prompt-desc">Take a moment to remember it. You'll test yourself on the next screen.</p>
        <button class="btn btn-primary btn-block" data-action="session-ready">I'm ready to recall →</button>
      </div>
    </div>`;
}

function promptCard(word, direction) {
  const reverse = direction === 'es-to-en';
  const title = reverse ? word.es : word.en;
  const kicker = reverse ? 'Translate into English' : 'Translate into Spanish';
  const hint = reverse ? 'Think of the English meaning' : 'Include the article (el/la) where it is shown';
  const isTyping = progress.settings.answerMode === 'type';
  return `<div class="session-card">
    <div class="session-card-top ${reverse ? 'lavender' : 'peach'}"><span class="label">${kicker}</span>
      <div class="question" ${reverse ? 'lang="es"' : ''}>${escapeHTML(title)}</div><p class="helper">${hint}</p></div>
    <div class="session-card-body">
      ${isTyping ? `<form id="answer-form" autocomplete="off">
        <label class="eyebrow" style="display:block;text-align:center;margin-bottom:11px" for="response">Your answer</label>
        <input id="response" name="response" class="answer-input" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="Type your answer…" required>
        <p class="input-hint">${progress.settings.ignoreAccents ? 'Missing accents are forgiven' : 'Accents are required'} · Case doesn't matter</p>
        <button class="btn btn-primary btn-block" type="submit" style="margin-top:19px">Check answer →</button>
      </form><button class="btn btn-plain btn-block" data-action="session-reveal" style="margin-top:7px">I can't remember</button>`
      : `<p class="prompt-desc">Say the answer to yourself, then reveal it. Be fair when marking your recall.</p>
        <button class="btn btn-primary btn-block" data-action="session-reveal">Reveal answer ↓</button>`}
    </div>
  </div>`;
}

function feedbackCard(word, direction) {
  const isTyping = progress.settings.answerMode === 'type';
  const reverse = direction === 'es-to-en';
  const answer = reverse ? word.en : word.es;
  const hasResult = session.pendingResult !== null;
  const mistake = session.pendingResult === false;
  return `<div class="session-card">
      <div class="session-card-top ${reverse ? 'lavender' : 'peach'}"><span class="label">${reverse ? 'Spanish → English' : 'English → Spanish'}</span>
        <div class="question">${escapeHTML(reverse ? word.es : word.en)}</div><p class="helper">The answer</p></div>
      <div class="session-card-body">
        ${hasResult ? `<div class="feedback ${mistake ? 'again' : 'correct'}">${mistake ? 'Not quite. You will see this again sooner.' : 'Perfect recall. Nicely done!'}</div>` : ''}
        <div class="answer-block"><p class="answer-kicker">${reverse ? 'English' : 'Spanish'}</p>
          <p class="answer" ${reverse ? '' : 'lang="es"'}>${escapeHTML(answer)}</p>
          ${!reverse ? `<button class="voice-button" data-action="speak" data-id="${word.id}" style="margin-top:11px">◖)) Listen</button>` : ''}
          <p class="example" lang="es">${escapeHTML(word.exampleEs)}</p>
          <p class="translation">${escapeHTML(word.exampleEn)}</p>
        </div>
        ${word.note ? `<p class="info-note">✳ ${escapeHTML(word.note)}</p>` : ''}
        ${isTyping && session.submittedAnswer && mistake ? `<p class="small muted" style="text-align:center">You entered: <strong>${escapeHTML(session.submittedAnswer)}</strong></p>` : ''}
        ${hasResult ? (
          session.kind === 'lesson' && mistake
            ? `<button class="btn btn-primary btn-block" data-action="session-try-again">Study again →</button>`
            : `<button class="btn btn-primary btn-block" data-action="session-continue">Continue →</button>`
        ) : `<div class="card-actions">
          <button class="btn btn-danger" data-action="session-again">↻ Again</button>
          <button class="btn btn-primary" data-action="session-correct">✓ I knew it</button>
        </div>`}
      </div>
    </div>`;
}

function finishCard() {
  const count = session.items.length;
  const description = session.kind === 'lesson'
    ? `You've learnt ${count} new ${count === 1 ? 'word' : 'words'}. Their first reviews will be ready in about four hours.`
    : session.kind === 'review'
      ? `${session.correct} correct out of ${count}. Missed words will return after ten minutes.`
      : `You practised ${count} ${count === 1 ? 'word' : 'words'} without changing your review schedule.`;
  return `<div class="finish"><span class="finish-glyph" aria-hidden="true">✳</span>
    <p class="eyebrow">Session complete</p><h1 style="font-size:35px">¡Buen trabajo!</h1>
    <p class="lead">${description}</p>
    <div class="score-strip"><span>✓ ${session.correct} recalled</span><span>↻ ${session.incorrect} missed</span></div>
    <button class="btn btn-primary" data-action="finish-home">Back to dashboard →</button>
    <button class="btn btn-outline" data-action="${session.kind === 'review' ? 'start-review' : session.kind === 'lesson' ? 'start-lesson' : 'start-practice'}">${session.kind === 'review' ? 'Check for more reviews' : session.kind === 'lesson' ? 'More lessons if available' : 'Practise again'}</button>
  </div>`;
}

function sessionPage() {
  const count = session.items.length;
  const done = session.position;
  const word = currentCard();
  const label = sessionLabel(session.kind);
  const direction = word && sessionDirection(word, session.kind);
  const title = session.kind === 'lesson' ? 'Discover a word' : session.kind === 'review' ? 'What do you remember?' : 'Keep practising';
  return `<div class="session-head"><button class="btn btn-plain btn-small" data-action="exit-session">← Save & exit</button>
    <span class="session-count">${done >= count ? count : done + 1} / ${count}</span></div>
    <div class="session-caption"><p class="eyebrow">${label}</p><h2 style="margin:5px 0 17px">${title}</h2></div>
    <div class="meter session-meter" role="progressbar" aria-label="Session progress" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${count}"><span style="width:${Math.round(100 * done / count)}%"></span></div>
    ${!word ? finishCard() : session.phase === 'study' ? studyCard(word) : session.phase === 'feedback' ? feedbackCard(word, direction) : promptCard(word, direction)}
    ${word ? `<p class="tiny muted" style="text-align:center;margin:18px 4px">${session.kind === 'lesson' ? 'A new word only counts after you remember it.' : session.kind === 'practice' ? 'Practice scores do not affect scheduled reviews.' : 'Reviews are stored after every answer.'}</p>` : ''}`;
}
function render() {
  view.innerHTML = session ? sessionPage() : ({
    home: homePage,
    lessons: lessonsPage,
    reviews: reviewsPage,
    library: libraryPage,
    settings: settingsPage,
    unit: unitPage,
    word: wordPage
  }[page] || homePage)();
  document.querySelectorAll('.nav-item').forEach(button => {
    const current = button.dataset.page === (session ? (session.kind === 'review' ? 'reviews' : 'lessons') :
      page === 'unit' ? 'lessons' : page === 'word' ? 'library' : page);
    button.classList.toggle('active', current);
    if (current) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const due = dueIds(progress).length;
  const navDue = document.querySelector('#nav-due');
  navDue.textContent = due > 99 ? '99+' : String(due);
  navDue.hidden = due === 0;
  updateConnectivity();
}

function goTo(nextPage) {
  session = null;
  page = nextPage;
  render();
  window.scrollTo(0, 0);
}

function startSession(kind) {
  let ids;
  if (kind === 'lesson') {
    ids = unseenWords().slice(0, Math.min(lessonAllowance(progress), 10)).map(word => word.id);
  } else if (kind === 'review') {
    ids = dueIds(progress).slice(0, 20);
  } else {
    // Fisher-Yates shuffle. Practice never alters the SRS schedule.
    ids = learntWords().map(word => word.id);
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    ids = ids.slice(0, 12);
  }
  if (!ids.length) {
    notify(kind === 'lesson' ? 'No new lessons available right now.' : kind === 'review' ? 'Nothing due yet. Try free practice!' : 'Learn a few words before practising.');
    goTo(kind === 'lesson' ? 'lessons' : 'reviews');
    return;
  }
  session = {
    kind, items: ids, position: 0,
    phase: kind === 'lesson' ? 'study' : 'prompt',
    pendingResult: null, submittedAnswer: '', correct: 0, incorrect: 0
  };
  render();
  window.scrollTo(0, 0);
}

function commitResult(correct) {
  const word = currentCard();
  if (!word) return;
  if (session.kind === 'lesson' && !correct) {
    session.phase = 'study';
    session.pendingResult = null;
    session.submittedAnswer = '';
    render();
    return;
  }
  const at = Date.now();
  if (session.kind === 'lesson') {
    progress.cards[word.id] = introduceCard(at);
  } else if (session.kind === 'review') {
    progress.cards[word.id] = gradeCard(progress.cards[word.id], correct, at);
  }
  recordEvent(word.id, session.kind, session.kind === 'lesson' ? 'learnt' : correct ? 'correct' : 'again', at);
  session.correct += Number(correct);
  session.incorrect += Number(!correct);
  session.position += 1;
  session.phase = session.kind === 'lesson' ? 'study' : 'prompt';
  session.pendingResult = null;
  session.submittedAnswer = '';
  render();
  window.scrollTo(0, 0);
}

function pronounce(id) {
  const word = WORD_BY_ID[id];
  if (!word || !('speechSynthesis' in window)) {
    notify('Speech playback is not supported on this device.');
    return;
  }
  const utterance = new SpeechSynthesisUtterance(word.es);
  utterance.lang = 'es-ES';
  utterance.rate = .85;
  try {
    const voices = speechSynthesis.getVoices();
    const spanish = voices.filter(voice => voice.lang.toLowerCase().startsWith('es'));
    const local = spanish.find(voice => voice.localService);
    if (local) utterance.voice = local;
    else if (spanish.length) utterance.voice = spanish[0];
    else if (!navigator.onLine) {
      notify('Install a Spanish voice on your iPhone to hear words offline.');
      return;
    }
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  } catch {
    notify('Speech is unavailable at the moment.');
  }
}

function downloadBackup() {
  const file = {
    app: 'ritmo-spanish', version: 1,
    exportedAt: new Date().toISOString(),
    progress: JSON.parse(JSON.stringify(progress))
  };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ritmo-backup-${localDayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 20000);
  notify('Backup file prepared. Save it somewhere safe.');
}

async function handleBackupFile() {
  const file = backupInput.files?.[0];
  backupInput.value = '';
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { notify('Backup is too large to import.'); return; }
  try {
    const data = JSON.parse(await file.text());
    if (data?.app !== 'ritmo-spanish' || data?.version !== 1) throw new Error('Not a Ritmo backup');
    const restored = sanitiseProgress(data.progress);
    if (!restored) throw new Error('Invalid progress data');
    if (!window.confirm('This will replace all progress on this phone. Have you backed up the current progress?')) return;
    progress = restored;
    session = null;
    await queueSave();
    goTo('home');
    notify(`Restored ${Object.keys(progress.cards).length} learnt words.`);
  } catch (error) {
    console.warn('Backup import rejected:', error);
    notify('Could not read that backup. Use a Ritmo .json backup file.');
  }
}

function resetProgress() {
  const response = window.prompt('Delete ALL learning progress from this device? Type RESET to confirm.');
  if (response !== 'RESET') return;
  progress = { version: 1, cards: {}, events: [], settings: { ...DEFAULT_SETTINGS } };
  session = null;
  queueSave();
  goTo('home');
  notify('Your course has been reset.');
}

function handleAction(button) {
  const action = button.dataset.action;
  if (action === 'open-lessons') return goTo('lessons');
  if (action === 'start-review') return startSession('review');
  if (action === 'start-lesson') return startSession('lesson');
  if (action === 'start-practice') return startSession('practice');
  if (action === 'exit-session' || action === 'finish-home') return goTo('home');
  if (action === 'open-unit') {
    selectedUnit = Number(button.dataset.unit);
    return goTo('unit');
  }
  if (action === 'open-word') {
    selectedWord = button.dataset.id;
    return goTo('word');
  }
  if (action === 'library-filter') {
    libraryFilter = button.dataset.filter;
    render();
    return;
  }
  if (action === 'speak') return pronounce(button.dataset.id);
  if (action === 'export') return downloadBackup();
  if (action === 'import') return backupInput.click();
  if (action === 'reset') return resetProgress();
  if (!session || !currentCard()) return;
  if (action === 'session-ready') {
    session.phase = 'prompt';
    return render();
  }
  if (action === 'session-reveal') {
    session.pendingResult = progress.settings.answerMode === 'type' ? false : null;
    session.submittedAnswer = '';
    session.phase = 'feedback';
    return render();
  }
  if (action === 'session-try-again') {
    session.phase = 'study';
    session.pendingResult = null;
    return render();
  }
  if (action === 'session-correct') return commitResult(true);
  if (action === 'session-again') return commitResult(false);
  if (action === 'session-continue') return commitResult(session.pendingResult === true);
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.page) return goTo(button.dataset.page);
  if (button.dataset.action) handleAction(button);
});

document.addEventListener('submit', event => {
  if (event.target.id !== 'answer-form' || !session || session.phase !== 'prompt') return;
  event.preventDefault();
  const input = event.target.querySelector('#response');
  const answer = input.value.trim();
  if (!answer) return;
  const word = currentCard();
  session.submittedAnswer = answer;
  session.pendingResult = matchesAnswer(answer, word, sessionDirection(word, session.kind), progress.settings.ignoreAccents);
  session.phase = 'feedback';
  render();
});

document.addEventListener('input', event => {
  if (event.target.id !== 'word-search') return;
  libraryQuery = event.target.value;
  const results = document.querySelector('#library-results');
  if (results) results.innerHTML = libraryResults();
});

document.addEventListener('change', event => {
  const control = event.target;
  if (!control.matches('[data-setting]')) return;
  const key = control.dataset.setting;
  if (!Object.hasOwn(DEFAULT_SETTINGS, key)) return;
  const value = key === 'ignoreAccents' ? control.checked : key === 'dailyLimit' ? Number(control.value) : control.value;
  progress.settings[key] = value;
  queueSave();
  render();
  notify('Setting saved.');
});

backupInput.addEventListener('change', handleBackupFile);
window.addEventListener('online', () => { updateConnectivity(); if (!session) render(); });
window.addEventListener('offline', () => { updateConnectivity(); if (!session) render(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && progress) render(); });
setInterval(() => { if (progress && !session && ['home', 'reviews', 'lessons'].includes(page)) render(); }, 60_000);

(async function init() {
  const loaded = await loadProgress();
  progress = loaded.progress;
  storageMode = loaded.mode;
  render();
  prepareOffline();
})().catch(error => {
  console.error('Could not initialise Ritmo', error);
  view.innerHTML = '<div class="empty"><h2>Could not open Ritmo</h2><p class="small">Close and reopen the app. If this continues, open it once while connected to Wi-Fi.</p></div>';
});
