
'use client';

import * as Tone from 'tone';
import * as THREE from 'three';

/**
 * AudioSystem.ts
 * Centralized audio infrastructure for REDROOM.
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

  public async init() {
    if (this.initialized || this.initializing) return;

    this.initializing = true;

    try {
      await Tone.start();

      console.log(
        "TONE START SUCCESS:",
        Tone.context.state
      );

      // =====================
      // BACKGROUND MUSIC
      // =====================

      this.bgFilter = new Tone.Filter(
        800,
        "lowpass"
      ).toDestination();

      this.bgPlayer = new Tone.Player({
        url: AUDIO_CONFIG.BACKGROUND,
        loop: true,
        volume: -20,

        onload: () => {
          console.log("BACKGROUND LOADED");

          if (this.bgPlayer) {
            this.bgPlayer.start();
          }
        },

        onerror: (e) => {
          console.warn(
            "BACKGROUND FAILED:",
            e
          );
        },
      }).connect(this.bgFilter);

      // =====================
      // CLOWN AUDIO
      // 3X LOUDER
      // =====================

      this.clownPanner = new Tone.Panner3D({
        panningModel: "HRTF",
        rolloffFactor: 1.2,
        refDistance: 1,
        maxDistance: 40,
      }).toDestination();

      this.clownPlayer = new Tone.Player({
        url: AUDIO_CONFIG.CLOWN,

        loop: true,

        // OLD: -5
        // NEW: +5 (MUCH LOUDER)
        volume: 5,

        onload: () => {
          console.log("CLOWN LOADED");
        },

        onerror: (e) => {
          console.warn(
            "CLOWN FAILED:",
            e
          );
        },
      }).connect(this.clownPanner);

      // =====================
      // THREADLING AUDIO
      // 3X LOUDER
      // =====================

      this.monsterPanner = new Tone.Panner3D({
        panningModel: "HRTF",

        rolloffFactor: 0.8,

        refDistance: 1,

        maxDistance: 60,
      }).toDestination();

      this.monsterPlayer = new Tone.Player({
        url: AUDIO_CONFIG.THREADLING,

        loop: false,

        // OLD: 0
        // NEW: +8
        volume: 8,

        onload: () => {
          console.log("THREADLING LOADED");
        },

        onerror: (e) => {
          console.warn(
            "THREADLING FAILED:",
            e
          );
        },
      }).connect(this.monsterPanner);

      this.initialized = true;

      console.log("AUDIO INIT COMPLETE");
    } catch (err) {
      console.error(
        "AUDIO INIT FAILED:",
        err
      );
    } finally {
      this.initializing = false;
    }
  }

  public update(
    dt: number,
    data: {
      isMenu: boolean;
      inTrapRoom: boolean;
      monsterDist: number;
      monsterPos: THREE.Vector3;
      playerPos: THREE.Vector3;
      playerDir: THREE.Vector3;
    }
  ) {
    if (!this.initialized) return;

    // =====================
    // LISTENER UPDATE
    // =====================

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
        upZ: 0,
      });
    } catch (e) {}

    // =====================
    // BACKGROUND FILTER
    // =====================

    if (this.bgFilter) {
      const targetFreq = data.isMenu
        ? 2000
        : 800;

      this.bgFilter.frequency.rampTo(
        targetFreq,
        2
      );
    }

    // =====================
    // CLOWN ROOM
    // =====================

    if (
      this.clownPlayer &&
      this.clownPanner &&
      this.clownPlayer.loaded
    ) {
      if (data.inTrapRoom) {
        if (
          this.clownPlayer.state !==
          "started"
        ) {
          this.clownPlayer.start();
        }

        this.clownPanner.set({
          positionX: 0,
          positionY: 1.8,
          positionZ: 0,
        });
      } else {
        if (
          this.clownPlayer.state ===
          "started"
        ) {
          this.clownPlayer.stop("+0.5");
        }
      }
    }

    // =====================
    // THREADLING SOUNDS
    // =====================

    if (
      this.monsterPlayer &&
      this.monsterPanner &&
      this.monsterPlayer.loaded
    ) {
      this.monsterTimer -= dt;

      if (this.monsterTimer <= 0) {
        const dist =
          data.monsterDist;

        let minInt = 10;
        let maxInt = 25;

        if (dist < 10) {
          minInt = 2;
          maxInt = 5;
        } else if (dist < 25) {
          minInt = 4;
          maxInt = 10;
        }

        this.monsterTimer =
          Math.random() *
            (maxInt - minInt) +
          minInt;

        if (
          this.monsterPlayer.state !==
          "started"
        ) {
          this.monsterPanner.set({
            positionX:
              data.monsterPos.x,

            positionY:
              data.monsterPos.y,

            positionZ:
              data.monsterPos.z,
          });

          // MUCH LOUDER THAN BEFORE
          const vol = Math.max(
            -10,
            15 - dist * 0.5
          );

          this.monsterPlayer.volume.value =
            vol;

          this.monsterPlayer.start();
        }
      }
    }
  }
}