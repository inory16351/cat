'use strict';
// ───────────────────────── 기본 설정 ─────────────────────────
// 좌표계: 게임 로직은 위에서 내려다본 평면 좌표(x, y) + 높이 z.
// 화면에는 쿼터뷰(2.5D)로 투영: 화면Y = y * TILT - z
const W = 1280, H = 720, GZ = 1700;
const WORLD = { w: CITY_N * DW, h: CITY_N * DH };
const CENTER = { x: WORLD.w / 2, y: WORLD.h / 2 };
const R_BASE = 250, R_MAX = 2300;          // 카메라 중심이 갈 수 있는 원형 반경
const REGION_BONUS = 6;                    // 지역 특산 고양이 확률 배수

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
function loadImg(k, src, cb) { const i = new Image(); i.onload = () => { IMG[k] = i; if (cb) cb(i); }; i.src = src; }
for (const k of ['home', 'mansion', 'alley', 'store', 'park', 'market', 'cafe', 'plaza', 'downtown']) loadImg(k, `../assets/v2/bg/${k}.png`);
for (const sp of SPECIES) loadImg('cat_' + sp.id, `../assets/v2/cats/${sp.id}.png`);

// ───────────────────────── 유틸 ─────────────────────────
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n).toString();
  if (n >= 1e21) return n.toExponential(2).replace('+', '');
  const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];
  const e = Math.floor(Math.log10(n) / 3);
  const v = n / Math.pow(1000, e);
  return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)) + u[e - 1];
}
function fmtTime(s) {
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}시간 ${m}분` : m ? `${m}분 ${s % 60}초` : `${s}초`;
}

// ───────────────────────── 저장 ─────────────────────────
const SAVE_KEY = 'nyang-city-v3';
const S = {
  churu: 0, lifetime: 0, skills: {}, level: 1, prog: 0,
  cats: { cheese: { lv: 1, dup: 0 } }, field: ['cheese'], fresh: {}, catSkills: {},
  lastSeen: Date.now(), ips: 0, smashed: 0, births: 0, muted: false, started: false, autoCam: true,
};
let resetting = false;
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) Object.assign(S, s); } catch (e) { /* 저장 불가 환경 */ } }
function writeSave() { if (resetting) return; S.lastSeen = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ } }
const lv = id => S.skills[id] || 0;

// ───────────────────────── 수치 공식 ─────────────────────────
// 가치·체력은 위치와 무관하게 "난동 레벨"(=플레이 진행도)에 따라 오른다.
const radius = () => Math.min(R_MAX, R_BASE + 55 * (S.level - 1) + 50 * lv('territory'));
const itemHP = t => 12 * t.hp * Math.pow(1.18, S.level - 1);
const itemValue = t => 4 * t.v * Math.pow(1.18, S.level - 1) * Math.pow(1.12, lv('value'));
const levelBoost = () => 1 + 0.03 * (S.level - 1);
const itemCap = () => Math.min(900, Math.round((18 + 4 * lv('storage')) * levelBoost()));
const spawnInterval = () => 1.2 / ((1 + 0.15 * lv('spawn')) * levelBoost());
const spawnBatch = () => 1 + Math.floor(lv('spawn') / 3);
const fieldCap = () => 1 + lv('tower');
// 새내기 보너스: 처음 5번 탄생할 때까지는 에너지가 훨씬 잘 나오고 오래 버팀
const rookie = () => S.births < 5;
const orbChance = () => (0.05 + 0.012 * lv('energy')) * (rookie() ? 4 : 1);
const orbMaxHits = () => 3 + lv('sturdy');
const orbCap = () => 6 + 2 * lv('energy');
// 에너지는 한 번 나오면 잠시 쉬었다 나옴 (물량이 폭증해도 탄생 속도가 폭주하지 않게)
const orbCooldown = () => (rookie() ? 3 : 8) / (1 + 0.15 * lv('energy'));
const upgradeNeed = L => Math.pow(2, L - 1);
const catLv = id => (S.cats[id] ? S.cats[id].lv : 0);
const canUpgrade = id => S.cats[id] && S.cats[id].dup >= upgradeNeed(S.cats[id].lv);
function speciesMult(id) { return Math.pow(1.5 + 0.05 * lv('bond'), Math.max(0, catLv(id) - 1)); }
const csl = (id, k) => (S.catSkills[id] && S.catSkills[id][k]) || 0;
const spc = id => csl(id, 'special');
function catSkillCost(s, id, l = csl(id, s.id)) { return Math.ceil(s.base * CAT_RARITY_COST[SPECIES_BY_ID[id].rar] * Math.pow(s.grow, l)); }
function catDamage(sp) {
  return 10 * sp.dmg * Math.pow(1.15, lv('claw')) * speciesMult(sp.id) * Math.pow(1.25, csl(sp.id, 'dmg'))
    * (csl(sp.id, 'ult') ? 3 : 1) * (sp.id === 'gym' ? 1 + 0.3 * spc('gym') : 1);
}
function catAtkInterval(sp) { return 0.8 / (sp.atk * (1 + 0.05 * lv('haste')) * (1 + 0.08 * csl(sp.id, 'spd'))) * (G.feverT > 0 ? 0.5 : 1); }
const catCrit = sp => 0.03 * lv('crit') + (sp.crit || 0) + 0.04 * csl(sp.id, 'crit');
const catCritMult = sp => 2 + 0.5 * lv('critDmg') + (sp.id === 'tuxedo' ? 0.5 * spc('tuxedo') : 0);
function catPower(id) { const sp = SPECIES_BY_ID[id]; return catDamage(sp) / catAtkInterval(sp) * (sp.sp ? 1.3 : 1); }
function skillCost(s, l = lv(s.id)) { return Math.ceil(s.base * Math.pow(s.grow, l)); }

// ───────────────────────── 런타임 상태 ─────────────────────────
const G = {
  t: 0, items: [], cats: [], orbs: [], parcels: [], particles: [], popups: [], rings: [], beams: [], coins: [], tiles: [],
  cam: { x: 0, y: 0, z: 0.8 }, userCamT: -99, patrolA: 0, rally: null, shake: 0, flash: 0, flashCol: '#fff', feverT: 0, truckT: 40,
  spawnT: 0, earnLog: [], earnAcc: 0, earnSec: 0, running: false, banner: null,
  hitstop: 0, combo: 0, comboT: 0, comboMax: 0, comboBump: 0, wordIdx: 0,
};
const BONK = ['퍽!', '쾅!', '와장창!', '챙그랑!', '빠직!', '우당탕!', '뿌직!'];
const COMBO_WORDS = [[10, 'NICE!', '#a9d3dc'], [25, 'GREAT!', '#c9e4dc'], [50, 'AWESOME!!', '#f0c878'], [100, 'CHAOS!!', '#e39a5a'], [200, 'MEOWHEM!!!', '#d9786a'], [400, '냥아포칼립스!!!', '#b49ac4']];
const comboMult = () => 1 + Math.min(G.combo, 200) * 0.005;
// 병맛 묘기: 공중제비 · 윈드밀(주변 피해) · 꼬리잡기 · 문워크
const TRICKS = {
  flip: { dur: 0.7, text: ['공중제비!', '백덤블링!', '냥-공중회전!'] },
  axel: { dur: 1.1, text: ['트리플 악셀!!', '3회전 성공!', '심사위원 전원 10점!'] },
  windmill: { dur: 1.1, text: ['윈드밀!!', '브레이크 댄스!', '빙글빙글 파괴!'] },
  spin: { dur: 1.2, text: ['꼬리 잡았다?!', '빙글빙글~', '(내 꼬리다)'] },
  moonwalk: { dur: 1.8, text: ['문워크~', '빌리 진 냥', '♪ 뒤로 걷기'] },
};
const tr0 = type => TRICKS[type].dur;
// 내려찍기: 발바닥 충격파로 주변을 날림
function slam(c, x, y, r, dmg) {
  c.swipeT = 0.26; c.sq = 0.75;
  nearby(x, y, it => { if (it.state === 'rest' && Math.hypot(it.x - x, it.y - y) < it.r + r) damageItem(it, dmg, c, false, Math.atan2(it.y - y, it.x - x)); }, 2);
  if (onScreen(x, y)) {
    ring(x, y, r, '#fff', 0.3, 10); ring(x, y, r * 1.6, 'rgba(243,220,192,.8)', 0.45, 5);
    dust(x, y, 10, 1.6);
    burst(x, y, 10, { colors: ['#fff', '#f3dcc0'], min: 200, max: 520, type: 'star', s0: 3, s1: 7, z: 10 });
    stampAt(x, y, m => { m.globalAlpha = 0.12; m.fillStyle = '#4b4540'; m.translate(x, y); pawPath(m, 16); m.fill(); });
    addShake(0.1); G.hitstop = Math.max(G.hitstop, 0.035); Sfx.thump(1.2);
  }
}
// 짧은 시간 안에 여럿 부수면 멀티킬 + 화면 줌 펀치
function multiKill(x, y) {
  G.mk = (G.mkT > 0 ? G.mk : 0) + 1; G.mkT = 0.45;
  const words = { 3: '트리플!', 5: '멀티킬!!', 8: '울트라킬!!!', 12: '대참사!!!!' };
  if (words[G.mk] && onScreen(x, y)) {
    popup(x, y, words[G.mk], G.mk >= 8 ? '#d9786a' : '#f0c878', 26 + G.mk, 1, 110);
    G.punch = Math.min(0.08, 0.02 + G.mk * 0.006); addShake(0.08 + G.mk * 0.01);
  }
}
function trickLanding(c, type) {
  const vis = onScreen(c.x, c.y);
  if (type === 'flip') {
    // 공중제비 착지 충격파
    const r = 60 + 15 * lv('flip');
    nearby(c.x, c.y, it => { if (it.state === 'rest' && Math.hypot(it.x - c.x, it.y - c.y) < it.r + r) damageItem(it, catDamage(c.sp) * 1.5, c, false); }, 2);
    if (vis) { ring(c.x, c.y, r, '#fff', 0.35, 8); dust(c.x, c.y, 10, 1.4); addShake(0.06); Sfx.thump(1); }
  } else if (type === 'axel') {
    // 트리플 악셀 착지: 3연속 충격파 + 심사 점수 (콤보 +5)
    const r = 90 + 15 * lv('axel');
    for (let i = 0; i < 3; i++) later(i * 0.1, () => {
      nearby(c.x, c.y, it => { if (it.state === 'rest' && Math.hypot(it.x - c.x, it.y - c.y) < it.r + r) damageItem(it, catDamage(c.sp) * 3, c, false); }, 2);
      if (onScreen(c.x, c.y)) { ring(c.x, c.y, r * (0.7 + i * 0.2), i === 1 ? '#f0c878' : '#fff', 0.35, 8); Sfx.thump(0.8 + i * 0.2); }
    });
    G.combo += 5; G.comboT = 1.6; G.comboBump = 1;
    if (vis) { popup(c.x, c.y, '짠! 10.0 · 10.0 · 10.0', '#f0c878', 24, 1.1, catHeight(c) + 40); dust(c.x, c.y, 12, 1.5); addShake(0.12); }
  }
}
function doTrick(c, type) {
  if (c.trick || c.nap > 0) return;
  c.trick = { type, t: 0, dur: TRICKS[type].dur };
  if (onScreen(c.x, c.y)) {
    popup(c.x, c.y, pick(TRICKS[type].text), '#fff3bf', 20, 0.9, catHeight(c) + 30);
    if (type === 'flip' || type === 'axel') { dust(c.x, c.y, 6, 1); Sfx.jump(); }
    if (type === 'windmill') { Sfx.dash(); }
  }
}

// ───────────────────────── 도시 타일 ─────────────────────────
function buildCity() {
  const byId = Object.fromEntries(DISTRICTS.map(d => [d.id, d]));
  G.tiles = [];
  for (let r = 0; r < CITY_N; r++) for (let c = 0; c < CITY_N; c++) {
    const d = byId[TILE_MAP[r][c]];
    G.tiles.push({ ...d, c, r, x: c * DW, y: r * DH, mess: null });
  }
}
function tileAt(x, y) {
  const c = clamp(Math.floor(x / DW), 0, CITY_N - 1), r = clamp(Math.floor(y / DH), 0, CITY_N - 1);
  return G.tiles[r * CITY_N + c];
}
function stampAt(x, y, fn) {
  const t = tileAt(x, y);
  if (!t.mess) {
    const cv = document.createElement('canvas');
    cv.width = DW * 0.6; cv.height = DH * 0.6;
    t.mess = cv.getContext('2d'); t.mess.scale(0.6, 0.6);
  }
  const m = t.mess;
  m.save(); m.translate(-t.x, -t.y); fn(m); m.restore();
}

// ───────────────────────── 카메라 (쿼터뷰, 고정 줌) ─────────────────────────
// 화면 = (x - cam.x) * z,  (y * TILT - h - cam.y) * z
const viewW = () => W / G.cam.z, viewH = () => H / G.cam.z;
// 지금 화면에 보이는 바닥 영역 (평면 좌표)
function viewRect(pad = 0) {
  return { x0: G.cam.x + pad, x1: G.cam.x + viewW() - pad, y0: (G.cam.y + 70 / G.cam.z) / TILT + pad, y1: (G.cam.y + viewH()) / TILT - pad };
}
const camCenter = () => ({ x: G.cam.x + viewW() / 2, y: (G.cam.y + viewH() / 2) / TILT });
function setCamCenter(x, y) {
  // 카메라 중심은 원형 영역 안으로만
  const dx = x - CENTER.x, dy = y - CENTER.y, d = Math.hypot(dx, dy), R = radius();
  if (d > R) { x = CENTER.x + dx / d * R; y = CENTER.y + dy / d * R; }
  G.cam.x = x - viewW() / 2; G.cam.y = y * TILT - viewH() / 2;
}
function screenToWorld(sx, sy) { return { x: G.cam.x + sx / G.cam.z, y: (G.cam.y + sy / G.cam.z) / TILT }; }
function onScreen(x, y, m = 120) {
  const py = y * TILT;
  return x > G.cam.x - m && x < G.cam.x + viewW() + m && py > G.cam.y - m && py < G.cam.y + viewH() + m;
}
function updateCamera(dt) {
  // 한동안 조작이 없으면 영역 안을 천천히 자동 순찰 (방치 플레이용)
  if (S.autoCam && G.t - G.userCamT > 15 && G.running) {
    G.patrolA += dt * 0.035;
    const R = radius() * 0.65;
    const tx = CENTER.x + Math.cos(G.patrolA) * R, ty = CENTER.y + Math.sin(G.patrolA * 1.3) * R * 0.8;
    const c = camCenter(), k = Math.min(1, dt * 0.5);
    setCamCenter(c.x + (tx - c.x) * k, c.y + (ty - c.y) * k);
  } else {
    const c = camCenter(); setCamCenter(c.x, c.y);
  }
}

// ───────────────────────── 공간 해시 ─────────────────────────
const CELL = 120;
let grid = new Map();
function buildGrid() {
  grid = new Map();
  for (const it of G.items) {
    if (it.state !== 'rest') continue;
    const k = ((it.x / CELL) | 0) * 100000 + ((it.y / CELL) | 0);
    let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(it);
  }
}
function nearby(x, y, fn, cells = 1) {
  const cx = (x / CELL) | 0, cy = (y / CELL) | 0;
  for (let i = -cells; i <= cells; i++) for (let j = -cells; j <= cells; j++) {
    const a = grid.get((cx + i) * 100000 + cy + j);
    if (a) for (const it of a) fn(it);
  }
}
const inRect = (x, y, r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1;
function clampWorld(o, r, bounce = 0.6) {
  let hit = false;
  if (o.x < r) { o.x = r; o.vx = Math.abs(o.vx) * bounce; hit = true; }
  if (o.x > WORLD.w - r) { o.x = WORLD.w - r; o.vx = -Math.abs(o.vx) * bounce; hit = true; }
  if (o.y < r) { o.y = r; o.vy = Math.abs(o.vy) * bounce; hit = true; }
  if (o.y > WORLD.h - r) { o.y = WORLD.h - r; o.vy = -Math.abs(o.vy) * bounce; hit = true; }
  return hit;
}

// ───────────────────────── 물건 배송 (화면 주변으로) ─────────────────────────
function freeSpot(rad, area) {
  for (let i = 0; i < 10; i++) {
    const x = rand(area.x0 + rad, area.x1 - rad), y = rand(area.y0 + rad, area.y1 - rad);
    let ok = x > rad && y > rad && x < WORLD.w - rad && y < WORLD.h - rad;
    if (ok) nearby(x, y, o => { if (ok && Math.hypot(o.x - x, o.y - y) < o.r + rad + 4) ok = false; });
    if (ok) return { x, y };
  }
  return null;
}
function makeItem(k, x, y, mult = 1) {
  const t = ITEMS[k];
  const gold = Math.random() < 0.03 * lv('gold');
  const it = {
    type: { ...t, k }, r: t.r * 1.55, x, y, z: 0, vx: 0, vy: 0, vz: 0, rot: rand(0, 6.28), vr: 0,
    state: 'rest', col: [pick(t.pal), pick(t.pal), pick(t.pal)], gold,
    hpMax: itemHP(t) * (gold ? 3 : 1), value: itemValue(t) * (gold ? 10 : 1) * mult,
    appear: 0, wob: 0, seed: rand(0, 100), sq: 1, air: 0, hitSet: null,
  };
  it.hp = it.hpMax;
  return it;
}
// 지역마다 나오는 물건 종류가 다름
// 지역 물건 목록에서 가중치(ITEMS[k].w, 기본 1)대로 뽑음 → 자동차 같은 큰 물건은 드물게
function pickWeighted(keys) {
  let sum = 0;
  for (const k of keys) sum += ITEMS[k].w ?? 1;
  let x = Math.random() * sum;
  for (const k of keys) { x -= ITEMS[k].w ?? 1; if (x <= 0) return k; }
  return keys[0];
}
function dropParcel(area, mult = 1, height = 420) {
  if (G.items.length + G.parcels.length >= 1400) return false;
  const px = rand(area.x0, area.x1), py = rand(area.y0, area.y1);
  const k = pickWeighted(tileAt(px, py).items);
  const p = freeSpot(ITEMS[k].r * 1.55, area);
  if (!p) return false;
  G.parcels.push({ x: p.x, y: p.y, z: height + rand(0, 200), vz: 0, rot: rand(-0.3, 0.3), item: makeItem(k, p.x, p.y, mult) });
  return true;
}
function updateSpawns(dt) {
  const vr = viewRect(30);
  let inView = 0;
  for (const it of G.items) if (it.state === 'rest' && inRect(it.x, it.y, vr)) inView++;
  inView += G.parcels.length;
  G.spawnT -= dt;
  if (G.spawnT <= 0) {
    G.spawnT = spawnInterval() * rand(0.7, 1.3);
    for (let i = 0; i < spawnBatch() && inView + i < itemCap(); i++) dropParcel(vr);
  }
  // 화면에서 멀리 떨어진 물건이 너무 쌓이면 조용히 정리
  if (G.items.length > itemCap() * 2.5 + 80) {
    const far = G.items.filter(it => it.state === 'rest' && !onScreen(it.x, it.y, 600));
    far.slice(0, 40).forEach(it => { it.state = 'dead'; });
  }
  if (lv('truck')) {
    G.truckT -= dt;
    if (G.truckT <= 0) {
      G.truckT = 60 - 3 * lv('truck');
      const n = 20 + 15 * lv('truck');
      for (let i = 0; i < n; i++) dropParcel(vr, 1 + lv('rush'), 500 + i * 25);
      bigBanner('🚚 택배 트럭 도착!', lv('rush') ? `블랙 프라이데이! 물건 ${n}개 (가치 ×${1 + lv('rush')})` : `물건 ${n}개 투하!`, '#f0c878');
      Sfx.door();
    }
  }
  for (const p of G.parcels) {
    p.vz -= 2200 * dt; p.z += p.vz * dt;
    if (p.z <= 0) {
      p.dead = true;
      G.items.push(p.item);
      if (onScreen(p.x, p.y)) { burst(p.x, p.y, 6, { colors: ['#d4a373', '#f1dca7', '#fff'], min: 80, max: 240 }); if (Math.random() < 0.25) Sfx.pop(); }
    }
  }
  G.parcels = G.parcels.filter(p => !p.dead);
}

// ───────────────────────── 난동 레벨 ─────────────────────────
function addProgress(n) {
  S.prog += n;
  if (S.prog >= levelNeed(S.level)) {
    S.prog = 0;
    S.level++;
    bigBanner(`🔥 난동 레벨 ${S.level}!`, `물건이 더 단단·비싸지고, 갈 수 있는 곳이 넓어졌다 (반경 ${Math.round(radius())})`, '#dcebc9');
    flash('#fff', 0.15); Sfx.clear();
    writeSave();
  }
}

// ───────────────────────── 고양이 ─────────────────────────
function makeCatEntity(id) {
  const sp = SPECIES_BY_ID[id];
  const vr = viewRect(60);
  return { id, sp, x: rand(vr.x0, vr.x1), y: rand(vr.y0, vr.y1), z: 0, face: 1, speed: 0, sq: 1, walkT: rand(0, 6), swipeT: 0, lean: 0,
    target: null, goal: null, wait: rand(0, 1.5), atkCD: rand(0, 0.5), nap: 0, hits: 0, tp: 0, gravT: rand(2, 5),
    puddleT: 0, rollT: 0, born: 1, flexT: 0, say: null, sight: rand(260, 420), curious: rand(0.2, 0.5), dashCD: rand(0.5, 3), dash: null };
}
function syncFieldCats() {
  S.field = S.field.filter(id => S.cats[id]).slice(0, fieldCap());
  const pool = G.cats.slice();
  G.cats = S.field.map(id => { const j = pool.findIndex(c => c.id === id); return j >= 0 ? pool.splice(j, 1)[0] : makeCatEntity(id); });
}

function updateCats(dt) {
  const napChance = 0.01 * (1 - 0.18 * lv('coffee'));
  const vr = viewRect(40);
  for (const c of G.cats) {
    const sp = c.sp;
    c.born = Math.min(1, c.born + dt * 2.5);
    c.swipeT = Math.max(0, c.swipeT - dt);
    c.flexT = Math.max(0, c.flexT - dt);
    c.sq += (1 - c.sq) * Math.min(1, dt * 10);
    c.lean += (0 - c.lean) * Math.min(1, dt * 8);
    if (c.lunge) { c.lunge.t -= dt; if (c.lunge.t <= 0) c.lunge = null; }
    if (c.hopT) c.hopT = Math.max(0, c.hopT - dt);
    if (c.trick) {
      const tr = c.trick;
      tr.t += dt;
      tr.hitT = (tr.hitT || 0) - dt;
      if (tr.type === 'windmill' && tr.hitT <= 0) {
        // 윈드밀: 누워서 도는 동안 주변을 연속으로 갈아버림
        tr.hitT = 0.15;
        const wr = 70 + 12 * lv('windmill');
        nearby(c.x, c.y, it => { if (it.state === 'rest' && Math.hypot(it.x - c.x, it.y - c.y) < it.r + wr) damageItem(it, catDamage(sp) * (0.5 + 0.15 * lv('windmill')), c, false); });
        if (onScreen(c.x, c.y)) { ring(c.x, c.y, wr, 'rgba(255,255,255,.7)', 0.25, 5); dust(c.x, c.y, 2, 1.2); }
      }
      if (tr.type === 'moonwalk') {
        // 문워크: 뒤로 미끄러지며 밟는 물건 파괴
        c.x -= c.face * (70 + 20 * lv('moonwalk')) * dt; c.walkT += dt * 5;
        if (tr.hitT <= 0) { tr.hitT = 0.2; nearby(c.x, c.y, it => { if (it.state === 'rest' && Math.hypot(it.x - c.x, it.y - c.y) < it.r + 30) damageItem(it, catDamage(sp) * 0.6, c, false); }); }
      }
      if (tr.type === 'spin' && tr.hitT <= 0) {
        // 꼬리잡기: 빙글빙글 도는 동안 주변 에너지를 빨아들임 (합체 도움)
        tr.hitT = 0.2;
        const pr = 250 + 60 * lv('spin');
        for (const o of G.orbs) { const d = Math.hypot(o.x - c.x, o.y - c.y); if (d < pr && d > 20) { o.vx += (c.x - o.x) / d * 160; o.vy += (c.y - o.y) / d * 160; } }
      }
      if (tr.type === 'axel' && !tr.landed && tr.t >= tr.dur * 0.85) { tr.landed = true; trickLanding(c, 'axel'); }
      if (tr.t >= tr.dur) { if (tr.type === 'flip') trickLanding(c, 'flip'); c.trick = null; }
      if (tr.type !== 'moonwalk') { c.speed = 0; continue; }
    } else if (!G.rally && c.speed < 40) {
      // 산책 중 가끔: 문워크 / 꼬리잡기 (스킬을 배워야 함)
      if (lv('moonwalk') && Math.random() < 0.012 * lv('moonwalk') * dt) doTrick(c, 'moonwalk');
      else if (lv('spin') && Math.random() < 0.012 * lv('spin') * dt) doTrick(c, 'spin');
    }
    c.atkCD -= dt; c.tp -= dt;
    if (c.say) { c.say.t -= dt; if (c.say.t <= 0) c.say = null; }
    const outside = !inRect(c.x, c.y, vr);
    if (c.nap > 0 && !outside) {
      c.nap -= dt; c.speed = 0;
      if (Math.random() < dt * 1.2) popup(c.x + 16, c.y, 'z', '#fff', 16, 1, 70);
      continue;
    }
    c.nap = 0;
    if (!G.rally && !outside && Math.random() < napChance * dt) { c.nap = rand(2, 4); c.say = { text: pick(NAP_LINES), t: 1.6 }; continue; }

    const T = c.target;
    if (T && (T.item ? T.item.state !== 'rest' || !inRect(T.item.x, T.item.y, vr) : T.orb.dead)) c.target = null;
    if (outside) {
      // 카메라를 옮기면 화면 안으로 우르르 따라옴
      c.target = null;
      if (!c.goal || !inRect(c.goal.x, c.goal.y, vr)) c.goal = { x: rand(vr.x0 + 60, vr.x1 - 60), y: rand(vr.y0 + 40, vr.y1 - 40) };
    } else if (G.rally) {
      if (!c.target || !c.target.item || Math.hypot(c.target.item.x - G.rally.x, c.target.item.y - G.rally.y) > 260) {
        let best = null, bd = Infinity;
        nearby(G.rally.x, G.rally.y, it => { if (it.state !== 'rest' || it.appear < 1) return; const dd = Math.hypot(it.x - G.rally.x, it.y - G.rally.y) + rand(0, 80); if (dd < bd) { bd = dd; best = it; } }, 3);
        c.target = best && bd < 400 ? { item: best } : null;
        if (!c.target) c.goal = { x: G.rally.x + rand(-60, 60), y: G.rally.y + rand(-60, 60) };
      }
    } else if (!c.target) {
      c.wait -= dt;
      if (c.wait <= 0) {
        // 화면 안에서 눈에 띄는 걸 "아무거나" 골라감 (가장 가까운 것만 쫓지 않아서 흩어짐)
        const seen = [];
        nearby(c.x, c.y, it => { if (it.state === 'rest' && it.appear >= 1 && inRect(it.x, it.y, vr) && Math.abs(it.x - c.x) < c.sight && Math.abs(it.y - c.y) < c.sight) seen.push(it); }, Math.ceil(c.sight / CELL));
        const orbs = G.orbs.filter(o => Math.hypot(o.x - c.x, o.y - c.y) < c.sight);
        if (orbs.length && Math.random() < c.curious) c.target = { orb: pick(orbs) };
        else if (seen.length) c.target = { item: pick(seen) };
        else {
          c.goal = { x: rand(vr.x0 + 40, vr.x1 - 40), y: rand(vr.y0 + 30, vr.y1 - 30) };
          if (Math.random() < 0.08) c.say = { text: pick(WANDER_LINES), t: 1.4 };
        }
        c.wait = rand(0.2, 0.8);
      }
    }

    let tx = c.x, ty = c.y, reach = 0;
    const tg = c.target;
    if (tg && tg.item) { tx = tg.item.x; ty = tg.item.y; reach = (sp.reach || 28) + tg.item.r; }
    else if (tg && tg.orb) { tx = tg.orb.x; ty = tg.orb.y; reach = 20; }
    else if (c.goal) { tx = c.goal.x; ty = c.goal.y; reach = 8; }
    const dx = tx - c.x, dy = ty - c.y, dist = Math.hypot(dx, dy);

    // 돌진 중: 경로의 물건을 모두 날리고, 도착하면 내려찍기
    if (c.dash) {
      const d = c.dash;
      d.t += dt;
      const k = Math.min(1, d.t / d.dur);
      const px = c.x, py = c.y;
      c.x = d.sx + (d.ex - d.sx) * ease(k); c.y = d.sy + (d.ey - d.sy) * ease(k);
      c.speed = 600; c.walkT += dt * 40;
      if (onScreen(c.x, c.y) && Math.random() < 0.8) particle({ x: px, y: py, z: 20, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 14, color: 'rgba(255,255,255,.6)', type: 'trail', drag: 0 });
      nearby(c.x, c.y, it => {
        if (it.state !== 'rest' || d.hit.has(it) || Math.hypot(it.x - c.x, it.y - c.y) > it.r + 34) return;
        d.hit.add(it);
        const side = Math.sign((it.x - c.x) * Math.sin(d.ang) - (it.y - c.y) * Math.cos(d.ang)) || 1;
        damageItem(it, catDamage(sp) * 1.5, c, false, d.ang - side * 0.9);
      });
      if (k >= 1) {
        c.dash = null;
        slam(c, c.x + Math.cos(d.ang) * 20, c.y + Math.sin(d.ang) * 20, 70, catDamage(sp) * 2.5);
      }
      continue;
    }
    if (tg && tg.item && !G.rally && dist > 150 && dist < 480 && (c.dashCD -= dt) <= 0 && !c.trick) {
      const a = Math.atan2(dy, dx);
      c.dash = { sx: c.x, sy: c.y, ex: tx - Math.cos(a) * reach * 0.6, ey: ty - Math.sin(a) * reach * 0.6, t: 0, dur: Math.max(0.16, dist / 1400), ang: a, hit: new Set() };
      c.dashCD = rand(2.5, 4.5);
      c.face = dx >= 0 ? 1 : -1; c.lean = 1;
      if (onScreen(c.x, c.y)) { dust(c.x, c.y, 6, 1.2); Sfx.dash(); }
      continue;
    }
    if (sp.sp === 'teleport' && tg && tg.item && dist > 120 && c.tp <= 0) {
      smoke(c.x, c.y);
      const a = Math.atan2(-dy, -dx);
      c.x = tx + Math.cos(a) * (reach - 4); c.y = ty + Math.sin(a) * (reach - 4);
      smoke(c.x, c.y); c.tp = 1.6 - 0.25 * spc('ninja');
      continue;
    }
    const spdMul = outside ? 2.4 : G.rally ? 1.8 + 0.3 * lv('rally') : tg ? 1 : 0.55;
    const maxSpd = 190 * sp.spd * (1 + 0.1 * lv('move')) * (1 + 0.12 * csl(sp.id, 'move')) * spdMul;
    let mvx = 0, mvy = 0;
    if (dist > reach) { const k = Math.min(maxSpd, dist * 5); mvx = dx / dist * k; mvy = dy / dist * k; }
    else if (!tg && c.goal) { c.goal = null; c.wait = rand(0.5, 2.2); }
    if (!G.rally) for (const o of G.cats) {
      if (o === c) continue;
      const ox = c.x - o.x, oy = c.y - o.y, od = Math.hypot(ox, oy);
      if (od < 80 && od > 0.1) { mvx += ox / od * (80 - od) * 4; mvy += oy / od * (80 - od) * 4; }
    }
    const sp2 = Math.hypot(mvx, mvy);
    if (sp2 > 1) {
      c.x += mvx * dt; c.y += mvy * dt;
      c.speed = sp2; c.walkT += dt * sp2 / 18;
      if (Math.abs(mvx) > 8) c.face = mvx > 0 ? 1 : -1;
    } else c.speed = approach(c.speed, 0, 800 * dt);
    if (tg && dist <= reach) {
      c.face = dx >= 0 ? 1 : -1;
      if (tg.orb) { batOrb(c, tg.orb); c.target = null; }
      else if (c.atkCD <= 0) {
        catAttack(c, tg.item);
        c.atkCD = catAtkInterval(sp) * rand(0.9, 1.1);
        if (tg.item.state !== 'rest') {
          if (tg.item.type.big && lv('windmill')) doTrick(c, 'windmill');
          else {
            const bonus = tg.item.crit ? 2 : 1;
            const opts = [['windmill', 0.03 * lv('windmill')], ['axel', 0.04 * lv('axel')], ['flip', 0.06 * lv('flip')]];
            for (const [ty, ch] of opts) if (ch && Math.random() < ch * bonus) { doTrick(c, ty); break; }
          }
        }
        if (tg.item.state !== 'rest') { c.target = null; c.wait = Math.random() < 0.6 ? 0 : rand(0.3, 1.2); c.hopT = 0.35; if (Math.random() < 0.25) c.say = { text: pick(['♪', '냥!', '헤헷', '💢', '✨']), t: 0.7 }; }
      }
    }
    specialPassives(c, dt);
    for (const o of G.orbs) if (o.batCD <= 0 && o.z < 40 && Math.hypot(o.x - c.x, o.y - c.y) < o.r + 24) batOrb(c, o);
    c.x = clamp(c.x, 20, WORLD.w - 20); c.y = clamp(c.y, 20, WORLD.h - 20);
  }
}
function specialPassives(c, dt) {
  const sp = c.sp;
  if (sp.sp === 'roll') {
    c.rollT -= dt;
    if (c.rollT <= 0 && c.speed > 40) { c.rollT = 0.25; nearby(c.x, c.y, it => { if (it.state === 'rest' && Math.hypot(it.x - c.x, it.y - c.y) < it.r + 28) damageItem(it, catDamage(sp) * 0.4 * (1 + 0.3 * spc('loaf')), c, false); }); }
  }
  if (sp.sp === 'puddle') {
    c.puddleT -= dt;
    if (c.puddleT <= 0) {
      c.puddleT = 0.5; let hit = false;
      const pr = 70 + 15 * spc('liquid');
      nearby(c.x, c.y, it => { if (it.state === 'rest' && Math.hypot(it.x - c.x, it.y - c.y) < it.r + pr) { damageItem(it, catDamage(sp) * 0.45, c, false); hit = true; } });
      if (hit && onScreen(c.x, c.y)) ring(c.x, c.y, pr + 10, 'rgba(255,169,77,.6)', 0.4, 6);
    }
  }
  if (sp.sp === 'gravity') {
    c.gravT -= dt; c.z = 16 + Math.sin(G.t * 2 + c.x) * 6;
    if (c.gravT <= 0) {
      c.gravT = 5 - 0.5 * spc('space');
      let pulled = 0;
      const gr = 420 + 80 * spc('space');
      for (const o of G.orbs) { const d = Math.hypot(o.x - c.x, o.y - c.y); if (d < gr && d > 1) { o.vx += (c.x - o.x) / d * 480; o.vy += (c.y - o.y) / d * 480; o.vz = 200; pulled++; } }
      if (pulled) { ring(c.x, c.y, gr * 0.7, '#e599f7', 0.8, 10); popup(c.x, c.y, '무중력!', '#e599f7', 18, 0.8, 90); }
    }
  }
}

function catAttack(c, it) {
  const sp = c.sp;
  c.hits++;
  c.swipeT = 0.26; c.lean = 1; c.sq = 1.12;
  c.lunge = { t: 0.26, ang: Math.atan2(it.y - c.y, it.x - c.x) };
  const crit = Math.random() < catCrit(sp);
  const dmg = catDamage(sp) * (crit ? catCritMult(sp) : 1);
  if (sp.id === 'mackerel' && Math.random() < 0.12 * spc('mackerel')) later(0.1, () => { if (it.state === 'rest') { damageItem(it, dmg, c, false); if (onScreen(it.x, it.y)) popup(it.x, it.y, '연타!', '#74c0fc', 16, 0.5, 40); } });
  switch (sp.sp) {
    case 'laser': {
      const pierce = spc('laser');
      const dd = Math.hypot(it.x - c.x, it.y - c.y) || 1;
      const ux = (it.x - c.x) / dd, uy = (it.y - c.y) / dd;
      const len = pierce ? 260 + 120 * pierce : dd;
      G.beams.push({ x0: c.x, y0: c.y, z0: catHeight(c) * 0.62, x1: c.x + ux * len, y1: c.y + uy * len, life: 0.18, max: 0.18, col: '#d9786a', w: 5 + pierce });
      if (onScreen(c.x, c.y) && Math.random() < 0.3) Sfx.laser();
      if (pierce) {
        const hits = [];
        for (const o of G.items) {
          if (o === it || o.state !== 'rest') continue;
          const ox = o.x - c.x, oy = o.y - c.y, along = ox * ux + oy * uy;
          if (along > 0 && along < len && Math.abs(ox * uy - oy * ux) < o.r + 8) hits.push([along, o]);
        }
        hits.sort((a, b) => a[0] - b[0]).slice(0, pierce).forEach(([, o]) => damageItem(o, dmg * 0.7, c, false));
      }
      return damageItem(it, dmg, c, crit);
    }
    case 'fire': {
      const a = Math.atan2(it.y - c.y, it.x - c.x);
      if (onScreen(c.x, c.y)) for (let i = 0; i < 8; i++) particle({ x: c.x + Math.cos(a) * 20, y: c.y + Math.sin(a) * 20, z: 34, vx: Math.cos(a + rand(-0.4, 0.4)) * rand(200, 380), vy: Math.sin(a + rand(-0.4, 0.4)) * rand(200, 380), life: 0.35, max: 0.35, size: rand(5, 10), color: pick(['#ff6b6b', '#ffa94d', '#ffd43b']), type: 'fire', drag: 3 });
      nearby(c.x, c.y, o => {
        if (o.state !== 'rest') return;
        const d = Math.hypot(o.x - c.x, o.y - c.y);
        let da = Math.atan2(o.y - c.y, o.x - c.x) - a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
        if (d < 110 + 25 * spc('fire') + o.r && Math.abs(da) < 0.55) damageItem(o, dmg * (o === it ? 1 : 0.6), c, crit && o === it);
      }, 2);
      return;
    }
    case 'multi': {
      const near = [it], maxT = 3 + spc('tower');
      nearby(c.x, c.y, o => { if (o !== it && near.length < maxT && o.state === 'rest' && Math.hypot(o.x - c.x, o.y - c.y) < o.r + 80) near.push(o); });
      for (const o of near) damageItem(o, dmg, c, crit);
      return;
    }
    case 'quack': {
      damageItem(it, dmg, c, crit);
      const qr = 120 + 25 * spc('duck');
      if (onScreen(c.x, c.y)) { ring(c.x, c.y, qr, '#8ce99a', 0.35, 8); popup(c.x, c.y, '크아앙!', '#8ce99a', 24, 0.6, 80); Sfx.knock(); }
      nearby(c.x, c.y, o => { if (o !== it && o.state === 'rest' && Math.hypot(o.x - c.x, o.y - c.y) < qr + o.r) damageItem(o, dmg * 0.6, c, false); }, 2);
      return;
    }
    case 'slam':
      if (c.hits % (spc('chonk') >= 4 ? 2 : 3) === 0) {
        c.sq = 0.6;
        const sr = 90 + 20 * spc('chonk');
        if (onScreen(c.x, c.y)) { ring(it.x, it.y, sr, '#fff', 0.35, 12); dust(it.x, it.y, 10, 1.8); popup(c.x, c.y, '쿵!', '#fff', 26, 0.7, 90); addShake(0.12); Sfx.thump(1.4); }
        nearby(it.x, it.y, o => { if (o.state === 'rest' && Math.hypot(o.x - it.x, o.y - it.y) < sr + o.r) damageItem(o, dmg, c, crit); }, 2);
        return;
      }
      break;
  }
  damageItem(it, dmg, c, crit);
}

// 체력이 0이 되면 → 날아감 (바닥에 떨어질 때 박살)
function damageItem(it, dmg, c, crit, fromAng) {
  if (it.state !== 'rest') return;
  it.hp -= dmg;
  it.wob = 1; it.sq = 1.45; it.flashT = 0.09;
  const vis = onScreen(it.x, it.y);
  if (c) { const a = Math.atan2(it.y - c.y, it.x - c.x); it.x += Math.cos(a) * 5; it.y += Math.sin(a) * 5; }
  if (c && vis) {
    // 맞은 자리에 발바닥 섬광
    G.paws = G.paws || [];
    if (G.paws.length < 40) G.paws.push({ x: it.x, y: it.y, life: 0.2, max: 0.2, ang: rand(-0.4, 0.4), crit });
    G.rings.push({ x: it.x, y: it.y, r: 20, color: crit ? '#f2c14e' : 'rgba(255,255,255,.95)', life: 0.2, max: 0.2, width: 4 });
    burst(it.x, it.y, crit ? 10 : 4, { colors: crit ? ['#f2c14e', '#fff'] : ['#fff', '#fff3bf'], min: 120, max: crit ? 420 : 260, type: 'star', s0: 2, s1: crit ? 7 : 4, z: 24 });
    if (crit) popup(it.x + rand(-10, 10), it.y, `${fmt(dmg)}!!`, '#f2c14e', 26, 0.8, 36);
    if (crit) { G.hitstop = Math.max(G.hitstop, 0.05); addShake(0.08); Sfx.crit && Math.random() < 0.4 && Sfx.clink(); }
  }
  if (it.hp <= 0) {
    const a = fromAng ?? (c ? Math.atan2(it.y - c.y, it.x - c.x) : rand(0, 6.28));
    const push = (c && c.sp.sp === 'push') ? 1.6 * (1 + 0.25 * spc('box')) : 1;
    it.killer = c ? c.id : null;
    launch(it, a + rand(-0.35, 0.35), rand(320, 520) * push * (crit ? 1.3 : 1), crit);
  } else if (vis && Math.random() < 0.2) Sfx.knock();
}
function launch(it, ang, speed, crit) {
  it.state = 'fly';
  it.vx = Math.cos(ang) * speed * 1.45; it.vy = Math.sin(ang) * speed * 1.45;
  it.vz = rand(460, 640) * (it.type.big ? 0.75 : 1) * (crit ? 1.25 : 1);
  it.vr = rand(12, 22) * (Math.random() < 0.5 ? -1 : 1); it.sq = 1.6; it.crit = crit; it.flashT = 0.1;
  it.hitSet = new Set();
  if (onScreen(it.x, it.y)) {
    G.hitstop = Math.max(G.hitstop, it.type.big ? 0.07 : 0.025);
    burst(it.x, it.y, 10, { colors: ['#fff', '#fff3bf', '#f3dcc0'], min: 180, max: 460, type: 'star', s0: 3, s1: 7, z: 20 });
    ring(it.x, it.y, 34, '#fff', 0.2, 6);
    if (Math.random() < 0.2) popup(it.x + rand(-20, 20), it.y, pick(BONK), crit ? '#f2c14e' : '#ffffff', crit ? 34 : 26, 0.55, 70);
    addShake(it.type.big ? 0.2 : 0.035);
    Sfx.knock();
  }
}

function updateItems(dt) {
  const flying = [];
  for (const it of G.items) {
    it.sq += (1 - it.sq) * Math.min(1, dt * 10);
    if (it.flashT) it.flashT = Math.max(0, it.flashT - dt);
    if (it.state === 'rest') {
      it.wob = approach(it.wob, 0, dt * 3);
      if (it.appear < 1) it.appear = Math.min(1, it.appear + dt * 4);
      continue;
    }
    if (it.state !== 'fly') continue;
    flying.push(it);
    it.vz -= GZ * dt;
    it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt; it.rot += it.vr * dt;
    clampWorld(it, it.r);
    if (onScreen(it.x, it.y) && Math.random() < 0.4) particle({ x: it.x, y: it.y, z: it.z, vx: 0, vy: 0, life: 0.2, max: 0.2, size: it.r * 0.5, color: it.gold ? '#f2c14e' : it.crit ? '#e6a85a' : 'rgba(255,255,255,.8)', type: 'trail', drag: 0 });
    // 날아가는 물건이 놓여 있는 물건을 들이받음 → 피해 + 보너스
    const sp = Math.hypot(it.vx, it.vy);
    if (sp > 150 && it.z < 60) {
      nearby(it.x, it.y, o => {
        if (o.state !== 'rest' || it.hitSet.has(o)) return;
        if (Math.abs(o.x - it.x) > o.r + it.r || Math.abs(o.y - it.y) > o.r + it.r || Math.hypot(o.x - it.x, o.y - it.y) > o.r + it.r) return;
        it.hitSet.add(o);
        const bonus = o.value * 0.3;
        earn(bonus);
        damageItem(o, it.hpMax * 1.2 + o.hpMax * 0.6, null, false, Math.atan2(it.vy, it.vx));
        it.vx *= 0.8; it.vy *= 0.8;
        if (onScreen(o.x, o.y)) { if (Math.random() < 0.35) popup(o.x, o.y, `쾅! +${fmt(bonus)}`, '#e6a85a', 18, 0.7, 40); burst((o.x + it.x) / 2, (o.y + it.y) / 2, 6, { colors: ['#fff', '#ffe29a'], min: 120, max: 320, z: 15 }); Sfx.clink(); addShake(0.02); }
      });
    }
    if (it.z <= 0 && it.vz < 0) smashItem(it);
  }
  for (let i = 0; i < flying.length; i++) {
    const a = flying[i];
    if (a.state !== 'fly') continue;
    for (let j = i + 1; j < flying.length; j++) {
      const b = flying[j];
      if (b.state !== 'fly' || a.hitSet.has(b)) continue;
      if (Math.abs(a.x - b.x) > a.r + b.r || Math.abs(a.y - b.y) > a.r + b.r || Math.abs(a.z - b.z) > 35 || Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r) continue;
      a.hitSet.add(b); b.hitSet.add(a);
      const tvx = a.vx, tvy = a.vy; a.vx = b.vx * 0.9; a.vy = b.vy * 0.9; b.vx = tvx * 0.9; b.vy = tvy * 0.9;
      a.vz += 160; b.vz += 160; a.air++; b.air++;
      const bonus = (a.value + b.value) * 0.5;
      earn(bonus);
      if (onScreen(a.x, a.y)) { popup((a.x + b.x) / 2, (a.y + b.y) / 2, `공중 충돌! +${fmt(bonus)}`, '#e8a3a0', 22, 0.8, a.z + 30); burst((a.x + b.x) / 2, (a.y + b.y) / 2, 12, { colors: ['#e8a3a0', '#fff'], type: 'star', min: 200, max: 500, s0: 3, s1: 6, z: a.z }); Sfx.clink(); }
    }
  }
  G.items = G.items.filter(it => it.state !== 'dead');
}

function smashItem(it) {
  it.state = 'dead';
  S.smashed++;
  addProgress(1);
  G.combo++; G.comboT = 1.6; G.comboBump = 1; G.comboMax = Math.max(G.comboMax, G.combo);
  const w = COMBO_WORDS[G.wordIdx];
  if (w && G.combo >= w[0]) { G.wordIdx++; bigBanner(w[1], `${G.combo} COMBO · 수입 ×${comboMult().toFixed(2)}`, w[2]); Sfx.comboWord(); flash(w[2], 0.08); }
  const gain = it.value * (1 + 0.5 * it.air) * comboMult();
  earn(gain);
  const vis = onScreen(it.x, it.y, 300);
  if (vis) {
    const big = clamp(it.r / 16, 0.6, 2.5);
    const colors = it.gold ? GOLD_PAL : it.col.concat([shade(it.col[0], -0.3)]);
    stampAt(it.x, it.y, m => {
      const sp = it.type.spill;
      if (sp === 'dirt') { m.fillStyle = '#6b4423'; m.globalAlpha = 0.7; for (let i = 0; i < 7; i++) { m.beginPath(); m.arc(it.x + rand(-it.r, it.r), it.y + rand(-it.r, it.r), rand(4, it.r * 0.6), 0, 6.28); m.fill(); } }
      else if (sp) { m.fillStyle = sp; m.globalAlpha = 0.3; for (let i = 0; i < 6; i++) { m.beginPath(); m.ellipse(it.x + rand(-it.r, it.r), it.y + rand(-it.r, it.r), rand(it.r * 0.5, it.r * 1.1), rand(it.r * 0.4, it.r * 0.9), rand(0, 3), 0, 6.28); m.fill(); } }
      if (it.type.sturdy) { m.globalAlpha = 0.9; m.translate(it.x, it.y); m.rotate(it.rot); m.scale(1, 0.9); drawItemShape(m, it); }
    });
    const n = Math.round(5 + big * 6);
    for (let i = 0; i < n; i++) {
      const a = rand(0, 6.28), s = rand(120, 400) * (0.7 + big * 0.3);
      particle({ x: it.x, y: it.y, z: 6, vx: Math.cos(a) * s + it.vx * 0.2, vy: Math.sin(a) * s + it.vy * 0.2, vz: rand(180, 420), g: 1500, life: 3, max: 3, size: rand(3, 7) * Math.min(big, 1.6),
        color: pick(colors), type: it.type.paper ? 'paper' : 'shard', rot: rand(0, 6), vr: rand(-18, 18), drag: 1.4, settle: true, pts: [rand(0.6, 1), rand(0.6, 1), rand(0.6, 1)] });
    }
    dust(it.x, it.y, 5 + big * 3, big * 1.3);
    ring(it.x, it.y, 26 + big * 22, 'rgba(255,255,255,.95)', 0.28, 7);
    ring(it.x, it.y, 50 + big * 40, it.gold ? '#f2c14e' : 'rgba(255,214,165,.8)', 0.4, 4);
    burst(it.x, it.y, 8 + big * 4, { colors: it.gold ? ['#f2c14e', '#fff'] : colors, min: 160, max: 480, type: 'star', s0: 3, s1: 7, z: 12 });
    popup(it.x, it.y, '+' + fmt(gain), it.gold ? '#f2c14e' : '#dcebc9', clamp(20 + Math.log10(gain + 1) * 1.8, 20, 40), 1.0, 40);
    for (let i = 0; i < (it.gold ? 6 : 2) && G.coins.length < 80; i++) G.coins.push({ x: it.x + rand(-15, 15), y: it.y + rand(-15, 15), t: -i * 0.04, dur: rand(0.55, 0.85) });
    addShake(0.02 + big * 0.02);
    if (it.type.big) { addShake(0.35); Sfx.boom(1); flash('#fff', 0.15); G.hitstop = Math.max(G.hitstop, 0.08); popup(it.x, it.y, '대폭발!!', '#ff922b', 44, 1, 90); burst(it.x, it.y, 30, { colors: ['#ff6b6b', '#ffa94d', '#ffd43b', '#fff'], min: 250, max: 800, s0: 5, s1: 10, z: 20 }); }
    else if (Math.random() < 0.5) Sfx.smash(0.3 + big * 0.2, !it.type.sturdy);
  }
  {
    // 박살나면 작은 폭발: 주변 물건을 흔들고 피해 → 도미노처럼 이어짐 (연쇄 폭발 스킬로 강화)
    const r = it.r + 30 + 20 * lv('chain'), frac = 0.25 + 0.1 * lv('chain');
    if (vis) ring(it.x, it.y, r, lv('chain') ? 'rgba(227,154,90,.9)' : 'rgba(255,255,255,.6)', 0.3, lv('chain') ? 7 : 4);
    later(0.05, () => nearby(it.x, it.y, o => { if (o.state === 'rest' && Math.hypot(o.x - it.x, o.y - it.y) < r + o.r) { o.wob = 1; damageItem(o, o.hpMax * frac, null, false, Math.atan2(o.y - it.y, o.x - it.x)); } }, 2));
  }
  multiKill(it.x, it.y);
  // 고양이 에너지: 확률적으로 튀어나옴
  let orbs = G.orbCD <= 0 && Math.random() < orbChance() + (it.killer === 'cheese' ? 0.02 * spc('cheese') : 0) ? 1 : 0;
  if (it.gold) orbs += lv('jackpot');
  for (let i = 0; i < orbs; i++) {
    // 이미 떠 있는 에너지가 있으면 절반 확률로 그쪽을 향해 튀어나감 (부딪혀야 합쳐짐)
    const other = G.orbs.length && Math.random() < 0.5 ? pick(G.orbs) : null;
    spawnOrb(it.x, it.y, other ? Math.atan2(other.y - it.y, other.x - it.x) + rand(-0.15, 0.15) : Math.atan2(it.vy, it.vx) + rand(-0.8, 0.8));
  }
}
function earn(v) { S.churu += v; S.lifetime += v; G.earnAcc += v; }

// ───────────────────────── 고양이 에너지 ─────────────────────────
// 물건처럼 튕기며 날아감 · 다른 물체에 3번 부딪히면 깨짐 · 날아가다 에너지끼리 부딪히면 새 고양이!
function spawnOrb(x, y, ang) {
  if (G.orbs.length >= orbCap()) return;
  G.orbCD = orbCooldown();
  const s = rand(260, 420);
  G.orbs.push({ x, y, z: 10, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, vz: 320, r: 14, hits: 0, life: rookie() ? 60 : 25, batCD: 0.3, hue: rand(185, 215), dead: false, lastHit: null });
  if (onScreen(x, y)) { popup(x, y, '✨ 에너지!', '#bfe3ea', 18, 0.9, 60); Sfx.ready(); }
}
function batOrb(c, o) {
  if (o.batCD > 0) return;
  let a = rand(0, 6.28);
  if (Math.random() < 0.25 + 0.1 * lv('bouncy')) {
    let best = null, bd = 700;
    for (const q of G.orbs) { if (q === o || q.dead) continue; const d = Math.hypot(q.x - o.x, q.y - o.y); if (d < bd) { bd = d; best = q; } }
    if (best) a = Math.atan2(best.y - o.y, best.x - o.x);
  }
  const s = rand(380, 540);
  o.vx = Math.cos(a) * s; o.vy = Math.sin(a) * s; o.vz = 260; o.batCD = 0.4; o.lastHit = null;
  c.swipeT = 0.18; c.lean = 1; c.face = o.x >= c.x ? 1 : -1;
  if (onScreen(o.x, o.y)) { burst(o.x, o.y, 6, { colors: ['#bfe3ea', '#fff'], min: 100, max: 260, z: o.z }); Sfx.pop(); }
}
function orbHit(o, what) {
  if (o.lastHit === what) return;
  o.lastHit = what;
  o.hits++;
  if (onScreen(o.x, o.y)) { ring(o.x, o.y, 26, '#bfe3ea', 0.25, 4); Sfx.clink(); }
  if (o.hits >= orbMaxHits()) {
    o.dead = true;
    if (onScreen(o.x, o.y)) { burst(o.x, o.y, 14, { colors: ['#bfe3ea', '#fff', '#a5d8ff'], min: 80, max: 300, z: o.z }); popup(o.x, o.y, '펑… (에너지 소멸)', '#a5d8ff', 16, 0.8, 40); }
  }
}
function updateOrbs(dt) {
  const vr = viewRect(0);
  for (const o of G.orbs) {
    o.life -= dt; o.batCD -= dt;
    o.vz -= 1400 * dt; o.z += o.vz * dt;
    if (o.z <= 0) { o.z = 0; o.vz = Math.abs(o.vz) > 140 ? -o.vz * 0.5 : 0; }
    const ground = o.z < 2 && o.vz === 0;
    const f = Math.max(0, 1 - (ground ? 2.2 : 0.3) * dt);
    o.vx *= f; o.vy *= f;
    o.x += o.vx * dt; o.y += o.vy * dt;
    const sp = Math.hypot(o.vx, o.vy);
    // 화면 가장자리도 "벽"처럼 튕김 (충돌 횟수 +1)
    const b = { x: o.x, y: o.y, vx: o.vx, vy: o.vy };
    let wall = false;
    if (b.x < vr.x0 + o.r) { b.x = vr.x0 + o.r; b.vx = Math.abs(b.vx) * 0.85; wall = 'L'; }
    if (b.x > vr.x1 - o.r) { b.x = vr.x1 - o.r; b.vx = -Math.abs(b.vx) * 0.85; wall = 'R'; }
    if (b.y < vr.y0 + o.r) { b.y = vr.y0 + o.r; b.vy = Math.abs(b.vy) * 0.85; wall = 'T'; }
    if (b.y > vr.y1 - o.r) { b.y = vr.y1 - o.r; b.vy = -Math.abs(b.vy) * 0.85; wall = 'B'; }
    Object.assign(o, b);
    if (wall && sp > 60) orbHit(o, 'wall' + wall + Math.round(G.t));
    if (sp > 60 && o.z < 40) nearby(o.x, o.y, it => {
      if (o.dead || it.state !== 'rest' || o.lastHit === it) return;
      const dx = o.x - it.x, dy = o.y - it.y, d = Math.hypot(dx, dy);
      if (d > o.r + it.r || d < 0.01) return;
      const nx = dx / d, ny = dy / d, dot = o.vx * nx + o.vy * ny;
      if (dot < 0) { o.vx -= 2 * dot * nx * 0.9; o.vy -= 2 * dot * ny * 0.9; }
      o.x = it.x + nx * (o.r + it.r + 1); o.y = it.y + ny * (o.r + it.r + 1);
      it.wob = 1;
      orbHit(o, it);
    });
    if (onScreen(o.x, o.y) && Math.random() < 0.35) particle({ x: o.x, y: o.y, z: o.z + 10, vx: rand(-20, 20), vy: rand(-20, 20), vz: 40, life: 0.5, max: 0.5, size: rand(2, 4), color: `hsl(${o.hue},90%,75%)`, type: 'spark', drag: 1 });
    if (o.life <= 0 && !o.dead) { o.dead = true; if (onScreen(o.x, o.y)) burst(o.x, o.y, 8, { colors: ['#bfe3ea'], min: 40, max: 120 }); }
  }
  for (let i = 0; i < G.orbs.length; i++) {
    const a = G.orbs[i];
    if (a.dead) continue;
    for (let j = i + 1; j < G.orbs.length; j++) {
      const b = G.orbs[j];
      if (b.dead) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > a.r + b.r || Math.abs(a.z - b.z) > 30) continue;
      const moving = Math.hypot(a.vx, a.vy) > 80 || Math.hypot(b.vx, b.vy) > 80;
      if (moving) { a.dead = b.dead = true; birthCat((a.x + b.x) / 2, (a.y + b.y) / 2); break; }
      const ux = (b.x - a.x) / (d || 1), uy = (b.y - a.y) / (d || 1);
      a.x -= ux * 2; a.y -= uy * 2; b.x += ux * 2; b.y += uy * 2;
    }
  }
  G.orbs = G.orbs.filter(o => !o.dead);
}

// 지역마다 태어날 확률이 다름: 특산 고양이는 REGION_BONUS 배 더 잘 나옴
function speciesWeights(region) {
  const luck = lv('luck');
  const local = REGION_CATS[region] || [];
  const perRar = RARITY.map((_, i) => SPECIES.filter(s => s.rar === i).length);
  return SPECIES.map(sp => RARITY[sp.rar].w / perRar[sp.rar] * (sp.rar ? 1 + 0.15 * luck * sp.rar : 1) * (local.includes(sp.id) ? REGION_BONUS : 1));
}
function speciesOdds(region) {
  const w = speciesWeights(region), sum = w.reduce((a, b) => a + b, 0);
  return Object.fromEntries(SPECIES.map((sp, i) => [sp.id, w[i] / sum]));
}
function rollSpecies(region) {
  const w = speciesWeights(region);
  let x = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < SPECIES.length; i++) { x -= w[i]; if (x <= 0) return SPECIES[i]; }
  return SPECIES[0];
}
function birthCat(x, y) {
  const region = tileAt(x, y);
  const sp = rollSpecies(region.id);
  const isNew = !S.cats[sp.id];
  if (isNew) { S.cats[sp.id] = { lv: 1, dup: 0 }; S.fresh[sp.id] = true; }
  else S.cats[sp.id].dup++;
  S.births++;
  flash(RARITY[sp.rar].col, isNew ? 0.3 : 0.1);
  for (let i = 0; i < 3; i++) ring(x, y, 60 + i * 40, i % 2 ? '#fff' : RARITY[sp.rar].col, 0.5 + i * 0.15, 10);
  burst(x, y, 36, { colors: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#fff'], type: 'confetti', min: 150, max: 600, s0: 5, s1: 9, drag: 1.6, life: 1.4, z: 40 });
  burst(x, y, 10, { colors: ['#e8a3a0'], type: 'heart', min: 60, max: 200, s0: 8, s1: 12, drag: 1.5, life: 1.6, z: 50 });
  addShake(0.15);
  Sfx.meow(sp.id === 'duck' ? 0.6 : rand(0.9, 1.4)); Sfx.clear();
  let joined = false;
  if (isNew) {
    if (S.field.length < fieldCap()) { S.field.push(sp.id); joined = true; }
    else {
      let wi = 0; S.field.forEach((id, i) => { if (catPower(id) < catPower(S.field[wi])) wi = i; });
      if (catPower(sp.id) > catPower(S.field[wi])) {
        const out = G.cats.find(c => c.id === S.field[wi]);
        if (out) popup(out.x, out.y, '퇴근!', '#ccc', 18, 1, 90);
        S.field[wi] = sp.id; joined = true;
      }
    }
    syncFieldCats();
    const c = G.cats.find(k => k.id === sp.id);
    if (c) { c.x = x; c.y = y; c.born = 0; c.say = { text: '안녕 집사!', t: 2 }; }
  } else {
    popup(x, y, `${sp.name} 조각 +1`, RARITY[sp.rar].col, 22, 1.2, 90);
  }
  if (lv('fever')) { G.feverT = 3 * lv('fever'); popup(x, y, '탄생 축제!! 광란 모드', '#ffca3a', 26, 1.2, 130); }
  UI.onBirth(sp, isNew, joined, region.name);
  writeSave();
}
function upgradeSpecies(id) {
  if (!canUpgrade(id)) return false;
  const c = S.cats[id];
  c.dup -= upgradeNeed(c.lv);
  c.lv++;
  writeSave();
  const e = G.cats.find(k => k.id === id);
  if (e) { e.born = 0.3; e.say = { text: `Lv ${c.lv}! 더 세졌다냥`, t: 2 }; ring(e.x, e.y, 80, '#ffd43b', 0.6, 10); }
  return true;
}

// ───────────────────────── 입력: 드래그로 카메라 이동, 클릭으로 소집 ─────────────────────────
const pointer = { down: false, sx: 0, sy: 0, lx: 0, ly: 0, drag: false };
function canvasPoint(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
canvas.addEventListener('pointerdown', e => {
  Sfx.resume();
  const p = canvasPoint(e);
  Object.assign(pointer, { down: true, sx: p.x, sy: p.y, lx: p.x, ly: p.y, drag: false });
});
window.addEventListener('pointermove', e => {
  if (!pointer.down) return;
  const p = canvasPoint(e);
  if (!pointer.drag && Math.hypot(p.x - pointer.sx, p.y - pointer.sy) > 8) pointer.drag = true;
  if (pointer.drag) {
    const c = camCenter();
    setCamCenter(c.x - (p.x - pointer.lx) / G.cam.z, c.y - (p.y - pointer.ly) / G.cam.z / TILT);
    G.userCamT = G.t; canvas.style.cursor = 'grabbing';
  }
  pointer.lx = p.x; pointer.ly = p.y;
});
window.addEventListener('pointerup', e => {
  if (!pointer.down) return;
  pointer.down = false;
  canvas.style.cursor = '';
  if (!pointer.drag && G.running && e.target === canvas) { const p = canvasPoint(e); onTap(p.x, p.y); }
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const c = camCenter();
  G.cam.z = clamp(G.cam.z * (e.deltaY < 0 ? 1.08 : 1 / 1.08), 0.6, 1.2);
  setCamCenter(c.x, c.y);
  G.userCamT = G.t;
}, { passive: false });
window.addEventListener('keydown', e => {
  const k = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] }[e.code];
  if (!k || !G.running) return;
  const c = camCenter(); setCamCenter(c.x + k[0] * 160, c.y + k[1] * 160); G.userCamT = G.t;
});

function minimapRect() {
  const size = 150;
  return { x: 14, y: H - size - 14, w: size, h: size, s: size / (R_MAX * 2 + 1200) };
}
function onTap(sx, sy) {
  const mm = minimapRect();
  if (sx >= mm.x && sx <= mm.x + mm.w && sy >= mm.y && sy <= mm.y + mm.h) {
    setCamCenter(CENTER.x + (sx - mm.x - mm.w / 2) / mm.s, CENTER.y + (sy - mm.y - mm.h / 2) / mm.s);
    G.userCamT = G.t; Sfx.click(); return;
  }
  const w = screenToWorld(sx, sy);
  // 고양이 스프라이트(서 있는 모습)를 누르면 이름표
  const py = G.cam.y + sy / G.cam.z;
  const hit = G.cats.find(c => { const h = catHeight(c); const dy = c.y * TILT - py; return Math.abs(c.x - w.x) < h * 0.45 && dy > -8 && dy < h; });
  if (hit) { hit.say = { text: `${hit.sp.name} Lv${catLv(hit.id)}`, t: 2 }; hit.sq = 1.3; Sfx.meow(rand(1, 1.3)); return; }
  // 집사의 부름: 클릭한 곳으로 고양이들이 더 빨리 뛰어옴
  G.rally = { x: w.x, y: w.y, t: 3 + lv('rally'), max: 3 + lv('rally') };
  for (const c of G.cats) { c.target = null; c.goal = null; if (c.nap > 0) { c.nap = 0; c.say = { text: '냥?!', t: 0.8 }; } }
  ring(w.x, w.y, 60, '#fff', 0.4, 5);
  Sfx.click();
}

// ───────────────────────── 이펙트 ─────────────────────────
function addShake(v) { G.shake = Math.min(0.5, G.shake + v); }
function popup(x, y, text, color = '#fff', size = 22, life = 0.9, z = 30) {
  if (G.popups.length > 80) G.popups.shift();
  G.popups.push({ x, y, z, text, color, size, life, max: life, vz: 80 });
}
function particle(p) { if (G.particles.length < 1600) { if (p.z === undefined) p.z = 0; G.particles.push(p); } }
function burst(x, y, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.28), sp = rand(o.min || 80, o.max || 300);
    particle({ x, y, z: o.z || 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(-40, 160), life: rand(0.35, 0.8) * (o.life || 1), max: 1, size: rand(o.s0 || 2, o.s1 || 5),
      color: o.colors ? pick(o.colors) : o.color || '#fff', type: o.type || 'spark', rot: rand(0, 6), vr: rand(-10, 10), drag: o.drag ?? 2.5 });
  }
}
function dust(x, y, n = 6, s = 1) { for (let i = 0; i < n; i++) { const a = rand(0, 6.28), v = rand(40, 150) * s; particle({ x, y, z: 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 20, life: rand(0.35, 0.7), max: 1, size: rand(7, 13) * Math.sqrt(s), color: 'rgba(240,225,205,', type: 'dust', drag: 4 }); } }
function smoke(x, y) { if (onScreen(x, y)) for (let i = 0; i < 10; i++) { const a = rand(0, 6.28), v = rand(30, 120); particle({ x, y, z: 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 30, life: 0.5, max: 0.5, size: rand(10, 16), color: 'rgba(80,80,90,', type: 'dust', drag: 3 }); } }
function ring(x, y, r, color, life = 0.35, width = 6) { if (G.rings.length < 120) G.rings.push({ x, y, r, color, life, max: life, width }); }
function flash(col, a) { G.flashCol = col; G.flash = Math.max(G.flash, a); }
const timers = [];
function later(t, fn) { timers.push({ t, fn }); }
function bigBanner(text, sub, color) { G.banner = { text, sub, color, life: 2.4, max: 2.4 }; }

function updateFx(dt) {
  for (const p of G.particles) {
    p.life -= dt;
    const d = Math.max(0, 1 - p.drag * dt);
    p.vx *= d; p.vy *= d; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.g) { p.vz -= p.g * dt; p.z += p.vz * dt; }
    else if (p.vz) { p.z = Math.max(0, p.z + p.vz * dt); p.vz *= d; }
    if (p.rot !== undefined) p.rot += (p.vr || 0) * dt;
    if (p.settle && p.z <= 0 && p.vz < 0) {
      if (p.vz < -250) { p.vz *= -0.3; p.z = 0; p.vx *= 0.6; p.vy *= 0.6; }
      else { stampShard(p); p.life = 0; }
    }
  }
  G.particles = G.particles.filter(p => p.life > 0);
  for (const p of G.popups) { p.life -= dt; p.z += p.vz * dt; p.vz *= 1 - dt * 2.5; }
  G.popups = G.popups.filter(p => p.life > 0);
  for (const r of G.rings) r.life -= dt;
  G.rings = G.rings.filter(r => r.life > 0);
  for (const b of G.beams) b.life -= dt;
  G.beams = G.beams.filter(b => b.life > 0);
  for (const c of G.coins) c.t += dt;
  G.coins = G.coins.filter(c => c.t < c.dur);
  if (G.banner) { G.banner.life -= dt; if (G.banner.life <= 0) G.banner = null; }
  for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
  G.cleanT = (G.cleanT || 0) + dt;
  if (G.cleanT > 1) {
    G.cleanT = 0;
    for (const t of G.tiles) if (t.mess) { const m = t.mess; m.save(); m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'destination-out'; m.fillStyle = 'rgba(0,0,0,.03)'; m.fillRect(0, 0, m.canvas.width, m.canvas.height); m.restore(); }
  }
}
function stampShard(p) {
  stampAt(p.x, p.y, m => {
    m.translate(p.x, p.y); m.rotate(p.rot); m.fillStyle = p.color;
    if (p.type === 'paper') { m.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66); return; }
    m.strokeStyle = 'rgba(74,52,38,.5)'; m.lineWidth = 1; m.beginPath(); m.moveTo(-p.size * p.pts[0], 0); m.lineTo(0, -p.size * p.pts[1]); m.lineTo(p.size * p.pts[2], p.size * 0.4); m.closePath(); m.fill(); m.stroke();
  });
}

// ───────────────────────── 업데이트 ─────────────────────────
function update(dt) {
  G.t += dt;
  if (G.rally) { G.rally.t -= dt; if (G.rally.t <= 0) G.rally = null; }
  G.feverT = Math.max(0, G.feverT - dt);
  G.orbCD = (G.orbCD || 0) - dt;
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) { G.combo = 0; G.wordIdx = 0; } }
  G.comboBump = Math.max(0, G.comboBump - dt * 5);
  G.mkT = (G.mkT || 0) - dt; G.punch = Math.max(0, (G.punch || 0) - dt * 0.25);
  if (G.paws) { for (const pw of G.paws) pw.life -= dt; G.paws = G.paws.filter(pw => pw.life > 0); }
  updateCamera(dt);
  buildGrid();
  updateSpawns(dt);
  updateCats(dt);
  updateItems(dt);
  updateOrbs(dt);
  updateFx(dt);
  G.earnSec += dt;
  if (G.earnSec >= 1) {
    G.earnSec -= 1;
    G.earnLog.push(G.earnAcc); G.earnAcc = 0;
    if (G.earnLog.length > 20) G.earnLog.shift();
    S.ips = G.earnLog.reduce((a, b) => a + b, 0) / G.earnLog.length;
  }
}

// ───────────────────────── 렌더 (쿼터뷰) ─────────────────────────
function render() {
  ctx.setTransform(SF, 0, 0, SF, 0, 0);
  ctx.fillStyle = '#2f3e46'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  const sh = G.shake * G.shake * 14;
  ctx.translate(rand(-sh, sh), rand(-sh, sh));
  const z = G.cam.z;
  const pz = 1 + (G.punch || 0);
  ctx.translate(W / 2, H / 2); ctx.scale(pz, pz); ctx.translate(-W / 2, -H / 2);
  ctx.scale(z, z);
  ctx.translate(-G.cam.x, -G.cam.y);

  // 바닥 (세로로 눌러서 비스듬한 쿼터뷰)
  ctx.save();
  ctx.scale(1, TILT);
  const vy0 = G.cam.y / TILT, vy1 = (G.cam.y + viewH()) / TILT;
  for (const t of G.tiles) {
    if (t.x > G.cam.x + viewW() || t.x + DW < G.cam.x || t.y > vy1 || t.y + DH < vy0) continue;
    const img = IMG[t.img];
    if (img) ctx.drawImage(img, t.x, t.y, DW, DH); else { ctx.fillStyle = '#c9b79c'; ctx.fillRect(t.x, t.y, DW, DH); }
    if (t.mess) ctx.drawImage(t.mess.canvas, t.x, t.y, DW, DH);
  }
  if (G.rally) {
    const k = G.rally.t / G.rally.max;
    ctx.globalAlpha = 0.25 * k; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(G.rally.x, G.rally.y, 260, 0, 6.28); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.save(); ctx.globalAlpha = 0.6 + 0.3 * Math.sin(G.t * 10); ctx.translate(G.rally.x, G.rally.y); ctx.scale(1.6, 1.6);
    pawPath(ctx, 18); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = 'rgba(30,15,5,.22)';
  for (const it of G.items) if (onScreen(it.x, it.y, 40)) { const k = 1 - Math.min(0.5, it.z / 500); ctx.beginPath(); ctx.ellipse(it.x, it.y + it.r * 0.25, it.r * k, it.r * 0.9 * k, 0, 0, 6.28); ctx.fill(); }
  for (const c of G.cats) if (onScreen(c.x, c.y)) { const w = catHeight(c) * 0.5; ctx.beginPath(); ctx.ellipse(c.x, c.y, w, w * 0.8, 0, 0, 6.28); ctx.fill(); }
  for (const o of G.orbs) if (onScreen(o.x, o.y)) { ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r, o.r * 0.8, 0, 0, 6.28); ctx.fill(); }
  for (const p of G.parcels) if (onScreen(p.x, p.y)) { ctx.globalAlpha = Math.max(0.2, 1 - p.z / 700); ctx.beginPath(); ctx.ellipse(p.x, p.y, 20, 16, 0, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1; }
  for (const r of G.rings) {
    if (!onScreen(r.x, r.y, r.r)) continue;
    const k = 1 - r.life / r.max;
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = r.color; ctx.lineWidth = (r.width * (1 - k) + 1) / TILT;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.3 + k * 0.7), 0, 6.28); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // 서 있는 것들: 뒤(위쪽)부터 앞(아래쪽) 순서로
  const list = [];
  for (const it of G.items) if (onScreen(it.x, it.y, 60)) list.push({ y: it.y, f: () => drawItem25(it) });
  for (const c of G.cats) if (onScreen(c.x, c.y, 100)) list.push({ y: c.y, f: () => drawCatSprite(c) });
  for (const o of G.orbs) if (onScreen(o.x, o.y)) list.push({ y: o.y, f: () => drawOrb(o) });
  for (const p of G.parcels) if (onScreen(p.x, p.y)) list.push({ y: p.y, f: () => drawParcel(p) });
  list.sort((a, b) => a.y - b.y);
  for (const e of list) e.f();

  for (const b of G.beams) {
    ctx.save(); ctx.globalAlpha = b.life / b.max; ctx.strokeStyle = b.col; ctx.lineWidth = b.w; ctx.shadowColor = b.col; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(b.x0, b.y0 * TILT - b.z0); ctx.lineTo(b.x1, b.y1 * TILT - 10); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = b.w * 0.35; ctx.stroke(); ctx.restore();
  }
  if (G.paws) for (const pw of G.paws) {
    const k = 1 - pw.life / pw.max;
    ctx.save(); ctx.translate(pw.x, pw.y * TILT - 20); ctx.rotate(pw.ang);
    const sc = (k < 0.3 ? 1.6 - k / 0.3 * 0.6 : 1) * (pw.crit ? 1.5 : 1);
    ctx.scale(sc, sc * 0.8); ctx.globalAlpha = 1 - k;
    pawPath(ctx, 14); ctx.fillStyle = pw.crit ? 'rgba(242,193,78,.9)' : 'rgba(255,255,255,.9)'; ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  drawParticles();
  const inv = 1 / z;
  for (const c of G.cats) if (c.say && onScreen(c.x, c.y)) bubble(c.x, c.y * TILT - catHeight(c) - 18, c.say.text, inv);
  drawPopups(inv);
  ctx.restore();

  for (const c of G.coins) {
    if (c.t < 0) continue;
    const k = c.t / c.dur, e = k * k;
    const sx = (c.x - G.cam.x) * z, sy = (c.y * TILT - 20 - G.cam.y) * z;
    const x = sx + (96 - sx) * e, y = sy + (38 - sy) * e - Math.sin(k * Math.PI) * 60;
    ctx.save(); ctx.translate(x, y); ctx.scale(Math.abs(Math.cos(G.t * 12 + c.x)) * 0.8 + 0.2, 1);
    circ(ctx, 0, 0, 7); ctx.fillStyle = '#f2c14e'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#b8860b'; ctx.stroke(); ctx.restore();
  }
  // 따뜻한 조명 + 비네트
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(255,220,170,0)'); vg.addColorStop(1, 'rgba(40,20,30,.45)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  drawMinimap();
  if (G.combo >= 3) {
    const s2 = 1 + G.comboBump * 0.35;
    const cc = G.combo >= 100 ? '#d9786a' : G.combo >= 50 ? '#e39a5a' : G.combo >= 10 ? '#f0c878' : '#fff';
    ctx.save(); ctx.translate(W - 120, 175); ctx.scale(s2, s2); ctx.rotate(-0.08 + Math.sin(G.t * 12) * 0.02 * Math.min(G.combo, 50) / 10);
    outlined(`${G.combo}`, 0, 0, 56, cc); outlined('COMBO', 0, 36, 18, cc); ctx.restore();
    outlined(`수입 ×${comboMult().toFixed(2)}`, W - 120, 238, 16, '#dcebc9');
    rr(ctx, W - 180, 250, 120, 6, 3); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
    rr(ctx, W - 180, 250, 120 * clamp(G.comboT / 1.6, 0, 1), 6, 3); ctx.fillStyle = cc; ctx.fill();
  }
  if (G.banner) {
    const b = G.banner, age = b.max - b.life, s = age < 0.15 ? 1.6 - age / 0.15 * 0.6 : 1;
    ctx.save(); ctx.globalAlpha = Math.min(1, b.life * 2.5); ctx.translate(W / 2, H / 2 - 60); ctx.scale(s, s);
    outlined(b.text, 0, 0, 50, b.color); outlined(b.sub, 0, 42, 20, '#fff'); ctx.restore();
  }
  if (G.feverT > 0) { ctx.save(); ctx.globalAlpha = 0.1 + 0.05 * Math.sin(G.t * 12); ctx.fillStyle = `hsl(${(G.t * 200) % 360},90%,60%)`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (G.flash > 0) { ctx.globalAlpha = G.flash; ctx.fillStyle = G.flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

// 물건: 윗면(눌러서 비스듬히) + 옆면 두께로 입체감
function drawCar25(it, s) {
  const r = it.r * s, body = it.gold ? '#f2c14e' : it.col[0];
  const dark = shade(body[0] === '#' ? body : '#c9745b', -0.22), light = shade(body[0] === '#' ? body : '#c9745b', 0.25);
  ctx.save();
  ctx.translate(it.x, it.y * TILT - it.z);
  if (it.state === 'rest') ctx.rotate(Math.sin(G.t * 30 + it.seed) * 0.06 * it.wob);
  else ctx.rotate(it.rot * 0.3);
  ctx.scale(it.sq, 1 / it.sq);
  const W = r * 2.6, Hb = r * 0.55, D = r * 1.1 * TILT;       // 폭, 차체 높이, 위에서 보이는 깊이
  // 바퀴
  ctx.fillStyle = '#5b5550';
  for (const x of [-W * 0.32, W * 0.32]) { ctx.beginPath(); ctx.ellipse(x, -2, r * 0.26, r * 0.2, 0, 0, Math.PI * 2); ctx.fill(); }
  // 차체 옆면 + 윗면
  ctx.fillStyle = dark; rr(ctx, -W / 2, -Hb - 4, W, Hb, r * 0.2); ctx.fill();
  ctx.fillStyle = body; rr(ctx, -W / 2, -Hb - D, W, D, r * 0.3); ctx.fill();
  // 지붕(캐빈) + 창문
  const cw = W * 0.5, ch = D * 0.7;
  ctx.fillStyle = light; rr(ctx, -cw / 2 + W * 0.04, -Hb - D - r * 0.35, cw, ch, r * 0.25); ctx.fill();
  ctx.fillStyle = '#b9d3dc';
  rr(ctx, -cw / 2 + W * 0.08, -Hb - D - r * 0.25, cw * 0.36, ch * 0.7, r * 0.12); ctx.fill();
  rr(ctx, W * 0.04 + cw * 0.08, -Hb - D - r * 0.25, cw * 0.36, ch * 0.7, r * 0.12); ctx.fill();
  // 전조등
  ctx.fillStyle = '#f6e7b8'; ctx.beginPath(); ctx.ellipse(-W / 2 + r * 0.25, -Hb * 0.6 - 4, r * 0.14, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  if (it.flashT > 0) { ctx.globalAlpha = Math.min(1, it.flashT * 12); ctx.fillStyle = '#fff'; rr(ctx, -W / 2, -Hb - D - r * 0.35, W, Hb + D + r * 0.35, r * 0.3); ctx.fill(); }
  ctx.restore();
  if (it.state === 'rest' && it.hp < it.hpMax) {
    const w = W, x = it.x - W / 2, y = it.y * TILT - it.z - Hb - D - r * 0.5;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = '#c9745b'; ctx.fillRect(x, y, w * clamp(it.hp / it.hpMax, 0, 1), 5);
  }
}
function drawItem25(it) {
  const s = it.appear < 1 ? easeOutBack(Math.max(0, it.appear)) : 1;
  if (s <= 0.02) return;
  if (it.type.k === 'car') return drawCar25(it, s);
  const baseY = it.y * TILT - it.z;
  const depth = Math.min(it.type.big ? 40 : 24, it.r * 0.6) * s;
  const top = it.gold ? '#f2c14e' : it.col[0];
  ctx.save();
  ctx.translate(it.x, baseY);
  if (it.state === 'rest') ctx.rotate(Math.sin(G.t * 30 + it.seed) * 0.12 * it.wob);
  ctx.fillStyle = shade(top[0] === '#' ? top : '#cccccc', -0.35);
  ctx.beginPath(); ctx.ellipse(0, 0, it.r * s, it.r * TILT * s, 0, 0, Math.PI); ctx.lineTo(-it.r * s, -depth); ctx.ellipse(0, -depth, it.r * s, it.r * TILT * s, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(74,52,38,.35)'; ctx.stroke();
  ctx.translate(0, -depth);
  ctx.scale(s * it.sq, s * TILT / it.sq);
  ctx.rotate(it.rot);
  if (it.gold) { ctx.shadowColor = 'rgba(255,215,0,.95)'; ctx.shadowBlur = 12; }
  drawItemShape(ctx, it);
  if (it.flashT > 0) { ctx.shadowBlur = 0; ctx.globalAlpha = Math.min(1, it.flashT * 12); circ(ctx, 0, 0, it.r * 1.05); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1; }
  ctx.restore();
  if (it.state === 'rest' && it.hp < it.hpMax) {
    const w = it.r * 2, x = it.x - it.r, y = baseY - depth - it.r * TILT - 10;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - 1, y - 1, w + 2, 6);
    ctx.fillStyle = it.gold ? '#f2c14e' : '#ff6b6b'; ctx.fillRect(x, y, w * clamp(it.hp / it.hpMax, 0, 1), 4);
  }
}

// 고양이: 초상화 이미지를 세워서 그리는 스프라이트 (통통 걷기 · 공격 시 기울기 · 방향 반전)
// 옆모습 전신 스프라이트라 가로 폭 기준으로 크기를 정함
// 모든 고양이를 같은 키로 맞추고, 품종 특성만 살짝 (메인쿤 크게, 먼치킨 작게)
const CAT_H = 74;
const CAT_SIZE = { gym: 1.12, chonk: 1.04, loaf: 0.88 };
function catHeight(c) {
  const base = CAT_H * (CAT_SIZE[c.id] || 1) * (1 + 0.02 * Math.min(10, catLv(c.id) - 1));
  if (RIGS[c.id]) return base;
  // 통 이미지(상자 속·누운 자세)는 폭을 맞춰서 너무 크거나 납작하지 않게
  const img = IMG['cat_' + c.id];
  const aspect = img ? img.height / img.width : 0.8;
  return Math.min(base * 1.1, base * 1.35 * aspect);
}
function drawCatSprite(c) {
  const img = IMG['cat_' + c.id];
  const born = c.born < 1 ? easeOutBack(c.born) : 1;
  const h = catHeight(c) * born;
  if (h < 2) return;
  const hop = c.nap > 0 ? 0 : Math.abs(Math.sin(c.walkT)) * Math.min(1, c.speed / 60) * 12 + (c.hopT ? Math.sin((1 - c.hopT / 0.35) * Math.PI) * 26 : 0);
  let lx = 0, ly = 0;
  if (c.lunge) {
    // 0~30%: 뒤로 젖힘(예비 동작) → 30~100%: 목표 쪽으로 튀어나감
    const k = 1 - c.lunge.t / 0.26, d = k < 0.4 ? -k / 0.4 * 6 : Math.sin((k - 0.4) / 0.6 * Math.PI) * 22;
    lx = Math.cos(c.lunge.ang) * d; ly = Math.sin(c.lunge.ang) * d * TILT;
  }
  const bx = c.x + lx, by = c.y * TILT - c.z - hop + ly;
  if (csl(c.id, 'ult')) { ctx.save(); ctx.globalAlpha = 0.45 + 0.15 * Math.sin(G.t * 6); const g = ctx.createRadialGradient(bx, by - h / 2, 5, bx, by - h / 2, h); g.addColorStop(0, '#fff3bf'); g.addColorStop(1, 'rgba(255,212,59,0)'); ctx.fillStyle = g; circ(ctx, bx, by - h / 2, h); ctx.fill(); ctx.restore(); }
  if (catLv(c.id) >= 3) { ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = RARITY[c.sp.rar].col; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(bx, c.y * TILT, h * 0.45, h * 0.45 * TILT, 0, 0, 6.28); ctx.stroke(); ctx.restore(); }
  ctx.save();
  ctx.translate(bx, by);
  const tr = c.trick;
  if (tr) {
    const k = tr.t / tr.dur;
    if (tr.type === 'flip') {
      // 위로 솟구치며 한 바퀴 (몸 중심 기준 회전)
      ctx.translate(0, -Math.sin(k * Math.PI) * 90 - h / 2);
      ctx.rotate(-c.face * k * Math.PI * 2);
      ctx.translate(0, h / 2);
    } else if (tr.type === 'windmill') {
      // 바닥에 등을 대고 뱅글뱅글
      ctx.translate(0, -h * 0.45);
      ctx.rotate(k * Math.PI * 2 * 4 * c.face);
      ctx.translate(0, h * 0.5);
    } else if (tr.type === 'spin') {
      // 자기 꼬리를 쫓아 좌우로 빙글빙글
      ctx.scale(Math.cos(k * Math.PI * 2 * 3), 1);
    } else if (tr.type === 'axel') {
      // 트리플 악셀: 높이 뛰어올라 세로축으로 3바퀴 (좌우 반전으로 회전 표현) 후 착지
      const air = Math.min(1, k / 0.85);
      ctx.translate(0, -Math.sin(air * Math.PI) * 110);
      if (k < 0.85) { ctx.scale(Math.cos(air * Math.PI * 2 * 3), 1); ctx.rotate(Math.sin(air * Math.PI * 6) * 0.08); }
    }
  }
  if (c.nap > 0) { ctx.rotate(c.face * 0.25); ctx.scale(1.12, 0.78); }
  else { ctx.rotate(c.face * c.lean * 0.28); ctx.scale(1 / Math.sqrt(c.sq), c.sq); }
  ctx.scale(-c.face, 1);                 // 스프라이트는 왼쪽을 봄 → 오른쪽으로 갈 땐 뒤집기
  const rig = RIGS[c.id];
  if (rig) drawRig(rig, h / rig.h, rigPose(c));      // 파츠 리그: 관절 애니메이션 (키 기준 배율)
  else if (img) {
    // 파츠가 없는 종(상자 속·누워 있는 자세)은 통 이미지를 말랑하게 흔듦
    const w = h * img.width / img.height;
    const wig = Math.sin(G.t * 6 + c.x) * 0.04 * (c.speed > 30 ? 1 : 0.4);
    ctx.scale(1 + wig, 1 - wig);
    ctx.drawImage(img, -w / 2, -h, w, h);
  }
  else { ctx.scale(-1, 1); drawCat(ctx, { x: 0, y: -h * 0.3, z: 0, ang: 0, sq: 1, speed: c.speed, walkT: c.walkT, swipeT: 0, mood: 'normal' }, G.t, h / 70, c.sp.pal); }
  ctx.restore();
  if (c.nap > 0) outlined('💤', bx + h * 0.35, by - h * 0.9, 18, '#fff');
  if (c.flexT > 0) outlined('💪', bx - h * 0.45, by - h * 0.8, 22, '#fff');
  if (c.swipeT > 0) {
    // 큰 발톱 궤적 (세 줄, 빛나는 호)
    const k = 1 - c.swipeT / 0.22;
    if (k > 0.25) {
      const kk = (k - 0.25) / 0.75;
      ctx.save(); ctx.globalAlpha = 1 - kk; ctx.lineCap = 'round';
      ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
      const cx = bx + c.face * h * 0.45, cy = by - h * 0.45;
      for (let i = -1; i <= 1; i++) {
        ctx.strokeStyle = i ? '#fff3bf' : '#ffffff'; ctx.lineWidth = 7 - Math.abs(i) * 2;
        ctx.beginPath();
        const r0 = h * (0.42 + i * 0.1);
        const a0 = c.face > 0 ? -2.2 : -0.94, a1 = c.face > 0 ? -2.2 + 2.6 * Math.min(1, kk * 2) : -0.94 - 2.6 * Math.min(1, kk * 2);
        ctx.arc(cx - c.face * h * 0.25, cy + h * 0.1, r0, a0, a1, c.face < 0);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
function drawOrb(o) {
  const left = orbMaxHits() - o.hits;
  ctx.save(); ctx.translate(o.x, o.y * TILT - o.z - o.r);
  if (o.life < 5 && Math.sin(G.t * 20) > 0) ctx.globalAlpha = 0.4;
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, o.r * 2.3);
  g.addColorStop(0, `hsla(${o.hue},100%,85%,.9)`); g.addColorStop(1, `hsla(${o.hue},100%,60%,0)`);
  ctx.fillStyle = g; circ(ctx, 0, 0, o.r * 2.3); ctx.fill();
  circ(ctx, 0, 0, o.r); ctx.fillStyle = `hsl(${o.hue},90%,72%)`; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.arc(0, 2, o.r * 0.45, 0, 6.28); ctx.moveTo(-o.r * 0.45, 0); ctx.lineTo(-o.r * 0.35, -o.r * 0.55); ctx.lineTo(-o.r * 0.1, -o.r * 0.25);
  ctx.moveTo(o.r * 0.45, 0); ctx.lineTo(o.r * 0.35, -o.r * 0.55); ctx.lineTo(o.r * 0.1, -o.r * 0.25); ctx.fill();
  ctx.strokeStyle = 'rgba(40,40,80,.7)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < o.hits; i++) { const a = i * 2.1; ctx.beginPath(); ctx.moveTo(Math.cos(a) * o.r * 0.3, Math.sin(a) * o.r * 0.3); ctx.lineTo(Math.cos(a + 0.3) * o.r, Math.sin(a + 0.3) * o.r); ctx.stroke(); }
  if (left === 1) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(G.t * 16); ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 2; circ(ctx, 0, 0, o.r + 3); ctx.stroke(); }
  ctx.restore();
}
function drawParcel(p) {
  ctx.save(); ctx.translate(p.x, p.y * TILT - p.z); ctx.rotate(p.rot);
  ctx.fillStyle = '#b08968'; ctx.fillRect(-18, -4, 36, 18); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.strokeRect(-18, -4, 36, 18);
  rr(ctx, -18, -20, 36, 18, 3); fillStroke(ctx, '#d4a373', 2.5);
  ctx.fillStyle = '#e9c46a'; ctx.fillRect(-4, -20, 8, 34);
  ctx.restore();
}
function pawPath(c, r) {
  c.beginPath();
  c.ellipse(0, r * 0.35, r * 0.75, r * 0.6, 0, 0, 6.28);
  for (const [tx, ty] of [[-0.75, -0.3], [-0.28, -0.72], [0.28, -0.72], [0.75, -0.3]]) { c.moveTo(tx * r + r * 0.28, ty * r); c.ellipse(tx * r, ty * r, r * 0.28, r * 0.34, 0, 0, 6.28); }
}
const REGION_COL = { home: '#c8a27a', mansion: '#7a5448', park: '#9dbb8f', alley: '#a9a39a', store: '#c9c3b8', market: '#d8c29a', cafe: '#c9846e', plaza: '#e3d8c6', downtown: '#8e8a84' };
function drawMinimap() {
  const mm = minimapRect();
  const cx = mm.x + mm.w / 2, cy = mm.y + mm.h / 2;
  ctx.save();
  rr(ctx, mm.x - 6, mm.y - 24, mm.w + 12, mm.h + 30, 14); ctx.fillStyle = 'rgba(251,247,239,.9)'; ctx.fill();
  ctx.font = "13px 'Gowun Dodum', sans-serif"; ctx.fillStyle = '#7d746b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`🧭 반경 ${Math.round(radius())}`, cx, mm.y - 11);
  ctx.beginPath(); ctx.rect(mm.x, mm.y, mm.w, mm.h); ctx.clip();
  for (const t of G.tiles) {
    ctx.fillStyle = REGION_COL[t.id] || '#999';
    ctx.fillRect(cx + (t.x - CENTER.x) * mm.s, cy + (t.y - CENTER.y) * mm.s, DW * mm.s + 0.5, DH * mm.s + 0.5);
  }
  // 갈 수 없는 곳은 어둡게
  ctx.beginPath(); ctx.rect(mm.x, mm.y, mm.w, mm.h); ctx.arc(cx, cy, (radius() + 700) * mm.s, 0, 6.28, true); ctx.fillStyle = 'rgba(75,69,64,.55)'; ctx.fill();
  ctx.strokeStyle = '#dcebc9'; ctx.lineWidth = 1.5; circ(ctx, cx, cy, radius() * mm.s); ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#bfe3ea'; for (const o of G.orbs) { circ(ctx, cx + (o.x - CENTER.x) * mm.s, cy + (o.y - CENTER.y) * mm.s, 2); ctx.fill(); }
  ctx.fillStyle = '#e39a5a'; for (const c of G.cats) { circ(ctx, cx + (c.x - CENTER.x) * mm.s, cy + (c.y - CENTER.y) * mm.s, 2.2); ctx.fill(); }
  const v = viewRect(0);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
  ctx.strokeRect(cx + (v.x0 - CENTER.x) * mm.s, cy + (v.y0 - CENTER.y) * mm.s, (v.x1 - v.x0) * mm.s, (v.y1 - v.y0) * mm.s);
  ctx.restore();
}
function drawParticles() {
  for (const p of G.particles) {
    if (!onScreen(p.x, p.y, 40)) continue;
    const a = clamp((p.life / p.max) * 2, 0, 1);
    const px = p.x, py = p.y * TILT - (p.z || 0);
    if (p.type === 'trail') { const k = Math.max(0, p.life / p.max); ctx.globalAlpha = k * 0.45; ctx.fillStyle = p.color; circ(ctx, px, py, p.size * k + 0.01); ctx.fill(); continue; }
    if (p.type === 'dust') { ctx.globalAlpha = 1; ctx.fillStyle = p.color + (a * 0.6).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(px, py, p.size * (1.6 - a * 0.6), 0, 6.28); ctx.fill(); continue; }
    ctx.globalAlpha = p.settle ? 1 : a;
    ctx.save(); ctx.translate(px, py); ctx.rotate(p.rot || 0); ctx.fillStyle = p.color;
    if (p.type === 'shard') { ctx.beginPath(); ctx.moveTo(-p.size * p.pts[0], 0); ctx.lineTo(0, -p.size * p.pts[1]); ctx.lineTo(p.size * p.pts[2], p.size * 0.4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(74,52,38,.6)'; ctx.lineWidth = 1; ctx.stroke(); }
    else if (p.type === 'paper' || p.type === 'confetti') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 * Math.abs(Math.cos(p.rot * 2)));
    else if (p.type === 'star') { ctx.beginPath(); for (let i = 0; i < 10; i++) { const an = i / 10 * 6.28 - 1.57, q = i % 2 ? p.size * 0.45 : p.size; ctx.lineTo(Math.cos(an) * q, Math.sin(an) * q); } ctx.fill(); }
    else if (p.type === 'heart') { ctx.rotate(-p.rot); ctx.font = `${p.size * 2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💗', 0, 0); }
    else { ctx.beginPath(); ctx.arc(0, 0, p.size * (p.type === 'fire' ? 1 : a), 0, 6.28); ctx.fill(); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
// 화면 속 글자: 두꺼운 검은 외곽선 대신 얇고 부드러운 테두리 (평면 파스텔 화풍)
function outlined(text, x, y, size, fill) {
  ctx.font = `700 ${size}px 'IBM Plex Sans KR', 'Gowun Dodum', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2.5, size * 0.13); ctx.strokeStyle = 'rgba(60,50,45,.78)'; ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y);
}
function drawPopups(inv) {
  for (const p of G.popups) {
    if (!onScreen(p.x, p.y)) continue;
    const age = p.max - p.life, s = (age < 0.1 ? 0.5 + age / 0.1 * 0.7 : 1.2 - Math.min(0.2, age - 0.1)) * inv;
    ctx.globalAlpha = Math.min(1, (p.life / p.max) * 3);
    ctx.save(); ctx.translate(p.x, p.y * TILT - p.z); ctx.scale(s, s); outlined(p.text, 0, 0, p.size, p.color); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function bubble(x, y, text, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.font = "16px 'Gowun Dodum', sans-serif";
  const w = ctx.measureText(text).width + 22;
  rr(ctx, -w / 2, -14, w, 28, 14); ctx.fillStyle = 'rgba(251,247,239,.96)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(75,69,64,.2)'; ctx.stroke();
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 1);
  ctx.restore();
}

// ───────────────────────── 오프라인 보상 ─────────────────────────
function offlineReward() {
  const away = (Date.now() - (S.lastSeen || Date.now())) / 1000;
  if (away < 60 || !S.ips) return null;
  const secs = Math.min(away, 12 * 3600);
  const gain = S.ips * secs * (0.25 + 0.075 * lv('offline'));
  earn(gain);
  return { away, secs, gain };
}

// ───────────────────────── 시작 / 루프 ─────────────────────────
function initWorld() {
  buildCity();
  setCamCenter(CENTER.x, CENTER.y);
  syncFieldCats();
  buildGrid();
  const vr = viewRect(40);
  for (let i = 0; i < itemCap(); i++) {
    const k = pick(tileAt(CENTER.x, CENTER.y).items), q = freeSpot(ITEMS[k].r * 1.55, vr);
    if (q) { const it = makeItem(k, q.x, q.y); it.appear = 1; G.items.push(it); buildGrid(); }
  }
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (G.hitstop > 0) { G.hitstop -= dt; G.t += dt * 0.1; }
  else if (G.running) update(dt); else G.t += dt;
  G.shake = Math.max(0, G.shake - dt * 2.5);
  G.flash = Math.max(0, G.flash - dt * 2.5);
  try { render(); } catch (e) { console.error(e); }   // 한 프레임 오류로 루프가 멈추지 않게
  requestAnimationFrame(frame);
}
setInterval(() => { if (G.running) writeSave(); }, 5000);
window.addEventListener('beforeunload', () => { if (G.running) writeSave(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.running) writeSave(); });
