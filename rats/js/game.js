'use strict';
// ───────────────────────── 쥐들의 반란: 기본 설정 ─────────────────────────
// 좌표계: 평면 좌표(x, y) + 높이 z, 화면에는 3/4 탑다운(화면Y = y*TILT - z)
const W = 1280, H = 720, GZ = 1700; TILT = 0.85;   // TILT 은 idle/js/data.js 의 let
const RW = 1280, RH = 800;                  // 방 하나의 크기 (격자로 이어짐)
const WM = 16;                              // 벽 두께의 절반
const ZONE_COL = ['#e6e8e3', '#cfdcc9', '#8e8a84', '#a9a39a', '#c9c3b8', '#9a958e', '#e3d8c6'];
const RAT_SCALE = 1.25;                     // 쥐 그림 기본 배율

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let SF = 1, SF_CAP = 1.75;
function resizeCanvas() {
  const r = canvas.getBoundingClientRect();
  SF = Math.min(SF_CAP, Math.max(1, (r.width * (window.devicePixelRatio || 1)) / W));
  canvas.width = Math.round(W * SF); canvas.height = Math.round(H * SF);
}
const IMG = {};
function loadImg(k, src) { const i = new Image(); i.onload = () => (IMG[k] = i); i.onerror = () => {}; i.src = src; }
for (const z of ZONES) if (z.img) loadImg(z.img, `../assets/v2/bg/${z.img}.png`);
for (const z of ZONES) if (z.floor) loadImg('bg_' + z.floor, `../assets/rats/bg_${z.floor}.png`);   // 생성되면 사용
for (const sp of RSPECIES) if (typeof RAT_PARTS === 'undefined' || !RAT_PARTS[sp.id]) loadImg('rat_' + sp.id, `../assets/rats/${sp.id}.png`);   // 파츠가 없는 종만 전신 이미지 시도
// 특수 액션·필살기 이미지 (rats/dev/gen_art.mjs 로 생성된 것만 목록에 있음)
if (typeof RAT_ART !== 'undefined') { for (const [e, f] of Object.entries(RAT_ART.prop)) loadImg('art_' + e, `../assets/rats/${f}.png`); }

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
  const e = Math.floor(Math.log10(n) / 3), v = n / Math.pow(1000, e);
  return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)) + u[e - 1];
}
// 확률 표시: 아주 작은 확률도 0% 로 뭉개지지 않게 (0.0018 → '0.002%')
function oddsPct(p) { const v = p * 100; return (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : Number(v.toPrecision(1)).toString()) + '%'; }
function fmtTime(s) { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}시간 ${m}분` : m ? `${m}분 ${s % 60}초` : `${s}초`; }

// ───────────────────────── 저장 ─────────────────────────
const SAVE_KEY = 'rat-uprising-v1';
const S = {
  cheese: 0, lifetime: 0, skills: {}, rsk: {}, ramp: 0, rampProg: 0, open: ['0,0'], walls: {}, maxD: 0,
  herd: ['brownrat', 'mouse', 'labrat'], seen: { brownrat: true, mouse: true, labrat: true }, fresh: {},
  births: 0, smashed: 0, lastSeen: Date.now(), ips: 0, muted: false, started: false,
  floor: 1, maxFloor: 1, shard: {}, bossFail: 0, bossBeat: {},
};
let resetting = false;
function loadSave() {
  let s = null;
  try {
    s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s) {
      // 예전 저장(가로 일렬 구역) → 방 격자로 옮기기
      if (s.zones && !s.open) { s.open = []; for (let i = 0; i < Math.min(s.zones, ZONES.length); i++) s.open.push(i + ',0'); s.maxD = s.open.length - 1; s.walls = {}; }
      delete s.zones; delete s.wallHP;
      Object.assign(S, s);
    }
  } catch (e) { /* 무시 */ }
  // 연구소 탈출(층) 이전의 저장: 도시 구역 기록은 버리고 1층부터, 치즈로 찍었던 종별 스킬은 같은 레벨의 조각으로 환산
  if (s && !s.floor) { S.floor = 1; S.maxFloor = 1; S.open = ['0,0']; S.walls = {}; }
  if (s && !s.shard) for (const [id, t] of Object.entries(S.rsk)) { const sp = RSPECIES_BY_ID[id]; if (sp) S.shard[id] = shardsFor(sp.tier, Object.values(t).reduce((a, b) => a + b, 0)); }
  for (const id of Object.keys(S.seen)) if (RSPECIES_BY_ID[id]) applyShards(id);
  OPEN = new Set(S.open);
  if (!S.skills.core && Object.values(S.skills).some(v => v > 0)) S.skills.core = 1;
  // 굴착 본능 최대 20레벨로 바뀜 → 넘는 레벨은 치즈로 환불
  if (S.skills.dig > 20) { for (let l = 20; l < S.skills.dig; l++) S.cheese += Math.ceil(80 * Math.pow(1.6, l)); S.skills.dig = 20; }
  if (S.skills.moonwalk) { for (let l = 0; l < S.skills.moonwalk; l++) S.cheese += Math.ceil(1500 * Math.pow(2.4, l)); delete S.skills.moonwalk; }   // 문워크 삭제 → 환불
}
function writeSave() {
  if (resetting) return;
  S.lastSeen = Date.now(); S.herd = G.rats.filter(r => !r.temp).map(r => r.sp.id);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ }
}
const lv = id => S.skills[id] || 0;
const rsl = (id, k) => (S.rsk[id] && S.rsk[id][k]) || 0;            // 종별 스킬 레벨
function ratSkillCost(s, id, l = rsl(id, s.id)) { return Math.ceil(s.base * TIERS[RSPECIES_BY_ID[id].tier].cost * Math.pow(s.grow, l)); }
// 조각: 같은 종을 또 얻으면 +1 → 레벨 업 시 종별 트리 자동 (data.js autoTree)
const shardsFor = (tier, L) => { let n = 0; for (let l = 0; l < L; l++) n += shardNeed(tier, l); return n; };
function shardLevel(id) {
  const sp = RSPECIES_BY_ID[id], n = S.shard[id] || 0; let L = 0, used = 0;
  while (L < RAT_MAX_LV && used + shardNeed(sp.tier, L) <= n) { used += shardNeed(sp.tier, L); L++; }
  return { L, have: n - used, need: L < RAT_MAX_LV ? shardNeed(sp.tier, L) : 0 };
}
function applyShards(id) { S.rsk[id] = autoTree(shardLevel(id).L); }
function addShard(sp, x, y) {
  const before = shardLevel(sp.id).L; S.shard[sp.id] = (S.shard[sp.id] || 0) + 1;
  const now = shardLevel(sp.id).L; if (now <= before) return;
  applyShards(sp.id);
  if (onScreen(x, y)) popup(x, y, `⭐ ${sp.name} Lv${now}`, '#f2c14e', 18, 1.1, 60);
  if (sp.tier >= 2 || now % 5 === 0) UI.toast(sp, `⭐ ${sp.name} 조각 강화 Lv ${now}`, '같은 쥐를 모으면 자동으로 강해져요');
}
const abP = sp => abPower(sp, rsl(sp.id, 'special')) * (rsl(sp.id, 'ult') ? 1.5 : 1);   // 특수 능력 세기
const abIs = (r, t) => r && r.sp && r.sp.ab.type === t;

// ───────────────────────── 수치 공식 ─────────────────────────
const popCap = () => 30 + 10 * lv('nest');
// 인구수 = 진짜 쥐만 (특수 액션 소환·필살기 테스트로 잠깐 나온 temp 쥐는 제외). 최대 인구를 채우면 새 탄생 금지
const ratCount = () => { let n = 0; for (const r of G.rats) if (!r.temp) n++; return n; };
const popFull = () => ratCount() >= popCap();
const breedCool = () => 4 / (1 + 0.2 * lv('breed'));
// 번식 확률: 부딪힐 때마다 무조건 태어나면 쥐가 많을수록 충돌이 n² 로 늘어 후반에 폭발 → 인구가 늘수록 확률을 낮춤
// 처음 BREED_FREE 마리까지는 100%, 그 뒤 1/(1+(초과/BREED_HALF)^BREED_EXP). 충돌 n² × 확률 ≈ n^0.4 라 탄생 속도가 거의 일정
// (15마리 50% · 30마리 19% · 60마리 6.5% · 100마리 2.7% · 200마리 0.9% · 400마리 0.3%)
const BREED_FREE = 5, BREED_HALF = 10, BREED_EXP = 1.6, BREED_P_MIN = 0.002, BREED_FAIL_CD = 0.8;
const breedChance = (pop = ratCount(), ab = 1) => clamp(ab * (1 + 0.02 * lv('breed')) / (1 + Math.pow(Math.max(0, pop - BREED_FREE) / BREED_HALF, BREED_EXP)), BREED_P_MIN, 1);
function ratDamage(r) {
  let d = TIERS[r.tier].dmg * 10 * Math.pow(1.2, lv('teeth')) * Math.pow(1.25, rsl(r.sp.id, 'dmg')) * (rsl(r.sp.id, 'ult') ? 3 : 1);
  d *= (1 + 0.05 * lv('core')) * (1 + 0.04 * lv('gym') * r.tier);          // 반란의 시작 · 쥐 헬스장(등급이 높을수록)
  d *= 1 + (r.buff || 0) + (r.packN || 0) * 0.06 * (abIs(r, 'pack') ? abP(r.sp) : 0);
  if (r.zombieUntil > G.t) d *= 2;               // 필살기 '좀비 아포칼립스' 감염
  return r.frenzy > 0 ? d * 1.5 : d;
}
const dexBonus = () => 1 + 0.03 * Object.keys(S.seen).length;
const itemHP = (t, zi) => 12 * t.hp * Math.pow(ITEM_GROW, zi);                 // zi = 층 - 1 (+ 방 거리 × 0.1)
const itemValue = (t, zi) => 3 * t.v * Math.pow(VALUE_GROW, zi) * Math.pow(1.15, lv('cheese')) * dexBonus() * (1 + 0.05 * lv('core')) * (t.furn ? 1 + 0.2 * lv('furnd') : 1);
const zoneCap = () => 24 + 3 * lv('stock');
// 자동 생성(화면 안) + 택배 투하(쿨타임, 만렙이어도 최소 30초)
const spawnInterval = () => 1.2 / (1 + 0.15 * lv('spawn'));
const spawnBatch = () => 1 + Math.floor(lv('spawn') / 3);
const viewCap = () => Math.round(clamp(zoneCap() * (viewW() * viewH() / TILT) / (RW * RH), 12, 70));
const waveCool = () => Math.max(30, 60 - 3 * lv('truck'));
const waveSize = () => Math.min(45, 15 + 3 * lv('truck'));
// 굴착 본능: 벽 피해 +10%/레벨, 최대 20레벨(×3). 예전 1.15^레벨(무한)은 공격력 성장과 곱해져 벽이 그냥 사라졌음
const digMult = () => 1 + 0.1 * Math.min(20, lv('dig'));
const rushTime = () => 1.5 + 0.2 * lv('rush');
const RUSH_NO_BREED = 3;                  // 총공격이 끝난 뒤에도 번식 금지 (흩어질 시간)
const rushMult = () => 2 + 0.3 * lv('rush');

// ───────────────────────── 방 격자 ─────────────────────────
// (0,0) 비밀 연구실에서 시작. 열린 방을 둘러싼 벽마다 체력이 있고, 부수면 그쪽 방이 열린다.
// 연구실에서 멀어질수록(맨해튼 거리) 복도 → 하수구 → 골목 → … 구역이 되고 벽도 단단해진다.
const rk = (i, j) => i + ',' + j;
let OPEN = new Set(['0,0']);
const isOpen = (i, j) => OPEN.has(rk(i, j));
const roomOf = (x, y) => [Math.floor(x / RW), Math.floor(y / RH)];
const roomDist = (i, j) => Math.abs(i) + Math.abs(j);
// 구역 = 지금 층의 구간 (stage.js). 방 배치는 LAYOUT(층마다 생성), 그 밖은 뚫을 수 없는 벽
const zoneOf = () => floorZone(S.floor);
const zoneIdx = () => ZONES.indexOf(zoneOf());
const inLayout = (i, j) => LAYOUT.has(rk(i, j));
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const openRooms = () => [...OPEN].map(k => k.split(',').map(Number));
// 벽 키: v,i,j = x=i*RW 의 세로 벽(j행) / h,i,j = y=j*RH 의 가로 벽(i열)
const wallKey = (i, j, di, dj) => (di ? `v,${i + (di > 0 ? 1 : 0)},${j}` : `h,${i},${j + (dj > 0 ? 1 : 0)}`);
function wallMax(ti, tj) { return wallBase(S.floor) * (isStairsRoom(ti, tj) ? 3 : 1 + 0.25 * roomDist(ti, tj)); }   // 계단 방 벽은 3배
function wallHP(i, j, di, dj) { return S.walls[wallKey(i, j, di, dj)] ?? wallMax(i + di, j + dj); }
function layoutBounds() {
  let i0 = 1e9, j0 = 1e9, i1 = -1e9, j1 = -1e9;
  for (const k of LAYOUT) { const [i, j] = k.split(',').map(Number); i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i); j1 = Math.max(j1, j); }
  return { i0, j0, i1, j1 };
}
function openBounds() {
  let i0 = 1e9, j0 = 1e9, i1 = -1e9, j1 = -1e9;
  for (const [i, j] of openRooms()) { i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i); j1 = Math.max(j1, j); }
  return { i0, j0, i1, j1, x0: i0 * RW, y0: j0 * RH, x1: (i1 + 1) * RW, y1: (j1 + 1) * RH };
}
// 열린 방 안에 가두기. 막힌 쪽 벽에 닿으면 onWall(i, j, di, dj, 속도) 호출
function confine(o, rad, px, py, bounce, onWall) {
  let [ci, cj] = roomOf(px, py);
  if (!isOpen(ci, cj)) { [ci, cj] = roomOf(o.x, o.y); if (!isOpen(ci, cj)) return false; }
  const L = ci * RW, T = cj * RH;
  let hit = false;
  if (!isOpen(ci - 1, cj) && o.x < L + WM + rad) { o.x = L + WM + rad; if (o.vx < 0) { onWall && onWall(ci, cj, -1, 0, -o.vx); o.vx = -o.vx * bounce; } hit = true; }
  if (!isOpen(ci + 1, cj) && o.x > L + RW - WM - rad) { o.x = L + RW - WM - rad; if (o.vx > 0) { onWall && onWall(ci, cj, 1, 0, o.vx); o.vx = -o.vx * bounce; } hit = true; }
  if (!isOpen(ci, cj - 1) && o.y < T + WM + rad) { o.y = T + WM + rad; if (o.vy < 0) { onWall && onWall(ci, cj, 0, -1, -o.vy); o.vy = -o.vy * bounce; } hit = true; }
  if (!isOpen(ci, cj + 1) && o.y > T + RH - WM - rad) { o.y = T + RH - WM - rad; if (o.vy > 0) { onWall && onWall(ci, cj, 0, 1, o.vy); o.vy = -o.vy * bounce; } hit = true; }
  const [ni, nj] = roomOf(o.x, o.y);
  if (!isOpen(ni, nj)) { o.x = px; o.y = py; o.vx = -o.vx * bounce; o.vy = -o.vy * bounce; hit = true; }   // 대각선 모서리 새는 것 막기
  return hit;
}
function closedSides(i, j) { return DIRS.filter(([di, dj]) => !isOpen(i + di, j + dj) && inLayout(i + di, j + dj)); }   // 부술 수 있는 벽만
function weakestWall() {
  let best = null;
  for (const [i, j] of openRooms()) for (const [di, dj] of closedSides(i, j)) { const hp = wallHP(i, j, di, dj); if (!best || hp < best.hp) best = { hp, zone: zoneOf(i + di, j + dj) }; }
  return best;
}
function skillCost(s, l = lv(s.id)) { return Math.ceil(s.base * Math.pow(s.grow, l)); }

// ───────────────────────── 런타임 ─────────────────────────
const G = {
  t: 0, rats: [], items: [], parcels: [], particles: [], bullets: [], slashes: [], pickups: [], popups: [], rings: [], coins: [], paws: [], beams: [], bombs: [], truckT: 40,
  humans: [], traps: [], cat: null, boss: null, bossFight: null, bossShots: [], trans: null,
  cam: { x: 0, y: 0, z: 0.9 }, userCamT: -99, rush: null, spawnT: {}, mess: {}, wallShake: {},
  shake: 0, flash: 0, flashCol: '#fff', hitstop: 0, punch: 0, banner: null,
  combo: 0, comboT: 0, comboBump: 0, mk: 0, mkT: 0,
  earnLog: [], earnAcc: 0, earnSec: 0, running: false,
};
const BONK = ['찍!', '와장창!', '갉갉!', '챙그랑!', '와르르!'];
const COMBO_WORDS = [[10, 'NICE!', '#a9d3dc'], [25, 'GREAT!', '#c9e4dc'], [50, 'AWESOME!!', '#f0c878'], [100, 'CHAOS!!', '#e39a5a'], [200, '쥐아포칼립스!!!', '#d9786a']];
const comboMult = () => 1 + Math.min(G.combo, 200) * 0.005;

// ───────────────────────── 공간 해시 ─────────────────────────
const CELL = 90;
let itemGrid = new Map(), ratGrid = new Map();
const key = (x, y) => ((x / CELL) | 0) * 100000 + ((y / CELL) | 0);
function buildGrids() {
  itemGrid = new Map(); ratGrid = new Map();
  for (const it of G.items) if (it.state === 'rest') { const k = key(it.x, it.y); let a = itemGrid.get(k); if (!a) itemGrid.set(k, a = []); a.push(it); }
  for (const r of G.rats) { const k = key(r.x, r.y); let a = ratGrid.get(k); if (!a) ratGrid.set(k, a = []); a.push(r); }
}
function near(grid, x, y, fn, cells = 1) {
  const cx = (x / CELL) | 0, cy = (y / CELL) | 0;
  for (let i = -cells; i <= cells; i++) for (let j = -cells; j <= cells; j++) { const a = grid.get((cx + i) * 100000 + cy + j); if (a) for (const o of a) fn(o); }
}

// ───────────────────────── 쥐 ─────────────────────────
function makeRat(id, x, y) {
  const sp = RSPECIES_BY_ID[id];
  return { sp, tier: sp.tier, x, y, vx: 0, vy: 0, mode: 'pause', t: rand(0, 0.5), face: 1, walk: rand(0, 6), speed: 0,
    breedCD: rand(1, 4), noBreed: 0, biteCD: 0, wallCD: 0, bite: 0, born: 1, sq: 1, z: 0, vz: 0, sleep: 0, say: null,
    trick: null, abT: rand(0.5, 3), buff: 0, packN: 0, frenzy: 0, dashHit: null, rushT: 0 };
}
const ratR = r => 11 * TIERS[r.tier].size;
function ratSpeed(r) { return 200 * TIERS[r.tier].spd * (1 + 0.08 * lv('speed')) * (1 + 0.03 * lv('caffeine')) * (1 + (r.buff || 0)) * (r.frenzy > 0 ? 1.5 : 1); }
const dashMult = r => (1 + 0.08 * rsl(r.sp.id, 'legs')) * (abIs(r, 'dash') ? 1 + 0.15 * abP(r.sp) : 1);

// 바퀴벌레처럼: 아무 방향으로 휙 달렸다가 멈칫, 다시 다른 방향
function newDash(r) {
  let a = rand(0, Math.PI * 2);
  const pa = G.pickups.length ? pickupAim(r) : null;
  const bait = G.traps && G.traps.length && Math.random() < 0.1 ? G.traps.find(t => t.armed && Math.hypot(t.x - r.x, t.y - r.y) < 320) : null;
  if (pa !== null && Math.random() < 0.8) a = pa + rand(-0.15, 0.15);      // 같은 종이 떨어뜨린 소품 줍으러
  else if (bait) a = Math.atan2(bait.y - r.y, bait.x - r.x) + rand(-0.08, 0.08);   // 쥐덫의 치즈 미끼에 홀려서 (가끔)
  else if (Math.random() < 0.35) {       // 가끔은 근처 물건 쪽으로
    let best = null, bd = 280;
    near(itemGrid, r.x, r.y, it => { const d = Math.hypot(it.x - r.x, it.y - r.y); if (d < bd) { bd = d; best = it; } }, 3);
    if (best) a = Math.atan2(best.y - r.y, best.x - r.x) + rand(-0.3, 0.3);
  } else if (Math.random() < 0.12) {       // 가끔 열린 옆방으로 이사 (맵 전체로 퍼짐)
    const [i, j] = roomOf(r.x, r.y), opens = DIRS.filter(([di, dj]) => isOpen(i + di, j + dj));
    if (opens.length) { const [di, dj] = pick(opens); a = Math.atan2((j + dj + 0.5) * RH - r.y, (i + di + 0.5) * RW - r.x) + rand(-0.4, 0.4); }
  } else if (Math.random() < 0.15) {       // 가끔 막힌 벽 쪽으로 (벽 부수기)
    const [i, j] = roomOf(r.x, r.y), sides = closedSides(i, j);
    if (sides.length) { const [di, dj] = pick(sides); a = Math.atan2(dj, di) + rand(-0.7, 0.7); }
  }
  // 보스전: 보스에게 몰려감 / 가끔 사람에게 / 계단이 열렸으면 계단으로
  if (G.bossFight && G.boss && Math.random() < 0.45 && onScreen(G.boss.x, G.boss.y)) a = Math.atan2(G.boss.y - r.y, G.boss.x - r.x) + rand(-0.3, 0.3);
  else if (G.humans.length && Math.random() < 0.2) { let best = null, bd = 380; for (const h of G.humans) { if (h.boss || h.state === 'fly' || h.state === 'exit') continue; const d = Math.hypot(h.x - r.x, h.y - r.y); if (d < bd) { bd = d; best = h; } } if (best) a = Math.atan2(best.y - r.y, best.x - r.x) + rand(-0.25, 0.25); }
  else if (isOpen(...STAIRS) && !(G.boss && G.boss.state !== 'dead') && Math.random() < 0.12) { const t = stairsPos(); a = Math.atan2(t.y - r.y, t.x - r.x) + rand(-0.3, 0.3); }
  if (r.flee > 0) a = Math.atan2(r.y - r.fleeY, r.x - r.fleeX) + rand(-0.7, 0.7);        // 고양이한테서 도망
  // 바퀴벌레 돌진: 방향을 정하면 끝까지 직선으로 쭉, 아주 빠르게
  const sp = ratSpeed(r) * rand(2.2, 3) * dashMult(r) * (r.flee > 0 ? 1.25 : 1);
  r.vx = Math.cos(a) * sp; r.vy = Math.sin(a) * sp;
  r.mode = 'run'; r.t = rand(0.18, 0.45); r.dashHit = null;
  r.sq = 0.75;
  if (onScreen(r.x, r.y) && Math.random() < 0.5) dust(r.x, r.y, 2, 0.4);
}
// 멈칫하며 발 구르기: 가까운 물건(공중 포함)을 차냄
function stomp(r) {
  const R0 = ratR(r) + 22 + 4 * rsl(r.sp.id, 'legs'), dmg = ratDamage(r);
  let hits = 0;
  near(itemGrid, r.x, r.y, it => { if (Math.hypot(it.x - r.x, it.y - r.y) < R0 + it.r) { damageItem(it, dmg, r, false, Math.atan2(it.y - r.y, it.x - r.x)); hits++; } });
  for (const it of G.items) if (it.state === 'fly' && it.z < 60 && Math.abs(it.x - r.x) < R0 + it.r && Math.abs(it.y - r.y) < R0 + it.r) { juggle(it, Math.atan2(it.y - r.y, it.x - r.x), dmg, r, false); hits++; }
  if (hits && onScreen(r.x, r.y)) { ring(r.x, r.y, R0, 'rgba(255,255,255,.7)', 0.2, 3); dust(r.x, r.y, 2, 0.6); }
}
// 멈칫: 속도 0으로 딱 멈춤
function stopDash(r, t0 = 0.25, t1 = 0.9) { if (r.speed > 150) r.stopT = G.t; r.vx = r.vy = 0; r.mode = 'pause'; r.t = rand(t0, t1) * (1 - 0.06 * lv('caffeine')); r.sq = 1.2; }   // 카페인: 덜 멈칫

// 치즈 운석 (공용 스킬): 주기마다 화면 속 물건 하나에 하늘에서 쿵
function updateMeteor(dt) {
  const l = lv('meteor'); if (!l || G.ult || G.sj || !G.running) return;
  if ((G.meteorT = (G.meteorT ?? meteorCool(l)) - dt) > 0) return;
  G.meteorT = meteorCool(l);
  const vr = viewRect(-60), cand = G.items.filter(it => it.state === 'rest' && inRect(it.x, it.y, vr));
  if (!cand.length) return;
  const t = pick(cand);
  G.bombs.push({ x: t.x + rand(-10, 10), y: t.y + rand(-10, 10), z: 900, vx: 0, vy: 0, vz: -700, t: 0, rad: 110, dmg: avgRatDmg() * (8 + 2 * l), by: null, icon: '☄️', meteor: true });
}
// ───────────────────────── 범위 공격 ─────────────────────────
function aoe(x, y, rad, dmg, by) {
  near(itemGrid, x, y, it => { if (it.state === 'rest' && Math.hypot(it.x - x, it.y - y) < rad + it.r) damageItem(it, dmg, by, false, Math.atan2(it.y - y, it.x - x)); }, Math.ceil((rad + 40) / CELL));
  actorsAoe(x, y, rad, dmg, by);              // humans.js: 사람·보스·고양이도 충격파에 휘말림
}
// 쿵! 충격파 (고리 + 먼지 + 흔들림)
function shock(x, y, rad, dmg, by, col = '#fff', power = 1) {
  aoe(x, y, rad, dmg, by);
  if (onScreen(x, y)) {
    ring(x, y, rad, col, 0.35, 8); ring(x, y, rad * 1.5, 'rgba(243,220,192,.7)', 0.45, 4);
    dust(x, y, 4 + power * 4, 0.8 + power * 0.5);
    burst(x, y, 4 + power * 4, { colors: ['#fff', '#f3dcc0'], min: 150, max: 380, type: 'star', s0: 2, s1: 5, z: 8 });
    addShake(0.03 * power); G.hitstop = Math.max(G.hitstop, 0.015 * power); Sfx.thump(0.6 + 0.3 * power);
  }
}
// 묘기 팝업은 너무 정신없지 않게 조금씩만
function trickText(r, text, col = '#fff3bf', size = 18) {
  if (!onScreen(r.x, r.y) || G.t < (G.trickTextT || 0)) return;
  G.trickTextT = G.t + 0.35;
  popup(r.x, r.y, text, col, size, 0.9, 40 * TIERS[r.tier].size + 20);
}

// ───────────────────────── 병맛 묘기 ─────────────────────────
// 물건에 부딪히면 확률로 발동. 날아온 물건에 맞으면 나뒹굼(tumble).
const TRICKS = {
  flip: { dur: 0.62, pts: 1, text: ['백덤블링!', '공중제비!', '찍-공중회전!'] },
  axel: { dur: 1.05, pts: 2, text: ['트리플 악셀!!', '3회전 성공!', '심사위원 전원 10점!'] },
  windmill: { dur: 1.15, pts: 2, text: ['윈드밀!!', '브레이크 댄스!', '빙글빙글 파괴!'] },
  cannon: { dur: 1.3, pts: 2, text: ['쥐 대포알!', '데굴데굴!', '핀볼 모드!'] },
  tumble: { dur: 0.75, text: ['으악!', '찍?!', '아얏!', '(나뒹굼)'] },
  belly: { dur: 0.95, pts: 1, text: ['배치기!', '슬라이딩~!', '펭귄 모드!', '쭈우욱~'] },
  kick: { dur: 0.7, pts: 2, text: ['날아차기!!', '쥐권도!', '호잇짜!', '이단 옆차기!'] },
};
function doTrick(r, type, ang = rand(0, 6.28)) {
  if (r.trick || r.sleep > 0) return false;
  r.trick = { type, t: 0, dur: TRICKS[type].dur, hitT: 0, ang, hits: new Map() };
  const vis = onScreen(r.x, r.y);
  if (type === 'flip') { r.vx = -Math.cos(ang) * 170; r.vy = -Math.sin(ang) * 170; if (vis) Sfx.jump(); }
  else if (type === 'cannon') { const s = 720 * dashMult(r); r.vx = Math.cos(ang) * s; r.vy = Math.sin(ang) * s; if (vis) Sfx.dash(); }
  else if (type === 'tumble') { r.vx = Math.cos(ang) * 380; r.vy = Math.sin(ang) * 380; }
  else if (type === 'belly') { const s = 560 * dashMult(r); r.vx = Math.cos(ang) * s; r.vy = Math.sin(ang) * s; if (vis) Sfx.dash(); }
  else if (type === 'kick') { r.vx = Math.cos(ang) * 60; r.vy = Math.sin(ang) * 60; r.face = Math.cos(ang) >= 0 ? 1 : -1; if (vis) Sfx.jump(); }
  else { r.vx = r.vy = 0; if (vis) (type === 'axel' ? Sfx.jump() : Sfx.dash()); }
  if (vis) { dust(r.x, r.y, 4, 0.8); trickText(r, pick(TRICKS[type].text), type === 'tumble' ? '#fff' : '#fff3bf', type === 'tumble' ? 16 : 19); }
  return true;
}
// 물건에 부딪힌 순간 묘기 굴리기
function rollTrick(r, it, ang) {
  const sp = r.sp, P = abP(sp), k = 1 + 0.4 * rsl(sp.id, 'show'), big = it.type.big || it.r > 30;
  if (sp.ab.type === 'trick' && Math.random() < Math.min(0.6, 0.08 * P) * k) return doTrick(r, sp.ab.trick, ang);
  if (sp.ab.type === 'cannon' && Math.random() < Math.min(0.5, 0.07 * P) * k) return doTrick(r, 'cannon', ang + Math.PI + rand(-0.8, 0.8));
  const opts = [['windmill', 0.03 * lv('windmill') * (big ? 3 : 1)], ['axel', 0.03 * lv('axel')], ['cannon', 0.03 * lv('cannon')], ['kick', 0.025], ['belly', 0.02], ['flip', 0.04 + 0.04 * lv('flip')]];
  for (const [ty, ch] of opts) if (ch && Math.random() < ch * k) return doTrick(r, ty, ty === 'cannon' ? ang + Math.PI + rand(-0.8, 0.8) : ang);
  return false;
}
function trickStep(r, dt) {
  const tr = r.trick, dmg = ratDamage(r), rad = ratR(r);
  tr.t += dt; tr.hitT -= dt;
  const k = tr.t / tr.dur, drag = d => { const f = Math.max(0, 1 - d * dt); r.vx *= f; r.vy *= f; };
  switch (tr.type) {
    case 'flip': drag(3); if (tr.t >= tr.dur) shock(r.x, r.y, 50 + 10 * lv('flip'), dmg * 1.5, r, '#fff', 1.2); break;
    case 'axel':
      if (!tr.landed && k >= 0.85) {
        tr.landed = true;
        const R0 = 80 + 12 * lv('axel');
        for (let i = 0; i < 3; i++) later(i * 0.1, () => shock(r.x, r.y, R0 * (0.7 + i * 0.2), dmg * 3, r, i === 1 ? '#f0c878' : '#fff', 1.5));
        G.combo += 5; G.comboT = 1.6; G.comboBump = 1;
        if (onScreen(r.x, r.y)) { popup(r.x, r.y, '짠! 10.0 · 10.0 · 10.0', '#f0c878', 20, 1.1, 70); addShake(0.1); }
      }
      break;
    case 'windmill':
      r.walk += dt * 30;
      if (tr.hitT <= 0) { tr.hitT = 0.15; const wr = 55 + 10 * lv('windmill'); aoe(r.x, r.y, wr, dmg * (0.5 + 0.15 * lv('windmill')), r); if (onScreen(r.x, r.y)) { ring(r.x, r.y, wr, 'rgba(255,255,255,.7)', 0.25, 4); dust(r.x, r.y, 2, 1); } }
      break;
    case 'cannon': {
      r.walk += dt * 40;
      if (onScreen(r.x, r.y) && Math.random() < 0.7) particle({ x: r.x, y: r.y, z: 8, vx: 0, vy: 0, life: 0.22, max: 0.22, size: rad * 0.9, color: 'rgba(255,255,255,.7)', type: 'trail', drag: 0 });
      // 닿는 물건마다 핀볼처럼 튕기며 박살
      near(itemGrid, r.x, r.y, it => {
        if (it.state !== 'rest') return;
        const dx = r.x - it.x, dy = r.y - it.y, d = Math.hypot(dx, dy);
        if (d > rad + it.r || (tr.hits.get(it) || 0) > G.t) return;
        tr.hits.set(it, G.t + 0.25);
        const nx = dx / (d || 1), ny = dy / (d || 1), dot = r.vx * nx + r.vy * ny;
        if (dot < 0) { r.vx -= 2 * dot * nx; r.vy -= 2 * dot * ny; }
        r.x = it.x + nx * (rad + it.r + 1); r.y = it.y + ny * (rad + it.r + 1);
        damageItem(it, dmg * 2, r, false, Math.atan2(-ny, -nx));
        if (onScreen(r.x, r.y)) { ring(it.x, it.y, it.r + 16, '#fff', 0.2, 5); Sfx.clink(); }
      });
      break;
    }
    case 'tumble':
      drag(2.2);
      if (tr.hitT <= 0 && lv('tumble')) { tr.hitT = 0.15; aoe(r.x, r.y, rad + 16, dmg * (1 + lv('tumble')), r); }
      break;
    case 'belly':
      // 배를 깔고 미끄러지며 앞에 있는 물건을 전부 밀어 넘김 (같은 물건은 한 번만)
      drag(1.3);
      if (onScreen(r.x, r.y) && Math.random() < 0.5) dust(r.x, r.y, 1, 0.5);
      near(itemGrid, r.x, r.y, it => {
        if (it.state !== 'rest' || tr.hits.has(it) || Math.hypot(it.x - r.x, it.y - r.y) > rad + it.r + 4) return;
        tr.hits.set(it, 1);
        damageItem(it, dmg * 2.5, r, false, Math.atan2(r.vy, r.vx));
        if (onScreen(it.x, it.y)) { ring(it.x, it.y, it.r + 12, '#fff', 0.2, 4); Sfx.clink(); }
      });
      break;
    case 'kick':
      // 도움닫기 → 공중에서 쭉 뻗은 뒷발로 앞의 물건을 뻥! (평소의 4배)
      drag(2);
      if (!tr.landed && k >= 0.45) {
        tr.landed = true;
        const ux = Math.cos(tr.ang), uy = Math.sin(tr.ang), kx = r.x + ux * (rad + 14), ky = r.y + uy * (rad + 14);
        let n = 0;
        near(itemGrid, kx, ky, it => { if (it.state === 'rest' && Math.hypot(it.x - kx, it.y - ky) < it.r + rad + 22) { damageItem(it, dmg * 4, r, true, tr.ang); n++; } });
        for (const it of G.items) if (it.state === 'fly' && it.z < 90 && Math.hypot(it.x - kx, it.y - ky) < it.r + 40) { juggle(it, tr.ang, dmg * 4, r, true); n++; }
        if (onScreen(r.x, r.y)) { ring(kx, ky, 34, '#fff3bf', 0.25, 6); burst(kx, ky, 10, { colors: ['#fff', '#fff3bf'], type: 'star', min: 200, max: 420, s0: 3, s1: 6, z: 30 }); if (n) { popup(kx, ky, '뻥!!', '#fff3bf', 24, 0.6, 60); addShake(0.06); G.hitstop = Math.max(G.hitstop, 0.04); } Sfx.thump(0.8); }
      }
      break;
  }
  if (tr.t >= tr.dur) { r.trick = null; stopDash(r, 0.15, 0.4); r.sq = 0.7; }
}

// ───────────────────────── 특수 능력 ─────────────────────────
// 리더 버프 / 떼거리 인원 수 (매 프레임)
function updateAuras() {
  for (const r of G.rats) { r.buff = 0; r.packN = 0; }
  for (const r of G.rats) {
    const t = r.sp.ab.type;
    if (t !== 'leader' && t !== 'pack') continue;
    const R0 = t === 'leader' ? 180 : 120, b = 0.1 * abP(r.sp);
    let n = 0;
    near(ratGrid, r.x, r.y, o => { if (o === r || Math.hypot(o.x - r.x, o.y - r.y) > R0) return; n++; if (t === 'leader') o.buff = Math.max(o.buff, b); }, 2);
    if (t === 'pack') r.packN = Math.min(10, n);
  }
}
// 주기적으로 발동하는 능력
function ratAbility(r, dt) {
  if ((r.abT -= dt) > 0) return;
  const sp = r.sp, P = abP(sp), vis = onScreen(r.x, r.y);
  switch (sp.ab.type) {
    case 'aura': {
      r.abT = 0.5;
      const R0 = 50 + 12 * P; aoe(r.x, r.y, R0, ratDamage(r) * 0.3 * P, r);
      if (vis) ring(r.x, r.y, R0, sp.id === 'cosmic' ? 'rgba(205,180,219,.8)' : 'rgba(214,240,168,.85)', 0.45, 4);
      break;
    }
    case 'teleport': {
      r.abT = 2.5 / (1 + 0.25 * P);
      const seen = []; near(itemGrid, r.x, r.y, it => { if (it.state === 'rest' && it.appear >= 1 && Math.hypot(it.x - r.x, it.y - r.y) < 350) seen.push(it); }, 4);
      if (!seen.length) break;
      const it = pick(seen), a = rand(0, 6.28);
      if (vis) smoke(r.x, r.y);
      const px = r.x, py = r.y;
      r.x = it.x + Math.cos(a) * (it.r + ratR(r) + 2); r.y = it.y + Math.sin(a) * (it.r + ratR(r) + 2);
      confine(r, ratR(r), px, py, 0, null);
      if (onScreen(r.x, r.y)) smoke(r.x, r.y);
      r.face = it.x > r.x ? 1 : -1; r.bite = 1;
      damageItem(it, ratDamage(r) * 2, r, false, Math.atan2(it.y - r.y, it.x - r.x));
      break;
    }
    case 'laser': {
      r.abT = 3 / (1 + 0.25 * P);
      let best = null, bd = 420;
      near(itemGrid, r.x, r.y, it => { if (it.state !== 'rest') return; const d = Math.hypot(it.x - r.x, it.y - r.y); if (d < bd) { bd = d; best = it; } }, 5);
      if (!best) break;
      const a = Math.atan2(best.y - r.y, best.x - r.x), ux = Math.cos(a), uy = Math.sin(a), len = 520, n = 1 + Math.floor(P);
      const hit = [];
      for (let s = 0; s < len; s += CELL * 0.7) near(itemGrid, r.x + ux * s, r.y + uy * s, it => {
        if (it.state !== 'rest' || hit.includes(it)) return;
        const px = it.x - r.x, py = it.y - r.y, along = px * ux + py * uy;
        if (along > 0 && along < len && Math.abs(px * uy - py * ux) < it.r + 10) hit.push(it);
      });
      hit.sort((p, q) => Math.hypot(p.x - r.x, p.y - r.y) - Math.hypot(q.x - r.x, q.y - r.y));
      const tgt = hit.slice(0, n), last = tgt[tgt.length - 1] || best;
      for (const it of tgt) damageItem(it, ratDamage(r) * 3, r, false, a);
      r.face = ux > 0 ? 1 : -1;
      if (vis) { G.beams.push({ x1: r.x, y1: r.y, x2: last.x + ux * 40, y2: last.y + uy * 40, life: 0.22, max: 0.22, col: sp.id === 'alien' ? '#9dd5a8' : '#e8786a' }); Sfx.laser(); }
      break;
    }
    case 'fire': {
      r.abT = 2.5 / (1 + 0.2 * P);
      const range = 110 + 20 * P, a0 = r.vx || r.vy ? Math.atan2(r.vy, r.vx) : (r.face > 0 ? 0 : Math.PI);
      near(itemGrid, r.x, r.y, it => {
        if (it.state !== 'rest') return;
        const dx = it.x - r.x, dy = it.y - r.y, d = Math.hypot(dx, dy);
        let da = Math.atan2(dy, dx) - a0; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (d < range + it.r && Math.abs(da) < 0.6) damageItem(it, ratDamage(r) * 1.5 * P, r, false, Math.atan2(dy, dx));
      }, Math.ceil(range / CELL) + 1);
      r.face = Math.cos(a0) >= 0 ? 1 : -1;
      if (vis) { cheeseSpray(r, a0, range, 22, 0.55); Sfx.boom(0.4); }
      break;
    }
    default: r.abT = 5;
  }
}
// 부딪힌 순간 발동하는 능력들 + 갉기
// 전기 이빨: 깨문 물건에서 근처 물건 2개로 찌릿 (번개 모양 파티클)
function zapChain(r, from, dmg) {
  const near2 = itemsIn(from.x, from.y, 170).filter(o => o !== from && o.state === 'rest').sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y)).slice(0, 2);
  const vis = onScreen(from.x, from.y);
  for (const o of near2) {
    damageItem(o, dmg, r, false, Math.atan2(o.y - from.y, o.x - from.x));
    if (vis) for (let k = 1; k < 6; k++) { const e = k / 6; particle({ x: from.x + (o.x - from.x) * e + rand(-8, 8), y: from.y + (o.y - from.y) * e + rand(-6, 6), z: 20 + rand(-6, 6), vx: 0, vy: 0, vz: 0, life: 0.18, max: 0.18, size: rand(3, 5), color: pick(['#fff3bf', '#9bf6ff', '#fff']), type: 'spark', drag: 0 }); }
  }
  if (vis && near2.length && Math.random() < 0.3) popup(from.x, from.y, '찌릿!', '#9bf6ff', 16, 0.5, 40);
}
function ratBump(r, it, nx, ny, rushing) {
  const sp = r.sp, P = abP(sp), ang = Math.atan2(-ny, -nx), t = sp.ab.type;
  let dmg = ratDamage(r) * (rushing ? rushMult() : 1);
  if (r.speed > 300 && (t === 'dash' || t === 'pierce')) dmg *= 1 + 0.2 * P;
  const cc = 0.05 + 0.02 * lv('critc') + 0.04 * rsl(sp.id, 'crit') + (t === 'crit' ? Math.min(0.55, 0.08 * P) : 0);
  const crit = Math.random() < cc, cm = t === 'crit' ? 3 + 0.5 * P : 3;
  if (t === 'gold' && !it.gold && Math.random() < Math.min(0.4, 0.04 * P)) makeGold(it);
  damageItem(it, dmg * (crit ? cm : 1), r, crit, ang);
  if (lv('zap') && Math.random() < 0.03 * lv('zap')) zapChain(r, it, dmg * 0.6);   // 전기 이빨
  if (t === 'double' && Math.random() < Math.min(0.9, 0.2 * P)) later(0.08, () => { if (it.state === 'rest') { damageItem(it, dmg, r, false, ang); r.bite = 1; } });
  if (t === 'bomb' && Math.random() < Math.min(0.6, 0.15 * P)) throwBomb(r, it.x + rand(-20, 20), it.y + rand(-20, 20), 70 + 10 * P, dmg * 2);
  if (t === 'slam') shock(r.x - nx * 10, r.y - ny * 10, 40 + 10 * P, dmg * 0.5 * P, r, '#fff', 0.6);
  // 세게 들이받으면 작게 튀어오름 (통통)
  if (r.speed > 350) { r.vz = 150; if (onScreen(r.x, r.y)) { ring(it.x, it.y, it.r + 10, 'rgba(255,255,255,.8)', 0.18, 4); dust(r.x, r.y, 2, 0.6); } }
  if (!rollTrick(r, it, ang)) actTrigger(r, it.gold ? 'gold' : 'bump', it) || actTrigger(r, 'combo') || (it.gold && actTrigger(r, 'bump'));
}
function makeGold(it) { it.gold = true; it.value *= 10; it.hpMax *= 2; it.hp *= 2; if (onScreen(it.x, it.y)) { burst(it.x, it.y, 10, { colors: ['#f2c14e', '#fff3bf'], type: 'star', min: 100, max: 260, s0: 3, s1: 6, z: 20 }); if (!G.quiet) popup(it.x, it.y, '✨황금!', '#f2c14e', 18, 0.8, 40); } }
function throwBomb(r, x, y, rad, dmg) {
  const T = 0.5;
  G.bombs.push({ x: r.x, y: r.y, z: 20, vx: (x - r.x) / T, vy: (y - r.y) / T, vz: 380, t: 0, rad, dmg, by: r, flask: r.sp.id === 'scientist' });
}
function updateBombs(dt) {
  for (const b of G.bombs) {
    b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vz -= 1500 * dt; b.z += b.vz * dt;
    if (b.z <= 0) {
      b.dead = true;
      aoe(b.x, b.y, b.rad, b.dmg, b.by);
      if (onScreen(b.x, b.y)) {
        ring(b.x, b.y, b.rad, b.flask ? '#9dd5a8' : '#f0c878', 0.4, 10); ring(b.x, b.y, b.rad * 0.6, '#fff', 0.3, 8);
        burst(b.x, b.y, 16, { colors: b.flask ? ['#9dd5a8', '#bfe3ea', '#fff'] : ['#f0c878', '#e39a5a', '#fff'], min: 200, max: 520, type: 'star', s0: 3, s1: 7, z: 12 });
        dust(b.x, b.y, 8, 1.4); addShake(0.08); G.hitstop = Math.max(G.hitstop, 0.03); Sfx.boom(0.6);
        if (b.flask) stampAt(b.x, b.y, m => { m.fillStyle = '#9dd5a8'; m.globalAlpha = 0.3; m.beginPath(); m.ellipse(b.x, b.y, b.rad * 0.6, b.rad * 0.45, 0, 0, 6.28); m.fill(); });
      }
    }
  }
  G.bombs = G.bombs.filter(b => !b.dead);
}
// 입에서 치즈 뿜기 (드래곤 쥐): 치즈 조각 + 녹은 치즈 방울
function cheeseSpray(r, a0, range, n, spread = 0.4, o = {}) {
  const m = ratMouth(r), x = r.x + m.dx, z = r.z + m.dz;
  for (let i = 0; i < n; i++) {
    const a = a0 + rand(-spread, spread), s = rand(0.3, 1) * range * (o.k || 3), chunk = Math.random() < 0.55;
    particle({ x: x + Math.cos(a) * 4, y: r.y + 1, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(-20, 50), g: o.g || 0, life: rand(0.3, 0.5), max: 0.5,
      size: chunk ? rand(5, 9) : rand(4, 8), color: chunk ? '#f2c94c' : pick(['#f0c878', '#fff3bf', '#e3c46a']), type: chunk ? 'cheese' : 'spark', rot: rand(0, 6.28), vr: rand(-12, 12), drag: o.drag || 3 });
  }
}
function smoke(x, y) { for (let i = 0; i < 8; i++) { const a = rand(0, 6.28), v = rand(40, 140); particle({ x, y, z: 12, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 30, life: rand(0.35, 0.6), max: 1, size: rand(8, 14), color: 'rgba(90,85,95,', type: 'dust', drag: 4 }); } }

function updateRats(dt) {
  updateAuras();
  for (const r of G.rats) {
    r.rushT -= dt;
    const rushing = G.rush && r.rushT > 0;
    r.born = Math.min(1, r.born + dt * 3);
    r.sq += (1 - r.sq) * Math.min(1, dt * 10);
    r.breedCD -= dt; r.noBreed -= dt; r.biteCD -= dt; r.wallCD -= dt; r.bite = Math.max(0, r.bite - dt * 5); r.frenzy -= dt; r.flee = (r.flee || 0) - dt;
    if (r.z > 0 || r.vz > 0) { r.vz -= 1600 * dt; r.z = Math.max(0, r.z + r.vz * dt); if (r.z <= 0) r.vz = 0; }
    if (r.say) { r.say.t -= dt; if (r.say.t <= 0) r.say = null; }
    else if (r.sp.id === 'streamrat' && Math.random() < dt * 0.06 && onScreen(r.x, r.y)) r.say = { text: pick(['흐에~~', '흐에에에~', '방송 켰습니다~', '채팅창 반응 좋고~', '구독 좋아요~']), t: 1.3 };   // 흐에~ 스트리머 쥐 혼잣말
    if (r.ultOn) continue;                  // 필살기 중 (자세·위치는 ults.js 가 잡음)
    if (r.act) { actStep(r, dt); if (r.act && r.act.type !== 'dig') moveRat(r, dt, false); continue; }
    actTick(r, dt);
    if (r.trick) { trickStep(r, dt); moveRat(r, dt, false); continue; }
    if (r.stun > 0) {
      // 기절 (보스 공격·쥐덫·고양이): 죽지 않고 잠깐 전투 불능
      r.stun -= dt; r.vx *= Math.max(0, 1 - dt * 8); r.vy *= Math.max(0, 1 - dt * 8); r.noBreed = Math.max(r.noBreed, 0.3); r.rushT = 0;
      moveRat(r, dt, false); continue;
    }
    if (rushing) {
      // 총공격: 클릭 지점으로 빠르게 돌진 (이때 부딪혀도 번식 안 함)
      const dx = G.rush.x - r.x, dy = G.rush.y - r.y, d = Math.hypot(dx, dy) || 1;
      const sp = ratSpeed(r) * 2.6;
      const tx = d > 30 ? dx / d * sp : rand(-sp, sp), ty = d > 30 ? dy / d * sp : rand(-sp, sp);
      r.vx += (tx - r.vx) * Math.min(1, dt * 8); r.vy += (ty - r.vy) * Math.min(1, dt * 8);
      r.mode = 'run'; r.noBreed = Math.max(r.noBreed, RUSH_NO_BREED);   // 매 프레임 덮어써서 짧아지지 않게
    } else if (r.sleep > 0) {
      r.sleep -= dt; r.vx = r.vy = 0;
      if (abIs(r, 'snore')) {
        // 코골이 충격파
        if ((r.abT -= dt) <= 0) { r.abT = 0.7; const P = abP(r.sp); shock(r.x, r.y, 60 + 15 * P, ratDamage(r) * P, r, 'rgba(191,227,234,.9)', 0.5); if (onScreen(r.x, r.y)) popup(r.x + 10, r.y, 'ZZZ', '#bfe3ea', 18, 0.8, 34); }
      } else if (Math.random() < dt) popup(r.x + 10, r.y, 'z', '#fff', 14, 1, 30);
      continue;
    } else {
      r.t -= dt;
      if (r.mode === 'run') { if (r.t <= 0) { stopDash(r); stomp(r); } }
      else {
        r.vx = r.vy = 0;
        if (r.flee > 0) r.t = Math.min(r.t, 0.06);        // 도망 중엔 멈칫 없이 계속 달림
        if (r.t <= 0) {
          if (Math.random() < (abIs(r, 'snore') ? 0.12 : 0.01)) { if (actTrigger(r, 'sleep')) continue; r.sleep = rand(2, 4); continue; }
          newDash(r);
        }
      }
    }
    if (!rushing) ratAbility(r, dt);
    moveRat(r, dt, true, rushing);
  }
  // 쥐끼리 충돌: 평소엔 번식, 총공격 중엔 그냥 튕김
  const pop = ratCount();
  const born = [];
  for (const a of G.rats) near(ratGrid, a.x, a.y, b => {
    if (b === a || b.x < a.x || (b.x === a.x && b.y <= a.y)) return;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), rr2 = ratR(a) + ratR(b);
    if (d > rr2 || d < 0.01) return;
    const ux = dx / d, uy = dy / d;
    a.x -= ux * (rr2 - d) / 2; a.y -= uy * (rr2 - d) / 2; b.x += ux * (rr2 - d) / 2; b.y += uy * (rr2 - d) / 2;
    if (a.trick || b.trick) return;
    const rushing = G.rush && (a.rushT > 0 || b.rushT > 0);
    const canBreed = a.noBreed <= 0 && b.noBreed <= 0 && !(a.flee > 0) && !(b.flee > 0) && a.breedCD <= 0 && b.breedCD <= 0 && pop + born.length < popCap();
    // 조건이 돼도 확률로만 탄생. 실패하면 둘 다 잠깐 쉬고(같은 겹침으로 매 프레임 다시 굴리지 않게) 서로 튕겨 나감
    const lucky = canBreed && Math.random() < breedChance(pop + born.length, (breedAb(a) + breedAb(b)) / 2);
    if (canBreed && !lucky) a.breedCD = b.breedCD = BREED_FAIL_CD;
    if (lucky) {
      a.breedCD = breedCool() / breedAb(a); b.breedCD = breedCool() / breedAb(b); a.sleep = b.sleep = 0;
      born.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, bonus: (breedAb(a) - 1) + (breedAb(b) - 1), a, b });
      stopDash(a, 0.3, 0.6); stopDash(b, 0.3, 0.6);        // 부딪힌 자리에서 딱 멈추고 새끼 탄생
    } else if (!rushing) {
      // 번식 못 하면 서로 놀라서 반대로 휙 튀어나감 (직선)
      for (const [r, s] of [[a, -1], [b, 1]]) if (r.sleep <= 0) {
        const an = Math.atan2(uy * s, ux * s) + rand(-0.6, 0.6), sp = ratSpeed(r) * rand(2.2, 3);
        r.vx = Math.cos(an) * sp; r.vy = Math.sin(an) * sp; r.mode = 'run'; r.t = rand(0.12, 0.3);
      }
    }
  });
  for (const p of born) { birth(p.x, p.y, p.bonus); actTrigger(p.a, 'birth') || actTrigger(p.b, 'birth'); }
}
const breedAb = r => (abIs(r, 'breed') ? 1 + 0.5 * abP(r.sp) : 1);
// 위치 이동 + 방 가두기 + 물건 들이받기
function moveRat(r, dt, ai, rushing) {
  const px = r.x, py = r.y, tr = r.trick;
  r.x += r.vx * dt; r.y += r.vy * dt;
  const rad = ratR(r);
  const wasRun = ai && r.mode === 'run' && !rushing;
  const cannon = (tr && tr.type === 'cannon') || (r.act && r.act.type === 'ball');
  const edge = confine(r, rad, px, py, cannon ? 1 : 0.8, (i, j, di, dj, v) => {
    if (cannon) { damageWall(i, j, di, dj, ratDamage(r) * 2 * digMult() * (abIs(r, 'wall') ? 1 + 2 * abP(r.sp) : 1), r.x, r.y); if (onScreen(r.x, r.y)) { addShake(0.04); dust(r.x, r.y, 3, 0.8); } }
    else if (v > 60 && r.wallCD <= 0) hitWall(r, i, j, di, dj);
  });
  if (edge && wasRun) stopDash(r, 0.1, 0.4);
  r.speed = Math.hypot(r.vx, r.vy);
  if (r.speed > 300 && Math.random() < 0.35 && onScreen(r.x, r.y)) particle({ x: r.x, y: r.y, z: 6, vx: 0, vy: 0, life: 0.15, max: 0.15, size: 5 * TIERS[r.tier].size, color: 'rgba(255,255,255,.7)', type: 'trail', drag: 0 });
  if (Math.abs(r.vx) > 20 && !(tr && (tr.type === 'flip' || tr.type === 'tumble'))) r.face = r.vx > 0 ? 1 : -1;
  if (r.speed > 20) r.walk += dt * r.speed / 9;
  if (!ai) return;
  // 물건 갉기: 부딪히면 피해 + 튕겨나감 (핀볼처럼)
  const pierce = abIs(r, 'pierce') && r.mode === 'run';
  if (r.biteCD <= 0 || pierce) near(itemGrid, r.x, r.y, it => {
    if (it.state !== 'rest' || (!pierce && r.biteCD > 0) || r.trick) return;
    const dx = r.x - it.x, dy = r.y - it.y, d = Math.hypot(dx, dy);
    if (d > rad + it.r) return;
    const nx = dx / (d || 1), ny = dy / (d || 1);
    if (pierce) {
      // 뚫고 지나가기: 같은 돌진에서 같은 물건은 한 번만
      if (!r.dashHit) r.dashHit = new Set();
      if (r.dashHit.has(it)) return;
      r.dashHit.add(it); r.bite = 1;
      ratBump(r, it, nx, ny, rushing);
      if (onScreen(it.x, it.y)) { const a = Math.atan2(r.vy, r.vx); for (let s = -1; s <= 1; s += 2) particle({ x: it.x, y: it.y, z: 16, vx: Math.cos(a + s * 1.4) * 260, vy: Math.sin(a + s * 1.4) * 260, life: 0.2, max: 0.2, size: 4, color: '#fff', type: 'spark', drag: 3 }); }
      return;
    }
    r.x = it.x + nx * (rad + it.r + 1); r.y = it.y + ny * (rad + it.r + 1);
    const dot = r.vx * nx + r.vy * ny; if (dot < 0) { r.vx -= 2 * dot * nx; r.vy -= 2 * dot * ny; }
    r.biteCD = 0.22; r.bite = 1; r.sq = 1.25;
    const spd = r.speed;
    if (!rushing) stopDash(r, 0.15, 0.5);          // 들이받고 멈칫
    r.speed = spd;
    ratBump(r, it, nx, ny, rushing);
  });
  ratBumpHumans(r, rushing);          // humans.js: 사람·보스 들이받기
  ratBumpCat(r, rushing);             // hazards.js: 총공격으로 고양이 쫓아내기
}

// 높은 등급 확률은 난동 등급(+ 돌연변이 유전자)에 비례해서 오름.
// 기본 가중치가 윗등급일수록 약 1/10 씩 작아서 초반엔 거의 안 나오고, 등급 i 는 k^i 배로 커져 후반에 따라잡는다.
// (난동 10 → 에픽 3%·신화 0.05%, 난동 20 → 에픽 7%·신화 0.4%, 난동 40 → 신화 ≈3%)
function tierWeights(bonus = 0) {
  const k = 1 + 0.1 * S.ramp + 0.03 * lv('mutate') + 0.05 * bonus;
  return TIERS.map((t, i) => t.w * Math.pow(k, i));
}
function rollTier(bonus) {
  const w = tierWeights(bonus); let x = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; }
  return 0;
}
function randomOfTier(t) { return pick(RSPECIES.filter(s => s.tier === t)); }
function addRat(sp, x, y, isBirth) {
  const r = makeRat(sp.id, x, y);
  r.born = 0; r.vz = 0; r.breedCD = breedCool();
  G.rats.push(r);
  const isNew = !S.seen[sp.id];
  if (isNew) { S.seen[sp.id] = true; S.fresh[sp.id] = true; applyShards(sp.id); }
  else addShard(sp, x, y);
  if (onScreen(x, y)) {
    ring(x, y, 30 + 10 * sp.tier, TIERS[sp.tier].col, 0.45, 6);
    burst(x, y, 6 + sp.tier * 3, { colors: ['#e8a3a0', '#fff'], type: 'heart', min: 40, max: 140, s0: 5, s1: 8, z: 20, life: 1.3 });
    if (sp.tier >= 2 || isNew) popup(x, y, `${isNew ? 'NEW! ' : ''}${sp.name}`, TIERS[sp.tier].col, 18 + sp.tier * 2, 1.3, 40);
    Sfx.pop();
  }
  UI.onBirth(sp, isNew, isBirth);
  return r;
}
function birth(x, y, bonus = 0) {
  if (popFull()) return false;                    // 최대 인구수: 더 태어나지 않음 (승급하거나 둥지 스킬로 늘려야 함)
  S.births++;
  addRat(randomOfTier(rollTier(bonus)), x, y, true);
  if (lv('twins') && Math.random() < 0.03 * lv('twins') && !popFull()) { addRat(randomOfTier(rollTier(bonus)), x + rand(-14, 14), y + rand(-10, 10), true); if (onScreen(x, y)) popup(x, y, '쌍둥이다!!', '#e8a3a0', 18, 0.9, 60); }
  // 탄생 축제: 주변 쥐들 광란
  if (lv('frenzy')) for (const r of G.rats) if (Math.hypot(r.x - x, r.y - y) < 260) r.frenzy = Math.max(r.frenzy, 1.5 * lv('frenzy'));
}
// 승급: 같은 등급 PROMOTE_COST마리 희생 → 윗등급 랜덤 1마리
function promote(tier) {
  if (tier >= TIERS.length - 1) return false;
  const pool = G.rats.filter(r => r.tier === tier && !r.temp);
  if (pool.length < PROMOTE_COST || G.rats.length - PROMOTE_COST + 1 < 2) return false;
  const vr = viewRect(80);
  pool.sort((a, b) => (inRect(b.x, b.y, vr) - inRect(a.x, a.y, vr)));
  const used = pool.slice(0, PROMOTE_COST);
  const cx = used.reduce((s, r) => s + r.x, 0) / PROMOTE_COST, cy = used.reduce((s, r) => s + r.y, 0) / PROMOTE_COST;
  for (const r of used) {
    if (onScreen(r.x, r.y)) burst(r.x, r.y, 8, { colors: [TIERS[tier].col, '#fff'], min: 60, max: 200, type: 'star', s0: 3, s1: 5, z: 10 });
    G.rats.splice(G.rats.indexOf(r), 1);
  }
  const sp = randomOfTier(tier + 1);
  const nr = addRat(sp, cx, cy, false);
  nr.say = { text: '승급!', t: 1.5 };
  flash(TIERS[tier + 1].col, 0.15);
  if (onScreen(cx, cy)) { for (let i = 0; i < 3; i++) ring(cx, cy, 40 + i * 30, i % 2 ? '#fff' : TIERS[tier + 1].col, 0.5 + i * 0.15, 8); Sfx.clear(); }
  writeSave();
  return sp;
}

// ───────────────────────── 벽 ─────────────────────────
function hitWall(r, i, j, di, dj) {
  r.wallCD = 0.3; r.bite = 1; r.sq = 0.8;
  actTrigger(r, 'wall');
  damageWall(i, j, di, dj, ratDamage(r) * digMult() * (abIs(r, 'wall') ? 1 + 2 * abP(r.sp) : 1) * (G.rush && r.rushT > 0 ? rushMult() : 1), r.x, r.y);
}
function damageWall(i, j, di, dj, dmg, x, y) {
  if (!inLayout(i + di, j + dj)) return;                  // 연구소 바깥벽은 못 부숨
  const k = wallKey(i, j, di, dj), hp = wallHP(i, j, di, dj) - dmg;
  S.walls[k] = hp;
  G.wallShake[k] = Math.min(1, (G.wallShake[k] || 0) + 0.15);
  if (onScreen(x, y)) { burst(x + di * 10, y + dj * 10, 3, { colors: ['#b9b1a6', '#8e8a84'], min: 60, max: 180, s0: 2, s1: 4, z: 15 }); if (Math.random() < 0.3) Sfx.knock(); }
  if (hp <= 0) breakWall(i, j, di, dj);
}
function breakWall(i, j, di, dj) {
  const k = wallKey(i, j, di, dj), ti = i + di, tj = j + dj;
  delete S.walls[k];
  if (isOpen(ti, tj)) return;
  // 무너진 벽 조각
  const vert = di !== 0, ex = vert ? (di > 0 ? (i + 1) * RW : i * RW) : i * RW, ey = vert ? j * RH : (dj > 0 ? (j + 1) * RH : j * RH);
  for (let n = 0; n < 50; n++) {
    const x = vert ? ex + rand(-20, 20) : ex + rand(0, RW), y = vert ? ey + rand(0, RH) : ey + rand(-20, 20);
    particle({ x, y, z: rand(0, 80), vx: rand(-200, 200) + di * 250, vy: rand(-200, 200) + dj * 250, vz: rand(100, 400), g: 1500, life: 3, max: 3, size: rand(5, 12), color: pick(['#b9b1a6', '#8e8a84', '#d6d1c8']), type: 'shard', rot: rand(0, 6), vr: rand(-10, 10), drag: 1.5, settle: true, pts: [rand(0.6, 1), rand(0.6, 1), rand(0.6, 1)] });
  }
  OPEN.add(rk(ti, tj)); S.open = [...OPEN];
  for (const [ddi, ddj] of DIRS) if (isOpen(ti + ddi, tj + ddj)) delete S.walls[wallKey(ti, tj, ddi, ddj)];
  bigBanner('🧱 벽 붕괴! 방 확장', `${S.floor}층 · 방 ${OPEN.size}/${LAYOUT.size}`, '#f0c878');
  furnishRoom(ti, tj);                                   // stage.js: 가구 먼저 → 물건은 빈자리에
  for (let n = 0; n < Math.ceil(zoneCap() / 2); n++) spawnInRoom(ti, tj, true);
  onRoomOpen(ti, tj);                                    // stage.js: 계단 방이면 보스전/계단 안내, 아니면 사람·쥐덫
  addShake(0.5); flash('#fff', 0.3); G.hitstop = 0.12; Sfx.boom(1.3); Sfx.clear();
  writeSave();
}

// ───────────────────────── 물건 (고양이 게임과 같은 물리) ─────────────────────────
function makeItem(k, x, y, i, j, mult = 1) {
  const t = ITEMS[k], zi = (S.floor - 1) + roomDist(i, j) * 0.1;
  const it = { type: { ...t, k }, r: t.r * 1.45, x, y, z: 0, vx: 0, vy: 0, vz: 0, rot: rand(0, 6.28), vr: 0, state: 'rest',
    col: [pick(t.pal), pick(t.pal), pick(t.pal)], gold: false, zi, room: rk(i, j), hpMax: itemHP(t, zi), value: itemValue(t, zi) * mult,
    appear: 0, wob: 0, seed: rand(0, 100), sq: 1, air: 0, hitSet: null, flashT: 0, by: null, kp: 1 };
  if (Math.random() < 0.02 * lv('goldx')) { it.gold = true; it.value *= 10; it.hpMax *= 2; }
  it.hp = it.hpMax;
  return it;
}
function freeSpot(i, j, rad, c) {
  const x0 = i * RW + WM + 50 + rad, x1 = (i + 1) * RW - WM - 50 - rad, y0 = j * RH + WM + 50 + rad, y1 = (j + 1) * RH - WM - 40 - rad;
  for (let n = 0; n < 12; n++) {
    const x = c ? clamp(c.x + rand(-c.r, c.r), x0, x1) : rand(x0, x1), y = c ? clamp(c.y + rand(-c.r, c.r) * 0.7, y0, y1) : rand(y0, y1);
    let ok = true; near(itemGrid, x, y, o => { if (ok && Math.hypot(o.x - x, o.y - y) < o.r + rad + 6) ok = false; });
    if (ok) return { x, y };
  }
  return null;
}
function pickWeighted(keys) { let s = 0; for (const k of keys) s += ITEMS[k].w ?? 1; let x = Math.random() * s; for (const k of keys) { x -= ITEMS[k].w ?? 1; if (x <= 0) return k; } return keys[0]; }
// 물건 생성: 기본은 땅에서 뿅 솟아남 (appear 0 → 1). sky 높이를 주면 '로켓배송' 택배 상자가 하늘에서 떨어져서 착지할 때 물건이 나옴
function spawnInRoom(i, j, instant, c, sky) {
  const k = pickWeighted(zoneOf().items), p = freeSpot(i, j, ITEMS[k].r * 1.45, c);
  if (!p) return false;
  const it = makeItem(k, p.x, p.y, i, j);
  if (sky) { G.parcels.push({ x: p.x, y: p.y, z: sky, vz: -1100, rot: rand(-0.25, 0.25), item: it, t: 0 }); return it; }
  it.appear = instant ? 1 : 0; G.items.push(it);
  const g = key(it.x, it.y); let a = itemGrid.get(g); if (!a) itemGrid.set(g, a = []); a.push(it);
  if (!instant && onScreen(p.x, p.y)) { dust(p.x, p.y, 3, 0.6); if (Math.random() < 0.2) Sfx.pop(); }
  return it;
}
// 특정 위치 근처로 택배 투하 (택배 쥐 능력)
function spawnNear(x, y, r, h) { const [i, j] = roomOf(x, y); if (isOpen(i, j) && G.items.length + G.parcels.length < 2500) spawnInRoom(i, j, false, { x, y, r }, h); }
// 화면에 보이는 열린 방들
function visibleRooms() { return openRooms().filter(([i, j]) => onScreen((i + 0.5) * RW, (j + 0.5) * RH, RW * 0.6)); }
// 고양이 방치 게임처럼: ① 화면 안으로 조금씩 계속 배송(자동 생성) ② 쿨타임마다 택배 투하(한꺼번에)
function dropInView(vr, h) {
  for (let m = 0; m < 4; m++) {
    const x = rand(vr.x0, vr.x1), y = rand(vr.y0, vr.y1), [i, j] = roomOf(x, y);
    if (isOpen(i, j) && spawnInRoom(i, j, false, { x, y, r: 30 }, h)) return true;
  }
  return false;
}
function updateSpawns(dt) {
  const vr = viewRect(30);
  let inView = G.parcels.length;
  for (const it of G.items) if (it.state === 'rest' && inRect(it.x, it.y, vr)) inView++;
  // ① 자동 생성
  G.spawnT = (G.spawnT > 0 ? G.spawnT : 0) - dt;
  if (G.spawnT <= 0) {
    G.spawnT = spawnInterval() * rand(0.7, 1.3);
    for (let n = 0; n < spawnBatch() && inView + n < viewCap(); n++) dropInView(vr);       // 땅에서 솟아남
  }
  // ② 로켓배송: 실제로 연구소에 택배가 옴. 하늘에서 상자가 역추진 로켓을 뿜으며 쿵쿵 떨어짐 → 쿨타임(최소 30초)
  G.waveT = (G.waveT ?? 20) - (G.ult || G.trans ? 0 : dt);       // 필살기 중엔 대기
  if (G.waveT <= 0) {
    G.waveT = waveCool();
    const n = Math.min(waveSize(), Math.max(0, Math.round(viewCap() * 1.8 - inView)));
    let got = 0;
    for (let m = 0; m < n; m++) if (dropInView(vr, 900 + m * 40 + rand(0, 200))) got++;
    G.parcelSay = got ? 1 : 0;
    // 택배 쥐: 화면에 있으면 자기 주변에 추가 배달
    for (const r of G.rats) if (abIs(r, 'gift') && onScreen(r.x, r.y, -20)) {
      const k = 1 + Math.floor(abP(r.sp) / 2);
      for (let q = 0; q < k; q++) spawnNear(r.x, r.y, 160, 420 + rand(0, 200));
      trickText(r, r.sp.id === 'santa' ? '메리 쥐스마스!' : r.sp.id === 'streamrat' ? '흐에~ 후원 감사합니다~!' : '배달 왔습니다~', '#f0c878', 17);
    }
    for (const r of G.rats) if (onScreen(r.x, r.y, -20)) actTrigger(r, 'wave');
    if (got) { bigBanner('🚀 로켓배송!', `택배 왔습니다!! 📦 ×${got}`, '#f0c878'); Sfx.door(); }
  }
  // 떨어지는 택배: 빠르게 내려오다 땅 가까이서 역추진 로켓으로 브레이크 → 쿵! 상자가 터지며 물건
  for (const p of G.parcels) {
    p.t += dt;
    if (p.z > 240) p.vz = Math.max(p.vz - 900 * dt, -1300);
    else p.vz += (-240 - p.vz) * Math.min(1, dt * 7);
    p.z += p.vz * dt;
    const vis = onScreen(p.x, p.y);
    if (vis && Math.random() < 0.5) particle({ x: p.x + rand(-6, 6), y: p.y, z: p.z - 8, vx: rand(-30, 30), vy: 0, vz: p.z < 240 ? -60 : 80, life: 0.4, max: 1, size: rand(6, 11), color: 'rgba(240,230,220,', type: 'dust', drag: 2 });
    if (p.z <= 0) {
      p.dead = true; const it = p.item;
      it.appear = 0.3; it.z = 1; it.vz = 320; G.items.push(it);
      if (vis) {
        burst(p.x, p.y, 8, { colors: ['#d4a373', '#b08968', '#f1dca7'], type: 'paper', min: 120, max: 320, s0: 5, s1: 9, z: 20, life: 1.2 });
        dust(p.x, p.y, 4, 0.8); ring(p.x, p.y, 40, 'rgba(255,255,255,.8)', 0.2, 5); addShake(0.03);
        if (G.parcelSay) { G.parcelSay = 0; popup(p.x, p.y, '택배 왔습니다!!', '#fff3bf', 22, 1.2, 70); }
        else if (Math.random() < 0.12) popup(p.x, p.y, pick(['쿵!', '📦 도착!', '문 앞 배송 완료']), '#fff', 16, 0.7, 50);
        if (Math.random() < 0.3) Sfx.pop();
      }
    }
  }
  G.parcels = G.parcels.filter(p => !p.dead);
}
// 체력이 0이 되면 → 날아감 → 떨어질 때 박살
// 힘 = 피해 ÷ 물건 체급 → 날아가는 세기 (항상 날아가지만, 강할수록 멀리·높이)
const knockK = (dmg, it) => clamp(Math.sqrt(dmg / it.hpMax), 0.75, 2.2);
function damageItem(it, dmg, by, crit, fromAng) {
  if (it.appear < 0.5) return;
  if (it.type.furn && by && by.sp) dmg *= 1 + 0.25 * lv('furnd');              // 이삿짐 센터
  const ang = (fromAng ?? rand(0, 6.28)) + rand(-0.35, 0.35);
  if (it.state === 'fly') { if (by && by.sp) juggle(it, ang, dmg, by, crit); return; }
  if (it.state !== 'rest') return;
  if (by && by.sp) it.by = by;
  const vis = onScreen(it.x, it.y);
  if (by && vis && G.paws.length < 50) G.paws.push({ x: it.x, y: it.y, life: 0.18, max: 0.18, ang: rand(-0.5, 0.5), crit });
  if (crit && vis && G.t > (G.critT || 0)) { G.critT = G.t + 0.3; popup(it.x, it.y, 'CRITICAL!', '#f2c14e', 20, 0.7, 40); burst(it.x, it.y, 8, { colors: ['#f2c14e', '#fff'], min: 150, max: 380, type: 'star', s0: 3, s1: 6, z: 20 }); G.hitstop = Math.max(G.hitstop, 0.03); }
  it.kp = abIs(it.by, 'knock') ? 1 + 0.3 * abP(it.by.sp) : 1;      // 박치기 능력: 더 멀리, 더 세게
  it.hp -= dmg; it.wob = 1; it.sq = 1.25; it.flashT = 0.08; it.hpT = G.t;       // hpT: HP 바 표시 시각
  if (it.hp > 0) {
    // 체력이 남으면: 맞은 방향으로 조금씩 밀림 (무거운 건 덜 밀림)
    const push = clamp(90 + 300 * dmg / it.hpMax, 90, 260) * it.kp / (it.type.big ? 1.8 : it.type.sturdy ? 1.3 : 1) / (it.type.heavy || 1);   // 가구는 무게만큼 덜 밀림
    it.pvx = (it.pvx || 0) + Math.cos(ang) * push; it.pvy = (it.pvy || 0) + Math.sin(ang) * push;
    if (vis && Math.random() < 0.15) Sfx.knock();
    return;
  }
  // 체력을 다 깎으면 날아감
  it.pvx = it.pvy = 0; it.style = (it.style || 0) + trickPts(by);   // 묘기 중에 쳐서 날리면 묘기 점수
  launch(it, ang, rand(320, 500) * (crit ? 1.3 : 1) * it.kp, crit);
}
// 공중에 뜬 물건을 또 치면: AIR 저글링 (더 높이, 보너스 치즈)
const AIR_MAX = 8;
function juggle(it, ang, dmg, by, crit) {
  if ((it.cd || 0) > G.t || it.z > 90 || it.air >= AIR_MAX) return;     // 쥐가 많아도 끝없이 저글링되지 않게 AIR 상한
  it.cd = G.t + 0.18;
  it.air++; it.by = by; it.style = (it.style || 0) + trickPts(by);
  const bonus = it.value * 0.15 * it.air * (1 + 0.5 * lv('tumble'));
  earn(bonus);
  const hv = it.type.heavy ? 1 / Math.sqrt(it.type.heavy) : 1;           // 가구는 헤딩으로 잘 안 뜸
  const sp = rand(300, 440) * knockK(dmg, it) * (crit ? 1.3 : 1) * hv;
  it.vx = Math.cos(ang) * sp * 1.3; it.vy = Math.sin(ang) * sp * 1.3;
  it.vz = Math.max(it.vz, 0) * 0.3 + rand(380, 520) * hv; it.vr = rand(-20, 20); it.sq = 1.45; it.hitSet = new Set();
  if (crit) it.crit = true;
  if (onScreen(it.x, it.y)) {
    burst(it.x, it.y, 6, { colors: ['#9bf6ff', '#fff'], min: 150, max: 360, z: it.z, type: 'star', s0: 2, s1: 4 });
    if (G.t > (G.airT || 0)) { G.airT = G.t + 0.25; popup(it.x, it.y, `AIR x${it.air} +${fmt(bonus)}`, '#9bf6ff', 16 + Math.min(10, it.air * 2), 0.7, it.z + 30); }
    Sfx.clink();
  }
}
function launch(it, ang, speed, crit) {
  it.state = 'fly';
  const hv = it.type.heavy ? 1 / Math.sqrt(it.type.heavy) : 1;           // 가구: 무거워서 낮고 짧게
  it.vx = Math.cos(ang) * speed * 1.4 * hv; it.vy = Math.sin(ang) * speed * 1.4 * hv;
  it.vz = rand(440, 620) * (it.type.big ? 0.75 : 1) * hv; it.vr = rand(12, 22) * (Math.random() < 0.5 ? -1 : 1);
  it.sq = 1.6; it.crit = crit; it.flashT = 0.1; it.hitSet = new Set();
  if (onScreen(it.x, it.y)) {
    G.hitstop = Math.max(G.hitstop, it.type.big ? 0.07 : 0.02);
    burst(it.x, it.y, 8, { colors: ['#fff', '#fff3bf', '#f3dcc0'], min: 180, max: 440, type: 'star', s0: 3, s1: 6, z: 20 });
    if (Math.random() < 0.2) popup(it.x, it.y, pick(BONK), '#fff', 22, 0.5, 60);
    addShake(it.type.big ? 0.18 : 0.03); Sfx.knock();
  }
}
// 날아간 물건(·사람)의 타격력 = (무게 + 받은 힘) × 묘기 점수 × 크리
//   무게    = 최대 체력 × FLY_W                        (무거운 게 더 아픔)
//   받은 힘  = 마지막으로 친 쥐 공격력 × FLY_MULT × 속도  (없으면 무리 평균)
//   묘기 점수 = 1 + FLY_STYLE × (AIR 저글링 수 + 쥐가 묘기 중에 쳐서 얻은 점수 TRICKS.pts)
// (예전엔 물건 체력만 봐서 쥐가 약해도 부딪힌 물건이 무조건 부서졌음)
const FLY_W = 0.35, FLY_MULT = 3, FLY_STYLE = 0.35;
const avgRatDmg = () => (G.power && G.rats.length ? G.power / G.rats.length : 10);
const trickPts = r => (r && r.trick && TRICKS[r.trick.type].pts) || 0;
const flyStyle = o => 1 + FLY_STYLE * (Math.min(o.air || 0, AIR_MAX) + (o.style || 0));
function flyDmg(o) {
  const weight = (o.hpMax || 0) * FLY_W;
  const force = (o.by && o.by.sp ? ratDamage(o.by) : avgRatDmg()) * FLY_MULT * clamp(Math.hypot(o.vx, o.vy) / 600, 0.6, 1.4) * (o.kp || 1);
  return (weight + force) * flyStyle(o) * (o.crit ? 2 : 1);
}
// ── 특수 스킬(필살기·슈퍼 점프) 타격: 무조건 박살이 아니라 데미지 공식 ──
// 체력이 0 이 되면 예전처럼 날아가 박살, 남으면 날아갔다가 멀쩡히 착지(it.survive → landItem) + HP 바
function skillHitItem(it, dmg, by) {
  it.hp -= dmg; it.hpT = G.t; it.flashT = 0.08; if (by && by.sp) it.by = by;
  it.survive = it.hp > 0;
  return !it.survive;
}
// 맞히고: 죽었으면 그 자리에서 박살(연출 타이밍 유지), 살았으면 휙 던져짐
function skillBlastItem(it, dmg, by, ang = rand(0, 6.28), spd = 220, vz = 320) {
  if (it.state === 'dead') return false;
  if (skillHitItem(it, dmg, by)) { it.state = 'fly'; smashItem(it); return true; }
  it.state = 'fly'; it.hitSet = new Set(); it.vr = rand(8, 16) * (Math.random() < 0.5 ? -1 : 1);
  const hv = it.type.heavy ? 1 / Math.sqrt(it.type.heavy) : 1;
  it.vx = Math.cos(ang) * spd * hv; it.vy = Math.sin(ang) * spd * hv; it.vz = vz * hv;
  return false;
}
function landItem(it) {
  it.state = 'rest'; it.z = 0; it.vz = 0; it.pvx = it.vx * 0.25; it.pvy = it.vy * 0.25; it.vx = it.vy = 0; it.vr = 0;
  it.air = 0; it.crit = false; it.survive = false; it.hitSet = null; it.sq = 1.35; it.wob = 1; it.hpT = G.t;
  if (onScreen(it.x, it.y)) { dust(it.x, it.y, 3, 0.8); Sfx.knock(); }
}
function updateItems(dt) {
  const flying = [];
  for (const it of G.items) {
    it.sq += (1 - it.sq) * Math.min(1, dt * 10);
    it.flashT = Math.max(0, it.flashT - dt);
    if (it.state === 'rest') {
      it.wob = approach(it.wob, 0, dt * 3); if (it.appear < 1) it.appear = Math.min(1, it.appear + dt * 4);
      if (it.z > 0 || it.vz > 0) { it.vz -= GZ * dt; it.z += it.vz * dt; if (it.z <= 0) { it.z = 0; it.vz = it.vz < -350 ? -it.vz * 0.3 : 0; it.sq = 1.3; if (onScreen(it.x, it.y)) dust(it.x, it.y, 2, 0.6); } }
      if (it.pvx || it.pvy) {
        const px = it.x, py = it.y, o = { x: it.x + it.pvx * dt, y: it.y + it.pvy * dt, vx: it.pvx, vy: it.pvy };
        confine(o, it.r * 0.8, px, py, 0.4, null);
        it.x = o.x; it.y = o.y;
        const f = Math.max(0, 1 - 6 * dt); it.pvx = o.vx * f; it.pvy = o.vy * f;
        if (Math.abs(it.pvx) + Math.abs(it.pvy) < 4) it.pvx = it.pvy = 0;
        else if (Math.random() < 0.15 && onScreen(it.x, it.y)) dust(it.x, it.y, 1, 0.4);
      }
      continue;
    }
    if (it.state !== 'fly') continue;
    flying.push(it);
    const px = it.x, py = it.y;
    it.vz -= GZ * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt; it.rot += it.vr * dt;
    // 날아간 물건이 막힌 벽을 때리면 벽도 깎임
    confine(it, it.r * 0.7, px, py, 0.6, (i, j, di, dj, v) => { if (it.z < 140 && v > 100) damageWall(i, j, di, dj, flyDmg(it) * 0.3 * digMult(), it.x, it.y); });   // 날아간 물건이 벽에 쾅: 쥐 한 번 갉는 정도
    if (onScreen(it.x, it.y) && Math.random() < 0.4) particle({ x: it.x, y: it.y, z: it.z, vx: 0, vy: 0, life: 0.2, max: 0.2, size: it.r * 0.5, color: it.crit ? '#e6a85a' : 'rgba(255,255,255,.8)', type: 'trail', drag: 0 });
    const sp = Math.hypot(it.vx, it.vy);
    if (sp > 150 && it.z < 60) near(itemGrid, it.x, it.y, o => {
      if (o.state !== 'rest' || it.hitSet.has(o) || Math.hypot(o.x - it.x, o.y - it.y) > o.r + it.r) return;
      it.hitSet.add(o);
      const bonus = o.value * 0.3 * (1 + lv('hitstun')); earn(bonus);
      if (it.by) o.by = it.by;                  // 맞아서 날아가면 그 물건도 같은 쥐의 힘으로 (연쇄)
      damageItem(o, flyDmg(it), null, false, Math.atan2(it.vy, it.vx));
      it.vx *= 0.8; it.vy *= 0.8;
      if (onScreen(o.x, o.y)) { if (Math.random() < 0.35) popup(o.x, o.y, `쾅!${flyStyle(it) >= 1.7 ? ` 묘기×${flyStyle(it).toFixed(1)}` : ''} +${fmt(bonus)}`, '#e6a85a', 18, 0.7, 40); burst((o.x + it.x) / 2, (o.y + it.y) / 2, 6, { colors: ['#fff', '#ffe29a'], min: 120, max: 320, z: 15 }); Sfx.clink(); addShake(0.02); }
    });
    if (it.z < 50 && (it.cd || 0) <= G.t) near(ratGrid, it.x, it.y, r => {
      if (r.sleep > 0 || it.hitSet.has(r) || Math.hypot(r.x - it.x, r.y - it.y) > it.r + ratR(r)) return;
      it.hitSet.add(r);
      // 헤딩! 쥐는 통 튀어오르고 물건은 다시 공중으로
      r.vz = Math.max(r.vz, 170); r.bite = 1; r.sq = 1.3;
      juggle(it, Math.atan2(it.y - r.y, it.x - r.x) + rand(-0.6, 0.6), ratDamage(r), r, false);
    });
    itemHitsHumans(it); itemHitsCat(it);
    if (it.z <= 0 && it.vz < 0) { if (it.survive && it.hp > 0) landItem(it); else smashItem(it); }   // 스킬에 맞고 버틴 물건은 착지
  }
  for (let i = 0; i < flying.length; i++) {
    const a = flying[i]; if (a.state !== 'fly') continue;
    for (let j = i + 1; j < flying.length; j++) {
      const b = flying[j];
      if (b.state !== 'fly' || a.hitSet.has(b) || Math.abs(a.z - b.z) > 35 || Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r) continue;
      a.hitSet.add(b); b.hitSet.add(a);
      const tvx = a.vx, tvy = a.vy; a.vx = b.vx * 0.9; a.vy = b.vy * 0.9; b.vx = tvx * 0.9; b.vy = tvy * 0.9; a.vz += 160; b.vz += 160; a.air++; b.air++;
      const bonus = (a.value + b.value) * 0.5 * (1 + lv('hitstun')); earn(bonus);
      if (onScreen(a.x, a.y)) { popup((a.x + b.x) / 2, (a.y + b.y) / 2, `공중 충돌! +${fmt(bonus)}`, '#e8a3a0', 20, 0.8, a.z + 30); burst((a.x + b.x) / 2, (a.y + b.y) / 2, 10, { colors: ['#e8a3a0', '#fff'], type: 'star', min: 200, max: 480, s0: 3, s1: 6, z: a.z }); Sfx.clink(); }
    }
  }
  G.items = G.items.filter(it => it.state !== 'dead');
}
function smashItem(it) {
  it.state = 'dead';
  if (it.type.furn) furnSmash(it);
  S.smashed++;
  actOnSmash(it);
  G.combo++; G.comboT = 1.6; G.comboBump = 1;
  const w = !G.quiet && !G.ult && COMBO_WORDS.find(w => w[0] === G.combo);   // 필살기 중엔 콤보 배너로 가리지 않음
  if (w) { bigBanner(w[1], `${G.combo} COMBO · 수입 ×${comboMult().toFixed(2)}`, w[2]); Sfx.comboWord(); }
  const gain = it.value * (1 + 0.5 * Math.min(it.air, AIR_MAX)) * (it.crit ? 2 : 1) * comboMult() * (abIs(it.by, 'loot') ? 1 + 0.4 * abP(it.by.sp) : 1);
  earn(gain);
  addRamp(1 + Math.floor(it.zi / 3));
  const vis = onScreen(it.x, it.y, 300);
  if (vis) {
    const big = clamp(it.r / 16, 0.6, 2.5);
    const colors = it.col.concat([shade(it.col[0], -0.3)]);
    stampAt(it.x, it.y, m => {
      const sp = it.type.spill;
      if (sp === 'dirt') { m.fillStyle = '#6b4423'; m.globalAlpha = 0.7; for (let i = 0; i < 6; i++) { m.beginPath(); m.arc(it.x + rand(-it.r, it.r), it.y + rand(-it.r, it.r), rand(4, it.r * 0.6), 0, 6.28); m.fill(); } }
      else if (sp) { m.fillStyle = sp; m.globalAlpha = 0.3; for (let i = 0; i < 5; i++) { m.beginPath(); m.ellipse(it.x + rand(-it.r, it.r), it.y + rand(-it.r, it.r), rand(it.r * 0.5, it.r), rand(it.r * 0.4, it.r * 0.8), rand(0, 3), 0, 6.28); m.fill(); } }
    });
    for (let i = 0; i < 5 + big * 5; i++) {
      const a = rand(0, 6.28), s = rand(120, 380) * (0.7 + big * 0.3);
      particle({ x: it.x, y: it.y, z: 6 + Math.max(0, it.z), vx: Math.cos(a) * s + it.vx * 0.2, vy: Math.sin(a) * s + it.vy * 0.2, vz: rand(180, 400), g: 1500, life: 3, max: 3, size: rand(3, 7) * Math.min(big, 1.6), color: pick(colors), type: it.type.paper ? 'paper' : 'shard', rot: rand(0, 6), vr: rand(-18, 18), drag: 1.4, settle: true, pts: [rand(0.6, 1), rand(0.6, 1), rand(0.6, 1)] });
    }
    dust(it.x, it.y, 4 + big * 2, big);
    ring(it.x, it.y, 24 + big * 20, 'rgba(255,255,255,.95)', 0.26, 6);
    burst(it.x, it.y, 7 + big * 3, { colors, min: 160, max: 440, type: 'star', s0: 3, s1: 6, z: 12 });
    if (!G.quiet || Math.random() < 0.3) popup(it.x, it.y, '🧀+' + fmt(gain), '#f0c878', clamp(18 + Math.log10(gain + 1) * 1.6, 18, 36), 1, 40 + Math.max(0, it.z));
    if (G.coins.length < 70) G.coins.push({ x: it.x, y: it.y, t: 0, dur: rand(0.55, 0.85) });
    addShake(0.02 + big * 0.02);
    if (G.quiet) { /* 슈퍼 점프: 소리·역경직은 한 번에 */ }
    else if (it.type.big) { addShake(0.3); Sfx.boom(1); flash('#fff', 0.12); G.hitstop = Math.max(G.hitstop, 0.07); }
    else if (Math.random() < 0.5) Sfx.smash(0.3 + big * 0.2, !it.type.sturdy);
  }
  // 작은 연쇄 폭발: 주변 물건을 흔들고 피해 → 도미노
  const ch = abIs(it.by, 'chain') ? Math.min(4, abP(it.by.sp)) : 0;
  const r = it.r + 30 + 20 * lv('chainx') + 25 * ch, cd = 0.25 + 0.08 * lv('chainx') + 0.1 * ch;
  if (vis) { ring(it.x, it.y, r, ch ? 'rgba(232,163,160,.8)' : 'rgba(255,255,255,.55)', 0.3, ch ? 8 : 4); if (ch) { addShake(0.05); burst(it.x, it.y, 10, { colors: ['#e8a3a0', '#fff'], type: 'star', min: 200, max: 420, s0: 3, s1: 6, z: 12 }); } }
  later(0.05, () => near(itemGrid, it.x, it.y, o => { if (o.state === 'rest' && Math.hypot(o.x - it.x, o.y - it.y) < r + o.r) { o.wob = 1; damageItem(o, o.hpMax * cd, it.by, false, Math.atan2(o.y - it.y, o.x - it.x)); } }, Math.ceil(r / CELL) + 1));
  // 멀티킬
  G.mk = (G.mkT > 0 ? G.mk : 0) + 1; G.mkT = 0.45;
  const words = { 3: '트리플!', 5: '멀티킬!!', 8: '울트라킬!!!', 12: '대참사!!!!' };
  if (words[G.mk] && vis && !G.quiet) { popup(it.x, it.y, words[G.mk], G.mk >= 8 ? '#d9786a' : '#f0c878', 24 + G.mk, 1, 90); G.punch = Math.min(0.07, 0.02 + G.mk * 0.005); addShake(0.08); }
}
function earn(v) { S.cheese += v; S.lifetime += v; G.earnAcc += v; }
function addRamp(n) {
  S.rampProg += n;
  while (S.rampProg >= rampNeed(S.ramp)) {
    S.rampProg -= rampNeed(S.ramp); S.ramp++;
    if (!G.ult && !G.sj) bigBanner(`🔥 난동 등급 ${S.ramp}!`, '높은 등급 쥐가 태어날 확률이 올랐다', '#f0c878');   // 필살기·슈퍼 점프 연출은 가리지 않음
    Sfx.clear();
  }
}
function stampAt(x, y, fn) {
  const [i, j] = roomOf(x, y), key = rk(i, j);
  if (!G.mess[key]) { const cv = document.createElement('canvas'); cv.width = RW * 0.6; cv.height = RH * 0.6; const m = cv.getContext('2d'); m.scale(0.6, 0.6); G.mess[key] = m; }
  const m = G.mess[key]; m.save(); m.translate(-i * RW, -j * RH); fn(m); m.restore();
}

// ───────────────────────── 카메라 / 입력 ─────────────────────────
const viewW = () => W / G.cam.z, viewH = () => H / G.cam.z;
function viewRect(pad = 0) { return { x0: G.cam.x + pad, x1: G.cam.x + viewW() - pad, y0: (G.cam.y + 70 / G.cam.z) / TILT + pad, y1: (G.cam.y + viewH()) / TILT - pad }; }
const inRect = (x, y, r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1;
function onScreen(x, y, m = 120) { const py = y * TILT; return x > G.cam.x - m && x < G.cam.x + viewW() + m && py > G.cam.y - m && py < G.cam.y + viewH() + m; }
function screenToWorld(sx, sy) { return { x: G.cam.x + sx / G.cam.z, y: (G.cam.y + sy / G.cam.z) / TILT }; }
function clampCam() {
  const b = openBounds(), pad = 260;
  const fit = (v, lo, hi, span) => (hi - lo < span ? (lo + hi - span) / 2 : clamp(v, lo, hi - span));
  G.cam.x = fit(G.cam.x, b.x0 - pad, b.x1 + pad, viewW());
  G.cam.y = fit(G.cam.y, b.y0 * TILT - pad - 80, b.y1 * TILT + pad, viewH());
}
// 카메라는 자유롭게 (쥐들은 맵 전체로 퍼짐). 화면에 쥐가 한 마리도 없을 때만 가장 붐비는 방으로 천천히 이동
function updateCamera(dt) {
  if (G.t - G.userCamT > 8 && G.rats.length && !G.rats.some(r => onScreen(r.x, r.y, -40))) {
    const cnt = {}; let best = null;
    for (const r of G.rats) { const k = rk(...roomOf(r.x, r.y)); cnt[k] = (cnt[k] || 0) + 1; if (!best || cnt[k] > cnt[best]) best = k; }
    const [i, j] = best.split(',').map(Number), tx = (i + 0.5) * RW - viewW() / 2, ty = (j + 0.5) * RH * TILT - viewH() / 2;
    const k = Math.min(1, dt * 1.2); G.cam.x += (tx - G.cam.x) * k; G.cam.y += (ty - G.cam.y) * k;
  }
  clampCam();
}
const pointer = { down: false, sx: 0, sy: 0, lx: 0, ly: 0, drag: false };
function canvasPoint(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
canvas.addEventListener('pointerdown', e => { Sfx.resume(); const p = canvasPoint(e); Object.assign(pointer, { down: true, sx: p.x, sy: p.y, lx: p.x, ly: p.y, drag: false, cx: e.clientX, cy: e.clientY }); });
window.addEventListener('pointermove', e => {
  if (!pointer.down) return;
  const p = canvasPoint(e);
  if (!pointer.drag && Math.hypot(e.clientX - pointer.cx, e.clientY - pointer.cy) > 16) pointer.drag = true;
  if (pointer.drag) { G.cam.x -= (p.x - pointer.lx) / G.cam.z; G.cam.y -= (p.y - pointer.ly) / G.cam.z; G.userCamT = G.t; clampCam(); }
  pointer.lx = p.x; pointer.ly = p.y;
});
window.addEventListener('pointerup', e => {
  if (!pointer.down) return; pointer.down = false;
  if (!pointer.drag && G.running) { const p = canvasPoint(e); onTap(p.x, p.y); }
});
canvas.addEventListener('wheel', e => { e.preventDefault(); G.cam.z = clamp(G.cam.z * (e.deltaY < 0 ? 1.08 : 1 / 1.08), 0.45, 1.3); G.userCamT = G.t; clampCam(); }, { passive: false });
function onTap(sx, sy) {
  if (G.sj || (G.ult && G.ult.phase === 'cut')) return;
  const w = screenToWorld(sx, sy);
  G.rush = { x: w.x, y: w.y, t: rushTime(), max: rushTime() };
  // 지금 화면에 보이는 쥐들만 클릭 지점으로 모임 (돌진 중엔 번식 금지)
  // 돌진이 끝나도 몰려 있던 쥐들이 흩어지며 부딪히므로 3초 더 번식 금지 (유저 조작으로 생긴 충돌에선 절대 탄생 없음)
  for (const r of G.rats) if (onScreen(r.x, r.y, 20)) { r.sleep = 0; r.rushT = rushTime(); r.noBreed = rushTime() + RUSH_NO_BREED; }
  ring(w.x, w.y, 60, '#fff', 0.4, 5);
  Sfx.click(); Sfx.dash();
}

// ───────────────────────── 이펙트 ─────────────────────────
function addShake(v) { G.shake = Math.min(0.5, G.shake + v); }
function popup(x, y, text, color = '#fff', size = 22, life = 0.9, z = 30) { if (G.popups.length > 36) G.popups.shift(); G.popups.push({ x, y, z, text, color, size, life, max: life, vz: 80 }); }
function particle(p) { if (G.particles.length < 900) { if (p.z === undefined) p.z = 0; G.particles.push(p); } }
function burst(x, y, n, o = {}) {
  for (let i = 0; i < n; i++) { const a = rand(0, 6.28), sp = rand(o.min || 80, o.max || 300); particle({ x, y, z: o.z || 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(-40, 160), life: rand(0.35, 0.8) * (o.life || 1), max: 1, size: rand(o.s0 || 2, o.s1 || 5), color: o.colors ? pick(o.colors) : o.color || '#fff', type: o.type || 'spark', rot: rand(0, 6), vr: rand(-10, 10), drag: o.drag ?? 2.5 }); }
}
function dust(x, y, n = 6, s = 1) { for (let i = 0; i < n; i++) { const a = rand(0, 6.28), v = rand(40, 150) * s; particle({ x, y, z: 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 20, life: rand(0.35, 0.7), max: 1, size: rand(7, 13) * Math.sqrt(s), color: 'rgba(240,225,205,', type: 'dust', drag: 4 }); } }
function ring(x, y, r, color, life = 0.35, width = 6) { if (G.rings.length < 120) G.rings.push({ x, y, r, color, life, max: life, width }); }
function flash(col, a) { G.flashCol = col; G.flash = Math.max(G.flash, a); }
const timers = [];
function later(t, fn) { timers.push({ t, fn }); }
function bigBanner(text, sub, color) { G.banner = { text, sub, color, life: 2.4, max: 2.4 }; }
function updateFx(dt) {
  for (const p of G.particles) {
    p.life -= dt; const d = Math.max(0, 1 - p.drag * dt);
    p.vx *= d; p.vy *= d; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.g) { p.vz -= p.g * dt; p.z += p.vz * dt; } else if (p.vz) { p.z = Math.max(0, p.z + p.vz * dt); p.vz *= d; }
    if (p.rot !== undefined) p.rot += (p.vr || 0) * dt;
    if (p.settle && p.z <= 0 && p.vz < 0) {
      if (p.vz < -250) { p.vz *= -0.3; p.z = 0; p.vx *= 0.6; p.vy *= 0.6; }
      else { stampAt(p.x, p.y, m => { m.translate(p.x, p.y); m.rotate(p.rot); m.fillStyle = p.color; if (p.type === 'paper') m.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66); else { m.beginPath(); m.moveTo(-p.size * p.pts[0], 0); m.lineTo(0, -p.size * p.pts[1]); m.lineTo(p.size * p.pts[2], p.size * 0.4); m.closePath(); m.fill(); } }); p.life = 0; }
    }
  }
  G.particles = G.particles.filter(p => p.life > 0);
  for (const p of G.popups) { p.life -= dt; p.z += p.vz * dt; p.vz *= 1 - dt * 2.5; }
  G.popups = G.popups.filter(p => p.life > 0);
  for (const r of G.rings) r.life -= dt; G.rings = G.rings.filter(r => r.life > 0);
  for (const pw of G.paws) pw.life -= dt; G.paws = G.paws.filter(pw => pw.life > 0);
  for (const b of G.beams) b.life -= dt; G.beams = G.beams.filter(b => b.life > 0);
  for (const c of G.coins) c.t += dt; G.coins = G.coins.filter(c => c.t < c.dur);
  if (G.banner && !(G.ult || G.sj)) { G.banner.life -= dt; if (G.banner.life <= 0) G.banner = null; }   // 필살기·슈퍼 점프 중엔 멈춰 뒀다가 끝나면 띄움 (연출 가림 방지)
  for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
  G.cleanT = (G.cleanT || 0) + dt;
  if (G.cleanT > 1) { G.cleanT = 0; for (const m of Object.values(G.mess)) { m.save(); m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'destination-out'; m.fillStyle = 'rgba(0,0,0,.03)'; m.fillRect(0, 0, m.canvas.width, m.canvas.height); m.restore(); } }
}

function update(dt) {
  G.t += dt;
  if (G.rush) { G.rush.t -= dt; if (G.rush.t <= 0) G.rush = null; }
  if (G.comboT > 0) { G.comboT -= dt / (1 + 0.1 * lv('combo')); if (G.comboT <= 0) G.combo = 0; }   // 콤보 장인: 늦게 끊김
  updateMeteor(dt);
  G.comboBump = Math.max(0, G.comboBump - dt * 5);
  G.mkT -= dt; G.punch = Math.max(0, G.punch - dt * 0.25); for (const k in G.wallShake) { G.wallShake[k] -= dt * 2; if (G.wallShake[k] <= 0) delete G.wallShake[k]; }
  buildGrids();
  updateStage(dt);
  if (G.bossStartLater && G.running) { G.bossStartLater = false; startBossFight(); }
  updateSpawns(dt);
  updateRats(dt);
  updateItems(dt);
  updateBombs(dt);
  updateHumans(dt);
  updateBossShots(dt);
  updateHazards(dt);
  updateActs(dt);
  updateFx(dt);
  updateCamera(dt);
  trySuperJump(dt);
  tryUlt(dt);
  updateUlt(dt);
  G.earnSec += dt;
  if (G.earnSec >= 1) { G.earnSec -= 1; G.earnLog.push(G.earnAcc); G.earnAcc = 0; if (G.earnLog.length > 20) G.earnLog.shift(); S.ips = G.earnLog.reduce((a, b) => a + b, 0) / G.earnLog.length; }
}

// ───────────────────────── 렌더 ─────────────────────────
function drawFloor(z, x0, y0) {
  const img = z.img ? IMG[z.img] : IMG['bg_' + z.floor];
  if (img) { ctx.drawImage(img, x0, y0, RW, RH); return; }
  if (z.floor === 'lab') {
    ctx.fillStyle = '#eef0ec'; ctx.fillRect(x0, y0, RW, RH);
    ctx.strokeStyle = 'rgba(160,165,160,.35)'; ctx.lineWidth = 2;
    for (let x = x0; x <= x0 + RW; x += 80) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + RH); ctx.stroke(); }
    for (let y = y0; y <= y0 + RH; y += 80) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + RW, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(230,179,90,.35)'; ctx.fillRect(x0 + 80, y0 + RH / 2 - 4, RW - 160, 8);
    ctx.fillStyle = '#b9b1a6'; circ(ctx, x0 + RW * 0.5, y0 + RH * 0.3, 18); ctx.fill();
  } else if (z.floor === 'corridor') {
    ctx.fillStyle = '#cfdcc9'; ctx.fillRect(x0, y0, RW, RH);
    ctx.fillStyle = '#b4c7ad'; ctx.fillRect(x0, y0 + RH / 2 - 60, RW, 120); ctx.fillRect(x0 + RW / 2 - 60, y0, 120, RH);
  } else if (z.floor === 'sewer') {
    ctx.fillStyle = '#8e8a84'; ctx.fillRect(x0, y0, RW, RH);
    ctx.fillStyle = '#6f8a86'; ctx.fillRect(x0, y0 + RH * 0.38, RW, RH * 0.24);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let n = 0; n < 12; n++) ctx.fillRect(x0 + ((n * 137 + G.t * 40) % RW), y0 + RH * 0.45 + (n % 3) * 20, 40, 3);
  }
}
function render() {
  ctx.setTransform(SF, 0, 0, SF, 0, 0);
  ctx.fillStyle = '#3d4a45'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  const sh = G.shake * G.shake * 14; ctx.translate(rand(-sh, sh), rand(-sh, sh));
  const pz = 1 + G.punch; ctx.translate(W / 2, H / 2); ctx.scale(pz, pz); ctx.translate(-W / 2, -H / 2);
  if ((G.sj || G.ult) && (G.sj || G.ult).zoom !== 1) {
    // 슈퍼 점프 기 모으기 / 필살기 준비: 발동한 쥐를 화면 가운데로 끌어오며 확대
    const s = G.sj || G.ult, fx = (s.r.x - G.cam.x) * G.cam.z, fy = (s.r.y * TILT - 20 - G.cam.y) * G.cam.z, c = clamp((s.zoom - 1) / 0.55, 0, 1);
    ctx.translate(fx + (W / 2 - fx) * c, fy + (H * 0.58 - fy) * c); ctx.scale(s.zoom, s.zoom); ctx.translate(-fx, -fy);
  }
  const z = G.cam.z; ctx.scale(z, z); ctx.translate(-G.cam.x, -G.cam.y);

  // 바닥
  ctx.save(); ctx.scale(1, TILT);
  const vi0 = Math.floor(G.cam.x / RW), vi1 = Math.floor((G.cam.x + viewW()) / RW);
  const vj0 = Math.floor(G.cam.y / TILT / RH), vj1 = Math.floor((G.cam.y + viewH()) / TILT / RH);
  for (let i = vi0; i <= vi1; i++) for (let j = vj0; j <= vj1; j++) {
    const x0 = i * RW, y0 = j * RH, key = rk(i, j);
    const zn = zoneOf();
    if (isOpen(i, j)) { drawFloor(zn, x0, y0); if (zn.tint) { ctx.fillStyle = zn.tint; ctx.fillRect(x0, y0, RW, RH); } if (G.mess[key]) ctx.drawImage(G.mess[key].canvas, x0, y0, RW, RH); }
    else if (inLayout(i, j) && DIRS.some(([di, dj]) => isOpen(i + di, j + dj))) {
      // 벽 너머: 어렴풋이 보이는 다음 방 (계단 방·보스 방은 표시)
      drawFloor(zn, x0, y0);
      ctx.fillStyle = 'rgba(28,24,40,.78)'; ctx.fillRect(x0, y0, RW, RH);
      ctx.save(); ctx.translate(x0 + RW / 2, y0 + RH / 2); ctx.scale(1, 1 / TILT);
      ctx.font = "40px 'Gowun Dodum', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillText('🔒 잠긴 방', 0, 0); ctx.restore();          // 계단 방도 열기 전엔 똑같이 보임
    }
  }
  if (G.rush) {
    const k = G.rush.t / G.rush.max;
    ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(G.t * 12); ctx.translate(G.rush.x, G.rush.y); ctx.scale(1.4, 1.4);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(0, 0, 14 + (1 - k) * 8, 0, 6.28); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = 'rgba(30,15,5,.2)';
  for (const it of G.items) if (!it.noShadow && onScreen(it.x, it.y, 40)) { const k = 1 - Math.min(0.5, it.z / 500); ctx.beginPath(); ctx.ellipse(it.x, it.y + it.r * 0.2, it.r * k, it.r * 0.85 * k, 0, 0, 6.28); ctx.fill(); }
  for (const h of G.humans) if (h.state !== 'splat' && onScreen(h.x, h.y, 80)) { const w = h.r * 1.5 * h.sc / 1.2 * (1 - Math.min(0.7, h.z / 800)); ctx.globalAlpha = clamp(h.alpha, 0, 1); ctx.beginPath(); ctx.ellipse(h.x, h.y, w, w * 0.5, 0, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1; }
  for (const r of G.rats) if (onScreen(r.x, r.y)) { const w = ratR(r) * 1.6 * (1 - Math.min(0.7, r.z / 500)); ctx.beginPath(); ctx.ellipse(r.x, r.y, w, w * 0.6, 0, 0, 6.28); ctx.fill(); }
  for (const b of G.bombs) if (b.meteor && onScreen(b.x, b.y)) { ctx.globalAlpha = 0.25 + 0.4 * (1 - b.z / 900); ctx.beginPath(); ctx.ellipse(b.x, b.y, b.rad * 0.6, b.rad * 0.6, 0, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1; }
  for (const p of G.parcels) if (onScreen(p.x, p.y)) { ctx.globalAlpha = Math.max(0.2, 1 - p.z / 700); ctx.beginPath(); ctx.ellipse(p.x, p.y, 20, 16, 0, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1; }
  for (const rg of G.rings) { if (!onScreen(rg.x, rg.y, rg.r)) continue; const k = 1 - rg.life / rg.max; ctx.globalAlpha = 1 - k; ctx.strokeStyle = rg.color; ctx.lineWidth = (rg.width * (1 - k) + 1) / TILT; ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r * (0.3 + k * 0.7), 0, 6.28); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.restore();
  if (G.ult && G.ult.phase === 'act' && G.ult.eng.ground) G.ult.eng.ground(G.ult);   // 필살기 바닥 그림(금 간 바닥 등): 쥐·물건보다 먼저

  // 서 있는 것들 (뒤→앞) + 벽
  const list = [], walls = visibleWalls();
  for (const w of walls) if (w.di) drawWallSeg(w); else list.push({ y: w.y + (w.dj < 0 ? -1 : 1), f: () => drawWallSeg(w) });
  for (const it of G.items) if (!it.inPot && onScreen(it.x, it.y, 60)) list.push({ y: it.y, f: () => drawItem25(it) });   // inPot: 요리 필살기 냄비 속
  for (const r of G.rats) if (onScreen(r.x, r.y)) list.push({ y: r.y, f: () => drawRat(r) });
  if (G.ult && G.ult.phase === 'act' && G.ult.eng.sorted) for (const e of G.ult.eng.sorted(G.ult)) list.push(e);   // 필살기 소품(탁자·자동차·무대)도 앞뒤 순서대로
  for (const h of G.humans) if (onScreen(h.x, h.y, 160)) list.push({ y: h.y, f: () => drawHuman(h) });
  hazardsSorted(list);
  for (const p of G.parcels) if (onScreen(p.x, p.y)) list.push({ y: p.y, f: () => drawParcel(p) });
  if (isOpen(...STAIRS)) { const sp = stairsPos(); if (onScreen(sp.x, sp.y, 300)) list.push({ y: sp.y - 60, f: drawStairs }); }
  for (const p of G.pickups) if (onScreen(p.x, p.y)) list.push({ y: p.y, f: () => drawPickup(p) });
  list.sort((a, b) => a.y - b.y);
  for (const e of list) e.f();
  for (const pw of G.paws) { const k = 1 - pw.life / pw.max; ctx.save(); ctx.translate(pw.x, pw.y * TILT - 16); ctx.rotate(pw.ang); ctx.globalAlpha = 1 - k; ctx.strokeStyle = pw.crit ? '#f2c14e' : '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 5 - 6, -10); ctx.lineTo(i * 5 + 6, 10); ctx.stroke(); } ctx.restore(); }
  ctx.globalAlpha = 1;
  for (const b of G.bombs) { ctx.save(); ctx.translate(b.x, b.y * TILT - b.z); ctx.rotate(b.meteor ? 0 : b.t * 12); if (b.icon) drawProp(ctx, b.icon, b.size || (b.meteor ? 34 : 20)); else if (b.flask) { ctx.fillStyle = '#bfe3ea'; rr(ctx, -3, -9, 6, 6, 1); ctx.fill(); ctx.fillStyle = '#9dd5a8'; circ(ctx, 0, 0, 6); ctx.fill(); } else { ctx.fillStyle = '#4b4540'; circ(ctx, 0, 0, 6); ctx.fill(); ctx.fillStyle = '#f0c878'; circ(ctx, 4, -5, 2 + Math.random() * 1.5); ctx.fill(); } ctx.restore(); }
  for (const b of G.beams) { const k = b.life / b.max; ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = k; ctx.strokeStyle = b.col; ctx.lineWidth = 10 * k + 2; ctx.beginPath(); ctx.moveTo(b.x1, b.y1 * TILT - 14); ctx.lineTo(b.x2, b.y2 * TILT - 14); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * k + 1; ctx.stroke(); ctx.restore(); }
  drawBossShots();
  drawActFx();
  drawUltWorld();
  drawUltWindup();
  drawParticles();
  const inv = 1 / z;
  for (const w of walls) drawWallBar(w, inv);
  drawHPBars(inv);
  // 말풍선은 머리 위로 충분히 띄우고 살짝 뒤쪽으로 (얼굴을 가리지 않게). 공중에 뜬 높이·요리사 등 높이도 반영
  for (const r of G.rats) if (r.say && onScreen(r.x, r.y)) { const sz = TIERS[r.tier].size * (r.sp.id === 'starchef' ? MOUNT_RAT : 1); bubble(r.x - r.face * 14 * sz, r.y * TILT - r.z - (r.sp.id === 'starchef' ? r.mountZ ?? MOUNT_SEAT : 0) - 44 * sz - 22 * inv, r.say.text, inv); }
  for (const h of G.humans) if (h.say && onScreen(h.x, h.y)) bubble(h.x - h.face * 10 * h.sc, h.y * TILT - h.z - HUMAN_H * h.sc - 30 * inv, h.say.text, inv);
  drawPopups(inv);
  ctx.restore();

  for (const c of G.coins) { const k = c.t / c.dur, e = k * k, sx = (c.x - G.cam.x) * z, sy = (c.y * TILT - 20 - G.cam.y) * z; const x = sx + (96 - sx) * e, y = sy + (38 - sy) * e - Math.sin(k * Math.PI) * 60; ctx.save(); ctx.translate(x, y); ctx.scale(Math.abs(Math.cos(G.t * 12 + c.x)) * 0.8 + 0.2, 1); circ(ctx, 0, 0, 7); ctx.fillStyle = '#f2c14e'; ctx.fill(); ctx.restore(); }
  if (!G.vg) { G.vg = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H / 2, H * 0.95); G.vg.addColorStop(0, 'rgba(255,220,170,0)'); G.vg.addColorStop(1, 'rgba(40,20,30,.4)'); }
  ctx.fillStyle = G.vg; ctx.fillRect(0, 0, W, H);
  drawMinimap();
  if (G.combo >= 3) {
    const s2 = 1 + G.comboBump * 0.35, cc = G.combo >= 100 ? '#d9786a' : G.combo >= 25 ? '#f0c878' : '#fff';
    ctx.save(); ctx.translate(W - 120, 175); ctx.scale(s2, s2); ctx.rotate(-0.08); outlined(`${G.combo}`, 0, 0, 52, cc); outlined('COMBO', 0, 34, 16, cc); ctx.restore();
  }
  if (G.banner && !(G.ult || G.sj)) { const b = G.banner, age = b.max - b.life, s = age < 0.15 ? 1.6 - age / 0.15 * 0.6 : 1; ctx.save(); ctx.globalAlpha = Math.min(1, b.life * 2.5); ctx.translate(W / 2, H / 2 - 60); ctx.scale(s, s); outlined(b.text, 0, 0, 46, b.color); outlined(b.sub, 0, 40, 20, '#fff'); ctx.restore(); }
  drawSuperJump();
  drawUltCut();
  drawStageUI();
  if (G.flash > 0) { ctx.globalAlpha = G.flash; ctx.fillStyle = G.flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
function visibleWalls() {
  const out = [];
  for (const [i, j] of openRooms()) for (const [di, dj] of DIRS) {
    if (isOpen(i + di, j + dj)) continue;
    const w = { i, j, di, dj, key: wallKey(i, j, di, dj), solid: !inLayout(i + di, j + dj) };
    if (di) { w.x = di > 0 ? (i + 1) * RW : i * RW; w.y0 = j * RH; w.y1 = (j + 1) * RH; w.cx = w.x; w.cy = (w.y0 + w.y1) / 2; }
    else { w.y = dj > 0 ? (j + 1) * RH : j * RH; w.x0 = i * RW; w.x1 = (i + 1) * RW; w.cx = (w.x0 + w.x1) / 2; w.cy = w.y; }
    if (onScreen(w.cx, w.cy, RW / 2 + 100)) out.push(w);
  }
  return out;
}
const WALL_H = 46;
function drawWallSeg(w) {
  const hp = w.solid ? 1 : wallHP(w.i, w.j, w.di, w.dj), k = w.solid ? 1 : clamp(hp / wallMax(w.i + w.di, w.j + w.dj), 0, 1);
  const sh = G.wallShake[w.key] || 0, jit = sh * 4 * Math.sin(G.t * 60);
  ctx.save();
  if (w.di) {
    ctx.translate(jit, 0);
    const top = w.y0 * TILT, bot = w.y1 * TILT;
    ctx.fillStyle = '#a39b90'; ctx.fillRect(w.x - WM, top - WALL_H, WM * 2, bot - top + WALL_H);
    ctx.fillStyle = '#d6d1c8'; ctx.fillRect(w.x - WM, top - WALL_H, WM * 2, bot - top);
  } else {
    ctx.translate(0, jit * 0.5);
    const y = w.y * TILT;
    ctx.fillStyle = '#d6d1c8'; ctx.fillRect(w.x0, y - WALL_H - WM * TILT, w.x1 - w.x0, WM * 2 * TILT);
    ctx.fillStyle = '#b9b1a6'; ctx.fillRect(w.x0, y - WALL_H + WM * TILT, w.x1 - w.x0, WALL_H);
  }
  // 금 간 자국
  ctx.strokeStyle = 'rgba(75,69,64,.55)'; ctx.lineWidth = 2.5;
  const cracks = Math.floor((1 - k) * 14);
  for (let n = 0; n < cracks; n++) {
    const f = ((n * 0.618) % 1);
    ctx.beginPath();
    if (w.di) { const y = (w.y0 + (w.y1 - w.y0) * f) * TILT - WALL_H / 2; ctx.moveTo(w.x - 12, y); ctx.lineTo(w.x - 2, y + 12); ctx.lineTo(w.x + 6, y + 4); ctx.lineTo(w.x + 12, y + 18); }
    else { const x = w.x0 + (w.x1 - w.x0) * f, y = w.y * TILT - WALL_H / 2; ctx.moveTo(x, y - 18); ctx.lineTo(x + 10, y - 4); ctx.lineTo(x + 3, y + 6); ctx.lineTo(x + 14, y + 18); }
    ctx.stroke();
  }
  ctx.restore();
}
function drawWallBar(w, inv) {
  if (w.solid) return;
  const hp = wallHP(w.i, w.j, w.di, w.dj), k = clamp(hp / wallMax(w.i + w.di, w.j + w.dj), 0, 1);
  const zn = '잠긴 방';                      // 계단 방인지는 열어봐야 앎
  ctx.save(); ctx.translate(w.cx, w.cy * TILT - WALL_H - 14); ctx.scale(inv, inv);
  const bw = 150;
  rr(ctx, -bw / 2 - 6, -18, bw + 12, 34, 10); ctx.fillStyle = 'rgba(251,247,239,.92)'; ctx.fill();
  rr(ctx, -bw / 2, 4, bw, 7, 4); ctx.fillStyle = 'rgba(75,69,64,.15)'; ctx.fill();
  rr(ctx, -bw / 2, 4, bw * k, 7, 4); ctx.fillStyle = '#c9745b'; ctx.fill();
  ctx.font = "12px 'Gowun Dodum', sans-serif"; ctx.fillStyle = '#4b4540'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`🧱 ${fmt(Math.max(0, hp))} → ${zn}`, 0, -6);

  ctx.restore();
}
function drawItem25(it) {
  const s = it.appear < 1 ? easeOutBack(Math.max(0, it.appear)) : 1; if (s <= 0.02) return;
  const im = IMG['art_i:' + it.type.k] || (it.type.img && IMG['art_f:' + it.type.img]);
  if (im) {
    // 연구소 물건 이미지: 서 있는 스프라이트 (바닥 = 이미지 아래쪽). 날아갈 땐 가운데를 축으로 빙글빙글
    const w = it.r * 2.6 * s, h = w * im.height / im.width;
    ctx.save(); ctx.translate(it.x, it.y * TILT - it.z + it.r * 0.35);
    if (it.gold) { ctx.fillStyle = 'rgba(242,193,78,.55)'; ctx.beginPath(); ctx.ellipse(0, -2, w * 0.55, w * 0.2, 0, 0, 6.28); ctx.fill(); }
    if (it.state === 'rest') { ctx.rotate(Math.sin(G.t * 30 + it.seed) * 0.12 * it.wob); ctx.scale(it.sq, 1 / it.sq); }
    else { ctx.translate(0, -h / 2); ctx.rotate(it.rot); ctx.translate(0, h / 2); }
    ctx.drawImage(im, -w / 2, -h, w, h);
    if (it.gold) { ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = 0.35; ctx.fillStyle = '#f2c14e'; ctx.fillRect(-w / 2, -h, w, h); }
    if (it.flashT > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(0.6, it.flashT * 8); ctx.drawImage(im, -w / 2, -h, w, h); }
    ctx.restore();
    return;
  }
  const baseY = it.y * TILT - it.z, depth = Math.min(it.type.big ? 36 : 22, it.r * 0.55) * s, top = it.col[0];
  ctx.save(); ctx.translate(it.x, baseY);
  if (it.state === 'rest') ctx.rotate(Math.sin(G.t * 30 + it.seed) * 0.12 * it.wob);
  ctx.fillStyle = shade(top[0] === '#' ? top : '#cccccc', -0.35);
  ctx.beginPath(); ctx.ellipse(0, 0, it.r * s, it.r * TILT * s, 0, 0, Math.PI); ctx.lineTo(-it.r * s, -depth); ctx.ellipse(0, -depth, it.r * s, it.r * TILT * s, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
  ctx.translate(0, -depth); ctx.scale(s * it.sq, s * TILT / it.sq); ctx.rotate(it.rot);
  drawItemShape(ctx, it);
  if (it.flashT > 0) { ctx.globalAlpha = Math.min(1, it.flashT * 12); circ(ctx, 0, 0, it.r * 1.05); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1; }
  ctx.restore();
  if (it.state === 'rest' && it.hp < it.hpMax) { const w = it.r * 2, x = it.x - it.r, y = baseY - depth - it.r * TILT - 10; ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x - 1, y - 1, w + 2, 6); ctx.fillStyle = '#c9745b'; ctx.fillRect(x, y, w * clamp(it.hp / it.hpMax, 0, 1), 4); }
}
function drawRat(r) {
  const sc = RAT_SCALE * TIERS[r.tier].size * (r.born < 1 ? easeOutBack(r.born) : 1) * (r.sp.id === 'starchef' ? MOUNT_RAT : 1);   // 요리사 등에 탄 쥐는 조금 작게 (humans.js)
  if (sc < 0.02) return;
  const img = IMG['rat_' + r.sp.id] || IMG['art_r:' + r.sp.id];         // r: 한 장짜리 그림 (컴퓨터 마우스 쥐)
  if (r.under) { drawDirtMound(r); return; }
  if (r.hideBody) return;                                         // 필살기로 변신 중 (거대 박쥐 등)
  const mz = r.sp.id === 'starchef' ? drawMount(r) : 0;          // humans.js: 슈퍼 요리사 쥐는 늘 요리사 등에 올라타 있음
  ctx.save();
  if (r.ghost) ctx.globalAlpha = 0.55 + 0.15 * Math.sin(G.t * 10);
  if (r.temp && r.temp < 0.6) ctx.globalAlpha *= r.temp / 0.6;
  ctx.translate(r.x, r.y * TILT - r.z - mz);
  if ((TIERS[r.tier].size > 1.3 || r.tier >= 3) && !mz) {   // 탈것 위에선 등급 고리 생략 (요리사 몸통에 박혀 보임)
     ctx.globalAlpha = 0.35; ctx.strokeStyle = TIERS[r.tier].col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 18 * sc, 10 * sc, 0, 0, 6.28); ctx.stroke(); ctx.globalAlpha = 1; }
  if (rsl(r.sp.id, 'ult')) { const hg = 26 * sc; ctx.save(); ctx.globalAlpha = 0.4 + 0.15 * Math.sin(G.t * 6 + r.walk); const g = ctx.createRadialGradient(0, -hg * 0.4, 2, 0, -hg * 0.4, hg); g.addColorStop(0, '#fff3bf'); g.addColorStop(1, 'rgba(255,212,59,0)'); ctx.fillStyle = g; circ(ctx, 0, -hg * 0.4, hg); ctx.fill(); ctx.restore(); }
  if (r.frenzy > 0 && Math.random() < 0.3 && onScreen(r.x, r.y)) particle({ x: r.x + rand(-8, 8), y: r.y, z: rand(10, 30), vx: 0, vy: 0, vz: 60, life: 0.4, max: 0.4, size: 3, color: '#e39a5a', type: 'spark', drag: 2 });
  const tr = r.trick, hh = 11 * sc, f = r.face;
  if (r.jit) ctx.translate(rand(-r.jit, r.jit), rand(-r.jit, r.jit) * 0.4);
  if (r.drawUnder) r.drawUnder(ctx);                              // 필살기 탈것(썰매·배·양탄자)
  if (r.zombieUntil > G.t) ctx.filter = 'hue-rotate(70deg) saturate(0.75) brightness(0.95)';
  const ac = r.act;
  if (ac && ac.type === 'ball') {
    // 거대 공: 투명한 공 속에서 데굴데굴
    const R0 = ratR(r) * (r.ballS || 1) * 1.15;
    ctx.translate(0, -R0); ctx.fillStyle = 'rgba(191,227,234,.35)'; circ(ctx, 0, 0, R0); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.rotate(ac.t * 14 * f); ctx.scale((r.ballS || 1) * 0.7, (r.ballS || 1) * 0.7); ctx.translate(0, hh * 0.9);
  } else if ((ac && ac.type === 'tornado') || r.ultSpin) ctx.scale(Math.cos(G.t * 36), 1);
  if (r.sjRot) { ctx.translate(0, -hh); ctx.rotate(r.sjRot); ctx.translate(0, hh); }
  if (tr) {
    const k = Math.min(1, tr.t / tr.dur);
    if (tr.type === 'flip') {
      // 백덤블링: 뒤로 솟구치며 한 바퀴 (머리가 뒤로 넘어감)
      ctx.translate(0, -Math.sin(k * Math.PI) * 58 - hh); ctx.rotate(-f * k * Math.PI * 2); ctx.translate(0, hh);
    } else if (tr.type === 'axel') {
      // 트리플 악셀: 높이 뛰어 세로축으로 3바퀴 (좌우 반전) → 착지하며 짠!
      const air = Math.min(1, k / 0.85);
      ctx.translate(0, -Math.sin(air * Math.PI) * 85);
      if (k < 0.85) { ctx.scale(Math.cos(air * Math.PI * 6), 1); ctx.rotate(Math.sin(air * Math.PI * 6) * 0.1); }
      else ctx.scale(1 + Math.sin((k - 0.85) / 0.15 * Math.PI) * 0.25, 1 - Math.sin((k - 0.85) / 0.15 * Math.PI) * 0.2);
    } else if (tr.type === 'windmill') {
      // 윈드밀: 등을 바닥에 대고 뱅글뱅글 (다리 허우적)
      ctx.translate(0, -hh * 0.6); ctx.rotate(k * Math.PI * 2 * 4 * f); ctx.scale(1, -1); ctx.translate(0, hh * 0.5);
    } else if (tr.type === 'cannon') {
      // 대포알: 몸을 동그랗게 말고 데굴데굴
      ctx.translate(0, -hh * 0.8 - Math.abs(Math.sin(tr.t * 9)) * 10); ctx.rotate(tr.t * 22 * f); ctx.scale(0.8, 0.72); ctx.translate(0, hh * 0.9);
    } else if (tr.type === 'kick') {
      // 날아차기: 살짝 뛰어올라 몸을 뒤로 젖힘
      const air = k < 0.2 ? 0 : k < 0.8 ? Math.sin((k - 0.2) / 0.6 * Math.PI) : 0;
      ctx.translate(0, -air * 34);
    } else if (tr.type === 'belly') {
      ctx.translate(0, 2);
    } else if (tr.type === 'tumble') {
      // 얻어맞고 나뒹굼
      const dir = Math.cos(tr.ang) >= 0 ? 1 : -1;
      ctx.translate(0, -Math.sin(k * Math.PI) * 28 - hh); ctx.rotate(dir * k * Math.PI * 3); ctx.translate(0, hh);
    }
  }
  ctx.scale(-r.face * sc / Math.sqrt(r.sq), sc * r.sq);            // 그림은 왼쪽을 봄 → 오른쪽 갈 땐 뒤집기
  if (G.rush && r.rushT > 0 && !tr) ctx.rotate(-0.08);
  if (r.stun > 0 && !tr) ctx.scale(1.15, 0.72);                   // 기절: 납작
  if (r.pose && r.pose.spinX !== undefined) { const c = r.pose.spinX; ctx.scale((c < 0 ? -1 : 1) * Math.max(0.12, Math.abs(c)), 1); }   // 세로축 회전 (쥐커드 트리플 악셀)
  const rig = RAT_RIGS[r.sp.id], SP = r.pose && r.pose.sprite && IMG['art_' + r.pose.sprite];
  if (r.pose && r.pose.fr && frontReady(r.pose.fr)) {             // 필살기 전용 앞모습 리그 (람쥐썬더, frontrig.js)
    ctx.save(); ctx.scale(-r.face, 1); ctx.rotate(r.pose.spriteRot || 0); drawFrontRig(r.pose); ctx.restore();
  }
  else if (SP) {                                                   // (앞모습 파츠가 없을 때) 예전 한 장짜리 앞모습 그림
    const P = r.pose, h = P.spriteH || 40, w = h * SP.width / SP.height, sx = P.spriteSX ?? 1;
    ctx.save(); ctx.scale(-r.face, 1); ctx.rotate(P.spriteRot || 0); ctx.scale(sx, 1); ctx.drawImage(SP, -w / 2, -h, w, h); ctx.restore();
  }
  else if (rig) drawRatRig(rig, 1, mz && !r.pose && !tr ? MOUNT_POSE(r) : ratPose(r));   // Codex 파츠로 조립한 리그 (탑승 중엔 머리카락 잡는 자세)
  else if (img) {
    // 한 장짜리 그림: 다리가 없으니 미끄러지듯 달리며 통통 + 부딪힐 때 딸깍(납작)
    const h = 24, w = h * img.width / img.height, mv = r.speed > 25;
    ctx.translate(0, -(mv ? Math.abs(Math.sin(r.walk * 1.5)) * 3 : 0)); ctx.rotate(mv ? -0.05 + Math.sin(r.walk * 3) * 0.03 : 0);
    if (r.bite) ctx.scale(1 + r.bite * 0.08, 1 - r.bite * 0.15);
    ctx.drawImage(img, -w / 2, -h, w, h);
    if (r.bite > 0.6 && r.sp.id === 'pcmouse' && Math.random() < 0.2 && onScreen(r.x, r.y)) popup(r.x, r.y, '딸깍', '#fff', 13, 0.4, 30);
  }
  else {
    const moving = r.speed > 25 || (tr && tr.type === 'windmill');
    const frame = moving ? ((Math.floor(r.walk / (Math.PI * 2) * 8) % 8) + 8) % 8 : -1;
    if (r.bite) ctx.rotate(-0.18 * Math.sin(r.bite * Math.PI));        // 갉을 때 앞으로 까딱
    ctx.drawImage(ratSprite(r.sp, frame, r.sleep > 0), -38, -46, 100, 56);
    if (ac && ac.hold && ac.type !== 'ball') { ctx.save(); ctx.translate(-22, -16); drawProp(ctx, ac.hold, 16); ctx.restore(); }
  }
  ctx.restore();
  if (mz && r.mount && r.mount.after) { r.mount.after(); r.mount.after = null; }   // 요리사 머리는 쥐 다음에 (humans.js drawCookBeast)
  if (((tr && tr.type === 'tumble') || r.stun > 0) && onScreen(r.x, r.y)) { ctx.save(); ctx.translate(r.x, r.y * TILT - 30 * sc); ctx.fillStyle = '#f0c878'; for (let i = 0; i < 3; i++) { const a = G.t * 8 + i * 2.09; ctx.font = `${10 * sc}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('★', Math.cos(a) * 12 * sc, Math.sin(a) * 4 * sc); } ctx.restore(); }
}
const SPR = new Map();
function ratSprite(sp, frame, sleep) {
  const k = sp.id + '|' + frame + (sleep ? 's' : '');
  let c = SPR.get(k);
  if (!c) {
    const res = 2 * TIERS[sp.tier].size;
    c = document.createElement('canvas'); c.width = Math.ceil(100 * res); c.height = Math.ceil(56 * res);
    const g = c.getContext('2d'); g.scale(res, res); g.translate(38, 46);
    const moving = frame >= 0;
    drawRodent(g, sp, { t: moving ? frame * 0.7 : 0.3, walk: moving ? frame / 8 * Math.PI * 2 : 0, moving, bite: 0, sleep });
    SPR.set(k, c);
  }
  return c;
}
// 로켓배송 택배: 상자 + 밑에서 뿜는 역추진 불꽃 (땅 가까이서 세게)
function drawParcel(p) {
  ctx.save(); ctx.translate(p.x, p.y * TILT - p.z); ctx.rotate(p.rot + Math.sin(p.t * 20) * 0.04);
  const fl = p.z < 240 ? 1 : 0.45, L = (18 + Math.random() * 12) * fl;
  ctx.fillStyle = 'rgba(240,200,120,.9)'; ctx.beginPath(); ctx.moveTo(-9, 10); ctx.lineTo(0, 10 + L * 1.6); ctx.lineTo(9, 10); ctx.fill();
  ctx.fillStyle = '#fff3bf'; ctx.beginPath(); ctx.moveTo(-5, 10); ctx.lineTo(0, 10 + L); ctx.lineTo(5, 10); ctx.fill();
  ctx.fillStyle = '#8e8a84'; rr(ctx, -8, 5, 16, 7, 2); ctx.fill();             // 로켓 노즐
  if (!drawArt(ctx, '📦', 46)) { ctx.fillStyle = '#b08968'; ctx.fillRect(-18, -8, 36, 16); rr(ctx, -18, -26, 36, 20, 3); ctx.fillStyle = '#d4a373'; ctx.fill(); ctx.fillStyle = '#e9c46a'; ctx.fillRect(-4, -26, 8, 34); }
  ctx.restore();
}
function drawParticles() {
  for (const p of G.particles) {
    if (!onScreen(p.x, p.y, 40)) continue;
    const a = clamp((p.life / p.max) * 2, 0, 1), px = p.x, py = p.y * TILT - (p.z || 0);
    if (p.type === 'trail') { const k = Math.max(0, p.life / p.max); ctx.globalAlpha = k * 0.45; ctx.fillStyle = p.color; circ(ctx, px, py, p.size * k + 0.01); ctx.fill(); continue; }
    if (p.type === 'dust') { ctx.globalAlpha = 1; ctx.fillStyle = p.color + (a * 0.6).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(px, py, Math.max(0.1, p.size * (1.6 - a * 0.6)), 0, 6.28); ctx.fill(); continue; }
    ctx.globalAlpha = p.settle ? 1 : a;
    ctx.save(); ctx.translate(px, py); ctx.rotate(p.rot || 0); ctx.fillStyle = p.color;
    if (p.type === 'shard') { ctx.beginPath(); ctx.moveTo(-p.size * p.pts[0], 0); ctx.lineTo(0, -p.size * p.pts[1]); ctx.lineTo(p.size * p.pts[2], p.size * 0.4); ctx.closePath(); ctx.fill(); }
    else if (p.type === 'paper') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 * Math.abs(Math.cos(p.rot * 2)));
    else if (p.type === 'star') { ctx.beginPath(); for (let i = 0; i < 10; i++) { const an = i / 10 * 6.28 - 1.57, q = i % 2 ? p.size * 0.45 : p.size; ctx.lineTo(Math.cos(an) * q, Math.sin(an) * q); } ctx.fill(); }
    else if (p.type === 'cheese') { const q = p.size * (0.6 + 0.4 * a); ctx.beginPath(); ctx.moveTo(-q, q * 0.45); ctx.lineTo(q, q * 0.45); ctx.lineTo(q * 0.7, -q * 0.6); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff3bf'; ctx.beginPath(); ctx.moveTo(-q, q * 0.45); ctx.lineTo(q * 0.7, -q * 0.6); ctx.lineTo(q * 0.35, -q * 0.6); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#d9a93a'; circ(ctx, q * 0.25, q * 0.12, q * 0.2); ctx.fill(); }
    else if (p.type === 'heart') { ctx.rotate(-p.rot); ctx.font = `${p.size * 2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💗', 0, 0); }
    else { ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.size * a), 0, 6.28); ctx.fill(); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function outlined(text, x, y, size, fill) { ctx.font = `700 ${size}px 'IBM Plex Sans KR', 'Gowun Dodum', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2.5, size * 0.13); ctx.strokeStyle = 'rgba(60,50,45,.78)'; ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y); }
function drawPopups(inv) { for (const p of G.popups) { if (!onScreen(p.x, p.y)) continue; const age = p.max - p.life, s = (age < 0.1 ? 0.5 + age / 0.1 * 0.7 : 1.2 - Math.min(0.2, age - 0.1)) * inv; ctx.globalAlpha = Math.min(1, (p.life / p.max) * 3); ctx.save(); ctx.translate(p.x, p.y * TILT - p.z); ctx.scale(s, s); outlined(p.text, 0, 0, p.size, p.color); ctx.restore(); } ctx.globalAlpha = 1; }
function bubble(x, y, text, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.font = "15px 'Gowun Dodum', sans-serif"; const w = ctx.measureText(text).width + 20; rr(ctx, -w / 2, -13, w, 26, 13); ctx.fillStyle = 'rgba(251,247,239,.96)'; ctx.fill(); ctx.fillStyle = '#4b4540'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 1); ctx.restore(); }
function drawMinimap() {
  const b = layoutBounds(), cols = b.i1 - b.i0 + 3, rows = b.j1 - b.j0 + 3;
  const cs = Math.min(200 / cols, 80 / rows / 0.7, 36), mw = cols * cs, mh = rows * cs * 0.7;
  const mx = 14, my = H - mh - 14;
  ctx.save(); rr(ctx, mx - 6, my - 22, Math.max(mw, 170) + 12, mh + 28, 12); ctx.fillStyle = 'rgba(251,247,239,.9)'; ctx.fill();
  const [ci, cj] = roomOf(G.cam.x + viewW() / 2, (G.cam.y + viewH() / 2) / TILT);
  ctx.font = "13px 'Gowun Dodum', sans-serif"; ctx.fillStyle = '#7d746b'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`🏢 ${S.floor}층 · ${zoneOf().name}`, mx, my - 11);
  const X = x => mx + (x / RW - b.i0 + 1) * cs, Y = y => my + (y / RH - b.j0 + 1) * cs * 0.7;
  for (let i = b.i0 - 1; i <= b.i1 + 1; i++) for (let j = b.j0 - 1; j <= b.j1 + 1; j++) {
    // 미니맵: 열린 방 + 지금 부술 수 있는 옆방만 (계단 방은 열리기 전엔 평범한 잠긴 방으로)
    const open = isOpen(i, j);
    if (!open && !(inLayout(i, j) && DIRS.some(([di, dj]) => isOpen(i + di, j + dj)))) continue;
    ctx.fillStyle = open ? ZONE_COL[zoneIdx() % ZONE_COL.length] : 'rgba(58,52,49,.4)';
    ctx.fillRect(X(i * RW) + 1, Y(j * RH) + 1, cs - 2, cs * 0.7 - 2);
    if (open && isStairsRoom(i, j)) { ctx.font = `${Math.round(cs * 0.45)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(G.boss && G.boss.state !== 'dead' ? '👹' : '🪜', X((i + 0.5) * RW), Y((j + 0.5) * RH) + 1); ctx.textAlign = 'left'; }
  }
  ctx.fillStyle = '#c9846e'; for (const r of G.rats) ctx.fillRect(X(r.x) - 1, Y(r.y) - 1, 2, 2);
  ctx.strokeStyle = '#4b4540'; ctx.lineWidth = 1.5; ctx.strokeRect(X(G.cam.x), Y(G.cam.y / TILT), viewW() / RW * cs, viewH() / TILT / RH * cs * 0.7);
  ctx.restore();
}

// ───────────────────────── 오프라인 / 시작 / 루프 ─────────────────────────
function offlineReward() {
  const away = (Date.now() - (S.lastSeen || Date.now())) / 1000;
  if (away < 60 || !S.ips) return null;
  const secs = Math.min(away, 12 * 3600), gain = S.ips * secs * (0.25 + 0.075 * lv('offline'));
  earn(gain); return { away, gain };
}
function initWorld() {
  genLayout(S.floor);
  OPEN = new Set(S.open.filter(k => LAYOUT.has(k))); if (!OPEN.size) OPEN.add('0,0'); S.open = [...OPEN];
  const [hi, hj] = S.open[S.open.length - 1].split(',').map(Number);
  const cx = (hi + 0.5) * RW, cy = (hj + 0.5) * RH;
  const rooms = openRooms();
  const place = id => { const [i, j] = pick(rooms); return makeRat(id, (i + 0.5) * RW + rand(-RW * 0.35, RW * 0.35), (j + 0.5) * RH + rand(-RH * 0.3, RH * 0.3)); };
  G.rats = S.herd.filter(id => RSPECIES_BY_ID[id]).slice(0, popCap()).map(place);
  if (!G.rats.length) G.rats = ['brownrat', 'mouse', 'labrat'].map(place);
  buildGrids();
  for (const [i, j] of openRooms()) furnishRoom(i, j);
  for (const [i, j] of openRooms()) for (let n = 0; n < zoneCap(); n++) spawnInRoom(i, j, true);
  // 사람·쥐덫·보스
  for (const [i, j] of openRooms()) { if (isStairsRoom(i, j)) continue; spawnHumans(i, j, i || j ? 1 : 2); if (S.floor >= 2 && (i || j)) spawnTraps(i, j, 1); }
  if (isBossFloor(S.floor) && !S.bossBeat[S.floor]) { G.boss = makeBoss(S.floor); if (isOpen(...STAIRS)) G.bossStartLater = true; }
  G.cam.x = cx - viewW() / 2; G.cam.y = cy * TILT - viewH() / 2; clampCam();
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G.ult && G.ult.phase === 'cut' && G.running) updateUltCut(dt);      // 필살기 컷인: 세상이 멈춤
  else if (G.sj && G.running) updateSuperJump(dt);             // 슈퍼 점프 중엔 세상이 멈추고 연출만 진행
  else if (G.hitstop > 0) { G.hitstop -= dt; G.t += dt * 0.1; } else if (G.running) update(dt); else G.t += dt;
  G.shake = Math.max(0, G.shake - dt * 2.5); G.flash = Math.max(0, G.flash - dt * 2.5);
  try { render(); } catch (e) { console.error(e); if (ctx.reset) ctx.reset(); }
  // 프레임이 계속 느리면(평균 28fps 미만) 캔버스 해상도를 한 단계 낮춤
  G.slow = (G.slow || 0) * 0.97 + dt * 0.03;
  if (G.slow > 1 / 28 && SF > 1 && G.t - (G.sfT || 0) > 3) { G.sfT = G.t; SF_CAP = Math.max(1, SF - 0.25); resizeCanvas(); G.vg = null; }
  requestAnimationFrame(frame);
}
setInterval(() => { if (G.running) writeSave(); }, 5000);
window.addEventListener('beforeunload', () => { if (G.running) writeSave(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.running) writeSave(); });
