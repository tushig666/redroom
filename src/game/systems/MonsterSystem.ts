
import * as THREE from 'three';

/**
 * MonsterSystem.ts - "The Resonance Weaver" AI
 * 
 * This system drives the 20-meter-tall predatory entity.
 * It uses an acoustic state machine: IDLE, ALERT, HUNT.
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
  private speed: number = 1.8;
  private lerpFactor: number = 0.05;
  
  // AAA Design Scaling: The creature is 20m tall but hunched into the 6m room
  public readonly SCALE = 20.0;
  
  // Acoustic Sensory Buffers
  private resonanceIndex: number = 0; 

  public update(dt: number, playerPos: THREE.Vector3, playerBpm: number): void {
    if (this.state === MonsterState.HIDDEN) return;

    const distanceToPlayer = this.position.distanceTo(playerPos);
    
    // Acoustic Detection Logic: Higher BPM makes the player "louder" to the Weaver
    const hearingThreshold = 6.0 + (playerBpm / 15.0);

    switch (this.state) {
      case MonsterState.IDLE:
        this.speed = 1.2;
        // Periodic "Weaving" behavior
        if (this.position.distanceTo(this.targetPosition) < 1.0) {
          this.pickNewWaypoint();
        }
        if (distanceToPlayer < hearingThreshold) {
          this.state = MonsterState.ALERT;
          this.targetPosition.copy(playerPos);
        }
        break;

      case MonsterState.ALERT:
        this.speed = 3.5;
        this.targetPosition.copy(playerPos);
        if (distanceToPlayer < 3.0) {
          this.state = MonsterState.HUNTING;
        }
        if (distanceToPlayer > hearingThreshold * 2) {
          this.state = MonsterState.IDLE;
        }
        break;

      case MonsterState.HUNTING:
        this.speed = 7.0;
        this.targetPosition.copy(playerPos);
        // During hunt, the Weaver "unfolds," becoming faster and more erratic
        break;
    }

    // Move towards target with procedural "twitch"
    const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position).normalize();
    const twitch = (Math.sin(Date.now() * 0.01) * 0.1); // AAA jitter
    this.position.add(dir.multiplyScalar((this.speed + twitch) * dt));
    
    // Height Clamping: It stays primarily on the ceiling or high walls
    this.position.y = Math.max(1.5, Math.min(5.5, this.position.y));
  }

  private pickNewWaypoint() {
    this.targetPosition.set(
      (Math.random() - 0.5) * 16,
      Math.random() * 4 + 2,
      (Math.random() - 0.5) * 16
    );
  }

  public spawn(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.state = MonsterState.IDLE;
    this.pickNewWaypoint();
    console.log('[MonsterSystem] THE WEAVER HAS EMERGED');
  }

  public hide(): void {
    this.state = MonsterState.HIDDEN;
    this.position.set(0, -50, 0);
  }

  public triggerHunt(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.state = MonsterState.HUNTING;
    console.log('[MonsterSystem] HUNT STATE ACTIVATED');
  }
}
