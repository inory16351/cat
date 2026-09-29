'use strict';
// ───────────────────────── 쥐 그리기 (임시 그림) ─────────────────────────
// 나중에 Codex 로 생성한 이미지(assets/rats/<id>.png)가 있으면 그걸 쓰고, 없으면 여기서 그린다.
// 좌표계: 옆모습, 왼쪽을 봄, 발끝 중앙 = (0,0), 위쪽이 음수. 평면 파스텔, 외곽선 없음.

// 몸 형태별 기준점 (코스튬을 붙일 자리)
const BODY = {
  rat: { body: [3, -10, 16, 8.5], head: [-14, -12, 7.5], snout: [-24, -10], ear: [-12, -18, 4], eye: [-18, -13.5], tail: 44, legs: [-9, 11] },
  mouse: { body: [2, -9, 12, 7.5], head: [-11, -11, 7], snout: [-19, -9.5], ear: [-9, -18, 5.2], eye: [-15, -12.5], tail: 32, legs: [-7, 8] },
  hamster: { body: [1, -11, 13, 10.5], head: [-8, -13, 8.5], snout: [-15, -11], ear: [-6, -21, 3.2], eye: [-11, -14.5], tail: 4, legs: [-7, 7] },
};

function drawRatBody(g, sp, walk, t) {
  const f = FUR[sp.fur], B = BODY[sp.shape];
  const [bx, by, brx, bry] = B.body, [hx, hy, hr] = B.head;
  // 꼬리
  g.strokeStyle = sp.shape === 'hamster' ? f.body : '#e2b3aa'; g.lineCap = 'round';
  g.lineWidth = sp.shape === 'rat' ? 2.6 : 2;
  g.beginPath(); g.moveTo(bx + brx - 2, by + 2);
  const w = Math.sin(t * 6 + walk) * 5;
  g.bezierCurveTo(bx + brx + B.tail * 0.4, by + 6 + w, bx + brx + B.tail * 0.7, by - 6 - w, bx + brx + B.tail, by - 2 + w);
  g.stroke();
  // 다리 (걷기)
  g.fillStyle = f.ear;
  for (const [lx, ph] of [[B.legs[0], 0], [B.legs[1], Math.PI], [B.legs[0] + 4, Math.PI], [B.legs[1] + 4, 0]]) {
    g.beginPath(); g.ellipse(lx + Math.sin(walk + ph) * 3, -1.5, 3, 1.8, 0, 0, Math.PI * 2); g.fill();
  }
  // 몸통
  g.fillStyle = f.body; g.beginPath(); g.ellipse(bx, by, brx, bry, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = f.belly; g.beginPath(); g.ellipse(bx - 3, by + bry * 0.45, brx * 0.7, bry * 0.45, 0, 0, Math.PI * 2); g.fill();
  if (f.stripe) { g.strokeStyle = f.stripe; g.lineWidth = 2; g.beginPath(); g.moveTo(bx - brx * 0.6, by - bry * 0.85); g.quadraticCurveTo(bx, by - bry * 1.05, bx + brx * 0.8, by - bry * 0.6); g.stroke(); }
  // 머리 + 주둥이
  g.fillStyle = f.hood || f.body;
  g.beginPath(); g.ellipse(hx, hy, hr, hr * 0.88, 0, 0, Math.PI * 2); g.fill();
  if (sp.shape !== 'hamster') { g.beginPath(); g.moveTo(hx - hr * 0.3, hy - hr * 0.7); g.lineTo(B.snout[0], B.snout[1]); g.lineTo(hx, hy + hr * 0.8); g.closePath(); g.fill(); }
  else { g.fillStyle = f.belly; g.beginPath(); g.ellipse(hx - 3, hy + 3, 5, 4, 0, 0, Math.PI * 2); g.fill(); }
  // 귀
  const [ex, ey, er] = B.ear;
  g.fillStyle = f.hood || f.body; g.beginPath(); g.arc(ex, ey, er, 0, Math.PI * 2); g.fill();
  g.fillStyle = f.ear; g.beginPath(); g.arc(ex - 0.5, ey + 0.3, er * 0.6, 0, Math.PI * 2); g.fill();
  // 눈 · 코 · 수염
  g.fillStyle = f.eye || '#2b2724'; g.beginPath(); g.arc(B.eye[0], B.eye[1], 1.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(B.eye[0] - 0.5, B.eye[1] - 0.6, 0.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e8908a'; g.beginPath(); g.arc(B.snout[0] + 0.5, B.snout[1], 1.6, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(75,69,64,.35)'; g.lineWidth = 0.6;
  g.beginPath(); g.moveTo(B.snout[0] + 3, B.snout[1]); g.lineTo(B.snout[0] - 5, B.snout[1] - 3); g.moveTo(B.snout[0] + 3, B.snout[1] + 1); g.lineTo(B.snout[0] - 5, B.snout[1] + 3); g.stroke();
  return B;
}

// ───────── 코스튬 (60여 종) ─────────
// P: 몸 형태 기준점. head = [x, y, r], body = [x, y, rx, ry]
const hat = (g, P, dy = 0) => { const [x, y, r] = P.head; return [x, y - r * 0.75 + dy, r]; };
const ACC = {
  labcoat(g, P) { const [x, y, rx, ry] = P.body; g.fillStyle = '#fbfaf7'; g.beginPath(); g.ellipse(x + 1, y + 1, rx * 0.95, ry * 0.95, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#dfe6ea'; g.fillRect(x - rx * 0.6, y - 1, 2, ry); },
  goggles(g, P) { const [x, y, r] = P.head; g.fillStyle = '#5b5550'; g.fillRect(x - r, y - r * 0.55, r * 2, 2.2); g.fillStyle = '#9fd3e3'; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.45, 3, 0, 7); g.fill(); },
  glasses(g, P) { g.strokeStyle = '#4b4540'; g.lineWidth = 1.1; g.beginPath(); g.arc(P.eye[0], P.eye[1], 2.8, 0, 7); g.stroke(); g.beginPath(); g.moveTo(P.eye[0] + 2.8, P.eye[1]); g.lineTo(P.ear[0], P.eye[1] - 1); g.stroke(); },
  pencil(g, P) { g.save(); g.translate(P.ear[0] + 2, P.ear[1] + 3); g.rotate(-0.5); g.fillStyle = '#e6b35a'; g.fillRect(-1, -8, 2.4, 11); g.fillStyle = '#f3dcc0'; g.fillRect(-1, 3, 2.4, 2); g.restore(); },
  hardhat(g, P) { const [x, y, r] = hat(g, P); g.fillStyle = '#e6b35a'; g.beginPath(); g.arc(x, y + 2, r * 0.85, Math.PI, 0); g.fill(); g.fillRect(x - r * 1.1, y + 1, r * 2.2, 2.2); },
  chefhat(g, P) { const [x, y, r] = hat(g, P); g.fillStyle = '#fbfaf7'; g.fillRect(x - r * 0.6, y - r * 0.8, r * 1.2, r); for (const dx of [-0.45, 0, 0.45]) { g.beginPath(); g.arc(x + dx * r, y - r * 0.9, r * 0.45, 0, 7); g.fill(); } },
  backpack(g, P) { const [x, y, rx, ry] = P.body; g.fillStyle = '#c9745b'; g.beginPath(); g.ellipse(x + rx * 0.35, y - ry * 0.6, rx * 0.45, ry * 0.55, 0, 0, 7); g.fill(); g.fillStyle = '#ad5c45'; g.fillRect(x + rx * 0.2, y - ry * 0.6, rx * 0.3, 2); },
  mailcap(g, P) { const [x, y, r] = hat(g, P, 1); g.fillStyle = '#6f8a9e'; g.beginPath(); g.ellipse(x, y, r * 0.9, r * 0.45, 0, Math.PI, 0); g.fill(); g.fillRect(x - r * 1.3, y - 1, r * 1.1, 2); },
  mailbag(g, P) { const [x, y, rx, ry] = P.body; g.fillStyle = '#a47a57'; g.fillRect(x - 3, y - 1, rx * 0.7, ry * 0.9); g.strokeStyle = '#a47a57'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - rx * 0.5, y - ry); g.lineTo(x + 3, y); g.stroke(); },
  cap(g, P) { const [x, y, r] = hat(g, P, 1); g.fillStyle = '#c9745b'; g.beginPath(); g.ellipse(x, y, r * 0.85, r * 0.5, 0, Math.PI, 0); g.fill(); g.fillRect(x - r * 1.35, y - 1, r * 1, 2); },
  parcel(g, P) { const [x, y, rx, ry] = P.body; g.fillStyle = '#c8a27a'; g.fillRect(x - 2, y - ry * 1.9, rx * 1.1, ry * 1.1); g.fillStyle = '#e6d3b0'; g.fillRect(x - 2 + rx * 0.45, y - ry * 1.9, 2, ry * 1.1); },
  bandana(g, P) { const [x, y, r] = hat(g, P, 2); g.fillStyle = '#8fb3c7'; g.beginPath(); g.ellipse(x, y, r * 0.9, r * 0.45, 0, Math.PI, 0); g.fill(); g.beginPath(); g.moveTo(x + r * 0.8, y); g.lineTo(x + r * 1.5, y - 2); g.lineTo(x + r * 1.3, y + 3); g.fill(); },
  mop(g, P) { const [x, y] = P.body; g.strokeStyle = '#a47a57'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 14, y + 8); g.lineTo(x - 4, y - 18); g.stroke(); g.fillStyle = '#e3dccf'; g.fillRect(x - 17, y + 6, 8, 4); },
  glow(g, P, t) { const [x, y, rx] = P.body; g.fillStyle = `rgba(200,240,160,${0.25 + 0.1 * Math.sin(t * 5)})`; g.beginPath(); g.arc(x - 4, y, rx * 1.6, 0, 7); g.fill(); },
  antenna(g, P, t) { const [x, y, r] = hat(g, P); g.strokeStyle = '#6f8a6b'; g.lineWidth = 1; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x + d * 2, y); g.lineTo(x + d * 4, y - 9 + Math.sin(t * 8 + d) * 1.5); g.stroke(); g.fillStyle = '#c8f0a8'; g.beginPath(); g.arc(x + d * 4, y - 9, 1.8, 0, 7); g.fill(); } },
  headband(g, P) { const [x, y, r] = P.head; g.fillStyle = '#c9745b'; g.fillRect(x - r, y - r * 0.55, r * 2, 2.4); g.fillRect(x + r * 0.8, y - r * 0.55, 5, 1.6); },
  muscle(g, P) { const [x, y, rx, ry] = P.body; g.fillStyle = FUR.golden.body; g.beginPath(); g.arc(x - rx * 0.55, y + ry * 0.15, ry * 0.55, 0, 7); g.fill(); g.beginPath(); g.arc(x + rx * 0.5, y + ry * 0.15, ry * 0.5, 0, 7); g.fill(); },
  ninja(g, P, t) { const [x, y, r] = P.head; g.fillStyle = '#3f3a36'; g.beginPath(); g.ellipse(x, y, r * 1.02, r * 0.95, 0, 0, 7); g.fill(); g.fillStyle = '#f3dcc0'; g.fillRect(x - r * 0.9, y - r * 0.45, r * 1.2, 3); g.fillStyle = '#c9504a'; g.fillRect(x + r * 0.7, y - r * 0.6, 7, 2); g.fillRect(x + r * 0.8, y - r * 0.2 + Math.sin(t * 10) * 1.5, 6, 1.6); },
  pandahood(g, P) { const [x, y, r] = P.head; g.fillStyle = '#fbfaf7'; g.beginPath(); g.arc(x + 1, y - 1, r * 1.12, Math.PI * 0.9, Math.PI * 2.1); g.fill(); g.fillStyle = '#3f3a36'; for (const d of [-0.6, 0.6]) { g.beginPath(); g.arc(x + d * r, y - r * 1.05, r * 0.35, 0, 7); g.fill(); } },
  bamboo(g, P) { g.fillStyle = '#8fa98b'; g.fillRect(P.snout[0] - 8, P.snout[1] + 1, 14, 2); },
  froghood(g, P) { const [x, y, r] = P.head; g.fillStyle = '#8fa98b'; g.beginPath(); g.arc(x + 1, y - 1, r * 1.15, Math.PI * 0.85, Math.PI * 2.15); g.fill(); for (const d of [-0.45, 0.45]) { g.fillStyle = '#8fa98b'; g.beginPath(); g.arc(x + d * r, y - r * 1.1, r * 0.4, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + d * r, y - r * 1.12, r * 0.22, 0, 7); g.fill(); g.fillStyle = '#2b2724'; g.beginPath(); g.arc(x + d * r - 0.6, y - r * 1.12, r * 0.1, 0, 7); g.fill(); } },
  sharkhood(g, P) { const [x, y, r] = P.head; g.fillStyle = '#8fa4b3'; g.beginPath(); g.arc(x + 2, y - 1, r * 1.2, Math.PI * 0.8, Math.PI * 2.2); g.fill(); g.beginPath(); g.moveTo(x, y - r * 1.1); g.lineTo(x + 5, y - r * 2); g.lineTo(x + 8, y - r * 0.9); g.fill(); g.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x - r + i * 3.5, y - r * 0.15); g.lineTo(x - r + 1.7 + i * 3.5, y + 2); g.lineTo(x - r + 3.4 + i * 3.5, y - r * 0.15); g.fill(); } },
  bananasuit(g, P) { const [x, y, rx, ry] = P.body; g.fillStyle = '#ecd36b'; g.beginPath(); g.ellipse(x - 2, y - 2, rx * 1.1, ry * 1.25, -0.15, 0, 7); g.fill(); g.fillStyle = '#8c7a50'; g.fillRect(x + rx * 0.9, y - ry * 1.4, 3, 4); const [hx, hy, hr] = P.head; g.fillStyle = '#ecd36b'; g.beginPath(); g.arc(hx + 1, hy - 1, hr * 1.1, Math.PI * 0.9, Math.PI * 2.1); g.fill(); },
  cyber(g, P) { const [x, y, rx, ry] = P.body; g.fillStyle = '#c9d3d8'; g.fillRect(x - rx * 0.2, y - ry * 0.8, rx * 0.8, ry * 1.2); g.fillStyle = '#e8605a'; g.beginPath(); g.arc(P.eye[0], P.eye[1], 2.2, 0, 7); g.fill(); g.strokeStyle = '#7d8c95'; g.lineWidth = 1.2; g.beginPath(); g.arc(P.eye[0], P.eye[1], 3.2, 0, 7); g.stroke(); },
  policecap(g, P) { const [x, y, r] = hat(g, P, 1); g.fillStyle = '#44546a'; g.fillRect(x - r * 0.9, y - r * 0.6, r * 1.8, r * 0.7); g.fillRect(x - r * 1.4, y + r * 0.05, r * 1.3, 2); g.fillStyle = '#e6b35a'; g.beginPath(); g.arc(x - r * 0.2, y - r * 0.25, 1.8, 0, 7); g.fill(); },
  firehelmet(g, P) { const [x, y, r] = hat(g, P, 1); g.fillStyle = '#c9504a'; g.beginPath(); g.arc(x, y, r * 0.95, Math.PI, 0); g.fill(); g.fillRect(x - r * 1.2, y - 1, r * 2.6, 2.4); g.fillStyle = '#e6b35a'; g.fillRect(x - 1.5, y - r * 0.8, 3, 3); },
  pirate(g, P) { const [x, y, r] = hat(g, P, 1); g.fillStyle = '#3f3a36'; g.beginPath(); g.moveTo(x - r * 1.4, y); g.quadraticCurveTo(x, y - r * 1.6, x + r * 1.4, y); g.fill(); g.fillStyle = '#fbfaf7'; g.beginPath(); g.arc(x, y - r * 0.5, 1.8, 0, 7); g.fill(); },
  eyepatch(g, P) { g.fillStyle = '#2b2724'; g.beginPath(); g.arc(P.eye[0], P.eye[1], 2.8, 0, 7); g.fill(); g.strokeStyle = '#2b2724'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(P.eye[0], P.eye[1] - 2.5); g.lineTo(P.ear[0] + 2, P.ear[1] + 2); g.stroke(); },
  cowboy(g, P) { const [x, y, r] = hat(g, P, 1); g.fillStyle = '#a47a57'; g.beginPath(); g.ellipse(x, y, r * 1.6, r * 0.28, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x, y - r * 0.4, r * 0.75, r * 0.55, 0, Math.PI, 0); g.fill(); g.fillStyle = '#7a5448'; g.fillRect(x - r * 0.75, y - r * 0.45, r * 1.5, 1.6); },
  scarf(g, P) { const [x, y, r] = P.head; g.fillStyle = '#c9504a'; g.beginPath(); g.moveTo(x - r * 0.4, y + r * 0.8); g.lineTo(x + r * 0.9, y + r * 0.6); g.lineTo(x + r * 0.2, y + r * 1.6); g.fill(); },
  armyhelmet(g, P) { const [x, y, r] = hat(g, P, 2); g.fillStyle = '#6f8a6b'; g.beginPath(); g.ellipse(x, y, r * 1.1, r * 0.8, 0, Math.PI, 0); g.fill(); g.fillStyle = '#5b7157'; g.fillRect(x - r * 1.1, y - 1, r * 2.2, 2); },
  fedora(g, P) { const [x, y, r] = hat(g, P, 1); g.fillStyle = '#4b4540'; g.beginPath(); g.ellipse(x, y, r * 1.35, r * 0.25, 0, 0, 7); g.fill(); g.fillRect(x - r * 0.65, y - r * 0.9, r * 1.3, r * 0.9); g.fillStyle = '#c9745b'; g.fillRect(x - r * 0.65, y - r * 0.3, r * 1.3, 1.6); },
  sunglasses(g, P) { g.fillStyle = '#2b2724'; g.beginPath(); g.ellipse(P.eye[0], P.eye[1], 3.6, 2.4, 0, 0, 7); g.fill(); g.fillRect(P.eye[0], P.eye[1] - 1, P.ear[0] - P.eye[0], 1); },
  luchador(g, P) { const [x, y, r] = P.head; g.fillStyle = '#6f8a9e'; g.beginPath(); g.ellipse(x, y, r * 1.02, r * 0.95, 0, 0, 7); g.fill(); g.fillStyle = '#fbfaf7'; g.beginPath(); g.ellipse(P.eye[0] + 1, P.eye[1], 3, 2.2, 0, 0, 7); g.fill(); g.fillStyle = '#2b2724'; g.beginPath(); g.arc(P.eye[0], P.eye[1], 1.3, 0, 7); g.fill(); g.strokeStyle = '#e6b35a'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - r * 0.2, y - r * 0.9); g.lineTo(x + r * 0.2, y + r * 0.2); g.stroke(); },
  cape(g, P, t) { const [x, y, rx, ry] = P.body; g.fillStyle = '#c9504a'; g.beginPath(); g.moveTo(x - rx * 0.4, y - ry); g.quadraticCurveTo(x + rx * 1.4, y - ry * 1.5 + Math.sin(t * 8) * 3, x + rx * 1.9, y + ry * 0.2 + Math.sin(t * 8 + 1) * 3); g.lineTo(x + rx * 0.4, y + ry * 0.3); g.fill(); },
  mask(g, P) { g.fillStyle = '#4b4540'; g.beginPath(); g.ellipse(P.eye[0] + 1, P.eye[1], 4.2, 2.4, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(P.eye[0], P.eye[1], 1, 0, 7); g.fill(); },
  wizard(g, P) { const [x, y, r] = hat(g, P, 1); g.fillStyle = '#7d63a0'; g.beginPath(); g.ellipse(x, y, r * 1.3, r * 0.25, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - r * 0.8, y); g.quadraticCurveTo(x, y - r * 2, x + r * 1.2, y - r * 2.5); g.lineTo(x + r * 0.8, y); g.fill(); g.fillStyle = '#e6d36a'; g.beginPath(); g.arc(x, y - r * 0.8, 1.4, 0, 7); g.fill(); g.beginPath(); g.arc(x + r * 0.5, y - r * 1.5, 1.1, 0, 7); g.fill(); },
  samurai(g, P) { const [x, y, r] = hat(g, P); g.fillStyle = '#3f3a36'; g.beginPath(); g.ellipse(x + 2, y - 2, 3, 2.2, 0, 0, 7); g.fill(); const [bx, by, rx, ry] = P.body; g.strokeStyle = '#5b5550'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(bx - rx * 0.4, by - ry * 1.4); g.lineTo(bx + rx * 1.1, by + ry * 0.2); g.stroke(); g.fillStyle = '#c9745b'; g.fillRect(bx - rx * 0.5, by - ry * 1.5, 3, 3); },
  guitar(g, P) { const [x, y, rx, ry] = P.body; g.save(); g.translate(x - 3, y + 1); g.rotate(-0.5); g.fillStyle = '#c9745b'; g.beginPath(); g.ellipse(0, 0, 5, 4, 0, 0, 7); g.fill(); g.fillStyle = '#7a5448'; g.fillRect(-1, -14, 2, 12); g.fillStyle = '#4b4540'; g.beginPath(); g.arc(0, 0, 1.4, 0, 7); g.fill(); g.restore(); },
  detective(g, P) { const [x, y, r] = hat(g, P, 1); g.fillStyle = '#a47a57'; g.beginPath(); g.ellipse(x, y - r * 0.2, r * 0.95, r * 0.75, 0, Math.PI, 0); g.fill(); g.beginPath(); g.ellipse(x - r * 1, y - r * 0.1, r * 0.5, r * 0.2, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + r * 1, y - r * 0.1, r * 0.5, r * 0.2, 0, 0, 7); g.fill(); },
  pipe(g, P) { g.strokeStyle = '#7a5448'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(P.snout[0] + 4, P.snout[1] + 2); g.lineTo(P.snout[0] - 3, P.snout[1] + 3); g.stroke(); g.fillStyle = '#7a5448'; g.fillRect(P.snout[0] - 6, P.snout[1], 3.5, 4); },
  witch(g, P) { const [x, y, r] = hat(g, P, 1); g.fillStyle = '#3f3a36'; g.beginPath(); g.ellipse(x, y, r * 1.5, r * 0.26, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - r * 0.75, y); g.lineTo(x + r * 0.3, y - r * 2.4); g.lineTo(x + r * 0.75, y); g.fill(); g.fillStyle = '#a58bb8'; g.fillRect(x - r * 0.72, y - r * 0.4, r * 1.45, 1.6); },
  vampcape(g, P) { const [x, y, rx, ry] = P.body; g.fillStyle = '#3f3a36'; g.beginPath(); g.moveTo(x - rx * 0.5, y - ry * 1.1); g.lineTo(x + rx * 1.3, y - ry * 1.4); g.lineTo(x + rx * 1.1, y + ry * 0.8); g.lineTo(x - rx * 0.2, y + ry * 0.5); g.fill(); g.fillStyle = '#c9504a'; g.beginPath(); g.moveTo(x - rx * 0.4, y - ry); g.lineTo(x + rx * 0.9, y - ry * 1.2); g.lineTo(x + rx * 0.7, y + ry * 0.4); g.fill(); },
  fangs(g, P) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(P.snout[0] + 3, P.snout[1] + 2); g.lineTo(P.snout[0] + 4, P.snout[1] + 5); g.lineTo(P.snout[0] + 5, P.snout[1] + 2); g.fill(); },
  ghost(g, P, t) { const [x, y, rx, ry] = P.body; g.fillStyle = 'rgba(251,250,247,.92)'; g.beginPath(); g.moveTo(x - rx * 1.6, y + ry); for (let i = 0; i <= 6; i++) g.lineTo(x - rx * 1.6 + i * rx * 0.55, y + ry + (i % 2 ? -2 : 1.5) + Math.sin(t * 6 + i) * 0.8); g.lineTo(x + rx * 1.1, y - ry); g.quadraticCurveTo(x - rx * 0.2, y - ry * 3.2, x - rx * 1.6, y - ry * 0.6); g.fill(); g.fillStyle = '#2b2724'; g.beginPath(); g.arc(x - rx * 0.9, y - ry * 1.2, 1.5, 0, 7); g.arc(x - rx * 0.4, y - ry * 1.2, 1.5, 0, 7); g.fill(); },
  crown(g, P) { const [x, y, r] = hat(g, P, 1); g.fillStyle = '#e6b35a'; g.beginPath(); g.moveTo(x - r * 0.8, y); g.lineTo(x - r * 0.8, y - r * 0.8); g.lineTo(x - r * 0.4, y - r * 0.4); g.lineTo(x, y - r); g.lineTo(x + r * 0.4, y - r * 0.4); g.lineTo(x + r * 0.8, y - r * 0.8); g.lineTo(x + r * 0.8, y); g.fill(); g.fillStyle = '#c9504a'; g.beginPath(); g.arc(x, y - r * 0.3, 1.3, 0, 7); g.fill(); },
  robe(g, P) { const [x, y, rx, ry] = P.body; g.fillStyle = '#b8554c'; g.beginPath(); g.ellipse(x + 2, y - 1, rx * 0.95, ry * 1.05, 0, Math.PI * 1.05, Math.PI * 2.05); g.fill(); g.fillStyle = '#fbfaf7'; g.fillRect(x - rx * 0.7, y - ry * 0.95, rx * 1.5, 2.2); g.fillStyle = '#2b2724'; for (let i = 0; i < 4; i++) g.fillRect(x - rx * 0.6 + i * rx * 0.4, y - ry * 0.9, 1, 1); },
  tiara(g, P) { const [x, y, r] = hat(g, P, 2); g.fillStyle = '#d7dde0'; g.beginPath(); g.moveTo(x - r * 0.7, y); g.lineTo(x, y - r * 0.8); g.lineTo(x + r * 0.7, y); g.fill(); g.fillStyle = '#a58bb8'; g.beginPath(); g.arc(x, y - r * 0.35, 1.3, 0, 7); g.fill(); },
  emperor(g, P) { const [x, y, rx, ry] = P.body; g.fillStyle = '#e6c15a'; g.beginPath(); g.ellipse(x + 2, y, rx, ry * 1.05, 0, 0, 7); g.fill(); g.fillStyle = '#c9504a'; g.fillRect(x - rx * 0.3, y - ry, 2, ry * 2); const [hx, hy, r] = hat(g, P, 1); g.fillStyle = '#3f3a36'; g.fillRect(hx - r * 0.9, hy - r * 0.35, r * 1.8, 2); g.fillRect(hx - r * 0.35, hy - r * 0.9, r * 0.7, r * 0.6); },
  pharaoh(g, P) { const [x, y, r] = P.head; g.fillStyle = '#e6c15a'; g.beginPath(); g.moveTo(x - r * 0.9, y - r * 0.9); g.lineTo(x + r * 1.1, y - r * 0.9); g.lineTo(x + r * 1.5, y + r * 1.3); g.lineTo(x + r * 0.5, y + r * 0.2); g.fill(); g.fillStyle = '#6f8a9e'; for (let i = 0; i < 3; i++) g.fillRect(x + r * 0.2 + i * 2.5, y - r * 0.6, 1.2, r * 1.6); },
  knight(g, P, t) { const [x, y, r] = P.head; g.fillStyle = '#b9c3c8'; g.beginPath(); g.ellipse(x, y - 1, r * 1.05, r * 1.02, 0, 0, 7); g.fill(); g.fillStyle = '#4b4540'; g.fillRect(x - r, y - r * 0.2, r * 1.2, 1.4); g.fillStyle = '#c9504a'; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x + r * 1.2, y - r * 2 + Math.sin(t * 6), x + r * 1.8, y - r * 0.6); g.lineTo(x + r * 0.5, y - r * 0.7); g.fill(); },
  viking(g, P) { const [x, y, r] = hat(g, P, 1); g.fillStyle = '#9fb2bd'; g.beginPath(); g.arc(x, y + 1, r * 0.9, Math.PI, 0); g.fill(); g.fillStyle = '#f3ede2'; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x + d * r * 0.8, y - 1); g.quadraticCurveTo(x + d * r * 1.6, y - r * 0.6, x + d * r * 1.4, y - r * 1.6); g.lineTo(x + d * r * 0.6, y - r * 0.4); g.fill(); } },
  beard(g, P) { g.fillStyle = '#c9846e'; g.beginPath(); g.moveTo(P.snout[0] + 4, P.snout[1] + 2); g.lineTo(P.snout[0] + 12, P.snout[1] + 2); g.lineTo(P.snout[0] + 7, P.snout[1] + 10); g.fill(); },
  bicorne(g, P) { const [x, y, r] = hat(g, P, 1); g.fillStyle = '#3f3a36'; g.beginPath(); g.moveTo(x - r * 1.6, y); g.quadraticCurveTo(x, y - r * 1.4, x + r * 1.6, y); g.fill(); g.fillStyle = '#c9504a'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.4, 1.6, 0, 7); g.fill(); },
  gladiator(g, P) { const [x, y, r] = P.head; g.fillStyle = '#c8a27a'; g.beginPath(); g.ellipse(x, y - 1, r * 1.05, r * 1.02, 0, Math.PI * 0.9, Math.PI * 2.1); g.fill(); g.fillStyle = '#c9504a'; g.fillRect(x - r * 0.9, y - r * 1.6, r * 1.8, r * 0.6); },
  spacesuit(g, P) { const [x, y, rx, ry] = P.body; g.fillStyle = '#f3f1ec'; g.beginPath(); g.ellipse(x, y, rx * 1.02, ry * 1.08, 0, 0, 7); g.fill(); g.fillStyle = '#c9745b'; g.fillRect(x - 2, y - 2, 4, 3); const [hx, hy, r] = P.head; g.fillStyle = 'rgba(190,225,236,.45)'; g.beginPath(); g.arc(hx, hy, r * 1.45, 0, 7); g.fill(); g.strokeStyle = '#dfe6ea'; g.lineWidth = 1.4; g.stroke(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(hx - r * 0.6, hy - r * 0.6, 1.8, 0, 7); g.fill(); },
  alien(g, P, t) { const [x, y, r] = P.head; g.fillStyle = '#2b2724'; g.beginPath(); g.ellipse(P.eye[0], P.eye[1], 3.2, 2.2, -0.3, 0, 7); g.fill(); g.strokeStyle = '#6f8a6b'; g.lineWidth = 1; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x + d * 2, y - r * 0.8); g.lineTo(x + d * 4, y - r * 2 + Math.sin(t * 7 + d)); g.stroke(); g.fillStyle = '#e6d36a'; g.beginPath(); g.arc(x + d * 4, y - r * 2, 1.6, 0, 7); g.fill(); } },
  robot(g, P, t) { const [x, y, r] = P.head; g.fillStyle = '#b9c3c8'; g.fillRect(x - r * 1.1, y - r * 1.05, r * 2.2, r * 2); g.fillStyle = '#6fc3d9'; g.fillRect(P.eye[0] - 2.5, P.eye[1] - 1.5, 4.5, 3); g.strokeStyle = '#7d8c95'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y - r * 1.05); g.lineTo(x, y - r * 1.8); g.stroke(); g.fillStyle = Math.sin(t * 8) > 0 ? '#e8605a' : '#f3dcc0'; g.beginPath(); g.arc(x, y - r * 1.9, 1.5, 0, 7); g.fill(); const [bx, by, rx, ry] = P.body; g.fillStyle = 'rgba(185,195,200,.9)'; g.fillRect(bx - rx * 0.8, by - ry * 0.8, rx * 1.6, ry * 1.4); },
  dragon(g, P, t) { const [x, y, rx, ry] = P.body; g.fillStyle = '#8a6fa3'; g.beginPath(); g.moveTo(x, y - ry * 0.6); g.lineTo(x + rx * 0.9, y - ry * 2.4 + Math.sin(t * 9) * 2); g.lineTo(x + rx * 1.3, y - ry * 0.6); g.fill(); const [hx, hy, r] = P.head; g.fillStyle = '#a58bb8'; g.beginPath(); g.arc(hx + 1, hy - 1, r * 1.12, Math.PI * 0.85, Math.PI * 2.15); g.fill(); g.fillStyle = '#e6d36a'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(hx - r * 0.4 + i * 3.5, hy - r); g.lineTo(hx - r * 0.2 + i * 3.5, hy - r * 1.5); g.lineTo(hx + i * 3.5, hy - r); g.fill(); } },
  halo(g, P, t) { const [x, y, r] = hat(g, P, -3); g.strokeStyle = '#e6c15a'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(x, y - r * 0.5 + Math.sin(t * 3), r * 0.9, r * 0.28, 0, 0, 7); g.stroke(); },
  cosmic(g, P, t) { const [x, y, rx] = P.body; for (let i = 0; i < 5; i++) { const a = t * 1.5 + i * 1.26; g.fillStyle = ['#e6d36a', '#bfe3ea', '#e8a3a0', '#cdb4db', '#fff'][i]; g.beginPath(); g.arc(x + Math.cos(a) * rx * 1.6, y + Math.sin(a) * rx * 0.9, 1.4, 0, 7); g.fill(); } },
  aura(g, P, t) { const [x, y, rx, ry] = P.body; g.fillStyle = `rgba(242,212,90,${0.28 + 0.12 * Math.sin(t * 12)})`; g.beginPath(); g.ellipse(x - 3, y - 4, rx * 1.7, ry * 2.4, 0, 0, 7); g.fill(); },
  spiky(g, P) { const [x, y, r] = P.head; g.fillStyle = '#e6c15a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x - r * 0.6 + i * r * 0.45, y - r * 0.6); g.lineTo(x - r * 0.3 + i * r * 0.5, y - r * 1.9); g.lineTo(x + i * r * 0.45, y - r * 0.5); g.fill(); } },
  wings(g, P, t) { const [x, y, rx, ry] = P.body; g.fillStyle = 'rgba(251,250,247,.95)'; g.beginPath(); g.ellipse(x + rx * 0.4, y - ry * 1.4, rx * 0.8, ry * 0.6, -0.6 + Math.sin(t * 10) * 0.25, 0, 7); g.fill(); },
  dinohood(g, P) { const [x, y, r] = P.head; g.fillStyle = '#8fa98b'; g.beginPath(); g.arc(x + 1, y - 1, r * 1.18, Math.PI * 0.82, Math.PI * 2.15); g.fill(); const [bx, by, rx, ry] = P.body; g.fillStyle = '#8fa98b'; g.beginPath(); g.ellipse(bx, by, rx, ry, 0, Math.PI, Math.PI * 2); g.fill(); g.fillStyle = '#e6b35a'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x + i * 5, y - r * (i ? 0.2 : 1)); g.lineTo(x + i * 5 + 2.5, y - r * (i ? 0.2 : 1) - 4); g.lineTo(x + i * 5 + 5, y - r * (i ? 0.2 : 1)); g.fill(); } },
};

// 쥐 한 마리 그리기 (이미지가 있으면 이미지 우선)
function drawRatSprite(g, sp, walk, t) {
  const img = IMG['rat_' + sp.id];
  if (img) { const h = 30, w = h * img.width / img.height; g.drawImage(img, -w / 2 - 2, -h, w, h); return; }
  const back = new Set(['cape', 'vampcape', 'wings', 'glow', 'aura', 'cosmic', 'backpack', 'samurai']);
  const P = BODY[sp.shape];
  for (const a of sp.acc) if (back.has(a) && ACC[a]) ACC[a](g, P, t);
  drawRatBody(g, sp, walk, t);
  for (const a of sp.acc) if (!back.has(a) && ACC[a]) ACC[a](g, P, t);
}

// ───────── 연구실 · 하수구 소품 ─────────
Object.assign(ITEM_DRAW, {
  beaker(c, r, col) { rr(c, -r * 0.7, -r * 0.8, r * 1.4, r * 1.6, r * 0.25); c.fillStyle = 'rgba(214,236,240,.85)'; c.fill(); c.fillStyle = '#9dd5a8'; rr(c, -r * 0.62, -r * 0.1, r * 1.24, r * 0.85, r * 0.2); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-r * 0.45, -r * 0.6, r * 0.15, r * 0.9); },
  tube(c, r, col) { for (let i = 0; i < 3; i++) { const x = -r * 0.7 + i * r * 0.7; c.fillStyle = 'rgba(214,236,240,.9)'; rr(c, x - r * 0.18, -r * 0.8, r * 0.36, r * 1.5, r * 0.18); c.fill(); c.fillStyle = col[i % col.length]; rr(c, x - r * 0.16, -r * 0.1, r * 0.32, r * 0.78, r * 0.16); c.fill(); } c.fillStyle = '#a47a57'; c.fillRect(-r, r * 0.2, r * 2, r * 0.25); },
  microscope(c, r) { c.fillStyle = '#b9b1a6'; rr(c, -r * 0.8, r * 0.4, r * 1.6, r * 0.4, 3); c.fill(); c.fillStyle = '#f3ede2'; c.fillRect(-r * 0.1, -r * 0.6, r * 0.35, r * 1.1); c.save(); c.rotate(-0.4); rr(c, -r * 0.25, -r * 0.9, r * 0.45, r * 0.9, 4); c.fillStyle = '#e3dccf'; c.fill(); c.restore(); c.fillStyle = '#6f8a9e'; circ(c, r * 0.2, r * 0.2, r * 0.18); c.fill(); },
  computer(c, r) { rr(c, -r, -r * 0.75, r * 2, r * 1.3, r * 0.1); c.fillStyle = '#b9b1a6'; c.fill(); rr(c, -r * 0.88, -r * 0.65, r * 1.76, r * 1.05, r * 0.08); c.fillStyle = '#6f8a9e'; c.fill(); c.fillStyle = '#9dd5a8'; for (let i = 0; i < 4; i++) c.fillRect(-r * 0.75, -r * 0.5 + i * r * 0.22, r * (0.4 + (i % 3) * 0.3), r * 0.08); c.fillStyle = '#a9a39a'; c.fillRect(-r * 0.2, r * 0.55, r * 0.4, r * 0.3); },
  cage(c, r) { rr(c, -r, -r * 0.8, r * 2, r * 1.6, r * 0.2); c.fillStyle = 'rgba(169,163,154,.25)'; c.fill(); c.strokeStyle = '#8e8a84'; c.lineWidth = 2; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(-r + i * r * 0.25, -r * 0.8); c.lineTo(-r + i * r * 0.25, r * 0.8); c.stroke(); } c.strokeRect(-r, -r * 0.8, r * 2, r * 1.6); c.fillStyle = '#c8a27a'; c.beginPath(); c.arc(r * 0.3, r * 0.3, r * 0.35, 0, 7); c.fill(); },
  clipboard(c, r) { rr(c, -r * 0.7, -r * 0.9, r * 1.4, r * 1.8, 3); c.fillStyle = '#c8a27a'; c.fill(); c.fillStyle = '#fbfaf7'; c.fillRect(-r * 0.55, -r * 0.65, r * 1.1, r * 1.4); c.fillStyle = '#b9b1a6'; for (let i = 0; i < 4; i++) c.fillRect(-r * 0.45, -r * 0.45 + i * r * 0.3, r * 0.9, r * 0.08); c.fillStyle = '#8e8a84'; c.fillRect(-r * 0.25, -r * 1, r * 0.5, r * 0.25); },
  extinguisher(c, r) { rr(c, -r * 0.45, -r * 0.7, r * 0.9, r * 1.6, r * 0.4); c.fillStyle = '#c9745b'; c.fill(); c.fillStyle = '#4b4540'; c.fillRect(-r * 0.2, -r * 1, r * 0.4, r * 0.3); c.strokeStyle = '#4b4540'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -r * 0.9); c.quadraticCurveTo(r * 0.8, -r * 0.8, r * 0.6, 0); c.stroke(); c.fillStyle = '#fbfaf7'; c.fillRect(-r * 0.3, -r * 0.1, r * 0.6, r * 0.3); },
  watercooler(c, r) { rr(c, -r * 0.6, -r * 0.1, r * 1.2, r * 1, 4); c.fillStyle = '#e3dccf'; c.fill(); c.fillStyle = 'rgba(160,205,220,.9)'; rr(c, -r * 0.5, -r, r, r * 0.95, r * 0.4); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-r * 0.3, -r * 0.85, r * 0.12, r * 0.6); c.fillStyle = '#6f8a9e'; c.fillRect(-r * 0.15, r * 0.25, r * 0.3, r * 0.15); },
  pipe(c, r) { rr(c, -r, -r * 0.35, r * 2, r * 0.7, r * 0.3); c.fillStyle = '#8e8a84'; c.fill(); c.fillStyle = '#a9a39a'; c.fillRect(-r, -r * 0.35, r * 2, r * 0.18); c.fillStyle = '#7d766e'; c.fillRect(-r * 0.2, -r * 0.45, r * 0.4, r * 0.9); },
  trashbag(c, r, col) { c.fillStyle = col[0]; c.beginPath(); c.ellipse(0, r * 0.1, r * 0.85, r * 0.8, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(-r * 0.2, -r * 0.6); c.lineTo(0, -r); c.lineTo(r * 0.2, -r * 0.6); c.fill(); c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(-r * 0.3, -r * 0.1, r * 0.15, r * 0.35, 0.3, 0, 7); c.fill(); },
});
