
/**
 * RoomSystem.ts
 * Manages the configuration and randomization of the red rooms with history support.
 */
export enum RoomType {
  MAIN,
  DEAD_END,
  TRAP,
  MONSTER,
  FINAL
}

export enum DoorOutcome {
  CORRECT,
  DEAD_END,
  MONSTER,
  NOISE_TRAP,
  EXIT_BACK
}

export interface RoomConfig {
  id: string;
  type: RoomType;
  parent?: RoomConfig;
  progressAtCreation: number;
  doorOutcomes: {
    north?: DoorOutcome;
    south?: DoorOutcome;
    east?: DoorOutcome;
    west?: DoorOutcome;
  };
}

export class RoomSystem {
  public currentRoom: RoomConfig;

  constructor() {
    this.currentRoom = this.generateMainRoom();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9).toUpperCase();
  }

  public generateMainRoom(parent?: RoomConfig, progress: number = 1): RoomConfig {
    const outcomes: DoorOutcome[] = [
      DoorOutcome.CORRECT,
      DoorOutcome.DEAD_END,
      DoorOutcome.MONSTER,
      DoorOutcome.NOISE_TRAP
    ];
    
    // Fisher-Yates Shuffle
    for (let i = outcomes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [outcomes[i], outcomes[j]] = [outcomes[j], outcomes[i]];
    }

    return {
      id: `MAIN-${this.generateId()}`,
      type: RoomType.MAIN,
      parent: parent,
      progressAtCreation: progress,
      doorOutcomes: {
        north: outcomes[0],
        south: outcomes[1],
        east: outcomes[2],
        west: outcomes[3]
      }
    };
  }

  public generateDeadEndRoom(parent: RoomConfig): RoomConfig {
    return {
      id: `DEAD-${this.generateId()}`,
      type: RoomType.DEAD_END,
      parent: parent,
      progressAtCreation: parent.progressAtCreation,
      doorOutcomes: {
        south: DoorOutcome.EXIT_BACK
      }
    };
  }

  public generateTrapRoom(parent: RoomConfig): RoomConfig {
    return {
      id: `TRAP-${this.generateId()}`,
      type: RoomType.TRAP,
      parent: parent,
      progressAtCreation: parent.progressAtCreation,
      doorOutcomes: {
        south: DoorOutcome.EXIT_BACK
      }
    };
  }

  public generateMonsterRoom(parent: RoomConfig): RoomConfig {
    return {
      id: `MONST-${this.generateId()}`,
      type: RoomType.MONSTER,
      parent: parent,
      progressAtCreation: parent.progressAtCreation,
      doorOutcomes: {
        south: DoorOutcome.EXIT_BACK
      }
    };
  }

  public generateFinalRoom(): RoomConfig {
    return {
      id: `FINAL`,
      type: RoomType.FINAL,
      progressAtCreation: 6,
      doorOutcomes: {}
    };
  }
}
