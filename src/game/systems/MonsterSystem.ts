
import * as THREE from 'three';

/**
 * MonsterSystem.ts
 * Manages "The Threadling" predatory AI.
 */
export enum MonsterState {
  IDLE,
  ALERT,
  HUNTING,
  HIDDEN
}

export class MonsterSystem {
  public position = new THREE.Vector3(0, -10, 0); // Start hidden
  public state: MonsterState = MonsterState.HIDDEN;
  private targetPosition = new THREE.Vector3();
  private speed: number = 2.0;
  private awareness: number = 0;

  public update(dt: number, playerPos: THREE.Vector3, playerBpm: number): void {
    if (this.state === MonsterState.HIDDEN) return;

    // Sound detection math: Higher BPM = easier to hear
    const distanceToPlayer = this.position.distanceTo(playerPos);
    const hearingThreshold = 5.0 + (playerBpm / 20.0);

    if (this.state === MonsterState.IDLE) {
      if (distanceToPlayer < hearingThreshold) {
        this.state = MonsterState.ALERT;
        this.targetPosition.copy(playerPos);
      } else {
        // Patrol logic
        if (this.position.distanceTo(this.targetPosition) < 0.5) {
          this.targetPosition.set(
            (Math.random() - 0.5) * 18,
            1.7,
            (Math.random() - 0.5) * 18
          );
        }
      }
      this.speed = 2.0;
    } else if (this.state === MonsterState.ALERT) {
      if (distanceToPlayer < hearingThreshold * 0.5) {
        this.state = MonsterState.HUNTING;
      }
      this.speed = 4.0;
      this.targetPosition.copy(playerPos);
    } else if (this.state === MonsterState.HUNTING) {
      this.targetPosition.copy(playerPos);
      this.speed = 6.0;
    }

    // Move towards target
    const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position).normalize();
    this.position.add(dir.multiplyScalar(this.speed * dt));
  }

  public spawn(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.state = MonsterState.IDLE;
  }

  public hide(): void {
    this.state = MonsterState.HIDDEN;
    this.position.set(0, -10, 0);
  }

  public triggerHunt(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.state = MonsterState.HUNTING;
  }
}
