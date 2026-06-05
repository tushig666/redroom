
import * as THREE from 'three';

export enum MonsterState {
  IDLE,
  ALERT,
  HUNTING,
  HIDDEN
}

/**
 * MonsterSystem.ts
 * Manages the "Threadling" AI.
 * Scale: ~5.5m (3x player height)
 */
export class MonsterSystem {
  public position = new THREE.Vector3(0, -50, 0); 
  public state: MonsterState = MonsterState.HIDDEN;
  private targetPosition = new THREE.Vector3();
  private speed: number = 2.0;
  private readonly MONSTER_HEIGHT = 4.5; // Positioning height for 5-6m monster

  public update(dt: number, playerPos: THREE.Vector3, playerBpm: number): void {
    if (this.state === MonsterState.HIDDEN) return;

    const distanceToPlayer = this.position.distanceTo(playerPos);
    
    // Detection radius increases with player heart rate
    const hearingThreshold = 6.0 + (playerBpm / 20.0);

    switch (this.state) {
      case MonsterState.IDLE:
        this.speed = 2.5;
        if (this.position.distanceTo(this.targetPosition) < 1.0) this.pickNewWaypoint();
        
        // Immediate detection in Monster Room
        if (distanceToPlayer < hearingThreshold) {
          this.state = MonsterState.HUNTING;
        }
        break;
      case MonsterState.HUNTING:
        // Relentless pursuit
        this.speed = 6.0;
        this.targetPosition.copy(playerPos);
        
        // Loss of detection (very difficult)
        if (distanceToPlayer > 25) {
          this.state = MonsterState.IDLE;
        }
        break;
    }

    const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position).normalize();
    this.position.add(dir.multiplyScalar(this.speed * dt));
    
    // Keep at floor-relative height
    this.position.y = THREE.MathUtils.lerp(this.position.y, this.MONSTER_HEIGHT, 0.1);
  }

  private pickNewWaypoint() {
    this.targetPosition.set((Math.random() - 0.5) * 14, this.MONSTER_HEIGHT, (Math.random() - 0.5) * 14);
  }

  public spawn(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.position.y = this.MONSTER_HEIGHT;
    this.state = MonsterState.HUNTING; // Always aggressive on spawn in encounter
    this.targetPosition.copy(pos);
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
