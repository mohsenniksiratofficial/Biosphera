/**
 * Biosphera - Deterministic seeded RNG for the simulation core.
 *
 * Every stochastic step that decides an outcome (spawning, genetics,
 * brains) draws from this generator instead of Math.random, so a world
 * started from the same seed with the same step timing replays
 * identically. Rendering, audio and UI effects stay on Math.random.
 *
 * The generator is channel-based: each World owns a named channel, so
 * several worlds (the live one plus A/B comparison runs) can be stepped
 * interleaved without corrupting each other's random stream.
 */

const channels = new Map(); // name -> { next }

let activeChannel = 'live';

function mulberry32(state) {
  return function () {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash so any text (e.g. "reef-42") works as a seed. */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Seed a channel. Without a seed the channel draws from Math.random.
 * Creating a channel with the same name and seed restarts its stream.
 */
export function seedChannel(seed, name = 'live') {
  if (seed === null || seed === undefined || seed === '') {
    channels.delete(name);
    return null;
  }
  const numeric = typeof seed === 'number'
    ? Math.floor(Math.abs(seed)) >>> 0
    : hashString(String(seed));
  channels.set(name, { next: mulberry32(numeric), seed: numeric });
  return numeric;
}

/** Point simRandom() at a channel (called by World at each update). */
export function setChannel(name) {
  activeChannel = name;
}

export function dropChannel(name) {
  channels.delete(name);
  if (activeChannel === name) activeChannel = 'live';
}

export function getSeed(name = activeChannel) {
  return channels.get(name)?.seed ?? null;
}

/** The simulation draw. Falls back to Math.random for unseeded channels. */
export function simRandom() {
  return channels.get(activeChannel)?.next() ?? Math.random();
}

/** Short random seed string for the "new seed" button. */
export function randomSeedString() {
  return Math.floor(Math.random() * 0xffffffff).toString(36);
}
