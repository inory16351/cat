'use strict';
// ───────────────────────── 기본 설정 ─────────────────────────
const W = 1280, H = 720, GZ = 1700;
const RW = 1280, RH = 720;                       // 방 하나의 크기
const WALL = { l: 34, t: 32, r: 32, b: 32 };      // 방 이미지의 벽 두께

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let SF = 1;
function resizeCanvas() {
  const r = canvas.getBoundingClientRect();
  SF = Math.min(2.5, Math.max(1, (r.width * (window.devicePixelRatio || 1)) / W));
  canvas.width = Math.round(W * SF);
  canvas.height = Math.round(H * SF);
}

const IMG = {};
function loadImg(k, src) { const i = new Image(); i.onload = () => (IMG[k] = i); i.src = src; }
loadImg('home', 'assets/room_top.png');
loadImg('kitchen', 'assets/room_kitchen.png');
loadImg('mansion', 'assets/room_mansion.png');

// ───────────────────────── 저장 ─────────────────────────
const SAVE_KEY = 'nyang-chaos-v3';
const save = { churu: 0, skills: {}, stage: 1, maxStage: 1, best: {}, totalSmashed: 0, muted: false };
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) Object.assign(save, s); } catch (e) { /* 저장 불가 환경 */ } }
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 무시 */ } }
const lv = id => save.skills[id] || 0;

// ───────────────────────── 유틸 ─────────────────────────
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
function mulberry32(a) {
  return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return Math.floor(n).toString();
  if (n >= 1e21) return n.toExponential(2).replace('+', '');
  const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];
  const e = Math.floor(Math.log10(n) / 3);
  const v = n / Math.pow(1000, e);
  return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)) + u[e - 1];
}
function rectsOverlap(a, b, m = 0) { return a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.y < b.y + b.h + m && a.y + a.h + m > b.y; }
function inFurniture(f, x, y, pad = 0) {
  if (f.round) { const dx = (x - f.x - f.w / 2) / (f.w / 2 - pad), dy = (y - f.y - f.h / 2) / (f.h / 2 - pad); return dx * dx + dy * dy <= 1; }
  return x >= f.x + pad && x <= f.x + f.w - pad && y >= f.y + pad && y <= f.y + f.h - pad;
}
function furnAt(x, y) {
  let best = null;
  for (const f of G.furniture) if (f.state === 'static' && (!best || f.z > best.z) && inFurniture(f, x, y)) best = f;
  return best;
}
function groundAt(x, y) { const f = furnAt(x, y); return f ? f.z : 0; }
function distToFurn(f, x, y) {
  const dx = Math.max(f.x - x, 0, x - (f.x + f.w)), dy = Math.max(f.y - y, 0, y - (f.y + f.h));
  return Math.hypot(dx, dy);
}
function roomAt(x, y) {
  const c = clamp(Math.floor(x / RW), 0, G.layout.cols - 1), r = clamp(Math.floor(y / RH), 0, G.layout.rows - 1);
  return G.rooms[r * G.layout.cols + c];
}

// ───────────────────────── 입력 ─────────────────────────
const mouse = { sx: W / 2, sy: H / 2, inside: false };
function toScreen(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}
function screenToWorld(sx, sy) { return { x: G.cam.x + sx / G.cam.z, y: G.cam.y + sy / G.cam.z }; }
canvas.addEventListener('pointermove', e => { const p = toScreen(e); mouse.sx = p.x; mouse.sy = p.y; mouse.inside = true; });
canvas.addEventListener('pointerleave', () => { mouse.inside = false; });
canvas.addEventListener('pointerdown', e => {
  Sfx.resume();
  const p = toScreen(e); mouse.sx = p.x; mouse.sy = p.y; mouse.inside = true;
  if (G.mode === 'intro') { skipIntro(); return; }
  if (G.mode !== 'play' || G.paused) return;
  const mm = minimapRect();
  if (mm && p.x >= mm.x && p.x <= mm.x + mm.w && p.y >= mm.y && p.y <= mm.y + mm.h) {
    onClick((p.x - mm.x) / mm.s, (p.y - mm.y) / mm.s);
    return;
  }
  const w = screenToWorld(p.x, p.y);
  onClick(w.x, w.y);
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  Sfx.resume();
  if (G.mode === 'intro' && (e.code === 'Space' || e.code === 'Enter')) skipIntro();
  if (e.code === 'KeyM') { save.muted = Sfx.toggle(); writeSave(); UI.syncMute(); }
  if (e.code === 'Escape' && G.mode === 'play') UI.togglePause();
  if (e.code === 'Space' && G.mode === 'play' && !e.repeat && !G.paused) { const w = screenToWorld(mouse.sx, mouse.sy); onClick(w.x, w.y); e.preventDefault(); }
});

// ───────────────────────── 상태 ─────────────────────────
const G = {
  mode: 'title', stage: 1, t: 0, paused: false,
  layout: { cols: 1, rows: 1, name: '', roles: [] }, world: { w: RW, h: RH }, rooms: [], walls: [], doors: [], entrance: { x: RW, y: RH / 2 },
  cam: { x: 0, y: 0, z: 1 },
  furniture: [], items: [], particles: [], popups: [], rings: [], paws: [], beams: [], balls: [], ghosts: [], timers: [], marks: [],
  cat: null, owner: null, sweep: null, queue: [],
  time: 0, timeMax: 0, score: 0, shownScore: 0,
  combo: 0, comboTimer: 0, comboMax: 1, comboBump: 0, maxCombo: 0, wordIdx: 0,
  smashed: 0, total: 0, clicks: 0, collisions: 0, airHits: 0, furnSmashed: 0,
  charge: { laser: 0, hairball: 0, dash: 0 },
  shake: 0, hitstop: 0, slowmo: 0, flash: 0, flashCol: '#fff', zoom: 0,
  endT: 0, introT: 0, warnStep: 0, bigText: null, muscleHint: 0,
};

// 방마다 바닥 얼룩/파편을 누적하는 캔버스
function makeMess(scale) {
  const c = document.createElement('canvas');
  c.width = RW * scale; c.height = RH * scale;
  const x = c.getContext('2d'); x.scale(scale, scale);
  return x;
}
function stampAt(x, y, fn) {
  const r = roomAt(x, y);
  if (!r || !r.mess) return;
  const m = r.mess;
  m.save(); m.translate(-r.x, -r.y); fn(m); m.restore();
}
function stampAll(fn) { for (const r of G.rooms) { const m = r.mess; m.save(); m.translate(-r.x, -r.y); fn(m); m.restore(); } }

function makeCat(x, y) {
  return { x, y, z: 0, baseZ: 0, ang: 0, speed: 0, sq: 1, walkT: 0, swipeT: 0, swipeAng: 0, mood: 'normal', jump: null, dash: null };
}

// ───────────────────────── 맵 생성 ─────────────────────────
function stageMult(n) { return Math.pow(1.55, n - 1); }
const FURN_FROM = { chair: 1, nightstand: 1, coffee: 1, table: 1, shelf: 1, round: 2, desk: 2, sofa: 2, counter: 3, bed: 4, armchair: 4, dining: 10, piano: 10 };

function genStage(n) {
  const rng = mulberry32(n * 7919 + 13);
  const r = (a, b) => a + rng() * (b - a);
  const layout = mapLayoutFor(n);
  const { cols, rows } = layout;
  const rooms = [], walls = [], doors = [];
  for (let ry = 0; ry < rows; ry++) for (let cx = 0; cx < cols; cx++) {
    const role = layout.roles[ry * cols + cx] || 'living';
    rooms.push({ cx, cy: ry, x: cx * RW, y: ry * RH, role, img: ROOM_IMG[role],
      ix0: cx * RW + WALL.l, iy0: ry * RH + WALL.t, ix1: cx * RW + RW - WALL.r, iy1: ry * RH + RH - WALL.b, doorsides: {} });
  }
  const R = (c, y) => rooms[y * cols + c];
  // 방 사이 출입구 (가로 이웃: 세로 중앙 / 세로 이웃: 가로 중앙)
  for (const rm of rooms) {
    if (rm.cx < cols - 1) { const o = R(rm.cx + 1, rm.cy); rm.doorsides.r = o.doorsides.l = true; doors.push({ x: rm.x + RW - 50, y: rm.y + RH / 2 - 85, w: 100, h: 170, v: false }); }
    if (rm.cy < rows - 1) { const o = R(rm.cx, rm.cy + 1); rm.doorsides.b = o.doorsides.t = true; doors.push({ x: rm.x + RW / 2 - 95, y: rm.y + RH - 50, w: 190, h: 100, v: true }); }
  }
  // 벽 (출입구 자리는 뚫음)
  for (const rm of rooms) {
    const { x, y } = rm;
    const hBand = (yy, hh, gap) => gap ? [{ x, y: yy, w: RW / 2 - 95, h: hh }, { x: x + RW / 2 + 95, y: yy, w: RW / 2 - 95, h: hh }] : [{ x, y: yy, w: RW, h: hh }];
    const vBand = (xx, ww, gap) => gap ? [{ x: xx, y, w: ww, h: RH / 2 - 85 }, { x: xx, y: y + RH / 2 + 85, w: ww, h: RH / 2 - 85 }] : [{ x: xx, y, w: ww, h: RH }];
    walls.push(...hBand(y, WALL.t, rm.doorsides.t), ...hBand(y + RH - WALL.b, WALL.b, rm.doorsides.b));
    walls.push(...vBand(x, WALL.l, rm.doorsides.l), ...vBand(x + RW - WALL.r, WALL.r, rm.doorsides.r));
  }
  const ent = R(cols - 1, 0);
  const entrance = { x: ent.x + RW - 18, y: ent.y + RH / 2 };

  // 가구
  const furniture = [];
  const perRoom = clamp(4 + Math.floor((n - 1) / 2), 4, 8);
  for (const rm of rooms) {
    const types = FURNITURE_TYPES.filter(t => t.rooms.includes(rm.role) && FURN_FROM[t.k] <= n);
    const top = rm.iy0 + (rm.cy === 0 ? 72 : 10);
    const keepOut = [];
    keepOut.push({ x: rm.ix1 - 150, y: rm.y + RH / 2 - 120, w: 150, h: 240 });                  // 오른쪽 문
    if (rm.doorsides.l) keepOut.push({ x: rm.ix0, y: rm.y + RH / 2 - 120, w: 150, h: 240 });
    if (rm.doorsides.t) keepOut.push({ x: rm.x + RW / 2 - 130, y: rm.iy0, w: 260, h: 130 });
    if (rm.doorsides.b) keepOut.push({ x: rm.x + RW / 2 - 130, y: rm.iy1 - 130, w: 260, h: 130 });
    let placed = 0, tries = 0;
    while (placed < perRoom && tries++ < 400) {
      const t = types[(rng() * types.length) | 0];
      if (!t) break;
      let w = Math.round(r(t.w[0], t.w[1])), h = Math.round(r(t.h[0], t.h[1]));
      let x, y;
      if (t.wall) {
        if (t.k !== 'bed' && rng() < 0.45) { [w, h] = [h, w]; x = rm.ix0; y = r(top, rm.iy1 - h); }
        else { x = r(rm.ix0, rm.ix1 - w - 140); y = rm.iy1 - h; }
      } else {
        x = r(rm.ix0 + 30, rm.ix1 - w - 40);
        y = r(top + 6, rm.iy1 - h - 30);
      }
      const f = { k: t.k, x: Math.round(x), y: Math.round(y), w, h, z: t.z, round: !!t.round, tier: t.tier, room: rm,
        color: t.k === 'sofa' || t.k === 'armchair' ? ['#6d9dc5', '#e5989b', '#84a59d', '#b5838d', '#9d0208'][(rng() * 5) | 0] : t.k === 'bed' ? ['#f4acb7', '#a2d2ff', '#cdb4db', '#b9fbc0'][(rng() * 4) | 0] : null,
        state: 'static', shakeT: 0, alt: 0, rot: 0, vx: 0, vy: 0, vz: 0, vr: 0 };
      if (y < top - 1 && !t.wall) continue;
      if (furniture.some(o => rectsOverlap(f, o, 40)) || keepOut.some(k => rectsOverlap(f, k))) continue;
      f.hpMax = f.hp = (t.tier * 380 + (w * h) / 40);
      furniture.push(f);
      placed++;
    }
  }

  // 물건
  const count = Math.min(28 + (n - 1) * 10, 70 * rooms.length, 420);
  const baseTypes = ITEM_TYPES.filter(t => t.from <= n);
  const items = [];
  const ok = (x, y, rad) => items.every(o => Math.abs(o.x - x) > o.r + rad + 3 || Math.abs(o.y - y) > o.r + rad + 3 || Math.hypot(o.x - x, o.y - y) >= o.r + rad + 3);
  const area = furniture.map(f => f.w * f.h);
  const areaSum = area.reduce((a, b) => a + b, 0);
  for (let i = 0; i < count; i++) {
    const onFloor = rng() < 0.2 || !furniture.length;
    for (let k = 0; k < 40; k++) {
      if (!onFloor) {
        let a = rng() * areaSum, f = furniture[0];
        for (let j = 0; j < furniture.length; j++) { a -= area[j]; if (a <= 0) { f = furniture[j]; break; } }
        const pool = baseTypes.filter(t => !t.floor && (!t.theme || t.theme === f.room.role));
        const t = pool[(rng() * pool.length) | 0];
        const rad = t.r * 1.2;
        const x = r(f.x + rad + 6, f.x + f.w - rad - 6), y = r(f.y + rad + 6, f.y + f.h - rad - 6);
        if (!inFurniture(f, x, y, rad * 0.8) || !ok(x, y, rad)) continue;
        items.push(makeItem(t, x, y, f, n, rng)); break;
      } else {
        const rm = rooms[(rng() * rooms.length) | 0];
        const pool = baseTypes.filter(t => !t.theme || t.theme === rm.role);
        const floorPool = pool.filter(t => t.floor);
        const t = rng() < 0.6 && floorPool.length ? floorPool[(rng() * floorPool.length) | 0] : pool[(rng() * pool.length) | 0];
        const rad = t.r * 1.2;
        const x = r(rm.ix0 + rad + 8, rm.ix1 - rad - 8), y = r(rm.iy0 + (rm.cy === 0 ? 72 : 10) + rad, rm.iy1 - rad - 8);
        const p = { x: x - rad - 6, y: y - rad - 6, w: rad * 2 + 12, h: rad * 2 + 12 };
        if (furniture.some(f => rectsOverlap(p, f)) || doors.some(d => rectsOverlap(p, d, 30)) || !ok(x, y, rad)) continue;
        if (Math.abs(x - entrance.x) < 170 && Math.abs(y - entrance.y) < 130) continue;
        items.push(makeItem(t, x, y, null, n, rng)); break;
      }
    }
  }
  return { layout, rooms, walls, doors, entrance, world: { w: cols * RW, h: rows * RH }, furniture, items };
}

function makeItem(t, x, y, f, n, rng) {
  const gold = Math.random() < 0.03 * lv('gold');
  const pk = () => t.pal[(rng() * t.pal.length) | 0];
  const z = f ? f.z : 0;
  return {
    type: t, r: t.r * 1.2, x, y, z, baseZ: z, furn: f, vx: 0, vy: 0, vz: 0, rot: rng() * Math.PI * 2, vr: 0,
    state: 'hidden', col: [pk(), pk(), pk()], gold, crit: false, air: 0, cd: 0,
    value: t.v * stageMult(n) * (gold ? 10 : 1),
    appear: 0, wob: 0, seed: rng() * 100, sq: 1,
  };
}

function applyStage(n) {
  G.stage = n;
  Object.assign(G, genStage(n));
  const scale = G.rooms.length === 1 ? 1.5 : 1;
  for (const r of G.rooms) r.mess = makeMess(scale);
  G.particles = []; G.popups = []; G.rings = []; G.paws = []; G.beams = []; G.balls = []; G.ghosts = []; G.timers = []; G.marks = [];
  G.queue = []; G.sweep = null; G.owner = null; G.bigText = null;
  const ent = G.rooms[G.layout.cols - 1];
  G.cam.z = G.layout.rows === 1 ? 1 : 0.8;
  G.cat = makeCat(ent.x + RW * 0.42, ent.y + RH * 0.5);
  snapCamera(G.cat.x, G.cat.y);
}

function startStage(n) {
  for (const el of document.querySelectorAll('.screen')) el.classList.add('hidden');
  applyStage(n);
  G.timeMax = Math.round(26 + G.items.length * 0.36 + (G.rooms.length - 1) * 6 + lv('time') * 4);
  G.time = G.timeMax;
  G.score = 0; G.shownScore = 0; G.combo = 0; G.comboTimer = 0; G.maxCombo = 0; G.wordIdx = 0;
  G.smashed = 0; G.total = G.items.length; G.clicks = 0; G.collisions = 0; G.airHits = 0; G.furnSmashed = 0;
  G.charge = { laser: 0, hairball: 0, dash: 0 };
  G.shake = 0; G.hitstop = 0; G.slowmo = 0; G.flash = 0; G.zoom = 0;
  G.warnStep = 0; G.endT = 0; G.paused = false; G.muscleHint = 0;
  for (const it of G.items) { it.state = 'rest'; it.appear = -rand(0.1, 1.9); }
  G.owner = { x: G.entrance.x + 60, y: G.entrance.y, ang: Math.PI, walking: true, walkT: 0, carry: true, shirt: pick(['#ef6f6c', '#6c9bef', '#7bc47f', '#b388eb']), phase: 'in', t: 0, line: pick(OWNER_LINES_START) };
  G.mode = 'intro'; G.introT = 0;
  canvas.classList.remove('playing');
  Sfx.door();
}
function skipIntro() {
  if (G.mode !== 'intro') return;
  for (const it of G.items) it.appear = Math.max(it.appear, 0.6);
  G.owner = null;
  beginPlay();
}
function beginPlay() {
  G.mode = 'play';
  G.cat.mood = 'evil';
  later(0.9, () => { G.cat.mood = 'normal'; });
  Sfx.meow(1.1);
  bigText('GO!', '#ffd166', 1.0, G.rooms.length > 1 ? `${G.layout.name} · 방 ${G.rooms.length}개` : '클릭! 클릭! 클릭!');
  canvas.classList.add('playing');
  UI.showHint(G.stage <= 2 || G.stage === 4);
}

// ───────────────────────── 카메라 ─────────────────────────
function viewW() { return W / G.cam.z; }
function viewH() { return H / G.cam.z; }
function clampCam(x, y) {
  return { x: G.world.w <= viewW() ? (G.world.w - viewW()) / 2 : clamp(x, 0, G.world.w - viewW()),
    y: G.world.h <= viewH() ? (G.world.h - viewH()) / 2 : clamp(y, 0, G.world.h - viewH()) };
}
function snapCamera(x, y) { const c = clampCam(x - viewW() / 2, y - viewH() / 2); G.cam.x = c.x; G.cam.y = c.y; }
function updateCamera(dt) {
  let fx = G.cat ? G.cat.x : G.world.w / 2, fy = G.cat ? G.cat.y : G.world.h / 2;
  if (G.owner && (G.mode === 'caught' || G.mode === 'intro')) { fx = G.owner.x - 200; fy = G.owner.y; }
  if (G.mode === 'play' && mouse.inside) { fx += (mouse.sx - W / 2) / G.cam.z * 0.35; fy += (mouse.sy - H / 2) / G.cam.z * 0.35; }
  const c = clampCam(fx - viewW() / 2, fy - viewH() / 2);
  const k = Math.min(1, dt * 5);
  G.cam.x += (c.x - G.cam.x) * k; G.cam.y += (c.y - G.cam.y) * k;
}

// ───────────────────────── 벽 충돌 ─────────────────────────
function collideWalls(o, r, bounce = 0.55) {
  let hit = false;
  if (o.x < r) { o.x = r; o.vx = Math.abs(o.vx) * bounce; hit = true; }
  if (o.x > G.world.w - r) { o.x = G.world.w - r; o.vx = -Math.abs(o.vx) * bounce; hit = true; }
  if (o.y < r) { o.y = r; o.vy = Math.abs(o.vy) * bounce; hit = true; }
  if (o.y > G.world.h - r) { o.y = G.world.h - r; o.vy = -Math.abs(o.vy) * bounce; hit = true; }
  for (const w of G.walls) {
    if (o.x + r <= w.x || o.x - r >= w.x + w.w || o.y + r <= w.y || o.y - r >= w.y + w.h) continue;
    const ol = o.x + r - w.x, orr = w.x + w.w - (o.x - r), ot = o.y + r - w.y, ob = w.y + w.h - (o.y - r);
    const m = Math.min(ol, orr, ot, ob);
    if (m === ol) { o.x -= ol; o.vx = -Math.abs(o.vx) * bounce; }
    else if (m === orr) { o.x += orr; o.vx = Math.abs(o.vx) * bounce; }
    else if (m === ot) { o.y -= ot; o.vy = -Math.abs(o.vy) * bounce; }
    else { o.y += ob; o.vy = Math.abs(o.vy) * bounce; }
    hit = true;
  }
  return hit;
}
function inWall(x, y) { return x < 0 || y < 0 || x > G.world.w || y > G.world.h || G.walls.some(w => x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h); }

// ───────────────────────── 이펙트 헬퍼 ─────────────────────────
function onScreen(x, y, m = 200) { return x > G.cam.x - m && x < G.cam.x + viewW() + m && y > G.cam.y - m && y < G.cam.y + viewH() + m; }
function addShake(v, x, y) { if (x !== undefined && !onScreen(x, y, 100)) v *= 0.3; G.shake = Math.min(1.1, G.shake + v); }
function popup(x, y, text, color = '#fff', size = 26, life = 0.9) {
  if (G.popups.length > 90) G.popups.shift();
  G.popups.push({ x, y, text, color, size, life, max: life, vy: -90 });
}
function bigText(text, color, life = 1.2, sub = null) { G.bigText = { text, color, life, max: life, sub }; }
function particle(p) { if (G.particles.length < 2200) G.particles.push(p); }
function burst(x, y, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = o.ang !== undefined ? o.ang + rand(-o.spread, o.spread) : rand(0, Math.PI * 2);
    const sp = rand(o.min || 80, o.max || 380);
    particle({ x, y, z: o.z || 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: o.vz ? rand(o.vz * 0.5, o.vz) : 0,
      life: rand(0.35, 0.8) * (o.life || 1), max: 1, size: rand(o.s0 || 2, o.s1 || 5),
      color: o.colors ? pick(o.colors) : o.color || '#fff', type: o.type || 'spark', rot: rand(0, 6), vr: rand(-12, 12), g: o.g || 0, drag: o.drag ?? 2.5 });
  }
}
function dust(x, y, n = 8, spread = 1) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), sp = rand(40, 160) * spread;
    particle({ x: x + Math.cos(a) * 8, y: y + Math.sin(a) * 8, z: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, life: rand(0.35, 0.7), max: 1, size: rand(7, 14) * Math.sqrt(spread), color: 'rgba(240,225,205,', type: 'dust', g: 0, drag: 4 });
  }
}
function ring(x, y, r, color = '#fff', life = 0.35, width = 8) { G.rings.push({ x, y, r, color, life, max: life, width }); }
function flash(col, a) { G.flashCol = col; G.flash = Math.max(G.flash, a); }
function punch(z) { G.zoom = Math.max(G.zoom, z); }
function later(t, fn) { G.timers.push({ t, fn }); }
function comboMult() { return 1 + Math.max(0, G.combo - 1) * 0.06 * (1 + 0.25 * lv('combo')); }
function scoreMult() { return Math.pow(1.3, lv('value')) * comboMult() * (lv('catastrophe') ? 2 : 1); }
function bounceMult() { return 1 + 0.5 * lv('bounce'); }
function addScore(pts) { G.score += pts; }

// ───────────────────────── 클릭 → 고양이 출동 ─────────────────────────
function pawPower() { return 520 * (1 + 0.25 * lv('paw')) * (1 + 0.01 * lv('frenzy') * G.combo); }
function cdOf(id) { return SKILL_BY_ID[id].active.val(lv(id)); }
function countOf(id) { return SKILL_BY_ID[id].active.val(lv(id)); }
function strikeRadius() { return 62 * (1 + 0.15 * lv('reach')); }

function onClick(x, y) {
  x = clamp(x, 10, G.world.w - 10); y = clamp(y, 10, G.world.h - 10);
  G.clicks++;
  const acts = [];
  if (lv('mega') && G.clicks % countOf('mega') === 0) acts.push('mega');
  if (lv('godpaw') && G.clicks % countOf('godpaw') === 0) acts.push('god');
  for (const id of ['dash', 'laser', 'hairball']) {
    if (lv(id) && G.charge[id] >= cdOf(id)) { acts.push(id); G.charge[id] = 0; }
  }
  G.marks.push({ x, y, life: 0.4, max: 0.4 });
  // 연타가 너무 쌓이면 가장 오래된 목표를 발바닥 분신이 대신 처리
  if (G.queue.length >= 3) { const q = G.queue.shift(); performStrike(q, true); }
  G.queue.push({ x, y, cx: x, cy: y, acts });
  Sfx.click();
}

function updateCat(dt) {
  const c = G.cat;
  c.swipeT = Math.max(0, c.swipeT - dt);
  if (c.dash) {
    const d = c.dash;
    d.t += dt;
    const k = Math.min(1, d.t / d.dur);
    const px = c.x, py = c.y;
    c.x = d.sx + (d.ex - d.sx) * k; c.y = d.sy + (d.ey - d.sy) * k;
    c.z = Math.abs(Math.sin(k * Math.PI * 6)) * 10;
    c.ang = d.ang; c.speed = 2000; c.walkT += dt * 60;
    G.ghosts.push({ x: c.x, y: c.y, ang: c.ang, life: 0.3, max: 0.3, hue: (G.t * 900) % 360 });
    const ux = Math.cos(d.ang), uy = Math.sin(d.ang);
    for (const it of G.items) {
      if ((it.state !== 'rest' && it.state !== 'fly') || it.z > 140) continue;
      if (Math.abs(it.x - c.x) < it.r + 46 && Math.abs(it.y - c.y) < it.r + 46 && Math.hypot(it.x - c.x, it.y - c.y) < it.r + 46) {
        const side = Math.sign((it.x - px) * uy - (it.y - py) * ux) || 1;
        if (knock(it, d.ang - side * rand(0.6, 1.1), pawPower() * 1.5, { fromPaw: true, up: 1.2 })) addShake(0.03);
      }
    }
    for (const f of G.furniture) if (f.state === 'static' && distToFurn(f, c.x, c.y) < 30) hitFurniture(f, pawPower() * 3 * dt * 10, d.ang);
    if (k >= 1) { c.dash = null; dust(c.x, c.y, 14, 1.6); performStrike(d.q); }
  } else if (c.jump) {
    const j = c.jump;
    j.t += dt;
    const k = Math.min(1, j.t / j.dur);
    c.x = j.sx + (j.ex - j.sx) * k; c.y = j.sy + (j.ey - j.sy) * k;
    c.z = Math.sin(k * Math.PI) * j.h;
    c.sq = 1 + Math.sin(k * Math.PI) * 0.18;
    if (k >= 1) { c.jump = null; c.sq = 0.75; performStrike(j.q); }
  } else if (G.queue.length && G.mode === 'play') {
    const q = G.queue.shift();
    const dx = q.x - c.x, dy = q.y - c.y, dist = Math.hypot(dx, dy);
    const ang = dist > 4 ? Math.atan2(dy, dx) : c.ang;
    q.ang = ang;
    c.ang = ang;
    if (q.acts.includes('dash')) {
      // 클릭 방향으로 벽에 닿을 때까지 폭주
      const ux = Math.cos(ang), uy = Math.sin(ang);
      let len = 0;
      while (len < 2600 && !inWall(c.x + ux * (len + 40), c.y + uy * (len + 40))) len += 20;
      len = Math.max(len, Math.min(dist, 60));
      const ex = c.x + ux * len, ey = c.y + uy * len;
      c.dash = { sx: c.x, sy: c.y, ex, ey, t: 0, dur: Math.max(0.2, len / 2400), ang, q: { ...q, x: ex, y: ey } };
      bigText('우다다다!!', '#ffe066', 0.8);
      Sfx.dash(); Sfx.meow(1.5); addShake(0.2);
    } else {
      // 먼 거리는 더 높이 점프(방을 넘나드는 것도 고양이답게)
      c.jump = { sx: c.x, sy: c.y, ex: q.x, ey: q.y, t: 0, dur: clamp(dist / 2200, 0.06, 0.45), h: 20 + Math.min(dist, 1400) * 0.09, q };
      if (dist > 30) Sfx.jump();
    }
  } else {
    c.speed = approach(c.speed, 0, 3000 * dt);
    if (G.mode === 'play' && mouse.inside) {
      const m = screenToWorld(mouse.sx, mouse.sy);
      const ta = Math.atan2(m.y - c.y, m.x - c.x);
      let d = ta - c.ang; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      c.ang += d * Math.min(1, dt * 6);
    }
    c.z = approach(c.z, 0, dt * 300);
  }
  if (c.jump) { c.speed = 800; c.walkT += dt * 30; }
  c.baseZ += (groundAt(c.x, c.y) - c.baseZ) * Math.min(1, dt * 15);
  c.sq += (1 - c.sq) * Math.min(1, dt * 12);
}

// 한 번의 "착지 펀치" + 거기에 딸린 스킬들
function performStrike(q, phantom = false) {
  const { x, y, acts } = q;
  const mega = acts.includes('mega');
  const crit = Math.random() < 0.02 * lv('crit');
  const c = G.cat;
  if (!phantom) { c.swipeT = 0.16; c.swipeAng = q.ang ?? c.ang; }
  strike(x, y, { mega, crit, main: true });

  for (let i = 0; i < lv('multi'); i++) {
    later(0.05 * (i + 1), () => { const a = rand(0, Math.PI * 2), d = rand(50, 110); strike(x + Math.cos(a) * d, y + Math.sin(a) * d, { power: 0.7, radius: 0.7, small: true }); });
  }
  for (let i = 0; i < lv('echo'); i++) later(0.3 * (i + 1), () => strike(x, y, { power: 0.85, radius: 1.1, echo: true }));
  if (mega) for (let i = 0; i < lv('quake'); i++) {
    later(0.22 * (i + 1), () => {
      const r = strikeRadius() * (3.4 + i * 0.9);
      explodeAt(x, y, r, 650, { color: '#ffb4a2', width: 16, label: '여진!' });
      addShake(0.35, x, y); dust(x, y, 20, 2.5); Sfx.boom(0.8);
    });
  }
  if (acts.includes('laser')) {
    // 레이저는 클릭 지점을 향해 (돌진 후엔 되돌아보며), 너무 가까우면 화면 중앙 쪽으로
    const lx = phantom ? x : c.x, ly = phantom ? y : c.y;
    const far = Math.hypot(q.cx - lx, q.cy - ly) > 40;
    const tx = far ? q.cx : G.cam.x + viewW() / 2, ty = far ? q.cy : G.cam.y + viewH() / 2;
    fireLaser(lx, ly, Math.hypot(tx - lx, ty - ly) > 5 ? Math.atan2(ty - ly, tx - lx) : rand(0, Math.PI * 2));
  }
  if (acts.includes('hairball')) throwHairballs(x, y);
  if (acts.includes('god')) startGodSweep();
}

function strike(x, y, o = {}) {
  const R = strikeRadius() * (o.mega ? 3 : 1) * (o.radius || 1);
  const power = pawPower() * (o.power || 1) * (o.mega ? 1.6 : 1) * (o.crit ? 2 : 1);
  let hits = 0;
  for (const it of G.items) {
    if ((it.state !== 'rest' && it.state !== 'fly') || it.z > 170 || it.appear < 0.5) continue;
    if (Math.abs(it.x - x) > R + it.r || Math.abs(it.y - y) > R + it.r) continue;
    const dist = Math.hypot(it.x - x, it.y - y);
    const d = dist - it.r;
    if (d < R) {
      const ang = (dist < 3 ? rand(0, Math.PI * 2) : Math.atan2(it.y - y, it.x - x)) + rand(-0.25, 0.25);
      if (knock(it, ang, power * (0.75 + 0.45 * (1 - Math.max(0, d) / R)), { crit: o.crit, fromPaw: true, up: o.mega ? 1.5 : 1 })) hits++;
    }
  }
  for (const f of G.furniture) {
    if (f.state !== 'static') continue;
    if (distToFurn(f, x, y) < R * 0.6) hitFurniture(f, power * (o.small ? 0.5 : 1), Math.atan2(f.y + f.h / 2 - y, f.x + f.w / 2 - x));
  }
  G.paws.push({ x, y, r: R * (o.mega ? 0.55 : 0.5), life: o.mega ? 0.5 : 0.28, max: o.mega ? 0.5 : 0.28, crit: o.crit, mega: o.mega, echo: o.echo, small: o.small, ang: rand(-0.3, 0.3) });
  ring(x, y, R, o.crit ? '#ffd23f' : o.echo ? '#caffbf' : 'rgba(255,255,255,.9)', 0.25, o.mega ? 12 : 5);
  dust(x, y, o.mega ? 20 : o.small ? 2 : 5, o.mega ? 3 : 1);
  if (o.main && !o.mega) stampPaw(x, y, 0.08);
  Sfx.thump(o.mega ? 1.6 : o.small ? 0.5 : 1);
  if (hits) Sfx.knock();
  addShake((o.mega ? 0.55 : o.small ? 0.02 : 0.06) + Math.min(0.2, hits * 0.015), x, y);
  if (hits >= 5) G.hitstop = Math.max(G.hitstop, 0.025);
  if (o.mega) {
    G.hitstop = Math.max(G.hitstop, 0.08);
    flash('#fff', 0.2); punch(0.04);
    popup(x, y - R * 0.5, 'MEGA PUNCH!!', '#ff9f1c', 42, 1);
    stampPaw(x, y, 0.15, 3);
    burst(x, y, 30, { colors: ['#fff', '#ffe29a', '#ffb4a2'], min: 300, max: 900, s0: 3, s1: 7 });
    Sfx.boom(1.1);
  }
  if (o.crit) {
    G.hitstop = Math.max(G.hitstop, 0.1);
    if (G.slowmo <= 0) G.slowmo = 0.25;
    flash('#fff3b0', 0.3); punch(0.05);
    popup(x, y - 60, 'CRITICAL!', '#ffd23f', 40, 1);
    burst(x, y, 24, { colors: ['#ffd23f', '#fff', '#ff9f1c'], min: 200, max: 700, s0: 3, s1: 6, type: 'star' });
    Sfx.crit();
    if (lv('critBoom')) {
      later(0.08, () => {
        explodeAt(x, y, 110 + 30 * lv('critBoom'), 800, { color: '#ffd23f', width: 16, label: '크리 폭발!' });
        burst(x, y, 36, { colors: ['#ff595e', '#ffca3a', '#fff'], min: 200, max: 900, s0: 4, s1: 8 });
        addShake(0.4, x, y); Sfx.boom(1);
      });
    }
  }
  return hits;
}

function stampPaw(x, y, alpha, scale = 1) {
  stampAt(x, y, m => { m.globalAlpha = alpha; m.translate(x, y); m.scale(scale, scale); m.fillStyle = '#3a2418'; pawShape(m, 18); m.fill(); });
}
function pawShape(c, r) {
  c.beginPath();
  c.ellipse(0, r * 0.35, r * 0.75, r * 0.6, 0, 0, Math.PI * 2);
  for (const [tx, ty] of [[-0.75, -0.3], [-0.28, -0.72], [0.28, -0.72], [0.75, -0.3]]) {
    c.moveTo(tx * r + r * 0.28, ty * r); c.ellipse(tx * r, ty * r, r * 0.28, r * 0.34, 0, 0, Math.PI * 2);
  }
}

function knock(it, ang, power, o = {}) {
  if (it.state === 'rest') {
    it.state = 'fly'; it.furn = null;
  } else if (it.state === 'fly') {
    if (o.fromPaw) {
      it.air++;
      G.airHits++;
      const bonus = it.value * 0.4 * it.air * scoreMult() * bounceMult();
      addScore(bonus);
      popup(it.x, it.y - 30, `AIR x${it.air}  +${fmt(bonus)}`, '#9bf6ff', 20 + Math.min(10, it.air * 2), 0.7);
      burst(it.x, it.y, 8, { colors: ['#9bf6ff', '#fff'], min: 150, max: 400, z: it.z });
    }
  } else return false;
  const k = Math.sqrt(power / 520);
  it.vx = Math.cos(ang) * power * rand(0.85, 1.15);
  it.vy = Math.sin(ang) * power * rand(0.85, 1.15);
  it.vz = Math.max(it.vz, 0) * 0.3 + rand(280, 430) * (o.up || 1) * Math.min(1.8, k);
  it.vr = rand(-16, 16) * (o.crit ? 2 : 1);
  if (o.crit) it.crit = true;
  it.sq = 1.45;
  burst(it.x, it.y, 4, { color: '#fff', min: 100, max: 280, z: it.z });
  return true;
}

function explodeAt(x, y, r, power, o = {}) {
  let hits = 0;
  for (const it of G.items) {
    if ((it.state !== 'rest' && it.state !== 'fly') || it.z > 220 || it.appear < 0.5) continue;
    if (Math.abs(it.x - x) > r + it.r || Math.abs(it.y - y) > r + it.r) continue;
    const d = Math.hypot(it.x - x, it.y - y) - it.r;
    if (d < r) {
      const ang = Math.atan2(it.y - y, it.x - x) + rand(-0.3, 0.3);
      if (knock(it, ang, power * (0.6 + 0.6 * (1 - Math.max(0, d) / r)), { up: 1.35 })) hits++;
    }
  }
  if (o.furn !== false) for (const f of G.furniture) {
    if (f.state === 'static' && distToFurn(f, x, y) < r * 0.7) hitFurniture(f, power * 0.5, Math.atan2(f.y + f.h / 2 - y, f.x + f.w / 2 - x));
  }
  ring(x, y, r, o.color || '#fff', 0.4, o.width || 10);
  burst(x, y, 12, { colors: [o.color || '#fff', '#fff', '#ffe29a'], min: r * 1.5, max: r * 4, s0: 3, s1: 6 });
  if (o.label && hits) popup(x, y - 30, `${o.label} x${hits}`, o.color || '#fff', 24, 0.8);
  return hits;
}

// ───────────────────────── 가구: 괴력으로 날리기 ─────────────────────────
function hitFurniture(f, power, ang) {
  f.shakeT = Math.max(f.shakeT, 0.18);
  if (f.tier > lv('muscle')) {
    if (lv('muscle') > 0 && G.t - G.muscleHint > 1.2) { G.muscleHint = G.t; popup(f.x + f.w / 2, f.y - 10, `💪 괴력 Lv${f.tier} 필요`, '#ddd', 18, 0.8); }
    return;
  }
  f.hp -= power * (1 + 0.25 * lv('wreck'));
  f.lastAng = ang;
  if (f.hp <= 0) launchFurniture(f, ang, power);
  else burst(f.x + f.w / 2, f.y + f.h / 2, 6, { colors: ['#dda36b', '#8b5a33'], min: 100, max: 300 });
}
function launchFurniture(f, ang, power) {
  f.state = 'fly';
  f.hitList = new Set();
  f.cx = f.x + f.w / 2; f.cy = f.y + f.h / 2;
  const heavy = Math.pow(f.tier, 0.35);
  const sp = clamp(power * 0.55 / heavy, 250, 900);
  f.vx = Math.cos(ang) * sp; f.vy = Math.sin(ang) * sp;
  f.alt = 0; f.vz = rand(420, 560) / Math.sqrt(heavy); f.vr = rand(-5, 5) / heavy;
  // 위에 있던 물건들은 전부 튀어오름
  for (const it of G.items) {
    if (it.state === 'rest' && it.furn === f) knock(it, rand(0, Math.PI * 2), rand(200, 450), { up: 1.4 });
  }
  popup(f.cx, f.cy - 40, '가구 발사!!', '#ffb703', 34, 1);
  addShake(0.35, f.cx, f.cy); G.hitstop = Math.max(G.hitstop, 0.05);
  dust(f.cx, f.cy, 16, 2);
  Sfx.boom(0.8); Sfx.meow(0.9);
}
function updateFurniture(dt) {
  for (const f of G.furniture) {
    f.shakeT = Math.max(0, f.shakeT - dt);
    if (f.state !== 'fly') continue;
    f.vz -= GZ * dt;
    f.alt += f.vz * dt;
    const o = { x: f.cx, y: f.cy, vx: f.vx, vy: f.vy };
    o.x += f.vx * dt; o.y += f.vy * dt;
    if (collideWalls(o, Math.min(f.w, f.h) * 0.45, 0.4)) { addShake(0.15, o.x, o.y); Sfx.thump(1.3); }
    f.cx = o.x; f.cy = o.y; f.vx = o.vx; f.vy = o.vy;
    f.rot += f.vr * dt;
    const rad = Math.max(f.w, f.h) * 0.45;
    if (f.alt < 90) {
      for (const it of G.items) {
        if (it.state !== 'rest' || Math.abs(it.x - f.cx) > rad || Math.abs(it.y - f.cy) > rad) continue;
        if (Math.hypot(it.x - f.cx, it.y - f.cy) < rad) collideRest({ x: f.cx, y: f.cy, vx: f.vx, vy: f.vy }, it, Math.max(500, Math.hypot(f.vx, f.vy)));
      }
      for (const g of G.furniture) {
        if (g === f || g.state !== 'static' || f.hitList.has(g)) continue;
        if (distToFurn(g, f.cx, f.cy) < rad * 0.5) {
          f.hitList.add(g);
          hitFurniture(g, Math.min(600, Math.hypot(f.vx, f.vy)), Math.atan2(f.vy, f.vx));
          f.vx *= 0.5; f.vy *= 0.5;
        }
      }
    }
    if (f.alt <= 0 && f.vz < 0) smashFurniture(f);
  }
}
function smashFurniture(f) {
  f.state = 'gone';
  G.furnSmashed++;
  const pts = f.tier * 90 * stageMult(G.stage) * scoreMult() * (1 + lv('wreck'));
  addScore(pts);
  const x = f.cx, y = f.cy;
  const wood = f.k === 'counter' ? ['#e9ecef', '#ced4da', '#adb5bd'] : f.color ? [f.color, shade(f.color, -0.2), '#8b5a33'] : ['#c08552', '#8b5a33', '#dda36b'];
  // 부서진 판자들이 바닥에 남음
  stampAt(x, y, m => {
    for (let i = 0; i < 10; i++) {
      m.save(); m.translate(x + rand(-f.w / 2, f.w / 2), y + rand(-f.h / 2, f.h / 2)); m.rotate(rand(0, Math.PI));
      m.fillStyle = pick(wood); m.strokeStyle = 'rgba(74,52,38,.8)'; m.lineWidth = 2;
      const pw = rand(30, Math.max(40, f.w * 0.45)), ph = rand(8, 16);
      m.fillRect(-pw / 2, -ph / 2, pw, ph); m.strokeRect(-pw / 2, -ph / 2, pw, ph);
      m.restore();
    }
  });
  for (let i = 0; i < 26; i++) {
    const a = rand(0, Math.PI * 2), s = rand(150, 600);
    particle({ x: x + rand(-f.w / 3, f.w / 3), y: y + rand(-f.h / 3, f.h / 3), z: 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(200, 600), life: 3, max: 3,
      size: rand(8, 16), color: pick(wood), type: 'plank', rot: rand(0, 6), vr: rand(-15, 15), g: 1500, drag: 1.2, settle: true });
  }
  dust(x, y, 30, 3.5);
  ring(x, y, Math.max(f.w, f.h) * 0.8, '#fff', 0.35, 12);
  popup(x, y - 40, `가구 박살! +${fmt(pts)}`, '#ffb703', 40, 1.2);
  addShake(0.55, x, y); G.hitstop = Math.max(G.hitstop, 0.06);
  Sfx.boom(1.2); Sfx.smash(1.3, false);
  if (lv('furnBoom')) {
    explodeAt(x, y, 120 + 40 * lv('furnBoom'), 850, { color: '#ff9f1c', width: 18, label: '가구 폭탄!' });
    burst(x, y, 30, { colors: ['#ff595e', '#ffca3a', '#fff'], min: 250, max: 900, s0: 4, s1: 9 });
  } else {
    explodeAt(x, y, Math.max(f.w, f.h) * 0.6, 500, { color: 'rgba(255,255,255,.6)', width: 6, furn: false });
  }
}

// ───────────────────────── 액티브 스킬 ─────────────────────────
function fireLaser(sx, sy, ang) {
  const width = 16 + 5 * lv('laser');
  const ux = Math.cos(ang), uy = Math.sin(ang);
  let len = 0;
  while (len < 2600 && !inWall(sx + ux * (len + 20), sy + uy * (len + 20))) len += 20;
  len += 20;
  G.beams.push({ x: sx, y: sy, ang, width, len, life: 0.4, max: 0.4 });
  let hits = 0;
  for (const it of G.items) {
    if (it.state !== 'rest' && it.state !== 'fly') continue;
    const dx = it.x - sx, dy = it.y - sy;
    const along = dx * ux + dy * uy, perp = dx * uy - dy * ux;
    if (along > -20 && along < len && Math.abs(perp) < it.r + width) {
      if (knock(it, ang - Math.sign(perp || 1) * rand(0.5, 1.1), pawPower() * 1.4, { up: 0.8, fromPaw: true })) {
        hits++;
        burst(it.x, it.y, 6, { colors: ['#ff4d6d', '#ffd6e0'], min: 100, max: 400 });
      }
    }
  }
  stampAll(m => { m.globalAlpha = 0.12; m.strokeStyle = '#3a1010'; m.lineWidth = width; m.beginPath(); m.moveTo(sx, sy); m.lineTo(sx + ux * len, sy + uy * len); m.stroke(); });
  flash('#ff4d6d', 0.12); addShake(0.3 + hits * 0.02, sx, sy); Sfx.laser();
  popup(sx, sy - 60, `레이저 x${hits}!`, '#ff4d6d', 30, 1);
}

function throwHairballs(x, y) {
  const c = G.cat;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rand(-0.3, 0.3), d = i === 0 ? 0 : rand(70, 150);
    const tx = clamp(x + Math.cos(a) * d, 10, G.world.w - 10), ty = clamp(y + Math.sin(a) * d, 10, G.world.h - 10);
    G.balls.push({ sx: c.x, sy: c.y, tx, ty, t: -i * 0.07, dur: rand(0.45, 0.6), rot: 0, x: c.x, y: c.y, z: 0 });
  }
  bigText('헤어볼 폭격!!', '#cb997e', 0.9);
  Sfx.throw(); Sfx.meow(0.8);
}

function startGodSweep() {
  G.sweep = { x: G.cam.x - 120, x1: G.cam.x + viewW() + 150, y0: G.cam.y, y1: G.cam.y + viewH(), speed: 2000 / G.cam.z };
  bigText('신의 앞발!!!', '#c77dff', 1.3);
  flash('#e0aaff', 0.25); Sfx.crit(); Sfx.boom(1.3);
}

// ───────────────────────── 박살 / 충돌 ─────────────────────────
function smash(it) {
  it.state = 'gone';
  G.smashed++;
  save.totalSmashed++;
  const combo = ++G.combo;
  G.comboTimer = G.comboMax = 1.6 + 0.3 * lv('combo');
  G.comboBump = 1;
  G.maxCombo = Math.max(G.maxCombo, combo);
  let pts = it.value * scoreMult() * (it.crit ? 3 + lv('critDmg') : 1) * (1 + 0.5 * it.air);
  if (it.gold && lv('jackpot')) {
    pts *= 1 + 3 * lv('jackpot');
    burst(it.x, it.y, 30, { colors: ['#ffd23f', '#fff3b0', '#f9c74f'], type: 'coin', min: 150, max: 600, s0: 6, s1: 9, vz: 500, g: 1200, life: 1.5 });
    popup(it.x, it.y - 60, 'JACKPOT!', '#ffd23f', 34, 1.1);
  }
  addScore(pts);

  const { x, y } = it;
  const big = clamp(it.r / 16, 0.6, 1.8);
  const rainbow = lv('catastrophe') > 0;
  const colors = it.gold ? GOLD_PAL : it.col.concat([shade(it.col[0], -0.3)]);
  const sp = it.type.spill;
  if (sp === 'dirt') {
    stampAt(x, y, m => { m.fillStyle = '#6b4423'; m.globalAlpha = 0.8; for (let i = 0; i < 9; i++) { m.beginPath(); m.arc(x + rand(-it.r, it.r), y + rand(-it.r, it.r), rand(4, it.r * 0.7), 0, Math.PI * 2); m.fill(); } });
  } else if (sp) {
    const sx = x + it.vx * 0.05, sy = y + it.vy * 0.05;
    stampAt(sx, sy, m => { m.fillStyle = sp; m.globalAlpha = 0.35; for (let i = 0; i < 7; i++) { m.beginPath(); m.ellipse(sx + rand(-it.r, it.r) * 1.2, sy + rand(-it.r, it.r) * 1.2, rand(it.r * 0.5, it.r * 1.2), rand(it.r * 0.4, it.r), rand(0, 3), 0, Math.PI * 2); m.fill(); } });
  }
  if (it.type.paper) {
    for (let i = 0; i < 10; i++) {
      const a = rand(0, Math.PI * 2), spd = rand(80, 300);
      particle({ x, y, z: 10, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, vz: rand(100, 300), life: 3, max: 3, size: rand(4, 8), color: '#fffdf5', type: 'paper', rot: rand(0, 6), vr: rand(-8, 8), g: 500, drag: 2, settle: true });
    }
  }
  if (it.type.sturdy) {
    stampAt(x, y, m => { m.translate(x + it.vx * 0.04, y + it.vy * 0.04); m.rotate(it.rot); m.scale(1, 0.92); drawItemShape(m, it); });
    burst(x, y, 6, { colors, min: 80, max: 260 });
  } else {
    const n = Math.round(8 + big * 10);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(120, 480) * (0.7 + big * 0.3);
      particle({ x, y, z: 4, vx: Math.cos(a) * s + it.vx * 0.2, vy: Math.sin(a) * s + it.vy * 0.2, vz: rand(150, 420), life: 3, max: 3,
        size: rand(3, 7) * big, color: rainbow ? `hsl(${rand(0, 360)},90%,65%)` : pick(colors), type: 'shard', rot: rand(0, 6), vr: rand(-20, 20), g: 1500, drag: 1.2, settle: true, pts: [rand(0.6, 1), rand(0.6, 1), rand(0.6, 1)] });
    }
  }
  dust(x, y, 4 + big * 3, big);
  if (it.gold || rainbow) burst(x, y, 12, { colors: rainbow ? ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'] : ['#ffd23f', '#fff'], min: 150, max: 500, type: 'star', s0: 5, s1: 9 });
  ring(x, y, 22 + big * 20, 'rgba(255,255,255,.9)', 0.22, 4);

  const size = clamp(18 + Math.log10(pts + 1) * 3.5, 18, 46);
  popup(x, y - 26, '+' + fmt(pts), it.crit || it.gold ? '#ffd23f' : '#ffffff', size, 0.9);
  addShake(0.03 + big * 0.03 + (it.crit ? 0.1 : 0), x, y);
  if (onScreen(x, y)) { Sfx.smash(0.5 + big * 0.35, !it.type.sturdy); if (combo >= 2) Sfx.combo(combo); }

  const w = COMBO_WORDS[G.wordIdx];
  if (w && combo >= w[0]) {
    G.wordIdx++;
    bigText(w[1], w[2], 1.0, `${combo} COMBO`);
    flash(w[2], 0.08);
    Sfx.comboWord();
  }
  if (lv('chain') > 0) {
    const cr = 45 + 18 * lv('chain');
    const hits = explodeAt(x, y, cr, 380 + 30 * lv('chain'), { color: 'rgba(255,170,90,.95)', label: '연쇄', width: 6, furn: false });
    if (hits && onScreen(x, y)) Sfx.boom(0.4);
  }
  if (G.smashed >= G.total && G.mode === 'play') stageClear();
}

// 날아가던 물건이 다른 물건과 부딪힘 → 보너스 점수 + 튕겨나감
function collideRest(a, b, sp) {
  const ang = Math.atan2(a.vy, a.vx) + rand(-0.5, 0.5);
  knock(b, ang, Math.min(sp, 850) * 0.75, {});
  const bonus = b.value * 0.5 * scoreMult() * bounceMult();
  addScore(bonus);
  G.collisions++;
  popup(b.x, b.y - 22, `쾅! +${fmt(bonus)}`, '#ffb703', 20, 0.7);
  burst((a.x + b.x) / 2, (a.y + b.y) / 2, 8, { colors: ['#fff', '#ffe29a'], min: 150, max: 400, z: b.z });
  a.vx *= 0.7; a.vy *= 0.7;
  addShake(0.03, b.x, b.y);
  if (onScreen(b.x, b.y)) Sfx.clink();
}
function collideAir(a, b) {
  const nx = b.x - a.x, ny = b.y - a.y, d = Math.hypot(nx, ny) || 1;
  const ux = nx / d, uy = ny / d;
  const rel = (a.vx - b.vx) * ux + (a.vy - b.vy) * uy;
  if (rel <= 60) return;
  const imp = rel * 1.1;
  a.vx -= ux * imp; a.vy -= uy * imp; b.vx += ux * imp; b.vy += uy * imp;
  a.vz += 150; b.vz += 150; a.vr *= -1.3; b.vr *= 1.3;
  a.cd = b.cd = 0.25;
  const bonus = (a.value + b.value) * 0.6 * scoreMult() * bounceMult();
  addScore(bonus);
  G.collisions++;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  popup(mx, my - 30, `공중 충돌! +${fmt(bonus)}`, '#ff8fab', 24, 0.8);
  burst(mx, my, 14, { colors: ['#ff8fab', '#fff', '#ffd6e0'], min: 200, max: 600, type: 'star', s0: 3, s1: 6, z: (a.z + b.z) / 2 });
  ring(mx, my, 40, '#ff8fab', 0.25, 5);
  addShake(0.06, mx, my);
  if (onScreen(mx, my)) { Sfx.clink(); Sfx.knock(); }
}

// ───────────────────────── 업데이트 ─────────────────────────
function updateItems(dt) {
  const fly = [];
  const c = G.cat;
  for (const it of G.items) {
    it.sq += (1 - it.sq) * Math.min(1, dt * 10);
    if (it.state === 'rest') {
      if (it.appear < 1) {
        const before = it.appear;
        it.appear = Math.min(1, it.appear + dt * 3);
        if (before < 0 && it.appear >= 0 && G.mode === 'intro' && Math.random() < 0.25) Sfx.pop();
      }
      if (c && Math.abs(c.x - it.x) < 70 && Math.abs(c.y - it.y) < 70) it.wob = approach(it.wob, 0.5, dt * 3);
      else if (it.wob) it.wob = approach(it.wob, 0, dt * 3);
      if (it.furn && it.furn.shakeT > 0) it.wob = 1;
    } else if (it.state === 'fly') {
      fly.push(it);
      it.cd -= dt;
      it.vz -= GZ * dt;
      it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt; it.rot += it.vr * dt;
      if (collideWalls(it, it.r)) wallHit(it);
      if (Math.random() < 0.4) particle({ x: it.x, y: it.y, z: it.z, vx: 0, vy: 0, vz: 0, life: 0.22, max: 0.22, size: it.r * 0.55, color: it.gold ? '#ffd23f' : it.crit ? '#ffb703' : it.air ? '#9bf6ff' : 'rgba(255,255,255,.8)', type: 'trail', g: 0, drag: 0 });
      const sp = Math.hypot(it.vx, it.vy);
      if (sp > 200) {
        for (const o of G.items) {
          if (o.state !== 'rest' || o.appear < 0.5) continue;
          if (Math.abs(o.x - it.x) < o.r + it.r && Math.abs(o.y - it.y) < o.r + it.r && Math.hypot(o.x - it.x, o.y - it.y) < o.r + it.r && Math.abs(o.z - it.z) < 40) collideRest(it, o, sp);
        }
      }
      const f = furnAt(it.x, it.y);
      const g = f ? f.z : 0;
      if (it.z <= g) {
        if (g <= 0) { smash(it); continue; }
        if (it.vz < -220) { it.z = g; it.vz = -it.vz * 0.35; it.vx *= 0.75; it.vy *= 0.75; it.sq = 0.7; if (onScreen(it.x, it.y)) Sfx.knock(); dust(it.x, it.y, 2); }
        else {
          it.z = g; it.vz = 0;
          const s2 = Math.hypot(it.vx, it.vy), ns = Math.max(0, s2 - 900 * dt);
          if (s2 > 0) { it.vx *= ns / s2; it.vy *= ns / s2; }
          it.vr *= 0.9;
          if (ns < 25) { it.state = 'rest'; it.baseZ = g; it.furn = f; it.vx = it.vy = 0; it.air = 0; }
        }
      }
    }
  }
  for (let i = 0; i < fly.length; i++) {
    const a = fly[i];
    if (a.state !== 'fly' || a.cd > 0) continue;
    for (let j = i + 1; j < fly.length; j++) {
      const b = fly[j];
      if (b.state !== 'fly' || b.cd > 0) continue;
      if (Math.abs(a.x - b.x) < a.r + b.r && Math.abs(a.y - b.y) < a.r + b.r && Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r && Math.abs(a.z - b.z) < 35) collideAir(a, b);
    }
  }
}
function wallHit(it) { addShake(0.02, it.x, it.y); burst(it.x, it.y, 4, { color: '#fff', min: 80, max: 200, z: it.z }); if (onScreen(it.x, it.y)) Sfx.knock(); }

function updateBalls(dt) {
  for (const b of G.balls) {
    b.t += dt;
    if (b.t < 0) continue;
    const k = Math.min(1, b.t / b.dur);
    b.x = b.sx + (b.tx - b.sx) * k; b.y = b.sy + (b.ty - b.sy) * k;
    b.z = Math.sin(k * Math.PI) * 180; b.rot += dt * 14;
    if (Math.random() < 0.5) particle({ x: b.x, y: b.y, z: b.z, vx: rand(-30, 30), vy: rand(-30, 30), vz: 0, life: 0.3, max: 0.3, size: 4, color: '#9c6644', type: 'spark', g: 0, drag: 1 });
    if (k >= 1) {
      b.dead = true;
      const r = 95 + 10 * lv('hairball');
      explodeAt(b.x, b.y, r, 700, { color: '#cb997e', label: '퍼엉!', width: 14 });
      burst(b.x, b.y, 20, { colors: ['#cb997e', '#ddbea9', '#ffe8d6', '#6b705c'], min: 150, max: 600, s0: 3, s1: 8 });
      dust(b.x, b.y, 8, 2);
      addShake(0.3, b.x, b.y); G.hitstop = Math.max(G.hitstop, 0.03);
      Sfx.boom(0.9);
    }
  }
  G.balls = G.balls.filter(b => !b.dead);
}

function updateSweep(dt) {
  const s = G.sweep;
  if (!s) return;
  s.x += s.speed * dt;
  for (const it of G.items) {
    if (it.state !== 'rest' && it.state !== 'fly') continue;
    if (it.y < s.y0 || it.y > s.y1) continue;
    if (Math.abs(it.x - s.x) < 70 + it.r) knock(it, rand(-0.7, 0.7), 950, { up: 1.5, fromPaw: it.state === 'fly' });
  }
  for (const f of G.furniture) if (f.state === 'static' && Math.abs(f.x + f.w / 2 - s.x) < 60 && f.y + f.h > s.y0 && f.y < s.y1) hitFurniture(f, 400, rand(-0.5, 0.5));
  if (Math.random() < 0.8) dust(s.x, rand(s.y0, s.y1), 3, 2);
  addShake(0.02);
  if (s.x > s.x1) G.sweep = null;
}

function updateFx(dt) {
  for (const p of G.particles) {
    p.life -= dt;
    const d = Math.max(0, 1 - p.drag * dt);
    p.vx *= d; p.vy *= d;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.g) { p.vz -= p.g * dt; p.z += p.vz * dt; }
    if (p.rot !== undefined) p.rot += (p.vr || 0) * dt;
    if (p.settle) {
      if (inWall(p.x, p.y)) { p.x -= p.vx * dt; p.y -= p.vy * dt; p.vx *= -0.4; p.vy *= -0.4; }
      const g = groundAt(p.x, p.y);
      if (p.z <= g && p.vz < 0) {
        if (p.vz < -250) { p.vz *= -0.3; p.z = g; p.vx *= 0.6; p.vy *= 0.6; p.vr *= 0.5; }
        else { stampShard(p); p.life = 0; }
      }
    } else if (p.type === 'coin' && p.z < 0) { p.z = 0; p.vz = -p.vz * 0.4; }
  }
  G.particles = G.particles.filter(p => p.life > 0);
  for (const p of G.popups) { p.life -= dt; p.y += p.vy * dt; p.vy *= 1 - dt * 2.5; }
  G.popups = G.popups.filter(p => p.life > 0);
  for (const arr of [G.rings, G.paws, G.beams, G.ghosts, G.marks]) for (const r of arr) r.life -= dt;
  G.rings = G.rings.filter(r => r.life > 0);
  G.paws = G.paws.filter(r => r.life > 0);
  G.beams = G.beams.filter(r => r.life > 0);
  G.ghosts = G.ghosts.filter(r => r.life > 0);
  G.marks = G.marks.filter(r => r.life > 0);
  if (G.bigText) { G.bigText.life -= dt; if (G.bigText.life <= 0) G.bigText = null; }
  const due = G.timers.filter(tm => (tm.t -= dt) <= 0);
  G.timers = G.timers.filter(tm => tm.t > 0);
  for (const tm of due) tm.fn();
}
function stampShard(p) {
  stampAt(p.x, p.y, m => {
    m.translate(p.x, p.y); m.rotate(p.rot);
    m.fillStyle = p.color;
    if (p.type === 'paper') { m.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66); return; }
    m.strokeStyle = 'rgba(74,52,38,.55)'; m.lineWidth = 1;
    const s = p.size;
    if (p.type === 'plank') { m.fillRect(-s * 1.5, -s * 0.3, s * 3, s * 0.6); m.strokeRect(-s * 1.5, -s * 0.3, s * 3, s * 0.6); return; }
    m.beginPath(); m.moveTo(-s * p.pts[0], 0); m.lineTo(0, -s * p.pts[1]); m.lineTo(s * p.pts[2], s * 0.4); m.closePath();
    m.fill(); m.stroke();
  });
}

function updateIntro(dt) {
  const o = G.owner;
  G.introT += dt; o.t += dt; o.walkT += dt * 9;
  if (o.phase === 'in') {
    o.walking = true; o.ang = Math.PI;
    o.x -= 620 * dt;
    if (Math.floor(o.walkT / Math.PI) !== Math.floor((o.walkT - dt * 9) / Math.PI)) Sfx.footstep(0.5);
    if (o.x < G.entrance.x - 780) { o.phase = 'talk'; o.t = 0; o.walking = false; o.carry = false; }
  } else if (o.phase === 'talk') {
    o.ang = Math.PI * 0.6;
    if (o.t > 1.3) { o.phase = 'out'; o.t = 0; }
  } else if (o.phase === 'out') {
    o.walking = true; o.ang = 0;
    o.x += 1000 * dt;
    if (o.x > G.entrance.x + 80) { Sfx.door(); G.owner = null; for (const it of G.items) it.appear = Math.max(it.appear, 0.5); beginPlay(); }
  }
  if (G.owner) G.cat.ang = Math.atan2(o.y - G.cat.y, o.x - G.cat.x);
}

function updatePlay(dt) {
  G.time -= dt;
  if (G.comboTimer > 0) { G.comboTimer -= dt; if (G.comboTimer <= 0) G.combo = 0; }
  for (const id of ['laser', 'hairball', 'dash']) {
    if (!lv(id)) continue;
    const before = G.charge[id];
    G.charge[id] = Math.min(cdOf(id), before + dt);
    if (before < cdOf(id) && G.charge[id] >= cdOf(id)) { Sfx.ready(); G.readyFlash = { id, t: 0.6 }; }
  }
  if (G.time <= 6 && G.time > 0) {
    const step = Math.floor((6 - G.time) * (1 + (6 - G.time) * 0.25));
    if (step > G.warnStep) { G.warnStep = step; Sfx.footstep(0.4 + (6 - G.time) * 0.12); addShake(0.04); }
  }
  if (G.time <= 0) { G.time = 0; stageFail(); }
}

function stageClear() {
  G.mode = 'clear'; G.endT = 0;
  G.cat.mood = 'happy';
  G.queue = [];
  bigText('CLEAR!', '#ffd166', 2.2, `${G.layout.name} 정리 완료 (?)`);
  flash('#fff', 0.35);
  Sfx.clear(); Sfx.meow(1.25);
  for (let i = 0; i < 5; i++) burst(G.cam.x + rand(0.15, 0.85) * viewW(), G.cam.y + rand(0.2, 0.8) * viewH(), 30, { colors: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#fff'], type: 'confetti', min: 100, max: 600, s0: 6, s1: 11, drag: 1.5, life: 2 });
  canvas.classList.remove('playing');
  UI.showHint(false);
}
function stageFail() {
  G.mode = 'caught'; G.endT = 0; G.queue = [];
  G.owner = { x: G.entrance.x + 60, y: G.entrance.y, ang: Math.PI, walking: true, walkT: 0, carry: false, shirt: '#ef6f6c', phase: 'caught', t: 0,
    line: G.smashed > 0 ? pick(OWNER_LINES_CAUGHT) : pick(OWNER_LINES_CLEAN) };
  Sfx.door(); Sfx.fail();
  bigText('주인 귀가!', '#ff4d6d', 2, `${G.smashed}/${G.total} 파괴`);
  canvas.classList.remove('playing');
  UI.showHint(false);
}

function update(dt) {
  if (G.paused) return;
  if (G.mode === 'intro') updateIntro(dt);
  if (G.mode === 'play') updatePlay(dt);
  if (G.mode === 'caught') {
    G.endT += dt;
    const o = G.owner;
    if (o.x > G.entrance.x - 130) { o.x -= 320 * dt; o.walkT += dt * 9; } else o.walking = false;
    G.cat.ang = Math.atan2(o.y - G.cat.y, o.x - G.cat.x);
    if (G.endT > 2.6) finishStage(false);
  }
  if (G.mode === 'clear') { G.endT += dt; if (G.endT > 2.2) finishStage(true); }
  if (G.cat && G.mode !== 'title' && G.mode !== 'result') {
    updateCat(dt);
    updateItems(dt);
    updateFurniture(dt);
    updateBalls(dt);
    updateSweep(dt);
  }
  updateFx(dt);
  updateCamera(dt);
  if (G.readyFlash) { G.readyFlash.t -= dt; if (G.readyFlash.t <= 0) G.readyFlash = null; }
  G.shownScore += (G.score - G.shownScore) * Math.min(1, dt * 10);
  if (G.score - G.shownScore < 1) G.shownScore = G.score;
  G.comboBump = Math.max(0, G.comboBump - dt * 5);
}

function finishStage(cleared) {
  G.mode = 'result';
  const timeLeft = G.time;
  const bonus = cleared ? G.score * (0.3 + 0.7 * (timeLeft / G.timeMax)) : 0;
  const total = G.score + bonus;
  save.churu += total;
  const key = 's' + G.stage;
  const isBest = total > (save.best[key] || 0);
  if (isBest) save.best[key] = total;
  if (cleared) { save.maxStage = Math.max(save.maxStage, G.stage + 1); save.stage = G.stage + 1; }
  writeSave();
  UI.showResult({ cleared, score: G.score, bonus, total, timeLeft, maxCombo: G.maxCombo, smashed: G.smashed, totalItems: G.total, stage: G.stage, isBest,
    clicks: G.clicks, collisions: G.collisions, airHits: G.airHits, furnSmashed: G.furnSmashed, nextBigger: cleared && mapLayoutFor(G.stage + 1).name !== G.layout.name ? mapLayoutFor(G.stage + 1).name : null });
}

// ───────────────────────── 렌더 ─────────────────────────
function render() {
  ctx.setTransform(SF, 0, 0, SF, 0, 0);
  ctx.fillStyle = '#2a1c14'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  const sh = G.shake * G.shake * 18;
  const z = G.cam.z * (1 + G.zoom);
  ctx.translate(W / 2, H / 2); ctx.scale(1 + G.zoom, 1 + G.zoom); ctx.translate(-W / 2, -H / 2);
  ctx.translate(rand(-sh, sh), rand(-sh, sh));
  ctx.scale(G.cam.z, G.cam.z);
  ctx.translate(-G.cam.x, -G.cam.y);
  const vx0 = G.cam.x - 50, vy0 = G.cam.y - 50, vx1 = G.cam.x + viewW() + 50, vy1 = G.cam.y + viewH() + 50;
  const vis = (x, y, m = 80) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;

  for (const r of G.rooms) {
    if (r.x > vx1 || r.x + RW < vx0 || r.y > vy1 || r.y + RH < vy0) continue;
    const img = IMG[r.img];
    if (img) ctx.drawImage(img, r.x, r.y, RW, RH);
    else { ctx.fillStyle = '#f3e6d0'; ctx.fillRect(r.x, r.y, RW, RH); ctx.fillStyle = '#d9a066'; ctx.fillRect(r.ix0, r.iy0, r.ix1 - r.ix0, r.iy1 - r.iy0); }
    if (r.mess) ctx.drawImage(r.mess.canvas, r.x, r.y, RW, RH);
  }
  for (const d of G.doors) drawDoorway(d);
  for (const f of G.furniture) if (f.state === 'static' && vis(f.x + f.w / 2, f.y + f.h / 2, 300)) drawFurnitureShadow(ctx, f);
  for (const f of G.furniture) {
    if (f.state !== 'static' || !vis(f.x + f.w / 2, f.y + f.h / 2, 300)) continue;
    if (f.shakeT > 0) { ctx.save(); ctx.translate(rand(-1, 1) * f.shakeT * 30, rand(-1, 1) * f.shakeT * 30); drawFurniture(ctx, f); drawCracks(f); ctx.restore(); }
    else { drawFurniture(ctx, f); if (f.hp < f.hpMax) drawCracks(f); }
  }
  for (const it of G.items) if (it.state === 'rest' && vis(it.x, it.y)) drawItem(ctx, it, G.t);

  for (const m of G.marks) {
    const k = m.life / m.max;
    ctx.globalAlpha = k * 0.8; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(m.x, m.y, 10 + (1 - k) * 18, 0, Math.PI * 2); ctx.stroke();
  }
  for (const q of G.queue) { ctx.globalAlpha = 0.6; ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(q.x, q.y); pawShape(ctx, 7); ctx.fill(); ctx.restore(); }
  ctx.globalAlpha = 1;

  for (const g of G.ghosts) {
    ctx.globalAlpha = (g.life / g.max) * 0.5;
    const hue = g.hue;
    drawCat(ctx, { ...G.cat, x: g.x, y: g.y, ang: g.ang, z: 0, swipeT: 0 }, G.t, 1, { body: `hsl(${hue},90%,65%)`, stripe: `hsl(${hue},80%,45%)`, belly: '#fff', ear: '#ffc2d1' });
  }
  ctx.globalAlpha = 1;
  if (G.cat) drawCat(ctx, { ...G.cat, z: G.cat.z + G.cat.baseZ }, G.t);

  for (const p of G.particles) if (p.type === 'trail' && vis(p.x, p.y)) {
    ctx.globalAlpha = (p.life / p.max) * 0.45; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y - p.z * 0.15, p.size * (p.life / p.max) * (1 + p.z * 0.003), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const flyers = G.furniture.filter(f => f.state === 'fly').sort((a, b) => a.alt - b.alt);
  for (const f of flyers) drawFlyingFurniture(f);
  const flying = G.items.filter(it => it.state === 'fly' && vis(it.x, it.y)).sort((a, b) => a.z - b.z);
  for (const it of flying) drawItem(ctx, it, G.t);
  for (const b of G.balls) {
    if (b.t < 0) continue;
    ctx.fillStyle = 'rgba(40,20,10,.25)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(b.x, b.y - b.z * 0.35); ctx.rotate(b.rot); const s = 1 + b.z * 0.004; ctx.scale(s, s);
    circ(ctx, 0, 0, 11); fillStroke(ctx, '#b08968', 2.5);
    ctx.strokeStyle = '#7f5539'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 7, 0.5, 3); ctx.moveTo(-8, -3); ctx.lineTo(8, 4); ctx.stroke();
    ctx.restore();
  }
  drawPaws();
  drawSweep();
  drawBeams();
  drawParticles(vis);
  drawRings();
  drawPopups(vis);
  if (G.owner) drawOwner(ctx, G.owner, G.t);
  if (G.owner && G.owner.phase === 'talk') speech(G.owner.x - 40, G.owner.y - 110, G.owner.line);
  if (G.owner && G.mode === 'caught' && G.endT > 0.5) speech(G.owner.x - 200, G.owner.y - 110, G.owner.line);
  ctx.restore();

  if (G.mode !== 'title') drawHUD();
  if (G.flash > 0) { ctx.globalAlpha = G.flash; ctx.fillStyle = G.flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (G.mode === 'play' && mouse.inside && !G.paused) drawCursor();
}

function drawDoorway(d) {
  ctx.save();
  ctx.fillStyle = '#b98555';
  rr(ctx, d.x, d.y, d.w, d.h, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(74,52,38,.5)'; ctx.lineWidth = 2;
  if (d.v) for (let x = d.x + 20; x < d.x + d.w; x += 24) { ctx.beginPath(); ctx.moveTo(x, d.y); ctx.lineTo(x, d.y + d.h); ctx.stroke(); }
  else for (let y = d.y + 20; y < d.y + d.h; y += 24) { ctx.beginPath(); ctx.moveTo(d.x, y); ctx.lineTo(d.x + d.w, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  if (d.v) { ctx.fillRect(d.x, d.y, 8, d.h); ctx.fillRect(d.x + d.w - 8, d.y, 8, d.h); }
  else { ctx.fillRect(d.x, d.y, d.w, 8); ctx.fillRect(d.x, d.y + d.h - 8, d.w, 8); }
  ctx.restore();
}
function drawCracks(f) {
  const k = 1 - f.hp / f.hpMax;
  if (k <= 0) return;
  ctx.save();
  ctx.strokeStyle = `rgba(40,20,10,${0.35 + k * 0.4})`; ctx.lineWidth = 2;
  const n = Math.ceil(k * 5);
  const rng = mulberry32(Math.round(f.x * 13 + f.y));
  for (let i = 0; i < n; i++) {
    let x = f.x + f.w * (0.2 + rng() * 0.6), y = f.y + f.h * (0.2 + rng() * 0.6);
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) { x += (rng() - 0.5) * 30; y += (rng() - 0.5) * 30; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
}
function drawFlyingFurniture(f) {
  const s = 1 + f.alt * 0.003;
  ctx.fillStyle = `rgba(40,20,10,${Math.max(0.1, 0.3 - f.alt * 0.001)})`;
  ctx.beginPath(); ctx.ellipse(f.cx + f.alt * 0.25, f.cy + f.alt * 0.35, f.w * 0.5, f.h * 0.5, f.rot, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(f.cx, f.cy - f.alt * 0.3);
  ctx.rotate(f.rot);
  ctx.scale(s, s);
  drawFurniture(ctx, { ...f, x: -f.w / 2, y: -f.h / 2 });
  ctx.restore();
}

function drawPaws() {
  for (const p of G.paws) {
    const k = 1 - p.life / p.max;
    const s = k < 0.18 ? (p.mega ? 3 : 1.7) - (k / 0.18) * ((p.mega ? 3 : 1.7) - 1) : 1;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.ang);
    ctx.globalAlpha = Math.min(1, (1 - k) * 1.6);
    ctx.scale(s, s);
    pawShape(ctx, p.r);
    ctx.fillStyle = p.crit ? 'rgba(255,215,60,.85)' : p.mega ? 'rgba(255,180,160,.85)' : p.echo ? 'rgba(200,255,190,.7)' : 'rgba(255,255,255,.75)';
    ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    if (!p.small && k < 0.6) {
      ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.lineWidth = 5 - Math.abs(i) * 1.5;
        ctx.beginPath(); ctx.moveTo(i * p.r * 0.5 - p.r * 0.9, -p.r * 1.3); ctx.lineTo(i * p.r * 0.5 + p.r * 0.9, p.r * 1.3); ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawSweep() {
  const s = G.sweep;
  if (!s) return;
  ctx.save();
  const grd = ctx.createLinearGradient(s.x - 300, 0, s.x, 0);
  grd.addColorStop(0, 'rgba(199,125,255,0)'); grd.addColorStop(1, 'rgba(199,125,255,.45)');
  ctx.fillStyle = grd; ctx.fillRect(s.x - 300, s.y0, 300, s.y1 - s.y0);
  for (let y = s.y0 + 60; y < s.y1; y += 150) {
    ctx.save(); ctx.translate(s.x, y); ctx.rotate(Math.PI / 2);
    pawShape(ctx, 60); ctx.fillStyle = 'rgba(255,240,255,.9)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#7b2cbf'; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
function drawBeams() {
  for (const b of G.beams) {
    const k = b.life / b.max;
    ctx.save();
    ctx.translate(b.x, b.y); ctx.rotate(b.ang);
    ctx.globalAlpha = k;
    ctx.shadowColor = '#ff4d6d'; ctx.shadowBlur = 24;
    ctx.fillStyle = '#ff4d6d'; ctx.fillRect(0, -b.width * k, b.len, b.width * 2 * k);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, -b.width * 0.35 * k, b.len, b.width * 0.7 * k);
    ctx.restore();
  }
}
function drawParticles(vis) {
  for (const p of G.particles) {
    if (p.type === 'trail' || !vis(p.x, p.y)) continue;
    const a = Math.min(1, (p.life / p.max) * 2);
    const py = p.y - (p.z || 0) * 0.3;
    const zs = 1 + (p.z || 0) * 0.004;
    if (p.type === 'dust') {
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.color + (a * 0.65).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(p.x, py, p.size * (1.6 - a * 0.6), 0, Math.PI * 2); ctx.fill();
      continue;
    }
    ctx.globalAlpha = p.settle ? 1 : a;
    ctx.save(); ctx.translate(p.x, py); ctx.rotate(p.rot || 0); ctx.scale(zs, zs); ctx.fillStyle = p.color;
    if (p.type === 'shard') {
      ctx.beginPath(); ctx.moveTo(-p.size * p.pts[0], 0); ctx.lineTo(0, -p.size * p.pts[1]); ctx.lineTo(p.size * p.pts[2], p.size * 0.4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(74,52,38,.6)'; ctx.lineWidth = 1; ctx.stroke();
    } else if (p.type === 'plank') {
      ctx.fillRect(-p.size * 1.5, -p.size * 0.3, p.size * 3, p.size * 0.6); ctx.strokeStyle = 'rgba(74,52,38,.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(-p.size * 1.5, -p.size * 0.3, p.size * 3, p.size * 0.6);
    } else if (p.type === 'paper') {
      ctx.fillRect(-p.size / 2, -p.size / 3 * Math.abs(Math.cos(p.rot * 2)), p.size, p.size * 0.66 * Math.abs(Math.cos(p.rot * 2)));
    } else if (p.type === 'coin') {
      ctx.scale(Math.abs(Math.cos(p.rot * 2)) + 0.2, 1); circ(ctx, 0, 0, p.size); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#b8860b'; ctx.stroke();
    } else if (p.type === 'star') {
      star(ctx, p.size); ctx.fill();
    } else if (p.type === 'confetti') {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 * Math.abs(Math.cos(p.rot * 2)));
    } else {
      ctx.beginPath(); ctx.arc(0, 0, p.size * a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function star(c, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const q = i % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
  c.closePath();
}
function drawRings() {
  for (const r of G.rings) {
    const k = 1 - r.life / r.max;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = r.color; ctx.lineWidth = r.width * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.3 + k * 0.7), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function outlinedText(text, x, y, size, fill, align = 'center', stroke = '#3a2418') {
  ctx.font = `${size}px Jua, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.18); ctx.strokeStyle = stroke; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}
function drawPopups(vis) {
  const inv = 1 / G.cam.z;
  for (const p of G.popups) {
    if (!vis(p.x, p.y)) continue;
    const age = p.max - p.life;
    const s = (age < 0.1 ? 0.4 + (age / 0.1) * 0.9 : 1.3 - Math.min(0.3, (age - 0.1) * 1.5)) * inv;
    ctx.globalAlpha = Math.min(1, (p.life / p.max) * 3);
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s);
    outlinedText(p.text, 0, 0, p.size, p.color);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function speech(x, y, text) {
  ctx.font = '24px Jua, sans-serif';
  const w = ctx.measureText(text).width + 36;
  x = clamp(x, G.cam.x + 20, G.cam.x + viewW() - w - 20);
  rr(ctx, x, y, w, 50, 20); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 18, y + 26);
}
function drawCursor() {
  const mm = minimapRect();
  if (mm && mouse.sx >= mm.x && mouse.sy >= mm.y) { canvas.style.cursor = 'pointer'; return; }
  canvas.style.cursor = '';
  ctx.save();
  ctx.translate(mouse.sx, mouse.sy);
  const r = strikeRadius() * G.cam.z;
  ctx.globalAlpha = 0.35; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  pawShape(ctx, 11); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
  ctx.restore();
}

// 미니맵 (방이 여러 개일 때만)
function minimapRect() {
  if (!G.rooms || G.rooms.length <= 1 || G.mode === 'title') return null;
  const s = 190 / G.world.w;
  const w = G.world.w * s, h = G.world.h * s;
  return { x: W - w - 16, y: H - h - 16, w, h, s };
}
function drawMinimap() {
  const mm = minimapRect();
  if (!mm) return;
  const { x, y, w, h, s } = mm;
  ctx.save();
  rr(ctx, x - 6, y - 6, w + 12, h + 12, 10); ctx.fillStyle = 'rgba(58,36,24,.85)'; ctx.fill();
  for (const r of G.rooms) {
    ctx.fillStyle = r.img === 'mansion' ? '#7a3b2e' : r.img === 'kitchen' ? '#a9c6de' : '#c9955c';
    ctx.fillRect(x + r.ix0 * s, y + r.iy0 * s, (r.ix1 - r.ix0) * s, (r.iy1 - r.iy0) * s);
  }
  ctx.fillStyle = 'rgba(60,30,10,.6)';
  for (const f of G.furniture) if (f.state === 'static') ctx.fillRect(x + f.x * s, y + f.y * s, Math.max(2, f.w * s), Math.max(2, f.h * s));
  for (const it of G.items) {
    if (it.state !== 'rest' && it.state !== 'fly') continue;
    ctx.fillStyle = it.gold ? '#ffd23f' : '#fff';
    ctx.fillRect(x + it.x * s - 1, y + it.y * s - 1, 2.5, 2.5);
  }
  if (G.cat) { ctx.fillStyle = '#ff9f1c'; circ(ctx, x + G.cat.x * s, y + G.cat.y * s, 4); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
  ctx.strokeRect(x + G.cam.x * s, y + G.cam.y * s, viewW() * s, viewH() * s);
  outlinedText('🗺️ 클릭해서 이동', x + w / 2, y - 16, 13, '#ffd6a5');
  ctx.restore();
}

function activeList() {
  const out = [];
  if (lv('mega')) { const n = countOf('mega'); out.push({ id: 'mega', ic: '👊', type: 'count', k: (G.clicks % n) / n, label: `${G.clicks % n}/${n}` }); }
  if (lv('godpaw')) { const n = countOf('godpaw'); out.push({ id: 'god', ic: '🦁', type: 'count', k: (G.clicks % n) / n, label: `${G.clicks % n}/${n}` }); }
  for (const id of ['dash', 'laser', 'hairball']) {
    if (!lv(id)) continue;
    const cd = cdOf(id), ch = G.charge[id];
    out.push({ id, ic: SKILL_BY_ID[id].icon, type: 'cd', k: ch / cd, ready: ch >= cd, label: ch >= cd ? 'READY' : `${Math.ceil(cd - ch)}s` });
  }
  return out;
}

function drawHUD() {
  ctx.save();
  rr(ctx, 16, 12, 280, 88, 18); ctx.fillStyle = 'rgba(58,36,24,.78)'; ctx.fill();
  outlinedText(`STAGE ${G.stage} · ${G.layout.name}`, 32, 34, 20, '#ffd6a5', 'left');
  outlinedText(fmt(G.shownScore), 32, 70, 40, '#fff', 'left');
  ctx.font = '16px Jua, sans-serif'; ctx.fillStyle = '#ffd6a5'; ctx.textAlign = 'right';
  ctx.fillText(`🐟 ${fmt(save.churu)}`, 284, 70);

  const bw = 420, bx = W / 2 - bw / 2, by = 20;
  const k = G.timeMax ? G.time / G.timeMax : 1;
  const warn = G.mode === 'play' && G.time < 6;
  const jx = warn ? rand(-3, 3) : 0;
  rr(ctx, bx - 12 + jx, by - 8, bw + 24, 54, 16); ctx.fillStyle = 'rgba(58,36,24,.78)'; ctx.fill();
  rr(ctx, bx + jx, by + 8, bw, 16, 8); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill();
  rr(ctx, bx + jx, by + 8, Math.max(16, bw * k), 16, 8); ctx.fillStyle = k > 0.5 ? '#8ac926' : k > 0.25 ? '#ffca3a' : '#ff595e'; ctx.fill();
  ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🏠', bx + bw + 2 + jx, by + 14);
  ctx.save(); ctx.translate(bx + bw * (1 - k) + jx, by + 12 + Math.abs(Math.sin(G.t * 8)) * -3); ctx.scale(-1, 1); ctx.fillText('🚶', 0, 0); ctx.restore();
  outlinedText(`${Math.ceil(G.time)}초`, W / 2 + jx, by + 42, 18, warn ? '#ff595e' : '#fff');

  rr(ctx, W - 226, 12, 210, 56, 18); ctx.fillStyle = 'rgba(58,36,24,.78)'; ctx.fill();
  outlinedText(`🏺 ${G.total - G.smashed} 남음`, W - 121, 40, 26, '#fff');

  if (G.combo >= 2) {
    const s = 1 + G.comboBump * 0.25;
    ctx.save(); ctx.translate(W - 120, 128); ctx.scale(s, s); ctx.rotate(-0.06);
    const cc = G.combo >= 80 ? '#ff4d6d' : G.combo >= 40 ? '#ff9f1c' : G.combo >= 10 ? '#ffd166' : '#fff';
    outlinedText(`${G.combo}`, 0, 0, 54, cc);
    outlinedText('COMBO', 0, 36, 18, cc);
    ctx.restore();
    outlinedText(`×${comboMult().toFixed(2)}`, W - 120, 192, 20, '#caffbf');
    rr(ctx, W - 185, 206, 130, 7, 4); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
    rr(ctx, W - 185, 206, 130 * clamp(G.comboTimer / G.comboMax, 0, 1), 7, 4); ctx.fillStyle = cc; ctx.fill();
  }

  activeList().forEach((a, i) => {
    const x = 24 + i * 80, y = H - 92;
    const glow = a.ready || (G.readyFlash && G.readyFlash.id === a.id);
    rr(ctx, x, y, 68, 68, 16); ctx.fillStyle = glow ? 'rgba(255,214,102,.95)' : 'rgba(58,36,24,.8)'; ctx.fill();
    if (glow) { ctx.lineWidth = 3 + Math.sin(G.t * 10) * 1.5; ctx.strokeStyle = '#fff'; ctx.stroke(); }
    const fillH = 68 * clamp(a.k, 0, 1);
    if (!a.ready) { ctx.save(); rr(ctx, x, y, 68, 68, 16); ctx.clip(); ctx.fillStyle = a.type === 'cd' ? 'rgba(155,246,255,.35)' : 'rgba(255,183,3,.4)'; ctx.fillRect(x, y + 68 - fillH, 68, fillH); ctx.restore(); }
    ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(a.ic, x + 34, y + 28);
    outlinedText(a.label, x + 34, y + 57, 14, a.ready ? '#fff' : '#ffd6a5');
    outlinedText(a.type === 'cd' ? '⏱' : '🔢', x + 60, y + 8, 12, '#fff');
  });

  drawMinimap();

  if (G.bigText) {
    const b = G.bigText; const age = b.max - b.life;
    const s = age < 0.15 ? 1.8 - (age / 0.15) * 0.8 : 1;
    ctx.save(); ctx.globalAlpha = Math.min(1, b.life * 3);
    ctx.translate(W / 2, H / 2 - 80); ctx.scale(s, s); ctx.rotate(-0.04);
    outlinedText(b.text, 0, 0, 72, b.color);
    if (b.sub) outlinedText(b.sub, 0, 54, 26, '#fff');
    ctx.restore();
  }

  if (G.mode === 'play' && G.time < 6) {
    const a = (0.2 + 0.15 * Math.sin(G.t * 10)) * (1 - (G.time / 6) * 0.6);
    const grd = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9);
    grd.addColorStop(0, 'rgba(255,0,40,0)'); grd.addColorStop(1, `rgba(255,0,40,${a})`);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    outlinedText('👣 주인 발소리가 들린다!', W / 2, 108, 28, '#ff8fa3');
  }
  if (G.mode === 'intro') outlinedText('클릭하면 건너뛰기 ▶', W - 130, H - 30, 18, '#fff');
  ctx.restore();
}

// ───────────────────────── 메인 루프 ─────────────────────────
let last = performance.now();
function frame(now) {
  const rdt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.t += rdt;
  if (G.hitstop > 0) G.hitstop -= rdt;
  else update(rdt * (G.slowmo > 0 ? 0.35 : 1));
  G.slowmo = Math.max(0, G.slowmo - rdt);
  G.shake = Math.max(0, G.shake - rdt * 2.2);
  G.flash = Math.max(0, G.flash - rdt * 3);
  G.zoom = Math.max(0, G.zoom - rdt * 0.5);
  render();
  requestAnimationFrame(frame);
}
