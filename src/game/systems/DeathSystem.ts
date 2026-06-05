
/**
 * DeathSystem.ts
 */
export class DeathSystem {
  public isDead: boolean = false;
  public deathReason: string = "";

  public trigger(reason: string): void {
    this.isDead = true;
    this.deathReason = reason;
  }

  public reset(): void {
    this.isDead = false;
    this.deathReason = "";
  }
}
