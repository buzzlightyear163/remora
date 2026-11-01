// Brand renderer: coin image, X banner and launch image, drawn with the exact whale from src/lib/sea.ts.
import * as THREE from 'three';
import { VS, FS, whalePoints } from '../src/lib/sea';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/geist-mono/index.css';
import '@fontsource-variable/geist/index.css';

const C = {
  bg: '#040b17', bgGlow: '#0b2342', tx: '#e6eef8', mu: '#8699b3', dm: '#556a87', m: '#8fd0ff',
  uA: '#3d92ea', uB: '#cfe8ff', long: '#1fc28f', short: '#ed7088',
};

type Pose = { ry: number; rx?: number; rz?: number; x?: number; y?: number; z?: number; scale?: number; t?: number };
type WhaleOpts = {
  pose: Pose;
  n?: number;
  camZ?: number;
  fov?: number;
  look?: [number, number, number];
  px?: number; // point-size multiplier relative to the hero
  wake?: { count: number; length: number; spread: number; dir?: [number, number, number] };
  dust?: number;
  remora?: boolean;
  /** auto-frame: whale bbox fills `frac` of the frame; offset moves it (fractions of the frame) */
  fit?: { frac: number; ox?: number; oy?: number };
};

type Rendered = { canvas: HTMLCanvasElement; project: (local: [number, number, number]) => [number, number] };

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function pointsMaterial(px: number, t: number) {
  return new THREE.ShaderMaterial({
    vertexShader: VS,
    fragmentShader: FS,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: t }, uPx: { value: px }, uA: { value: new THREE.Color(C.uA) }, uB: { value: new THREE.Color(C.uB) } },
  });
}

function cloud(P: number[], S: number[], K: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1));
  g.setAttribute('aK', new THREE.Float32BufferAttribute(K, 1));
  return g;
}

/** A small remora latched under the belly: dense, bright particle fish (whale-local coords). */
function remoraPoints(n: number) {
  const r = rng(77);
  const P: number[] = [], S: number[] = [], K: number[] = [];
  const cx = -0.75, cy = -1.18, cz = 0.15, L = 1.15;
  for (let i = 0; i < n; i++) {
    const u = r();
    let x: number, y: number, z: number;
    if (u < 0.86) {
      const v = r(), a = r() * Math.PI * 2;
      const R = 0.13 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.02)), 0.55) * (r() < 0.55 ? 0.95 + r() * 0.05 : Math.sqrt(r()));
      x = cx + L / 2 - v * L; // nose toward whale nose (+x), tail toward -x
      y = cy + Math.sin(a) * R * 0.8;
      z = cz + Math.cos(a) * R;
    } else {
      const side = r() < 0.5 ? -1 : 1, t = r();
      x = cx - L / 2 - t * 0.13;
      y = cy + side * t * 0.07 * (0.6 + r() * 0.4);
      z = cz + (r() - 0.5) * 0.02;
    }
    P.push(x, y, z);
    S.push(0.7 + r() * 0.6);
    K.push(1);
  }
  return cloud(P, S, K);
}

function renderWhale(W: number, H: number, o: WhaleOpts): Rendered {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(W, H, false);
  r.setClearColor(0x000000, 0);
  const sc = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(o.fov ?? 38, W / H, 0.1, 100);
  cam.position.set(0, 0, o.camZ ?? 13);
  cam.lookAt(...(o.look ?? [0, 0, 0]));

  const t = o.pose.t ?? 4.2;
  const pxBase = 2.7 * (H / 800) * (o.px ?? 1);
  const mat = pointsMaterial(pxBase, t);
  const whale = new THREE.Points(whalePoints(o.n ?? 24000), mat);
  const pivot = new THREE.Group();
  whale.scale.setScalar(o.pose.scale ?? 1.55);
  pivot.add(whale);
  if (o.remora) {
    // static (no tail-wave) material for the remora so it stays crisp
    const rm = pointsMaterial(pxBase, 0);
    const rem = new THREE.Points(remoraPoints(2600), rm);
    whale.add(rem);
  }
  pivot.position.set(o.pose.x ?? 0, o.pose.y ?? 0, o.pose.z ?? 0);
  pivot.rotation.set(o.pose.rx ?? 0, o.pose.ry, o.pose.rz ?? 0);
  sc.add(pivot);
  sc.updateMatrixWorld(true);

  // auto-frame the whale and keep point sizes consistent with the hero (hero camera distance = 13)
  let dist = o.camZ ?? 13;
  if (o.fit) {
    const pos = whale.geometry.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, zs = 0;
    for (let i = 0; i < pos.count; i += 3) {
      v.fromBufferAttribute(pos, i).applyMatrix4(whale.matrixWorld);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); zs += v.z;
    }
    const zc = zs / Math.ceil(pos.count / 3), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), aspect = W / H;
    dist = Math.max((x1 - x0) / (o.fit.frac * aspect), (y1 - y0) / o.fit.frac) / (2 * tan);
    const visH = 2 * dist * tan, visW = visH * aspect;
    const camX = cx - (o.fit.ox ?? 0) * visW, camY = cy + (o.fit.oy ?? 0) * visH;
    cam.position.set(camX, camY, zc + dist);
    cam.lookAt(camX, camY, zc);
  }
  const px = pxBase * (dist / 13);
  mat.uniforms.uPx.value = px;

  // wake: a trail shed from the flukes, drifting away and fading (static snapshot of the hero's ring buffer)
  if (o.wake) {
    const rr = rng(5);
    const P: number[] = [], S: number[] = [], K: number[] = [];
    const tmp = new THREE.Vector3();
    const dir = new THREE.Vector3(...(o.wake.dir ?? [1, 0.05, 0])).normalize();
    for (let i = 0; i < o.wake.count; i++) {
      const age = Math.pow(rr(), 0.8);
      tmp.set(-3.7 - rr() * 0.5, (rr() - 0.5) * 0.5 + Math.sin(t * 1.5 + 3.1) * 0.2, (rr() - 0.5) * 1.8);
      whale.localToWorld(tmp);
      const spread = o.wake.spread * (0.15 + age);
      tmp.addScaledVector(dir, age * o.wake.length);
      tmp.x += (rr() - 0.5) * spread;
      tmp.y += (rr() - 0.5) * spread * 0.55 + Math.sin(age * 9 + rr()) * 0.05;
      tmp.z += (rr() - 0.5) * spread;
      P.push(tmp.x, tmp.y, tmp.z);
      S.push(0.5 + rr() * 1.1);
      K.push(Math.max(0, 1 - age) * 0.9);
    }
    const wm = new THREE.ShaderMaterial({
      vertexShader: `uniform float uPx; attribute float aS; attribute float aK; varying float vK; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aS * uPx * (11.0 / -mv.z); vK = aK; }`,
      fragmentShader: `varying float vK; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(mix(vec3(0.22,0.55,0.92), vec3(0.92,0.97,1.0), vK*0.6), smoothstep(0.5,0.0,d) * vK); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uPx: { value: px * 0.9 } },
    });
    sc.add(new THREE.Points(cloud(P, S, K), wm));
  }

  // drifting plankton for depth
  if (o.dust) {
    const rq = rng(9);
    const P: number[] = [], S: number[] = [], K: number[] = [];
    for (let i = 0; i < o.dust; i++) {
      P.push((rq() - 0.5) * 40, (rq() - 0.5) * 20, -rq() * 22 + 4);
      S.push(0.3 + rq() * 0.6);
      K.push(0.15 + rq() * 0.35);
    }
    const dm = pointsMaterial(px * 0.9, 0);
    sc.add(new THREE.Points(cloud(P, S, K), dm));
  }

  if (o.remora) ((whale.children[0] as THREE.Points).material as THREE.ShaderMaterial).uniforms.uPx.value = px * 0.95;
  r.render(sc, cam);
  cam.updateMatrixWorld();
  const project = (local: [number, number, number]): [number, number] => {
    const v = new THREE.Vector3(...local);
    whale.localToWorld(v);
    v.project(cam);
    return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
  };
  return { canvas, project };
}

/** draw the particle layer with a soft bloom, like additive glow on screen */
function drawGlow(x: CanvasRenderingContext2D, src: HTMLCanvasElement, blur: number, amount = 0.55) {
  x.drawImage(src, 0, 0);
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.globalAlpha = amount;
  x.filter = `blur(${blur}px)`;
  x.drawImage(src, 0, 0);
  x.restore();
}

/* ---------- 2D composition helpers ---------- */
function base(W: number, H: number, glow: [number, number, number] = [0.7, 0.45, 0.8]) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = C.bg;
  x.fillRect(0, 0, W, H);
  const [gx, gy, gr] = glow;
  const g = x.createRadialGradient(W * gx, H * gy, 0, W * gx, H * gy, Math.max(W, H) * gr);
  g.addColorStop(0, C.bgGlow);
  g.addColorStop(1, 'rgba(4,11,23,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  return { c, x };
}

function grain(x: CanvasRenderingContext2D, W: number, H: number, amount = 0.035) {
  const img = x.getImageData(0, 0, W, H);
  const d = img.data;
  const r = rng(13);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 255 * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  x.putImageData(img, 0, 0);
}

function vignette(x: CanvasRenderingContext2D, W: number, H: number, strength = 0.55) {
  const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(4,11,23,0)');
  g.addColorStop(1, `rgba(4,11,23,${strength})`);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
}

function mono(x: CanvasRenderingContext2D, text: string, X: number, Y: number, size: number, color: string, opts: { align?: CanvasTextAlign; spacing?: number; weight?: number } = {}) {
  x.font = `${opts.weight ?? 500} ${size}px "Geist Mono Variable", "Geist Mono", ui-monospace, monospace`;
  x.fillStyle = color;
  x.textAlign = opts.align ?? 'left';
  x.textBaseline = 'alphabetic';
  (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${opts.spacing ?? 0}px`;
  x.fillText(text, X, Y);
  (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
}

function serifLine(x: CanvasRenderingContext2D, parts: { t: string; italic?: boolean; color?: string }[], X: number, Y: number, size: number, align: 'left' | 'center' | 'right' = 'left') {
  const fonts = parts.map(p => `${p.italic ? 'italic ' : ''}400 ${size}px "Instrument Serif"`);
  (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${-size * 0.02}px`;
  const widths = parts.map((p, i) => { x.font = fonts[i]; return x.measureText(p.t).width; });
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === 'left' ? X : align === 'center' ? X - total / 2 : X - total;
  x.textAlign = 'left';
  x.textBaseline = 'alphabetic';
  parts.forEach((p, i) => {
    x.font = fonts[i];
    x.fillStyle = p.color ?? C.tx;
    x.fillText(p.t, cx, Y);
    cx += widths[i];
  });
  (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  return total;
}

function pill(x: CanvasRenderingContext2D, text: string, X: number, Y: number, size: number, dot = true) {
  x.font = `500 ${size}px "Geist Mono Variable", ui-monospace, monospace`;
  (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${size * 0.04}px`;
  const tw = x.measureText(text).width;
  const padX = size * 0.9, h = size * 2.2, dw = dot ? size * 1.15 : 0;
  const w = tw + padX * 2 + dw;
  x.beginPath();
  x.roundRect(X, Y, w, h, h / 2);
  x.fillStyle = 'rgba(143,208,255,0.07)';
  x.fill();
  x.strokeStyle = 'rgba(143,208,255,0.28)';
  x.lineWidth = Math.max(1, size * 0.07);
  x.stroke();
  if (dot) {
    x.beginPath();
    x.arc(X + padX + size * 0.32, Y + h / 2, size * 0.3, 0, Math.PI * 2);
    x.fillStyle = C.m;
    x.shadowColor = C.m;
    x.shadowBlur = size * 0.9;
    x.fill();
    x.shadowBlur = 0;
  }
  x.fillStyle = C.m;
  x.textBaseline = 'middle';
  x.fillText(text, X + padX + dw, Y + h / 2 + size * 0.04);
  x.textBaseline = 'alphabetic';
  (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  return w;
}

/* ---------- compositions ---------- */
export type Kind = 'coin' | 'coin-remora' | 'banner' | 'launch';

function coin(remora: boolean, S = 2000) {
  const { c, x } = base(S, S, [0.5, 0.5, 0.6]);
  // side profile (same pose as the hero), rising toward the upper left; whole whale inside the circle crop
  const { canvas } = renderWhale(S, S, {
    pose: { ry: Math.PI * 0.86, rx: 0.03, rz: 0.44, scale: 1.55, t: 4.2 },
    fit: { frac: 0.83, ox: 0.0, oy: 0.03 },
    px: 1.25,
    n: 34000,
    remora,
    dust: 160,
  });
  drawGlow(x, canvas, S * 0.012, 0.75);
  vignette(x, S, S, 0.65);
  grain(x, S, S, 0.03);
  return c;
}

function banner(W = 3000, H = 1000) {
  const { c, x } = base(W, H, [0.5, 0.42, 0.5]);
  // wide shot: the whale crossing the frame right-to-left, a long wake of trades behind it
  const { canvas, project } = renderWhale(W, H, {
    pose: { ry: Math.PI * 0.93, rx: 0.04, rz: 0.03, scale: 1.0, t: 3.6 },
    fit: { frac: 0.36, ox: -0.06, oy: -0.02 },
    px: 1.1,
    n: 26000,
    wake: { count: 6500, length: 12, spread: 1.5, dir: [1, -0.03, -0.15] },
    dust: 1100,
  });
  drawGlow(x, canvas, H * 0.01, 0.6);

  // the whale's trades, left in its wake (live-style labels along the trail)
  const [tx, ty] = project([-3.9, 0.05, 0]);
  const labels: [string, string, number, number][] = [
    ['ETH', 'SHORT $248.7M', 0.16, 1],
    ['BTC', 'SHORT $212.4M', 0.36, -1],
    ['SOL', 'SHORT $72.8M', 0.55, 1],
    ['HYPE', 'SHORT $43.4M', 0.74, -1],
  ];
  const span = W * 0.9 - tx;
  labels.forEach(([coinName, side, f, dirY], i) => {
    const X = tx + span * f;
    const Y = ty + (dirY > 0 ? 70 : -70) + Math.sin(f * 7) * 18;
    const a = 0.95 - i * 0.14;
    x.globalAlpha = a;
    x.beginPath();
    x.arc(X, Y, 6, 0, Math.PI * 2);
    x.fillStyle = C.m;
    x.shadowColor = C.m;
    x.shadowBlur = 14;
    x.fill();
    x.shadowBlur = 0;
    x.strokeStyle = 'rgba(143,208,255,0.35)';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(X, Y + (dirY > 0 ? 12 : -12));
    x.lineTo(X, Y + (dirY > 0 ? 70 : -70));
    x.stroke();
    const ly = Y + (dirY > 0 ? 104 : -84);
    mono(x, coinName, X - 6, ly, 28, C.tx, { spacing: 1 });
    x.font = '500 28px "Geist Mono Variable", ui-monospace, monospace';
    const cw = x.measureText(coinName).width + 16;
    mono(x, side, X - 6 + cw, ly, 28, side.startsWith('LONG') ? C.long : C.short, { spacing: 1 });
    x.globalAlpha = 1;
  });

  // minimal type, top-left (clear of the avatar circle at bottom-left)
  serifLine(x, [{ t: 'Never swim ' }, { t: 'alone.', italic: true, color: C.m }], 96, 236, 104);
  mono(x, 'REMORA  ·  A PUMP.FUN COIN THAT RIDES HYPERLIQUID WHALES', 100, 312, 25, C.mu, { spacing: 3 });
  vignette(x, W, H, 0.45);
  grain(x, W, H, 0.028);
  return c;
}

function launch(W = 3200, H = 1800) {
  const { c, x } = base(W, H, [0.7, 0.52, 0.6]);
  const { canvas } = renderWhale(W, H, {
    pose: { ry: Math.PI * 0.86, rx: 0.03, rz: 0.05, scale: 1.55, t: 4.2 },
    fit: { frac: 0.6, ox: 0.25, oy: 0.12 },
    px: 1.1,
    n: 30000,
    remora: true,
    wake: { count: 2400, length: 5, spread: 1.3, dir: [1, 0.02, -0.1] },
    dust: 900,
  });
  drawGlow(x, canvas, H * 0.01, 0.6);
  const g = x.createLinearGradient(0, 0, W * 0.6, 0);
  g.addColorStop(0, 'rgba(4,11,23,0.92)');
  g.addColorStop(0.62, 'rgba(4,11,23,0.5)');
  g.addColorStop(1, 'rgba(4,11,23,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  pill(x, 'LIVE ON PUMP.FUN', 180, 330, 36);
  serifLine(x, [{ t: 'Your coin rides' }], 172, 700, 250);
  serifLine(x, [{ t: 'with the ' }, { t: 'whales.', italic: true, color: C.m }], 172, 935, 250);
  x.font = '400 54px "Geist Variable", system-ui, sans-serif';
  x.fillStyle = '#b4c3d6';
  x.textAlign = 'left';
  x.fillText('A pump.fun coin whose creator fees copy the', 180, 1110);
  x.fillText('biggest traders on Hyperliquid. When they win,', 180, 1186);
  x.fillText('your coin gets bought back.', 180, 1262);
  mono(x, '$REMORA', 180, 1560, 40, C.m, { spacing: 2 });
  mono(x, 'Solana  ×  Hyperliquid', 420, 1560, 40, C.mu, { spacing: 2 });
  vignette(x, W, H, 0.4);
  grain(x, W, H, 0.028);
  return c;
}

const SIZES: Record<Kind, [number, number]> = { coin: [1000, 1000], 'coin-remora': [1000, 1000], banner: [1500, 500], launch: [1600, 900] };

async function shot(kind: Kind): Promise<string> {
  await document.fonts.load('400 100px "Instrument Serif"');
  await document.fonts.load('italic 400 100px "Instrument Serif"');
  await document.fonts.load('500 40px "Geist Mono Variable"');
  await document.fonts.load('400 40px "Geist Variable"');
  const big = kind === 'coin' ? coin(false) : kind === 'coin-remora' ? coin(true) : kind === 'banner' ? banner() : launch();
  const [w, h] = SIZES[kind];
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ox = out.getContext('2d')!;
  ox.imageSmoothingQuality = 'high';
  ox.drawImage(big, 0, 0, w, h); // supersampled 2x for clean particles
  return out.toDataURL('image/png');
}

declare global {
  interface Window { shot: typeof shot }
}
window.shot = shot;

if (!navigator.webdriver) {
  (async () => {
    for (const k of ['coin', 'coin-remora', 'banner', 'launch'] as Kind[]) {
      const img = new Image();
      img.src = await shot(k);
      img.title = k;
      document.getElementById('out')!.appendChild(img);
    }
  })();
}
