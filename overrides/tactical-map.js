(() => {
  "use strict";

  const BASE = "/hots_tank.github.io/lab/game-assets/tactical-map/cursed-hollow";
  const ASSET_BASE = "/hots_tank.github.io/lab/game-assets/draft-portraits";
  const VERTICAL_SCALE = 1;
  const HERO_SPEED = 4.8398;
  const MOUNT_MULTIPLIER = 1.3;

  const HEROES = [
    { id: "muradin", name: "Мурадин", role: "ТАНК", radius: 0.8125, color: "#58b9ff" },
    { id: "demonhunter", name: "Валла", role: "ДД · FLEX", radius: 0.625, color: "#ff7890" },
    { id: "jaina", name: "Джайна", role: "ДД · BURST", radius: 0.625, color: "#88d2ff" },
    { id: "anduin", name: "Андуин", role: "ЛЕКАРЬ", radius: 0.625, color: "#f4d77a" },
    { id: "leoric", name: "Леорик", role: "СОЛО-ЛИНИЯ", radius: 0.8125, color: "#a98aff" },
  ].map((hero) => ({
    ...hero,
    image: `${ASSET_BASE}/${hero.id}.png`,
    speed: HERO_SPEED,
    mounted: false,
    position: [0, 0],
    route: [],
  }));

  const state = {
    ready: false,
    playing: false,
    speed: 1,
    time: 0,
    selected: 0,
    layers: { structures: true, bushes: true, camps: true, objectives: true, pathing: false },
    manifest: null,
    scene: null,
    terrain: null,
    lastFrame: performance.now(),
    planRevision: 0,
  };

  const elements = Object.fromEntries([
    "glCanvas", "overlayCanvas", "viewport", "loadingPanel", "loadingDetail", "rosterList",
    "selectedName", "selectedRole", "selectedSpeed", "selectedRadius", "selectedDistance",
    "selectedEta", "mountToggle", "mountState", "sourceStats", "simClock", "playToggle",
    "orderTitle", "orderDetail", "timeline", "planCount", "cursorCoords", "cameraMode",
    "onboarding", "hideTutorial", "helpButton", "resetTeam", "clearOrders", "fitView",
    "topView", "zoomIn", "zoomOut",
  ].map((id) => [id, document.getElementById(id)]));

  const overlayContext = elements.overlayCanvas.getContext("2d");
  const heroImages = new Map();

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function length2(x, y) { return Math.hypot(x, y); }
  function formatTime(seconds) {
    const safe = Math.max(0, seconds);
    const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
    const remainder = (safe % 60).toFixed(1).padStart(4, "0");
    return `${minutes}:${remainder}`;
  }
  function routeDistance(hero) {
    let distance = 0;
    let previous = hero.position;
    for (const point of hero.route) {
      distance += length2(point[0] - previous[0], point[1] - previous[1]);
      previous = point;
    }
    return distance;
  }
  function movementSpeed(hero) { return hero.speed * (hero.mounted ? MOUNT_MULTIPLIER : 1); }
  function renderOrigin() {
    return state.manifest?.coordinateSystem?.renderOrigin
      || [state.terrain?.cellWidth / 2 || 0, state.terrain?.cellHeight / 2 || 0];
  }
  function playableBounds() {
    return state.manifest?.coordinateSystem?.playableBounds
      || [0, 0, state.terrain?.cellWidth || 0, state.terrain?.cellHeight || 0];
  }

  function parseTerrain(buffer, manifest) {
    const bytes = new Uint8Array(buffer);
    const magic = new TextDecoder().decode(bytes.subarray(0, 8));
    if (magic !== "TANKMAP2") throw new Error(`Неизвестный формат terrain.bin: ${magic}`);
    const view = new DataView(buffer);
    const width = view.getUint16(8, true);
    const height = view.getUint16(10, true);
    const averageHeight = view.getFloat32(12, true);
    const heightCount = width * height;
    const cellCount = (width - 1) * (height - 1);
    let offset = 16;
    const heights = new Float32Array(buffer, offset, heightCount); offset += heightCount * 4;
    const pcl = new Uint8Array(buffer, offset, cellCount); offset += cellCount;
    const vbl = new Uint8Array(buffer, offset, cellCount); offset += cellCount;
    const clearance = new Uint8Array(buffer, offset, cellCount);
    return {
      width, height, cellWidth: width - 1, cellHeight: height - 1,
      averageHeight, heights, pcl, vbl, clearance,
      manifest,
    };
  }

  function heightAt(x, y) {
    const terrain = state.terrain;
    if (!terrain) return 0;
    const px = clamp(x, 0, terrain.cellWidth);
    const py = clamp(y, 0, terrain.cellHeight);
    const x0 = Math.floor(px), y0 = Math.floor(py);
    const x1 = Math.min(x0 + 1, terrain.width - 1), y1 = Math.min(y0 + 1, terrain.height - 1);
    const tx = px - x0, ty = py - y0;
    const read = (gx, gy) => terrain.heights[gy * terrain.width + gx] * VERTICAL_SCALE;
    return lerp(lerp(read(x0, y0), read(x1, y0), tx), lerp(read(x0, y1), read(x1, y1), tx), ty);
  }

  class MinHeap {
    constructor() { this.items = []; }
    push(node, score) {
      const item = { node, score };
      this.items.push(item);
      let index = this.items.length - 1;
      while (index > 0) {
        const parent = (index - 1) >> 1;
        if (this.items[parent].score <= score) break;
        this.items[index] = this.items[parent];
        index = parent;
      }
      this.items[index] = item;
    }
    pop() {
      if (!this.items.length) return null;
      const root = this.items[0];
      const tail = this.items.pop();
      if (this.items.length && tail) {
        let index = 0;
        while (true) {
          const left = index * 2 + 1, right = left + 1;
          if (left >= this.items.length) break;
          let child = left;
          if (right < this.items.length && this.items[right].score < this.items[left].score) child = right;
          if (this.items[child].score >= tail.score) break;
          this.items[index] = this.items[child];
          index = child;
        }
        this.items[index] = tail;
      }
      return root;
    }
    get size() { return this.items.length; }
  }

  class Pathfinder {
    constructor(terrain) {
      this.terrain = terrain;
      this.g = new Float32Array(terrain.cellWidth * terrain.cellHeight);
      this.came = new Int32Array(terrain.cellWidth * terrain.cellHeight);
      this.seen = new Uint32Array(terrain.cellWidth * terrain.cellHeight);
      this.searchId = 0;
    }
    valid(x, y, radius) {
      const { cellWidth, cellHeight, clearance } = this.terrain;
      if (x < 0 || y < 0 || x >= cellWidth || y >= cellHeight) return false;
      return clearance[y * cellWidth + x] >= Math.ceil(radius * 10);
    }
    nearest(x, y, radius) {
      const sx = clamp(Math.floor(x), 0, this.terrain.cellWidth - 1);
      const sy = clamp(Math.floor(y), 0, this.terrain.cellHeight - 1);
      if (this.valid(sx, sy, radius)) return [sx, sy];
      for (let ring = 1; ring <= 24; ring += 1) {
        let best = null, bestDistance = Infinity;
        for (let dy = -ring; dy <= ring; dy += 1) {
          for (let dx = -ring; dx <= ring; dx += 1) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
            const px = sx + dx, py = sy + dy;
            if (!this.valid(px, py, radius)) continue;
            const distance = dx * dx + dy * dy;
            if (distance < bestDistance) { best = [px, py]; bestDistance = distance; }
          }
        }
        if (best) return best;
      }
      return null;
    }
    lineOfSight(a, b, radius) {
      const distance = length2(b[0] - a[0], b[1] - a[1]);
      const steps = Math.max(1, Math.ceil(distance / 0.35));
      for (let index = 0; index <= steps; index += 1) {
        const t = index / steps;
        if (!this.valid(Math.floor(lerp(a[0], b[0], t)), Math.floor(lerp(a[1], b[1], t)), radius)) return false;
      }
      return true;
    }
    simplify(path, radius) {
      if (path.length < 3) return path;
      const result = [path[0]];
      let anchor = 0;
      while (anchor < path.length - 1) {
        let candidate = path.length - 1;
        while (candidate > anchor + 1 && !this.lineOfSight(path[anchor], path[candidate], radius)) candidate -= 1;
        result.push(path[candidate]);
        anchor = candidate;
      }
      return result;
    }
    find(startPosition, goalPosition, radius) {
      const start = this.nearest(startPosition[0], startPosition[1], radius);
      const goal = this.nearest(goalPosition[0], goalPosition[1], radius);
      if (!start || !goal) return null;
      const { cellWidth } = this.terrain;
      const startIndex = start[1] * cellWidth + start[0];
      const goalIndex = goal[1] * cellWidth + goal[0];
      this.searchId += 1;
      if (this.searchId === 0xffffffff) { this.seen.fill(0); this.searchId = 1; }
      const heap = new MinHeap();
      this.g[startIndex] = 0;
      this.came[startIndex] = -1;
      this.seen[startIndex] = this.searchId;
      heap.push(startIndex, 0);
      const directions = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[-1,-1,Math.SQRT2]];
      let found = false;
      while (heap.size) {
        const current = heap.pop();
        if (!current) break;
        const currentIndex = current.node;
        if (currentIndex === goalIndex) { found = true; break; }
        const cx = currentIndex % cellWidth, cy = Math.floor(currentIndex / cellWidth);
        const currentG = this.g[currentIndex];
        for (const [dx, dy, cost] of directions) {
          const nx = cx + dx, ny = cy + dy;
          if (!this.valid(nx, ny, radius)) continue;
          if (dx && dy && (!this.valid(cx + dx, cy, radius) || !this.valid(cx, cy + dy, radius))) continue;
          const nextIndex = ny * cellWidth + nx;
          const nextG = currentG + cost;
          if (this.seen[nextIndex] === this.searchId && nextG >= this.g[nextIndex]) continue;
          this.seen[nextIndex] = this.searchId;
          this.g[nextIndex] = nextG;
          this.came[nextIndex] = currentIndex;
          const ax = Math.abs(goal[0] - nx), ay = Math.abs(goal[1] - ny);
          const heuristic = Math.max(ax, ay) + (Math.SQRT2 - 1) * Math.min(ax, ay);
          heap.push(nextIndex, nextG + heuristic);
        }
      }
      if (!found) return null;
      const cells = [];
      let cursor = goalIndex;
      while (cursor >= 0) {
        cells.push([cursor % cellWidth + 0.5, Math.floor(cursor / cellWidth) + 0.5]);
        cursor = this.came[cursor];
      }
      cells.reverse();
      cells[0] = [...startPosition];
      cells[cells.length - 1] = [goal[0] + 0.5, goal[1] + 0.5];
      return this.simplify(cells, radius);
    }
  }

  function normalize3(vector) {
    const size = Math.hypot(vector[0], vector[1], vector[2]) || 1;
    return [vector[0] / size, vector[1] / size, vector[2] / size];
  }
  function cross3(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
  function dot3(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
  function mat4Multiply(a, b) {
    const out = new Float32Array(16);
    for (let column = 0; column < 4; column += 1) {
      for (let row = 0; row < 4; row += 1) {
        let sum = 0;
        for (let index = 0; index < 4; index += 1) sum += a[index * 4 + row] * b[column * 4 + index];
        out[column * 4 + row] = sum;
      }
    }
    return out;
  }
  function mat4Perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
  }
  function mat4LookAt(eye, center, up) {
    const z = normalize3([eye[0]-center[0], eye[1]-center[1], eye[2]-center[2]]);
    const x = normalize3(cross3(up, z));
    const y = cross3(z, x);
    return new Float32Array([
      x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
      -dot3(x,eye),-dot3(y,eye),-dot3(z,eye),1,
    ]);
  }
  function transform4(matrix, vector) {
    return [
      matrix[0]*vector[0]+matrix[4]*vector[1]+matrix[8]*vector[2]+matrix[12]*vector[3],
      matrix[1]*vector[0]+matrix[5]*vector[1]+matrix[9]*vector[2]+matrix[13]*vector[3],
      matrix[2]*vector[0]+matrix[6]*vector[1]+matrix[10]*vector[2]+matrix[14]*vector[3],
      matrix[3]*vector[0]+matrix[7]*vector[1]+matrix[11]*vector[2]+matrix[15]*vector[3],
    ];
  }

  class Camera {
    constructor() {
      this.target = [0, 8, 0];
      this.distance = 245;
      this.yaw = 0;
      this.pitch = Math.PI * 0.34;
      this.fov = Math.PI / 4;
      this.aspect = 1;
      this.viewport = [1, 1];
      this.viewProjection = new Float32Array(16);
      this.eye = [0, 0, 0];
      this.forward = [0, 0, -1];
      this.right = [1, 0, 0];
      this.up = [0, 1, 0];
      this.update();
    }
    update() {
      const horizontal = Math.cos(this.pitch) * this.distance;
      this.eye = [
        this.target[0] + Math.sin(this.yaw) * horizontal,
        this.target[1] + Math.sin(this.pitch) * this.distance,
        this.target[2] + Math.cos(this.yaw) * horizontal,
      ];
      this.forward = normalize3([this.target[0]-this.eye[0], this.target[1]-this.eye[1], this.target[2]-this.eye[2]]);
      this.right = normalize3(cross3(this.forward, [0,1,0]));
      this.up = normalize3(cross3(this.right, this.forward));
      const view = mat4LookAt(this.eye, this.target, [0,1,0]);
      const projection = mat4Perspective(this.fov, this.aspect, 0.5, 700);
      this.viewProjection = mat4Multiply(projection, view);
    }
    resize(width, height) { this.viewport = [width, height]; this.aspect = width / Math.max(1, height); this.update(); }
    ray(screenX, screenY) {
      const ndcX = screenX / this.viewport[0] * 2 - 1;
      const ndcY = 1 - screenY / this.viewport[1] * 2;
      const tan = Math.tan(this.fov / 2);
      return normalize3([
        this.forward[0] + this.right[0]*ndcX*this.aspect*tan + this.up[0]*ndcY*tan,
        this.forward[1] + this.right[1]*ndcX*this.aspect*tan + this.up[1]*ndcY*tan,
        this.forward[2] + this.right[2]*ndcX*this.aspect*tan + this.up[2]*ndcY*tan,
      ]);
    }
    mapPoint(screenX, screenY) {
      if (!state.terrain) return null;
      const direction = this.ray(screenX, screenY);
      let plane = state.terrain.averageHeight;
      let point = null;
      for (let iteration = 0; iteration < 4; iteration += 1) {
        const t = (plane - this.eye[1]) / direction[1];
        if (t <= 0) return null;
        point = [this.eye[0]+direction[0]*t, plane, this.eye[2]+direction[2]*t];
        const origin = renderOrigin();
        const mapX = point[0] + origin[0];
        const mapY = point[2] + origin[1];
        plane = heightAt(mapX, mapY);
      }
      const origin = renderOrigin();
      const mapX = point[0] + origin[0];
      const mapY = point[2] + origin[1];
      const [left, bottom, right, top] = playableBounds();
      if (mapX < left || mapY < bottom || mapX >= right || mapY >= top) return null;
      return [mapX, mapY];
    }
    project(mapX, mapY, vertical = null) {
      if (!state.terrain) return null;
      const origin = renderOrigin();
      const world = [mapX-origin[0], vertical ?? heightAt(mapX,mapY), mapY-origin[1], 1];
      const clip = transform4(this.viewProjection, world);
      if (clip[3] <= 0) return null;
      const x = (clip[0]/clip[3]*.5+.5)*this.viewport[0];
      const y = (1-(clip[1]/clip[3]*.5+.5))*this.viewport[1];
      return [x, y, clip[2]/clip[3]];
    }
    fit() { this.target = [0, state.terrain?.averageHeight || 8, 0]; this.distance = 245; this.yaw = 0; this.pitch = Math.PI*.34; this.update(); }
    top() { this.target = [0, state.terrain?.averageHeight || 8, 0]; this.distance = 250; this.yaw = 0; this.pitch = Math.PI*.497; this.update(); }
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  function createProgram(gl, vertexSource, fragmentSource) {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    return program;
  }

  function normalizeAssetPath(value) {
    return String(value || "").replaceAll("\\", "/").replace(/^\/+/, "").toLowerCase();
  }

  function quaternionFromMapAngles(yaw, pitch = 0, roll = 0) {
    const hx = roll * .5, hy = pitch * .5, hz = yaw * .5;
    const sx = Math.sin(hx), cx = Math.cos(hx);
    const sy = Math.sin(hy), cy = Math.cos(hy);
    const sz = Math.sin(hz), cz = Math.cos(hz);
    return new Float32Array([
      sx * cy * cz - cx * sy * sz,
      cx * sy * cz + sx * cy * sz,
      cx * cy * sz - sx * sy * cz,
      cx * cy * cz + sx * sy * sz,
    ]);
  }

  class Renderer {
    constructor(canvas, camera) {
      this.canvas = canvas;
      this.camera = camera;
      this.gl = canvas.getContext("webgl", {
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      if (!this.gl) throw new Error("WebGL недоступен в этом браузере");
      this.meshes = new Map();
      this.textures = new Map();
      this.instances = [];
      this.loadedModels = 0;
      this.failedModels = [];
      this.initPrograms();
      this.whiteTexture = this.solidTexture([255,255,255,255]);
      this.blackTexture = this.solidTexture([0,0,0,0]);
    }
    initPrograms() {
      const gl = this.gl;
      this.terrainProgram = createProgram(gl, `
        precision highp float;
        attribute vec3 a_position;
        attribute vec3 a_normal;
        attribute vec2 a_uv;
        uniform mat4 u_viewProjection;
        varying vec3 v_normal; varying vec2 v_uv;
        void main(){ v_normal=a_normal; v_uv=a_uv; gl_Position=u_viewProjection*vec4(a_position,1.0); }
      `, `
        precision highp float;
        varying vec3 v_normal; varying vec2 v_uv;
        uniform sampler2D u_map; uniform sampler2D u_pathing; uniform float u_pathingMix;
        void main(){
          vec2 mapUv=v_uv;
          vec3 base=texture2D(u_map,mapUv).rgb;
          float light=.55+.45*max(dot(normalize(v_normal),normalize(vec3(-.35,.85,.3))),0.0);
          float grid=(step(.985,fract(v_uv.x*32.0))+step(.985,fract(v_uv.y*27.0)))*.035;
          float blocked=step(.5,texture2D(u_pathing,v_uv).r)*u_pathingMix;
          vec3 color=base*light+vec3(grid);
          color=mix(color,vec3(.52,.08,.1),blocked*.62);
          gl_FragColor=vec4(color,1.0);
        }
      `);
      this.terrainLocations = {
        position: gl.getAttribLocation(this.terrainProgram, "a_position"),
        normal: gl.getAttribLocation(this.terrainProgram, "a_normal"),
        uv: gl.getAttribLocation(this.terrainProgram, "a_uv"),
        viewProjection: gl.getUniformLocation(this.terrainProgram, "u_viewProjection"),
        map: gl.getUniformLocation(this.terrainProgram, "u_map"),
        pathing: gl.getUniformLocation(this.terrainProgram, "u_pathing"),
        pathingMix: gl.getUniformLocation(this.terrainProgram, "u_pathingMix"),
      };
      this.modelProgram = createProgram(gl, `
        precision highp float;
        attribute vec3 a_position;
        attribute vec3 a_normal;
        attribute vec2 a_uv0;
        attribute vec2 a_uv1;
        uniform mat4 u_viewProjection;
        uniform mat4 u_model;
        varying vec3 v_normal;
        varying vec2 v_uv0;
        varying vec2 v_uv1;
        void main(){
          vec4 world=u_model*vec4(a_position,1.0);
          v_normal=normalize(mat3(u_model)*a_normal);
          v_uv0=a_uv0;v_uv1=a_uv1;
          gl_Position=u_viewProjection*world;
        }
      `, `
        precision highp float;
        varying vec3 v_normal;
        varying vec2 v_uv0;
        varying vec2 v_uv1;
        uniform sampler2D u_diffuse;
        uniform sampler2D u_decal;
        uniform sampler2D u_alphaMask;
        uniform sampler2D u_alphaMask2;
        uniform sampler2D u_emissive;
        uniform sampler2D u_emissive2;
        uniform vec3 u_teamColor;
        uniform float u_useTeamColor;
        uniform float u_hasDiffuse;
        uniform float u_hasDecal;
        uniform float u_hasAlphaMask;
        uniform float u_hasAlphaMask2;
        uniform float u_hasEmissive;
        uniform float u_hasEmissive2;
        uniform float u_diffuseUv;
        uniform float u_decalUv;
        uniform float u_alphaUv;
        uniform float u_alpha2Uv;
        uniform float u_emissiveUv;
        uniform float u_emissive2Uv;
        uniform float u_alphaChannel;
        uniform float u_alpha2Channel;
        uniform float u_cutout;
        uniform float u_emisMult;
        uniform float u_uvScale;
        uniform float u_uvOffset;
        vec2 uv(float source){return (source>.5?v_uv1:v_uv0)*u_uvScale+vec2(u_uvOffset);}
        float channel(vec4 texel,float source){
          if(source<.5)return(dot(texel.rgb,vec3(.3333)));
          if(source<1.5)return texel.a;
          if(source<2.5)return texel.a;
          if(source<3.5)return texel.r;
          if(source<4.5)return texel.g;
          return texel.b;
        }
        void main(){
          vec4 diffuse=u_hasDiffuse>.5?texture2D(u_diffuse,uv(u_diffuseUv)):vec4(.58,.58,.58,1.0);
          float opacity=1.0;
          if(u_hasAlphaMask>.5)opacity*=channel(texture2D(u_alphaMask,uv(u_alphaUv)),u_alphaChannel);
          if(u_hasAlphaMask2>.5)opacity*=channel(texture2D(u_alphaMask2,uv(u_alpha2Uv)),u_alpha2Channel);
          if(opacity<max(.01,u_cutout))discard;
          vec3 base=u_useTeamColor>.5?mix(u_teamColor,diffuse.rgb,diffuse.a):diffuse.rgb;
          if(u_hasDecal>.5){vec4 decal=texture2D(u_decal,uv(u_decalUv));base=mix(base,decal.rgb,decal.a);}
          float light=.42+.58*max(dot(normalize(v_normal),normalize(vec3(-.38,.72,.58))),0.0);
          vec3 color=base*light;
          if(u_hasEmissive>.5){vec4 e=texture2D(u_emissive,uv(u_emissiveUv));color+=e.rgb*e.a*u_emisMult;}
          if(u_hasEmissive2>.5){vec4 e=texture2D(u_emissive2,uv(u_emissive2Uv));color+=e.rgb*e.a*u_emisMult;}
          gl_FragColor=vec4(color,opacity);
        }
      `);
      this.modelLocations = {
        position: gl.getAttribLocation(this.modelProgram,"a_position"),
        normal: gl.getAttribLocation(this.modelProgram,"a_normal"),
        uv0: gl.getAttribLocation(this.modelProgram,"a_uv0"),
        uv1: gl.getAttribLocation(this.modelProgram,"a_uv1"),
        viewProjection: gl.getUniformLocation(this.modelProgram,"u_viewProjection"),
        model: gl.getUniformLocation(this.modelProgram,"u_model"),
        teamColor: gl.getUniformLocation(this.modelProgram,"u_teamColor"),
        useTeamColor: gl.getUniformLocation(this.modelProgram,"u_useTeamColor"),
      };
      this.modelUniforms = Object.fromEntries([
        "u_diffuse", "u_decal", "u_alphaMask", "u_alphaMask2", "u_emissive", "u_emissive2",
        "u_hasDiffuse", "u_hasDecal", "u_hasAlphaMask", "u_hasAlphaMask2", "u_hasEmissive", "u_hasEmissive2",
        "u_diffuseUv", "u_decalUv", "u_alphaUv", "u_alpha2Uv", "u_emissiveUv", "u_emissive2Uv",
        "u_alphaChannel", "u_alpha2Channel", "u_cutout", "u_emisMult", "u_uvScale", "u_uvOffset",
      ].map((name) => [name, gl.getUniformLocation(this.modelProgram, name)]));
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
    }
    async load(terrain, manifest, scene) {
      this.buildTerrain(terrain);
      const image = new Image();
      image.src = `${BASE}/${manifest.terrainAlbedo.file}`;
      await image.decode();
      // t3TextureMasks rows are stored from game-space Y=0 upward. The generated
      // albedo keeps that order, so WebGL must not apply the usual DOM-image flip.
      this.mapTexture = this.imageTexture(image,false);
      this.pathingTexture = this.byteTexture(terrain.cellWidth, terrain.cellHeight, terrain.pcl);
      await this.loadStaticScene(scene, manifest.nativeAssets);
    }
    solidTexture(color) {
      const gl=this.gl,texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(color));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      return texture;
    }
    imageTexture(image,flipY=false) {
      const gl = this.gl, texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      const powerOfTwo = (value) => (value & (value - 1)) === 0;
      if(powerOfTwo(image.width)&&powerOfTwo(image.height)){
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      }else{
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      return texture;
    }
    byteTexture(width, height, data) {
      const gl = this.gl, texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    }
    buildTerrain(terrain) {
      const gl = this.gl;
      const origin = renderOrigin();
      const [left, bottom, right, top] = playableBounds().map((value) => Math.round(value));
      const vertexWidth = right - left + 1, vertexHeight = top - bottom + 1;
      const vertices = new Float32Array(vertexWidth * vertexHeight * 8);
      const rawHeight = (x, y) => terrain.heights[y*terrain.width+x]*VERTICAL_SCALE;
      for (let y=bottom; y<=top; y+=1) for (let x=left; x<=right; x+=1) {
        const hLeft=rawHeight(Math.max(0,x-1),y), hRight=rawHeight(Math.min(terrain.width-1,x+1),y);
        const hDown=rawHeight(x,Math.max(0,y-1)), hUp=rawHeight(x,Math.min(terrain.height-1,y+1));
        const normal=normalize3([hLeft-hRight,2,hDown-hUp]);
        const o=((y-bottom)*vertexWidth+(x-left))*8;
        vertices.set([x-origin[0],rawHeight(x,y),y-origin[1],...normal,x/terrain.cellWidth,y/terrain.cellHeight],o);
      }
      const indices = new Uint16Array((right-left)*(top-bottom)*6);
      let cursor=0;
      for (let y=bottom;y<top;y+=1) for(let x=left;x<right;x+=1){
        const a=(y-bottom)*vertexWidth+(x-left),b=a+1,c=a+vertexWidth,d=c+1;
        indices.set([a,c,b,b,c,d],cursor); cursor+=6;
      }
      const vbo=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vbo); gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
      const ebo=gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ebo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
      this.terrainMesh={vbo,ebo,count:indices.length};
    }
    parseStaticMesh(buffer,info) {
      const view=new DataView(buffer);
      if(new TextDecoder().decode(new Uint8Array(buffer,0,4))!=="TGM2")throw new Error("Повреждён TGM2 mesh");
      const vertexCount=view.getUint32(4,true),indexCount=view.getUint32(8,true);
      const vertexOffset=40,indexOffset=vertexOffset+vertexCount*40;
      const gl=this.gl;
      const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(buffer,vertexOffset,vertexCount*40),gl.STATIC_DRAW);
      const ebo=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ebo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint8Array(buffer,indexOffset,indexCount*2),gl.STATIC_DRAW);
      return {vbo,ebo,batches:info.batches,vertices:vertexCount,indices:indexCount};
    }
    async concurrent(items,limit,worker) {
      let cursor=0;
      const run=async()=>{while(cursor<items.length){const index=cursor++;await worker(items[index],index);}};
      await Promise.all(Array.from({length:Math.min(limit,items.length)},run));
    }
    async loadTexture(key,nativeAssets) {
      if(!key)return null;
      const normalized=normalizeAssetPath(key);
      if(this.textures.has(normalized))return this.textures.get(normalized);
      const webPath=nativeAssets.textures[normalized]||nativeAssets.textureBasenames?.[normalized.split("/").pop()];
      if(!webPath)return null;
      const image=new Image();image.src=`${BASE}/${webPath}`;await image.decode();
      const texture=this.imageTexture(image,false);this.textures.set(normalized,texture);return texture;
    }
    async loadStaticScene(sceneData,nativeAssets) {
      if(!nativeAssets?.models)throw new Error("Манифест не содержит статическую M3-геометрию");
      const grouped = new Map();
      const add = (item, layer) => {
        const key = normalizeAssetPath(item.native?.asset);
        if (!key || !nativeAssets.models[key]) return;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push({ item, layer });
      };
      sceneData.units.forEach((item) => add(item, "structures"));
      sceneData.doodads.forEach((item) => add(item, item.category === "bush" ? "bushes" : "structures"));
      const groups = [...grouped.entries()];
      await this.concurrent(groups,8,async([key,placements],index)=>{
        elements.loadingDetail.textContent=`Геометрия карты · ${index+1} / ${groups.length}`;
        try{
          const info=nativeAssets.models[key],response=await fetch(`${BASE}/${info.file}`);
          if(!response.ok)throw new Error(`HTTP ${response.status}`);
          this.meshes.set(key,this.parseStaticMesh(await response.arrayBuffer(),info));this.loadedModels+=1;
          placements.forEach(({item,layer})=>this.instances.push({key,item,layer}));
        }catch(error){this.failedModels.push({key,error:String(error)});console.warn(`Не удалось загрузить геометрию ${key}`,error);}
      });
      const textureKeys=new Set();
      for(const info of Object.values(nativeAssets.models))for(const batch of info.batches){
        for(const name of ["diffuse","decal","alphaMask","alphaMask2","emissive","emissive2"]){if(batch[name]?.texture)textureKeys.add(batch[name].texture);}
      }
      const textures=[...textureKeys];
      await this.concurrent(textures,12,async(key,index)=>{
        elements.loadingDetail.textContent=`Материалы карты · ${index+1} / ${textures.length}`;
        try{await this.loadTexture(key,nativeAssets);}catch(error){console.warn(`Не удалось загрузить текстуру ${key}`,error);}
      });
    }
    resize(width,height,dpr) {
      const pixelWidth=Math.max(1,Math.round(width*dpr)),pixelHeight=Math.max(1,Math.round(height*dpr));
      if(this.canvas.width!==pixelWidth||this.canvas.height!==pixelHeight){this.canvas.width=pixelWidth;this.canvas.height=pixelHeight;}
      this.gl.viewport(0,0,pixelWidth,pixelHeight); this.camera.resize(width,height);
    }
    resetAttributes() {
      const gl=this.gl,count=gl.getParameter(gl.MAX_VERTEX_ATTRIBS);for(let index=0;index<count;index+=1)gl.disableVertexAttribArray(index);
    }
    renderTerrain() {
      if(!this.terrainMesh||!this.mapTexture)return;
      const gl=this.gl, locations=this.terrainLocations;
      gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.scissor(0,0,this.canvas.width,this.canvas.height);
      gl.clearColor(.025,.038,.05,1);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this.resetAttributes();
      gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);
      gl.useProgram(this.terrainProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER,this.terrainMesh.vbo);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.terrainMesh.ebo);
      gl.enableVertexAttribArray(locations.position);gl.vertexAttribPointer(locations.position,3,gl.FLOAT,false,32,0);
      gl.enableVertexAttribArray(locations.normal);gl.vertexAttribPointer(locations.normal,3,gl.FLOAT,false,32,12);
      gl.enableVertexAttribArray(locations.uv);gl.vertexAttribPointer(locations.uv,2,gl.FLOAT,false,32,24);
      gl.uniformMatrix4fv(locations.viewProjection,false,this.camera.viewProjection);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.mapTexture);gl.uniform1i(locations.map,0);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.pathingTexture);gl.uniform1i(locations.pathing,1);
      gl.uniform1f(locations.pathingMix,state.layers.pathing?1:0);
      gl.drawElements(gl.TRIANGLES,this.terrainMesh.count,gl.UNSIGNED_SHORT,0);
    }
    modelMatrix(item) {
      const [mapX,mapY,authoredZ=0]=item.position,[sx,sy,sz]=item.scale||[1,1,1];
      const z=Math.abs(authoredZ)>.001?authoredZ:heightAt(mapX,mapY),origin=renderOrigin();
      const q=quaternionFromMapAngles(item.rotation||0,item.pitch||0,item.roll||0),[x,y,qz,w]=q;
      const xx=x*x,yy=y*y,zz=qz*qz,xy=x*y,xz=x*qz,yz=y*qz,wx=w*x,wy=w*y,wz=w*qz;
      const r00=1-2*(yy+zz),r01=2*(xy-wz),r02=2*(xz+wy);
      const r10=2*(xy+wz),r11=1-2*(xx+zz),r12=2*(yz-wx);
      const r20=2*(xz-wy),r21=2*(yz+wx),r22=1-2*(xx+yy);
      return new Float32Array([
        r00*sx,r20*sx,r10*sx,0,
        r01*sy,r21*sy,r11*sy,0,
        r02*sz,r22*sz,r12*sz,0,
        mapX-origin[0],z,mapY-origin[1],1,
      ]);
    }
    bindLayer(batch,name,unit,hasName,uvName,channelName=null) {
      const gl=this.gl,uniforms=this.modelUniforms,layer=batch[name],texture=layer?this.textures.get(normalizeAssetPath(layer.texture)):null;
      gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture||(name.startsWith("emissive")?this.blackTexture:this.whiteTexture));
      gl.uniform1i(uniforms[`u_${name}`],unit);
      gl.uniform1f(uniforms[hasName],layer?1:0);
      gl.uniform1f(uniforms[uvName],layer?.uv||0);
      if(channelName)gl.uniform1f(uniforms[channelName],layer?.channel??1);
    }
    renderModels() {
      const gl=this.gl,locations=this.modelLocations;this.resetAttributes();gl.useProgram(this.modelProgram);
      gl.uniformMatrix4fv(locations.viewProjection,false,this.camera.viewProjection);
      for(const instance of this.instances){
        if(state.layers[instance.layer]===false)continue;
        const mesh=this.meshes.get(instance.key);if(!mesh)continue;
        gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vbo);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ebo);
        gl.enableVertexAttribArray(locations.position);gl.vertexAttribPointer(locations.position,3,gl.FLOAT,false,40,0);
        gl.enableVertexAttribArray(locations.normal);gl.vertexAttribPointer(locations.normal,3,gl.FLOAT,false,40,12);
        gl.enableVertexAttribArray(locations.uv0);gl.vertexAttribPointer(locations.uv0,2,gl.FLOAT,false,40,24);
        gl.enableVertexAttribArray(locations.uv1);gl.vertexAttribPointer(locations.uv1,2,gl.FLOAT,false,40,32);
        gl.uniformMatrix4fv(locations.model,false,this.modelMatrix(instance.item));
        const team=instance.item.team==="blue"?[.08,.42,1]:instance.item.team==="red"?[1,.08,.12]:[1,1,1];gl.uniform3fv(locations.teamColor,team);
        gl.uniform1f(locations.useTeamColor,instance.item.team==="blue"||instance.item.team==="red"?1:0);
        for(const batch of mesh.batches){
          if(!batch.indexCount)continue;
          this.bindLayer(batch,"diffuse",0,"u_hasDiffuse","u_diffuseUv");
          this.bindLayer(batch,"decal",1,"u_hasDecal","u_decalUv");
          this.bindLayer(batch,"alphaMask",2,"u_hasAlphaMask","u_alphaUv","u_alphaChannel");
          this.bindLayer(batch,"alphaMask2",3,"u_hasAlphaMask2","u_alpha2Uv","u_alpha2Channel");
          this.bindLayer(batch,"emissive",4,"u_hasEmissive","u_emissiveUv");
          this.bindLayer(batch,"emissive2",5,"u_hasEmissive2","u_emissive2Uv");
          gl.uniform1f(this.modelUniforms.u_cutout,batch.cutout||.01);
          gl.uniform1f(this.modelUniforms.u_emisMult,batch.emisMult||1);
          gl.uniform1f(this.modelUniforms.u_uvScale,batch.uvScale??1);
          gl.uniform1f(this.modelUniforms.u_uvOffset,batch.uvOffset||0);
          if(batch.blendMode===1||batch.blendMode===2){gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.depthMask(false);}
          else if(batch.blendMode===3){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}
          else{gl.disable(gl.BLEND);gl.depthMask(true);}
          if(batch.doubleSided)gl.disable(gl.CULL_FACE);else{gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);}
          gl.drawElements(gl.TRIANGLES,batch.indexCount,gl.UNSIGNED_SHORT,batch.firstIndex*2);
        }
      }
      gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.depthMask(true);
    }
    render() {
      if(!this.terrainMesh||!this.mapTexture)return;
      this.renderTerrain();
      this.renderModels();
    }
  }

  const camera = new Camera();
  let renderer;
  let pathfinder;

  function resizeCanvases() {
    const rect=elements.viewport.getBoundingClientRect(); const dpr=Math.min(window.devicePixelRatio||1,1.6);
    renderer?.resize(rect.width,rect.height,dpr);
    const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
    if(elements.overlayCanvas.width!==w||elements.overlayCanvas.height!==h){elements.overlayCanvas.width=w;elements.overlayCanvas.height=h;}
    elements.overlayCanvas.style.width=`${rect.width}px`;elements.overlayCanvas.style.height=`${rect.height}px`;
    overlayContext.setTransform(dpr,0,0,dpr,0,0);
  }

  function renderRoster() {
    elements.rosterList.innerHTML=HEROES.map((hero,index)=>`<button class="tm-roster-card ${index===state.selected?"is-selected":""} ${hero.route.length?"has-orders":""}" data-hero="${index}" type="button"><span class="tm-avatar"><img src="${hero.image}" alt=""></span><span class="tm-roster-copy"><strong>${hero.name}</strong><small>${hero.role}</small></span><span class="tm-roster-state"></span></button>`).join("");
    elements.rosterList.querySelectorAll("[data-hero]").forEach((button)=>button.addEventListener("click",()=>selectHero(Number(button.dataset.hero))));
  }
  function selectHero(index) { state.selected=clamp(index,0,HEROES.length-1); renderRoster(); updateSelectedPanel(); }
  function updateSelectedPanel() {
    const hero=HEROES[state.selected],distance=routeDistance(hero),eta=distance/movementSpeed(hero);
    elements.selectedName.textContent=hero.name;elements.selectedRole.textContent=hero.role;
    elements.selectedSpeed.textContent=movementSpeed(hero).toFixed(2);elements.selectedRadius.textContent=hero.radius.toFixed(2);
    elements.selectedDistance.textContent=distance?`${distance.toFixed(1)} м`:"—";elements.selectedEta.textContent=distance?formatTime(state.time+eta):"—";
    elements.mountToggle.setAttribute("aria-pressed",String(hero.mounted));elements.mountState.textContent=hero.mounted?"Маунт · 130%":"Пешком · 100%";
  }
  function renderTimeline() {
    const ordered=HEROES.filter((hero)=>hero.route.length);
    elements.planCount.textContent=`${ordered.length} ${ordered.length===1?"КОМАНДА":"КОМАНД"}`;
    if(!ordered.length){elements.timeline.innerHTML='<div class="tm-empty-plan"><span>＋</span><strong>Приказов пока нет</strong><small>Выберите героя и нажмите ПКМ на карте</small></div>';return;}
    elements.timeline.innerHTML=ordered.map((hero)=>{
      const distance=routeDistance(hero),eta=state.time+distance/movementSpeed(hero);
      return `<div class="tm-timeline-item"><img class="tm-timeline-avatar" src="${hero.image}" alt=""><span class="tm-timeline-copy"><strong>${hero.name}</strong><small>${distance.toFixed(1)} м · ${hero.mounted?"НА МАУНТЕ":"ПЕШКОМ"}</small></span><span class="tm-timeline-eta">${formatTime(eta)}</span></div>`;
    }).join("");
  }
  function refreshPlanUi() { renderRoster();updateSelectedPanel();renderTimeline();state.planRevision+=1; }

  function resetTeam(clearOnly=false) {
    const spawns=state.manifest?.spawnPoints||[];
    HEROES.forEach((hero,index)=>{hero.route=[];if(!clearOnly&&spawns[index])hero.position=[spawns[index][0],spawns[index][1]];});
    if(!clearOnly){state.time=0;state.playing=false;elements.playToggle.setAttribute("aria-pressed","false");}
    refreshPlanUi();
  }

  function planRoute(goal, queue=false) {
    if(!state.ready)return;
    const hero=HEROES[state.selected];
    const start=queue&&hero.route.length?hero.route[hero.route.length-1]:hero.position;
    const path=pathfinder.find(start,goal,hero.radius);
    if(!path){elements.orderTitle.textContent="МАРШРУТ НЕ НАЙДЕН";elements.orderDetail.textContent="Точка отделена непроходимой областью";return;}
    if(queue&&hero.route.length)hero.route.push(...path.slice(1));else hero.route=path.slice(1);
    elements.orderTitle.textContent="ПРИКАЗ ДОБАВЛЕН";
    elements.orderDetail.textContent=`${hero.name}: ${routeDistance(hero).toFixed(1)} м · ETA ${formatTime(state.time+routeDistance(hero)/movementSpeed(hero))}`;
    refreshPlanUi();
  }

  function updateMovement(delta) {
    if(!state.playing)return;
    const scaled=delta*state.speed;state.time+=scaled;
    for(const hero of HEROES){
      let budget=movementSpeed(hero)*scaled;
      while(budget>0&&hero.route.length){
        const target=hero.route[0],dx=target[0]-hero.position[0],dy=target[1]-hero.position[1],distance=Math.hypot(dx,dy);
        if(distance<=budget+.0001){hero.position=[...target];hero.route.shift();budget-=distance;}
        else{hero.position=[hero.position[0]+dx/distance*budget,hero.position[1]+dy/distance*budget];budget=0;}
      }
    }
  }

  function drawMarker(point,label,color,symbol) {
    const projected=camera.project(point[0],point[1],heightAt(point[0],point[1])+1.5);if(!projected)return;
    const [x,y]=projected;if(x<-60||y<-30||x>camera.viewport[0]+60||y>camera.viewport[1]+30)return;
    overlayContext.save();overlayContext.translate(x,y);
    overlayContext.beginPath();overlayContext.arc(0,0,8,0,Math.PI*2);overlayContext.fillStyle="rgba(6,10,14,.82)";overlayContext.fill();overlayContext.strokeStyle=color;overlayContext.lineWidth=1.2;overlayContext.stroke();
    overlayContext.fillStyle=color;overlayContext.font="700 8px Consolas";overlayContext.textAlign="center";overlayContext.textBaseline="middle";overlayContext.fillText(symbol,0,.5);
    overlayContext.font="700 7px Segoe UI";const width=overlayContext.measureText(label).width+10;overlayContext.fillStyle="rgba(6,10,14,.78)";overlayContext.fillRect(-width/2,11,width,14);overlayContext.fillStyle="#b8c2cb";overlayContext.fillText(label.toUpperCase(),0,18);
    overlayContext.restore();
  }

  function drawOverlay() {
    const width=camera.viewport[0],height=camera.viewport[1];overlayContext.clearRect(0,0,width,height);
    if(!state.ready)return;
    overlayContext.lineCap="round";overlayContext.lineJoin="round";
    HEROES.forEach((hero,index)=>{
      if(!hero.route.length)return;
      const points=[hero.position,...hero.route].map((point)=>camera.project(point[0],point[1],heightAt(point[0],point[1])+.35)).filter(Boolean);
      if(points.length<2)return;
      overlayContext.beginPath();overlayContext.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i+=1)overlayContext.lineTo(points[i][0],points[i][1]);
      overlayContext.strokeStyle="rgba(3,7,10,.82)";overlayContext.lineWidth=index===state.selected?6:4;overlayContext.stroke();overlayContext.strokeStyle=hero.color;overlayContext.lineWidth=index===state.selected?2.5:1.5;overlayContext.stroke();
      const end=points[points.length-1];overlayContext.beginPath();overlayContext.arc(end[0],end[1],6,0,Math.PI*2);overlayContext.fillStyle="#081017";overlayContext.fill();overlayContext.strokeStyle=hero.color;overlayContext.lineWidth=1.5;overlayContext.stroke();
    });
    if(state.layers.camps){
      state.scene.points.filter((point)=>point.category==="camp"&&(point.name.includes("Captain")||point.name.includes("Grave Golem"))).forEach((point)=>drawMarker(point.position,point.name.includes("Grave Golem")?"Босс":point.name.includes("Hard")?"Рыцари":"Осадные","#e8af5c","◆"));
      state.scene.units.filter((unit)=>unit.category==="vision").forEach((unit)=>drawMarker(unit.position,"Обзор","#6bd6a4","◉"));
    }
    if(state.layers.objectives)state.scene.points.filter((point)=>point.category==="objective").forEach((point)=>drawMarker(point.position,"Дар","#b387ff","✦"));
    HEROES.forEach((hero,index)=>{
      const point=camera.project(hero.position[0],hero.position[1],heightAt(hero.position[0],hero.position[1])+1.6);if(!point)return;
      const [x,y]=point,r=index===state.selected?18:15;
      if(index===state.selected){
        const footprint=[];
        for(let step=0;step<=28;step+=1){const angle=step/28*Math.PI*2;const px=hero.position[0]+Math.cos(angle)*hero.radius,py=hero.position[1]+Math.sin(angle)*hero.radius;const projected=camera.project(px,py,heightAt(px,py)+.12);if(projected)footprint.push(projected);}
        if(footprint.length>2){overlayContext.beginPath();overlayContext.moveTo(footprint[0][0],footprint[0][1]);for(let step=1;step<footprint.length;step+=1)overlayContext.lineTo(footprint[step][0],footprint[step][1]);overlayContext.closePath();overlayContext.fillStyle=`${hero.color}22`;overlayContext.fill();overlayContext.strokeStyle=hero.color;overlayContext.globalAlpha=.72;overlayContext.lineWidth=1;overlayContext.stroke();overlayContext.globalAlpha=1;}
      }
      overlayContext.save();overlayContext.beginPath();overlayContext.arc(x,y,r+3,0,Math.PI*2);overlayContext.fillStyle="rgba(5,9,13,.82)";overlayContext.fill();
      if(index===state.selected){overlayContext.beginPath();overlayContext.arc(x,y,r+7,0,Math.PI*2);overlayContext.strokeStyle=hero.color;overlayContext.globalAlpha=.42;overlayContext.lineWidth=1;overlayContext.stroke();overlayContext.globalAlpha=1;}
      overlayContext.beginPath();overlayContext.arc(x,y,r,0,Math.PI*2);overlayContext.clip();const image=heroImages.get(hero.id);if(image?.complete)overlayContext.drawImage(image,x-r,y-r,r*2,r*2);else{overlayContext.fillStyle=hero.color;overlayContext.fillRect(x-r,y-r,r*2,r*2);}overlayContext.restore();
      overlayContext.beginPath();overlayContext.arc(x,y,r,0,Math.PI*2);overlayContext.strokeStyle=hero.color;overlayContext.lineWidth=index===state.selected?2:1;overlayContext.stroke();
      if(hero.mounted){overlayContext.fillStyle="#e8af5c";overlayContext.font="700 8px Consolas";overlayContext.textAlign="center";overlayContext.fillText("◆",x+r-1,y-r+3);}
    });
  }

  function hitHero(screenX,screenY) {
    let hit=-1,best=Infinity;
    HEROES.forEach((hero,index)=>{const p=camera.project(hero.position[0],hero.position[1],heightAt(hero.position[0],hero.position[1])+1.6);if(!p)return;const d=Math.hypot(p[0]-screenX,p[1]-screenY);if(d<22&&d<best){hit=index;best=d;}});
    return hit;
  }

  function updateTransportUi() {
    elements.simClock.textContent=formatTime(state.time);
    elements.playToggle.setAttribute("aria-pressed",String(state.playing));
    const status=elements.orderTitle.parentElement;status.classList.toggle("is-running",state.playing);
    if(state.playing){elements.orderTitle.textContent="СИМУЛЯЦИЯ ИДЁТ";elements.orderDetail.textContent=`Скорость ×${state.speed} · Space — пауза`;}
    else if(!HEROES.some((hero)=>hero.route.length)){elements.orderTitle.textContent="ПАУЗА ПЛАНИРОВАНИЯ";elements.orderDetail.textContent="Расставьте маршруты всей команде";}
  }

  function frame(now) {
    const delta=Math.min(.05,(now-state.lastFrame)/1000);state.lastFrame=now;
    updateMovement(delta);camera.update();renderer?.render(delta*1000);drawOverlay();updateTransportUi();
    if(state.playing){updateSelectedPanel();if(Math.floor(now/500)!==Math.floor((now-delta*1000)/500))renderTimeline();}
    requestAnimationFrame(frame);
  }

  function bindControls() {
    elements.mountToggle.addEventListener("click",()=>{const hero=HEROES[state.selected];hero.mounted=!hero.mounted;refreshPlanUi();});
    elements.playToggle.addEventListener("click",()=>{state.playing=!state.playing;});
    elements.resetTeam.addEventListener("click",()=>resetTeam(false));elements.clearOrders.addEventListener("click",()=>resetTeam(true));
    elements.fitView.addEventListener("click",()=>camera.fit());elements.topView.addEventListener("click",()=>camera.top());
    elements.zoomIn.addEventListener("click",()=>{camera.distance=clamp(camera.distance*.82,35,360);});elements.zoomOut.addEventListener("click",()=>{camera.distance=clamp(camera.distance*1.22,35,360);});
    document.querySelectorAll("[data-speed]").forEach((button)=>button.addEventListener("click",()=>{state.speed=Number(button.dataset.speed);document.querySelectorAll("[data-speed]").forEach((item)=>item.classList.toggle("is-active",item===button));}));
    document.querySelectorAll("[data-layer]").forEach((input)=>input.addEventListener("change",()=>{state.layers[input.dataset.layer]=input.checked;}));
    elements.helpButton.addEventListener("click",()=>elements.onboarding.showModal());
    elements.onboarding.addEventListener("close",()=>{if(elements.hideTutorial.checked)localStorage.setItem("tank-tactical-tutorial","hidden");});
    window.addEventListener("keydown",(event)=>{
      if(event.target.matches("input,textarea,select"))return;
      if(event.code==="Space"){event.preventDefault();state.playing=!state.playing;}
      else if(event.key.toLowerCase()==="m"){const hero=HEROES[state.selected];hero.mounted=!hero.mounted;refreshPlanUi();}
      else if(event.key.toLowerCase()==="f")camera.fit();
      else if(/^[1-5]$/.test(event.key))selectHero(Number(event.key)-1);
    });
    let drag=null;
    elements.overlayCanvas.addEventListener("pointerdown",(event)=>{
      const rect=elements.overlayCanvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
      if(event.button===0&&!event.altKey){const hit=hitHero(x,y);if(hit>=0){selectHero(hit);return;}}
      if(event.button===1||event.altKey){event.preventDefault();drag={x:event.clientX,y:event.clientY,target:[...camera.target],yaw:camera.yaw,pitch:camera.pitch,rotate:event.altKey};elements.viewport.classList.add("is-dragging");elements.overlayCanvas.setPointerCapture(event.pointerId);}
    });
    elements.overlayCanvas.addEventListener("pointermove",(event)=>{
      const rect=elements.overlayCanvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
      if(drag){const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(drag.rotate){camera.yaw=drag.yaw-dx*.008;camera.pitch=clamp(drag.pitch+dy*.006,.32,Math.PI*.497);}else{const factor=camera.distance/700;camera.target[0]=drag.target[0]-dx*factor;camera.target[2]=drag.target[2]+dy*factor;}return;}
      const point=camera.mapPoint(x,y);elements.cursorCoords.textContent=point?`X ${point[0].toFixed(1)} · Y ${point[1].toFixed(1)}`:"X — · Y —";
    });
    const stopDrag=(event)=>{if(drag){drag=null;elements.viewport.classList.remove("is-dragging");try{elements.overlayCanvas.releasePointerCapture(event.pointerId);}catch(_error){}}};
    elements.overlayCanvas.addEventListener("pointerup",stopDrag);elements.overlayCanvas.addEventListener("pointercancel",stopDrag);
    elements.overlayCanvas.addEventListener("contextmenu",(event)=>{event.preventDefault();const rect=elements.overlayCanvas.getBoundingClientRect();const point=camera.mapPoint(event.clientX-rect.left,event.clientY-rect.top);if(point)planRoute(point,event.shiftKey);});
    elements.overlayCanvas.addEventListener("wheel",(event)=>{event.preventDefault();camera.distance=clamp(camera.distance*Math.exp(event.deltaY*.001),35,360);},{passive:false});
    new ResizeObserver(resizeCanvases).observe(elements.viewport);
  }

  async function init() {
    bindControls();renderRoster();updateSelectedPanel();
    for(const hero of HEROES){const image=new Image();image.src=hero.image;heroImages.set(hero.id,image);}
    if(!new URLSearchParams(location.search).has("skipTutorial")&&localStorage.getItem("tank-tactical-tutorial")!=="hidden")elements.onboarding.showModal();
    try{
      renderer=new Renderer(elements.glCanvas,camera);resizeCanvases();
      elements.loadingDetail.textContent="Читаем .stormmap и painted-pathing";
      const [manifestResponse,sceneResponse,terrainResponse]=await Promise.all([fetch(`${BASE}/manifest.json`),fetch(`${BASE}/scene.json`),fetch(`${BASE}/terrain.bin`)]);
      if(!manifestResponse.ok||!sceneResponse.ok||!terrainResponse.ok)throw new Error("Набор карты не найден в статической сборке");
      state.manifest=await manifestResponse.json();state.scene=await sceneResponse.json();state.terrain=parseTerrain(await terrainResponse.arrayBuffer(),state.manifest.terrain);
      pathfinder=new Pathfinder(state.terrain);resetTeam(false);
      requestAnimationFrame(frame);
      elements.loadingDetail.textContent="Загружаем нативные M3-модели и материалы";
      await renderer.load(state.terrain,state.manifest,state.scene);
      elements.sourceStats.textContent=`${state.scene.counts.units} объектов · ${state.scene.counts.doodads} декораций · ${renderer.loadedModels}/${state.manifest.nativeAssets.counts.models} M3`;
      if(renderer.failedModels.length)console.warn("M3 models skipped",renderer.failedModels);
      state.ready=true;elements.loadingPanel.classList.add("is-hidden");
    }catch(error){console.error(error);elements.loadingDetail.textContent=error.message;elements.loadingPanel.querySelector("strong").textContent="КАРТА НЕ ЗАГРУЖЕНА";elements.loadingPanel.querySelector(".tm-loader").style.display="none";}
  }

  init();
})();
