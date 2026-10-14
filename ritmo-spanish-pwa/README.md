# Ritmo: Spanish that sticks

An offline-first iPhone-friendly Spanish vocabulary app, built with plain HTML,
CSS and JavaScript. It starts with **100 curated beginner words** in ten units.
There is **no build step, account, backend, external font or online API**.

## Download and install on your iPhone

You cannot make the app work offline directly from a ChatGPT conversation or by
opening `index.html` from the iPhone's Files app. The app needs to be served once
from an HTTPS website to install its offline files. GitHub Pages is a simple,
free option for a public repository.

### A. Put it on GitHub Pages

1. Download `ritmo-spanish-pwa.zip` and unzip it on your computer.
2. Sign in to [github.com](https://github.com/) and create a **public**
   repository called `ritmo-spanish`. A public repository supports GitHub Pages
   on GitHub Free. The app contains no passwords or personal study records.
3. In the new repository, use **Add file → Upload files**. Upload the contents
   of the `ritmo-spanish-pwa` folder, **not the ZIP itself**. Make sure
   `index.html`, `app.js`, `data.js`, `srs.js`, `storage.js`, `styles.css`,
   `sw.js`, `manifest.webmanifest` and all three PNG files are at the top level
   of the repository. The optional `tests` folder and `README.md` can also be
   uploaded. Commit the files.
4. In the repository, open **Settings → Pages**. Under **Build and deployment**,
   choose **Deploy from a branch**, select `main`, select `/(root)` and **Save**.
5. Wait for GitHub Pages to deploy. Your URL will normally be:

   `https://YOUR-GITHUB-USERNAME.github.io/ritmo-spanish/`

   Open the URL in a normal web browser to check that the app appears. GitHub
   will show the live URL on the Pages settings screen.

### B. Add the app to your iPhone

1. On your iPhone, connect to Wi-Fi and open the published URL in **Safari**.
2. Wait for the green **Ready offline** indicator at the top of the app. That
   means the service worker has downloaded the app shell and all 100 words.
3. Tap **Share → Add to Home Screen**. If shown, enable **Open as Web App**,
   then tap **Add**.
4. Open **Ritmo** from the Home Screen.
5. Test it: while still online, start a lesson and complete one word. Then
   enable Airplane Mode, close/reopen Ritmo and check that the lesson,
   vocabulary and saved progress are still accessible.

The service worker loads all required app files into a versioned offline cache.
No internet connection is needed for ordinary lessons, reviews, the vocabulary
library or saved progress. Text-to-speech depends on whether iOS has a local
Spanish voice available, so **audio cannot be guaranteed offline**. The app
works without audio.

### C. Your progress and your partner's progress

Study history is stored **on each iPhone separately** in IndexedDB (or, if that
is unavailable, the browser's local storage). You and your partner can use the
same website address but have separate review queues. There is no automatic
cross-device synchronisation.

Use **Settings → Download backup** to save a `.json` copy. Keep that file in
Files, iCloud Drive or another place you control. **Settings → Restore backup**
imports a previously exported copy and replaces progress on the current phone.
Make backups occasionally, and before clearing Safari website data, deleting
the Home Screen app or changing devices. Browsers and iOS can clear local data.

## Learning rules

- Start with 10 new words per local calendar day (change to 5, 15 or 20 in
  Settings). Units are introduced sequentially.
- A lesson shows the Spanish word, its English meaning and a short example.
  Recall it successfully to add it to the scheduled review system.
- Learn → Apprentice I (due in **4 hours**).
- Each correct scheduled review advances by one stage.
- Incorrect reviews drop two stages, then become due again in **10 minutes**.
- A word becomes **Burned** after eight correct stage advances and stops
  returning in scheduled reviews.
- **Free practice** selects a random sample of up to 12 learnt words and does
  **not** change the spaced-repetition schedule.
- A session can be closed at any time. Completed answers are stored; an
  unfinished lesson word is offered again later.

| Stage | Interval until next scheduled review |
| --- | --- |
| Apprentice I | 4 hours |
| Apprentice II | 8 hours |
| Apprentice III | 23 hours |
| Apprentice IV | 47 hours |
| Guru I | 7 days |
| Guru II | 14 days |
| Master | 30 days |
| Enlightened | 120 days |
| Burned | No further scheduled reviews |

This is **inspired by WaniKani**, not its exact proprietary review algorithm.
Intervals use real elapsed time, not scheduled notifications. The app shows
reviews that are due when opened, even after several days offline. It does
**not** currently send push notifications.

### How answers work

- **Flashcards**: think of the translation, reveal, then tap **Again** or
  **I knew it**.
- **Type answer**: type the translation. The app checks the answer locally,
  ignoring case and punctuation. By default missing accents are forgiven.
  You may turn that off. Spanish articles, such as `la` and `el`, are expected
  when they appear in the learning answer.
- **Both ways** alternates English → Spanish and Spanish → English based on
  the word's review count. New lessons always begin English → Spanish.
- You can inspect examples, notes and stage status under **Words**.

## Files

| File | Role |
| --- | --- |
| `index.html` | App shell and iPhone PWA metadata |
| `styles.css` | Responsive mobile-first interface |
| `app.js` | Screens, lessons, reviews, controls and backup |
| `data.js` | 100 vocabulary items in ten units, examples and aliases |
| `srs.js` | Review stages, intervals, due queue and answer checking |
| `storage.js` | IndexedDB persistence, storage fallback and import validation |
| `sw.js` | Versioned offline cache and service worker |
| `manifest.webmanifest` | App name, Home Screen icon and install settings |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Home Screen artwork |
| `.nojekyll` | Avoids processing by GitHub Pages' Jekyll build |
| `tests/ritmo.test.mjs` | Automated tests for vocabulary and scheduling |

## Local development

You can run the app locally on your own computer:

```sh
cd ritmo-spanish-pwa
python3 -m http.server 8080
```

Open `http://localhost:8080/`. Service workers are supported at `localhost`
for development, but a phone needs a proper **HTTPS** site to install it.

The unit tests require Node.js 20+ and no external packages:

```sh
node --test tests/*.test.mjs
```

To edit the curriculum, change `data.js` and preserve existing word IDs so
backups and schedules still refer to the correct words. To publish a new app
version, **increment `CACHE_VERSION` in `sw.js`**, then upload all changed
files. The updated service worker refreshes its cache when users next open
Ritmo online. The 100-word starter course can later be expanded without
introducing a server or changing the study data format, provided migrations
are handled carefully.

## Practical limitations

- No cross-device live sync, account, push alerts or AI-generated content.
- Learning progression is one sequential set of 100 words, not a full Spanish
  grammar course.
- Offline speech playback relies on installed Spanish iOS voices.
- Exact Safari appearance and download/restore behaviour can vary by iOS
  version. Use the backup feature to protect study history.
- The deployed app itself can be public, but **study history stays locally on
  the device** unless you manually export and share a backup.

Built using browser-native technology. No analytics, advertisements or trackers.
