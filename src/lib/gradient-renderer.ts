export interface GradientRenderer {
  readonly mode: "flow" | "waves";
  resize(width: number, height: number, dpr: number): void;
  render(elapsedSeconds: number): void;
  dispose(): void;
}

const vertexSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const paletteSource = `
// Direct sRGB values; every output is a convex combination of these colors.
const vec3 BLUE = vec3(58.0, 131.0, 247.0) / 255.0;
const vec3 SKY = vec3(143.0, 202.0, 255.0) / 255.0;
const vec3 WHITE = vec3(245.0, 250.0, 255.0) / 255.0;
vec3 palette(float cloud, float light) {
  return mix(mix(BLUE, SKY, clamp(cloud, 0.0, 1.0)),
             WHITE, clamp(light, 0.0, 1.0));
}
`;

const flowSource = `
float hash(vec2 p) {
  // Polynomial hash avoids a high-frequency trigonometric cost per sample.
  vec3 h = fract(vec3(p.xyx) * 0.1031);
  h += dot(h, h.yzx + 33.33);
  return fract((h.x + h.y) * h.z);
}
float noise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
             mix(hash(cell + vec2(0.0, 1.0)),
                 hash(cell + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = turn * p * 1.92 + vec2(8.3, 4.7);
    amplitude *= 0.5;
  }
  return value / 0.9375;
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = clamp(u_resolution.x / u_resolution.y, 0.55, 2.5);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 2.0;
  float t = u_time;
  vec2 q = vec2(fbm(p + vec2(t * 0.23, -t * 0.16)),
                fbm(p + vec2(5.2 - t * 0.18, 1.3 + t * 0.12)));
  vec2 warp = vec2(fbm(p + 1.45 * q + vec2(1.7, 9.2) + t * 0.10),
                   fbm(p + 1.45 * q + vec2(8.3, 2.8) - t * 0.13));
  float field = fbm(p + 1.8 * warp + vec2(t * 0.07, -t * 0.09));
  float cloud = smoothstep(0.22, 0.72, field);
  float light = smoothstep(0.48, 0.82, field + (warp.y - 0.5) * 0.22);
  gl_FragColor = vec4(palette(cloud, light), 1.0);
}
`;

const wavesSource = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time;
  float sweep = sin(uv.x * 3.8 + uv.y * 2.1 + t * 0.35);
  float cross = cos(uv.y * 3.2 - uv.x * 1.7 - t * 0.24);
  float field = 0.5 + sweep * 0.28 + cross * 0.19;
  float cloud = smoothstep(0.05, 0.90, field);
  float light = smoothstep(0.55, 0.98, field) * 0.78;
  gl_FragColor = vec4(palette(cloud, light), 1.0);
}
`;

type Program = {
  handle: WebGLProgram;
  position: number;
  resolution: WebGLUniformLocation;
  time: WebGLUniformLocation;
};

function makeProgram(
  gl: WebGLRenderingContext,
  fragment: string,
  precision: "highp" | "mediump",
): Program | null {
  let vertex: WebGLShader | null = null;
  let pixel: WebGLShader | null = null;
  let handle: WebGLProgram | null = null;
  let ready = false;
  try {
    vertex = gl.createShader(gl.VERTEX_SHADER);
    pixel = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vertex || !pixel) return null;
    gl.shaderSource(vertex, vertexSource);
    gl.compileShader(vertex);
    if (!gl.getShaderParameter(vertex, gl.COMPILE_STATUS)) return null;
    gl.shaderSource(
      pixel,
      `precision ${precision} float;
       uniform vec2 u_resolution;
       uniform float u_time;
       ${paletteSource}
       ${fragment}`,
    );
    gl.compileShader(pixel);
    if (!gl.getShaderParameter(pixel, gl.COMPILE_STATUS)) return null;
    handle = gl.createProgram();
    if (!handle) return null;
    gl.attachShader(handle, vertex);
    gl.attachShader(handle, pixel);
    gl.linkProgram(handle);
    if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) return null;
    const position = gl.getAttribLocation(handle, "a_position");
    const resolution = gl.getUniformLocation(handle, "u_resolution");
    const time = gl.getUniformLocation(handle, "u_time");
    if (position < 0 || resolution === null || time === null) return null;
    ready = true;
    return { handle, position, resolution, time };
  } catch {
    return null;
  } finally {
    if (handle && vertex) gl.detachShader(handle, vertex);
    if (handle && pixel) gl.detachShader(handle, pixel);
    if (vertex) gl.deleteShader(vertex);
    if (pixel) gl.deleteShader(pixel);
    if (handle && !ready) gl.deleteProgram(handle);
  }
}

/** A single decorative canvas. This renderer never reads product images. */
export function createGradientRenderer(
  canvas: HTMLCanvasElement,
): GradientRenderer | null {
  let gl: WebGLRenderingContext | null;
  try {
    gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }
  if (!gl || gl.isContextLost()) return null;
  const context = gl;
  let highPrecision = false;
  try {
    highPrecision =
      (gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
        ?.precision ?? 0) > 0;
  } catch {
    // Some older drivers only expose mediump fragment precision.
  }
  const precisions: Array<"highp" | "mediump"> = highPrecision
    ? ["highp", "mediump"]
    : ["mediump"];
  let program: Program | null = null;
  let mode: GradientRenderer["mode"] = "flow";
  for (const candidate of ["flow", "waves"] as const) {
    // The domain warp needs highp to retain fractional hash detail. A driver
    // exposing only mediump uses the smooth analytic waves instead.
    const supported =
      candidate === "flow"
        ? precisions.filter((precision) => precision === "highp")
        : precisions;
    for (const precision of supported) {
      program = makeProgram(
        gl,
        candidate === "flow" ? flowSource : wavesSource,
        precision,
      );
      if (program) break;
    }
    if (program) {
      mode = candidate;
      break;
    }
  }
  if (!program) return null;
  const active = program;
  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(active.handle);
    return null;
  }
  try {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // One oversized triangle covers the viewport without a diagonal seam.
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.useProgram(active.handle);
    gl.enableVertexAttribArray(active.position);
    gl.vertexAttribPointer(active.position, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.DITHER);
  } catch {
    gl.deleteBuffer(buffer);
    gl.deleteProgram(active.handle);
    return null;
  }
  let disposed = false;
  return {
    mode,
    resize(width, height, dpr) {
      if (disposed || context.isContextLost()) return;
      const ratio = Number.isFinite(dpr) ? Math.min(2, Math.max(0.5, dpr)) : 1;
      const safeWidth = Number.isFinite(width) ? Math.max(1, width) : 1;
      const safeHeight = Number.isFinite(height) ? Math.max(1, height) : 1;
      const nextWidth = Math.max(1, Math.round(safeWidth * ratio));
      const nextHeight = Math.max(1, Math.round(safeHeight * ratio));
      if (canvas.width !== nextWidth) canvas.width = nextWidth;
      if (canvas.height !== nextHeight) canvas.height = nextHeight;
      const actualWidth = context.drawingBufferWidth || canvas.width;
      const actualHeight = context.drawingBufferHeight || canvas.height;
      context.viewport(0, 0, actualWidth, actualHeight);
      context.useProgram(active.handle);
      context.uniform2f(active.resolution, actualWidth, actualHeight);
    },
    render(elapsedSeconds) {
      if (disposed || context.isContextLost()) return;
      const elapsed = Number.isFinite(elapsedSeconds)
        ? Math.max(0, elapsedSeconds)
        : 0;
      context.useProgram(active.handle);
      context.uniform1f(active.time, elapsed * 0.12);
      context.drawArrays(context.TRIANGLES, 0, 3);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      context.deleteBuffer(buffer);
      context.deleteProgram(active.handle);
    },
  };
}
