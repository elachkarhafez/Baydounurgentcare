// Split a generated/scanned GLB into parts by cutting along one axis.
// Image-to-3D often returns several items in one mesh (two bowls side by side):
// keep only the triangles whose centroid falls inside [min, max] on the axis.
//
// usage: node split-glb.mjs in.glb out.glb <x|y|z> <min> <max>
//        node split-glb.mjs pair.glb bean.glb x -9 0      (left half)
//        node split-glb.mjs pair.glb curry.glb x 0 9      (right half)
// Coordinates are mesh-local; print the spread first with --hist:
//        node split-glb.mjs pair.glb - x --hist
const NODE = process.env.LIB_NODE || '/tmp/ela-lib-node';
const { NodeIO } = await import(`${NODE}/node_modules/@gltf-transform/core/dist/index.js`);
const { ALL_EXTENSIONS } = await import(`${NODE}/node_modules/@gltf-transform/extensions/dist/index.js`);
const { compactPrimitive, prune } = await import(`${NODE}/node_modules/@gltf-transform/functions/dist/index.js`);

const [src, out, axis = 'x', a, b] = process.argv.slice(2);
const ax = { x: 0, y: 1, z: 2 }[axis];
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(src);
for (const mesh of doc.getRoot().listMeshes()) for (const pr of mesh.listPrimitives()) {
  const pos = pr.getAttribute('POSITION').getArray();
  let idx = pr.getIndices()?.getArray();
  if (!idx) idx = Uint32Array.from({ length: pos.length / 3 }, (_, i) => i);
  const cen = t => (pos[idx[t * 3] * 3 + ax] + pos[idx[t * 3 + 1] * 3 + ax] + pos[idx[t * 3 + 2] * 3 + ax]) / 3;
  const n = idx.length / 3;
  if (a === '--hist') {
    let mn = 1e9, mx = -1e9; for (let t = 0; t < n; t++) { const c = cen(t); mn = Math.min(mn, c); mx = Math.max(mx, c); }
    const B = 40, h = new Array(B).fill(0); for (let t = 0; t < n; t++) h[Math.min(B - 1, Math.floor((cen(t) - mn) / (mx - mn) * B))]++;
    console.log(h.map((c, i) => `${(mn + (i + .5) / B * (mx - mn)).toFixed(3)}:${c}`).join(' ')); continue;
  }
  const keep = []; for (let t = 0; t < n; t++) { const c = cen(t); if (c >= +a && c <= +b) keep.push(idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]); }
  const acc = doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(keep)).setBuffer(doc.getRoot().listBuffers()[0]);
  pr.setIndices(acc); compactPrimitive(pr);
  console.log(`kept ${keep.length / 3} of ${n} triangles`);
}
if (a !== '--hist') { await doc.transform(prune()); await io.write(out, doc); console.log('wrote', out); }
