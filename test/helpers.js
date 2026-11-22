/**
 * Shared fixtures for the headless simulation tests.
 * These run the pure sim core in Node — no canvas or DOM required.
 */
import { World } from '../src/engine/World.js';

/** Advance world deterministically at a given FPS for simSeconds; return metrics. */
export function runAtFps(fps, simSeconds, seedSetup) {
  const world = seedSetup();
  const dt = 1 / fps;
  const frames = Math.round(simSeconds / dt);
  let distance = 0;
  let prev = new Map(world.organisms.map(o => [o.id, { x: o.x, y: o.y }]));

  for (let f = 0; f < frames; f++) {
    world.update(dt);
    for (const o of world.organisms) {
      const p = prev.get(o.id);
      if (p) {
        let dx = o.x - p.x, dy = o.y - p.y;
        // toroidal wrap: ignore jumps larger than half the world (wrap artifacts)
        if (Math.abs(dx) > world.width / 2) dx = 0;
        if (Math.abs(dy) > world.height / 2) dy = 0;
        distance += Math.hypot(dx, dy);
      }
      prev.set(o.id, { x: o.x, y: o.y });
    }
  }
  const aliveTime = world.organisms.map(o => o.age);
  const avgAge = aliveTime.reduce((a, b) => a + b, 0) / Math.max(1, aliveTime.length);
  return {
    population: world.organisms.length,
    totalDistance: distance,
    avgSpeed: distance / simSeconds / Math.max(1, world.organisms.length),
    maxGeneration: world.maxGeneration,
    avgAge
  };
}

/** Distance covered per real second when world.update is fed dt * scale. */
export function runScaled(scale, simSeconds, mkWorld) {
  const world = mkWorld();
  const dt = 1 / 60;
  const frames = Math.round(simSeconds / dt);
  let distance = 0;
  const prev = new Map(world.organisms.map(o => [o.id, { x: o.x, y: o.y }]));
  for (let f = 0; f < frames; f++) {
    world.update(dt * scale);
    for (const o of world.organisms) {
      const p = prev.get(o.id);
      if (p) {
        let dx = o.x - p.x, dy = o.y - p.y;
        if (Math.abs(dx) > world.width / 2) dx = 0;
        if (Math.abs(dy) > world.height / 2) dy = 0;
        distance += Math.hypot(dx, dy);
      }
      prev.set(o.id, { x: o.x, y: o.y });
    }
  }
  return distance / simSeconds;
}

/** World with a flat, pre-seeded plant food layer. */
export function mkWorld() {
  const w = new World(2400, 1800);
  w.foods = [];
  for (let i = 0; i < 200; i++) w.foods.push({ x: Math.random() * 2400, y: Math.random() * 1800, type: 'plant', energy: 25, radius: 3.5, age: 0, maxAge: 300, update: () => true });
  return w;
}
