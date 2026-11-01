import * as THREE from 'three';

// Wake 3D: a whale drawn in glowing points swims through dark water; particles trail in its wake.
// Ported 1:1 from the reference's WebGL scene (same shaders, point counts, motion and colors).

export const VS = `uniform float uT; uniform float uPx; attribute float aS; attribute float aK; varying float vK; varying float vA;
void main(){ vec3 p = position; float tail = smoothstep(1.2, -3.4, p.x);
  p.y += sin(uT * 1.5 - p.x * 0.9) * 0.20 * tail * tail; p.z += sin(uT * 0.7 + p.x * 0.4) * 0.03;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  gl_PointSize = aS * uPx * (11.0 / -mv.z); vK = aK; vA = smoothstep(32.0, 6.0, -mv.z); }`;
export const FS = `uniform vec3 uA; uniform vec3 uB; varying float vK; varying float vA;
void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; float g = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(mix(uA, uB, vK), g * g * (0.55 + 0.45 * vK) * vA); }`;
export const WAKE_VS = `uniform float uPx; attribute float aS; attribute float aK; varying float vK; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aS * uPx * (11.0 / -mv.z); vK = aK; }`;
export const WAKE_FS = `varying float vK; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(mix(vec3(0.22,0.55,0.92), vec3(0.92,0.97,1.0), vK*0.6), smoothstep(0.5,0.0,d) * vK); }`;

export function whalePoints(n: number) {
  const P: number[] = [], S: number[] = [], K: number[] = [];
  let s = 3;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const L = 6.4, X0 = -3.4; // tail end .. nose at +3.0
  const rad = (u: number) =>
    0.98 * Math.pow(Math.max(0.02, Math.sin(Math.PI * Math.min(1, u))), 0.62) * (0.18 + 0.82 * THREE.MathUtils.smoothstep(u, 0.05, 0.55));
  for (let i = 0; i < n; i++) {
    const kind = r();
    let x: number, y: number, z: number, k: number;
    if (kind < 0.74) {
      // body surface (slightly flattened belly, ventral grooves)
      const u = Math.min(0.997, Math.pow(r(), 0.85)), a = r() * Math.PI * 2, R = rad(u) * (0.94 + r() * 0.06);
      x = X0 + u * L;
      y = Math.sin(a) * R * (Math.sin(a) < 0 ? 0.78 : 0.9);
      z = Math.cos(a) * R;
      const groove = Math.sin(a) < -0.35 && u > 0.55 ? 0.5 + 0.5 * Math.sin(z * 26) : 0;
      k = 0.35 + 0.65 * Math.max(0, Math.sin(a)) * 0.8 + groove * 0.25;
    } else if (kind < 0.88) {
      // flukes
      const side = r() < 0.5 ? -1 : 1, t = r(), w = r();
      x = X0 - 0.15 - t * 0.55 + w * 0.25 * (1 - t);
      z = side * (0.12 + t * 1.45) * (0.75 + w * 0.25);
      y = (r() - 0.5) * 0.06 + t * t * 0.18;
      k = 0.55 + t * 0.4;
    } else {
      // long pectoral fins
      const side = r() < 0.5 ? -1 : 1, t = r(), w = (r() - 0.5) * (0.42 - t * 0.3);
      x = 0.9 - t * 1.25 + w * 0.5;
      z = side * (0.75 + t * 1.55);
      y = -0.42 - t * 0.38 + (r() - 0.5) * 0.04;
      k = 0.45 + t * 0.45;
    }
    P.push(x, y, z);
    S.push(0.55 + r() * 0.9);
    K.push(Math.min(1, k));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1));
  g.setAttribute('aK', new THREE.Float32BufferAttribute(K, 1));
  return g;
}

export type SeaOptions = { n?: number; scale?: number; place?: [number, number] };

export class Sea {
  private r: THREE.WebGLRenderer;
  private sc = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  private mat: THREE.ShaderMaterial;
  private wakeM: THREE.ShaderMaterial;
  private whale: THREE.Points;
  private pivot = new THREE.Group();
  private wake: THREE.Points;
  private dust: THREE.Points;
  private N = 2600;
  private wv: Float32Array;
  private wl: Float32Array;
  private wi = 0;
  private tmp = new THREE.Vector3();
  private rs = 5;
  private place: [number, number];
  private pointerX = 0;
  private pointerY = 0;
  last: number | null = null;

  constructor(canvas: HTMLCanvasElement, opt: SeaOptions = {}) {
    const r = (this.r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.cam.position.set(0, 0.4, 13);
    const px = r.getPixelRatio();
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS,
      fragmentShader: FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uPx: { value: px * 2.7 }, uA: { value: new THREE.Color('#2F7FD0') }, uB: { value: new THREE.Color('#CFE8FF') } },
    });
    this.whale = new THREE.Points(whalePoints(opt.n || 24000), this.mat);
    this.whale.scale.setScalar(opt.scale || 1.22);
    this.pivot.add(this.whale);
    this.sc.add(this.pivot);

    // the wake: a ring buffer of particles shed from the flukes
    const wp = new Float32Array(this.N * 3).fill(999), ws = new Float32Array(this.N), wk = new Float32Array(this.N);
    this.wv = new Float32Array(this.N * 3);
    this.wl = new Float32Array(this.N);
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.BufferAttribute(wp, 3));
    wg.setAttribute('aS', new THREE.BufferAttribute(ws, 1));
    wg.setAttribute('aK', new THREE.BufferAttribute(wk, 1));
    this.wakeM = new THREE.ShaderMaterial({
      vertexShader: WAKE_VS,
      fragmentShader: WAKE_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uPx: { value: px * 2.4 } },
    });
    this.wake = new THREE.Points(wg, this.wakeM);
    this.sc.add(this.wake);

    // drifting plankton for depth
    const D = 900, dp = new Float32Array(D * 3), ds = new Float32Array(D), dk = new Float32Array(D);
    let q = 9;
    const rq = () => (q = (q * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < D; i++) {
      dp[i * 3] = (rq() - 0.5) * 34;
      dp[i * 3 + 1] = (rq() - 0.5) * 18;
      dp[i * 3 + 2] = -rq() * 22 + 4;
      ds[i] = 0.3 + rq() * 0.6;
      dk[i] = 0.15 + rq() * 0.35;
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dg.setAttribute('aS', new THREE.BufferAttribute(ds, 1));
    dg.setAttribute('aK', new THREE.BufferAttribute(dk, 1));
    this.dust = new THREE.Points(dg, this.wakeM);
    this.sc.add(this.dust);
    this.place = opt.place || [2.5, -0.15];
  }

  private rnd() {
    return (this.rs = (this.rs * 16807) % 2147483647) / 2147483647;
  }

  resize(w: number, h: number) {
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
  }

  render(t: number, mx = 0, my = 0) {
    const dt = this.last == null ? 0 : Math.min(0.05, t - this.last);
    this.last = t;
    this.mat.uniforms.uT.value = t;
    const [px, py] = this.place;
    this.pointerX += (mx - this.pointerX) * 0.045;
    this.pointerY += (my - this.pointerY) * 0.045;
    const fx = this.pointerX, fy = this.pointerY;
    this.pivot.position.set(px + Math.sin(t * 0.17) * 0.35 + fx * 0.45, py + Math.sin(t * 0.31) * 0.16 - fy * 0.3, Math.sin(t * 0.13) * 0.4);
    this.pivot.rotation.set(
      Math.sin(t * 0.31 + 1) * 0.04 + fy * 0.07,
      Math.PI * 0.86 + Math.sin(t * 0.17) * 0.08 + fx * 0.18,
      Math.sin(t * 0.23) * 0.03 - fx * 0.045 + fy * 0.03,
    );
    this.cam.position.x += (fx * 0.8 - this.cam.position.x) * 0.045;
    this.cam.position.y += (0.4 - fy * 0.45 - this.cam.position.y) * 0.045;
    this.cam.lookAt(1, 0, 0);

    // shed wake particles from the flukes
    const pa = this.wake.geometry.attributes.position as THREE.BufferAttribute;
    const sa = this.wake.geometry.attributes.aS as THREE.BufferAttribute;
    const ka = this.wake.geometry.attributes.aK as THREE.BufferAttribute;
    const P = pa.array as Float32Array, SA = sa.array as Float32Array, KA = ka.array as Float32Array;
    const n = Math.round(dt * 340);
    for (let i = 0; i < n; i++) {
      const j = (this.wi = (this.wi + 1) % this.N);
      this.tmp.set(-3.7 - this.rnd() * 0.5, (this.rnd() - 0.5) * 0.5 + Math.sin(t * 1.5 + 3.1) * 0.2, (this.rnd() - 0.5) * 1.8);
      this.pivot.localToWorld(this.tmp);
      P[j * 3] = this.tmp.x;
      P[j * 3 + 1] = this.tmp.y;
      P[j * 3 + 2] = this.tmp.z;
      this.wv[j * 3] = (this.rnd() - 0.5) * 0.25;
      this.wv[j * 3 + 1] = (this.rnd() - 0.3) * 0.18;
      this.wv[j * 3 + 2] = (this.rnd() - 0.5) * 0.25;
      this.wl[j] = 1;
      SA[j] = 0.5 + this.rnd() * 1.1;
    }
    for (let j = 0; j < this.N; j++) {
      if (this.wl[j] <= 0) {
        KA[j] = 0;
        continue;
      }
      this.wl[j] -= dt / 7;
      P[j * 3] += this.wv[j * 3] * dt;
      P[j * 3 + 1] += this.wv[j * 3 + 1] * dt;
      P[j * 3 + 2] += this.wv[j * 3 + 2] * dt;
      KA[j] = Math.max(0, this.wl[j]) * 0.9;
    }
    pa.needsUpdate = ka.needsUpdate = sa.needsUpdate = true;
    this.dust.rotation.y = t * 0.004;
    this.r.render(this.sc, this.cam);
  }

  dispose() {
    this.whale.geometry.dispose();
    this.wake.geometry.dispose();
    this.dust.geometry.dispose();
    this.mat.dispose();
    this.wakeM.dispose();
    this.r.dispose();
  }
}
