// main.js — Стабильное FPS-движение (Babylon v8) с собственной коллизией
// ИСПРАВЛЕНО: Корректный расчёт AABB триггера портала для всех стен.
import {
  Engine, Scene, UniversalCamera, HemisphericLight, PointLight,
  MeshBuilder, Vector3, Color3, Color4, Texture, StandardMaterial,
  Tools, KeyboardEventTypes
} from "babylonjs";
import "babylonjs-loaders";
import "babylonjs-materials";

const canvas = document.getElementById("renderCanvas");
const logEl  = document.getElementById("log");
function log(tag, msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${String(tag).padEnd(6)} ${msg}`;
  console.log("[Engine]", line);
  if (logEl) { logEl.textContent += line + "\n"; logEl.scrollTop = logEl.scrollHeight; }
}
const v3 = (a)=> new Vector3(a[0],a[1],a[2]);

const G = {
  engine: null, scene: null, camera: null,
  playerCfg: null,
  currentRoomFile: "/rooms/RoomA.json",
  room: null,
  textures: new Map(), materials: new Map(),
  portals: [],
  keys: {},
  fixedEyeY: null,
  coll: {
    minX: 0, maxX: 0, minZ: 0, maxZ: 0,
    openings: { north: [], south: [], west: [], east: [] },
    solids: []
  },
  portalCooldownUntil: 0,
  isLoading: false,
  nextRoomFile: null,
  playerSpawnInfo: null
};

// ... (JSON, геометрия и коллизия остаются без изменений) ...
async function loadJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const j = await r.json();
  log("LOAD", `JSON ok: ${url}`);
  return j;
}

function makeBox(scene, size, pos, mat, collides=true) {
  const m = MeshBuilder.CreateBox("box", { width:size[0], height:size[1], depth:size[2] }, scene);
  m.position = new Vector3(pos[0], pos[1], pos[2]);
  m.checkCollisions = !!collides;
  m.isPickable = false;
  if (mat) m.material = mat;
  return m;
}
const matById = (id)=> G.materials.get(id) || null;

function buildRoom(room, scene) {
  const [cx,cy,cz] = room.center;
  const [sx,sy,sz] = room.size;
  const hw = sx/2, hh = sy/2, hd = sz/2;

  const mats = {
    floor: matById(room.materialsPerFace?.floor),
    ceil:  matById(room.materialsPerFace?.ceiling),
    n:     matById(room.materialsPerFace?.wallNorth),
    s:     matById(room.materialsPerFace?.wallSouth),
    w:     matById(room.materialsPerFace?.wallWest),
    e:     matById(room.materialsPerFace?.wallEast)
  };

  makeBox(scene, [sx, 0.3, sz], [cx, cy - hh - 0.15, cz], mats.floor, false);
  makeBox(scene, [sx, 0.2, sz], [cx, cy + hh,        cz], mats.ceil,  false);
  makeBox(scene, [sx, sy, 0.2], [cx, cy, cz - hd], mats.s, false);
  makeBox(scene, [sx, sy, 0.2], [cx, cy, cz + hd], mats.n, false);
  makeBox(scene, [0.2, sy, sz], [cx - hw, cy, cz], mats.w, false);
  makeBox(scene, [0.2, sy, sz], [cx + hw, cy, cz], mats.e, false);

  for (const o of room.objects || []) {
    makeBox(scene, o.size, o.center, matById(o.material), false);
  }

  const floorTopY = cy - hh;
  const eye = G.playerCfg ? (G.playerCfg.height * 0.8) : 1.4;
  G.fixedEyeY = floorTopY + eye;
  log("PHYS", `floorTopY=${floorTopY.toFixed(3)} fixedEyeY=${G.fixedEyeY.toFixed(3)}`);

  const R = G.playerCfg?.radius ?? 0.36;
  G.coll.minX = cx - hw + R; G.coll.maxX = cx + hw - R;
  G.coll.minZ = cz - hd + R; G.coll.maxZ = cz + hd - R;

  G.coll.openings = { north: [], south: [], west: [], east: [] };
  for (const p of room.portals || []) {
    const rc = p.rect?.center || [0,1.1];
    const rs = p.rect?.size   || [1.6,2.2];
    if (p.wall === "north" || p.wall === "south") {
      const wallZ = (p.wall === "north") ? (cz + hd) : (cz - hd);
      const xCenterWorld = cx + rc[0];
      const half = rs[0] / 2;
      G.coll.openings[p.wall].push({ z: wallZ, x1: xCenterWorld - half, x2: xCenterWorld + half });
    } else if (p.wall === "east" || p.wall === "west") {
      const wallX = (p.wall === "east") ? (cx + hw) : (cx - hw);
      const zCenterWorld = cz + rc[0];
      const half = rs[0] / 2;
      G.coll.openings[p.wall].push({ x: wallX, z1: zCenterWorld - half, z2: zCenterWorld + half });
    }
  }

  G.coll.solids = [];
  for (const o of room.objects || []) {
    if (!o.solid) continue;
    const [ox, , oz] = o.center; const [sx2, , sz2] = o.size;
    const hx = sx2/2 + R; const hz = sz2/2 + R;
    G.coll.solids.push({ minX: ox - hx, maxX: ox + hx, minZ: oz - hz, maxZ: oz + hz });
  }
}

function clampRoomWithOpenings(pos, next) {
  let x = next.x, z = next.z;
  if (z > G.coll.maxZ && !G.coll.openings.north.some(o => x >= o.x1 && x <= o.x2)) z = G.coll.maxZ;
  if (z < G.coll.minZ && !G.coll.openings.south.some(o => x >= o.x1 && x <= o.x2)) z = G.coll.minZ;
  if (x > G.coll.maxX && !G.coll.openings.east.some(o => z >= o.z1 && z <= o.z2)) x = G.coll.maxX;
  if (x < G.coll.minX && !G.coll.openings.west.some(o => z >= o.z1 && z <= o.z2)) x = G.coll.minX;
  return new Vector3(x, G.fixedEyeY ?? pos.y, z);
}

function sweepAgainstSolids(prev, curr) {
  let x = curr.x, z = curr.z;
  for (const aabb of G.coll.solids) {
    if (x >= aabb.minX && x <= aabb.maxX && z >= aabb.minZ && z <= aabb.maxZ) {
      const dxL = Math.abs(x - aabb.minX), dxR = Math.abs(aabb.maxX - x);
      const dzT = Math.abs(z - aabb.minZ), dzB = Math.abs(aabb.maxZ - z);
      const minPen = Math.min(dxL, dxR, dzT, dzB);
      if (minPen === dxL) x = aabb.minX; else if (minPen === dxR) x = aabb.maxX;
      else if (minPen === dzT) z = aabb.minZ; else z = aabb.maxZ;
    }
  }
  return new Vector3(x, G.fixedEyeY ?? prev.y, z);
}

function inPortal(pos, portal) {
  return pos.x >= portal.min.x && pos.x <= portal.max.x && pos.y >= portal.min.y &&
         pos.y <= portal.max.y && pos.z >= portal.min.z && pos.z <= portal.max.z;
}

// ---------- Загрузка комнаты ----------
async function loadRoom(roomFile) {
  if (G.isLoading) return;
  G.isLoading = true;
  log("ROOM", `load -> ${roomFile}`);

  if (G.scene) {
    G.scene.dispose();
    G.scene = null;
  }

  const scene = new Scene(G.engine);
  scene.clearColor = new Color4(0.05,0.06,0.08,1);
  G.scene = scene;

  if (!G.playerCfg) G.playerCfg = await loadJSON("/player/player.json");
  const cfg = G.playerCfg;
  const R = cfg.radius ?? 0.36;

  const cam = new UniversalCamera("playerCam", new Vector3(0, 1.6, 0), scene);
  cam.fov = Tools.ToRadians(cfg.fov || 75);
  cam.minZ = 0.05; cam.maxZ = 1000;
  cam.attachControl(canvas, true);
  cam.checkCollisions = false; cam.applyGravity = false;
  cam.keysUp=[]; cam.keysDown=[]; cam.keysLeft=[]; cam.keysRight=[];
  cam.inertia = 0.0;
  cam.angularSensibility = (cfg.controls?.mouseSensitivity ?? 900);
  G.camera = cam;

  G.keys = {};
  scene.onKeyboardObservable.add((e) => {
    G.keys[e.event.code] = (e.type === KeyboardEventTypes.KEYDOWN);
  });
  canvas.addEventListener("click", () => {
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
  });

  const hemi = new HemisphericLight("hemi", new Vector3(0,1,0), scene);
  hemi.intensity = 0.0; scene.ambientColor = new Color3(1,1,1);

  const room = await loadJSON(roomFile);
  G.room = room; G.currentRoomFile = roomFile;

  G.textures.clear(); G.materials.clear();
  for (const t of room.textures || []) G.textures.set(t.id, new Texture(t.path, scene));
  for (const m of room.materials || []) {
    const mat = new StandardMaterial(m.id, scene);
    if (m.texture) mat.diffuseTexture = G.textures.get(m.texture);
    mat.specularColor = new Color3(0,0,0);
    G.materials.set(m.id, mat);
  }
  for (const L of room.lights || []) {
    if (L.type === "point") {
      const l = new PointLight("pt", v3(L.pos), scene);
      l.intensity = L.intensity ?? 700; l.range = L.range ?? 18;
      const c = L.color || [1,1,1]; l.diffuse = new Color3(c[0], c[1], c[2]);
    }
  }

  buildRoom(room, scene);

  G.portals = [];
  const [cx,cy,cz] = room.center; const [sx,sy,sz] = room.size;
  const hw = sx/2, hd = sz/2;

  function wallWorldCenterWithOffset(wall, y, offset) {
    if (wall === "west")  return new Vector3(cx - hw, y, cz + offset);
    if (wall === "east")  return new Vector3(cx + hw, y, cz + offset);
    if (wall === "south") return new Vector3(cx + offset, y, cz - hd);
    if (wall === "north") return new Vector3(cx + offset, y, cz + hd);
    return new Vector3(cx, y, cz);
  }

  for (const p of room.portals || []) {
    const rc = p.rect?.center || [0,1.1]; const rs = p.rect?.size || [1.6,2.2];
    const centerVec = wallWorldCenterWithOffset(p.wall, rc[1], rc[0]);
    const c = [centerVec.x, centerVec.y, centerVec.z];
    const size = [(p.wall==="north"||p.wall==="south")?rs[0]:0.2, rs[1], (p.wall==="east"||p.wall==="west")?rs[0]:0.2];
    
    const pm = new StandardMaterial(`portal_${p.id}`, scene);
    pm.emissiveColor = p.locked ? new Color3(1,0.2,0.2) : new Color3(0.2,1,0.4);
    pm.alpha = 0.25;
    makeBox(scene, size, c, pm, false);

    const h = [size[0]/2,size[1]/2,size[2]/2];
    let min = new Vector3(c[0]-h[0], c[1]-h[1], c[2]-h[2]);
    let max = new Vector3(c[0]+h[0], c[1]+h[1], c[2]+h[2]);
    const inward = R + 0.2;

    // --- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ ЗДЕСЬ ---
    if (p.wall === "east") min.x = (cx + hw) - inward;
    else if (p.wall === "west") max.x = (cx - hw) + inward; // Было `inward`, стало +`inward`
    else if (p.wall === "north") min.z = (cz + hd) - inward;
    else if (p.wall === "south") max.z = (cz - hd) + inward; // Было `inward`, стало +`inward`
    
    G.portals.push({ ...p, min, max });
  }

  if (G.playerSpawnInfo) {
    cam.position = new Vector3(G.playerSpawnInfo.pos[0], G.fixedEyeY, G.playerSpawnInfo.pos[2]);
    cam.rotation = new Vector3(0, Tools.ToRadians(G.playerSpawnInfo.yaw || 0), 0);
    G.playerSpawnInfo = null;
  } else if (room.playerSpawn?.enabled) {
    const s = room.playerSpawn;
    cam.position = new Vector3(s.pos[0], G.fixedEyeY, s.pos[2]);
    cam.rotation = new Vector3(0, Tools.ToRadians(s.yaw || 0), 0);
  } else {
    cam.position.y = G.fixedEyeY;
  }

  G.portalCooldownUntil = performance.now() + 500;

  scene.onBeforeRenderObservable.add(() => {
    if (G.isLoading || G.nextRoomFile) return;
    const dt = G.engine.getDeltaTime()/1000;
    
    const fwd = G.camera.getDirection(Vector3.Forward()); const right = G.camera.getDirection(Vector3.Right());
    fwd.y = 0; right.y = 0;
    
    let wish = Vector3.Zero();
    if (G.keys["KeyW"] || G.keys["ArrowUp"]) wish.addInPlace(fwd);
    if (G.keys["KeyS"] || G.keys["ArrowDown"]) wish.subtractInPlace(fwd);
    if (G.keys["KeyD"] || G.keys["ArrowRight"]) wish.addInPlace(right);
    if (G.keys["KeyA"] || G.keys["ArrowLeft"]) wish.subtractInPlace(right);

    if (wish.lengthSquared() > 0) {
      const speed = (G.keys["ShiftLeft"] ? G.playerCfg.runSpeed : G.playerCfg.walkSpeed) * dt;
      wish.normalize().scaleInPlace(speed);
      const prev = G.camera.position;
      const target = prev.add(wish);

      if (performance.now() >= G.portalCooldownUntil) {
        for (const portal of G.portals) {
          if (inPortal(target, portal)) {
            if (portal.locked) { log("TRIG", `portal ${portal.id} LOCKED`); return; }
            log("ROOM", `portal ${portal.id} → ${portal.toRoomFile}`);
            G.nextRoomFile = portal.toRoomFile;
            G.playerSpawnInfo = { pos: portal.exitPos, yaw: portal.exitYaw };
            return;
          }
        }
      }

      let afterWalls = clampRoomWithOpenings(prev, target);
      let afterSolids = sweepAgainstSolids(prev, afterWalls);
      G.camera.position.copyFrom(afterSolids);
    }
    
    if (G.fixedEyeY != null) G.camera.position.y = G.fixedEyeY;
  });

  log("ROOM", `loaded "${room.id}" (walls+floor+ceil+props+portals)`);
  G.isLoading = false;
}

// ---------- Старт ----------
async function start() {
  const engine = new Engine(canvas, true);
  G.engine = engine;

  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && document.pointerLockElement === canvas) document.exitPointerLock();
    G.keys[e.code] = true;
  });
  window.addEventListener("keyup", (e) => G.keys[e.code] = false);

  await loadRoom(G.currentRoomFile);

  engine.runRenderLoop(() => {
    if (G.nextRoomFile && !G.isLoading) {
      loadRoom(G.nextRoomFile).catch(err => {
        log("ERR", `Failed to load room: ${err.message}`);
        G.isLoading = false;
      });
      G.nextRoomFile = null;
    }

    if (!G.isLoading && G.scene && G.scene.isReady()) {
      G.scene.render();
    }
  });

  window.addEventListener("resize", () => engine.resize());
  log("SYS", "READY: WASD / Shift — бег, мышь — обзор; проходи через зелёный проём");
}

start();