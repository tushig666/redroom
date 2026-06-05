
import { InputManager } from '../input/InputManager';
import { PlayerController } from '../player/PlayerController';
import { CameraController } from '../player/CameraController';

/**
 * GameLoop.ts
 * Centralized update loop for the entire engine.
 */
export class GameLoop {
  private lastTime = 0;
  private input: InputManager;
  private player: PlayerController;
  private camera: CameraController;
  private onUpdate: (dt: number) => void;
  private isRunning = false;

  constructor(
    input: InputManager,
    player: PlayerController,
    camera: CameraController,
    onUpdate: (dt: number) => void
  ) {
    this.input = input;
    this.player = player;
    this.camera = camera;
    this.onUpdate = onUpdate;
  }

  public start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  public stop() {
    this.isRunning = false;
  }

  private loop = (time: number) => {
    if (!this.isRunning) return;

    const dt = Math.min((time - this.lastTime) / 1000, 0.1); // Clamp DT to avoid tunneling
    this.lastTime = time;

    // 1. Consume Input
    const mouseDeltas = this.input.mouse.consumeDeltas();

    // 2. Update Controllers
    this.camera.update(mouseDeltas.x, mouseDeltas.y);
    this.player.update(dt);

    // 3. Update Horror Systems (Placeholder for soundscape/AI)
    // this.horror.update(this.player.position, dt);

    // 4. Trigger Renderer/Scene Update
    this.onUpdate(dt);

    requestAnimationFrame(this.loop);
  };
}
