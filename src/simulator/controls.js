// Keyboard and touch have separate owners, so releasing either cannot leave
// a stale movement flag behind or cancel the other device's held button.
export class MovementInput {
  constructor() {
    this.keyboard = new Set();
    this.pointers = new Map();
  }
  press(code, repeat = false) {
    // A late auto-repeat after blur/resume must never restart movement.
    if (!repeat) this.keyboard.add(code);
  }
  release(code) {
    this.keyboard.delete(code);
  }
  holdPointer(id, code) {
    this.pointers.set(id, code);
  }
  releasePointer(id) {
    this.pointers.delete(id);
  }
  has(code) {
    return (
      this.keyboard.has(code) || [...this.pointers.values()].includes(code)
    );
  }
  clear() {
    this.keyboard.clear();
    this.pointers.clear();
  }
  axes() {
    const x =
      Number(this.has("KeyD") || this.has("ArrowRight")) -
      Number(this.has("KeyA") || this.has("ArrowLeft"));
    const z =
      Number(this.has("KeyS") || this.has("ArrowDown")) -
      Number(this.has("KeyW") || this.has("ArrowUp"));
    const length = Math.hypot(x, z) || 1;
    return { x: x / length, z: z / length };
  }
}
