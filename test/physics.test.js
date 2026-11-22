import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/engine/World.js';
import { FlowField } from '../src/engine/FlowField.js';
import { runAtFps, runScaled, mkWorld } from './helpers.js';

test('framerate independence: avg speed @144fps ≈ @60fps', () => {
  const m60 = runAtFps(60, 6, mkWorld);
  const m144 = runAtFps(144, 6, mkWorld);
  const ratio = m144.avgSpeed / m60.avgSpeed;
  assert.ok(ratio > 0.75 && ratio < 1.35,
    `speed@60=${m60.avgSpeed.toFixed(1)}px/s speed@144=${m144.avgSpeed.toFixed(1)}px/s ratio=${ratio.toFixed(2)}`);
});

test('speed multiplier: distance/real-sec @10x ≈ 10 × @1x', () => {
  const perSec1x = runScaled(1, 4, mkWorld);
  const perSec10x = runScaled(10, 4, mkWorld);
  const scaleRatio = perSec10x / perSec1x;
  assert.ok(scaleRatio > 7 && scaleRatio < 13,
    `1x=${perSec1x.toFixed(0)}px/s 10x=${perSec10x.toFixed(0)}px/s ratio=${scaleRatio.toFixed(2)}`);
});

test('60s stability: population bounded, no NaN coordinates', () => {
  const w = mkWorld();
  for (let f = 0; f < 60 * 60; f++) w.update(1 / 60);
  const hasNaN = w.organisms.some(o => !Number.isFinite(o.x) || !Number.isFinite(o.y) || !Number.isFinite(o.energy));
  assert.ok(!hasNaN);
  assert.ok(w.organisms.length <= w.maxPopulationCap, `pop=${w.organisms.length}`);
});

test('flow field bounded; currents keep simulation finite', () => {
  const f = new FlowField(2400, 1800);
  let bounded = true;
  for (let i = 0; i < 500; i++) {
    const v = f.sample(Math.random() * 2400, Math.random() * 1800);
    if (!Number.isFinite(v.vx) || !Number.isFinite(v.vy) || Math.abs(v.vx) > 60 || Math.abs(v.vy) > 60) bounded = false;
  }
  const w = new World(2400, 1800);
  w.currentStrength = 0.9;
  for (let i = 0; i < 60 * 20; i++) w.update(1 / 60);
  const nan = w.organisms.some(o => !Number.isFinite(o.x) || !Number.isFinite(o.y));
  assert.ok(bounded && !nan);
});
