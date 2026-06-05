
/**
 * PointerLockManager.ts
 * 
 * A production-grade system for managing browser pointer lock states.
 * Automatically detects sandbox restrictions and provides a fallback
 * mechanism for mouse-look in restricted environments (like Firebase Studio).
 */

export type LockMode = 'LOCKED' | 'FALLBACK' | 'DISABLED';

export interface LockStatus {
  mode: LockMode;
  isSupported: boolean;
  isSandboxed: boolean;
  error?: string;
}

class PointerLockManager {
  private mode: LockMode = 'DISABLED';
  private isSupported: boolean = false;
  private isSandboxed: boolean = false;
  private lastError: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isSupported = 'pointerLockElement' in document || 
                        (document as any).mozPointerLockElement || 
                        (document as any).webkitPointerLockElement;
      
      // Initial check for sandbox indicators
      this.checkSandbox();
    }
  }

  private checkSandbox() {
    try {
      // Browsers throw a SecurityError if we check certain properties in a strict sandbox
      const isTop = window.self === window.top;
      this.isSandboxed = !isTop;
    } catch (e) {
      this.isSandboxed = true;
    }
  }

  /**
   * Attempts to request a pointer lock.
   * If it fails due to sandbox restrictions, it transitions to FALLBACK mode.
   */
  public async requestLock(element: HTMLElement): Promise<LockStatus> {
    if (!this.isSupported) {
      this.mode = 'DISABLED';
      return this.getStatus();
    }

    try {
      // Modern browsers return a promise, older ones don't
      const promise = element.requestPointerLock() as any;
      
      if (promise && typeof promise.catch === 'function') {
        await promise.catch((err: Error) => {
          throw err;
        });
      }

      this.mode = 'LOCKED';
      this.lastError = null;
      console.log('[PointerLockManager] Hardware lock acquired.');
    } catch (error: any) {
      this.lastError = error.message;
      
      if (error.name === 'SecurityError' || error.message.includes('sandboxed')) {
        console.warn('[PointerLockManager] Sandbox restriction detected. Switching to FALLBACK mode.');
        this.mode = 'FALLBACK';
        this.isSandboxed = true;
      } else {
        this.mode = 'DISABLED';
        console.error('[PointerLockManager] Lock failed:', error);
      }
    }

    return this.getStatus();
  }

  public releaseLock() {
    if (typeof document !== 'undefined' && document.exitPointerLock) {
      document.exitPointerLock();
    }
    this.mode = 'DISABLED';
  }

  public getStatus(): LockStatus {
    return {
      mode: this.mode,
      isSupported: this.isSupported,
      isSandboxed: this.isSandboxed,
      error: this.lastError || undefined
    };
  }

  /**
   * Logic for processing mouse movement based on current mode
   */
  public getDeltas(e: MouseEvent): { x: number; y: number } {
    if (this.mode === 'LOCKED') {
      return {
        x: e.movementX || (e as any).mozMovementX || (e as any).webkitMovementX || 0,
        y: e.movementY || (e as any).mozMovementY || (e as any).webkitMovementY || 0
      };
    }

    if (this.mode === 'FALLBACK') {
      // In fallback mode, we assume the movement is still useful but might be scaled differently
      // or provided directly by some browsers even if not locked.
      return {
        x: e.movementX || 0,
        y: e.movementY || 0
      };
    }

    return { x: 0, y: 0 };
  }
}

export const pointerLockManager = new PointerLockManager();
