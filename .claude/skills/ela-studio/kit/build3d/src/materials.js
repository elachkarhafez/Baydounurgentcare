// Tested material presets. Each takes the stage (for texture loading) and returns a three.js material.
// Colors are sRGB hex. Tweak color/roughness per brand, keep the clearcoat/sheen recipes.
import * as THREE from 'three';

const C = c => new THREE.Color(c);
export const MAT = {
  porcelain: (st, color = '#ebebe8') => new THREE.MeshPhysicalMaterial({ color: C(color), roughness: .2, clearcoat: 1, clearcoatRoughness: .05 }),
  gold: (st, color = '#e6bd6e') => new THREE.MeshPhysicalMaterial({ color: C(color), metalness: 1, roughness: .2, envMapIntensity: 1.6 }),
  chrome: (st) => new THREE.MeshPhysicalMaterial({ color: C('#e8ecef'), metalness: 1, roughness: .08, envMapIntensity: 1.4 }),
  // hot fudge, caramel, syrup, ketchup, glaze: glossy liquid
  sauce: (st, color = '#1e0c05') => new THREE.MeshPhysicalMaterial({ color: C(color), roughness: .16, clearcoat: 1, clearcoatRoughness: .05, ior: 1.47, envMapIntensity: 1.25, sheen: .2, sheenColor: C('#5a2a12') }),
  // ice cream, frosting, whipped cream, mayo: soft and creamy
  cream: (st, color = '#f3e7cd', rep = 3) => new THREE.MeshPhysicalMaterial({
    color: C(color), map: st.tex('ice.webp', true, rep), normalMap: st.tex('ice_n.webp', false, rep), roughness: .5,
    normalScale: new THREE.Vector2(.55, .55), sheen: .6, sheenColor: C('#fff3df'), sheenRoughness: .6, clearcoat: .18, clearcoatRoughness: .45,
    emissive: C('#3b2a17'), emissiveIntensity: .1 }),
  // dense baked crumb (brownie / chocolate cake). 'top' = shiny crackled crust
  crumbSide: (st, tint = '#e9dcd6') => new THREE.MeshPhysicalMaterial({ map: st.tex('brownie_side.webp', true), normalMap: st.tex('brownie_side_n.webp'), roughnessMap: st.tex('brownie_side_r.webp'), roughness: 1, normalScale: new THREE.Vector2(1.2, 1.2), sheen: .35, sheenColor: C('#5a3322'), sheenRoughness: .5, color: C(tint) }),
  crumbTop: (st, tint = '#e4d6cf') => new THREE.MeshPhysicalMaterial({ map: st.tex('brownie_top.webp', true), normalMap: st.tex('brownie_top_n.webp'), roughnessMap: st.tex('brownie_top_r.webp'), roughness: 1, normalScale: new THREE.Vector2(1.1, 1.1), clearcoat: .35, clearcoatRoughness: .32, color: C(tint) }),
  // buns, pancakes, waffles, cookies: golden bake with a soft sheen
  bake: (st, color = '#c27c3c') => new THREE.MeshPhysicalMaterial({ color: C(color), normalMap: st.tex('ice_n.webp', false, 4), normalScale: new THREE.Vector2(.5, .5), roughness: .55, sheen: .5, sheenColor: C('#ffcf8a'), sheenRoughness: .5, clearcoat: .25, clearcoatRoughness: .4 }),
  meat: (st, color = '#5b3322') => new THREE.MeshPhysicalMaterial({ color: C(color), normalMap: st.tex('brownie_side_n.webp', false, 1.4), normalScale: new THREE.Vector2(2.4, 2.4), roughness: .72, clearcoat: .22, clearcoatRoughness: .45, sheen: .3, sheenColor: C('#8a4a2a') }),
  cheese: (st, color = '#f2a51c') => new THREE.MeshPhysicalMaterial({ color: C(color), roughness: .3, clearcoat: .6, clearcoatRoughness: .2, sheen: .3, sheenColor: C('#ffd27a'), emissive: C('#6b3a00'), emissiveIntensity: .12 }),
  leaf: (st, color = '#5fa83a') => new THREE.MeshPhysicalMaterial({ color: C(color), roughness: .42, clearcoat: .5, clearcoatRoughness: .25, sheen: .5, sheenColor: C('#c8f59a'), side: THREE.DoubleSide }),
  // cherries, berries, candy, sprinkles (use white for instanced colors)
  candy: (st, color = '#a50c19') => new THREE.MeshPhysicalMaterial({ color: C(color), roughness: .14, clearcoat: 1, clearcoatRoughness: .03, sheen: .3, sheenColor: C('#ff8a8a'), envMapIntensity: 1.3 }),
  matte: (st, color = '#6f5a2a', rough = .55) => new THREE.MeshStandardMaterial({ color: C(color), roughness: rough })
};
