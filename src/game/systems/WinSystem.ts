
/**
 * WinSystem.ts
 */
export class WinSystem {
  public hasWon: boolean = false;

  public trigger(): void {
    this.hasWon = true;
  }

  public reset(): void {
    this.hasWon = false;
  }
}
