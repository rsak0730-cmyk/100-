import "./style.css";
import { vehicles } from "./catalogue";
import { Viewer } from "./viewer";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<header><a class="brand" href="#"><i></i> M ATELIER<span>THE PERFORMANCE ARCHIVE</span></a><nav><button data-tab="showroom" class="active">Showroom</button><button data-tab="models">Models <small>${vehicles.length}</small></button><button data-tab="configure">Configure</button><button data-tab="about">About ↗</button></nav><span class="edition">INDEPENDENT AUTOMOTIVE STUDY <b>01 / 2026</b></span></header>
<main><section class="stage"><div id="canvas"></div><div class="eyebrow">THE M COLLECTION <span>EST. 1972 — BUILT TO MOVE YOU</span></div><div class="identity"><p id="generation"></p><h1 id="name"></h1><p class="subtitle">PRECISION HAS A PRESENCE.</p></div><div class="mode"><button class="selected">◉ Normal view</button><button disabled title="No verified internal mechanical geometry is available">⚙ Anatomy view <small>UNAVAILABLE</small></button></div><div id="loading" role="status"></div><button class="arrow prev" aria-label="Previous vehicle">‹</button><button class="arrow next" aria-label="Next vehicle">›</button><div class="side-note">DESIGNED FOR THE DRIVER.<br>EXPLORED BY YOU.</div><div class="stage-footer"><span><b class="live"></b> REAL-TIME 3D <small>THIRD-PARTY EXTERIOR STUDY</small></span><span>DRAG TO ORBIT <em> / </em> SCROLL TO ZOOM</span><button id="fullscreen">⛶ Fullscreen</button></div></section>
<aside><div class="panel-head"><span>YOUR VEHICLE</span><span id="counter"></span></div><h2 id="panel-name"></h2><div class="badge" id="availability"></div><div class="tabs"><button class="active" data-panel="configure">Configure</button><button data-panel="details">Details</button><button data-panel="cameras">Cameras</button></div><div id="configure" class="pane"><label>01 <b>EXTERIOR COLOUR</b><span id="paint-name">Original asset</span></label><div class="swatches"></div><label class="custom">Custom paint <input id="custom" type="color" value="#b3c5b4" aria-label="Custom paint colour"></label><label>02 <b>SURFACE FINISH</b></label><div class="finishes">${["Gloss", "Metallic", "Matte", "Satin"].map((x) => `<button>${x}</button>`).join("")}</div><p class="fine">Material studies, not a factory options list. Paint updates body material only; no wheel or trim substitutions.</p><label>03 <b>STUDIO LIGHTING</b></label><select id="environment" aria-label="Studio lighting">${["Dark", "White", "Grey", "Sunset"].map((x) => `<option>${x}</option>`).join("")}</select><p class="fine">Procedural softbox lighting. Sunset is a colour study, not a location HDRI.</p></div><div id="details" class="pane" hidden><h3>Authenticity, before everything.</h3><p>Licensed third-party exterior model. Exact generation, trim fidelity and factory dimensions have not been independently verified.</p><p>Model-year and market-specific performance figures are withheld pending primary-source validation.</p><p>Anatomy, interior, mesh-level component labels and exploded assembly are unavailable: this asset does not provide a verified component hierarchy.</p><a href="https://github.com/coopercodes/bmwGLB" target="_blank" rel="noreferrer">Asset source & attribution ↗</a></div><div id="cameras" class="pane" hidden><h3>Find your perspective.</h3><div class="cameras">${["Hero", "Front", "Rear", "Left", "Right", "Top"].map((x) => `<button>${x}</button>`).join("")}</div><p class="fine">Camera labels use asset axes; OEM orientation is not verified.</p></div><div class="panel-bottom"><label>RENDER QUALITY<select id="quality"><option>Low</option><option selected>Medium</option><option>Ultra</option></select></label><p>BMW M. A different kind of driven.</p></div></aside></main>
<footer><div><button id="rotate">↻ 360° rotation</button><button id="reset">↺ Reset view</button><button id="browse">▦ Browse collection</button></div><span>UNOFFICIAL · NOT AFFILIATED WITH BMW AG</span><span>WEBGL / <b>LIVE EXPERIENCE</b></span></footer>
<dialog id="catalogue"><div class="dialog-head"><div><p>THE PERFORMANCE ARCHIVE</p><h2>Find your M.</h2></div><button class="close" aria-label="Close catalogue">✕</button></div><div class="filters"><input id="search" placeholder="Search model or generation…" aria-label="Search vehicles"/><select id="series" aria-label="Series"><option value="">All series</option>${[...new Set(vehicles.map((v) => v.series))].map((s) => `<option>${s}</option>`).join("")}</select><select id="category" aria-label="Category"><option value="">All categories</option><option>Full M</option><option>M Performance</option><option>Classic & special</option></select></div><p class="fine">One exterior reference asset. Other models are catalogue-only. Production dates, drivetrain and technical figures await source validation.</p><div id="results"></div></dialog>
<dialog id="about"><div class="dialog-head"><h2>Engineering honesty.</h2><button class="close" aria-label="Close about">✕</button></div><p>An independent interactive collection, not an official BMW product. BMW names and trademarks belong to their respective owners.</p><h3>Model credit</h3><p>“BMW M4 Competition M Package” by SRT Performance, licensed CC BY 4.0, distributed via coopercodes/bmwGLB. Display normalization and interactive material modifications are applied. No OEM geometry claim is made.</p><p><a href="https://sketchfab.com/3d-models/bmw-m4-competition-m-package-5c0a2dafb1ad408d9fc9eeef9aee531b">Original creator page ↗</a> · <a href="https://creativecommons.org/licenses/by/4.0/">License ↗</a></p><p>Mechanical anatomy requires an additional licensed, validated modular asset. It is intentionally disabled here rather than fabricated.</p></dialog>`;
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
let index = vehicles.findIndex((v) => v.model);
let viewer: Viewer | undefined;
try {
  viewer = new Viewer($("#canvas"), (s) => {
    $("#loading").textContent = s;
    $("#loading").hidden = !s;
  });
} catch {
  $("#loading").textContent = "WebGL unavailable. Browse the collection below.";
}
function select(i: number) {
  index = (i + vehicles.length) % vehicles.length;
  const v = vehicles[index];
  $("#name").textContent = v.name.replace("BMW ", "");
  $("#panel-name").textContent = v.name;
  $("#generation").textContent =
    `${v.generation} / ${v.category.toUpperCase()} / ${v.body.toUpperCase()}`;
  $("#counter").textContent =
    `${String(index + 1).padStart(2, "0")} / ${vehicles.length}`;
  $("#availability").textContent = v.model
    ? "● EXTERIOR ASSET · FIDELITY UNVERIFIED"
    : "○ 3D MODEL COMING SOON";
  $("#paint-name").textContent = "Original asset";
  document
    .querySelectorAll<HTMLButtonElement>(
      ".swatches button,.finishes button,.cameras button",
    )
    .forEach((b) => (b.disabled = !v.model));
  $("#custom").toggleAttribute("disabled", !v.model);
  $("#rotate").toggleAttribute("disabled", !v.model);
  viewer?.load(v.model);
}
const paints = [
  ["Alpine White", "#eeeeea"],
  ["Pearl White", "#ddd9cd"],
  ["Gloss Black", "#151719"],
  ["Brooklyn Grey", "#727f83"],
  ["Isle of Man Green", "#126451"],
  ["Marina Bay Blue", "#16499c"],
  ["Toronto Red", "#af2028"],
];
$(".swatches").innerHTML = paints
  .map(
    ([name, color]) =>
      `<button style="--paint:${color}" title="${name}" aria-label="${name}"></button>`,
  )
  .join("");
document.querySelectorAll<HTMLButtonElement>(".swatches button").forEach(
  (b, i) =>
    (b.onclick = () => {
      viewer?.color(paints[i][1]);
      $("#paint-name").textContent = paints[i][0];
      document
        .querySelectorAll(".swatches button")
        .forEach((x) => x.classList.remove("chosen"));
      b.classList.add("chosen");
    }),
);
$("#custom").oninput = (e) => {
  viewer?.color((e.target as HTMLInputElement).value);
  $("#paint-name").textContent = "Custom paint";
};
document.querySelectorAll<HTMLButtonElement>(".finishes button").forEach(
  (b) =>
    (b.onclick = () => {
      viewer?.finish(b.textContent!);
      document
        .querySelectorAll(".finishes button")
        .forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
    }),
);
document
  .querySelectorAll<HTMLButtonElement>(".cameras button")
  .forEach((b) => (b.onclick = () => viewer?.preset(b.textContent!)));
$("#environment").onchange = (e) =>
  viewer?.environment((e.target as HTMLSelectElement).value);
$("#quality").onchange = (e) =>
  viewer?.quality((e.target as HTMLSelectElement).value);
$(".prev").onclick = () => select(index - 1);
$(".next").onclick = () => select(index + 1);
$("#reset").onclick = () => {
  viewer?.reset();
  if (viewer) viewer.auto = false;
  $("#rotate").classList.remove("active");
};
$("#rotate").onclick = () => {
  if (viewer) {
    viewer.auto = !viewer.auto;
    $("#rotate").classList.toggle("active", viewer.auto);
  }
};
$("#fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $(".stage").requestFullscreen();
  } catch {
    $("#loading").textContent = "Fullscreen is not supported in this browser.";
  }
};
function pane(id: string) {
  document
    .querySelectorAll<HTMLElement>(".pane")
    .forEach((x) => (x.hidden = x.id !== id));
  document
    .querySelectorAll("[data-panel]")
    .forEach((x) =>
      x.classList.toggle("active", (x as HTMLElement).dataset.panel === id),
    );
}
document
  .querySelectorAll<HTMLButtonElement>("[data-panel]")
  .forEach((b) => (b.onclick = () => pane(b.dataset.panel!)));
function render() {
  const search = $<HTMLInputElement>("#search").value.toLowerCase(),
    series = $<HTMLSelectElement>("#series").value,
    category = $<HTMLSelectElement>("#category").value;
  const list = vehicles.filter(
    (v) =>
      (v.name + " " + v.generation).toLowerCase().includes(search) &&
      (!series || v.series === series) &&
      (!category || v.category === category),
  );
  $("#results").innerHTML = list.length
    ? list
        .map(
          (v) =>
            `<button class="vehicle" data-id="${v.id}"><span class="car-icon">${v.series}</span><span><b>${v.name}</b><small>${v.generation} / ${v.body} / ${v.category}</small></span><em>${v.model ? "EXTERIOR REFERENCE ↗" : "3D MODEL COMING SOON"}</em></button>`,
        )
        .join("")
    : "<p>No matching vehicles. Try another search.</p>";
  document.querySelectorAll<HTMLButtonElement>(".vehicle").forEach(
    (b) =>
      (b.onclick = () => {
        select(vehicles.findIndex((v) => v.id === b.dataset.id));
        $<HTMLDialogElement>("#catalogue").close();
      }),
  );
}
function browse() {
  render();
  $<HTMLDialogElement>("#catalogue").showModal();
}
$("#browse").onclick = browse;
document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach(
  (b) =>
    (b.onclick = () => {
      if (b.dataset.tab === "models") browse();
      else if (b.dataset.tab === "about")
        $<HTMLDialogElement>("#about").showModal();
      else if (b.dataset.tab === "configure") {
        pane("configure");
        $("aside").scrollIntoView({ behavior: "smooth" });
      } else viewer?.reset();
    }),
);
document
  .querySelectorAll<HTMLButtonElement>(".close")
  .forEach((b) => (b.onclick = () => b.closest("dialog")!.close()));
["#search", "#series", "#category"].forEach((s) =>
  $(s).addEventListener("input", render),
);
window.addEventListener("keydown", (e) => {
  if (
    document.querySelector("dialog[open]") ||
    ["INPUT", "SELECT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
  )
    return;
  if (e.key === "ArrowRight") {
    e.preventDefault();
    select(index + 1);
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    select(index - 1);
  }
});
// Vehicle swipes belong to the identity strip, never the orbit canvas.
let touchX = 0;
$(".identity").addEventListener(
  "touchstart",
  (e) => (touchX = (e as TouchEvent).touches[0].clientX),
  { passive: true },
);
$(".identity").addEventListener(
  "touchend",
  (e) => {
    const dx = (e as TouchEvent).changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 65) select(index + (dx < 0 ? 1 : -1));
  },
  { passive: true },
);
select(index);
