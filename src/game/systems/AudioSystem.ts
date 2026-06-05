
import * as Tone from 'tone';
import * as THREE from 'three';

/**
 * AudioSystem.ts
 * Manages spatial horror soundscape using Tone.js.
 * Features:
 * - Distant, filtered background theme.
 * - Spatialized clown laughter for Noise Traps.
 * - Intermittent, distance-based Threadling audio cues.
 */

const AUDIO_CONFIG = {
  BACKGROUND: "https://www.myinstants.com/media/sounds/the-lobotomy-maebi.mp3",
  CLOWN: "https://www.myinstants.com/media/sounds/pennywise-laugh-from-it-2017.mp3",
  THREADLING: "https://www.myinstants.com/media/sounds/see-you.mp3",
};

export class AudioSystem {
  private bgPlayer!: Tone.Player;
  private bgFilter!: Tone.Filter;
  private bgDistort!: Tone.Distortion;
  private bgReverb!: Tone.Reverb;

  private clownPlayer!: Tone.Player;
  private clownPanner!: Tone.Panner3D;

  private monsterPlayer!: Tone.Player;
  private monsterPanner!: Tone.Panner3D;
  private monsterTimer: number = 10;

  private initialized = false;
  private initializing = false;

  constructor() {
    // Empty constructor to be SSR safe
  }

  /**
   * Initializes audio context on first user gesture.
   * Idempotent and non-blocking.
   */
  public async init() {
    if (this.initialized || this.initializing) return;
    this.initializing = true;
    
    try {
      await Tone.start();
      
      // 1. Background Theme Chain
      this.bgFilter = new Tone.Filter(1000, "lowpass").toDestination();
      this.bgDistort = new Tone.Distortion(0.15).connect(this.bgFilter);
      this.bgReverb = new Tone.Reverb({ decay: 5, wet: 0.4 }).connect(this.bgDistort);
      
      this.bgPlayer = new Tone.Player({
        url: AUDIO_CONFIG.BACKGROUND,
        loop: true,
        volume: -15
      }).connect(this.bgReverb);

      // 2. Clown Audio Chain
      this.clownPanner = new Tone.Panner3D({
        panningModel: 'HRTF',
        distanceModel: 'exponential',
        rolloffFactor: 1.5,
        refDistance: 1,
        maxDistance: 30
      }).toDestination();
      
      this.clownPlayer = new Tone.Player({
        url: AUDIO_CONFIG.CLOWN,
        loop: true,
        volume: -5
      }).connect(this.clownPanner);

      // 3. Threadling Audio Chain
      this.monsterPanner = new Tone.Panner3D({
        panningModel: 'HRTF'
      }).toDestination();
      
      this.monsterPlayer = new Tone.Player({
        url: AUDIO_CONFIG.THREADLING,
        loop: false,
        volume: 0
      }).connect(this.monsterPanner);

      // Start background if loaded
      this.bgPlayer.autostart = true;
      if (this.bgPlayer.loaded) {
        this.bgPlayer.start();
      }

      this.initialized = true;
    } catch (e) {
      console.warn("[AudioSystem] Failed to start audio context", e);
    } finally {
      this.initializing = false;
    }
  }

  public update(dt: number, data: {
    isMenu: boolean,
    inTrapRoom: boolean,
    monsterDist: number,
    monsterPos: THREE.Vector3,
    playerPos: THREE.Vector3,
    playerDir: THREE.Vector3
  }) {
    if (!this.initialized) return;

    // Update Tone.js Listener (The Player)
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

    if (data.isMenu) {
      this.bgFilter.frequency.rampTo(2000, 1);
      this.bgPlayer.volume.rampTo(-15, 1);
    } else {
      this.bgFilter.frequency.rampTo(800, 2);
      this.bgPlayer.volume.rampTo(-22, 2); 
    }

    if (data.inTrapRoom) {
      if (this.clownPlayer.state !== 'started' && this.clownPlayer.loaded) {
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

    this.monsterTimer -= dt;
    if (this.monsterTimer <= 0) {
      const dist = data.monsterDist;
      let minInt = 10;
      let maxInt = 25;
      if (dist < 12) { minInt = 3; maxInt = 7; }
      else if (dist < 25) { minInt = 6; maxInt = 15; }

      this.monsterTimer = Math.random() * (maxInt - minInt) + minInt;

      if (this.monsterPlayer.state !== 'started' && this.monsterPlayer.loaded) {
        this.monsterPanner.set({
          positionX: data.monsterPos.x,
          positionY: data.monsterPos.y,
          positionZ: data.monsterPos.z
        });
        const vol = Math.max(-40, - (dist * 1.0));
        this.monsterPlayer.volume.value = vol;
        const currentBgVol = this.bgPlayer.volume.value;
        this.bgPlayer.volume.rampTo(currentBgVol - 10, 0.1);
        this.monsterPlayer.start();
        this.bgPlayer.volume.rampTo(currentBgVol, 3, "+1.5");
      }
    }
  }
}
