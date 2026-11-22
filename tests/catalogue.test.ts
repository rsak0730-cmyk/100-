import { describe, it, expect } from "vitest";
import { vehicles } from "../src/showroom/catalogue";
describe("Showroom catalogue", () => {
  it("has unique model identities", () =>
    expect(new Set(vehicles.map((v) => v.id)).size).toBe(vehicles.length));
  it("never reuses the reference geometry for another vehicle", () => {
    const supported = vehicles.filter((v) => v.model);
    expect(supported).toHaveLength(1);
    expect(supported[0].id).toBe("m4-competition-g82");
  });
  it("keeps M Performance separate", () => {
    expect(vehicles.filter((v) => v.category === "M Performance")).toHaveLength(
      7,
    );
    expect(vehicles.find((v) => v.name === "BMW M340i")?.category).toBe(
      "M Performance",
    );
  });
  it("does not duplicate the M635CSi / M6 E24 alias", () =>
    expect(vehicles.filter((v) => v.generation === "E24")).toHaveLength(1));
});
