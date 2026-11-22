import { describe, it, expect } from "vitest";
import { additionalVehicles } from "../src/showroom/additional-vehicles";
import manifest from "../public/models/manifest.json";
describe("free additional vehicle assets", () => {
  it("registers two different cars and files", () => {
    expect(additionalVehicles).toHaveLength(2);
    expect(new Set(additionalVehicles.map((v) => v.id)).size).toBe(2);
    expect(new Set(additionalVehicles.map((v) => v.path)).size).toBe(2);
  });
  it("has free attribution licenses with original creator and source records", () => {
    for (const v of additionalVehicles) {
      expect(v.license).toBe("CC-BY-4.0");
      expect(v.author).toBeTruthy();
      expect(v.source).toContain("sketchfab.com");
      expect(manifest.vehicles.find((x) => x.vehicleId === v.id)?.glb).toBe(
        v.path,
      );
    }
  });
  it("occupies separate islands with no overlapping vehicle centres", () => {
    const [a, b] = additionalVehicles;
    expect(
      Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]),
    ).toBeGreaterThan(10);
  });
});
