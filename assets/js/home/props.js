// Procedural props for the home scenes. No external models: every object is
// built from three.js primitives (LatheGeometry, ExtrudeGeometry, instancing)
// plus small canvas textures, so the page ships no paid or licensed assets.
import * as THREE from 'three';

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Wood with long grain, used for tables, trays, the timeline plank.
export function woodTexture(base = '#6e4a30', seed = 3) {
  const r = rng(seed);
  return canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y = r() * h, amp = 2 + r() * 8, f = 0.002 + r() * 0.01, ph = r() * 6;
      const dark = r() < 0.6;
      g.strokeStyle = dark ? `rgba(40,22,10,${0.05 + r() * 0.16})` : `rgba(255,220,170,${0.03 + r() * 0.07})`;
      g.lineWidth = 0.6 + r() * 2.4;
      g.beginPath();
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * f + ph) * amp);
      g.stroke();
    }
    for (let i = 0; i < 6; i++) { // knots
      const x = r() * w, y = r() * h;
      const gr = g.createRadialGradient(x, y, 1, x, y, 14 + r() * 18);
      gr.addColorStop(0, 'rgba(35,18,8,.55)'); gr.addColorStop(1, 'rgba(35,18,8,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 40, 12, 0, 0, 7); g.fill();
    }
  });
}

// Speckled noise used for ceramics, paper and the coffee crust.
export function speckTexture(base, specks, n = 4000, seed = 5, size = 512) {
  const r = rng(seed);
  return canvasTex(size, size, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      g.fillStyle = specks[(r() * specks.length) | 0];
      g.globalAlpha = 0.25 + r() * 0.75;
      const s = 0.6 + r() * 2.6;
      g.fillRect(r() * w, r() * h, s, s);
    }
    g.globalAlpha = 1;
  });
}

export function softDot() {
  return canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.45, 'rgba(255,255,255,.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
}

// A cupping score sheet: ruled rows and empty circles, no text.
export function sheetTexture() {
  return canvasTex(512, 700, (g, w, h) => {
    g.fillStyle = '#f7f1e6'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(42,29,21,.35)'; g.lineWidth = 2;
    g.strokeRect(24, 24, w - 48, h - 48);
    g.fillStyle = 'rgba(168,50,42,.85)'; g.fillRect(24, 24, w - 48, 34);
    for (let row = 0; row < 10; row++) {
      const y = 100 + row * 56;
      g.strokeStyle = 'rgba(42,29,21,.25)'; g.beginPath(); g.moveTo(40, y + 30); g.lineTo(w - 40, y + 30); g.stroke();
      g.fillStyle = 'rgba(42,29,21,.55)'; g.fillRect(44, y + 8, 90 + (row * 37) % 60, 6);
      for (let k = 0; k < 6; k++) {
        g.beginPath(); g.arc(250 + k * 38, y + 12, 9, 0, 7);
        g.strokeStyle = 'rgba(42,29,21,.45)'; g.stroke();
        if ((row * 7 + k * 3) % 11 === 0) { g.fillStyle = 'rgba(42,29,21,.7)'; g.fill(); }
      }
    }
  });
}

// Coffee leaf with rust spots (yellow-brown patches with orange powder, as the book describes).
export function rustLeafTexture() {
  const r = rng(11);
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#3f5b3a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(200,220,170,.35)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    g.lineWidth = 1.4;
    for (let i = 1; i < 9; i++) {
      const x = i * w / 9;
      g.beginPath(); g.moveTo(x, h / 2); g.quadraticCurveTo(x + 30, h / 2 - 50, x + 60, 10); g.stroke();
      g.beginPath(); g.moveTo(x, h / 2); g.quadraticCurveTo(x + 30, h / 2 + 50, x + 60, h - 10); g.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const x = 60 + r() * (w - 120), y = 40 + r() * (h - 80), s = 8 + r() * 22;
      const gr = g.createRadialGradient(x, y, 0, x, y, s);
      gr.addColorStop(0, 'rgba(232,128,30,.95)');
      gr.addColorStop(0.55, 'rgba(196,150,60,.75)');
      gr.addColorStop(1, 'rgba(196,150,60,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
    }
  });
}

// A coffee bean: elongated ellipsoid, one flat face with an S-shaped centre cut.
export function beanGeometry(ws = 28, hs = 18) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let x = v.x * 0.62, y = v.y * 0.45, z = v.z * 0.36;
    if (z > 0) {
      z *= 0.5;
      const yc = y - 0.05 * Math.sin(x * 4.5);
      z -= Math.exp(-Math.pow(yc / 0.055, 2)) * 0.1 * (1 - v.x * v.x);
    }
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

// Cherry (fresh) or dried cherry (wrinkled) depending on amount.
export function cherryGeometry(wrinkle = 0, ws = 32, hs = 24) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 9.1 + v.y * 4.3) * Math.sin(v.z * 8.7 - v.y * 6.1) + Math.sin(v.y * 15 + v.x * 3);
    const s = 1 + wrinkle * n * 0.06;
    p.setXYZ(i, v.x * s, v.y * 1.08 * s, v.z * 0.94 * s);
  }
  g.computeVertexNormals();
  return g;
}

export function lathe(points, seg = 64) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg);
}

// Scatter beans (or anything) as one InstancedMesh with per-instance colour variation.
export function scatter(geo, mat, count, place, colors, seed = 7) {
  const r = rng(seed);
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), pos = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const o = place(i, r);
    pos.set(o.x, o.y, o.z);
    e.set(o.rx ?? r() * 6.28, o.ry ?? r() * 6.28, o.rz ?? r() * 6.28);
    q.setFromEuler(e);
    const k = o.s ?? 1;
    s.set(k * (o.sx ?? 1), k * (o.sy ?? 1), k * (o.sz ?? 1));
    m.compose(pos, q, s);
    mesh.setMatrixAt(i, m);
    if (colors) {
      c.set(colors[(r() * colors.length) | 0]);
      c.offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.08, (r() - 0.5) * 0.08);
      mesh.setColorAt(i, c);
    }
  }
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

// Stylized outline of Colombia (lon, lat). Coarse on purpose: a relief map, not a survey.
export const COLOMBIA = [
  [-77.36, 8.67], [-76.9, 8.1], [-76.75, 8.5], [-76.3, 8.85], [-75.6, 9.45], [-75.6, 10.0], [-75.5, 10.45],
  [-75.2, 10.8], [-74.8, 11.05], [-74.2, 11.25], [-73.3, 11.3], [-72.6, 11.75], [-71.95, 12.3], [-71.6, 12.45],
  [-71.15, 12.05], [-71.4, 11.6], [-72.25, 11.1], [-72.9, 10.4], [-73.1, 9.3], [-72.75, 9.1], [-72.35, 8.2],
  [-72.45, 7.45], [-71.9, 7.0], [-70.7, 7.05], [-70.1, 6.95], [-69.4, 6.1], [-67.45, 6.2], [-67.85, 5.3],
  [-67.6, 4.2], [-67.8, 2.8], [-67.2, 2.0], [-68.2, 1.75], [-69.85, 1.7], [-69.45, 1.05], [-70.05, 0.55],
  [-69.6, 0.05], [-69.4, -1.1], [-69.95, -4.2], [-70.75, -3.8], [-70.05, -2.7], [-71.4, -2.3], [-72.9, -2.45],
  [-73.65, -1.25], [-74.8, -0.2], [-75.6, 0.1], [-76.4, 0.4], [-77.4, 0.4], [-78.85, 1.45], [-78.6, 2.2],
  [-77.75, 2.65], [-77.25, 3.6], [-77.45, 4.4], [-77.35, 5.6], [-77.55, 6.6], [-77.9, 7.25], [-77.36, 8.67],
];
