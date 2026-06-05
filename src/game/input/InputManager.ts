
import { KeyboardManager } from './KeyboardManager';
import { MouseManager } from './MouseManager';

/**
 * InputManager.ts
 * Unified access point for all hardware inputs.
 */
export class InputManager {
  public keyboard: KeyboardManager;
  public mouse: MouseManager;

  constructor() {
    this.keyboard = new KeyboardManager();
    this.mouse = new MouseManager();
  }

  public update() {
    // Logic that needs to run every frame for input coordination
  }

  public dispose() {
    this.keyboard.dispose();
    this.mouse.dispose();
  }
}
