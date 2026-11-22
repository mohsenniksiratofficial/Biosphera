import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/engine/World.js';
import { Organism } from '../src/entities/Organism.js';
import { DNA } from '../src/genetics/DNA.js';
import { SeasonCycle } from '../src/engine/SeasonCycle.js';
import { PheromoneField } from '../src/engine/PheromoneField.js';
import { SpeciesRegistry } from '../src/engine/SpeciesRegistry.js';

test('season cycle covers all 4 seasons with sane multipliers', () => {
  const s = new SeasonCycle(1);
  const seen = new Set();
  for (let i = 0; i < 10; i++) {
    const m = s.getMultipliers();
    assert.ok(m.food > 0 && m.food <= 1.5 && m.metabolism >= 0.9 && m.metabolism <= 1.25);
    seen.add(s.getSeason());
    s.update(1);
  }
  assert.equal(seen.size, 4);
});

test('pheromone field: deposits register, decay over time, signal within [-1,1]', () => {
  const p = new PheromoneField(2400, 1800);
  for (let i = 0; i < 20; i++) p.deposit(100, 100, 'food', 0.5);
  const peak = p.sample(100, 100);
  for (let i = 0; i < 40; i++) p.update(1);
  const decayed = p.sample(100, 100);
  assert.ok(peak > 0.5, `peak=${peak.toFixed(2)}`);
  assert.ok(decayed < peak, `decayed=${decayed.toFixed(2)}`);
  assert.ok(Math.abs(decayed) <= 1);
});

test('species clustering: two distinct genomes → two named species, all members labeled', () => {
  const reg = new SpeciesRegistry();
  const w = new World(2400, 1800);
  w.organisms = [];
  const g1 = new DNA({ size: 12, speed: 3, diet: -0.8, sensorRange: 150, colorHue: 100 });
  const g2 = new DNA({ size: 21, speed: 5, diet: 0.9, sensorRange: 300, colorHue: 300 });
  for (let i = 0; i < 8; i++) w.organisms.push(new Organism(i * 50, 100, g1.mutate(0.02, 0.1), 1));
  for (let i = 0; i < 5; i++) w.organisms.push(new Organism(i * 50, 900, g2.mutate(0.02, 0.1), 1));
  reg.update(w, 1000);
  assert.equal(reg.species.length, 2);
  assert.ok(reg.species.every(s => s.count === 8 || s.count === 5),
    reg.species.map(s => `${s.name}×${s.count}`).join(', '));
  assert.ok(w.organisms.every(o => typeof o.speciesName === 'string' && o.speciesName.length > 2));

  const names1 = reg.species.map(s => s.name);
  const reg2 = new SpeciesRegistry();
  reg2.update(w, 1000);
  assert.deepEqual(reg2.species.map(s => s.name), names1);
});

test('mating produces child with recombined DNA & energy transfer', () => {
  const w = new World(2400, 1800);
  w.organisms = [];
  w.sexualReproduction = true;
  const dna = new DNA({ size: 12, speed: 3, diet: -0.5, sensorRange: 200, colorHue: 50 });
  const p1 = new Organism(100, 100, dna, 3);
  const p2 = new Organism(120, 100, new DNA({ size: 14, speed: 3.5, diet: -0.4, sensorRange: 220, colorHue: 60 }), 3);
  p1.energy = p1.dna.reproduceThreshold;
  p2.energy = p2.dna.reproduceThreshold;
  p1.age = 10; p2.age = 10; p1.heading = 0; p2.heading = Math.PI;
  w.organisms.push(p1, p2);
  w.spatialOrganisms.insert(p1); w.spatialOrganisms.insert(p2);
  const child = p1.mateWith(p2);
  assert.ok(child);
  assert.equal(child.generation, 4);
  assert.equal(child.parentId, p1.id);
  assert.equal(p1.childrenCount, 1);
  assert.equal(p2.childrenCount, 1);
  assert.ok(p1.reproduceCooldown > 8);
  assert.ok(child.energy > 0);
});

test('full biosphere blocks birth before the parent pays; open capacity allows it', () => {
  const org = new Organism(100, 100, new DNA({ size: 12, speed: 3, diet: -0.5, sensorRange: 160 }), 1);
  org.dna.brain.feedForward = () => new Float32Array([0, 0, 0, 1]);
  org.energy = org.dna.reproduceThreshold + 10;
  org.age = 10;
  org.reproduceCooldown = 0;

  const base = { width: 2400, height: 1800, metabolismMult: 1, population: 1 };
  const blocked = org.update(1 / 60, 2400, 1800, [], [], [], { ...base, allowBirth: false });
  const blockedCost = org.reproduceCooldown === 0 && org.childrenCount === 0;
  const allowed = org.update(1 / 60, 2400, 1800, [], [], [], { ...base, allowBirth: true });

  assert.equal(blocked, null);
  assert.ok(blockedCost);
  assert.ok(allowed);
  assert.equal(org.childrenCount, 1);
  assert.ok(org.reproduceCooldown > 0);
});
