// One renderer, one canvas, six procedural scenes placed side by side.
// The scroll position picks the active scene and drives its camera rig.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as P from './props.js?v=20261108c';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const SPACING = 80;

function mesh(geo, mat, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (o.p) m.position.set(...o.p);
  if (o.r) m.rotation.set(...o.r);
  if (o.s) typeof o.s === 'number' ? m.scale.setScalar(o.s) : m.scale.set(...o.s);
  m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false;
  return m;
}

// Camera keyframes: [t, [px,py,pz], [tx,ty,tz]]
function keyRig(keys) {
  return (t) => {
    let k0 = keys[0], k1 = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i][0] && t <= keys[i + 1][0]) { k0 = keys[i]; k1 = keys[i + 1]; break; }
    if (t <= keys[0][0]) k1 = k0;
    const u = k1 === k0 ? 0 : smooth(0, 1, (t - k0[0]) / (k1[0] - k0[0]));
    return { pos: V(...k0[1]).lerp(V(...k1[1]), u), tgt: V(...k0[2]).lerp(V(...k1[2]), u) };
  };
}

function materials() {
  const wood = P.woodTexture('#6e4a30', 3); wood.wrapS = wood.wrapT = THREE.MirroredRepeatWrapping; wood.repeat.set(3, 1.5);
  const woodLight = P.woodTexture('#9a7350', 9);
  const ceramicMap = P.speckTexture('#f3eee6', ['#d9d2c6', '#c9bfb0', '#ffffff'], 1800, 4, 256);
  return {
    wood: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.62, metalness: 0 }),
    woodLight: new THREE.MeshStandardMaterial({ map: woodLight, roughness: 0.7 }),
    ceramic: new THREE.MeshPhysicalMaterial({ map: ceramicMap, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.12 }),
    coffee: new THREE.MeshPhysicalMaterial({ color: '#24120a', roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04 }),
    crust: new THREE.MeshStandardMaterial({ color: '#7a5434', roughness: 0.96 }),
    steel: new THREE.MeshStandardMaterial({ color: '#c8ccd1', metalness: 1, roughness: 0.26 }),
    steelDark: new THREE.MeshStandardMaterial({ color: '#7d828a', metalness: 1, roughness: 0.38 }),
    blackSteel: new THREE.MeshStandardMaterial({ color: '#2a2725', metalness: 0.55, roughness: 0.36 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#ffffff', transmission: 1, roughness: 0.03, thickness: 0.06, ior: 1.5, side: THREE.DoubleSide, specularIntensity: 1 }),
    smoke: new THREE.MeshPhysicalMaterial({ color: '#4b4f55', transmission: 0.55, roughness: 0.18, thickness: 0.05, side: THREE.DoubleSide }),
    paper: new THREE.MeshStandardMaterial({ map: P.speckTexture('#f6f1e7', ['#e7dfd0', '#ffffff'], 900, 8, 256), roughness: 0.95, side: THREE.DoubleSide }),
    rubber: new THREE.MeshStandardMaterial({ color: '#1d1b1a', roughness: 0.8 }),
    cereza: new THREE.MeshPhysicalMaterial({ color: '#a8322a', roughness: 0.35, clearcoat: 0.8 }),
    hoja: new THREE.MeshStandardMaterial({ color: '#3f5b3a', roughness: 0.55, side: THREE.DoubleSide }),
    burlap: new THREE.MeshStandardMaterial({ map: P.speckTexture('#b49770', ['#8c7350', '#d2b98f', '#6e5638'], 9000, 12, 256), roughness: 1 }),
    terracotta: new THREE.MeshStandardMaterial({ color: '#b5603c', roughness: 0.85 }),
    marble: new THREE.MeshPhysicalMaterial({ map: P.speckTexture('#f1efea', ['#cfcac2', '#bdb6ad'], 600, 21, 256), roughness: 0.18, clearcoat: 0.6 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c79a4b', metalness: 1, roughness: 0.3 }),
    leather: new THREE.MeshStandardMaterial({ color: '#7a3b22', roughness: 0.7 }),
  };
}


// Coffee shrub: a stem with instanced glossy leaves in pairs and cherries near the branches.
const LEAF = (() => { const g = new THREE.SphereGeometry(1, 10, 6); g.scale(0.16, 0.018, 0.065); g.translate(0.15, 0, 0); return g; })();
const CHERRY = new THREE.SphereGeometry(0.045, 10, 8);
function leafyShrub(M, h = 1.4, seed = 1, cherries = 16) {
  const s = new THREE.Group(); const r = P.rng(seed);
  s.add(mesh(new THREE.CylinderGeometry(0.025, 0.045, h, 8), M.wood, { p: [0, h / 2, 0] }));
  const n = Math.round(110 * h);
  const leafMat = new THREE.MeshPhysicalMaterial({ roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3, side: THREE.DoubleSide });
  const leaves = P.scatter(LEAF, leafMat, n, (i) => {
    const u = 0.12 + (i / n) * 0.88, y = u * h, reach = (1 - u * 0.75) * h * 0.38;
    const a = r() * 6.283, d = reach * (0.35 + r() * 0.65);
    return { x: Math.cos(a) * d, y: y + (r() - 0.5) * 0.06, z: Math.sin(a) * d, rx: (r() - 0.5) * 0.6, ry: -a + (r() - 0.5) * 0.8, rz: -0.25 - r() * 0.35, s: 0.8 + r() * 0.6 };
  }, ['#2f4a2b', '#3f5b3a', '#355231', '#4b6a40'], seed + 3);
  s.add(leaves);
  if (cherries) s.add(P.scatter(CHERRY, new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.9 }), cherries, () => {
    const u = 0.25 + r() * 0.6, reach = (1 - u * 0.75) * h * 0.22, a = r() * 6.283;
    return { x: Math.cos(a) * reach, y: u * h, z: Math.sin(a) * reach, s: 0.9 + r() * 0.4 };
  }, ['#a8322a', '#b8352b', '#8f2620', '#c4492e', '#7e9a3c'], seed + 5));
  return s;
}

/* ---------- Scene 1: cupping table ---------- */
function sceneCata(M, beanGeo) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(15, 0.6, 7.5), M.wood, { p: [0, -0.3, 0] }));
  const cupGeo = P.lathe([[0, 0], [0.3, 0], [0.33, 0.03], [0.34, 0.06], [0.42, 0.25], [0.48, 0.6], [0.5, 0.82], [0.49, 0.85], [0.46, 0.85], [0.45, 0.62], [0.39, 0.28], [0.3, 0.1], [0, 0.09]], 72);
  const liquidGeo = new THREE.CircleGeometry(0.452, 64);
  const chunk = new THREE.DodecahedronGeometry(1, 0);
  const crusts = [];
  const xs = [-2.9, -1.45, 0, 1.45, 2.9];
  xs.forEach((x, ci) => {
    const cup = new THREE.Group(); cup.position.set(x, 0, ci % 2 ? -0.25 : 0.15);
    cup.add(mesh(cupGeo, M.ceramic));
    cup.add(mesh(liquidGeo, M.coffee, { p: [0, 0.74, 0], r: [-Math.PI / 2, 0, 0], cast: false }));
    const n = 900, base = [];
    const cm = P.scatter(chunk, M.crust, n, (i, r) => {
      const a = r() * 6.283, rad = Math.sqrt(r()) * 0.43;
      const o = { x: Math.cos(a) * rad, y: 0.745 + r() * 0.018, z: Math.sin(a) * rad, s: 0.012 + r() * 0.016, sy: 0.5 };
      base.push(o); return o;
    }, ['#8a6240', '#7a5434', '#9c7450', '#6a4528', '#b08a62'], 20 + ci);
    cm.castShadow = false;
    cup.add(cm);
    crusts.push({ mesh: cm, base });
    g.add(cup);
  });
  // spoon
  const spoon = new THREE.Group();
  const bowl = new THREE.SphereGeometry(0.17, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  spoon.add(mesh(bowl, M.steel, { r: [Math.PI, 0, 0], s: [1, 0.38, 1.35] }));
  spoon.add(mesh(new THREE.CylinderGeometry(0.022, 0.03, 1.5, 12), M.steel, { p: [0.95, 0.07, 0], r: [0, 0, Math.PI / 2 + 0.08] }));
  g.add(spoon);
  // kettle (inferred object, the book does not describe it)
  const kettle = new THREE.Group(); kettle.position.set(-4.3, 0, -1.6);
  kettle.add(mesh(P.lathe([[0, 0], [0.55, 0], [0.62, 0.08], [0.64, 0.55], [0.56, 0.86], [0.3, 1.0], [0.1, 1.04], [0.1, 1.12], [0.16, 1.16], [0, 1.18]]), M.blackSteel));
  kettle.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.55, 0.2, 0), V(0.95, 0.4, 0), V(1.0, 1.0, 0), V(1.25, 1.12, 0)]), 30, 0.035, 10), M.blackSteel));
  kettle.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.5, 0.85, 0), V(-0.95, 0.75, 0), V(-0.95, 0.3, 0), V(-0.6, 0.2, 0)]), 30, 0.05, 10), M.wood));
  kettle.rotation.y = -0.5;
  g.add(kettle);
  // score sheet on a clipboard
  g.add(mesh(new THREE.BoxGeometry(1.8, 0.05, 2.4), M.woodLight, { p: [3.9, 0.025, 1.7], r: [0, 0.32, 0] }));
  g.add(mesh(new THREE.PlaneGeometry(1.6, 2.2), new THREE.MeshStandardMaterial({ map: P.sheetTexture(), roughness: 0.9 }), { p: [3.9, 0.052, 1.7], r: [-Math.PI / 2, 0, 0.32] }));
  // loose roasted beans
  g.add(P.scatter(beanGeo, new THREE.MeshPhysicalMaterial({ roughness: 0.4, clearcoat: 0.35 }), 70, (i, r) => {
    const a = r() * 6.283, d = Math.sqrt(r()) * 0.9;
    return { x: -2.4 + Math.cos(a) * d, y: 0.04, z: 1.7 + Math.sin(a) * d * 0.6, s: 0.13, rx: Math.PI / 2 * (r() < 0.5 ? 1 : -1), rz: r() * 6.28, ry: 0 };
  }, ['#3b2414', '#4a2d18', '#2e1b0f', '#553420'], 31));
  // steam
  const dot = P.softDot();
  const steam = [];
  xs.forEach((x, ci) => {
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: '#fffaf2', transparent: true, opacity: 0, depthWrite: false }));
      s.userData = { x, z: ci % 2 ? -0.25 : 0.15, ph: k / 4 + ci * 0.13 };
      g.add(s); steam.push(s);
    }
  });
  const spoonPath = keyRig([[0, [1.4, 0.06, 1.1], [0, 0, 0]], [0.2, [1.4, 0.06, 1.1], [0, 0, 0]], [0.32, [0.15, 1.1, 0.75], [0, 0, 0]], [0.42, [0.05, 0.78, 0.55], [0, 0, 0]], [0.52, [0.0, 0.76, -0.05], [0, 0, 0]], [0.62, [0.1, 1.2, 0.6], [0, 0, 0]], [0.75, [1.4, 0.06, 1.1], [0, 0, 0]]]);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), eu = new THREE.Euler();
  let lastB = -1;
  return {
    group: g,
    rig: keyRig([[0, [1.6, 3.6, 6.6], [0.2, 0.55, 0]], [0.32, [2.4, 2.4, 3.4], [0, 0.65, 0]], [0.6, [1.6, 2.2, 2.9], [0, 0.7, 0]], [0.86, [4.4, 3.4, 6.2], [1.8, 0.4, 0.8]], [1, [4.4, 3.4, 6.2], [1.8, 0.4, 0.8]]]),
    anchors: [
      { key: 'costra', pos: V(0, 0.9, 0.15), range: [0.12, 0.62] },
      { key: 'planilla', pos: V(3.9, 0.1, 1.7), range: [0.66, 1] },
    ],
    update(t, time) {
      const sp = spoonPath(t).pos; spoon.position.copy(sp);
      spoon.rotation.set(0, 0.5, t > 0.3 && t < 0.62 ? -0.35 : 0);
      const b = smooth(0.42, 0.58, t);
      if (Math.abs(b - lastB) > 0.001) {
        lastB = b;
        const c = crusts[2];
        c.base.forEach((o, i) => {
          const a = Math.atan2(o.z, o.x), rad = Math.hypot(o.x, o.z);
          const push = o.z > -0.1 ? 1 : 0.35;
          const nr = rad + (0.44 - rad) * b * push;
          ps.set(Math.cos(a) * nr, o.y - b * 0.02 * ((i % 7) / 7), Math.sin(a) * nr);
          eu.set(i, i * 0.7, i * 1.3); q.setFromEuler(eu);
          sc.set(o.s, o.s * 0.5, o.s);
          mtx.compose(ps, q, sc); c.mesh.setMatrixAt(i, mtx);
        });
        c.mesh.instanceMatrix.needsUpdate = true;
      }
      steam.forEach((s) => {
        const u = (time * 0.18 + s.userData.ph) % 1;
        s.position.set(s.userData.x + Math.sin(time * 0.8 + s.userData.ph * 9) * 0.12 * u, 0.95 + u * 1.1, s.userData.z);
        s.scale.set(0.22 + u * 0.4, 0.5 + u * 0.9, 1);
        s.material.opacity = Math.sin(u * Math.PI) * 0.1;
      });
    },
  };
}

/* ---------- Scenes 2 and 3: pre-rendered Blender sequences ----------
   Grinders (scene 2) and drying beds (scene 3) are Cycles renders scrubbed by scroll in an overlay
   (secuencia.js). The 3D world keeps an empty slot so scene indices and spacing stay the same. */
function sceneVideo() {
  return { group: new THREE.Group(), rig: () => ({ pos: V(0, 4, 10), tgt: V(0, 1, 0) }), anchors: [], update() {}, video: true };
}

/* ---------- Scene 4: brewing methods (V60, Chemex, French press, AeroPress) ---------- */
function sceneMetodos(M) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 0.6, 6), M.wood, { p: [0, -0.3, 0] }));
  // V60 on a glass server
  const v60 = new THREE.Group(); v60.position.set(-3.3, 0, 0); g.add(v60);
  v60.add(mesh(P.lathe([[0, 0], [0.42, 0], [0.5, 0.06], [0.56, 0.3], [0.55, 0.62], [0.44, 0.9], [0.4, 1.0]]), M.glass, { cast: false }));
  v60.add(mesh(P.lathe([[0, 0.02], [0.44, 0.02], [0.53, 0.2], [0.54, 0.28], [0, 0.28]]), M.coffee));
  const drip = new THREE.Group(); drip.position.y = 1.0; v60.add(drip);
  drip.add(mesh(new THREE.CylinderGeometry(0.56, 0.58, 0.06, 64), M.ceramic, { p: [0, 0.03, 0] }));
  drip.add(mesh(P.lathe([[0.09, 0.06], [0.17, 0.06], [0.7, 0.9], [0.73, 0.95], [0.67, 0.96], [0.13, 0.12], [0.09, 0.12]], 72), M.ceramic));
  drip.add(mesh(new THREE.TorusGeometry(0.3, 0.05, 12, 30, Math.PI), M.ceramic, { p: [0.72, 0.5, 0], r: [0, 0, -Math.PI / 2] }));
  for (let i = 0; i < 12; i++) { // spiral ribs inside the cone
    const pts = [];
    for (let k = 0; k <= 12; k++) { const u = k / 12, y = 0.16 + u * 0.74, r = 0.13 + u * 0.52, a = (i / 12) * Math.PI * 2 + u * 0.9; pts.push(V(Math.cos(a) * r, y, Math.sin(a) * r)); }
    drip.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.012, 5), M.ceramic, { cast: false }));
  }
  drip.add(mesh(P.lathe([[0.04, 0.14], [0.62, 0.98], [0.64, 1.06]], 56), M.paper, { cast: false }));
  drip.add(mesh(new THREE.CircleGeometry(0.36, 40), M.crust, { p: [0, 0.52, 0], r: [-Math.PI / 2, 0, 0] }));
  const drop = mesh(new THREE.SphereGeometry(0.025, 10, 8), M.coffee, { cast: false }); v60.add(drop);
  // Chemex
  const chemex = new THREE.Group(); chemex.position.set(-1.1, 0, -0.2); g.add(chemex);
  chemex.add(mesh(P.lathe([[0, 0], [0.55, 0], [0.68, 0.15], [0.71, 0.45], [0.52, 0.85], [0.21, 1.14], [0.2, 1.26], [0.44, 1.55], [0.62, 1.96], [0.64, 2.02]], 72), M.glass, { cast: false }));
  chemex.add(mesh(P.lathe([[0, 0.02], [0.54, 0.02], [0.66, 0.16], [0.69, 0.38], [0, 0.38]]), M.coffee));
  chemex.add(mesh(P.lathe([[0.215, 1.0], [0.33, 1.05], [0.37, 1.2], [0.33, 1.36], [0.215, 1.42], [0.215, 1.0]], 48), M.woodLight));
  chemex.add(mesh(new THREE.TorusGeometry(0.375, 0.016, 8, 48), M.leather, { p: [0, 1.2, 0], r: [Math.PI / 2, 0, 0] }));
  chemex.add(mesh(new THREE.SphereGeometry(0.05, 12, 10), M.woodLight, { p: [0.39, 1.12, 0.06] }));
  chemex.add(mesh(P.lathe([[0.18, 1.3], [0.42, 1.6], [0.6, 2.0], [0.62, 2.1]], 48), M.paper, { cast: false }));
  // French press
  const press = new THREE.Group(); press.position.set(1.1, 0, 0); g.add(press);
  press.add(mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.3, 56, 1, true), M.glass, { p: [0, 0.72, 0], cast: false }));
  press.add(mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.86, 48), new THREE.MeshPhysicalMaterial({ color: '#2a150b', roughness: 0.2, transmission: 0.15, thickness: 0.5 }), { p: [0, 0.5, 0] }));
  press.add(mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 48), M.crust, { p: [0, 0.96, 0] }));
  press.add(mesh(new THREE.CylinderGeometry(0.53, 0.55, 0.16, 56, 1, true), M.steel, { p: [0, 0.08, 0] }));
  press.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.03, 56), M.steel, { p: [0, 0.015, 0] }));
  for (const a of [0.6, -0.6]) press.add(mesh(new THREE.BoxGeometry(0.06, 1.3, 0.02), M.steel, { p: [Math.sin(a + Math.PI / 2) * 0.5, 0.72, Math.cos(a + Math.PI / 2) * 0.5], r: [0, a + Math.PI / 2, 0] }));
  press.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.5, 1.15, 0), V(0.9, 1.1, 0), V(0.95, 0.4, 0), V(0.5, 0.3, 0)]), 30, 0.055, 10), M.blackSteel));
  press.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 56), M.steel, { p: [0, 1.4, 0] }));
  press.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 10), M.steel, { p: [0, 1.25, 0] }));
  press.add(mesh(new THREE.SphereGeometry(0.09, 16, 12), M.blackSteel, { p: [0, 1.75, 0] }));
  press.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 10), M.steel, { p: [0, 1.58, 0] }));
  const plunger = mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.03, 48), M.steelDark, { p: [0, 1.1, 0] }); press.add(plunger);
  // AeroPress on a mug
  const aero = new THREE.Group(); aero.position.set(3.3, 0, 0.1); g.add(aero);
  aero.add(mesh(P.lathe([[0, 0], [0.4, 0], [0.44, 0.05], [0.46, 0.7], [0.45, 0.72], [0.42, 0.72], [0.41, 0.08], [0, 0.07]]), M.ceramic));
  aero.add(mesh(new THREE.TorusGeometry(0.2, 0.05, 12, 30, Math.PI), M.ceramic, { p: [0.46, 0.38, 0], r: [0, 0, -Math.PI / 2] }));
  aero.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 6), M.smoke, { p: [0, 0.74, 0] }));
  aero.add(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 40), M.rubber, { p: [0, 0.8, 0] }));
  aero.add(mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.0, 48, 1, true), M.smoke, { p: [0, 1.3, 0], cast: true }));
  aero.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.42, 40), new THREE.MeshStandardMaterial({ color: '#2a150b', roughness: 0.3 }), { p: [0, 1.06, 0] }));
  const aeroPl = new THREE.Group(); aero.add(aeroPl);
  aeroPl.add(mesh(new THREE.CylinderGeometry(0.29, 0.29, 1.0, 40), M.smoke, { p: [0, 0.5, 0] }));
  aeroPl.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 40), M.rubber, { p: [0, 0.02, 0] }));
  aeroPl.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 40), M.smoke, { p: [0, 1.0, 0] }));
  return {
    group: g,
    rig: keyRig([[0, [0, 4.4, 10.5], [0, 1.0, 0]], [0.3, [-1.8, 3.2, 6.4], [-2.2, 1.1, 0]], [0.45, [-1.8, 3.2, 6.4], [-2.2, 1.1, 0]], [0.62, [2.6, 3.2, 6.4], [2.2, 1.1, 0]], [0.74, [2.6, 3.2, 6.4], [2.2, 1.1, 0]], [0.86, [1.0, 4.2, 9.2], [0.4, 1.0, 0]], [1, [1.0, 4.2, 9.2], [0.4, 1.0, 0]]]),
    anchors: [
      { key: 'v60', pos: V(-3.3, 2.25, 0), range: [0.08, 1] },
      { key: 'chemex', pos: V(-1.1, 2.35, -0.2), range: [0.08, 1] },
      { key: 'prensa', pos: V(1.1, 2.05, 0), range: [0.08, 1] },
      { key: 'aeropress', pos: V(3.3, 2.55, 0.1), range: [0.08, 1] },
    ],
    update(t, time) {
      const u = (time * 0.9) % 1;
      drop.position.set(0, 1.0 - u * 0.68, 0); drop.visible = u < 0.95;
      plunger.position.y = 1.1 - smooth(0.5, 0.75, t) * 0.12;
      aeroPl.position.y = 1.85 - smooth(0.62, 0.84, t) * 0.5;
    },
  };
}

/* ---------- Scene 5: history timeline ---------- */
function sceneHistoria(M) {
  const g = new THREE.Group();
  const STEP = 3.2, N = 10;
  const L = STEP * (N - 1) + 8;
  g.add(mesh(new THREE.BoxGeometry(L, 0.16, 1.3), M.wood, { p: [L / 2 - 4, 0.08, 0] }));
  g.add(mesh(new THREE.BoxGeometry(L, 0.02, 0.05), M.brass, { p: [L / 2 - 4, 0.17, 0.5] }));
  const props = [];
  const shrub = (h = 1.4, berries = 18, seed = 1) => leafyShrub(M, h, seed, berries);
  const book = () => { const b = new THREE.Group(); b.add(mesh(new THREE.BoxGeometry(0.9, 0.06, 0.66), M.leather, { p: [0, 0.03, 0] })); b.add(mesh(new THREE.BoxGeometry(0.86, 0.16, 0.62), M.paper, { p: [0.01, 0.14, 0] })); b.add(mesh(new THREE.BoxGeometry(0.9, 0.05, 0.66), M.leather, { p: [0, 0.245, 0] })); b.rotation.y = 0.3; return b; };
  const sack = (mat) => mesh(P.lathe([[0, 0], [0.42, 0], [0.5, 0.15], [0.52, 0.6], [0.42, 0.95], [0.22, 1.05], [0.26, 1.18], [0, 1.2]], 18), mat || M.burlap, { s: [1, 1, 0.75] });
  const cupSaucer = () => { const c = new THREE.Group(); c.add(mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.04, 40), M.ceramic)); c.add(mesh(P.lathe([[0, 0], [0.12, 0], [0.18, 0.08], [0.2, 0.26], [0.18, 0.26], [0.16, 0.1], [0, 0.08]]), M.ceramic, { p: [0, 0.02, 0] })); return c; };
  const potted = () => { const p = new THREE.Group(); p.add(mesh(P.lathe([[0, 0], [0.22, 0], [0.3, 0.4], [0.32, 0.44], [0, 0.4]]), M.terracotta)); p.add(mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.9, 6), M.wood, { p: [0, 0.85, 0] })); for (let i = 0; i < 5; i++) p.add(mesh(new THREE.SphereGeometry(0.12, 10, 8), M.hoja, { p: [Math.sin(i * 2.4) * 0.14, 0.6 + i * 0.13, Math.cos(i * 2.4) * 0.1], s: [1, 0.25, 0.55], r: [0, i, 0.4] })); return p; };
  const table = () => { const t = new THREE.Group(); t.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 48), M.marble, { p: [0, 0.8, 0] })); t.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 12), M.blackSteel, { p: [0, 0.4, 0] })); t.add(mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.04, 32), M.blackSteel, { p: [0, 0.02, 0] })); const c = cupSaucer(); c.position.y = 0.83; t.add(c); return t; };
  const uncertain = () => {
    const u = new THREE.Group();
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.03, 0.05), M.brass, 16); const d = new THREE.Object3D();
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; d.position.set(Math.cos(a) * 0.55, 0.02, Math.sin(a) * 0.55); d.rotation.set(0, -a + Math.PI / 2, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
    u.add(im);
    u.add(mesh(P.beanGeometry(), new THREE.MeshStandardMaterial({ color: '#8e9a6a', roughness: 0.6 }), { p: [0, 0.06, 0], s: 0.22, r: [Math.PI / 2, 0, 0.4] }));
    return u;
  };
  const builders = [() => shrub(1.6, 22, 3), book, () => sack(), cupSaucer, table, potted, () => shrub(1.0, 12, 8), uncertain, () => sack(), () => shrub(0.8, 0, 13)];
  for (let i = 0; i < N; i++) {
    const x = i * STEP;
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 32), i === 7 ? M.steelDark : M.brass, { p: [x, 0.19, 0.25] }));
    const pr = builders[i](); pr.position.set(x, 0.16, -0.25); pr.scale.setScalar(1.3); g.add(pr); props.push(pr);
  }
  const rig = (t) => {
    const u = clamp(t / 0.84);
    const x = -2 + u * (STEP * (N - 1) + 1);
    return { pos: V(x + 0.6, 2.6, 6.4), tgt: V(x + 2.2, 0.9, 0) };
  };
  return {
    group: g,
    rig,
    anchors: Array.from({ length: N }, (_, i) => ({ key: 'h' + i, pos: V(i * STEP, i === 4 ? 2.2 : i === 0 ? 2.9 : 1.9, -0.25), range: [0, 1], maxDist: 17 })),
    update(t, time) { props[0].rotation.y = Math.sin(time * 0.4) * 0.05; },
  };
}

/* ---------- Scene 6: Colombia relief, varieties, defects, diseases ---------- */
function sceneColombia(M, beanGeo) {
  const g = new THREE.Group();
  const K = 0.72, LON0 = -73.6, LAT0 = 4.2;
  const proj = (lon, lat) => [(lon - LON0) * K, -(lat - LAT0) * K];
  const shape = new THREE.Shape(P.COLOMBIA.map(([lo, la]) => { const [x, z] = proj(lo, la); return new THREE.Vector2(x, -z); }));
  const mapGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.08, bevelSegments: 3 });
  const clay = new THREE.MeshStandardMaterial({ map: P.speckTexture('#e3d3b7', ['#cdb998', '#efe3cc', '#c2ab86'], 5000, 33, 512), roughness: 0.92 });
  g.add(mesh(mapGeo, clay, { r: [-Math.PI / 2, 0, 0] }));
  const TOP = 0.38;
  // three cordilleras and the Sierra Nevada as faceted peaks
  const ranges = [
    [[1.0, -77.6], [1.8, -77.0], [3.5, -76.6], [5.5, -76.15], [7.0, -76.25]],
    [[1.6, -76.6], [3.0, -76.2], [4.5, -75.4], [6.0, -75.35], [7.7, -75.25]],
    [[2.0, -76.1], [3.0, -75.3], [4.6, -74.1], [6.0, -72.95], [7.4, -72.5], [8.5, -73.0], [9.6, -72.95]],
  ];
  const peaks = [];
  const r = P.rng(41);
  ranges.forEach((line, li) => {
    for (let s = 0; s < line.length - 1; s++) {
      const [la0, lo0] = line[s], [la1, lo1] = line[s + 1];
      const steps = Math.ceil(Math.hypot(la1 - la0, lo1 - lo0) / 0.22);
      for (let k = 0; k < steps; k++) {
        const u = k / steps;
        const [x, z] = proj(lo0 + (lo1 - lo0) * u + (r() - 0.5) * 0.35, la0 + (la1 - la0) * u + (r() - 0.5) * 0.35);
        peaks.push({ x, z, h: 0.35 + r() * 0.45 + (li === 1 ? 0.15 : 0), w: 0.28 + r() * 0.16, snow: false });
      }
    }
  });
  for (let i = 0; i < 16; i++) { const [x, z] = proj(-73.7 + (r() - 0.5) * 1.0, 10.85 + (r() - 0.5) * 0.6); peaks.push({ x, z, h: 0.7 + r() * 0.6, w: 0.3 + r() * 0.15, snow: i < 5 }); }
  const peakMat = new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true });
  const pm = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), peakMat, peaks.length);
  const d = new THREE.Object3D(), c = new THREE.Color();
  peaks.forEach((p, i) => {
    d.position.set(p.x, TOP + p.h / 2, p.z); d.scale.set(p.w, p.h, p.w); d.rotation.set(0, r() * 3, 0); d.updateMatrix(); pm.setMatrixAt(i, d.matrix);
    c.set(p.snow ? '#f1ece2' : p.h > 0.75 ? '#7a6a4c' : '#5f7a4a'); c.offsetHSL(0, 0, (r() - 0.5) * 0.06); pm.setColorAt(i, c);
  });
  pm.castShadow = true; pm.receiveShadow = true; g.add(pm);
  // six regions with a described cup profile in the book
  const regions = { narino: [-77.3, 1.3], cauca: [-76.7, 2.45], huila: [-75.6, 2.4], antioquia: [-75.6, 6.9], santander: [-73.3, 6.75], sierra: [-73.7, 10.85] };
  const anchors = [];
  Object.entries(regions).forEach(([k, [lo, la]]) => {
    const [x, z] = proj(lo, la);
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 6), M.blackSteel, { p: [x, TOP + 0.6, z] }));
    g.add(mesh(new THREE.SphereGeometry(0.11, 18, 14), M.cereza, { p: [x, TOP + 1.22, z] }));
    anchors.push({ key: k, pos: V(x, TOP + 1.4, z), range: [0, 0.6] });
  });
  // defects tray: green coffee with six specimens in front
  const tray = new THREE.Group(); tray.position.set(8.4, 0, 1.6); g.add(tray);
  tray.add(mesh(new THREE.BoxGeometry(3.6, 0.12, 2.4), M.woodLight, { p: [0, 0.06, 0] }));
  tray.add(P.scatter(beanGeo, new THREE.MeshStandardMaterial({ roughness: 0.55 }), 160, (i, rr) => ({ x: (rr() - 0.5) * 3.2, y: 0.17, z: -0.25 - rr() * 0.85, s: 0.16, rx: -Math.PI / 2, ry: 0, rz: rr() * 6.28 }), ['#8e9a6a', '#a3a878', '#7d8a5c', '#9aa070', '#b0ae80'], 140));
  const spec = [
    { k: 'negro', col: '#1c1410' }, { k: 'vinagre', col: '#7a4a22' }, { k: 'brocado', col: '#8e9a6a', hole: true },
    { k: 'partido', col: '#97a070', half: true }, { k: 'inmaduro', col: '#cbc68f' }, { k: 'sintrillar', col: '#d9c69c', big: true },
  ];
  spec.forEach((s, i) => {
    const x = -1.4 + i * 0.56;
    const b = mesh(beanGeo, new THREE.MeshStandardMaterial({ color: s.col, roughness: s.k === 'negro' ? 0.4 : 0.6 }), { p: [x, 0.2, 0.65], r: [-Math.PI / 2, 0, 0.3], s: [0.3 * (s.half ? 0.55 : 1) * (s.big ? 1.15 : 1), 0.3 * (s.big ? 1.15 : 1), 0.3] });
    tray.add(b);
    if (s.hole) tray.add(mesh(new THREE.SphereGeometry(0.03, 10, 8), M.rubber, { p: [x - 0.08, 0.27, 0.62] }));
    anchors.push({ key: s.k, pos: V(8.4 + x, 0.45, 1.6 + 0.65), range: [0.6, 0.86], small: true });
  });
  // coffee leaf with rust
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(0.7, 0.55, 1.6, 0); leafShape.quadraticCurveTo(0.7, -0.55, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 16);
  const uv = leafGeo.attributes.uv, pp = leafGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) { uv.setXY(i, pp.getX(i) / 1.6, pp.getY(i) / 1.1 + 0.5); pp.setZ(i, Math.sin(pp.getX(i) * 2) * 0.08 - Math.abs(pp.getY(i)) * 0.25); }
  leafGeo.computeVertexNormals();
  const leaf = mesh(leafGeo, new THREE.MeshStandardMaterial({ map: P.rustLeafTexture(), roughness: 0.55, side: THREE.DoubleSide }), { p: [6.6, 0.06, -1.3], r: [-Math.PI / 2, 0, 0.5], s: 1.3 });
  g.add(leaf);
  anchors.push({ key: 'roya', pos: V(7.6, 0.5, -1.7), range: [0.82, 1] });
  // three plants at their sizes: Cenicafe 1 low, Castillo medium, Geisha tall
  [[9.0, 1.0, 'cenicafe'], [10.3, 1.5, 'castillo'], [11.7, 2.2, 'geisha']].forEach(([x, h, k], i) => {
    const sh = leafyShrub(M, h, 60 + i, 14); sh.position.set(x, 0, -2.4); g.add(sh);
    anchors.push({ key: k, pos: V(x, h + 0.25, -2.4), range: [0.86, 1] });
  });
  return {
    group: g,
    rig: keyRig([[0, [0.5, 14.5, 9.5], [0.3, 0, 0.3]], [0.3, [-0.6, 9.5, 8.2], [-0.8, 0.4, -0.6]], [0.58, [-1.6, 6.8, 5.6], [-1.4, 0.4, -2.6]], [0.74, [8.9, 3.2, 5.6], [8.9, 0.2, 1.6]], [0.9, [10.2, 3.6, 4.6], [10.0, 0.8, -1.4]], [1, [10.2, 3.6, 4.6], [10.0, 0.8, -1.4]]]),
    anchors,
    update() {},
  };
}

export function createWorld(canvas, pinEls, opts = {}) {
  const small = Math.min(innerWidth, innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.75 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const bg = new THREE.Color(opts.background || '#f3ece1');
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 34, 80);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;
  pmrem.dispose();

  const hemi = new THREE.HemisphereLight('#fff6e8', '#6b5440', 0.35); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe9cc', 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 });
  sun.shadow.radius = 5; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 120), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(200, -0.6, 0); ground.receiveShadow = true; scene.add(ground);

  const M = materials();
  const beanGeo = P.beanGeometry(18, 12);
  const builders = [sceneCata, sceneVideo, sceneVideo, sceneMetodos, sceneHistoria, sceneColombia];
  const scenes = builders.map((b, i) => {
    const s = b(M, beanGeo);
    s.group.position.set(i * SPACING, i === 2 || i === 4 || i === 5 ? -0.6 : 0, 0);
    s.group.visible = i === 0;
    scene.add(s.group);
    return s;
  });

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 160);
  const pins = new Map();
  pinEls.forEach((el) => pins.set(el.dataset.pin, el));
  let W = 1, H = 1, layout = 'wide';
  function resize() {
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    layout = W >= 900 ? 'wide' : 'narrow';
    camera.fov = W / H < 0.8 ? 52 : W / H < 1.2 ? 44 : 36;
    if (layout === 'wide') camera.setViewOffset(W, H, -W * 0.19, 0, W, H);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  resize();

  const tmp = new THREE.Vector3();
  let active = 0, opacity = 1;
  function update(p, time) {
    const i = clamp(Math.floor(p), 0, 5);
    let t = i === 5 ? clamp(p - 5) : p - i;
    let show = i, tt = t, b = 0;
    if (i < 5 && t > 0.88) { b = smooth(0.88, 1, t); if (b >= 0.5) { show = i + 1; tt = 0; } }
    opacity = 1 - Math.sin(b * Math.PI) * 0.97;
    if (show !== active) { scenes[active].group.visible = false; active = show; }
    scenes[active].group.visible = true;
    const s = scenes[active], off = s.group.position;
    const rig = s.rig(show === i ? Math.min(tt, 1) : 0);
    let pos = rig.pos.clone(), tgt = rig.tgt.clone();
    const aspect = W / H;
    const pull = (aspect < 0.8 ? 1.45 : aspect < 1.2 ? 1.12 : 1) * 1.5;
    pos.sub(tgt).multiplyScalar(pull).add(tgt);
    camera.position.copy(pos).add(off);
    camera.lookAt(tmp.copy(tgt).add(off));
    sun.position.set(off.x + tgt.x + 7, 12, off.z + 7);
    sun.target.position.set(off.x + tgt.x, 0, 0);
    s.update(show === i ? tt : 0, time);
    canvas.style.opacity = opacity.toFixed(3);
    // HTML pins
    const localT = show === i ? tt : 0;
    pins.forEach((el) => { el.dataset.on = '0'; });
    camera.updateMatrixWorld();
    s.anchors.forEach((a) => {
      const el = pins.get(a.key); if (!el) return;
      if (localT < a.range[0] || localT > a.range[1]) return;
      tmp.copy(a.pos).add(off);
      if (a.maxDist && tmp.distanceTo(camera.position) > a.maxDist) return;
      tmp.project(camera);
      if (tmp.z > 1 || tmp.x > 0.86 || Math.abs(tmp.y) > 0.92) return;
      if (layout === 'wide' ? tmp.x < 0.08 : tmp.x < -0.86) return;
      el.style.transform = `translate3d(${((tmp.x + 1) / 2 * W).toFixed(1)}px, ${((1 - tmp.y) / 2 * H).toFixed(1)}px, 0)`;
      el.dataset.on = '1';
    });
    state.show = show; state.t = localT; state.opacity = opacity; state.video = !!s.video;
    return state;
  }
  const state = { show: 0, t: 0, opacity: 1, video: false };
  // a video scene covers the canvas, so the WebGL frame is skipped while it is on screen
  function render() { if (!state.video || state.opacity < 0.98) renderer.render(scene, camera); }
  function setBackground(col) { bg.set(col); scene.fog.color.set(col); }
  // Adaptive quality: 2 full, 1 pixel ratio 1, 0 also without shadows.
  function setQuality(q) {
    if (q < 2) renderer.setPixelRatio(1);
    if (q < 1) sun.castShadow = false;
    resize();
  }
  return { update, render, resize, setBackground, setQuality, renderer };
}
