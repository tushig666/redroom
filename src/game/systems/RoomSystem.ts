
/**
 * RoomSystem.ts
 * Manages the configuration and randomization of the infinite grid maze.
 * Respects strict Progression vs Side Room archetypes.
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
  parentId?: string;
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

    // Handle the Final Exit Room
    if (progress > 6) {
      config = {
        id: 'FINAL',
        type: RoomType.FINAL,
        x, z,
        progressAtCreation: 7,
        outcomes: { north: OpeningOutcome.NONE, south: OpeningOutcome.NONE, east: OpeningOutcome.NONE, west: OpeningOutcome.NONE }
      };
    } 
    // Handle Side Rooms (Dead Ends, Monsters, Traps) - They only lead back to parent
    else if (parent && (parent.outcomes.north === OpeningOutcome.DEAD_END || 
                        parent.outcomes.south === OpeningOutcome.DEAD_END || 
                        parent.outcomes.east === OpeningOutcome.DEAD_END || 
                        parent.outcomes.west === OpeningOutcome.DEAD_END ||
                        parent.outcomes.north === OpeningOutcome.MONSTER ||
                        parent.outcomes.south === OpeningOutcome.MONSTER ||
                        parent.outcomes.east === OpeningOutcome.MONSTER ||
                        parent.outcomes.west === OpeningOutcome.MONSTER ||
                        parent.outcomes.north === OpeningOutcome.NOISE_TRAP ||
                        parent.outcomes.south === OpeningOutcome.NOISE_TRAP ||
                        parent.outcomes.east === OpeningOutcome.NOISE_TRAP ||
                        parent.outcomes.west === OpeningOutcome.NOISE_TRAP)) {
      
      const parentDirBack = this.getDirectionBack(x, z, parent.x, parent.z);
      
      // Determine side room type based on parent's decision
      let sideType = RoomType.DEAD_END;
      if (parent.outcomes.north === OpeningOutcome.MONSTER || parent.outcomes.south === OpeningOutcome.MONSTER || parent.outcomes.east === OpeningOutcome.MONSTER || parent.outcomes.west === OpeningOutcome.MONSTER) sideType = RoomType.MONSTER;
      if (parent.outcomes.north === OpeningOutcome.NOISE_TRAP || parent.outcomes.south === OpeningOutcome.NOISE_TRAP || parent.outcomes.east === OpeningOutcome.NOISE_TRAP || parent.outcomes.west === OpeningOutcome.NOISE_TRAP) sideType = RoomType.TRAP;

      config = {
        id: `SIDE-${Math.random().toString(36).substr(2, 5)}`,
        type: sideType,
        x, z,
        progressAtCreation: progress,
        parentId: parent.id,
        outcomes: {
          north: parentDirBack === 'north' ? OpeningOutcome.EXIT_BACK : OpeningOutcome.NONE,
          south: parentDirBack === 'south' ? OpeningOutcome.EXIT_BACK : OpeningOutcome.NONE,
          east: parentDirBack === 'east' ? OpeningOutcome.EXIT_BACK : OpeningOutcome.NONE,
          west: parentDirBack === 'west' ? OpeningOutcome.EXIT_BACK : OpeningOutcome.NONE,
        }
      };
    } 
    // Handle Main Progression Rooms
    else {
      const parentDirBack = parent ? this.getDirectionBack(x, z, parent.x, parent.z) : null;
      
      // We need exactly 1 Correct, 1 Dead End, 1 Monster, 1 Noise Trap
      // If we have a parent, one slot is EXIT_BACK
      const outcomes = [OpeningOutcome.CORRECT, OpeningOutcome.DEAD_END, OpeningOutcome.MONSTER, OpeningOutcome.NOISE_TRAP];
      
      // Shuffle outcomes
      for (let i = outcomes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [outcomes[i], outcomes[j]] = [outcomes[j], outcomes[i]];
      }

      const finalOutcomes = {
        north: outcomes[0],
        south: outcomes[1],
        east: outcomes[2],
        west: outcomes[3]
      };

      // Override the direction back to parent
      if (parentDirBack) {
        (finalOutcomes as any)[parentDirBack] = OpeningOutcome.EXIT_BACK;
      }

      config = {
        id: `MAIN-${Math.random().toString(36).substr(2, 5)}`,
        type: RoomType.MAIN,
        x, z,
        progressAtCreation: progress,
        parentId: parent?.id,
        outcomes: finalOutcomes
      };
    }

    this.rooms.set(key, config);
    return config;
  }

  private getDirectionBack(x: number, z: number, px: number, pz: number): 'north' | 'south' | 'east' | 'west' {
    if (pz < z) return 'north';
    if (pz > z) return 'south';
    if (px > x) return 'east';
    return 'west';
  }

  public move(direction: 'north' | 'south' | 'east' | 'west'): RoomConfig {
    let nx = this.currentRoom.x;
    let nz = this.currentRoom.z;

    if (direction === 'north') nz -= 1;
    if (direction === 'south') nz += 1;
    if (direction === 'east') nx += 1;
    if (direction === 'west') nx -= 1;

    const nextRoom = this.getOrCreateRoom(nx, nz, this.currentRoom.progressAtCreation, this.currentRoom);
    this.currentRoom = nextRoom;
    return nextRoom;
  }
}
