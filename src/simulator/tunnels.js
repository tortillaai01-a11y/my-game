import * as THREE from "three";
import {
  TUNNEL_SIZE,
  TUNNEL_DEPTH,
  cellKey,
  tunnelCell,
  canDigCell,
} from "./world.js";
export class Tunnels {
  constructor(scene, material) {
    this.cells = new Map();
    this.obstacles = [];
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = 512;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, 512, 512);
    this.mask = new THREE.CanvasTexture(this.canvas);
    this.mask.minFilter = this.mask.magFilter = THREE.NearestFilter;
    const earth = material.clone();
    earth.color.set("#725235");
    this.floor = new THREE.InstancedMesh(
      new THREE.BoxGeometry(TUNNEL_SIZE, 0.08, TUNNEL_SIZE),
      earth,
      320,
    );
    this.walls = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      earth,
      1280,
    );
    this.rims = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      material.clone(),
      1280,
    );
    for (const m of [this.floor, this.walls, this.rims]) {
      m.count = 0;
      m.frustumCulled = false;
      scene.add(m);
    }
  }
  cut(material) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.tunnelMask = { value: this.mask };
      shader.vertexShader = "varying vec2 tunnelWorld;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `vec4 tunnelPosition=vec4(transformed,1.0);
#ifdef USE_INSTANCING
 tunnelPosition=instanceMatrix*tunnelPosition;
#endif
 tunnelWorld=(modelMatrix*tunnelPosition).xz;
#include <project_vertex>`,
      );
      shader.fragmentShader =
        "uniform sampler2D tunnelMask;\nvarying vec2 tunnelWorld;\n" +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
if(texture2D(tunnelMask,(tunnelWorld+vec2(13.,11.))/vec2(26.,22.)).r>.5)discard;`,
      );
    };
    material.customProgramCacheKey = () => "hamster-tunnel-cut-v1";
  }
  has(x, z) {
    return this.cells.has(cellKey(tunnelCell(x, z)));
  }
  allowed(x, z) {
    return canDigCell(tunnelCell(x, z), this.obstacles);
  }
  carve(x, z) {
    const cell = tunnelCell(x, z),
      key = cellKey(cell);
    if (this.cells.has(key)) return true;
    if (this.cells.size >= 320 || !canDigCell(cell, this.obstacles))
      return false;
    this.cells.set(key, cell);
    this.rebuild();
    return true;
  }
  restore(cells) {
    if (!Array.isArray(cells)) return;
    for (const c of cells.slice(0, 320))
      if (
        Number.isInteger(c?.x) &&
        Number.isInteger(c?.z) &&
        canDigCell(c, this.obstacles)
      )
        this.cells.set(cellKey(c), { x: c.x, z: c.z });
    this.rebuild();
  }
  clear() {
    this.cells.clear();
    this.rebuild();
  }
  snapshot() {
    return [...this.cells.values()].map((c) => ({ ...c }));
  }
  rebuild() {
    const d = new THREE.Object3D();
    let f = 0,
      w = 0;
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, 512, 512);
    this.ctx.fillStyle = "white";
    for (const c of this.cells.values()) {
      const x = c.x * TUNNEL_SIZE,
        z = c.z * TUNNEL_SIZE;
      this.ctx.fillRect(
        ((x - TUNNEL_SIZE / 2 + 13) / 26) * 512,
        ((11 - z - TUNNEL_SIZE / 2) / 22) * 512,
        (TUNNEL_SIZE / 26) * 512 + 0.5,
        (TUNNEL_SIZE / 22) * 512 + 0.5,
      );
      d.position.set(x, TUNNEL_DEPTH - 0.04, z);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      this.floor.setMatrixAt(f++, d.matrix);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (this.cells.has(cellKey({ x: c.x + dx, z: c.z + dz }))) continue;
        d.position.set(
          x + (dx * TUNNEL_SIZE) / 2,
          TUNNEL_DEPTH / 2,
          z + (dz * TUNNEL_SIZE) / 2,
        );
        d.scale.set(
          dx ? 0.1 : TUNNEL_SIZE,
          -TUNNEL_DEPTH,
          dz ? 0.1 : TUNNEL_SIZE,
        );
        d.updateMatrix();
        this.walls.setMatrixAt(w, d.matrix);
        d.position.y = 0.09;
        d.scale.y = 0.14;
        d.scale.x += 0.08;
        d.scale.z += 0.08;
        d.updateMatrix();
        this.rims.setMatrixAt(w++, d.matrix);
      }
    }
    this.floor.count = f;
    this.walls.count = this.rims.count = w;
    for (const m of [this.floor, this.walls, this.rims])
      m.instanceMatrix.needsUpdate = true;
    this.mask.needsUpdate = true;
  }
}
