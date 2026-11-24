import assert from 'node:assert/strict';
import test from 'node:test';
import { rankCandidates } from './rank.ts';

test('ranks a larger, more urgent feasible placement ahead of the closest NGO', () => {
  const results = rankCandidates(40, [
    { id: 'closest', eligible: true, allocatablePackages: 10, hoursUntilNeeded: 18, travelMinutes: 5 },
    { id: 'best-fit', eligible: true, allocatablePackages: 40, hoursUntilNeeded: 2, travelMinutes: 20 },
    { id: 'unverified', eligible: false, allocatablePackages: 40, hoursUntilNeeded: 0, travelMinutes: 1 },
  ]);
  assert.deepEqual(results.map(({ id }) => id), ['best-fit', 'closest']);
  assert.ok(results[0].score > results[1].score);
});

test('limits the allocation to available stock and handles missing need', () => {
  const candidate = {
    id: 'ngo', eligible: true, allocatablePackages: 70, hoursUntilNeeded: null, travelMinutes: 80,
  };
  assert.deepEqual(rankCandidates(40, [candidate])[0], {
    ...candidate, allocatablePackages: 40, fill: 1, urgency: 0, travel: 0, score: 0.45,
  });
  assert.deepEqual(rankCandidates(0, [candidate]), []);
});
