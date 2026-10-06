'use strict';
// ───────────────────────── 연구소 사람들 (연구원·청소부·경비원) + 보스 ─────────────────────────
// 파츠 리그(rats/dev/gen_humans.mjs → assets/rats/humans/<id>/, js/human_meta.js): 머리·겁먹은 머리·몸통·팔·다리. 전부 왼쪽을 봄.
// 상태: walk(어슬렁) → panic(쥐 보고 기겁, 도망) → fly(체력 0 → 병맛 비행, 땅에 2~3번 통통 · 벽엔 한 번 철퍼덕) → 펑! 하고 사라짐(humanPoof)
// 보스: 같은 리그를 크게. wait(계단 방에서 대기) → fight(시간 제한, 공격 패턴) → dying(하늘로 날아감) → dead
const HUMAN_H = 150;                      // 사람 키 (월드 단위)
const HUMAN_R = 26;                       // 충돌 반지름
const HIMG = {};
function loadHumans() {
  if (typeof HUMAN_PARTS === 'undefined') return;
  for (const id of Object.keys(HUMAN_PARTS)) for (const p of ['head', 'scared', 'torso', 'arm', 'leg']) {
    const i = new Image(); i.onload = () => { HIMG[id + '/' + p] = i; if (p === 'arm' || p === 'leg') HIMG[id + '/' + p + '_far'] = darkerCopy(i, 0.22); }; i.src = `../assets/rats/humans/${id}/${p}.png`;
  }
}
loadHumans();
const HK_BY_ID = Object.fromEntries(HUMAN_KINDS.map(k => [k.id, k]));

function makeHuman(kind, x, y) {
  const k = HK_BY_ID[kind], zi = S.floor - 1;
  const h = { kind, k, x, y, z: 0, vx: 0, vy: 0, vz: 0, face: Math.random() < 0.5 ? 1 : -1, state: 'walk', t: rand(1, 3), walk: rand(0, 6), rot: 0, vr: 0,
    hp: 0, hpMax: 12 * k.hp * Math.pow(ITEM_GROW, zi) * 3, value: 3 * k.v * Math.pow(VALUE_GROW, zi) * 2 * Math.pow(1.15, lv('cheese')) * dexBonus(), sc: 1, r: HUMAN_R,
    say: null, hitT: 0, flashT: 0, jit: 0, fly: null, air: 0, hitSet: null, appear: 0, alpha: 1, cd: 0 };
  h.hp = h.hpMax;
  return h;
}
function spawnHumans(i, j, n) {
  const pool = HUMAN_KINDS.filter(k => S.floor >= k.from);
  for (let m = 0; m < n && G.humans.length < humanCap(); m++) {
    const h = makeHuman(pick(pool).id, (i + 0.5) * RW + rand(-RW * 0.35, RW * 0.35), (j + 0.5) * RH + rand(-RH * 0.25, RH * 0.3));
    G.humans.push(h);
  }
}
const humanCap = () => Math.min(12, 4 + Math.floor(S.floor * 0.4));
// def·x·y 를 주면 테스트용(보스 버튼): 그 자리에 바로 소환
function makeBoss(f, def = bossOf(f), x, y) {
  const sp = stairsPos();
  const b = makeHuman('guard', x ?? sp.x, y ?? sp.y + 220);
  // 보스는 한눈에 보스인 걸 알 수 있게 크게 (사람의 2.8배, 고양이 보스는 더 크게)
  Object.assign(b, { kind: def.id, boss: def, sc: 2.8, r: HUMAN_R * (def.cat ? 3.4 : 2.8), hpMax: bossHP(Math.max(f, BOSS_EVERY)), state: 'wait', face: 1, atkT: 3, value: 3 * Math.pow(VALUE_GROW, f - 1) * 300 * Math.pow(1.15, lv('cheese')) });
  b.hp = b.hpMax;
  G.humans.push(b);
  return b;
}

// ── 피해 · 날리기 ──
const FLY_STYLES = ['spin', 'swim', 'star', 'cannon', 'flail'];
const FLY_LINES = ['으아아아악~!', '엄마아아~!', '산재 처리 부탁해요…', '퇴사하겠습니다아아!', '월급 루팡 실패~', '논문 마감이…!', '(비명)', '이건 계약서에 없었어!!'];
function damageHuman(h, dmg, by, ang, crit) {
  if (h.held || h.state === 'fly' || h.state === 'splat' || h.state === 'dying' || h.state === 'dead' || h.appear < 1) return false;
  if (h.boss) dmg *= 1 + 0.2 * lv('bossd');                            // 보스 사냥꾼
  const vis = onScreen(h.x, h.y);
  h.hitT = 0.25; h.flashT = 0.08;
  if (h.boss) {
    if (h.state !== 'fight') return false;
    h.hp -= dmg;
    h.vx += Math.cos(ang) * 60; h.vy += Math.sin(ang) * 60; h.jit = 3;
    if (vis && Math.random() < 0.25) popup(h.x + rand(-30, 30), h.y, `-${fmt(dmg)}`, crit ? '#f2c14e' : '#fff', crit ? 22 : 16, 0.6, 150 + rand(0, 60));
    if (vis && Math.random() < 0.08) h.say = { text: pick(['아야!', '이 녀석들이!', '끄악!', '비켜!']), t: 0.8 };
    if (h.hp <= 0) bossDown(h);
    return true;
  }
  h.hp -= dmg; if (by && by.sp) h.by = by;   // 날아갈 때 타격력(flyDmg) 기준이 되는 쥐
  if (h.state === 'walk') panic(h);
  if (h.hp > 0) {
    // 맞은 방향으로 휘청
    h.vx += Math.cos(ang) * 140; h.vy += Math.sin(ang) * 140; h.jit = 2;
    if (vis && Math.random() < 0.2) h.say = { text: pick(['아얏!', '물었어!!', '저리 가!', '히익!']), t: 0.7 };
    return true;
  }
  launchHuman(h, ang, rand(420, 560) * (crit ? 1.3 : 1));
  return true;
}
function launchHuman(h, ang, speed, style) {
  h.state = 'fly'; h.maxBounce = 2 + (Math.random() < 0.5 ? 1 : 0); h.bounces = 0; h.vx = Math.cos(ang) * speed * 1.3; h.vy = Math.sin(ang) * speed * 1.3; h.vz = rand(560, 760);
  h.fly = { style: style || pick(FLY_STYLES), t: 0 };
  h.vr = (h.fly.style === 'swim' ? 0 : h.fly.style === 'star' ? rand(3, 5) : rand(10, 16)) * (Math.random() < 0.5 ? -1 : 1);
  if (h.fly.style === 'swim') h.rot = (h.vx >= 0 ? 1 : -1) * Math.PI / 2;
  h.face = h.vx >= 0 ? 1 : -1; h.hitSet = new Set(); h.air = 0;
  if (onScreen(h.x, h.y)) {
    h.say = { text: pick(FLY_LINES), t: 1.2 };
    burst(h.x, h.y, 10, { colors: ['#fff', '#fff3bf'], type: 'star', min: 200, max: 480, s0: 3, s1: 7, z: 60 });
    // 안경·서류·신발 한 짝이 날아감
    for (let i = 0; i < 6; i++) particle({ x: h.x, y: h.y, z: 80, vx: rand(-260, 260), vy: rand(-200, 200), vz: rand(200, 500), g: 900, life: 2, max: 2, size: rand(6, 10), color: '#fbf7ef', type: 'paper', rot: rand(0, 6), vr: rand(-12, 12), drag: 1.2, settle: true, pts: [1, 1, 1] });
    particle({ x: h.x, y: h.y, z: 20, vx: rand(-300, 300), vy: rand(-200, 200), vz: rand(400, 600), g: 1400, life: 2.5, max: 2.5, size: 9, color: '#4b4540', type: 'shard', rot: 0, vr: rand(-20, 20), drag: 1, settle: true, pts: [1.2, 0.6, 1] });
    G.hitstop = Math.max(G.hitstop, 0.06); addShake(0.15); Sfx.knock(); Sfx.jump();

  }
}
function panic(h) {
  if (h.state !== 'walk' && h.state !== 'panic') return;
  if (h.state === 'walk') {
    h.z = 0; h.vz = 260; h.jit = 3;                   // 깜짝! 제자리 점프
    if (onScreen(h.x, h.y)) { h.say = { text: pick(h.k.lines), t: 1.4 }; popup(h.x, h.y, '!!', '#e8786a', 30, 0.6, HUMAN_H + 30); Sfx.pop(); }
  }
  h.state = 'panic'; h.t = rand(3, 5);
}
// 날아간 사람이 땅에 닿음: 2~3번 통통 튄 뒤 펑! (잔인한 건 없이 만화처럼: 연기 + 색종이 + 별)
function humanBounce(h) {
  h.bounces = (h.bounces || 0) + 1;
  const vis = onScreen(h.x, h.y);
  if (h.survive && h.hp > 0) {                      // 스킬에 맞고 버팀: 한 번 튀고 벌떡 일어나 다시 도망
    h.survive = false; h.state = 'panic'; h.t = rand(2, 3.5); h.z = 0; h.vz = 0; h.rot = 0; h.vr = 0; h.fly = null; h.vx *= 0.2; h.vy *= 0.2; h.sq = 0.6;
    if (vis) { dust(h.x, h.y, 4, 0.9); popup(h.x, h.y, pick(['아이고 허리야!', '살았다…', '휴우…']), '#fff', 16, 0.8, HUMAN_H); Sfx.thump(0.6); }
    return;
  }
  if (h.bounces <= h.maxBounce) {
    // 고무공처럼 거의 줄지 않고 통통 (예전엔 튈 때마다 속도가 확 줄어서 두 번째부터 어정쩡하게 짧았음)
    h.vz = Math.max(420, -h.vz * 0.85); h.vx *= 0.95; h.vy *= 0.95; h.sq = 0.55; h.vr *= -0.8;
    if (vis) { dust(h.x, h.y, 5, 1); ring(h.x, h.y, 50, 'rgba(255,255,255,.85)', 0.2, 5); Sfx.thump(0.7); popup(h.x, h.y, pick(['통!', '뽀잉!', '띠용~', '퉁!']), '#fff', 18 + h.bounces * 3, 0.6, 40); }
    shock(h.x, h.y, 80, flyDmg(h) * 0.4, null, '#fff', 0.6);           // 떨어진 사람 충격파: 날린 쥐 공격력 기준 (flyDmg)
    return;
  }
  humanPoof(h);
}
function humanPoof(h) {
  h.state = 'dead';
  const gain = h.value * (1 + 0.5 * Math.min(h.air, AIR_MAX)) * comboMult();
  earn(gain); S.smashed++;
  G.combo += 2; G.comboT = 1.6; G.comboBump = 1;
  shock(h.x, h.y, 110, h.hpMax * 0.4, null, '#fff', 1);
  if (!onScreen(h.x, h.y)) return;
  const z = 60;
  // 뭉게뭉게 흰 연기 + 색종이 + 별 + "펑!" — 사람은 연기 속으로 사라짐
  for (let i = 0; i < 14; i++) { const a = rand(0, 6.28), v = rand(60, 220); particle({ x: h.x, y: h.y, z: z + rand(-20, 40), vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: rand(20, 90), life: rand(0.5, 0.9), max: 1, size: rand(16, 28), color: 'rgba(250,247,240,', type: 'dust', drag: 3 }); }
  burst(h.x, h.y, 22, { colors: ['#f2c14e', '#e8a3a0', '#9dd5a8', '#8fb3c7', '#fff'], type: 'paper', min: 160, max: 420, s0: 5, s1: 9, z: z + 30, life: 1.4, drag: 1.8 });
  burst(h.x, h.y, 10, { colors: ['#fff3bf', '#fff'], type: 'star', min: 200, max: 480, s0: 4, s1: 8, z: z + 20 });
  ring(h.x, h.y, 90, '#fff', 0.35, 9);
  popup(h.x, h.y, pick(['펑!!', '뿅!', '퐁!', '(퇴근 완료)', '(조퇴)']), '#fff3bf', 30, 0.9, z + 70);
  popup(h.x, h.y, '🧀+' + fmt(gain), '#f0c878', 28, 1.2, z + 20);
  if (G.coins.length < 70) for (let i = 0; i < 4; i++) G.coins.push({ x: h.x + rand(-20, 20), y: h.y, t: 0, dur: rand(0.55, 0.9) });
  addShake(0.15); Sfx.pop(); Sfx.smash(0.5, false);
}

// ── 매 프레임 ──
function nearestRat(x, y, R) { let best = null, bd = R; for (const r of G.rats) { const d = Math.hypot(r.x - x, r.y - y); if (d < bd && !r.ultOn) { bd = d; best = r; } } return best; }
function updateHumans(dt) {
  if (!G.humans) G.humans = [];
  G.humanT = (G.humanT ?? 20) - dt;
  if (G.humanT <= 0) {
    G.humanT = rand(18, 30);
    // 사람 보충: 열린 방 중 하나로 걸어 들어옴
    const rooms = openRooms().filter(([i, j]) => !isStairsRoom(i, j));
    if (G.humans.filter(h => !h.boss).length < humanCap() && rooms.length) { const [i, j] = pick(rooms); spawnHumans(i, j, 1); }
  }
  for (const h of G.humans) {
    h.appear = Math.min(1, h.appear + dt * 3); h.hitT = Math.max(0, h.hitT - dt); h.flashT = Math.max(0, h.flashT - dt); h.jit = Math.max(0, h.jit - dt * 12);
    if (h.say) { h.say.t -= dt; if (h.say.t <= 0) h.say = null; }
    if (h.raid) continue;                      // 게임 오버 습격 경비원 (meta.js updateGameOver 가 움직임)
    if (h.boss) { updateBoss(h, dt); continue; }
    if (h.held) continue;                      // 필살기가 붙잡고 있음 (ults_parody.js 풍선 등)
    const px = h.x, py = h.y;
    switch (h.state) {
      case 'walk': {
        h.t -= dt;
        if (h.t <= 0) { h.t = rand(1.5, 4); const a = rand(0, 6.28), s = Math.random() < 0.3 ? 0 : 55 * h.k.spd; h.vx = Math.cos(a) * s; h.vy = Math.sin(a) * s; }
        const r = nearestRat(h.x, h.y, 240); if (r) panic(h);
        break;
      }
      case 'panic': {
        // 쥐 반대쪽으로 도망 (다리가 바퀴처럼 빙글빙글)
        h.t -= dt;
        const r = nearestRat(h.x, h.y, 420);
        if (r) { h.t = Math.max(h.t, 1.5); const a = Math.atan2(h.y - r.y, h.x - r.x) + Math.sin(G.t * 3 + h.walk) * 0.5, s = 240 * h.k.spd; h.vx += (Math.cos(a) * s - h.vx) * Math.min(1, dt * 5); h.vy += (Math.sin(a) * s - h.vy) * Math.min(1, dt * 5); }
        if (onScreen(h.x, h.y) && Math.random() < dt * 0.8 && !h.say) h.say = { text: pick(h.k.lines), t: 1 };
        if (h.t <= 0) { h.state = 'walk'; h.t = 2; }
        break;
      }
      case 'fly': flyStep(h, dt); break;
      case 'splat': {
        // 벽에 철퍼덕 붙었다가 주르륵 → 떨어져서 다시 통통
        h.t -= dt; h.vx = h.vy = 0;
        if (h.t < 0.35) h.z = Math.max(0, h.z - dt * 320);
        if (h.t <= 0) { h.state = 'fly'; h.vz = 320; h.vx = -h.face * 320; h.vy = rand(-60, 60); }   // 벽에서 튕겨 나와 다시 날아감
        break;
      }
    }
    h.sq = (h.sq || 1) + (1 - (h.sq || 1)) * Math.min(1, dt * 8);
    if (h.state !== 'fly' && h.state !== 'splat') {
      if (h.z > 0 || h.vz > 0) { h.vz -= 1600 * dt; h.z = Math.max(0, h.z + h.vz * dt); if (h.z <= 0) h.vz = 0; }
      h.x += h.vx * dt; h.y += h.vy * dt;
      confine(h, h.r, px, py, 0.3, null);
      if (Math.abs(h.vx) > 8) h.face = h.vx > 0 ? 1 : -1;
      h.walk += dt * Math.hypot(h.vx, h.vy) / (h.state === 'panic' ? 7 : 14);
    }
  }
  G.humans = G.humans.filter(h => h.alpha > 0 && h.state !== 'dead');
}
function flyStep(h, dt) {
  const px = h.x, py = h.y;
  h.fly.t += dt;
  h.vz -= 1500 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.z += h.vz * dt; h.rot += h.vr * dt;
  const hitWall = confine(h, h.r * 0.8, px, py, 0.3, (i, j, di, dj, v) => { if (v > 250) damageWall(i, j, di, dj, flyDmg(h, true) * 0.5 * digMult(), h.x, h.y); });   // 날아간 사람 벽 쾅: 날린 쥐 공격력 기준 (무게 제외)
  if (hitWall && h.z > 30 && Math.hypot(h.vx, h.vy) > 200 && !h.splatted) {
    // 벽에 철퍼덕! (한 번만)
    h.splatted = true; h.state = 'splat'; h.t = 0.7; h.rot = 0; h.face = -h.face; h.sq = 0.7;
    if (onScreen(h.x, h.y)) { popup(h.x, h.y, '철퍼덕!!', '#fff3bf', 26, 0.9, h.z + 60); addShake(0.25); Sfx.thump(1.2); dust(h.x, h.y, 8, 1.2); }
    return;
  }
  if (onScreen(h.x, h.y) && Math.random() < 0.5) particle({ x: h.x, y: h.y, z: h.z + 60, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 14, color: 'rgba(255,255,255,.7)', type: 'trail', drag: 0 });
  // 날아가며 물건·사람·보스를 들이받음 (볼링핀처럼)
  if (h.z < 120) {
    near(itemGrid, h.x, h.y, o => {
      if (o.state !== 'rest' || h.hitSet.has(o) || Math.hypot(o.x - h.x, o.y - h.y) > o.r + h.r) return;
      h.hitSet.add(o); earn(o.value * 0.3);
      if (h.by) o.by = h.by; damageItem(o, flyDmg(h), null, false, Math.atan2(h.vy, h.vx));   // 사람 볼링: 날린 쥐 공격력 기준
      if (onScreen(o.x, o.y)) { burst(o.x, o.y, 6, { colors: ['#fff', '#ffe29a'], min: 120, max: 320, z: 20 }); Sfx.clink(); }
    }, 1);
    for (const o of G.humans) {
      if (o === h || h.hitSet.has(o) || Math.hypot(o.x - h.x, o.y - h.y) > o.r + h.r || Math.abs(o.z - h.z) > 90) continue;
      h.hitSet.add(o);
      if (o.boss) { damageHuman(o, flyDmg(h) * 1.5, h.by, Math.atan2(h.vy, h.vx)); h.vx *= -0.4; h.vy *= -0.4; if (onScreen(o.x, o.y)) popup(o.x, o.y, '사람 폭탄 명중!', '#f2c14e', 22, 0.9, 160); }
      else if (o.state !== 'fly') { o.hp = 0; launchHuman(o, Math.atan2(o.y - h.y, o.x - h.x), 480); if (onScreen(o.x, o.y)) popup(o.x, o.y, '스트라이크!!', '#f2c14e', 24, 0.9, 120); }
    }
  }
  // 쥐가 헤딩으로 받아침 → 더 높이 (사람 저글링)
  if (h.z < 60 && h.vz < 0) near(ratGrid, h.x, h.y, r => {
    if (h.air >= AIR_MAX || h.hitSet.has(r) || r.stun > 0 || Math.hypot(r.x - h.x, r.y - h.y) > h.r + ratR(r)) return;
    h.hitSet.add(r); r.vz = Math.max(r.vz, 200); r.bite = 1;
    h.vz = rand(420, 560); h.air++; earn(h.value * 0.3 * h.air);
    if (onScreen(h.x, h.y)) popup(h.x, h.y, `AIR x${h.air}`, '#9bf6ff', 18 + h.air * 2, 0.7, h.z + 80);
  });
  if (h.z <= 0 && h.vz < 0) { h.z = 0; humanBounce(h); }
}

// ── 쥐 ↔ 사람 (game.js 에서 호출) ──
function ratBumpHumans(r, rushing) {
  if (!G.humans.length || r.biteCD > 0) return;
  const rad = ratR(r);
  for (const h of G.humans) {
    if (h.held || h.state === 'fly' || h.state === 'dying' || h.state === 'dead' || h.state === 'splat' || h.state === 'wait') continue;
    const dx = r.x - h.x, dy = r.y - h.y, d = Math.hypot(dx, dy), R = rad + h.r;
    if (d > R || h.z > 40) continue;
    const nx = dx / (d || 1), ny = dy / (d || 1);
    r.x = h.x + nx * (R + 1); r.y = h.y + ny * (R + 1);
    const dot = r.vx * nx + r.vy * ny; if (dot < 0) { r.vx -= 2 * dot * nx; r.vy -= 2 * dot * ny; }
    r.biteCD = 0.22; r.bite = 1; r.sq = 1.25;
    if (!rushing) stopDash(r, 0.1, 0.35);
    const crit = Math.random() < 0.05 + 0.02 * lv('critc'), dmg = ratDamage(r) * (rushing ? rushMult() : 1) * (crit ? 3 : 1);
    damageHuman(h, dmg, r, Math.atan2(-ny, -nx), crit);
    if (onScreen(r.x, r.y) && G.paws.length < 50) G.paws.push({ x: h.x - nx * h.r * 0.5, y: h.y - ny * h.r * 0.5, life: 0.18, max: 0.18, ang: rand(-0.5, 0.5), crit });
    return;
  }
}
// 날아가는 물건이 사람·보스에 맞음 (game.js updateItems 에서 호출)
function itemHitsHumans(it) {
  for (const h of G.humans) {
    if (it.hitSet.has(h) || h.held || h.state === 'fly' || h.state === 'splat' || h.state === 'dead' || h.state === 'dying' || h.state === 'wait') continue;
    if (Math.hypot(it.x - h.x, it.y - h.y) > it.r + h.r || it.z > HUMAN_H * h.sc) continue;
    it.hitSet.add(h);
    const a = Math.atan2(it.vy, it.vx);
    if (h.boss) { damageHuman(h, flyDmg(it) * 1.5, it.by, a); if (onScreen(h.x, h.y)) popup(h.x, h.y, '명중!', '#fff3bf', 20, 0.6, 120); }
    else {
      // 날아온 물건에 맞으면: 던진 쥐 공격력 기준 큰 피해(flyDmg ×2) + 버티면 휘청 밀려남 + "퍽!"
      if (!damageHuman(h, flyDmg(it) * 2, it.by, a) || h.state !== 'fly') { h.vx += Math.cos(a) * 260; h.vy += Math.sin(a) * 260; h.vz = Math.max(h.vz, 220); h.jit = 4; }
      if (onScreen(h.x, h.y)) { popup(h.x, h.y, pick(['퍽!', '아야!!', '뿅!', '(맞음)']), '#fff', 20, 0.6, HUMAN_H * 0.8); h.say = h.say || { text: pick(['누가 던졌어!', '아야야!', '실험 장비가!']), t: 0.9 }; }
    }
    it.vx *= -0.3; it.vy *= -0.3;
    if (onScreen(h.x, h.y)) { burst(it.x, it.y, 6, { colors: ['#fff', '#ffe29a'], min: 120, max: 320, z: it.z }); Sfx.clink(); }
  }
}
// 충격파·폭발(aoe)·깔아뭉개기·필살기·슈퍼 점프가 사람·보스·고양이에게도 (game.js aoe, ults.js, superjump.js 에서 호출)
function blastActor(h, ang, spd, dmg, by) {
  if (h.boss) return damageHuman(h, dmg, by, ang);
  if (h.held || h.state === 'fly' || h.state === 'splat' || h.state === 'dead' || h.state === 'wait' || h.appear < 1) return false;
  // 스킬 폭발: 피해만큼 (0 이면 날아가서 펑, 남으면 짧게 날아갔다 벌떡)
  h.hp -= dmg; if (by && by.sp) h.by = by; h.survive = h.hp > 0;
  // 버텨도(체력 남음) 크게 날아갔다가 벌떡 — 예전엔 0.45배로 폴짝 뛰고 말아서 필살기·슈퍼 점프에 '안 맞는 것처럼' 보였음
  launchHuman(h, ang, h.survive ? spd * 0.85 : spd); if (h.survive) h.vz *= 0.85;
  return true;
}
function actorsAoe(x, y, rad, dmg, by) {
  for (const h of G.humans) {
    if (h.z > 100 || Math.hypot(h.x - x, h.y - y) > rad + h.r) continue;
    damageHuman(h, dmg, by, Math.atan2(h.y - y, h.x - x));
  }
  const c = G.cat;
  if (c && Math.hypot(c.x - x, c.y - y) < rad + CAT_R && (c.aoeT || 0) < G.t) { c.aoeT = G.t + 0.25; damageCat(c, dmg, Math.atan2(c.y - y, c.x - x), by); }
}
// 범위 안 사람은 날려버리고(보스는 큰 피해), 고양이는 퇴치
function blastActorsIn(x, y, R, spd, bossDmg, by) {
  let n = 0;
  for (const h of G.humans) if (Math.hypot(h.x - x, h.y - y) < R + h.r && blastActor(h, Math.atan2(h.y - y, h.x - x) + rand(-0.3, 0.3), spd, bossDmg, by)) n++;
  const c = G.cat; if (c && c.state !== 'flung' && c.state !== 'leave' && Math.hypot(c.x - x, c.y - y) < R + CAT_R && (c.aoeT || 0) < G.t) { c.aoeT = G.t + 0.3; damageCat(c, bossDmg, Math.atan2(c.y - y, c.x - x), by); n++; }   // 고양이도 피해만큼 (무조건 퇴치 X)
  return n;
}

// ── 보스 ──
function updateBoss(b, dt) {
  const px = b.x, py = b.y;
  b.t += dt;
  if (b.state === 'wait') { b.vx = b.vy = 0; b.face = 1; b.walk = 0; return; }
  if (b.state === 'dying') {
    b.vz -= 300 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.rot += b.vr * dt;
    if (b.z > 2400) { b.state = 'dead'; if (!b.test) bigBanner('🏆 보스 격파!!', `계단으로! ${S.floor + 1}층이 기다린다`, '#f2c14e'); endBossTest(b); }
    return;
  }
  // fight: 쥐 무리 쪽으로 쿵쿵 걸어감 + 공격 패턴
  if (b.z > 0 || b.vz > 0) { b.vz -= 1800 * dt; b.z = Math.max(0, b.z + b.vz * dt); if (b.z <= 0) { b.vz = 0; if (b.atk && (b.atk.type === 'stomp' || b.atk.type === 'pounce') && b.atk.air) bossStompLand(b); } }
  const A = b.atk;
  if (!A) {
    const r = nearestRat(b.x, b.y, 2000);
    if (r) { const a = Math.atan2(r.y - b.y, r.x - b.x), s = 95; b.vx += (Math.cos(a) * s - b.vx) * Math.min(1, dt * 3); b.vy += (Math.sin(a) * s - b.vy) * Math.min(1, dt * 3); }
    b.atkT -= dt;
    if (b.atkT <= 0 && !G.ult && !G.sj) {
      const type = b.boss.atk2 && Math.random() < 0.4 ? b.boss.atk2 : b.boss.atk;
      b.atk = { type, t: 0, n: 0 }; b.atkT = rand(3, 4.5); b.vx = b.vy = 0;
      b.say = { text: pick({ stomp: ['흐으읍!', '짓밟아 주마!'], flask: ['실험체는 실험실로!', '이거나 먹어라!'], swing: ['예산 삭감!', '해고다!!'], pounce: ['냐아앙!!', '크르르…'], hairball: ['캑… 캑캑…', '우웨엑(헤어볼)!'], fireball: ['냐브라카다브라!', '불타라 냥!'], gravity: ['중력 해제 냥!', '둥실둥실 냥~'] }[type]), t: 1 };
    }
  } else {
    A.t += dt; b.vx *= 0.85; b.vy *= 0.85;
    if (A.type === 'stomp' || A.type === 'pounce') {
      // 점프 내려찍기 / 고양이는 웅크렸다가 쥐 떼 한가운데로 덮치기
      if (A.t < (A.type === 'pounce' ? 0.6 : 0.5)) b.jit = A.type === 'pounce' ? 1 : 3;
      else if (!A.air) { A.air = true; b.vz = A.type === 'pounce' ? 700 : 900; const r = nearestRat(b.x, b.y, 900); if (r) { b.vx = (r.x - b.x) * 1.2; b.vy = (r.y - b.y) * 1.2; } if (A.type === 'pounce') Sfx.jump(); }
      if (A.t > 2) b.atk = null;
    } else if (A.type === 'flask' || A.type === 'hairball' || A.type === 'fireball') {
      b.jit = A.t < 0.4 ? 2 : 0;
      const n = A.type === 'fireball' ? 5 : 3;
      if (A.t > 0.4 + A.n * 0.22 && A.n < n) { A.n++; const r = pick(G.rats.filter(o => onScreen(o.x, o.y))) || nearestRat(b.x, b.y, 2000); if (r) bossThrow(b, r.x + rand(-40, 40), r.y + rand(-30, 30), A.type === 'hairball', A.type === 'fireball'); }
      if (A.t > 1.6) b.atk = null;
    } else if (A.type === 'gravity') {
      // 우주 고양이: 무중력 파동 → 주변 쥐가 둥실 떠올랐다 떨어지며 기절
      if (A.t < 0.5) b.jit = 2;
      else if (!A.hit) {
        A.hit = true; const R = 360;
        for (const r of G.rats) if (!r.ultOn && Math.hypot(r.x - b.x, r.y - b.y) < R) { r.vz = rand(600, 850); stunRat(r, 2); }
        for (const it of itemsIn(b.x, b.y, R)) launch(it, rand(0, 6.28), 200, false);
        if (onScreen(b.x, b.y)) { ring(b.x, b.y, R, '#a9d3dc', 0.6, 12); ring(b.x, b.y, R * 0.6, '#fff', 0.45, 8); burst(b.x, b.y, 24, { colors: ['#a9d3dc', '#cdb4db', '#fff'], type: 'star', min: 150, max: 400, s0: 4, s1: 8, z: 80 }); addShake(0.3); Sfx.boom(0.9); popup(b.x, b.y, '무중력!!', '#a9d3dc', 34, 0.8, 200); }
      }
      if (A.t > 1.3) b.atk = null;
    } else if (A.type === 'swing') {
      if (A.t < 0.45) b.jit = 2.5;
      else if (!A.hit) {
        A.hit = true; const R = 280;
        for (const r of G.rats) { const dx = r.x - b.x, dy = r.y - b.y, d = Math.hypot(dx, dy); if (d < R && !r.ultOn) { stunRat(r, 1.6); ragdoll(r, Math.atan2(dy, dx), 520, 420); } }
        if (onScreen(b.x, b.y)) { ring(b.x, b.y, R, '#d9786a', 0.4, 10); popup(b.x, b.y, '퍽!!', '#fff', 34, 0.7, 160); addShake(0.35); Sfx.boom(1); }
        if ((b.swings = (b.swings || 0) + 1) % 2 === 0) { const [i, j] = roomOf(b.x, b.y); spawnHumans(i, j, 2); for (const g of G.humans.slice(-2)) { g.kind = 'guard'; g.k = HK_BY_ID.guard; g.state = 'walk'; } b.say = { text: '경비! 경비이!!', t: 1.2 }; }
      }
      if (A.t > 1.2) b.atk = null;
    }
  }
  b.x += b.vx * dt; b.y += b.vy * dt;
  confine(b, b.r, px, py, 0.3, null);
  if (Math.abs(b.vx) > 8) b.face = b.vx > 0 ? 1 : -1;
  b.walk += dt * Math.hypot(b.vx, b.vy) / 16;
  // 보스에 부딪힌 쥐는 튕겨 나감 (스턴은 공격에 맞았을 때만)
}
function bossStompLand(b) {
  const cat = b.atk.type === 'pounce';
  b.atk.air = false;
  const R = cat ? 280 : 300;
  if (cat && onScreen(b.x, b.y)) popup(b.x, b.y - 30, '냥냥펀치!!', '#e39a5a', 34, 0.8, 120);
  for (const r of G.rats) { const d = Math.hypot(r.x - b.x, r.y - b.y); if (d < R && !r.ultOn) { stunRat(r, 2); ragdoll(r, Math.atan2(r.y - b.y, r.x - b.x), 480, 460); } }
  for (const it of itemsIn(b.x, b.y, R)) launch(it, Math.atan2(it.y - b.y, it.x - b.x), 400, false);
  if (onScreen(b.x, b.y)) { ring(b.x, b.y, R, '#8fb3c7', 0.45, 12); ring(b.x, b.y, R * 0.6, '#fff', 0.35, 8); dust(b.x, b.y, 20, 2.4); addShake(0.5); flash('#fff', 0.2); Sfx.boom(1.4); popup(b.x, b.y, '쿠웅!!', '#fff', 40, 0.8, 60);
    stampAt(b.x, b.y, m => { m.fillStyle = 'rgba(60,50,45,.3)'; m.beginPath(); m.ellipse(b.x, b.y, 110, 60, 0, 0, 6.28); m.fill(); }); }
}
function bossThrow(b, x, y, hair, fire) {
  const T = 0.7;
  G.bossShots.push({ x: b.x, y: b.y, z: hair ? 120 : 200, vx: (x - b.x) / T, vy: (y - b.y) / T, vz: 520, t: 0, rot: 0, hair, fire });
  if (onScreen(b.x, b.y)) Sfx.jump();
}
function updateBossShots(dt) {
  if (!G.bossShots) G.bossShots = [];
  for (const s of G.bossShots) {
    s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vz -= 1500 * dt; s.z += s.vz * dt; s.rot += dt * 14;
    if (s.z <= 0) {
      s.dead = true; const R = 110;
      for (const r of G.rats) if (Math.hypot(r.x - s.x, r.y - s.y) < R && !r.ultOn) { stunRat(r, 2.5); r.vz = 260; }
      // 플라스크(초록 얼룩) · 불덩이(주황) · 헤어볼(갈색 털뭉치)
      const col = s.fire ? ['#f0c878', '#e39a5a', '#fff'] : s.hair ? ['#c8a27a', '#e39a5a', '#fff'] : ['#9dd5a8', '#c9dba0', '#fff'], st = s.fire ? 'rgba(227,154,90,.35)' : s.hair ? 'rgba(200,162,122,.4)' : 'rgba(157,213,168,.45)';
      if (onScreen(s.x, s.y)) { ring(s.x, s.y, R, col[0], 0.5, 10); burst(s.x, s.y, 18, { colors: col, min: 150, max: 420, s0: 4, s1: 8, z: 10 }); Sfx.smash(0.7, true); addShake(0.12);
        if (s.hair) popup(s.x, s.y, '털뭉치!', '#fff', 18, 0.7, 30);
        stampAt(s.x, s.y, m => { m.fillStyle = st; m.beginPath(); m.ellipse(s.x, s.y, R * 0.8, R * 0.55, 0, 0, 6.28); m.fill(); }); }
    }
  }
  G.bossShots = G.bossShots.filter(s => !s.dead);
}
function bossDown(b) {
  b.state = 'dying'; b.t = 0; b.hp = 0;
  b.vx = rand(-120, 120); b.vy = -40; b.vz = 1500; b.vr = 9; b.fly = { style: 'star', t: 0 };
  G.bossFight = null;
  if (!b.test) { S.bossBeat = S.bossBeat || {}; S.bossBeat[S.floor] = true; if (S.bossFail === S.floor) S.bossFail = 0; }
  else bigBanner('🏆 보스 격파! (테스트)', '보스 버튼으로 다음 보스를 불러올 수 있어요', '#f2c14e');
  const gain = b.value * comboMult(); earn(gain);
  b.say = { text: pick(['기억해 두겠다아아~!', '퇴직금은?!', '으아아아~!']), t: 2 };
  popup(b.x, b.y, '🧀+' + fmt(gain), '#f2c14e', 40, 2, 200);
  for (let i = 0; i < 20; i++) G.coins.push({ x: b.x + rand(-60, 60), y: b.y, t: 0, dur: rand(0.6, 1.2) });
  G.hitstop = 0.35; flash('#fff', 0.7); addShake(0.5); Sfx.boom(1.6); Sfx.clear();
  burst(b.x, b.y, 50, { colors: ['#fff', '#f2c14e', '#fff3bf'], type: 'star', min: 300, max: 900, s0: 4, s1: 10, z: 100 });
  writeSave();
}
// 쥐 기절 (공격·쥐덫). 죽지 않고 잠깐 전투 불능
function stunRat(r, t) { r.stun = Math.max(r.stun || 0, t); r.rushT = 0; r.sleep = 0; if (r.act) endAct(r); if (onScreen(r.x, r.y) && Math.random() < 0.3) popup(r.x, r.y, pick(['찍…', '@_@', '기절!']), '#fff', 15, 0.8, 30); }

// ── 그리기 ──
// 자세: 팔·다리 각도(라디안, 0 = 아래로), lean(몸 기울기), head(고개), scared(겁먹은 얼굴)
function humanPose(h) {
  const w = h.walk, p = { legN: 0, legF: 0, armN: 0, armF: 0, lean: 0, head: 0, scared: false, bob: 0, sx: 1, sy: 1 };
  const moving = Math.hypot(h.vx, h.vy) > 12;
  if (h.state === 'walk') { if (moving) { p.legN = Math.sin(w) * 0.45; p.legF = -p.legN; p.armN = -Math.sin(w) * 0.35; p.armF = -p.armN; p.bob = Math.abs(Math.cos(w)) * 3; } else { p.armN = Math.sin(G.t * 1.5 + h.x) * 0.05; } }
  else if (h.state === 'panic') {
    // 만화식 도망: 다리가 빙글빙글, 팔은 만세, 몸은 앞으로
    p.scared = true; p.legN = Math.sin(w * 2) * 1.2; p.legF = Math.sin(w * 2 + Math.PI) * 1.2; p.armN = Math.PI * 0.85 + Math.sin(G.t * 20) * 0.3; p.armF = Math.PI * 0.8 + Math.cos(G.t * 22) * 0.3; p.lean = -0.25; p.bob = Math.abs(Math.sin(w * 2)) * 8;
  } else if (h.state === 'fly' || h.state === 'dying') {
    p.scared = true;
    const st = h.fly ? h.fly.style : 'flail', t = G.t;
    if (st === 'swim') { const k = Math.sin(t * 9); p.armN = Math.PI * 0.5 + k * 1.2; p.armF = Math.PI * 0.5 - k * 1.2; p.legN = 0.3 + Math.sin(t * 9 + 1) * 0.6; p.legF = -0.3 - Math.sin(t * 9 + 1) * 0.6; }
    else if (st === 'star') { p.armN = 2.3; p.armF = -2.3; p.legN = 0.55; p.legF = -0.55; }
    else if (st === 'cannon') { p.armN = 1.9; p.armF = 1.7; p.legN = -1.7; p.legF = -1.5; p.sx = p.sy = 0.85; }
    else { p.armN = Math.sin(t * 28) * 2; p.armF = Math.cos(t * 25) * 2; p.legN = Math.sin(t * 26 + 1) * 1.1; p.legF = Math.cos(t * 23) * 1.1; }
  } else if (h.state === 'splat') { p.scared = true; p.armN = 2.4; p.armF = -2.4; p.legN = 0.5; p.legF = -0.5; p.sx = 1.15; p.sy = 0.92; }

  if (h.state === 'mount') {
    // 네 발 짐승처럼 뛰는 요리사: 팔다리를 쭉 편 채(무릎 안 꿇음) 몸은 수평, 사람 다리가 팔보다 길어 엉덩이가 들림
    // 팔다리·머리는 몸과 같이 돌아가므로 '세상 기준 각도'(+ = 앞쪽)를 몸 기울기에서 빼서 넣음
    const q = mountGait(h), L = q.lean;
    Object.assign(p, { lean: L, armN: L - q.armN, armF: L - q.armF, legN: L - q.legN, legF: L - q.legF, head: L - q.head, scared: true, dropK: q.drop, bob: q.lift });
    return p;
  }
  if (h.boss) {
    p.scared = h.state === 'dying';
    if (h.state === 'wait') { p.armN = 0.25; p.armF = -0.2; p.bob = Math.sin(G.t * 2) * 2; }
    const A = h.atk;
    if (A && A.type === 'stomp') { p.armN = A.air ? 2.6 : 1.2; p.armF = A.air ? -2.6 : -1.2; p.legN = A.air ? 0.8 : 0; p.legF = A.air ? -0.6 : 0; }
    if (A && A.type === 'flask') { p.armN = A.t < 0.4 ? Math.PI - 0.3 : -0.8; }
    if (A && A.type === 'swing') { p.armN = A.t < 0.45 ? Math.PI * 0.9 : -1.2; p.armF = A.t < 0.45 ? Math.PI * 0.7 : -0.9; p.lean = A.t < 0.45 ? 0.15 : -0.3; }
  }
  return p;
}
// 고양이 보스: 고양이 방치 게임 파츠 리그를 크게
// ── 슈퍼 요리사 쥐의 탈것: 네 발로 엎드린 요리사 (참고: 등에 올라타 머리카락 잡고 조종하는 로데오) ──
// 쥐 위치 = 요리사 등 한가운데. drawRat 이 부르고, 쥐를 그릴 높이(등 높이)를 돌려줌
const MOUNT_SEAT = 86, MOUNT_BACK = 18;   // 쥐가 앉는 등 높이(네 발로 섰을 때) · 요리사 엉덩이에서 앞쪽으로 떨어진 거리
const MOUNT_W = 128;                          // 지쳐 뻗은 요리사 그림 가로 크기
// 그림에서 등 높이 찾기(지쳐 뻗은 그림 m:cook_tired 용): 가운데~엉덩이 쪽(가로 45~75%)에서 가장 위에 있는 불투명 픽셀 → 쥐가 앉을 자리 (0~1)
const MOUNT_BACK_CACHE = new Map();
function mountBack(im) {
  let b = MOUNT_BACK_CACHE.get(im); if (b) return b;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data; let best = c.height, bx = 0.6;
  for (let x = Math.floor(c.width * 0.45); x < c.width * 0.75; x += 2) for (let y = 0; y < c.height; y++) if (d[(y * c.width + x) * 4 + 3] > 128) { if (y < best) { best = y; bx = x / c.width; } break; }
  b = { x: bx, y: best / c.height }; MOUNT_BACK_CACHE.set(im, b); return b;
}
// 요리사 걸음새 (세상 기준 각도, 0 = 아래, + = 앞쪽). 달릴 땐 우스꽝스러운 '플라잉 갤럽':
// 앞다리(팔)는 앞으로, 뒷다리는 뒤로 동시에 쫙 뻗으며 붕 뜨고 → 모아서 착지. 몸은 흔들목마처럼 앞뒤로 까딱, 머리는 덜렁덜렁
// lift = 뜬 높이(월드), pitch = 몸 까딱(+ = 앞이 들림), drop = 다리가 기운 만큼 몸이 내려감(발이 바닥에 붙게)
function mountGait(h) {
  if (!h.gallop) {
    const b = Math.sin(G.t * 9);   // 멈추면: 네 발로 뻣뻣하게 서서 헥헥 (배가 들썩)
    return { lean: -Math.PI / 2 + 0.06 + b * 0.03, armN: 0.12, armF: 0.02, legN: -0.1, legF: 0.02, head: -0.6 + b * 0.08, lift: 0, pitch: 0.06, drop: 1 - Math.cos(0.1) };
  }
  const f = h.walk * 0.9, s = Math.sin(f), c = Math.cos(f);
  const pitch = 0.28 * c, reach = 1.05 * s;
  return { lean: -Math.PI / 2 + pitch,
    armN: 0.2 + reach, armF: 0.2 + 1.0 * Math.sin(f - 0.45),          // 앞다리 두 개는 살짝 엇박자
    legN: -0.15 - reach, legF: -0.15 - 1.0 * Math.sin(f - 0.35),      // 뒷다리는 반대로 (앞이 앞으로 뻗을 때 뒤는 뒤로)
    head: -0.7 + Math.sin(f * 2) * 0.3 - pitch * 0.5,                  // 고개는 짐승처럼 앞으로 쭉 빼고 반 박자로 덜렁
    lift: Math.max(0, s) * 30, pitch, drop: 1 - Math.cos(0.15 + Math.abs(reach) * 0.55) };
}
// ── 네 발 짐승 요리사 전용 파츠 (dev/gen_mount_parts.mjs → assets/rats/humans/cook_mount/, js/mount_meta.js) ──
// 참고: 겟앰프드 '할머니 태운 기영이'. 수평 몸통 + 엉덩이 + 2마디 팔다리(무릎·팔꿈치가 굽음) + 끙끙/우는 머리
// 어깨·엉덩이 높이를 팔다리가 닿는 길이로 정하고 몸통을 그 사이에 걸침 → 뒷다리를 차면 엉덩이가 번쩍 들리고 몸이 저절로 까딱
const MIMG = {};
(function loadMountParts() {
  if (typeof MOUNT_PARTS === 'undefined') return;
  for (const k of Object.keys(MOUNT_PARTS.size)) {
    const i = new Image(); i.onload = () => { MIMG[k] = i; if (!['body', 'butt', 'strain', 'cry'].includes(k)) MIMG[k + '_far'] = darkerCopy(i, 0.22); }; i.src = `../assets/rats/humans/cook_mount/${k}.png`;
  }
})();
const mountReady = () => ['body', 'butt', 'thigh', 'shin', 'uparm', 'forearm', 'strain'].every(k => MIMG[k]);
// 몸통·엉덩이 관절 (이미지 안 비율): 어깨 S, 엉덩이 H(몸통 뒤끝), 목 N, 등 위 가운데 B / 엉덩이 그림의 허벅지 관절 J
// HEAD_H = 요리사 머리 높이(월드) → 전체 크기. 탄 쥐까지 합쳐 다른 쥐보다 한 단계 정도만 크게
// B = 쥐가 앉는 자리(어깨 쪽 등 위: 머리카락에 손이 닿게), HAIR = 머리 그림 안 뒤통수 머리카락 (쥐가 잡는 곳)
const MOUNT_RAT = 0.5;                         // 탄 쥐 크기 (보통 쥐 대비)
const BEAST = { S: [0.28, 0.78], H: [0.95, 0.55], N: [0.08, 0.82], B: [0.78, 0.04], J: [0.45, 0.8], HEAD_H: 54, SIT: 17, HAIR: [0.8, 0.56], PAW: [12, 10],
  LIMB: { thigh: 0.62, shin: 0.62, uparm: 0.55, forearm: 0.5 } };   // 팔다리는 짧게 눌러서 땅딸막하게 (참고 이미지처럼 낮고 넓적)
// 걸음새 (세상 기준 각도, 0 = 아래, + = 앞). ua/fa = 윗팔/아래팔, ta/sa = 허벅지/정강이, 먼 쪽(_f)은 엇박자
function beastGait(m) {
  if (!m.gallop) {
    const b = Math.sin(G.t * 9), w = Math.sin(G.t * 7);
    return { ua: 0.15, fa: -0.25, ua_f: 0.05, fa_f: -0.3, ta: 0.55, sa: -0.45, ta_f: 0.45, sa_f: -0.5, lift: 0, wig: w * 0.18, head: -0.15 + b * 0.06 };   // 멈춤: 개처럼 쪼그려 앉아 엉덩이 씰룩
  }
  const f = m.walk * 0.9, g = ph => { const s = Math.sin(f + ph); return { ua: 0.3 + 0.95 * s, fa: 0.3 + 0.95 * s - 0.35 - 0.9 * Math.max(0, -s), ta: 0.45 - 0.95 * s, sa: 0.45 - 0.95 * s - 1.0 - 0.3 * Math.max(0, s) }; };
  const n = g(0), fr = g(-0.45), s = Math.sin(f);
  return { ua: n.ua, fa: n.fa, ua_f: fr.ua, fa_f: fr.fa, ta: n.ta, sa: n.sa, ta_f: fr.ta, sa_f: fr.sa,
    lift: Math.max(0, s) * 22, wig: Math.sin(f * 2) * 0.22, head: -0.25 + Math.sin(f * 2 + 1) * 0.25 };
}
// 그리기: r 위치에 쥐가 앉도록 몸을 놓고, 쥐가 앉을 높이를 돌려줌
function drawCookBeast(r, m) {
  const P = MOUNT_PARTS, U = BEAST.HEAD_H / P.size.strain[1], q = beastGait(m);
  const LS = k => BEAST.LIMB[k] || 1;
  const sz = k => [P.size[k][0] * U, P.size[k][1] * U * LS(k)], len = k => P.size[k][1] * U * LS(k) * 0.86;   // 마디 길이 = 그림 세로의 86% (관절 여백 제외)
  const [bw, bh] = sz('body'), [uw, uh] = sz('butt');
  // 어깨·엉덩이 높이 = 팔다리가 닿는 높이 (cos: 0 = 수직)
  const reach = (a, b, k1, k2) => len(k1) * Math.cos(a) + len(k2) * Math.cos(b);
  const J0 = [(BEAST.J[0] - 0.28) * uw, (BEAST.J[1] - 0.55) * uh];     // 엉덩이 그림 안 허벅지 관절 (원점 = 몸통 뒤끝 H)
  const hs = reach(q.ua, q.fa, 'uparm', 'forearm') + (1 - BEAST.S[1]) * bh * 0.3, hh = reach(q.ta, q.sa, 'thigh', 'shin') + J0[1];
  const D = (BEAST.H[0] - BEAST.S[0]) * bw, rot = clamp(Math.atan2(hs - hh, D) * 0.7, -0.4, 0.4) - Math.atan2((BEAST.H[1] - BEAST.S[1]) * bh, D);   // 엉덩이가 높으면 앞으로 기욺 (너무 곤두박질치지 않게 줄이고 제한)
  const Rv = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  // 몸통 좌표(원점 = 엉덩이 H) → 세상(이미지 방향: 앞 = -x). 등 위 가운데 B 가 쥐 발밑(x = 0)에 오게
  const Bl = Rv((BEAST.B[0] - BEAST.H[0]) * bw, (BEAST.B[1] - BEAST.H[1]) * bh, rot);
  const Hx = -Bl[0], Hy = -hh - q.lift;
  const seat = -(Hy + Bl[1]) - BEAST.SIT;                // 앉은 쥐 리그는 다리 길이만큼 몸이 떠서 그만큼 내림
  const img = (k, far) => MIMG[far ? k + '_far' : k] || MIMG[k];
  const part = (k, x, y, a, far) => { const i = img(k, far), [w, h] = sz(k), pv = P.pivot[k]; if (!i) return; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.drawImage(i, -pv[0] * w, -pv[1] * h, w, h); ctx.restore(); };
  const limb = (k1, k2, x, y, a1, a2, far) => { part(k1, x, y, a1 - rot, far); const kx = x - Math.sin(a1 - rot) * len(k1), ky = y + Math.cos(a1 - rot) * len(k1); part(k2, kx, ky, a2 - rot, far); };
  const S = [(BEAST.S[0] - BEAST.H[0]) * bw, (BEAST.S[1] - BEAST.H[1]) * bh], N = [(BEAST.N[0] - BEAST.H[0]) * bw, (BEAST.N[1] - BEAST.H[1]) * bh];
  const J = Rv(J0[0], J0[1], q.wig);                          // 허벅지 관절: 엉덩이와 같이 씰룩
  const cam = ctx.getTransform();
  ctx.save(); ctx.globalAlpha = m.alpha;
  ctx.translate(r.x + (m.jit ? rand(-m.jit, m.jit) : 0), r.y * TILT - r.z); ctx.scale(-r.face / Math.sqrt(m.sq || 1), m.sq || 1);   // 그림은 왼쪽을 봄
  ctx.translate(Hx, Hy); ctx.rotate(rot);
  limb('uparm', 'forearm', S[0] + bw * 0.06, S[1], q.ua_f, q.fa_f, true);         // 먼 쪽 팔다리 (어둡게)
  limb('thigh', 'shin', J[0] - uw * 0.08, J[1], q.ta_f, q.sa_f, true);
  ctx.drawImage(MIMG.body, -BEAST.H[0] * bw, -BEAST.H[1] * bh, bw, bh);
  // 엉덩이: 몸통 뒤끝에 붙어서 씰룩
  ctx.save(); ctx.rotate(q.wig); ctx.drawImage(MIMG.butt, -uw * 0.28, -uh * 0.55, uw, uh); ctx.restore();
  // 머리: 목에서 앞으로 쭉 (달릴 땐 끙끙, 가끔 엉엉 / 멈추면 엉엉)
  const hk = (!m.gallop || Math.sin(G.t * 0.7 + r.x * 0.01) > 0.75) && MIMG.cry ? 'cry' : 'strain';
  const ha = q.head + (m.yank || 0) * 0.6 - rot;                    // 쥐가 머리카락을 당기면 고개가 뒤로 홱
  // 머리는 쥐를 그린 다음에(m.after, game.js drawRat) → 요리사 모자가 쥐 앞에 보이고, 쥐 앞발이 뒤통수 머리카락을 움켜쥔 것처럼
  const headM = ctx.getTransform().translate(N[0], N[1]).rotate(ha * 180 / Math.PI), alpha = m.alpha;
  { const [w, h] = sz(hk), pv = P.pivot[hk]; m.hairPt = cam.inverse().transformPoint(headM.transformPoint(new DOMPoint((BEAST.HAIR[0] - pv[0]) * w, (BEAST.HAIR[1] - pv[1]) * h))); }
  limb('thigh', 'shin', J[0], J[1], q.ta, q.sa);                                   // 가까운 쪽 팔다리
  limb('uparm', 'forearm', S[0], S[1], q.ua, q.fa);
  ctx.restore();
  m.after = () => {
    // 머리카락 가닥: 쥐 앞발 → 뒤통수 (당길 땐 팽팽, 평소엔 살짝 처짐). 머리가 위에 그려져 머리카락 속으로 이어짐
    const rs = RAT_SCALE * TIERS[r.tier].size * MOUNT_RAT, px = r.x + r.face * BEAST.PAW[0] * rs, py = r.y * TILT - r.z - seat - BEAST.PAW[1] * rs, hp = m.hairPt, sag = 5 * (1 - (m.yank || 0));
    ctx.save(); ctx.strokeStyle = '#7a4b2e'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(px, py + i * 1.2); ctx.quadraticCurveTo((hp.x + px) / 2, (hp.y + py) / 2 + sag + i, hp.x, hp.y + i * 1.5); ctx.stroke(); }
    ctx.restore();
    const i = MIMG[hk], [w, h] = sz(hk), pv = P.pivot[hk];
    ctx.save(); ctx.setTransform(headM); ctx.globalAlpha = alpha; ctx.drawImage(i, -pv[0] * w, -pv[1] * h, w, h); ctx.restore();
  };
  return seat;
}
// 탄 쥐: 허리 펴고 앉아서 앞발로 요리사 머리를 꽉 잡음 (참고 이미지의 기수 자세)
// 라따뚜이 패러디: 앞발로 요리사 머리카락을 쥐고 조종. yank(당기기) 땐 뒤로 젖히며 앞발을 확 끌어당김
const MOUNT_POSE = r => { const y = (r && r.mount && r.mount.yank) || 0;
  return { front: 0.35 - y * 0.5 + Math.sin(G.t * 12) * 0.05, farFront: 0.3 - y * 0.4 + Math.cos(G.t * 12) * 0.05, back: 1.2, farBack: 1.1, head: -0.25 - y * 0.2, tail: 1.1 + Math.sin(G.t * 6) * 0.2, tilt: 0.12 - y * 0.4, bob: 0, sx: 1, sy: 1 }; };
function drawMount(r) {
  const m = r.mount || (r.mount = { kind: 'cook', k: HK_BY_ID.cook, x: r.x, y: r.y, z: 0, vx: 0, vy: 0, face: r.face, walk: 0, sc: 1.35, state: 'mount', appear: 1, alpha: 1, jit: 0, sq: 1, hp: 1, hpMax: 1 });
  const mv = r.speed > 25 || (r.ultOn && G.ult && G.ult.r === r);
  // 조종: 방향을 바꾸거나 출발할 때 머리카락을 홱 당김 (달리는 중에도 가끔)
  const turn = m.face !== undefined && m.face !== r.face, go = mv && !m.gallop;
  if (turn || go || (mv && Math.random() < 0.006)) {
    m.yank = turn ? 1 : Math.max(m.yank || 0, 0.7);
    if (turn && onScreen(r.x, r.y) && Math.random() < 0.18) popup(r.x, r.y, pick(['아야야야!!', '머리카락!!', '살살 당겨!', '왼쪽! 아니 오른쪽!']), '#fff', 15, 0.8, 110);
  }
  m.yank = Math.max(0, (m.yank || 0) - 0.05);
  m.face = r.face; m.walk += (mv ? 0.35 : 0.04); m.gallop = mv;
  m.x = r.x - r.face * MOUNT_BACK; m.y = r.y - 1; m.z = r.z; m.alpha = r.ghost ? 0.6 : 1; m.state = 'mount';
  m.jit = r.ultOn && G.ult && G.ult.r === r && G.ult.u.type === 'grandcuisine' && G.ult.t < 3.3 ? 1.5 : 0;
  ctx.save(); ctx.fillStyle = 'rgba(30,15,5,.18)'; ctx.beginPath(); ctx.ellipse(m.x + r.face * 10, m.y * TILT, 48, 12, 0, 0, 6.28); ctx.fill(); ctx.restore();
  // 사람 리그로 네 발 짐승처럼 뛰기(mountGait). 필살기 끝나면 지쳐 뻗은 그림(m:cook_tired)
  const tired = r.ultOn && G.ult && G.ult.r === r && G.ult.boom, im = tired && IMG['art_m:cook_tired'];
  m.pant = !tired;                                   // 혀: 멈추면 헥헥, 달리면 바람에 펄럭
  if (!m.gallop && !tired && onScreen(r.x, r.y) && Math.random() < 0.02) popup(m.x + r.face * 50, r.y, pick(['헥헥', '헥…헥…', '허억 허억', '물… 물…']), '#fff', 15, 0.7, 60);
  if (im) {
    const w = MOUNT_W, h = w * im.height / im.width, back = mountBack(im);
    ctx.save(); ctx.globalAlpha = m.alpha; ctx.translate(r.x + (m.jit ? rand(-m.jit, m.jit) : 0) - r.face * (back.x - 0.5) * -w, r.y * TILT - r.z); ctx.scale(-r.face, 1);
    ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
    return h * (1 - back.y) - 10;
  }
  const beast = mountReady(), q = beast ? null : mountGait(m);
  // 착지할 때마다 흙먼지 + 가끔 효과음 글자 (보폭 한 번 = 2π)
  const stride = Math.floor(m.walk * 0.9 / (Math.PI * 2) + 0.25);
  if (m.gallop && stride !== m.stride && onScreen(r.x, r.y)) {
    dust(m.x, m.y, 2, 0.7); m.sq = 0.88;   // 착지 찌그러짐
    if (Math.random() < 0.07) popup(m.x - r.face * 30, r.y, pick(['다그닥!', '두두두두', '히히힝?!', '이랴!!', '살려줘어~']), '#fff', 16, 0.7, 90);
  }
  m.stride = stride; m.sq += (1 - m.sq) * 0.2;
  if (beast) return (r.mountZ = drawCookBeast(r, m));    // 전용 파츠가 있으면 네 발 짐승 리그 (말풍선 높이용으로 기억)
  drawHuman(m);
  return MOUNT_SEAT + q.lift + Math.sin(q.pitch) * MOUNT_BACK;          // 등 높이 (앞이 들리면 쥐도 같이 들림)
}
function drawBossCat(b) {
  const rig = CAT_RIGS[b.boss.cat], A = b.atk;
  ctx.save(); ctx.globalAlpha = clamp(b.alpha, 0, 1);
  ctx.translate(b.x + (b.jit ? rand(-b.jit, b.jit) : 0), b.y * TILT - b.z);
  if (b.state === 'dying') { ctx.translate(0, -120); ctx.rotate(b.rot); ctx.translate(0, 120); }
  ctx.scale(-b.face, 1);
  const mode = b.state === 'dying' ? 'flung' : A && (A.type === 'pounce') ? (A.air ? 'pounce' : 'crouch') : A && (A.type === 'hairball' || A.type === 'fireball' || A.type === 'gravity') ? 'cast' : 'walk';
  if (rig) drawCatRig(rig, CAT_LEN * 4.2, catPose({ vx: b.vx, vy: b.vy, walk: b.walk }, mode));
  else drawArt(ctx, mode === 'pounce' ? 'w:cat_pounce' : 'w:cat', 450);
  ctx.restore();
}
function drawHuman(h) {
  if (h.boss && h.boss.cat) { drawBossCat(h); return; }
  const id = h.boss ? h.boss.id : h.kind, M = typeof HUMAN_PARTS !== 'undefined' && HUMAN_PARTS[id];
  const P = humanPose(h), sc = h.sc * (h.appear < 1 ? easeOutBack(h.appear) : 1);
  ctx.save();
  ctx.globalAlpha = clamp(h.alpha, 0, 1);
  ctx.translate(h.x + (h.jit ? rand(-h.jit, h.jit) : 0), h.y * TILT - h.z - P.bob);
  if (h.state === 'fly' || h.state === 'dying') { ctx.translate(0, -HUMAN_H * sc * 0.45); ctx.rotate(h.rot); ctx.translate(0, HUMAN_H * sc * 0.45); }
  else if (h.sjRot) { ctx.translate(0, -HUMAN_H * sc * 0.45); ctx.rotate(h.sjRot); ctx.translate(0, HUMAN_H * sc * 0.45); }   // 슈퍼 점프로 둥실 떠서 기우뚱
  ctx.scale(-h.face * sc * P.sx / Math.sqrt(h.sq || 1), sc * P.sy * (h.sq || 1));    // 통통 튈 때 납작           // 그림은 왼쪽을 봄
  if (!M || !HIMG[id + '/torso']) drawHumanFallback(h, P);
  else {
    const T = HIMG[id + '/torso'], L = HIMG[id + '/leg'], A = HIMG[id + '/arm'], Hd = HIMG[id + '/' + (P.scared && HIMG[id + '/scared'] ? 'scared' : 'head')];
    const sz = k => M.size[k], ts = sz('torso'), ls = sz('leg'), as = sz('arm'), hk = P.scared && M.size.scared ? 'scared' : 'head', hs = sz(hk);
    const legLen = ls[1] * 0.95, total = legLen + ts[1] * M.anchor.hip[1] + hs[1] * 0.85, u = HUMAN_H / total;
    ctx.scale(u, u);
    if (P.dropK) ctx.translate(0, legLen * P.dropK);        // 다리를 꿇은 만큼 몸이 내려감 (네 발 기기)
    const hipX = 0, hipY = -legLen, tx = hipX - M.anchor.hip[0] * ts[0], ty = hipY - M.anchor.hip[1] * ts[1];
    const sh = [tx + M.anchor.shoulder[0] * ts[0], ty + M.anchor.shoulder[1] * ts[1]], nk = [tx + M.anchor.neck[0] * ts[0], ty + M.anchor.neck[1] * ts[1] + ts[1] * 0.05];
    ctx.save(); ctx.translate(hipX, hipY); ctx.rotate(P.lean); ctx.translate(-hipX, -hipY);
    const limb = (img, piv, size, x, y, ang) => { if (!img) return; ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.drawImage(img, -piv[0] * size[0], -piv[1] * size[1], size[0], size[1]); ctx.restore(); };
    limb(HIMG[id + '/arm_far'], M.pivot.arm, as, sh[0] + ts[0] * 0.08, sh[1], -P.armF);
    limb(HIMG[id + '/leg_far'], M.pivot.leg, ls, hipX + ts[0] * 0.12, hipY - ls[1] * 0.04, -P.legF);
    limb(L, M.pivot.leg, ls, hipX - ts[0] * 0.1, hipY - ls[1] * 0.04, -P.legN);
    ctx.drawImage(T, tx, ty, ts[0], ts[1]);
    limb(Hd, M.pivot[hk], hs, nk[0], nk[1], -P.head);
    if (h.pant) {
      // 헥헥: 혀를 쭉 내밀고 할딱할딱
      const pv = M.pivot[hk]; ctx.save(); ctx.translate(nk[0], nk[1]); ctx.rotate(-P.head); ctx.translate(-pv[0] * hs[0] + hs[0] * 0.2, -pv[1] * hs[1] + hs[1] * 0.8);
      ctx.fillStyle = '#6b3e3a'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 16, 0, 0, 6.28); ctx.fill();        // 헤벌린 입
      ctx.rotate(h.gallop ? -0.9 + Math.sin(G.t * 30) * 0.45 : 0.35 + Math.sin(G.t * 18) * 0.3); ctx.fillStyle = '#e8786a'; rr(ctx, -15, -6, 30, 52 + Math.sin(G.t * 18) * 10, 15); ctx.fill(); ctx.fillStyle = '#c9504a'; ctx.fillRect(-2, 4, 4, 30); ctx.restore();   // 혀: 달릴 땐 바람에 뒤로 펄럭
      if (!h.gallop && Math.random() < 0.08) particle({ x: h.x - h.face * 60 * h.sc, y: h.y, z: 50 * h.sc, vx: -h.face * 60, vy: 0, vz: 20, life: 0.5, max: 1, size: 8, color: 'rgba(250,247,240,', type: 'dust', drag: 2 });   // 헥헥 숨결
    }
    limb(A, M.pivot.arm, as, sh[0] - ts[0] * 0.05, sh[1], -P.armN);
    ctx.restore();
  }
  ctx.restore();
  if (h.flashT > 0) { /* 흰 번쩍임은 비용이 커서 생략: 흔들림으로 대신 */ }
  if (h.state === 'splat' && onScreen(h.x, h.y)) {
    ctx.save(); ctx.translate(h.x, h.y * TILT - h.z - HUMAN_H); ctx.fillStyle = '#f0c878'; ctx.font = "14px sans-serif"; ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) { const a = G.t * 6 + i * 2.09; ctx.fillText(i === 1 ? '🐥' : '★', Math.cos(a) * 26, Math.sin(a) * 8); }
    ctx.restore();
  }
}
// 이미지가 없을 때 대체 그림 (막대 인형)
function drawHumanFallback(h, P) {
  const col = { researcher: '#f3ede2', guard: '#51607a', janitor: '#8fa98b' }[h.kind] || '#6f6a66';
  const limb = (x, y, ang, len, w, c) => { ctx.save(); ctx.translate(x, y); ctx.rotate(-ang); rr(ctx, -w / 2, 0, w, len, w / 2); ctx.fillStyle = c; ctx.fill(); ctx.restore(); };
  limb(4, -70, P.legF, 70, 16, '#8e8a84'); limb(-4, -70, P.legN, 70, 16, '#6f6a66');
  rr(ctx, -22, -125, 44, 62, 12); ctx.fillStyle = col; ctx.fill();
  limb(-2, -118, P.armN, 55, 12, col);
  circ(ctx, -4, -140, 18); ctx.fillStyle = '#f2c6a8'; ctx.fill();
}
// HP 바 (Codex 이미지 u:hp_empty + 초록/노랑/빨강을 남은 비율만큼 잘라서 겹침). 물건은 맞은 뒤 잠깐, 사람은 다쳤을 때
function drawHPBar(x, y, w, k, inv) {
  const E = IMG['art_u:hp_empty'], F = IMG[k > 0.5 ? 'art_u:hp_green' : k > 0.25 ? 'art_u:hp_yellow' : 'art_u:hp_red'];
  ctx.save(); ctx.translate(x, y); ctx.scale(inv, inv);
  const h = w / 5.1;
  if (E && F) {
    ctx.drawImage(E, -w / 2, -h, w, h);
    const rim = 0.07, sw = F.width * (rim + (1 - 2 * rim) * k);
    if (k > 0) ctx.drawImage(F, 0, 0, sw, F.height, -w / 2, -h, w * sw / F.width, h);
  } else {
    rr(ctx, -w / 2, -h, w, h, h / 2); ctx.fillStyle = 'rgba(251,247,239,.95)'; ctx.fill();
    rr(ctx, -w / 2 + 2, -h + 2, (w - 4) * k, h - 4, (h - 4) / 2); ctx.fillStyle = k > 0.5 ? '#8fa98b' : k > 0.25 ? '#e3c46a' : '#d9786a'; ctx.fill();
  }
  ctx.restore();
}
function drawHPBars(inv) {
  for (const it of G.items) {
    if (it.state !== 'rest' || it.hp >= it.hpMax || !(G.t - (it.hpT || -9) < 2.5) || !onScreen(it.x, it.y, 20)) continue;
    ctx.globalAlpha = clamp((2.5 - (G.t - it.hpT)) * 2, 0, 1);
    drawHPBar(it.x, it.y * TILT - it.z - it.r * 2.3 - 6, 66, clamp(it.hp / it.hpMax, 0, 1), inv);
  }
  ctx.globalAlpha = 1;
  for (const h of G.humans) {
    if (h.boss || h.hp >= h.hpMax || (h.state !== 'walk' && h.state !== 'panic') || !onScreen(h.x, h.y)) continue;
    drawHPBar(h.x, h.y * TILT - h.z - HUMAN_H * h.sc - 12, 96, clamp(h.hp / h.hpMax, 0, 1), inv);
  }
  const c = G.cat;
  if (c && c.state !== 'flung' && c.state !== 'leave' && c.alpha > 0.5 && onScreen(c.x, c.y)) drawHPBar(c.x, c.y * TILT - c.z - 92, 90, clamp(c.hp / c.hpMax, 0, 1), inv);
}
function drawBossShots() {
  for (const s of G.bossShots || []) {
    ctx.save(); ctx.translate(s.x, s.y * TILT - s.z); ctx.rotate(s.rot);
    if (s.hair) { ctx.fillStyle = '#c8a27a'; circ(ctx, 0, 0, 13); ctx.fill(); ctx.strokeStyle = '#a47a57'; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(0, 0, 6 + i * 1.3, i, i + 2); ctx.stroke(); } }
    else if (!drawArt(ctx, s.fire ? '🔥' : 'i:flask', s.fire ? 36 : 30)) { ctx.fillStyle = s.fire ? '#e39a5a' : '#9dd5a8'; circ(ctx, 0, 0, 9); ctx.fill(); }
    ctx.restore();
  }
}
