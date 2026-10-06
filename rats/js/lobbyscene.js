'use strict';
// ───────────────────────── 아지트 (시작 화면 = 로비) ─────────────────────────
// 팀파이트 매니저 1 의 '선수 숙소'처럼: 꽉 찬 배경판(assets/rats/lobby_bg.png, 옆에서 본 벽 속 아지트) 위에서
// 게임 리그 쥐들이 생활함 — 침대에서 낮잠, 의자에서 차, 쳇바퀴, 치즈 갉기, 아령, 수다, 쥐구멍으로 빼꼼.
// 물건마다 판자 팻말이 매달려 있고, 누르면 그 물건의 아웃게임 페이지(lobby.js)로. 작전 탁자 = 출발(주 버튼).
// 쥐: 누르면 점프(웅크림 → 도약 → 착지 찌그러짐) · 끌면 잡혀서 버둥버둥(슈퍼 점프 버둥 자세) → 놓으면 던져져서 통통 튀고 어질어질
// 티어가 오를수록 아지트가 커짐(쥐 수↑, 전구 줄에 티어 배지, 탁자 소품).
// 좌표는 배경판 기준 0~1 (u = 가로, v = 세로, z = 바닥에서 높이). 배경은 cover 로 꽉 채움 → 위아래가 조금 잘림
const HOME = (() => {
  const IW = 1600, IH = 1067;
  const FLOOR = { v: 0.70, v0: 0.683, v1: 0.718, u0: 0.17, u1: 0.86 };        // 쥐가 걸어 다니는 나무 판자 (앞쪽 가장자리)
  const RAT_LEN = 0.058;                                                        // 쥐 몸 길이 (배경 가로 대비)
  const GRAV = 3.4, JUMP_V = 0.8;                                               // 중력 · 점프 속도 (세로 길이/초)
  // 활동 자리: 높은 자리(침대·의자·쳇바퀴)는 바닥에서 점프해서 올라감
  const SLOTS = {
    bed: { u: 0.10, v: 0.622, face: -1, act: 'sleep', up: true },
    stoolL: { u: 0.237, v: 0.612, face: 1, act: 'tea', up: true },
    stoolR: { u: 0.452, v: 0.612, face: -1, act: 'tea', up: true },
    wheel: { u: 0.77, v: 0.64, face: 1, act: 'wheel', up: true },
    pantry: { u: 0.852, v: 0.705, face: 1, act: 'eat' },
    gym: { u: 0.615, v: 0.712, face: -1, act: 'lift' },
  };
  const WHEEL = { u: 0.77, v: 0.668, w: 0.15 };                                  // 쳇바퀴 (아래 가운데 기준)
  const HOLE = { u: 0.075, v: 0.43, r: 0.037 };                                  // 쥐구멍 (빼꼼)
  const BADGES = { u0: 0.64, du: 0.029, v: 0.335, w: 0.02 };                      // 전구 줄에 매단 훈장
  // 물건 = 버튼. 사각형(u,v,w,h) + 팻말 매다는 곳(tu,tv) + 팻말 글. main = 주 버튼(출발)
  const HOTS = [
    { id: 'run', u: 0.262, v: 0.555, w: 0.165, h: 0.12, tu: 0.345, tv: 0.545, main: true },
    { id: 'rank', u: 0.205, v: 0.3, w: 0.142, h: 0.175, tu: 0.276, tv: 0.3 },
    { id: 'dex', u: 0.5, v: 0.5, w: 0.16, h: 0.165, tu: 0.58, tv: 0.49 },
    { id: 'rats', u: 0.69, v: 0.44, w: 0.16, h: 0.23, tu: 0.77, tv: 0.435 },
    { id: 'skill', u: 0.875, v: 0.29, w: 0.125, h: 0.39, tu: 0.932, tv: 0.29, right: true },
    { id: 'rec', u: 0.0, v: 0.585, w: 0.18, h: 0.095, tu: 0.095, tv: 0.585 },
  ];
  function tagText(id) {
    const r = rankOf();
    switch (id) {
      case 'run': return S.inRun ? ['▶ 계속 도망가기', `${S.floor}층에서 탈출 중!`] : ['🗺️ 탈출 작전 회의', '찍! 출발하자!'];
      case 'rank': return ['🎖️ 찍찍!! 훈장', `지금 훈장 ${r} · ${RANKS[r - 1].name}`];
      case 'dex': return ['📖 친구들!!', '지금까지 만난 친구 사진첩'];
      case 'rats': return ['⭐ 쳇바퀴 훈련', '조각 모아 근육 키우기'];
      case 'skill': return ['🧀 치즈 창고', '치즈로 다 같이 강해지기'];
      case 'rec': return ['💤 낮잠 침대', '저장하고 쿨쿨'];
    }
  }
  const CHAT = [
    ['다음엔 더 높이 간다!', '계단만 찾으면 돼!'], ['치즈 몰래 먹었지?', '…아니?'], ['연구원 표정 봤어?', 'ㅋㅋㅋ 완전 놀람'],
    ['고양이 진짜 무서웠어…', '난 꼬리 밟혔어'], ['훈장 달면 새 친구 온대!', '오 진짜?'], ['쳇바퀴 내 차례야', '5분만…'],
    ['경비원 손전등 봤어?', '눈부셔 죽는 줄'], ['연구 자료 또 훔치자!', '찍찍!'], ['오늘 저녁은 체다!', '어제도 체다였잖아'],
  ];
  const SOLO = ['찍?', '찍찍!', '킁킁…', '배고파…', '탈출하고 싶다', '치즈 냄새!', '여긴 안전해', '…!'];
  const GRAB = ['찍?!', '놔줘~!', '으아아', '높아 높아!', '찍찍찍!!'];
  const DIZZY = ['어질어질…', '다시 해줘!', '별이 보여…', '찍… 찍…'];
  let root, cv, g, hotBox, on = false, last = 0, t = 0, actors = [], bubbles = [], fx = [], nextEvent = 3, peek = null;
  let s = 1, ox = 0, oy = 0, W = 0, H = 0, drag = null, eatClick = false;
  const art = k => IMG['art_' + k];
  const P = (u, v) => [ox + u * IW * s, oy + v * IH * s];
  const L = n => n * IW * s;                 // 가로 기준 길이
  const LV = n => n * IH * s;                // 세로 기준 길이 (z)
  const rnd = (a, b) => a + Math.random() * (b - a);
  const toUV = e => { const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W, py = (e.clientY - r.top) / r.height * H; return [(px - ox) / (IW * s), (py - oy) / (IH * s), px, py]; };

  // ── 쥐 고르기: 만난 쥐 중 다양하게, 제일 높은 등급 한 마리는 꼭 ──
  function pickCast(n) {
    const ok = RSPECIES.filter(sp => typeof RAT_RIGS !== 'undefined' && RAT_RIGS[sp.id]);
    let pool = ok.filter(sp => ratKnown(sp.id));
    if (pool.length < 3) pool = ok.filter(sp => sp.tier === 0);
    pool = pool.slice().sort(() => Math.random() - 0.5);
    const top = pool.slice().sort((a, b) => b.tier - a.tier)[0];
    const cast = top ? [top] : [];
    for (const sp of pool) { if (cast.length >= n) break; if (!cast.includes(sp)) cast.push(sp); }
    while (cast.length < n && pool.length) cast.push(pool[Math.floor(Math.random() * pool.length)]);
    return cast;
  }
  function makeActors() {
    const n = clamp(5 + rankOf(), 6, 13);
    actors = pickCast(n).map(sp => ({
      sp, rig: RAT_RIGS[sp.id], u: rnd(FLOOR.u0, FLOOR.u1), v: rnd(FLOOR.v0, FLOOR.v1), z: 0, vz: 0, vu: 0, rot: 0, spin: 0, face: Math.random() < 0.5 ? -1 : 1,
      state: 'idle', tState: rnd(0.5, 3), walk: rnd(0, 6), seed: rnd(0, 10), size: 0.92 + Math.min(0.25, sp.tier * 0.05), slot: null, squash: 0,
    }));
    bubbles = []; fx = [];
  }
  const slotFree = k => !actors.some(a => a.slot === k);

  // ── 행동 ──
  function say(a, text, dur = 2.4) { bubbles = bubbles.filter(b => b.a !== a); bubbles.push({ a, text, t: 0, dur }); }
  function walkTo(a, u, v, then) { a.state = 'walk'; a.tu = clamp(u, FLOOR.u0 - 0.1, FLOOR.u1 + 0.1); a.tv = v; a.then = then; a.face = u > a.u ? 1 : -1; }
  // 점프: 웅크림(0.12초) → 도약(세로 속도) → 공중 → 착지 찌그러짐. to 가 있으면 그 자리(높은 곳)로 날아감
  function jump(a, to, then) {
    a.state = 'crouch'; a.tState = 0.12; a.jto = to || null; a.then = then || null; a.thrown = false;
    if (to) a.face = to[0] > a.u ? 1 : to[0] < a.u ? -1 : a.face;
  }
  function launch(a) {
    a.state = 'air';
    if (a.jto) {                       // 정해진 자리로: 비행 시간 0.42초에 맞춰 가로·세로 이동 + 높이 아치
      const T = 0.42; a.air = { t: 0, T, u0: a.u, v0: a.v, u1: a.jto[0], v1: a.jto[1] }; a.vz = 0;
    } else { a.air = null; a.vz = JUMP_V * rnd(0.9, 1.15); a.vu = rnd(-0.05, 0.05); }
    Sfx.jump && Sfx.jump();
  }
  function land(a, hard) {
    a.z = 0; a.vz = 0; a.vu = 0; a.spin = 0; a.squash = 1; a.state = 'land'; a.tState = hard ? 0.3 : 0.18;
    for (let i = 0; i < (hard ? 7 : 4); i++) fx.push({ kind: 'dust', u: a.u + rnd(-0.015, 0.015), v: a.v, du: rnd(-0.03, 0.03), t: 0, dur: rnd(0.35, 0.6) });
    Sfx.land && Sfx.land();
  }
  function choose(a) {
    const free = Object.keys(SLOTS).filter(slotFree), r = Math.random();
    if (free.length && r < 0.55) {
      const k = free[Math.floor(Math.random() * free.length)], sl = SLOTS[k];
      a.slot = k;
      const sit = () => { a.state = sl.act; a.face = sl.face; a.tState = sl.act === 'sleep' ? rnd(10, 18) : rnd(6, 12); a.u = sl.u; a.v = sl.v; };
      walkTo(a, sl.u + (sl.up ? -0.03 * sl.face : 0), sl.up ? FLOOR.v : sl.v, () => (sl.up ? jump(a, [sl.u, sl.v], sit) : sit()));
      return;
    }
    a.slot = null;
    walkTo(a, rnd(FLOOR.u0, FLOOR.u1), rnd(FLOOR.v0, FLOOR.v1), () => { a.state = 'idle'; a.tState = rnd(1, 3.5); if (Math.random() < 0.18) say(a, SOLO[Math.floor(Math.random() * SOLO.length)], 1.8); });
  }
  function leaveSlot(a, then) {
    const sl = SLOTS[a.slot]; a.slot = null;
    if (sl && sl.up) jump(a, [clamp(sl.u + (Math.random() < 0.5 ? -0.035 : 0.035), FLOOR.u0, FLOOR.u1), FLOOR.v + rnd(-0.01, 0.01)], then || (() => choose(a)));
    else (then || (() => choose(a)))();
  }
  function update(dt) {
    t += dt;
    for (const a of actors) {
      a.tState -= dt; a.squash = Math.max(0, a.squash - dt * 5);
      if (a.state === 'walk' || a.state === 'wheel') a.walk += dt * (a.state === 'wheel' ? 30 : 18);
      switch (a.state) {
        case 'walk': {
          const du = a.tu - a.u, dv = a.tv - a.v, d = Math.hypot(du, dv), sp = 0.09 * dt;
          if (d <= sp) { a.u = a.tu; a.v = a.tv; const f = a.then; a.then = null; f ? f() : (a.state = 'idle', a.tState = 2); }
          else { a.u += du / d * sp; a.v += dv / d * sp; }
          break;
        }
        case 'crouch': if (a.tState <= 0) launch(a); break;
        case 'air': {
          if (a.air) {                  // 정해진 자리로 아치
            const A = a.air; A.t += dt; const k = Math.min(1, A.t / A.T);
            a.u = A.u0 + (A.u1 - A.u0) * k; a.v = A.v0 + (A.v1 - A.v0) * k; a.z = Math.sin(k * Math.PI) * (0.045 + Math.abs(A.v1 - A.v0) * 0.6);
            a.vz = Math.cos(k * Math.PI);  // 자세용 (+ 오르는 중 / - 내려가는 중)
            if (k >= 1) { a.air = null; land(a, false); }
            break;
          }
          // 자유 낙하 (제자리 점프 · 던지기)
          a.vz -= GRAV * dt; a.z += a.vz * dt; a.u += a.vu * dt; a.rot += a.spin * dt;
          if (a.u < 0.03) { a.u = 0.03; a.vu = Math.abs(a.vu) * 0.5; } else if (a.u > 0.97) { a.u = 0.97; a.vu = -Math.abs(a.vu) * 0.5; }
          if (a.v - a.z < 0.1) { a.z = a.v - 0.1; a.vz = -Math.abs(a.vz) * 0.3; }          // 천장
          if (a.z <= 0 && a.vz < 0) {
            if (a.thrown && a.vz < -0.55) {           // 세게 떨어지면 통통 튐
              a.z = 0; a.vz = -a.vz * 0.38; a.vu *= 0.55; a.spin *= 0.5; Sfx.land && Sfx.land();
              for (let i = 0; i < 5; i++) fx.push({ kind: 'dust', u: a.u + rnd(-0.015, 0.015), v: a.v, du: rnd(-0.03, 0.03), t: 0, dur: 0.5 });
            } else {
              const hard = a.thrown; a.rot = 0; land(a, hard);
              if (hard) { a.dizzy = 1.8; say(a, DIZZY[Math.floor(Math.random() * DIZZY.length)], 1.8); }
            }
          }
          break;
        }
        case 'land': if (a.tState <= 0) {
          if (a.dizzy > 0) { a.state = 'dizzy'; a.tState = a.dizzy; a.dizzy = 0; }
          else { const f = a.then; a.then = null; if (f) f(); else { a.state = 'idle'; a.tState = rnd(0.6, 2); } }
        } break;
        case 'dizzy': if (a.tState <= 0) { a.state = 'idle'; a.tState = rnd(0.5, 1.5); } break;
        case 'held': break;
        case 'idle': if (a.tState <= 0) choose(a); break;
        case 'sleep': if (Math.random() < dt * 0.8) fx.push({ kind: 'z', u: a.u - 0.01, v: a.v - 0.05, t: 0, dur: 2.2 }); if (a.tState <= 0) { say(a, '하암~ 잘 잤다', 1.6); leaveSlot(a); } break;
        case 'tea': {
          a.sip = Math.sin(t * 1.3 + a.seed) > 0.85;
          const other = actors.find(b => b !== a && b.state === 'tea');
          if (other && a.slot === 'stoolL' && !bubbles.some(b => b.a === a || b.a === other) && Math.random() < dt * 0.35) { const c = CHAT[Math.floor(Math.random() * CHAT.length)]; say(a, c[0], 2.4); setTimeout(() => other.state === 'tea' && say(other, c[1], 2.2), 1700); }
          if (a.tState <= 0) leaveSlot(a);
          break;
        }
        case 'wheel': if (Math.random() < dt * 0.15) say(a, pick(['헉헉', '더 빨리!', '근육 붙는 중', '찍찍찍찍']), 1.4); if (a.tState <= 0) { say(a, '휴…', 1); leaveSlot(a); } break;
        case 'eat': if (Math.random() < dt * 3) fx.push({ kind: 'crumb', u: a.u + 0.03 * a.face, v: a.v - 0.02, du: rnd(-0.02, 0.02), t: 0, dur: 0.7 }); if (a.tState <= 0) { say(a, '냠, 배부르다', 1.4); leaveSlot(a); } break;
        case 'lift': a.lift = (Math.sin(t * 3 + a.seed) + 1) / 2; if (Math.random() < dt * 0.6) fx.push({ kind: 'sweat', u: a.u + rnd(-0.01, 0.01), v: a.v - 0.06, t: 0, dur: 0.8 }); if (a.tState <= 0) leaveSlot(a); break;
      }
    }
    // 가끔: 바닥의 두 쥐가 가까우면 마주보고 수다 · 쥐구멍 빼꼼
    nextEvent -= dt;
    if (nextEvent <= 0) {
      nextEvent = rnd(3, 6);
      const idle = actors.filter(a => a.state === 'idle');
      for (const a of idle) {
        const b = idle.find(c => c !== a && Math.abs(c.u - a.u) < 0.09);
        if (b) { a.face = b.u > a.u ? 1 : -1; b.face = -a.face; a.tState = b.tState = 4; const c = CHAT[Math.floor(Math.random() * CHAT.length)]; say(a, c[0]); setTimeout(() => say(b, c[1]), 1600); break; }
      }
      if (!peek && t > 8 && Math.random() < 0.12) startPeek();   // 가끔만
    }
    if (peek) { peek.t += dt; if (peek.t > peek.dur) peek = null; }
    bubbles = bubbles.filter(b => (b.t += dt) < b.dur);
    fx = fx.filter(f => (f.t += dt) < f.dur);
  }
  function startPeek() { const sp = pickCast(1)[0]; if (sp) peek = { sp, rig: RAT_RIGS[sp.id], t: 0, dur: 4, seed: rnd(0, 10) }; }

  // ── 자세 ── 가만히 있을 땐 RIG_IDLE 에서 숨쉬기·꼬리만 살짝 (게임 ratPose 의 급정거·킁킁 분기는 아지트 시계와 안 맞아 비틀려서 안 씀)
  function poseOf(a) {
    const w = Math.sin(t * 2.2 + a.seed), base = { ...RIG_IDLE, head: w * 0.04, tail: 0.2 + Math.sin(t * 1.6 + a.seed) * 0.12, sy: 1 + Math.sin(t * 2.6 + a.seed) * 0.015 };
    const flail = ph => ({ front: Math.sin(t * 14 + ph) * 1.4, farFront: Math.cos(t * 12 + ph) * 1.4, back: Math.sin(t * 13 + ph + 2) * 1.3, farBack: Math.cos(t * 11 + ph) * 1.3, head: -0.3, tail: 1.2 + Math.sin(t * 9) * 0.3 });
    let p;
    switch (a.state) {
      case 'walk': case 'wheel': {
        const wk = a.walk, amp = a.state === 'wheel' ? 1.15 : 0.8;
        p = { ...base, front: Math.sin(wk) * amp, farFront: Math.sin(wk + 0.6) * amp, back: Math.sin(wk + Math.PI) * amp, farBack: Math.sin(wk + Math.PI + 0.6) * amp, bob: -Math.abs(Math.sin(wk)) * 3, head: Math.cos(wk) * 0.05 - 0.05, tail: 0.05 + Math.sin(wk * 0.5) * 0.25 };
        break;
      }
      case 'crouch': p = { ...base, front: 0.55, farFront: 0.5, back: -0.6, farBack: -0.55, bob: 6, sy: 0.75, sx: 1.12, head: 0.3, tail: -0.4 }; break;   // 슈퍼 점프 웅크림
      case 'air': p = a.thrown ? { ...base, ...flail(a.seed) }
        : a.vz > 0 ? { ...base, front: 2.5, farFront: 2.3, back: -1.7, farBack: -1.5, head: -0.5, tail: -1.4, sx: 0.85, sy: 1.25 }        // 도약: 쭉 뻗기
          : { ...base, front: 1.2, farFront: 1, back: -1.1, farBack: -0.9, head: -0.2, tail: 1.1 }; break;                                    // 내려옴: 다리 벌려 착지 준비
      case 'held': p = { ...base, ...flail(a.seed) }; break;                                                                                     // 잡힘: 버둥버둥
      case 'land': p = { ...base, front: 0.9, farFront: -0.4, back: -1.2, farBack: 1, head: 0.4, tail: 1.2, bob: 4, sy: 1 - 0.22 * a.squash, sx: 1 + 0.15 * a.squash }; break;
      case 'dizzy': p = { ...base, head: Math.sin(t * 6) * 0.25, tilt: Math.sin(t * 5) * 0.12, tail: -0.3 }; break;
      case 'sleep': p = { ...base, front: 1.5, farFront: 1.5, back: -1.5, farBack: -1.5, head: 0.4, tail: -0.6 + Math.sin(t * 0.8) * 0.08, napDrop: true, sy: 0.92 + Math.sin(t * 2) * 0.02 }; break;
      case 'tea': p = { ...base, front: a.sip ? 1.4 : 0.5, farFront: a.sip ? 0.6 : 0.3, head: a.sip ? -0.25 : base.head }; break;
      case 'eat': { const b = Math.max(0, Math.sin(t * 14 + a.seed)); p = { ...base, headX: -4 * b, head: 0.2 * b, front: 0.4 + 0.3 * b, farFront: 0.3 }; break; }
      case 'lift': { const u = a.lift || 0; p = { ...base, front: 2.2 + u * 0.6, farFront: 2.0 + u * 0.6, head: -0.15, tilt: -0.08, back: -0.2, farBack: 0.2, sy: 1 - 0.04 * u }; break; }
      default: p = base;
    }
    return p;
  }

  // ── 그리기 ──
  function drawRat(a) {
    const [x, y] = P(a.u, a.v), len = L(RAT_LEN) * a.size, sc = len / (RIG_LEN[a.sp.shape] || 44), lift = LV(a.z);
    g.save(); g.globalAlpha = 0.2 * clamp(1 - a.z * 4, 0.3, 1); g.fillStyle = '#2b2018'; g.beginPath(); g.ellipse(x, y, len * 0.4 * clamp(1 - a.z * 2, 0.5, 1), len * 0.09, 0, 0, 6.28); g.fill(); g.restore();
    g.save(); g.translate(x, y - lift);
    if (a.state === 'held' || (a.state === 'air' && a.thrown)) { g.translate(0, -len * 0.3); g.rotate(a.rot); g.translate(0, len * 0.3); }
    if (a.face > 0) g.scale(-1, 1);
    drawRatRig(a.rig, sc, poseOf(a), g);
    g.restore();
    drawHeld(a, x, y - lift, len);
    if (a.state === 'dizzy') for (let i = 0; i < 3; i++) { const an = t * 5 + i * 2.09; g.save(); g.fillStyle = '#f2c14e'; g.font = `${Math.max(10, len * 0.22)}px sans-serif`; g.textAlign = 'center'; g.fillText('★', x + Math.cos(an) * len * 0.35, y - len * 0.75 + Math.sin(an) * len * 0.1); g.restore(); }
    return [x, y - lift, len];
  }
  // 손에 든 것: 치즈(갉기) · 아령(들기) · 골무 찻잔(차)
  function drawHeld(a, x, y, len) {
    const put = (k, cx, cy, w, rot = 0) => { const im = art(k); if (!im) return; const h = w * im.height / im.width; g.save(); g.translate(cx, cy); g.rotate(rot); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore(); };
    const f = a.face;
    if (a.state === 'eat') put('lb:cheese', x + f * len * 0.58, y - len * 0.16, len * 0.42);
    else if (a.state === 'lift') put('lb:dumbbell', x + f * len * 0.18, y - len * (0.78 + 0.22 * (a.lift || 0)), len * 0.8);
    else if (a.state === 'tea') put('lb:cup', x + f * len * 0.5, y - len * (a.sip ? 0.38 : 0.12), len * 0.2, a.sip ? -f * 0.5 : 0);
  }
  function drawWheel(front) {
    const im = art('lb:wheel'); if (!im) return;
    const w = L(WHEEL.w), h = w * im.height / im.width, [x, y] = P(WHEEL.u, WHEEL.v);
    if (!front) { g.drawImage(im, x - w / 2, y - h, w, h); return; }
    // 바퀴살이 도는 느낌: 테 둘레의 가로대 (안에서 쥐가 달리면 빨리)
    const runner = actors.find(a => a.state === 'wheel'), rot = (WHEEL.rot = (WHEEL.rot || 0) + (runner ? 0.12 : 0.004));
    const cx = x, cy = y - h * 0.56, R = w * 0.43;
    g.save(); g.strokeStyle = 'rgba(90,92,96,.85)'; g.lineWidth = Math.max(1, w * 0.012);
    for (let i = 0; i < 18; i++) { const an = rot + i / 18 * 6.28; g.beginPath(); g.moveTo(cx + Math.cos(an) * R * 0.93, cy + Math.sin(an) * R * 0.93); g.lineTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R); g.stroke(); }
    g.restore();
  }
  function drawBadges() {
    const r = rankOf(), w = L(BADGES.w);
    for (let i = 1; i <= RANK_MAX; i++) {
      const [x, y] = P(BADGES.u0 + (i - 1) * BADGES.du, BADGES.v + (i % 2) * 0.012), im = art('rk:' + i);
      g.save(); g.strokeStyle = 'rgba(80,55,40,.5)'; g.lineWidth = Math.max(1, w * 0.04); g.beginPath(); g.moveTo(x, y - w * 0.85); g.lineTo(x, y - w * 0.5); g.stroke(); g.restore();
      if (i <= r && im) { g.save(); g.translate(x, y - w * 0.55); g.rotate(Math.sin(t * 1.5 + i) * 0.04); g.drawImage(im, -w / 2, 0, w, w * im.height / im.width); g.restore(); }
      else { g.save(); g.setLineDash([3, 3]); g.strokeStyle = 'rgba(90,70,55,.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, w * 0.38, 0, 6.28); g.stroke(); g.restore(); }
    }
  }
  function drawProps() {
    const r = rankOf(), ch = art('lb:cheese'), cup = art('lb:cup');
    if (ch && r >= 2) { const [x, y] = P(0.39, 0.585), w = L(0.03); g.drawImage(ch, x - w / 2, y - w * ch.height / ch.width, w, w * ch.height / ch.width); }
    if (cup && r >= 3) { const [x, y] = P(0.315, 0.585), w = L(0.016); g.drawImage(cup, x - w / 2, y - w * cup.height / cup.width, w, w * cup.height / cup.width); }
  }
  function drawBubble(b) {
    const pos = b.a._pos; if (!pos) return;
    const [x, y, len] = pos, k = Math.min(1, b.t / 0.15) * Math.min(1, (b.dur - b.t) / 0.25), fs = Math.max(12, L(0.0135));
    g.save(); g.globalAlpha = k; g.font = `600 ${fs}px Gaegu, 'Jua', sans-serif`;
    const tw = g.measureText(b.text).width, pw = tw + fs * 1.1, ph = fs * 1.7, bx = x - pw / 2, by = y - len * 0.95 - ph;
    g.fillStyle = '#fffaf0'; g.strokeStyle = 'rgba(60,45,35,.35)'; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(bx, by, pw, ph, ph / 2); g.moveTo(x - fs * 0.35, by + ph - 1); g.lineTo(x, by + ph + fs * 0.5); g.lineTo(x + fs * 0.35, by + ph - 1); g.fill(); g.stroke();
    g.fillStyle = '#3c322d'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b.text, x, by + ph / 2 + 1);
    g.restore();
  }
  function drawFx() {
    const fs = Math.max(10, L(0.012));
    for (const f of fx) {
      const k = f.t / f.dur, [x, y] = P(f.u + (f.du || 0) * k, f.v - (f.kind === 'z' ? 0.06 * k : f.kind === 'crumb' ? -0.02 * k : f.kind === 'dust' ? 0.012 * k : 0.01 * k));
      g.save(); g.globalAlpha = 1 - k;
      if (f.kind === 'z') { g.font = `700 ${fs * (1 + k)}px sans-serif`; g.fillStyle = '#6f8fb0'; g.fillText('z', x + Math.sin(k * 6) * fs * 0.5, y); }
      else if (f.kind === 'crumb') { g.fillStyle = '#f2c14e'; g.fillRect(x, y, fs * 0.25, fs * 0.25); }
      else if (f.kind === 'dust') { g.fillStyle = 'rgba(235,220,195,.9)'; g.beginPath(); g.arc(x, y, fs * (0.25 + k * 0.4), 0, 6.28); g.fill(); }
      else { g.fillStyle = '#9fd0f0'; g.beginPath(); g.arc(x, y, fs * 0.18, 0, 6.28); g.fill(); }
      g.restore();
    }
  }
  // 쥐구멍(왼쪽 동그란 창)으로 빼꼼: 창틀 아래에 완전히 숨어 있다가 스르륵 올라와 두리번 → 다시 쏙 (갑자기 나타나지 않게)
  function drawPeek() {
    if (!peek) return;
    const k = peek.t / peek.dur, ease = x => x * x * (3 - 2 * x), out = k < 0.25 ? ease(k / 0.25) : k > 0.75 ? ease((1 - k) / 0.25) : 1;
    const [cx, cy] = P(HOLE.u, HOLE.v), R = L(HOLE.r), len = L(RAT_LEN) * 0.8, sc = len / (RIG_LEN[peek.sp.shape] || 44), ratH = len * 0.75;
    const y = cy + R + ratH - out * (ratH + R * 0.35);           // out 0 = 창틀 아래로 완전히 숨음, 1 = 머리·어깨만 보임
    g.save(); g.beginPath(); g.arc(cx, cy, R * 0.96, 0, 6.28); g.clip();
    g.translate(cx + R * 0.15, y); if (Math.sin(peek.t * 1.4 + peek.seed) < 0) g.scale(-1, 1);   // 두리번
    drawRatRig(peek.rig, sc, { ...RIG_IDLE, head: Math.sin(t * 3) * 0.06, tail: 0.3 }, g);
    g.restore();
  }
  function draw() {
    g.clearRect(0, 0, W, H);
    drawBadges(); drawProps(); drawPeek(); drawWheel(false);
    const list = actors.slice().sort((p, q) => (p.state === 'held') - (q.state === 'held') || p.v - q.v);
    for (const a of list) a._pos = drawRat(a);
    drawWheel(true); drawFx();
    for (const b of bubbles) drawBubble(b);
  }

  // ── 화면 크기 · 팻말 위치 ──
  function layout() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), box = root.getBoundingClientRect();
    W = Math.max(1, Math.round(box.width * dpr)); H = Math.max(1, Math.round(box.height * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    s = Math.max(W / IW, H / IH); ox = (W - IW * s) / 2; oy = (H - IH * s) / 2;
    for (const el of hotBox.querySelectorAll('.home-hot')) {
      const h = HOTS.find(x => x.id === el.dataset.p), [x, y] = P(h.u, h.v), [tx, ty] = P(h.tu, h.tv);
      Object.assign(el.style, { left: x / W * 100 + '%', top: y / H * 100 + '%', width: L(h.w) / W * 100 + '%', height: LV(h.h) / H * 100 + '%' });
      const tag = hotBox.querySelector(`.home-tag[data-p="${h.id}"]`);
      Object.assign(tag.style, { left: tx / W * 100 + '%', top: ty / H * 100 + '%' });
    }
  }
  function frame(now) {
    if (!on) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (actors.length < 4 && typeof RAT_RIGS !== 'undefined' && Object.keys(RAT_RIGS).length) makeActors();   // 리그는 이미지가 다 불러와진 뒤에 생김
    layout(); update(dt); draw();
    requestAnimationFrame(frame);
  }

  // ── 쥐 누르기(점프) · 끌어서 던지기 ──
  function hitRat(e) {
    const [, , px, py] = toUV(e); let best = null, bd = 1e9;
    for (const a of actors) { if (!a._pos) continue; const [x, y, len] = a._pos, d = Math.hypot(px - x, py - (y - len * 0.3)); if (d < len * 0.65 && d < bd) { bd = d; best = a; } }
    return best;
  }
  function onDown(e) {
    eatClick = false;
    const a = hitRat(e); if (!a) return;
    e.preventDefault(); e.stopPropagation();
    const [u, v] = toUV(e);
    drag = { a, id: e.pointerId, u0: u, v0: v, t0: performance.now(), moved: false, hist: [[u, v, performance.now()]] };
    root.setPointerCapture && root.setPointerCapture(e.pointerId);
    eatClick = true;
  }
  function onMove(e) {
    if (!drag) { const a = on && hitRat(e); root.classList.toggle('grab', !!a); return; }
    const [u, v] = toUV(e), d = drag, a = d.a;
    d.hist.push([u, v, performance.now()]); if (d.hist.length > 6) d.hist.shift();
    if (!d.moved && Math.hypot(u - d.u0, (v - d.v0) * IH / IW) > 0.012) {
      d.moved = true;
      if (a.slot) { a.slot = null; }
      a.state = 'held'; a.then = null; a.air = null; a.ground = clamp(a.slot ? FLOOR.v : a.v, FLOOR.v0, FLOOR.v1);
      a.rot = 0; say(a, GRAB[Math.floor(Math.random() * GRAB.length)], 1.4); Sfx.pop && Sfx.pop();
    }
    if (d.moved) {
      // 잡은 위치 = 쥐 몸 가운데. 바닥 줄(v)은 그대로, 위로 끌면 높이(z)
      const gv = a.ground || FLOOR.v;
      a.u = clamp(u, 0.03, 0.97); a.v = gv; a.z = Math.max(0, gv - v - RAT_LEN * 0.4 * IW / IH * 0.3);
      const h = d.hist, p0 = h[0], p1 = h[h.length - 1], dtt = Math.max(0.016, (p1[2] - p0[2]) / 1000);
      a.rot = clamp((p1[0] - p0[0]) / dtt * 0.6, -0.8, 0.8); a.face = p1[0] >= p0[0] ? 1 : -1;
    }
  }
  function onUp(e) {
    if (!drag) return;
    const d = drag, a = d.a; drag = null;
    if (!d.moved) {                                   // 그냥 누름 → 점프
      if (['air', 'crouch', 'held'].includes(a.state)) return;
      const sl = a.slot && SLOTS[a.slot];
      if (sl) { a.slot = null; if (sl.up) { jump(a, [clamp(sl.u + 0.04 * (Math.random() < 0.5 ? -1 : 1), FLOOR.u0, FLOOR.u1), FLOOR.v], null); return; } }
      jump(a); if (Math.random() < 0.5) say(a, pick(['찍!', '폴짝!', '야호!', `⭐Lv ${shardLevel(a.sp.id).L}`]), 1.2);
      return;
    }
    // 던지기: 마지막 움직임 속도 그대로
    const h = d.hist, p0 = h[0], p1 = h[h.length - 1], dtt = Math.max(0.016, (p1[2] - p0[2]) / 1000);
    a.vu = clamp((p1[0] - p0[0]) / dtt, -2.2, 2.2); a.vz = clamp(-(p1[1] - p0[1]) / dtt, -1.5, 2.6);
    a.spin = a.vu * 9; a.state = 'air'; a.air = null; a.thrown = true; a.then = null;
    if (a.z <= 0.001) a.z = 0.002;
    if (Math.hypot(a.vu, a.vz) > 1.2) say(a, '으아아아~!', 1.2);
  }

  function refresh() {
    root.querySelector('#homeCheese').textContent = fmt(S.cheese); root.querySelector('#homeRes').textContent = fmt(S.research || 0);
    const dots = { rats: !S.inRun && upgradableCount() > 0, rank: !S.inRun && rankOf() < RANK_MAX && rankReqs().every(x => x.ok) };
    for (const h of HOTS) {
      const tag = hotBox.querySelector(`.home-tag[data-p="${h.id}"]`), [a, b] = tagText(h.id), sig = a + b + !!dots[h.id];
      if (tag.dataset.sig === sig) continue;
      tag.dataset.sig = sig; tag.innerHTML = `<b>${a}</b><small>${b}</small><i class="dot"></i>`;
      tag.classList.toggle('alert', !!dots[h.id]);
    }
  }
  function open() {
    if (!S.inRun) UI.hideGame();
    if (!actors.length || open.rank !== rankOf()) { makeActors(); open.rank = rankOf(); }
    refresh(); UI.show('start');
  }
  function close() { UI.hide('start'); }
  function go(p) {
    Sfx.resume && Sfx.resume(); Sfx.click();
    if (p === 'run' && S.inRun) { close(); UI.beginPlay(true); return; }    // 탈출 중이면 작전 탁자 = 이어하기
    LOBBY.open(p);
  }
  function init() {
    root = document.getElementById('start'); if (!root) return;
    cv = document.getElementById('homeCv'); g = cv.getContext('2d'); hotBox = document.getElementById('homeHot');
    hotBox.innerHTML = HOTS.map(h => `<button class="home-hot${h.main ? ' main' : ''}" data-p="${h.id}" aria-label="${tagText(h.id)[0]}"></button>`).join('')
      + HOTS.map(h => `<button class="home-tag${h.main ? ' main' : ''}${h.right ? ' right' : ''}" data-p="${h.id}"></button>`).join('');
    for (const b of hotBox.querySelectorAll('[data-p]')) {
      b.addEventListener('click', e => { e.stopPropagation(); if (eatClick) { eatClick = false; return; } go(b.dataset.p); });
      // 물건에 마우스를 올리면 팻말도 같이, 팻말에 올리면 물건도 같이 빛남
      b.addEventListener('pointerenter', () => hotBox.querySelectorAll(`[data-p="${b.dataset.p}"]`).forEach(x => x.classList.add('hl')));
      b.addEventListener('pointerleave', () => hotBox.querySelectorAll(`[data-p="${b.dataset.p}"]`).forEach(x => x.classList.remove('hl')));
    }
    root.addEventListener('pointerdown', onDown, true);       // 쥐가 맞으면 물건 버튼보다 먼저
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('click', () => { eatClick = false; });
    makeActors(); open.rank = rankOf(); refresh();
    on = !root.classList.contains('hidden'); if (on) requestAnimationFrame(frame);
    new MutationObserver(() => { const vis = !root.classList.contains('hidden'); if (vis && !on) { on = true; last = performance.now(); requestAnimationFrame(frame); } else if (!vis) on = false; })
      .observe(root, { attributes: true, attributeFilter: ['class'] });
    setInterval(() => { if (on) refresh(); }, 1000);
  }
  // 테스트용: 화면이 안 그려지는 환경에서 시간을 직접 흘림
  const step = (sec, k = 1 / 30) => { if (actors.length < 4) makeActors(); layout(); for (let i = 0; i < sec / k; i++) update(k); draw(); return actors.map(a => a.state); };
  return { init, open, close, refresh, step, HOTS, SLOTS, get actors() { return actors; }, get peek() { return peek; }, startPeek };
})();
