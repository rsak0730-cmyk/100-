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
  paint: THREE.MeshStandardMaterial[] = [];
  original = new Map<THREE.Material, THREE.Color>();
  auto = false;
  token = 0;
  request: AbortController | null = null;
  loadTimer: ReturnType<typeof setTimeout> | undefined;
  floor: THREE.Mesh;
  disposed = false;
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
    this.camera.position.set(7, 3, 7);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 14;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.015;
    this.controls.target.set(0, 0.8, 0);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xdff5ff, 0x22252b, 2));
    const key = new THREE.DirectionalLight(0xffffff, 4);
    key.position.set(3, 6, 4);
    this.scene.add(key);
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
    this.floor.position.y = -0.025;
    this.scene.add(this.floor);
    this.scene.fog = new THREE.Fog(0x0b1016, 10, 34);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.5, 3.51, 128),
      new THREE.MeshBasicMaterial({
        color: 0x49616b,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.014;
    this.scene.add(ring);
    new ResizeObserver(() => {
      this.camera.aspect = host.clientWidth / host.clientHeight;
      this.camera.fov = this.camera.aspect < 1 ? 58 : 36;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(host.clientWidth, host.clientHeight);
    }).observe(host);
    this.renderer.setAnimationLoop(() => {
      if (this.auto && this.car) this.car.rotation.y += 0.002;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }
  clear() {
    this.request?.abort();
    clearTimeout(this.loadTimer);
    this.token++;
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
    const currentStatus = (label: string) => { if (token === this.token) this.status(label); };
    this.status("DOWNLOADING MODEL · 0%");
    this.loadTimer = setTimeout(() => {
      if (token !== this.token) return;
      this.token++;
      controller.abort();
      this.status("MODEL LOAD TIMED OUT · CHECK YOUR CONNECTION AND RETRY");
    }, 120_000);
    try {
      const url = import.meta.env.BASE_URL + path;
      const bytes = await downloadModel(url, controller.signal, currentStatus,
        path === modelAsset.path ? modelAsset.bytes : undefined);
      if (token !== this.token) return;
      currentStatus("DOWNLOAD COMPLETE · PREPARING 3D MODEL…");
      // Let the browser paint the preparation stage before parsing/texture decoding.
      await new Promise<void>(resolve => requestAnimationFrame(() => { setTimeout(resolve, 0); }));
      if (token !== this.token) return;
      const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes, new URL(".", new URL(url, location.href)).href);
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
      clearTimeout(this.loadTimer);
      this.status("");
    } catch {
      if (token === this.token) {
        clearTimeout(this.loadTimer);
        this.status("MODEL LOAD FAILED · CHECK YOUR CONNECTION AND RETRY");
      }
    }
  }
  reset() {
    this.camera.position.set(7, 3, 7);
    this.controls.target.set(0, 0.8, 0);
    if (this.car) this.car.rotation.y = 0;
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
    this.paint.forEach((m) => {
      m.color.set(hex);
      m.needsUpdate = true;
    });
  }
  finish(value: string) {
    this.paint.forEach((m) => {
      m.roughness = value === "Matte" ? 0.85 : value === "Satin" ? 0.5 : 0.2;
      m.metalness = value === "Metallic" ? 0.8 : 0.35;
      m.needsUpdate = true;
    });
  }
  environment(value: string) {
    const light = value === "White" || value === "Grey";
    this.scene.background = new THREE.Color(
      value === "White"
        ? 0xd6dcdf
        : value === "Grey"
          ? 0x555d64
          : value === "Sunset"
            ? 0x35251f
            : 0x0b1016,
    );
    (this.floor.material as THREE.MeshStandardMaterial).color.set(
      light ? 0x868d90 : 0x12191e,
    );
    if (this.scene.fog instanceof THREE.Fog)
      this.scene.fog.color.copy(this.scene.background as THREE.Color);
    this.renderer.toneMappingExposure = value === "Sunset" ? 1.25 : 1;
  }
  quality(value: string) {
    this.renderer.setPixelRatio(
      value === "Low"
        ? 0.75
        : value === "Ultra"
          ? Math.min(devicePixelRatio, 2)
          : Math.min(devicePixelRatio, 1.5),
    );
  }
}
