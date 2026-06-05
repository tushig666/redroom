
/**
 * ProgressionSystem.ts
 */
export class ProgressionSystem {
  public currentRoomProgress: number = 1;
  public readonly MAX_ROOMS: number = 6;

  public increment(): void {
    this.currentRoomProgress++;
    console.log('[ProgressionSystem] PROGRESS ADVANCED TO:', this.currentRoomProgress);
  }

  public resetToStart(): void {
    this.currentRoomProgress = 1;
    console.log('[ProgressionSystem] PROGRESS RESET BY LOOP TRAP');
  }

  public isComplete(): boolean {
    return this.currentRoomProgress > this.MAX_ROOMS;
  }

  public get progressString(): string {
    return `ROOM ${Math.min(this.currentRoomProgress, this.MAX_ROOMS)}/${this.MAX_ROOMS}`;
  }
}
