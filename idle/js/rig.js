'use strict';
// ───────────────────────── 고양이 컷아웃 리그 ─────────────────────────
// 파츠(머리·몸통·꼬리·앞다리·뒷다리)를 따로 생성한 이미지로 조립하는 인형 리그.
// 관절 위치(pivot/anchor)와 다리 배율은 dev/slice_parts.py 가 파츠 이미지를 분석해서 PARTS_META 에 넣어준다.
// 스프라이트는 왼쪽을 봄. 다리·머리 각도는 +가 앞(왼쪽)/아래.
const RIGS = {};
// 생성된 파츠에서 머리가 유난히 크게 나온 종은 머리만 줄임 (머리 폭 / 몸통 폭 ≈ 0.6 이 기준)
const HEAD_SCALE = { chonk: 0.72 };

function loadParts() {
  if (typeof PARTS_META === 'undefined') return;
  for (const id of Object.keys(PARTS_META)) {
    const names = Object.keys(PARTS_META[id].size);
    const imgs = {};
    let left = names.length;
    for (const n of names) {
      const im = new Image();
      im.onload = () => { imgs[n] = im; if (--left === 0) buildRig(id, imgs); };
      im.src = `../assets/v2/parts/${id}/${n}.png`;
    }
  }
}

function darker(img, amt) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(40,25,30,${amt})`; g.fillRect(0, 0, c.width, c.height);
  return c;
}

function buildRig(id, imgs) {
  const M = PARTS_META[id];
  if (!imgs.torso || !M.anchor) return;
  const T = imgs.torso;
  const at = k => [M.anchor[k][0] * T.width, M.anchor[k][1] * T.height];
  const ls = M.legScale || { front: 1, back: 1 };
  const legLen = leg => imgs[leg] ? imgs[leg].height * (1 - M.pivot[leg][1]) * ls[leg] : 0;
  // 발끝이 원점(0,0)에 닿도록 몸통 위치를 정함
  const sy = at('shoulder')[1];
  const torsoX = -T.width * 0.5, torsoY = -(sy + legLen('front'));
  const place = k => { const [x, y] = at(k); return [torsoX + x, torsoY + y]; };
  const neck = place('neck');
  const headTop = imgs.head ? neck[1] - imgs.head.height * M.pivot.head[1] * (HEAD_SCALE[id] || 1) : torsoY;
  RIGS[id] = {
    imgs, pivot: M.pivot, legScale: ls, headScale: HEAD_SCALE[id] || 1,
    farFront: imgs.front && darker(imgs.front, 0.2), farBack: imgs.back && darker(imgs.back, 0.2),
    torso: [torsoX, torsoY], neck, tail: place('tail'), shoulder: place('shoulder'), hip: place('hip'),
    w: T.width + (imgs.head ? imgs.head.width * 0.55 : 0), h: -Math.min(torsoY, headTop),
  };
}

const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const lerp = (a, b, t) => a + (b - a) * t;

// 한 프레임의 자세
function rigPose(c) {
  const t = G.t, seed = c.id.length * 1.7;
  const moving = c.speed > 30;
  const p = { head: Math.sin(t * 1.6 + seed) * 0.06, tail: Math.sin(t * 3 + seed) * 0.25, front: 0, back: 0, farFront: 0, farBack: 0, bob: 0, tilt: 0 };
  if (moving) {
    // 걷기: 대각선 다리끼리 같이 움직이는 고양이 보행 (앞-바깥 & 뒤-안쪽이 한 쌍)
    const s = Math.sin(c.walkT), s2 = Math.sin(c.walkT + Math.PI);
    p.front = s * 0.5; p.farBack = s * 0.45;
    p.farFront = s2 * 0.5; p.back = s2 * 0.45;
    p.bob = -Math.abs(Math.cos(c.walkT)) * 2.5;
    p.tilt = Math.sin(c.walkT * 2) * 0.02;
    p.tail = Math.sin(c.walkT * 0.5) * 0.3 + 0.1;
    p.head = Math.cos(c.walkT * 2) * 0.04;
  }
  if (c.swipeT > 0) {
    // 공격 3단: ① 상체를 들고 앞발을 치켜듦 → ② 내려치며 몸을 앞으로 → ③ 원위치
    const k = 1 - c.swipeT / 0.26;
    if (k < 0.4) {
      const e = ease(k / 0.4);
      p.front = lerp(0, 2.3, e); p.farFront = lerp(0, 0.6, e);
      p.back = lerp(0, -0.25, e); p.farBack = lerp(0, 0.25, e);
      p.tilt = lerp(0, -0.22, e); p.head = lerp(0, -0.15, e); p.tail = lerp(0, 0.7, e); p.bob = lerp(0, -4, e);
    } else if (k < 0.6) {
      const e = (k - 0.4) / 0.2;
      p.front = lerp(2.3, 0.35, e); p.farFront = lerp(0.6, -0.2, e);
      p.back = lerp(-0.25, -0.35, e); p.farBack = lerp(0.25, -0.3, e);
      p.tilt = lerp(-0.22, 0.14, e); p.head = lerp(-0.15, 0.25, e); p.tail = lerp(0.7, -0.4, e); p.bob = lerp(-4, 2, e);
    } else {
      const e = ease((k - 0.6) / 0.4);
      p.front = lerp(0.35, 0, e); p.farFront = lerp(-0.2, 0, e);
      p.back = lerp(-0.35, 0, e); p.farBack = lerp(-0.3, 0, e);
      p.tilt = lerp(0.14, 0, e); p.head = lerp(0.25, 0, e); p.tail = lerp(-0.4, 0, e); p.bob = lerp(2, 0, e);
    }
  }
  const tr = c.trick;
  if (tr) {
    const k = tr.t / tr.dur, f = Math.sin(t * 26);
    if (tr.type === 'flip') {
      // 웅크렸다가 뛰어올라 다리를 쭉 뻗으며 한 바퀴
      const tuck = Math.sin(k * Math.PI);
      p.front = lerp(0.2, 1.6, tuck); p.farFront = p.front - 0.2; p.back = lerp(-0.2, -1.5, tuck); p.farBack = p.back + 0.2;
      p.tail = 0.9 * tuck; p.head = 0.35 * tuck;
    } else if (tr.type === 'axel') {
      // 트리플 악셀: 다리를 모으고 회전 → 착지하며 앞발 번쩍 (짠!)
      if (k < 0.85) { p.front = 0.25; p.farFront = 0.25; p.back = -0.25; p.farBack = -0.25; p.tail = 1.1; p.head = -0.2; }
      else { const e = (k - 0.85) / 0.15; p.front = lerp(0.25, 2.6, e); p.farFront = lerp(0.25, 2.2, e); p.tilt = lerp(0, -0.35, e); p.head = -0.25; p.tail = 0.9; }
    } else if (tr.type === 'windmill') {
      // 윈드밀: 다리를 번갈아 크게 휘두르며 허우적
      p.front = f * 1.3; p.farFront = -f * 1.3; p.back = Math.sin(t * 26 + 1.6) * 1.3; p.farBack = -p.back;
      p.tail = Math.sin(t * 20) * 0.9; p.head = Math.sin(t * 14) * 0.3;
    } else if (tr.type === 'moonwalk') {
      // 문워크: 발을 끌듯이 뒤로 (앞발이 번갈아 미끄러짐)
      const s = Math.sin(c.walkT * 1.5);
      p.front = -Math.max(0, s) * 0.6; p.farFront = -Math.max(0, -s) * 0.6; p.back = s * 0.3; p.farBack = -s * 0.3;
      p.head = -0.12; p.tail = 0.4 + Math.sin(t * 6) * 0.2; p.bob = -Math.abs(s) * 2;
    } else if (tr.type === 'spin') {
      p.tail = 1 + Math.sin(t * 16) * 0.4; p.head = 0.2; p.front = Math.sin(t * 16) * 0.3; p.back = -p.front;
    }
  }
  if (c.nap > 0) {
    // 식빵 굽기: 다리를 몸 아래로 접고 고개를 숙임
    p.front = 1.45; p.farFront = 1.45; p.back = -1.4; p.farBack = -1.4; p.head = 0.35; p.tail = 1.2 + Math.sin(t * 0.8) * 0.08; p.bob = 0;
    p.napDrop = true;
  }
  return p;
}

// 스프라이트 좌표계(발끝 = 원점, 왼쪽을 봄)에 조립해서 그림
function drawRig(rig, s, pose, g = ctx) {
  const I = rig.imgs, P = rig.pivot, L = rig.legScale;
  const part = (img, anchor, pivot, ang, dx = 0, sc = 1) => {
    if (!img) return;
    g.save();
    g.translate(anchor[0] + dx, anchor[1]);
    g.rotate(ang);
    g.scale(sc, sc);
    g.drawImage(img, -pivot[0] * img.width, -pivot[1] * img.height);
    g.restore();
  };
  g.save();
  g.scale(s, s);
  // 낮잠(다리 접음)일 땐 몸이 바닥까지 내려앉음
  const drop = pose.napDrop && I.front ? I.front.height * (1 - P.front[1]) * L.front * 0.8 : 0;
  g.translate(0, pose.bob + drop);
  // 엉덩이 쪽을 축으로 기울임 (공격 때 상체를 들어올리는 느낌)
  g.translate(rig.hip[0], rig.hip[1]); g.rotate(-pose.tilt); g.translate(-rig.hip[0], -rig.hip[1]);
  const legGap = I.torso.width * 0.06;
  // 다리는 모두 몸통 뒤 → 윗면(잘린 면)이 몸통 아래로 숨음
  part(rig.farBack, rig.hip, P.back, pose.farBack, legGap, L.back);
  part(rig.farFront, rig.shoulder, P.front, pose.farFront, legGap, L.front);
  part(I.tail, rig.tail, P.tail, -pose.tail);
  part(I.back, rig.hip, P.back, pose.back, 0, L.back);
  const raised = Math.abs(pose.front) > 0.8;           // 치켜든 앞발은 가슴 앞으로
  if (!raised) part(I.front, rig.shoulder, P.front, pose.front, 0, L.front);
  g.drawImage(I.torso, rig.torso[0], rig.torso[1]);
  if (raised) part(I.front, rig.shoulder, P.front, pose.front, 0, L.front);
  part(I.head, rig.neck, P.head, -pose.head, 0, rig.headScale);
  g.restore();
}
loadParts();
