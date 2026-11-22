import { buildArchitecture, type Architecture } from "./architecture";
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
  temperature: number;
  spotlight: boolean;
  spotBrightness: number;
  ceilingBrightness: number;
  leftBrightness: number;
  rightBrightness: number;
  accentBrightness: number;
  display: boolean;
  displayBrightness: number;
  directional: number;
  environmentBrightness: number;
  shadowIntensity: number;
  timeOfDay: string;
  outdoorBrightness: number;
  windowReflection: number;
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
  temperature: 4500,
  spotlight: true,
  spotBrightness: 1,
  ceilingBrightness: 1,
  leftBrightness: 1,
  rightBrightness: 1,
  accentBrightness: 1,
  display: true,
  displayBrightness: 1,
  directional: 0.35,
  environmentBrightness: 1,
  shadowIntensity: 1,
  timeOfDay: "Daytime",
  outdoorBrightness: 1,
  windowReflection: 0.65,
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
export function kelvinColor(k: number): string {
  const t = Math.min(9000, Math.max(2200, k)) / 100;
  const clamp = (x: number) => Math.round(Math.min(255, Math.max(0, x)));
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b =
    t >= 66
      ? 255
      : t <= 19
        ? 0
        : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return (
    "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")
  );
}
Object.assign(lightingPresets, {
  "Luxury Warm": {
    ...defaultLighting,
    temperature: 3500,
    timeOfDay: "Evening",
    ambient: 0.45,
  },
  "Pure White": {
    ...defaultLighting,
    temperature: 6500,
    brightness: 1.25,
    ambient: 0.6,
  },
  "Cinematic Night": {
    ...defaultLighting,
    temperature: 4200,
    brightness: 0.65,
    ambient: 0.1,
    ceilingBrightness: 0.25,
    timeOfDay: "Night",
    reflections: 0.4,
  },
  Sunset: {
    ...defaultLighting,
    temperature: 3200,
    timeOfDay: "Sunset",
    directional: 0.75,
  },
  "Cool Modern": {
    ...defaultLighting,
    temperature: 7500,
    accentColor: "#90c9ff",
    timeOfDay: "Daytime",
  },
  "Studio Photography": {
    ...defaultLighting,
    temperature: 5500,
    ambient: 0.55,
    accent: false,
    spotBrightness: 1.3,
  },
  "Ambient Evening": {
    ...defaultLighting,
    temperature: 3000,
    timeOfDay: "Evening",
    brightness: 0.7,
    spotBrightness: 0.5,
    ceilingBrightness: 0.5,
    ambient: 0.4,
  },
});
export function lightPower(settings: LightingSettings, enabled = true) {
  return settings.power && enabled ? settings.brightness : 0;
}
export class ShowroomLighting {
  settings = { ...defaultLighting };
  built: Architecture;
  sun = new THREE.DirectionalLight(0xffefdc, 1);
  displayLight = new THREE.RectAreaLight(0xffffff, 6, 4, 2);
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
    this.built = buildArchitecture();
    this.architecture = this.built.group;
    this.fixtures.push(...this.built.fixtures);
    scene.add(this.built.outdoor);
    for (const bank of ["left", "right"] as const) {
      const x = bank === "left" ? -5 : 5;
      const area = new THREE.RectAreaLight(0xffffff, 7, 5, 0.65);
      area.position.set(x, 3.7, 0);
      area.lookAt(0, 0.6, 0);
      this.areas.push({ light: area, bank });
      scene.add(area);
    }
    for (const z of [-3, 0, 3]) {
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
    this.displayLight.position.set(0, 4.5, 1);
    this.displayLight.lookAt(0, 0, 0);
    scene.add(this.displayLight);
    this.sun.position.set(-8, 12, 16);
    scene.add(
      this.architecture,
      this.ambient,
      this.spot,
      this.spot.target,
      this.sun,
    );
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.apply();
  }
  update(patch: Partial<LightingSettings>) {
    Object.assign(this.settings, patch);
    if (patch.temperature !== undefined)
      this.settings.color = kelvinColor(patch.temperature);
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
      light.intensity =
        (bank === "ceiling" ? 6 : 7) *
        lightPower(s, s[bank]) *
        s[`${bank}Brightness`];
    }
    for (const { mesh, bank } of this.fixtures) {
      const m = mesh.material as THREE.MeshBasicMaterial;
      m.color
        .set(bank === "accent" ? s.accentColor : s.color)
        .multiplyScalar(lightPower(s, s[bank]) * s[`${bank}Brightness`]);
    }
    this.ambient.color.set(s.color);
    this.ambient.intensity = s.ambient * power;
    this.spot.color.set(s.color);
    this.spot.intensity = 70 * lightPower(s, s.spotlight) * s.spotBrightness;
    this.displayLight.color.set(s.color);
    this.displayLight.intensity =
      6 * lightPower(s, s.display) * s.displayBrightness;
    this.spot.castShadow = s.shadows;
    this.spot.shadow.intensity = s.shadowIntensity;
    for (const p of this.accentLights) {
      p.color.set(s.accentColor);
      p.intensity = 7 * lightPower(s, s.accent) * s.accentBrightness;
    }
    this.scene.environmentIntensity =
      s.reflections * power * s.environmentBrightness;
    this.renderer.toneMappingExposure = s.exposure;
    this.renderer.shadowMap.enabled = s.shadows;
    this.architecture.visible = s.room;
    const daylight: Record<
      string,
      { sky: number; sun: number; tint: number; y: number }
    > = {
      Daytime: { sky: 0x9eafb5, sun: 1.5, tint: 0xfff0dc, y: 15 },
      Evening: { sky: 0x50596a, sun: 0.35, tint: 0xe2c2c4, y: 6 },
      Night: { sky: 0x101b30, sun: 0.07, tint: 0x7998d5, y: 10 },
      Sunset: { sky: 0xb88a70, sun: 0.8, tint: 0xffbb77, y: 3 },
    };
    const day = daylight[s.timeOfDay] || daylight.Daytime;
    this.scene.background = new THREE.Color(day.sky).multiplyScalar(
      s.outdoorBrightness,
    );
    this.sun.intensity = day.sun * s.directional * s.outdoorBrightness * power;
    this.sun.color.set(day.tint);
    this.sun.position.y = day.y;
    this.built.glass.envMapIntensity = s.windowReflection * 2;
    this.built.glass.opacity = 0.08 + s.windowReflection * 0.18;

    // Power-off is a genuine blackout; the HTML controls remain available to restore light.
    if (this.scene.fog instanceof THREE.Fog)
      this.scene.fog.color.copy(this.scene.background as THREE.Color);
  }
}
