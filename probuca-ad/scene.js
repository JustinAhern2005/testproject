import * as THREE from 'three';
import { CONFIG } from './config.js';

const W = 1920, H = 1080, DURATION = 30;
const C = CONFIG.colors;

// ---------- helpers ----------
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 4);
const easeInOut = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, t) => a + (b - a) * t;
const range = (t, a, b) => clamp01((t - a) / (b - a));

// ---------- copy ----------
const $ = (id) => document.getElementById(id);
document.documentElement.style.setProperty('--pink', C.pink);
document.documentElement.style.setProperty('--coral', C.coral);
document.querySelectorAll('.t1').forEach((el) => (el.textContent = CONFIG.taglineLines[0]));
document.querySelectorAll('.t2').forEach((el) => (el.textContent = CONFIG.taglineLines[1]));
$('eyebrow').textContent = CONFIG.eyebrow;
$('headline').innerHTML = CONFIG.headline;
$('welcome').textContent = CONFIG.welcome;
$('name').textContent = CONFIG.name;
$('spec').textContent = CONFIG.specialty;
$('join').textContent = CONFIG.joinLine;
$('date').innerHTML = CONFIG.dateLine;
$('cta').textContent = CONFIG.cta;
$('url').textContent = CONFIG.url;
$('addr').textContent = CONFIG.address;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.white);
const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 200);
scene.add(camera);

scene.add(new THREE.AmbientLight(0xffffff, 1.25));
const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(2, 3, 10); scene.add(key);
const side = new THREE.DirectionalLight(0xffffff, 0.8); side.position.set(-10, -4, 2); scene.add(side);

// Black wipe for the closing section (the site alternates white and black blocks).
const wipe = new THREE.Mesh(new THREE.PlaneGeometry(90, 45), new THREE.MeshBasicMaterial({ color: C.black }));
wipe.position.z = -60; camera.add(wipe);

// ---------- the Probuca mark, rebuilt in 3D ----------
// Grid unit = 1. Three squares form a cross, a "D" (square + half-circle) makes the P.
const STROKE = 0.022, DEPTH = 0.14, h = STROKE / 2;
const markMat = new THREE.MeshStandardMaterial({ color: C.pink, roughness: 0.55, metalness: 0 });

function squareShape(x0, y0) {
  const s = new THREE.Shape();
  s.moveTo(x0 - h, y0 - h); s.lineTo(x0 + 1 + h, y0 - h); s.lineTo(x0 + 1 + h, y0 + 1 + h); s.lineTo(x0 - h, y0 + 1 + h); s.closePath();
  const hole = new THREE.Path();
  hole.moveTo(x0 + h, y0 + h); hole.lineTo(x0 + h, y0 + 1 - h); hole.lineTo(x0 + 1 - h, y0 + 1 - h); hole.lineTo(x0 + 1 - h, y0 + h); hole.closePath();
  s.holes.push(hole); return s;
}
function dShape() {
  const s = new THREE.Shape();
  s.moveTo(1 - h, 1 - h); s.lineTo(2, 1 - h); s.absarc(2, 2, 1 + h, -Math.PI / 2, Math.PI / 2, false); s.lineTo(1 - h, 3 + h); s.closePath();
  const hole = new THREE.Path();
  hole.moveTo(1 + h, 1 + h); hole.lineTo(1 + h, 3 - h); hole.lineTo(2, 3 - h); hole.absarc(2, 2, 1 - h, Math.PI / 2, -Math.PI / 2, true); hole.closePath();
  s.holes.push(hole); return s;
}

const mark = new THREE.Group(); scene.add(mark);
const PIECES = [
  { shape: dShape(), center: [1.75, 2.0], dir: [1.1, 1.0, -0.6], spin: [0.6, -1.2, 0.5], start: [5, 6, -8] },
  { shape: squareShape(0, 1), center: [0.5, 1.5], dir: [-1.3, 0.25, 0.9], spin: [-0.8, 0.9, -0.3], start: [-9, 2, 4] },
  { shape: squareShape(1, 1), center: [1.5, 1.5], dir: [0.0, 0.0, 1.3], spin: [0.2, 0.7, 0.4], start: [1, -1, 9] },
  { shape: squareShape(1, 0), center: [1.5, 0.5], dir: [0.25, -1.3, 0.5], spin: [1.1, 0.4, -0.7], start: [2, -9, -3] },
].map((p, i) => {
  const geo = new THREE.ExtrudeGeometry(p.shape, { depth: DEPTH, bevelEnabled: false, curveSegments: 96 });
  geo.translate(-p.center[0], -p.center[1], -DEPTH / 2);
  const mesh = new THREE.Mesh(geo, markMat);
  mark.add(mesh);
  return { ...p, i, mesh, home: new THREE.Vector3(p.center[0] - 1.5, p.center[1] - 1.5, 0) };
});

// Portrait, seated inside the centre square of the mark.
let photoLoaded; const photoReady = new Promise((r) => (photoLoaded = r));
const photoTex = new THREE.TextureLoader().load(CONFIG.photo, photoLoaded);
photoTex.colorSpace = THREE.SRGBColorSpace; photoTex.anisotropy = 8;
const photoMat = new THREE.ShaderMaterial({
  transparent: true, toneMapped: false,
  uniforms: { map: { value: photoTex }, uReveal: { value: 0 }, uZoom: { value: 1 }, uOpacity: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D map; uniform float uReveal; uniform float uZoom; uniform float uOpacity; varying vec2 vUv;
    void main(){
      vec2 uv = (vUv - 0.5) / uZoom + 0.5;
      vec4 c = texture2D(map, uv);
      float m = smoothstep(vUv.y - 0.02, vUv.y, uReveal * 1.04);
      gl_FragColor = vec4(c.rgb, m * uOpacity);
      #include <colorspace_fragment>
    }`,
});
const PHOTO = 1 - STROKE * 2.2;
const photo = new THREE.Mesh(new THREE.PlaneGeometry(PHOTO, PHOTO), photoMat);
PIECES[2].mesh.add(photo); // travels with the centre square

// ---------- mark choreography ----------
// Group keyframes: [time, x, y, z, rotX, rotY, scale]
const XSQ = -3.36; // puts the centre square on the left third for the portrait
const KEYS = [
  [0.0, 3.1, -0.1, 0, 0.30, 0.95, 1.3],
  [4.6, 3.1, -0.1, 0, 0.03, 0.08, 1.3],
  [6.4, 3.2, -0.1, 0, -0.02, -0.06, 1.3],
  [9.2, 3.5, 0.0, 0, 0.22, -0.65, 1.2],
  [10.4, 3.5, 0.0, 0, 0.1, -0.45, 1.2],
  [12.6, XSQ, 0.0, 0, 0.0, 0.08, 3.93],
  [14.8, XSQ, 0.0, 0, 0.0, 0.02, 3.93],
  [21.8, XSQ + 0.1, 0.0, 0, 0.0, -0.04, 3.93],
  [24.2, -3.6, 0.0, 0, 0.12, 0.55, 1.3],
  [26.6, -3.6, 0.0, 0, 0.0, 0.06, 1.3],
  [30.0, -3.6, 0.0, 0, 0.0, -0.06, 1.3],
];
const cr = (p0, p1, p2, p3, u) => {
  const u2 = u * u, u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
};
function sampleKeys(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const k = (j) => KEYS[Math.min(KEYS.length - 1, Math.max(0, j))];
  const u = easeInOut((t - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0]));
  return [1, 2, 3, 4, 5, 6].map((a) => cr(k(i - 1)[a], k(i)[a], k(i + 1)[a], k(i + 2)[a], u));
}

// ---------- overlay animation ----------
const animEls = [...document.querySelectorAll('[data-in]')];
function updateOverlay(t) {
  for (const el of animEls) {
    const tin = +el.dataset.in, tout = el.dataset.out ? +el.dataset.out : 1e9;
    const pin = easeOut(range(t, tin, tin + 0.9)), pout = smooth(range(t, tout, tout + 0.5));
    el.style.opacity = (pin * (1 - pout)).toFixed(3);
    if (el.dataset.kind === 'line') { el.style.transform = `scaleX(${pin * (1 - pout)})`; continue; }
    if (el.dataset.kind === 'soft') continue;
    const dy = el.dataset.dy ? +el.dataset.dy : 28;
    el.style.transform = `translateY(${((1 - pin) * dy - pout * 14).toFixed(2)}px)`;
  }
}

// ---------- per-frame update ----------
const tmp = new THREE.Vector3();
const pinkC = new THREE.Color(C.pink), coralC = new THREE.Color(C.coral);
function update(t) {
  camera.position.set(Math.sin(t * 0.3) * 0.15, Math.cos(t * 0.23) * 0.1, 12);
  camera.lookAt(0, 0, 0);

  const [x, y, z, rx, ry, s] = sampleKeys(t);
  mark.position.set(x, y + Math.sin(t * 0.7) * 0.04, z);
  mark.rotation.set(rx, ry, 0);
  mark.scale.set(s, s, Math.min(s, 1.6)); // keep the walls thin when the mark is blown up

  // Pieces: fly in and lock together, open up during the announcement, re-form for the portrait,
  // and fly apart/re-form again on the way to the closing card.
  const explode = smooth(range(t, 6.6, 9.0)) * (1 - easeInOut(range(t, 10.4, 12.4)));
  const burst = Math.sin(Math.PI * range(t, 21.9, 24.3)) * 0.9;
  for (const p of PIECES) {
    const a = easeOut(range(t, 0.3 + p.i * 0.32, 3.1 + p.i * 0.32));
    const e = explode * 0.9 + burst;
    tmp.set(...p.start).multiplyScalar(1 - a);
    p.mesh.position.copy(p.home).add(tmp).add(new THREE.Vector3(...p.dir).multiplyScalar(e * 0.55));
    p.mesh.rotation.set(
      p.spin[0] * (3.2 * (1 - a) + e * 0.8),
      p.spin[1] * (3.2 * (1 - a) + e * 0.8),
      p.spin[2] * (3.2 * (1 - a) + e * 0.5));
  }

  // Brand pink on white, coral on black (both are used on probuca.ca).
  markMat.color.copy(pinkC).lerp(coralC, smooth(range(t, 22.6, 23.8)));

  // Portrait reveal inside the centre square.
  photoMat.uniforms.uReveal.value = easeInOut(range(t, 12.8, 14.2));
  photoMat.uniforms.uZoom.value = lerp(1.12, 1.0, easeOut(range(t, 12.8, 16))) + range(t, 16, 22) * 0.03;
  photoMat.uniforms.uOpacity.value = 1 - smooth(range(t, 21.7, 22.3));
  photo.visible = t > 12.6 && t < 22.4;

  wipe.position.y = lerp(-45, 0, easeInOut(range(t, 22.3, 23.5)));

  updateOverlay(t);
  renderer.render(scene, camera);
}

// ---------- boot ----------
const ready = Promise.all([document.fonts.ready, photoReady]);
ready.then(() => { // shrink a long name to fit its column
  const el = $('name'); let size = 76;
  while (el.scrollWidth > 470 && size > 40) el.style.fontSize = (size -= 2) + 'px';
});
window.renderAt = async (t) => { await ready; update(t); return true; };
window.DURATION = DURATION;

function fit() { const k = Math.min(innerWidth / W, innerHeight / H); $('stage').style.transform = `scale(${k})`; }
addEventListener('resize', fit); fit();

const params = new URLSearchParams(location.search);
if (params.has('t')) window.renderAt(+params.get('t'));
else if (!params.has('render')) ready.then(() => {
  const start = performance.now();
  const loop = () => { update(((performance.now() - start) / 1000) % DURATION); requestAnimationFrame(loop); };
  loop();
});
