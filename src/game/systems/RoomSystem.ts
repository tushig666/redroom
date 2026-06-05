
/**
 * RoomSystem.ts
 * Manages the configuration and randomization of the red rooms.
 */
export enum RoomType {
  MAIN,
  DEAD_END,
  TRAP,
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
  type: RoomType;
  doorOutcomes: {
    north?: DoorOutcome;
    south?: DoorOutcome;
    east?: DoorOutcome;
    west?: DoorOutcome;
  };
}

export class RoomSystem {
  public currentRoom: RoomConfig;
  private lastMainRoomOutcomes: DoorOutcome[] = [];

  constructor() {
    this.currentRoom = this.generateMainRoom();
  }

  public generateMainRoom(): RoomConfig {
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
      type: RoomType.MAIN,
      doorOutcomes: {
        north: outcomes[0],
        south: outcomes[1],
        east: outcomes[2],
        west: outcomes[3]
      }
    };
  }

  public generateDeadEndRoom(): RoomConfig {
    return {
      type: RoomType.DEAD_END,
      doorOutcomes: {
        south: DoorOutcome.EXIT_BACK // Only the door you came in through
      }
    };
  }

  public generateTrapRoom(): RoomConfig {
    return {
      type: RoomType.TRAP,
      doorOutcomes: {
        south: DoorOutcome.EXIT_BACK
      }
    };
  }

  public generateFinalRoom(): RoomConfig {
    return {
      type: RoomType.FINAL,
      doorOutcomes: {}
    };
  }
}
