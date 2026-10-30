import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import gsap from "gsap";
import { products } from "../config/products";

export type Presentation = "rack" | "loose" | "worn";
export type StudioOptions = {
  onReady: () => void;
  onError: () => void;
  onSelect: (id: string) => void;
  onHover: (index: number | null) => void;
  onMobileSelection?: (index: number) => void;
};
type Garment = {
  group: THREE.Group;
  model: THREE.Object3D;
  hanger: THREE.Group;
  mixer: THREE.AnimationMixer;
  meshes: THREE.Mesh[];
  fit: { value: number };
  pivot: THREE.Group;
  reveal: number;
  swing: number;
  velocity: number;
};

export class Studio {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  root = new THREE.Group();
  rack = new THREE.Group();
  garments: Garment[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private running = true;
  private visible = true;
  private disposed = false;
  private raf = 0;
  private last = 0;
  private clock = 0;
  private active: number | null = null;
  private hovered: number | null = null;
  private departing = false;
  private departureTween: gsap.core.Timeline | null = null;
  private mode: Presentation = "rack";
  private mobile = false;
  private mobileIndex = 0;
  private reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  private motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  private angle = { x: 0, y: 0, zoom: 1 };
  private turn = { value: 0 };
  private tweens: gsap.core.Tween[] = [];
  private lookTarget = new THREE.Vector3(0, 1.85, 0);
  private drag: {
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    moving: boolean;
  } | null = null;
  private materials: THREE.Material[] = [];
  private textures: THREE.Texture[] = [];
  private width = 0;
  private height = 0;
  private frames = 0;
  private elapsed = 0;
  private shadowAt = 0;
  private options: StudioOptions;
  private canvas: HTMLCanvasElement;
  private skyStudio = new THREE.Group();
  private productFloor: THREE.Mesh | null = null;
  private fabricBump: THREE.CanvasTexture | null = null;
  private environment: THREE.WebGLRenderTarget | null = null;

  constructor(container: HTMLElement, options: StudioOptions) {
    this.options = options;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor("#eceae5", 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.dataset.scene = "loading";
    container.appendChild(this.canvas);
    this.scene.background = null;
    this.scene.add(this.root);
    this.root.add(this.rack);
    this.buildStudio();
    this.canvas.addEventListener("pointerdown", this.down);
    this.canvas.addEventListener("pointermove", this.move);
    this.canvas.addEventListener("pointerup", this.up);
    this.canvas.addEventListener("pointercancel", this.cancel);
    this.canvas.addEventListener("pointerleave", this.leave);
    this.canvas.addEventListener("webglcontextlost", this.contextLost);
    document.addEventListener("visibilitychange", this.visibility);
    this.motionQuery.addEventListener("change", this.motionChange);
    this.load().catch(() => {
      if (!this.disposed) {
        this.running = false;
        options.onError();
      }
    });
    this.animate(0);
  }
  private motionChange = (e: MediaQueryListEvent) => {
    this.reduce = e.matches;
    if (this.reduce) {
      this.garments.forEach((g) =>
        g.meshes.forEach((m) => {
          const d = m.morphTargetDictionary,
            w = m.morphTargetInfluences;
          if (d && w) {
            if (d.WindA !== undefined) w[d.WindA] = 0;
            if (d.WindB !== undefined) w[d.WindB] = 0;
          }
        }),
      );
    }
    this.layout(true);
  };
  private contextLost = (e: Event) => {
    e.preventDefault();
    this.running = false;
    this.options.onError();
  };
  private visibility = () => {
    this.last = 0;
  };
  private material(parameters: THREE.MeshPhysicalMaterialParameters) {
    const m = new THREE.MeshPhysicalMaterial(parameters);
    this.materials.push(m);
    return m;
  }
  private jerseyTexture() {
    if (this.fabricBump) return this.fabricBump;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;
    const pixels = context.createImageData(128, 128);
    for (let y = 0; y < 128; y++)
      for (let x = 0; x < 128; x++) {
        const knit =
          Math.sin((x * Math.PI) / 2 + Math.sin((y * Math.PI) / 4) * 0.8) * 13 +
          Math.cos((y * Math.PI) / 4) * 8;
        const grain = ((Math.sin(x * 93.1 + y * 171.7) * 43758.54) % 1) * 5;
        const k = (y * 128 + x) * 4;
        pixels.data[k] =
          pixels.data[k + 1] =
          pixels.data[k + 2] =
            150 + knit + grain;
        pixels.data[k + 3] = 255;
      }
    context.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(210, 190);
    texture.anisotropy = 4;
    this.textures.push(texture);
    this.fabricBump = texture;
    return texture;
  }
  private tube(
    points: THREE.Vector3[],
    radius: number,
    material: THREE.Material,
    parent: THREE.Group,
  ) {
    const path = new THREE.CatmullRomCurve3(points);
    const m = new THREE.Mesh(
      new THREE.TubeGeometry(
        path,
        Math.max(12, points.length * 10),
        radius,
        8,
        false,
      ),
      material,
    );
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  private buildStudio() {
    // Neutral photographic fill keeps off-white and print colors independent
    // from the painted blue walls. The architecture is loaded as real geometry.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.06);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.5;
    room.dispose();
    pmrem.dispose();
    this.scene.add(this.skyStudio);
    const contactShadow = new THREE.ShadowMaterial({
      color: "#555451",
      opacity: 0.12,
      depthWrite: false,
    });
    this.materials.push(contactShadow);
    this.productFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 24),
      contactShadow,
    );
    this.productFloor.rotation.x = -Math.PI / 2;
    this.productFloor.position.y = -0.025;
    this.productFloor.receiveShadow = true;
    this.scene.add(this.productFloor);
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#b8b5ae", 0.95));
    const key = new THREE.DirectionalLight("#ffffff", 2.25);
    key.position.set(-3.5, 7.8, 7);
    key.target.position.set(0, 1.7, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(
      window.innerWidth <= 700 ? 1024 : 2048,
      window.innerWidth <= 700 ? 1024 : 2048,
    );
    Object.assign(key.shadow.camera, {
      left: -10,
      right: 10,
      top: 8,
      bottom: -4,
      near: 0.2,
      far: 30,
    });
    key.shadow.normalBias = 0.012;
    key.shadow.bias = -0.00015;
    key.shadow.radius = 5;
    key.shadow.intensity = 0.36;
    this.scene.add(key, key.target);
    const fill = new THREE.DirectionalLight("#ffffff", 0.7);
    fill.position.set(5, 3.7, 5);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight("#ffffff", 0.32);
    rim.position.set(-3, 4, -1.5);
    this.scene.add(rim);
    const metal = this.material({
      color: "#171817",
      roughness: 0.36,
      metalness: 0.48,
    });
    this.tube(
      [new THREE.Vector3(-8.25, 3.6, 0), new THREE.Vector3(8.25, 3.6, 0)],
      0.034,
      metal,
      this.rack,
    );
    for (const sign of [-1, 1]) {
      this.tube(
        [
          new THREE.Vector3(sign * 8.25, 0.01, 0),
          new THREE.Vector3(sign * 8.25, 3.4, 0),
          new THREE.Vector3(sign * 8.1, 3.6, 0),
        ],
        0.039,
        metal,
        this.rack,
      );
      this.tube(
        [
          new THREE.Vector3(sign * 8.25, 0.035, -0.58),
          new THREE.Vector3(sign * 8.25, 0.035, 0.58),
        ],
        0.043,
        metal,
        this.rack,
      );
    }
    this.camera.position.set(0, 3.4, 17);
    this.camera.lookAt(0, 3.1, 0);
  }
  private cottonMaterial(
    name: string,
    dark: boolean,
    patch: THREE.Texture,
    print?: THREE.Texture,
  ) {
    const material = this.material({
      color: "#ffffff",
      map: patch,
      roughness: 0.95,
      sheen: 0.24,
      sheenRoughness: 0.92,
      bumpMap: this.jerseyTexture(),
      bumpScale: 0.00035,
      metalness: 0,
      side: THREE.FrontSide,
    });
    material.name = name;
    material.defines = { ...material.defines, USE_UV: "" };
    const tone = { value: new THREE.Color(dark ? "#292a2c" : "#ece9df") };
    const artwork = { value: print ?? null };
    material.userData.artworkUniform = artwork;
    material.userData.cottonToneUniform = tone;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.cottonTone = tone;
      if (print) shader.uniforms.originalArtwork = artwork;
      shader.fragmentShader =
        "uniform vec3 cottonTone;\n" +
        (print ? "uniform sampler2D originalArtwork;\n" : "") +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        "#include <map_fragment>\n" +
          "diffuseColor.rgb = mix(cottonTone, diffuseColor.rgb, 0.3);\n" +
          (print
            ? "vec4 sourceInk = texture2D(originalArtwork, vUv);\n" +
              "diffuseColor.rgb = mix(diffuseColor.rgb, sourceInk.rgb, sourceInk.a);"
            : ""),
      );
    };
    material.customProgramCacheKey = () => `source-cotton-v4-${Boolean(print)}`;
    return material;
  }
  private makeHanger() {
    const g = new THREE.Group();
    const body = this.material({ color: "#181818", roughness: 0.7 });
    const outline = new THREE.Shape();
    outline.moveTo(-0.6, 0.86);
    outline.quadraticCurveTo(-0.34, 1.05, -0.11, 1.2);
    outline.lineTo(-0.08, 1.28);
    outline.lineTo(0.08, 1.28);
    outline.lineTo(0.11, 1.2);
    outline.quadraticCurveTo(0.34, 1.05, 0.6, 0.86);
    outline.lineTo(0.57, 0.79);
    outline.quadraticCurveTo(0, 0.75, -0.57, 0.79);
    outline.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-0.44, 0.85);
    hole.lineTo(0.44, 0.85);
    hole.quadraticCurveTo(0.18, 0.99, 0, 1.1);
    hole.quadraticCurveTo(-0.18, 0.99, -0.44, 0.85);
    outline.holes.push(hole);
    const geometry = new THREE.ExtrudeGeometry(outline, {
      depth: 0.045,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.01,
      curveSegments: 20,
    });
    geometry.translate(0, 0, -0.0225);
    const hanger = new THREE.Mesh(geometry, body);
    hanger.castShadow = true;
    hanger.receiveShadow = true;
    g.add(hanger);
    this.tube(
      [
        new THREE.Vector3(0, 1.22, 0),
        new THREE.Vector3(0, 1.39, 0),
        new THREE.Vector3(0.065, 1.47, 0),
        new THREE.Vector3(0.065, 1.54, 0),
        new THREE.Vector3(0, 1.57, 0),
        new THREE.Vector3(-0.055, 1.53, 0),
        new THREE.Vector3(-0.055, 1.47, 0),
      ],
      0.009,
      this.material({ color: "#999a99", roughness: 0.23, metalness: 0.9 }),
      g,
    );
    return g;
  }
  private async load() {
    const loader = new GLTFLoader();
    const suffix = window.innerWidth <= 700 ? "-mobile" : "";
    const [gltf, environment, patches]: [GLTF, GLTF, THREE.Texture[]] =
      await Promise.all([
        loader.loadAsync(`/models/oversized-shared-v4${suffix}.glb`),
        loader.loadAsync(
          suffix
            ? "/models/sky-studio-mobile-v4.glb"
            : "/models/sky-studio-v4.glb",
        ),
        Promise.all(
          ["offwhite", "black"].map(async (tone) => {
            const patch = await this.texture(
              `/media/artwork-v4/cotton-patch-${tone}.png`,
            );
            patch.wrapS = patch.wrapT = THREE.MirroredRepeatWrapping;
            patch.repeat.set(3, 4);
            return patch;
          }),
        ),
      ]);
    if (this.disposed) {
      this.disposeObject(gltf.scene);
      this.disposeObject(environment.scene);
      return;
    }
    environment.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Walls and ceiling receive the garment/rack shadows. Studio key/fill
        // are virtual softboxes, so the roof must not occlude those lights.
        object.receiveShadow = true;
        object.castShadow = false;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((m) => {
          Object.values(m).forEach((v) => {
            if (v instanceof THREE.Texture && !this.textures.includes(v))
              this.textures.push(v);
          });
        });
      }
    });
    this.skyStudio.add(environment.scene);
    this.canvas.dataset.environment = "sky-studio-v4";
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const group = new THREE.Group();
      const model = clone(gltf.scene);
      const meshes: THREE.Mesh[] = [];
      const [front, back] = await Promise.all([
        this.texture(p.textures.front),
        this.texture(p.textures.back),
      ]);
      if (this.disposed) {
        this.disposeObject(model);
        return;
      }
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        meshes.push(object);
        object.castShadow = true;
        object.receiveShadow = true;
        const old = Array.isArray(object.material)
          ? object.material
          : [object.material];
        const materials = old.map((source) =>
          this.cottonMaterial(
            source.name,
            p.dark,
            patches[p.dark ? 1 : 0],
            source.name === "Front"
              ? front
              : source.name === "Back"
                ? back
                : undefined,
          ),
        );
        object.material = Array.isArray(object.material)
          ? materials
          : materials[0];
        object.userData.productIndex = i;
      });
      const hanger = this.makeHanger();
      const pivot = new THREE.Group();
      pivot.position.y = 1.54;
      model.position.y = hanger.position.y = -1.54;
      pivot.add(model, hanger);
      group.add(pivot);
      this.root.add(group);
      const mixer = new THREE.AnimationMixer(model);
      for (const clip of gltf.animations) mixer.clipAction(clip).play();
      this.garments.push({
        group,
        model,
        hanger,
        mixer,
        meshes,
        fit: { value: 0 },
        pivot,
        reveal: 0,
        swing: 0,
        velocity: 0,
      });
    }
    this.layout(true);
    this.canvas.dataset.scene = "ready";
    this.canvas.dataset.vertices = String(
      this.garments[0].meshes.reduce(
        (n, m) => n + m.geometry.attributes.position.count,
        0,
      ),
    );
    this.options.onReady();
  }
  private async texture(url: string) {
    const texture = await new THREE.TextureLoader().loadAsync(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.anisotropy = Math.min(
      8,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    this.textures.push(texture);
    if (this.disposed) texture.dispose();
    return texture;
  }
  setProduct(id: string | null) {
    const next = id ? products.findIndex((p) => p.id === id) : null;
    if (next === this.active && !this.departing) return;
    const arrivedFromRack = this.departing;
    this.departureTween?.kill();
    this.departing = false;
    this.hover(null);
    this.active = next !== null && next < 0 ? null : next;
    this.angle = { x: 0, y: 0, zoom: 1 };
    this.turn.value = 0;
    this.mode = this.active === null ? "rack" : "loose";
    this.layout();
    if (arrivedFromRack && this.active !== null) {
      this.angle.y = products[this.active].heroView === "front" ? 0 : Math.PI;
      this.tweens.push(
        gsap.to(this.angle, { y: 0, duration: 0.85, ease: "power3.inOut" }),
      );
    }
  }
  setMobileSelection(index: number) {
    this.mobileIndex = index;
    if (this.mobile && this.active === null) this.hover(index);
    if (this.active === null) this.layout();
  }
  setMode(mode: Presentation) {
    this.mode = mode;
    this.layout();
  }
  view(view: "front" | "back" | "detail" | "reset") {
    if (this.active === null) return;
    gsap.killTweensOf(this.angle);
    gsap.killTweensOf(this.turn);
    this.tweens.push(
      gsap.to(this.angle, {
        x: 0,
        y: view === "back" ? Math.PI : 0,
        zoom: view === "detail" ? 1.52 : 1,
        duration: this.reduce ? 0 : 0.8,
        ease: "power3.inOut",
      }),
    );
    if (view === "reset") this.setMode("loose");
  }
  zoomBy(delta: number) {
    this.angle.zoom = THREE.MathUtils.clamp(
      this.angle.zoom + delta,
      0.78,
      1.65,
    );
  }
  rotateBy(delta: number) {
    this.angle.y += delta;
  }
  hover(index: number | null) {
    if (this.active !== null || this.departing || index === this.hovered)
      return;
    const previous = this.hovered;
    this.hovered = index;
    if (index !== null && this.garments[index])
      this.garments[index].velocity += this.reduce ? 0 : 0.14;
    if (previous !== null && this.garments[previous])
      this.garments[previous].velocity -= this.reduce ? 0 : 0.06;
    this.options.onHover(index);
    this.canvas.dataset.hovered = index === null ? "" : products[index].id;
    this.canvas.style.cursor = index === null ? "default" : "pointer";
  }
  openProduct(id: string) {
    if (this.departing) return;
    const index = products.findIndex((p) => p.id === id);
    if (index < 0) return;
    if (this.active !== null || this.reduce) {
      this.options.onSelect(id);
      return;
    }
    this.hover(index);
    this.departing = true;
    this.canvas.dataset.transition = "departing";
    const g = this.garments[index];
    this.tweens.forEach((t) => t.kill());
    this.departureTween = gsap.timeline({
      onComplete: () => {
        if (!this.disposed) {
          this.canvas.dataset.transition = "idle";
          this.options.onSelect(id);
        }
      },
    });
    // Lift the hook clear of the rail, then bring the selected garment toward the viewer.
    this.departureTween
      .to(g.group.position, {
        y: g.group.position.y + 0.23,
        duration: 0.22,
        ease: "power2.out",
      })
      .to(
        g.group.position,
        { x: 0, z: 2.2, y: 1.85, duration: 0.58, ease: "power3.inOut" },
        0.16,
      )
      .to(
        g.group.scale,
        { x: 1.2, y: 1.2, z: 1.2, duration: 0.58, ease: "power3.inOut" },
        0.16,
      );
  }
  private layout(immediate = false) {
    if (this.garments.length !== products.length || this.departing) return;
    this.tweens.forEach((t) => t.kill());
    this.tweens = [];
    const duration = immediate || this.reduce ? 0 : 0.9;
    const collection = this.active === null;
    const visibleHeight = collection
      ? Math.max(
          this.mobile ? 7.1 : 7.5,
          (this.mobile ? 4.8 : 17.2) / this.camera.aspect,
        )
      : Math.max(3.25, 3.95 / this.camera.aspect);
    const distance =
      visibleHeight /
      (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
    const ty = collection ? (this.mobile ? 3.28 : 3.15) : 1.6;
    this.tweens.push(
      gsap.to(this.camera.position, {
        x: 0,
        y: ty + (collection ? 0.28 : 0.18),
        z: distance + (collection ? 0 : 0.75),
        duration,
        ease: "power3.inOut",
      }),
      gsap.to(this.lookTarget, {
        x: 0,
        y: ty,
        z: collection ? 0 : 0.75,
        duration,
        ease: "power3.inOut",
      }),
    );
    this.garments.forEach((g, i) => {
      const selected = this.active === i;
      const scale = collection ? 1 : 1.15;
      const x = collection
        ? this.mobile
          ? (i - this.mobileIndex) * 2.85
          : (i - (products.length - 1) / 2) * 3.25
        : 0;
      const y = collection
        ? 3.6 - 1.54 * scale
        : this.mode === "rack"
          ? 3.6 - 1.54 * scale
          : 1.65;
      g.group.visible = collection || selected;
      g.model.position.set(0, -1.54, 0);
      g.model.rotation.set(0, collection ? 0 : this.angle.y, 0);
      g.hanger.rotation.set(0, 0, 0);
      if (!collection) {
        g.pivot.rotation.set(0, 0, 0);
        g.pivot.position.z = 0;
        g.pivot.scale.setScalar(1);
        g.reveal = 0;
        g.swing = 0;
        g.velocity = 0;
      }
      this.tweens.push(
        gsap.to(g.group.position, {
          x,
          y,
          z: collection ? 0 : 0.75,
          duration,
          ease: "power3.inOut",
        }),
        gsap.to(g.group.scale, {
          x: scale,
          y: scale,
          z: scale,
          duration,
          ease: "power3.inOut",
        }),
        gsap.to(g.hanger.scale, {
          x: collection || this.mode === "rack" ? 1 : 0,
          y: collection || this.mode === "rack" ? 1 : 0,
          z: collection || this.mode === "rack" ? 1 : 0,
          duration: duration * 0.8,
        }),
        gsap.to(g.fit, {
          value: selected
            ? this.mode === "worn"
              ? 1
              : this.mode === "loose"
                ? 0.08
                : 0
            : 0,
          duration,
          ease: "power2.inOut",
        }),
      );
    });
    this.skyStudio.visible = collection;
    if (this.productFloor) this.productFloor.visible = !collection;
    this.rack.visible = collection || this.mode === "rack";
    this.rack.position.y = 0;
    this.canvas.style.cursor = collection ? "default" : "grab";
    this.canvas.dataset.product = collection
      ? "collection"
      : products[this.active!].id;
    this.canvas.dataset.mode = this.mode;
  }
  resize(width: number, height: number) {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    const mobile = window.innerWidth <= 700;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.5),
    );
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.mobile = mobile;
    this.camera.updateProjectionMatrix();
    this.layout(true);
  }
  setVisible(v: boolean) {
    this.visible = v;
  }
  private down = (e: PointerEvent) => {
    if (e.button !== 0 || this.departing) return;
    this.drag = {
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moving: false,
    };
  };
  private move = (e: PointerEvent) => {
    if (this.departing) return;
    if (this.active === null && e.pointerType !== "touch")
      this.hover(this.hit(e));
    if (!this.drag) return;
    const d = this.drag;
    if (
      Math.abs(e.clientX - d.x) > 6 &&
      Math.abs(e.clientX - d.x) > Math.abs(e.clientY - d.y) * 1.1
    ) {
      d.moving = true;
      this.canvas.setPointerCapture(e.pointerId);
    }
    if (d.moving && this.active !== null) {
      gsap.killTweensOf(this.angle);
      this.angle.y += (e.clientX - d.lastX) * 0.009;
      this.angle.x = THREE.MathUtils.clamp(
        this.angle.x + (e.clientY - d.lastY) * 0.004,
        -0.32,
        0.32,
      );
      this.canvas.style.cursor = "grabbing";
    }
    d.lastX = e.clientX;
    d.lastY = e.clientY;
  };
  private up = (e: PointerEvent) => {
    if (!this.drag) return;
    const d = this.drag;
    this.drag = null;
    if (this.canvas.hasPointerCapture(e.pointerId))
      this.canvas.releasePointerCapture(e.pointerId);
    this.canvas.style.cursor = this.active === null ? "pointer" : "grab";
    if (this.active === null) {
      if (d.moving) {
        if (this.mobile && Math.abs(e.clientX - d.x) > 35) {
          this.mobileIndex = THREE.MathUtils.clamp(
            this.mobileIndex + (e.clientX < d.x ? 1 : -1),
            0,
            products.length - 1,
          );
          this.hover(this.mobileIndex);
          this.options.onMobileSelection?.(this.mobileIndex);
          this.layout();
        }
        return;
      }
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) {
        const hit = this.hit(e);
        if (hit !== null) this.openProduct(products[hit].id);
      }
    }
  };
  private hit(e: PointerEvent): number | null {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(
      this.garments.filter((g) => g.group.visible).flatMap((g) => g.meshes),
    )[0];
    return hit ? hit.object.userData.productIndex : null;
  }
  private cancel = () => {
    this.drag = null;
  };
  private leave = () => {
    if (!this.drag) this.hover(null);
  };
  private animate = (time: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.animate);
    if (!this.running || !this.visible || document.hidden) {
      this.last = time;
      return;
    }
    const actual = (time - this.last) / 1000 || 0.016;
    const dt = Math.min(0.05, actual);
    if (time - this.last < (this.mobile ? 30 : 15)) return;
    this.last = time;
    this.clock += dt;
    this.garments.forEach((g, i) => {
      if (!g.group.visible) return;
      if (!this.reduce) g.mixer.update(dt);
      for (const mesh of g.meshes) {
        const d = mesh.morphTargetDictionary,
          w = mesh.morphTargetInfluences;
        if (d && w && d.Worn !== undefined) w[d.Worn] = g.fit.value;
      }
      if (this.active === i) {
        // Zoom and orbit keep the visible hanger and the garment attached.
        g.pivot.rotation.set(this.angle.x, this.angle.y, 0);
        g.pivot.scale.setScalar(this.angle.zoom);
        g.model.rotation.set(0, 0, 0);
        g.model.scale.setScalar(1);
        g.model.position.y = -1.54;
      } else if (this.active === null) {
        g.model.scale.setScalar(1);
        const target =
          this.hovered === i || (this.mobile && this.mobileIndex === i) ? 1 : 0;
        g.reveal = this.reduce
          ? target
          : THREE.MathUtils.damp(g.reveal, target, 5.5, dt);
        const desired = target ? -0.012 : 0;
        g.velocity += (-48 * (g.swing - desired) - 8.5 * g.velocity) * dt;
        g.swing += g.velocity * dt;
        const face = products[i].heroView === "front" ? 0 : Math.PI;
        g.pivot.rotation.y = face + 0.24 * (1 - g.reveal);
        g.pivot.rotation.z = this.reduce ? 0 : g.swing;
        g.pivot.rotation.x = this.reduce
          ? 0
          : Math.min(0.025, Math.abs(g.velocity) * 0.08);
        g.pivot.position.z =
          g.reveal * 0.6 -
          (this.hovered !== null && this.hovered !== i ? 0.1 : 0);
        g.pivot.scale.setScalar(1 + g.reveal * 0.06);
        g.model.rotation.set(0, 0, 0);
        g.model.position.set(0, -1.54, 0);
      }
    });
    if (time - this.shadowAt > 200) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowAt = time;
    }
    this.camera.lookAt(this.lookTarget);
    this.renderer.render(this.scene, this.camera);
    this.frames++;
    this.elapsed += actual;
    if (this.elapsed > 2) {
      this.canvas.dataset.fps = String(Math.round(this.frames / this.elapsed));
      this.canvas.dataset.drawCalls = String(this.renderer.info.render.calls);
      this.frames = 0;
      this.elapsed = 0;
    }
  };
  private disposeObject(object: THREE.Object3D) {
    object.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => m.dispose());
      }
    });
  }
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.tweens.forEach((t) => t.kill());
    this.departureTween?.kill();
    gsap.killTweensOf(this.angle);
    gsap.killTweensOf(this.turn);
    this.canvas.removeEventListener("pointerdown", this.down);
    this.canvas.removeEventListener("pointermove", this.move);
    this.canvas.removeEventListener("pointerup", this.up);
    this.canvas.removeEventListener("pointercancel", this.cancel);
    this.canvas.removeEventListener("pointerleave", this.leave);
    this.canvas.removeEventListener("webglcontextlost", this.contextLost);
    document.removeEventListener("visibilitychange", this.visibility);
    this.motionQuery.removeEventListener("change", this.motionChange);
    this.garments.forEach((g) => {
      g.mixer.stopAllAction();
      g.mixer.uncacheRoot(g.model);
    });
    this.disposeObject(this.scene);
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.environment?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
