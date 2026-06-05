
import * as THREE from 'three';

export enum MonsterState {
  IDLE,
  ALERT,
  HUNTING,
  ATTACKING,
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
  private readonly MONSTER_HEIGHT = 4.5; 
  public attackRange: number = 2.8; // Adjusted for vertical offset + lunge distance

  public update(dt: number, playerPos: THREE.Vector3, playerBpm: number): void {
    if (this.state === MonsterState.HIDDEN || this.state === MonsterState.ATTACKING) return;

    const distanceToPlayer = this.position.distanceTo(playerPos);
    
    // Detection radius increases with player heart rate
    const hearingThreshold = 6.0 + (playerBpm / 20.0);

    // Attack range check
    if (distanceToPlayer < this.attackRange) {
      this.state = MonsterState.ATTACKING;
      return;
    }

    switch (this.state) {
      case MonsterState.IDLE:
        this.speed = 2.5;
        if (this.position.distanceTo(this.targetPosition) < 1.0) this.pickNewWaypoint();
        
        if (distanceToPlayer < hearingThreshold) {
          this.state = MonsterState.HUNTING;
        }
        break;
      case MonsterState.HUNTING:
        this.speed = 6.0;
        this.targetPosition.copy(playerPos);
        
        if (distanceToPlayer > 25) {
          this.state = MonsterState.IDLE;
        }
        break;
    }

    const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position).normalize();
    this.position.add(dir.multiplyScalar(this.speed * dt));
    
    this.position.y = THREE.MathUtils.lerp(this.position.y, this.MONSTER_HEIGHT, 0.1);
  }

  private pickNewWaypoint() {
    this.targetPosition.set((Math.random() - 0.5) * 14, this.MONSTER_HEIGHT, (Math.random() - 0.5) * 14);
  }

  public spawn(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.position.y = this.MONSTER_HEIGHT;
    this.state = MonsterState.HUNTING;
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
