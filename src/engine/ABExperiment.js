/**
 * Biosphera - A/B Comparison Experiment
 *
 * Runs two headless worlds from the same seed in parallel with one rule
 * changed between them (A = baseline, B = variant). Both worlds are
 * stepped with the same fixed timestep so their random streams stay in
 * lockstep and the only difference is the rule being tested.
 */

import { World } from './World.js';
import { setChannel } from './rng.js';

export const AB_VARIANTS = {
  mutation: { label: 'Mutation intensity ×2', apply: (w) => { w.mutationScale = 2; } },
  food: { label: 'Food abundance ×0.5', apply: (w) => { w.foodRateMultiplier = 0.5; } },
  currents: { label: 'Current strength ×2', apply: (w) => { w.currentStrength = 2; } },
  metabolism: { label: 'Metabolism cost ×1.5', apply: (w) => { w.metabolismMultiplier = 1.5; } }
};

export const AB_DURATION_SECONDS = 120;
export const AB_SAMPLE_EVERY = 5; // sim seconds between population samples

export class ABExperiment {
  /**
   * @param {string|null} seed Shared starting seed; null draws one.
   * @param {string} variantKey One of AB_VARIANTS.
   */
  constructor(seed = null, variantKey = 'mutation') {
    this.variantKey = variantKey in AB_VARIANTS ? variantKey : 'mutation';
    this.variant = AB_VARIANTS[this.variantKey];
    this.seed = seed ?? `ab-${Date.now().toString(36)}`;

    this.worldA = new World(2400, 1800, this.seed);
    this.worldB = new World(2400, 1800, this.seed);
    this.variant.apply(this.worldB);

    this.simSeconds = 0;
    this.nextSample = 0;
    this.samples = []; // { t, popA, popB, genA, genB, dietA, dietB }
    this.done = false;
    this.#sample();
  }

  #sample() {
    const stats = (w) => {
      const n = w.organisms.length || 1;
      return {
        pop: w.organisms.length,
        gen: w.organisms.reduce((s, o) => s + o.generation, 0) / n,
        diet: w.organisms.reduce((s, o) => s + o.dna.diet, 0) / n
      };
    };
    const a = stats(this.worldA);
    const b = stats(this.worldB);
    this.samples.push({ t: this.simSeconds, popA: a.pop, popB: b.pop, genA: a.gen, genB: b.gen, dietA: a.diet, dietB: b.diet });
  }

  /** Advance both worlds by dt seconds of simulation time. */
  update(dt) {
    if (this.done) return;
    // Round-robin so neither world gets a biased share of a frame.
    this.worldA.update(dt);
    this.worldB.update(dt);
    this.simSeconds += dt * this.worldA.timeScale;
    if (this.simSeconds >= this.nextSample) {
      this.#sample();
      this.nextSample += AB_SAMPLE_EVERY;
    }
    if (this.simSeconds >= AB_DURATION_SECONDS) {
      this.done = true;
      this.#sample();
    }
  }

  /** Summary verdict once the run completes. */
  summary() {
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const growth = (p0, p1) => (p0 === 0 ? 0 : (p1 - p0) / Math.max(1, p0));
    return {
      seed: this.seed,
      variant: this.variantKey,
      variantLabel: this.variant.label,
      duration: this.simSeconds,
      popA: last.popA,
      popB: last.popB,
      growthA: growth(first.popA, last.popA),
      growthB: growth(first.popB, last.popB),
      genA: last.genA,
      genB: last.genB,
      samples: this.samples,
      winner: last.popB > last.popA ? 'B' : last.popA > last.popB ? 'A' : 'tie'
    };
  }
}
