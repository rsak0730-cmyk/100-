// AETHER Particle Lab — camera rig: orbit, reset, fullscreen helpers
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private readonly homePosition = new THREE.Vector3(0, 8.6, 17.6);
  private readonly homeTarget = new THREE.Vector3(0, 0, 0);

  constructor(domElement: HTMLElement, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 500);
    this.camera.position.copy(this.homePosition);

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.target.copy(this.homeTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.rotateSpeed = 0.75;
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 70;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.6;
    this.controls.update();
    this.controls.saveState();
  }

  reset(): void {
    // OrbitControls.reset() restores the saved position/target
    this.controls.reset();
  }

  update(): void {
    this.controls.update();
  }

  handleResize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
