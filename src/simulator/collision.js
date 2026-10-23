// Falling or loading a saved position can place feet below a wall's top.
// Push out of overlapping solids instead of trapping every movement key.
export function resolvePenetration(position, obstacles, radius = 0.38) {
  let { x, z } = position;
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const o of obstacles) {
      if (position.y >= o.h - 0.05) continue;
      const dx = x - o.x,
        dz = z - o.z;
      const overlapX = o.rx + radius - Math.abs(dx),
        overlapZ = o.rz + radius - Math.abs(dz);
      if (overlapX <= 0 || overlapZ <= 0) continue;
      if (overlapX < overlapZ) x += (Math.sign(dx) || 1) * (overlapX + 0.001);
      else z += (Math.sign(dz) || 1) * (overlapZ + 0.001);
      changed = true;
    }
    if (!changed) break;
  }
  return {
    x: Math.max(-12.09, Math.min(12.09, x)),
    z: Math.max(-10.09, Math.min(10.09, z)),
  };
}
