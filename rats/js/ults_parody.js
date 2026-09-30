'use strict';
// ───────────────────────── 패러디 쥐 필살기 4종 (ults.js 다음에 로드) ─────────────────────────
// 원작 캐릭터·실존 인물 이름/외모는 쓰지 않는 병맛 패러디. 소품 이미지는 art_list.mjs PARODY_ART (ult:balloon·battery·bolt·chat·donation), 없으면 코드 그림.
// 사람을 붙잡을 땐 h.held = true (humans.js 가 움직임·충돌을 건너뜀) → 끝날 때 반드시 풀기(parodyRelease).
function holdHuman(s, h) { if (h.boss || h.held || (h.state !== 'walk' && h.state !== 'panic')) return false; h.held = true; h.hx = h.x; h.hy = h.y; (s.humans = s.humans || []).push(h); return true; }
function parodyRelease(s) { for (const h of s.humans || []) h.held = false; s.humans = []; }
const humansNear = (x, y, R) => G.humans.filter(h => !h.boss && !h.held && (h.state === 'walk' || h.state === 'panic') && Math.hypot(h.x - x, h.y - y) < R);
// 지그재그 번개
function drawZap(pts, col, w) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [lw, c, a] of [[w * 2.6, col, 0.35], [w, col, 0.95], [w * 0.4, '#fff', 1]]) {
    ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  }
  ctx.restore();
}
function zapPath(x1, y1, x2, y2) { const pts = [[x1, y1]], n = 6; for (let i = 1; i < n; i++) { const k = i / n; pts.push([rLerp(x1, x2, k) + rand(-14, 14), rLerp(y1, y2, k) + rand(-14, 14)]); } pts.push([x2, y2]); return pts; }

// 거대 냄비 (슈퍼 요리사 쥐 필살기). 기준점 = 냄비 바닥 가운데. fill 0~1 = 재료가 찬 정도, shake = 흔들림
function drawPot(x, y, fill, shake, hot) {
  const W2 = 150, H2 = 110, j = shake ? rand(-shake, shake) : 0;
  ctx.save(); ctx.translate(x + j, y);
  ctx.fillStyle = 'rgba(30,15,5,.25)'; ctx.beginPath(); ctx.ellipse(0, 4, W2 * 0.62, 20, 0, 0, 6.28); ctx.fill();
  // 불
  for (let i = 0; i < 5; i++) { const fx = -50 + i * 25, fh = 18 + Math.random() * 16; ctx.fillStyle = i % 2 ? '#f0c878' : '#e39a5a'; ctx.beginPath(); ctx.moveTo(fx - 9, 6); ctx.lineTo(fx, 6 - fh); ctx.lineTo(fx + 9, 6); ctx.fill(); }
  // 몸통
  ctx.fillStyle = '#6f6a66'; ctx.beginPath(); ctx.moveTo(-W2 / 2, -H2); ctx.lineTo(W2 / 2, -H2); ctx.quadraticCurveTo(W2 / 2 + 6, 0, W2 * 0.38, 0); ctx.lineTo(-W2 * 0.38, 0); ctx.quadraticCurveTo(-W2 / 2 - 6, 0, -W2 / 2, -H2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-W2 * 0.36, -H2 + 10, 12, H2 - 20);
  ctx.fillStyle = '#4b4540'; rr(ctx, -W2 / 2 - 22, -H2 + 18, 24, 10, 5); ctx.fill(); rr(ctx, W2 / 2 - 2, -H2 + 18, 24, 10, 5); ctx.fill();
  // 입구 + 끓는 치즈 수프
  ctx.fillStyle = '#4b4540'; ctx.beginPath(); ctx.ellipse(0, -H2, W2 / 2 + 4, 16, 0, 0, 6.28); ctx.fill();
  const lv = 0.2 + 0.8 * fill, col = hot ? `hsl(${45 - hot * 30}, 80%, ${62 - hot * 8}%)` : '#f0c878';
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, -H2 + 2, (W2 / 2 - 4) * (0.7 + 0.3 * lv), 12 * (0.7 + 0.3 * lv), 0, 0, 6.28); ctx.fill();
  for (let i = 0; i < 6; i++) { const bx = Math.sin(G.t * 3 + i * 1.7) * 44, bs = (Math.sin(G.t * 7 + i) * 0.5 + 0.5) * 7 * (0.5 + fill); ctx.fillStyle = 'rgba(255,243,191,.9)'; circ(ctx, bx, -H2 + Math.cos(i) * 5, bs); ctx.fill(); }
  ctx.restore();
}

// 후원 알림 (쥐커드): 이름·치즈·메시지. 큰 도네는 금색 + 폭죽
// 도네 메시지: 실제 방송에서 나올 법한 말투 (비속어 없이)
const DONATE_MSGS = ['이이잉~~', '믿고 있었다구!!', '쥐커드!!', '쥐커드 해주세요!!', '쥐커드 한 번만 더!!', '앵콜!! 앵콜!!', '1000원에 쥐커드 가능?', '안경 번쩍 해줘요', '우다다다 풀버전으로',
  '리마스터 가즈아!!', '오늘도 레전드 찍자', '형 믿는다', '이거 보려고 퇴근했음', '밥 먹다 뿜었다 ㅋㅋ', '모션 더 크게!!', '효과음 입으로 해주세요', '역시 쥐커드 장인', '이 맛에 도네한다',
  '방송 킨 기념 쥐커드', '제노사이드 들어가자', '레전드의 시작 ㅋㅋ', '한 바퀴 더 돌아요', '엄마가 쥐커드 보래요', '쥐커드 안 하면 구독 취소', '이이이잉~~~'];
const DONORS = ['치즈러버', '하수구왕', '햄찌팬', '익명', '쥐구멍', '안경쥐팬', '찍찍이'];
function donate(s, who, amt, msg, big) {
  s.alerts.push({ who, amt, msg, big, t: big ? 2.2 : 1.4 }); if (s.alerts.length > 3) s.alerts.shift();
  Sfx.pop(); if (big) { Sfx.clear(); flash('#f2c14e', 0.2); burst(s.r.x, s.r.y, 30, { colors: ['#f2c14e', '#fff3bf', '#cdb4db'], type: 'star', min: 200, max: 600, s0: 3, s1: 8, z: 60 }); }
}
// 줴리 필살기 이름 = 쥐 아재개그 퀴즈 (발동할 때마다 랜덤) [문제, 정답]
const JW_JOKES = [
  ['쥐가 네 마리 모이면?', '쥐포!'],
  ['세상에서 제일 무거운 쥐는?', '돼쥐!'],
  ['쥐가 공부를 열심히 하면?', '쥐식인!'],
  ['쥐가 사진 찍는 소리는?', '찍찍!'],
  ['쥐가 하늘을 날면?', '박쥐!'],
  ['쥐가 제일 좋아하는 차는?', '쥐프!'],
  ['쥐가 화나면?', '킹받쥐!'],
  ['쥐가 달리기를 하면?', '달리쥐… 아니 다람쥐!'],
  ['쥐가 보는 영화는?', '쥐라기 공원!'],
  ['쥐가 쓰는 SNS는?', '쥐스타그램!'],
  ['쥐가 선물을 주면서 하는 말은?', '쥐여줄게!'],
  ['쥐가 가장 좋아하는 계절은?', '쥐울(겨울)!'],
];
const JW_COLD = ['(정적)', '(……)', '(귀뚤귀뚤)', '(관객 한 명 퇴장)', '(에어컨 틀었어요?)', '(싸늘)'];
// 줴리가 인사하면 그쪽(side −1 왼쪽 / 1 오른쪽 / 0 전부) 악기들이 통 튀며 ♪
function jwBand(s, side) {
  for (const I of s.inst) if (!side || Math.sign(I.x - s.r.x) === side) {
    I.pop = 1;
    if (onScreen(I.x, I.y) && Math.random() < 0.7) popup(I.x + rand(-10, 10), I.y, pick(['♪', '♫', '♬']), pick(['#fff3bf', '#f2c14e', '#cdb4db']), 22, 0.7, 60 + I.w * 0.6);
  }
}
// 줴리 인사 한 번 = 가까운 물건부터 n개 펑 (필살기 피해 공식) + 색종이
function jwPop(s, n, big = 1) {
  const r = s.r, list = itemsIn(r.x, r.y, ULT_R).filter(it => !s.popped.has(it)).sort((a, b) => Math.hypot(a.x - r.x, a.y - r.y) - Math.hypot(b.x - r.x, b.y - r.y));
  for (const it of list.slice(0, n)) {
    s.popped.add(it);
    if (onScreen(it.x, it.y)) { burst(it.x, it.y, 10, { colors: ['#f2c14e', '#e8786a', '#fff3bf', '#cdb4db'], type: 'star', min: 120, max: 360, s0: 3, s1: 7, z: 20 }); popup(it.x, it.y, pick(['펑!', '뻥!', '팡!']), '#fff3bf', 18, 0.5, 40); }
    skillBlastItem(it, ultItemD(s) * 2 * big, r, Math.atan2(it.y - r.y, it.x - r.x), 380, 360);
    blastActorsIn(it.x, it.y, 70, 480, ultD(s) * 0.3, r);
  }
  Sfx.pop(); if (n > 2) Sfx.boom(0.6);
}
Object.assign(ULT_ENG, {
  // 줴리 (제리 인사 밈 패러디 — 원래 용법: 썰렁한 아재개그 뒤에 뻔뻔하게 "감사합니다"): 필살기 이름 = 쥐 퀴즈 중 랜덤(JW_JOKES, 컷인 제목)
  // ❓ 문제 → 💡 정답 → 🥶 썰렁한 반응(정적·귀뚤귀뚤·찬바람) → 그 앞에서 90도 인사 "감사합니다~" → 굽실굽실 좌우 번갈아 빨라지며 물건 펑
  // → 마지막 초 깊은 인사에 반경 안 전부 폭발 → 일어나 윙크 (턱시도 리그 jwrig.js, 무대 양옆 악기)
  thankyou: {
    dur: 7.7,
    pre(s) { s.joke = pick(JW_JOKES); s.cold = pick(JW_COLD); s.title = '❓ ' + s.joke[0]; },   // 컷인 전에 퀴즈를 고름 (ults.js startUlt)
    beats: [
      [0.05, s => ucap(s, '❓ ' + s.joke[0], { size: 50, col: '#fff3bf', y: 0.45, dur: 1.15 })],
      [1.15, s => ucap(s, '💡 ' + s.joke[1], { size: 64, col: '#f2c14e', y: 0.45, dur: 0.75 })],
      [1.9, s => ucap(s, s.cold, { col: '#bfe8ff' })],
      [3.1, s => ucap(s, '감사합니다!!', { col: '#fff3bf' })],
      [4.4, s => ucap(s, '감사합니다!! 감사합니다!!', { col: '#fff3bf' })],
      [5.9, s => ucap(s, '감사합니다!!', { size: 72, col: '#f2c14e', y: 0.45, dur: 1.2 })],
      [6.9, s => ucap(s, '(뻔뻔)', { size: 26, col: '#fff3bf' })],
    ],
    start(s) {
      if (!s.joke) ULT_ENG.thankyou.pre(s);
      s.dark = 0; s.chill = 0; s.popped = new Set(); s.roses = []; s.snow = []; s.bp = 0; s.bowN = 0; s.hit1 = s.hitF = s.said = s.enjoy = false; s.face = -1; s.r.face = -1;
      // 무대 양옆 악기 (쥐보다 살짝 뒤): [파츠 id, x 오프셋, y 오프셋, 폭]. 인사할 때마다 통 튀며 ♪
      const x = s.r.x, y = s.r.y;
      s.inst = [['jw_piano', -175, -30, 150], ['jw_harp', -270, -10, 70], ['jw_violin', -95, -40, 42], ['jw_drum', 120, -35, 70], ['jw_tuba', 185, -20, 70], ['jw_cello', 255, -5, 55], ['jw_trumpet', 95, 20, 44], ['jw_stand', -60, 25, 40]]
        .map(([id, dx, dy, w]) => ({ id, x: x + dx, y: y + dy, w, pop: 0, t0: rand(0, 0.35) }));
    },
    step(s, dt) {
      const r = s.r, t = s.t, H = 30, T0 = 2.5;               // 2등신이라 키는 작게. T0 = 퀴즈 끝 → 인사 시작
      r.face = s.face; r.vx = r.vy = 0;
      for (const I of s.inst) I.pop = Math.max(0, I.pop - dt * 4);
      s.dark = t < 7.2 ? Math.min(0.55, t * 1.4) : Math.max(0, s.dark - dt * 1.5);
      s.chill = t > 1.85 && t < T0 + 0.4 ? Math.min(1, s.chill + dt * 4) : Math.max(0, s.chill - dt * 2);
      const ease = x => x * x * (3 - 2 * x);
      let bend = 0, head = 'grin', near = 'arm', far = null, nearRot = 0, farRot = 0, tail = Math.sin(t * 3) * 0.1, bob = 0;
      const tb = t - T0 + 0.6;                                  // 인사 구간 시계 (예전 타임라인 기준)
      if (t < 1.15) {
        // ❓ 문제: 관객에게 손을 뻗으며 "맞혀 보세요~"
        const k = ease(clamp(t / 0.3, 0, 1)); near = 'out'; nearRot = -0.3 * k + Math.sin(t * 6) * 0.05; far = 'arm'; bend = -0.06 * k; head = 'grin';
        if (onScreen(r.x, r.y) && Math.random() < dt * 3) popup(r.x + rand(-60, 60), r.y, '?', '#fff3bf', 26, 0.7, 70);
      } else if (t < 1.85) {
        // 💡 정답: 윙크 + 손 흔들며 의기양양 (빠밤!)
        head = 'wink'; near = 'wave'; nearRot = Math.sin(t * 16) * 0.25; far = 'out'; farRot = -0.2; bob = -Math.abs(Math.sin(t * 12)) * 1.5;
        if (!s.said) { s.said = true; r.say = { text: '감사합니다!!', t: 0.8 }; jwBand(s, 0); if (onScreen(r.x, r.y)) burst(r.x, r.y, 14, { colors: ['#f2c14e', '#e8786a', '#cdb4db', '#9dd5a8'], type: 'star', min: 120, max: 300, s0: 3, s1: 6, z: 50 }); Sfx.comboWord(); }
      } else if (t < T0) {
        // 🥶 썰렁한 반응을 즐기는 줴리 (킹받게): 눈 감은 뻔뻔한 미소로 가슴 펴고 뒤로 젖힘, 배에 손 얹고 흡족하게 들썩. 객석은 정적·귀뚤귀뚤·우우~
        const c2 = t - 1.85;
        head = 'smug'; near = 'belly'; far = 'out'; farRot = -0.35 + Math.sin(t * 5) * 0.08; bend = -0.16 - Math.sin(t * 7) * 0.04; bob = -Math.abs(Math.sin(t * 7)) * 0.8; tail = 0.3 + Math.sin(t * 9) * 0.2;
        if (!s.enjoy) { s.enjoy = true; r.say = { text: '감사합니다!!', t: 0.9 }; }
        if (onScreen(r.x, r.y)) {
          if (Math.random() < dt * 5) popup(r.x + rand(-380, 380), r.y + rand(80, 240), pick(['귀뚤…', '귀뚤귀뚤', '휭~', '…', '우우~', '(싸늘)']), '#bfe8ff', 18, 0.9, 20);
          if (Math.random() < dt * 4) popup(r.x + rand(-16, 16), r.y, '😏', '#fff3bf', 18, 0.6, 72 + c2 * 10);
        }
      } else if (tb < 1.6) {
        // 첫 인사: 천천히 90도 → 잠깐 멈춤 → 일어남
        const a = tb - 0.6; bend = a < 0.35 ? 1.45 * ease(a / 0.35) : a < 0.75 ? 1.45 : 1.45 * (1 - ease((a - 0.75) / 0.25));
        head = 'smug'; near = 'belly'; far = 'out'; farRot = 0.6 * Math.min(1, bend / 1.45);
        if (!s.hit1 && a > 0.35) { s.hit1 = true; jwPop(s, 1); jwBand(s, -1); r.say = { text: '감사합니다!!', t: 1 }; }
      } else if (tb < 3.8) {
        // 굽실굽실: 인사 주기가 0.55초 → 0.13초로 빨라짐. 왼쪽·오른쪽 번갈아(허리를 편 순간 돌아섬), 숙일 때마다 물건 펑 (개수도 늘어남)
        const u = (tb - 1.6) / 2.2, per = rLerp(0.55, 0.13, u);
        s.bp += dt / per; const ph = s.bp % 1, n = Math.floor(s.bp);
        s.face = n % 2 ? 1 : -1;
        bend = 1.35 * Math.pow(Math.sin(ph * Math.PI), 0.7); head = 'smug'; near = 'belly'; far = 'out'; farRot = 0.55;
        if (n !== s.bowN && ph > 0.5) { s.bowN = n; jwPop(s, 1 + Math.floor(u * 3)); jwBand(s, s.face); if (Math.random() < 0.3) r.say = { text: '감사합니다!!', t: 0.5 }; }
        // 박수·장미 (썰렁했는데 왜인지 쏟아짐)
        if (Math.random() < dt * (4 + u * 10)) s.roses.push({ x: r.x + rand(-500, 500), y: r.y + rand(200, 320), z: 0, tx: r.x + rand(-60, 60), ty: r.y + rand(-15, 30), t: 0, dur: rand(0.6, 0.9), rot: rand(0, 6.28), vr: rand(-12, 12) });
        if (Math.random() < dt * 6) popup(r.x + rand(-420, 420), r.y + rand(120, 260), '👏', '#fff', 22, 0.6, 20);
      } else if (tb < 4.6) {
        // 마지막: 벌떡 → 초 깊은 인사 (머리가 무릎까지) → 반경 안 물건 전부 폭발
        const a = tb - 3.8; s.face = -1; bend = a < 0.15 ? -0.1 : a < 0.45 ? 1.85 * ease((a - 0.15) / 0.3) : 1.85;
        head = a < 0.15 ? 'grin' : 'smug'; near = 'belly'; far = 'out'; farRot = 0.9;
        if (!s.hitF && a > 0.45) {
          s.hitF = true; jwPop(s, 999, 1.5); jwBand(s, 0);
          shock(r.x, r.y, ULT_R * 0.7, ultD(s) * 0.6, r, '#f2c14e', 2);
          blastActorsIn(r.x, r.y, ULT_R * 0.8, 700, ultD(s), r);
          for (const o of ratsNear(s, r.x, r.y, 360)) { o.frenzy = Math.max(o.frenzy, 2); if (o.z <= 0) o.vz = 320; }
          flash('#fff3bf', 0.5); addShake(0.7); Sfx.boom(2); G.hitstop = 0.1;
          for (let i = 0; i < 30; i++) s.roses.push({ x: r.x + rand(-600, 600), y: r.y + rand(150, 320), z: 0, tx: r.x + rand(-160, 160), ty: r.y + rand(-40, 60), t: 0, dur: rand(0.5, 1.1), rot: rand(0, 6.28), vr: rand(-12, 12) });
        }
      } else {
        // 천천히 일어나 윙크 + 손 흔들기 (뻔뻔)
        const a = tb - 4.6; bend = 1.85 * (1 - ease(clamp(a / 0.6, 0, 1))); head = a > 0.7 ? 'wink' : 'smug'; near = a > 0.7 ? 'wave' : 'belly'; nearRot = a > 0.7 ? Math.sin(t * 14) * 0.25 : 0; far = a > 0.6 ? 'arm' : 'out'; farRot = 0.9 * (1 - clamp(a / 0.6, 0, 1));
        if (a > 0.8 && !r.say) r.say = { text: '감사합니다!!', t: 1 };
      }
      r.pose = { jw: 1, h: H, bend, head, near, far, nearRot, farRot, tail, bob, sprite: null };
      // 썰렁 구간 눈송이
      if (s.chill > 0.3 && Math.random() < dt * 30) s.snow.push({ x: r.x + rand(-500, 500), y: r.y + rand(-300, 250), z: rand(200, 400), vx: rand(-60, -20), life: 2 });
      for (const f of s.snow) { f.z -= 70 * dt; f.x += f.vx * dt; f.life -= dt; } s.snow = s.snow.filter(f => f.life > 0 && f.z > 0);
      r.jit = 0;
      for (const ro of s.roses) { ro.t = Math.min(ro.dur, ro.t + dt); ro.rot += ro.vr * dt * (ro.t < ro.dur ? 1 : 0); }
      if (s.roses.length > 90) s.roses.splice(0, s.roses.length - 90);
    },
    draw(s) {
      const r = s.r;
      // 무대: 어두운 객석 + 쥐에게 핀 조명
      if (s.dark > 0) {
        ctx.save(); ctx.globalAlpha = s.dark; ctx.fillStyle = '#120e1c';
        ctx.beginPath(); ctx.rect(G.cam.x - 200, G.cam.y - 200, viewW() + 400, viewH() + 400); ctx.ellipse(r.x, r.y * TILT - 10, 150, 70, 0, 0, 6.28); ctx.fill('evenodd'); ctx.restore();
        ctx.save(); ctx.globalAlpha = s.dark * 0.35; ctx.fillStyle = '#fff3bf';
        ctx.beginPath(); ctx.moveTo(r.x - 40, G.cam.y - 50); ctx.lineTo(r.x + 40, G.cam.y - 50); ctx.lineTo(r.x + 150, r.y * TILT - 10); ctx.lineTo(r.x - 150, r.y * TILT - 10); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      // 무대 양옆 악기 (등장할 때 뿅, 인사할 때마다 통 튐)
      if (s.dark > 0.05) for (const I of [...s.inst].sort((a, b) => a.y - b.y)) {
        const im = FR_IMG[I.id]; if (!im) continue;
        const ap = clamp((s.t - I.t0) / 0.25, 0, 1); if (ap <= 0) continue;
        const sc = (ap < 1 ? 0.4 + 0.6 * ap + Math.sin(ap * Math.PI) * 0.2 : 1) * (1 + I.pop * 0.18), w = I.w * sc, h = w * im.height / im.width;
        ctx.save(); ctx.globalAlpha = Math.min(1, s.dark * 2.5); ctx.translate(I.x, I.y * TILT); ctx.scale(1, 1 - I.pop * 0.1); ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
      }
      if (s.dark > 0.05) drawRat(r);
      // 🥶 썰렁: 푸르스름한 찬 기운 + 눈송이
      if (s.chill > 0) {
        ctx.save(); ctx.globalAlpha = s.chill * 0.22; ctx.fillStyle = '#9fd0ff'; ctx.fillRect(G.cam.x - 200, G.cam.y - 200, viewW() + 400, viewH() + 400); ctx.restore();
        ctx.save(); ctx.fillStyle = '#ffffff'; for (const f of s.snow) { ctx.globalAlpha = Math.min(1, f.life) * s.chill; circ(ctx, f.x, f.y * TILT - f.z, 2.5); ctx.fill(); } ctx.restore();
      }
      // 날아와 떨어지는 장미
      const RO = FR_IMG.jw_rose;
      for (const ro of s.roses) {
        const k = ro.t / ro.dur, x = rLerp(ro.x, ro.tx, k), y = rLerp(ro.y, ro.ty, k), z = Math.sin(k * Math.PI) * 180;
        ctx.save(); ctx.translate(x, y * TILT - z); ctx.rotate(ro.rot);
        if (RO) { const w = 16, h = w * RO.height / RO.width; ctx.drawImage(RO, -w / 2, -h / 2, w, h); } else { ctx.fillStyle = '#e8786a'; circ(ctx, 0, 0, 5); ctx.fill(); }
        ctx.restore();
      }
    },
  },
  // 람쥐썬더 (평범한 다람쥐 → 밈 각성, 사용자 구성): 옆모습으로 팔 들고 람쥐썬더(앞발 번개) → 점프 → 히어로 랜딩(한 덩어리 자세 몸통)
  // + 양옆 번개 기둥·금 간 바닥·번개 물결·번개 비 → 마지막 초거대 번개 → 연기 펑 하고 원래 모습으로
  ramthunder: {
    dur: 5.4,
    beats: [
      [0.05, s => ucap(s, '빨리 봐라 이거…', { col: '#dfefff' })],
      [0.3, s => ucap(s, '람쥐썬더!!!!!', { size: 84, col: '#fff3bf', y: 0.42, dur: 1.2 })],
      [2.3, s => ucap(s, 'Bring me Acorn!', { col: '#fff3bf' })],
      [3.3, s => ucap(s, '찌리찌리찌리찌리!!', { col: '#bfe8ff' })],
      [4.5, s => ucap(s, '(수고람쥐썬더…)', { size: 26, col: '#dfefff' })],
    ],
    start(s) { s.zaps = []; s.waves = []; s.dark = 0; s.landed = false; s.rainT = 0; s.crackT = 0; s.final = false; s.cr = 0.2; },
    step(s, dt, k) {
      const r = s.r, t = s.t, T_JUMP = 0.9, T_LAND = 1.45, T_BACK = 4.4;
      s.dark = t < T_BACK ? Math.min(0.5, t * 0.9) : Math.max(0, s.dark - dt * 1.2);
      for (const z of s.zaps) z.life -= dt; s.zaps = s.zaps.filter(z => z.life > 0);
      const RS_H = 34, shake = Math.sin(t * 60) * 0.05, gear = clamp((t - T_JUMP) / 0.1, 0, 1);
      // 히어로 랜딩은 앞모습 한 덩어리 자세(frontrig.js drawLanding), 나머지는 옆모습 게임 리그. 파츠가 없으면 예전 한 장짜리 그림(sprite)
      const RG = (o, sprite, sh = 1) => ({ fr: 'rs', h: RS_H * sh, sprite, spriteH: RS_H * sh, ...o });
      r.face = 1;
      if (t < T_JUMP) {
        // 밈 원본 그 자세 (옆모습): 웅크린 채 몸을 비틀고, 팔꿈치 굽힌 앞발을 머리 위로 번쩍 → 앞발에 번개. 고개는 숙임. 두 팔 그림을 번갈아 부들부들
        const up = clamp(t / 0.1, 0, 1), fr2 = Math.floor(t / 0.07) % 2;
        r.pose = up < 1 ? { crouch: 1, front: rLerp(0.3, 2.6, up), farFront: 0.4, tilt: rLerp(0, 0.22, up), head: 0.3, tail: 1 }
          : { armUp: fr2 ? 'rss_arm_up2' : 'rss_arm_up', armUpRot: -0.1 + shake, crouch: 1, back: 0.3, farBack: 0.2, farFront: 0.3, tilt: 0.22 + shake * 0.3, head: 0.42, tail: 0.9 + shake, pawBolt: 1 };
        r.jit = 1 + t;
        if ((s.cr -= dt) <= 0) { s.cr = rand(0.1, 0.18); strikeBolt(r.x + rand(-6, 6), r.y, { w: 0.9, life: 0.14, z0: 700 }, s.zaps); if (Math.random() < 0.5) flash('#dfefff', 0.08); Sfx.laser(); }
        if ((s.cr2 = (s.cr2 ?? 0) - dt) <= 0) { s.cr2 = rand(0.08, 0.2); strikeBolt(r.x + rand(-160, 160), r.y + rand(-90, 90), { w: 0.5, life: 0.15, z0: 420 }, s.zaps); }
      } else if (t < T_LAND) {
        // 점프: 투구·망토가 펑 붙으며 화면 밖으로 튀어 오름 → 망치 들고 낙하 (옆모습)
        if (!s.jumped) { s.jumped = true; smoke(r.x, r.y); strikeBolt(r.x, r.y, { w: 2.2, life: 0.3, z0: 900 }, s.zaps); flash('#ffffff', 0.3); addShake(0.3); Sfx.boom(1); }
        const e = (t - T_JUMP) / (T_LAND - T_JUMP), rise = e < 0.55;
        r.z = 1000 * (rise ? 1 - Math.pow(1 - e / 0.55, 2) : 1 - Math.pow((e - 0.55) / 0.45, 2)); r.jit = 0;
        r.pose = rise ? { armUp: 'rss_arm_up', armUpRot: -0.3, helm: gear, cape: gear, back: -1.3, farBack: -1.1, farFront: 0.8, tilt: -0.35, head: -0.2, tail: 1.3, sx: 0.92, sy: 1.1 }
          : { front: 2.2, farFront: 1.8, helm: 1, cape: 1, back: 0.6, farBack: 0.4, tilt: 0.3, head: 0.35, tail: 1.1, prop: 'fr:rs_hammer', propSize: 26, propRot: -0.4 };
      } else {
        if (!s.landed) {
          // 슈퍼히어로 착지: 주먹으로 땅 쾅 + 양옆 번개 기둥 + 사방 충격파
          s.landed = true; r.z = 0; s.crackT = 0.01;
          for (const dx of [-120, 120]) for (let i = 0; i < 3; i++) strikeBolt(r.x + dx + rand(-20, 20), r.y + rand(-10, 10), { w: 2.2, life: 1.1 + i * 0.1, z0: 900 }, s.zaps);
          shock(r.x, r.y, 280, ultD(s) * 0.8, r, '#bfe8ff', 3);
          for (const it of itemsIn(r.x, r.y, 320)) skillBlastItem(it, ultItemD(s) * 1.5, r, Math.atan2(it.y - r.y, it.x - r.x), 420, 380);
          blastActorsIn(r.x, r.y, 320, 700, ultD(s), r);
          for (const o of ratsNear(s, r.x, r.y, 320)) ragdoll(o, Math.atan2(o.y - r.y, o.x - r.x), 420, 360);
          s.waves.push({ dir: -1, d: 0, hit: new Set() }, { dir: 1, d: 0, hit: new Set() });
          flash('#ffffff', 0.55); addShake(0.9); Sfx.boom(2); G.hitstop = 0.12;
          stampAt(r.x, r.y, m => { m.fillStyle = 'rgba(40,50,70,.35)'; m.beginPath(); m.ellipse(r.x, r.y, 130, 90, 0, 0, 6.28); m.fill(); });
        }
        if (t < T_BACK) {
          // 히어로 랜딩 (3점 착지): 착지 순간은 더 납작한 몸통 + 땅 보는 얼굴 → 고개 들며 치켜뜬 눈. 망치 든 팔은 뒤로 뻗어 부들부들, 숨 쉬듯 들썩
          const tl = t - T_LAND, sq = Math.max(0, 1 - tl / 0.18), look = clamp((tl - 0.35) / 0.25, 0, 1);
          r.pose = RG({ land: tl < 0.14 ? 'rs_land_body2' : 'rs_land_body', head: look < 0.5 ? 'rs_head_bow2' : 'rs_head_bow', headRot: Math.sin(t * 2.2) * 0.03, headY: (1 - look) * 1.5 + Math.sin(t * 2.5) * 0.4,
            arm: 'rs_arm_up_back', armRot: -0.3 + Math.sin(t * 40) * 0.02 * (tl < 0.6 ? 1 : 0.3), hammer: 1, helm: 1, cape: 1, sx: 1 + 0.2 * sq, sy: 1 - 0.2 * sq + Math.sin(t * 2.5) * 0.01 }, 'ult:rs_land', 0.95);
          r.jit = tl < 0.6 ? 2 : 0.4;
        } else {
          // 원래 모습으로: 연기 펑 → 평범한 다람쥐 (게임 리그 그대로)
          if (!s.back) { s.back = true; smoke(r.x, r.y); Sfx.pop(); }
          r.pose = null; r.jit = 0;
        }
        // 땅을 타고 좌우로 퍼지는 번개 물결
        for (const w of s.waves) {
          const d0 = w.d; w.d = Math.min(ULT_R * 1.6, w.d + 1500 * dt);
          if (w.d > d0 && Math.random() < 0.7) strikeBolt(r.x + w.dir * w.d, r.y + rand(-25, 25), { x1: r.x + w.dir * Math.max(0, w.d - 170), y1: r.y + rand(-25, 25), w: 1.3, life: 0.25 }, s.zaps);
          for (const it of itemsIn(r.x + w.dir * w.d, r.y, 110)) if (!w.hit.has(it) && Math.abs(it.y - r.y) < 140) { w.hit.add(it); skillBlastItem(it, ultItemD(s) * 1.2, r, w.dir > 0 ? -0.5 : Math.PI + 0.5, 300, 360); }
          blastActorsIn(r.x + w.dir * w.d, r.y, 90, 600, ultD(s) * 0.4, r);
        }
        // 번개 비: 화면 속 물건에 연달아
        if (t > T_LAND + 0.4 && t < T_BACK - 0.1 && (s.rainT -= dt) <= 0) {
          s.rainT = 0.07;
          const it = pick(itemsIn(r.x, r.y, ULT_R)), x = it ? it.x : r.x + rand(-ULT_R, ULT_R) * 0.8, y = it ? it.y : r.y + rand(-ULT_R, ULT_R) * 0.5;
          strikeBolt(x, y, { w: 1.1, life: 0.3 }, s.zaps);
          if (it) damageItem(it, ultItemD(s) * 0.7, r, true, rand(0, 6.28));
          blastActorsIn(x, y, 60, 480, ultD(s) * 0.2, r);
          if (Math.random() < 0.25) { flash('#dfefff', 0.05); Sfx.laser(); }
        }
        // 마지막: 다람쥐 자신에게 초거대 번개 → 큰 폭발
        if (t > T_BACK - 0.1 && !s.final) {
          s.final = true;
          strikeBolt(r.x, r.y, { w: 3.5, life: 0.7, z0: 1200 }, s.zaps);
          shock(r.x, r.y, ULT_R * 0.8, ultD(s) * 0.6, r, '#bfe8ff', 3);
          for (const it of itemsIn(r.x, r.y, ULT_R * 0.8)) skillBlastItem(it, ultItemD(s), r, Math.atan2(it.y - r.y, it.x - r.x), 360, 420);
          blastActorsIn(r.x, r.y, ULT_R * 0.8, 700, ultD(s), r);
          flash('#ffffff', 0.7); addShake(0.8); Sfx.boom(2);
        }
      }
      if (!r.say || r.say.t < 0.2) r.say = { text: t < 0.45 ? '(도토리 냠)' : t < 1.1 ? '…!!' : t < 2 ? 'Bring me Acorn!!' : t > 5.75 ? '(지지직…)' : pick(['람쥐썬더!!!', '찌리찌리!!', '람쥐썬더어어!!']), t: 0.8 };
    },
    end(s) { const r = s.r; r.z = 0; r.jit = 0; r.pose = null; },
    // 어두운 하늘 + 금 간 바닥 + 번개 (다람쥐는 어둠 위에 다시 그려서 돋보이게)
    // 금 간 바닥: 바닥 층에 그려서 쥐·물건·사람이 그 위에 올라서게 (game.js render 의 eng.ground)
    ground(s) {
      if (!(s.crackT > 0)) return;
      const r = s.r, im = IMG['art_ult:ground_crack'];
      ctx.save(); ctx.translate(r.x, r.y * TILT + 18); ctx.globalAlpha = 0.9;
      if (im) { const w = 330, h = w * im.height / im.width; ctx.drawImage(im, -w / 2, -h * 0.6, w, h); }
      else { ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; polyline(bolt(0, 0, Math.cos(a) * 150, Math.sin(a) * 70, 5, 12)); } }
      ctx.restore();
    },
    draw(s) {
      const r = s.r;
      if (s.dark > 0) { ctx.save(); ctx.globalAlpha = s.dark; ctx.fillStyle = '#141a2e'; ctx.fillRect(G.cam.x - 200, G.cam.y - 200, viewW() + 400, viewH() + 400); ctx.restore(); }
      if (s.crackT > 0) {
        // 양옆 번개 기둥 그림 (착지 뒤 잠깐)
        const pim = IMG['art_ult:bolt_pillar'];
        if (pim && s.t < 3.3) for (const dx of [-120, 120]) { const w = 150, h = w * pim.height / pim.width; ctx.save(); ctx.globalAlpha = clamp(3.3 - s.t, 0, 1) * (0.75 + Math.random() * 0.25); ctx.translate(r.x + dx, r.y * TILT + 10); ctx.scale(Math.random() < 0.5 ? -1 : 1, 1); ctx.drawImage(pim, -w / 2, -h, w, h); ctx.restore(); }
      }
      if (s.dark > 0.05) drawRat(r);                        // 어두워진 화면 위에 주인공만 다시 밝게
      for (const z of s.zaps) if (onScreen(z.x, z.y, 300)) drawSkyBolt(z);
    },
  },
  // 슈퍼 요리사 쥐 (늘 요리사를 타고 있음): 주변 물건을 전부 거대 냄비에 넣고 보글보글 → "완성!" 하는 순간 대폭발
  grandcuisine: {
    dur: 4.6,
    beats: [[0.1, s => ucap(s, '재료는 전부 넣어! 이랴!')], [1.9, s => ucap(s, '(보글보글… 이상한 냄새가 난다)', { size: 28 })], [3.3, s => ucap(s, '완성!! 대왕 치즈 요리!!', { size: 60, col: '#f0c878', y: 0.5, dur: 1 })]],
    start(s) {
      const r = s.r;
      s.pot = { x: r.x + r.face * 170, y: r.y + 10 }; confine(s.pot, 80, r.x, r.y, 0, null);
      s.ing = []; s.inN = 0;
      // 주변 물건 전부 (가까운 순으로 차례차례 날아 들어감)
      const list = itemsIn(s.pot.x, s.pot.y, ULT_R + 200).sort((a, b) => Math.hypot(a.x - s.pot.x, a.y - s.pot.y) - Math.hypot(b.x - s.pot.x, b.y - s.pot.y)).slice(0, 60);
      list.forEach((it, i) => { if (grabItem(s, it)) s.ing.push({ it, x0: it.x, y0: it.y, t0: 0.25 + i * (1.5 / Math.max(1, list.length)), h: rand(220, 360) }); });
      for (const h of humansNear(s.pot.x, s.pot.y, ULT_R)) { h.say = { text: pick(['내 주방 도구!!', '그건 재료가 아니야!', '위생 점검은?!']), t: 1.4 }; panic(h); }
    },
    step(s, dt) {
      const r = s.r, P = s.pot;
      r.face = P.x > r.x ? 1 : -1;
      r.pose = { front: 2.4 + Math.sin(G.t * 16) * 0.5, farFront: 2.0 + Math.cos(G.t * 16) * 0.5, head: -0.25, tail: 1.2, tilt: -0.15 };   // 국자 휘휘
      if (s.t < 3.3 && Math.random() < 0.3) r.say = { text: pick(['이랴!', '더 넣어!', '소금!', '봉주르~', '(휘적휘적)']), t: 0.4 };
      for (const g of s.ing) {
        const it = g.it; if (it.state !== 'held' || g.done) continue;
        const k = clamp((s.t - g.t0) / 0.55, 0, 1); if (k <= 0) continue;
        it.x = rLerp(g.x0, P.x + rand(-6, 6), k); it.y = rLerp(g.y0, P.y, k); it.z = Math.sin(k * Math.PI) * g.h + k * 110; it.rot += dt * 14;
        if (k >= 1) { g.done = true; it.inPot = true; s.inN++; if (onScreen(P.x, P.y)) { burst(P.x, P.y, 4, { colors: ['#f0c878', '#fff3bf'], min: 60, max: 180, s0: 3, s1: 6, z: 115 }); if (s.inN % 3 === 0) { popup(P.x, P.y, pick(['퐁당!', '풍덩!', '첨벙!']), '#fff', 18, 0.5, 140); Sfx.pop(); } } }
      }
      const fill = s.ing.length ? s.inN / s.ing.length : 1;
      if (s.t > 1.9 && s.t < 3.3) { if (Math.random() < 0.5) particle({ x: P.x + rand(-50, 50), y: P.y, z: 120, vx: rand(-20, 20), vy: 0, vz: rand(60, 120), life: 1, max: 1, size: rand(14, 24), color: 'rgba(250,247,240,', type: 'dust', drag: 1 }); addShake(0.01 + (s.t - 1.9) * 0.01); }
      s.fill = fill; s.hot = clamp((s.t - 1.9) / 1.4, 0, 1);
      if (s.t >= 3.3 && !s.boom) {
        // 완성 → 펑!! 재료 전부 치즈 폭죽으로 (보너스: 공중 콤보·크리티컬 취급)
        s.boom = true;
        G.quiet = true;
        for (const g of s.ing) { const it = g.it; if (it.state === 'dead') continue; it.inPot = false; it.state = 'rest'; it.x = P.x + rand(-40, 40); it.y = P.y + rand(-30, 30); it.z = 100; it.air = 4; it.crit = true; skillBlastItem(it, ultItemD(s) * 3, r, rand(0, 6.28), 420, 420); }   // 대폭발: 필살기 피해 ×3 (버틴 재료는 사방으로 튀어나감)
        G.quiet = false; G.items = G.items.filter(it => it.state !== 'dead'); s.items = [];
        shock(P.x, P.y, 420, ultD(s) * 1.5, r, '#f0c878', 3);
        for (const it of itemsIn(P.x, P.y, 420)) flingItem(s, it, Math.atan2(it.y - P.y, it.x - P.x), 620, 560);
        blastActorsIn(P.x, P.y, 420, 720, ultD(s) * 3, r);
        for (let i = 0; i < 40; i++) { const a = rand(0, 6.28), v = rand(150, 520); particle({ x: P.x, y: P.y, z: 110, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, vz: rand(300, 700), g: 1200, life: 1.2, max: 1.2, size: rand(6, 11), color: '#f2c94c', type: 'cheese', rot: rand(0, 6), vr: rand(-12, 12), drag: 1 }); }
        burst(P.x, P.y, 40, { colors: ['#f0c878', '#fff3bf', '#e39a5a', '#fff'], type: 'star', min: 300, max: 900, s0: 5, s1: 11, z: 120 });
        flash('#fff3bf', 0.6); addShake(0.55); Sfx.boom(1.6); Sfx.clear();
        popup(P.x, P.y, `재료 ${s.inN}개 대왕 치즈 요리!`, '#f0c878', 30, 1.6, 200);
      }
    },
    end(s) { for (const g of s.ing || []) if (g.it.inPot) g.it.inPot = false; },
    sorted(s) { return s.pot && !s.boom ? [{ y: s.pot.y, f: () => drawPot(s.pot.x, s.pot.y * TILT, s.fill || 0, s.t > 1.9 ? 1 + (s.t - 1.9) * 3 : 0, s.hot || 0) }] : []; },
  },
  // 찌릿 햄찌: 건전지 과충전 → 물건·사람 사이로 연쇄 번개 → 건전지 펑! 본인은 아프로 머리
  overcharge: {
    dur: 3.9,
    beats: [[0.1, s => ucap(s, '(건전지 충전 중… 1.5V)', { size: 28 })], [0.85, s => ucap(s, '찌이이이이릿!!!', { size: 56, col: '#f2c94c', y: 0.5, dur: 0.9 })], [3.05, s => ucap(s, '(건전지는 분리수거 해주세요)')]],
    start(s) { s.zaps = []; s.hitT = 0; },
    step(s, dt) {
      const r = s.r;
      if (s.t < 0.8) { r.jit = 2 + s.t * 4; r.pose = { head: -0.2, front: 0.6, farFront: 0.5, tail: 1.2, tilt: -0.1 }; if (Math.random() < 0.6) particle({ x: r.x + rand(-20, 20), y: r.y, z: rand(10, 40), vx: rand(-80, 80), vy: rand(-40, 40), vz: 120, life: 0.25, max: 0.25, size: 4, color: '#f2c94c', type: 'spark', drag: 2 }); return; }
      r.jit = 1.5;
      if (s.t < 3) {
        r.pose = { ...POSE_UP, front: 2.6 + Math.sin(G.t * 30) * 0.2, farFront: 2.2 };
        ultWalk(s, dt, 70);
        if ((s.hitT -= dt) <= 0) {
          // 한 번에 최대 6번 튀는 연쇄 번개 (물건 · 사람 · 고양이 · 보스)
          s.hitT = 0.16;
          let cx = r.x, cy = r.y - 20, used = new Set();
          const pts = [[cx, cy * TILT - 30]];
          for (let hop = 0; hop < 6; hop++) {
            let best = null, bd = 340;
            for (const it of itemsIn(cx, cy, 340)) { if (used.has(it)) continue; const d = Math.hypot(it.x - cx, it.y - cy); if (d < bd) { bd = d; best = it; } }
            for (const h of G.humans) { if (used.has(h) || h.held || h.state === 'fly' || h.state === 'dead') continue; const d = Math.hypot(h.x - cx, h.y - cy); if (d < bd) { bd = d; best = h; } }
            if (!best) break;
            used.add(best); cx = best.x; cy = best.y;
            pts.push([cx, cy * TILT - (best.k ? 80 : 14)]);
            if (best.k) { if (best.boss) damageHuman(best, ultD(s) * 0.6, r, 0); else { best.jit = 6; damageHuman(best, best.hpMax * 0.45, r, rand(0, 6.28)); } if (onScreen(cx, cy) && Math.random() < 0.4) popup(cx, cy, pick(['찌릿!', '지지직!', '(뼈가 보임)']), '#f2c94c', 18, 0.6, 120); }
            else { damageItem(best, ultD(s) * 0.35, r, false, rand(0, 6.28)); best.flashT = 0.12; }
          }
          if (G.cat && G.cat.state !== 'flung' && G.cat.state !== 'leave' && Math.hypot(G.cat.x - r.x, G.cat.y - r.y) < 360) { damageCat(G.cat, ultD(s) * 0.4, rand(0, 6.28), r); pts.push([G.cat.x, G.cat.y * TILT - 30]); }
          if (pts.length > 1) { s.zaps.push({ pts: pts.flatMap((p, i) => (i ? zapPath(pts[i - 1][0], pts[i - 1][1], p[0], p[1]).slice(1) : [p])), t: 0.14 }); Sfx.laser(); if (onScreen(r.x, r.y)) addShake(0.04); }
          // 쥐들은 찌릿해서 폴짝 (다치진 않음)
          for (const o of ratsNear(s, r.x, r.y, 200)) if (Math.random() < 0.3) { o.vz = 260; o.sq = 0.6; }
        }
      } else if (!s.boom) {
        // 건전지 펑!
        s.boom = true; r.jit = 0;
        shock(r.x, r.y, 320, ultD(s) * 1.2, r, '#f2c94c', 3);
        for (const it of itemsIn(r.x, r.y, 320)) flingItem(s, it, Math.atan2(it.y - r.y, it.x - r.x), 560, 520);
        blastActorsIn(r.x, r.y, 320, 640, ultD(s) * 2, r);
        flash('#fff3bf', 0.6); addShake(0.5); Sfx.boom(1.4);
        for (let i = 0; i < 16; i++) { const a = rand(0, 6.28); particle({ x: r.x, y: r.y, z: 40, vx: Math.cos(a) * rand(60, 200), vy: Math.sin(a) * rand(40, 120), vz: rand(40, 140), life: rand(0.8, 1.4), max: 1.4, size: rand(14, 24), color: 'rgba(70,64,60,', type: 'dust', drag: 2 }); }
        r.say = { text: '…(지지직)', t: 1.2 };
      }
      if (s.boom) r.pose = { head: 0.3, front: 0.2, farFront: 0.1, tail: -0.4, tilt: 0.1, sy: 0.9 };
      s.zaps = s.zaps.filter(z => (z.t -= dt) > 0);
    },
    end(s) { s.r.jit = 0; },
    draw(s) {
      const r = s.r;
      for (const z of s.zaps) drawZap(z.pts, '#f2c94c', 7);
      if (s.t < 3 || !s.boom) { ctx.save(); ctx.translate(r.x + r.face * -6, r.y * TILT - r.z - 44); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(G.t * 40); ultArt(ctx, 'battery', 34) || (ctx.fillStyle = '#f2c94c', rr(ctx, -16, -12, 32, 14, 4), ctx.fill()); ctx.restore(); }
      if (s.boom) {
        // 까맣게 탄 아프로 머리
        ctx.save(); ctx.translate(r.x - r.face * 14, r.y * TILT - r.z - 40); ctx.fillStyle = '#3d3a36';
        for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; circ(ctx, Math.cos(a) * 16, Math.sin(a) * 12, 11); ctx.fill(); }
        circ(ctx, 0, 0, 16); ctx.fill(); ctx.restore();
      }
    },
  },
  // 쥐랜드 관광쥐: 물건·사람에 하트 풍선을 달아 둥실둥실 퍼레이드 → 풍선이 펑펑 터지며 와르르
  balloonparade: {
    dur: 4.3,
    beats: [[0.1, s => ucap(s, '🎵 꿈과 치즈의 나라로~ 🎵')], [1.4, s => ucap(s, '(풍선 하나 5만 원)', { size: 28 })], [2.9, s => ucap(s, '펑! 펑! 펑!', { size: 56, col: '#f2b8b0', y: 0.5, dur: 0.9 })]],
    start(s) {
      const r = s.r; s.fl = [];
      for (const it of itemsIn(r.x, r.y, ULT_R).slice(0, 16)) if (grabItem(s, it)) s.fl.push({ o: it, x0: it.x, y0: it.y, ph: rand(0, 6.28), h: rand(80, 140), d: rand(0, 0.6) });
      for (const h of humansNear(r.x, r.y, ULT_R).slice(0, 6)) if (holdHuman(s, h)) s.fl.push({ o: h, human: true, x0: h.x, y0: h.y, ph: rand(0, 6.28), h: rand(60, 100), d: rand(0, 0.4) });
    },
    step(s, dt) {
      const r = s.r;
      ultWalk(s, dt, 90);
      r.pose = { front: 2.2 + Math.sin(G.t * 8) * 0.4, farFront: 0.4, head: Math.sin(G.t * 8) * 0.15, tail: 1 };
      for (const o of ratsNear(s, r.x, r.y, 400)) o.frenzy = Math.max(o.frenzy, 1);
      for (const f of s.fl) {
        const o = f.o;
        if (s.t < 2.9) {
          const e = sjEase(clamp((s.t - 0.2 - f.d) / 1.2, 0, 1));
          o.x = f.x0 + Math.sin(G.t * 1.6 + f.ph) * 30 * e; o.y = f.y0 + Math.cos(G.t * 1.3 + f.ph) * 10 * e; o.z = f.h * e + Math.sin(G.t * 3 + f.ph) * 8;
          if (f.human) { o.state = 'panic'; o.walk += dt * 12; if (!o.say && Math.random() < dt * 0.6) o.say = { text: pick(['내려줘어~!', '어어어?!', '무서워!!']), t: 1 }; }
        } else if (!f.popped && s.t > 2.9 + f.d * 0.8) {
          // 풍선 펑 → 떨어짐
          f.popped = true;
          if (onScreen(o.x, o.y)) { burst(o.x, o.y, 8, { colors: ['#f2b8b0', '#fff'], type: 'star', min: 120, max: 300, s0: 3, s1: 6, z: o.z + 60 }); popup(o.x, o.y, '펑!', '#fff', 18, 0.5, o.z + 70); Sfx.pop(); }
          if (f.human) { o.held = false; s.humans = s.humans.filter(h => h !== o); o.hp -= ultD(s) * 0.5; o.survive = o.hp > 0; launchHuman(o, rand(0, 6.28), 120, 'flail'); o.vz = -60; }   // 풍선 펑: 피해만큼 (버티면 착지 후 다시 도망)
          else if (o.state === 'held') dropItem(s, o, rand(-80, 80), rand(-60, 60), -80);
        }
      }
    },
    end(s) { parodyRelease(s); },
    // 잘 보이게: 물건마다 색색 풍선 3개 묶음 + 반짝이, 땅엔 그림자, 떠 있는 물건은 하얗게 빛남
    draw(s) {
      if (s.t > 3.8) return;
      const HUES = [0, 45, 190, 120, 280];
      for (const f of s.fl) {
        if (f.popped) continue;
        const o = f.o, top = o.y * TILT - o.z - (f.human ? HUMAN_H * 0.9 : o.r * 1.8), sw = Math.sin(G.t * 2 + f.ph);
        ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#f2b8b0'; ctx.beginPath(); ctx.ellipse(o.x, o.y * TILT, (f.human ? 40 : o.r) * 1.2, 10, 0, 0, 6.28); ctx.fill(); ctx.restore();
        for (let b = 0; b < 3; b++) {
          const bx = o.x + (b - 1) * 26 + sw * 10, by = top - 70 - (b === 1 ? 20 : 0);
          ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.x, top); ctx.quadraticCurveTo((o.x + bx) / 2 + 6, top - 30, bx, by + 6); ctx.stroke();
          ctx.translate(bx, by + 30); ctx.rotate(sw * 0.15 + (b - 1) * 0.2);
          ctx.filter = `hue-rotate(${HUES[(b + Math.floor(f.ph * 3)) % HUES.length]}deg) saturate(1.3)`;
          if (!ultArt(ctx, 'balloon', 58)) { ctx.fillStyle = '#f2b8b0'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-28, -20, -24, -52, 0, -36); ctx.bezierCurveTo(24, -52, 28, -20, 0, 0); ctx.fill(); }
          ctx.restore();
        }
        if (Math.random() < 0.15) particle({ x: o.x + rand(-30, 30), y: o.y, z: o.z + rand(40, 120), vx: 0, vy: 0, vz: 30, life: 0.5, max: 0.5, size: 5, color: '#fff3bf', type: 'star', rot: 0, vr: 3, drag: 1 });
      }
    },
    // 화면: 위쪽 만국기 장식 + 색종이 비 + 살짝 파스텔 톤
    ui(s, k) {
      const a = Math.min(1, s.t / 0.3) * (k > 0.9 ? (1 - k) / 0.1 : 1);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(242,184,176,.12)'; ctx.fillRect(0, 0, W, H);
      const COLS = ['#e8786a', '#f0c878', '#9dd5a8', '#a9d3dc', '#cdb4db', '#f2b8b0'];
      for (let row = 0; row < 2; row++) {
        const y0 = 140 + row * 26; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, y0); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y0 + Math.sin(x / W * Math.PI) * 30); ctx.stroke();
        for (let x = 20 + row * 20; x < W; x += 40) { const y = y0 + Math.sin(x / W * Math.PI) * 30; ctx.fillStyle = COLS[(x / 40 + row) % COLS.length | 0]; ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x + 14, y); ctx.lineTo(x, y + 26 + Math.sin(G.t * 4 + x) * 3); ctx.fill(); }
      }
      s.conf = s.conf || [];
      for (let i = 0; i < 4; i++) s.conf.push({ x: rand(0, W), y: -10, vy: rand(80, 180), vx: rand(-30, 30), r: rand(0, 6), c: COLS[(Math.random() * COLS.length) | 0], w: rand(6, 11) });
      for (const c of s.conf) { c.y += c.vy / 60; c.x += c.vx / 60; c.r += 0.15; ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-c.w / 2, -c.w / 4, c.w, c.w / 2 * Math.abs(Math.cos(c.r))); ctx.restore(); }
      s.conf = s.conf.filter(c => c.y < H + 20).slice(-260);
      ctx.restore();
    },
  },
  // 역병 석궁쥐: 투명해져서 킥킥 숨어 다니다가 → 석궁 난사 (초록 화살 + 역병 웅덩이)
  plaguespray: {
    dur: 4.2,
    beats: [[0.1, s => ucap(s, '(어디선가 킥킥 소리가 들린다…)', { size: 28 })], [1.1, s => ucap(s, '킥킥킥… 쏜다!!', { size: 52, col: '#9dbb8f', y: 0.5, dur: 0.8 })], [3.5, s => ucap(s, '(역병은 친환경 퇴비입니다)')]],
    start(s) { s.bolts = []; s.pools = []; s.hitT = 0; s.r.ghost = true; },
    step(s, dt) {
      const r = s.r;
      if (s.t < 1.1) {
        ultWalk(s, dt, 160);                                  // 투명해져서 살금살금
        r.pose = { head: 0.25, headX: -2, front: 0.4, tilt: 0.12, tail: 0.3, sy: 0.9 };
        if (Math.random() < dt * 3 && onScreen(r.x, r.y)) popup(r.x + rand(-40, 40), r.y, '킥킥', '#9dbb8f', 16, 0.6, 50);
        return;
      }
      r.ghost = false;
      if (s.t < 3.4) {
        // 석궁 난사: 가장 물건이 많은 쪽으로 부채꼴 연사
        if (!s.aim || Math.random() < dt * 2) s.aim = aimMost(r, 700);
        r.face = Math.cos(s.aim) >= 0 ? 1 : -1;
        r.pose = { front: 1.6 + Math.sin(G.t * 40) * 0.15, farFront: 1.4, head: -0.1, tail: 0.9, tilt: -0.15 };
        if ((s.hitT -= dt) <= 0) {
          s.hitT = 0.045;
          const a = s.aim + rand(-0.75, 0.75), sp = rand(850, 1000);
          s.bolts.push({ x: r.x + Math.cos(a) * 20, y: r.y + Math.sin(a) * 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a, t: 0.55, hit: new Set() });
          if (Math.random() < 0.4) Sfx.clink();
        }
      }
      for (const b of s.bolts) {
        const px = b.x, py = b.y; b.x += b.vx * dt; b.y += b.vy * dt; b.t -= dt;
        const o = { x: b.x, y: b.y, vx: b.vx, vy: b.vy }; if (confine(o, 4, px, py, 0, null)) b.t = 0;
        for (const it of itemsIn(b.x, b.y, 18)) if (!b.hit.has(it)) { b.hit.add(it); damageItem(it, ultD(s) * 0.18, r, false, b.a); }
        for (const h of G.humans) if (!b.hit.has(h) && !h.held && Math.hypot(h.x - b.x, h.y - b.y) < h.r + 8) { b.hit.add(h); damageHuman(h, h.boss ? ultD(s) * 0.25 : h.hpMax * 0.3, r, b.a); b.t = 0; }
        if (G.cat && !b.hit.has(G.cat) && Math.hypot(G.cat.x - b.x, G.cat.y - b.y) < CAT_R + 8) { b.hit.add(G.cat); damageCat(G.cat, ultD(s) * 0.2, b.a, r); b.t = 0; }
        if (b.t <= 0) {
          // 떨어진 자리에 초록 웅덩이 (잠깐 동안 주변을 조금씩 갉음)
          if (Math.random() < 0.35) { s.pools.push({ x: b.x, y: b.y, t: 1.4 }); stampAt(b.x, b.y, m => { m.fillStyle = 'rgba(157,187,143,.45)'; m.beginPath(); m.ellipse(b.x, b.y, rand(20, 34), rand(12, 22), rand(0, 3), 0, 6.28); m.fill(); }); }
        }
      }
      s.bolts = s.bolts.filter(b => b.t > 0);
      for (const p of s.pools) { p.t -= dt; if ((p.tick = (p.tick || 0) - dt) <= 0) { p.tick = 0.3; aoe(p.x, p.y, 40, ultD(s) * 0.05, r); if (onScreen(p.x, p.y) && Math.random() < 0.3) particle({ x: p.x + rand(-12, 12), y: p.y, z: 4, vx: 0, vy: 0, vz: 60, life: 0.5, max: 0.5, size: 5, color: '#9dbb8f', type: 'spark', drag: 1 }); } }
      s.pools = s.pools.filter(p => p.t > 0);
      if (s.t > 3.4) r.pose = { head: -0.3, front: 2, farFront: 0.3, tail: 1.2 };
    },
    end(s) { s.r.ghost = false; },
    draw(s) {
      for (const b of s.bolts) {
        ctx.save(); ctx.translate(b.x, b.y * TILT - 18); ctx.rotate(Math.atan2(b.vy * TILT, b.vx));
        if (!ultArt(ctx, 'bolt', 34)) { ctx.strokeStyle = '#6f8f6a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(14, 0); ctx.stroke(); ctx.fillStyle = '#9dbb8f'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(10, -5); ctx.lineTo(10, 5); ctx.fill(); }
        ctx.restore();
      }
    },
  },
  // 스트리머 쥐 (괴물쥐 패러디): 방송 중 "쥐커드 해주세요!!" 도네 → 안경 번쩍 → 쌍권총 쥐커드 제노사이드 우다다다
  // → 도네가 들어올 때마다 한 번 더(앵콜 탄막) → 마지막 "리마스터" 큰 도네에 360° 탄막 3연발 + 도네 상자 폭격
  livestream: {
    dur: 6.4,
    beats: [
      [0.05, s => ucap(s, '🔴 LIVE · 흐에~ 방송 중~')],
      [0.4, s => { donate(s, pick(DONORS), 1000, pick(['쥐커드 해주세요!!', '이이잉~~ 쥐커드!!', '믿고 있었다구!! 쥐커드!!'])); ucap(s, '(아 진짜요…?)', { col: '#fff3bf' }); }],
      [1.1, s => { s.glint = 1.6; ucap(s, '쥐커드 제노사이드!!!', { size: 64, col: '#cdb4db', y: 0.45, dur: 1.2 }); Sfx.comboWord(); }],
      [4.6, s => { donate(s, '큰손 햄찌', 2750000, '쥐커드 리마스터 해줘!!!', true); ucap(s, '쥐커드 리마스터!!!!', { size: 70, col: '#f2c14e', y: 0.45, dur: 1.3 }); }],
    ],
    start(s) { s.gifts = []; s.chat = []; s.alerts = []; s.chatT = 0; s.fireT = 0; s.donT = 1.6; s.enc = 0; s.glint = 0; s.ang = rand(0, 6.28); s.rings = 0; },
    step(s, dt) {
      const r = s.r, t = s.t, firing = t > 1.1 && t < 4.5, remaster = t >= 4.7;
      s.glint = Math.max(0, s.glint - dt * 1.5);
      // 자세 (옆모습 리그): 도네 읽을 땐 머뭇머뭇 → 쌍권총 치켜들고 안경 번쩍 → 트리플 악셀 난사 (빠르게 미끄러지며 점프마다 3바퀴)
      s.recoil = Math.max(0, (s.recoil || 0) - dt * 14);
      const GUNS = { prop: '🔫', prop2: '🔫', propSize: 17 };
      if (t < 1.1) r.pose = { head: Math.sin(t * 3) * 0.1, front: 0.3, farFront: 0.2, tail: 0.4, tilt: 0.05, glint: s.glint };
      else if (t < 1.6) {
        // 쥐커드 제노사이드!!! 폼: 두 권총을 얼굴 옆으로 번쩍, 몸 뒤로 젖힘
        const k = clamp((t - 1.1) / 0.15, 0, 1);
        r.pose = { ...GUNS, front: rLerp(0.3, 2.5, k), farFront: rLerp(0.2, 2.2, k), propRot: 1.3 * k, propRot2: 1.1 * k, head: -0.3 * k, tail: 1.2, tilt: -0.12 * k, glint: s.glint };
        r.face = 1; r.jit = 0;
      } else if (t < 4.5 || t >= 4.7 && t < 6.05) {
        // 트리플 악셀 난사: 얼음 위처럼 직선으로 쭉 미끄러지다가 점프 → 공중에서 세로축 3바퀴(가로 배율 cos) → 착지하며 방향 전환
        // 두 앞발은 앞·뒤로 쫙 벌려 권총 두 자루가 몸과 같이 돌며 나선 탄막 (총알 방향 = spin, spin+π)
        const hopT = remaster ? 0.42 : 0.55;
        s.hop = (s.hop || 0) + dt / hopT; s.spin = (s.spin || 0) + dt * 6 * Math.PI / hopT;     // 한 점프에 3바퀴
        const ph = s.hop % 1, n = Math.floor(s.hop);
        if (n !== s.hopN) {
          // 착지: 쓱 방향 전환 (주변 물건 쪽으로, 없으면 아무 데나) + 얼음 가루
          s.hopN = n;
          const it = pick(itemsIn(r.x, r.y, 450)); s.dir = it && Math.random() < 0.7 ? Math.atan2(it.y - r.y, it.x - r.x) + rand(-0.3, 0.3) : rand(0, 6.28);
          if (onScreen(r.x, r.y)) { burst(r.x, r.y, 6, { colors: ['#ffffff', '#dfefff'], min: 60, max: 160, type: 'dust', s0: 3, s1: 6, z: 2 }); Sfx.jump(); }
        }
        const spd = remaster ? 640 : 480, px = r.x, py = r.y;
        r.vx = Math.cos(s.dir ?? 0) * spd; r.vy = Math.sin(s.dir ?? 0) * spd;
        r.x += r.vx * dt; r.y += r.vy * dt;
        if (confine(r, ratR(r), px, py, 1)) s.dir = Math.atan2(r.vy, r.vx);                     // 벽에 닿으면 튕겨서 계속
        r.z = Math.sin(ph * Math.PI) * (remaster ? 75 : 45);
        if (onScreen(r.x, r.y) && Math.random() < 0.6) particle({ x: r.x, y: r.y, z: 1, vx: -r.vx * 0.1, vy: -r.vy * 0.1, vz: 0, life: 0.35, max: 0.35, size: rand(3, 5), color: 'rgba(230,240,250,', type: 'dust', drag: 3 });   // 스케이트 자국
        const rc = s.recoil * 0.2, air = Math.sin(ph * Math.PI);
        r.pose = { ...GUNS, spinX: Math.cos(s.spin), front: 1.55 + rc, farFront: -1.55 - rc, propRot: -0.8, propRot2: -2.35,
          back: -0.3 - 0.5 * air, farBack: 0.2 + 0.5 * air, tail: 1.2 + 0.3 * air, head: -0.12, glint: 0.5 };
        r.face = 1; r.jit = 0.2;
      } else if (t < 4.7) {
        // 리마스터 직전: 착지해서 권총 빙글빙글 돌리기
        r.z = Math.max(0, (r.z || 0) - dt * 500);
        r.pose = { ...GUNS, front: 2.5, farFront: 2.2, propRot: t * 40, propRot2: -t * 40, head: -0.25, tail: 1.1, glint: 0.6 }; r.face = 1;
      }
      else { const b = Math.min(1, (t - 6.05) / 0.15); r.pose = { ...GUNS, head: 0.45 * b, front: rLerp(1.5, 0.6, b), farFront: rLerp(1.5, 1.9, b), tilt: 0.25 * b, tail: 0.9, glint: 0.35 }; r.face = 1; r.z = 0; r.jit = 0; }   // 후원 감사합니다~ (꾸벅)
      if (!r.say || r.say.t < 0.2) r.say = { text: t < 1.1 ? pick(['아 진짜요…?', '하… 도네가 왔으니까…', '흐에~']) : remaster ? pick(['리마스터 들어갑니다!!', '우다다다다다!!']) : pick(['우다다다다!!', '두두두두두!!', '쥐커드!!', '타타타타!!']), t: 0.8 };
      // 채팅창
      if ((s.chatT -= dt) <= 0) {
        s.chatT = rand(0.06, 0.16);
        s.chat.push({ n: pick(['치즈러버', '쥐구멍', '찍찍이', '하수구왕', '햄찌팬', '고양이싫어', '안경쥐팬']), m: pick(firing || remaster ? ['ㅋㅋㅋㅋㅋㅋ', '쥐커드!!!', '우다다다 ㅋㅋ', '레전드의 시작', '1000원에 이게 되네', '리마스터 ㄱㄱ', '안경 번쩍 ㅋㅋ', '또 해줘', '모션 짜치네 ㅋㅋ', '이걸 해주네'] : ['쥐커드 ㄱㄱ', '쥐커드 해줘', '도네 쐈다', '??', '흐에~']), c: pick(['#f2c14e', '#9dd5a8', '#a9d3dc', '#f2b8b0', '#cdb4db']) });
        if (s.chat.length > 9) s.chat.shift();
      }
      // 쌍권총 난사: 앞뒤 두 줄기가 빙글빙글 돌며 (쥐 공격력 × 2 / 발)
      const dmg = ratDamage(r) * 2;
      if ((firing && t >= 1.6 || remaster && t < 6.05) && (s.fireT -= dt) <= 0) {
        s.fireT = remaster ? 0.035 : 0.05; s.recoil = 1; s.shot = (s.shot || 0) + 1;
        const sc = RAT_SCALE * TIERS[r.tier].size, vis = onScreen(r.x, r.y);
        // 두 자루: 가까운 총·먼 총이 번갈아, 총구 방향 ± 흔들림 (리마스터는 360°)
        for (const [g, off] of [[0, 0], [1, Math.PI]]) {
          const a = (s.spin || 0) + off + rand(-0.05, 0.05), ux = Math.cos(a), uy = Math.sin(a);      // 양팔 방향 = 회전 각도 (나선 탄막)
          const mx = r.x + ux * 24 * sc, my = r.y + uy * 10, mz = 22 * sc + (r.z || 0);
          s.flashes = s.flashes || []; s.flashes.push({ x: mx, y: my, z: mz, a, t: 0.05 });
          G.bullets.push({ x: mx, y: my, vx: ux * 1300, vy: uy * 1300, life: 0.55, dmg, by: r, actors: true });
          if (vis) {
            particle({ x: mx + ux * 8, y: my, z: mz, vx: ux * 80, vy: uy * 40, vz: 0, life: 0.06, max: 0.06, size: 16 + Math.random() * 6, color: '#fff3bf', type: 'star', drag: 0 });   // 총구 섬광
            particle({ x: mx + ux * 4, y: my, z: mz, vx: 0, vy: 0, vz: 0, life: 0.05, max: 0.05, size: 9, color: '#ffffff', type: 'spark', drag: 0 });
            if (Math.random() < 0.25) particle({ x: mx, y: my, z: mz + 4, vx: ux * 40 + rand(-20, 20), vy: 0, vz: rand(30, 70), life: 0.6, max: 0.6, size: rand(5, 9), color: 'rgba(230,226,220,', type: 'dust', drag: 2 });   // 총구 연기
          }
          particle({ x: r.x - r.face * 6, y: r.y, z: 22 * sc, vx: -r.face * rand(80, 180), vy: rand(-40, 40), vz: rand(200, 320), g: 1200, life: 0.7, max: 0.7, size: 3, color: '#e6b35a', type: 'spark', drag: 0.3 });   // 탄피
        }
        if (vis) { if (s.shot % 2 === 0) Sfx.clink(); if (s.shot % 3 === 0) Sfx.knock(); if (s.shot % 9 === 0) popup(r.x + r.face * 50, r.y, pick(['탕!', '타타탕!', '두두두!', '우다다다!']), '#fff3bf', 18, 0.45, 60); addShake(0.012); }
      }
      // 도네가 계속 들어옴 → 앵콜: 그 자리에 도네 상자 + 탄막 한 바퀴
      if (firing && (s.donT -= dt) <= 0) {
        s.donT = rand(0.55, 0.85); s.enc++;
        donate(s, pick(DONORS), pick([1000, 1000, 5000, 10000, 50000]), pick(DONATE_MSGS));
        const tt = pick(itemsIn(r.x, r.y, 700)); if (tt) s.gifts.push({ x: tt.x, y: tt.y, z: rand(700, 900), vz: -1000, rot: rand(-0.5, 0.5) });
        for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28 + s.enc; G.bullets.push({ x: r.x, y: r.y, vx: Math.cos(a) * 1100, vy: Math.sin(a) * 1100, life: 0.5, dmg, by: r, actors: true }); }
      }
      // 리마스터: 360° 탄막 3연발
      if (remaster && s.rings < 3 && t > 4.7 + s.rings * 0.35) {
        s.rings++;
        for (let k = 0; k < 36; k++) { const a = k / 36 * 6.28 + s.rings * 0.09; G.bullets.push({ x: r.x, y: r.y, vx: Math.cos(a) * 1300, vy: Math.sin(a) * 1300, life: 0.65, dmg: dmg * 1.5, by: r, actors: true }); }
        if (onScreen(r.x, r.y)) { ring(r.x, r.y, 200 + s.rings * 80, '#f2c14e', 0.4, 8); addShake(0.25); Sfx.boom(0.9); flash('#fff3bf', 0.12); }
        for (let k = 0; k < 4; k++) { const tt = pick(itemsIn(r.x, r.y, 800)); if (tt) s.gifts.push({ x: tt.x, y: tt.y, z: rand(700, 1000), vz: -1100, rot: rand(-0.5, 0.5) }); }
      }
      // 떨어진 도네 상자: 쾅 (필살기 피해 공식)
      for (const g of s.gifts) {
        g.z += g.vz * dt; g.rot += dt * 3;
        if (g.z <= 0 && !g.done) {
          g.done = true;
          shock(g.x, g.y, 130, ultD(s) * 0.4, r, '#cdb4db', 1);
          for (const it of itemsIn(g.x, g.y, 130)) flingItem(s, it, Math.atan2(it.y - g.y, it.x - g.x), 420, 420);
          blastActorsIn(g.x, g.y, 120, 520, ultD(s) * 0.5, r);
          if (onScreen(g.x, g.y)) burst(g.x, g.y, 10, { colors: ['#f2c14e', '#cdb4db', '#fff'], type: 'star', min: 150, max: 380, s0: 3, s1: 7, z: 20 });
        }
      }
      s.gifts = s.gifts.filter(g => !g.done);
      for (const a of s.alerts) a.t -= dt; s.alerts = s.alerts.filter(a => a.t > 0);
      // 시청자(쥐)들 들썩들썩
      for (const o of ratsNear(s, r.x, r.y, 600)) { o.frenzy = Math.max(o.frenzy, 1); if (o.z <= 0 && Math.random() < dt * 2) o.vz = 240; }
      if (t > 6.1 && !s.shout) { s.shout = true; r.say = { text: '흐에~ 후원 감사합니다~', t: 1.5 }; r.jit = 0; }
    },
    draw(s) {
      const r = s.r, mim = IMG['art_ult:muzzle'];
      if (s.spin && s.t >= 1.6 && s.t < 6.05 && onScreen(r.x, r.y)) {
        // 회전 궤적 (흰 호 두 줄)
        ctx.save(); ctx.strokeStyle = 'rgba(255,243,191,.45)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (const off of [0, Math.PI]) { ctx.beginPath(); ctx.ellipse(r.x, r.y * TILT - 22 - (r.z || 0), 46, 20, 0, s.spin + off - 1.2, s.spin + off); ctx.stroke(); }
        ctx.restore();
      }
      for (const f of s.flashes || []) {
        f.t -= 1 / 60; if (f.t <= 0) continue;
        ctx.save(); ctx.translate(f.x, f.y * TILT - f.z); ctx.rotate(Math.atan2(Math.sin(f.a) * TILT, Math.cos(f.a))); ctx.globalAlpha = Math.min(1, f.t * 25);
        if (mim) { const w = 24 + Math.random() * 8, h = w * mim.height / mim.width; ctx.scale(-1, 1); ctx.drawImage(mim, -w, -h / 2, w, h); }   // 그림은 왼쪽을 향함 → 뒤집어서 총구 방향으로 else { ctx.fillStyle = '#fff3bf'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(34, 0); ctx.lineTo(0, 8); ctx.fill(); }
        ctx.restore();
      }
      s.flashes = (s.flashes || []).filter(f => f.t > 0);
      for (const g of s.gifts) {
        ctx.save(); ctx.fillStyle = 'rgba(30,15,5,.18)'; ctx.beginPath(); ctx.ellipse(g.x, g.y * TILT, 18, 7, 0, 0, 6.28); ctx.fill();
        ctx.translate(g.x, g.y * TILT - g.z); ctx.rotate(g.rot);
        if (!ultArt(ctx, 'donation', 38)) { ctx.fillStyle = '#cdb4db'; rr(ctx, -14, -26, 28, 26, 4); ctx.fill(); ctx.fillStyle = '#f2c14e'; ctx.fillRect(-3, -26, 6, 26); }
        ctx.restore();
      }
    },
    // 방송 화면처럼: 오른쪽 채팅창 + 가운데 위 후원 알림 + 🔴 LIVE
    ui(s) {
      const x = W - 300, y = 210, w = 270, h = 300;
      ctx.save();
      const im = IMG['art_ult:chat'];
      if (im) { ctx.globalAlpha = 0.9; ctx.drawImage(im, x - 10, y - 30, w + 20, h + 50); ctx.globalAlpha = 1; }
      rr(ctx, x, y, w, h, 14); ctx.fillStyle = 'rgba(40,30,52,.78)'; ctx.fill();
      ctx.font = "700 15px 'IBM Plex Sans KR', sans-serif"; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e8786a'; ctx.fillText('● LIVE', x + 14, y + 20); ctx.fillStyle = '#fff'; ctx.fillText(`시청자 ${Math.floor(1200 + s.t * 900 + (s.enc || 0) * 350).toLocaleString()}명`, x + 90, y + 20);
      s.chat.forEach((c, i) => { const yy = y + 50 + i * 27; ctx.fillStyle = c.c; ctx.fillText(c.n, x + 14, yy); ctx.fillStyle = '#fff'; ctx.fillText(c.m, x + 14 + ctx.measureText(c.n).width + 8, yy); });
      // 후원 알림: 왼쪽 카드 (가운데는 쥐커드 액션 자리라 비워 둠. 큰 도네는 금색 크게)
      s.alerts.forEach((a, i) => {
        const k = Math.min(1, a.t * 3), aw = a.big ? 380 : 330, ah = a.big ? 62 : 52, ax = 24 + aw / 2 - (1 - k) * 60, ay = 290 + i * 66;
        ctx.globalAlpha = k; rr(ctx, ax - aw / 2, ay - ah / 2, aw, ah, 12); ctx.fillStyle = a.big ? 'rgba(90,64,20,.9)' : 'rgba(52,38,68,.88)'; ctx.fill();
        ctx.textAlign = 'center'; ctx.font = `700 ${a.big ? 19 : 15}px 'IBM Plex Sans KR', sans-serif`; ctx.fillStyle = a.big ? '#f2c14e' : '#fff3bf'; ctx.fillText(`🧀 ${a.who}님 치즈 ${a.amt.toLocaleString()}개 후원!`, ax, ay - ah * 0.18);
        ctx.font = "600 13px 'IBM Plex Sans KR', sans-serif"; ctx.fillStyle = '#fff'; ctx.fillText(`"${a.msg}"`, ax, ay + ah * 0.24);
      });
      ctx.restore();
    },
  },
});
