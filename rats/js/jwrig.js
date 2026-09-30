'use strict';
// ───────────────────────── 줴리 필살기 "감사합니다" 턱시도 리그 ─────────────────────────
// 제리 인사 밈 패러디(원작 디자인은 안 베낌): 옆·반측면(왼쪽을 봄)에서 허리 관절로 상반신을 90도까지 꺾어 인사.
// 파츠 = rats/dev/gen_front_rig.mjs --set jw (시트 한 장) → FR_IMG / FRONT_PARTS 의 jw_*. 꼬리는 일반 파츠(RAT_RIGS.jwerry)
// 연결 위치(0~1 비율)는 알파 분석 + 그림 보고 잡음.
//   up: 상반신(목·허리·어깨) · low: 하반신(허리·엉덩이·꼬리) · leg/arm*: 잘린 면(관절) · head: 목 잘린 면
const JW_RIG = {                                   // 3차(2등신) 파츠 기준
  up: { neck: [0.52, 0.04], waist: [0.48, 0.97], shoulder: [0.6, 0.25] },
  low: { waist: [0.38, 0.04], hip: [0.3, 0.84], tail: [0.75, 0.4] },
  leg: [0.7, 0.03], arm: [0.63, 0.03], arm_belly: [0.47, 0.03], arm_out: [0.98, 0.46], arm_wave: [0.82, 0.97],
  head: { jw_head_smug: [0.4, 0.97], jw_head_grin: [0.45, 0.97], jw_head_wink: [0.43, 0.97] },
};
// 밈처럼 2등신: 머리는 그대로, 몸(몸통·팔·다리)만 줄임 (파츠를 2등신으로 그려도 몸 합계가 머리의 약 1.9배로 나와서)
const JW_BODY_K = 0.65;
const jwReady = () => !!(FR_IMG.jw_up && FR_IMG.jw_low && FR_IMG.jw_leg && FR_IMG.jw_head_smug);
// pose = { jw: 1, h: 키, bend: 인사 각도(라디안, + = 앞으로 숙임), head: 'smug'|'grin'|'wink', headRot,
//          near: 'arm'|'belly'|'out'|'wave' (가까운 팔), nearRot, far: 'arm'|'out'|null (먼 팔), farRot, tail, bob, sx, sy, rose: 발밑 장미 수 }
function drawBowRig(pose, g = ctx) {
  const M = FRONT_PARTS, S = id => M[id].size, R = JW_RIG;
  const BK = JW_BODY_K, sz = id => S(id).map(v => v * BK);
  const [lw, lh] = sz('jw_low'), [uw, uh] = sz('jw_up'), [gw, gh] = sz('jw_leg'), hd = 'jw_head_' + (pose.head || 'smug'), [hw, hh] = S(hd);
  const legH = gh * (1 - R.leg[1]);
  const unit = (pose.h || 40) / (legH + lh * 0.8 + uh * 0.95 + hh * 0.9);
  const bend = pose.bend || 0, c = Math.cos(-bend), s = Math.sin(-bend);   // 앞(왼쪽)으로 숙이면 반시계 회전
  g.save(); g.scale(pose.sx || 1, pose.sy || 1); g.scale(unit, unit); g.translate(0, (pose.bob || 0) / unit);
  // 하반신: 엉덩이 관절이 다리 길이만큼 위
  const lx = -R.low.hip[0] * lw, ly = -legH - R.low.hip[1] * lh, LJ = k => [lx + R.low[k][0] * lw, ly + R.low[k][1] * lh];
  const [wx, wy] = LJ('waist');
  // 상반신: 허리 잘린 면을 하반신 허리에 맞추고 허리를 축으로 회전
  const ux = wx - R.up.waist[0] * uw, uy = wy - R.up.waist[1] * uh;
  const U = ([x, y]) => { const dx = x - wx, dy = y - wy; return [wx + dx * c - dy * s, wy + dx * s + dy * c]; };
  const UJ = k => U([ux + R.up[k][0] * uw, uy + R.up[k][1] * uh]);
  const part = (id, [x, y], piv, rot, dark, k = BK) => {           // k: 몸 파츠는 BK, 머리는 1
    const im = FR_IMG[id]; if (!im) return; const [w, h] = S(id);
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(k, k); if (dark) g.filter = 'brightness(0.72)';
    g.drawImage(im, -piv[0] * w, -piv[1] * h, w, h); g.restore();
  };
  const armId = k => ({ arm: 'jw_arm', belly: 'jw_arm_belly', out: 'jw_arm_out', wave: 'jw_arm_wave' }[k]), armPiv = k => R[{ arm: 'arm', belly: 'arm_belly', out: 'arm_out', wave: 'arm_wave' }[k]];
  // 꼬리 (일반 파츠, 몸 뒤로 휘어 올라감)
  const rig = RAT_RIGS.jwerry, TI = rig && rig.imgs.tail;
  if (TI) { const P = rig.pivot.tail, [tx, ty] = LJ('tail'), k = lw * 1.1 / TI.width; g.save(); g.translate(tx, ty); g.rotate(-0.5 + (pose.tail || 0)); g.scale(-k, k); g.drawImage(TI, -P[0] * TI.width, -P[1] * TI.height); g.restore(); }
  // 먼 다리·먼 팔(어둡게) → 하반신 → 가까운 다리 → 상반신 → 머리 → 가까운 팔
  part('jw_leg', [lx + R.low.hip[0] * lw + lw * 0.14, ly + R.low.hip[1] * lh], R.leg, 0.05, true);
  if (pose.far) part(armId(pose.far), UJ('shoulder'), armPiv(pose.far), -bend + (pose.farRot || 0), true, BK * 0.95);
  part('jw_leg', [lx + R.low.hip[0] * lw, ly + R.low.hip[1] * lh], R.leg, -0.03, false);   // 다리 잘린 면(분홍)이 안 보이게 하반신보다 먼저
  g.drawImage(FR_IMG.jw_low, lx, ly, lw, lh);
  g.save(); g.translate(wx, wy); g.rotate(-bend); g.translate(-wx, -wy); g.drawImage(FR_IMG.jw_up, ux, uy, uw, uh); g.restore();
  const [nx, ny] = UJ('neck');
  part(hd, [nx, ny + uh * 0.08], R.head[hd] || [0.43, 0.97], -bend * 0.85 + (pose.headRot || 0), false, 1);   // 2등신 큰 머리
  // 손 흔드는 팔은 얼굴을 가리지 않게 조금 길게·바깥(앞쪽 위)으로
  const nw = pose.near === 'wave';
  part(armId(pose.near || 'arm'), UJ('shoulder'), armPiv(pose.near || 'arm'), -bend + (pose.nearRot || 0) + (nw ? -0.75 : 0), false, nw ? BK * 1.35 : BK);
  g.restore();
}
