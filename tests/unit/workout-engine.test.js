const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseCSV, rowsToWorkouts, repsFor, fmt, estMin } = require('../../workout-engine.js');

const sampleCsv = fs.readFileSync(
  path.join(__dirname, '..', '..', 'testdata', 'workout-sample.csv'),
  'utf8'
);

test('parseCSV splits plain rows on commas', () => {
  const rows = parseCSV('a,b,c\n1,2,3\n');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['1', '2', '3']]);
});

test('parseCSV keeps commas inside quoted fields intact', () => {
  const rows = parseCSV('Workout,Note\nLeg day,"rest, then repeat"\n');
  assert.deepEqual(rows[1], ['Leg day', 'rest, then repeat']);
});

test('parseCSV unescapes doubled quotes inside quoted fields', () => {
  const rows = parseCSV('Workout,Note\nLeg day,"say ""hi"""\n');
  assert.equal(rows[1][1], 'say "hi"');
});

test('parseCSV skips blank lines', () => {
  const rows = parseCSV('a,b\n\n1,2\n\n');
  assert.deepEqual(rows, [['a', 'b'], ['1', '2']]);
});

test('rowsToWorkouts rejects a sheet with no data rows', () => {
  assert.throws(() => rowsToWorkouts([['Workout', 'Exercise']]), /no data rows/);
});

test('rowsToWorkouts rejects a sheet missing Workout/Exercise columns', () => {
  const rows = parseCSV('Sets,Reps\n3,10\n');
  assert.throws(() => rowsToWorkouts(rows), /Missing required columns/);
});

test('rowsToWorkouts groups rows into workouts in first-seen order', () => {
  const workouts = rowsToWorkouts(parseCSV(sampleCsv));
  assert.deepEqual(
    workouts.map(w => w.name),
    ['Test · Quick run', 'Test · Edge cases', 'Test · Long session']
  );
  assert.equal(workouts[0].exercises.length, 3);
  assert.equal(workouts[1].exercises.length, 4);
  assert.equal(workouts[2].exercises.length, 2);
});

test('rowsToWorkouts parses pyramid reps and numeric fields for a normal row', () => {
  const [quickRun] = rowsToWorkouts(parseCSV(sampleCsv));
  const pyramid = quickRun.exercises.find(e => e.name === 'Pyramid Reps');
  assert.equal(pyramid.sets, 3);
  assert.equal(pyramid.reps, '8,6,4');
  assert.equal(pyramid.weight, '12.5');
  assert.equal(pyramid.restSet, 8);
  assert.equal(pyramid.restAfter, 10);
});

test('rowsToWorkouts defaults missing reps to 8 and leaves weight blank', () => {
  const [quickRun] = rowsToWorkouts(parseCSV(sampleCsv));
  const timed = quickRun.exercises.find(e => e.name === 'Timed Exercise');
  assert.equal(timed.reps, '8');
  assert.equal(timed.weight, '');
  assert.equal(timed.workTime, 15);
});

test('rowsToWorkouts preserves zero rest-between-sets and zero rest-after', () => {
  const [, edgeCases, longSession] = rowsToWorkouts(parseCSV(sampleCsv));
  const zeroRest = edgeCases.exercises.find(e => e.name === 'Zero Rest Between Sets');
  assert.equal(zeroRest.restSet, 0);
  const finalExercise = longSession.exercises.find(e => e.name === 'Final Exercise');
  assert.equal(finalExercise.restAfter, 0);
});

test('rowsToWorkouts keeps commas and quotes inside a note intact', () => {
  const [, edgeCases] = rowsToWorkouts(parseCSV(sampleCsv));
  const longName = edgeCases.exercises.find(e => e.name === 'Very Long Exercise Name For Layout Checking');
  assert.equal(longName.note, 'Note with, a comma and "quotes"');
});

test('repsFor returns the rep count for the given set, clamped to the last value', () => {
  assert.equal(repsFor('8,6,4', 0), '8');
  assert.equal(repsFor('8,6,4', 2), '4');
  assert.equal(repsFor('8,6,4', 5), '4');
  assert.equal(repsFor('', 0), '—');
});

test('fmt formats seconds as m:ss, rounding up and zero-padding', () => {
  assert.equal(fmt(0), '0:00');
  assert.equal(fmt(65), '1:05');
  assert.equal(fmt(59.2), '1:00');
  assert.equal(fmt(-5), '0:00');
});

test('estMin estimates total minutes from sets, work time, and rest', () => {
  const workout = {
    exercises: [
      { sets: 2, workTime: 0, restSet: 8, restAfter: 10 },  // 2*40 + 1*8 + 10 = 98
      { sets: 3, workTime: 15, restSet: 5, restAfter: 20 }, // 3*15 + 2*5 + 20 = 75
    ],
  };
  assert.equal(estMin(workout), Math.round((98 + 75) / 60));
});
