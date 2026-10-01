'use strict';
// ───────────────────────── 슈퍼 점프 ─────────────────────────
// 아주 낮은 확률로 화면 속 쥐 한 마리가 발동 (동시에 두 번은 안 됨). game.js 다음에 로드.
// ① 컷인: 화면 정지 + 만화 연출 → ② 기 모으기 → ③ 하늘 끝까지 슈웅(리신 버그처럼) → ④ 쾅! 착지
// → ⑤ 화면 속 쥐·물건이 전부 둥실 → ⑥ 물건·벽 한꺼번에 박살 → ⑦ 쥐들 착지, 게임 재개
const SJ_T = { cutin: 1.9, charge: 1.5, launch: 0.35, sky: 1.3, fall: 0.38, float: 1.5, drop: 1 };
const SJ_CHANCE = 1 / 480;      // 화면에 쥐가 있을 때 초당 확률 (평균 8분에 한 번)
const SJ_ITEM = 15;             // 슈퍼 점프 피해 = 쥐 공격력 × 15 — 단 화면 속 물건·사람·고양이는 체력과 상관없이 전부 박살 (sjBoom)
const SJ_COOL = 120;            // 한 번 터지면 최소 2분은 쉼 (첫 발동도 시작 1분 뒤부터)
const sjEase = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

function trySuperJump(dt) {
  if (G.sj || G.ult) return;
  G.sjCool = (G.sjCool ?? 60) - dt;
  // 스킬·도감 같은 창이 열려 있으면 안 보이니까 참았다가 나중에
  if (G.sjCool <= 0 && Math.random() < SJ_CHANCE * (1 + 0.25 * lv('sjump')) * dt && !document.querySelector('.screen:not(.hidden)')) startSuperJump(false);
}
function startSuperJump(forced) {
  if (G.sj || G.ult || !G.running) return false;
  const cx = G.cam.x + viewW() / 2, cy = (G.cam.y + viewH() / 2) / TILT;
  const pool = G.rats.filter(r => onScreen(r.x, r.y, -80)).sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
  if (!pool.length) return false;
  // 화면 가운데 쪽 쥐 중에서. 테스트 버튼(강제)은 가장자리 쪽 쥐 — 카메라가 그 쥐를 가운데로 데려오는 걸 확인할 수 있게
  const r = forced ? pick(pool.slice(Math.floor(pool.length / 2))) : pick(pool.slice(0, Math.max(1, Math.ceil(pool.length / 3))));
  r.trick = null; r.sleep = 0; r.vx = r.vy = r.vz = 0; r.z = 0; r.rushT = 0; r.bite = 0; r.speed = 0;
  for (const o of G.rats) if (o.act) endAct(o);
  G.bullets = [];
  G.sj = { r, phase: 'cutin', t: 0, zoom: 1, lineT: -1, lines: [], beat: 0, items: [], floaters: [], actors: [], walls: [] };
  G.sjCool = SJ_COOL; G.rush = null; G.banner = null; G.hitstop = 0;
  flash('#fff', 0.5); Sfx.comboWord(); Sfx.crit();
  return true;
}
function sjPhase(s, ph) { s.phase = ph; s.t = 0; }

function updateSuperJump(dt) {
  const s = G.sj, r = s.r;
  G.t += dt; s.t += dt;
  followCam(s, dt);                      // 그 쥐를 화면 가운데로 (game.js)
  const k = s.t / SJ_T[s.phase];
  switch (s.phase) {
    case 'cutin':
      r.pose = { ...RIG_IDLE };
      if (s.t > 0.3 && !s.slam) { s.slam = true; addShake(0.25); Sfx.boom(0.7); }
      if (k >= 1) { sjPhase(s, 'charge'); popup(r.x, r.y, '하아아아아앗!!!', '#fff3bf', 26, 1.4, 70); }
      break;
    case 'charge': {
      // 웅크리고 부들부들 + 기가 빨려 들어옴
      s.zoom = 1 + 0.55 * sjEase(k * 1.5);
      const e = Math.min(1, k * 2);
      r.pose = { front: 0.55 * e, farFront: 0.5 * e, back: -0.6 * e, farBack: -0.55 * e, bob: 6 * e, sy: 1 - 0.25 * e, sx: 1 + 0.12 * e, head: 0.3 * e, tail: -0.4 * e + Math.sin(G.t * 40) * 0.1, tilt: 0 };
      r.jit = 1.5 + 3 * k;
      for (let n = 0; n < 5; n++) {
        const a = rand(0, 6.28), d = rand(120, 230), life = rand(0.28, 0.4);
        particle({ x: r.x + Math.cos(a) * d, y: r.y + Math.sin(a) * d, z: rand(5, 60), vx: -Math.cos(a) * d / life, vy: -Math.sin(a) * d / life, life, max: life, size: rand(3, 6), color: pick(['#fff3bf', '#f0c878', '#fff']), type: 'spark', drag: 0 });
      }
      if ((s.beat -= dt) <= 0) { s.beat = 0.34 - 0.2 * k; ring(r.x, r.y, 60 + 60 * k, 'rgba(240,200,120,.9)', 0.3, 5); Sfx.thump(0.5 + k); addShake(0.02 + 0.05 * k); }
      if (k >= 1) {
        sjPhase(s, 'launch'); r.jit = 0;
        ring(r.x, r.y, 140, '#fff', 0.5, 12); ring(r.x, r.y, 220, 'rgba(240,200,120,.9)', 0.6, 8);
        dust(r.x, r.y, 18, 2); addShake(0.4); flash('#fff3bf', 0.35); Sfx.jump(); Sfx.boom(0.9);
        stampAt(r.x, r.y, m => { m.fillStyle = 'rgba(60,50,45,.35)'; m.beginPath(); m.ellipse(r.x, r.y, 46, 34, 0, 0, 6.28); m.fill(); });
      }
      break;
    }
    case 'launch':
      s.zoom = 1 + 0.55 * (1 - sjEase(k));
      r.z = k * k * 2400;
      r.pose = { front: 2.5, farFront: 2.3, back: -1.7, farBack: -1.5, head: -0.5, tail: -1.4, sx: 0.78, sy: 1.4, bob: 0, tilt: 0 };
      particle({ x: r.x, y: r.y, z: r.z * 0.6, vx: 0, vy: 0, life: 0.35, max: 0.35, size: 12, color: 'rgba(255,243,191,.9)', type: 'trail', drag: 0 });
      if (k >= 1) { sjPhase(s, 'sky'); r.z = 2600; }
      break;
    case 'sky':
      s.zoom = 1;
      if (!s.twinkle && s.t > 0.45) { s.twinkle = true; Sfx.clink(); }
      if (k >= 1) sjPhase(s, 'fall');
      break;
    case 'fall':
      // 머리부터 거꾸로 내리꽂힘
      r.z = 2600 * (1 - k * k);
      r.sjRot = r.face * 2.6;
      r.pose = { front: 2.6, farFront: 2.4, back: -2.2, farBack: -2, head: -0.6, tail: 1.4, sx: 0.85, sy: 1.3, bob: 0, tilt: 0 };
      particle({ x: r.x, y: r.y, z: r.z + 20, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 14, color: 'rgba(255,255,255,.9)', type: 'trail', drag: 0 });
      if (k >= 1) sjImpact(s);
      break;
    case 'float': {
      // 화면 속 모든 것이 둥실 (착지 지점부터 바깥으로 물결처럼)
      for (const f of s.items) { const it = f.it, e = sjEase((s.t - f.d) / 0.55); it.z = f.z0 + f.h * e + Math.sin(G.t * 3 + f.ph) * 6 * e; it.rot += f.vr * dt * e; }
      for (const f of s.floaters) {
        const o = f.r, e = sjEase((s.t - f.d) / 0.6);
        o.z = f.h * e + Math.sin(G.t * 3 + f.ph) * 5 * e;
        o.pose = { front: Math.sin(G.t * 14 + f.ph) * 1.4, farFront: Math.cos(G.t * 12 + f.ph) * 1.4, back: Math.sin(G.t * 13 + f.ph + 2) * 1.3, farBack: Math.cos(G.t * 11 + f.ph) * 1.3, head: -0.3, tail: 1.2 + Math.sin(G.t * 9) * 0.3 };
        o.sjRot = Math.sin(G.t * 2 + f.ph) * 0.5 * e;
      }
      // 사람·고양이도 둥실 (허우적대며 기우뚱)
      for (const f of s.actors) { const a = f.a, e = sjEase((s.t - f.d) / 0.6); a.z = f.z0 + f.h * e + Math.sin(G.t * 3 + f.ph) * 6 * e; a.sjRot = Math.sin(G.t * 2.2 + f.ph) * 0.35 * e; a.jit = 1.5 * e; }
      for (const w of s.walls) G.wallShake[w.key] = 1;
      G.shake = Math.max(G.shake, 0.12);
      if (k >= 1) sjBoom(s);
      break;
    }
    case 'drop':
      for (const f of s.floaters) {
        const o = f.r;
        if (o.z > 0 || o.vz > 0) { o.vz -= 1400 * dt; o.z = Math.max(0, o.z + o.vz * dt); if (o.z <= 0) { if (o.vz < -300) { o.vz *= -0.3; if (onScreen(o.x, o.y)) dust(o.x, o.y, 2, 0.5); } else o.vz = 0; } }
        if (o.z <= 0 && o.vz === 0 && !f.land) { f.land = true; o.pose = null; o.sjRot = 0; o.sq = 0.6; }
        if (o.pose) o.sjRot *= 0.9;
      }
      // 사람·고양이: 날아간 건 계속 날고, 남은 건 떨어져 착지
      for (const f of s.actors) {
        const a = f.a; a.jit = 0; a.sjRot = (a.sjRot || 0) * 0.9;
        if (a.z > 0 || a.vz > 0) { a.vz = (a.vz || 0) - 1500 * dt; a.z = Math.max(0, a.z + a.vz * dt); if (a.z <= 0 && a.state !== 'fly' && a.state !== 'flung') { a.vz = 0; if (onScreen(a.x, a.y)) dust(a.x, a.y, 3, 0.7); } }
      }
      // 발동한 쥐: 짠! 승리 포즈
      r.pose = s.t < 0.6 ? { front: 2.6, farFront: 2.3, back: -0.2, farBack: 0.2, head: -0.35, tail: 1.3, tilt: -0.35, bob: 0, sx: 1, sy: 1 } : null;
      if (k >= 1) sjEnd(s);
      break;
  }
  for (const k2 in G.wallShake) { if (!s.walls.some(w => w.key === k2)) { G.wallShake[k2] -= dt * 2; if (G.wallShake[k2] <= 0) delete G.wallShake[k2]; } }
  updateFx(dt);
}
function sjImpact(s) {
  const r = s.r;
  r.z = 0; r.sjRot = 0; r.sq = 0.5;
  r.pose = { front: 1.2, farFront: -0.6, back: -1.8, farBack: 1.4, head: 0.5, tail: 1.5, bob: 5, sy: 0.8, sx: 1.15, tilt: 0.2 };   // 슈퍼히어로 착지
  sjPhase(s, 'float'); s.boomT = G.t;
  const vr = viewRect(0);
  // 화면 안 물건 (떨어지던 택배 포함)
  for (const p of G.parcels) if (inRect(p.x, p.y, vr)) { p.dead = true; p.item.appear = 1; p.item.z = p.z * 0.3; G.items.push(p.item); }
  G.parcels = G.parcels.filter(p => !p.dead);
  for (const it of G.items) {
    if ((it.state !== 'rest' && it.state !== 'fly') || !inRect(it.x, it.y, vr)) continue;
    it.state = 'sjfloat'; it.appear = 1; it.pvx = it.pvy = 0;
    s.items.push({ it, z0: Math.max(0, it.z), h: rand(150, 320), d: Math.hypot(it.x - r.x, it.y - r.y) / 1600, vr: rand(-3, 3), ph: rand(0, 6) });
  }
  for (const o of G.rats) {
    if (o === r || !inRect(o.x, o.y, vr)) continue;
    o.trick = null; o.sleep = 0; o.vx = o.vy = o.vz = 0; o.rushT = 0;
    s.floaters.push({ r: o, h: rand(90, 200), d: Math.hypot(o.x - r.x, o.y - r.y) / 1600, ph: rand(0, 6) });
  }
  // 화면 안 사람·고양이도 둥실 (터질 때 날아감)
  for (const h of G.humans) if (inRect(h.x, h.y, vr) && h.appear >= 1 && h.state !== 'dead' && h.state !== 'dying' && h.state !== 'splat') s.actors.push({ a: h, z0: Math.max(0, h.z || 0), h: rand(110, 210) * (h.boss ? 0.5 : 1), d: Math.hypot(h.x - r.x, h.y - r.y) / 1600, ph: rand(0, 6) });
  const c = G.cat; if (c && inRect(c.x, c.y, vr) && c.state !== 'leave' && c.state !== 'flung') s.actors.push({ a: c, z0: Math.max(0, c.z || 0), h: rand(120, 200), d: Math.hypot(c.x - r.x, c.y - r.y) / 1600, ph: rand(0, 6) });
  for (const f of s.actors) f.a.vz = 0;
  // 화면에 걸친 벽 (막힌 벽만)
  for (const w of visibleWalls()) {
    if (w.solid) continue;                       // 연구소 바깥벽은 못 부숨
    const hit = w.di ? w.x > vr.x0 && w.x < vr.x1 && w.y1 > vr.y0 && w.y0 < vr.y1 : w.y > vr.y0 && w.y < vr.y1 && w.x1 > vr.x0 && w.x0 < vr.x1;
    if (hit) s.walls.push(w);
  }
  for (let i = 0; i < 5; i++) ring(r.x, r.y, 120 + i * 140, i % 2 ? '#fff' : 'rgba(240,200,120,.95)', 0.5 + i * 0.12, 14 - i * 2);
  burst(r.x, r.y, 40, { colors: ['#fff', '#fff3bf', '#f0c878'], min: 300, max: 900, type: 'star', s0: 4, s1: 9, z: 20 });
  dust(r.x, r.y, 30, 3);
  stampAt(r.x, r.y, m => {
    m.fillStyle = 'rgba(60,50,45,.4)'; m.beginPath(); m.ellipse(r.x, r.y, 120, 90, 0, 0, 6.28); m.fill();
    m.strokeStyle = 'rgba(60,50,45,.45)'; m.lineWidth = 5;
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + rand(-0.2, 0.2); m.beginPath(); m.moveTo(r.x + Math.cos(a) * 60, r.y + Math.sin(a) * 45); m.lineTo(r.x + Math.cos(a) * rand(170, 260), r.y + Math.sin(a) * rand(130, 200)); m.stroke(); }
  });
  addShake(0.5); flash('#fff', 0.9); Sfx.boom(1.5); Sfx.land();
}
function sjBoom(s) {
  sjPhase(s, 'drop'); s.boom2T = G.t;
  G.quiet = true;
  let n = 0;
  // 화면 속 물건: 아주 드물게 터지는 만큼 남은 체력과 상관없이 전부 박살 (도파민, 사용자). 피해 = 남은 체력 + 쥐 공격력 × SJ_ITEM (치즈·기록용)
  const sjD = ratDamage(s.r) * SJ_ITEM;
  for (const f of s.items) { const it = f.it; it.air = Math.max(it.air, 2); it.crit = true; if (skillBlastItem(it, Math.max(sjD, (it.hp || 0) + (it.hpMax || 0)), s.r, rand(0, 6.28), 260, 520)) n++; }
  G.quiet = false;
  G.items = G.items.filter(it => it.state !== 'dead');
  // 화면 안 사람은 체력과 상관없이 전부 하늘 끝까지, 고양이는 바로 퇴치, 보스는 최대 체력의 20% (보스전은 쥐들이 직접)
  const vr = viewRect(0);
  for (const h of [...G.humans]) if (inRect(h.x, h.y, vr)) { if (h.boss) damageHuman(h, h.hpMax * 0.2, s.r, 0); else if (blastActor(h, rand(0, 6.28), rand(300, 520), Math.max(sjD * 2, (h.hp || 0) + 1), s.r)) h.vz = rand(900, 1200); }
  if (G.cat && inRect(G.cat.x, G.cat.y, vr) && G.cat.state !== 'flung' && G.cat.state !== 'leave') damageCat(G.cat, Math.max(sjD * 2, (G.cat.hp || 0) + 1), rand(0, 6.28), s.r);
  const nw = s.walls.length;
  // 계단 방 벽은 한 방에 안 무너짐 (최대 체력의 25%만): 층 넘어가기는 쥐들이 직접 해내야 함
  for (const w of s.walls) { if (isStairsRoom(w.i + w.di, w.j + w.dj)) damageWall(w.i, w.j, w.di, w.dj, wallMax(w.i + w.di, w.j + w.dj) * 0.25, w.cx, w.cy, true); else breakWall(w.i, w.j, w.di, w.dj); }
  G.hitstop = 0;
  for (const w of s.walls) delete G.wallShake[w.key];
  s.walls = [];
  for (const f of s.floaters) f.r.vz = 120;
  G.banner = null;
  later(0.9, () => bigBanner('💥 슈퍼 점프 대참사!', `물건 ${n}개${nw ? ` · 벽 ${nw}개` : ''} 한꺼번에 박살!`, '#f0c878'));
  addShake(0.5); flash('#fff', 0.8); G.punch = 0.08; Sfx.boom(1.6); Sfx.smash(1, true); Sfx.clear();
  writeSave();
}
function sjEnd(s) {
  for (const f of s.floaters) { f.r.z = 0; f.r.vz = 0; f.r.pose = null; f.r.sjRot = 0; }
  for (const f of s.actors) { f.a.sjRot = 0; f.a.jit = 0; }
  s.r.pose = null; s.r.sjRot = 0; s.r.jit = 0;
  stopDash(s.r, 0.3, 0.6);
  G.sj = null;
}

// ── 만화 연출 (화면 좌표, render 마지막에 그림) ──
function drawSuperJump() {
  const s = G.sj; if (!s) return;
  const r = s.r, sp = r.sp, t = s.t;
  const fx = (r.x - G.cam.x) * G.cam.z, fy = (r.y * TILT - G.cam.y) * G.cam.z;
  ctx.save();
  if (s.phase === 'cutin') {
    const inA = Math.min(1, t / 0.12), outK = clamp((t - (SJ_T.cutin - 0.25)) / 0.25, 0, 1);
    ctx.globalAlpha = 0.6 * inA * (1 - outK); ctx.fillStyle = '#1d1826'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    // 집중선 (0.05초마다 새로 그림)
    if (G.t - s.lineT > 0.05) { s.lineT = G.t; s.lines = Array.from({ length: 70 }, () => [rand(0, 6.28), rand(0.004, 0.02), rand(0.3, 0.6)]); }
    const cx = W / 2, cy = H / 2;
    ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - outK)})`;
    for (const [a, wd, inner] of s.lines) { ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * W * inner, cy + Math.sin(a) * H * inner); ctx.lineTo(cx + Math.cos(a - wd) * W, cy + Math.sin(a - wd) * W); ctx.lineTo(cx + Math.cos(a + wd) * W, cy + Math.sin(a + wd) * W); ctx.fill(); }
    // 비스듬한 만화 칸 (왼쪽에서 휙 들어왔다가 오른쪽으로 휙)
    const slide = (1 - sjEase(t / 0.2)) * -W * 1.2 + outK * outK * W * 1.3;
    ctx.save(); ctx.translate(slide, 0);
    const band = () => { ctx.beginPath(); ctx.moveTo(-50, H * 0.3); ctx.lineTo(W + 50, H * 0.18); ctx.lineTo(W + 50, H * 0.74); ctx.lineTo(-50, H * 0.86); ctx.closePath(); };
    band(); ctx.fillStyle = '#f0c878'; ctx.fill();
    ctx.save(); band(); ctx.clip(); ctx.fillStyle = 'rgba(217,120,106,.35)';
    for (let y = 0; y < H; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < W; x += 14) { const d = Math.hypot(x - W * 0.3, y - H * 0.5) / W; circ(ctx, x, y, Math.max(0.3, 4.2 - d * 5)); ctx.fill(); }
    ctx.restore();
    band(); ctx.lineWidth = 10; ctx.strokeStyle = '#3c322d'; ctx.stroke();
    // 컷인 속 쥐: 웅크려 부들부들 → 슈웅 뛰어올라 칸을 뚫고 나감
    const jt = t - 0.25, up = jt < 0.45 ? 0 : sjEase((jt - 0.45) / 0.35);
    const pose = jt < 0.45 ? { front: 0.55, farFront: 0.5, back: -0.6, farBack: -0.55, bob: 6, sy: 0.75, sx: 1.15, head: 0.3, tail: -0.4, tilt: 0 }
      : { front: 2.5, farFront: 2.2, back: -1.6, farBack: -1.3, head: -0.45, tail: -1.2, sx: 0.85, sy: 1.25, bob: 0, tilt: -0.15 };
    ctx.save();
    const jit = jt < 0.45 && jt > 0 ? rand(-3, 3) : 0;
    ctx.translate(W * 0.3 + jit, H * 0.8 - up * H * 0.32);
    if (up > 0) { ctx.strokeStyle = 'rgba(60,50,45,.6)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 30, 30 + Math.abs(i) * 10); ctx.lineTo(i * 34, 30 + Math.abs(i) * 10 + 140 * up); ctx.stroke(); } }
    ctx.scale(-5.2, 5.2);          // 그림은 왼쪽을 봄 → 뒤집어서 오른쪽(글씨 쪽)을 보게
    drawRatFigure(ctx, r, pose);
    ctx.restore();
    ctx.restore();
    // 큰 글씨: 쾅 박히듯
    const tk = clamp((t - 0.25) / 0.14, 0, 1), sc = t < 0.25 ? 0 : 1 + (1 - sjEase(tk)) * 2.2;
    if (sc > 0) {
      ctx.save(); ctx.globalAlpha = 1 - outK;
      const sh = t < 0.6 ? rand(-4, 4) : 0;
      ctx.translate(W * 0.64 + sh, H * 0.45 + sh); ctx.rotate(-0.1); ctx.scale(sc, sc);
      comicText('슈퍼 점프!!!', 0, 0, 108, '#fff3bf', '#d9786a');
      comicText(`${TIERS[sp.tier].name} · ${sp.name}`, 10, 84, 30, '#fff', '#7fa8bf');
      ctx.restore();
      if (t > 0.35) { ctx.save(); ctx.globalAlpha = 1 - outK; ctx.translate(W * 0.1, H * 0.2); ctx.rotate(-0.25); comicText('두둥!', 0, 0, 44, '#fff', '#3c322d'); ctx.restore(); }
    }
  } else if (s.phase === 'charge') {
    const k = t / SJ_T.charge, pulse = 0.5 + 0.5 * Math.sin(G.t * (10 + 20 * k));
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9);
    g.addColorStop(0, 'rgba(240,200,120,0)'); g.addColorStop(1, `rgba(240,200,120,${0.25 + 0.3 * pulse * k})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, 150); ctx.rotate(-0.03); comicText('기 모으는 중' + '.'.repeat(1 + Math.floor(k * 6) % 4), 0, 0, 34, '#fff3bf', '#d9786a'); ctx.restore();
  } else if (s.phase === 'sky') {
    // 하늘 끝에서 반짝☆
    const tw = clamp((t - 0.35) / 0.5, 0, 1), sz = Math.sin(tw * Math.PI) * 22;
    if (sz > 0.5) { ctx.save(); ctx.translate(fx, 118); ctx.rotate(G.t * 5); ctx.fillStyle = '#fff'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, q = i % 2 ? sz * 0.25 : sz; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.fill(); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = clamp(t / 0.3, 0, 1); ctx.translate(W / 2, H * 0.42); comicText('…어디까지 올라가는 거야?!', 0, 0, 30, '#fff', '#7d746b'); ctx.restore();
  } else if (s.phase === 'fall') {
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4;
    for (let i = 0; i < 26; i++) { const x = fx + rand(-260, 260), y0 = rand(-40, fy); ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + rand(60, 180)); ctx.stroke(); }
  }
  // 착지 글씨 / 폭발 글씨
  const bt = s.boomT ? G.t - s.boomT : -1;
  if (bt >= 0 && bt < 1.3) {
    const e = sjEase(bt / 0.15), a = bt > 1 ? 1 - (bt - 1) / 0.3 : 1;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2 + rand(-5, 5) * (1 - e), H * 0.3); ctx.scale(2.6 - 1.6 * e, 2.6 - 1.6 * e); ctx.rotate(0.06);
    spikyBurst(0, 0, 260, 90, '#fff3bf'); comicText('쿠과과광!!!', 0, 0, 92, '#f0c878', '#d9786a');
    ctx.restore();
  }
  const b2 = s.boom2T ? G.t - s.boom2T : -1;
  if (b2 >= 0 && b2 < 1) { const e = sjEase(b2 / 0.12); ctx.save(); ctx.globalAlpha = b2 > 0.7 ? 1 - (b2 - 0.7) / 0.3 : 1; ctx.translate(W / 2, H * 0.3); ctx.scale(2 - e, 2 - e); ctx.rotate(-0.06); comicText('전부 박살!!!', 0, 0, 70, '#fff', '#d9786a'); ctx.restore(); }
  ctx.restore();
}
// 굵은 테두리 + 그림자 글씨 (만화 효과음)
function comicText(text, x, y, size, fill, shadow) {
  ctx.font = `700 ${size}px 'IBM Plex Sans KR', 'Gowun Dodum', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.fillStyle = shadow; ctx.fillText(text, x + size * 0.06, y + size * 0.08);
  ctx.lineWidth = size * 0.2; ctx.strokeStyle = '#3c322d'; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}
function spikyBurst(x, y, rx, ry, col) {
  ctx.beginPath();
  for (let i = 0; i < 28; i++) { const a = i / 28 * 6.28, q = i % 2 ? 0.72 : 1 + (i % 4 === 0 ? 0.15 : 0); ctx.lineTo(x + Math.cos(a) * rx * q, y + Math.sin(a) * ry * q); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#3c322d'; ctx.stroke();
}
// 쥐 한 마리 그림 (리그가 있으면 파츠, 없으면 코드 그림). 발끝 = 원점, 왼쪽을 봄
function drawRatFigure(g, r, pose) {
  const rig = RAT_RIGS[r.sp.id];
  if (rig) drawRatRig(rig, 1, { ...RIG_IDLE, ...pose }, g);
  else g.drawImage(ratSprite(r.sp, -1, false), -38, -46, 100, 56);
}
