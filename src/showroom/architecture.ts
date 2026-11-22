import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
export interface Exhibit {
  id: string;
  name: string;
  description: string;
  material: string;
  bank?: string;
  mesh: THREE.Object3D;
  focus: [number, number, number];
}
export interface Architecture {
  group: THREE.Group;
  outdoor: THREE.Group;
  objects: Exhibit[];
  glass: THREE.MeshPhysicalMaterial;
  fixtures: {
    mesh: THREE.Mesh;
    bank: "ceiling" | "left" | "right" | "accent";
  }[];
}
/** Locally generated material maps — no stock photos, external textures or room images. */
function surface(kind: "stone" | "wood" | "fabric") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(256, 256);
  let seed = 2145;
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const noise = (seed >>> 24) / 255;
      const grain =
        kind === "wood"
          ? Math.sin(y * 0.22 + Math.sin(x * 0.018) * 2) * 6
          : kind === "fabric"
            ? x % 3 === 0 || y % 3 === 0
              ? -17
              : 4
            : Math.sin(x * 0.04 + Math.sin(y * 0.02) * 3) * 4;
      const base =
        kind === "wood"
          ? [100, 72, 46]
          : kind === "fabric"
            ? [115, 115, 109]
            : [160, 160, 151];
      const i = (y * 256 + x) * 4;
      for (let c = 0; c < 3; c++)
        image.data[i + c] =
          base[c] + grain + (noise - 0.5) * (kind === "stone" ? 14 : 20);
      image.data[i + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(kind === "stone" ? 8 : 2, kind === "stone" ? 6 : 2);
  map.anisotropy = 4;
  return map;
}
export function buildArchitecture(): Architecture {
  const group = new THREE.Group();
  group.name = "Atelier architectural interior";
  const outdoor = new THREE.Group();
  outdoor.name = "Exterior courtyard";
  const objects: Exhibit[] = [],
    fixtures: Architecture["fixtures"] = [];
  const stoneMap = surface("stone"),
    woodMap = surface("wood"),
    clothMap = surface("fabric");
  const stone = new THREE.MeshStandardMaterial({
    map: stoneMap,
    roughness: 0.28,
    metalness: 0.12,
    bumpMap: stoneMap,
    bumpScale: 0.012,
  });
  const wall = new THREE.MeshStandardMaterial({
    color: 0xc3bfb3,
    roughness: 0.88,
  });
  const wood = new THREE.MeshStandardMaterial({
    map: woodMap,
    roughness: 0.42,
    bumpMap: woodMap,
    bumpScale: 0.014,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x41484a,
    metalness: 0.86,
    roughness: 0.3,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: 0x9e8b66,
    metalness: 0.78,
    roughness: 0.36,
  });
  const leather = new THREE.MeshStandardMaterial({
    color: 0x685344,
    roughness: 0.63,
  });
  const fabric = new THREE.MeshStandardMaterial({
    map: clothMap,
    color: 0xbcbcb2,
    roughness: 0.94,
    bumpMap: clothMap,
    bumpScale: 0.015,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xb7d5d9,
    transparent: true,
    opacity: 0.19,
    roughness: 0.09,
    metalness: 0.12,
    clearcoat: 1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x252a2a,
    roughness: 0.5,
    metalness: 0.2,
  });
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material = wall,
    round = 0,
    parent: THREE.Object3D = group,
  ) {
    const m = new THREE.Mesh(
      round
        ? new RoundedBoxGeometry(w, h, d, 2, round)
        : new THREE.BoxGeometry(w, h, d),
      mat,
    );
    m.position.set(x, y, z);
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function cylinder(
    r: number,
    h: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material = metal,
    parent: THREE.Object3D = group,
  ) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function tag(
    mesh: THREE.Object3D,
    id: string,
    name: string,
    description: string,
    material: string,
    focus: [number, number, number],
    bank?: string,
  ) {
    objects.push({ mesh, id, name, description, material, focus, bank });
    mesh.userData.exhibitId = id;
    return mesh;
  }
  function sign(
    text: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = group,
  ) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = Math.max(96, Math.min(512, Math.round((1024 * h) / w)));
    const ct = c.getContext("2d")!;
    ct.fillStyle = "#172020";
    ct.fillRect(0, 0, 1024, c.height);
    ct.fillStyle = "#eeeadd";
    ct.textAlign = "center";
    ct.textBaseline = "middle";
    let size = Math.round(c.height * 0.35);
    ct.font = `300 ${size}px Arial`;
    while (ct.measureText(text).width > 960 && size > 12) {
      size--;
      ct.font = `300 ${size}px Arial`;
    }
    ct.fillText(text, 512, c.height / 2);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function glow(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    bank: "ceiling" | "left" | "right" | "accent",
  ) {
    const m = box(
      w,
      h,
      d,
      x,
      y,
      z,
      new THREE.MeshBasicMaterial({ color: 0xffedcf }),
    );
    fixtures.push({ mesh: m, bank });
    return m;
  }
  // 36 × 28 m interior, 7.5 m clear height, 1.5 m stone module.
  box(36, 0.2, 28, 0, -0.35, 0, stone);
  const joint = new THREE.MeshStandardMaterial({
    color: 0x7f827d,
    roughness: 0.8,
  });
  for (let x = -18; x <= 18; x += 1.5)
    box(0.009, 0.003, 28, x, -0.247, 0, joint);
  for (let z = -14; z <= 14; z += 1.5)
    box(36, 0.003, 0.009, 0, -0.246, z, joint);
  box(36, 7.5, 0.3, 0, 3.5, -14, wall);
  box(0.3, 7.5, 28, -18, 3.5, 0, wall);
  box(0.3, 7.5, 28, 18, 3.5, 0, wall);
  // Walnut feature wall and fluted joinery at reception.
  box(13, 4.6, 0.2, -8.5, 2, -13.75, wood);
  for (let x = -14.8; x < -2.2; x += 0.22)
    box(0.035, 4.5, 0.055, x, 2, -13.6, brass);
  sign("A T E L I E R   /   M O T O R   H O U S E", 8, 0.65, -8.5, 3, -13.51);
  for (const x of [-17.7, 17.7]) box(0.05, 0.16, 28, x, -0.13, 0, metal);
  // Structural grid and coffered ceiling. No continuous lid: wide camera presets stay unobstructed.
  for (const x of [-12, 12])
    for (const z of [-9, 2, 11]) {
      box(0.45, 7.5, 0.45, x, 3.5, z, wall, 0.045);
      box(0.49, 0.12, 0.49, x, -0.15, z, metal);
    }
  for (let z = -12; z <= 12; z += 3) {
    box(36, 0.27, 0.18, 0, 7.05, z, metal);
    for (let x = -15; x <= 15; x += 5)
      box(
        4.8,
        0.055,
        2.7,
        x,
        7.22,
        z,
        new THREE.MeshStandardMaterial({ color: 0x676c68, roughness: 0.92 }),
      );
  }
  for (const x of [-6, 0, 6]) {
    box(0.15, 0.22, 26, x, 7, 0, metal);
    const fixture = glow(0.14, 0.035, 22, x, 6.84, 0, "ceiling");
    tag(
      fixture,
      `ceiling-${x}`,
      "Ceiling linear installation",
      "Continuous recessed luminaires follow the architectural grid. Controls affect their area-light contribution and visible diffusers.",
      "Opal diffuser / aluminium",
      [x, 6.7, 0],
      "ceiling",
    );
  }
  // Full-height entrance glazing, mullions and paired doors.
  for (let x = -16.5; x <= 16.5; x += 3) {
    if (Math.abs(x) < 2) continue;
    const pane = box(2.85, 6.8, 0.04, x, 3.2, 13.85, glass);
    tag(
      pane,
      `glass-${x}`,
      "Entrance glazing",
      "Full-height architectural glass facing the landscaped arrival court. Reflection strength is adjustable.",
      "Architectural glass / dark aluminium",
      [x, 3, 13],
    );
    box(0.075, 7, 0.12, x - 1.48, 3.2, 13.8, metal);
  }
  for (const x of [-1, 1]) {
    box(1.9, 3.8, 0.04, x, 1.7, 13.85, glass);
    box(0.06, 3.9, 0.1, x * 2, 1.7, 13.8, metal);
    cylinder(0.022, 0.7, x * 0.28, 1.1, 13.7, brass);
  }
  box(36, 0.12, 0.14, 0, 6.8, 13.8, metal);
  box(4, 0.12, 0.14, 0, 3.65, 13.8, metal);
  // Feature stage and two separated secondary islands.
  const stageMat = new THREE.MeshStandardMaterial({
    color: 0x303a3b,
    roughness: 0.25,
    metalness: 0.45,
  });
  for (const [id, x, z, r] of [
    ["central", 0, 0, 3.55],
    ["west", -8, 3, 2.9],
    ["east", 8, 3, 2.9],
  ] as const) {
    const stage = cylinder(r, 0.18, x, -0.12, z, stageMat);
    tag(
      stage,
      `platform-${id}`,
      id === "central"
        ? "Central presentation stage"
        : `${id === "west" ? "West" : "East"} display island`,
      id === "central"
        ? "The licensed M4 exterior reference is the focal exhibit."
        : "Presentation space for a separately licensed vehicle. Check the Explore panel for model loading status.",
      "Satin graphite / illuminated bronze edge",
      [x, 0.15, z],
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r + 0.015, 0.018, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0xffedcf }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, -0.015, z);
    group.add(ring);
    fixtures.push({ mesh: ring, bank: "accent" });
    const screen = box(
      0.75,
      1.03,
      0.1,
      x + r + 0.35,
      0.65,
      z + 1.3,
      metal,
      0.035,
    );
    sign(
      id === "central"
        ? "M4 COMPETITION / G82"
        : id === "west"
          ? "BMW M5 / F10"
          : "BMW M4 CSL / G82",
      0.68,
      0.28,
      x + r + 0.35,
      1.0,
      z + 1.36,
    );
    cylinder(0.23, 0.045, x + r + 0.35, -0.2, z + 1.3, metal);
    cylinder(0.035, 0.36, x + r + 0.35, -0.025, z + 1.3, metal);
    tag(
      screen,
      `screen-${id}`,
      "Gallery information display",
      "A physical display stand identifying the adjacent presentation island. Only one licensed vehicle is currently available.",
      "Brushed aluminium / display glass",
      [x + r + 0.35, 0.8, z + 1.3],
    );
  }
  // Reception: shaped desk, work surface, stools and task equipment.
  const desk = box(5.4, 1.05, 1.1, -9, 0.32, -9.5, wood, 0.12);
  box(5.6, 0.09, 1.23, -9, 0.9, -9.5, stone, 0.035);
  glow(5, 0.025, 0.035, -9, 0.05, -8.93, "accent");
  tag(
    desk,
    "reception",
    "Reception desk",
    "A walnut hospitality counter anchors the entrance sequence. A stone top, recessed plinth and brass edging define the joinery.",
    "Walnut veneer / honed stone / brass",
    [-9, 0.8, -9.5],
  );
  for (const x of [-10.2, -7.8]) {
    box(0.65, 0.42, 0.055, x, 1.17, -9.5, metal, 0.025);
    box(0.08, 0.2, 0.08, x, 0.98, -9.5, metal);
    cylinder(0.35, 0.15, x, 0.5, -10.8, leather);
    cylinder(0.055, 0.65, x, 0.1, -10.8, metal);
  }
  // Lounge sits behind a glass partition, with an unobstructed central circulation route.
  box(0.04, 2.7, 6, 5.2, 1.1, -9, glass);
  box(0.07, 0.06, 6, 5.2, 2.45, -9, metal);
  function seat(x: number, z: number, rotation = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotation;
    group.add(g);
    box(2.55, 0.38, 0.95, 0, 0.12, 0, fabric, 0.13, g);
    box(2.55, 0.68, 0.27, 0, 0.62, -0.43, leather, 0.09, g);
    for (const a of [-1.25, 1.25])
      box(0.18, 0.48, 1.03, a, 0.44, 0, leather, 0.065, g);
    for (const a of [-1, 1])
      for (const b of [-0.3, 0.3])
        box(0.045, 0.21, 0.045, a, -0.1, b, brass, 0, g);
    for (const a of [-0.63, 0.63])
      box(1.15, 0.15, 0.8, a, 0.38, 0.03, fabric, 0.065, g);
    tag(
      g,
      `lounge-seat-${x}-${z}`,
      "Customer lounge",
      "Low-slung upholstery arranged around a stone coffee table, away from the vehicle circulation zone.",
      "Woven upholstery / leather / brass",
      [x, 0.6, z],
    );
  }
  seat(10, -11);
  seat(10, -6, Math.PI);
  cylinder(1.2, 0.09, 10, 0.28, -8.5, stone);
  cylinder(0.55, 0.5, 10, 0, -8.5, metal);
  box(0.4, 0.03, 0.28, 10.1, 0.35, -8.5, wood);
  cylinder(0.1, 0.2, 9.5, 0.42, -8.5, brass);
  sign("T H E   L O U N G E", 4, 0.55, 10, 2.9, -13.78);
  // Purposeful display furniture: shelves, wheel sculpture and framed material studies.
  box(0.65, 2.8, 4, -17.25, 1.15, -7, wood, 0.03);
  for (const y of [0.2, 1.1, 2]) box(0.85, 0.07, 4.1, -17.1, y, -7, brass);
  for (const x of [-2, 1.5]) {
    box(2.8, 1.7, 0.12, x, 2.8, -13.72, metal);
    const art = box(
      2.5,
      1.4,
      0.03,
      x,
      2.8,
      -13.64,
      new THREE.MeshStandardMaterial({
        color: x < 0 ? 0x63716e : 0x9c8b75,
        roughness: 0.82,
      }),
    );
    for (let i = 0; i < 7; i++) {
      const bar = box(0.025, 1.3, 0.025, x - 0.9 + i * 0.3, 2.8, -13.6, brass);
      bar.rotation.z = 0.3;
    }
    tag(
      art,
      `art-${x}`,
      "Material composition",
      "A geometric material study made for the gallery; no third-party automotive photography is used.",
      "Painted panel / brass inlay",
      [x, 2.8, -13.5],
    );
  }
  const wheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.13, 12, 40),
    dark,
  );
  wheel.position.set(-16.8, 1.7, -7);
  wheel.rotation.y = Math.PI / 2;
  group.add(wheel);
  cylinder(0.42, 0.12, -16.8, 0.0, -7, metal);
  // Raised gallery step along the rear side — traversable space is not simulated as walking physics.
  for (let i = 0; i < 3; i++)
    box(
      4,
      0.12 * (i + 1),
      0.7,
      15.7,
      -0.25 + 0.06 * (i + 1),
      -10.3 - i * 0.7,
      stone,
    );
  // Planters and layered leaf silhouettes; repeated parts share materials.
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x294634,
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  const leafGeo = new THREE.SphereGeometry(1, 8, 5);
  const potMat = new THREE.MeshStandardMaterial({
    color: 0x868776,
    roughness: 0.7,
  });
  function plant(
    x: number,
    z: number,
    scale = 1,
    parent: THREE.Object3D = group,
  ) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    parent.add(g);
    cylinder(0.37, 0.7, 0, 0.08, 0, potMat, g);
    cylinder(0.29, 0.025, 0, 0.44, 0, dark, g);
    for (let i = 0; i < 13; i++) {
      const angle = i * 2.4,
        h = 0.9 + (i % 4) * 0.24;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.015, h, 5),
        wood,
      );
      stem.position.set(
        Math.sin(angle) * 0.18,
        0.5 + h / 2,
        Math.cos(angle) * 0.18,
      );
      g.add(stem);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.scale.set(0.2, 0.55, 0.055);
      leaf.position.set(
        Math.sin(angle) * 0.35,
        h + 0.5,
        Math.cos(angle) * 0.35,
      );
      leaf.rotation.set(0.35, angle, 0.5);
      g.add(leaf);
    }
  }
  for (const [x, z] of [
    [-15, -11],
    [15, -12],
    [-15, 10],
    [15, 10],
    [6, -12],
  ])
    plant(x, z);
  // Courtyard beyond the glazing: pavement, trees, low perimeter and distant simple buildings.
  box(
    55,
    0.25,
    28,
    0,
    -0.5,
    28,
    new THREE.MeshStandardMaterial({ color: 0x969c8c, roughness: 0.95 }),
    0,
    outdoor,
  );
  for (let x = -22; x <= 22; x += 4) {
    box(0.018, 0.01, 28, x, -0.365, 28, metal, 0, outdoor);
    plant(x, 28, 2, outdoor);
  }
  for (const x of [-25, 25]) box(1, 2, 40, x, 0.4, 30, wall, 0, outdoor);
  for (let i = 0; i < 7; i++)
    box(
      5,
      8 + (i % 3) * 3,
      5,
      -24 + i * 8,
      2,
      49,
      new THREE.MeshStandardMaterial({ color: 0x89969b, roughness: 0.85 }),
      0,
      outdoor,
    );
  // Batch non-interactive opaque architecture by material; preserve selectable meshes and light diffusers.
  const fixtureSet = new Set(fixtures.map((x) => x.mesh));
  for (const root of [group, outdoor]) {
    root.updateMatrixWorld(true);
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    root.traverse((o) => {
      if (
        !(o instanceof THREE.Mesh) ||
        Array.isArray(o.material) ||
        o.material.transparent ||
        fixtureSet.has(o)
      )
        return;
      let p: THREE.Object3D | null = o;
      while (p) {
        if (p.userData.exhibitId) return;
        p = p.parent;
      }
      const list = batches.get(o.material) || [];
      list.push(o);
      batches.set(o.material, list);
    });
    for (const [material, meshes] of batches) {
      if (meshes.length < 3) continue;
      const geometries = meshes.map((m) => {
        const g = m.geometry.index
          ? m.geometry.toNonIndexed()
          : m.geometry.clone();
        return g.applyMatrix4(m.matrixWorld);
      });
      const merged = mergeGeometries(geometries, false);
      if (merged) {
        const m = new THREE.Mesh(merged, material);
        m.receiveShadow = true;
        root.add(m);
        for (const mesh of meshes) mesh.removeFromParent();
      }
      geometries.forEach((g) => g.dispose());
    }
  }
  return { group, outdoor, objects, glass, fixtures };
}
