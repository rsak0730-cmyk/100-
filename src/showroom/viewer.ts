import { additionalVehicles } from "./additional-vehicles";
import { cameraViews } from "./cameras";
import type { Exhibit } from "./architecture";
import { ShowroomLighting } from "./lighting";
import modelAsset from "./model-asset.json";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { downloadModel } from "./download";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
export class Viewer {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, 1, 0.01, 150);
  controls: OrbitControls;
  car: THREE.Group | null = null;
  extraCars: THREE.Group[] = [];
  onAdditionalStatus: (id: string, status: string) => void = () => {};
  onAdditionalReady: (item: Exhibit) => void = () => {};
  paint: THREE.MeshStandardMaterial[] = [];
  original = new Map<THREE.Material, THREE.Color>();
  auto = false;
  token = 0;
  request: AbortController | null = null;
  lighting: ShowroomLighting;
  floor: THREE.Mesh;
  disposed = false;
  dirty = true;
  onSelect: (object: Exhibit | null) => void = () => {};
  onStats: (stats: {
    fps: number;
    drawCalls: number;
    triangles: number;
    geometries: number;
    textures: number;
    renderMs: number;
    quality: string;
  }) => void = () => {};
  selection: THREE.BoxHelper | null = null;
  tween: {
    start: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    targetFrom: THREE.Vector3;
    targetTo: THREE.Vector3;
  } | null = null;
  qualityName = "Medium";
  automaticQuality = true;
  slowFrames = 0;
  lastFrame = 0;

  constructor(
    public host: HTMLElement,
    public status: (s: string) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    host.append(this.renderer.domElement);
    this.camera.position.set(7, 3.2, 8);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.addEventListener("change", () => {
      this.dirty = true;
    });
    this.controls.minDistance = 3;
    this.controls.maxDistance = 23;
    this.controls.minTargetRadius = 0;
    this.controls.addEventListener("start", () => {
      this.tween = null;
    });
    this.controls.maxPolarAngle = Math.PI / 2 - 0.015;
    this.controls.target.set(0, 0.8, 0);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    this.floor = new THREE.Mesh(
      new THREE.CircleGeometry(30, 96),
      new THREE.MeshStandardMaterial({
        color: 0x070c11,
        metalness: 0.1,
        roughness: 0.8,
        envMapIntensity: 0.03,
      }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.23;
    this.floor.receiveShadow = true;
    this.floor.visible = false;
    this.scene.add(this.floor);
    this.scene.fog = new THREE.Fog(0xa5b1b6, 24, 85);
    this.lighting = new ShowroomLighting(this.scene, this.renderer, () => {
      this.dirty = true;
    });
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D automotive showroom. Drag to orbit, pinch or scroll to zoom. Use Explore for keyboard-accessible locations and objects.",
    );
    let pointerStart = { x: 0, y: 0 };
    this.renderer.domElement.addEventListener("pointerdown", (e) => {
      pointerStart = { x: e.clientX, y: e.clientY };
    });
    this.renderer.domElement.addEventListener("pointerup", (e) => {
      if (
        Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 6
      )
        return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        this.camera,
      );
      const entries = this.lighting.built.objects;
      const hits = ray.intersectObjects(
        [...entries.map((x) => x.mesh), ...(this.car ? [this.car] : [])],
        true,
      );
      if (!hits.length) {
        this.selectObject(null);
        return;
      }
      let node: THREE.Object3D | null = hits[0].object;
      while (node) {
        const item = entries.find((x) => x.mesh === node);
        if (item) {
          this.selectObject(item);
          return;
        }
        if (node === this.car) {
          this.selectObject({
            id: "vehicle",
            name: "BMW M4 Competition",
            description:
              "Licensed third-party exterior study. Exact factory trim and dimensions are unverified.",
            material: "PBR exterior materials; CC BY 4.0 asset",
            focus: [0, 0.8, 0],
            mesh: node,
          });
          return;
        }
        node = node.parent;
      }
    });
    new ResizeObserver(() => {
      this.camera.aspect = host.clientWidth / host.clientHeight;
      this.camera.fov = this.camera.aspect < 1 ? 58 : 36;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(host.clientWidth, host.clientHeight);
      this.dirty = true;
    }).observe(host);
    this.renderer.setAnimationLoop(() => {
      if (this.tween) {
        const t = this.tween;
        const p = Math.min(1, (performance.now() - t.start) / 1100),
          e = p * p * (3 - 2 * p);
        this.camera.position.lerpVectors(t.from, t.to, e);
        this.controls.target.lerpVectors(t.targetFrom, t.targetTo, e);
        this.dirty = true;
        if (p === 1) this.tween = null;
      }

      if (this.auto && this.car) {
        this.car.rotation.y += 0.002;
        this.dirty = true;
        this.renderer.shadowMap.needsUpdate = true;
      }
      this.controls.target.clamp(
        new THREE.Vector3(-16, 0, -12),
        new THREE.Vector3(16, 6.5, 12),
      );
      this.controls.update();
      this.camera.position.clamp(
        new THREE.Vector3(-17.5, 0.3, -13.5),
        new THREE.Vector3(17.5, 6.6, 13.5),
      );
      if (this.dirty) {
        const start = performance.now();
        this.renderer.render(this.scene, this.camera);
        const ms = performance.now() - start,
          now = performance.now();
        const fps =
          this.lastFrame && now - this.lastFrame < 500
            ? 1000 / (now - this.lastFrame)
            : 0;
        this.lastFrame = now;
        if (ms > 40) this.slowFrames++;
        else this.slowFrames = Math.max(0, this.slowFrames - 1);
        this.dirty = false;
        if (
          this.automaticQuality &&
          this.slowFrames > 25 &&
          this.qualityName !== "Low"
        ) {
          this.quality("Low");
          this.automaticQuality = true;
        }
        this.onStats({
          fps,
          renderMs: ms,
          drawCalls: this.renderer.info.render.calls,
          triangles: this.renderer.info.render.triangles,
          geometries: this.renderer.info.memory.geometries,
          textures: this.renderer.info.memory.textures,
          quality: this.qualityName,
        });
      }
    });
  }
  clear() {
    this.request?.abort();
    this.token++;
    this.dirty = true;
    this.renderer.shadowMap.needsUpdate = true;
    if (this.car) {
      this.scene.remove(this.car);
      this.car.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            for (const v of Object.values(m))
              if (v instanceof THREE.Texture) v.dispose();
            m.dispose();
          }
        }
      });
      this.car = null;
    }
    this.paint = [];
    this.original.clear();
  }
  async load(path: string | null) {
    this.clear();
    this.reset();
    if (!path) {
      this.status("3D MODEL COMING SOON");
      return;
    }
    const token = this.token;
    const controller = new AbortController();
    this.request = controller;
    const currentStatus = (label: string) => {
      if (token === this.token) this.status(label);
    };
    this.status("DOWNLOADING MODEL · 0%");
    try {
      const url = import.meta.env.BASE_URL + path;
      const bytes = await downloadModel(
        url,
        controller.signal,
        currentStatus,
        path === modelAsset.path ? modelAsset.bytes : undefined,
      );
      if (token !== this.token) return;
      currentStatus("DOWNLOAD COMPLETE · PREPARING 3D MODEL…");
      // Let the browser paint the preparation stage before parsing/texture decoding.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => {
          setTimeout(resolve, 0);
        }),
      );
      if (token !== this.token) return;
      const gltf = await new GLTFLoader()
        .setMeshoptDecoder(MeshoptDecoder)
        .parseAsync(bytes, new URL(".", new URL(url, location.href)).href);
      if (token !== this.token) {
        gltf.scene.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material])
              m.dispose();
          }
        });
        return;
      }
      const car = gltf.scene;
      car.updateMatrixWorld(true);
      let b = new THREE.Box3().setFromObject(car);
      const size = b.getSize(new THREE.Vector3());
      car.scale.multiplyScalar(4.8 / Math.max(size.x, size.y, size.z));
      b = new THREE.Box3().setFromObject(car);
      const c = b.getCenter(new THREE.Vector3());
      car.position.sub(c);
      car.position.y -= b.min.y - c.y;
      car.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats)
            if (
              m instanceof THREE.MeshStandardMaterial &&
              /body151/i.test(m.name)
            ) {
              this.paint.push(m);
              this.original.set(m, m.color.clone());
            }
        }
      });
      this.car = car;
      this.scene.add(car);
      this.dirty = true;
      this.renderer.shadowMap.needsUpdate = true;
      this.status("");
    } catch {
      if (token === this.token) {
        this.status("MODEL LOAD FAILED · CHECK YOUR CONNECTION AND RETRY");
      }
    }
  }
  async loadAdditionalVehicles() {
    if (this.extraCars.length) return;
    for (const asset of additionalVehicles) {
      this.onAdditionalStatus(asset.id, "Loading");
      try {
        const bytes = await downloadModel(
          import.meta.env.BASE_URL + asset.path,
          new AbortController().signal,
          () => {},
          asset.bytes,
        );
        const gltf = await new GLTFLoader()
          .setMeshoptDecoder(MeshoptDecoder)
          .parseAsync(
            bytes,
            new URL(
              ".",
              new URL(import.meta.env.BASE_URL + asset.path, location.href),
            ).href,
          );
        const model = gltf.scene;
        if (asset.id === "m4-csl-g82") {
          model.getObjectByName("M4xNME_unused")?.removeFromParent();
          model.updateMatrixWorld(true);
          const minY = new THREE.Box3().setFromObject(model).min.y;
          // Remove only the documented disconnected above-roof triangles in this splitter mesh.
          model.traverse((o) => {
            if (
              !(o instanceof THREE.Mesh) ||
              !o.name.includes("splitter_F_csl") ||
              !o.name.includes("Carbon1")
            )
              return;
            const geometry = o.geometry.index
              ? o.geometry.toNonIndexed()
              : o.geometry.clone();
            const p = geometry.getAttribute("position");
            const keep: number[] = [];
            const v = new THREE.Vector3();
            for (let t = 0; t < p.count; t += 3) {
              let max = -Infinity;
              for (let k = 0; k < 3; k++)
                max = Math.max(
                  max,
                  v.fromBufferAttribute(p, t + k).applyMatrix4(o.matrixWorld).y,
                );
              if (max < minY + 1.05) keep.push(t, t + 1, t + 2);
            }
            if (keep.length === p.count) {
              geometry.dispose();
              return;
            }
            const out = new THREE.BufferGeometry();
            for (const key of Object.keys(geometry.attributes)) {
              const attribute = geometry.getAttribute(
                key,
              ) as THREE.BufferAttribute;
              const array = new (attribute.array
                .constructor as Float32ArrayConstructor)(
                keep.length * attribute.itemSize,
              );
              for (let i = 0; i < keep.length; i++)
                for (let c = 0; c < attribute.itemSize; c++)
                  array[i * attribute.itemSize + c] =
                    attribute.array[keep[i] * attribute.itemSize + c];
              out.setAttribute(
                key,
                new THREE.BufferAttribute(
                  array,
                  attribute.itemSize,
                  attribute.normalized,
                ),
              );
            }
            o.geometry.dispose();
            geometry.dispose();
            o.geometry = out;
            out.computeBoundingSphere();
          });
        }
        model.updateMatrixWorld(true);
        let box = new THREE.Box3().setFromObject(model);
        let size = box.getSize(new THREE.Vector3());
        if (size.z > size.x) model.rotation.y = Math.PI / 2;
        model.updateMatrixWorld(true);
        box = new THREE.Box3().setFromObject(model);
        size = box.getSize(new THREE.Vector3());
        model.scale.multiplyScalar(4.8 / Math.max(size.x, size.z));
        model.updateMatrixWorld(true);
        box = new THREE.Box3().setFromObject(model);
        const c = box.getCenter(new THREE.Vector3());
        model.position.set(-c.x, -box.min.y, -c.z);
        const car = new THREE.Group();
        car.add(model);
        car.position.set(...asset.position);
        car.name = asset.name + " " + asset.generation;
        model.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        this.scene.add(car);
        this.extraCars.push(car);
        const item: Exhibit = {
          id: asset.id,
          name: car.name,
          mesh: car,
          description: `${asset.year} third-party exterior model by ${asset.author}. Exact factory dimensions and trim fidelity have not been independently verified.`,
          material: "PBR materials · CC BY 4.0",
          focus: [asset.position[0], 0.8, asset.position[2]],
        };
        this.lighting.built.objects.push(item);
        this.onAdditionalReady(item);
        this.onAdditionalStatus(asset.id, "Ready");
        this.dirty = true;
        this.renderer.shadowMap.needsUpdate = true;
      } catch (error) {
        console.warn("Additional model loading failed", asset.id, error);
        this.onAdditionalStatus(asset.id, "Failed — reload to retry");
      }
    }
  }
  selectObject(item: Exhibit | null) {
    if (this.selection) {
      this.scene.remove(this.selection);
      this.selection.dispose();
      this.selection = null;
    }
    if (item) {
      this.selection = new THREE.BoxHelper(item.mesh, 0xd7ba84);
      this.scene.add(this.selection);
    }
    this.dirty = true;
    this.onSelect(item);
  }
  focus(point: [number, number, number], distance = 5) {
    const target = new THREE.Vector3(...point);
    this.flyTo(
      target
        .clone()
        .add(new THREE.Vector3(distance * 0.7, distance * 0.4, distance)),
      target,
    );
  }
  view(name: string) {
    const view = cameraViews[name];
    if (view)
      this.flyTo(
        new THREE.Vector3(...view.position),
        new THREE.Vector3(...view.target),
      );
  }
  flyTo(to: THREE.Vector3, target: THREE.Vector3) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.camera.position.copy(to);
      this.controls.target.copy(target);
      this.tween = null;
      this.dirty = true;
      return;
    }
    this.auto = false;
    this.tween = {
      start: performance.now(),
      from: this.camera.position.clone(),
      to,
      targetFrom: this.controls.target.clone(),
      targetTo: target,
    };
    this.dirty = true;
  }
  reset() {
    this.tween = null;
    this.camera.position.set(7, 3.2, 8);
    this.controls.target.set(0, 0.8, 0);
    if (this.car) this.car.rotation.y = 0;
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
    this.controls.update();
  }
  preset(p: string) {
    const positions: Record<string, number[]> = {
      Front: [7, 1.5, 0],
      Rear: [-7, 1.5, 0],
      Left: [0, 1.6, 7],
      Right: [0, 1.6, -7],
      Top: [0.01, 9, 0],
      Hero: [7, 3, 7],
    };
    const v = positions[p] || positions.Hero;
    this.camera.position.set(v[0], v[1], v[2]);
    this.controls.update();
  }
  color(hex: string) {
    this.dirty = true;
    this.paint.forEach((m) => {
      m.color.set(hex);
      m.needsUpdate = true;
    });
  }
  finish(value: string) {
    this.dirty = true;
    this.paint.forEach((m) => {
      m.roughness = value === "Matte" ? 0.85 : value === "Satin" ? 0.5 : 0.2;
      m.metalness = value === "Metallic" ? 0.8 : 0.35;
      m.needsUpdate = true;
    });
  }
  environment(value: string) {
    this.lighting.preset(value);
  }
  quality(value: string) {
    if (value === "Auto") {
      this.automaticQuality = true;
      this.qualityName = "Medium";
      value = "Medium";
    } else {
      this.automaticQuality = false;
      this.qualityName = value;
    }
    this.dirty = true;
    this.renderer.setPixelRatio(
      value === "Low"
        ? 0.75
        : value === "Ultra"
          ? Math.min(devicePixelRatio, 2)
          : Math.min(devicePixelRatio, 1.5),
    );
  }
}
