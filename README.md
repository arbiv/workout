# Workout Player

A single-page workout timer/player that reads its program from a published
Google Sheet (or any hosted CSV). Open `index.html`, paste a published CSV
link, and it turns each row into a set/rest/exercise sequence with voice
cues and beeps.

You can also skip the paste step by passing the CSV link as a `csv` query
parameter, e.g. `index.html?csv=https://docs.google.com/.../pub?output=csv` —
the app loads it directly on boot and remembers it for next time, just like
pasting it into the setup screen.

CSV columns (row 1 headers, case-insensitive): `Workout, Exercise, Sets,
Reps, Weight, WorkTime, RestSet, RestAfter, Note`.

`testdata/workout-sample.csv` is a sample program covering the app's edge
cases (pyramid reps, max reps, timed exercises, zero rest between sets, no
rest after the final exercise, notes with commas/quotes) and is used as a
fixture by the end-to-end tests.

## Development

```
python3 -m http.server 8080   # then open http://localhost:8080
```

## Tests

```
npm install
npx playwright install --with-deps chromium   # first time only
npm test            # unit tests + end-to-end tests
npm run test:unit    # workout-engine.js logic only (no browser)
npm run test:e2e     # Playwright, drives the app in a real browser
```

- `workout-engine.js` holds the pure CSV-parsing/workout-building logic so
  it can be unit tested with Node's built-in test runner, no browser needed.
- `tests/e2e` drives the actual UI (setup → home → player) against the
  sample CSV with Playwright.
