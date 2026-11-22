import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DNA } from '../src/genetics/DNA.js';
import { Organism } from '../src/entities/Organism.js';

test('DNA roundtrip preserves genome + brain topology', () => {
  const dna = new DNA({ size: 13.5, speed: 4.2, diet: 0.8, sensorRange: 250, sensorFov: 2.0, colorHue: 250, reproduceThreshold: 180, gestationShare: 0.5 });
  const clone = DNA.deserialize(dna.serialize());
  assert.ok(Math.abs(clone.size - 13.5) < 0.01);
  assert.ok(Math.abs(clone.speed - 4.2) < 0.01);
  assert.ok(Math.abs(clone.diet - 0.8) < 0.01);
  assert.equal(clone.colorHue, 250);
  assert.equal(clone.brain.topology.inputs, dna.brain.topology.inputs);
  assert.equal(clone.brain.weights[0][0][0], dna.brain.weights[0][0][0]);
});

test('invalid DNA returns null without throwing', () => {
  assert.equal(DNA.deserialize('!!!not-base64!!!'), null);
  assert.equal(DNA.deserialize(''), null);
});

test('crossover: every child trait picked from a parent; brain topology preserved', () => {
  const a = new DNA({ size: 6, speed: 1.5, diet: -1, sensorRange: 60, colorHue: 10 });
  const b = new DNA({ size: 22, speed: 5.5, diet: 1, sensorRange: 320, colorHue: 350 });
  let mixed = 0;
  for (let i = 0; i < 30; i++) {
    const c = DNA.crossover(a, b);
    assert.equal(c.brain.topology.inputs, 9);
    if (Object.is(c.size, a.size) || Object.is(c.size, b.size)) mixed++;
  }
  assert.equal(mixed, 30);
});

test('mutation scale 0 reproduces the genome and brain exactly', () => {
  const parent = new Organism(100, 100, new DNA({ size: 12, speed: 3, diet: -0.4, sensorRange: 180, colorHue: 77 }), 3);
  parent.energy = parent.dna.reproduceThreshold;
  const child = parent.reproduce({ width: 2400, height: 1800, mutationScale: 0 });
  const sameWeights = child.dna.brain.weights.every((layer, l) =>
    layer.every((row, j) => row.every((w, k) => w === parent.dna.brain.weights[l][j][k])));
  assert.equal(child.dna.size, parent.dna.size);
  assert.equal(child.dna.diet, parent.dna.diet);
  assert.equal(child.dna.colorHue, parent.dna.colorHue);
  assert.ok(sameWeights);
});
