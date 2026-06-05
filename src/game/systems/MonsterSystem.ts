
import * as THREE from 'three';

export enum MonsterState {
  IDLE,
  ALERT,
  HUNTING,
  HIDDEN
}

export class MonsterSystem {
  public position = new THREE.Vector3(0, -50, 0); 
  public state: MonsterState = MonsterState.HIDDEN;
  private targetPosition = new THREE.Vector3();
  private speed: number = 2.0;

  public update(dt: number, playerPos: THREE.Vector3, playerBpm: number): void {
    if (this.state === MonsterState.HIDDEN) return;

    const distanceToPlayer = this.position.distanceTo(playerPos);
    const hearingThreshold = 6.0 + (playerBpm / 10.0);

    switch (this.state) {
      case MonsterState.IDLE:
        this.speed = 2.0;
        if (this.position.distanceTo(this.targetPosition) < 1.0) this.pickNewWaypoint();
        if (distanceToPlayer < hearingThreshold) {
          this.state = MonsterState.ALERT;
          this.targetPosition.copy(playerPos);
        }
        break;
      case MonsterState.ALERT:
        this.speed = 4.5;
        this.targetPosition.copy(playerPos);
        if (distanceToPlayer < 4.0) this.state = MonsterState.HUNTING;
        if (distanceToPlayer > hearingThreshold * 2) {
          this.state = MonsterState.IDLE;
          this.pickNewWaypoint();
        }
        break;
      case MonsterState.HUNTING:
        this.speed = 8.0;
        this.targetPosition.copy(playerPos);
        break;
    }

    const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position).normalize();
    this.position.add(dir.multiplyScalar(this.speed * dt));
    
    // Height management
    this.position.y = THREE.MathUtils.lerp(this.position.y, 4.5, 0.05);
  }

  private pickNewWaypoint() {
    this.targetPosition.set((Math.random() - 0.5) * 16, 4.5, (Math.random() - 0.5) * 16);
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
