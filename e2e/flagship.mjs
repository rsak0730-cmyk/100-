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
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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
  await page.waitForFunction(
    () => document.querySelector(".model-status")?.hidden,
    { timeout: 180000 },
  );
  check(
    "Model loaded and canvas present",
    (await page.locator("canvas").count()) === 1,
  );
  mkdirSync("e2e/screenshots", { recursive: true });
  await page.screenshot({
    path: "e2e/screenshots/flagship-desktop.png",
    timeout: 180000,
  });
  await page.locator("#tab-settings").click();
  await page.locator("#quality").selectOption("Low");
  await page.locator("#tab-lighting").click();
  check(
    "Default lighting panel visible",
    await page.locator("#panel-lighting").isVisible(),
  );
  await page.locator("canvas").click({ position: { x: 500, y: 460 } });
  check(
    "Raycast selects central vehicle mesh",
    (await page.locator("#object-name").textContent()) === "BMW M4 Competition",
  );
  await page.locator("#tab-lighting").click();
  await page.locator("#light-power").uncheck();
  await page.waitForTimeout(200);
  const off = await page.locator("canvas").screenshot({ timeout: 180000 });
  await page.locator("#light-power").check();
  await page.waitForTimeout(200);
  const on = await page.locator("canvas").screenshot({ timeout: 180000 });
  check("Master lighting changes rendered scene", !off.equals(on));
  for (const preset of [
    "Luxury Warm",
    "Pure White",
    "Cinematic Night",
    "Sunset",
    "Cool Modern",
    "Studio Photography",
    "Ambient Evening",
  ]) {
    await page.locator("#light-preset").selectOption(preset);
    check(`Preset ${preset}`, await page.locator("#light-power").isChecked());
  }
  await page.locator("#light-temperature").fill("7000");
  check(
    "Temperature output updates",
    (await page.locator("#value-temperature").textContent()) === "7000 K",
  );
  check(
    "Temperature changes colour",
    (await page.locator("#light-color").inputValue()) !== "#ffffff",
  );
  for (const key of [
    "brightness",
    "ceilingBrightness",
    "leftBrightness",
    "rightBrightness",
    "spotBrightness",
    "displayBrightness",
    "accentBrightness",
  ]) {
    await page.locator(`#light-${key}`).fill("1.2");
    check(
      `${key} output`,
      (await page.locator(`#value-${key}`).textContent()) === "1.2",
    );
  }
  for (const key of [
    "ceiling",
    "left",
    "right",
    "spotlight",
    "display",
    "accent",
  ]) {
    await page.locator(`#light-${key}`).uncheck();
    check(`${key} switch`, !(await page.locator(`#light-${key}`).isChecked()));
    await page.locator(`#light-${key}`).check();
  }
  await page.locator("details").last().locator("summary").click();
  for (const key of [
    "ambient",
    "directional",
    "reflections",
    "environmentBrightness",
    "exposure",
    "shadowIntensity",
  ])
    await page
      .locator(`#light-${key}`)
      .fill(key === "exposure" ? "1.1" : "0.5");
  await page.locator("#light-shadows").uncheck();
  await page.locator("#light-shadows").check();
  await page.locator("#reset-lights").click();
  check(
    "Reset restores master brightness",
    (await page.locator("#light-brightness").inputValue()) === "1",
  );
  await page.locator("#tab-environment").click();
  for (const time of ["Daytime", "Evening", "Night", "Sunset"]) {
    await page.locator("#light-timeOfDay").selectOption(time);
    check(
      `${time} environment updates`,
      (await page.locator("#current-time").textContent()) === time,
    );
  }
  await page.locator("#light-outdoorBrightness").fill("0.7");
  await page.locator("#light-windowReflection").fill("0.3");
  await page.locator("#tab-explore").click();
  await page.locator("#object-select").selectOption("reception");
  check(
    "Object information from registered geometry",
    (await page.locator("#object-name").textContent()) === "Reception desk",
  );
  await page.locator("#focus-object").click();
  await page.waitForTimeout(1600);
  await page.screenshot({
    path: "e2e/screenshots/flagship-reception.png",
    timeout: 180000,
  });
  await page.locator('[data-camera="Lounge"]').first().click();
  await page.waitForTimeout(1600);
  check(
    "Camera preset updates location",
    (await page.locator("#current-view").textContent()) === "Lounge",
  );
  await page.screenshot({
    path: "e2e/screenshots/flagship-lounge.png",
    timeout: 180000,
  });
  await page.locator('[data-camera="Wide Architecture"]').first().click();
  await page.waitForTimeout(1600);
  await page.screenshot({
    path: "e2e/screenshots/flagship-architecture.png",
    timeout: 180000,
  });
  await page.locator("#tab-settings").click();
  await page.locator("#quality").selectOption("Low");
  await page.locator("#show-stats").check();
  check(
    "Performance panel visible",
    await page.locator("#performance").isVisible(),
  );
  await page.locator("#credits-button").click();
  check(
    "License attribution accessible",
    await page.locator("#credits").isVisible(),
  );
  await page.locator("#close-credits").click();
  await page.locator("#reset-bottom").click();
  await page.waitForTimeout(1600);
  await page.locator("#close-panel").click();
  check(
    "Panel collapses",
    await page
      .locator("#showroom-shell")
      .getAttribute("class")
      .then((s) => s.includes("panel-collapsed")),
  );
  await page.locator("#open-panel").click();
  check(
    "Panel expands",
    (await page.locator("#open-panel").getAttribute("aria-expanded")) ===
      "true",
  );
  await page.locator("#tab-lighting").click();
  await page.locator("#reset-lights").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#close-panel").click();
  await page.screenshot({
    path: "e2e/screenshots/flagship-mobile.png",
    timeout: 180000,
  });
  check(
    "Mobile no horizontal overflow",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.locator("#lighting-shortcut").click();
  check(
    "Mobile lighting panel opens",
    await page.locator("#panel-lighting").isVisible(),
  );
  await page.waitForTimeout(400);
  await page.screenshot({
    path: "e2e/screenshots/flagship-mobile-controls.png",
    timeout: 180000,
  });
  await page.locator("#close-panel").click();
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 2,
  });
  const beforeTouch = await page
    .locator("canvas")
    .screenshot({ timeout: 180000 });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 180, y: 430 }],
  });
  for (let i = 1; i <= 8; i++)
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 180 + i * 8, y: 430 + i * 2 }],
    });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(800);
  const afterTouch = await page
    .locator("canvas")
    .screenshot({ timeout: 180000 });
  check(
    "Emulated touch drag changes rendered camera view",
    !beforeTouch.equals(afterTouch),
  );
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 1, x: 145, y: 450 },
      { id: 2, x: 245, y: 450 },
    ],
  });
  for (let i = 1; i <= 5; i++)
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { id: 1, x: 145 - i * 7, y: 450 },
        { id: 2, x: 245 + i * 7, y: 450 },
      ],
    });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(800);
  const afterPinch = await page
    .locator("canvas")
    .screenshot({ timeout: 180000 });
  check(
    "Emulated pinch zoom changes rendered camera view",
    !afterPinch.equals(afterTouch),
  );
  await page.locator("#open-panel").click();
  await page.locator("#tab-explore").focus();
  await page.keyboard.press("ArrowRight");
  check(
    "Tabs support arrow-key navigation",
    (await page.locator("#tab-lighting").getAttribute("aria-selected")) ===
      "true",
  );
  check("No browser errors", errors.length === 0);
} finally {
  writeFileSync(
    "e2e/flagship-report.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ checks, errors }, null, 2));
  await browser.close();
}
