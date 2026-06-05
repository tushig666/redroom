
/**
 * KeyboardManager.ts
 * Manages absolute real-time state of the physical keyboard.
 */
export class KeyboardManager {
  private keys: Record<string, boolean> = {};

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private handleBlur = () => {
    this.keys = {};
  };

  public isPressed(code: string): boolean {
    return !!this.keys[code];
  }

  public getActiveKeys(): string[] {
    return Object.keys(this.keys).filter(k => this.keys[k]);
  }

  public dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }
}
