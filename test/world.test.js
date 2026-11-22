import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/engine/World.js';
import { Organism } from '../src/entities/Organism.js';
import { DNA } from '../src/genetics/DNA.js';
import { mkWorld } from './helpers.js';

test('save/load roundtrip: population, ids & genome survive', () => {
  const w1 = mkWorld();
  for (let f = 0; f < 30 * 60; f++) w1.update(1 / 60);
  const snap = w1.serializeState();
  const w2 = new World(2400, 1800);
  const ok = w2.loadState(JSON.parse(JSON.stringify(snap)));
  const a = w1.organisms.find(Boolean), b = w2.organisms[0];
  assert.ok(ok);
  assert.equal(w2.organisms.length, w1.organisms.length);
  assert.equal(w2.foods.length, w1.foods.length);
  assert.equal(w2.maxGeneration, w1.maxGeneration);
  assert.ok(a && b && Math.abs(a.dna.size - b.dna.size) < 0.01);
  assert.ok(w2.organisms.some(o => o.id === a.id));
});

test('save/load preserves world rules (mutation, currents, capacity)', () => {
  const w1 = new World(1200, 900);
  w1.mutationScale = 1.7;
  w1.currentStrength = 0.8;
  w1.maxPopulationCap = 240;
  const snap = JSON.parse(JSON.stringify(w1.serializeState()));
  const w2 = new World(1200, 900);
  assert.ok(w2.loadState(snap));
  assert.equal(w2.mutationScale, 1.7);
  assert.equal(w2.currentStrength, 0.8);
  assert.equal(w2.maxPopulationCap, 240);
});

test('malformed saves are rejected without mutating the world', () => {
  const w = new World(1200, 900);
  assert.equal(w.loadState({ version: 1, width: 0, height: 0, organisms: [] }), false);
  assert.equal(w.loadState({ version: 1, width: 100, height: 100, organisms: 'nope' }), false);
  assert.equal(w.loadState({ version: 1, width: 100, height: 100, organisms: [], foods: [null, 3] }), true);
  assert.equal(w.width, 100);
  assert.equal(w.foods.length, 0);
});

test('toroidal seam: organism at x=30 senses food at x=2380 (50px across the seam)', () => {
  const w = new World(2400, 1800);
  w.organisms = [];
  w.foods = [];
  w.hazards = [];
  const org = new Organism(30, 900, new DNA({ diet: -0.5, sensorRange: 200, sensorFov: Math.PI * 1.8, speed: 3, size: 10 }), 1);
  org.heading = Math.PI; // facing left, toward the seam
  w.organisms.push(org);
  const food = { x: 2380, y: 900, type: 'plant', energy: 25, radius: 3.5, age: 0, maxAge: 300, update: () => true };
  w.foods.push(food);
  w.spatialFoods.insert(food);
  w.spatialOrganisms.insert(org);

  const queried = w.spatialFoods.query(org.x, org.y, org.dna.sensorRange);
  const inputs = org.sense(queried, [], w.hazards, { width: w.width, height: w.height });
  assert.ok(queried.includes(food));
  assert.ok(inputs[0] > 0.5, `foodInput=${inputs[0].toFixed(2)}`);
  assert.ok(Math.abs(inputs[1]) < 0.1, `angleInput=${inputs[1].toFixed(2)}`);
});
