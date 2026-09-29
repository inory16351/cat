'use strict';
// ───────────────────────── 종별 특수 액션 ─────────────────────────
// 데이터(이름·발동 조건·종류)는 data.js 의 ACT_LIST. 종별 스킬 트리 'act'(해금·확률) / 'actPow'(위력) / 'actX'(각성).
// 화면에 보이는 쥐만 발동하고, 화면 안 동시 진행은 3개까지 (너무 정신없지 않게).
// 액션 중인 쥐는 r.act 로 조종되고(묘기처럼), 자세는 actPose 가 ratPose 위에 덮어씀.
const ACT_MAX_VIS = 3, ACT_CD = 6;
// 손에 드는 소품 (드랍 소품은 그걸 들고, 없는 종은 여기서)
const ACT_HOLD = { chef: '🔪', nerd: '✏️', samurai: '🗡️', knight: '🛡️', idol: '🎤', pirate: '🧨', santa: '🎁', mailman: '✉️', emperor: '📜', detective: '🔍', cowboy: '🪢', sultan: '🪔' };
// 던지는 물건 (없으면 드는 소품 → 액션 아이콘)
const ACT_THROW = { emperor: '🏹', robot: '🚀', pirate: '💣', mailman: '✉️', santa: '🎁', scientist: '⚗️' };
const ACT_DUR = { gunkata: 2.4, slam: 1.55, slash: 1.3, barrage: 1.5, sonic: 2.2, beam: 2, breath: 1.7, ball: 3, summon: 0.9, vortex: 2, meteor: 1.6, midas: 1.2, tornado: 2.6, dig: 2.2, cheer: 1.6, feast: 1.8, throw: 1.5 };
const ACT_COL = { vampire: '#d9786a', cosmic: '#cdb4db', glowy: '#d6f0a8', cowboy: '#c8a27a', firefighter: '#9fd3e6', dragon: '#f0c878' };

const actLv = r => rsl(r.sp.id, 'act');
const actP = r => actPower(r.sp, rsl(r.sp.id, 'actPow'), rsl(r.sp.id, 'ult'));
const actAwake = r => rsl(r.sp.id, 'actX') > 0;
function canAct(r) {
  if (!actLv(r) || r.act || r.trick || r.temp || r.actCD > 0 || G.sj || r.born < 1 || !onScreen(r.x, r.y, -30)) return false;
  let n = 0; for (const o of G.rats) if (o.act && onScreen(o.x, o.y)) n++;
  return n < ACT_MAX_VIS;
}
// 발동 조건 판정 → 성공하면 시작
function actTrigger(r, trig, extra) {
  const a = r.sp.act;
  if (!a || a.trig !== trig || !canAct(r)) return false;
  const k = actK(actLv(r));
  if (trig === 'combo' && G.combo < a.n) return false;
  if (trig === 'gold' && !(extra && extra.gold)) return false;
  if (trig === 'crowd' || trig === 'timer') return false;          // 주기형은 actTick 에서
  if (Math.random() >= Math.min(1, a.p * k)) return false;
  return startAct(r);
}
// 주기형(timer·crowd) + 쿨타임
function actTick(r, dt) {
  r.actCD = (r.actCD || 0) - dt;
  const a = r.sp.act;
  if (!a || !actLv(r) || (a.trig !== 'timer' && a.trig !== 'crowd')) return;
  r.actT = (r.actT ?? rand(3, a.cd)) - dt;
  if (r.actT > 0) return;
  r.actT = a.cd / actK(actLv(r)) * rand(0.8, 1.2);
  if (a.trig === 'crowd') { let n = 0; near(ratGrid, r.x, r.y, o => { if (o !== r && Math.hypot(o.x - r.x, o.y - r.y) < 200) n++; }, 2); if (n < a.n) { r.actT = 2; return; } }
  if (canAct(r)) startAct(r); else r.actT = 2;
}
function startAct(r, prop) {
  const a = r.sp.act, P = actP(r), x = actAwake(r);
  r.sleep = 0; r.vx = r.vy = 0; r.trick = null; r.rushT = 0;
  r.act = { type: a.type, t: 0, dur: ACT_DUR[a.type] * (a.type === 'slam' && x ? 5 / 3 : a.type === 'slash' && x ? 1.6 : a.type === 'ball' && x ? 1.5 : a.type === 'throw' && x ? 2.4 : 1),
    P, x, hold: prop || a.prop || ACT_HOLD[r.sp.id] || null, hitT: 0, n: 0, hits: new Map(), ang: rand(0, 6.28) };
  r.actCD = ACT_CD;
  if (a.type === 'ball') { const s = 620; r.vx = Math.cos(r.act.ang) * s; r.vy = Math.sin(r.act.ang) * s; }
  if (a.type === 'tornado') { r.act.dir = rand(0, 6.28); }
  // 외침: 액션 이름(크게) + 말풍선(대사)
  popup(r.x, r.y, `${a.icon} ${a.name}!`, TIERS[r.tier].col === '#a8a29a' ? '#fff3bf' : shade(TIERS[r.tier].col, 0.35), 22, 1.2, 50 * TIERS[r.tier].size + 30);
  r.say = { text: pick(a.lines), t: 1.4 };
  ring(r.x, r.y, 60, '#fff3bf', 0.4, 6); dust(r.x, r.y, 4, 0.8); Sfx.crit();
  return true;
}
function endAct(r) {
  const A = r.act; if (!A) return;
  if (A.held && A.held.state === 'held') { A.held.state = 'rest'; A.held.z = 0; }
  r.act = null; r.z = 0; r.vz = 0; r.under = false; r.ballS = 0;
  stopDash(r, 0.2, 0.5);
}
const nearestItem = (r, R, pred = () => true) => { let best = null, bd = R; near(itemGrid, r.x, r.y, it => { if (it.state !== 'rest' || it.appear < 1 || !pred(it)) return; const d = Math.hypot(it.x - r.x, it.y - r.y); if (d < bd) { bd = d; best = it; } }, Math.ceil(R / CELL)); return best; };
const itemsIn = (x, y, R) => { const out = []; near(itemGrid, x, y, it => { if (it.state === 'rest' && Math.hypot(it.x - x, it.y - y) < R + it.r) out.push(it); }, Math.ceil(R / CELL) + 1); return out; };

// ── 액션 진행 ──
function actStep(r, dt) {
  const A = r.act, P = A.P, dmg = ratDamage(r) * P, vis = onScreen(r.x, r.y);
  A.t += dt; A.hitT -= dt;
  const k = A.t / A.dur, drag = d => { const f = Math.max(0, 1 - d * dt); r.vx *= f; r.vy *= f; };
  switch (A.type) {
    case 'gunkata': {
      // 빙글빙글 돌며 사방으로 탕탕탕
      drag(8);
      if (A.hitT <= 0 && k < 0.92) {
        A.hitT = 0.06; A.ang += 2.39996;
        for (const a of A.x ? [A.ang, A.ang + Math.PI] : [A.ang]) {
          const ux = Math.cos(a), uy = Math.sin(a);
          G.bullets.push({ x: r.x + ux * 16, y: r.y + uy * 16, vx: ux * 1150, vy: uy * 1150, life: 0.4, dmg, by: r });
          if (vis) particle({ x: r.x + ux * 20, y: r.y + uy * 20, z: 16, vx: ux * 60, vy: uy * 60, life: 0.08, max: 0.08, size: 7, color: '#fff3bf', type: 'spark', drag: 0 });
        }
        r.face = Math.cos(A.ang) >= 0 ? 1 : -1;
        if (vis && (A.n++ % 3 === 0)) Sfx.clink();
      }
      if (!A.done && k >= 0.95) { A.done = true; if (vis) popup(r.x, r.y, '(후~)', '#fff', 16, 0.8, 50); }
      break;
    }
    case 'slam': {
      // n번 콩콩 뛰었다가 쾅
      const hops = A.x ? 5 : 3, hk = (A.t / A.dur * hops) % 1, idx = Math.floor(A.t / A.dur * hops);
      r.z = Math.sin(hk * Math.PI) * 75;
      if (idx !== A.n && idx <= hops) {
        A.n = idx;
        shock(r.x, r.y, 80 + 15 * P, dmg * 2, r, '#fff', 1.3);
        stampAt(r.x, r.y, m => { m.fillStyle = 'rgba(60,50,45,.18)'; m.beginPath(); m.ellipse(r.x, r.y, 34, 26, 0, 0, 6.28); m.fill(); });
        const t = nearestItem(r, 260);
        if (t) { const a = Math.atan2(t.y - r.y, t.x - r.x); r.vx = Math.cos(a) * 260; r.vy = Math.sin(a) * 260; r.face = Math.cos(a) >= 0 ? 1 : -1; }
      }
      drag(1.5);
      break;
    }
    case 'slash': {
      // 물건 사이를 순간 돌진: 지나간 선 위의 물건 전부 베기
      const segs = A.x ? 7 : 4, seg = A.dur / segs, idx = Math.floor(A.t / seg);
      if (idx !== A.n - 1 && idx < segs && A.t - idx * seg < 0.02 + dt) {
        A.n = idx + 1;
        const t = nearestItem(r, 380, it => !A.hits.has(it)) || nearestItem(r, 380);
        const a = t ? Math.atan2(t.y - r.y, t.x - r.x) : rand(0, 6.28), len = t ? Math.hypot(t.x - r.x, t.y - r.y) + 50 : 200;
        const o = { x: r.x + Math.cos(a) * len, y: r.y + Math.sin(a) * len, vx: 0, vy: 0 };
        confine(o, ratR(r), r.x, r.y, 0, null);
        const x1 = r.x, y1 = r.y;
        const L = Math.hypot(o.x - x1, o.y - y1) || 1, ux = (o.x - x1) / L, uy = (o.y - y1) / L;
        near(itemGrid, (x1 + o.x) / 2, (y1 + o.y) / 2, it => {
          if (it.state !== 'rest') return;
          const px = it.x - x1, py = it.y - y1, along = px * ux + py * uy;
          if (along < -10 || along > L + 10 || Math.abs(px * uy - py * ux) > it.r + 22) return;
          A.hits.set(it, 1);
          later(0.12, () => damageItem(it, dmg * 3, r, true, a));
        }, Math.ceil(L / 2 / CELL) + 1);
        r.x = o.x; r.y = o.y; r.face = ux >= 0 ? 1 : -1;
        if (vis || onScreen(x1, y1)) { G.slashes.push({ x1, y1, x2: r.x, y2: r.y, life: 0.35, max: 0.35 }); Sfx.dash(); dust(x1, y1, 3, 0.7); }
      }
      r.vx = r.vy = 0;
      break;
    }
    case 'barrage': {
      // 주변 물건을 향해 연속 투척
      const n = (4 + Math.floor(P)) * (A.x ? 2 : 1), gap = (A.dur * 0.85) / n;
      if (A.hitT <= 0 && A.n < n) {
        A.hitT = gap; A.n++;
        const t = pick(itemsIn(r.x, r.y, 360)) || { x: r.x + rand(-200, 200), y: r.y + rand(-160, 160) };
        const T = 0.55, tx = t.x + rand(-15, 15), ty = t.y + rand(-15, 15);
        G.bombs.push({ x: r.x, y: r.y, z: 24, vx: (tx - r.x) / T, vy: (ty - r.y) / T, vz: 420, t: 0, rad: 75 + 10 * P, dmg: dmg * 2, by: r, icon: ACT_THROW[r.sp.id] || A.hold || r.sp.act.icon });
        r.face = tx > r.x ? 1 : -1; r.bite = 1;
        if (vis) Sfx.dash();
      }
      drag(8);
      break;
    }
    case 'sonic': {
      // 음파: 둥-둥- 퍼지는 충격파 + 동료 광란
      const R = (140 + 20 * P) * (A.x ? 1.5 : 1), sleepy = r.sp.id === 'sleepy';
      if (A.hitT <= 0 && A.n < 5) {
        A.hitT = 0.42; A.n++;
        aoe(r.x, r.y, R, dmg * 0.9, r);
        if (!sleepy) for (const o of G.rats) if (Math.hypot(o.x - r.x, o.y - r.y) < R) o.frenzy = Math.max(o.frenzy, 2.5);
        if (vis) {
          const col = sleepy ? 'rgba(191,227,234,.95)' : 'rgba(240,200,120,.95)';
          ring(r.x, r.y, R, col, 0.45, 9); ring(r.x, r.y, R * 0.6, '#fff', 0.35, 5);
          popup(r.x + rand(-40, 40), r.y, sleepy ? 'ZZZ' : pick(['♪', '♫', '♬']), sleepy ? '#bfe3ea' : '#fff3bf', 26, 0.9, 60);
          addShake(0.05); Sfx.thump(0.8);
        }
      }
      r.vx = r.vy = 0;
      break;
    }
    case 'beam': {
      // 몸을 돌리며 360° 레이저
      const a0 = A.ang + k * Math.PI * 2, len = 400, col = r.sp.id === 'alien' ? '#9dd5a8' : '#e8786a';
      for (const a of A.x ? [a0, a0 + Math.PI] : [a0]) {
        const ux = Math.cos(a), uy = Math.sin(a);
        if (vis) G.beams.push({ x1: r.x, y1: r.y, x2: r.x + ux * len, y2: r.y + uy * len, life: 0.05, max: 0.05, col });
        for (let s = 40; s < len; s += CELL * 0.7) near(itemGrid, r.x + ux * s, r.y + uy * s, it => {
          if (it.state !== 'rest' || (A.hits.get(it) || 0) > G.t) return;
          const px = it.x - r.x, py = it.y - r.y, along = px * ux + py * uy;
          if (along > 0 && along < len && Math.abs(px * uy - py * ux) < it.r + 12) { A.hits.set(it, G.t + 0.3); damageItem(it, dmg * 2, r, false, a); }
        });
      }
      r.face = Math.cos(a0) >= 0 ? 1 : -1; r.vx = r.vy = 0;
      if (vis && A.hitT <= 0) { A.hitT = 0.25; Sfx.laser(); }
      break;
    }
    case 'breath': {
      // 부채꼴로 휘두르는 브레스 (각성: 한 바퀴)
      const range = 170 + 20 * P, base = r.face > 0 ? 0 : Math.PI, a = A.x ? base + k * Math.PI * 2 : base + Math.sin(A.t * 5) * 0.8;
      A.aim = a; r.vx = r.vy = 0;
      const water = r.sp.id === 'firefighter';
      if (A.hitT <= 0) {
        A.hitT = 0.1;
        near(itemGrid, r.x, r.y, it => {
          if (it.state !== 'rest') return;
          const dx = it.x - r.x, dy = it.y - r.y, d = Math.hypot(dx, dy);
          let da = Math.atan2(dy, dx) - a; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (d < range + it.r && Math.abs(da) < 0.45) damageItem(it, dmg * 0.8, r, false, Math.atan2(dy, dx));
        }, Math.ceil(range / CELL) + 1);
      }
      if (vis) for (let i = 0; i < 5; i++) { const aa = a + rand(-0.4, 0.4), s = rand(0.4, 1) * range * 3; particle({ x: r.x, y: r.y, z: 16, vx: Math.cos(aa) * s, vy: Math.sin(aa) * s, vz: rand(10, 50), life: rand(0.25, 0.4), max: 0.4, size: rand(5, 11), color: pick(water ? ['#9fd3e6', '#bfe3ea', '#fff'] : ['#f0c878', '#e39a5a', '#d9786a', '#fff3bf']), type: 'spark', drag: 3 }); }
      if (vis && Math.random() < 0.12) Sfx.boom(0.25);
      break;
    }
    case 'ball': {
      // 거대한 공이 되어 핀볼처럼 (벽 튕김은 moveRat 의 대포알 처리 공유)
      r.ballS = Math.min(A.x ? 2.8 : 2.1, 1 + A.t * 6);
      const rad = ratR(r) * r.ballS;
      const sp = Math.hypot(r.vx, r.vy); if (sp < 450) { r.vx *= 450 / (sp || 1); r.vy *= 450 / (sp || 1); }
      near(itemGrid, r.x, r.y, it => {
        if (it.state !== 'rest') return;
        const dx = r.x - it.x, dy = r.y - it.y, d = Math.hypot(dx, dy);
        if (d > rad + it.r || (A.hits.get(it) || 0) > G.t) return;
        A.hits.set(it, G.t + 0.25);
        const nx = dx / (d || 1), ny = dy / (d || 1), dot = r.vx * nx + r.vy * ny;
        if (dot < 0) { r.vx -= 2 * dot * nx; r.vy -= 2 * dot * ny; }
        damageItem(it, dmg * 2, r, false, Math.atan2(-ny, -nx));
        if (vis) { ring(it.x, it.y, it.r + 16, '#fff', 0.2, 5); Sfx.clink(); addShake(0.02); }
      }, 2);
      if (vis && Math.random() < 0.6) dust(r.x, r.y, 1, 0.6);
      break;
    }
    case 'summon': {
      r.vx = r.vy = 0;
      if (!A.done && A.t > 0.3) {
        A.done = true;
        const n = (2 + Math.floor(P)) * (A.x ? 2 : 1), temps = G.rats.filter(o => o.temp).length;
        for (let i = 0; i < Math.min(n, 40 - temps); i++) {
          const a = i / n * 6.28, o = makeRat(r.sp.id, r.x + Math.cos(a) * 40, r.y + Math.sin(a) * 30);
          confine(o, ratR(o), r.x, r.y, 0, null);
          o.temp = 6; o.ghost = r.sp.id === 'ninja' || r.sp.id === 'ghost'; o.noBreed = 99; o.breedCD = 99; o.born = 0; o.frenzy = 6; o.face = Math.cos(a) >= 0 ? 1 : -1;
          G.rats.push(o);
          if (vis) smoke(o.x, o.y);
        }
        if (vis) { ring(r.x, r.y, 90, '#fff', 0.4, 6); Sfx.pop(); }
      }
      break;
    }
    case 'vortex': {
      // 빨아들이기 → 쾅
      const R = (200 + 20 * P) * (A.x ? 1.5 : 1), col = ACT_COL[r.sp.id] || '#fff3bf';
      r.vx = r.vy = 0;
      if (k < 0.8) {
        for (const it of itemsIn(r.x, r.y, R)) { const dx = r.x - it.x, dy = r.y - it.y, d = Math.hypot(dx, dy) || 1; if (d > 30) { it.pvx = (it.pvx || 0) + dx / d * 1400 * dt; it.pvy = (it.pvy || 0) + dy / d * 1400 * dt; it.wob = 0.6; } }
        if (vis) for (let i = 0; i < 3; i++) { const a = rand(0, 6.28), d = rand(R * 0.6, R); particle({ x: r.x + Math.cos(a) * d, y: r.y + Math.sin(a) * d, z: 10, vx: -Math.cos(a + 0.8) * d * 2.2, vy: -Math.sin(a + 0.8) * d * 2.2, life: 0.4, max: 0.4, size: rand(3, 6), color: col, type: 'spark', drag: 0 }); }
        if (vis && A.hitT <= 0) { A.hitT = 0.3; ring(r.x, r.y, R, col, 0.35, 4); }
      } else if (!A.done) {
        A.done = true;
        shock(r.x, r.y, R * 0.55, dmg * 4, r, col, 2);
        if (vis) { ring(r.x, r.y, R * 0.8, '#fff', 0.5, 12); flash(col, 0.15); addShake(0.2); Sfx.boom(1); }
      }
      break;
    }
    case 'meteor': {
      // 하늘에서 쿵쿵
      const n = (4 + Math.floor(P)) * (A.x ? 2 : 1), gap = (A.dur * 0.8) / n;
      r.vx = r.vy = 0;
      if (A.hitT <= 0 && A.n < n) {
        A.hitT = gap; A.n++;
        const t = pick(itemsIn(r.x, r.y, 420)) || { x: r.x + rand(-260, 260), y: r.y + rand(-200, 200) };
        const icon = r.sp.id === 'courier' ? '📦' : r.sp.id === 'astro' ? '🛰️' : '☄️';
        G.bombs.push({ x: t.x + rand(-10, 10), y: t.y + rand(-10, 10), z: 900, vx: 0, vy: 0, vz: -700, t: 0, rad: 90 + 10 * P, dmg: dmg * 3, by: r, icon, meteor: true });
      }
      break;
    }
    case 'midas': {
      r.vx = r.vy = 0;
      if (!A.done && A.t > 0.4) {
        A.done = true;
        const R = (160 + 20 * P) * (A.x ? 2 : 1);
        for (const it of itemsIn(r.x, r.y, R)) if (!it.gold) makeGold(it);
        if (vis) { ring(r.x, r.y, R, '#f2c14e', 0.6, 10); burst(r.x, r.y, 24, { colors: ['#f2c14e', '#fff3bf'], type: 'star', min: 150, max: 420, s0: 3, s1: 7, z: 30 }); flash('#f2c14e', 0.15); Sfx.clear(); }
      }
      break;
    }
    case 'tornado': {
      // 회오리: 빙빙 돌며 이리저리
      A.dir += rand(-3, 3) * dt;
      const s = 280; r.vx = Math.cos(A.dir) * s; r.vy = Math.sin(A.dir) * s;
      const R = 70 * (A.x ? 1.6 : 1);
      if (A.hitT <= 0) { A.hitT = 0.12; aoe(r.x, r.y, R, dmg * 0.7, r); if (vis) ring(r.x, r.y, R, 'rgba(255,255,255,.6)', 0.25, 4); }
      if (vis) for (let i = 0; i < 2; i++) { const a = A.t * 18 + i * 3.14; particle({ x: r.x + Math.cos(a) * R * 0.7, y: r.y + Math.sin(a) * R * 0.5, z: rand(5, 50), vx: -Math.sin(a) * 200, vy: Math.cos(a) * 150, vz: 80, life: 0.3, max: 0.3, size: rand(6, 10), color: 'rgba(240,225,205,', type: 'dust', drag: 3 }); }
      break;
    }
    case 'dig': {
      // 땅속으로 쏙 → 물건 밑에서 푱! (반복)
      const pops = A.x ? 7 : 4, cyc = A.dur / pops, idx = Math.floor(A.t / cyc), ck = (A.t % cyc) / cyc;
      r.under = ck < 0.7;
      if (idx !== A.n - 1 && idx < pops) {
        A.n = idx + 1;
        A.tgt = nearestItem(r, 420, it => !A.hits.has(it)) || nearestItem(r, 420);
        A.from = [r.x, r.y];
        if (vis) dust(r.x, r.y, 5, 0.9);
      }
      if (A.tgt && ck < 0.7) { const e = ck / 0.7; r.x = rLerp(A.from[0], A.tgt.x, e); r.y = rLerp(A.from[1], A.tgt.y, e); if (vis && Math.random() < 0.4) dust(r.x, r.y, 1, 0.4); }
      if (ck >= 0.7 && A.popped !== idx) {
        A.popped = idx;
        if (A.tgt) { A.hits.set(A.tgt, 1); if (A.tgt.state === 'rest') damageItem(A.tgt, dmg * 3, r, true, rand(0, 6.28)); }
        r.vz = 330;
        if (vis) { burst(r.x, r.y, 12, { colors: ['#8b6a4a', '#a98a6a', '#6b4423'], min: 120, max: 320, s0: 3, s1: 6, z: 6 }); dust(r.x, r.y, 6, 1); Sfx.pop(); addShake(0.03); }
      }
      r.vx = r.vy = 0;
      if (r.z > 0 || r.vz > 0) { r.vz -= 1600 * dt; r.z = Math.max(0, r.z + r.vz * dt); }
      break;
    }
    case 'cheer': {
      // 콩콩 뛰며 응원 → 주변 동료 광란
      r.z = Math.abs(Math.sin(A.t * 9)) * 26; r.vx = r.vy = 0;
      if (A.hitT <= 0) {
        A.hitT = 0.5;
        for (const o of G.rats) if (A.x ? onScreen(o.x, o.y) : Math.hypot(o.x - r.x, o.y - r.y) < 320) { o.frenzy = Math.max(o.frenzy, 3 + P); if (onScreen(o.x, o.y) && Math.random() < 0.3) burst(o.x, o.y, 3, { colors: ['#e8a3a0', '#fff'], type: 'heart', min: 30, max: 90, s0: 5, s1: 8, z: 24, life: 1 }); }
        if (vis) { ring(r.x, r.y, A.x ? 400 : 320, 'rgba(232,163,160,.8)', 0.5, 6); Sfx.pop(); }
      }
      break;
    }
    case 'feast': {
      // 앞의 물건에 달라붙어 초고속 연타
      let t = A.tgt;
      if (!t || t.state !== 'rest') { t = A.tgt = nearestItem(r, 260); }
      if (t) {
        const a = Math.atan2(r.y - t.y, r.x - t.x), dist = t.r + ratR(r) + 2;
        r.x += (t.x + Math.cos(a) * dist - r.x) * Math.min(1, dt * 14); r.y += (t.y + Math.sin(a) * dist - r.y) * Math.min(1, dt * 14);
        r.face = t.x > r.x ? 1 : -1;
        if (A.hitT <= 0) {
          A.hitT = A.x ? 0.0375 : 0.075; r.bite = 1;
          damageItem(t, dmg, r, false, a + Math.PI);
          if (vis && (A.n++ % 4 === 0)) { popup(t.x + rand(-14, 14), t.y, pick(['냠!', '다닥!', '콱!']), '#fff', 15, 0.5, 36); Sfx.clink(); }
        }
      }
      r.vx = r.vy = 0;
      break;
    }
    case 'throw': {
      // 번쩍 들어서 휙! (각성: 3번)
      const reps = A.x ? 3 : 1, cyc = A.dur / reps, ck = (A.t % cyc) / cyc, idx = Math.floor(A.t / cyc);
      r.vx = r.vy = 0;
      if (idx !== A.n - 1 && idx < reps) {
        A.n = idx + 1;
        const t = nearestItem(r, 240);
        if (t) { A.held = t; t.state = 'held'; t.pvx = t.pvy = 0; if (vis) { Sfx.jump(); popup(r.x, r.y, '번쩍!', '#fff', 16, 0.6, 60); } }
      }
      const h = A.held;
      if (h && h.state === 'held') {
        const lift = Math.min(1, ck / 0.35);
        h.x += (r.x - h.x) * Math.min(1, dt * 12); h.y += (r.y - 2 - h.y) * Math.min(1, dt * 12); h.z = lift * (44 + 30 * TIERS[r.tier].size); h.rot += dt * 2;
        if (ck > 0.62) {
          // 물건이 많은 쪽으로 던짐
          let bx = 0, by = 0; for (const o of itemsIn(r.x, r.y, 500)) { bx += o.x - r.x; by += o.y - r.y; }
          const a = bx || by ? Math.atan2(by, bx) : rand(0, 6.28);
          h.state = 'fly'; h.by = r; h.kp = 3 * P; h.hitSet = new Set(); h.air = 1;
          h.vx = Math.cos(a) * 950; h.vy = Math.sin(a) * 950; h.vz = 320; h.vr = rand(14, 24);
          r.face = Math.cos(a) >= 0 ? 1 : -1; A.held = null;
          if (vis) { Sfx.dash(); dust(r.x, r.y, 4, 1); popup(r.x, r.y, '휙!!', '#fff3bf', 20, 0.6, 70); }
        }
      }
      break;
    }
  }
  if (A.t >= A.dur) endAct(r);
}

// ── 총알 · 베기 궤적 · 드랍 소품 ──
function updateActs(dt) {
  for (const b of G.bullets) {
    b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
    const [i, j] = roomOf(b.x, b.y);
    if (!isOpen(i, j)) { b.life = 0; continue; }
    near(itemGrid, b.x, b.y, it => { if (b.life > 0 && it.state === 'rest' && Math.hypot(it.x - b.x, it.y - b.y) < it.r + 4) { b.life = 0; damageItem(it, b.dmg, b.by, false, Math.atan2(b.vy, b.vx)); if (onScreen(b.x, b.y)) burst(b.x, b.y, 3, { colors: ['#fff3bf', '#fff'], min: 80, max: 200, s0: 2, s1: 3, z: 14 }); } }, 0);
  }
  G.bullets = G.bullets.filter(b => b.life > 0);
  for (const s of G.slashes) s.life -= dt; G.slashes = G.slashes.filter(s => s.life > 0);
  // 드랍 소품: 같은 종이 닿으면 줍고 바로 액션
  for (const p of G.pickups) {
    p.t += dt;
    near(ratGrid, p.x, p.y, r => { if (!p.dead && r.sp === p.sp && !r.temp && Math.hypot(r.x - p.x, r.y - p.y) < 30 && canAct(r)) { p.dead = true; if (onScreen(p.x, p.y)) { popup(p.x, p.y, `${p.name} 획득!`, '#fff3bf', 18, 0.8, 50); Sfx.clear(); } startAct(r, p.icon); } });
    if (p.t > 14) p.dead = true;
  }
  G.pickups = G.pickups.filter(p => !p.dead);
  // 소환된 동료: 시간이 다 되면 펑
  for (const r of G.rats) if (r.temp) { r.temp -= dt; if (r.temp <= 0) { r.dead = true; if (onScreen(r.x, r.y)) smoke(r.x, r.y); } }
  if (G.rats.some(r => r.dead)) G.rats = G.rats.filter(r => !r.dead);
}
// 물건이 부서질 때: 드랍형 종이면 확률로 소품 떨어뜨림
function actOnSmash(it) {
  const r = it.by; if (!r || !r.sp || r.temp) return;
  const a = r.sp.act;
  if (!a || a.trig !== 'drop' || !actLv(r) || G.pickups.length >= 6 || !onScreen(it.x, it.y, -20)) return;
  if (Math.random() < a.p * actK(actLv(r))) { G.pickups.push({ x: it.x, y: it.y, sp: r.sp, icon: a.prop, name: a.propName || a.prop, t: 0 }); if (onScreen(it.x, it.y)) popup(it.x, it.y, `${a.propName || a.prop} 떨어졌다!`, '#fff3bf', 16, 0.9, 40); }
}
// 드랍 소품 쪽으로 달려가기 (newDash 에서 호출)
function pickupAim(r) {
  for (const p of G.pickups) if (p.sp === r.sp && Math.hypot(p.x - r.x, p.y - r.y) < 500) return Math.atan2(p.y - r.y, p.x - r.x);
  return null;
}

// ── 그리기 ──
// 소품 그리기: 총은 이모지(윈도우에선 초록 물총)가 아니라 직접 그린 권총, 나머지는 이모지
function drawProp(g, icon, size) {
  const im = IMG['art_' + icon];                 // Codex 이미지가 있으면 그걸로
  if (im) { const k = size * 1.35 / Math.max(im.width, im.height); g.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k); return; }
  if (icon === '🔫') {
    const s = size / 16;
    g.save(); g.scale(s, s); g.fillStyle = '#4b4540';
    g.fillRect(-9, -5, 16, 5); g.fillRect(-9, -6, 3, 2);
    g.beginPath(); g.moveTo(3, 0); g.lineTo(8, 0); g.lineTo(10, 8); g.lineTo(5, 8); g.closePath(); g.fill();
    g.fillStyle = '#7d746b'; g.fillRect(-7, -4, 10, 1.5); g.restore();
    return;
  }
  g.font = `${Math.round(size)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, 0, 0);
}
function drawPickup(p) {
  const bob = Math.sin(p.t * 4) * 4, blink = p.t > 11 && Math.sin(p.t * 20) > 0;
  if (blink) return;
  ctx.save(); ctx.translate(p.x, p.y * TILT - 26 + bob);
  const g = 16 + Math.sin(p.t * 6) * 2;
  ctx.globalAlpha = 0.55; ctx.fillStyle = '#fff3bf'; circ(ctx, 0, 0, g); ctx.fill(); ctx.globalAlpha = 1;
  drawProp(ctx, p.icon, 24);
  ctx.restore();
}
function drawActFx() {
  ctx.lineCap = 'round';
  for (const b of G.bullets) { if (!onScreen(b.x, b.y)) continue; const L = 0.02; ctx.strokeStyle = '#fff3bf'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x, b.y * TILT - 14); ctx.lineTo(b.x - b.vx * L, (b.y - b.vy * L) * TILT - 14); ctx.stroke(); }
  for (const s of G.slashes) { const k = s.life / s.max; ctx.globalAlpha = k; ctx.strokeStyle = '#fff'; ctx.lineWidth = 12 * k + 1; ctx.beginPath(); ctx.moveTo(s.x1, s.y1 * TILT - 12); ctx.lineTo(s.x2, s.y2 * TILT - 12); ctx.stroke(); ctx.strokeStyle = s.col || '#a9d3dc'; ctx.lineWidth = 4 * k; ctx.stroke(); }
  ctx.globalAlpha = 1;
}
// 땅속 이동 중인 쥐 = 흙더미
function drawDirtMound(r) {
  ctx.save(); ctx.translate(r.x, r.y * TILT);
  ctx.fillStyle = '#8b6a4a'; ctx.beginPath(); ctx.ellipse(0, -3, 16, 9, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#a98a6a'; ctx.beginPath(); ctx.ellipse(-3, -6, 7, 4, 0, Math.PI, 0); ctx.fill();
  ctx.restore();
}
// 액션 자세 (ratPose 결과 p 위에 덮어씀)
function actPose(r, p) {
  const A = r.act, t = G.t, k = A.t / A.dur;
  const up = { tilt: -0.6, back: -0.25, farBack: 0.25 };        // 뒷발로 일어섬
  switch (A.type) {
    case 'gunkata': Object.assign(p, up, { front: 1.7 + Math.sin(t * 40) * 0.25, farFront: 1.5 - Math.sin(t * 40) * 0.25, head: -0.2, tail: 0.8 + Math.sin(t * 30) * 0.3 }); break;
    case 'slam': { const air = r.z > 10; Object.assign(p, air ? { front: 2.7, farFront: 2.5, back: -1.2, farBack: -1, tail: 1.2, head: -0.3 } : { front: 0.3, farFront: 0.2, back: -0.3, farBack: -0.2, head: 0.35, sy: 0.85, sx: 1.12 }); break; }
    case 'slash': Object.assign(p, { front: 1.8, farFront: 1.2, back: -1.4, farBack: -1.2, head: -0.2, tail: -0.6, sx: 1.12, sy: 0.92 }); break;
    case 'barrage': { const sw = r.bite > 0 ? 2.6 * r.bite : 0.2; Object.assign(p, up, { front: sw, farFront: 1.2, head: -0.15, tail: 0.8 }); break; }
    case 'sonic': Object.assign(p, up, { front: 1.6, farFront: 1.3, head: Math.sin(t * 18) * 0.45, tail: 1 + Math.sin(t * 9) * 0.3, bob: Math.abs(Math.sin(t * 9)) * -3 }); break;
    case 'beam': Object.assign(p, { tilt: -0.3, front: 1.1, farFront: 0.9, head: -0.3, tail: 0.9 }); break;
    case 'breath': Object.assign(p, { head: -0.35, headX: -4, front: 0.4, farFront: 0.3, back: -0.4, tail: 1.1, sx: 1.05 }); break;
    case 'ball': Object.assign(p, { front: 1.9, farFront: 1.9, back: -1.9, farBack: -1.9, head: 0.8, headX: 4, tail: -1.6, sx: 0.9, sy: 0.9 }); break;
    case 'summon': Object.assign(p, up, { front: 2.7, farFront: 2.4, head: -0.35, tail: 1.2 }); break;
    case 'vortex': Object.assign(p, up, { front: 2.3 + Math.sin(t * 20) * 0.3, farFront: 2.1 - Math.sin(t * 20) * 0.3, head: -0.25, tail: Math.sin(t * 16) * 1.3 }); break;
    case 'meteor': Object.assign(p, up, { front: 2.8, farFront: 2.5, head: -0.45, tail: 1.1 }); break;
    case 'midas': Object.assign(p, up, { front: 2.5, farFront: 2.4, head: -0.3, tail: 1.3 }); break;
    case 'tornado': Object.assign(p, { front: 1.5, farFront: -1.5, back: 1.2, farBack: -1.2, tail: 1.4, head: -0.2 }); break;
    case 'dig': Object.assign(p, { front: 2.2, farFront: 2, back: -1.6, farBack: -1.4, head: -0.4, tail: 1.3 }); break;
    case 'cheer': { const s = Math.sin(t * 9); Object.assign(p, up, { front: 2.6 * Math.max(0.3, s), farFront: 2.6 * Math.max(0.3, -s), head: -0.3, tail: 1.3 }); break; }
    case 'feast': Object.assign(p, { front: 0.9 + Math.sin(t * 50) * 0.5, farFront: 0.8 - Math.sin(t * 50) * 0.5, head: 0.25, tail: 0.6 }); break;
    case 'throw': Object.assign(p, up, { front: A.held ? 2.9 : 1.4, farFront: A.held ? 2.7 : 1, head: -0.35, tail: 1 }); break;
  }
  if (A.hold && A.type !== 'ball' && A.type !== 'dig') p.prop = A.hold;
  return p;
}
