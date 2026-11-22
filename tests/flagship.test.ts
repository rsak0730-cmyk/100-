import { describe, it, expect } from "vitest";
import { cameraViews } from "../src/showroom/cameras";
import {
  defaultLighting,
  lightingPresets,
  kelvinColor,
} from "../src/showroom/lighting";
import architectureSource from "../src/showroom/architecture.ts?raw";
describe("flagship architecture configuration", () => {
  it("provides the requested seven lighting scenes", () => {
    for (const name of [
      "Luxury Warm",
      "Pure White",
      "Cinematic Night",
      "Sunset",
      "Cool Modern",
      "Studio Photography",
      "Ambient Evening",
    ])
      expect(lightingPresets[name]).toBeDefined();
  });
  it("provides finite interior camera destinations", () => {
    expect(Object.keys(cameraViews).length).toBeGreaterThanOrEqual(8);
    for (const v of Object.values(cameraViews)) {
      expect([...v.position, ...v.target].every(Number.isFinite)).toBe(true);
      expect(Math.abs(v.position[0])).toBeLessThan(18);
      expect(Math.abs(v.position[2])).toBeLessThan(14);
    }
  });
  it("warm and cool temperature settings differ, within valid sRGB values", () => {
    expect(kelvinColor(2200)).not.toBe(kelvinColor(9000));
    for (const k of [-1, 2200, 4500, 6500, 9000, 100000])
      expect(kelvinColor(k)).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("has independently controllable presentation and spotlight groups", () => {
    expect(defaultLighting).toHaveProperty("displayBrightness");
    expect(defaultLighting).toHaveProperty("spotBrightness");
    expect(defaultLighting).toHaveProperty("display");
    expect(defaultLighting).toHaveProperty("spotlight");
  });
  it("keeps secondary platforms honestly reserved", () => {
    expect(architectureSource).toContain(
      "Presentation space for a separately licensed vehicle",
    );
    expect(architectureSource).toContain(
      "Batch non-interactive opaque architecture",
    );
  });
});
