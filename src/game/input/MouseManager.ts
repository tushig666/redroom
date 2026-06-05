
/**
 * MouseManager.ts
 * Handles hardware pointer lock, standard mouse movement, and fallback logic.
 */
export type LockStatus = 'LOCKED' | 'FALLBACK' | 'DISABLED';

export class MouseManager {
  public deltaX = 0;
  public deltaY = 0;
  public status: LockStatus = 'DISABLED';
  public isMouseDown = false;
  private element: HTMLElement | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('pointerlockchange', this.handleLockChange);
    document.addEventListener('pointerlockerror', this.handleLockError);
  }

  public setElement(el: HTMLElement) {
    this.element = el;
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (this.status === 'LOCKED') {
      this.deltaX = e.movementX;
      this.deltaY = e.movementY;
    } else if (this.status === 'FALLBACK' && this.isMouseDown) {
      // In fallback mode, we use raw movement if available, or simulate it
      this.deltaX = e.movementX;
      this.deltaY = e.movementY;
    } else {
      this.deltaX = 0;
      this.deltaY = 0;
    }
  };

  private handleMouseDown = () => {
    this.isMouseDown = true;
  };

  private handleMouseUp = () => {
    this.isMouseDown = false;
  };

  private handleLockChange = () => {
    if (document.pointerLockElement === this.element) {
      this.status = 'LOCKED';
      console.log('[MouseManager] Pointer Lock Acquired');
    } else {
      // If we were locked and lost it, we don't automatically go to fallback
      // unless the request failed initially.
      if (this.status === 'LOCKED') {
        this.status = 'DISABLED';
        console.log('[MouseManager] Pointer Lock Lost');
      }
    }
  };

  private handleLockError = () => {
    console.warn('[MouseManager] Pointer Lock Failed. Entering Fallback Mode.');
    this.status = 'FALLBACK';
  };

  public async requestLock() {
    if (!this.element) return;

    try {
      const promise = this.element.requestPointerLock() as any;
      if (promise && typeof promise.catch === 'function') {
        await promise.catch((err: Error) => {
          this.status = 'FALLBACK';
          console.error('[MouseManager] Lock rejected:', err.message);
        });
      }
    } catch (e: any) {
      this.status = 'FALLBACK';
      console.warn('[MouseManager] Security/Sandbox restriction:', e.message);
    }
  }

  public consumeDeltas() {
    const dx = this.deltaX;
    const dy = this.deltaY;
    this.deltaX = 0;
    this.deltaY = 0;
    return { x: dx, y: dy };
  }

  public dispose() {
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('pointerlockchange', this.handleLockChange);
    document.removeEventListener('pointerlockerror', this.handleLockError);
  }
}
