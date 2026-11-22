import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const entries = [
  ["m5-f10-2013.glb", "m5-f10", 1062736],
  ["m4-csl-2023.glb", "m4-csl-g82", 3502516],
];
const reports = [];
for (const [file, id, length] of entries) {
  const data = readFileSync("public/models/" + file);
  assert.equal(data.toString("utf8", 0, 4), "glTF");
  assert.equal(data.length, length);
  assert.equal(data.readUInt32LE(8), length);
  const json = JSON.parse(
    data.toString("utf8", 20, 20 + data.readUInt32LE(12)),
  );
  assert.ok(
    json.buffers.every((b) => !b.uri),
    "External buffer",
  );
  assert.ok(
    (json.images || []).every((i) => !i.uri),
    "External image",
  );
  reports.push({
    id,
    file,
    bytes: length,
    sha256: createHash("sha256").update(data).digest("hex"),
    nodes: json.nodes.length,
    meshes: json.meshes.length,
    extensions: json.extensionsUsed || [],
    embeddedResources: true,
    license: "CC-BY-4.0 (as stated by distributor)",
    factoryAccuracyVerified: false,
  });
}
assert.equal(new Set(reports.map((r) => r.sha256)).size, reports.length);
writeFileSync(
  "docs/free-models/audit.json",
  JSON.stringify(reports, null, 2) + "\n",
);
console.log(reports);
