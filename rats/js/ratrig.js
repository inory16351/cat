'use strict';
// ───────────────────────── 쥐 컷아웃 리그 ─────────────────────────
// 고양이 방치 게임(idle/js/rig.js)과 같은 방식: Codex 로 만든 파츠(머리·몸통·꼬리·앞다리·뒷다리)를 관절에 붙여 조립.
// 관절 위치·다리 배율은 rats/dev/slice_parts.mjs 가 이미지를 분석해서 RAT_PARTS(parts_meta.js)에 넣어준다.
// 좌표계: 발끝 = 원점, 왼쪽을 봄. 다리 각도 +는 앞(왼쪽)으로, 머리 +는 아래로 숙임, 꼬리 +는 위로.
const RAT_RIGS = {};
// 체형별 몸길이(게임 단위). 코드 그림(rodent.js)과 비슷한 크기로 맞춘다
const RIG_LEN = { rat: 46, mouse: 36, hamster: 34, gerbil: 38 };

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
    imgs, pivot: M.pivot, legScale: ls, headScale,
    farFront: imgs.front && darkerCopy(imgs.front, 0.22), farBack: imgs.back && darkerCopy(imgs.back, 0.22),
    torso: [torsoX, torsoY], neck: place('neck'), tail: place('tail'), shoulder: place('shoulder'), hip: place('hip'),
    unit: (RIG_LEN[sp.shape] || 44) / len,           // 이미지 픽셀 → 게임 단위
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
function drawRatRig(rig, s, pose, g = ctx) {
  const I = rig.imgs, P = rig.pivot, L = rig.legScale;
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
  g.translate(rig.hip[0], rig.hip[1]); g.rotate(-pose.tilt); g.translate(-rig.hip[0], -rig.hip[1]);
  const gap = I.torso.width * 0.07, u = 1 / rig.unit;
  // 먼 쪽 다리(어둡게)·꼬리는 몸통 뒤, 가까운 쪽 다리는 몸통 위에 겹쳐서 허벅지·어깨가 몸에 붙어 보이게
  part(rig.farBack, rig.hip, P.back, pose.farBack, gap, 0, L.back);
  part(rig.farFront, rig.shoulder, P.front, pose.farFront, gap, 0, L.front);
  part(I.tail, rig.tail, P.tail, -pose.tail);
  g.drawImage(I.torso, rig.torso[0], rig.torso[1]);
  part(I.back, rig.hip, P.back, pose.back, 0, 0, L.back * (pose.kickLeg ? 1.1 : 1));
  const raised = pose.front > 0.9;                       // 치켜든 앞발은 얼굴 앞으로
  if (!raised) part(I.front, rig.shoulder, P.front, pose.front, 0, 0, L.front);
  part(I.head, rig.neck, P.head, -pose.head, (pose.headX || 0) * u, (pose.headY || 0) * u, rig.headScale);
  if (raised) part(I.front, rig.shoulder, P.front, pose.front, 0, 0, L.front);
  if (pose.prop && I.front) {
    // 앞발 끝에 소품 (이모지)
    const len = I.front.height * (1 - P.front[1]) * L.front * 0.9, a = pose.front;
    g.save(); g.translate(rig.shoulder[0] - Math.sin(a) * len, rig.shoulder[1] + Math.cos(a) * len); g.rotate(a * 0.5);
    drawProp(g, pose.prop, 15 * u);
    g.restore();
  }
  g.restore();
}
loadRatParts();
