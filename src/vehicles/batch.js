import * as T from '../../vendor/three.module.js';
// Bake the static AI silhouette once; material groups become single draw calls.
export function batchVehicle(group) {
  group.updateMatrixWorld(true);
  const groups = new Map();
  group.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    let p = o.parent;
    while (p && p !== group) {
      if (!p.visible) return;
      p = p.parent;
    }
    const key = o.material.color.getHex() + ':' + o.material.type;
    if (!groups.has(key))
      groups.set(key, { material: o.material, positions: [], normals: [], uvs: [] });
    const batch = groups.get(key),
      g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    batch.positions.push(...g.attributes.position.array);
    if (g.attributes.normal) batch.normals.push(...g.attributes.normal.array);
    if (g.attributes.uv) batch.uvs.push(...g.attributes.uv.array);
    g.dispose();
  });
  group.clear();
  const result = [];
  for (const b of groups.values()) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(b.positions, 3));
    if (b.normals.length) g.setAttribute('normal', new T.Float32BufferAttribute(b.normals, 3));
    if (b.uvs.length) g.setAttribute('uv', new T.Float32BufferAttribute(b.uvs, 2));
    const m = new T.Mesh(g, b.material);
    m.castShadow = true;
    group.add(m);
    result.push(g);
  }
  return result;
}
