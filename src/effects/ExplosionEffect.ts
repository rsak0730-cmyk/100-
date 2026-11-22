// AETHER — Effect A: Particle Explosion
// Radial burst with drag, gravity, turbulence cooling and auto re-burst.
import type { ParticleEffect, EffectContext } from '../engine/types';
import type { ParticleSystem } from '../engine/ParticleSystem';
import { randRange, randomUnitVector } from '../engine/utils';
import { SimplexNoise } from '../engine/SimplexNoise';
import { sdt, colorFromLUT, lifeEnvelope } from './effectUtils';

export class ExplosionEffect implements ParticleEffect {
  readonly id = 'explosion';
  readonly name = 'Particle Explosion';
  readonly tagline = 'Radial burst · shockwave';
  readonly description = 'High-energy radial emission with drag, gravity, turbulent cooling and a recurring shockwave.';

  private noise = new SimplexNoise(9001);
  private lastAutoBurst = -10;
  private tmp = { x: 0, y: 0, z: 0 };
  private curl = { x: 0, y: 0, z: 0 };

  init(system: ParticleSystem, ctx: EffectContext): void {
    for (let i = 0; i < system.max; i++) {
      this.respawn(system, i, true, ctx);
    }
    this.lastAutoBurst = ctx.simTime;
    ctx.spawnShockwave(0, 0, 0, 0xffc36b, 12);
  }

  private respawn(system: ParticleSystem, i: number, stagger: boolean, ctx: EffectContext): void {
    const rng = system.rng;
    const i3 = i * 3;
    randomUnitVector(rng, this.tmp);
    const speed = randRange(rng, 5.5, 23);
    system.positions[i3] = this.tmp.x * 0.4;
    system.positions[i3 + 1] = this.tmp.y * 0.4;
    system.positions[i3 + 2] = this.tmp.z * 0.4;
    system.velocities[i3] = this.tmp.x * speed;
    system.velocities[i3 + 1] = this.tmp.y * speed;
    system.velocities[i3 + 2] = this.tmp.z * speed;
    system.maxLife[i] = randRange(rng, 1.0, 2.4);
    system.life[i] = stagger ? randRange(rng, 0.05, system.maxLife[i]) : system.maxLife[i];
    system.sizes[i] = randRange(rng, 0.45, 1.5);
    system.miscA[i] = randRange(rng, -0.08, 0.08); // color bias
    system.miscB[i] = randRange(rng, 0.6, 1.4);    // drag bias
    void ctx;
  }

  update(system: ParticleSystem, ctx: EffectContext): void {
    const p = ctx.params;
    const dt = sdt(ctx);
    const g = 13.5 * p.gravity;
    const drag = 1.55;
    const turb = p.turbulence;

    // Auto re-burst every ~7s of sim time
    if (ctx.simTime - this.lastAutoBurst > 7.0) {
      this.burst(system, ctx);
    }

    for (let i = 0; i < system.activeCount; i++) {
      const i3 = i * 3;
      system.life[i] -= dt;
      if (system.life[i] <= 0) {
        this.respawn(system, i, false, ctx);
        continue;
      }
      const px = system.positions[i3], py = system.positions[i3 + 1], pz = system.positions[i3 + 2];

      // Curl-noise turbulence for organic motion
      if (turb > 0.01) {
        this.noise.curl3(px * 0.16, py * 0.16 + ctx.simTime * 0.35, pz * 0.16, this.curl);
        const tForce = turb * 7.5;
        system.velocities[i3] += this.curl.x * tForce * dt;
        system.velocities[i3 + 1] += this.curl.y * tForce * dt;
        system.velocities[i3 + 2] += this.curl.z * tForce * dt;
      }

      // Gravity + quadratic-ish drag
      system.velocities[i3 + 1] -= g * dt;
      const dragK = Math.exp(-drag * system.miscB[i] * dt);
      system.velocities[i3] *= dragK;
      system.velocities[i3 + 1] *= dragK;
      system.velocities[i3 + 2] *= dragK;

      system.positions[i3] += system.velocities[i3] * dt;
      system.positions[i3 + 1] += system.velocities[i3 + 1] * dt;
      system.positions[i3 + 2] += system.velocities[i3 + 2] * dt;

      const lifeFrac = system.life[i] / system.maxLife[i];
      // Cooling: white-hot center of the gradient → dark red edge as it ages
      colorFromLUT(ctx, system.colors, i, 0.30 + 0.70 * lifeFrac + system.miscA[i]);
      system.alphas[i] = lifeEnvelope(lifeFrac) * (0.42 + 0.38 * lifeFrac);
      system.sizes[i] = 0.45 + 0.95 * lifeFrac; // uSizeScale uniform applies global size
    }
  }

  private burst(system: ParticleSystem, ctx: EffectContext): void {
    this.lastAutoBurst = ctx.simTime;
    const rng = system.rng;
    for (let i = 0; i < system.activeCount; i++) {
      const i3 = i * 3;
      randomUnitVector(rng, this.tmp);
      const speed = randRange(rng, 8, 26);
      system.velocities[i3] = this.tmp.x * speed;
      system.velocities[i3 + 1] = this.tmp.y * speed;
      system.velocities[i3 + 2] = this.tmp.z * speed;
      system.positions[i3] = this.tmp.x * 0.5;
      system.positions[i3 + 1] = this.tmp.y * 0.5;
      system.positions[i3 + 2] = this.tmp.z * 0.5;
      system.life[i] = system.maxLife[i] = randRange(rng, 1.1, 2.5);
    }
    ctx.spawnShockwave(0, 0, 0, 0xffb35c, 14);
  }
}
