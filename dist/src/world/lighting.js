import * as T from '../../vendor/three.module.js';
export function createEnvironment(renderer, scene) {
  const studio = new T.Scene();
  studio.background = new T.Color(0x748d99);
  for (const [x, y, z, w, h, d, color] of [
    [0, 9, 0, 18, 0.2, 20, 0xc6dee6],
    [-8, 3, 0, 0.2, 4, 18, 0xb5d6ef],
    [8, 3, 0, 0.2, 3, 18, 0xffd5aa],
    [0, 1, -10, 9, 1, 0.2, 0xf1f6df],
  ]) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ color }));
    m.position.set(x, y, z);
    studio.add(m);
  }
  const generator = new T.PMREMGenerator(renderer),
    target = generator.fromScene(studio, 0.06);
  scene.environment = target.texture;
  scene.environmentIntensity = 0.7;
  generator.dispose();
  studio.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  return target;
}
