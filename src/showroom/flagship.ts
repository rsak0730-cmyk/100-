import { additionalVehicles } from "./additional-vehicles";
import { Vector3 } from "three";
import "./flagship.css";
import { Viewer } from "./viewer";
import { cameraViews } from "./cameras";
import { defaultLighting, type LightingSettings } from "./lighting";
import modelAsset from "./model-asset.json";
import type { Exhibit } from "./architecture";
const icon = (name: string) => {
  const paths: Record<string, string> = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    explore:
      '<circle cx="12" cy="12" r="7"/><path d="M12 1v7m0 8v7M1 12h7m8 0h7"/>',
    full: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',
    reset: '<path d="M4 8a9 9 0 1 1-1 7M4 2v6h6"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  };
  return `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true">${paths[name] || ""}</svg>`;
};
const app = document.querySelector<HTMLDivElement>("#app")!;
const presets = [
  "Luxury Warm",
  "Pure White",
  "Cinematic Night",
  "Sunset",
  "Cool Modern",
  "Studio Photography",
  "Ambient Evening",
];
const range = (
  key: keyof LightingSettings,
  label: string,
  min: number,
  max: number,
  step: number,
  suffix = "",
) =>
  `<label class="slider-field" for="light-${key}"><span>${label}</span><output id="value-${key}"></output><input id="light-${key}" type="range" min="${min}" max="${max}" step="${step}" aria-label="${label}" data-suffix="${suffix}"/></label>`;
const toggle = (key: keyof LightingSettings, label: string) =>
  `<label class="toggle"><span>${label}</span><input id="light-${key}" type="checkbox" role="switch"/></label>`;
app.innerHTML = `<a class="skip" href="#viewport">Skip to showroom</a>
<header class="site-header"><a href="#" class="wordmark" aria-label="Atelier Motor House home"><span class="monogram">a<span>/</span>m</span><span>ATELIER<small>MOTOR HOUSE</small></span></a><nav aria-label="Main navigation"><button data-nav="home" class="nav-active">Showroom</button><button data-nav="explore">Explore</button><button data-nav="lighting">Lighting</button><button data-nav="environment">Environment</button><button data-nav="settings">Settings</button></nav><button class="full top-full" aria-label="Enter fullscreen">${icon("full")}</button></header>
<main id="showroom-shell"><section id="viewport" tabindex="-1" aria-label="3D showroom"><div id="canvas"></div><div class="scene-vignette"></div><div class="scene-heading"><span class="overline">An independent automotive gallery</span><h1>Space for<br>the extraordinary.</h1><p>Architecture. Atmosphere. Automotive design.</p></div><div class="scene-location"><span class="live-dot"></span><span id="current-view">Central Vehicle</span><span class="location-divider">/</span><span id="current-time">Daytime</span></div><div class="scene-legend"><span>Drag to orbit</span><span>Scroll to explore</span><span>Click an object to inspect</span></div><div class="model-status" role="status" aria-live="polite"><span id="load-text">Building your showroom…</span><button id="retry-model" hidden>Retry download</button></div><div id="webgl-fallback" hidden><h2>Your showroom needs WebGL</h2><p>Try an updated browser with hardware acceleration enabled. All environment details and controls remain readable.</p></div><button id="open-panel" aria-label="Open showroom controls" aria-expanded="true">${icon("menu")} <span>Showroom controls</span></button><div class="vehicle-caption"><span class="caption-line"></span><div><small>ON THE CENTRE STAGE</small><h2>BMW M4 Competition <span>G82</span></h2><p>Third-party exterior study · Factory fidelity unverified</p></div><button id="focus-car" aria-label="Focus central vehicle">${icon("explore")}</button></div></section>
<aside id="control-panel" aria-label="Showroom controls"><div class="panel-top"><span>Your showroom, reimagined.</span><button id="close-panel" aria-label="Collapse controls">×</button></div><div class="panel-tabs" role="tablist" aria-label="Showroom tools">${[
  ["explore", "Explore"],
  ["lighting", "Lighting"],
  ["environment", "Atmosphere"],
  ["settings", "Settings"],
]
  .map(
    ([id, label]) =>
      `<button role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${id === "lighting"}" data-tab="${id}">${label}</button>`,
  )
  .join("")}</div>
<section id="panel-lighting" class="tool-panel" role="tabpanel" aria-labelledby="tab-lighting"><div class="section-title"><small>LIGHT & SHADOW</small><h2>Set the mood.</h2><p>Shape the light around every surface.</p></div>${toggle("power", "Main lighting")}<label class="select-label" for="light-preset">Lighting scene<select id="light-preset"><option value="Signature">Signature — default</option>${presets.map((p) => `<option>${p}</option>`).join("")}<option value="Custom" disabled>Custom lighting</option></select></label><div class="preset-pills">${["Luxury Warm", "Pure White", "Cinematic Night"].map((p) => `<button data-preset="${p}">${p}</button>`).join("")}</div>${range("brightness", "Master brightness", 0, 2, 0.05)}${range("temperature", "Colour temperature", 2200, 9000, 100, " K")}<div class="temperature-labels"><span>Warm</span><span>Neutral</span><span>Cool</span></div><div class="colour-pair"><label for="light-color">Custom light colour<input id="light-color" type="color"/></label><label for="light-accentColor">Accent colour<input id="light-accentColor" type="color"/></label></div><details open><summary>Light groups</summary>${[
  ["ceiling", "Ceiling installation", "ceilingBrightness"],
  ["left", "Left softbox", "leftBrightness"],
  ["right", "Right softbox", "rightBrightness"],
  ["spotlight", "Spotlight", "spotBrightness"],
  ["display", "Vehicle presentation", "displayBrightness"],
  ["accent", "Architectural accents", "accentBrightness"],
]
  .map(
    ([key, label, brightness]) =>
      `<div class="bank">${toggle(key as keyof LightingSettings, label)}${range(brightness as keyof LightingSettings, label + " brightness", 0, 2, 0.05)}</div>`,
  )
  .join(
    "",
  )}</details><details><summary>Fine adjustments</summary>${range("ambient", "Ambient fill", 0, 1, 0.05)}${range("directional", "Directional light", 0, 2, 0.05)}${range("reflections", "Material reflections", 0, 1.5, 0.05)}${range("environmentBrightness", "Environment lighting", 0, 2, 0.05)}${range("exposure", "Camera exposure", 0.3, 2, 0.05)}${toggle("shadows", "Presentation shadows")}${range("shadowIntensity", "Shadow strength", 0, 1, 0.05)}</details><button id="reset-lights" class="text-action">↺ Restore signature lighting</button></section>
<section id="panel-environment" class="tool-panel" role="tabpanel" aria-labelledby="tab-environment" hidden><div class="section-title"><small>BEYOND THE GLASS</small><h2>A change of scene.</h2><p>Watch the arrival courtyard respond to the time of day.</p></div><label class="select-label" for="light-timeOfDay">Time of day<select id="light-timeOfDay">${["Daytime", "Evening", "Night", "Sunset"].map((t) => `<option>${t}</option>`).join("")}</select></label><div class="time-pills">${["Daytime", "Evening", "Night", "Sunset"].map((t) => `<button data-time="${t}">${t}</button>`).join("")}</div>${range("outdoorBrightness", "Outdoor brightness", 0, 2, 0.05)}${range("windowReflection", "Window reflections", 0, 1, 0.05)}<p class="note">Time changes the outdoor sky, directional light colour and its elevation—not an overlay. Interior fill and environment reflections can be balanced in Lighting.</p>${toggle("room", "Show architecture")}<button id="courtyard-view" class="outline-action">View the entrance glazing</button></section>
<section id="panel-explore" class="tool-panel" role="tabpanel" aria-labelledby="tab-explore" hidden><div class="section-title"><small>A PLACE TO DISCOVER</small><h2>Take a closer look.</h2><p>Move between the gallery’s spaces, or select objects directly in 3D.</p></div><div class="available-cars"><h3>Available cars</h3><button data-camera="Central Vehicle">M4 Competition · G82 <small>Centre stage</small></button>${additionalVehicles.map((v) => `<button data-camera="${v.camera}">${v.name} · ${v.generation}<small id="status-${v.id}" role="status">Waiting to load</small></button>`).join("")}</div><div class="camera-grid">${Object.keys(
  cameraViews,
)
  .map(
    (name, i) =>
      `<button data-camera="${name}"><small>${String(i + 1).padStart(2, "0")}</small><span>${name}</span><b>↗</b></button>`,
  )
  .join(
    "",
  )}</div><label class="select-label" for="object-select">Inspect an object<select id="object-select"><option value="">Choose a showroom object</option></select></label><article id="object-info" hidden aria-live="polite"><small id="object-kind">SELECTED OBJECT</small><h3 id="object-name"></h3><p id="object-description"></p><dl><dt>Material</dt><dd id="object-material"></dd></dl><div class="object-actions"><button id="focus-object">Focus object</button><button id="object-light" hidden>Adjust light</button><button id="clear-object">Clear selection</button></div></article><p class="note">Three distinct third-party assets are displayed: M4 Competition on centre stage, M5 F10 on the west island, and M4 CSL on the east island.</p></section>
<section id="panel-settings" class="tool-panel" role="tabpanel" aria-labelledby="tab-settings" hidden><div class="section-title"><small>THE EXPERIENCE</small><h2>Make it yours.</h2></div><label class="select-label" for="quality">Render quality<select id="quality"><option>Auto</option><option>Low</option><option>Medium</option><option>Ultra</option></select></label><p class="note">Auto reduces resolution after sustained slow rendering. Geometry and texture detail are unchanged.</p><label class="toggle"><span>Vehicle turntable</span><input id="rotate" type="checkbox" role="switch"/></label><label class="toggle"><span>Show performance readout</span><input id="show-stats" type="checkbox" role="switch"/></label><div id="performance" hidden aria-live="off"><span id="fps">Idle</span><span id="render-stats"></span></div><button id="reset-view" class="outline-action">Reset camera</button><button id="credits-button" class="text-action">Asset credits & transparency</button><p class="note">An independent showroom study, not affiliated with BMW AG. Room architecture and material maps are generated locally. No user installation or paid API is required.</p></section>
<div class="panel-footer"><span class="status-dot"></span> Real-time architecture <span id="quality-badge">Auto</span></div></aside></main>
<footer class="experience-bar"><div class="camera-shortcuts"><button data-camera="Entrance">Entrance</button><button data-camera="Central Vehicle" class="is-active">Centre stage</button><button data-camera="Wide Architecture">Architecture</button><button data-camera="Lounge">Lounge</button></div><div class="bar-actions"><button id="lighting-shortcut" aria-label="Open lighting controls">${icon("sun")} <span>Lighting</span></button><button id="reset-bottom" aria-label="Reset camera">${icon("reset")} <span>Reset</span></button><button class="full" aria-label="Enter fullscreen">${icon("full")} <span>Fullscreen</span></button></div><span class="bar-note">Designed to be explored.</span></footer>
<dialog id="credits"><button id="close-credits" aria-label="Close credits">×</button><small>PROVENANCE & LIMITATIONS</small><h2>A space built with honesty.</h2><p>“BMW M4 Competition M Package” by 𝙎𝙍𝙏 𝙋𝙚𝙧𝙛𝙤𝙢𝙖𝙣𝙘𝙚™, distributed via coopercodes/bmwGLB under CC BY 4.0. Geometry was normalized and losslessly compressed; optional paint edits modify materials. Factory dimensions and trim fidelity are unverified.</p><p><a href="https://github.com/coopercodes/bmwGLB">Asset source</a> · <a href="https://sketchfab.com/3d-models/bmw-m4-competition-m-package-5c0a2dafb1ad408d9fc9eeef9aee531b">Creator page</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></p><p>Architecture, furniture, courtyard, art and surface maps are procedural original work. Lighting uses Three.js (MIT) and its procedural RoomEnvironment. There is no photographic environment, HDRI location, SSR or claim of physically exact architectural simulation. The additional free models have separate creators and source licenses listed below.</p>${additionalVehicles.map((v) => `<p><b>${v.name} ${v.generation} (${v.year})</b> by ${v.author} — <a href="${v.source}">Original source</a>, <a href="${v.distribution}">Distributor</a>, CC BY 4.0. Runtime scale/orientation normalization applied.${v.id === "m4-csl-g82" ? " Distributor variant is Meshopt-compressed with 2K textures; unused geometry and a documented floating splitter artifact are removed at runtime." : ""}</p>`).join("")}<p>No real-phone hardware benchmark is claimed. Browser emulation and software WebGL are used for automated QA.</p></dialog>`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
let viewer: Viewer | undefined,
  selected: Exhibit | null = null,
  statsAt = 0;
function panel(name: string, open = true) {
  const next = document.querySelector<HTMLElement>(`#panel-${name}`);
  if (next?.hidden) next.scrollTop = 0;
  document
    .querySelectorAll<HTMLElement>(".tool-panel")
    .forEach((p) => (p.hidden = p.id !== `panel-${name}`));
  document
    .querySelectorAll<HTMLElement>("[data-tab]")
    .forEach((b) =>
      b.setAttribute("aria-selected", String(b.dataset.tab === name)),
    );
  document
    .querySelectorAll("[data-nav]")
    .forEach((b) =>
      b.classList.toggle("nav-active", (b as HTMLElement).dataset.nav === name),
    );
  if (open) togglePanel(true);
}
function togglePanel(open: boolean) {
  $("#showroom-shell").classList.toggle("panel-collapsed", !open);
  $("#control-panel").inert = !open;
  $("#open-panel").setAttribute("aria-expanded", String(open));
  if (!open) $("#open-panel").focus();
}
function sync() {
  const s = viewer?.lighting.settings;
  if (!s) return;
  for (const key of Object.keys(
    defaultLighting,
  ) as (keyof LightingSettings)[]) {
    const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(
      `#light-${key}`,
    );
    if (!input) continue;
    if (input instanceof HTMLInputElement && input.type === "checkbox")
      input.checked = s[key] as boolean;
    else input.value = String(s[key]);
    const out = document.querySelector(`#value-${key}`);
    if (out) out.textContent = String(s[key]) + (input.dataset.suffix || "");
  }
  $("#current-time").textContent = s.timeOfDay;
  document
    .querySelectorAll<HTMLElement>("[data-time]")
    .forEach((b) =>
      b.classList.toggle("is-active", b.dataset.time === s.timeOfDay),
    );
}
function choosePreset(name: string) {
  viewer?.lighting.preset(name);
  $<HTMLSelectElement>("#light-preset").value = name;
  sync();
}
try {
  viewer = new Viewer($("#canvas"), (text) => {
    $("#load-text").textContent = text;
    $(".model-status").hidden = !text;
    $("#retry-model").hidden = !text.includes("FAILED");
  });
  viewer.lighting.preset("Luxury Warm");
  viewer.quality("Auto");
  viewer.onSelect = (item) => {
    selected = item;
    $("#object-info").hidden = !item;
    if (!item) return;
    panel("explore");
    $("#object-name").textContent = item.name;
    $("#object-description").textContent = item.description;
    $("#object-material").textContent = item.material;
    $("#object-light").hidden = !item.bank;
    $<HTMLSelectElement>("#object-select").value = item.id;
  };
  const options = viewer.lighting.built.objects;
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = o.name + " — " + o.id;
    $<HTMLSelectElement>("#object-select").append(opt);
  }
  viewer.onStats = (stats) => {
    if (performance.now() - statsAt < 400) return;
    statsAt = performance.now();
    $("#fps").textContent =
      `${stats.fps ? stats.fps.toFixed(0) + " FPS while moving" : "Idle / on-demand"} · ${stats.renderMs.toFixed(1)} ms render`;
    $("#render-stats").textContent =
      `${stats.drawCalls} draw calls · ${(stats.triangles / 1000).toFixed(0)}k triangles · ${stats.geometries} geometries · ${stats.textures} textures`;
    $("#quality-badge").textContent = stats.quality;
  };
  viewer.onAdditionalStatus = (id, status) => {
    const el = document.querySelector(`#status-${id}`);
    if (el) el.textContent = status;
  };
  viewer.onAdditionalReady = (item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.name;
    $<HTMLSelectElement>("#object-select").append(opt);
  };
  void viewer
    .load(modelAsset.path)
    .then(() => viewer?.loadAdditionalVehicles());
  sync();
} catch (error) {
  $("#webgl-fallback").hidden = false;
  $(".model-status").hidden = true;
  console.warn("3D initialization failed", error);
  document
    .querySelectorAll<
      HTMLInputElement | HTMLSelectElement
    >("#control-panel input,#control-panel select")
    .forEach((x) => (x.disabled = true));
}
for (const key of Object.keys(defaultLighting) as (keyof LightingSettings)[]) {
  const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(
    `#light-${key}`,
  );
  if (!input) continue;
  input.addEventListener("input", () => {
    let value: string | number | boolean = input.value;
    if (typeof defaultLighting[key] === "boolean")
      value = (input as HTMLInputElement).checked;
    else if (typeof defaultLighting[key] === "number")
      value = Number(input.value);
    viewer?.lighting.update({ [key]: value });
    $<HTMLSelectElement>("#light-preset").value = "Custom";
    sync();
  });
}
$("#light-preset").onchange = (e) =>
  choosePreset((e.target as HTMLSelectElement).value);
document
  .querySelectorAll<HTMLButtonElement>("[data-preset]")
  .forEach((b) => (b.onclick = () => choosePreset(b.dataset.preset!)));
document.querySelectorAll<HTMLButtonElement>("[data-time]").forEach(
  (b) =>
    (b.onclick = () => {
      viewer?.lighting.update({ timeOfDay: b.dataset.time! });
      sync();
    }),
);
$("#reset-lights").onclick = () => choosePreset("Signature");
document
  .querySelectorAll<HTMLButtonElement>("[data-tab]")
  .forEach((b) => (b.onclick = () => panel(b.dataset.tab!)));
document.querySelectorAll<HTMLButtonElement>("[data-nav]").forEach(
  (b) =>
    (b.onclick = () => {
      if (b.dataset.nav === "home") {
        viewer?.view("Central Vehicle");
        togglePanel(false);
      } else panel(b.dataset.nav!);
    }),
);
function view(name: string) {
  viewer?.view(name);
  updateLocation(name);
  $("#current-view").textContent = name;
  document
    .querySelectorAll<HTMLButtonElement>("[data-camera]")
    .forEach((b) => b.classList.toggle("is-active", b.dataset.camera === name));
  if (innerWidth < 760) togglePanel(false);
}
document
  .querySelectorAll<HTMLButtonElement>("[data-camera]")
  .forEach((b) => (b.onclick = () => view(b.dataset.camera!)));
$("#focus-car").onclick = () => view("Central Vehicle");
$("#courtyard-view").onclick = () => {
  viewer?.flyTo(new Vector3(-2, 2, 7), new Vector3(0, 2, 17));
  $("#current-view").textContent = "Arrival courtyard";
  updateLocation("Arrival courtyard");
  if (innerWidth < 760) togglePanel(false);
};
$("#close-panel").onclick = () => togglePanel(false);
$("#open-panel").onclick = () =>
  togglePanel($("#showroom-shell").classList.contains("panel-collapsed"));
$("#lighting-shortcut").onclick = () => panel("lighting");
$("#object-select").onchange = (e) =>
  viewer?.selectObject(
    viewer.lighting.built.objects.find(
      (x) => x.id === (e.target as HTMLSelectElement).value,
    ) || null,
  );
$("#focus-object").onclick = () => {
  if (selected) viewer?.focus(selected.focus);
  if (innerWidth < 760) togglePanel(false);
};
$("#clear-object").onclick = () => {
  viewer?.selectObject(null);
  $<HTMLSelectElement>("#object-select").value = "";
};
$("#object-light").onclick = () => panel("lighting");
$("#quality").onchange = (e) =>
  viewer?.quality((e.target as HTMLSelectElement).value);
$("#rotate").onchange = (e) => {
  if (viewer) {
    viewer.auto = (e.target as HTMLInputElement).checked;
    viewer.dirty = true;
  }
};
$("#show-stats").onchange = (e) =>
  ($("#performance").hidden = !(e.target as HTMLInputElement).checked);

function updateLocation(name: string) {
  const display = additionalVehicles.find((v) => v.camera === name);
  if (display) {
    $(".scene-heading").classList.add("compact");
    $(".scene-heading h1").textContent =
      display.name + " " + display.generation;
    $(".scene-heading p").textContent =
      `${display.year} · Free CC BY 4.0 exterior model`;
    $(".vehicle-caption small").textContent =
      "ON THE " + (display.id === "m5-f10" ? "WEST" : "EAST") + " ISLAND";
    $(".vehicle-caption h2").textContent =
      display.name + " " + display.generation;
    $(".vehicle-caption p").textContent =
      "Third-party exterior · Exact factory fidelity unverified";
    return;
  }

  const central = name === "Central Vehicle";
  $(".scene-heading").classList.toggle("compact", !central);
  if (central)
    $(".scene-heading h1").innerHTML = "Space for<br>the extraordinary.";
  else $(".scene-heading h1").textContent = name;
  $(".scene-heading p").textContent = central
    ? "Architecture. Atmosphere. Automotive design."
    : "Discover the spaces beyond the centre stage.";
  $(".vehicle-caption small").textContent = central
    ? "ON THE CENTRE STAGE"
    : "EXPLORING THE SHOWROOM";
  $(".vehicle-caption h2").innerHTML = central
    ? "BMW M4 Competition <span>G82</span>"
    : name;
  $(".vehicle-caption p").textContent = central
    ? "Third-party exterior study · Factory fidelity unverified"
    : "Procedural architecture · Interactive material and lighting study";
}
function reset() {
  viewer?.view("Central Vehicle");
  updateLocation("Central Vehicle");
  $("#current-view").textContent = "Central Vehicle";
  $<HTMLInputElement>("#rotate").checked = false;
  viewer?.selectObject(null);
}
$("#reset-bottom").onclick = reset;
$("#reset-view").onclick = reset;
$("#retry-model").onclick = () => {
  void viewer?.load(modelAsset.path);
};
document.querySelectorAll<HTMLButtonElement>(".full").forEach(
  (b) =>
    (b.onclick = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        b.textContent = "Fullscreen unavailable";
      }
    }),
);
document.addEventListener("fullscreenchange", () =>
  document
    .querySelectorAll(".full")
    .forEach((b) =>
      b.setAttribute(
        "aria-label",
        document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen",
      ),
    ),
);
$("#credits-button").onclick = () =>
  $<HTMLDialogElement>("#credits").showModal();
$("#close-credits").onclick = () => $<HTMLDialogElement>("#credits").close();
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") togglePanel(false);
});
$(".wordmark").onclick = (e) => {
  e.preventDefault();
  reset();
};
// Native range inputs, selects and buttons provide keyboard interaction; tabs support arrow keys.
document.querySelector(".panel-tabs")!.addEventListener("keydown", (e) => {
  const event = e as KeyboardEvent;
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...document.querySelectorAll<HTMLButtonElement>("[data-tab]")],
    current = tabs.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
          tabs.length;
  tabs[next].click();
  tabs[next].focus();
});
choosePreset("Luxury Warm");
if (innerWidth < 760) togglePanel(false);
