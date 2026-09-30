'use strict';
// ───────────────────────── 쥐 컷아웃 리그 ─────────────────────────
// 고양이 방치 게임(idle/js/rig.js)과 같은 방식: Codex 로 만든 파츠(머리·몸통·꼬리·앞다리·뒷다리)를 관절에 붙여 조립.
// 관절 위치·다리 배율은 rats/dev/slice_parts.mjs 가 이미지를 분석해서 RAT_PARTS(parts_meta.js)에 넣어준다.
// 좌표계: 발끝 = 원점, 왼쪽을 봄. 다리 각도 +는 앞(왼쪽)으로, 머리 +는 아래로 숙임, 꼬리 +는 위로.
const RAT_RIGS = {};
// 체형별 몸길이(게임 단위). 코드 그림(rodent.js)과 비슷한 크기로 맞춘다
const RIG_LEN = { rat: 46, mouse: 36, hamster: 34, gerbil: 38, squirrel: 25 };
const RIG_LEN_ID = { jwerry: 27 };                    // 종별로 따로 (줴리: 패러디답게 더 작게)   // 다람쥐는 꼬리가 위로 솟아 키가 커 보여서 몸은 작게 (25 = 키가 다른 신화 쥐와 비슷, 필살기 앞모습과도 같은 크기)

function loadRatParts() {
  if (typeof RAT_PARTS === 'undefined') return;
  for (const id of Object.keys(RAT_PARTS)) {
    const names = Object.keys(RAT_PARTS[id].size), imgs = {};
    let left = names.length;
    for (const n of names) {
      const im = new Image();
      im.onload = () => { imgs[n] = im; if (--left === 0) buildRatRig(id, imgs); };
      im.onerror = () => { if (--left === 0) buildRatRig(id, imgs); };
      im.src = `../assets/rats/parts/${id}/${n}.png`;
    }
  }
}
function darkerCopy(img, amt) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(40,25,30,${amt})`; g.fillRect(0, 0, c.width, c.height);
  return c;
}
function buildRatRig(id, imgs) {
  const M = RAT_PARTS[id], sp = RSPECIES_BY_ID[id];
  if (!imgs.torso || !M.anchor || !sp) return;
  const T = imgs.torso;
  const at = k => [M.anchor[k][0] * T.width, M.anchor[k][1] * T.height];
  const ls = M.legScale || { front: 1, back: 1 };
  const legLen = leg => (imgs[leg] ? imgs[leg].height * (1 - M.pivot[leg][1]) * ls[leg] : 0);
  // 머리가 유난히 크게 나온 시트는 머리만 줄임 (머리 폭 ≈ 몸통 폭 × 0.62)
  const headScale = imgs.head ? Math.min(1, 0.62 * T.width / imgs.head.width) : 1;
  const torsoX = -T.width * 0.5, torsoY = -(at('shoulder')[1] + legLen('front'));
  const place = k => { const [x, y] = at(k); return [torsoX + x, torsoY + y]; };
  const len = T.width + (imgs.head ? imgs.head.width * headScale * 0.55 : 0);
  RAT_RIGS[id] = {
    id, imgs, pivot: M.pivot, legScale: ls, headScale,
    farFront: imgs.front && darkerCopy(imgs.front, 0.22), farBack: imgs.back && darkerCopy(imgs.back, 0.22),
    torso: [torsoX, torsoY], neck: place('neck'), tail: place('tail'), shoulder: place('shoulder'), hip: place('hip'),
    unit: (RIG_LEN_ID[id] || RIG_LEN[sp.shape] || 44) / len,           // 이미지 픽셀 → 게임 단위
    height: -torsoY,
  };
}

const RIG_IDLE = { head: 0, headX: 0, headY: 0, tail: 0.2, front: 0.05, back: -0.05, farFront: -0.1, farBack: 0.1, bob: 0, tilt: 0, sx: 1, sy: 1 };
const rEase = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const rLerp = (a, b, t) => a + (b - a) * t;
function blendPose(p, q, k) { for (const n in q) p[n] = rLerp(p[n] ?? 0, q[n], k); return p; }

// 한 프레임의 자세 (r = 게임의 쥐 객체)
function ratPose(r) {
  const t = G.t, seed = (r.seed ??= Math.random() * 10);
  const p = { head: Math.sin(t * 1.7 + seed) * 0.05, headX: 0, headY: 0, tail: 0.15 + Math.sin(t * 2.6 + seed) * 0.15,
    front: 0, back: 0, farFront: 0, farBack: 0, bob: 0, tilt: 0, sx: 1, sy: 1 };
  const moving = r.speed > 30;
  if (moving) {
    // 쥐 달리기: 앞다리 두 개, 뒷다리 두 개가 같이 움직이는 깡충 뜀박질. 빠를수록 다리가 크게 휙휙
    const w = r.walk, amp = Math.min(1.25, 0.45 + r.speed / 900);
    p.front = Math.sin(w) * amp; p.farFront = Math.sin(w + 0.6) * amp;
    p.back = Math.sin(w + Math.PI) * amp; p.farBack = Math.sin(w + Math.PI + 0.6) * amp;
    p.bob = -Math.abs(Math.sin(w)) * 3.5; p.tilt = Math.sin(w) * 0.06;
    p.tail = 0.05 + Math.sin(w * 0.5) * 0.25; p.head = Math.cos(w) * 0.05 - 0.05; p.sx = 1 + Math.sin(w) * 0.05;
    if (r.speed > 450) { p.head = -0.12; p.tail = -0.15 + Math.sin(t * 30) * 0.08; p.sx = 1.1; p.sy = 0.93; }   // 초고속: 쭉 뻗어 날아가듯
  } else if (r.stopT !== undefined && t - r.stopT < 0.2) {
    // 급정거: 앞발로 브레이크, 몸은 뒤로 젖혀짐, 꼬리 휙
    const k = 1 - (t - r.stopT) / 0.2;
    p.front = 0.9 * k; p.farFront = 0.8 * k; p.back = -0.4 * k; p.farBack = -0.3 * k; p.tilt = -0.18 * k; p.tail = 0.9 * k; p.head = -0.2 * k;
  } else {
    // 멈칫: 킁킁 (코를 빠르게 까딱)
    const sniff = Math.max(0, Math.sin(t * 0.9 + seed * 3)) > 0.7;
    if (sniff) { p.head = -0.08 + Math.sin(t * 40) * 0.05; p.headX = -1.5; }
  }
  if (G.rush && r.rushT > 0) { p.head = 0.18; p.headX = -3; p.tail = 1.1 + Math.sin(t * 25) * 0.1; p.tilt = 0.1; }  // 총공격: 고개 숙이고 꼬리 번쩍
  if (r.bite > 0) {
    // 갉기 박치기: 목을 쭉 빼서 머리로 들이받음 (앞발 들썩)
    const k = Math.sin(r.bite * Math.PI);
    p.headX -= 9 * k; p.head += 0.35 * k; p.front += 0.7 * k; p.farFront += 0.4 * k; p.tilt += 0.08 * k; p.sx *= 1 + 0.08 * k;
  }
  if (r.z > 2 && !r.trick) {
    // 공중: 대자로 뻗음
    const k = Math.min(1, r.z / 30);
    blendPose(p, { front: 1.3, farFront: 1.0, back: -1.3, farBack: -1.0, tail: 1.2, head: -0.3 }, k);
  }
  const tr = r.trick;
  if (tr) {
    const k = Math.min(1, tr.t / tr.dur), f = Math.sin(t * 28);
    switch (tr.type) {
      case 'flip': { const tuck = Math.sin(k * Math.PI); Object.assign(p, { front: rLerp(0.3, 1.8, tuck), farFront: rLerp(0.2, 1.6, tuck), back: rLerp(-0.2, -1.6, tuck), farBack: rLerp(-0.1, -1.4, tuck), tail: 1.3 * tuck, head: 0.5 * tuck }); break; }
      case 'axel':
        if (k < 0.85) Object.assign(p, { front: 0.25, farFront: 0.25, back: -0.2, farBack: -0.2, tail: 1.4, head: -0.25 });
        else { const e = (k - 0.85) / 0.15; Object.assign(p, { front: rLerp(0.25, 2.6, e), farFront: rLerp(0.25, 2.3, e), tilt: rLerp(0, -0.4, e), head: -0.3, tail: 1.2 }); }
        break;
      case 'windmill': Object.assign(p, { front: f * 1.5, farFront: -f * 1.5, back: Math.sin(t * 28 + 1.6) * 1.5, farBack: -Math.sin(t * 28 + 1.6) * 1.5, tail: Math.sin(t * 22) * 1.2, head: Math.sin(t * 14) * 0.35 }); break;
      case 'cannon': Object.assign(p, { front: 1.9, farFront: 1.9, back: -1.9, farBack: -1.9, head: 0.8, headX: 4, tail: -1.6, sx: 0.9, sy: 0.9 }); break;
      case 'tumble': Object.assign(p, { front: Math.sin(t * 34) * 1.6, farFront: Math.cos(t * 30) * 1.6, back: Math.sin(t * 31 + 2) * 1.5, farBack: Math.cos(t * 27) * 1.5, head: Math.sin(t * 20) * 0.5, tail: Math.sin(t * 25) * 1.3 }); break;
      case 'belly': {
        // 배치기 슬라이딩: 배를 깔고 쭉 미끄러짐, 네 다리는 뒤로 쭉 (펭귄)
        const up = k < 0.12 ? k / 0.12 : 1;
        Object.assign(p, { front: -1.5 * up, farFront: -1.4 * up, back: -1.6 * up, farBack: -1.5 * up, head: -0.25, tail: 0.3 + Math.sin(t * 18) * 0.1, bob: 7 * up, sx: 1.12, sy: 0.9 });
        break;
      }
      case 'kick': {
        // 날아차기: 도움닫기 → 공중에서 뒷다리 쭉! → 착지
        if (k < 0.25) Object.assign(p, { front: 0.4, back: -0.6, farBack: -0.6, tilt: -0.1, head: 0.1 });
        else if (k < 0.75) Object.assign(p, { front: 2.1, farFront: 1.7, back: 2.3, farBack: -0.9, tilt: -0.6, head: -0.25, tail: -0.9, kickLeg: true });
        else Object.assign(p, { front: 0.6, farFront: 0.6, back: 0.3, farBack: -0.3, head: -0.3, tail: 1 });
        break;
      }
    }
  }
  if (r.sleep > 0) Object.assign(p, { front: 1.5, farFront: 1.5, back: -1.5, farBack: -1.5, head: 0.4, tail: -0.6 + Math.sin(t * 0.8) * 0.08, bob: 0, napDrop: true, sy: 0.92 + Math.sin(t * 2) * 0.02 });
  if (r.act) actPose(r, p);
  if (r.zombieUntil > G.t && !r.pose) Object.assign(p, { front: 1.5 + Math.sin(t * 5 + seed) * 0.15, farFront: 1.4, head: 0.25, tilt: -0.15 });   // 좀비: 팔 앞으로
  if (r.pose) Object.assign(p, r.pose);       // 슈퍼 점프 등 연출이 직접 지정한 자세
  return p;
}

// 발끝 = 원점 좌표계에 조립해서 그림. s = 게임 단위 배율
// 안경 쓴 종: 머리 그림 안 가까운 눈 위치(x,y)·알 크기(r, 가로 비율)·안경다리 끝(ax,ay)
const RIG_GLASSES = { streamrat: { x: 0.4, y: 0.47, r: 0.075, ax: 0.6, ay: 0.4 } };
// 턱시도 (줴리 필살기 "감사합니다"): 원래 파츠 그림 위에 코드로 옷을 칠함 → 실루엣·크기·얼굴이 평소 줴리와 똑같음
//  몸통: 크림색(배) → 흰 셔츠, 나머지 털 → 검은 재킷 / 앞다리: 위 70% 소매 + 흰 소맷부리, 발은 그대로 / 뒷다리: 위 66% 바지
function tuxCopy(img, kind) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  let d; try { d = g.getImageData(0, 0, c.width, c.height); } catch (_) { return img; }
  const a = d.data, W = c.width, H = c.height;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; if (a[i + 3] < 8) continue;
    const r = a[i], gg = a[i + 1], b = a[i + 2], sh = (r + gg + b) / 3 / 200;   // 원래 명암 조금 살림
    const k = y / H, jacket = () => { a[i] = 40 * sh + 8; a[i + 1] = 34 * sh + 6; a[i + 2] = 46 * sh + 8; }, shirt = () => { a[i] = 247; a[i + 1] = 243; a[i + 2] = 236; };
    if (kind === 'torso') { if (r > 210 && gg > 170 && b > 120) shirt(); else jacket(); }
    else if (kind === 'front') { if (k < 0.7) jacket(); else if (k < 0.77) shirt(); }
    else if (kind === 'back') { if (k < 0.66) jacket(); }
  }
  g.putImageData(d, 0, 0); return c;
}
function tuxRig(rig) {
  if (rig.tux) return rig.tux;
  const I = rig.imgs, t = { ...I, torso: tuxCopy(I.torso, 'torso'), front: I.front && tuxCopy(I.front, 'front'), back: I.back && tuxCopy(I.back, 'back') };
  t.farFront = t.front && darkerCopy(t.front, 0.22); t.farBack = t.back && darkerCopy(t.back, 0.22);
  return (rig.tux = t);
}
function drawRatRig(rig, s, pose, g = ctx) {
  const TX = pose.tux ? tuxRig(rig) : null, I = TX || rig.imgs, P = rig.pivot, L = rig.legScale, FF = TX ? TX.farFront : rig.farFront, FB = TX ? TX.farBack : rig.farBack;
  const part = (img, anchor, pivot, ang, dx = 0, dy = 0, sc = 1) => {
    if (!img) return;
    g.save(); g.translate(anchor[0] + dx, anchor[1] + dy); g.rotate(ang); g.scale(sc, sc);
    g.drawImage(img, -pivot[0] * img.width, -pivot[1] * img.height);
    g.restore();
  };
  g.save();
  g.scale(s * rig.unit, s * rig.unit);
  const drop = pose.napDrop && I.front ? I.front.height * (1 - P.front[1]) * L.front * 0.75 : 0;
  g.translate(0, pose.bob / rig.unit + drop);
  g.scale(pose.sx || 1, pose.sy || 1);
  const FX = typeof FR_IMG !== 'undefined' ? FR_IMG : {}, FM = typeof FRONT_PARTS !== 'undefined' ? FRONT_PARTS : {};
  if (pose.log && FX.rss_log) {
    // 통나무 위에 올라섬 (람쥐썬더 원본 짤): 통나무는 땅에, 다람쥐는 통나무 윗면 높이로
    const lw = I.torso.width * 1.9, lh = lw * FX.rss_log.height / FX.rss_log.width;
    g.drawImage(FX.rss_log, -lw * 0.55, -lh * 0.95, lw, lh); g.translate(0, -lh * 0.62);
  }
  g.translate(rig.hip[0], rig.hip[1]); g.rotate(-pose.tilt); g.translate(-rig.hip[0], -rig.hip[1]);
  const gap = I.torso.width * 0.07, u = 1 / rig.unit;
  // 추가 파츠(front_meta 의 rss_*): 따로 생성해 배율이 달라서 기존 파츠 길이(refH) 기준으로 맞춤. 피벗 = 관절(든 팔은 아래 어깨, 웅크린 다리는 위 엉덩이)
  const extraPart = (id, at, refH, ang, dx = 0) => {
    const im = FX[id], m = FM[id]; if (!im || !m) return null;
    const k = refH / m.size[1], w = m.size[0] * k, h = m.size[1] * k;
    g.save(); g.translate(at[0] + dx, at[1]); g.rotate(ang); g.drawImage(im, -m.pivot[0] * w, -m.pivot[1] * h, w, h); g.restore();
    return { w, h, py: m.pivot[1] };
  };
  // 먼 쪽 다리(어둡게)·꼬리는 몸통 뒤, 가까운 쪽 다리는 몸통 위에 겹쳐서 허벅지·어깨가 몸에 붙어 보이게
  const crouch = pose.crouch && FX.rss_leg_crouch && I.back;
  if (crouch) { g.save(); g.globalAlpha = 1; g.filter = 'brightness(0.8)'; extraPart('rss_leg_crouch', rig.hip, I.back.height * L.back * 0.85, pose.farBack, gap); g.restore(); }
  else part(FB, rig.hip, P.back, pose.farBack, gap, 0, L.back);
  // 망토 (필살기 토르 코스프레): 몸통 뒤에서 뒤로 펄럭. 걸쇠(그림 왼쪽 위)를 목에
  if (pose.cape && IMG['art_ult:thor_cape']) {
    const im = IMG['art_ult:thor_cape'], cw = I.torso.width * 1.25 * pose.cape, ch = cw * im.height / im.width, fl = 1 + Math.sin(G.t * 14) * 0.06;
    g.save(); g.translate(rig.neck[0] + I.torso.width * 0.05, rig.neck[1] + I.torso.height * 0.1); g.rotate(-0.15 + Math.sin(G.t * 9) * 0.05); g.scale(fl, 1 / fl); g.drawImage(im, -cw * 0.1, -ch * 0.12, cw, ch); g.restore();
  }
  part(FF, rig.shoulder, P.front, pose.farFront, gap, 0, L.front);
  if (pose.prop2 && I.front) {                       // 뒤쪽 앞발 소품 (쌍권총)
    const len = I.front.height * (1 - P.front[1]) * L.front * 0.9, a = pose.farFront;
    g.save(); g.translate(rig.shoulder[0] + gap - Math.sin(a) * len, rig.shoulder[1] + Math.cos(a) * len); g.rotate(a * 0.5 + (pose.propRot2 ?? pose.propRot ?? 0)); drawProp(g, pose.prop2, (pose.propSize || 15) * u); g.restore();
  }
  part(I.tail, rig.tail, P.tail, -pose.tail);
  if (TX) {
    // 연미복 꼬리 (엉덩이 뒤로 두 갈래) — 몸통 좌표라 서 있으면 아래로 늘어짐
    const [tx, ty] = rig.tail, T = I.torso, cw = T.width * 0.34;
    g.fillStyle = '#231e29'; g.beginPath(); g.moveTo(tx - T.width * 0.12, ty - T.height * 0.12); g.lineTo(tx + cw, ty + T.height * 0.05); g.lineTo(tx + cw * 0.7, ty + T.height * 0.2); g.lineTo(tx + cw * 0.95, ty + T.height * 0.34); g.lineTo(tx - T.width * 0.1, ty + T.height * 0.28); g.closePath(); g.fill();
  }
  g.drawImage(I.torso, rig.torso[0], rig.torso[1]);
  if (crouch) extraPart('rss_leg_crouch', rig.hip, I.back.height * L.back * 0.85, pose.back);
  else part(I.back, rig.hip, P.back, pose.back, 0, 0, L.back * (pose.kickLeg ? 1.1 : 1));
  const armUp = pose.armUp && FX[pose.armUp] && I.front;       // 'rss_arm_up' | 'rss_arm_up2' = 팔꿈치 굽혀 머리 위로 번쩍 (람쥐썬더)
  const raised = pose.front > 0.9 || armUp;                    // 치켜든 앞발은 얼굴 앞으로
  if (!raised) part(I.front, rig.shoulder, P.front, pose.front, 0, 0, L.front);
  if (TX && typeof FR_IMG !== 'undefined' && FR_IMG.jwc_bowtie) {
    // 나비넥타이: 목 앞(배 쪽), 세상 기준으로 똑바로
    const bt = FR_IMG.jwc_bowtie, T = I.torso, bw = T.width * 0.3, bh = bw * bt.height / bt.width;
    g.save(); g.translate(rig.neck[0] + T.width * 0.1, rig.neck[1] + T.height * 0.3); g.rotate(pose.tilt); g.drawImage(bt, -bw / 2, -bh / 2, bw, bh); g.restore();
  }
  part(I.head, rig.neck, P.head, -pose.head, (pose.headX || 0) * u, (pose.headY || 0) * u, rig.headScale);
  // 투구 (필살기 토르 코스프레): 머리 위
  if (pose.helm && I.head && IMG['art_ult:thor_helm']) {
    const im = IMG['art_ult:thor_helm'], H = I.head, hw = H.width * 0.8 * pose.helm, hh = hw * im.height / im.width;
    g.save(); g.translate(rig.neck[0] + (pose.headX || 0) * u, rig.neck[1] + (pose.headY || 0) * u); g.rotate(-pose.head); g.scale(rig.headScale, rig.headScale);
    g.translate(-P.head[0] * H.width, -P.head[1] * H.height); g.drawImage(im, H.width * 0.52 - hw / 2, H.height * 0.22 - hh * 0.75, hw, hh); g.restore();
  }
  const GL = RIG_GLASSES[rig.id];
  if (GL && I.head) {
    // 안경 (머리 그림 위에 코드로): 옆모습이라 가까운 알 하나 + 먼 알 살짝 + 다리는 헤드셋 쪽으로. glint = 안경 번쩍
    const H = I.head, w = H.width, h = H.height;
    g.save(); g.translate(rig.neck[0] + (pose.headX || 0) * u, rig.neck[1] + (pose.headY || 0) * u); g.rotate(-pose.head); g.scale(rig.headScale, rig.headScale);
    g.translate(-P.head[0] * w, -P.head[1] * h);
    const ex = GL.x * w, ey = GL.y * h, R = GL.r * w, lw = R * 0.28;
    g.lineWidth = lw; g.strokeStyle = '#2b2522'; g.fillStyle = 'rgba(200,230,245,.35)';
    g.beginPath(); g.ellipse(ex - R * 1.55, ey - R * 0.1, R * 0.55, R * 0.8, 0, 0, 6.28); g.fill(); g.stroke();       // 먼 알
    g.beginPath(); g.moveTo(ex - R * 1.05, ey - R * 0.2); g.lineTo(ex - R * 0.95, ey - R * 0.2); g.stroke();              // 코다리
    g.beginPath(); g.ellipse(ex, ey, R, R * 0.85, 0, 0, 6.28); g.fill(); g.stroke();                                       // 가까운 알
    g.beginPath(); g.moveTo(ex + R, ey - R * 0.15); g.lineTo(GL.ax * w, GL.ay * h); g.stroke();                            // 안경다리
    const gl = pose.glint || 0.35;
    g.globalAlpha = Math.min(1, gl); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex - R * 0.35, ey - R * 0.35, R * 0.28, R * 0.14, -0.6, 0, 6.28); g.fill();
    if (pose.glint > 0.6) { g.globalAlpha = pose.glint - 0.6; g.strokeStyle = '#fff'; g.lineWidth = lw * 0.8; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; g.beginPath(); g.moveTo(ex + Math.cos(a) * R * 1.2, ey + Math.sin(a) * R * 1.2); g.lineTo(ex + Math.cos(a) * R * 2.2, ey + Math.sin(a) * R * 2.2); g.stroke(); } }
    g.restore();
  }
  if (armUp) {
    const ang = pose.armUpRot || 0, r0 = extraPart(pose.armUp, rig.shoulder, I.front.height * L.front * 1.35, ang);
    if (r0 && pose.pawBolt && typeof pawBolt === 'function') {
      const d = r0.h * r0.py * 0.95;                           // 어깨(아래) → 손끝(위)
      pawBolt(g, rig.shoulder[0] + Math.sin(ang) * d, rig.shoulder[1] - Math.cos(ang) * d, ang + (Math.random() - 0.5) * 0.5, I.torso.height * (0.8 + Math.random() * 0.5) * pose.pawBolt, 1);
    }
  } else if (raised) part(I.front, rig.shoulder, P.front, pose.front, 0, 0, L.front);
  if (!armUp && pose.pawBolt && I.front && typeof pawBolt === 'function') {
    // 치켜든 가까운 앞발 끝에서 번개 지지직 (람쥐썬더). 다리 방향 = (−sin a, cos a) → 그 연장선으로
    const len = I.front.height * (1 - P.front[1]) * L.front * 0.95, a = pose.front;
    pawBolt(g, rig.shoulder[0] - Math.sin(a) * len, rig.shoulder[1] + Math.cos(a) * len, a + Math.PI + (Math.random() - 0.5) * 0.5, I.torso.height * (0.8 + Math.random() * 0.5) * pose.pawBolt, 1);
  }
  if (pose.prop && I.front) {
    // 앞발 끝에 소품 (이모지)
    const len = I.front.height * (1 - P.front[1]) * L.front * 0.9, a = pose.front;
    g.save(); g.translate(rig.shoulder[0] - Math.sin(a) * len, rig.shoulder[1] + Math.cos(a) * len); g.rotate(a * 0.5);
    g.rotate(pose.propRot || 0); drawProp(g, pose.prop, (pose.propSize || 15) * u);
    g.restore();
  }
  g.restore();
}
// 입 위치 (쥐 발밑 기준 월드 오프셋 dx, 높이 dz). 머리 이미지는 왼쪽을 보고 입은 왼쪽 끝 아래쪽 (코끝 살짝 아래)
function ratMouth(r) {
  const sc = RAT_SCALE * TIERS[r.tier].size, rig = RAT_RIGS[r.sp.id];
  if (!rig || !rig.imgs.head) return { dx: r.face * 20 * sc, dz: 13 * sc };
  const H = rig.imgs.head, P = rig.pivot.head, hs = rig.headScale, a = -((r.pose && r.pose.head) || 0);
  const mx = (0.07 - P[0]) * H.width * hs, my = (0.72 - P[1]) * H.height * hs, u = 1 / rig.unit;
  const px = rig.neck[0] + mx * Math.cos(a) - my * Math.sin(a) + ((r.pose && r.pose.headX) || 0) * u;
  const py = rig.neck[1] + mx * Math.sin(a) + my * Math.cos(a);
  return { dx: -r.face * px * rig.unit * sc, dz: -py * rig.unit * sc };
}
loadRatParts();
