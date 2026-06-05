export class Matrix4 {
  elements: Float32Array;

  constructor() {
    this.elements = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }

  identity() {
    this.elements.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    return this;
  }

  static rotationY(angle: number) {
    const m = new Matrix4();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.elements[0] = c;
    m.elements[2] = s;
    m.elements[8] = -s;
    m.elements[10] = c;
    return m;
  }

  static translation(x: number, y: number, z: number) {
    const m = new Matrix4();
    m.elements[12] = x;
    m.elements[13] = y;
    m.elements[14] = z;
    return m;
  }
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}
