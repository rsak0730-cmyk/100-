import { readFileSync, statSync } from "node:fs";
import assert from "node:assert/strict";
const html = readFileSync("dist/index.html", "utf8");
assert.ok(!html.includes("/src/"), "Production HTML references source");
for (const [, url] of html.matchAll(/(?:src|href)="(\.\/assets\/[^\"]+)"/g))
  assert.ok(statSync(`dist/${url}`).size > 0);
const asset = JSON.parse(readFileSync("src/showroom/model-asset.json", "utf8"));
const bytes = readFileSync(`dist/${asset.path}`);
assert.equal(bytes.length, asset.bytes);
assert.equal(bytes.toString("utf8", 0, 4), "glTF");
const manifest = JSON.parse(readFileSync("dist/models/manifest.json", "utf8"));
assert.equal(manifest.vehicles[0].glb, asset.path);
const hashes = new Set();
for (const vehicle of manifest.vehicles) {
  const file = readFileSync("dist/" + vehicle.glb);
  assert.equal(file.toString("utf8", 0, 4), "glTF");
  assert.equal(file.readUInt32LE(8), file.length);
  const hash = (await import("node:crypto"))
    .createHash("sha256")
    .update(file)
    .digest("hex");
  assert.ok(
    !hashes.has(hash),
    "Duplicate asset under different vehicle identity",
  );
  hashes.add(hash);
}
assert.ok(statSync("dist/models/showroom-architecture.json").size > 0);
console.log(
  "Production entry, bundled assets, compressed model and architecture manifest verified.",
);
