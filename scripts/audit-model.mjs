import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const data = readFileSync("public/models/m4.glb");
if (
  data.toString("utf8", 0, 4) !== "glTF" ||
  data.readUInt32LE(4) !== 2 ||
  data.readUInt32LE(8) !== data.length
)
  throw Error("Invalid GLB header");
const json = JSON.parse(data.toString("utf8", 20, 20 + data.readUInt32LE(12)));
if (json.buffers.some((b) => b.uri) || json.images?.some((i) => i.uri))
  throw Error("Unexpected external dependency");
const report = {
  bytes: data.length,
  sha256: createHash("sha256").update(data).digest("hex"),
  version: json.asset.version,
  nodes: json.nodes.length,
  meshes: json.meshes.length,
  materials: json.materials.map((m) => m.name),
  externalResources: false,
  verifiedOEMGeometry: false,
  anatomySupported: false,
  notes:
    "Structural validation only. Does not establish provenance, OEM dimensions, component identity or author ownership.",
};
writeFileSync(
  "docs/showroom/model-audit.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report);
