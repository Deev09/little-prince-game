import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/* ================================================================
   The Little Prince — Journey to the Rose
   First-person planet-hopping through a starfield.
   Reach the rose. Don't get hit by an asteroid.
   ================================================================ */

// ---------------- Renderer / scene / camera ----------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050311);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 4000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.prepend(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.6, 0.55);
composer.addPass(bloomPass);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ---------------- Helpers ----------------

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function randomDir() {
  const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  return v.lengthSq() < 1e-6 ? new THREE.Vector3(0, 1, 0) : v.normalize();
}

function glowTexture(inner, mid) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, mid);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function makeGlowSprite(inner, mid, scale) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(inner, mid),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  sprite.scale.setScalar(scale);
  return sprite;
}

// ---------------- Sky: gradient dome, stars, nebulas, sun ----------------

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1800, 32, 32),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x0a0620) },
      bottom: { value: new THREE.Color(0x1b0f3a) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 bottom;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y * 0.5 + 0.5;
        gl_FragColor = vec4(mix(bottom, top, h), 1.0);
      }`,
  })
);
scene.add(sky);

function makeStarLayer(count, size, tint) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const dir = randomDir();
    const r = 900 + Math.random() * 700;
    positions[i * 3] = dir.x * r;
    positions[i * 3 + 1] = dir.y * r;
    positions[i * 3 + 2] = dir.z * r;
    color.copy(tint).multiplyScalar(0.5 + Math.random() * 0.5);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.4)'),
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  return points;
}

const starsA = makeStarLayer(2200, 5.5, new THREE.Color(0xffffff));
const starsB = makeStarLayer(900, 9, new THREE.Color(0xbfd4ff));
const starsC = makeStarLayer(500, 8, new THREE.Color(0xffe3b8));

const NEBULA_SPECS = [
  { color: ['rgba(140,90,220,0.55)', 'rgba(80,40,160,0.18)'], pos: [-700, 300, -1000], scale: 1400 },
  { color: ['rgba(70,150,220,0.45)', 'rgba(30,70,140,0.15)'], pos: [900, -200, -700], scale: 1100 },
  { color: ['rgba(220,110,160,0.4)', 'rgba(140,50,100,0.12)'], pos: [400, 500, 900], scale: 1200 },
  { color: ['rgba(90,200,190,0.3)', 'rgba(40,100,110,0.1)'], pos: [-800, -350, 600], scale: 1000 },
];
for (const spec of NEBULA_SPECS) {
  const sprite = makeGlowSprite(spec.color[0], spec.color[1], spec.scale);
  sprite.material.opacity = 0.5;
  sprite.position.set(...spec.pos);
  scene.add(sprite);
}

// Sun
const SUN_POS = new THREE.Vector3(-500, 350, 380);
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(30, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xfff3c4 })
);
sun.position.copy(SUN_POS);
scene.add(sun);
const sunGlow = makeGlowSprite('rgba(255,244,200,1)', 'rgba(255,190,110,0.45)', 260);
sunGlow.position.copy(SUN_POS);
scene.add(sunGlow);

const sunLight = new THREE.DirectionalLight(0xfff0d0, 2.4);
sunLight.position.copy(SUN_POS);
scene.add(sunLight);
scene.add(new THREE.HemisphereLight(0x8899ff, 0x2a1a3a, 0.55));
scene.add(new THREE.AmbientLight(0x404060, 0.6));

// ---------------- Planets ----------------

const PLANET_DEFS = [
  { name: 'Asteroid B-612 — Home', pos: [0, 0, 0], radius: 10, color: 0xd9a066, props: 'home' },
  { name: "The King's Planet", pos: [28, 10, -34], radius: 7, color: 0xc75b6e, props: 'king' },
  { name: "The Businessman's Planet", pos: [66, -4, -62], radius: 9, color: 0x8fb98a, props: 'coins' },
  { name: "The Lamplighter's Planet", pos: [96, 10, -92], radius: 6, color: 0x5aa9b8, props: 'lamp' },
  { name: "The Geographer's Planet", pos: [130, -4, -122], radius: 12, color: 0x8d7bd8, props: 'rocks' },
  { name: 'The Rose Planet', pos: [166, 8, -152], radius: 8, color: 0x79b76a, props: 'rose' },
];

const planets = [];

function bumpyNoise(v, seed) {
  return (
    Math.sin(v.x * 0.9 + seed) * Math.sin(v.y * 1.15 + seed * 2.1) * Math.sin(v.z * 1.3 + seed * 3.3)
  );
}

function surfaceAttach(group, mesh, dir, radius, sink = 0.05) {
  mesh.position.copy(dir).multiplyScalar(radius * (1 - sink));
  mesh.quaternion.setFromUnitVectors(Y_AXIS, dir);
  group.add(mesh);
}

function scatterProps(group, radius, baseColor) {
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4a8f4a, roughness: 1 });
  const rockMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColor).multiplyScalar(0.55),
    roughness: 1,
    flatShading: true,
  });
  const n = Math.floor(radius * 2.5);
  for (let i = 0; i < n; i++) {
    const dir = randomDir();
    if (Math.random() < 0.5) {
      const grass = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 5), grassMat);
      grass.geometry.translate(0, 0.27, 0);
      surfaceAttach(group, grass, dir, radius, 0.02);
    } else {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.25 + Math.random() * 0.4, 0),
        rockMat
      );
      surfaceAttach(group, rock, dir, radius, 0.03);
    }
  }
}

function buildVolcano(scale, glowing) {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(1.1 * scale, 1.5 * scale, 8),
    new THREE.MeshStandardMaterial({ color: 0x9a6a4a, roughness: 1, flatShading: true })
  );
  cone.position.y = 0.75 * scale;
  g.add(cone);
  if (glowing) {
    const lava = new THREE.Mesh(
      new THREE.SphereGeometry(0.35 * scale, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff7733 })
    );
    lava.position.y = 1.5 * scale;
    g.add(lava);
    const light = new THREE.PointLight(0xff7733, 25, 12, 2);
    light.position.y = 1.8 * scale;
    g.add(light);
  }
  return g;
}

function buildBaobab() {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5238, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e6b3a, roughness: 1, flatShading: true });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 3.2, 7), trunkMat);
  trunk.position.y = 1.6;
  g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0 - i * 0.15, 1), leafMat);
    puff.position.set((i - 1) * 0.9, 3.4 + (i % 2) * 0.5, (i - 1) * 0.4);
    g.add(puff);
  }
  return g;
}

function buildLamppost() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x2b3a4a, roughness: 0.6, metalness: 0.6 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 3.4, 8), metal);
  pole.position.y = 1.7;
  g.add(pole);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.4, 6), metal);
  cap.position.y = 3.7;
  g.add(cap);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0 })
  );
  bulb.position.y = 3.4;
  g.add(bulb);
  const glow = makeGlowSprite('rgba(255,220,160,0.9)', 'rgba(255,180,90,0.3)', 4);
  glow.position.y = 3.4;
  g.add(glow);
  const light = new THREE.PointLight(0xffcf8a, 90, 30, 2);
  light.position.y = 3.4;
  g.add(light);
  return g;
}

function buildCrown() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({
    color: 0xf2c14e,
    roughness: 0.35,
    metalness: 0.9,
    emissive: 0x553300,
  });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 12, 1, true), gold);
  band.position.y = 0.25;
  g.add(band);
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 4), gold);
    const a = (i / 6) * Math.PI * 2;
    spike.position.set(Math.cos(a) * 1.1, 0.85, Math.sin(a) * 1.1);
    g.add(spike);
  }
  return g;
}

let roseWorldPos = new THREE.Vector3();
let roseGlow = null;

function buildRose() {
  const g = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3f7a3f, roughness: 0.9 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 2.2, 8), stemMat);
  stem.position.y = 1.1;
  g.add(stem);
  for (const side of [-1, 1]) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), stemMat);
    leaf.scale.set(1, 0.22, 0.5);
    leaf.position.set(side * 0.45, 0.9 + (side + 1) * 0.2, 0);
    leaf.rotation.z = -side * 0.5;
    g.add(leaf);
  }
  const petalMat = new THREE.MeshStandardMaterial({
    color: 0xd8304a,
    roughness: 0.55,
    emissive: 0x66101d,
  });
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), petalMat);
  heart.position.y = 2.45;
  heart.scale.set(1, 1.15, 1);
  g.add(heart);
  for (let i = 0; i < 7; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 10), petalMat);
    const a = (i / 7) * Math.PI * 2;
    petal.scale.set(0.85, 1.1, 0.3);
    petal.position.set(Math.cos(a) * 0.32, 2.4, Math.sin(a) * 0.32);
    petal.lookAt(petal.position.clone().add(new THREE.Vector3(Math.cos(a), 1.4, Math.sin(a))));
    g.add(petal);
  }
  // glass globe
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 24, 24),
    new THREE.MeshPhongMaterial({
      color: 0xbfe8ff,
      transparent: true,
      opacity: 0.09,
      shininess: 120,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  dome.position.y = 1.4;
  g.add(dome);

  roseGlow = makeGlowSprite('rgba(255,150,180,0.95)', 'rgba(255,80,130,0.35)', 9);
  roseGlow.position.y = 2.4;
  g.add(roseGlow);
  const light = new THREE.PointLight(0xff88aa, 70, 34, 2);
  light.position.y = 2.6;
  g.add(light);
  g.scale.setScalar(1.4);
  return g;
}

PLANET_DEFS.forEach((def, index) => {
  const group = new THREE.Group();
  const center = new THREE.Vector3(...def.pos);
  group.position.copy(center);

  const geo = new THREE.IcosahedronGeometry(def.radius, 4);
  const posAttr = geo.attributes.position;
  const v = new THREE.Vector3();
  const seed = index * 7.13 + 1;
  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i);
    const n = bumpyNoise(v, seed);
    v.normalize().multiplyScalar(def.radius * (1 + n * 0.045));
    posAttr.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.95,
      flatShading: true,
      emissive: new THREE.Color(def.color).multiplyScalar(0.06),
    })
  );
  group.add(mesh);

  scatterProps(group, def.radius, def.color);

  if (def.props === 'home') {
    surfaceAttach(group, buildVolcano(1, true), randomDir(), def.radius);
    surfaceAttach(group, buildVolcano(0.7, false), randomDir(), def.radius);
    surfaceAttach(group, buildBaobab(), randomDir(), def.radius);
  } else if (def.props === 'king') {
    surfaceAttach(group, buildCrown(), new THREE.Vector3(0, 1, 0), def.radius);
  } else if (def.props === 'lamp') {
    surfaceAttach(group, buildLamppost(), new THREE.Vector3(0, 1, 0), def.radius);
  } else if (def.props === 'coins') {
    const gold = new THREE.MeshStandardMaterial({
      color: 0xf2c14e,
      roughness: 0.3,
      metalness: 0.9,
      emissive: 0x442b00,
    });
    for (let i = 0; i < 14; i++) {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 12), gold);
      surfaceAttach(group, coin, randomDir(), def.radius, 0.0);
    }
  } else if (def.props === 'rose') {
    const up = new THREE.Vector3(0, 1, 0);
    const rose = buildRose();
    surfaceAttach(group, rose, up, def.radius, 0.02);
    roseWorldPos = center.clone().add(up.clone().multiplyScalar(def.radius + 3));
  }

  scene.add(group);
  planets.push({ name: def.name, center, radius: def.radius, group });
});

const START_PLANET = planets[0];
const ROSE_PLANET = planets[planets.length - 1];

// ---------------- Asteroids ----------------

const CLUSTER_CENTER = new THREE.Vector3(83, 2, -76);
const asteroidMat = new THREE.MeshStandardMaterial({
  color: 0x9a8a7a,
  roughness: 1,
  flatShading: true,
  emissive: 0x1a0f08,
});
const asteroids = [];
let asteroidCount = 6;
const MAX_ASTEROIDS = 12;

function makeAsteroidMesh(size) {
  const geo = new THREE.DodecahedronGeometry(size, 1);
  const posAttr = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i);
    const n = bumpyNoise(v, size * 31.7);
    v.multiplyScalar(1 + n * 0.25);
    posAttr.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, asteroidMat);
}

function respawnAsteroid(a) {
  // aim at (or near) the player's planet most of the time, otherwise anywhere in the cluster
  const targetPlanet =
    Math.random() < 0.55 && player.planet ? player.planet : planets[(Math.random() * planets.length) | 0];
  const target = targetPlanet.center
    .clone()
    .add(randomDir().multiplyScalar(targetPlanet.radius * (0.4 + Math.random() * 1.6)));
  const dir = randomDir();
  a.mesh.position.copy(target).sub(dir.clone().multiplyScalar(260 + Math.random() * 120));
  a.vel = dir.multiplyScalar(14 + Math.random() * 18);
  a.spin.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
  a.alive = true;
  a.mesh.visible = true;
  a.glow.visible = true;
}

function spawnAsteroids() {
  while (asteroids.length < asteroidCount) {
    const size = 1 + Math.random() * 1.8;
    const mesh = makeAsteroidMesh(size);
    const glow = makeGlowSprite('rgba(255,180,110,0.8)', 'rgba(255,110,50,0.25)', size * 6);
    mesh.add(glow);
    scene.add(mesh);
    const a = { mesh, glow, size, vel: new THREE.Vector3(), spin: new THREE.Vector3(), alive: true };
    respawnAsteroid(a);
    asteroids.push(a);
  }
}

// Trail particles (shared pool, additive points fading to black)
const TRAIL_MAX = 700;
const trailGeo = new THREE.BufferGeometry();
const trailPos = new Float32Array(TRAIL_MAX * 3);
const trailCol = new Float32Array(TRAIL_MAX * 3);
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
const trailLife = new Float32Array(TRAIL_MAX);
let trailCursor = 0;
const trailPoints = new THREE.Points(
  trailGeo,
  new THREE.PointsMaterial({
    size: 1.4,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: glowTexture('rgba(255,200,140,1)', 'rgba(255,140,60,0.4)'),
  })
);
trailPoints.frustumCulled = false;
scene.add(trailPoints);

function emitTrail(pos) {
  const i = trailCursor;
  trailCursor = (trailCursor + 1) % TRAIL_MAX;
  trailPos[i * 3] = pos.x + (Math.random() - 0.5) * 0.6;
  trailPos[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.6;
  trailPos[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.6;
  trailLife[i] = 1;
}

function updateTrail(dt) {
  for (let i = 0; i < TRAIL_MAX; i++) {
    if (trailLife[i] > 0) {
      trailLife[i] = Math.max(0, trailLife[i] - dt * 1.4);
      const l = trailLife[i];
      trailCol[i * 3] = l;
      trailCol[i * 3 + 1] = l * 0.62;
      trailCol[i * 3 + 2] = l * 0.3;
    }
  }
  trailGeo.attributes.position.needsUpdate = true;
  trailGeo.attributes.color.needsUpdate = true;
}

// Impact flashes
const flashes = [];
function impactFlash(pos) {
  const s = makeGlowSprite('rgba(255,230,180,1)', 'rgba(255,140,60,0.5)', 2);
  s.position.copy(pos);
  scene.add(s);
  flashes.push({ sprite: s, t: 0 });
}
function updateFlashes(dt) {
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i];
    f.t += dt * 2.2;
    f.sprite.scale.setScalar(2 + f.t * 14);
    f.sprite.material.opacity = Math.max(0, 1 - f.t);
    if (f.t >= 1) {
      scene.remove(f.sprite);
      f.sprite.material.dispose();
      flashes.splice(i, 1);
    }
  }
}

// ---------------- Sound (tiny WebAudio synth) ----------------

const AudioFX = {
  ctx: null,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.ctx.destination);
      this.startAmbient();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, when = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },
  noise(dur, vol = 0.3) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
  },
  startAmbient() {
    for (const [f, v] of [[65.4, 0.028], [98, 0.02], [65.9, 0.018]]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.value = v;
      osc.connect(gain).connect(this.master);
      osc.start();
    }
  },
  jump() { this.tone(300, 0.2, 'sine', 0.16, 520); },
  boost() { this.tone(340, 0.4, 'sine', 0.12, 900); },
  land() { this.tone(150, 0.14, 'sine', 0.14, 85); },
  death() { this.noise(0.8, 0.5); this.tone(160, 0.9, 'sawtooth', 0.18, 40); },
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.7, 'sine', 0.16, null, i * 0.16));
  },
};

// ---------------- UI ----------------

const $ = (id) => document.getElementById(id);
const overlay = $('overlay');
const ovTitle = $('ovTitle');
const ovSub = $('ovSub');
const ovQuote = $('ovQuote');
const ovAction = $('ovAction');
const toast = $('toast');
const roseMarker = $('roseMarker');
const roseDist = $('roseDist');
const vignette = $('vignette');

let toastTimer = null;
function showToast(text, ms = 2600) {
  toast.textContent = text;
  toast.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.style.opacity = 0), ms);
}

function showOverlay(title, sub, quote, action) {
  ovTitle.textContent = title;
  ovSub.textContent = sub;
  ovQuote.innerHTML = quote;
  ovAction.textContent = action;
  overlay.classList.remove('hidden');
}

// ---------------- Player ----------------

const player = {
  pos: new THREE.Vector3(),      // feet position
  up: new THREE.Vector3(0, 1, 0),
  forward: new THREE.Vector3(0, 0, -1),
  vel: new THREE.Vector3(),
  pitch: 0,
  grounded: true,
  planet: START_PLANET,
  boostsLeft: 0,
  visited: new Set(),
};

const EYE_HEIGHT = 1.7;
const WALK_SPEED = 9;
const SPRINT_MULT = 1.7;
const JUMP_SPEED = 24;
const BOOST_IMPULSE = 22;
const MAX_BOOSTS = 2;

function resetPlayer(planet = START_PLANET) {
  player.planet = planet;
  player.up.set(0, 1, 0);
  player.pos.copy(planet.center).add(player.up.clone().multiplyScalar(planet.radius));
  // face along the chain of planets
  const next = planets[Math.min(planets.indexOf(planet) + 1, planets.length - 1)];
  player.forward.copy(next.center).sub(planet.center).normalize();
  player.forward.addScaledVector(player.up, -player.forward.dot(player.up)).normalize();
  player.vel.set(0, 0, 0);
  player.pitch = 0;
  player.grounded = true;
  player.boostsLeft = 0;
}
resetPlayer();
player.visited.add(START_PLANET.name);
spawnAsteroids();

// ---------------- Input ----------------

const keys = {};
let state = 'menu'; // menu | playing | paused | dead | won

addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (state !== 'playing') return;
  if (e.code === 'Space' && !e.repeat) {
    if (player.grounded) {
      // jump: current tangential motion + up
      const moveVel = currentMoveVelocity();
      player.vel.copy(moveVel).addScaledVector(player.up, JUMP_SPEED);
      player.grounded = false;
      player.boostsLeft = MAX_BOOSTS;
      AudioFX.jump();
    } else if (player.boostsLeft > 0) {
      const look = lookDirection();
      player.vel.addScaledVector(look, BOOST_IMPULSE);
      player.boostsLeft--;
      AudioFX.boost();
      for (let i = 0; i < 12; i++) emitTrail(player.pos);
    }
  }
  if (e.code === 'KeyR' && !e.repeat && !player.grounded) {
    softRespawn('You drift gently back down…');
  }
});
addEventListener('keyup', (e) => (keys[e.code] = false));

addEventListener('mousemove', (e) => {
  if (state !== 'playing' || document.pointerLockElement !== renderer.domElement) return;
  const sens = 0.0022;
  // yaw around up
  const q = new THREE.Quaternion().setFromAxisAngle(player.up, -e.movementX * sens);
  player.forward.applyQuaternion(q);
  player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * sens, -1.25, 1.35);
});

overlay.addEventListener('click', () => {
  AudioFX.ensure();
  if (state === 'dead' || state === 'won') {
    fullReset();
  }
  state = 'playing';
  overlay.classList.add('hidden');
  renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== renderer.domElement && state === 'playing') {
    state = 'paused';
    showOverlay(
      'A Moment of Stillness',
      'PAUSED',
      '“It is the time you have wasted for your rose that makes your rose so important.”',
      'Click to continue'
    );
  }
});

// ---------------- Movement ----------------

function lookDirection() {
  return player.forward
    .clone()
    .multiplyScalar(Math.cos(player.pitch))
    .addScaledVector(player.up, Math.sin(player.pitch))
    .normalize();
}

function inputAxes() {
  let x = 0, z = 0;
  if (keys['KeyW'] || keys['ArrowUp']) z += 1;
  if (keys['KeyS'] || keys['ArrowDown']) z -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) x += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) x -= 1;
  return { x, z };
}

function currentMoveVelocity() {
  const { x, z } = inputAxes();
  const right = new THREE.Vector3().crossVectors(player.forward, player.up).normalize();
  const dir = new THREE.Vector3()
    .addScaledVector(player.forward, z)
    .addScaledVector(right, x);
  if (dir.lengthSq() < 1e-6) return new THREE.Vector3();
  const speed = WALK_SPEED * (keys['ShiftLeft'] || keys['ShiftRight'] ? SPRINT_MULT : 1);
  return dir.normalize().multiplyScalar(speed);
}

function nearestPlanet(pos) {
  let best = null;
  let bestSurf = Infinity;
  for (const p of planets) {
    const surf = pos.distanceTo(p.center) - p.radius;
    if (surf < bestSurf) {
      bestSurf = surf;
      best = p;
    }
  }
  return { planet: best, surfDist: bestSurf };
}

function reorthonormalize() {
  player.forward.addScaledVector(player.up, -player.forward.dot(player.up));
  if (player.forward.lengthSq() < 1e-6) player.forward.set(0, 0, -1);
  player.forward.normalize();
}

function softRespawn(message) {
  resetPlayer(player.planet);
  showToast(message);
}

function updatePlayer(dt) {
  if (player.grounded) {
    const planet = player.planet;
    player.up.copy(player.pos).sub(planet.center).normalize();
    reorthonormalize();
    const moveVel = currentMoveVelocity();
    player.pos.addScaledVector(moveVel, dt);
    // re-project onto surface
    player.up.copy(player.pos).sub(planet.center).normalize();
    player.pos.copy(planet.center).addScaledVector(player.up, planet.radius);
    reorthonormalize();
  } else {
    const { planet: near, surfDist } = nearestPlanet(player.pos);
    // gravity toward nearest planet; weak when far out in space so hops feel floaty
    const gDir = near.center.clone().sub(player.pos).normalize();
    let g = 22 + near.radius * 0.9;
    if (surfDist > 10) g *= 0.18;
    player.vel.addScaledVector(gDir, g * dt);

    // gentle air control
    const { x, z } = inputAxes();
    if (x || z) {
      const right = new THREE.Vector3().crossVectors(player.forward, player.up).normalize();
      const airDir = new THREE.Vector3().addScaledVector(player.forward, z).addScaledVector(right, x);
      if (airDir.lengthSq() > 1e-6) player.vel.addScaledVector(airDir.normalize(), 26 * dt);
    }
    if (player.vel.length() > 55) player.vel.setLength(55);
    player.pos.addScaledVector(player.vel, dt);

    // ease "up" toward the local surface normal
    const targetUp = player.pos.clone().sub(near.center).normalize();
    const angle = player.up.angleTo(targetUp);
    if (angle > 1e-4) {
      const full = new THREE.Quaternion().setFromUnitVectors(player.up, targetUp);
      const partial = new THREE.Quaternion().slerpQuaternions(
        new THREE.Quaternion(),
        full,
        Math.min(1, (2.5 * dt) / Math.max(angle, 0.2))
      );
      player.up.applyQuaternion(partial).normalize();
      player.forward.applyQuaternion(partial);
      reorthonormalize();
    }

    // landing
    const newSurf = player.pos.distanceTo(near.center) - near.radius;
    const radial = player.vel.dot(targetUp);
    if (newSurf <= 0.25 && radial <= 0) {
      player.grounded = true;
      player.planet = near;
      player.up.copy(targetUp);
      player.pos.copy(near.center).addScaledVector(player.up, near.radius);
      player.vel.set(0, 0, 0);
      player.boostsLeft = 0;
      reorthonormalize();
      AudioFX.land();
      if (!player.visited.has(near.name)) {
        player.visited.add(near.name);
        showToast(near.name);
      }
    }

    // lost in space → drift back home to the last planet
    if (surfDist > 75) {
      softRespawn('Lost among the stars… a flock of birds carries you back.');
    }
  }

  // camera
  const eye = player.pos.clone().addScaledVector(player.up, EYE_HEIGHT);
  camera.position.copy(eye);
  camera.up.copy(player.up);
  camera.lookAt(eye.clone().add(lookDirection()));
}

// ---------------- Asteroids update / collisions ----------------

let elapsed = 0;

function updateAsteroids(dt) {
  const eye = camera.position;
  let nearestDanger = Infinity;

  for (const a of asteroids) {
    if (!a.alive) continue;
    a.mesh.position.addScaledVector(a.vel, dt);
    a.mesh.rotation.x += a.spin.x * dt;
    a.mesh.rotation.y += a.spin.y * dt;
    a.mesh.rotation.z += a.spin.z * dt;
    if (Math.random() < 0.6) emitTrail(a.mesh.position);

    // impact with a planet
    for (const p of planets) {
      if (a.mesh.position.distanceTo(p.center) < p.radius + a.size * 0.5) {
        impactFlash(a.mesh.position);
        if (a.mesh.position.distanceTo(eye) < 60) AudioFX.noise(0.4, 0.15);
        respawnAsteroid(a);
        break;
      }
    }

    // too far → recycle
    if (a.mesh.position.distanceTo(CLUSTER_CENTER) > 480) respawnAsteroid(a);

    // player collision
    const d = a.mesh.position.distanceTo(eye);
    nearestDanger = Math.min(nearestDanger, d - a.size);
    if (state === 'playing' && d < a.size + 1.4) {
      impactFlash(eye.clone());
      die();
    }
  }

  // danger vignette
  vignette.style.opacity =
    state === 'playing' ? THREE.MathUtils.clamp(1 - nearestDanger / 28, 0, 0.75) : state === 'dead' ? 1 : 0;

  // difficulty ramp
  if (elapsed > 20 && asteroidCount < MAX_ASTEROIDS) {
    asteroidCount++;
    elapsed = 0;
    spawnAsteroids();
  }
}

// ---------------- Win / lose / reset ----------------

function die() {
  state = 'dead';
  AudioFX.death();
  document.exitPointerLock();
  setTimeout(() => {
    showOverlay(
      'Struck by a Falling Star',
      'THE JOURNEY ENDS',
      '“And at night you will look up at the stars… In one of the stars I shall be living.”',
      'Click to try again'
    );
  }, 700);
}

function win() {
  state = 'won';
  AudioFX.win();
  document.exitPointerLock();
  setTimeout(() => {
    showOverlay(
      'You Found Her',
      'THE ROSE 🌹',
      '“You become responsible, forever, for what you have tamed.<br/>You are responsible for your rose.”',
      'Click to journey again'
    );
  }, 900);
}

function fullReset() {
  resetPlayer(START_PLANET);
  player.visited.clear();
  player.visited.add(START_PLANET.name);
  asteroidCount = 6;
  for (const a of asteroids) respawnAsteroid(a);
  elapsed = 0;
  vignette.style.opacity = 0;
}

// ---------------- Rose marker (screen-space compass) ----------------

function updateRoseMarker() {
  if (state !== 'playing') {
    roseMarker.style.opacity = 0;
    return;
  }
  roseMarker.style.opacity = 1;
  const dist = camera.position.distanceTo(roseWorldPos);
  roseDist.textContent = `${Math.round(dist)} m`;

  camera.updateMatrixWorld();
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  const camSpace = roseWorldPos.clone().applyMatrix4(camera.matrixWorldInverse);
  const behind = camSpace.z > 0;
  const p = roseWorldPos.clone().project(camera);
  let x = p.x, y = p.y;
  if (behind) { x = -x; y = -y; }
  if (behind || Math.abs(x) > 1 || Math.abs(y) > 1) {
    const m = Math.max(Math.abs(x), Math.abs(y), 1e-6);
    x = (x / m) * 0.9;
    y = (y / m) * 0.85;
  }
  roseMarker.style.left = `${((x + 1) / 2) * innerWidth}px`;
  roseMarker.style.top = `${((1 - y) / 2) * innerHeight}px`;
}

// ---------------- Main loop ----------------

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (state === 'playing') {
    elapsed += dt;
    updatePlayer(dt);
    if (camera.position.distanceTo(roseWorldPos) < 4.5) win();
  }
  updateAsteroids(dt);
  updateTrail(dt);
  updateFlashes(dt);
  updateRoseMarker();

  // twinkle + gentle rose pulse
  starsB.material.size = 9 + Math.sin(t * 1.7) * 2.2;
  starsC.material.size = 8 + Math.sin(t * 2.3 + 1.5) * 2;
  if (roseGlow) roseGlow.scale.setScalar(9 + Math.sin(t * 2.1) * 1.6);
  sunGlow.scale.setScalar(260 + Math.sin(t * 0.7) * 14);

  composer.render();
}

// menu camera: slow orbit around the home planet until the game starts
function menuCamera() {
  if (state !== 'menu') return;
  const t = clock.elapsedTime * 0.12;
  const r = 34;
  camera.position.set(
    START_PLANET.center.x + Math.cos(t) * r,
    START_PLANET.center.y + 12,
    START_PLANET.center.z + Math.sin(t) * r
  );
  camera.up.set(0, 1, 0);
  camera.lookAt(ROSE_PLANET.center.clone().lerp(START_PLANET.center, 0.7));
  requestAnimationFrame(menuCamera);
}
menuCamera();

animate();
