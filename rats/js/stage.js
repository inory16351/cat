'use strict';
// ───────────────────────── 연구소 탈출: 층(스테이지) ─────────────────────────
// 층마다 방 배치(LAYOUT)를 층 번호로 시드 생성 → 저장할 필요 없이 매번 같은 모양.
// 시작 방 (0,0) 에서 가장 먼 방 = 계단 방(STAIRS). 계단 방 벽을 부수고 쥐가 계단에 닿으면 다음 층.
// BOSS_EVERY 층마다 계단 방에 보스. 계단 방이 열리는 순간 BOSS_TIME 초 제한 → 못 잡으면 아래층으로 쫓겨남.
// 쫓겨난 뒤엔 그 층 계단에 닿아도 자동으로 올라가지 않고 '재도전' 버튼을 눌러야 함 (파밍·강화할 시간).
let LAYOUT = new Set(['0,0']), STAIRS = [0, 0];
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function genLayout(f) {
  const rnd = seeded(f * 7919 + 17), n = Math.min(9, 3 + Math.floor(f * 0.6)) + (isBossFloor(f) ? 1 : 0);
  const rooms = [[0, 0]], set = new Set(['0,0']);
  let guard = 0;
  while (rooms.length < n && guard++ < 500) {
    // 대체로 마지막에 만든 방에서 뻗어 나가서 길쭉한 연구소 복도 느낌
    const [i, j] = rnd() < 0.6 ? rooms[rooms.length - 1] : rooms[Math.floor(rnd() * rooms.length)];
    const [di, dj] = DIRS[Math.floor(rnd() * 4)], k = rk(i + di, j + dj);
    if (set.has(k) || Math.abs(j + dj) > 3) continue;
    set.add(k); rooms.push([i + di, j + dj]);
  }
  // 계단 방 = 시작 방에서 방 이동 횟수가 가장 먼 방
  const dist = new Map([['0,0', 0]]), q = [[0, 0]];
  while (q.length) { const [i, j] = q.shift(); for (const [di, dj] of DIRS) { const k = rk(i + di, j + dj); if (set.has(k) && !dist.has(k)) { dist.set(k, dist.get(rk(i, j)) + 1); q.push([i + di, j + dj]); } } }
  let best = '0,0'; for (const [k, d] of dist) if (d > dist.get(best)) best = k;
  LAYOUT = set; STAIRS = best.split(',').map(Number);
}
const isStairsRoom = (i, j) => i === STAIRS[0] && j === STAIRS[1];
const stairsPos = () => ({ x: (STAIRS[0] + 0.5) * RW, y: STAIRS[1] * RH + 190 });
// 밸런스: 층마다 벽 ×WALL_GROW, 물건·사람 체력 ×ITEM_GROW, 치즈 ×VALUE_GROW (치즈가 체력보다 느리게 늘어서 층마다 강화가 필요)
// WALL_GROW: 예전엔 8 (굴착 본능이 1.15^레벨로 무한히 커지는 걸 전제) → 굴착 본능 상한(×3)에 맞춰 4.6
// ITEM_GROW: 2.4 였을 땐 쥐 공격력(이빨·승급)이 훨씬 빨리 커져서 후반엔 한 입·필살기에 뭐든 한방 (11층 보통 쥐가 0.4대) → 3.6: 보통 쥐가 2~4대는 쳐야 부서짐
const WALL_GROW = 4.6, ITEM_GROW = 3.6, VALUE_GROW = 1.8;
const wallBase = f => 1000 * Math.pow(WALL_GROW, f - 1);
// 보스 체력은 벽이 아니라 쥐 DPS 성장(층당 약 ×2.8, 시뮬 측정)에 맞춤: 도착 직후엔 60초에 조금 모자라게(보통 첫 도전 실패 → 파밍 후 재도전)
const BOSS_HP0 = 2.5e7, BOSS_GROW = 2.8;
const bossHP = f => BOSS_HP0 * Math.pow(BOSS_GROW, f - BOSS_EVERY);
// 층별 적정 전투력(찍찍!!) = 이 정도는 있어야 계단 벽을 뚫음. 밸런스 시뮬(dev/sim_browser.js)에서 층을 깬 순간의 전투력에 맞춘 곡선
// 층별 적정 찍찍!! = POW_NEED0 × POW_NEED_GROW^(층-1). 벽 체력·벽 게이트(game.js wallGate)·고양이 체력이 전부 이 값 기준.
// ×4 는 가혹했음(사용자): 시뮬 25분에 무리 전투력은 층마다 ≈×3.5 늘지만 층당 시간이 1→4분으로 늘어 9층에서 적정의 35~75%에 막힘 → ×3.3
const POW_NEED0 = 2000, POW_NEED_GROW = 3.3;
// 로그라이크 초반 허들: 첫 판(스킬 없음·쥐 30마리 ≈ 찍찍!! 350)도 1층은 넘게 1~3층 적정을 낮춤 (4층부터 그대로)
const POW_EARLY = [0.2, 0.45, 0.75];
const powNeed = f => POW_NEED0 * Math.pow(POW_NEED_GROW, f - 1) * (POW_EARLY[f - 1] ?? 1);

// ── 층 들어가기 ──
function enterFloor(f, why) {
  S.floor = Math.max(1, f); S.maxFloor = Math.max(S.maxFloor || 1, S.floor);
  genLayout(S.floor);
  OPEN = new Set(['0,0']); S.open = ['0,0']; S.walls = {};
  G.items = []; G.mess = {}; G.humans = []; G.traps = []; G.cat = null; G.boss = null; G.bossFight = null; G.bossShots = [];
  G.pickups = []; G.bombs = []; G.parcels = []; G.climbAsk = false; G.waveT = 20; G.catT = rand(35, 60);
  const cx = RW / 2, cy = RH / 2;
  for (const r of G.rats) { if (r.ultOn) continue; r.x = cx + rand(-RW * 0.3, RW * 0.3); r.y = cy + rand(-RH * 0.25, RH * 0.25); r.vx = r.vy = 0; r.z = 0; r.vz = 0; r.stun = 0; r.flee = 0; r.trick = null; if (r.act) endAct(r); }
  G.rats = G.rats.filter(r => !r.temp);
  buildGrids();
  furnishRoom(0, 0);
  for (let n = 0; n < zoneCap(); n++) spawnInRoom(0, 0, true);
  spawnHumans(0, 0, S.floor === 1 ? 1 : 2);
  if (isBossFloor(S.floor) && !(S.bossBeat || {})[S.floor]) G.boss = makeBoss(S.floor);
  G.cam.x = cx - viewW() / 2; G.cam.y = cy * TILT - viewH() / 2; clampCam();
  const z = floorZone(S.floor);
  if (why !== 'load') S.timeLeft = floorTime(S.floor);       // meta.js: 층마다 제한시간 (못 찾으면 게임 오버)
  if (why === 'kick') bigBanner(`😵 ${S.floor}층으로 쫓겨났다…`, '물건을 부숴 강화하고 계단에서 재도전!', '#e8a3a0');
  else if (why !== 'load') bigBanner(`🏢 ${S.floor}층 · ${z.name}`, isBossFloor(S.floor) && G.boss ? `⚠ 보스 층! 계단 방에 ${bossOf(S.floor).name}` : '계단 방 벽을 부숴라!', isBossFloor(S.floor) ? '#e8786a' : '#f0c878');
  writeSave();
}
// ── 가구 배치: 방마다 테마 하나 (층·방 번호 시드라 같은 층은 늘 같은 배치). 좌표는 방 안 비율 (u 가로, v 세로 · v 가 작을수록 뒷벽) ──
// 선반·사물함처럼 벽에 붙는 건 뒷벽(v≈0.1), 탁자·의자·침대는 가운데. 계단 방은 계단을 가리지 않게 가구 없음
const FURN_THEMES = {
  lab: [['shelf', 0.18, 0.1], ['shelf', 0.36, 0.1], ['fridge', 0.86, 0.12], ['table', 0.55, 0.58], ['chair', 0.44, 0.74], ['chair', 0.67, 0.74]],
  office: [['bookshelf', 0.16, 0.1], ['cabinet', 0.32, 0.12], ['plant', 0.9, 0.12], ['desk', 0.68, 0.36], ['chair', 0.68, 0.52], ['desk', 0.28, 0.72], ['chair', 0.28, 0.86]],
  breakroom: [['vending', 0.14, 0.12], ['fridge', 0.28, 0.12], ['sofa', 0.66, 0.14], ['plant', 0.9, 0.14], ['table', 0.5, 0.62], ['chair', 0.36, 0.62], ['chair', 0.64, 0.62]],
  nap: [['locker', 0.7, 0.1], ['locker', 0.8, 0.1], ['cot', 0.26, 0.34], ['cot', 0.26, 0.72], ['cabinet', 0.9, 0.12], ['plant', 0.9, 0.82]],
  storage: [['shelf', 0.14, 0.1], ['shelf', 0.32, 0.1], ['shelf', 0.5, 0.1], ['locker', 0.78, 0.1], ['cabinet', 0.9, 0.12], ['shelf', 0.84, 0.64]],
};
function furnishRoom(i, j) {
  if (isStairsRoom(i, j)) return;
  const rnd = seeded(S.floor * 131 + i * 17 + j * 71 + 5), names = Object.keys(FURN_THEMES);
  const theme = i === 0 && j === 0 ? 'lab' : names[Math.floor(rnd() * names.length)];
  const x0 = i * RW + WM + 60, y0 = j * RH + WM + 60, w = RW - 2 * (WM + 60), h = RH - 2 * (WM + 60) - 20;
  for (const [f, u, v] of FURN_THEMES[theme]) {
    if (rnd() < 0.15) continue;                          // 가끔 하나씩 빠져서 방마다 조금씩 다름
    const it = makeItem('furn_' + f, x0 + (u + (rnd() - 0.5) * 0.04) * w, y0 + v * h, i, j);
    it.appear = 1; G.items.push(it);
    const g = key(it.x, it.y); let a = itemGrid.get(g); if (!a) itemGrid.set(g, a = []); a.push(it);
  }
}
// 가구가 부서질 때: 쿵 + 안에 든 작은 물건들이 우르르 (선반·냉장고·자판기)
function furnSmash(it) {
  if (onScreen(it.x, it.y)) { addShake(0.25); dust(it.x, it.y, 10, 1.6); Sfx.thump(1.3); popup(it.x, it.y, pick(['와장창!!', '쿠당탕!!', '콰직!!']), '#fff', 26, 0.9, 80); }
  const [i, j] = roomOf(it.x, it.y);
  for (const k of it.type.drop || []) {
    const o = makeItem(k, it.x + rand(-30, 30), it.y + rand(-20, 20), i, j); o.appear = 1; o.z = 40; G.items.push(o);
    launch(o, rand(0, 6.28), rand(160, 300), false); o.vz *= 0.8; o.by = it.by;     // 쏟아진 물건도 날아가서 부딪힘
  }
}
// 방이 새로 열렸을 때 (breakWall 에서 호출)
function onRoomOpen(i, j) {
  if (isStairsRoom(i, j)) {
    if (G.boss && G.boss.state === 'wait') startBossFight();
    else bigBanner('🪜 계단 발견!', `계단에 닿으면 ${S.floor + 1}층으로`, '#9dd5a8');
  } else spawnHumans(i, j, 1 + (Math.random() < 0.5 ? 1 : 0));
  if (S.floor >= 2 && !isStairsRoom(i, j)) spawnTraps(i, j, Math.random() < 0.35 ? 2 : 1);
}

// ── 계단 · 보스 전투 · 층 이동 ──
function startBossFight() {
  const b = G.boss; b.state = 'fight'; b.t = 0;
  G.bossFight = { t: BOSS_TIME, max: BOSS_TIME };
  const def = b.boss;
  bigBanner(`👹 ${def.name}`, `"${def.title}" · 제한시간 안에 쓰러뜨려라!`, '#e8786a');
  b.say = { text: def.title, t: 2.4 };
  flash('#e8786a', 0.3); addShake(0.4); Sfx.boom(1.2); Sfx.comboWord();
  G.cam.x = b.x - viewW() / 2; G.cam.y = b.y * TILT - viewH() / 2; clampCam(); G.userCamT = G.t;
}
function updateStage(dt) {
  updatePower(dt);
  updateRunTimer(dt); updateGameOver(dt); updateHeist(dt);   // meta.js: 층 제한시간 · 게임 오버 습격 · 클리어 탈취 연출
  // 층 이동 연출 (까맣게 → 층 바꾸기 → 밝아짐)
  if (G.trans) {
    const T = G.trans; T.t += dt;
    if (!T.done && T.t >= T.dur / 2) { T.done = true; enterFloor(T.to, T.why); }
    if (T.t >= T.dur) G.trans = null;
    return;
  }
  // 보스 전용 제한시간은 없음 (사용자): 보스가 있든 없든 층(스테이지) 제한시간 하나 — meta.js updateRunTimer. 보스 층은 제한시간이 그만큼 김
  // 계단: 방이 열렸고 보스가 없으면, 쥐가 닿는 순간 위층으로
  if (!isOpen(...STAIRS) || (G.boss && G.boss.state !== 'dead') || G.ult || G.sj || G.go || G.heist) { G.climbAsk = false; return; }
  const sp = stairsPos(), touch = G.rats.some(r => !r.temp && !r.ultOn && Math.abs(r.x - sp.x) < 110 && Math.abs(r.y - sp.y) < 60);
  if (!touch) return;
  climb();
}
function climb() {
  if (G.trans || G.heist || G.go) return;
  G.climbAsk = false;
  const to = S.floor + 1;
  if (S.bossFail === to) S.bossFail = 0;
  startHeist();                         // meta.js: "연구 자료를 훔쳤다!!! 빨리 도망가!!!" → 끝나면 층 이동 (G.trans)
  const sp = stairsPos();
  for (const r of G.rats) if (onScreen(r.x, r.y)) { r.rushT = 1.5; r.noBreed = 1.5 + RUSH_NO_BREED; r.rushLock = 2; }
  G.rush = { x: sp.x, y: sp.y, t: 1.5, max: 1.5 };
  Sfx.clear(); Sfx.dash();
}
// 테스트: 보스 버튼 → 보스 4종을 차례로 화면 가운데에 소환해서 바로 전투 (쫓겨나거나 층 기록이 바뀌지 않음)
function testBoss() {
  if (G.trans || G.bossFight || G.sj || (G.ult && G.ult.phase === 'cut')) return false;
  G.bossTestN = ((G.bossTestN ?? -1) + 1) % BOSSES.length;
  const cx = G.cam.x + viewW() / 2, cy = (G.cam.y + viewH() / 2) / TILT, [i, j] = roomOf(cx, cy);
  if (!isOpen(i, j)) return false;
  if (G.boss && G.boss.state === 'wait') { G.bossStash = G.boss; G.humans = G.humans.filter(h => h !== G.boss); }
  const b = makeBoss(Math.max(S.floor, BOSS_EVERY), BOSSES[G.bossTestN], cx, cy + 60);
  b.test = true; b.appear = 0; G.boss = b; smoke(b.x, b.y);
  startBossFight();
  return true;
}
function endBossTest(b) {
  if (!b.test) return;
  G.boss = G.bossStash || null; G.bossStash = null;
  if (G.boss) G.humans.push(G.boss);
}
// 계단 그림 (방 위쪽 벽에 붙어 있음)
function drawStairs() {
  const sp = stairsPos(), open = isOpen(...STAIRS);
  ctx.save(); ctx.translate(sp.x, sp.y * TILT + 30);
  if (!drawArt(ctx, 'w:stairs', 230)) {
    ctx.fillStyle = '#a9a39a'; for (let i = 0; i < 6; i++) { ctx.fillRect(-90 + i * 6, -20 - i * 22, 180 - i * 12, 22); ctx.fillStyle = i % 2 ? '#a9a39a' : '#b9b1a6'; }
  }
  if (open && !(G.boss && G.boss.state !== 'dead')) {
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(G.t * 5); ctx.fillStyle = '#fff3bf';
    ctx.font = "700 26px 'IBM Plex Sans KR', sans-serif"; ctx.textAlign = 'center';
    ctx.fillText(G.climbAsk ? '👹 재도전 버튼을 눌러요' : '▲ 위층으로', 0, -250);
  }
  ctx.restore();
}
// 전투력 (단위: 찍찍!!) = 무리 전체의 갉는 힘 합. HUD 의 난동 등급 옆 칸에 표시(ui.js), 오르면 "+N 찍찍!"
function ratPower() { let p = 0; for (const r of G.rats) if (!r.temp) p += ratDamage(r); return p; }
function updatePower(dt) {
  if ((G.powT = (G.powT || 0) - dt) > 0) return;
  G.powT = 0.5;
  const p = ratPower(), old = G.power;
  G.power = p;
  if (old && p > old * 1.001) G.powGain = { v: p - old, n: (G.powGain ? G.powGain.n : 0) + 1 };   // ui.js hud 가 "+N 찍찍!" 로 보여줌
}
// 소품 이미지 그리기 (기준점 가운데 아래). 없으면 false
function drawArt(g, key, w, flip) { const im = IMG['art_' + key]; if (!im) return false; const h = w * im.height / im.width; g.save(); if (flip) g.scale(-1, 1); g.drawImage(im, -w / 2, -h, w, h); g.restore(); return true; }
// 보스 UI (화면 위쪽) + 층 이동 페이드
function drawStageUI() {
  const b = G.boss, bf = G.bossFight;
  if (b && (b.state === 'fight' || (b.state === 'dying' && b.t < 1))) {
    const def = b.boss, k = clamp(b.hp / b.hpMax, 0, 1), bw = 520, x = W / 2 - bw / 2, y = 150;
    ctx.save();
    rr(ctx, x - 14, y - 34, bw + 28, 62, 14); ctx.fillStyle = 'rgba(40,32,36,.82)'; ctx.fill();
    ctx.font = "700 17px 'IBM Plex Sans KR', sans-serif"; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`👹 ${def.name}`, x, y - 16);
    if (S.inRun) { const tt = Math.ceil(S.timeLeft); ctx.textAlign = 'right'; ctx.fillStyle = tt < 30 ? (Math.sin(G.t * 12) > 0 ? '#e8786a' : '#fff') : '#fff3bf'; ctx.fillText(`⏳ ${Math.floor(tt / 60)}:${String(tt % 60).padStart(2, '0')}`, x + bw, y - 16); }   // 층 제한시간
    rr(ctx, x, y, bw, 14, 7); ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fill();
    rr(ctx, x, y, bw * k, 14, 7); ctx.fillStyle = def.col; ctx.fill();
    if (b.hitT > 0) { ctx.globalAlpha = b.hitT * 3; rr(ctx, x, y, bw * k, 14, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  drawHeist(); drawGameOverFx();          // meta.js: "연구 자료를 훔쳤다!!!" · 일망타진
  if (G.trans) {
    const T = G.trans, k = T.t < 0 ? 0 : clamp(1 - Math.abs(T.t - T.dur / 2) / (T.dur / 2), 0, 1) * 1.4;
    ctx.fillStyle = `rgba(20,16,20,${clamp(k, 0, 1)})`; ctx.fillRect(0, 0, W, H);
    if (k > 0.6) { ctx.save(); ctx.globalAlpha = clamp((k - 0.6) * 3, 0, 1); outlined(T.why === 'kick' ? `😵 ${T.to}층으로…` : `🪜 ${T.to}층으로!`, W / 2, H / 2, 54, '#fff3bf'); ctx.restore(); }
  }
}
