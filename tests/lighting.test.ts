import { describe, it, expect } from "vitest";
import viewerSource from "../src/showroom/viewer.ts?raw";
import {
  defaultLighting,
  lightingPresets,
  lightPower,
} from "../src/showroom/lighting";
describe("showroom lighting", () => {
  it("supports a real blackout independently of the banks", () => {
    expect(
      lightPower({ ...defaultLighting, power: false, brightness: 2 }),
    ).toBe(0);
    expect(lightPower(defaultLighting, false)).toBe(0);
  });
  it("scales enabled banks with master brightness", () =>
    expect(lightPower({ ...defaultLighting, brightness: 1.7 })).toBe(1.7));
  it("presets can restore light after blackout", () => {
    for (const preset of Object.values(lightingPresets))
      expect(preset.power).toBe(true);
  });
  it("does not schedule a model loading deadline", () => {
    const source = viewerSource;
    expect(source).not.toContain("loadTimer");
    expect(source).not.toContain("TIMED OUT");
    expect(source).not.toContain("120_000");
  });
});
