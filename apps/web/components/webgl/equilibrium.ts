/**
 * Escena "Equilibrio" (docs/14 §5): dos gotas de fórmula (metaballs) que se atraen,
 * se funden y se separan buscando equilibrio. WebGL2 directo, sin librerías:
 * un triángulo de pantalla completa + shader de fragmento (pocos KB).
 */

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2  uRes;       // px
uniform float uTime;      // s
uniform vec2  uPointer;   // -1..1, suavizado
uniform float uScroll;    // 0..1
uniform float uLayout;    // 0 = mobile (gotas abajo), 1 = desktop (gotas a la derecha)
uniform vec3  uBgA;
uniform vec3  uBgB;
uniform vec3  uDrop1;     // niebla verde
uniform vec3  uDrop2;     // rosa empolvado
uniform vec3  uDeep;      // verde hoja (sombra)

// Ruido barato para que el borde "respire"
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

vec2 centers(out vec2 c2) {
  float t = uTime * 0.35;
  // separación que oscila: se buscan, se tocan, se equilibran
  float sep = 0.16 + 0.10 * (0.5 + 0.5 * sin(t * 1.3)) + uScroll * 0.12;
  vec2 mid = mix(vec2(0.0, -0.30), vec2(0.42, 0.02), uLayout);
  mid += uPointer * vec2(0.05, 0.04);
  float a = t * 0.6 + uPointer.x * 0.4;
  vec2 dir = vec2(cos(a), sin(a) * 0.55);
  c2 = mid - dir * sep;
  return mid + dir * sep;
}

// Campo gaussiano + su gradiente analítico (1 evaluación por píxel, sin diferencias finitas).
// Umbral de superficie ≈ 0,30.
float field(vec2 p, vec2 c1, vec2 c2, out float w1, out float w2, out vec2 grad) {
  float r1 = 0.20 + 0.012 * sin(uTime * 0.9);
  float r2 = 0.17 + 0.012 * cos(uTime * 0.7);
  float k1 = 1.2 / (r1 * r1);
  float k2 = 1.2 / (r2 * r2);
  vec2 d1 = p - c1;
  vec2 d2 = p - c2;
  w1 = exp(-dot(d1, d1) * k1);
  w2 = exp(-dot(d2, d2) * k2);
  grad = -2.0 * (w1 * k1 * d1 + w2 * k2 * d2);
  float n = noise(p * 3.0 + uTime * 0.15) * 0.018;
  return w1 + w2 + n;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  if (aspect < 1.0) p /= aspect * 1.15; // en vertical, gotas un poco más chicas

  vec3 bg = mix(uBgA, uBgB, clamp(uv.x * 0.6 + uv.y * 0.4, 0.0, 1.0));

  vec2 c2;
  vec2 c1 = centers(c2);
  float w1, w2;
  vec2 grad;
  float f = field(p, c1, c2, w1, w2, grad);

  // Normal desde el gradiente analítico (escala equivalente a la versión por diferencias)
  vec3 n = normalize(vec3(-grad * 0.005, 0.012));

  float mask = smoothstep(0.27, 0.33, f);
  float mixW = w2 / max(w1 + w2, 1e-4);
  vec3 base = mix(uDrop1, uDrop2, smoothstep(0.25, 0.75, mixW));

  // Iluminación suave tipo gel translúcido
  vec3 L = normalize(vec3(-0.45, 0.6, 0.65));
  float diff = clamp(dot(n, L), 0.0, 1.0);
  float spec = pow(clamp(dot(reflect(-L, n), vec3(0, 0, 1)), 0.0, 1.0), 14.0);
  float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.2);

  // "Refracción": el fondo se ve desplazado a través de la gota
  vec2 refrUV = uv + n.xy * 0.035;
  vec3 refr = mix(uBgA, uBgB, clamp(refrUV.x * 0.6 + refrUV.y * 0.4, 0.0, 1.0));

  vec3 iri = 0.5 + 0.5 * cos(6.2831 * (fres * 0.6 + vec3(0.0, 0.33, 0.67)));
  vec3 drop = mix(refr, base, 0.78);
  drop *= 0.86 + 0.22 * diff;
  drop = mix(drop, uDeep, fres * 0.22);
  drop += iri * fres * 0.06;
  drop += spec * 0.35;

  // Sombra de contacto muy suave alrededor
  float halo = smoothstep(0.08, 0.3, f) * (1.0 - mask) * 0.04;
  vec3 col = mix(bg - halo, drop, mask);

  // Grano fino para evitar banding
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.012;
  outColor = vec4(col, 1.0);
}
`;

export type EquilibriumOptions = {
  dpr: number;
  maxFps: number;
  colors: { bgA: string; bgB: string; drop1: string; drop2: string; deep: string };
  onPerformanceDrop?: () => void;
};

export type EquilibriumScene = {
  setPointer: (x: number, y: number) => void;
  setScroll: (v: number) => void;
  setRunning: (running: boolean) => void;
  dispose: () => void;
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/**
 * Compila y linkea SIN bloquear el hilo principal: con KHR_parallel_shader_compile el driver
 * compila en segundo plano y consultamos COMPLETION_STATUS_KHR frame a frame. Consultar
 * LINK_STATUS antes de que termine forzaría una espera sincrónica (tarea larga → TBT).
 */
async function buildProgram(gl: WebGL2RenderingContext): Promise<WebGLProgram | null> {
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(vs, VERT);
  gl.shaderSource(fs, FRAG);
  gl.compileShader(vs);
  gl.compileShader(fs);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  if (parallel) {
    const deadline = performance.now() + 8000;
    while (!gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) {
      if (performance.now() > deadline || gl.isContextLost()) return null;
      await nextFrame();
    }
  }
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

export async function createEquilibrium(
  canvas: HTMLCanvasElement,
  opts: EquilibriumOptions,
): Promise<EquilibriumScene | null> {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const program = await buildProgram(gl);
  if (!program) return null;
  gl.useProgram(program);

  // Triángulo que cubre toda la pantalla
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uRes = u("uRes");
  const uTime = u("uTime");
  const uPointer = u("uPointer");
  const uScroll = u("uScroll");
  const uLayout = u("uLayout");
  gl.uniform3fv(u("uBgA"), hexToRgb(opts.colors.bgA));
  gl.uniform3fv(u("uBgB"), hexToRgb(opts.colors.bgB));
  gl.uniform3fv(u("uDrop1"), hexToRgb(opts.colors.drop1));
  gl.uniform3fv(u("uDrop2"), hexToRgb(opts.colors.drop2));
  gl.uniform3fv(u("uDeep"), hexToRgb(opts.colors.deep));

  let dpr = opts.dpr;
  const target = { x: 0, y: 0 };
  const pointer = { x: 0, y: 0 };
  let scroll = 0;
  let running = true;
  let disposed = false;
  let raf = 0;
  let last = 0;
  const start = performance.now();
  const minFrame = 1000 / opts.maxFps;
  // Monitoreo de rendimiento: si el frame promedio supera ~40 ms, bajamos resolución y después cortamos.
  let slowFrames = 0;
  let degraded = false;

  function resize() {
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl!.viewport(0, 0, w, h);
    }
    gl!.uniform2f(uRes, w, h);
    gl!.uniform1f(uLayout, canvas.clientWidth >= 768 ? 1 : 0);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = now - last;
    if (dt < minFrame - 1) return;

    if (last && dt > 40) {
      if (++slowFrames > 45) {
        slowFrames = 0;
        if (!degraded && dpr > 0.75) {
          degraded = true;
          dpr = Math.max(0.75, dpr * 0.6);
          resize();
        } else {
          opts.onPerformanceDrop?.();
        }
      }
    } else if (slowFrames > 0) {
      slowFrames--;
    }
    last = now;

    pointer.x += (target.x - pointer.x) * 0.05;
    pointer.y += (target.y - pointer.y) * 0.05;
    gl!.uniform1f(uTime, (now - start) / 1000);
    gl!.uniform2f(uPointer, pointer.x, pointer.y);
    gl!.uniform1f(uScroll, scroll);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }
  raf = requestAnimationFrame(frame);

  return {
    setPointer(x, y) {
      target.x = x;
      target.y = y;
    },
    setScroll(v) {
      scroll = Math.min(1, Math.max(0, v));
    },
    setRunning(next) {
      if (disposed || next === running) return;
      running = next;
      if (running) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl!.deleteBuffer(buf);
      gl!.deleteProgram(program);
      gl!.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
