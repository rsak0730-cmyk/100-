// AETHER Particle Lab — render/simulation orchestrator
// WebGL2 (via three.js) + custom GLSL point sprites + CPU typed-array physics.
// Owns: renderer, camera rig, bloom/afterimage passes, shockwaves, pointer
// wells, adaptive quality, stats reporting.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';

import particlesVert from '../shaders/particles.vert?raw';
import particlesFrag from '../shaders/particles.frag?raw';
import shockwaveVert from '../shaders/shockwave.vert?raw';
import shockwaveFrag from '../shaders/shockwave.frag?raw';

import { ParticleSystem, MAX_PARTICLES } from './ParticleSystem';
import { CameraController } from './CameraController';
import { AdaptiveQuality } from './AdaptiveQuality';
import { buildGradientLUT, clamp } from './utils';
import { getPalette } from './palettes';
import type { EffectParams, ParticleEffect, PointerWell, AudioLevels } from './types';

import { ExplosionEffect } from '../effects/ExplosionEffect';
import { BlackHoleEffect } from '../effects/BlackHoleEffect';
import { GalaxyEffect } from '../effects/GalaxyEffect';
import { LiquidEffect } from '../effects/LiquidEffect';
import { MagneticEffect } from '../effects/MagneticEffect';
import { SmokeEffect } from '../effects/SmokeEffect';
import { NebulaEffect } from '../effects/NebulaEffect';
import { WaveEffect } from '../effects/WaveEffect';
import { DNAEffect } from '../effects/DNAEffect';
import { AudioReactiveEffect } from '../effects/AudioReactiveEffect';

export class EngineError extends Error {}

export type InteractionMode = 'attract' | 'repel' | 'off';

export interface EngineStats {
  fps: number;
  frameMs: number;
  particles: number;
  requestedParticles: number;
  drawCalls: number;
  triangles: number;
  renderer: string;
  gpu: string;
  simMode: string;
  effectId: string;
  effectName: string;
  autoQuality: string;
  paused: boolean;
}

interface ShockwaveSlot {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  active: boolean;
  progress: number;
  maxRadius: number;
}

const QUALITY_PIXEL_CAP: Record<EffectParams['quality'], number> = {
  performance: 1.0,
  balanced: 1.5,
  ultra: 2.0,
};

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class ParticleEngine {
  readonly maxParticles = MAX_PARTICLES;
  onStats: ((stats: EngineStats) => void) | null = null;
  onAutoQuality: ((step: number, direction: 'down' | 'up', reason: string) => void) | null = null;
  getAudioLevels: () => AudioLevels = () => ({ bass: 0, mid: 0, treble: 0, energy: 0, beat: false, source: 'none' });

  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private rig: CameraController;
  private system: ParticleSystem;
  private fxGroup = new THREE.Group();
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private afterimagePass: AfterimagePass;
  private adaptive = new AdaptiveQuality(2500);
  private shockwaves: ShockwaveSlot[] = [];
  private wells = new Map<number, PointerWell & { hover?: boolean }>();
  private resizeObserver: ResizeObserver;
  private raycaster = new THREE.Raycaster();
  private interactionPlane = new THREE.Plane();
  private ndc = new THREE.Vector2();

  private params: EffectParams;
  private effect: ParticleEffect;
  private effectId: string;
  private lut: Float32Array;
  private simTime = 0;
  private lastFrameTime = 0;
  private fpsEma = 60;
  private msEma = 16.7;
  private statsTimer = 0;
  private paused = false;
  private interactionMode: InteractionMode = 'attract';
  private requestedCount: number;
  private countScale = 1.0;
  private burstFlash = 0;
  private disposed = false;
  private gpuString = 'unknown';
  private downPos = new Map<number, { x: number; y: number; time: number }>();

  constructor(container: HTMLElement, params: EffectParams, initialEffect = 'galaxy') {
    this.container = container;
    this.params = { ...params };
    this.requestedCount = clamp(Math.round(params.particleCount), 100, MAX_PARTICLES);

    // --- Renderer (WebGL2 is three.js r163+ baseline; fail with a clear error otherwise) ---
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
        depth: false,
      });
    } catch (err) {
      throw new EngineError(`WebGL2 is not available in this browser/GPU. ${(err as Error)?.message ?? ''}`);
    }
    this.renderer = renderer;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.info.autoReset = false; // we reset manually to count all passes
    this.renderer.setClearColor(0x04060d, 1);
    this.renderer.setPixelRatio(this.computePixelRatio());
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.autoClear = true;
    this.renderer.domElement.classList.add('aether-canvas');
    container.appendChild(this.renderer.domElement);

    try {
      const gl = this.renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      this.gpuString = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'masked';
    } catch {
      this.gpuString = 'masked';
    }

    // --- Scene / fog / backdrop ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04060d);
    this.scene.fog = new THREE.FogExp2(0x04060d, 0.010);

    const ambient = new THREE.AmbientLight(0x8899ff, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(6, 12, 8);
    this.scene.add(ambient, key);

    this.buildStarfield();

    // --- Camera rig ---
    this.rig = new CameraController(this.renderer.domElement, this.aspect());

    // --- Particle system ---
    this.system = new ParticleSystem(particlesVert, particlesFrag);
    this.system.setActiveCount(this.appliedCount());
    this.scene.add(this.system.points);

    // --- Effect-owned mesh group ---
    this.scene.add(this.fxGroup);

    // --- Shockwave pool ---
    this.buildShockwaves();

    // --- Composer: bloom + afterimage (trails) ---
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.rig.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.55, 0.7, 0.38);
    this.bloomPass.enabled = this.params.bloom > 0.02;
    this.composer.addPass(this.bloomPass);
    this.afterimagePass = new AfterimagePass(this.params.trail * 0.92);
    this.afterimagePass.enabled = this.params.trail > 0.02;
    this.composer.addPass(this.afterimagePass);

    // --- Palette LUT ---
    this.lut = buildGradientLUT(getPalette(this.params.palette).stops);

    // --- Effect registry ---
    this.effect = this.createEffect(initialEffect);
    this.effectId = initialEffect;
    this.reseedAndInit();

    // --- Adaptive quality wiring ---
    this.adaptive.onStepChange = (step, direction, reason) => {
      this.onAutoQuality?.(step, direction, reason);
      this.applyPixelRatio();
      this.applyCountScale(this.countScale);
    };

    // --- Pointer interaction ---
    this.bindPointerEvents();

    // --- Resize handling ---
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    // --- Main loop ---
    this.lastFrameTime = performance.now();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  // ------------------------------------------------------------------ setup
  private aspect(): number {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    return w / h;
  }

  private computePixelRatio(): number {
    const dpr = Math.min(window.devicePixelRatio || 1, QUALITY_PIXEL_CAP[this.params.quality]);
    const autoCap = this.adaptive.currentStep > 0 ? [Infinity, 1.5, 1.25, 1.0][this.adaptive.currentStep] : Infinity;
    return Math.max(0.6, Math.min(dpr, autoCap));
  }

  private applyPixelRatio(): void {
    this.renderer.setPixelRatio(this.computePixelRatio());
    this.composer.setPixelRatio?.(this.computePixelRatio());
    this.handleResize();
  }

  private appliedCount(): number {
    const adaptiveCap = Math.floor(MAX_PARTICLES * [1, 0.85, 0.7, 0.5][this.adaptive.currentStep]);
    return clamp(Math.min(Math.floor(this.requestedCount * this.countScale), adaptiveCap, MAX_PARTICLES), 100, MAX_PARTICLES);
  }

  private applyCountScale(scale: number): void {
    this.countScale = scale;
    this.system.setActiveCount(this.appliedCount());
  }

  private buildStarfield(): void {
    const count = 1100;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 120 + Math.random() * 130;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const c = 0.55 + Math.random() * 0.45;
      const tint = Math.random();
      col[i * 3] = c * (tint < 0.22 ? 0.75 : 0.95);
      col[i * 3 + 1] = c * 0.93;
      col[i * 3 + 2] = c * (tint > 0.78 ? 1.0 : 0.88);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.75, vertexColors: true, transparent: true, opacity: 0.9,
      depthWrite: false, sizeAttenuation: true, fog: false,
    });
    const stars = new THREE.Points(geo, mat);
    stars.renderOrder = -10;
    this.scene.add(stars);
  }

  private buildShockwaves(): void {
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: shockwaveVert,
        fragmentShader: shockwaveFrag,
        uniforms: {
          uProgress: { value: 0 },
          uColor: { value: new THREE.Color(0xffffff) },
        },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      mesh.visible = false;
      mesh.renderOrder = 20;
      this.scene.add(mesh);
      this.shockwaves.push({ mesh, active: false, progress: 1, maxRadius: 6 });
    }
  }

  private spawnShockwave = (x: number, y: number, z: number, colorHex: number, maxRadius: number): void => {
    const slot = this.shockwaves.find((s) => !s.active) ?? this.shockwaves[0];
    slot.active = true;
    slot.progress = 0;
    slot.maxRadius = maxRadius;
    slot.mesh.visible = true;
    slot.mesh.position.set(x, y, z);
    slot.mesh.scale.setScalar(0.1);
    slot.mesh.material.uniforms.uProgress.value = 0;
    slot.mesh.material.uniforms.uColor.value.setHex(colorHex);
  };

  private createEffect(id: string): ParticleEffect {
    switch (id) {
      case 'explosion': return new ExplosionEffect();
      case 'blackhole': return new BlackHoleEffect();
      case 'galaxy': return new GalaxyEffect();
      case 'liquid': return new LiquidEffect();
      case 'magnetic': return new MagneticEffect();
      case 'smokefire': return new SmokeEffect();
      case 'nebula': return new NebulaEffect();
      case 'wave': return new WaveEffect();
      case 'dna': return new DNAEffect();
      case 'audio': return new AudioReactiveEffect();
      default: return new GalaxyEffect();
    }
  }

  private clearFxGroup(): void {
    this.fxGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
    this.fxGroup.clear();
  }

  private reseedAndInit(): void {
    this.system.reseed(hashString(this.effectId));
    this.system.setActiveCount(this.appliedCount());
    this.effect.init(this.system, this.effectContext(0));
    this.system.commit(true);
  }

  private effectContext(dt: number) {
    return {
      dt,
      simTime: this.simTime,
      time: performance.now() / 1000,
      params: this.params,
      lut: this.lut,
      wells: [...this.wells.values()],
      audio: this.getAudioLevels(),
      fxGroup: this.fxGroup,
      spawnShockwave: this.spawnShockwave,
    };
  }

  // ------------------------------------------------------------ interaction
  private bindPointerEvents(): void {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    el.addEventListener('pointerleave', this.onPointerLeave);
  }

  private pointerToWorld(event: PointerEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    this.ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.rig.camera);
    const normal = new THREE.Vector3();
    this.rig.camera.getWorldDirection(normal);
    this.interactionPlane.setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(0, 0, 0));
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.interactionPlane, hit)) return hit;
    // Fallback: z = 0 plane
    this.interactionPlane.set(new THREE.Vector3(0, 0, 1), 0);
    return this.raycaster.ray.intersectPlane(this.interactionPlane, hit) ? hit : null;
  }

  private activeWellMode(): 'attract' | 'repel' | null {
    if (this.interactionMode === 'off') return null;
    return this.interactionMode;
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
    this.downPos.set(event.pointerId, { x: event.clientX, y: event.clientY, time: performance.now() });
    const mode = this.activeWellMode();
    const point = this.pointerToWorld(event);
    if (mode && point) {
      const strength = (mode === 'attract' ? this.params.attraction : this.params.repulsion);
      this.wells.set(event.pointerId, {
        x: point.x, y: point.y, z: point.z,
        strength: 30 * clamp(strength, 0.05, 2),
        mode,
      });
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    const mode = this.activeWellMode();
    const point = this.pointerToWorld(event);
    if (!point) return;
    if (this.wells.has(event.pointerId)) {
      const well = this.wells.get(event.pointerId)!;
      well.x = point.x; well.y = point.y; well.z = point.z;
      well.strength = 30 * clamp((well.mode === 'attract' ? this.params.attraction : this.params.repulsion), 0.05, 2);
      return;
    }
    // Hover well: gentle attraction that follows the mouse (mouse pointers only)
    if (mode === 'attract' && event.pointerType === 'mouse') {
      this.wells.set(-1, {
        x: point.x, y: point.y, z: point.z,
        strength: 30 * clamp(this.params.attraction, 0.05, 2) * 0.38,
        mode: 'attract',
        hover: true,
      });
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    this.wells.delete(event.pointerId);
    const down = this.downPos.get(event.pointerId);
    this.downPos.delete(event.pointerId);
    if (down) {
      const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
      const elapsed = performance.now() - down.time;
      if (moved < 7 && elapsed < 400) {
        const point = this.pointerToWorld(event);
        if (point) this.burstAt(point);
      }
    }
  };

  private onPointerLeave = (event: PointerEvent): void => {
    this.wells.delete(event.pointerId);
    this.wells.delete(-1);
    this.downPos.delete(event.pointerId);
  };

  /** Radial impulse + shockwave — the “click to explode” interaction. */
  burstAt(point: THREE.Vector3): void {
    const i3v = this.system.positions;
    const i3 = this.system.velocities;
    const n = this.system.activeCount;
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      const dx = i3v[o] - point.x, dy = i3v[o + 1] - point.y, dz = i3v[o + 2] - point.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const fall = Math.exp(-d2 * 0.045);
      const d = Math.sqrt(d2) + 0.35;
      const kick = (16 * fall + 2.4 * Math.exp(-d2 * 0.006)) / d;
      i3[o] += dx * kick;
      i3[o + 1] += dy * kick;
      i3[o + 2] += dz * kick;
    }
    this.burstFlash = 1;
    this.spawnShockwave(point.x, point.y, point.z, 0xffe1a8, 9);
  }

  private applyWellForces(dt: number): void {
    if (this.wells.size === 0) return;
    const pos = this.system.positions;
    const vel = this.system.velocities;
    const n = this.system.activeCount;
    const wells = [...this.wells.values()];
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      const px = pos[o], py = pos[o + 1], pz = pos[o + 2];
      for (const well of wells) {
        const dx = well.x - px, dy = well.y - py, dz = well.z - pz;
        const d2raw = dx * dx + dy * dy + dz * dz;
        if (d2raw > 210) continue; // beyond influence radius
        const d2 = Math.max(d2raw, 1.15);
        const d = Math.sqrt(d2);
        const falloff = clamp(1 - d / 14.5, 0, 1);
        let f = (well.strength * falloff) / d2;
        f = Math.min(f, 26);
        if (well.mode === 'repel') f = -f;
        vel[o] += (dx / d) * f * dt * 3.2;
        vel[o + 1] += (dy / d) * f * dt * 3.2;
        vel[o + 2] += (dz / d) * f * dt * 3.2;
      }
    }
  }

  private clampVelocities(): void {
    const vel = this.system.velocities;
    const n = this.system.activeCount;
    const maxV2 = 48 * 48;
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      const v2 = vel[o] * vel[o] + vel[o + 1] * vel[o + 1] + vel[o + 2] * vel[o + 2];
      if (v2 > maxV2) {
        const s = 48 / Math.sqrt(v2);
        vel[o] *= s; vel[o + 1] *= s; vel[o + 2] *= s;
      }
    }
  }

  // ------------------------------------------------------------------ loop
  private tick(): void {
    if (this.disposed) return;
    if (document.hidden) return; // visibility-aware simulation

    this.renderer.info.reset();
    const now = performance.now();
    let dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    dt = clamp(dt, 0.0005, 0.05);

    // FPS / frame-time EMA
    const fps = 1 / dt;
    this.fpsEma += (fps - this.fpsEma) * 0.05;
    this.msEma += (dt * 1000 - this.msEma) * 0.05;

    // Adaptive quality evaluation
    this.adaptive.update(dt, now);

    const simActive = !this.paused;
    if (simActive) {
      this.simTime += dt * this.params.speed;

      this.applyWellForces(dt * this.params.speed);

      const ctx = this.effectContext(dt);
      this.effect.update(this.system, ctx);
      this.clampVelocities();
      this.system.commit(true);

      // Shader uniforms
      this.system.material.uniforms.uTime.value = this.simTime;
      this.system.material.uniforms.uSizeScale.value = this.params.particleSize;
      this.system.material.uniforms.uGlow.value = this.params.glow;
      this.system.material.uniforms.uOpacity.value = this.params.opacity;
      this.system.material.uniforms.uPixelRatio.value = this.computePixelRatio();
      this.system.material.uniforms.uScale.value = this.container.clientHeight * 0.215;
    }

    // Shockwaves billboard + advance
    for (const sw of this.shockwaves) {
      if (!sw.active) continue;
      if (simActive) sw.progress += dt * (0.55 + this.params.speed * 0.45);
      const e = easeOutCubic(clamp(sw.progress, 0, 1));
      sw.mesh.scale.setScalar(Math.max(0.12, e * sw.maxRadius));
      sw.mesh.quaternion.copy(this.rig.camera.quaternion);
      sw.mesh.material.uniforms.uProgress.value = e;
      if (sw.progress >= 1) {
        sw.active = false;
        sw.mesh.visible = false;
      }
    }

    // Click flash decays
    if (this.burstFlash > 0) this.burstFlash = Math.max(0, this.burstFlash - dt * 2.1);

    // Camera
    this.rig.update();

    // Bloom / trail config
    const bloomOn = this.params.bloom > 0.02;
    this.bloomPass.strength = this.params.bloom + this.burstFlash * 0.85;
    this.bloomPass.enabled = bloomOn;
    this.afterimagePass.enabled = this.params.trail > 0.02;
    if (this.afterimagePass.enabled) {
      (this.afterimagePass.uniforms as Record<string, { value: number }>)['damp'].value = this.params.trail * 0.92;
    }

    const useComposer = bloomOn || this.afterimagePass.enabled;
    if (useComposer) this.composer.render();
    else this.renderer.render(this.scene, this.rig.camera);

    // Stats callback @ ~2 Hz
    this.statsTimer += dt;
    if (this.statsTimer >= 0.5) {
      this.statsTimer = 0;
      this.onStats?.(this.getStats());
    }
  }

  // -------------------------------------------------------------- public API
  getStats(): EngineStats {
    return {
      fps: Math.round(this.fpsEma),
      frameMs: Math.round(this.msEma * 10) / 10,
      particles: this.system.activeCount,
      requestedParticles: this.requestedCount,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      renderer: this.renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1',
      gpu: this.gpuString,
      simMode: 'CPU physics · GPU sprites',
      effectId: this.effectId,
      effectName: this.effect.name,
      autoQuality: this.adaptive.currentStep === 0 ? 'full' : ['full', 'auto-1', 'auto-2', 'auto-3'][this.adaptive.currentStep],
      paused: this.paused,
    };
  }

  setEffect(id: string): boolean {
    if (!['explosion', 'blackhole', 'galaxy', 'liquid', 'magnetic', 'smokefire', 'nebula', 'wave', 'dna', 'audio'].includes(id)) {
      return false;
    }
    this.effect.dispose?.();
    this.clearFxGroup();
    this.wells.clear();
    this.simTime = 0;
    this.effect = this.createEffect(id);
    this.effectId = id;
    this.reseedAndInit();
    this.onStats?.(this.getStats());
    return true;
  }

  getEffectId(): string {
    return this.effectId;
  }

  applySettings(next: EffectParams): void {
    const paletteChanged = next.palette !== this.params.palette;
    const countChanged = Math.round(next.particleCount) !== this.requestedCount;
    const qualityChanged = next.quality !== this.params.quality;
    this.params = { ...next };
    this.requestedCount = clamp(Math.round(next.particleCount), 100, MAX_PARTICLES);

    if (paletteChanged) {
      this.lut = buildGradientLUT(getPalette(next.palette).stops);
    }
    if (qualityChanged) {
      this.adaptive.reset();
      this.applyPixelRatio();
    }
    if (countChanged || qualityChanged) {
      this.applyCountScale(this.countScale);
      this.reseedAndInit();
    }
    // Reflect uniform-driven settings immediately
    this.system.material.uniforms.uSizeScale.value = this.params.particleSize;
    this.system.material.uniforms.uGlow.value = this.params.glow;
    this.system.material.uniforms.uOpacity.value = this.params.opacity;
    this.system.material.uniforms.uPixelRatio.value = this.computePixelRatio();
  }

  setInteractionMode(mode: InteractionMode): void {
    this.interactionMode = mode;
    if (mode === 'off') this.wells.clear();
  }

  getInteractionMode(): InteractionMode {
    return this.interactionMode;
  }

  togglePause(): boolean {
    this.paused = !this.paused;
    return this.paused;
  }

  isPaused(): boolean {
    return this.paused;
  }

  /** Detonate a shockwave at the world origin (e2e + keyboard shortcut). */
  burstCenter(): void {
    this.burstAt(new THREE.Vector3(0, 0, 0));
  }

  /** Restart the current effect in place (positions re-seeded). */
  resetSimulation(): void {
    this.simTime = 0;
    this.wells.clear();
    for (const sw of this.shockwaves) {
      sw.active = false;
      sw.mesh.visible = false;
    }
    this.reseedAndInit();
  }

  resetCamera(): void {
    this.rig.reset();
  }

  async toggleFullscreen(): Promise<boolean> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return false;
    }
    await document.documentElement.requestFullscreen();
    return true;
  }

  private handleResize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.rig.handleResize(w / h);
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  dispose(): void {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerUp);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    this.effect.dispose?.();
    this.clearFxGroup();
    this.system.dispose();
    for (const sw of this.shockwaves) {
      sw.mesh.geometry.dispose();
      sw.mesh.material.dispose();
    }
    this.composer.dispose?.();
    this.rig.dispose();
    this.renderer.dispose();
    el.parentElement?.removeChild(el);
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
