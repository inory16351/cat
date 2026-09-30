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

// 피아노 소리 흉내 (광시곡 느낌의 아르페지오·화음). 반음 n → 주파수
const jwHz = n => 261.63 * Math.pow(2, n / 12);
function jwArp(fast) { const base = pick([-5, -3, 0, 2]); for (let i = 0; i < 4; i++) Sfx.note(jwHz(base + [0, 4, 7, 12][i] + (fast ? 12 : 0)), 0.18, 0.07, i * (fast ? 0.04 : 0.07)); }
function jwChord(k) { for (const n of [-12, 0, 3, 7, 12]) Sfx.note(jwHz(n - k), 0.9, 0.09); }
Object.assign(ULT_ENG, {
  // 줴리 — 톰과 제리 〈피아노 콘서트(The Cat Concerto, 1947)〉 패러디. 원작의 유명한 장면만 순서대로, 크게, 자막(해설)으로 또렷하게:
  //  ① 막이 열리고 턱시도 고양이가 정중히 인사 → 손가락 풀고 연주
  //  ② 피아노 속에서 자던 쥐가 건반 칠 때마다 통통 튐 → 잠 깨서 화남
  //  ③ 쥐가 뚜껑을 쾅 → 고양이 발 끼임
  //  ④ 쇼는 계속된다: 필사의 피날레 화음 ×3 (메인 피해) → 고양이 탈진
  //  ⑤ 스포트라이트가 쥐에게 → 쥐가 좌우 객석에 번갈아 90도 인사, 박수 독차지 (공연 카드 연주자 이름도 바꿔치기)
  //  ⑥ 고양이 조용히 퇴장 → 옛날 만화식 아이리스 아웃(동그라미가 쥐 얼굴로 좁혀짐)
  // 원작 캐릭터 디자인은 베끼지 않음: 고양이 = 게임 턱시도 고양이, 쥐 = 줴리. 무대 소품 = gen_front_rig.mjs --set jwc
  thankyou: {
    dur: 9.2,
    pre(s) { s.title = '🎹 피아노 콘서트'; },
    beats: [
      [0.05, s => ucap(s, '(고양이의 피아노 독주회)', { size: 32 })],
      [0.9, s => ucap(s, '(정중하게 인사하고 착석)', { size: 30 })],
      [1.6, s => ucap(s, '(손가락 풀기)', { size: 30 })],
      [2.1, s => ucap(s, '(피아노 속에서 자던 쥐가… 통통 튄다)', { size: 30 })],
      [3.2, s => ucap(s, '(잠 깬 쥐, 화남)', { size: 32, col: '#fff3bf' })],
      [3.7, s => ucap(s, '(뚜껑 쾅!! 발 끼임)', { size: 36, col: '#fff3bf' })],
      [4.4, s => ucap(s, '(그래도 쇼는 계속된다… 필사의 피날레!!)', { size: 32 })],
      [5.5, s => ucap(s, '(연주자 탈진)', { size: 32 })],
      [6.2, s => ucap(s, '감사합니다.', { size: 60, col: '#f2c14e', y: 0.45, dur: 1 })],
      [7.2, s => ucap(s, '감사합니다. 감사합니다.', { size: 40, col: '#fff3bf' })],
    ],
    start(s) {
      const r = s.r;
      s.st = { x: r.x + 20, y: r.y - 6 };
      const pim = FR_IMG.jwc_grand, PW = 250, PH = pim ? PW * pim.height / pim.width : 170;
      s.pw = PW; s.ph = PH; s.px = s.st.x + 30; s.kx = s.px - PW / 2 + PW * 0.06;
      s.bench = { x: s.kx - 40, y: s.st.y + 4, dx: 0 };
      s.cat = { x: G.cam.x - 80, y: s.st.y + 6, z: 0, face: 1, walk: 0, mode: 'walk', alpha: 1 };
      s.spot = { x: s.bench.x, y: s.st.y };
      s.dark = 0; s.curtain = 0; s.popped = new Set(); s.roses = []; s.flags = {}; s.bowN = -1; s.iris = 0;
      r.face = -1; r.x = s.px + 25; r.y = s.st.y + 2; r.z = s.ph * 0.5;
      G.quiet = true;                                             // 멀티킬 문구·콤보 배너·치즈 팝업 줄이기 (end 에서 되돌림)
      const x = s.st.x, y = s.st.y;
      s.inst = [['jw_harp', -330, -20, 70], ['jw_violin', -250, -40, 42], ['jw_drum', 250, -35, 70], ['jw_tuba', 320, -20, 70], ['jw_cello', 390, -5, 55], ['jw_trumpet', 230, 20, 44], ['jw_stand', -190, 25, 40]]
        .map(([id, dx, dy, w]) => ({ id, x: x + dx, y: y + dy, w, pop: 0, t0: rand(0.2, 0.6) }));
      const dirY = isOpen(...roomOf(s.st.x, s.st.y + 220)) ? 1 : -1;
      s.crowd = G.rats.filter(o => o !== r && !o.ultOn && onScreen(o.x, o.y, -20)).slice(0, 24);
      s.crowd.forEach((o, i) => { grabRat(s, o); const row = Math.floor(i / 8), col = i % 8; o.sx0 = o.x; o.sy0 = o.y; o.seatX = s.st.x + (col - 3.5) * 62 + rand(-10, 10) + (row % 2) * 28; o.seatY = s.st.y + dirY * (150 + row * 55); const t = { x: o.seatX, y: o.seatY, vx: 0, vy: 0 }; confine(t, ratR(o) + 6, s.st.x, s.st.y, 0, null); o.seatX = t.x; o.seatY = t.y; });
    },
    step(s, dt) {
      const r = s.r, t = s.t, c = s.cat, F = s.flags, keyZ = s.ph * 0.45, topZ = s.ph * 0.61, ease = ease01;
      r.vx = r.vy = 0;
      s.zoom = t < 8.4 ? 1 + 0.28 * Math.min(1, t / 0.6) : 1 + 0.28 * Math.max(0, 1 - (t - 8.4) / 0.4);   // 무대를 크게
      for (const I of s.inst) I.pop = Math.max(0, I.pop - dt * 4);
      s.dark = t < 8.8 ? Math.min(0.6, t * 1.2) : Math.max(0, s.dark - dt * 2);
      s.curtain = 1;
      s.iris = t > 8.1 ? Math.min(1, (t - 8.1) / 0.7) : 0;
      for (const o of s.crowd) {
        if (t < 0.9) { const e = ease(t / 0.9); o.x = rLerp(o.sx0, o.seatX, e); o.y = rLerp(o.sy0, o.seatY, e); o.speed = 280; o.walk += dt * 30; o.face = s.st.x > o.x ? 1 : -1; o.pose = null; continue; }
        o.speed = 0; o.face = s.st.x > o.x ? 1 : -1;
        const cheer = (t > 1.1 && t < 1.5) || (t > 6 && t < 8.1);
        if (cheer) { o.z = Math.abs(Math.sin(t * 7 + o.x * 0.01)) * (t > 6 ? 30 : 10); o.pose = { tilt: -0.55, front: 2.6, farFront: 2.4, back: -0.3, farBack: 0.3, head: -0.3, tail: 1.2 }; }
        else { o.z = 0; o.pose = { head: Math.sin(t * 2 + o.x) * 0.1, tail: 0.3 }; }
      }
      // ── 고양이 ──
      c.jit = 0;
      if (t < 0.9) { const e = ease(clamp((t - 0.1) / 0.8, 0, 1)); c.x = rLerp(G.cam.x - 60, s.bench.x - 6, e); c.mode = 'walk'; c.walk += dt * 14; c.face = 1; c.z = 0; }
      else if (t < 1.5) { c.mode = 'bow'; if (!F.clap1) { F.clap1 = true; popup(c.x, c.y, '👏👏', '#fff', 20, 0.8, 110); } }
      else if (t < 2.0) { c.mode = 'crack'; c.z = 26; if (!F.crack && t > 1.7) { F.crack = true; popup(c.x + 20, c.y, '뚜둑!', '#fff', 18, 0.6, 100); Sfx.clink(); } }
      else if (t < 3.6) { c.mode = 'play'; c.z = 26; c.speed = 16; if (Math.floor(t * 4) !== F.arp) { F.arp = Math.floor(t * 4); jwArp(false); } }
      else if (t < 4.4) {
        // 뚜껑 쾅 → 발을 흔들며 펄쩍
        c.mode = t < 3.85 ? 'play' : 'hurt'; c.z = t < 3.85 ? 26 : 26 + Math.abs(Math.sin((t - 3.85) * 14)) * 12; c.jit = t > 3.85 ? 2 : 0;
        if (!F.lid && t > 3.8) { F.lid = true; s.lidT = G.t; popup(s.kx + 30, s.st.y, '쾅!!', '#fff', 30, 0.8, keyZ + 30); popup(c.x, c.y, '💢', '#e8786a', 30, 0.9, 110); jwPop(s, 2); addShake(0.3); Sfx.boom(0.9); Sfx.deny(); }
      } else if (t < 5.5) {
        // 필사의 피날레 (빨라짐) → 화음 ×3
        c.z = 26; c.speed = 34; c.jit = 1.5;
        const k = (t - 4.4) / 1.1;
        if (k < 0.45) { c.mode = 'play'; if (Math.floor(t * 8) !== F.arp) { F.arp = Math.floor(t * 8); jwArp(true); } }
        else {
          const kk = (k - 0.45) / 0.55, hit = Math.floor(kk * 3);
          c.mode = (kk * 3) % 1 < 0.5 ? 'chordUp' : 'chordDown';
          if (hit !== F.chord && (kk * 3) % 1 > 0.5) {
            F.chord = hit; const f = [0.45, 0.6, 0.85][Math.min(2, hit)];
            shock(s.px, s.st.y, ULT_R * f, ultD(s) * 0.4, r, '#fff3bf', 1.6 + hit * 0.5); jwChord(hit * 2);
            jwPop(s, 2 + hit * 2); addShake(0.15 + hit * 0.1);
            if (hit === 2) { jwPop(s, 999, 1.5); blastActorsIn(s.px, s.st.y, ULT_R * 0.8, 700, ultD(s), r); flash('#fff3bf', 0.45); Sfx.boom(1.6); G.hitstop = 0.08; }
          }
        }
      } else if (t < 7.6) { c.mode = 'dead'; c.z = 26; }
      else { c.mode = 'exit'; c.face = -1; c.z = 0; c.x -= dt * 150; c.walk += dt * 10; c.alpha = Math.max(0, 1 - (t - 7.6) / 0.6); }
      // ── 줴리 ──
      if (t < 3.2) {
        // 피아노 속(현 위)에서 쿨쿨 → 건반 칠 때마다 통통
        const bounce = t > 2.0 ? Math.abs(Math.sin(t * 13)) * 16 : 0;
        r.x = s.px + 25; r.y = s.st.y + 2; r.z = topZ - 12 + bounce; r.face = -1;
        r.pose = { front: 1.5, farFront: 1.5, back: -1.5, farBack: -1.5, head: 0.4, tail: -0.6, sy: 0.9 };
        r.sjRot = t > 2.0 ? Math.sin(t * 13) * 0.3 : 0;
        if (Math.random() < dt * (t > 2 ? 1.5 : 3)) popup(r.x + 10, r.y, 'Zz', '#dfefff', 16, 0.8, r.z + 30);
      } else if (t < 3.7) {
        // 벌떡 → 부들부들 화남
        r.sjRot = 0; r.z = topZ - 4 + Math.max(0, Math.sin((t - 3.2) * 12)) * 30 * (t < 3.45 ? 1 : 0); r.jit = t > 3.45 ? 2 : 0;
        r.pose = { tilt: -0.5, front: 2.2, farFront: 2.2, back: -0.4, farBack: 0.4, head: -0.35, tail: 1.4 };
        if (!F.wake) { F.wake = true; popup(r.x, r.y, '!!', '#fff3bf', 30, 0.8, r.z + 40); Sfx.pop(); }
      } else if (t < 4.4) {
        // 뚜껑 위로 올라가 쾅 닫음
        r.jit = 0; r.x = s.px - 20; r.z = topZ + 6; r.face = -1; r.pose = { front: 2.5, farFront: 2.3, tilt: -0.3, head: -0.2, tail: 1.3 };
      } else if (t < 5.9) {
        // 피날레 동안 피아노 위에 앉아 다리 흔들며 구경 (뻔뻔)
        r.x = s.px + 10; r.z = topZ; r.face = -1; r.pose = { back: 1.4, farBack: 1.2, front: 0.5 + Math.sin(t * 6) * 0.3, head: -0.2, tail: 0.6 + Math.sin(t * 4) * 0.3, bob: 4 };
        if (t > 5.6 && !F.dress) { F.dress = true; smoke(r.x, r.y); Sfx.pop(); }
      } else {
        // 박수 가로채기: 좌우 객석에 번갈아 90도 인사 (허리를 편 순간 반대쪽으로 돌아섬)
        r.x = s.px + 10; r.z = topZ;
        const B = [0.7, 0.6, 0.5, 0.45], starts = [5.9, 6.6, 7.2, 7.7];
        let i = starts.length - 1; while (i > 0 && t < starts[i]) i--;
        const ph = clamp((t - starts[i]) / B[i], 0, 1), bend = t > 8.15 ? 1.1 : 1.5 * Math.pow(Math.sin(ph * Math.PI), 0.8);
        r.face = i % 2 ? 1 : -1;
        if (i !== s.bowN && ph > 0.45) { s.bowN = i; jwPop(s, 2); jwBand(s, r.face > 0 ? 1 : -1); popup(r.x + r.face * 60, r.y, '👏👏👏', '#fff', 22, 0.8, topZ + 40); }
        r.pose = { jw: 1, h: 44, bend, head: t > 8.1 ? 'wink' : 'smug', near: 'arm', far: 'arm', nearRot: 0, farRot: 0, tail: Math.sin(t * 3) * 0.1, bob: 0, sprite: null };
        if (t < 8.1 && Math.random() < dt * 9) s.roses.push({ x: s.st.x + rand(-500, 500), y: s.st.y + rand(200, 320), z: 0, tx: r.x + rand(-50, 50), ty: r.y + rand(-10, 20), t: 0, dur: rand(0.6, 0.9), rot: rand(0, 6.28), vr: rand(-12, 12) });
      }
      // 스포트라이트: 고양이 → (탈진 뒤) 줴리
      const tgt = t < 5.6 ? { x: c.x, y: s.st.y } : { x: r.x, y: r.y };
      s.spot.x += (tgt.x - s.spot.x) * Math.min(1, dt * (t < 5.6 ? 8 : 2.4)); s.spot.y += (tgt.y - s.spot.y) * Math.min(1, dt * 3);
      for (const ro of s.roses) { ro.t = Math.min(ro.dur, ro.t + dt); ro.rot += ro.vr * dt * (ro.t < ro.dur ? 1 : 0); }
      if (s.roses.length > 90) s.roses.splice(0, s.roses.length - 90);
    },
    end(s) { G.quiet = false; s.r.hideBody = false; s.r.z = 0; s.r.sjRot = 0; s.r.jit = 0; for (const o of s.crowd || []) o.z = 0; },
    draw(s) {
      const r = s.r, t = s.t;
      if (s.dark > 0) {
        const sp = s.spot;
        ctx.save(); ctx.globalAlpha = s.dark; ctx.fillStyle = '#120e1c';
        ctx.beginPath(); ctx.rect(G.cam.x - 400, G.cam.y - 400, viewW() + 800, viewH() + 800); ctx.ellipse(sp.x, sp.y * TILT, 130, 56, 0, 0, 6.28); ctx.fill('evenodd'); ctx.restore();
        ctx.save(); ctx.globalAlpha = s.dark * 0.32; ctx.fillStyle = '#fff3bf';
        ctx.beginPath(); ctx.moveTo(sp.x - 30, G.cam.y - 200); ctx.lineTo(sp.x + 30, G.cam.y - 200); ctx.lineTo(sp.x + 130, sp.y * TILT); ctx.lineTo(sp.x - 130, sp.y * TILT); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      for (const I of [...s.inst].sort((a, b) => a.y - b.y)) {
        const im = FR_IMG[I.id]; if (!im) continue;
        const ap = clamp((t - I.t0) / 0.25, 0, 1); if (ap <= 0) continue;
        const sc = (ap < 1 ? 0.4 + 0.6 * ap : 1) * (1 + I.pop * 0.18), w = I.w * sc, h = w * im.height / im.width;
        ctx.save(); ctx.globalAlpha = Math.min(1, 0.35 + s.dark); ctx.translate(I.x, I.y * TILT); ctx.scale(1, 1 - I.pop * 0.1); ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
      }
      const lidShut = (s.lidT && G.t - s.lidT < 0.45) || t > 5.5;
      jwDrawPiano(s, lidShut);
      jwDrawBench(s);
      jwDrawCat(s);
      if (t < 3.45) {
        // 피아노 속(열린 뚜껑 밑)에서 자는 줴리: 몸통 윗선 아래는 잘라서 안에서 빼꼼 보이게 (튀면 몸이 드러남)
        const rimY = s.st.y * TILT - s.ph * 0.61 + 4;
        ctx.save(); ctx.beginPath(); ctx.rect(G.cam.x - 400, rimY - 400, viewW() + 800, 400); ctx.clip(); drawRat(r); ctx.restore();
      } else drawRat(r);
      const RO = FR_IMG.jw_rose;
      for (const ro of s.roses) {
        const k = ro.t / ro.dur, x = rLerp(ro.x, ro.tx, k), y = rLerp(ro.y, ro.ty, k), z = Math.sin(k * Math.PI) * 180 + (k >= 1 ? s.ph * 0.61 : 0);
        ctx.save(); ctx.translate(x, y * TILT - z); ctx.rotate(ro.rot);
        if (RO) { const w = 16, h = w * RO.height / RO.width; ctx.drawImage(RO, -w / 2, -h / 2, w, h); } else { ctx.fillStyle = '#e8786a'; circ(ctx, 0, 0, 5); ctx.fill(); }
        ctx.restore();
      }
      // 아이리스 아웃 중심 = 줴리 얼굴의 화면 좌표
      const m = ctx.getTransform(), p = m.transformPoint(new DOMPoint(r.x, r.y * TILT - r.z - 34));
      s.irisPt = { x: p.x / SF, y: p.y / SF };
    },
    ui(s) {
      const t = s.t;
      // 극장 커튼 (처음에 열림)
      const CU = FR_IMG.jwc_curtain, VA = FR_IMG.jwc_valance, cw = 230, open = ease01(Math.min(1, t / 0.8));
      for (const d of [-1, 1]) {
        const x = d < 0 ? rLerp(W / 2 - cw, -cw * 0.55, open) : rLerp(W / 2, W - cw * 0.45, open);
        ctx.save(); ctx.translate(x + (d < 0 ? cw : 0), 0); ctx.scale(d < 0 ? -1 : 1, 1);          // 커튼 그림은 오른쪽용 → 왼쪽은 좌우 반전
        if (CU) ctx.drawImage(CU, 0, 0, cw, H); else { ctx.fillStyle = '#9d2b35'; ctx.fillRect(0, 0, cw, H); }
        ctx.restore();
      }
      if (VA) ctx.drawImage(VA, -20, -8, W + 40, 90); else { ctx.fillStyle = '#9d2b35'; ctx.fillRect(0, 0, W, 60); ctx.fillStyle = '#e3c46a'; ctx.fillRect(0, 56, W, 8); }
      // 공연 안내 카드: 연주자 이름이 바꿔치기됨
      if (t > 0.3 && t < 8.2) {
        const CA = FR_IMG.jwc_card, a = Math.min(1, (t - 0.3) / 0.3);
        ctx.save(); ctx.globalAlpha = a; ctx.translate(W - 250, 150);
        if (CA) ctx.drawImage(CA, -120, -48, 240, 96); else { rr(ctx, -120, -48, 240, 96, 8); ctx.fillStyle = '#f7efdc'; ctx.fill(); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#4b4540';
        ctx.font = "700 14px 'IBM Plex Sans KR', sans-serif"; ctx.fillText('♪ 피아노 독주회 ♪', 0, -24);
        ctx.font = "700 18px 'IBM Plex Sans KR', sans-serif"; ctx.fillText('연주: 턱시도 고양이', 8, 4);
        if (t > 6.3) {
          const k = Math.min(1, (t - 6.3) / 0.3);
          ctx.strokeStyle = '#c9504a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-18, 4); ctx.lineTo(-18 + 118 * k, 2); ctx.stroke();
          if (k >= 1) { ctx.save(); ctx.translate(46, 30); ctx.rotate(-0.12); ctx.fillStyle = '#c9504a'; ctx.font = "700 22px 'IBM Plex Sans KR', sans-serif"; ctx.fillText('→ 줴리', 0, 0); ctx.restore(); }
        }
        ctx.restore();
      }
      // 옛날 만화식 아이리스 아웃: 동그라미가 줴리 얼굴로 좁혀짐
      if (s.iris > 0 && s.irisPt) {
        const R = rLerp(Math.hypot(W, H), 46, ease01(Math.min(1, s.iris / 0.85))), a = s.t > 9 ? Math.max(0, 1 - (s.t - 9) / 0.2) : 1;
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#0d0a12';
        ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(s.irisPt.x + R, s.irisPt.y); ctx.arc(s.irisPt.x, s.irisPt.y, R, 0, Math.PI * 2); ctx.fill('evenodd');   // moveTo 없으면 사각형과 원이 선으로 이어져 구멍이 안 뚫림
        if (s.iris >= 1) { ctx.fillStyle = '#fff3bf'; ctx.font = "700 26px 'IBM Plex Sans KR', sans-serif"; ctx.textAlign = 'center'; ctx.fillText('— 감사합니다 —', s.irisPt.x, Math.min(H - 160, s.irisPt.y + 90)); }
        ctx.restore();
      }
    },
  },
});
const ease01 = x => x * x * (3 - 2 * x);
// 그랜드 피아노 (건반이 왼쪽). 기준점 = 다리 밑 가운데
function jwDrawPiano(s, shut) {
  const im = FR_IMG[shut ? 'jwc_grand_shut' : 'jwc_grand'] || FR_IMG.jwc_grand;
  ctx.save(); ctx.translate(s.px, s.st.y * TILT);
  ctx.fillStyle = 'rgba(30,15,5,.28)'; ctx.beginPath(); ctx.ellipse(0, 4, s.pw * 0.52, 22, 0, 0, 6.28); ctx.fill();
  if (im) { const h = s.pw * im.height / im.width; ctx.drawImage(im, -s.pw / 2, -h, s.pw, h); }
  else {
    ctx.fillStyle = '#2b2530'; rr(ctx, -s.pw / 2, -s.ph * 0.62, s.pw, s.ph * 0.2, 16); ctx.fill();
    for (const x of [-s.pw * 0.4, 0, s.pw * 0.4]) ctx.fillRect(x - 5, -s.ph * 0.44, 10, s.ph * 0.44);
    ctx.fillStyle = '#f3ede2'; ctx.fillRect(-s.pw / 2, -s.ph * 0.5, 30, 8);
    if (!shut) { ctx.save(); ctx.translate(-s.pw * 0.3, -s.ph * 0.62); ctx.rotate(-0.5); ctx.fillStyle = '#3c343f'; ctx.fillRect(0, -6, s.pw * 0.75, 6); ctx.restore(); }
  }
  ctx.restore();
}
function jwDrawBench(s) {
  const b = s.bench, im = FR_IMG.jwc_bench;
  ctx.save(); ctx.translate(b.x + b.dx, b.y * TILT);
  if (im) { const w = 70, h = w * im.height / im.width; ctx.drawImage(im, -w / 2, -h, w, h); } else { ctx.fillStyle = '#2b2530'; ctx.fillRect(-32, -30, 64, 10); ctx.fillRect(-26, -20, 6, 20); ctx.fillRect(20, -20, 6, 20); }
  ctx.restore();
}
// 턱시도 고양이 (고양이 방치 게임 파츠 + 나비넥타이). 자세: walk · bow · play · flinch · flung · chordUp/Down · dead · exit
function jwDrawCat(s) {
  const c = s.cat, rig = CAT_RIGS.tuxedo; if (!c || c.alpha <= 0) return;
  const t = G.t, sp = c.speed || 20;
  let p = { head: 0, tail: 0.3 + Math.sin(t * 3) * 0.2, front: 0, back: 0, farFront: 0, farBack: 0, bob: 0, tilt: 0 };
  if (c.mode === 'walk' || c.mode === 'exit') { const w = c.walk, s1 = Math.sin(w); p = { ...p, front: s1 * 0.5, farBack: s1 * 0.45, farFront: -s1 * 0.5, back: -s1 * 0.45, bob: -Math.abs(Math.cos(w)) * 2.5 }; if (c.mode === 'exit') Object.assign(p, { head: 0.55, tail: -0.5 }); }
  else if (c.mode === 'bow') Object.assign(p, { tilt: 0.35, head: 0.6, front: -0.3, tail: 0.6 });
  else if (c.mode === 'play') Object.assign(p, { tilt: -0.75, back: 1.1, farBack: 1.1, front: 1.35 + Math.sin(t * sp) * 0.35, farFront: 1.35 - Math.sin(t * sp) * 0.35, head: 0.35, tail: 0.6 + Math.sin(t * 8) * 0.3 });
  else if (c.mode === 'crack') Object.assign(p, { tilt: -0.75, back: 1.1, farBack: 1.1, front: 2.2 + Math.sin(t * 30) * 0.3, farFront: 2.2 - Math.sin(t * 30) * 0.3, head: -0.1, tail: 0.5 });   // 손가락 풀기
  else if (c.mode === 'hurt') Object.assign(p, { tilt: -0.9, back: 1.1, farBack: 1.1, front: 2.6 + Math.sin(t * 40) * 0.4, farFront: 2.4 - Math.sin(t * 40) * 0.4, head: -0.5, tail: 1.4 });   // 뚜껑에 끼인 발 흔들기
  else if (c.mode === 'flinch') Object.assign(p, { tilt: -0.9, back: 1.1, farBack: 1.1, front: 2.6, farFront: 2.4, head: -0.5, tail: 1.4 });
  else if (c.mode === 'flung') Object.assign(p, { front: Math.sin(t * 30) * 1.4, farFront: Math.cos(t * 27) * 1.4, back: Math.sin(t * 28) * 1.2, farBack: Math.cos(t * 25) * 1.2, tail: Math.sin(t * 20), head: Math.sin(t * 15) * 0.4 });
  else if (c.mode === 'chordUp') Object.assign(p, { tilt: -0.9, back: 1.1, farBack: 1.1, front: 2.7, farFront: 2.6, head: -0.3, tail: 1.3 });
  else if (c.mode === 'chordDown') Object.assign(p, { tilt: -0.55, back: 1.1, farBack: 1.1, front: 1.1, farFront: 1.0, head: 0.5, tail: 1.3 });
  else if (c.mode === 'dead') Object.assign(p, { tilt: 0.6, back: 1.1, farBack: 1.1, front: 0.9, farFront: 0.8, head: 0.9, tail: -0.8 });   // 건반 위에 엎어짐
  ctx.save(); ctx.globalAlpha = c.alpha;
  // 조명이 줴리에게 옮겨간 뒤 = 쓰러진 연주자는 어둠 속에 방치
  const dim = s.t > 4.1 && s.t < 8 ? Math.min(1, (s.t - 4.1) / 0.4) : 0;
  if (dim > 0) ctx.filter = `brightness(${(1 - 0.65 * dim).toFixed(2)})`;
  ctx.fillStyle = 'rgba(30,15,5,.2)'; ctx.beginPath(); ctx.ellipse(c.x, c.y * TILT, 40, 12, 0, 0, 6.28); ctx.fill();
  ctx.translate(c.x + (c.jit ? rand(-c.jit, c.jit) : 0), c.y * TILT - (c.z || 0)); ctx.scale(-c.face, 1);
  const L = CAT_LEN * 0.9;
  if (rig) {
    drawCatRig(rig, L, p);
    // 나비넥타이 (목 자리)
    const k = L / rig.len, bt = FR_IMG.jwc_bowtie, nx = rig.neck[0] * k + 4, ny = rig.neck[1] * k + 6;
    ctx.save(); ctx.translate(rig.hip[0] * k, rig.hip[1] * k); ctx.rotate(-(p.tilt || 0)); ctx.translate(-rig.hip[0] * k, -rig.hip[1] * k); ctx.translate(nx, ny + (p.bob || 0));
    if (bt) { const w = 22, h = w * bt.height / bt.width; ctx.drawImage(bt, -w / 2, -h / 2, w, h); } else { ctx.fillStyle = '#1d1826'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, -6); ctx.lineTo(-10, 6); ctx.closePath(); ctx.moveTo(0, 0); ctx.lineTo(10, -6); ctx.lineTo(10, 6); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  } else { ctx.fillStyle = '#2b2530'; rr(ctx, -40, -46, 80, 36, 16); ctx.fill(); circ(ctx, -40, -54, 18); ctx.fill(); }
  ctx.restore();
  // 탈진: 머리 위 별 빙빙
  if (c.mode === 'dead') { ctx.save(); ctx.fillStyle = '#f2c14e'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.09; ctx.fillText('★', c.x - 20 + Math.cos(a) * 18, c.y * TILT - c.z - 74 + Math.sin(a) * 6); } ctx.restore(); }
}
