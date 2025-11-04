// main.js — Стабильное FPS-движение (Babylon v8) с собственной коллизией
// ИСПРАВЛЕНО: AABB портала выступает внутрь комнаты на radius+0.2, чтобы ты попадал в триггер.
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
  portalCooldownUntil: 0
};

// ---------- JSON ----------
async function loadJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const j = await r.json();
  log("LOAD", `JSON ok: ${url}`);
  return j;
}

// ---------- геометрия (визуал) ----------
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

  // Пол/потолок
  makeBox(scene, [sx, 0.3, sz], [cx, cy - hh - 0.15, cz], mats.floor, false);
  makeBox(scene, [sx, 0.2, sz], [cx, cy + hh,        cz], mats.ceil,  false);

  // Стены (визуальные панели)
  makeBox(scene, [sx, sy, 0.2], [cx, cy, cz - hd], mats.s, false); // south (−Z)
  makeBox(scene, [sx, sy, 0.2], [cx, cy, cz + hd], mats.n, false); // north (+Z)
  makeBox(scene, [0.2, sy, sz], [cx - hw, cy, cz], mats.w, false); // west  (−X)
  makeBox(scene, [0.2, sy, sz], [cx + hw, cy, cz], mats.e, false); // east  (+X)

  // Объекты
  for (const o of room.objects || []) {
    const m = matById(o.material);
    makeBox(scene, o.size, o.center, m, false);
  }

  // Аркадная высота глаз
  const floorTopY = cy - hh;
  const eye = G.playerCfg ? (G.playerCfg.height * 0.8) : 1.4;
  G.fixedEyeY = floorTopY + eye;
  log("PHYS", `floorTopY=${floorTopY.toFixed(3)} fixedEyeY=${G.fixedEyeY.toFixed(3)}`);

  // --- Подготовка коллизии ---
  const R = G.playerCfg?.radius ?? 0.36;

  // 1) Границы комнаты с учётом радиуса
  G.coll.minX = cx - hw + R;
  G.coll.maxX = cx + hw - R;
  G.coll.minZ = cz - hd + R;
  G.coll.maxZ = cz + hd - R;

  // 2) Проёмы (для пропуска через стены)
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

  // 3) Твёрдые объекты как AABB по XZ (с учётом радиуса)
  G.coll.solids = [];
  for (const o of room.objects || []) {
    if (!o.solid) continue;
    const [ox, , oz] = o.center;
    const [sx2, , sz2] = o.size;
    const hx = sx2/2 + R;
    const hz = sz2/2 + R;
    G.coll.solids.push({
      minX: ox - hx, maxX: ox + hx,
      minZ: oz - hz, maxZ: oz + hz
    });
  }
}

// ---------- “физика” по XZ ----------
function clampRoomWithOpenings(pos, next) {
  let x = next.x, z = next.z;

  // Проверяем каждую стену и пропускаем только через проёмы
  // NORTH (+Z)
  if (z > G.coll.maxZ) {
    const open = G.coll.openings.north.some(o => x >= o.x1 && x <= o.x2);
    if (!open) z = G.coll.maxZ;
  }
  // SOUTH (−Z)
  if (z < G.coll.minZ) {
    const open = G.coll.openings.south.some(o => x >= o.x1 && x <= o.x2);
    if (!open) z = G.coll.minZ;
  }
  // EAST (+X)
  if (x > G.coll.maxX) {
    const open = G.coll.openings.east.some(o => z >= o.z1 && z <= o.z2);
    if (!open) x = G.coll.maxX;
  }
  // WEST (−X)
  if (x < G.coll.minX) {
    const open = G.coll.openings.west.some(o => z >= o.z1 && z <= o.z2);
    if (!open) x = G.coll.minX;
  }

  return new Vector3(x, G.fixedEyeY ?? pos.y, z);
}

function sweepAgainstSolids(prev, curr) {
  let x = curr.x, z = curr.z;
  for (const aabb of G.coll.solids) {
    const inside = (x >= aabb.minX && x <= aabb.maxX && z >= aabb.minZ && z <= aabb.maxZ);
    if (!inside) continue;

    const dxLeft  = Math.abs(x - aabb.minX);
    const dxRight = Math.abs(aabb.maxX - x);
    const dzTop   = Math.abs(z - aabb.minZ);
    const dzBot   = Math.abs(aabb.maxZ - z);
    const minPen = Math.min(dxLeft, dxRight, dzTop, dzBot);

    if (minPen === dxLeft) x = aabb.minX;
    else if (minPen === dxRight) x = aabb.maxX;
    else if (minPen === dzTop) z = aabb.minZ;
    else z = aabb.maxZ;
  }
  return new Vector3(x, G.fixedEyeY ?? prev.y, z);
}

// ---------- порталы ----------
function inPortal(pos, portal) {
  return (
    pos.x >= portal.min.x && pos.x <= portal.max.x &&
    pos.y >= portal.min.y && pos.y <= portal.max.y &&
    pos.z >= portal.min.z && pos.z <= portal.max.z
  );
}

// ---------- загрузка комнаты ----------
async function loadRoom(roomFile) {
  log("ROOM", `load -> ${roomFile}`);
  if (G.scene) G.scene.dispose();

  const scene = new Scene(G.engine);
  scene.clearColor = new Color4(0.05,0.06,0.08,1);
  G.scene = scene;

  if (!G.playerCfg) G.playerCfg = await loadJSON("/player/player.json");
  const cfg = G.playerCfg;
  const R = cfg.radius ?? 0.36; // радиус игрока

  const cam = new UniversalCamera("playerCam", new Vector3(0, 1.6, 0), scene);
  cam.fov = Tools.ToRadians(cfg.fov || 75);
  cam.minZ = 0.05; cam.maxZ = 1000;
  cam.attachControl(canvas, true);
  cam.checkCollisions = false;
  cam.applyGravity = false;
  cam.keysUp=[]; cam.keysDown=[]; cam.keysLeft=[]; cam.keysRight=[];
  cam.inertia = 0.0;
  cam.angularSensibility = (cfg.controls?.mouseSensitivity ?? 900);

  scene.onKeyboardObservable.add((e) => {
    if (e.type === KeyboardEventTypes.KEYDOWN) {
      G.keys[e.event.code] = true;
      if (e.event.code === "ShiftLeft") G.keys.__RUN__ = true;
    } else if (e.type === KeyboardEventTypes.KEYUP) {
      G.keys[e.event.code] = false;
      if (e.event.code === "ShiftLeft") G.keys.__RUN__ = false;
    }
  });
  canvas.addEventListener("click", () => {
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
  });

  G.camera = cam;

  // Свет
  const hemi = new HemisphericLight("hemi", new Vector3(0,1,0), scene);
  hemi.intensity = 0.0;
  scene.ambientColor = new Color3(1,1,1);

  // Комната + материалы
  const room = await loadJSON(roomFile);
  G.room = room; G.currentRoomFile = roomFile;

  G.textures.clear(); G.materials.clear();
  for (const t of room.textures || []) {
    const tex = new Texture(t.path, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
    G.textures.set(t.id, tex);
  }
  for (const m of room.materials || []) {
    const mat = new StandardMaterial(m.id, scene);
    const tex = m.texture ? G.textures.get(m.texture) : null;
    if (tex) mat.diffuseTexture = tex;
    mat.specularColor = new Color3(0,0,0);
    G.materials.set(m.id, mat);
  }

  for (const L of room.lights || []) {
    if (L.type === "point") {
      const l = new PointLight("pt", v3(L.pos || [0,1,0]), scene);
      l.intensity = L.intensity ?? 700;
      l.range = L.range ?? 18;
      const c = L.color || [1,1,1];
      l.diffuse = new Color3(c[0], c[1], c[2]);
    }
  }

  // Визуальная геометрия и коллизия
  buildRoom(room, scene);

  // Порталы → AABB (РАСШИРЕНО ВНУТРЬ КОМНАТЫ НА R+0.2)
  G.portals = [];
  const [cx,cy,cz] = room.center;
  const [sx,sy,sz] = room.size;
  const hw = sx/2, hh = sy/2, hd = sz/2;

  function wallWorldCenter(wall, y) {
    if (wall === "west")  return [cx - hw, y, cz];
    if (wall === "east")  return [cx + hw, y, cz];
    if (wall === "south") return [cx, y, cz - hd];
    if (wall === "north") return [cx, y, cz + hd];
    return [cx, y, cz];
  }

  for (const p of room.portals || []) {
    const rc = p.rect?.center || [0,1.1];
    const rs = p.rect?.size   || [1.6,2.2];
    const c = wallWorldCenter(p.wall, rc[1]);

    const size = [
      (p.wall === "north" || p.wall === "south") ? rs[0] : 0.2,
      rs[1],
      (p.wall === "east"  || p.wall === "west")  ? rs[0] : 0.2
    ];

    // Декоративная панель
    const pm = new StandardMaterial(`portal_${p.id}`, scene);
    pm.emissiveColor = p.locked ? new Color3(1,0.2,0.2) : new Color3(0.2,1,0.4);
    pm.alpha = 0.25;
    makeBox(scene, size, c, pm, false);

    // AABB триггера с "заходом" внутрь комнаты
    const half = [size[0]/2, size[1]/2, size[2]/2];
    let min = new Vector3(c[0]-half[0], c[1]-half[1], c[2]-half[2]);
    let max = new Vector3(c[0]+half[0], c[1]+half[1], c[2]+half[2]);

    const inward = R + 0.2; // насколько заходит внутрь комнаты
    if (p.wall === "east") {
      // стена на X = cx+hw, уводим min.x внутрь комнаты
      min.x = (cx + hw) - inward;
    } else if (p.wall === "west") {
      // стена на X = cx-hw, уводим max.x внутрь
      max.x = (cx - hw) + inward;
    } else if (p.wall === "north") {
      // стена на Z = cz+hd
      min.z = (cz + hd) - inward;
    } else if (p.wall === "south") {
      // стена на Z = cz-hd
      max.z = (cz - hd) + inward;
    }

    G.portals.push({ id:p.id, toRoomFile:p.toRoomFile, locked:!!p.locked, min, max });
  }

  // Спавн
  if (room.playerSpawn?.enabled) {
    const s = room.playerSpawn;
    cam.position = new Vector3(s.pos[0], G.fixedEyeY, s.pos[2]);
    cam.rotation  = new Vector3(0, Tools.ToRadians(s.yaw || 0), 0);
  } else {
    cam.position.y = G.fixedEyeY;
  }

  // Кулдаун порталов
  G.portalCooldownUntil = performance.now() + 900;

  // Главный цикл
  scene.onBeforeRenderObservable.add(() => {
    const dt = G.engine.getDeltaTime()/1000;
    const now = performance.now();

    const fwd = G.camera.getDirection(new Vector3(0,0,1));
    const right = G.camera.getDirection(new Vector3(1,0,0));
    fwd.y = 0; right.y = 0;
    if (fwd.lengthSquared()>0) fwd.normalize();
    if (right.lengthSquared()>0) right.normalize();

    let wish = Vector3.Zero();
    if (G.keys["KeyW"] || G.keys["ArrowUp"])    wish = wish.add(fwd);
    if (G.keys["KeyS"] || G.keys["ArrowDown"])  wish = wish.subtract(fwd);
    if (G.keys["KeyD"] || G.keys["ArrowRight"]) wish = wish.add(right);
    if (G.keys["KeyA"] || G.keys["ArrowLeft"])  wish = wish.subtract(right);

    if (wish.lengthSquared() > 0) {
      const speed = (G.keys.__RUN__ ? G.playerCfg.runSpeed : G.playerCfg.walkSpeed) * dt;
      wish = wish.normalize().scale(speed);

      const prev = G.camera.position.clone();
      const target = prev.add(wish);

      let afterWalls  = clampRoomWithOpenings(prev, target);
      let afterSolids = sweepAgainstSolids(prev, afterWalls);

      if (G.fixedEyeY != null) afterSolids.y = G.fixedEyeY;
      G.camera.position.copyFrom(afterSolids);
    } else {
      if (G.fixedEyeY != null) G.camera.position.y = G.fixedEyeY;
    }

    // Порталы
    if (now >= G.portalCooldownUntil) {
      const p = G.camera.position;
      for (const portal of G.portals) {
        if (inPortal(p, portal)) {
          if (portal.locked) { log("TRIG", `portal ${portal.id} LOCKED`); return; }
          log("ROOM", `portal ${portal.id} → ${portal.toRoomFile}`);
          loadRoom(portal.toRoomFile).catch(err => log("ERR", err.message));
          return;
        }
      }
    }
  });

  log("ROOM", `loaded "${room.id}" (walls+floor+ceil+props+portals)`);
  return scene;
}

// ---------- старт ----------
async function start() {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  G.engine = engine;

  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && document.pointerLockElement === canvas) document.exitPointerLock();
    G.keys[e.code] = true;
  });
  window.addEventListener("keyup", (e) => G.keys[e.code] = false);

  const scene = await loadRoom(G.currentRoomFile);
  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());

  log("SYS", "READY: WASD / Shift — бег, мышь — обзор; проходи через зелёный проём");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
