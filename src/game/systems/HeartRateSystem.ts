
/**
 * HeartRateSystem.ts
 * Manages the player's internal stress levels and heart failure mechanics.
 */
export class HeartRateSystem {
  public bpm: number = 70;
  private readonly BASE_BPM = 70;
  private readonly MAX_BPM = 200;
  private targetBpm: number = 70;
  public isHeartFailure: boolean = false;

  public update(dt: number, dangerLevel: number, isTerrified: boolean): void {
    // dangerLevel: 0 (safe) to 1 (monster touching you)
    // isTerrified: true if monster is visible
    
    this.targetBpm = this.BASE_BPM + (dangerLevel * 100);
    if (isTerrified) this.targetBpm += 30;

    // Smoother transition
    const lerpFactor = isTerrified || dangerLevel > 0.5 ? 2.0 : 0.5;
    this.bpm += (this.targetBpm - this.bpm) * lerpFactor * dt;

    // Heart Failure Check
    if (this.bpm >= this.MAX_BPM - 5) {
        this.isHeartFailure = true;
    }
  }

  public reset(): void {
    this.bpm = 70;
    this.targetBpm = 70;
    this.isHeartFailure = false;
  }
}
