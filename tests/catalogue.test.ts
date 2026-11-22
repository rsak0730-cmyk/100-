import { describe, it, expect } from "vitest";
import { vehicles, vehicleLabel, canonicalVehicleKey, validateCatalogue } from "../src/showroom/catalogue";
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

describe("duplicate prevention", () => {
  it("has unique generation-qualified display names", () => {
    expect(new Set(vehicles.map(vehicleLabel)).size).toBe(vehicles.length);
  });
  it("rejects a renamed ID that represents the same vehicle", () => {
    expect(()=>validateCatalogue([...vehicles,{...vehicles[0],id:'another-id'}])).toThrow('Duplicate vehicle');
  });
  it("normalizes market-name and drivetrain aliases", () => {
    expect(canonicalVehicleKey({name:'BMW M635CSi',generation:'E24'})).toBe(canonicalVehicleKey({name:'BMW M6',generation:'E24'}));
    expect(canonicalVehicleKey({name:'BMW M4 Competition Convertible M xDrive',generation:'G83'})).toBe(canonicalVehicleKey({name:'BMW M4 Competition Convertible',generation:'G83'}));
  });
  it("preserves genuinely different generations and trims", () => {
    expect(canonicalVehicleKey({name:'BMW M3',generation:'E30'})).not.toBe(canonicalVehicleKey({name:'BMW M3',generation:'E46'}));
    expect(canonicalVehicleKey({name:'BMW M4',generation:'G82'})).not.toBe(canonicalVehicleKey({name:'BMW M4 Competition',generation:'G82'}));
  });
  it("rejects assigning the same asset to a different car", () => {
    expect(()=>validateCatalogue([{...vehicles[0],model:'same.glb'},{...vehicles[1],model:'same.glb'}])).toThrow('asset reused');
  });
});
