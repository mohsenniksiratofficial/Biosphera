/**
 * Tests for the seeded RNG and repeatable-world guarantees.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/engine/World.js';
import { ABExperiment } from '../src/engine/ABExperiment.js';
import { simRandom, seedChannel, setChannel, getSeed, hashString } from '../src/engine/rng.js';

test('same seed produces identical world evolution', () => {
  const run = () => {
    const w = new World(1200, 900, 'reef-42');
    for (let i = 0; i < 240; i++) w.update(1 / 30);
    return {
      pop: w.organisms.length,
      food: w.foods.length,
      gen: w.maxGeneration,
      sizes: w.organisms.map(o => o.dna.size.toFixed(6)).join(',')
    };
  };
  assert.deepEqual(run(), run());
});

test('different seeds diverge', () => {
  const w1 = new World(1200, 900, 'seed-one');
  const w2 = new World(1200, 900, 'seed-two');
  for (let i = 0; i < 120; i++) { w1.update(1 / 30); w2.update(1 / 30); }
  const sig = (w) => w.organisms.map(o => Math.round(o.x * 100)).join(',');
  assert.notEqual(sig(w1), sig(w2));
});

test('interleaved worlds keep independent random streams', () => {
  const solo = new World(1200, 900, 'iso');
  for (let i = 0; i < 90; i++) solo.update(1 / 30);
  const soloSig = solo.organisms.map(o => o.x.toFixed(4)).join(',');

  const a = new World(1200, 900, 'iso');
  const noise = new World(1200, 900, 'other');
  for (let i = 0; i < 90; i++) { a.update(1 / 30); noise.update(1 / 30); }
  assert.equal(a.organisms.map(o => o.x.toFixed(4)).join(','), soloSig);
});

test('rng: seeded stream is deterministic, unseeded falls back, hash is stable', () => {
  seedChannel('abc', 't1');
  setChannel('t1');
  const s1 = [simRandom(), simRandom(), simRandom()];
  seedChannel('abc', 't1');
  const s2 = [simRandom(), simRandom(), simRandom()];
  assert.deepEqual(s1, s2);

  seedChannel(null, 't2');
  setChannel('t2');
  const r = simRandom();
  assert.ok(r >= 0 && r < 1);

  assert.equal(hashString('reef-42'), hashString('reef-42'));
  assert.equal(getSeed('t1'), hashString('abc'));
});

test('A/B experiment: shared seed, variant applied only to B, produces a verdict', () => {
  const ab = new ABExperiment('reef-42', 'mutation');
  assert.equal(ab.worldB.mutationScale, 2);
  assert.equal(ab.worldA.mutationScale, 1);
  assert.equal(ab.worldA.organisms.length, ab.worldB.organisms.length);
  while (!ab.done) ab.update(1 / 30);
  const s = ab.summary();
  assert.ok(s.samples.length >= 2);
  assert.equal(s.variant, 'mutation');
  assert.ok(['A', 'B', 'tie'].includes(s.winner));
});
