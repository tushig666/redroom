
import * as THREE from 'three';
import { InputManager } from '../input/InputManager';
import { CameraController } from './CameraController';

/**
 * PlayerController.ts
 * Handles kinematic movement, velocity, and world boundaries.
 */
export class PlayerController {
  public position = new THREE.Vector3(0, 1.7, 0);
  private velocity = new THREE.Vector3(0, 0, 0);
  private input: InputManager;
  private cameraCtrl: CameraController;

  private BASE_SPEED = 4.5;
  private SPRINT_MULT = 1.8;
  private CROUCH_MULT = 0.5;
  private FRICTION = 10.0;
  private BOUNDARY = 9.4;

  constructor(input: InputManager, cameraCtrl: CameraController) {
    this.input = input;
    this.cameraCtrl = cameraCtrl;
  }

  public update(dt: number) {
    const moveDir = new THREE.Vector3(0, 0, 0);
    const forward = this.cameraCtrl.getForward();
    const right = this.cameraCtrl.getRight();

    // Input collection
    if (this.input.keyboard.isPressed('KeyW')) moveDir.add(forward);
    if (this.input.keyboard.isPressed('KeyS')) moveDir.sub(forward);
    if (this.input.keyboard.isPressed('KeyA')) moveDir.sub(right);
    if (this.input.keyboard.isPressed('KeyD')) moveDir.add(right);

    // Speed modifiers
    let currentMaxSpeed = this.BASE_SPEED;
    if (this.input.keyboard.isPressed('ShiftLeft')) currentMaxSpeed *= this.SPRINT_MULT;
    if (this.input.keyboard.isPressed('ControlLeft')) currentMaxSpeed *= this.CROUCH_MULT;

    // Acceleration
    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(currentMaxSpeed * 50 * dt);
      this.velocity.add(moveDir);
    }

    // Apply friction/drag
    this.velocity.x -= this.velocity.x * this.FRICTION * dt;
    this.velocity.z -= this.velocity.z * this.FRICTION * dt;

    // Velocity Cap
    const currentSpeed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
    if (currentSpeed > currentMaxSpeed) {
      const ratio = currentMaxSpeed / currentSpeed;
      this.velocity.x *= ratio;
      this.velocity.z *= ratio;
    }

    // Apply movement
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Bounding Box Collision
    this.position.x = Math.max(-this.BOUNDARY, Math.min(this.BOUNDARY, this.position.x));
    this.position.z = Math.max(-this.BOUNDARY, Math.min(this.BOUNDARY, this.position.z));
    
    // Crouch Height Adjust
    const targetHeight = this.input.keyboard.isPressed('ControlLeft') ? 0.85 : 1.7;
    this.position.y = THREE.MathUtils.lerp(this.position.y, targetHeight, 10 * dt);
  }
}
