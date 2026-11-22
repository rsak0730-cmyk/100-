import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { execFileSync } from "node:child_process";
mkdirSync("/tmp/al2023", { recursive: true });
writeFileSync(
  "/tmp/al2023.tar",
  brotliDecompressSync(
    readFileSync("node_modules/@sparticuz/chromium/bin/al2023.tar.br"),
  ),
);
execFileSync("tar", ["-xf", "/tmp/al2023.tar", "-C", "/tmp/al2023"]);
process.env.LD_LIBRARY_PATH = "/tmp/al2023/lib";
const browser = await playwright.launch({
  executablePath: await chromium.executablePath(),
  args: [
    ...chromium.args,
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
page.setDefaultTimeout(120000);
const errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
function check(name, condition) {
  checks.push({ name, pass: !!condition });
  console.log(condition ? "PASS" : "FAIL", name);
  if (!condition) throw Error(name);
}
try {
  await page.goto("http://127.0.0.1:4173/");
  await page.locator("#tab-settings").click();
  await page.locator("#quality").selectOption("Low");
  await page.waitForFunction(
    () =>
      document.querySelector("#status-m5-f10")?.textContent === "Ready" &&
      document.querySelector("#status-m4-csl-g82")?.textContent === "Ready",
    { timeout: 180000 },
  );
  check("Both distinct free GLBs finish loading", true);
  await page.locator("#tab-explore").click();
  for (const [id, name, camera] of [
    ["m5-f10", "BMW M5 F10", "West Island"],
    ["m4-csl-g82", "BMW M4 CSL G82", "East Island"],
  ]) {
    await page.locator("#object-select").selectOption(id);
    check(
      name + " selectable",
      (await page.locator("#object-name").textContent()) === name,
    );
    await page
      .locator('[data-camera="' + camera + '"]')
      .first()
      .click();
    await page.waitForTimeout(1600);
    await page.screenshot({
      path: "e2e/screenshots/" + id + ".png",
      timeout: 180000,
    });
  }
  check("No browser errors", errors.length === 0);
} finally {
  writeFileSync(
    "e2e/additional-cars-report.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ checks, errors }));
  await browser.close();
}
