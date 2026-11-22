/**
 * Biosphera - A/B Comparison UI
 * Modal that drives a headless ABExperiment alongside the live world and
 * charts the two population curves.
 */

import { openModal, closeModal } from './dom.js';
import { ABExperiment, AB_VARIANTS, AB_DURATION_SECONDS } from '../engine/ABExperiment.js';

const COLORS = { a: '#5aa9e6', b: '#f4a259' };

export class ABPanel {
  constructor(app) {
    this.app = app;
    this.experiment = null;
    this.modal = document.getElementById('ab-modal');

    const select = document.getElementById('ab-variant');
    for (const [key, v] of Object.entries(AB_VARIANTS)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = v.label;
      select?.appendChild(opt);
    }

    document.getElementById('btn-ab-test')?.addEventListener('click', () => {
      openModal(this.modal);
      if (!this.experiment) this.#drawEmpty();
    });
    document.getElementById('btn-close-ab')?.addEventListener('click', () => closeModal(this.modal));
    document.getElementById('btn-ab-start')?.addEventListener('click', () => this.#start());
    document.getElementById('btn-ab-again')?.addEventListener('click', () => this.#reset());
  }

  #start() {
    const variant = document.getElementById('ab-variant')?.value || 'mutation';
    const seedText = document.getElementById('ab-seed')?.value.trim() || null;
    this.experiment = new ABExperiment(seedText, variant);
    document.getElementById('ab-setup').style.display = 'none';
    document.getElementById('ab-progress').style.display = '';
    document.getElementById('ab-b-label').textContent = AB_VARIANTS[variant].label;
    document.getElementById('ab-verdict').textContent = '';
    document.getElementById('btn-ab-again').style.display = 'none';
  }

  #reset() {
    this.experiment = null;
    document.getElementById('ab-setup').style.display = '';
    document.getElementById('ab-progress').style.display = 'none';
  }

  /** Advance the headless run from the main loop; returns false when idle. */
  update(dt) {
    if (!this.experiment) return false;
    this.experiment.update(dt);
    this.#draw();
    if (this.experiment.done) {
      const s = this.experiment.summary();
      document.getElementById('ab-verdict').textContent = this.#verdictText(s);
      document.getElementById('btn-ab-again').style.display = '';
      this.experiment = null;
      return false;
    }
    return true;
  }

  #verdictText(s) {
    const pct = (g) => `${g >= 0 ? '+' : ''}${Math.round(g * 100)}%`;
    const line = `After ${Math.round(s.duration)}s on seed "${s.seed}": A ${s.popA} organisms (${pct(s.growthA)}), B ${s.popB} (${pct(s.growthB)}).`;
    if (s.winner === 'tie') return `${line} Dead heat.`;
    const w = s.winner === 'B' ? `B wins — ${s.variantLabel.toLowerCase()} helped.` : `A wins — ${s.variantLabel.toLowerCase()} hurt.`;
    return `${line} ${w}`;
  }

  #drawEmpty() {
    const canvas = document.getElementById('ab-chart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  #draw() {
    const canvas = document.getElementById('ab-chart');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const samples = this.experiment.samples;
    ctx.clearRect(0, 0, W, H);

    let maxPop = 10;
    for (const s of samples) maxPop = Math.max(maxPop, s.popA, s.popB);
    const tMax = Math.max(AB_DURATION_SECONDS, samples[samples.length - 1]?.t ?? 0);

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (H / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const plot = (key, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < samples.length; i++) {
        const x = (samples[i].t / tMax) * (W - 8) + 4;
        const y = H - 6 - (samples[i][key] / maxPop) * (H - 16);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    plot('popA', COLORS.a);
    plot('popB', COLORS.b);

    const clock = document.getElementById('ab-clock');
    if (clock) clock.textContent = `${Math.round(this.experiment.simSeconds)}s / ${AB_DURATION_SECONDS}s`;
  }
}
