
import * as THREE from 'three';

/**
 * MonsterSystem.ts - AAA "Resonance Weaver" AI
 * 
 * Implements Rule 5 & 6:
 * - Acoustic state machine driven by player BPM and proximity.
 * - 20-meter scale logic (clamped into 6m room).
 * - "Threaded" movement style.
 */
export enum MonsterState {
  IDLE,    // Weaving slowly through the ceiling/walls
  ALERT,   // Resonance bladders have detected a sound; investigating
  HUNTING, // Aggressive pursuit of the acoustic source
  HIDDEN   // Off-stage
}

export class MonsterSystem {
  public position = new THREE.Vector3(0, -50, 0); 
  public orientation = new THREE.Euler(0, 0, 0);
  public state: MonsterState = MonsterState.HIDDEN;
  
  private targetPosition = new THREE.Vector3();
  private speed: number = 2.0;
  
  // AAA Design Scaling: The creature is 20m tall (Rule 6)
  public readonly SCALE = 20.0;
  
  private lastUpdateTime: number = 0;

  public update(dt: number, playerPos: THREE.Vector3, playerBpm: number): void {
    if (this.state === MonsterState.HIDDEN) return;

    const distanceToPlayer = this.position.distanceTo(playerPos);
    
    // Acoustic Detection Logic (Rule 5): 
    // Higher BPM makes the player "louder" to the Weaver's resonance bladders.
    const hearingThreshold = 5.0 + (playerBpm / 12.0);

    switch (this.state) {
      case MonsterState.IDLE:
        this.speed = 1.8;
        // Periodic "Weaving" behavior
        if (this.position.distanceTo(this.targetPosition) < 2.0) {
          this.pickNewWaypoint();
        }
        if (distanceToPlayer < hearingThreshold) {
          this.state = MonsterState.ALERT;
          this.targetPosition.copy(playerPos);
          console.log('[MonsterSystem] WEAVER ALERTED BY RESONANCE');
        }
        break;

      case MonsterState.ALERT:
        this.speed = 4.0;
        this.targetPosition.copy(playerPos);
        if (distanceToPlayer < 4.0) {
          this.state = MonsterState.HUNTING;
          console.log('[MonsterSystem] HUNT INITIATED');
        }
        // Lose interest if player gets very far and calm
        if (distanceToPlayer > hearingThreshold * 2.5) {
          this.state = MonsterState.IDLE;
          this.pickNewWaypoint();
        }
        break;

      case MonsterState.HUNTING:
        this.speed = 8.5;
        this.targetPosition.copy(playerPos);
        // During hunt, the Weaver "unfolds," becoming faster and more erratic
        break;
    }

    // Move towards target with procedural "twitch" (Rule 4)
    const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position).normalize();
    const twitch = (Math.sin(Date.now() * 0.02) * 0.2); 
    
    // Inverted Locomotion: Primarily moves on the ceiling (Rule 7)
    this.position.add(dir.multiplyScalar((this.speed + twitch) * dt));
    
    // Height Clamping: The 20m creature hunches into the 6m room space.
    // It stays primarily on the ceiling (y near 5.5) or high walls.
    this.position.y = THREE.MathUtils.lerp(this.position.y, 4.5 + Math.sin(Date.now() * 0.001) * 1.0, 0.05);
    
    // Boundary Clamping (Room is 20x6x20)
    this.position.x = THREE.MathUtils.clamp(this.position.x, -9, 9);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -9, 9);
  }

  private pickNewWaypoint() {
    this.targetPosition.set(
      (Math.random() - 0.5) * 16,
      Math.random() * 2 + 3.5, // High up
      (Math.random() - 0.5) * 16
    );
  }

  public spawn(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.state = MonsterState.IDLE;
    this.pickNewWaypoint();
  }

  public hide(): void {
    this.state = MonsterState.HIDDEN;
    this.position.set(0, -50, 0);
  }

  public triggerHunt(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.state = MonsterState.HUNTING;
  }
}
