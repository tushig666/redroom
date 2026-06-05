import * as THREE from 'three';

export enum MonsterState {
  IDLE,
  ALERT,
  SEARCHING,
  HUNTING, // Active Chase
  ATTACKING,
  HIDDEN
}

/**
 * MonsterSystem.ts
 * Manages the "Threadling" AI as a persistent acoustic predator.
 */
export class MonsterSystem {
  public position = new THREE.Vector3(0, -50, 0); 
  public state: MonsterState = MonsterState.HIDDEN;
  public isAwakened: boolean = false;
  
  private targetPosition = new THREE.Vector3();
  private lastKnownSoundPosition = new THREE.Vector3();
  private speed: number = 2.0;
  private readonly MONSTER_HEIGHT = 4.5; 
  public attackRange: number = 2.8; 

  private searchTimer: number = 0;
  private waitTimer: number = 0;
  private isListening: boolean = false;

  public update(dt: number, playerPos: THREE.Vector3): void {
    if (this.state === MonsterState.HIDDEN || this.state === MonsterState.ATTACKING) return;

    const distanceToPlayer = this.position.distanceTo(playerPos);

    // Attack range check
    if (distanceToPlayer < this.attackRange) {
      this.state = MonsterState.ATTACKING;
      return;
    }

    switch (this.state) {
      case MonsterState.IDLE:
        this.speed = 2.0;
        if (this.position.distanceTo(this.targetPosition) < 1.0) {
          this.pickNewPatrolPoint();
        }
        break;

      case MonsterState.SEARCHING:
        this.speed = 3.5;
        this.searchTimer -= dt;
        
        if (this.isListening) {
          this.waitTimer -= dt;
          if (this.waitTimer <= 0) {
            this.isListening = false;
            this.targetPosition.copy(this.lastKnownSoundPosition).add(new THREE.Vector3(
              (Math.random() - 0.5) * 10,
              0,
              (Math.random() - 0.5) * 10
            ));
          }
        } else {
          if (this.position.distanceTo(this.targetPosition) < 1.0) {
            this.isListening = true;
            this.waitTimer = 2.0 + Math.random() * 2.0;
          }
        }

        if (this.searchTimer <= 0) {
          this.state = MonsterState.IDLE;
        }
        break;

      case MonsterState.HUNTING:
        this.speed = 7.5;
        this.targetPosition.copy(playerPos);
        
        // If player gets too far and is quiet, lose track
        if (distanceToPlayer > 35) {
          this.state = MonsterState.SEARCHING;
          this.searchTimer = 15.0;
          this.lastKnownSoundPosition.copy(playerPos);
        }
        break;
    }

    // Move towards target (Phasing through geometry)
    const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position).normalize();
    if (!this.isListening) {
      this.position.add(dir.multiplyScalar(this.speed * dt));
    }
    
    // Maintain organic hover/height
    this.position.y = THREE.MathUtils.lerp(this.position.y, this.MONSTER_HEIGHT + Math.sin(Date.now() * 0.002) * 0.2, 0.05);
  }

  /**
   * Called when a sound occurs in the maze.
   * Intensity scale: 0.1 (careful) to 2.0 (clown)
   */
  public emitSound(pos: THREE.Vector3, intensity: number): void {
    if (this.state === MonsterState.HIDDEN) return;

    const dist = this.position.distanceTo(pos);
    const detectionThreshold = intensity * 45.0; // Distance based on loudness

    if (dist < detectionThreshold) {
      this.lastKnownSoundPosition.copy(pos);
      
      if (intensity > 0.7) {
        this.state = MonsterState.HUNTING;
      } else if (this.state !== MonsterState.HUNTING) {
        this.state = MonsterState.SEARCHING;
        this.searchTimer = 10.0;
        this.targetPosition.copy(pos);
      }
    }
  }

  private pickNewPatrolPoint() {
    // Wander in current area
    this.targetPosition.set(
      this.position.x + (Math.random() - 0.5) * 20,
      this.MONSTER_HEIGHT,
      this.position.z + (Math.random() - 0.5) * 20
    );
  }

  public spawn(pos: THREE.Vector3): void {
    if (this.isAwakened) return;
    this.isAwakened = true;
    this.position.copy(pos);
    this.position.y = this.MONSTER_HEIGHT;
    this.state = MonsterState.HUNTING;
    this.targetPosition.copy(pos);
    console.log('[MonsterSystem] PERSISTENT THREADLING AWAKENED');
  }

  /**
   * Adjust monster position during room transitions to maintain grid consistency.
   */
  public onRoomTransition(offset: THREE.Vector3): void {
    if (this.state === MonsterState.HIDDEN) return;
    this.position.add(offset);
    this.targetPosition.add(offset);
    this.lastKnownSoundPosition.add(offset);
  }

  public hide(): void {
    // Only hide if not awakened yet
    if (!this.isAwakened) {
      this.state = MonsterState.HIDDEN;
      this.position.set(0, -50, 0);
    }
  }
}
