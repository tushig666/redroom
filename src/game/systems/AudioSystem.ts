
'use client';

import * as Tone from 'tone';
import * as THREE from 'three';

/**
 * AudioSystem.ts
 * Centralized audio infrastructure for REDROOM.
 * Handles local assets, spatial audio, and randomized monster cues.
 */

const AUDIO_CONFIG = {
  BACKGROUND: "/audio/background.mp3",
  CLOWN: "/audio/clown.mp3",
  THREADLING: "/audio/threadling.mp3",
};

export class AudioSystem {
  private bgPlayer: Tone.Player | null = null;
  private bgFilter: Tone.Filter | null = null;

  private clownPlayer: Tone.Player | null = null;
  private clownPanner: Tone.Panner3D | null = null;

  private monsterPlayer: Tone.Player | null = null;
  private monsterPanner: Tone.Panner3D | null = null;

  private monsterTimer: number = 10;
  private initialized = false;
  private initializing = false;

  constructor() {
    console.log("AUDIO SYSTEM CREATED");
  }

  /**
   * Initializes audio context and nodes safely on the client.
   * This must be triggered by a user gesture.
   */
  public async init() {
    if (this.initialized || this.initializing) return;
    this.initializing = true;
    console.log("AUDIO INIT STARTED");

    try {
      // 1. Start the audio context
      await Tone.start();
      console.log("TONE START SUCCESS. Context state:", Tone.context.state);

      // 2. Setup Background Theme (Muffled, distant)
      this.bgFilter = new Tone.Filter(800, "lowpass").toDestination();
      this.bgPlayer = new Tone.Player({
        url: AUDIO_CONFIG.BACKGROUND,
        loop: true,
        volume: -20,
        onload: () => {
          console.log("LOAD SUCCESS: BACKGROUND");
          if (this.bgPlayer) this.bgPlayer.start();
        },
        onerror: () => console.warn("BACKGROUND AUDIO NOT FOUND")
      }).connect(this.bgFilter);

      // 3. Setup Clown Audio (Spatialized laughter)
      this.clownPanner = new Tone.Panner3D({
        panningModel: 'HRTF',
        rolloffFactor: 2,
        refDistance: 1,
        maxDistance: 20
      }).toDestination();
      this.clownPlayer = new Tone.Player({
        url: AUDIO_CONFIG.CLOWN,
        loop: true,
        volume: -5,
        onload: () => console.log("LOAD SUCCESS: CLOWN"),
        onerror: () => console.warn("CLOWN AUDIO NOT FOUND")
      }).connect(this.clownPanner);

      // 4. Setup Threadling Audio (Intermittent spatial cues)
      this.monsterPanner = new Tone.Panner3D({
        panningModel: 'HRTF'
      }).toDestination();
      this.monsterPlayer = new Tone.Player({
        url: AUDIO_CONFIG.THREADLING,
        loop: false,
        volume: 0,
        onload: () => console.log("LOAD SUCCESS: THREADLING"),
        onerror: () => console.warn("THREADLING AUDIO NOT FOUND")
      }).connect(this.monsterPanner);

      this.initialized = true;
    } catch (error) {
      console.error("AUDIO SYSTEM INIT FAILED:", error);
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Updates spatial positions and triggers randomized audio events.
   */
  public update(dt: number, data: {
    isMenu: boolean,
    inTrapRoom: boolean,
    monsterDist: number,
    monsterPos: THREE.Vector3,
    playerPos: THREE.Vector3,
    playerDir: THREE.Vector3
  }) {
    if (!this.initialized) return;

    // A. Sync Listener Position
    try {
      Tone.getContext().listener.set({
        positionX: data.playerPos.x,
        positionY: data.playerPos.y,
        positionZ: data.playerPos.z,
        forwardX: data.playerDir.x,
        forwardY: data.playerDir.y,
        forwardZ: data.playerDir.z,
        upX: 0,
        upY: 1,
        upZ: 0
      });
    } catch (e) {
      // Listener sync failed (unsupported browser or context issues)
    }

    // B. Background Modulation
    if (this.bgFilter) {
      const targetFreq = data.isMenu ? 2000 : 800;
      this.bgFilter.frequency.rampTo(targetFreq, 2);
    }

    // C. Noise Trap Room (Clown)
    if (this.clownPlayer && this.clownPanner && this.clownPlayer.loaded) {
      if (data.inTrapRoom) {
        if (this.clownPlayer.state !== 'started') {
          this.clownPlayer.start();
        }
        this.clownPanner.set({
          positionX: 0,
          positionY: 1.8,
          positionZ: 0
        });
      } else {
        if (this.clownPlayer.state === 'started') {
          this.clownPlayer.stop("+0.5");
        }
      }
    }

    // D. Threadling Cues (Intermittent)
    if (this.monsterPlayer && this.monsterPanner && this.monsterPlayer.loaded) {
      this.monsterTimer -= dt;
      if (this.monsterTimer <= 0) {
        const dist = data.monsterDist;
        
        // Define frequency based on proximity
        let minInt = 10, maxInt = 25;
        if (dist < 10) { minInt = 3; maxInt = 7; }
        else if (dist < 25) { minInt = 6; maxInt = 15; }

        this.monsterTimer = Math.random() * (maxInt - minInt) + minInt;

        if (this.monsterPlayer.state !== 'started') {
          this.monsterPanner.set({
            positionX: data.monsterPos.x,
            positionY: data.monsterPos.y,
            positionZ: data.monsterPos.z
          });
          
          // Apply proximity volume scaling
          const vol = Math.max(-40, -(dist * 1.5));
          this.monsterPlayer.volume.value = vol;
          
          this.monsterPlayer.start();
        }
      }
    }
  }
}
