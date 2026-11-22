import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
export interface LightingSettings {
  power: boolean;
  brightness: number;
  color: string;
  ambient: number;
  reflections: number;
  exposure: number;
  ceiling: boolean;
  left: boolean;
  right: boolean;
  accent: boolean;
  accentColor: string;
  shadows: boolean;
  room: boolean;
}
export const defaultLighting: LightingSettings = {
  power: true,
  brightness: 1,
  color: "#e6f4ff",
  ambient: 0.35,
  reflections: 0.65,
  exposure: 1,
  ceiling: true,
  left: true,
  right: true,
  accent: true,
  accentColor: "#67dae8",
  shadows: true,
  room: true,
};
export const lightingPresets: Record<string, Partial<LightingSettings>> = {
  Signature: { ...defaultLighting },
  Daylight: {
    ...defaultLighting,
    color: "#ffffff",
    brightness: 1.45,
    ambient: 0.65,
    reflections: 0.85,
    accentColor: "#c7edff",
  },
  Midnight: {
    ...defaultLighting,
    color: "#9bbcff",
    brightness: 0.6,
    ambient: 0.12,
    reflections: 0.25,
    accentColor: "#367fff",
  },
  Warm: {
    ...defaultLighting,
    color: "#ffd4a0",
    brightness: 1.1,
    ambient: 0.25,
    accentColor: "#ff9c5a",
  },
};
export function lightPower(settings: LightingSettings, enabled = true) {
  return settings.power && enabled ? settings.brightness : 0;
}
export class ShowroomLighting {
  settings = { ...defaultLighting };
  architecture = new THREE.Group();
  fixtures: {
    mesh: THREE.Mesh;
    bank: "ceiling" | "left" | "right" | "accent";
  }[] = [];
  areas: { light: THREE.RectAreaLight; bank: "ceiling" | "left" | "right" }[] =
    [];
  ambient = new THREE.HemisphereLight(0xe6f4ff, 0x263344, 1);
  spot = new THREE.SpotLight(0xffffff, 60, 30, Math.PI / 4, 0.7, 1.5);
  accentLights: THREE.PointLight[] = [];
  constructor(
    public scene: THREE.Scene,
    public renderer: THREE.WebGLRenderer,
    public changed: () => void = () => {},
  ) {
    RectAreaLightUniformsLib.init();
    this.architecture.name = "Procedural showroom architecture";
    const wall = new THREE.MeshStandardMaterial({
      color: 0x1b232b,
      roughness: 0.65,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: 0x0f171c,
      roughness: 0.4,
      metalness: 0.65,
    });
    const mesh = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      this.architecture.add(m);
      return m;
    };
    // The room is intentionally procedural architecture, not substitute vehicle geometry.
    mesh(new THREE.CylinderGeometry(16, 16, 8, 96, 1, true), wall, 0, 3.75, 0);
    const plinth = mesh(
      new THREE.CylinderGeometry(3.55, 3.65, 0.2, 128),
      new THREE.MeshStandardMaterial({
        color: 0x161e25,
        metalness: 0.45,
        roughness: 0.35,
      }),
      0,
      -0.12,
      0,
    );
    plinth.receiveShadow = true;
    const luminous = (
      geo: THREE.BufferGeometry,
      bank: "ceiling" | "left" | "right" | "accent",
      x: number,
      y: number,
      z: number,
    ) => {
      const m = mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
        x,
        y,
        z,
      );
      this.fixtures.push({ mesh: m, bank });
      return m;
    };
    luminous(
      new THREE.TorusGeometry(3.59, 0.018, 8, 128),
      "accent",
      0,
      -0.015,
      0,
    ).rotation.x = Math.PI / 2;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2,
        x = Math.sin(a) * 15.7,
        z = Math.cos(a) * 15.7;
      mesh(new THREE.BoxGeometry(0.14, 7.5, 0.25), trim, x, 3.5, z).rotation.y =
        a;
      luminous(
        new THREE.BoxGeometry(0.035, 5.5, 0.04),
        "accent",
        x * 0.99,
        3.4,
        z * 0.99,
      ).rotation.y = a;
    }
    for (const bank of ["left", "right"] as const) {
      const x = bank === "left" ? -5 : 5;
      const panel = luminous(
        new THREE.BoxGeometry(0.045, 0.65, 5),
        bank,
        x,
        3.7,
        0,
      );
      panel.rotation.z = bank === "left" ? -0.3 : 0.3;
      const area = new THREE.RectAreaLight(0xffffff, 7, 5, 0.65);
      area.position.set(x, 3.7, 0);
      area.lookAt(0, 0.6, 0);
      this.areas.push({ light: area, bank });
      scene.add(area);
      mesh(new THREE.BoxGeometry(0.12, 0.12, 11), trim, x, 6, 0);
    }
    for (const z of [-3, 0, 3]) {
      luminous(new THREE.BoxGeometry(6, 0.05, 0.3), "ceiling", 0, 6, z);
      const area = new THREE.RectAreaLight(0xffffff, 6, 6, 0.3);
      area.position.set(0, 5.95, z);
      area.lookAt(0, 0, z);
      this.areas.push({ light: area, bank: "ceiling" });
      scene.add(area);
    }
    for (const x of [-4, 4]) {
      const p = new THREE.PointLight(0x67dae8, 3, 9, 2);
      p.position.set(x, 0.3, -3);
      this.accentLights.push(p);
      scene.add(p);
    }
    this.spot.position.set(1, 7, 3);
    this.spot.target.position.set(0, 0, 0);
    this.spot.castShadow = true;
    this.spot.shadow.mapSize.set(1024, 1024);
    this.spot.shadow.bias = -0.0002;
    this.spot.shadow.normalBias = 0.025;
    scene.add(this.architecture, this.ambient, this.spot, this.spot.target);
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.apply();
  }
  update(patch: Partial<LightingSettings>) {
    Object.assign(this.settings, patch);
    this.apply();
  }
  preset(name: string) {
    if (lightingPresets[name]) this.update(lightingPresets[name]);
  }
  apply() {
    this.changed();
    this.renderer.shadowMap.needsUpdate = true;
    const s = this.settings,
      power = lightPower(s);
    for (const { light, bank } of this.areas) {
      light.color.set(s.color);
      light.intensity = (bank === "ceiling" ? 6 : 7) * lightPower(s, s[bank]);
    }
    for (const { mesh, bank } of this.fixtures) {
      const m = mesh.material as THREE.MeshBasicMaterial;
      m.color
        .set(bank === "accent" ? s.accentColor : s.color)
        .multiplyScalar(lightPower(s, s[bank]));
    }
    this.ambient.color.set(s.color);
    this.ambient.intensity = s.ambient * power;
    this.spot.color.set(s.color);
    this.spot.intensity = 70 * lightPower(s, s.ceiling);
    this.spot.castShadow = s.shadows;
    for (const p of this.accentLights) {
      p.color.set(s.accentColor);
      p.intensity = 7 * lightPower(s, s.accent);
    }
    this.scene.environmentIntensity = s.reflections * power;
    this.renderer.toneMappingExposure = s.exposure;
    this.renderer.shadowMap.enabled = s.shadows;
    this.architecture.visible = s.room;
    this.scene.background = new THREE.Color(0x060a10);
    // Power-off is a genuine blackout; the HTML controls remain available to restore light.
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.set(0x060a10);
  }
}
