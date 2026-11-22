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
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const checks = [];
function check(n, v) {
  checks.push({ name: n, pass: !!v });
  if (!v) throw Error(n);
}
await page.goto("http://127.0.0.1:4173/");
await page.waitForFunction(() => document.querySelector("#loading")?.hidden, {
  timeout: 120000,
});
check("WebGL canvas", (await page.locator("canvas").count()) === 1);
check(
  "G82 identity",
  await page
    .locator("#generation")
    .textContent()
    .then((s) => s.includes("G82")),
);
check(
  "Anatomy disabled",
  await page.getByRole("button", { name: /Anatomy view/ }).isDisabled(),
);
mkdirSync("e2e/screenshots", { recursive: true });
await page.screenshot({ path: "e2e/screenshots/showroom-desktop.png" });
await page.getByRole("button", { name: "Toronto Red", exact: true }).click();
check(
  "Paint label updated",
  (await page.locator("#paint-name").textContent()) === "Toronto Red",
);
await page.getByRole("button", { name: "Matte", exact: true }).click();
await page.getByRole("button", { name: "Cameras", exact: true }).click();
await page.getByRole("button", { name: "Top", exact: true }).click();
await page.locator("#reset").click();
await page.locator("#browse").click();
await page.locator("#search").fill("M3 E30");
check("Search finds E30", (await page.locator(".vehicle").count()) === 1);
await page.locator(".vehicle").click();
check(
  "Unavailable model honest",
  await page
    .locator("#availability")
    .textContent()
    .then((s) => s.includes("COMING SOON")),
);
check(
  "No stale identity",
  await page
    .locator("#generation")
    .textContent()
    .then((s) => s.includes("E30")),
);
check(
  "Paint disabled for unavailable",
  await page.locator('.swatches button[aria-label="Toronto Red"]').isDisabled(),
);
await page.keyboard.press("ArrowRight");
check(
  "Keyboard navigation",
  await page
    .locator("#generation")
    .textContent()
    .then((s) => s.includes("E36")),
);
await page.locator("#browse").click();
await page.locator("#search").fill("M4 Competition G82");
await page.locator(".vehicle").click();
await page.waitForFunction(() => document.querySelector("#loading")?.hidden, {
  timeout: 120000,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: "e2e/screenshots/showroom-mobile.png",
  fullPage: true,
});
check(
  "Mobile no horizontal overflow",
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
check("No browser errors", errors.length === 0);
writeFileSync(
  "e2e/showroom-report.json",
  JSON.stringify({ checks, errors }, null, 2),
);
console.log(JSON.stringify({ checks, errors }, null, 2));
await browser.close();
