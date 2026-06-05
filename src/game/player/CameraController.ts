
import * as THREE from 'three';

/**
 * CameraController.ts
 * Manages FPS-style mouse look with yaw/pitch clamping.
 */
export class CameraController {
  private camera: THREE.Camera;
  private yaw = 0;
  private pitch = 0;
  private sensitivity = 0.002;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.camera.rotation.order = 'YXZ';
  }

  public update(deltaX: number, deltaY: number) {
    this.yaw -= deltaX * this.sensitivity;
    this.pitch -= deltaY * this.sensitivity;

    // Strict clamping to prevent flipping
    const PITCH_LIMIT = Math.PI / 2 - 0.1;
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));

    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  public getYaw(): number {
    return this.yaw;
  }

  public getPitch(): number {
    return this.pitch;
  }

  public getDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);
    return direction;
  }

  public getRight(): THREE.Vector3 {
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.camera.quaternion);
    right.y = 0;
    return right.normalize();
  }

  public getForward(): THREE.Vector3 {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    return forward.normalize();
  }
}
