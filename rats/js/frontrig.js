'use strict';
// ───────────────────────── 필살기 앞모습 리그 (람쥐썬더) ─────────────────────────
// 그림체는 게임 다람쥐 파츠 그대로, 몸·자세는 실사 다람쥐(만화 표정 없음). 파츠·관절은 rats/dev/gen_front_rig.mjs --set rs3 가
// 한 장 시트에서 잘라 FRONT_PARTS(front_meta.js)에 넣음.
// 좌표계: 발끝 = 원점, 화면을 봄. 팔·다리 각도 0 = 아래로 늘어짐, + = 바깥으로 들어 올림(π/2 = 수평, π = 머리 위), − = 몸 안쪽으로.
// pose = { fr: 'rs', h: 키(게임 단위), waist/bow: 상반신 기울기·숙이기, head/body/tailV: 파츠 접미사('_down', '_fried'…), armL/armR, legL/legR,
//          openL/openR: 손바닥 쫙, bentL/bentR: 무릎 굽힌 다리, plant: 발을 땅에 붙임, bob(+ = 주저앉음), lean, tail(꼬리 각도),
//          headRot, headY, sx/sy(찌부), hammer: 'L'|'R' 도토리 망치, acorn: 두 손 사이 도토리, bolts: 앞발 번개, helm/cape: 토르 합성 0~1 }
const FR_IMG = {}, FR_PTS = {};
function loadFrontParts() {
  if (typeof FRONT_PARTS === 'undefined') return;
  for (const id of Object.keys(FRONT_PARTS)) {
    const im = new Image();
    im.onload = () => { FR_IMG[id] = im; if (FRONT_PARTS[id].kind === 'limb') FR_PTS[id] = limbPoints(im, FRONT_PARTS[id]); };
    im.src = `../assets/rats/front/${id}.png`;
  }
}
// 다리 접지용: 불투명 픽셀을 성기게 뽑아 피벗 기준 좌표(원본 픽셀 단위)로 [x0,y0,x1,y1,…]
function limbPoints(im, m) {
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  let d; try { d = g.getImageData(0, 0, c.width, c.height).data; } catch { return null; }
  const out = [], st = Math.max(2, Math.round(im.width / 40));
  for (let y = Math.floor(im.height * 0.4); y < im.height; y += st) for (let x = 0; x < im.width; x += st)
    if (d[(y * im.width + x) * 4 + 3] > 128) out.push((x / im.width - m.pivot[0]) * m.size[0], (y / im.height - m.pivot[1]) * m.size[1]);
  return out.length ? out : null;
}
const frontReady = fr => !!(FR_IMG[fr + '_torso'] && FR_IMG[fr + '_head'] && FR_IMG[fr + '_arm'] && FR_IMG[fr + '_leg']);
const FR_ARM = 0.7;                                          // 앞발 길이 배율 (파츠 그대로면 너무 길어 모으면 X자로 겹침)
// 나중에 따로 생성한 변형 파츠는 배율이 달라서 기준 파츠에 맞춤 [기준 파츠, 'w'(폭)|'h'(길이), 추가 배율]
const FR_NORM = { rs_arm_back: ['rs_arm', 'h', 1], rs_head_fwd: ['rs_head', 'w', 1.1], rs_arm_plant: ['rs_arm', 'h', 1], rs_leg_splay: ['rs_leg_bent', 'h', 1], rs_head_up: ['rs_head', 'w', 1.15], rs_torso_bow: ['rs_torso', 'w', 1] };
const frNorm = id => { const n = FR_NORM[id], M = FRONT_PARTS; if (!n || !M[n[0]]) return 1; const i = n[1] === 'w' ? 0 : 1; return M[n[0]].size[i] / M[id].size[i] * n[2]; };
const frPart = (base, v) => (v && FR_IMG[base + v] ? base + v : base);    // 변형 파츠가 없으면 기본 파츠

// 앞발 번개: 손끝에서 위로 지지직 (코드로 그리는 지그재그, 매 프레임 모양이 바뀜)
function pawBolt(g, x, y, ang, len, k) {
  const n = 6, pts = [[x, y]];
  for (let i = 1; i <= n; i++) { const d = len * i / n, j = (i < n ? (Math.random() - 0.5) * len * 0.35 : 0); pts.push([x + Math.sin(ang) * d + Math.cos(ang) * j, y - Math.cos(ang) * d + Math.sin(ang) * j]); }
  g.save(); g.lineCap = g.lineJoin = 'round'; g.globalCompositeOperation = 'lighter';
  for (const [w, col] of [[len * 0.16, 'rgba(150,200,255,.35)'], [len * 0.06, 'rgba(230,245,255,.95)']]) {
    g.lineWidth = w * k; g.strokeStyle = col; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts) g.lineTo(...p); g.stroke();
  }
  g.restore();
}

// 몸통 = 상반신 + 하반신, 허리 관절로 이음. 상반신은 허리를 축으로
//   waist(옆으로 기울기, + = 시계 방향) · bow(앞으로 숙이기 0~1: 세로로 짧아지고 머리가 가슴 앞으로 내려옴)
//   upV/lowV = 상·하반신 파츠 변형 ('_bow' 숙인 상반신, '_crouch' 웅크린 하반신 — 히어로 랜딩)
// 상·하반신 파츠(rs_up·rs_low, gen_front_rig --set rs5)가 있으면 그걸로, 없으면 서 있는 몸통 한 장을 허리선(FR_WAIST)에서 잘라 씀
// 머리·팔·망토는 상반신, 다리·꼬리는 하반신에 붙음. 몸통은 원본 사진처럼 통통하게 FR_BODY 배 넓힘
const FR_BODY = 1.35, FR_WAIST = 0.52, FR_LIMB_W = { arm: 1.15, leg: 1.2 };
function drawFrontRig(pose, g = ctx) {
  if (pose.land && FR_IMG[pose.land]) return drawLanding(pose, g);      // 히어로 랜딩은 한 덩어리 자세 몸통으로
  const fr = pose.fr, M = FRONT_PARTS, W = id => M[id].size[0], Hh = id => M[id].size[1];
  // 상·하반신 분리 몸통은 pose.seg 일 때만 (서 있을 땐 가늘고 길어 보여서 기본은 통통한 한 장 몸통을 허리선에서 잘라 씀)
  const seg = !!(pose.seg && !pose.body && FR_IMG[fr + '_up'] && FR_IMG[fr + '_low']);
  const T = frPart(fr + '_torso', pose.body), TM = M[T].neck ? M[T] : M[fr + '_torso'], tw = W(T) * frNorm(T) * FR_BODY, th = Hh(T) * frNorm(T);
  const headId = frPart(fr + '_head', pose.head);
  const legLen = Hh(fr + '_leg') * (1 - M[fr + '_leg'].pivot[1]), armLen = Hh(fr + '_arm') * (1 - M[fr + '_arm'].pivot[1]) * 0.92 * FR_ARM;
  const unit = (pose.h || 40) / (legLen + Hh(fr + '_torso') * 0.95 + Hh(fr + '_head') * 0.85);
  // 다리 접지: 회전된 다리 그림의 발바닥 중 가장 낮은 점을 땅에 (굽힌 다리는 발이 옆으로 뻗어 각도만으론 안 맞음)
  const footY = (id, a) => {
    const pts = FR_PTS[id]; if (!pts) return legLen;
    let lo = -1e9; const sn = Math.sin(a), c = Math.cos(a), nk = frNorm(id);
    for (let k = 0; k < pts.length; k += 2) lo = Math.max(lo, pts[k] * sn + pts[k + 1] * c);
    return lo * nk;
  };
  // 다리 변형: kneelL/R 무릎 꿇음(히어로 랜딩 전용 파츠가 없으면 세로로 짧게) · kneeupL/R 무릎 세움 · splayL/R 옆으로 벌림 · bentL/R 굽힘
  const legOf = k => frPart(fr + '_leg', pose['kneel' + k] && FR_IMG[fr + '_leg_kneel'] ? '_kneel' : pose['kneeup' + k] ? '_kneeup' : pose['splay' + k] ? '_splay' : pose['bent' + k] && '_bent');
  // crouchH = 엉덩이 높이(다리 길이 대비, 히어로 랜딩 0.4 안팎): 몸을 그 높이로 내리고 다리는 발이 땅에 닿게 세로로 줄임(원근)
  const crouchH = pose.crouchH, hipH = crouchH ? legLen * crouchH : legLen;
  const legKy = k => (crouchH ? clamp(hipH / Math.max(1, footY(legOf(k), pose['leg' + k] || 0)), 0.3, 1.2) : pose['kneel' + k] && !FR_IMG[fr + '_leg_kneel'] ? 0.58 : 1);
  const plant = pose.plant && !crouchH ? legLen - Math.max(footY(legOf('L'), pose.legL || 0) * legKy('L'), footY(legOf('R'), pose.legR || 0) * legKy('R')) : 0;
  const bob = (pose.bob || 0) / unit + plant;
  // ── 하반신 ──
  let LO, lx, ly, lw, lh;                                         // 하반신 그림 id·위치·크기
  if (seg) {
    LO = frPart(fr + '_low', pose.lowV); const k = tw / W(fr + '_low'); lw = W(LO) * k; lh = Hh(LO) * k;
    ly = -(hipH + M[LO].hipL[1] * lh) + bob; lx = -M[LO].waist[0] * lw;
  } else { LO = T; lw = tw; lh = th; lx = -tw / 2; ly = -(hipH + TM.hipL[1] * th) + bob; }
  const LJ = seg ? (k => [lx + M[LO][k][0] * lw, ly + M[LO][k][1] * lh]) : (k => [lx + TM[k][0] * lw, ly + TM[k][1] * lh]);
  const waistP = seg ? LJ('waist') : [0, ly + th * FR_WAIST];
  // ── 상반신: 허리 기준 세로 압축(숙임) → 회전(기울기) ──
  const wa = pose.waist || 0, bow = clamp(pose.bow || 0, -0.3, 1), usy = 1 - bow * (seg ? 0.3 : 0.55);
  let UP, ux, uy, uw, uh;
  if (seg) { UP = frPart(fr + '_up', pose.upV); const k = tw / W(fr + '_up'); uw = W(UP) * k; uh = Hh(UP) * k; ux = waistP[0] - M[UP].waist[0] * uw; uy = waistP[1] - M[UP].waist[1] * uh; }
  else { UP = T; uw = tw; uh = th; ux = lx; uy = ly; }
  const cw = Math.cos(wa), sw = Math.sin(wa), [wx, wy] = waistP;
  const U = ([x, y]) => { const xx = x - wx, yy = (y - wy) * usy; return [wx + xx * cw - yy * sw, wy + xx * sw + yy * cw]; };
  const UJ = seg ? (k => U([ux + M[UP][k][0] * uw, uy + M[UP][k][1] * uh])) : (k => U([ux + TM[k][0] * uw, uy + TM[k][1] * uh]));
  const upH = seg ? uh : th;                                        // 상반신 기준 길이 (망토·머리 위치)
  const rotV = (x, y) => [x * cw - y * sw, x * sw + y * cw];
  g.save();
  g.scale(pose.sx || 1, pose.sy || 1);
  g.scale(unit, unit);
  // side −1 = 화면 왼쪽, +1 = 오른쪽, k = 배율, kx = 굵기, extra = 상반신 회전, ky = 세로 배율.
  // 파츠 원본은 전부 '화면 오른쪽' 팔다리(크림색 안쪽 털이 왼쪽, 굽힌 다리는 무릎·발이 오른쪽) → 왼쪽 것을 뒤집음
  const limb = (id, [x, y], ang, side, k = 1, kx = 1, extra = 0, ky = 1) => {
    const im = FR_IMG[id]; if (!im) return;
    const m = M[id], w = m.size[0], h = m.size[1];
    g.save(); g.translate(x, y); g.rotate(-side * ang + extra); if (side < 0) g.scale(-1, 1); const nk = frNorm(id); g.scale(k * kx * nk, k * nk * ky);
    g.drawImage(im, -m.pivot[0] * w, -m.pivot[1] * h, w, h); g.restore();
  };
  const armOf = k => frPart(fr + '_arm', pose['punch' + k] ? '_punch' : pose['reach' + k] ? '_reach' : pose['back' + k] ? '_back' : pose['plant' + k] ? '_plant' : pose['open' + k] && '_open');
  const hand = ([x, y], ang, side, kk = 1) => { const [dx, dy] = rotV(side * Math.sin(ang) * armLen * kk, Math.cos(ang) * armLen * kk); return [x + dx, y + dy]; };
  // groundL/R = 그 손을 땅에 짚음: 어깨 높이에서 땅까지 닿게 팔 길이 배율 (0.6~1.8). 땅 짚는 전용 팔(reach/punch)은 원래 길이로 맞춰 둠
  const reach = (sh, ang, side) => { const dy = rotV(side * Math.sin(ang), Math.cos(ang))[1]; return dy > 0.2 ? clamp(-sh[1] / (dy * armLen), 0.6, 1.8) : 1; };
  g.translate(0, waistP[1]); g.rotate(pose.lean || 0); g.translate(0, -waistP[1]);
  // 망토 (몸 뒤, 상반신 목에 걸림). capeV '_flare' = 착지 충격에 위로 펄럭
  const capeId = frPart(fr + '_cape', pose.capeV);
  if (pose.cape && FR_IMG[capeId]) {
    const im = FR_IMG[capeId], cwid = tw * (pose.capeV ? 1.7 : 1.35) * pose.cape, chh = cwid * im.height / im.width, [nx, ny] = UJ('neck'), fl = 1 + Math.sin(G.t * 12) * 0.05, flare = capeId !== fr + '_cape';
    g.save(); g.translate(nx, ny + upH * 0.05 * usy); g.rotate(wa * 0.6); g.scale(fl * (1 + Math.max(0, bow) * 0.25), (flare ? 1 : usy) / fl);
    g.drawImage(im, -cwid / 2, flare ? -chh * 0.85 : 0, cwid, chh); g.restore();      // 펄럭 망토는 걸쇠(아래 가운데)를 목에
  }
  // 꼬리: 몸 뒤 오른쪽으로 솟음 (하반신에 붙음)
  const tid = frPart(fr + '_tail', pose.tailV), TI2 = FR_IMG[tid];
  if (TI2) { const m = M[tid], [x, y] = LJ('tail'); g.save(); g.translate(x + tw * 0.33, y); g.rotate(pose.tail || 0); g.drawImage(TI2, -m.pivot[0] * m.size[0], -m.pivot[1] * m.size[1], m.size[0], m.size[1]); g.restore(); }
  limb(legOf('L'), LJ('hipL'), pose.legL || 0, -1, 1, FR_LIMB_W.leg, 0, legKy('L'));
  limb(legOf('R'), LJ('hipR'), pose.legR || 0, 1, 1, FR_LIMB_W.leg, 0, legKy('R'));
  // 몸통: 하반신 → 상반신 (한 장일 땐 이음매가 안 보이게 살짝 겹침)
  const upXf = () => { g.translate(wx, wy); g.rotate(wa); g.scale(1, usy); g.translate(-wx, -wy); };
  if (seg) {
    g.drawImage(FR_IMG[LO], lx, ly, lw, lh);
    g.save(); upXf(); g.drawImage(FR_IMG[UP], ux, uy, uw, uh); g.restore();
  } else {
    const TI = FR_IMG[T], iw = TI.width, ih = TI.height, ov = 0.05;
    g.drawImage(TI, 0, ih * FR_WAIST, iw, ih * (1 - FR_WAIST), lx, wy, tw, th * (1 - FR_WAIST));
    g.save(); upXf(); g.drawImage(TI, 0, 0, iw, ih * (FR_WAIST + ov), lx, ly, tw, th * (FR_WAIST + ov)); g.restore();
  }
  // 머리 (+ 투구): 상반신 목에. 숙이면 앞으로 나와 살짝 커짐
  const HI = FR_IMG[headId];
  if (HI) {
    const hm = M[headId], hw = hm.size[0], hh = hm.size[1], [nx, ny] = UJ('neck'), hs = (1 + Math.max(0, bow) * 0.12) * frNorm(headId);
    // 숙이면 머리가 가슴 앞으로 내려옴 (어깨가 솟아 보임)
    g.save(); g.translate(nx, ny + upH * 0.08 * usy + Math.max(0, bow) * hh * (seg ? 0.12 : 0.22) + (pose.headY || 0) / unit); g.rotate(wa + (pose.headRot || 0)); g.scale(hs, hs);
    g.drawImage(HI, -hm.pivot[0] * hw, -hm.pivot[1] * hh, hw, hh);
    if (pose.helm && FR_IMG[fr + '_helm']) { const im = FR_IMG[fr + '_helm'], w = hw * 0.8 * pose.helm, h = w * im.height / im.width; g.drawImage(im, -w / 2, -hh * 0.8 - h * 0.5, w, h); }
    g.restore();
  }
  // 팔 (+ 망치·번개): 상반신 어깨에, 상반신 기울기만큼 같이 돎
  for (const [k, a, side] of [['L', pose.armL || 0, -1], ['R', pose.armR || 0, 1]]) {
    const sh = UJ('shoulder' + k), aid = armOf(k);
    const kk = pose['ground' + k] ? reach(sh, a, side) : 1;           // 땅 짚는 손: 어깨 높이에 맞춰 길이 조절 → 손이 정확히 바닥에
    limb(aid, sh, a, side, FR_ARM, FR_LIMB_W.arm / Math.sqrt(kk), wa, kk);
    const [hx, hy] = hand(sh, a, side, kk);
    if (pose.hammer === k && FR_IMG[fr + '_hammer']) {
      const im = FR_IMG[fr + '_hammer'], hh = th * 1.2, hw = hh * im.width / im.height;
      g.save(); g.translate(hx, hy); g.rotate(Math.PI - side * a + wa + (pose.hammerRot || 0)); g.drawImage(im, -hw / 2, -hh * 0.75, hw, hh); g.restore();
    }
    if (pose.bolts) pawBolt(g, hx, hy, side * (Math.PI - a) + wa + (Math.random() - 0.5) * 0.5, th * (0.6 + Math.random() * 0.5) * pose.bolts, 1);
  }
  if (pose.acorn && FR_IMG[fr + '_acorn']) {
    // 두 앞발 사이 도토리 (오물오물)
    const im = FR_IMG[fr + '_acorn'], [ax, ay] = hand(UJ('shoulderL'), pose.armL || 0, -1), [bx, by] = hand(UJ('shoulderR'), pose.armR || 0, 1), w = tw * 0.26, h = w * im.height / im.width;
    g.save(); g.translate((ax + bx) / 2, (ay + by) / 2 - h * 0.3); g.rotate(wa + Math.sin(G.t * 9) * 0.06); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore();
  }
  g.restore();
}
// ── 히어로 랜딩 (한 덩어리 자세 몸통 + 따로 움직이는 숙인 얼굴·뒤로 뻗은 팔·꼬리·망토) ──
// 종이 인형 몸통으로는 앞으로 숙인 원근이 안 나와서 자세 자체를 한 장으로 (gen_front_rig --set rs6). 연결 위치는 그림 보고 잡음(0~1 비율)
//   neck = 목 잘린 면, shoulder = 빠진 팔의 어깨(크림색 원, 그림 오른쪽 위), tail = 꼬리 뿌리, foot = 땅 기준 가운데 x
// 팔(rs_arm_up_back*)은 원본이 왼쪽 위로 뻗어 있어 좌우 뒤집어 오른쪽 위로. cut = 어깨 잘린 면, tip = 손끝
const FR_LAND = {
  rs_land_body: { neck: [0.53, 0.03], shoulder: [0.76, 0.19], tail: [0.72, 0.45], foot: 0.5 },
  rs_land_body2: { neck: [0.5, 0.03], shoulder: [0.74, 0.19], tail: [0.7, 0.5], foot: 0.5 },
  rs_arm_up_back: { cut: [0.91, 0.865], tip: [0.07, 0.08] },
  rs_arm_up_back2: { cut: [0.9, 0.86], tip: [0.13, 0.13] },
};
const FR_LAND_HEAD = 0.78, FR_LAND_ARM = 0.72;           // 같은 시트라도 머리·팔이 크게 나와서 줄임
// pose = { land: 'rs_land_body'|'rs_land_body2', h, head: 'rs_head_bow'|'rs_head_bow2', headRot, headY, arm: 'rs_arm_up_back'|…, armRot,
//          hammer: 1 (든 손에 도토리 망치), bolts, helm, cape, tail, sx, sy }
function drawLanding(pose, g = ctx) {
  const M = FRONT_PARTS, B = pose.land, bm = M[B], LA = FR_LAND[B], [bw, bh] = bm.size;
  const hid = FR_IMG[pose.head] ? pose.head : 'rs_head_bow', hm = M[hid];
  const unit = (pose.h || 40) / (bh + (hm ? hm.size[1] * FR_LAND_HEAD * 0.45 : 0));
  const P = ([x, y]) => [(x - LA.foot) * bw, -bh + y * bh];          // 몸통 그림 비율 → 발끝 원점 좌표
  g.save(); g.scale(pose.sx || 1, pose.sy || 1); g.scale(unit, unit);
  // 망토 (펄럭, 걸쇠 = 목)
  const cap = FR_IMG.rs_cape_flare || FR_IMG.rs_cape;
  if (pose.cape && cap) { const [nx, ny] = P(LA.neck), cw = bw * 1.25 * pose.cape, ch = cw * cap.height / cap.width, fl = 1 + Math.sin(G.t * 14) * 0.05; g.save(); g.translate(nx, ny + bh * 0.08); g.scale(fl, 1 / fl); g.drawImage(cap, -cw / 2, FR_IMG.rs_cape_flare ? -ch * 0.8 : 0, cw, ch); g.restore(); }
  // 꼬리 (몸 뒤)
  const tid = FR_IMG.rs_tail_sweep ? 'rs_tail_sweep' : 'rs_tail', tm = M[tid];
  if (FR_IMG[tid]) { const [x, y] = P(LA.tail), k = bh * 0.95 / tm.size[1]; g.save(); g.translate(x, y); g.rotate(pose.tail || 0); g.scale(k, k); g.drawImage(FR_IMG[tid], -tm.pivot[0] * tm.size[0], -tm.pivot[1] * tm.size[1], tm.size[0], tm.size[1]); g.restore(); }
  g.drawImage(FR_IMG[B], -LA.foot * bw, -bh, bw, bh);
  // 뒤로 뻗은 팔 (+ 망치·번개)
  const aid = FR_IMG[pose.arm] ? pose.arm : null;
  if (aid) {
    const am = M[aid], AL = FR_LAND[aid], [aw, ah] = am.size, [sx0, sy0] = P(LA.shoulder), rot = pose.armRot || 0;
    g.save(); g.translate(sx0, sy0); g.rotate(rot); g.scale(-FR_LAND_ARM, FR_LAND_ARM);
    g.drawImage(FR_IMG[aid], -AL.cut[0] * aw, -AL.cut[1] * ah, aw, ah); g.restore();
    // 손끝: (tip − cut) 을 뒤집고·돌리고·줄인 위치
    const vx = -(AL.tip[0] - AL.cut[0]) * aw * FR_LAND_ARM, vy = (AL.tip[1] - AL.cut[1]) * ah * FR_LAND_ARM;
    const tx = sx0 + vx * Math.cos(rot) - vy * Math.sin(rot), ty = sy0 + vx * Math.sin(rot) + vy * Math.cos(rot), dir = Math.atan2(tx - sx0, -(ty - sy0));
    if (pose.hammer && FR_IMG.rs_hammer) { const im = FR_IMG.rs_hammer, hh = bh * 0.75, hw = hh * im.width / im.height; g.save(); g.translate(tx, ty); g.rotate(dir + (pose.hammerRot || 0)); g.drawImage(im, -hw / 2, -hh * 0.75, hw, hh); g.restore(); }
    if (pose.bolts) pawBolt(g, tx, ty, dir + (Math.random() - 0.5) * 0.5, bh * (0.5 + Math.random() * 0.4) * pose.bolts, 1);
  }
  // 숙인 얼굴 (+ 투구): 목에, 끄덕·떨림은 headRot·headY
  if (hm && FR_IMG[hid]) {
    const [nx, ny] = P(LA.neck), [hw, hh] = hm.size;
    g.save(); g.translate(nx, ny + bh * 0.1 + (pose.headY || 0) / unit); g.rotate(pose.headRot || 0); g.scale(FR_LAND_HEAD, FR_LAND_HEAD);
    g.drawImage(FR_IMG[hid], -hm.pivot[0] * hw, -hm.pivot[1] * hh, hw, hh);
    if (pose.helm && FR_IMG.rs_helm) { const im = FR_IMG.rs_helm, w = hw * 0.78 * pose.helm, h = w * im.height / im.width; g.drawImage(im, -w / 2, -hh * (hid === 'rs_head_bow2' ? 0.95 : 0.85) - h * 0.45, w, h); }
    g.restore();
  }
  g.restore();
}
loadFrontParts();
