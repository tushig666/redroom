
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
    } else {
      // If we were locked and lost it, we don't automatically go to fallback
      // unless the request failed initially.
      if (this.status === 'LOCKED') {
        this.status = 'DISABLED';
      }
    }
  };

  private handleLockError = () => {
    // This event fires if requestPointerLock() fails.
    // We switch to fallback mode silently.
    this.status = 'FALLBACK';
  };

  public async requestLock() {
    if (!this.element) return;

    try {
      // requestPointerLock() can return a promise in modern browsers
      const promise = this.element.requestPointerLock() as any;
      if (promise && typeof promise.catch === 'function') {
        await promise.catch((err: Error) => {
          // Silent fallback to avoid triggering Next.js error overlays
          this.status = 'FALLBACK';
        });
      }
    } catch (e: any) {
      // Catch synchronous SecurityErrors (e.g. sandbox restrictions)
      this.status = 'FALLBACK';
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
