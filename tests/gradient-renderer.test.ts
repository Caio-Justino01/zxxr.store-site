import test from "node:test";
import assert from "node:assert/strict";
import { createGradientRenderer } from "../src/lib/gradient-renderer.ts";

type FakeShader = { source: string; compiled: boolean };
type FakeProgram = { shaders: FakeShader[]; linked: boolean };

function fixture(
  options: {
    failCompile?: (source: string) => boolean;
    failLink?: (sources: string) => boolean;
    noBuffer?: boolean;
    failBufferUpload?: boolean;
    highp?: boolean;
    actualSize?: [number, number];
  } = {},
) {
  const shaders = new Set<FakeShader>();
  const programs = new Set<FakeProgram>();
  const buffers = new Set<object>();
  const attemptedFragments: string[] = [];
  const resolutions: number[][] = [];
  const times: number[] = [];
  const viewports: number[][] = [];
  const contextOptions: unknown[] = [];
  let draws = 0;
  let lost = false;
  const canvas = { width: 300, height: 150 };
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    HIGH_FLOAT: 3,
    COMPILE_STATUS: 4,
    LINK_STATUS: 5,
    ARRAY_BUFFER: 6,
    STATIC_DRAW: 7,
    FLOAT: 8,
    DEPTH_TEST: 9,
    BLEND: 10,
    DITHER: 11,
    TRIANGLES: 12,
    get drawingBufferWidth() {
      return options.actualSize?.[0] ?? canvas.width;
    },
    get drawingBufferHeight() {
      return options.actualSize?.[1] ?? canvas.height;
    },
    isContextLost: () => lost,
    getShaderPrecisionFormat: () => ({
      precision: options.highp === false ? 0 : 23,
    }),
    createShader: () => {
      const shader = { source: "", compiled: false };
      shaders.add(shader);
      return shader;
    },
    shaderSource: (shader: FakeShader, source: string) => {
      shader.source = source;
    },
    compileShader: (shader: FakeShader) => {
      if (shader.source.includes("gl_FragColor"))
        attemptedFragments.push(shader.source);
      shader.compiled = !options.failCompile?.(shader.source);
    },
    getShaderParameter: (shader: FakeShader) => shader.compiled,
    deleteShader: (shader: FakeShader) => shaders.delete(shader),
    createProgram: () => {
      const program: FakeProgram = { shaders: [], linked: false };
      programs.add(program);
      return program;
    },
    attachShader: (program: FakeProgram, shader: FakeShader) => {
      program.shaders.push(shader);
    },
    detachShader: (program: FakeProgram, shader: FakeShader) => {
      program.shaders = program.shaders.filter((item) => item !== shader);
    },
    linkProgram: (program: FakeProgram) => {
      program.linked = !options.failLink?.(
        program.shaders.map((shader) => shader.source).join("\n"),
      );
    },
    getProgramParameter: (program: FakeProgram) => program.linked,
    deleteProgram: (program: FakeProgram) => programs.delete(program),
    getAttribLocation: () => 0,
    getUniformLocation: (_program: FakeProgram, name: string) => ({ name }),
    createBuffer: () => {
      if (options.noBuffer) return null;
      const buffer = {};
      buffers.add(buffer);
      return buffer;
    },
    deleteBuffer: (buffer: object) => buffers.delete(buffer),
    bindBuffer: () => {},
    bufferData: () => {
      if (options.failBufferUpload) throw new Error("upload unavailable");
    },
    useProgram: () => {},
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    disable: () => {},
    viewport: (...values: number[]) => viewports.push(values),
    uniform2f: (_location: unknown, ...values: number[]) =>
      resolutions.push(values),
    uniform1f: (_location: unknown, value: number) => times.push(value),
    drawArrays: () => {
      draws++;
    },
  };
  const surface = Object.assign(canvas, {
    getContext: (_name: string, settings: unknown) => {
      contextOptions.push(settings);
      return gl;
    },
  });
  return {
    canvas: surface as unknown as HTMLCanvasElement,
    shaders,
    programs,
    buffers,
    attemptedFragments,
    resolutions,
    viewports,
    times,
    contextOptions,
    get draws() {
      return draws;
    },
    loseContext() {
      lost = true;
    },
  };
}

test("gradient falls back to waves after flow compile or link failure", () => {
  for (const failure of ["failCompile", "failLink"] as const) {
    const fake = fixture({
      [failure]: (source: string) => source.includes("float fbm("),
    });
    const renderer = createGradientRenderer(fake.canvas);
    assert.ok(renderer);
    assert.equal(renderer.mode, "waves");
    assert.equal(fake.shaders.size, 0, "compiled shaders are detached/deleted");
    assert.equal(fake.programs.size, 1, "failed programs were deleted");
    assert.equal(fake.buffers.size, 1);
    renderer.dispose();
    assert.equal(fake.programs.size, 0);
    assert.equal(fake.buffers.size, 0);
  }
});

test("limited fragment precision uses smooth waves instead of mediump noise", () => {
  for (const options of [
    { highp: false },
    {
      failCompile: (source: string) =>
        source.includes("precision highp float;"),
    },
  ]) {
    const fake = fixture(options);
    const renderer = createGradientRenderer(fake.canvas);
    assert.ok(renderer);
    assert.equal(renderer.mode, "waves");
    assert.match(fake.attemptedFragments.at(-1)!, /^precision mediump float;/);
    assert.ok(
      fake.attemptedFragments.every(
        (source) =>
          !source.includes("float fbm(") ||
          source.startsWith("precision highp float;"),
      ),
      "flow is never attempted at mediump precision",
    );
    renderer.dispose();
    assert.equal(fake.shaders.size, 0);
    assert.equal(fake.programs.size, 0);
  }
});

test("both shader failures and partial buffer failures release every resource", () => {
  for (const options of [
    { failCompile: (source: string) => source.includes("gl_FragColor") },
    { failLink: () => true },
    { noBuffer: true },
    { failBufferUpload: true },
  ]) {
    const fake = fixture(options);
    assert.equal(createGradientRenderer(fake.canvas), null);
    assert.equal(fake.shaders.size, 0);
    assert.equal(fake.programs.size, 0);
    assert.equal(fake.buffers.size, 0);
  }
});

test("resize clamps DPR and uses the actual drawing buffer for uniforms", () => {
  const fake = fixture({ actualSize: [700, 500] });
  const renderer = createGradientRenderer(fake.canvas);
  assert.ok(renderer);
  renderer.resize(400, 300, 8);
  assert.equal(fake.canvas.width, 800);
  assert.equal(fake.canvas.height, 600);
  assert.deepEqual(fake.resolutions.at(-1), [700, 500]);
  assert.deepEqual(fake.viewports.at(-1), [0, 0, 700, 500]);
  assert.equal((fake.contextOptions[0] as { alpha: boolean }).alpha, false);
  renderer.render(10);
  renderer.render(Number.NaN);
  assert.deepEqual(fake.times, [1.2, 0]);
  assert.equal(fake.draws, 2);
  renderer.dispose();
});

test("context loss and repeated dispose never draw or retain GPU resources", () => {
  const fake = fixture();
  const renderer = createGradientRenderer(fake.canvas);
  assert.ok(renderer);
  renderer.resize(400, 300, 1);
  renderer.render(1);
  fake.loseContext();
  renderer.render(2);
  renderer.resize(800, 600, 2);
  assert.equal(fake.draws, 1);
  assert.equal(fake.canvas.width, 400);
  renderer.dispose();
  renderer.dispose();
  renderer.render(3);
  assert.equal(fake.draws, 1);
  assert.equal(fake.programs.size, 0);
  assert.equal(fake.buffers.size, 0);
});
