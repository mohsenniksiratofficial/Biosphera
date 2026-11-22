import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HallOfFame } from '../src/engine/HallOfFame.js';
import { EvolutionChart } from '../src/ui/EvolutionChart.js';
import { PopulationChart } from '../src/ui/PopulationChart.js';
import { Camera } from '../src/render/Camera.js';
import { World } from '../src/engine/World.js';

/** Canvas 2D context stub that absorbs every call and property write. */
function ctxStub() {
  const noop = () => {};
  return new Proxy({}, {
    get: (t, prop) => (prop in t ? t[prop] : noop),
    set: (t, prop, v) => { t[prop] = v; return true; }
  });
}

test('evolution trends chart samples & renders without throwing', () => {
  const chart = new EvolutionChart(null, 30);
  chart.canvas = { width: 340, height: 110 };
  chart.ctx = ctxStub();
  for (let i = 0; i < 25; i++) {
    chart.record({ avgSize: 10 + i * 0.1, avgSpeed: 3, avgVision: 150, avgDiet: -0.2, avgGeneration: 5 }, i * 1000 + 700);
  }
  assert.equal(chart.history.length, 25);
});

test('hall of fame captures record holders', () => {
  const w = new World(2400, 1800);
  w.organisms[0].age = 200;
  w.organisms[0].kills = 5;
  const hof = new HallOfFame();
  hof.records = { oldestAge: null, mostChildren: null, mostKills: null, mostPlants: null, peakPopulation: null, maxGeneration: null };
  hof.update(w, 1000);
  assert.equal(hof.records.oldestAge?.value, 200);
  assert.equal(hof.records.mostKills?.value, 5);
});

test('CSV export: header, relative seconds, raw plant counts', () => {
  globalThis.document = { getElementById: () => null };
  const chart = new PopulationChart(null, 10);
  delete globalThis.document;
  chart.canvas = {};
  chart.history = [
    { t: 5000, herbivores: 4, carnivores: 1, omnivores: 2, plants: 37, food: 9, avgSize: 12.5, avgSpeed: 3.2, avgVision: 180, avgDiet: -0.1, avgGeneration: 4 },
    { t: 6500, herbivores: 6, carnivores: 2, omnivores: 1, plants: 41, food: 12 }
  ];
  const lines = chart.csv().split('\n');
  assert.equal(lines[0], 'time_s,herbivores,carnivores,omnivores,plants,avg_size,avg_speed,avg_vision,avg_diet,avg_generation');
  assert.equal(lines[1], '0.0,4,1,2,37,12.50,3.20,180.00,-0.10,4.00');
  assert.equal(lines[2], '1.5,6,2,1,41,,,,,');
});

test('HiDPI camera: device px scale by zoom*DPR and zoom anchors the cursor', () => {
  const cam = new Camera(0, 0, 1);
  cam.pixelRatio = 2;
  const before = cam.screenToWorld(200, 100);
  assert.ok(Math.abs(before.x - 100) < 1e-6 && Math.abs(before.y - 50) < 1e-6);
  cam.zoomAt(-1, 200, 100);
  const after = cam.screenToWorld(200, 100);
  assert.ok(Math.abs(after.x - before.x) < 1e-6 && Math.abs(after.y - before.y) < 1e-6);
});
