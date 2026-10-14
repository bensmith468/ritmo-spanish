// Pure scheduling and matching helpers. No network or browser dependencies.
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
export const TEN_MINUTES = 10 * 60 * 1000;

// A newly introduced word is Apprentice I, due in four hours. A correct review
// advances it one stage. An incorrect review drops it two stages and schedules
// a short retry, independent of the rest of the queue.
export const STAGES = [
  { name: 'Apprentice I', short: 'Apprentice', interval: 4 * HOUR },
  { name: 'Apprentice II', short: 'Apprentice', interval: 8 * HOUR },
  { name: 'Apprentice III', short: 'Apprentice', interval: 23 * HOUR },
  { name: 'Apprentice IV', short: 'Apprentice', interval: 47 * HOUR },
  { name: 'Guru I', short: 'Guru', interval: 7 * DAY },
  { name: 'Guru II', short: 'Guru', interval: 14 * DAY },
  { name: 'Master', short: 'Master', interval: 30 * DAY },
  { name: 'Enlightened', short: 'Enlightened', interval: 120 * DAY },
  { name: 'Burned', short: 'Burned', interval: null }
];

export function introduceCard(at = Date.now()) {
  return {
    stage: 0, introducedAt: at, dueAt: at + STAGES[0].interval,
    lastReviewedAt: null, reviewCount: 0, correct: 0, incorrect: 0
  };
}

export function gradeCard(card, correct, at = Date.now()) {
  const stage = correct ? Math.min(card.stage + 1, 8) : Math.max(0, card.stage - 2);
  return {
    ...card,
    stage,
    dueAt: correct ? (stage === 8 ? null : at + STAGES[stage].interval) : at + TEN_MINUTES,
    lastReviewedAt: at,
    reviewCount: card.reviewCount + 1,
    correct: card.correct + Number(correct),
    incorrect: card.incorrect + Number(!correct)
  };
}

export function isDue(card, at = Date.now()) {
  return !!card && card.stage < 8 && typeof card.dueAt === 'number' && card.dueAt <= at;
}

export function localDayKey(at = Date.now()) {
  const date = new Date(at);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function normalizeAnswer(value, ignoreAccents = true) {
  let text = String(value ?? '').toLowerCase().trim().normalize('NFC');
  // Preserve ñ: 'año' and 'ano' are different words. Forgive vowel accents only.
  if (ignoreAccents) text = text
    .replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i').replace(/[óòôö]/g, 'o')
    .replace(/[úùûü]/g, 'u');
  return text
    .replace(/[¿?¡!.,;:()“”"'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesAnswer(answer, word, direction, ignoreAccents = true) {
  const english = word.en.replace(/\s*\([^)]*\)/g, '');
  const expected = direction === 'en-to-es'
    ? [word.es, ...(word.spanishAliases || [])]
    : [english, ...(word.englishAliases || [])];
  // A definite Spanish noun may naturally translate to 'house' or 'the house'.
  if (direction === 'es-to-en' && /^(el|la|los|las)\s/i.test(word.es)) {
    expected.push(`the ${english}`);
  }
  const cleaned = normalizeAnswer(answer, ignoreAccents);
  return cleaned.length > 0 && expected.some(value => normalizeAnswer(value, ignoreAccents) === cleaned);
}

export function formatWait(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return 'Now';
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.ceil(ms / HOUR);
  if (hours < 48) return `${hours}h`;
  const days = Math.ceil(ms / DAY);
  return `${days}d`;
}

export const DEFAULT_SETTINGS = Object.freeze({
  dailyLimit: 10,
  answerMode: 'reveal',
  reviewDirection: 'both',
  ignoreAccents: true
});

export function freshProgress() {
  return { version: 1, settings: { ...DEFAULT_SETTINGS }, cards: {}, events: [] };
}

export function lessonAllowance(progress, now = Date.now()) {
  const todaysLessons = progress.events.filter(event =>
    event.type === 'lesson' && localDayKey(event.at) === localDayKey(now)
  ).length;
  return Math.max(0, progress.settings.dailyLimit - todaysLessons);
}

export function dueIds(progress, now = Date.now()) {
  return Object.entries(progress.cards)
    .filter(([, card]) => isDue(card, now))
    .sort((a, b) => a[1].dueAt - b[1].dueAt)
    .map(([id]) => id);
}

export function dayStreak(progress, now = Date.now()) {
  const active = new Set(progress.events.filter(e => ['lesson', 'review', 'practice'].includes(e.type))
    .map(e => localDayKey(e.at)));
  const date = new Date(now);
  date.setHours(12, 0, 0, 0); // avoids DST-related midnight changes
  if (!active.has(localDayKey(date.getTime()))) date.setDate(date.getDate() - 1);
  let streak = 0;
  while (active.has(localDayKey(date.getTime()))) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}
