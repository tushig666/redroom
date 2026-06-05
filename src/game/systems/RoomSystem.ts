
/**
 * RoomSystem.ts
 * Manages the configuration and randomization of the infinite grid maze.
 */
export enum RoomType {
  MAIN,
  DEAD_END,
  TRAP,
  MONSTER,
  FINAL
}

export enum OpeningOutcome {
  CORRECT,
  DEAD_END,
  MONSTER,
  NOISE_TRAP,
  EXIT_BACK,
  NONE // Solid wall
}

export interface RoomConfig {
  id: string;
  type: RoomType;
  x: number;
  z: number;
  progressAtCreation: number;
  outcomes: {
    north: OpeningOutcome;
    south: OpeningOutcome;
    east: OpeningOutcome;
    west: OpeningOutcome;
  };
}

export class RoomSystem {
  private rooms: Map<string, RoomConfig> = new Map();
  public currentRoom: RoomConfig;

  constructor() {
    this.currentRoom = this.getOrCreateRoom(0, 0, 1);
  }

  private getCoordKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  public getOrCreateRoom(x: number, z: number, progress: number, parent?: RoomConfig): RoomConfig {
    const key = this.getCoordKey(x, z);
    if (this.rooms.has(key)) return this.rooms.get(key)!;

    let config: RoomConfig;

    if (progress >= 7) {
      config = {
        id: 'FINAL',
        type: RoomType.FINAL,
        x, z,
        progressAtCreation: 7,
        outcomes: { north: OpeningOutcome.NONE, south: OpeningOutcome.NONE, east: OpeningOutcome.NONE, west: OpeningOutcome.NONE }
      };
    } else if (parent && (parent.type === RoomType.DEAD_END || parent.type === RoomType.MONSTER || parent.type === RoomType.TRAP)) {
      // Side rooms only lead back to their parent
      config = {
        id: `SIDE-${Math.random().toString(36).substr(2, 5)}`,
        type: parent.type,
        x, z,
        progressAtCreation: progress,
        outcomes: {
          north: (x === parent.x && z - 1 === parent.z) ? OpeningOutcome.EXIT_BACK : OpeningOutcome.NONE,
          south: (x === parent.x && z + 1 === parent.z) ? OpeningOutcome.EXIT_BACK : OpeningOutcome.NONE,
          east: (x + 1 === parent.x && z === parent.z) ? OpeningOutcome.EXIT_BACK : OpeningOutcome.NONE,
          west: (x - 1 === parent.x && z === parent.z) ? OpeningOutcome.EXIT_BACK : OpeningOutcome.NONE,
        }
      };
    } else {
      // Main path room randomization
      const dirs: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];
      const outcomes = [OpeningOutcome.CORRECT, OpeningOutcome.DEAD_END, OpeningOutcome.MONSTER, OpeningOutcome.NOISE_TRAP];
      
      // If we have a parent, the direction back to it is EXIT_BACK
      let exitDir: string | null = null;
      if (parent) {
        if (x === parent.x && z - 1 === parent.z) exitDir = 'north';
        else if (x === parent.x && z + 1 === parent.z) exitDir = 'south';
        else if (x + 1 === parent.x && z === parent.z) exitDir = 'east';
        else if (x - 1 === parent.x && z === parent.z) exitDir = 'west';
      }

      // Shuffle outcomes
      for (let i = outcomes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [outcomes[i], outcomes[j]] = [outcomes[j], outcomes[i]];
      }

      config = {
        id: `MAIN-${Math.random().toString(36).substr(2, 5)}`,
        type: RoomType.MAIN,
        x, z,
        progressAtCreation: progress,
        outcomes: {
          north: exitDir === 'north' ? OpeningOutcome.EXIT_BACK : outcomes[0],
          south: exitDir === 'south' ? OpeningOutcome.EXIT_BACK : outcomes[1],
          east: exitDir === 'east' ? OpeningOutcome.EXIT_BACK : outcomes[2],
          west: exitDir === 'west' ? OpeningOutcome.EXIT_BACK : outcomes[3],
        }
      };
    }

    this.rooms.set(key, config);
    return config;
  }

  public move(direction: 'north' | 'south' | 'east' | 'west'): RoomConfig {
    let nx = this.currentRoom.x;
    let nz = this.currentRoom.z;

    if (direction === 'north') nz -= 1;
    if (direction === 'south') nz += 1;
    if (direction === 'east') nx += 1;
    if (direction === 'west') nx -= 1;

    // Use current progress for next room creation if it's not a "Correct" move yet
    const nextRoom = this.getOrCreateRoom(nx, nz, this.currentRoom.progressAtCreation, this.currentRoom);
    this.currentRoom = nextRoom;
    return nextRoom;
  }
}
