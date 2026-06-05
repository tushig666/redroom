
/**
 * ProgressionSystem.ts
 * Manages the player's journey through the infinite loop.
 */
export class ProgressionSystem {
  public currentRoomProgress: number = 1;
  public readonly MAX_ROOMS: number = 6;

  public increment(): void {
    this.currentRoomProgress++;
  }

  public reset(): void {
    this.currentRoomProgress = 1;
  }

  public isComplete(): boolean {
    return this.currentRoomProgress > this.MAX_ROOMS;
  }

  public get progressString(): string {
    return `ROOM ${Math.min(this.currentRoomProgress, this.MAX_ROOMS)}/${this.MAX_ROOMS}`;
  }
}
