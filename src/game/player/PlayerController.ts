
import * as THREE from 'three';
import { InputManager } from '../input/InputManager';
import { CameraController } from './CameraController';

/**
 * PlayerController.ts
 * Kinematic movement with opening-aware collision.
 */
export class PlayerController {
  public position = new THREE.Vector3(0, 1.7, 0);
  public velocity = new THREE.Vector3(0, 0, 0);
  private input: InputManager;
  private cameraCtrl: CameraController;

  private BASE_SPEED = 4.5;
  private SPRINT_MULT = 1.8;
  private FRICTION = 12.0;
  private BOUNDARY = 9.4;
  private OPENING_WIDTH = 1.6; // Distance from center where opening exists

  // Callback for Engine to know which room outcomes are active
  public activeOutcomes: any = null;

  constructor(input: InputManager, cameraCtrl: CameraController) {
    this.input = input;
    this.cameraCtrl = cameraCtrl;
  }

  public update(dt: number) {
    const moveDir = new THREE.Vector3(0, 0, 0);
    const forward = this.cameraCtrl.getForward();
    const right = this.cameraCtrl.getRight();

    if (this.input.keyboard.isPressed('KeyW')) moveDir.add(forward);
    if (this.input.keyboard.isPressed('KeyS')) moveDir.sub(forward);
    if (this.input.keyboard.isPressed('KeyA')) moveDir.sub(right);
    if (this.input.keyboard.isPressed('KeyD')) moveDir.add(right);

    let currentMaxSpeed = this.BASE_SPEED;
    if (this.input.keyboard.isPressed('ShiftLeft')) currentMaxSpeed *= this.SPRINT_MULT;

    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(currentMaxSpeed * 60 * dt);
      this.velocity.add(moveDir);
    }

    this.velocity.x -= this.velocity.x * this.FRICTION * dt;
    this.velocity.z -= this.velocity.z * this.FRICTION * dt;

    const currentSpeed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
    if (currentSpeed > currentMaxSpeed) {
      const ratio = currentMaxSpeed / currentSpeed;
      this.velocity.x *= ratio;
      this.velocity.z *= ratio;
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Opening-Aware Collision
    // If we are within the opening x-range, we don't clamp Z.
    // If we are within the opening z-range, we don't clamp X.
    const inOpeningX = Math.abs(this.position.x) < this.OPENING_WIDTH;
    const inOpeningZ = Math.abs(this.position.z) < this.OPENING_WIDTH;

    // Check North/South
    const hasNorth = this.activeOutcomes?.north !== 5; // NONE is index 5
    const hasSouth = this.activeOutcomes?.south !== 5;
    const hasEast = this.activeOutcomes?.east !== 5;
    const hasWest = this.activeOutcomes?.west !== 5;

    if (!inOpeningX || !hasNorth) this.position.z = Math.max(-this.BOUNDARY, this.position.z);
    if (!inOpeningX || !hasSouth) this.position.z = Math.min(this.BOUNDARY, this.position.z);
    if (!inOpeningZ || !hasEast) this.position.x = Math.min(this.BOUNDARY, this.position.x);
    if (!inOpeningZ || !hasWest) this.position.x = Math.max(-this.BOUNDARY, this.position.x);
    
    // Height clamp
    this.position.y = 1.7;
  }
}
