import * as THREE from 'three';
import { DoorOutcome } from './RoomSystem';

/**
 * DoorSystem.ts
 * Logic for handling door interactions.
 */
export class DoorSystem {
  private readonly INTERACT_DIST = 3.5;

  public checkInteraction(
    playerPos: THREE.Vector3, 
    lookDir: THREE.Vector3, 
    outcomes: { [key: string]: DoorOutcome | undefined }
  ): DoorOutcome | null {
    // Doors are at cardinal points: N(0, 0, -9.5), S(0, 0, 9.5), E(9.5, 0, 0), W(-9.5, 0, 0)
    const doorPositions = {
      north: new THREE.Vector3(0, 1.7, -9.5),
      south: new THREE.Vector3(0, 1.7, 9.5),
      east: new THREE.Vector3(9.5, 1.7, 0),
      west: new THREE.Vector3(-9.5, 1.7, 0)
    };

    for (const [key, pos] of Object.entries(doorPositions)) {
      const outcome = outcomes[key as keyof typeof outcomes];
      if (outcome === undefined) continue;

      const dist = playerPos.distanceTo(pos);
      if (dist < this.INTERACT_DIST) {
        // Simple dot product check to see if we're looking at it
        const toDoor = new THREE.Vector3().subVectors(pos, playerPos).normalize();
        if (lookDir.dot(toDoor) > 0.8) {
          return outcome;
        }
      }
    }

    return null;
  }
}
