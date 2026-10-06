'use strict';
// ───────────────────────── 로그라이크 메타 (2026-10-02) ─────────────────────────
// 기본 메카닉(번식·갉기·벽·층)은 그대로, 한 판(런) 단위로:
//   · 층마다 제한시간(floorTime) 안에 계단에 닿아야 함. 못 하면(또는 보스 시간 초과) 고양이·경비원 습격 → 게임 오버
//   · 게임 오버 → 그 판의 쥐(수·등급)·층·방은 초기화. 치즈·📑 연구자료·공용 스킬·🏅 티어·쥐 조각 강화·도감은 유지
//   · 🏅 티어(쥐 등급 TIERS 와 별개): 연구자료 + 조건(최고 층·조각 강화 합·공용 스킬 합)으로 강화 →
//     쥐 종·공용 스킬 해금, 높은 등급 탄생 확률↑(예전 난동 등급 대체), 시작 층 선택 폭↑, 시작 마릿수↑
//   · 층 클리어 = "📑 연구 자료를 훔쳤다!!! 빨리 도망가!!!" + 연구자료 대량. 물건 파괴는 치즈 위주(가끔 연구자료 조금)
//   · 쥐 조각: 인게임에선 모이기만 하고, 강화(S.rlv)는 로비에서 (개별 / 일괄)
// 저장 필드: S.rank · S.research · S.rlv · S.inRun · S.timeLeft · S.runResearch · S.runStart · S.runBest

// ── 티어 ── need: floor = 최고 도달 층, shard = 쥐 조각 강화 레벨 합, skill = 공용 스킬 레벨 합
const RANKS = [
  { icon: '🐭', name: '실험체', cost: 0, need: {} },
  { icon: '🧀', name: '치즈 도둑', cost: 10, need: { floor: 2, shard: 2, skill: 15 } },
  { icon: '🔦', name: '하수구 정찰병', cost: 40, need: { floor: 4, shard: 8, skill: 50 } },
  { icon: '🗝️', name: '탈출 설계자', cost: 140, need: { floor: 7, shard: 22, skill: 110 } },
  { icon: '📋', name: '연구소 브로커', cost: 360, need: { floor: 10, shard: 40, skill: 170 } },
  { icon: '🎖️', name: '반란 지휘관', cost: 850, need: { floor: 13, shard: 65, skill: 240 } },
  { icon: '👑', name: '쥐들의 왕', cost: 1900, need: { floor: 16, shard: 95, skill: 320 } },
  { icon: '🌌', name: '전설의 탈옥왕', cost: 4200, need: { floor: 20, shard: 135, skill: 410 } },
];
const RANK_MAX = RANKS.length;
// 티어 배지 (rats/dev/art_list.mjs ROGUE_ART 'rk:N'): 이미지가 있으면 <img>, 없으면 이모지
const rankBadge = (r, cls = 'rk-badge') => (typeof RAT_ART !== 'undefined' && RAT_ART.prop['rk:' + r] ? `<img class="${cls}" src="../assets/rats/${RAT_ART.prop['rk:' + r]}.png" alt="${RANKS[r - 1].icon}">` : RANKS[r - 1].icon);
const rankOf = () => clamp(S.rank || 1, 1, RANK_MAX);
const startCount = (r = rankOf()) => 6 + 2 * (r - 1);                          // 시작 마릿수 (첫 판부터 1층은 넘길 수 있게 3 → 6)
const startFloorCap = (r = rankOf()) => Math.max(1, Math.min(1 + 2 * (r - 1), S.maxFloor || 1));   // 고를 수 있는 시작 층 (최고 기록까지)
const rankOddsK = (r = rankOf()) => 1 + 0.25 * (r - 1);                       // 높은 등급 탄생 보정 (game.js tierWeights): 훈장 1 신화 ≈0.0017% → 훈장 8 ≈0.24%

// ── 해금 훈장 ── 등급으로 나누지 않음: 훈장 1 에도 모든 등급의 쥐가 조금씩 있고, 훈장이 오를수록 등급마다 더 열림
// UNLOCK_START[등급] = 훈장 1 에서 열리는 비율 → 훈장 8 에서 100%. 등급 안의 순서 = 먼저 열리는 순 (높은 등급은 필살기가 덜 화려한 쪽부터)
const UNLOCK_START = [0.4, 0.35, 0.3, 0.25, 0.2, 0.15];
const UNLOCK_ORDER = {
  3: ['cyborg', 'soldier', 'astro', 'zombie', 'dino', 'dragon', 'ballerina', 'detective', 'hero', 'ghost', 'angel'],
  4: ['cosmic', 'ratking', 'santa', 'samurai', 'plaguerat', 'wizard', 'viking', 'ratqueen', 'vampire', 'robot', 'rocker'],
  5: ['parkrat', 'zapham', 'starchef', 'knight', 'alien', 'sultan', 'emperor', 'pharaoh', 'ramjui', 'streamrat', 'jwerry'],
};
const SPECIES_RANK = {};
(() => {
  for (let t = 0; t < TIERS.length; t++) {
    const ord = UNLOCK_ORDER[t] || [], idx = id => (ord.includes(id) ? ord.indexOf(id) : 99);
    const list = RSPECIES.filter(s => s.tier === t).map((s, i) => [s, i]).sort((a, b) => idx(a[0].id) - idx(b[0].id) || a[1] - b[1]).map(x => x[0]);
    const n = list.length, st = UNLOCK_START[t];
    list.forEach((s, i) => { let r = 1; while (r < 8 && i >= Math.ceil(n * (st + (1 - st) * (r - 1) / 7))) r++; SPECIES_RANK[s.id] = r; });
  }
})();
const speciesUnlocked = id => (SPECIES_RANK[id] || 1) <= rankOf();
// 이름·그림을 보여 주는 기준: 훈장으로 해금됐고 + 이 세이브에서 만난 적 있는 쥐만 (아니면 실루엣 ???)
const ratKnown = id => !!S.seen[id] && speciesUnlocked(id);
// 공용 스킬: 기본 가지는 티어 1, 깊은 노드일수록 높은 티어
const SKILL_RANK = {
  critc: 2, caffeine: 2, mutate: 2, combo: 2, stock: 2, trapsafe: 2, cannon: 2, axel: 2,
  gym: 3, zap: 3, twins: 3, truck: 3, catnip: 3, offline: 3, ultcd: 3,
  chainx: 4, furnd: 4, meteor: 4, frenzy: 4, goldx: 4, windmill: 4, tumble: 4, sjump: 4,
  hitstun: 5, bossd: 5,
};
const skillUnlocked = id => (SKILL_RANK[id] || 1) <= rankOf();
// 등급 t 에서 해금된 종 하나 (없으면 아래 등급으로)
function pickSpecies(t) {
  for (let k = t; k >= 0; k--) { const l = RSPECIES.filter(s => s.tier === k && speciesUnlocked(s.id)); if (l.length) return pick(l); }
  return RSPECIES[0];
}
const tierAvailable = t => RSPECIES.some(s => s.tier === t && speciesUnlocked(s.id));

// ── 티어 강화 조건 ──
const shardSum = () => Object.values(S.rlv || {}).reduce((a, b) => a + b, 0);
const skillSum = () => Object.values(S.skills).reduce((a, b) => a + b, 0);
function rankReqs(r = rankOf()) {
  const nx = RANKS[r]; if (!nx) return null;                         // r = 지금 티어(1부터) → 다음 = RANKS[r]
  const n = nx.need;
  return [
    { k: 'research', label: '📑 연구자료', have: S.research || 0, need: nx.cost, pay: true },
    n.floor && { k: 'floor', label: '🏢 최고 도달 층', have: S.maxFloor || 1, need: n.floor, unit: '층' },
    n.shard && { k: 'shard', label: '⭐ 쥐 조각 강화 합계', have: shardSum(), need: n.shard, unit: 'Lv' },
    n.skill && { k: 'skill', label: '🌳 공용 스킬 레벨 합계', have: skillSum(), need: n.skill, unit: 'Lv' },
  ].filter(Boolean).map(q => ({ ...q, ok: q.have >= q.need }));
}
function rankUp() {
  const q = rankReqs(); if (!q || !q.every(x => x.ok)) return false;
  S.research -= RANKS[rankOf()].cost; S.rank = rankOf() + 1;
  writeSave(); return true;
}
// 이번 티어로 새로 열리는 것 (로비 미리보기)
function rankUnlocks(r) {
  return { species: RSPECIES.filter(s => (SPECIES_RANK[s.id] || 1) === r), skills: RSKILLS.filter(s => (SKILL_RANK[s.id] || 1) === r) };
}

// ── 연구자료 ── 층 클리어 = 대량(보스 층 ×3), 물건 = 가끔 조금
const researchFor = f => Math.round(6 * Math.pow(1.45, f - 1)) * (isBossFloor(f) ? 3 : 1);
function earnResearch(n, x, y) {
  if (!n) return;
  S.research = (S.research || 0) + n; S.runResearch = (S.runResearch || 0) + n;
  if (x !== undefined && onScreen(x, y)) popup(x, y, `📑+${n}`, '#bfe8ff', 18, 0.9, 60);
}
function researchDrop(it) {           // game.js smashItem 에서: 가구 12% (1~3), 물건 1.2% (1)
  if (!S.inRun) return;
  if (it.type.furn) { if (Math.random() < 0.12) earnResearch(1 + Math.floor(Math.random() * 3), it.x, it.y); }
  else if (Math.random() < 0.012) earnResearch(1, it.x, it.y);
}

// ── 쥐 조각 강화 (아웃게임) ── S.shard = 모은 조각 합, S.rlv = 강화한 레벨 (로비에서 조각을 써서 올림)
const ratLv = id => (S.rlv && S.rlv[id]) || 0;
function shardAvail(id) { const sp = RSPECIES_BY_ID[id]; return sp ? (S.shard[id] || 0) - shardsFor(sp.tier, ratLv(id)) : 0; }
function canUpgradeRat(id) { const sp = RSPECIES_BY_ID[id], L = ratLv(id); return !!sp && L < RAT_MAX_LV && shardAvail(id) >= shardNeed(sp.tier, L); }
function upgradeRat(id) { if (!canUpgradeRat(id)) return false; (S.rlv = S.rlv || {})[id] = ratLv(id) + 1; applyShards(id); return true; }
function upgradeAllRats() { let n = 0; for (const id of Object.keys(S.seen)) while (canUpgradeRat(id)) { upgradeRat(id); n++; } if (n) writeSave(); return n; }
const upgradableCount = () => Object.keys(S.seen).filter(canUpgradeRat).length;

// ── 제한시간 ── 방이 많을수록 · 보스 층은 보스전 시간만큼 더
const floorTime = f => Math.round(190 + 35 * LAYOUT.size + (isBossFloor(f) ? BOSS_TIME + 30 : 0));
function updateRunTimer(dt) {
  if (!S.inRun || G.go || G.trans || G.heist || G.ult || G.sj) return;
  const before = S.timeLeft;
  S.timeLeft -= dt;
  for (const w of [60, 30, 10]) if (before > w && S.timeLeft <= w) { bigBanner(`⏳ ${w}초 남았다!`, '계단 방을 찾아라!! 경비원이 오고 있다', '#e8786a'); Sfx.deny(); flash('#e8786a', 0.15); }
  if (S.timeLeft < 10 && Math.floor(before) !== Math.floor(S.timeLeft)) Sfx.knock();
  if (S.timeLeft <= 0) { S.timeLeft = 0; startGameOver('time'); }
}

// ── 런 시작 / 끝 ──
function startRun(floor) {
  floor = clamp(floor | 0, 1, startFloorCap());
  S.inRun = true; S.runResearch = 0; S.runStart = floor; S.runBest = floor; S.bossFail = 0; S.bossBeat = {};
  G.go = null; G.heist = null; G.trans = null; G.ult = null; G.sj = null; G.rats = [];
  enterFloor(floor, 'start');
  // 시작 쥐: 티어만큼, 등급도 탄생처럼 굴림 (티어가 높으면 처음부터 높은 등급이 나올 수 있음). 조각은 안 줌
  const cx = RW / 2, cy = RH / 2;
  for (let i = 0; i < startCount(); i++) {
    const sp = pickSpecies(rollTier(0)), r = makeRat(sp.id, cx + rand(-RW * 0.3, RW * 0.3), cy + rand(-RH * 0.25, RH * 0.25));
    r.born = 1; r.breedCD = breedCool();
    G.rats.push(r);
    if (!S.seen[sp.id]) { S.seen[sp.id] = true; S.fresh[sp.id] = true; }
    applyShards(sp.id);
  }
  buildGrids();
  G.running = true; S.started = true;
  writeSave();
}
function endRun() {
  S.inRun = false; S.herd = []; S.floor = 1; S.open = ['0,0']; S.walls = {}; S.timeLeft = 0; S.bossFail = 0;
  G.rats = []; G.go = null; G.heist = null; G.running = false; G.items = []; G.humans = []; G.cat = null; G.boss = null; G.bossFight = null;
  writeSave();
}

// ── 층 클리어 연출: 연구 자료를 훔쳤다!!! 빨리 도망가!!! (stage.js climb 에서) ──
function startHeist() {
  const n = researchFor(S.floor), sp = stairsPos();
  G.heist = { t: 0, n };
  earnResearch(n);
  S.runBest = Math.max(S.runBest || 1, S.floor + 1);
  for (let i = 0; i < 14; i++) later(i * 0.06, () => { popup(sp.x + rand(-160, 160), sp.y + rand(-40, 60), '📑', '#fff', 26, 1.1, 60 + rand(0, 120)); });
  flash('#e8786a', 0.35); addShake(0.25); Sfx.comboWord(); Sfx.clear();
}
function updateHeist(dt) {
  const h = G.heist; if (!h) return;
  h.t += dt;
  if (h.t >= 2.2 && !h.moved) { h.moved = true; G.trans = { t: 0, dur: 1.6, to: S.floor + 1, why: 'up' }; }
  if (h.t >= 2.7) G.heist = null;
}
function drawHeist() {
  const h = G.heist; if (!h) return;
  const k = h.t, a = k < 0.15 ? k / 0.15 : k > 1.9 ? Math.max(0, 1 - (k - 1.9) / 0.3) : 1;
  ctx.save();
  // 경보: 빨간 테두리 깜빡
  const pulse = 0.5 + 0.5 * Math.sin(G.t * 16);
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  g.addColorStop(0, 'rgba(232,80,70,0)'); g.addColorStop(1, `rgba(232,80,70,${0.45 * pulse * a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  const s1 = k < 0.2 ? 1.6 - k * 3 : 1;
  ctx.save(); ctx.translate(W / 2, H * 0.24); ctx.scale(s1, s1); ctx.rotate(-0.03); comicText('📑 연구 자료를 훔쳤다!!!', 0, 0, 52, '#fff3bf', '#3c322d'); ctx.restore();
  if (k > 0.45) { const s2 = k < 0.6 ? 1.5 - (k - 0.45) * 3.3 : 1; ctx.save(); ctx.translate(W / 2, H * 0.34); ctx.scale(s2, s2); ctx.rotate(0.03 + Math.sin(G.t * 30) * 0.01); comicText('빨리 도망가!!!', 0, 0, 64, '#e8786a', '#3c322d'); ctx.restore(); }
  if (k > 0.8) comicText(`📑 +${fmt(h.n)}`, W / 2, H * 0.43, 30, '#bfe8ff', '#3c322d');
  drawSirens(a);
  // 훔친 자료 뭉치 (가운데 아래에서 통통) + 화면을 가로지르는 종이들
  const im = IMG['art_g:docs'];
  if (im) { const bw = 190, bh = bw * im.height / im.width, by = H * 0.62 - Math.abs(Math.sin(k * 7)) * 26 * Math.max(0, 1 - k / 1.6), sc = k < 0.25 ? k / 0.25 : 1; ctx.save(); ctx.translate(W / 2, by); ctx.rotate(Math.sin(k * 5) * 0.08); ctx.scale(sc, sc); ctx.drawImage(im, -bw / 2, -bh / 2, bw, bh); ctx.restore(); }
  const pp = IMG['art_g:paper'];
  if (pp) for (let i = 0; i < 12; i++) { const u = (k * (0.35 + (i % 4) * 0.08) + i * 0.137) % 1, x = (i % 2 ? u : 1 - u) * (W + 160) - 80, y = H * (0.18 + ((i * 0.29) % 0.7)) + Math.sin(k * 6 + i) * 30, s = 46 + (i % 3) * 12, ph = s * pp.height / pp.width; ctx.save(); ctx.translate(x, y); ctx.rotate(k * (i % 2 ? 3 : -3) + i); ctx.drawImage(pp, -s / 2, -ph / 2, s, ph); ctx.restore(); }
  ctx.restore();
}

// 경보등 (화면 위 양쪽): 빙글 도는 빛 (이미지 'g:siren' 이 있을 때만)
function drawSirens(a) {
  const im = IMG['art_g:siren']; if (!im) return;
  for (const sx of [70, W - 70]) {
    const sy = H * 0.56, rot = G.t * 7 + (sx > W / 2 ? Math.PI : 0);
    ctx.save(); ctx.globalAlpha = a * 0.35; ctx.fillStyle = '#ff6a5a';
    ctx.beginPath(); ctx.moveTo(sx, sy - 30); ctx.arc(sx, sy - 30, 260, rot - 0.25, rot + 0.25); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha = a; const w = 74, h = w * im.height / im.width; ctx.drawImage(im, sx - w / 2, sy - h, w, h); ctx.restore();
  }
}
// ── 게임 오버: 고양이·경비원이 몰려와 일망타진 → "잡혀버리고 말았다…" ──
function startGameOver(why) {
  if (G.go || !S.inRun) return;
  const vr = viewRect(0), w = vr.x1 - vr.x0, h = vr.y1 - vr.y0;
  G.go = { t: 0, why, guards: [], cats: [], shown: false };
  G.bossFight = null; G.rush = null; G.climbAsk = false;
  const edge = () => { const s = Math.floor(Math.random() * 4); return s === 0 ? [vr.x0 - 60, vr.y0 + Math.random() * h] : s === 1 ? [vr.x1 + 60, vr.y0 + Math.random() * h] : s === 2 ? [vr.x0 + Math.random() * w, vr.y0 - 40] : [vr.x0 + Math.random() * w, vr.y1 + 60]; };
  // 고양이·경비원이 '잔뜩' (사용자): 쥐가 많을수록 더 많이, 화면 사방에서
  const nG = Math.min(24, 12 + Math.floor(ratCount() / 4)), nC = Math.min(10, 5 + Math.floor(ratCount() / 10));
  for (let i = 0; i < nG; i++) { const [x, y] = edge(), g = makeHuman('guard', x, y); g.appear = 1; g.raid = true; g.state = 'walk'; g.spd = rand(230, 300); g.say = i < 3 ? { text: pick(['저기 있다!!', '전원 포획!!', '한 마리도 놓치지 마!']), t: 1.6 } : null; G.go.guards.push(g); G.humans.push(g); }
  for (let i = 0; i < nC; i++) { const [x, y] = edge(); G.go.cats.push({ kind: pick(REAL_CATS), special: null, x, y, z: 0, vz: 0, face: 1, t: 0, alpha: 1, jit: 0, walk: 0, state: 'prowl', cd: 1, castT: 0, rot: 0, spd: rand(330, 400), hop: rand(0, 1) }); }
  for (const r of G.rats) { r.rushT = 0; r.flee = 6; r.noBreed = 99; }
  flash('#e8786a', 0.5); addShake(0.4); Sfx.boom(1.2); Sfx.deny();
  bigBanner(why === 'boss' ? '👹 보스에게 당했다!' : '⏰ 시간 초과!', '경비원과 고양이가 몰려온다!!', '#e8786a');
}
function updateGameOver(dt) {
  const go = G.go; if (!go) return;
  go.t += dt;
  const free = G.rats.filter(r => !r.caught && !r.temp);
  const nearest = (x, y) => { let b = null, bd = 1e9; for (const r of free) { const d = Math.hypot(r.x - x, r.y - y); if (d < bd) { bd = d; b = r; } } return b; };
  const catch1 = (r, by) => { r.caught = true; stunRat(r, 999); r.vx = r.vy = 0; r.flee = 0; if (onScreen(r.x, r.y) && Math.random() < 0.5) popup(r.x, r.y, pick(['잡았다!', '포획!', '찍?!']), '#fff', 16, 0.8, 40); if (onScreen(r.x, r.y)) { dust(r.x, r.y, 4, 0.8); Sfx.knock(); } };
  for (const g of go.guards) {
    const r = nearest(g.x, g.y); g.walk += dt * 12;
    if (!r) { g.state = 'walk'; continue; }
    const dx = r.x - g.x, dy = r.y - g.y, d = Math.hypot(dx, dy);
    g.face = dx >= 0 ? 1 : -1;
    if (d < 34) { catch1(r, g); if (Math.random() < 0.3) g.say = { text: pick(['한 마리 잡았다!', '가만히 있어!', '포획 완료!']), t: 0.8 }; }
    else { g.x += dx / d * g.spd * dt; g.y += dy / d * g.spd * dt; }
  }
  for (const c of go.cats) {
    const r = nearest(c.x, c.y); c.t += dt; c.walk += dt * 14;
    if (!r) continue;
    const dx = r.x - c.x, dy = r.y - c.y, d = Math.hypot(dx, dy);
    c.face = dx >= 0 ? 1 : -1;
    c.state = d < 140 ? 'pounce' : 'prowl';
    if (d < 40) { catch1(r, c); c.z = 0; }
    else { c.x += dx / d * c.spd * dt; c.y += dy / d * c.spd * dt; c.z = c.state === 'pounce' ? Math.abs(Math.sin((c.t + c.hop) * 8)) * 40 : 0; }
  }
  // 남은 쥐는 가장 가까운 습격자 반대쪽으로 도망
  for (const r of free) { let b = null, bd = 1e9; for (const a of [...go.guards, ...go.cats]) { const d = Math.hypot(a.x - r.x, a.y - r.y); if (d < bd) { bd = d; b = a; } } if (b && bd < 360) { r.flee = 1; r.fleeX = b.x; r.fleeY = b.y; } }
  // 화면 밖 쥐까지 다 기다리지 않고 4.5초 뒤 결과 화면 (그때까지 안 잡힌 쥐도 결국 잡힘)
  if (!go.shown && (go.t > 4.5 || (!free.length && go.t > 2.2))) { go.shown = true; for (const r of free) { r.caught = true; stunRat(r, 999); } UI.showGameOver(go.why); }
}
function gameOverSorted(list) {
  const go = G.go; if (!go) return;
  for (const c of go.cats) if (onScreen(c.x, c.y, 80)) list.push({ y: c.y, f: () => drawCat(c) });
  for (const r of G.rats) if (r.caught && onScreen(r.x, r.y)) list.push({ y: r.y + 0.5, f: () => drawCage(r) });
}
function drawCage(r) {
  const s = RAT_SCALE * TIERS[r.tier].size, w = 30 * s, h = 26 * s;
  if (IMG['art_g:cage']) { ctx.save(); ctx.translate(r.x, r.y * TILT); drawArt(ctx, 'g:cage', w * 1.5); ctx.restore(); return; }   // Codex 우리 이미지
  ctx.save(); ctx.translate(r.x, r.y * TILT);
  ctx.strokeStyle = 'rgba(70,64,60,.9)'; ctx.lineWidth = 2.2;
  for (let i = 0; i <= 5; i++) { const x = -w / 2 + w * i / 5; ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x, -h); ctx.stroke(); }
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w / 2 - 2, -h); ctx.lineTo(w / 2 + 2, -h); ctx.moveTo(-w / 2 - 2, 2); ctx.lineTo(w / 2 + 2, 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -h - 5, 5, Math.PI, 0); ctx.stroke();
  ctx.restore();
}
function drawGameOverFx() {
  const go = G.go; if (!go) return;
  const k = clamp(go.t / 1.2, 0, 1), pulse = 0.5 + 0.5 * Math.sin(G.t * 10);
  ctx.save();
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
  g.addColorStop(0, 'rgba(30,10,10,0)'); g.addColorStop(1, `rgba(120,20,20,${(0.35 + 0.15 * pulse) * k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `rgba(20,10,12,${0.25 * clamp((go.t - 2.5) / 2, 0, 1)})`; ctx.fillRect(0, 0, W, H);
  drawSirens(k);
  if (go.t < 3.2) { ctx.globalAlpha = clamp(go.t * 3, 0, 1) * clamp((3.2 - go.t) * 2, 0, 1); comicText('🚨 일망타진!!! 🚨', W / 2, H * 0.24, 56, '#e8786a', '#3c322d'); }
  ctx.restore();
}
