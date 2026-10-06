'use strict';
// ───────────────────────── 필살기 (전설·신화 전용, 병맛 패러디 상황극) ─────────────────────────
// 데이터는 data.js 의 ULT_LIST / ULT_TYPES. 고트 시뮬레이터 풍으로 물리를 난장판으로 만드는 게 목표.
//   ① 준비(ULT_CUT초): 화면 정지 + 쥐에게 확대 + 부들부들 기 모으기 + 필살기 이름 UI (frame 에서 update 대신 updateUltCut)
//   ② 상황극(ULT_ENG[type].dur초): 게임은 계속 진행. 쥐 주변 반경 안만 휩쓸고 벽은 안 부숨 → 슈퍼 점프보다 약함
//   ③ 끝나면 "🏆 업적 달성" 알림
// 필살기가 붙잡은 쥐(s.rats, r.ultOn)와 물건(s.items, state 'held')은 끝날 때 반드시 풀어준다(ultRelease).
const ULT_CUT = 1.4, ULT_R = 560, TABLE_W = 240, PYR_W = 320, PYR_FALL = 5.7;   // PYR_FALL: 피라미드 팽이가 멈추고 쓰러지기 시작하는 시각

function tryUlt(dt) {
  if (G.ult || G.sj || G.go || G.heist || !S.inRun) return;
  G.ultCool = (G.ultCool ?? 40) - dt;
  if (G.ultCool > 0 || Math.random() >= ULT_CHANCE * (1 + 0.2 * lv('ultcd')) * dt || document.querySelector('.screen:not(.hidden)')) return;
  const pool = G.rats.filter(r => r.sp.ult && !r.temp && !r.ultOn && onScreen(r.x, r.y, -80));
  if (pool.length) startUlt(pick(pool));
}
// 테스트: 24종 순서대로. 그 종이 화면에 없으면 화면 가운데에 잠깐(15초) 불러옴
// idx 를 주면 그 필살기 (🎬 필살기 목록에서 고름), 안 주면 다음 순서
function testUlt(idx) {
  if (G.ult || G.sj || !G.running) return false;
  G.ultTest = idx ?? ((G.ultTest ?? -1) + 1) % ULT_LIST.length;
  const u = ULT_LIST[G.ultTest];
  let r = G.rats.find(o => o.sp.id === u.id && !o.ultOn && onScreen(o.x, o.y, -80));
  if (!r) {
    // 화면 가장자리 쪽 무작위 위치에 불러옴 (가운데면 카메라 따라가기가 티가 안 남). 그 자리가 막힌 방이면 화면 가운데
    const cx = G.cam.x + viewW() / 2, cy = (G.cam.y + viewH() / 2) / TILT, a = rand(0, 6.28);
    let x = cx + Math.cos(a) * viewW() * 0.32, y = cy + Math.sin(a) * viewH() * 0.3 / TILT;
    if (!isOpen(...roomOf(x, y))) { x = cx; y = cy; }
    r = makeRat(u.id, x, y); r.temp = 15; r.noBreed = 99; r.breedCD = 99; r.born = 1;
    confine(r, ratR(r), x, y, 0, null);
    G.rats.push(r); smoke(r.x, r.y);
  }
  return startUlt(r);
}
function startUlt(r) {
  if (G.ult || G.sj) return false;
  if (r.act) endAct(r);
  r.trick = null; r.sleep = 0; r.vx = r.vy = 0; r.rushT = 0; r.z = 0; r.vz = 0;
  const u = r.sp.ult;
  G.ult = { r, u, eng: ULT_ENG[u.type], phase: 'cut', t: 0, zoom: 1, caps: [], rats: [], items: [], beatsDone: new Set(), hitT: 0, x0: r.x, y0: r.y };
  if (G.ult.eng.pre) G.ult.eng.pre(G.ult);             // 컷인 전 준비 (줴리: 이번 퀴즈를 골라 컷인 제목으로)
  r.ultOn = true;
  G.ultCool = ULT_COOL * (1 - 0.06 * lv('ultcd')); G.banner = null; G.hitstop = 0;
  flash(u.col, 0.35); Sfx.comboWord();
  return true;
}

// ── 공용 도우미 ──
const ultD = s => ratDamage(s.r) * 25;
const ULT_ITEM = 8, ultItemD = s => ratDamage(s.r) * ULT_ITEM;     // 필살기가 물건 하나에 주는 피해 (무조건 박살 X)
function ucap(s, text, o = {}) { s.caps = s.caps.filter(c => c.y !== (o.y ?? 0.78)); s.caps.push({ text, t0: G.t, dur: o.dur ?? 1.3, size: o.size ?? 34, col: o.col ?? '#fff', sh: o.sh ?? '#3c322d', y: o.y ?? 0.78 }); }
function grabRat(s, o) { if (o.ultOn && o !== s.r) return false; if (o.act) endAct(o); o.trick = null; o.sleep = 0; o.vx = o.vy = 0; o.ultOn = true; if (!s.rats.includes(o)) s.rats.push(o); return true; }
function grabItem(s, it) { if (it.state !== 'rest' || it.appear < 1) return false; it.state = 'held'; it.pvx = it.pvy = 0; it.hx = it.x; it.hy = it.y; s.items.push(it); return true; }
// 붙잡은(또는 가만히 있는) 물건을 날려보냄 → 피해(dmg, 기본 ultItemD)로 체력이 0 이면 떨어져서 박살, 남으면 멀쩡히 착지
function dropItem(s, it, vx, vy, vz, dmg = ultItemD(s)) {
  if (it.state !== 'held' && it.state !== 'rest') return;
  skillHitItem(it, dmg, s.r);
  it.state = 'fly'; it.vx = vx; it.vy = vy; it.vz = vz; it.noShadow = false; it.vr = rand(10, 22) * (Math.random() < 0.5 ? -1 : 1);
  it.hitSet = new Set(); it.air = Math.max(1, it.air); it.by = s.r; it.sq = 1.4; it.pvx = it.pvy = 0;
  s.items = s.items.filter(o => o !== it);
}
const flingItem = (s, it, ang, spd, vz) => { dropItem(s, it, Math.cos(ang) * spd, Math.sin(ang) * spd, vz); if (onScreen(it.x, it.y)) burst(it.x, it.y, 4, { colors: ['#fff', s.u.col], type: 'star', min: 100, max: 260, s0: 2, s1: 5, z: 16 }); };
// 날아온 쥐는 래그돌처럼 데굴데굴
function ragdoll(o, ang, spd = 380, vz = 320) {
  if (o.ultOn || o.trick) return;
  doTrick(o, 'tumble', ang); o.vx = Math.cos(ang) * spd; o.vy = Math.sin(ang) * spd; o.vz = vz;
}
const ratsNear = (s, x, y, R) => G.rats.filter(o => o !== s.r && !o.ultOn && Math.hypot(o.x - x, o.y - y) < R);
// 굴러다니는 큰 물체(바퀴·쥐 공)가 깔아뭉개기
function crush(s, x, y, R, vx, vy) {
  for (const it of itemsIn(x, y, R)) { const a = Math.atan2(it.y - y, it.x - x) + rand(-0.3, 0.3); flingItem(s, it, a, 520 + Math.hypot(vx, vy) * 0.4, rand(350, 520)); }
  for (const o of ratsNear(s, x, y, R + 10)) ragdoll(o, Math.atan2(o.y - y, o.x - x), 420, 380);
  blastActorsIn(x, y, R + 20, 560, ultD(s) * 0.5, s.r);          // 사람·보스·고양이도 깔아뭉갬
}
// 벽에 튕기며 움직이기 (열린 방 안)
function bounceMove(o, rad, dt) { const px = o.x, py = o.y; o.x += o.vx * dt; o.y += o.vy * dt; confine(o, rad, px, py, 1, null); }
function aimMost(r, R = 700) { let bx = 0, by = 0; for (const it of itemsIn(r.x, r.y, R)) { bx += it.x - r.x; by += it.y - r.y; } return bx || by ? Math.atan2(by, bx) : (r.face > 0 ? 0 : Math.PI); }
function releaseRat(o, fling) { o.ultOn = false; o.pose = null; o.sjRot = 0; o.ultSpin = false; o.under = false; o.drawUnder = null; if (fling && o.z > 0) { o.vz = 0; } }
// 끝: 붙잡은 것 전부 풀기
function ultRelease(s) {
  for (const it of [...s.items]) dropItem(s, it, rand(-120, 120), rand(-120, 120), 60, 0);   // 끝나서 놓아줄 땐 피해 없음
  for (const o of s.rats) if (o !== s.r) releaseRat(o, true);
  s.rats = [];
}

// ── 상황극 22종 ──
// dur: 길이 / start(s): 시작 / step(s, dt, k): 매 프레임 / draw(s): 월드 그림 / ui(s): 화면 그림 / beats: [시각, 함수]
const POSE_UP = { tilt: -0.5, front: 2.6, farFront: 2.3, back: -0.3, farBack: 0.3, head: -0.4, tail: 1.3 };
const POSE_FLAIL = () => ({ front: Math.sin(G.t * 30) * 1.6, farFront: Math.cos(G.t * 27) * 1.6, back: Math.sin(G.t * 29 + 2) * 1.5, farBack: Math.cos(G.t * 25) * 1.5, head: Math.sin(G.t * 18) * 0.5, tail: Math.sin(G.t * 22) * 1.3 });
const ULT_ENG = {
  // 슈퍼 생쥐: 빔 반동으로 본인이 날아가며 빙글빙글 난사
  recoil: {
    dur: 6.2,
    beats: [[0.35, s => ucap(s, '어… 어어어?!')], [1.3, s => ucap(s, '반동이 이렇게 셀 줄은!!')], [3.4, s => ucap(s, '(빔이 안 꺼진다)', { size: 28 })], [5.3, s => ucap(s, '멈춰어어어어!!')]],
    start(s) { const r = s.r; s.aim = aimMost(r); s.o = { x: r.x, y: r.y, vx: -Math.cos(s.aim) * 620, vy: -Math.sin(s.aim) * 620 }; s.spin = 0; Sfx.laser(); },
    step(s, dt) {
      const r = s.r, o = s.o;
      s.spin += dt * (3 + 7 * Math.min(1, s.t / 3));                  // 3초 동안 점점 빨라진 뒤 최고 속도로 계속
      bounceMove(o, ratR(r), dt); if (Math.hypot(o.vx, o.vy) > 340) { o.vx *= 1 - dt * 0.2; o.vy *= 1 - dt * 0.2; }   // 빔 반동: 일정 속도 밑으로는 안 느려짐
      r.x = o.x; r.y = o.y; r.z = 28 + Math.sin(G.t * 9) * 8; r.sjRot = s.spin * 0.6;
      r.pose = { tilt: -0.3, front: 1.5, farFront: 1.3, back: -1.4, farBack: -1.2, head: -0.3, tail: -1 };
      const a = s.aim + s.spin, ux = Math.cos(a), uy = Math.sin(a), len = 850;
      s.beam = { a, len };
      if ((s.hitT -= dt) <= 0) {
        s.hitT = 0.08;
        for (let d = 30; d < len; d += CELL * 0.7) near(itemGrid, r.x + ux * d, r.y + uy * d, it => {
          if (it.state !== 'rest') return;
          const px = it.x - r.x, py = it.y - r.y, al = px * ux + py * uy;
          if (al > 0 && al < len && Math.abs(px * uy - py * ux) < it.r + 34) flingItem(s, it, a + rand(-0.4, 0.4), 480, 420);
        });
        for (const q of ratsNear(s, r.x, r.y, 50)) ragdoll(q, Math.atan2(q.y - r.y, q.x - r.x));
        addShake(0.05); if (Math.random() < 0.3) Sfx.laser();
      }
    },
    end(s) { s.beam = null; s.r.z = 0; s.r.sjRot = 0; popup(s.r.x, s.r.y, '(철푸덕)', '#fff', 20, 1.2, 40); dust(s.r.x, s.r.y, 8, 1.2); },
    draw(s) { if (!s.beam) return; drawBigBeam(s.r.x, s.r.y * TILT - s.r.z - 14, s.beam.a, s.beam.len, 38, s.u.col); },
  },
  // 마법사 쥐: 하늘에서 거대 치즈 바퀴 → 굴러오고 마법사는 앞에서 전력 질주 (인디아나 존스)
  boulder: {
    dur: 6.2,
    beats: [[0.1, s => ucap(s, '…저게 뭐야?')], [0.9, s => ucap(s, '으아아아아아!!', { col: '#fff3bf' })], [2.4, s => ucap(s, '(마법사도 모르는 마법)')], [4.3, s => ucap(s, '왜 계속 따라와아아!!', { col: '#fff3bf' })]],
    start(s) { const r = s.r; s.b = { x: r.x + rand(-60, 60), y: r.y - 20, z: 1100, vz: 0, vx: 0, vy: 0, R: 78, rot: 0, landed: false }; },
    step(s, dt) {
      const r = s.r, b = s.b;
      if (!b.landed) {
        b.vz -= 2600 * dt; b.z += b.vz * dt;
        r.pose = { head: -0.5, front: 0.4, tail: 1.2 };
        if (b.z <= 0) {
          b.z = 0; b.landed = true;
          const a = aimMost(r); b.vx = Math.cos(a) * 520; b.vy = Math.sin(a) * 520;
          shock(b.x, b.y, 160, ultD(s) * 0.4, r, '#f0c878', 2.5); flash('#fff3bf', 0.2); addShake(0.4); Sfx.boom(1.2);
        }
        return;
      }
      bounceMove(b, b.R, dt); b.rot += Math.hypot(b.vx, b.vy) / b.R * dt * Math.sign(b.vx || 1);
      crush(s, b.x, b.y, b.R + 10, b.vx, b.vy);
      if (Math.random() < 0.5) dust(b.x, b.y, 1, 1);
      // 마법사는 바퀴 바로 앞에서 도망
      const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
      r.x = b.x + ux * (b.R + 34); r.y = b.y + uy * (b.R + 34); r.face = ux >= 0 ? 1 : -1; r.speed = 700; r.walk += dt * 60; r.pose = null;
      if (Math.random() < 0.1) addShake(0.03);
    },
    end(s) { const b = s.b; s.r.speed = 0; if (onScreen(b.x, b.y)) { burst(b.x, b.y, 30, { colors: ['#f0c878', '#e3c46a', '#fff3bf'], min: 200, max: 600, s0: 5, s1: 10, z: 40 }); popup(b.x, b.y, '치즈 대폭발!', '#f0c878', 26, 1, 90); Sfx.boom(1); } aoe(b.x, b.y, 140, ultD(s) * 0.5, s.r); s.b = null; },
    draw(s) {
      const b = s.b; if (!b) return;
      ctx.save(); ctx.fillStyle = 'rgba(30,15,5,.25)'; ctx.beginPath(); ctx.ellipse(b.x, b.y * TILT, b.R * (1 - Math.min(0.6, b.z / 1500)), b.R * 0.4, 0, 0, 6.28); ctx.fill();
      ctx.translate(b.x, b.y * TILT - b.z - b.R * 0.9); ctx.rotate(b.rot);
      if (IMG['art_ult:cheese_wheel']) { ctx.translate(0, b.R); ultArt(ctx, 'cheese_wheel', b.R * 2.1); ctx.restore(); return; }
      ctx.fillStyle = '#e3b04b'; circ(ctx, 0, 0, b.R); ctx.fill(); ctx.fillStyle = '#f0c878'; circ(ctx, 0, 0, b.R * 0.85); ctx.fill();
      ctx.fillStyle = '#d9a441'; for (const [x, y, rr2] of [[-30, -20, 12], [25, -30, 9], [10, 20, 14], [-25, 30, 8], [35, 15, 7]]) { circ(ctx, x, y, rr2); ctx.fill(); }
      ctx.restore();
    },
  },
  // 쥐왕: 주변 쥐 꼬리가 엉켜 거대 쥐 공 (실존 현상 '쥐왕') → 굴러다님
  knot: {
    dur: 6.3,
    beats: [[0.1, s => ucap(s, '꼬리가… 엉켰다?!')], [1.3, s => ucap(s, '※ 실제로 존재하는 현상입니다', { size: 28 })], [2.8, s => ucap(s, '(아무도 못 풀어요)')], [4.6, s => ucap(s, '(점점 더 엉킨다)', { size: 28 })]],
    start(s) {
      const r = s.r;
      // 화면에 보이는 쥐 중 가까운 순으로 최대 20마리(쥐왕 포함). 반경 제한 없음 → 화면을 넓혀도 다 모임
      s.knot = [r];
      const cand = G.rats.filter(o => o !== r && !o.ultOn && onScreen(o.x, o.y, 40)).sort((p, q) => Math.hypot(p.x - r.x, p.y - r.y) - Math.hypot(q.x - r.x, q.y - r.y));
      for (const o of cand) { if (s.knot.length >= 20) break; if (grabRat(s, o)) s.knot.push(o); }
      s.ball = { x: r.x, y: r.y, vx: 0, vy: 0, z: 0, vz: 0 }; s.rot = 0; s.hops = 0;
      // 가까운 쥐는 살짝 늦게 출발 → 멀리서 날아오는 쥐와 비슷하게 도착
      const far = Math.max(1, ...s.knot.map(o => Math.hypot(o.x - r.x, o.y - r.y)));
      s.knot.forEach((o, i) => { o.kx = o.x; o.ky = o.y; o.kz = o.z || 0; o.ki = i; o.kd = 0.25 * (1 - Math.hypot(o.x - r.x, o.y - r.y) / far) * Math.random(); });
    },
    step(s, dt, k) {
      const b = s.ball, n = s.knot.length, R = Math.min(240, 26 + 15 * Math.sqrt(n));
      b.z = b.z || 0; b.vz = b.vz || 0;
      if (s.t > 0.9) {
        // 통통 튀며 이동: 착지할 때마다 쿵 + 다음 방향으로 점프 (클수록 천천히 구름)
        b.vz -= 2200 * dt; b.z += b.vz * dt; bounceMove(b, R, dt); s.rot += dt * 6 * Math.min(1, 75 / R);
        if (b.z <= 0) {
          b.z = 0; const t = nearestItem({ x: b.x, y: b.y }, 460 + R), a = t ? Math.atan2(t.y - b.y, t.x - b.x) : rand(0, 6.28);
          b.vx = Math.cos(a) * 380; b.vy = Math.sin(a) * 380; b.vz = 820;
          if (s.hops++ > 0) { shock(b.x, b.y, R + 90, ultD(s) * 0.25, s.r, '#d9a441', 1.8); crush(s, b.x, b.y, R + 40, 0, 0); addShake(0.2 + Math.min(0.2, n / 400)); Sfx.thump(1); }
        }
      }
      // 쥐 공: 피보나치 구 표면에 고르게 (0번 = 쥐왕, 공 앞면 가운데). 모일 땐 포물선으로 슝
      const c = Math.cos(s.rot), sn = Math.sin(s.rot);
      for (const o of s.knot) {
        const i = o.ki, dy = 1 - 2 * (i + 0.5) / n, rad = Math.sqrt(Math.max(0, 1 - dy * dy)), th = i * 2.39996;
        const px = Math.cos(th) * rad, pz = Math.sin(th) * rad, rx = px * c - pz * sn, rz = px * sn + pz * c;
        const e = sjEase(clamp((s.t - o.kd) / 0.65, 0, 1)), hop = Math.sin(e * Math.PI) * Math.min(260, 80 + Math.hypot(o.kx - b.x, o.ky - b.y) * 0.25);
        o.x = rLerp(o.kx, b.x + rx * R, e); o.y = rLerp(o.ky, b.y - dy * R * 0.45, e); o.z = rLerp(o.kz, b.z + R + rz * R, e) + hop;
        o.sjRot = e > 0.6 ? Math.atan2(rz, rx) + Math.PI / 2 : 0; o.pose = POSE_FLAIL(); o.face = 1;
      }
      if (!s.gatherFx && s.t > 0.75) { s.gatherFx = true; ring(b.x, b.y, R + 30, '#d9a441', 0.35, 8); addShake(0.25); Sfx.thump(1.2); }
      s.R = R;
    },
    end(s) {
      const b = s.ball;
      for (const o of s.knot) { const a = Math.atan2(o.y - b.y, o.x - b.x) + rand(-0.5, 0.5); if (o !== s.r) { releaseRat(o); ragdoll(o, a, 420, 420); } }
      s.r.z = 0; s.r.sjRot = 0; s.rats = [];
      if (onScreen(b.x, b.y)) { ring(b.x, b.y, 120, '#fff', 0.4, 8); popup(b.x, b.y, '풀렸다!!', '#fff3bf', 24, 1, 80); Sfx.pop(); }
    },
    draw(s) {
      if (!s.ball || s.t < 0.7) return;
      const b = s.ball, R = s.R || 30;
      ctx.save(); ctx.fillStyle = 'rgba(30,15,5,.2)'; ctx.beginPath(); ctx.ellipse(b.x, b.y * TILT, R, R * 0.4, 0, 0, 6.28); ctx.fill(); ctx.translate(b.x, b.y * TILT - R - (b.z || 0)); ctx.strokeStyle = '#e0b0a8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      const q = R / 50; ctx.scale(q, q); ctx.lineWidth = 3 / Math.sqrt(q);
      for (let i = 0; i < 7; i++) { const a = i * 0.9 + s.rot; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.bezierCurveTo(Math.cos(a + 2) * 22, Math.sin(a + 2) * 22, Math.cos(a - 1) * 18, Math.sin(a - 1) * 18, Math.cos(a + 3) * 10, Math.sin(a + 3) * 10); ctx.stroke(); }
      ctx.restore();
    },
  },
  // 우주비행사 쥐: 무중력 구간
  zerog: floatEngine({ rats: true, h: [80, 220], dur: 6.2, lines: ['(중력이 퇴근했습니다)', '중력 출근.', '(중력: 오늘 연차 씀)'] }),
  // 유령 쥐: 물건 빙의 → 서로 쫓아다니며 들이받음
  possess: {
    dur: 6.2,
    beats: [[0.1, s => ucap(s, '우우우~ 일어나라~')], [1.2, s => ucap(s, '(물건끼리 싸우기 시작함)')], [3.2, s => ucap(s, '우우우~ 너희도 일어나라~')]],
    start(s) { s.extra = 0; for (const it of itemsIn(s.r.x, s.r.y, ULT_R).slice(0, 28)) if (grabItem(s, it)) { it.ph = rand(0, 6); it.tgt = null; } },
    step(s, dt) {
      s.r.pose = { ...POSE_UP, front: 2 + Math.sin(G.t * 10) * 0.4, farFront: 2 - Math.sin(G.t * 10) * 0.4 };
      s.r.z = 20 + Math.sin(G.t * 4) * 8;
      ultWalk(s, dt, 140);                                        // 둥둥 떠다니며 조종
      // 싸움판이 줄면 주변 물건을 새로 빙의시킴 (추가는 최대 14개, 끝나기 1.2초 전까지)
      if (s.t > 1.5 && s.t < 5 && (s.reT = (s.reT ?? 0) - dt) <= 0) {
        s.reT = 0.7;
        for (const it of itemsIn(s.r.x, s.r.y, ULT_R).slice(0, 4)) if (s.extra < 14 && s.items.length < 12 && grabItem(s, it)) { s.extra++; it.ph = rand(0, 6); it.tgt = null; if (onScreen(it.x, it.y)) smoke(it.x, it.y); }
      }
      for (const it of [...s.items]) {
        it.z = 26 + Math.sin(G.t * 6 + it.ph) * 10; it.rot += dt * 2;
        if (s.t < 0.5) continue;
        if (!it.tgt || !s.items.includes(it.tgt)) it.tgt = pick(s.items.filter(o => o !== it)) || null;
        const t = it.tgt; if (!t) continue;
        const dx = t.x - it.x, dy = t.y - it.y, d = Math.hypot(dx, dy) || 1;
        it.x += dx / d * 300 * dt + Math.sin(G.t * 9 + it.ph) * 60 * dt; it.y += dy / d * 300 * dt;
        if (d < it.r + t.r) {
          const a = Math.atan2(dy, dx);
          if (onScreen(it.x, it.y)) { popup((it.x + t.x) / 2, (it.y + t.y) / 2, pick(['쾅!', '퍽!', '우우!']), '#fff', 20, 0.6, 50); Sfx.clink(); }
          flingItem(s, it, a + Math.PI, 420, 450); flingItem(s, t, a, 420, 450);
        }
      }
    },
    draw(s) {
      // 빙의된 물건의 눈
      for (const it of s.items) { const x = it.x, y = it.y * TILT - it.z - it.r * 0.9; for (const e of [-6, 6]) { ctx.fillStyle = '#fff'; circ(ctx, x + e, y, 5); ctx.fill(); ctx.fillStyle = '#1d1826'; circ(ctx, x + e + Math.sign(e), y + 1, 2.4); ctx.fill(); } }
    },
  },
  // 산타 생쥐: 썰매 저공비행 (바이킹·술탄은 다른 상황으로 교체됨)
  flyby: {
    dur: 6,
    beats: [[0.1, s => ucap(s, { sleigh: '호우호우! 폭격 개시!', boat: '노를 저어라!! 여긴 육지다!!', carpet: '다 태워라! 전부 태워!' }[s.u.ride])], [3.05, s => ucap(s, { sleigh: '한 바퀴 더!! 호우호우!', boat: '유턴!! 노를 거꾸로!!', carpet: '돌아간다! 더 태워!' }[s.u.ride])], [5.2, s => ucap(s, { sleigh: '(루돌프는 운전면허 없음)', boat: '(배는 원래 물에서…)', carpet: '과적!! 과적이다!!' }[s.u.ride])]],
    start(s) {
      const r = s.r, vr = viewRect(0), dir = r.x - vr.x0 > vr.x1 - r.x ? -1 : 1;
      s.dir = dir; s.lx0 = dir > 0 ? vr.x0 - 160 : vr.x1 + 160; s.lx1 = dir > 0 ? vr.x1 + 160 : vr.x0 - 160; s.ly = r.y; s.lap = 0;
      smoke(r.x, r.y);
      r.drawUnder = g => drawVehicle(g, s);
    },
    step(s, dt) {
      // 3초에 화면을 한 번 가로지름 → 화면 밖에서 유턴해서 한 번 더 (왕복 2번)
      const lap = Math.min(1, Math.floor(s.t / 3)), k = Math.min(1, (s.t - lap * 3) / 3);
      if (lap !== s.lap) { s.lap = lap; s.dir = -s.dir; s.dumped = false; }
      const r = s.r, ride = s.u.ride, x = lap ? rLerp(s.lx1, s.lx0, k) : rLerp(s.lx0, s.lx1, k), z = ride === 'boat' ? 0 : 70 + Math.sin(G.t * 5) * 8;
      r.x = x; r.y = s.ly + Math.sin(G.t * 3) * 10; r.z = z + (ride === 'boat' ? 14 : 12); r.face = s.dir;
      r.pose = { front: 1.2, farFront: 1, back: 1.3, farBack: 1.1, head: -0.2, tail: 1, bob: 0 };
      if ((s.hitT -= dt) > 0) return;
      s.hitT = 0.09;
      if (ride === 'sleigh') G.bombs.push({ x: r.x, y: r.y + rand(-140, 140), z, vx: s.dir * 180, vy: 0, vz: 80, t: 0, rad: 85, dmg: ultD(s) * 0.35, by: r, icon: '🎁' });
      else if (ride === 'boat') {
        for (const it of itemsIn(r.x, r.y, 70)) flingItem(s, it, (it.y > r.y ? 1.4 : -1.4) + s.dir * 0.3, 520, 480);
        for (const o of ratsNear(s, r.x, r.y, 70)) ragdoll(o, (o.y > r.y ? 1.4 : -1.4));
        if (onScreen(r.x, r.y)) { dust(r.x, r.y, 3, 1.2); if (Math.random() < 0.3) Sfx.knock(); }
      } else {
        // 양탄자: 닿는 물건을 태움 (위로 쌓임) → 막판에 과적으로 우르르
        for (const it of itemsIn(r.x, r.y, 70)) if (s.items.length < 14 && (s.got || 0) < 21 && grabItem(s, it)) s.got = (s.got || 0) + 1;   // 두 바퀴 합쳐 21개까지
        if (k > 0.85 && !s.dumped) { s.dumped = true; for (const it of [...s.items]) dropItem(s, it, s.dir * rand(300, 600), rand(-250, 250), rand(200, 400)); addShake(0.2); Sfx.boom(0.8); }
      }
      s.items.forEach((it, i) => { it.x = r.x - s.dir * (20 + (i % 3) * 22); it.y = r.y + ((i % 3) - 1) * 10; it.z = z + 20 + Math.floor(i / 3) * 22; it.rot += dt; });
    },
    end(s) { const r = s.r; r.drawUnder = null; r.x = s.x0; r.y = s.y0; r.z = 0; smoke(r.x, r.y); popup(r.x, r.y, '(귀환)', '#fff', 18, 1, 40); },
  },
  // 쥐 여왕: 물건을 식탁에 모아 티타임 → 밥상 뒤집기
  tableflip: {
    dur: 6.1,
    beats: [[0.2, s => ucap(s, '호호호~ 차 한잔 하렴~')], [1.0, s => ucap(s, '(홀짝)')], [1.55, s => ucap(s, '(╯°□°)╯︵ ┻━┻', { size: 60, col: '#fff3bf', y: 0.5, dur: 1.2 })],
      [3.2, s => ucap(s, '…호호. 한 잔 더 하렴~?')], [4.55, s => ucap(s, '(╯°□°)╯︵ ┻━┻ ︵ ┻━┻', { size: 60, col: '#fff3bf', y: 0.5, dur: 1.2 })]],
    // 티타임 한 판 = 3초 (0.7초 모으기 → 홀짝 → 1.55초에 뒤집기). 3초에 새 탁자를 차리고 한 판 더
    start(s) { ULT_ENG.tableflip.setup(s, 26); },
    setup(s, n) {
      const r = s.r; s.c0 = s.t; s.tb = { x: r.x - r.face * 70, y: r.y + 6, flip: null };
      // 탁자 윗면 높이: 이미지 분석 결과 윗면 가운데가 다리 끝에서 이미지 높이의 약 84% 위 (3/4 시점, 윗면 = 위쪽 3~45px / 136px)
      const im = IMG['art_ult:tea_table'], top = im ? TABLE_W * im.height / im.width * 0.84 : 44;
      for (const it of itemsIn(r.x, r.y, ULT_R).slice(0, n)) if (grabItem(s, it)) { it.tx = s.tb.x + rand(-75, 75); it.ty = s.tb.y + rand(2, 8); it.tz = top + rand(-6, 10); it.noShadow = true; }   // 탁자 위에 있는 동안은 바닥 그림자 없음
      if (s.c0 > 0) { smoke(s.tb.x, s.tb.y); Sfx.pop(); }
    },
    step(s, dt) {
      if (s.t >= 3 && !s.again) { s.again = true; ULT_ENG.tableflip.setup(s, 14); }   // 두 번째 판은 남은 물건 14개까지
      const r = s.r, tb = s.tb, lt = s.t - s.c0;
      if (lt < 1.55) {
        const e = sjEase(Math.min(1, lt / 0.7));
        for (const it of s.items) { it.x = rLerp(it.hx, it.tx, e); it.y = rLerp(it.hy, it.ty, e); it.z = it.tz * e + Math.sin(e * Math.PI) * 120; }
        r.pose = lt > 0.8 ? { head: 0.2, front: 1.8, farFront: 0.4, tilt: -0.1 } : { head: -0.1, front: 0.6 };
        if (lt > 0.8) r.say = { text: s.again ? '홀짝… (부들부들)' : '홀짝~', t: 0.2 };
      } else if (!tb.flip) {
        tb.flip = G.t; const dir = -r.face;
        for (const it of [...s.items]) dropItem(s, it, dir * rand(450, 800), rand(-220, 220), rand(420, 680));
        for (const o of ratsNear(s, tb.x, tb.y, 160)) ragdoll(o, dir > 0 ? rand(-0.5, 0.5) : Math.PI + rand(-0.5, 0.5));
        r.pose = { tilt: -0.6, front: 2.8, farFront: 2.6, head: -0.5, tail: 1.3 };
        addShake(s.again ? 0.5 : 0.35); flash('#fff', 0.2); Sfx.boom(1.1); Sfx.smash(1, true);
      }
    },
    sorted(s) { return s.tb ? [{ y: s.tb.y + (s.tb.flip ? 40 : 0), f: () => ULT_ENG.tableflip.drawTable(s) }] : []; },
    drawTable(s) {
      const tb = s.tb; if (!tb) return;
      ctx.save();
      const img = !!IMG['art_ult:tea_table'];
      if (tb.flip) { const ft = G.t - tb.flip; ctx.translate(tb.x - s.r.face * ft * 500, tb.y * TILT - Math.sin(Math.min(1, ft) * Math.PI) * 140); ctx.rotate(-s.r.face * ft * 9); ctx.globalAlpha = Math.max(0, 1 - ft); }
      else ctx.translate(tb.x, tb.y * TILT);
      if (!tb.flip) { ctx.fillStyle = 'rgba(30,15,5,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, 100, 18, 0, 0, 6.28); ctx.fill(); }
      if (img && ultArt(ctx, 'tea_table', TABLE_W)) { ctx.restore(); return; }
      ctx.translate(0, -34);
      ctx.fillStyle = '#8c6a4f'; for (const x of [-80, 72]) ctx.fillRect(x, 0, 8, 34);
      ctx.fillStyle = '#b08968'; rr(ctx, -90, -10, 180, 16, 4); ctx.fill(); ctx.fillStyle = '#f3ede2'; rr(ctx, -86, -12, 172, 8, 3); ctx.fill();
      ctx.restore();
    },
  },
  // 우주 친칠라: 화면 버그 (고트 시뮬레이터식 글리치)
  glitch: {
    // 글리치 5.1초 → 강제 종료(삭제) → 1.1초 여운. 오류 창은 0.8초마다 하나씩 더 뜸
    dur: 6.2, del: 5.1,
    beats: [[0.1, s => ucap(s, '우주를… 재부팅한다.')], [2.6, s => ucap(s, '(응답 없음) (응답 없음) (응답 없음)', { size: 28 })], [4.9, s => ucap(s, '[강제 종료] 클릭!', { col: '#fff3bf' })]],
    start(s) { s.ghosts = []; s.vict = itemsIn(s.r.x, s.r.y, ULT_R).slice(0, 44); },
    step(s, dt) {
      const D = ULT_ENG.glitch.del;
      s.r.pose = { ...POSE_UP, head: rand(-0.6, 0.6) };
      if ((s.hitT -= dt) <= 0 && s.t < D) {
        s.hitT = 0.1;
        for (const it of s.vict.filter(i => i.state === 'rest').sort(() => Math.random() - 0.5).slice(0, 4)) { s.ghosts.push({ x: it.x, y: it.y, it, life: 0.5 }); it.gh = it.gh || [it.x, it.y]; it.x = it.gh[0] + rand(-50, 50); it.y = it.gh[1] + rand(-40, 40); it.rot = rand(0, 6.28); }   // 원래 자리 근처에서만 튐 (오래 튀어도 벽 속으로 안 감)
        for (const o of G.rats) if (onScreen(o.x, o.y) && !o.ultOn && Math.random() < 0.5) o.pose = { front: rand(-3, 3), farFront: rand(-3, 3), back: rand(-3, 3), farBack: rand(-3, 3), head: rand(-1.5, 1.5), tail: rand(-2, 2), sx: rand(0.6, 1.8), sy: rand(0.6, 1.8), headX: rand(-10, 10) };
        Sfx.clink();
      }
      for (const g of s.ghosts) g.life -= dt; s.ghosts = s.ghosts.filter(g => g.life > 0);
      if (s.t >= D && !s.del) {
        s.del = true; G.quiet = true;
        for (const it of s.vict) if (it.state === 'rest') { if (onScreen(it.x, it.y)) for (let i = 0; i < 6; i++) particle({ x: it.x + rand(-it.r, it.r), y: it.y + rand(-it.r, it.r), z: rand(0, 30), vx: 0, vy: 0, vz: rand(40, 120), life: 0.6, max: 0.6, size: rand(4, 8), color: pick(['#a58bb8', '#9dd5a8', '#e8786a', '#fff']), type: 'paper', rot: 0, vr: 0, drag: 0 }); skillBlastItem(it, ultItemD(s) * 1.5, s.r); }
        G.quiet = false; G.items = G.items.filter(it => it.state !== 'dead');
        flash('#fff', 0.4); Sfx.boom(1);
      }
    },
    end(s) { for (const o of G.rats) if (!o.ultOn) o.pose = null; for (const it of s.vict) delete it.gh; },
    draw(s) { ctx.save(); ctx.globalAlpha = 0.4; for (const g of s.ghosts) { ctx.save(); ctx.translate(g.x - g.it.x, (g.y - g.it.y) * TILT); drawItem25(g.it); ctx.restore(); } ctx.restore(); },
    ui(s) {
      // 화면 찢김 + 가짜 오류 창 (0.8초마다 한 장씩 겹쳐 뜸, 최대 5장)
      const D = ULT_ENG.glitch.del;
      if (s.t < D + 0.3) for (let i = 0; i < 5; i++) { const y = rand(0, H), h = rand(8, 40), dx = rand(-40, 40); ctx.drawImage(canvas, 0, y * SF, canvas.width, h * SF, dx, y, W, h); }
      if (s.t < D) for (let n = Math.min(5, 1 + Math.floor(s.t / 0.8)), i = 0; i < n; i++) {
        const top = i === n - 1;
        ctx.save(); ctx.translate(W / 2 + (i - (n - 1) / 2) * 34 + (top && s.t - i * 0.8 < 0.32 ? rand(-4, 4) : 0), H * 0.47 + (i - (n - 1) / 2) * 26);
        rr(ctx, -210, -70, 420, 140, 6); ctx.fillStyle = '#f3ede2'; ctx.fill(); rr(ctx, -210, -70, 420, 30, 6); ctx.fillStyle = '#7fa8bf'; ctx.fill();
        ctx.font = "700 16px 'IBM Plex Sans KR', sans-serif"; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('우주.exe', -198, -55);
        ctx.fillStyle = '#4b4540'; ctx.font = "15px 'IBM Plex Sans KR', sans-serif"; ctx.fillText('⚠ 우주.exe 가 응답하지 않습니다.', -190, -8); ctx.fillText('   (치즈가 너무 많이 부서짐)', -190, 16);
        for (const [x, t] of [[40, '기다리기'], [135, '강제 종료']]) { rr(ctx, x - 40, 36, 86, 24, 4); ctx.fillStyle = top && s.t > D - 0.35 && t === '강제 종료' ? '#d9786a' : '#d6d1c8'; ctx.fill(); ctx.fillStyle = '#4b4540'; ctx.textAlign = 'center'; ctx.fillText(t, x + 3, 48); ctx.textAlign = 'left'; }
        ctx.restore();
      }
    },
  },
  // 파라오 생쥐: 콩가 춤 행렬 → 박수 한 번에 전부 폭발
  // 파라오 쥐: 피라미드가 솟아오름 → 쥐들이 계단에 줄 서서 치즈 상납(다단계 아님) → 뒤집어서 피라미드 팽이 → 쓰러지며 쿵
  pyramid: {
    dur: PYR_FALL + 0.6,
    beats: [[0.1, s => ucap(s, '짐의 피라미드를 받들라!')], [0.9, s => ucap(s, '※ 다단계 아닙니다 (진짜로)', { size: 28 })], [1.5, s => ucap(s, '치즈는 전부 꼭대기로~', { col: '#fff3bf' })],
      [2.2, s => ucap(s, '피라미드… 팽이!!', { size: 60, col: '#fff3bf', y: 0.5, dur: 1 })], [4.0, s => ucap(s, '(짐도 멈추는 법을 모른다)', { size: 28 })], [PYR_FALL + 0.05, s => ucap(s, '(어지러워…)')]],
    start(s) {
      const r = s.r, W = PYR_W, im = IMG['art_ult:pyramid'], H = im ? W * im.height / im.width : W * 0.84;
      s.py = { x: r.x, y: r.y, vx: 0, vy: 0, W, H, rise: 0, flip: 0, lift: 0, spin: 0, wob: 0, top: 0 };
      // 계단 자리: 아래 단부터 4·4·3·3·2·1칸 (계단 높이는 이미지 기준 한 단 ≈ 높이의 11.8%)
      const slots = [];
      [4, 4, 3, 3, 2, 1].forEach((m, ti) => { const hw = W / 2 * (1 - (ti + 1) / 8) * 0.85; for (let j = 0; j < m; j++) slots.push({ dx: m === 1 ? 0 : (j / (m - 1) - 0.5) * 2 * hw, z: H * 0.118 * (ti + 1), ti }); });
      s.steps = [];
      const dist = o => Math.hypot(o.x - r.x, o.y - r.y);
      const cand = G.rats.filter(o => o !== r && !o.ultOn && onScreen(o.x, o.y, 40)).sort((p, q) => dist(p) - dist(q));
      for (const o of cand) { if (s.steps.length >= slots.length) break; if (grabRat(s, o)) { o.kx = o.x; o.ky = o.y; o.kz = o.z || 0; o.slot = slots[s.steps.length]; o.kd = s.steps.length * 0.035; s.steps.push(o); } }
      s.tribute = [];
      for (const it of itemsIn(r.x, r.y, ULT_R).sort((p, q) => dist(p) - dist(q))) {
        if (dist(it) < W * 0.5) { flingItem(s, it, Math.atan2(it.y - r.y, it.x - r.x), 520, 380); continue; }   // 솟아오를 때 밀려남
        if (s.tribute.length < 14 && grabItem(s, it)) { it.k0 = 0.95 + s.tribute.length * 0.07; it.side = it.x > r.x ? 1 : -1; s.tribute.push(it); }
      }
    },
    step(s, dt) {
      const r = s.r, py = s.py, W = py.W, H = py.H;
      if (s.t < 0.8) {
        // ① 모래를 뚫고 솟아오름 (파라오는 꼭대기에 실려 올라감)
        py.rise = sjEase(s.t / 0.8);
        r.x = py.x; r.y = py.y; r.z = (H - 6) * py.rise; r.pose = { ...POSE_UP }; r.face = 1;
        if (Math.random() < 0.8) for (const sx of [-1, 1]) dust(py.x + sx * rand(0, W * 0.5), py.y + rand(-10, 16), 1, 1.2);
        addShake(0.03); if ((s.hitT -= dt) <= 0) { s.hitT = 0.12; Sfx.thump(0.6); }
      } else if (s.t < 2.2) {
        // ② 계단에 줄 선 쥐들이 절 + 물건이 계단을 타고 꼭대기로 올라가서 상납(박살 → 치즈)
        py.rise = 1; r.x = py.x; r.y = py.y; r.z = H - 6; r.face = Math.sin(G.t * 4) > 0 ? 1 : -1;
        r.pose = { ...POSE_UP, front: 2.4 + Math.sin(G.t * 10) * 0.3, farFront: 2.2 - Math.sin(G.t * 10) * 0.3 };
        if (!s.said) { s.said = true; r.say = { text: '짐에게 바쳐라!', t: 1.1 }; }
        for (const it of [...s.tribute]) {
          if (it.state !== 'held') { s.tribute = s.tribute.filter(o => o !== it); continue; }
          const k = clamp((s.t - it.k0) / 0.55, 0, 1); if (k <= 0) continue;
          const bx = py.x + it.side * W * 0.3;
          if (k < 0.4) { const e = sjEase(k / 0.4); it.x = rLerp(it.hx, bx, e); it.y = rLerp(it.hy, py.y + 10, e); it.z = Math.sin(e * Math.PI) * 60; }
          else { const e = (k - 0.4) / 0.6, st = Math.floor(e * 7); it.x = rLerp(bx, py.x, e); it.y = py.y + 10 - e * 6; it.z = H * 0.118 * st + Math.abs(Math.sin(e * 7 * Math.PI)) * 16; }
          if (k >= 1) {
            s.tribute = s.tribute.filter(o => o !== it); s.items = s.items.filter(o => o !== it);
            it.air = 2; it.z = H; skillBlastItem(it, ultItemD(s) * 1.5, r, rand(0, 6.28), 160, 60); G.items = G.items.filter(o => o.state !== 'dead');
            if (onScreen(py.x, py.y)) { popup(py.x, py.y, '상납!', '#f2c14e', 18, 0.7, H + 20); burst(py.x, py.y, 6, { colors: ['#f2c14e', '#fff3bf'], type: 'star', min: 100, max: 240, s0: 3, s1: 6, z: H }); }
          }
        }
      } else if (s.t < 2.5) {
        // ③ 벌떡 뒤집기: 계단의 쥐들은 튕겨 나가고 파라오는 뒤집힌 밑면 위로
        if (!s.flipped) {
          s.flipped = true;
          for (const it of [...s.tribute]) if (it.state === 'held') flingItem(s, it, rand(0, 6.28), 420, 420);
          s.tribute = [];
          for (const o of s.steps) { releaseRat(o); ragdoll(o, Math.atan2(o.y - py.y, o.x - py.x + rand(-1, 1)), 520, 460); }
          s.rats = s.rats.filter(o => !s.steps.includes(o)); s.steps = [];
          flash('#fff3bf', 0.25); addShake(0.3); Sfx.boom(0.9); Sfx.dash();
        }
        const e = (s.t - 2.2) / 0.3; py.flip = e; py.lift = Math.sin(e * Math.PI) * 120;
        r.x = py.x; r.y = py.y; r.z = H + py.lift + 40 * Math.sin(e * Math.PI); r.pose = POSE_FLAIL();
      } else if (s.t < PYR_FALL) {
        // ④ 피라미드 팽이: 뾰족한 끝으로 서서 뱅글뱅글 돌며 휩쓸기 (파라오도 같이 돎)
        py.flip = 1; py.lift = 0; py.spin += dt * 26; py.wob = Math.sin(s.t * 7) * 0.12;
        if (!s.spinning) { s.spinning = true; const a = aimMost(r, 800); py.vx = Math.cos(a) * 430; py.vy = Math.sin(a) * 430; }
        const pvx = py.vx, pvy = py.vy; bounceMove(py, W * 0.3, dt);
        if (pvx !== py.vx || pvy !== py.vy) { addShake(0.12); Sfx.thump(0.8); }
        if ((s.turnT = (s.turnT ?? 0.5) - dt) <= 0) { s.turnT = 0.5; const a = aimMost({ x: py.x, y: py.y, face: 1 }, 700); py.vx = rLerp(py.vx, Math.cos(a) * 430, 0.6); py.vy = rLerp(py.vy, Math.sin(a) * 430, 0.6); }
        for (const it of itemsIn(py.x, py.y, W * 0.42)) flingItem(s, it, Math.atan2(it.y - py.y, it.x - py.x) + 1.2, 680, 420);
        for (const o of ratsNear(s, py.x, py.y, W * 0.4)) ragdoll(o, Math.atan2(o.y - py.y, o.x - py.x) + 1.2, 560, 420);
        if ((s.hitT -= dt) <= 0) { s.hitT = 0.12; shock(py.x, py.y, W * 0.35, ultD(s) * 0.08, r, '#e3c46a', 0.5); dust(py.x, py.y, 2, 1); stampAt(py.x, py.y, m => { m.fillStyle = 'rgba(227,196,106,.28)'; m.beginPath(); m.ellipse(py.x, py.y, 26, 16, 0, 0, 6.28); m.fill(); }); }
        if (Math.floor(py.spin / 3) !== s.whoosh) { s.whoosh = Math.floor(py.spin / 3); Sfx.dash(); }
        r.x = py.x; r.y = py.y; r.z = H; r.ultSpin = true; r.pose = POSE_FLAIL();
      } else {
        // ⑤ 비틀비틀 옆으로 쓰러지며 쿵 → 파라오 튕겨 나감
        py.vx *= Math.max(0, 1 - dt * 6); py.vy *= Math.max(0, 1 - dt * 6); bounceMove(py, W * 0.3, dt);
        const e = clamp((s.t - PYR_FALL) / 0.3, 0, 1); py.top = e * e; r.ultSpin = false;
        if (e >= 1 && !s.fell) {
          s.fell = true;
          const fx = py.x - H * 0.5, fy = py.y;
          shock(fx, fy, W * 0.8, ultD(s) * 0.8, r, '#e3c46a', 3);
          for (const it of itemsIn(fx, fy, W * 0.75)) flingItem(s, it, Math.atan2(it.y - fy, it.x - fx), 480, 560);
          for (const o of ratsNear(s, fx, fy, W * 0.7)) ragdoll(o, Math.atan2(o.y - fy, o.x - fx), 480, 420);
          burst(fx, fy, 30, { colors: ['#e3c46a', '#d9b27a', '#f3e1b8'], min: 200, max: 600, s0: 5, s1: 11, z: 20 });
          dust(fx, fy, 14, 2.2); flash('#fff3bf', 0.4); addShake(0.5); Sfx.boom(1.4);
          s.flyX = r.x; s.flyZ = r.z; s.flyT = s.t;
        }
        if (s.fell) { const k = clamp((s.t - s.flyT) / 0.3, 0, 1); r.x = s.flyX - k * 160; r.z = Math.max(0, s.flyZ * (1 - k) + Math.sin(k * Math.PI) * 90); r.face = -1; }
        else { const a = py.top * 1.4; r.x = py.x - Math.sin(a) * H; r.z = H * Math.cos(a); }
        r.pose = POSE_FLAIL();
      }
      // 계단 위 쥐들: 한 명씩 폴짝 뛰어올라 자리 잡고 넙죽 절
      for (const o of s.steps) {
        const e = sjEase(clamp((s.t - 0.5 - o.kd) / 0.45, 0, 1)), sl = o.slot;
        o.x = rLerp(o.kx, py.x + sl.dx, e); o.y = rLerp(o.ky, py.y + 14 + sl.ti * 0.5, e); o.z = rLerp(o.kz, sl.z * py.rise, e) + Math.sin(e * Math.PI) * 90;
        o.face = sl.dx > 0 ? -1 : 1;
        o.pose = e >= 1 ? (Math.sin(G.t * 9 + sl.dx * 0.05 + sl.ti) > 0 ? { head: 0.6, headX: -3, front: 1.3, farFront: 1.2, tilt: 0.3, tail: 0.8 } : { ...POSE_UP, front: 2.4, farFront: 2.2 }) : POSE_FLAIL();
      }
    },
    end(s) { s.r.ultSpin = false; s.r.z = 0; },
    sorted(s) { return s.py && s.t < PYR_FALL + 0.5 ? [{ y: s.py.y - 1, f: () => drawPyramid(s) }] : []; },
  },
  // 외계인 생쥐: UFO 납치 → 공중에서 투척 (본인도 딸려감)
  abduct: {
    // 채집 5.06초 → 반납(투하) → 5.44초부터 본인도 끌려 올라감
    dur: 6.2,
    beats: [[0.1, s => ucap(s, '표본 채집 개시. 삐리.')], [2.7, s => ucap(s, '표본 부족. 더 채집한다. 삐리.', { size: 28 })], [5, s => ucap(s, '검사 완료. 반납합니다.')], [5.5, s => ucap(s, '앗, 나는 빼줘!!', { col: '#fff3bf' })]],
    start(s) { s.ufo = { x: s.r.x, y: s.r.y - 40 }; s.bx = s.r.x; s.by = s.r.y; s.wa = rand(0, 6.28); },
    step(s, dt) {
      const r = s.r;
      r.pose = { ...POSE_UP, front: 2.2, farFront: 2.4 };
      s.wa += rand(-2, 2) * dt;
      if (s.t < 5.06) {
        const px = s.bx, py = s.by; s.bx += Math.cos(s.wa) * 280 * dt; s.by += Math.sin(s.wa) * 190 * dt;
        const o = { x: s.bx, y: s.by, vx: Math.cos(s.wa), vy: Math.sin(s.wa) }; confine(o, 90, px, py, 1, null); s.bx = o.x; s.by = o.y; if (o.vx !== Math.cos(s.wa)) s.wa += Math.PI;
        s.ufo.x += (s.bx - s.ufo.x) * Math.min(1, dt * 5); s.ufo.y += (s.by - 40 - s.ufo.y) * Math.min(1, dt * 5);
        for (const it of itemsIn(s.bx, s.by, 130)) if (s.items.length < 26) grabItem(s, it);
        for (const o2 of ratsNear(s, s.bx, s.by, 130)) if (s.rats.length < 8) grabRat(s, o2);
      }
      const all = [...s.items, ...s.rats];
      all.forEach((o2, i) => { const a = G.t * 3 + i / all.length * 6.28, R0 = 40 + (i % 3) * 20; o2.x += (s.ufo.x + Math.cos(a) * R0 - o2.x) * Math.min(1, dt * 3); o2.y += (s.ufo.y + 40 + Math.sin(a) * R0 * 0.5 - o2.y) * Math.min(1, dt * 3); o2.z = Math.min(200, (o2.z || 0) + dt * 220); if (o2.sp) { o2.pose = POSE_FLAIL(); o2.sjRot = G.t * 4 + i; } else o2.rot += dt * 5; });
      if (s.t >= 5.06 && !s.dropped) {
        s.dropped = true;
        for (const it of [...s.items]) dropItem(s, it, rand(-300, 300), rand(-220, 220), -50);
        for (const o2 of s.rats) { releaseRat(o2); o2.vz = 0; }
        s.rats = []; Sfx.pop();
      }
      if (s.t > 5.44) { s.self = true; r.x += (s.ufo.x - r.x) * Math.min(1, dt * 4); r.y += (s.ufo.y + 40 - r.y) * Math.min(1, dt * 4); r.z = Math.min(220, r.z + dt * 500); r.pose = POSE_FLAIL(); r.sjRot = G.t * 5; }
    },
    end(s) { const r = s.r; r.sjRot = 0; const px = r.x, py = r.y; confine(r, ratR(r), s.x0, s.y0, 0, null); if (!isOpen(...roomOf(r.x, r.y))) { r.x = s.x0; r.y = s.y0; } r.vz = 0; s.ufoOut = G.t; s.ufoLast = { ...s.ufo }; void px; void py; },
    draw(s) {
      const u = s.ufo; if (!u) return;
      const y = u.y * TILT - 250;
      if (!s.dropped || s.self) {
        ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#9dd5a8';
        const gx = s.self ? s.r.x : s.bx, gy = (s.self ? s.r.y : s.by) * TILT;
        ctx.beginPath(); ctx.moveTo(u.x - 26, y + 14); ctx.lineTo(u.x + 26, y + 14); ctx.lineTo(gx + 90, gy); ctx.lineTo(gx - 90, gy); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.save(); ctx.translate(u.x, y);
      if (ultArt(ctx, 'ufo', 150)) { ctx.restore(); return; }
      ctx.fillStyle = 'rgba(191,227,234,.85)'; ctx.beginPath(); ctx.ellipse(0, -10, 26, 22, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#9fb2bd'; ctx.beginPath(); ctx.ellipse(0, 0, 70, 18, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#7d8a90'; ctx.beginPath(); ctx.ellipse(0, 6, 50, 10, 0, 0, 6.28); ctx.fill();
      for (let i = 0; i < 6; i++) { ctx.fillStyle = (Math.floor(G.t * 8) + i) % 2 ? '#fff3bf' : '#9dd5a8'; circ(ctx, -50 + i * 20, 2, 4); ctx.fill(); }
      ctx.restore();
    },
  },
  // 드래곤 쥐: 치즈 퐁듀 브레스 → 바닥 미끌미끌
  fondue: {
    dur: 6.2,
    beats: [[0.1, s => ucap(s, '크아앙… 어라?')], [0.7, s => ucap(s, '⚠ 치즈 퐁듀 주의 (미끄러움)', { col: '#fff3bf' })], [2.2, s => ucap(s, '(고소한 냄새가 난다)')], [4.2, s => ucap(s, '(바닥 전체가 퐁듀가 됐다)', { size: 28 })]],
    start(s) { s.a0 = aimMost(s.r); s.r.face = Math.cos(s.a0) >= 0 ? 1 : -1; },
    step(s, dt) {
      const r = s.r, a = (r.face > 0 ? 0 : Math.PI) + Math.sin(s.t * 3) * 0.7, range = 560;
      r.pose = { head: -0.35, headX: -4, front: 0.4, farFront: 0.3, tail: 1.1, sx: 1.05 };
      ultWalk(s, dt, 110);                                        // 퐁듀를 뿜으며 어슬렁
      if (s.t < 0.3 || s.t > 5.4) return;
      cheeseSpray(r, a, range, 6, 0.35, { k: 2.5, g: 400, drag: 1.5 });
      if ((s.hitT -= dt) > 0) return;
      s.hitT = 0.1;
      const d = rand(80, range), px = r.x + Math.cos(a) * d, py = r.y + Math.sin(a) * d;
      stampAt(px, py, m => { m.fillStyle = 'rgba(240,200,120,.55)'; m.beginPath(); m.ellipse(px, py, rand(30, 60), rand(20, 40), rand(0, 3), 0, 6.28); m.fill(); });
      for (const it of itemsIn(r.x, r.y, range)) { let da = Math.atan2(it.y - r.y, it.x - r.x) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < 0.4) { if (Math.random() < 0.5) flingItem(s, it, a + rand(-0.8, 0.8), 760, 140); else { it.pvx = Math.cos(a + rand(-0.6, 0.6)) * 1300; it.pvy = Math.sin(a + rand(-0.6, 0.6)) * 1300; } } }
      for (const o of ratsNear(s, r.x, r.y, range)) { let da = Math.atan2(o.y - r.y, o.x - r.x) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < 0.4 && Math.random() < 0.3) { ragdoll(o, a + rand(-1, 1), 700, 60); if (onScreen(o.x, o.y) && Math.random() < 0.3) popup(o.x, o.y, '미끄덩!', '#fff3bf', 16, 0.7, 40); } }
    },
  },
  // 공룡 잠옷 쥐: 대멸종 운석이 자기 머리에 먼저 → 납작 → 분노의 발구름
  meteorself: {
    // 발구름 9번 (0.5초 간격, 작게·크게 번갈아 → 마지막 한 번은 제일 크게) + 5.6초까지 운석 비
    dur: 6.2, stomps: 9,
    beats: [[0.4, s => ucap(s, '…나한테?!', { size: 40 })], [1.0, s => ucap(s, '크아아아아앙!!!', { col: '#fff3bf', size: 44 })], [3.0, s => ucap(s, '(분노가 가라앉지 않는다)', { size: 28 })], [5.4, s => ucap(s, '(공룡은 원래 이렇게 멸종했다)', { size: 28 })]],
    start(s) { const r = s.r; G.bombs.push({ x: r.x, y: r.y, z: 900, vx: 0, vy: 0, vz: -2400, t: 0, rad: 110, dmg: ultD(s) * 0.3, by: r, icon: '☄️', meteor: true, size: 60 }); s.n = 0; },
    step(s, dt) {
      const r = s.r;
      if (s.t < 0.33) { r.pose = { head: -0.6, front: 0.8, tail: 1 }; return; }
      if (s.t < 0.95) { r.pose = { sy: 0.28, sx: 1.7, front: -1.5, farFront: -1.5, back: 1.5, farBack: 1.5, head: 0.2, bob: 0, tail: -0.4 }; if (!s.flat) { s.flat = true; popup(r.x, r.y, '(납작)', '#fff', 18, 1, 20); } return; }
      r.pose = { tilt: -0.6, front: 2.6, farFront: 2.4, head: -0.5, tail: 1.3 };
      const N = ULT_ENG.meteorself.stomps, last = s.n === N - 1;
      if (s.n < N && s.t >= 1.2 + s.n * 0.5) { s.n++; const f = last ? 1 : s.n % 2 ? 0.55 : 0.8; r.z = 0; shock(r.x, r.y, ULT_R * f, ultD(s) * (last ? 0.5 : 0.25), r, s.u.col, 2.4); for (const it of itemsIn(r.x, r.y, ULT_R * f)) if (Math.random() < 0.3) flingItem(s, it, Math.atan2(it.y - r.y, it.x - r.x), 300, 500); addShake(0.25); }
      r.z = s.n < N ? Math.abs(Math.sin((s.t - 1.2) / 0.5 * Math.PI)) * 50 : 0;
      if (s.n < N) ultWalk(s, dt, 170);                           // 쿵쾅쿵쾅 걸어가며
      if ((s.hitT -= dt) <= 0 && s.t < 5.6) { s.hitT = 0.2; const t = pick(itemsIn(r.x, r.y, ULT_R)); if (t) G.bombs.push({ x: t.x, y: t.y, z: 1000, vx: rand(-100, 100), vy: 0, vz: -900, t: 0, rad: 100, dmg: ultD(s) * 0.25, by: r, icon: '☄️', meteor: true }); }
    },
  },
  // 탐정 쥐: 음모론 빨간 실 → 실 순서대로 연쇄 폭발
  strings: {
    // 수사 한 판: 1.4초 동안 실 걸기 → 0.11초 간격 연쇄 폭발. 3.5초에 "진범은 따로 있다" 두 번째 판 (실 12개, 폭발 조금 약하게)
    dur: 6.4,
    beats: [[0.2, s => ucap(s, '이 컵과…')], [0.7, s => ucap(s, '이 화분이…')], [1.2, s => ucap(s, '모두 연결되어 있었어!!', { col: '#fff3bf' })], [3.5, s => ucap(s, '…잠깐. 진범은 따로 있다!', { col: '#fff3bf' })], [5.9, s => ucap(s, '(사건 해결: 전부 부숨)')]],
    start(s) { ULT_ENG.strings.web(s, 18); },
    web(s, max) {
      const pool = itemsIn(s.r.x, s.r.y, ULT_R).slice(0, 36), path = []; let cur = s.r;
      while (pool.length && path.length < max) { pool.sort((a, b) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(b.x - cur.x, b.y - cur.y)); cur = pool.shift(); path.push({ it: cur, x: cur.x, y: cur.y }); }
      s.path = path; s.c0 = s.t; s.wd = s.c0 ? 0.35 : 0.5;
    },
    step(s, dt) {
      if (s.t >= 3.5 && !s.again) { s.again = true; ULT_ENG.strings.web(s, 12); }
      const r = s.r, lt = s.t - s.c0;
      r.pose = lt < 1.4 ? { front: 1.9, farFront: 0.4, head: -0.2, tail: 1 } : { ...POSE_UP };
      if (lt < 1.4) ultWalk(s, dt, 90);                          // 실을 걸며 돌아다님
      for (const p of s.path) if (p.it.state === 'rest') { p.x = p.it.x; p.y = p.it.y; }
      if (lt > 1.4) s.path.forEach((p, i) => { if (!p.boom && lt > 1.4 + i * 0.11) { p.boom = true; if (p.it.state === 'rest') { damageItem(p.it, ultD(s) * s.wd, r, true, rand(0, 6.28)); if (p.it.state === 'rest') flingItem(s, p.it, rand(0, 6.28), 200, 520); } if (onScreen(p.x, p.y)) { ring(p.x, p.y, 50, '#d9786a', 0.35, 8); Sfx.thump(0.6); } } });
    },
    draw(s) {
      const lt = s.t - s.c0, n = Math.min(s.path.length, Math.floor(lt / 1.2 * s.path.length) + 1);
      ctx.save(); ctx.strokeStyle = '#c9504a'; ctx.lineWidth = 2.5;
      let px = s.r.x, py = s.r.y * TILT - 20;
      for (let i = 0; i < n; i++) { const p = s.path[i]; if (p.boom && lt > 1.4 + i * 0.11 + 0.2) { px = p.x; py = p.y * TILT - 20; continue; } ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(p.x, p.y * TILT - 20); ctx.stroke(); px = p.x; py = p.y * TILT - 20; ctx.fillStyle = '#c9504a'; circ(ctx, px, py, 4); ctx.fill(); }
      ctx.restore();
    },
  },
  // 좀비 쥐: 화면 속 쥐 전원 좀비 감염 (7초 동안 초록색·팔 앞으로·힘 2배)
  zombify: {
    dur: 6,
    beats: [[0.1, s => ucap(s, '끄어어어어…')], [0.9, s => ucap(s, '좀비 바이러스 확산 중… (치즈 냄새)', { size: 28 })], [3.4, s => ucap(s, '(2차 확산… 3차 확산…)', { size: 28 })]],
    start(s) { s.w = 0; },
    step(s, dt) {
      const r = s.r;
      r.pose = { tilt: -0.5, front: 1.6 + Math.sin(G.t * 6) * 0.2, farFront: 1.5, head: 0.3, tail: 0.6 };
      ultWalk(s, dt, 80);                                         // 흐느적흐느적
      if ((s.hitT -= dt) <= 0) {
        s.hitT = 0.35; s.w = s.w % 7 + 1;                          // 감염 파동 7번(=840px)마다 처음부터 다시 퍼짐 (걸어다니며 새로 감염)
        const R0 = s.w * 120; ring(r.x, r.y, R0, 'rgba(157,187,143,.9)', 0.5, 8);
        for (const o of G.rats) if (o !== r && Math.hypot(o.x - r.x, o.y - r.y) < R0 && !(o.zombieUntil > G.t)) { o.zombieUntil = G.t + 7; o.frenzy = Math.max(o.frenzy, 7); if (onScreen(o.x, o.y)) { popup(o.x, o.y, '끄어…', '#9dbb8f', 16, 0.8, 40); smoke(o.x, o.y); } }
        Sfx.thump(0.5);
      }
    },
  },
  // 발레리나 생쥐: 너무 빨리 돌아서 땅을 뚫고 여기저기서 솟구침
  drill: {
    // 0.32초마다 땅속으로 파고들었다 솟구치기 × 17번 → 5.94초에 멈춤
    dur: 6.3, pops: 17,
    beats: [[0.1, s => ucap(s, '32회전… 33… 34…')], [0.7, s => ucap(s, '멈출 수가 없어어어!!', { col: '#fff3bf' })], [3.0, s => ucap(s, '64회전… 65… 66…', { size: 28 })], [5.9, s => ucap(s, '(어지러움)')]],
    start(s) { s.pops = 0; s.r.ultSpin = true; },
    step(s, dt) {
      const r = s.r;
      r.pose = { front: 2.6, farFront: 2.6, back: -0.2, farBack: 0.2, head: -0.3, tail: 0.5 };
      if (s.t < 0.5) { if (Math.random() < 0.6) dust(r.x, r.y, 1, 1); return; }
      const cyc = 0.32, idx = Math.floor((s.t - 0.5) / cyc), ck = ((s.t - 0.5) % cyc) / cyc;
      if (idx >= ULT_ENG.drill.pops) { r.under = false; r.z = Math.max(0, r.z - dt * 400); return; }
      if (idx !== s.pops) { s.pops = idx; s.from = [r.x, r.y]; { const rm = roomOf(r.x, r.y) + ''; s.tgt = nearestItem(r, 560, it => roomOf(it.x, it.y) + '' === rm) || { x: clamp(s.x0 + rand(-200, 200), rm.split(',')[0] * RW + 60, (+rm.split(',')[0] + 1) * RW - 60), y: clamp(s.y0 + rand(-150, 150), rm.split(',')[1] * RH + 60, (+rm.split(',')[1] + 1) * RH - 60) }; } /* 땅속으로 벽을 넘어가지 않게 같은 방 안에서만 */ }
      r.under = ck < 0.6;
      if (ck < 0.6 && s.from) { const e = ck / 0.6; r.x = rLerp(s.from[0], s.tgt.x, e); r.y = rLerp(s.from[1], s.tgt.y, e); r.z = 0; }
      else if (!s['p' + idx]) {
        s['p' + idx] = true;
        for (const it of itemsIn(r.x, r.y, 90)) flingItem(s, it, rand(0, 6.28), 220, 650);
        for (const o of ratsNear(s, r.x, r.y, 60)) ragdoll(o, rand(0, 6.28), 250, 500);
        if (onScreen(r.x, r.y)) { burst(r.x, r.y, 12, { colors: ['#8b6a4a', '#a98a6a', s.u.col], min: 120, max: 320, s0: 3, s1: 6, z: 6 }); dust(r.x, r.y, 6, 1); Sfx.pop(); addShake(0.05); }
      } else r.z = Math.sin((ck - 0.6) / 0.4 * Math.PI) * 70;
    },
    end(s) { s.r.ultSpin = false; s.r.under = false; },
  },
};
// ── 새 상황극 (겹치던 것 교체) ──
Object.assign(ULT_ENG, {
  // 바이킹 쥐: 투석기에 자기를 장전해서 발사 → 착지마다 쾅 (세 번)
  catapult: {
    dur: 4,
    beats: [[0.1, s => ucap(s, '장전 완료! (나를)')], [1.4, s => ucap(s, '(안전장치 없음)')], [2.7, s => ucap(s, '한 번 더!!', { col: '#fff3bf' })]],
    start(s) { s.cyc = -1; },
    step(s, dt) {
      const r = s.r, C = 1.3, idx = Math.floor(s.t / C), ck = (s.t % C) / C;
      if (idx > 2) { r.z = 0; r.sjRot = 0; r.pose = { head: 0.3, tail: 0.3, sy: 0.9 }; return; }
      if (idx !== s.cyc) {
        s.cyc = idx;
        // 투석기는 쥐 뒤에, 목표는 물건이 많은 쪽 멀리
        const a = aimMost(r, ULT_R + 200), d = rand(220, 360);
        s.cat = { x: r.x - Math.cos(a) * 30, y: r.y - Math.sin(a) * 20, face: Math.cos(a) >= 0 ? 1 : -1 };
        const tgt = { x: r.x + Math.cos(a) * d, y: r.y + Math.sin(a) * d * 0.7, vx: 0, vy: 0 };
        confine(tgt, 20, r.x, r.y, 0, null);
        s.from = { x: r.x, y: r.y }; s.to = tgt; s.landed = false;
        if (idx > 0) smoke(s.cat.x, s.cat.y);
      }
      if (ck < 0.3) { r.x = s.cat.x; r.y = s.cat.y; r.z = 22; r.face = s.cat.face; r.pose = { sy: 0.7, sx: 1.2, front: 0.6, back: -0.6, head: 0.4, tail: -0.5 }; s.arm = -ck / 0.3 * 0.6; return; }
      if (ck < 0.78) {
        const e = (ck - 0.3) / 0.48;
        if (!s.fired) { s.fired = true; Sfx.jump(); dust(s.cat.x, s.cat.y, 4, 1); }
        s.arm = Math.min(1.6, s.arm + dt * 20);
        r.x = rLerp(s.from.x, s.to.x, e); r.y = rLerp(s.from.y, s.to.y, e); r.z = 22 + Math.sin(e * Math.PI) * 280;
        r.sjRot = e * Math.PI * 4 * s.cat.face; r.pose = POSE_FLAIL();
        return;
      }
      s.fired = false;
      if (!s.landed) {
        s.landed = true; r.z = 0; r.sjRot = 0;
        shock(r.x, r.y, 200, ultD(s) * 0.6, r, s.u.col, 2.4);
        for (const it of itemsIn(r.x, r.y, 170)) flingItem(s, it, Math.atan2(it.y - r.y, it.x - r.x), 420, 520);
        for (const o of ratsNear(s, r.x, r.y, 170)) ragdoll(o, Math.atan2(o.y - r.y, o.x - r.x));
        stampAt(r.x, r.y, m => { m.fillStyle = 'rgba(60,50,45,.3)'; m.beginPath(); m.ellipse(r.x, r.y, 50, 36, 0, 0, 6.28); m.fill(); });
        popup(r.x, r.y, '발할라!!', '#fff3bf', 24, 0.8, 60); addShake(0.3); Sfx.boom(1);
      }
      r.pose = { sy: 0.45, sx: 1.5, front: -1.4, farFront: -1.4, back: 1.4, farBack: 1.4, head: 0.2, tail: -0.3 };   // 철푸덕
    },
    end(s) { s.cat = null; s.r.sjRot = 0; },
    draw(s) {
      const c = s.cat; if (!c) return;
      ctx.save(); ctx.translate(c.x, c.y * TILT); ctx.scale(c.face, 1);
      if (ultArt(ctx, 'catapult', 110)) { ctx.restore(); return; }
      ctx.fillStyle = '#8c6a4f'; ctx.fillRect(-40, -14, 80, 12); for (const x of [-34, 26]) { ctx.fillStyle = '#6b5443'; circ(ctx, x, -2, 9); ctx.fill(); }
      ctx.fillStyle = '#a3805f'; ctx.fillRect(-6, -40, 12, 28);
      ctx.save(); ctx.translate(0, -36); ctx.rotate(-0.9 + (s.arm || 0)); ctx.fillStyle = '#b08968'; ctx.fillRect(-60, -4, 70, 8); ctx.fillStyle = '#8c6a4f'; ctx.beginPath(); ctx.arc(-60, -6, 12, 0, Math.PI); ctx.fill(); ctx.restore();
      ctx.restore();
    },
  },
  // 천사 생쥐: 천국의 계단 → 물건들이 줄지어 오르다 꼭대기에서 차례로 투신 (레밍즈)
  lemmings: {
    dur: 6.2,
    beats: [[0.1, s => ucap(s, '천국으로 가는 계단~')], [1.6, s => ucap(s, '(한 줄로 서세요)')], [2.8, s => ucap(s, '…꼭대기엔 아무것도 없다.', { col: '#fff3bf' })], [4.4, s => ucap(s, '(줄이 줄어들지 않는다)', { size: 28 })]],
    start(s) {
      const r = s.r; s.dir = r.face; s.base = { x: r.x + s.dir * 60, y: r.y };
      s.q = []; for (const it of itemsIn(r.x, r.y, ULT_R).slice(0, 22)) if (grabItem(s, it)) s.q.push(it);
      s.q.sort((a, b) => Math.hypot(a.x - s.base.x, a.y - s.base.y) - Math.hypot(b.x - s.base.x, b.y - s.base.y));
      s.q.forEach((it, i) => { it.lt = 0.4 + i * 0.16; it.jumped = false; });
      s.lastLt = s.q.length ? s.q[s.q.length - 1].lt : 0.2;
    },
    step(s, dt) {
      const r = s.r, b = s.base, STEP = 7, SW = 34, SH = 30;
      // 줄 끝이 가까워지면 주변 물건이 계속 새로 줄을 섬 (같은 0.16초 간격, 합쳐서 33개까지, 4.9초까지 — 끝나기 전에 다 뛰어내림)
      if (s.q.length < 33 && s.lastLt < s.t + 0.3 && s.lastLt + 0.16 < 4.9) { const it = nearestItem(b, ULT_R); if (it && grabItem(s, it)) { s.lastLt = Math.max(s.t, s.lastLt + 0.16); it.lt = s.lastLt; it.jumped = false; s.q.push(it); } }
      r.pose = { ...POSE_UP, front: 2.6 + Math.sin(G.t * 6) * 0.2 }; r.z = 16 + Math.sin(G.t * 3) * 6;
      for (const it of [...s.q]) {
        const t = s.t - it.lt; if (t < 0 || it.state !== 'held') continue;
        if (t < 0.45) { const e = sjEase(t / 0.45); it.x = rLerp(it.hx, b.x, e); it.y = rLerp(it.hy, b.y, e); it.z = Math.sin(e * Math.PI) * 30; }
        else if (t < 0.45 + STEP * 0.09) { const k = (t - 0.45) / 0.09, n = Math.floor(k); it.x = b.x + s.dir * (n + (k % 1)) * SW; it.y = b.y; it.z = n * SH + Math.sin((k % 1) * Math.PI) * 16 + SH * (k % 1); }
        else if (!it.jumped) { it.jumped = true; dropItem(s, it, s.dir * rand(120, 260), rand(-80, 80), 260); if (onScreen(it.x, it.y) && Math.random() < 0.5) popup(it.x, it.y, pick(['야호~', '뛰어!', '안녕~', '(투신)']), '#fff', 16, 0.8, it.z + 30); }
      }
    },
    draw(s) {
      const b = s.base; if (!b) return;
      ctx.save(); ctx.translate(b.x, b.y * TILT);
      const glow = 0.8 + 0.2 * Math.sin(G.t * 6);
      for (let i = 0; i < 7; i++) {
        const x = s.dir * i * 34 - (s.dir < 0 ? 34 : 0), y = -i * 30 - 30;
        ctx.globalAlpha = 0.35 * glow; ctx.fillStyle = '#fff3bf'; ctx.fillRect(x, y + 10, 34, i * 30 + 20);      // 계단 기둥 빛
        ctx.globalAlpha = glow; ctx.fillStyle = '#f2d98a'; ctx.fillRect(x, y, 34, 11); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 34, 3);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    },
  },
  // 뱀파이어 쥐: 거대 박쥐로 변신 → 날개가 너무 커서 조종이 안 됨
  bigbat: {
    dur: 6.2,
    beats: [[0.1, s => ucap(s, '어둠의 날개여…!')], [1.1, s => ucap(s, '어? 어어어?! 조종이 안 돼!!', { col: '#fff3bf' })], [3.3, s => ucap(s, '누가 브레이크 좀!!', { col: '#fff3bf' })], [5.6, s => ucap(s, '(철푸덕)')]],
    start(s) { smoke(s.r.x, s.r.y); smoke(s.r.x, s.r.y); s.r.hideBody = true; s.bat = { x: s.r.x, y: s.r.y, z: 60, a: 0 }; },
    step(s, dt) {
      const r = s.r, b = s.bat;
      if (s.t < 5.7) {
        const t = s.t * 1.7, px = b.x, py = b.y;
        b.x = s.x0 + Math.sin(t) * 330; b.y = s.y0 + Math.sin(t * 2) * 170; b.z = 60 + Math.sin(t * 3) * 45;
        const o = { x: b.x, y: b.y, vx: 0, vy: 0 }; confine(o, 40, px, py, 0, null); b.x = o.x; b.y = o.y;
        b.a = Math.atan2(b.y - py, b.x - px); r.x = b.x; r.y = b.y; r.z = b.z; r.face = Math.cos(b.a) >= 0 ? 1 : -1;
        if (b.z < 70) { for (const it of itemsIn(b.x, b.y, 90)) flingItem(s, it, b.a + rand(-0.8, 0.8), 560, 420); for (const q of ratsNear(s, b.x, b.y, 90)) ragdoll(q, b.a + rand(-1, 1)); }
        if (Math.random() < 0.3) particle({ x: b.x, y: b.y, z: b.z, vx: 0, vy: 0, life: 0.35, max: 0.35, size: 14, color: 'rgba(90,60,80,.5)', type: 'trail', drag: 0 });
        if (Math.floor(s.t * 5) !== s.flap) { s.flap = Math.floor(s.t * 5); Sfx.dash(); }
      } else if (r.hideBody) { r.hideBody = false; smoke(r.x, r.y); r.z = 0; addShake(0.15); }
      else r.pose = { sy: 0.45, sx: 1.5, front: -1.4, farFront: -1.4, back: 1.4, farBack: 1.4, head: 0.2 };
    },
    end(s) { s.r.hideBody = false; s.bat = null; },
    draw(s) {
      const b = s.bat; if (!b || !s.r.hideBody) return;
      const f = Math.sin(G.t * 16), y = b.y * TILT - b.z;
      ctx.save(); ctx.fillStyle = 'rgba(30,15,5,.22)'; ctx.beginPath(); ctx.ellipse(b.x, b.y * TILT, 80, 22, 0, 0, 6.28); ctx.fill();
      ctx.translate(b.x, y);
      if (IMG['art_ult:giant_bat']) { ctx.translate(0, 50); ctx.scale(1, 1 - 0.25 * Math.abs(f)); ultArt(ctx, 'giant_bat', 220); ctx.restore(); return; }
      ctx.fillStyle = '#4b3a4f';
      for (const d of [-1, 1]) { ctx.save(); ctx.scale(d, 1); ctx.rotate(f * 0.5); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(95, -40); ctx.lineTo(80, -8); ctx.lineTo(100, 10); ctx.lineTo(62, 4); ctx.lineTo(56, 22); ctx.lineTo(30, 10); ctx.closePath(); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = '#5b4a5f'; ctx.beginPath(); ctx.ellipse(0, 0, 26, 22, 0, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-14, -16); ctx.lineTo(-10, -34); ctx.lineTo(-2, -18); ctx.moveTo(14, -16); ctx.lineTo(10, -34); ctx.lineTo(2, -18); ctx.fill();
      ctx.fillStyle = '#e8786a'; circ(ctx, -8, -5, 4); ctx.fill(); circ(ctx, 8, -5, 4); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(-3, 15); ctx.lineTo(0, 8); ctx.moveTo(0, 8); ctx.lineTo(3, 15); ctx.lineTo(6, 8); ctx.fill();
      ctx.restore();
    },
  },
});
// 필살기 쓰면서 걸어다니기 (연출상 움직여도 되는 것들)
function ultWalk(s, dt, spd = 150) {
  const r = s.r;
  if (!s.wt || (s.wtT -= dt) <= 0 || Math.hypot(s.wt.x - r.x, s.wt.y - r.y) < 50) { s.wt = nearestItem(r, 520) || { x: s.x0 + rand(-220, 220), y: s.y0 + rand(-160, 160) }; s.wtT = 1.4; }
  const dx = s.wt.x - r.x, dy = s.wt.y - r.y, d = Math.hypot(dx, dy) || 1, px = r.x, py = r.y;
  r.x += dx / d * spd * dt; r.y += dy / d * spd * dt; confine(r, ratR(r), px, py, 0, null);
  r.face = dx >= 0 ? 1 : -1; r.speed = spd; r.walk += dt * spd / 9;
}
// ── 기사·로봇·황제 (잘 안 보이던 것 교체) ──
Object.assign(ULT_ENG, {
  // 기사 쥐: 바위에 꽂힌 전설의 검 → 끄응…×3 → 바위까지 딸려 나옴 → 그걸로 빙빙 휘두르다 쾅
  excalibur: {
    dur: 6.3,
    beats: [[0.1, s => ucap(s, '전설의 검을 뽑는 자, 왕이 되리라…')], [0.35, s => { s.r.say = { text: '끄응…', t: 0.35 }; }], [0.7, s => { s.r.say = { text: '끄으응…!', t: 0.35 }; }], [1.05, s => { s.r.say = { text: '끄으으으응!!!', t: 0.35 }; }],
      [1.4, s => ucap(s, '…바위까지 딸려 나왔다.', { col: '#fff3bf' })], [2.1, s => ucap(s, '그냥 이걸로 친다!!')], [3.7, s => ucap(s, '(멈추는 법은 안 배웠다)', { size: 28 })], [5.8, s => ucap(s, '(이제야 진짜 검)')]],
    start(s) { const r = s.r; s.stone = { x: r.x - r.face * 46, y: r.y + 4 }; s.sa = -Math.PI / 2; s.trail = []; },
    step(s, dt) {
      const r = s.r, st = s.stone;
      if (s.t < 1.35) {
        r.x = st.x + r.face * 46; r.y = st.y - 4;
        r.pose = { tilt: 0.35, front: 1.3, farFront: 1.1, back: -0.7, farBack: -0.5, head: -0.35, tail: 1 };
        r.jit = s.t > 0.3 ? 2.5 : 0; st.jit = s.t > 0.3 ? 3 : 0;
        if (Math.random() < 0.3) dust(st.x, st.y, 1, 0.7);
        return;
      }
      r.jit = 0; st.jit = 0;
      if (!s.pulled) { s.pulled = true; s.sa = -r.face * 0.2 - Math.PI / 2; flash('#fff', 0.35); Sfx.clear(); addShake(0.2); burst(st.x, st.y, 14, { colors: ['#b9b1a6', '#8e8a84'], min: 120, max: 320, s0: 4, s1: 8, z: 10 }); }
      if (s.t < 1.8) { r.pose = { ...POSE_UP }; return; }
      if (s.t < 5.4) {
        // 빙빙: 검 끝에 바위가 달린 채로 회전하며 전진
        s.sa += dt * 8.5; ultWalk(s, dt, 150);
        r.pose = { front: 2.4, farFront: 2.2, head: -0.3, tail: 1.3 }; r.face = Math.cos(s.sa) >= 0 ? 1 : -1;
        const L = 250, tx = r.x + Math.cos(s.sa) * L, ty = r.y + Math.sin(s.sa) * L * 0.7;
        s.trail.push({ x: tx, y: ty, t: G.t }); s.trail = s.trail.filter(p => G.t - p.t < 0.25);
        for (const it of itemsIn(r.x, r.y, L + 40)) { let da = Math.atan2(it.y - r.y, it.x - r.x) - s.sa; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < 0.45) flingItem(s, it, s.sa + 1.4, 640, 460); }
        for (const o of ratsNear(s, r.x, r.y, L + 30)) { let da = Math.atan2(o.y - r.y, o.x - r.x) - s.sa; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < 0.4) ragdoll(o, s.sa + 1.4, 520, 420); }
        if (Math.floor(s.sa / Math.PI) !== s.half) { s.half = Math.floor(s.sa / Math.PI); Sfx.dash(); }
        return;
      }
      if (!s.slam) {
        // 바위째로 쾅 내려찍기 → 바위 박살
        s.slam = true; s.sa = aimMost(r); const tx = r.x + Math.cos(s.sa) * 200, ty = r.y + Math.sin(s.sa) * 140;
        shock(tx, ty, 240, ultD(s) * 0.8, r, '#bfe3ea', 3);
        for (const it of itemsIn(tx, ty, 220)) flingItem(s, it, Math.atan2(it.y - ty, it.x - tx), 460, 560);
        stampAt(tx, ty, m => { m.fillStyle = 'rgba(60,50,45,.35)'; m.beginPath(); m.ellipse(tx, ty, 90, 64, 0, 0, 6.28); m.fill(); });
        burst(tx, ty, 30, { colors: ['#b9b1a6', '#8e8a84', '#d6d1c8'], min: 200, max: 600, s0: 5, s1: 11, z: 20 });
        flash('#fff', 0.45); addShake(0.5); Sfx.boom(1.4);
        s.stoneGone = true;
      }
      r.pose = { tilt: 0.25, front: 0.6, farFront: 0.5, head: 0.4, tail: 1 };
    },
    end(s) { s.r.jit = 0; },
    draw(s) {
      const r = s.r, st = s.stone; if (!st) return;
      if (s.t < 1.35) {
        // 하늘에서 빛 + 바위에 꽂힌 검
        const g = ctx.createLinearGradient(0, st.y * TILT - 700, 0, st.y * TILT); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,243,191,.55)');
        ctx.fillStyle = g; ctx.fillRect(st.x - 40, st.y * TILT - 700, 80, 700);
        ctx.save(); ctx.translate(st.x + rand(-1, 1) * (st.jit || 0), st.y * TILT);
        if (!ultArt(ctx, 'excalibur', 120)) { drawStone(ctx, 0, -18, 42); drawBlade(ctx, 0, -40, -Math.PI / 2, 90, 1); }
        ctx.restore();
        return;
      }
      if (s.stoneGone && s.t > 5.4) {
        // 박살 난 뒤: 빛나는 진짜 검만 번쩍
        ctx.save(); ctx.translate(r.x, r.y * TILT - 26); drawBlade(ctx, 0, 0, s.sa, 170, 1.3); ctx.restore();
        return;
      }
      const up = s.t < 1.8, a = up ? -Math.PI / 2 : s.sa, L = up ? 120 : 250;
      // 휘두른 자국
      if (s.trail.length > 1) { ctx.save(); ctx.lineCap = 'round'; for (let i = 1; i < s.trail.length; i++) { const p = s.trail[i], q = s.trail[i - 1], k = 1 - (G.t - p.t) / 0.25; ctx.globalAlpha = k * 0.6; ctx.strokeStyle = '#bfe3ea'; ctx.lineWidth = 26 * k; ctx.beginPath(); ctx.moveTo(q.x, q.y * TILT - 26); ctx.lineTo(p.x, p.y * TILT - 26); ctx.stroke(); } ctx.restore(); }
      ctx.save(); ctx.translate(r.x, r.y * TILT - 26);
      const ex = Math.cos(a) * L, ey = up ? -L : Math.sin(a) * L * 0.7 * TILT;
      drawBlade(ctx, 0, 0, Math.atan2(ey, ex), Math.hypot(ex, ey) - 30, 1.2);
      drawStone(ctx, ex, ey, 40);
      ctx.restore();
    },
  },
  // 로봇 쥐: 자동차로 변신 → 무면허 폭주·드리프트·벽꽝 → 분해되며 원래대로
  transform: {
    dur: 6.2,
    beats: [[0.05, s => ucap(s, '변신!! 치키치키치키…')], [0.7, s => ucap(s, '…자동차?', { col: '#fff3bf' })], [1.6, s => ucap(s, '(운전면허 없음)')], [3.5, s => ucap(s, '(과속 단속 카메라: 찰칵)', { size: 28 })], [5.7, s => ucap(s, '(분해됨)')]],
    start(s) { s.car = { x: s.r.x, y: s.r.y, vx: 0, vy: 0, a: s.r.face > 0 ? 0 : Math.PI, sp: 0 }; s.honk = 0; },
    step(s, dt) {
      const r = s.r, c = s.car;
      if (s.t < 0.5) { r.pose = POSE_FLAIL(); r.jit = 3; if (Math.random() < 0.3) popup(r.x + rand(-30, 30), r.y, pick(['치킹!', '철컥!', '위잉!']), '#fff', 16, 0.5, 50); return; }
      if (!r.hideBody && s.t < 5.6) { r.hideBody = true; r.jit = 0; smoke(r.x, r.y); smoke(r.x, r.y); Sfx.pop(); }
      if (s.t < 5.6) {
        // 물건 쪽으로 핸들을 꺾는데 늘 과하게 꺾음 (드리프트)
        const t = nearestItem({ x: c.x, y: c.y }, 520), want = t ? Math.atan2(t.y - c.y, t.x - c.x) : c.a + 0.5;
        let da = want - c.a; da = Math.atan2(Math.sin(da), Math.cos(da));
        c.a += clamp(da, -1, 1) * dt * 4.5 + Math.sin(G.t * 7) * dt * 1.5;
        c.sp = Math.min(640, c.sp + dt * 900);
        c.vx += (Math.cos(c.a) * c.sp - c.vx) * Math.min(1, dt * 3); c.vy += (Math.sin(c.a) * c.sp - c.vy) * Math.min(1, dt * 3);
        const px = c.x, py = c.y, hit = confine(c, 44, px, py, 0.7, null);
        c.x += c.vx * dt; c.y += c.vy * dt; if (confine(c, 44, px, py, 0.7, null) || hit) { c.a = Math.atan2(c.vy, c.vx); c.sp *= 0.5; popup(c.x, c.y, '쾅!', '#fff', 22, 0.6, 50); addShake(0.15); Sfx.knock(); dust(c.x, c.y, 5, 1.2); }
        r.x = c.x; r.y = c.y; r.z = 0; r.face = Math.cos(c.a) >= 0 ? 1 : -1;
        for (const it of itemsIn(c.x, c.y, 62)) flingItem(s, it, c.a + rand(-0.6, 0.6), 700, 420);
        for (const o of ratsNear(s, c.x, c.y, 60)) ragdoll(o, c.a + rand(-0.8, 0.8), 600, 380);
        if (Math.abs(da) > 0.6 && Math.random() < 0.6) stampAt(c.x, c.y, m => { m.fillStyle = 'rgba(40,35,35,.22)'; m.fillRect(c.x - 3, c.y - 3, 6, 6); });
        if ((s.honk -= dt) <= 0) { s.honk = rand(0.6, 1); popup(c.x, c.y, '빵빵!', '#fff3bf', 20, 0.6, 70); Sfx.pop(); }
      } else if (r.hideBody) {
        r.hideBody = false;
        burst(c.x, c.y, 26, { colors: ['#9fb2bd', '#7d8a90', '#e8786a', '#fff'], min: 180, max: 520, s0: 4, s1: 9, z: 20 });
        shock(c.x, c.y, 150, ultD(s) * 0.5, r, '#9fb2bd', 1.5); Sfx.boom(1);
      } else r.pose = { sy: 0.85, head: 0.4, tail: -0.3, front: -0.5, farFront: 0.5 };
    },
    end(s) { s.r.hideBody = false; s.r.jit = 0; },
    sorted(s) { return s.car && s.r.hideBody ? [{ y: s.car.y, f: () => ULT_ENG.transform.drawCar(s) }] : []; },
    drawCar(s) {
      const c = s.car;
      ctx.save(); ctx.fillStyle = 'rgba(30,15,5,.25)'; ctx.beginPath(); ctx.ellipse(c.x, c.y * TILT + 4, 84, 34, 0, 0, 6.28); ctx.fill();
      ctx.translate(c.x, c.y * TILT - 4); ctx.scale(1, TILT); ctx.rotate(c.a);
      const cim = IMG['art_ult:car']; if (cim) { const w = 175, h = w * cim.height / cim.width; ctx.drawImage(cim, -w / 2, -h / 2, w, h); ctx.restore(); return; }
      ctx.fillStyle = '#1d1826'; for (const [x, y] of [[-34, -30], [34, -30], [-34, 30], [34, 30]]) { rr(ctx, x - 13, y - 7, 26, 14, 5); ctx.fill(); }
      ctx.fillStyle = '#9fb2bd'; rr(ctx, -60, -30, 120, 60, 16); ctx.fill();
      ctx.fillStyle = '#e8786a'; ctx.fillRect(-60, -6, 120, 12);
      ctx.fillStyle = '#7d8a90'; rr(ctx, -26, -22, 50, 44, 10); ctx.fill();
      ctx.fillStyle = '#bfe3ea'; rr(ctx, 12, -19, 12, 38, 4); ctx.fill();
      ctx.fillStyle = '#fff3bf'; circ(ctx, 58, -18, 6); ctx.fill(); circ(ctx, 58, 18, 6); ctx.fill();
      ctx.fillStyle = '#b9c7ce'; circ(ctx, -4, 0, 12); ctx.fill(); ctx.fillStyle = '#e8786a'; circ(ctx, 2, 0, 4); ctx.fill();   // 지붕 위 로봇 머리
      ctx.restore();
    },
  },
  // 황제 쥐: 밤하늘 불꽃놀이 → 하늘에서 불꽃 꽃 → 불똥 비가 쏟아져 물건 박살 (몇 발은 엉뚱한 데로)
  fireworks: {
    dur: 6.2,
    beats: [[0.1, s => ucap(s, '만세! 만만세!')], [1.6, s => ucap(s, '(불꽃놀이 안전 수칙: 무시)')], [2.8, s => ucap(s, '(옆으로 쏘면 안 됩니다)')], [4.3, s => ucap(s, '만만만세!!!', { col: '#fff3bf' })]],
    start(s) { s.rk = []; s.fl = []; },
    step(s, dt) {
      const r = s.r;
      r.pose = { tilt: -0.5, front: 2.8, farFront: 1.2, head: -0.4, tail: 1.3 };
      ultWalk(s, dt, 100);
      if ((s.hitT -= dt) <= 0 && s.t < 5.2) {
        s.hitT = 0.16;
        const wild = Math.random() < 0.2, t = wild ? null : pick(itemsIn(r.x, r.y, ULT_R));
        const a = rand(0, 6.28), tx = t ? t.x : r.x + Math.cos(a) * 320, ty = t ? t.y : r.y + Math.sin(a) * 220;
        s.rk.push({ x: r.x, y: r.y, z: 24, sx: r.x, sy: r.y, tx, ty, t: 0, dur: wild ? 0.5 : 0.65, wild, col: pick(['#e8786a', '#f0c878', '#9dd5a8', '#a9d3dc', '#cdb4db', '#f2b8b0']) });
        Sfx.dash(); if (onScreen(r.x, r.y)) dust(r.x, r.y, 2, 0.7);
      }
      for (const k of s.rk) {
        k.t += dt; const e = Math.min(1, k.t / k.dur);
        k.x = rLerp(k.sx, k.tx, e); k.y = rLerp(k.sy, k.ty, e); k.z = k.wild ? 22 + Math.sin(e * 25) * 12 : rLerp(24, 300, sjEase(e));
        particle({ x: k.x, y: k.y, z: k.z, vx: rand(-20, 20), vy: rand(-20, 20), vz: -60, life: 0.35, max: 0.35, size: 6, color: k.col, type: 'spark', drag: 1 });
        if (e < 1 || k.done) continue;
        k.done = true;
        if (k.wild) {
          // 옆으로 날아간 로켓: 바닥에서 쾅
          for (const it of itemsIn(k.x, k.y, 90)) flingItem(s, it, rand(0, 6.28), 360, 480);
          for (const o of ratsNear(s, k.x, k.y, 80)) ragdoll(o, rand(0, 6.28));
          if (onScreen(k.x, k.y)) { burst(k.x, k.y, 16, { colors: [k.col, '#fff'], type: 'star', min: 200, max: 460, s0: 3, s1: 7, z: 20 }); popup(k.x, k.y, '앗 뜨거!', '#fff', 18, 0.7, 40); Sfx.boom(0.5); }
        } else {
          // 하늘에서 불꽃 꽃 → 0.45초 뒤 불똥 비
          s.fl.push({ x: k.x, y: k.y, z: k.z, t0: G.t, col: k.col });
          for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28; particle({ x: k.x + Math.cos(a) * 20, y: k.y + Math.sin(a) * 14, z: k.z, vx: Math.cos(a) * rand(80, 160), vy: Math.sin(a) * rand(50, 110), vz: rand(-60, 60), g: 500, life: 1.1, max: 1.1, size: rand(4, 7), color: pick([k.col, '#fff', '#fff3bf']), type: 'star', rot: 0, vr: 4, drag: 0.6 }); }
          Sfx.boom(0.55); addShake(0.04);
          later(0.45, () => { for (const it of itemsIn(k.x, k.y, 110)) flingItem(s, it, Math.atan2(it.y - k.y, it.x - k.x), 300, 460); aoe(k.x, k.y, 120, ultD(s) * 0.22, r); if (onScreen(k.x, k.y)) ring(k.x, k.y, 110, k.col, 0.4, 8); });
        }
      }
      s.rk = s.rk.filter(k => !k.done);
      s.fl = s.fl.filter(f => G.t - f.t0 < 0.9);
    },
    draw(s) {
      for (const k of s.rk) {
        ctx.save(); ctx.translate(k.x, k.y * TILT - k.z);
        if (!ultArt(ctx, 'firework', 26)) { ctx.fillStyle = k.col; rr(ctx, -6, -22, 12, 28, 3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(0, -34); ctx.lineTo(6, -22); ctx.fill(); ctx.fillStyle = '#8c6a4f'; ctx.fillRect(-1.5, 6, 3, 18); }
        ctx.restore();
      }
      // 불꽃 꽃
      for (const f of s.fl) {
        const t = (G.t - f.t0) / 0.9, R = 120 * sjEase(Math.min(1, t * 1.6)), a = 1 - t, cy = f.y * TILT - f.z;
        ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
        for (let i = 0; i < 20; i++) {
          const an = i / 20 * 6.28, x1 = f.x + Math.cos(an) * R * 0.35, y1 = cy + Math.sin(an) * R * 0.35, x2 = f.x + Math.cos(an) * R, y2 = cy + Math.sin(an) * R;
          ctx.strokeStyle = i % 2 ? f.col : '#fff'; ctx.lineWidth = 4 * a + 1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.fillStyle = f.col; circ(ctx, x2, y2, 5 * a + 1); ctx.fill();
        }
        ctx.fillStyle = '#fff'; circ(ctx, f.x, cy, 14 * a); ctx.fill();
        ctx.restore();
      }
    },
    // 불꽃이 잘 보이게 화면을 밤처럼
    ui(s) { const a = Math.min(1, s.t / 0.3) * Math.min(1, (s.eng.dur - s.t) / 0.38); ctx.fillStyle = `rgba(20,22,52,${0.42 * a})`; ctx.fillRect(0, 0, W, H); },
  },
});
// ── 사무라이·지니·록스타 (잘 안 보이던 것 교체) ──
Object.assign(ULT_ENG, {
  // 사무라이 쥐: 벽력일섬 — 번개처럼 6연속 순간 돌진, 황금 번개 궤적 → 칼을 넣는 순간 궤적 따라 전부 폭발
  split: {
    // 한 판 = 기 모으기(ch초) → 0.11초 간격 n연속 돌진 → 0.69초 뒤 찰칵·폭발. 첫 판 육연(0초~), 둘째 판 팔연(2.9초~, 기 모으기 짧게)
    dur: 6.1, sets: [{ c0: 0, ch: 0.95, n: 6 }, { c0: 2.9, ch: 0.5, n: 8 }],
    beats: [[0.05, s => ucap(s, '뇌의 호흡…', { size: 38 })], [0.5, s => ucap(s, '제1형…', { size: 38 })], [0.95, s => ucap(s, '벽력일섬!!', { y: 0.5, size: 96, col: '#fff3bf', sh: '#d9a441', dur: 0.9 })], [1.75, s => ucap(s, '…육연.', { col: '#fff3bf' })], [2.25, s => { s.r.say = { text: '찰칵.', t: 1 }; Sfx.clink(); }],
      [2.9, s => ucap(s, '…아직이다. 팔연!!', { size: 60, col: '#fff3bf', sh: '#d9a441', y: 0.5, dur: 1 })], [4.92, s => { s.r.say = { text: '찰칵.', t: 1 }; Sfx.clink(); }]],
    start(s) { s.bolts = []; s.cut = new Set(); s.zap = []; s.n = 0; s.set = ULT_ENG.split.sets[0]; },
    step(s, dt) {
      const r = s.r, S2 = ULT_ENG.split.sets[1];
      if (s.t >= S2.c0 && s.set !== S2) { s.set = S2; s.bolts = []; s.cut = new Set(); s.n = 0; s.done = false; s.boomT = 0; }   // 둘째 판: 궤적 새로
      const { c0, ch, n: N } = s.set, lt = s.t - c0, de = ch + N * 0.11;    // de: 돌진이 끝나는 시각 (판 기준)
      s.zap = s.zap.filter(z => (z.life -= dt) > 0);
      if (lt < ch) {
        // 기 모으기: 낮게 웅크리고 몸에서 번개가 튐
        r.pose = { front: 0.9, farFront: 0.6, back: -1, farBack: -0.8, head: 0.4, tail: -0.2, bob: 7, sy: 0.84, sx: 1.12 };
        r.jit = 1.5;
        if (Math.random() < 0.6) { const a = rand(0, 6.28), d = rand(20, 60); s.zap.push({ pts: bolt(r.x, r.y * TILT - 20, r.x + Math.cos(a) * d, r.y * TILT - 20 + Math.sin(a) * d, 4, 8), life: 0.08 }); }
        if (Math.random() < 0.15) Sfx.clink();
        return;
      }
      r.jit = 0;
      if (lt < de) {
        // n연속 돌진 (0.11초마다)
        const idx = Math.floor((lt - ch) / 0.11);
        if (idx >= s.n && s.n < N) {
          s.n++;
          const t = nearestItem(r, ULT_R, it => !s.cut.has(it)) || { x: s.x0 + rand(-300, 300), y: s.y0 + rand(-220, 220) };
          const a = Math.atan2(t.y - r.y, t.x - r.x) + rand(-0.2, 0.2), L = Math.hypot(t.x - r.x, t.y - r.y) + 70;
          const o = { x: r.x + Math.cos(a) * L, y: r.y + Math.sin(a) * L, vx: 0, vy: 0 }; confine(o, ratR(r), r.x, r.y, 0, null);
          const x1 = r.x, y1 = r.y, SL = Math.hypot(o.x - x1, o.y - y1) || 1, ux = (o.x - x1) / SL, uy = (o.y - y1) / SL;
          for (const it of itemsIn((x1 + o.x) / 2, (y1 + o.y) / 2, SL / 2 + 40)) { const px = it.x - x1, py = it.y - y1, al = px * ux + py * uy; if (al > -20 && al < SL + 20 && Math.abs(px * uy - py * ux) < it.r + 46) s.cut.add(it); }
          s.bolts.push({ x1, y1, x2: o.x, y2: o.y });
          for (let i = 0; i < 4; i++) particle({ x: rLerp(x1, o.x, i / 4), y: rLerp(y1, o.y, i / 4), z: 14, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 16, color: 'rgba(255,243,191,.8)', type: 'trail', drag: 0 });
          r.x = o.x; r.y = o.y; r.face = ux >= 0 ? 1 : -1;
          flash('#fff3bf', 0.22); addShake(0.12); Sfx.dash();
        }
        r.pose = { front: 1.9, farFront: 1.3, back: -1.5, farBack: -1.3, head: -0.25, tail: -0.7, sx: 1.18, sy: 0.9 };
        return;
      }
      r.pose = lt < de + 0.64 ? { front: 1.2, farFront: 0.8, back: -0.6, head: -0.1, tail: -0.4 } : { front: 0.4, farFront: 0.3, head: 0.35, tail: -0.2 };
      if (lt >= de + 0.69 && !s.done) {
        // 찰칵 → 궤적 위 전부 폭발
        s.done = true; s.boomT = G.t;
        for (const b of s.bolts) for (const it of itemsIn((b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2, Math.hypot(b.x2 - b.x1, b.y2 - b.y1) / 2 + 50)) s.cut.add(it);
        for (const it of s.cut) if (it.state === 'rest') { flingItem(s, it, rand(0, 6.28), 320, 520); if (onScreen(it.x, it.y)) burst(it.x, it.y, 8, { colors: ['#fff3bf', '#f0c878', '#fff'], type: 'star', min: 160, max: 420, s0: 3, s1: 7, z: 20 }); }
        for (const b of s.bolts) for (const o of ratsNear(s, (b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2, 80)) ragdoll(o, rand(0, 6.28));
        flash('#fff', 0.55); addShake(0.45); Sfx.boom(1.3);
      }
    },
    end(s) { s.r.jit = 0; },
    draw(s) {
      const glow = s.boomT ? Math.max(0, 1 - (G.t - s.boomT) / 0.9) * 1.6 : s.t - s.set.c0 > s.set.ch + s.set.n * 0.11 ? 0.8 + 0.2 * Math.sin(G.t * 30) : 1;
      if (glow <= 0.02) return;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const b of s.bolts) {
        const pts = bolt(b.x1, b.y1 * TILT - 14, b.x2, b.y2 * TILT - 14, 9, 22);
        ctx.globalAlpha = Math.min(1, 0.35 * glow); ctx.strokeStyle = '#f0c878'; ctx.lineWidth = 30; polyline(pts);
        ctx.globalAlpha = Math.min(1, 0.9 * glow); ctx.strokeStyle = '#fff3bf'; ctx.lineWidth = 9; polyline(pts);
        ctx.globalAlpha = Math.min(1, glow); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; polyline(pts);
      }
      for (const z of s.zap) { ctx.globalAlpha = 1; ctx.strokeStyle = '#fff3bf'; ctx.lineWidth = 3; polyline(z.pts); }
      ctx.restore();
    },
    ui(s) { if (s.t - s.set.c0 > s.set.ch - 0.05 && !s.boomT) { ctx.fillStyle = 'rgba(20,18,40,.32)'; ctx.fillRect(0, 0, W, H); } },
  },
  // 술탄 햄스터: 램프의 지니 — 램프에서 연기가 뿜어져 거대한 지니 등장 → 소원 3개를 곡해
  genie: {
    // 소원 ① 1.6초(커짐) → ② 3.1초(0.08초마다 하나씩 복제) → ③ 4.6초 → 곡해 5.1초 → 5.4초 대폭발
    dur: 6.2, wt: [1.6, 3.1, 4.6, 5.1, 5.4],
    beats: [[0.1, s => ucap(s, '(램프를 문지른다… 쓱쓱)')], [1.0, s => ucap(s, '소원을 말해 보거라~!!', { col: '#cdb4db', size: 40 })], [1.6, s => { ucap(s, '소원 ①: 물건 크게 해줘!'); s.wish = 1; }], [3.1, s => { ucap(s, '소원 ②: 더 많이!!'); s.wish = 2; }], [4.6, s => { ucap(s, '소원 ③: …다 없어져라?', { col: '#fff3bf' }); s.wish = 3; }], [5.1, s => ucap(s, '(지니가 곡해함)', { size: 40 })]],
    start(s) { s.vict = itemsIn(s.r.x, s.r.y, ULT_R).slice(0, 26); for (const it of s.vict) it.r0 = it.r; s.gz = 0; s.copies = 0; },
    step(s, dt) {
      const r = s.r, gx = r.x + r.face * 70, gy = r.y;
      s.gx = gx; s.gy = gy;
      r.pose = s.t < 0.9 ? { front: 1 + Math.sin(G.t * 30) * 0.35, farFront: 0.9, head: 0.3, prop: '🪔' } : { ...POSE_UP, prop: '🪔' };
      // 램프에서 연기 뿜기 → 지니가 커지며 등장
      if (s.t > 0.3 && s.t < 1.3) for (let i = 0; i < 3; i++) particle({ x: r.x - r.face * 14, y: r.y, z: 30, vx: (gx - r.x) * rand(0.6, 1.2), vy: rand(-20, 20), vz: rand(160, 260), life: 0.7, max: 0.7, size: rand(10, 18), color: 'rgba(191,205,230,', type: 'dust', drag: 1.5 });
      const [W1, W2, , WG, WB] = ULT_ENG.genie.wt;
      s.gz = clamp((s.t - 0.5) / 0.7, 0, 1) * (s.t > WG ? 1 + Math.min(0.5, (s.t - WG) * 1.2) : 1);
      if (s.t > 0.5 && !s.poof) { s.poof = true; for (let i = 0; i < 3; i++) smoke(gx, gy); Sfx.pop(); }
      if (s.wish === 1 && s.t < W1 + 0.8) for (const it of s.vict) if (it.state === 'rest') { it.r = rLerp(it.r0, it.r0 * 1.7, sjEase(Math.min(1, (s.t - W1) / 0.7))); if (!it.spk && onScreen(it.x, it.y)) { it.spk = true; burst(it.x, it.y, 8, { colors: ['#cdb4db', '#fff3bf', '#fff'], type: 'star', min: 80, max: 220, s0: 3, s1: 6, z: 30 }); ring(it.x, it.y, it.r0 * 2, '#cdb4db', 0.4, 5); } }
      if (s.wish === 2 && s.copies < 16 && s.copies <= (s.t - W2) / 0.08) {
        // 복제: 0.08초마다 하나씩 펑 (최대 16개)
        s.src = s.src || s.vict.filter(i => i.state === 'rest').slice(0, 16);
        const it = s.src[s.copies++];
        if (it && it.state === 'rest') {
          const [i, j] = roomOf(it.x, it.y), c = makeItem(it.type.k, it.x + rand(-60, 60), it.y + rand(-40, 40), i, j);
          const o = { x: c.x, y: c.y, vx: 0, vy: 0 }; confine(o, c.r, it.x, it.y, 0, null); c.x = o.x; c.y = o.y;
          c.r = it.r; c.appear = 0.2; G.items.push(c); s.vict.push(c);
          if (onScreen(c.x, c.y)) { smoke(c.x, c.y); if (Math.random() < 0.35) popup(c.x, c.y, '펑!', '#fff', 18, 0.6, 40); }
          if (s.copies % 4 === 1) { ring(gx, gy, 300, '#cdb4db', 0.6, 10); Sfx.pop(); }
        }
      }
      if (s.t > WB && !s.boom) {
        s.boom = true; G.quiet = true;
        for (const it of s.vict) if (it.state === 'rest') { it.air = 2; if (onScreen(it.x, it.y)) burst(it.x, it.y, 8, { colors: ['#cdb4db', '#fff3bf', '#fff'], type: 'star', min: 150, max: 420, s0: 3, s1: 7, z: 20 }); skillBlastItem(it, ultItemD(s) * 1.5, r); }
        G.quiet = false; G.items = G.items.filter(it => it.state !== 'dead');
        for (let i = 0; i < 3; i++) ring(gx, gy, 200 + i * 160, i % 2 ? '#fff' : '#cdb4db', 0.6 + i * 0.1, 12);
        flash('#cdb4db', 0.5); addShake(0.45); Sfx.boom(1.4); Sfx.clear();
      }
    },
    end(s) { for (const it of s.vict) if (it.state === 'rest' && it.r0) it.r = it.r0; },
    draw(s) {
      const g = s.gz || 0; if (g <= 0 || !s.gx) return;
      const r = s.r, x = s.gx, base = s.gy * TILT, bob = Math.sin(G.t * 3) * 8, H0 = 230 * g;
      // 램프 → 지니로 이어지는 연기 꼬리
      ctx.save(); ctx.globalAlpha = 0.55 * Math.min(1, g); ctx.strokeStyle = '#bfcde6'; ctx.lineCap = 'round';
      ctx.lineWidth = 22 * g; ctx.beginPath(); ctx.moveTo(r.x - r.face * 14, r.y * TILT - 30); ctx.quadraticCurveTo(x - r.face * 40, base - 30, x, base - 60 + bob); ctx.stroke();
      // 후광
      const gl = ctx.createRadialGradient(x, base - H0 * 0.6 + bob, 10, x, base - H0 * 0.6 + bob, H0 * 0.8); gl.addColorStop(0, 'rgba(205,180,219,.5)'); gl.addColorStop(1, 'rgba(205,180,219,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = gl; circ(ctx, x, base - H0 * 0.6 + bob, H0 * 0.8); ctx.fill();
      ctx.translate(x, base - 40 + bob);
      if (!ultArt(ctx, 'genie', 230 * g)) {
        ctx.scale(1.7 * g, 1.7 * g); ctx.translate(0, -90);
        ctx.fillStyle = '#9fb7d9'; ctx.beginPath(); ctx.moveTo(-10, 90); ctx.quadraticCurveTo(-40, 40, -34, 0); ctx.lineTo(34, 0); ctx.quadraticCurveTo(40, 40, 10, 90); ctx.closePath(); ctx.fill();
        circ(ctx, 0, -28, 26); ctx.fill(); ctx.fillStyle = '#7f9cc4'; rr(ctx, -44, -4, 88, 16, 8); ctx.fill();
        ctx.fillStyle = '#1d1826'; circ(ctx, -9, -30, 3); ctx.fill(); circ(ctx, 9, -30, 3); ctx.fill();
        ctx.fillStyle = '#e3c46a'; ctx.beginPath(); ctx.ellipse(0, -52, 16, 7, 0, 0, 6.28); ctx.fill();
      }
      ctx.restore();
    },
  },
  // 록스타 쥐: 무대·스피커·조명 등장 → 화면 속 쥐들이 관객으로 모여 떼창 점프 → 기타 박살 → 스테이지 다이빙
  mosh: {
    // 기타 솔로 0.7~4.2초 (0.4초 박자) → 4.2초 기타 치켜들기·4.4초 쾅 → 4.6초 스테이지 다이빙 → 크라우드 서핑
    dur: 6.2, solo: 4.2,
    beats: [[0.1, s => ucap(s, '레이디스 앤 젠틀쥐!!', { size: 40 })], [0.9, s => ucap(s, '🎸 기타 솔로!!', { col: '#fff3bf' })], [2.5, s => ucap(s, '(솔로가 끝나지 않는다)', { size: 28 })], [4.2, s => ucap(s, '기타… 박살!!', { size: 42, col: '#fff3bf' })], [4.8, s => ucap(s, '스테이지 다이빙!!')], [5.7, s => ucap(s, '(관객 전원 기절)')]],
    start(s) {
      const r = s.r; s.st = { x: r.x, y: r.y };
      s.crowd = G.rats.filter(o => o !== r && !o.ultOn && onScreen(o.x, o.y, -20)).slice(0, 27);
      // 관객석: 무대 앞(아래)이 막혀 있으면 무대 뒤(위)에 세움. 자리는 무대 기준으로 열린 방 안에 가둠
      const dirY = isOpen(...roomOf(s.st.x, s.st.y + 220)) ? 1 : -1;
      s.crowd.forEach((o, i) => { grabRat(s, o); const row = Math.floor(i / 9), col = i % 9; o.sx0 = o.x; o.sy0 = o.y; o.seatX = s.st.x + (col - 4) * 58 + rand(-10, 10) + (row % 2) * 26; o.seatY = s.st.y + dirY * (130 + row * 55); const t = { x: o.seatX, y: o.seatY, vx: 0, vy: 0 }; confine(t, ratR(o) + 6, s.st.x, s.st.y, 0, null); o.seatX = t.x; o.seatY = t.y; });
      s.beat = -1; s.spot = 0;
    },
    step(s, dt) {
      const r = s.r, st = s.st, per = 0.4, ph = Math.max(0, s.t - 0.7) / per, bi = Math.floor(ph), T = ULT_ENG.mosh.solo;
      // 관객 입장
      for (const o of s.crowd) {
        if (s.t < 0.8) { const e = sjEase(s.t / 0.8); o.x = rLerp(o.sx0, o.seatX, e); o.y = rLerp(o.sy0, o.seatY, e); o.speed = 300; o.walk += dt * 30; o.face = st.x > o.x ? 1 : -1; o.pose = null; continue; }
        o.speed = 0; o.face = st.x > o.x ? 1 : -1;
        if (s.t < T + 0.8) { o.z = Math.abs(Math.sin(ph * Math.PI)) * 34; o.pose = { tilt: -0.5, front: 2.6, farFront: 2.4, back: -0.3, farBack: 0.3, head: -0.3 + Math.sin(G.t * 16 + o.x) * 0.2, tail: 1.2 }; }
        else o.pose = { tilt: -0.6, front: 2.8, farFront: 2.8, head: -0.4, tail: 1.3 };
      }
      if (s.t < T) {
        // 무대 위 기타 솔로
        r.x = st.x; r.y = st.y; r.face = 1;
        const strum = Math.sin(G.t * 42) * 0.3;
        r.pose = { tilt: -0.45, front: 1.1 + strum, farFront: 1.9, back: -0.35, farBack: 0.35, head: Math.sin(G.t * 15) * 0.55, tail: 1.2 + Math.sin(G.t * 8) * 0.2, bob: Math.abs(Math.sin(ph * Math.PI)) * -4 };
        r.z = 38;
        if (s.t > 0.7 && bi !== s.beat) {
          s.beat = bi;
          for (const o of s.crowd) { aoe(o.x, o.y, 64, ultD(s) * 0.06, r); if (onScreen(o.x, o.y) && Math.random() < 0.25) dust(o.x, o.y, 2, 0.8); }
          ring(st.x - 150, st.y, 90, 'rgba(240,200,120,.8)', 0.35, 6); ring(st.x + 150, st.y, 90, 'rgba(240,200,120,.8)', 0.35, 6);
          popup(st.x + pick([-150, 150]), st.y, pick(['♪', '♫', '♬']), '#fff3bf', 30, 0.8, 90);
          if (s.crowd.length && Math.random() < 0.6) { const o = pick(s.crowd); popup(o.x, o.y, pick(['예에에!!', '앵콜!!', '꺄아악!!', '오빠!!']), '#fff', 16, 0.7, 50); }
          addShake(0.08); Sfx.thump(0.9);
        }
        return;
      }
      if (s.t < T + 0.4) {
        // 기타 치켜들었다가 무대에 쾅
        r.pose = s.t < T + 0.2 ? { tilt: -0.6, front: 2.9, farFront: 2.7, head: -0.5, tail: 1.3 } : { tilt: 0.35, front: 0.2, farFront: 0.1, head: 0.5, tail: 1.2, bob: 4 };
        if (s.t >= T + 0.2 && !s.smash) {
          s.smash = true;
          shock(st.x, st.y, 280, ultD(s) * 0.6, r, '#f0c878', 2.6);
          for (const it of itemsIn(st.x, st.y, 260)) flingItem(s, it, Math.atan2(it.y - st.y, it.x - st.x), 380, 520);
          burst(st.x, st.y, 24, { colors: ['#c9504a', '#8c6a4f', '#f3ede2', '#fff3bf'], min: 200, max: 560, s0: 4, s1: 9, z: 50 });
          popup(st.x, st.y, '콰직!!', '#fff3bf', 30, 0.9, 100); flash('#fff', 0.35); addShake(0.4); Sfx.boom(1.2);
        }
        return;
      }
      // 스테이지 다이빙 → 관객 위로 크라우드 서핑
      const c = s.crowd.length ? s.crowd.reduce((a, o) => ({ x: a.x + o.x / s.crowd.length, y: a.y + o.y / s.crowd.length }), { x: 0, y: 0 }) : { x: st.x, y: st.y + 150 };
      const e = clamp((s.t - T - 0.4) / 0.5, 0, 1);
      if (e < 1) { r.x = rLerp(st.x, c.x, e); r.y = rLerp(st.y, c.y, e); r.z = 38 + Math.sin(e * Math.PI) * 170; r.sjRot = e * Math.PI * 2 * r.face; r.pose = { front: 2.8, farFront: 2.6, back: -1.8, farBack: -1.6, head: -0.3, tail: 1 }; }
      else { r.sjRot = Math.PI / 2 * -r.face; r.z = 46; r.x = c.x + Math.sin((s.t - T - 0.9) * 3) * 120; r.y = c.y; r.pose = { front: 2.6, farFront: 2.4, back: -1.5, farBack: -1.3, head: -0.2, tail: 1 }; }
    },
    end(s) { s.r.z = 0; s.r.sjRot = 0; for (const o of s.crowd) { o.z = 0; } },
    // 무대는 쥐·물건과 앞뒤 순서를 맞춰 그림 (바닥 쪽이 뒤)
    sorted(s) { return s.st ? [{ y: s.st.y - 2, f: () => drawStage(s) }] : []; },
    draw(s) {
      // 조명: 무대 위에서 흔들리는 색 조명
      if (!s.st || s.t > ULT_ENG.mosh.solo + 0.8) return;
      const st = s.st, top = st.y * TILT - 520;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      [['rgba(232,120,106,.16)', -1], ['rgba(169,211,220,.16)', 1], ['rgba(240,200,120,.14)', 0]].forEach(([col, d], i) => {
        const sway = Math.sin(G.t * (1.6 + i * 0.5) + i) * 140, x0 = st.x + d * 260, tx = st.x + sway;
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0 - 12, top); ctx.lineTo(x0 + 12, top); ctx.lineTo(tx + 90, st.y * TILT + 30); ctx.lineTo(tx - 90, st.y * TILT + 30); ctx.closePath(); ctx.fill();
      });
      ctx.restore();
    },
  },
});
// 무대 (가운데 아래 = 무대 앞면 바닥)
function drawStage(s) {
  const st = s.st, x = st.x, y = st.y * TILT;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(30,15,5,.25)'; ctx.fillRect(-130, 10, 260, 18);
  ctx.fillStyle = '#5b4a45'; ctx.fillRect(-120, -36, 240, 46);             // 앞면
  ctx.fillStyle = '#7d6a5f'; ctx.fillRect(-120, -60, 240, 26);             // 윗면
  ctx.fillStyle = '#e3c46a'; for (let i = -110; i <= 110; i += 22) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(G.t * 10 + i); circ(ctx, i, -8, 4); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const d of [-1, 1]) {
    // 스피커 (박자에 맞춰 둥둥)
    const p = 1 + 0.08 * Math.abs(Math.sin((Math.max(0, s.t - 0.7) / 0.4) * Math.PI));
    ctx.save(); ctx.translate(d * 160, 0); ctx.scale(p, p);
    ctx.fillStyle = '#3c322d'; rr(ctx, -30, -96, 60, 96, 6); ctx.fill();
    ctx.fillStyle = '#6b5f58'; circ(ctx, 0, -66, 18); ctx.fill(); circ(ctx, 0, -24, 12); ctx.fill();
    ctx.fillStyle = '#3c322d'; circ(ctx, 0, -66, 7); ctx.fill(); circ(ctx, 0, -24, 5); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
// 번개 모양 꺾인 선
function bolt(x1, y1, x2, y2, n, amp) {
  const pts = [[x1, y1]], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (let i = 1; i < n; i++) { const k = i / n, o = rand(-amp, amp); pts.push([x1 + dx * k + nx * o, y1 + dy * k + ny * o]); }
  pts.push([x2, y2]); return pts;
}
function polyline(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
// 전설의 검 (빛나는 칼날) / 바위
function drawBlade(g, x, y, a, L, glow) {
  g.save(); g.translate(x, y); g.rotate(a); g.lineCap = 'round';
  g.globalAlpha = 0.35; g.strokeStyle = '#bfe3ea'; g.lineWidth = 26 * glow; g.beginPath(); g.moveTo(14, 0); g.lineTo(L, 0); g.stroke(); g.globalAlpha = 1;
  g.fillStyle = '#eef3f6'; g.beginPath(); g.moveTo(14, -7); g.lineTo(L - 14, -6); g.lineTo(L, 0); g.lineTo(L - 14, 6); g.lineTo(14, 7); g.closePath(); g.fill();
  g.fillStyle = '#9fb2bd'; g.fillRect(18, -1.5, L - 36, 3);
  g.fillStyle = '#e3c46a'; g.fillRect(8, -16, 7, 32); g.fillStyle = '#6b4a8a'; g.fillRect(-16, -4, 24, 8); g.fillStyle = '#e3c46a'; circ(g, -18, 0, 6); g.fill();
  g.restore();
}
function drawStone(g, x, y, R) {
  g.save(); g.translate(x, y);
  g.fillStyle = '#8e8a84'; g.beginPath(); g.moveTo(-R, R * 0.5); g.lineTo(-R * 0.8, -R * 0.4); g.lineTo(-R * 0.2, -R * 0.8); g.lineTo(R * 0.6, -R * 0.6); g.lineTo(R, 0); g.lineTo(R * 0.8, R * 0.55); g.closePath(); g.fill();
  g.fillStyle = '#a9a39a'; g.beginPath(); g.moveTo(-R * 0.7, -R * 0.3); g.lineTo(-R * 0.15, -R * 0.65); g.lineTo(R * 0.5, -R * 0.45); g.lineTo(R * 0.1, -R * 0.1); g.closePath(); g.fill();
  g.restore();
}
// 무중력: 물건(과 쥐)이 둥실 → 한꺼번에 추락
// 둥실 구간은 끝나기 1.15초 전까지 (그 뒤 추락). lines[2] 가 있으면 둥실 구간 가운데 자막
function floatEngine(o) {
  const fT = o.dur - 1.15;
  return {
    dur: o.dur,
    beats: [[0.1, s => ucap(s, o.lines[0])], ...(o.lines[2] ? [[fT * 0.5, s => ucap(s, o.lines[2], { size: 28 })]] : []), [fT, s => ucap(s, o.lines[1], { col: '#fff3bf' })]],
    start(s) {
      for (const it of itemsIn(s.r.x, s.r.y, ULT_R).slice(0, 40)) if (grabItem(s, it)) { it.fh = rand(...o.h); it.ph = rand(0, 6); it.fvr = rand(-3, 3); it.fvx = rand(-30, 30); it.fvy = rand(-20, 20); }
      if (o.rats) for (const q of G.rats.filter(q => q !== s.r && !q.ultOn && Math.hypot(q.x - s.r.x, q.y - s.r.y) < ULT_R).slice(0, 20)) if (grabRat(s, q)) { q.fh = rand(...o.h) * 0.7; q.ph = rand(0, 6); }
    },
    step(s, dt) {
      const e = sjEase(Math.min(1, s.t / 0.8)), fl = s.t < fT;
      s.r.pose = { front: Math.sin(G.t * 3) * 1.2, farFront: Math.cos(G.t * 3) * 1.2, back: Math.sin(G.t * 2.5) * 1.2, farBack: -Math.sin(G.t * 2.5) * 1.2, head: 0.2, tail: 1 }; s.r.z = 30 * e + Math.sin(G.t * 2) * 8;
      if (fl) { s.r.sjRot = Math.sin(G.t) * 0.8; ultWalk(s, dt, 120); }   // 무중력 수영하듯 둥실둥실 이동
      else s.r.sjRot = 0;
      if (fl) {
        const dr = s.t < fT / 2 ? dt : -dt;                      // 반쯤 떠내려갔다가 제자리로 되돌아옴 (벽 밖으로 안 나가게)
        for (const it of s.items) { it.z = it.fh * e + Math.sin(G.t * 2 + it.ph) * 8; it.rot += it.fvr * dt; it.x += it.fvx * dr; it.y += it.fvy * dr; }
        for (const q of s.rats) { q.z = q.fh * e + Math.sin(G.t * 2 + q.ph) * 6; q.pose = { front: Math.sin(G.t * 3 + q.ph) * 1.2, farFront: Math.cos(G.t * 3 + q.ph) * 1.2, back: Math.sin(G.t * 2.5 + q.ph) * 1.2, farBack: -Math.sin(G.t * 2.5) * 1.2, head: 0.2, tail: 1 }; q.sjRot = Math.sin(G.t + q.ph) * 1.2; }
      } else if (!s.dropped) {
        s.dropped = true;
        for (const it of [...s.items]) dropItem(s, it, rand(-60, 60), rand(-40, 40), -150);
        for (const q of s.rats) { releaseRat(q); q.vz = -100; }
        s.rats = []; s.r.z = 0; Sfx.boom(0.6);
      }
    },
    draw(s) { if (!o.halo) return; for (const it of s.items) { ctx.save(); ctx.translate(it.x, it.y * TILT - it.z - it.r * 1.1); ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, it.r * 0.7, it.r * 0.22, 0, 0, 6.28); ctx.stroke(); ctx.restore(); } },
  };
}

// ── 진행 ──
// ① 준비: 화면 정지 + 확대 + 부들부들 + 기가 빨려 들어옴
function updateUltCut(dt) {
  const s = G.ult, r = s.r, u = s.u; G.t += dt; s.t += dt;
  const k = s.t / ULT_CUT, e = sjEase(clamp((k - 0.1) / 0.6, 0, 1));
  s.zoom = 1 + 0.6 * sjEase(k * 2.2);
  r.jit = k > 0.15 ? 1 + 3 * k : 0;
  r.pose = { tilt: -0.5 * e, front: 2.6 * e, farFront: 2.3 * e, back: -0.3 * e, farBack: 0.3 * e, head: -0.4 * e, tail: 1.3 * e, bob: 3 * e, sy: 1 - 0.1 * e };
  for (let i = 0; i < 3; i++) { const a = rand(0, 6.28), d = rand(90, 190), l = 0.35; particle({ x: r.x + Math.cos(a) * d, y: r.y + Math.sin(a) * d, z: rand(10, 50), vx: -Math.cos(a) * d / l, vy: -Math.sin(a) * d / l, life: l, max: l, size: rand(2, 5), color: pick([u.col, '#fff']), type: 'spark', drag: 0 }); }
  if ((s.beat = (s.beat ?? 0) - dt) <= 0 && k > 0.15) { s.beat = 0.3 - 0.15 * k; ring(r.x, r.y, 50 + 50 * k, u.col, 0.3, 4); Sfx.thump(0.4 + 0.6 * k); addShake(0.02 + 0.04 * k); }
  if (s.t > 0.3 && !s.slam) { s.slam = true; addShake(0.2); Sfx.boom(0.7); }
  if (s.t >= ULT_CUT) {
    s.phase = 'act'; s.t = 0; r.jit = 0; r.pose = null;
    r.say = { text: u.line, t: 1.6 };
    ring(r.x, r.y, 140, '#fff', 0.5, 12); ring(r.x, r.y, 220, u.col, 0.6, 8); dust(r.x, r.y, 14, 1.8);
    flash('#fff', 0.4); addShake(0.3); Sfx.boom(1.1);
    s.eng.start(s);
  }
  updateFx(dt);
}
// ② 상황극 (update 안에서, 게임은 진행)
function updateUlt(dt) {
  const s = G.ult; if (!s || s.phase !== 'act') return;
  const E = s.eng;
  s.t += dt; s.zoom = 1 + (s.zoom - 1) * Math.max(0, 1 - dt * 6);
  (E.beats || []).forEach(([bt, fn], i) => { if (s.t >= bt && !s.beatsDone.has(i)) { s.beatsDone.add(i); fn(s); } });
  s.r.vx = s.r.vy = 0;
  E.step(s, dt, Math.min(1, s.t / E.dur));
  // 필살기 쓰는 쥐 근처의 사람·고양이는 휘말려 날아가고, 보스는 크게 깎임 (0.3초마다)
  if ((s.actorT = (s.actorT ?? 0.3) - dt) <= 0) { s.actorT = 0.3; blastActorsIn(s.r.x, s.r.y, 220, 620, ultD(s) * 0.4, s.r); }
  if (s.t >= E.dur) endUlt();
}
function endUlt() {
  const s = G.ult; if (!s) return;
  if (s.phase === 'act' && s.eng.end) s.eng.end(s);
  if (s.phase === 'act') {
    // 마무리: 필살기 범위 안 사람·고양이 전부 날리기 + 보스에 큰 피해
    const n = blastActorsIn(s.r.x, s.r.y, ULT_R, 700, ultD(s) * 3, s.r);
    if (n && onScreen(s.r.x, s.r.y)) popup(s.r.x, s.r.y, `휘말린 인간 ${n}명!`, '#fff3bf', 22, 1.1, 120);
  }
  ultRelease(s);
  const r = s.r;
  r.ultOn = false; r.pose = null; r.z = Math.max(0, r.z); r.sjRot = 0; r.hideBody = false; r.jit = 0; r.ultSpin = false; r.under = false; r.drawUnder = null; r.speed = 0;
  if (!isOpen(...roomOf(r.x, r.y))) { r.x = s.x0; r.y = s.y0; }
  stopDash(r, 0.3, 0.6);
  if (s.phase === 'act') { G.achv = { title: s.u.achv, icon: s.u.fx, t0: G.t }; Sfx.clear(); }
  G.lastUlt = s; G.ult = null;
}

// ── 그리기 ──
// Codex 이미지가 있으면 (rats/dev/gen_art.mjs → RAT_ART) 코드 그림 대신 사용. w: 가로 크기, 기준점은 가운데 아래
function ultArt(g, key, w, flip) { const im = IMG['art_ult:' + key]; if (!im) return false; const h = w * im.height / im.width; g.save(); if (flip) g.scale(-1, 1); g.drawImage(im, -w / 2, -h, w, h); g.restore(); return true; }
function drawBigBeam(x, y, a, len, w0, col) {
  const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len * TILT, w = w0 + Math.sin(G.t * 40) * 5;
  ctx.save(); ctx.lineCap = 'round';
  ctx.globalAlpha = 0.45; ctx.strokeStyle = col; ctx.lineWidth = w * 1.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.globalAlpha = 0.9; ctx.lineWidth = w; ctx.stroke(); ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = w * 0.4; ctx.stroke();
  ctx.restore();
}
// 탈것 (쥐의 발밑 좌표계에서 그림 — drawRat 이 r.drawUnder 로 호출)
function drawVehicle(g, s) {
  const ride = s.u.ride, d = s.dir;
  g.save(); g.scale(d, 1); g.translate(0, 12);
  if (ultArt(g, 'sleigh', 110)) { g.restore(); return; }
  if (ride === 'sleigh') {
    // 썰매 + 쥐 순록 셋
    for (let i = 0; i < 3; i++) { g.save(); g.translate(60 + i * 34, -8 + Math.sin(G.t * 12 + i) * 3); g.scale(-0.55, 0.55); g.drawImage(ratSprite(RSPECIES_BY_ID.brownrat, (Math.floor(G.t * 16) + i) % 8, false), -38, -46, 100, 56); g.restore(); g.strokeStyle = '#8c6a4f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(30, -10); g.lineTo(52 + i * 34, -14); g.stroke(); }
    g.fillStyle = '#c9504a'; rr(g, -34, -22, 64, 22, 8); g.fill(); g.fillStyle = '#e3c46a'; g.fillRect(-34, -4, 64, 4);
    g.strokeStyle = '#8c6a4f'; g.lineWidth = 3; g.beginPath(); g.moveTo(-38, 4); g.lineTo(34, 4); g.quadraticCurveTo(44, 4, 42, -6); g.stroke();
  } else if (ride === 'boat') {
    g.fillStyle = '#8c6a4f'; g.beginPath(); g.moveTo(-60, -20); g.lineTo(60, -20); g.lineTo(44, 4); g.lineTo(-44, 4); g.closePath(); g.fill();
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#c9504a' : '#e3c46a'; circ(g, -36 + i * 24, -16, 8); g.fill(); }
    g.fillStyle = '#6b5443'; g.fillRect(-2, -90, 4, 72); g.fillStyle = '#f3ede2'; g.beginPath(); g.moveTo(2, -86); g.lineTo(40, -40); g.lineTo(2, -34); g.closePath(); g.fill();
    g.strokeStyle = '#6b5443'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { const a = Math.sin(G.t * 10 + i) * 0.6; g.beginPath(); g.moveTo(-30 + i * 28, -4); g.lineTo(-30 + i * 28 - 20 * Math.cos(a), 18 + 10 * Math.sin(a)); g.stroke(); }
  } else {
    // 날아다니는 양탄자
    g.fillStyle = '#a58bb8'; g.beginPath(); for (let x = -56; x <= 56; x += 8) g.lineTo(x, Math.sin(G.t * 8 + x * 0.08) * 4); for (let x = 56; x >= -56; x -= 8) g.lineTo(x, 10 + Math.sin(G.t * 8 + x * 0.08) * 4); g.closePath(); g.fill();
    g.fillStyle = '#e3c46a'; for (let x = -56; x <= 56; x += 14) g.fillRect(x, 10 + Math.sin(G.t * 8 + x * 0.08) * 4, 3, 6);
  }
  g.restore();
}
// 피라미드 (파라오): 솟아오름(rise) → 뒤집기(flip) → 팽이(spin·wob) → 쓰러짐(top). Codex 이미지(ult:pyramid) 없으면 코드 그림
function drawPyramid(s) {
  const py = s.py, W = py.W, H = py.H, gy = py.y * TILT;
  const img = g => { if (!ultArt(g, 'pyramid', W)) drawPyramidShape(g, W, H); };
  ctx.save();
  if (py.top >= 1) ctx.globalAlpha = Math.max(0, 1 - (s.t - PYR_FALL - 0.3) / 0.2);
  const shW = py.flip >= 1 ? W * 0.2 : W * 0.5 * py.rise;
  ctx.fillStyle = 'rgba(30,15,5,.22)'; ctx.beginPath(); ctx.ellipse(py.x, gy, Math.max(1, shW), Math.max(1, shW * 0.22), 0, 0, 6.28); ctx.fill();
  if (!py.flip) {
    // 땅속에서 솟는 중: 바닥선 아래는 잘라냄
    ctx.beginPath(); ctx.rect(py.x - W, gy - H - 60, W * 2, H + 60); ctx.clip();
    ctx.translate(py.x + (py.rise < 1 ? rand(-2, 2) : 0), gy + H * (1 - py.rise));
    img(ctx);
  } else if (py.flip < 1) {
    // 뒤집는 중: 가운데를 축으로 반 바퀴
    ctx.translate(py.x, gy - H / 2 - py.lift); ctx.rotate(py.flip * Math.PI); ctx.translate(0, H / 2);
    img(ctx);
  } else {
    // 팽이: 뾰족한 끝이 바닥. 가로로 납작해졌다 펴지며(좌우 뒤집힘) 도는 것처럼, 쓰러질 땐 끝을 축으로 왼쪽으로 눕기
    ctx.translate(py.x, gy); ctx.rotate(py.wob - py.top * 1.4);
    const c = Math.cos(py.spin);
    ctx.scale((c >= 0 ? 1 : -1) * (0.35 + 0.65 * Math.abs(c)), -1);
    ctx.translate(0, H);
    img(ctx);
  }
  ctx.restore();
  if (py.flip >= 1 && !py.top) {
    // 회전 바람 자국
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const a = py.spin * 0.5 + i * 2.1, yy = gy - H * (0.3 + i * 0.22); ctx.beginPath(); ctx.ellipse(py.x, yy, W * (0.18 + i * 0.1), 10, 0, a, a + 1.6); ctx.stroke(); }
    ctx.restore();
  }
}
// 이미지가 없을 때 대체 그림: 7단 계단 + 금색 꼭대기 (기준점 가운데 아래)
function drawPyramidShape(g, W, H) {
  for (let i = 0; i < 7; i++) { const w = W * (1 - i / 7.5), h = H / 8; g.fillStyle = i % 2 ? '#e3c08a' : '#d9b27a'; g.fillRect(-w / 2, -h * (i + 1), w, h + 1); g.fillStyle = 'rgba(120,80,40,.18)'; g.fillRect(w * 0.1, -h * (i + 1), w * 0.4, h + 1); }
  g.fillStyle = '#f2c14e'; g.beginPath(); g.moveTo(-W * 0.07, -H * 0.875); g.lineTo(W * 0.07, -H * 0.875); g.lineTo(0, -H); g.closePath(); g.fill();
}
function drawUltWorld() {
  const s = G.ult; if (!s || s.phase !== 'act' || !s.eng.draw) return;
  s.eng.draw(s);
}
function drawUltWindup() { /* 준비 동작은 쥐 자세·파티클로만 (예전 마법진 등은 필요 없어짐) */ }
// 화면 UI: 준비 단계(비네트·집중선·이름) + 상황극 자막 + 업적 알림
function drawUltCut() {
  const s = G.ult;
  if (s && s.phase === 'cut') {
    const u = s.u, sp = s.r.sp, t = s.t, k = t / ULT_CUT;
    ctx.save();
    const g = ctx.createRadialGradient(W / 2, H * 0.58, H * 0.25, W / 2, H * 0.58, H * 0.95);
    g.addColorStop(0, 'rgba(29,24,38,0)'); g.addColorStop(1, `rgba(29,24,38,${0.65 * Math.min(1, t / 0.15)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (!s.lines || G.t - (s.lineT || 0) > 0.05) { s.lineT = G.t; s.lines = Array.from({ length: 50 }, () => [rand(0, 6.28), rand(0.004, 0.014), rand(0.42, 0.62)]); }
    ctx.fillStyle = `rgba(255,255,255,${0.35 * Math.min(1, t / 0.2)})`;
    for (const [a, wd, inner] of s.lines) { ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * W * inner, H * 0.58 + Math.sin(a) * H * inner); ctx.lineTo(W / 2 + Math.cos(a - wd) * W, H * 0.58 + Math.sin(a - wd) * W); ctx.lineTo(W / 2 + Math.cos(a + wd) * W, H * 0.58 + Math.sin(a + wd) * W); ctx.fill(); }
    const tk = clamp((t - 0.25) / 0.14, 0, 1), sc = t < 0.25 ? 0 : 1 + (1 - sjEase(tk)) * 2;
    if (sc > 0) {
      const sh = t < 0.5 || k > 0.85 ? rand(-3, 3) : 0;
      ctx.save(); ctx.translate(W / 2 + sh, H * 0.22 + sh); ctx.rotate(-0.05); ctx.scale(sc, sc);
      const title = s.title || u.name;
      comicText(title, 0, 0, title.length > 12 ? 52 : title.length > 8 ? 70 : 92, '#fff', shade(u.col, -0.3));
      comicText(`${u.fx} ${TIERS[sp.tier].name} · ${sp.name}의 필살기`, 0, 66, 24, '#fff3bf', '#3c322d');
      ctx.restore();
    }
    if (k > 0.85) { ctx.globalAlpha = (k - 0.85) / 0.15 * 0.35; ctx.fillStyle = u.col; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }
  if (s && s.phase === 'act' && s.eng.ui) { ctx.save(); s.eng.ui(s, s.t / s.eng.dur); ctx.restore(); }
  // 자막 (남은 것은 필살기가 끝나도 잠깐 보임)
  // 필살기 연출(줌 중심 = 화면 0.58)을 안 가리게 전부 상단 띠로: 큰 제목(c.y < 0.7) → HUD 바로 아래, 설명 자막(기본 0.78) → 그 밑.
  // c.y 는 같은 줄 자막 교체용 키로만 쓰고 그리는 위치는 여기서 정함
  const caps = s ? s.caps : G.lastUlt ? G.lastUlt.caps : [];
  for (const c of caps) {
    const age = G.t - c.t0; if (age > c.dur) continue;
    const sc = age < 0.12 ? 1.5 - age / 0.12 * 0.5 : 1, a = age > c.dur - 0.25 ? (c.dur - age) / 0.25 : 1;
    const big = c.y < 0.7, y = big ? H * 0.19 : H * 0.3;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, y); ctx.scale(sc, sc); ctx.rotate(-0.02);
    comicText(c.text, 0, 0, big ? Math.min(c.size, 60) : Math.min(c.size, 30), c.col, c.sh); ctx.restore();
  }
  // 🏆 업적 달성 (고트 시뮬레이터 풍)
  const A = G.achv;
  if (A) {
    const age = G.t - A.t0; if (age > 3.2) { G.achv = null; return; }
    const slide = age < 0.3 ? sjEase(age / 0.3) : age > 2.9 ? 1 - (age - 2.9) / 0.3 : 1;
    ctx.save(); ctx.translate(W / 2, 145 - (1 - slide) * 190);
    rr(ctx, -210, -34, 420, 68, 14); ctx.fillStyle = 'rgba(40,34,48,.92)'; ctx.fill(); ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = '34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🏆', -170, 0);
    ctx.textAlign = 'left'; ctx.fillStyle = '#f2c14e'; ctx.font = "700 15px 'IBM Plex Sans KR', sans-serif"; ctx.fillText(`업적 달성! ${A.icon}`, -135, -12);
    ctx.fillStyle = '#fff'; ctx.font = "700 22px 'IBM Plex Sans KR', sans-serif"; ctx.fillText(A.title, -135, 13);
    ctx.restore();
  }
}
