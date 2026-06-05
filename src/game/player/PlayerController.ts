
import * as THREE from 'three';
import { InputManager } from '../input/InputManager';
import { CameraController } from './CameraController';

/**
 * PlayerController.ts
 * Professional FPS movement system with three states:
 * 1. Careful (Shift) - 2.0 m/s
 * 2. Normal (Default) - 5.0 m/s
 * 3. Sprint (Double-Tap W) - 9.0 m/s
 */

export type MovementState = 'WALK' | 'CAREFUL' | 'SPRINT' | 'IDLE';

export class PlayerController {
  public position = new THREE.Vector3(0, 1.7, 0);
  public velocity = new THREE.Vector3(0, 0, 0);
  public movementState: MovementState = 'IDLE';
  
  private input: InputManager;
  private cameraCtrl: CameraController;

  // Configuration
  private readonly SPEEDS = {
    CAREFUL: 2.0,
    NORMAL: 5.0,
    SPRINT: 9.0
  };
  
  private readonly FRICTION = 12.0;
  private readonly BOUNDARY = 9.4;
  private readonly OPENING_WIDTH = 1.6;

  // Double Tap State
  private lastWPressTime = 0;
  private wasWDown = false;
  private isSprintLocked = false;
  private doubleTapThreshold = 300; // ms

  // Callback for Engine to know which room outcomes are active
  public activeOutcomes: any = null;

  constructor(input: InputManager, cameraCtrl: CameraController) {
    this.input = input;
    this.cameraCtrl = cameraCtrl;
  }

  public update(dt: number) {
    const isWDown = this.input.keyboard.isPressed('KeyW');
    const isShiftDown = this.input.keyboard.isPressed('ShiftLeft') || this.input.keyboard.isPressed('ShiftRight');
    const now = performance.now();

    // 1. Double-Tap W Detection
    if (isWDown && !this.wasWDown) {
      if (now - this.lastWPressTime < this.doubleTapThreshold) {
        this.isSprintLocked = true;
      }
      this.lastWPressTime = now;
    }
    
    if (!isWDown) {
      this.isSprintLocked = false;
    }

    this.wasWDown = isWDown;

    // 2. Determine Movement State
    const moveDir = new THREE.Vector3(0, 0, 0);
    const forward = this.cameraCtrl.getForward();
    const right = this.cameraCtrl.getRight();

    if (isWDown) moveDir.add(forward);
    if (this.input.keyboard.isPressed('KeyS')) moveDir.sub(forward);
    if (this.input.keyboard.isPressed('KeyA')) moveDir.sub(right);
    if (this.input.keyboard.isPressed('KeyD')) moveDir.add(right);

    let targetSpeed = this.SPEEDS.NORMAL;
    this.movementState = 'WALK';

    if (isShiftDown) {
      targetSpeed = this.SPEEDS.CAREFUL;
      this.movementState = 'CAREFUL';
      this.isSprintLocked = false; // Sprint cancels if shift is pressed
    } else if (this.isSprintLocked && isWDown) {
      targetSpeed = this.SPEEDS.SPRINT;
      this.movementState = 'SPRINT';
    }

    if (moveDir.length() === 0) {
      this.movementState = 'IDLE';
    }

    // 3. Apply Velocity
    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(targetSpeed * 60 * dt);
      this.velocity.add(moveDir);
    }

    this.velocity.x -= this.velocity.x * this.FRICTION * dt;
    this.velocity.z -= this.velocity.z * this.FRICTION * dt;

    // Cap speed
    const currentSpeed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
    if (currentSpeed > targetSpeed) {
      const ratio = targetSpeed / currentSpeed;
      this.velocity.x *= ratio;
      this.velocity.z *= ratio;
    }

    // 4. Update Position & Collision
    const oldX = this.position.x;
    const oldZ = this.position.z;

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Boundary Streaming Detection & Hard Collision
    const inOpeningX = Math.abs(this.position.x) < this.OPENING_WIDTH;
    const inOpeningZ = Math.abs(this.position.z) < this.OPENING_WIDTH;

    const hasNorth = this.activeOutcomes?.north !== 5;
    const hasSouth = this.activeOutcomes?.south !== 5;
    const hasEast = this.activeOutcomes?.east !== 5;
    const hasWest = this.activeOutcomes?.west !== 5;

    if (!inOpeningX || !hasNorth) this.position.z = Math.max(-this.BOUNDARY, this.position.z);
    if (!inOpeningX || !hasSouth) this.position.z = Math.min(this.BOUNDARY, this.position.z);
    if (!inOpeningZ || !hasEast) this.position.x = Math.min(this.BOUNDARY, this.position.x);
    if (!inOpeningZ || !hasWest) this.position.x = Math.max(-this.BOUNDARY, this.position.x);

    // If speed is zeroed by collision, stop sprinting
    if (this.isSprintLocked && this.position.x === oldX && this.position.z === oldZ && (this.velocity.x !== 0 || this.velocity.z !== 0)) {
       // Only cancel if there was intended velocity
       if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1) {
          this.isSprintLocked = false;
       }
    }
    
    this.position.y = 1.7;
  }
}
