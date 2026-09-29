'use strict';
// ───────────────────────── 쥐 그리기 (임시: 코드 그림) ─────────────────────────
// 나중에 assets/rats/<id>.png (또는 파츠 시트)가 생기면 그 이미지를 대신 쓴다.
// 좌표계: 왼쪽을 봄, 발끝 = 원점(0,0), 위쪽이 -y. 기본 몸길이 ≈ 40.
const SHAPES = {
  // body: 몸통 타원 / head: 머리 중심 / snout: 코끝 / ear: 귀 / tail: 꼬리 길이
  rat: { body: [3, -9, 16, 8.5], head: [-14, -11, 8, 6.5], snout: [-24, -9], ear: [-11, -17, 4.5], tail: 34, legs: [-10, -4, 8, 13] },
  mouse: { body: [2, -8, 12, 7], head: [-11, -10, 7, 6], snout: [-19, -8.5], ear: [-8, -17, 5.5], tail: 28, legs: [-8, -3, 6, 10] },
  hamster: { body: [0, -11, 13, 10.5], head: [-9, -13, 8.5, 8], snout: [-17, -11], ear: [-8, -21, 2.8], tail: 4, legs: [-8, -3, 4, 9] },
  gerbil: { body: [2, -9, 13, 8], head: [-11, -11, 7.5, 6.5], snout: [-19, -9.5], ear: [-8, -17, 4.5], tail: 30, legs: [-8, -3, 6, 11] },
};
const hatPos = sp => { const h = SHAPES[sp.shape].head; return [h[0] + 1, h[1] - h[3] + 1]; };
const eyePos = sp => { const h = SHAPES[sp.shape].head; return [h[0] - h[2] * 0.4, h[1] - h[3] * 0.2]; };

// a: { t, walk, moving, bite(0~1), sleep, rush }
function drawRodent(c, sp, a) {
  const S = SHAPES[sp.shape], F = FUR[sp.fur];
  const behind = [], front = [];
  for (const k of sp.acc) (ACC_BEHIND.has(k) ? behind : front).push(k);
  const bob = a.moving ? -Math.abs(Math.sin(a.walk)) * 1.5 : 0;
  c.save();
  c.translate(0, bob);
  if (a.sleep) c.scale(1.08, 0.8);
  for (const k of behind) ACC[k] && ACC[k](c, sp, a, S, F);
  // 꼬리 (물결)
  const [bx, by, brx, bry] = S.body;
  c.strokeStyle = F.ear; c.lineCap = 'round'; c.lineWidth = sp.shape === 'hamster' ? 3 : 2.2;
  c.beginPath(); c.moveTo(bx + brx * 0.9, by + 2);
  const L = S.tail, w = Math.sin(a.t * 8 + (a.moving ? a.walk : 0)) * 5;
  c.bezierCurveTo(bx + brx + L * 0.35, by + 6 + w, bx + brx + L * 0.7, by - 2 - w, bx + brx + L, by + 3 + w * 0.6);
  c.stroke();
  // 다리 (대각선 짝으로 걷기)
  const [fx, bkx, lw, lh] = [S.legs[0], S.body[0] + S.body[2] * 0.6, S.legs[2], S.legs[3]];
  const legs = [[fx, 0], [fx + 5, Math.PI], [bkx, Math.PI], [bkx + 5, 0]];
  c.fillStyle = shade(F.body, -0.18);
  for (const [lx, ph] of legs) {
    const sw = a.moving ? Math.sin(a.walk + ph) * 4 : 0;
    const lift = a.moving ? Math.max(0, Math.sin(a.walk + ph)) * 2 : 0;
    rr(c, lx + sw - lw * 0.18, -lh * 0.5 - lift, lw * 0.36 + 2, lh * 0.5, 2); c.fill();
  }
  // 몸통 + 배
  c.fillStyle = F.body; c.beginPath(); c.ellipse(bx, by, brx, bry, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = F.belly; c.beginPath(); c.ellipse(bx - 2, by + bry * 0.45, brx * 0.8, bry * 0.45, 0, 0, Math.PI * 2); c.fill();
  if (F.stripe) { c.strokeStyle = F.stripe; c.lineWidth = 2; c.beginPath(); c.moveTo(bx - brx * 0.6, by - bry * 0.85); c.quadraticCurveTo(bx, by - bry - 1, bx + brx * 0.8, by - bry * 0.7); c.stroke(); }
  // 머리 (갉을 땐 앞으로 까딱)
  const [hx, hy, hrx, hry] = S.head;
  const nod = a.bite ? Math.sin(a.bite * Math.PI) * 3 : 0;
  c.save(); c.translate(-nod, nod * 0.6);
  c.fillStyle = F.hood || F.body;
  c.beginPath(); c.ellipse(hx, hy, hrx, hry, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(hx - hrx * 0.5, hy - hry * 0.7); c.lineTo(S.snout[0], S.snout[1]); c.lineTo(hx - hrx * 0.3, hy + hry * 0.8); c.fill();
  if (sp.shape === 'hamster') { c.fillStyle = F.belly; c.beginPath(); c.ellipse(hx - 2, hy + 3, hrx * 0.7, hry * 0.55, 0, 0, Math.PI * 2); c.fill(); }
  // 귀
  const [ex, ey, er] = S.ear;
  c.fillStyle = F.hood || F.body; circ(c, ex, ey, er); c.fill();
  c.fillStyle = F.ear; circ(c, ex - 0.5, ey + 0.3, er * 0.6); c.fill();
  // 눈·코·수염
  const [eyx, eyy] = eyePos(sp);
  c.fillStyle = F.eye || '#3a3431';
  if (a.sleep) { c.strokeStyle = '#3a3431'; c.lineWidth = 1.2; c.beginPath(); c.arc(eyx, eyy, 1.6, 0.2, Math.PI - 0.2); c.stroke(); }
  else { circ(c, eyx, eyy, 1.5); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; circ(c, eyx - 0.4, eyy - 0.5, 0.5); c.fill(); }
  c.fillStyle = '#d98b8b'; circ(c, S.snout[0] + 0.5, S.snout[1], 1.5); c.fill();
  c.strokeStyle = 'rgba(75,69,64,.45)'; c.lineWidth = 0.7; c.beginPath();
  for (const d of [-1.5, 0.5, 2.5]) { c.moveTo(S.snout[0] + 3, S.snout[1] + d * 0.4); c.lineTo(S.snout[0] - 5, S.snout[1] + d * 1.3); }
  c.stroke();
  c.restore();
  for (const k of front) ACC[k] && ACC[k](c, sp, a, S, F);
  c.restore();
}

// ───────────────────────── 코스튬 ─────────────────────────
const ACC_BEHIND = new Set(['glow', 'cape', 'wings', 'cosmic', 'sack', 'backpack', 'mailbag', 'guitar']);
const hatBase = (c, sp) => { const [x, y] = hatPos(sp); c.translate(x, y); };
const band = (c, sp, col, w = 3) => { const h = SHAPES[sp.shape].head; c.fillStyle = col; c.fillRect(h[0] - h[2], h[1] - h[3] * 0.35, h[2] * 2, w); };
const ACC = {
  // 직장인
  labcoat(c, sp) { const b = SHAPES[sp.shape].body; rr(c, b[0] - b[2] * 0.7, b[1] - b[3] * 0.9, b[2] * 1.5, b[3] * 1.9, 4); c.fillStyle = '#fbf7ef'; c.fill(); c.fillStyle = '#8fb3c7'; c.fillRect(b[0] - 3, b[1] - 2, 3, 4); },
  goggles(c, sp) { band(c, sp, '#6f8a9e', 2); const [x, y] = eyePos(sp); circ(c, x, y, 2.8); c.fillStyle = 'rgba(191,227,234,.85)'; c.fill(); },
  glasses(c, sp) { const [x, y] = eyePos(sp); c.strokeStyle = '#4b4540'; c.lineWidth = 1; circ(c, x, y, 2.6); c.stroke(); circ(c, x + 5, y, 2.4); c.stroke(); },
  pencil(c, sp) { const [x, y] = hatPos(sp); c.fillStyle = '#e6b35a'; c.save(); c.translate(x + 4, y + 2); c.rotate(0.6); c.fillRect(-1, -7, 2, 10); c.restore(); },
  hardhat(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#e6b35a'; c.beginPath(); c.arc(0, 0, 7, Math.PI, 0); c.fill(); c.fillRect(-9, -1, 18, 2.5); c.restore(); },
  chefhat(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#fbf7ef'; rr(c, -5, -8, 10, 9, 2); c.fill(); for (const d of [-4, 0, 4]) { circ(c, d, -9, 4); c.fill(); } c.restore(); },
  scarf(c, sp) { const h = SHAPES[sp.shape].head; c.fillStyle = '#c9745b'; rr(c, h[0] + 2, h[1] + h[3] * 0.6, 8, 3.5, 2); c.fill(); c.beginPath(); c.moveTo(h[0] + 7, h[1] + h[3] + 2); c.lineTo(h[0] + 10, h[1] + h[3] + 7); c.lineTo(h[0] + 4, h[1] + h[3] + 5); c.fill(); },
  backpack(c, sp) { const b = SHAPES[sp.shape].body; rr(c, b[0] - 2, b[1] - b[3] - 5, 12, 10, 3); c.fillStyle = '#8fa98b'; c.fill(); },
  cap(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#7fa8bf'; c.beginPath(); c.arc(0, 1, 6, Math.PI, 0); c.fill(); c.fillRect(-10, 0, 8, 2); c.restore(); },
  mailcap(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#5b6b84'; rr(c, -6, -4, 12, 5, 2); c.fill(); c.fillRect(-9, 0, 7, 1.8); c.fillStyle = '#e6b35a'; circ(c, 0, -2, 1.2); c.fill(); c.restore(); },
  mailbag(c, sp) { const b = SHAPES[sp.shape].body; rr(c, b[0] + 2, b[1] - 1, 10, 8, 2); c.fillStyle = '#a47a57'; c.fill(); },
  parcel(c, sp) { const h = SHAPES[sp.shape].head; rr(c, h[0] - 6, h[1] + 3, 11, 9, 1.5); c.fillStyle = '#c8a27a'; c.fill(); c.fillStyle = '#e6d3b0'; c.fillRect(h[0] - 1, h[1] + 3, 2, 9); },
  partyhat(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#d9786a'; c.beginPath(); c.moveTo(-5, 1); c.lineTo(0, -13); c.lineTo(5, 1); c.fill(); c.fillStyle = '#f0c878'; circ(c, 0, -13, 2); c.fill(); c.restore(); },
  confetti(c, sp, a) { const cols = ['#d9786a', '#f0c878', '#8fb3c7', '#9dbb8f']; for (let i = 0; i < 5; i++) { c.fillStyle = cols[i % 4]; const t = (a.t * 0.8 + i * 0.2) % 1; c.fillRect(-15 + i * 7, -26 + t * 18, 2, 3); } },
  // 돌연변이·취미
  glow(c, sp, a) { const b = SHAPES[sp.shape].body; c.fillStyle = `rgba(214,240,168,${0.35 + 0.15 * Math.sin(a.t * 5)})`; c.beginPath(); c.ellipse(b[0] - 3, b[1], b[2] + 10, b[3] + 9, 0, 0, Math.PI * 2); c.fill(); },
  antenna(c, sp, a) { c.save(); hatBase(c, sp); c.strokeStyle = '#6f8a6b'; c.lineWidth = 1.2; for (const d of [-2, 3]) { c.beginPath(); c.moveTo(d, 0); c.lineTo(d * 2, -9 + Math.sin(a.t * 6 + d) * 1.5); c.stroke(); c.fillStyle = '#c8f0a8'; circ(c, d * 2, -9 + Math.sin(a.t * 6 + d) * 1.5, 1.8); c.fill(); } c.restore(); },
  headband(c, sp) { band(c, sp, '#d9786a', 2.5); },
  muscle(c, sp) { const b = SHAPES[sp.shape].body; c.fillStyle = shade(FUR[sp.fur].body, 0.08); circ(c, b[0] - b[2] * 0.55, b[1] + 1, 5.5); c.fill(); circ(c, b[0] + b[2] * 0.4, b[1] + 1, 5); c.fill(); },
  ninja(c, sp) { band(c, sp, '#4b4540', 4); const h = SHAPES[sp.shape].head; c.strokeStyle = '#c9745b'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(h[0] + h[2], h[1] - 2); c.lineTo(h[0] + h[2] + 8, h[1] - 5); c.moveTo(h[0] + h[2], h[1] - 1); c.lineTo(h[0] + h[2] + 7, h[1] + 2); c.stroke(); c.fillStyle = '#c9745b'; c.fillRect(h[0] - h[2], h[1] - 3, h[2] * 2, 1.5); },
  pandahood(c, sp) { const h = SHAPES[sp.shape].head; c.fillStyle = '#fbf7ef'; c.beginPath(); c.arc(h[0], h[1] - 1, h[2] + 2, Math.PI * 0.9, Math.PI * 2.1); c.fill(); c.fillStyle = '#4b4540'; circ(c, h[0] - 5, h[1] - h[3] - 2, 3); c.fill(); circ(c, h[0] + 5, h[1] - h[3] - 2, 3); c.fill(); },
  bamboo(c, sp) { c.fillStyle = '#8fa98b'; c.save(); c.translate(SHAPES[sp.shape].snout[0] + 2, SHAPES[sp.shape].snout[1] + 2); c.rotate(-0.3); c.fillRect(-10, -1, 16, 2.5); c.restore(); },
  beanie(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#7fa8bf'; c.beginPath(); c.arc(0, 1, 6.5, Math.PI, 0); c.fill(); c.fillStyle = '#fbf7ef'; circ(c, 0, -6, 2); c.fill(); c.restore(); },
  skateboard(c, sp) { const b = SHAPES[sp.shape].body; rr(c, b[0] - b[2] - 6, -2, b[2] * 2 + 12, 2.5, 1.2); c.fillStyle = '#c9846e'; c.fill(); c.fillStyle = '#4b4540'; circ(c, b[0] - b[2], 1.5, 1.6); c.fill(); circ(c, b[0] + b[2], 1.5, 1.6); c.fill(); },
  bow(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#e8a3a0'; c.beginPath(); c.moveTo(0, -2); c.lineTo(-5, -6); c.lineTo(-5, 1); c.closePath(); c.moveTo(0, -2); c.lineTo(5, -6); c.lineTo(5, 1); c.closePath(); c.fill(); c.restore(); },
  mic(c, sp) { const s = SHAPES[sp.shape].snout; c.fillStyle = '#5b5550'; c.fillRect(s[0] + 1, s[1] + 2, 1.5, 7); c.fillStyle = '#b9b1a6'; circ(c, s[0] + 1.7, s[1] + 2, 2.3); c.fill(); },
  nightcap(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#7fa8bf'; c.beginPath(); c.moveTo(-6, 1); c.quadraticCurveTo(2, -12, 12, -6); c.lineTo(5, 1); c.fill(); c.fillStyle = '#fbf7ef'; circ(c, 12, -6, 2); c.fill(); c.restore(); },
  pillow(c, sp) { const s = SHAPES[sp.shape].snout; rr(c, s[0] - 4, s[1] - 1, 10, 7, 3); c.fillStyle = '#f3ede2'; c.fill(); },
  // 유니크: 특수부대·판타지
  cyber(c, sp, a) { const [x, y] = eyePos(sp); c.fillStyle = '#6f8a9e'; rr(c, x - 3, y - 3, 7, 6, 2); c.fill(); c.fillStyle = `rgba(217,120,106,${0.7 + 0.3 * Math.sin(a.t * 8)})`; circ(c, x, y, 1.6); c.fill(); const b = SHAPES[sp.shape].body; c.fillStyle = 'rgba(111,138,158,.5)'; rr(c, b[0] - 4, b[1] - b[3], 10, b[3], 2); c.fill(); },
  policecap(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#3f4f6b'; rr(c, -6, -5, 12, 6, 2); c.fill(); c.fillStyle = '#2f3b52'; c.fillRect(-10, 0, 9, 1.8); c.fillStyle = '#e6b35a'; circ(c, -1, -2.5, 1.4); c.fill(); c.restore(); },
  badge(c, sp) { const b = SHAPES[sp.shape].body; c.fillStyle = '#e6b35a'; circ(c, b[0] - b[2] * 0.5, b[1], 2); c.fill(); },
  firehelmet(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#c9745b'; c.beginPath(); c.arc(0, 1, 7, Math.PI, 0); c.fill(); c.fillRect(-10, 0, 20, 2); c.fillStyle = '#e6b35a'; c.fillRect(-2, -5, 4, 4); c.restore(); },
  pirate(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#3a3431'; c.beginPath(); c.moveTo(-9, 1); c.quadraticCurveTo(0, -11, 9, 1); c.fill(); c.fillStyle = '#fbf7ef'; circ(c, 0, -3, 1.5); c.fill(); c.restore(); },
  eyepatch(c, sp) { const [x, y] = eyePos(sp); c.fillStyle = '#3a3431'; circ(c, x, y, 2.4); c.fill(); band(c, sp, '#3a3431', 0.8); },
  cowboy(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#a47a57'; c.beginPath(); c.ellipse(0, 0.5, 11, 2.2, 0, 0, Math.PI * 2); c.fill(); rr(c, -5, -6, 10, 7, 3); c.fill(); c.restore(); },
  armyhelmet(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#6f8a6b'; c.beginPath(); c.arc(0, 1, 7.5, Math.PI, 0); c.fill(); c.restore(); },
  camo(c, sp) { const b = SHAPES[sp.shape].body; for (const [dx, dy, r] of [[-5, -3, 3], [3, 1, 2.5], [7, -4, 2]]) { c.fillStyle = 'rgba(111,138,107,.8)'; circ(c, b[0] + dx, b[1] + dy, r); c.fill(); } },
  nursecap(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#fbf7ef'; rr(c, -5, -5, 10, 5, 1.5); c.fill(); c.fillStyle = '#d9786a'; c.fillRect(-0.8, -4.5, 1.6, 4); c.fillRect(-2, -3.3, 4, 1.6); c.restore(); },
  minerlamp(c, sp, a) { c.save(); hatBase(c, sp); c.fillStyle = '#e6b35a'; c.beginPath(); c.arc(0, 1, 7, Math.PI, 0); c.fill(); c.fillStyle = '#fff6c8'; circ(c, -5, -2, 2); c.fill(); c.fillStyle = `rgba(255,246,200,${0.25 + 0.1 * Math.sin(a.t * 4)})`; c.beginPath(); c.moveTo(-6, -2); c.lineTo(-28, -8); c.lineTo(-28, 6); c.fill(); c.restore(); },
  cape(c, sp, a) { const b = SHAPES[sp.shape].body; c.fillStyle = '#c9745b'; c.beginPath(); c.moveTo(b[0] - b[2] * 0.7, b[1] - b[3]); c.quadraticCurveTo(b[0] + b[2] + 10, b[1] - b[3] - 4 + Math.sin(a.t * 10) * 3, b[0] + b[2] + 14, b[1] + 4 + Math.sin(a.t * 10 + 1) * 3); c.lineTo(b[0] - b[2] * 0.3, b[1] + 2); c.fill(); },
  mask(c, sp) { const [x, y] = eyePos(sp); c.fillStyle = '#3f4f6b'; rr(c, x - 4, y - 2.2, 10, 4.4, 2); c.fill(); c.fillStyle = '#fff'; circ(c, x, y, 1.2); c.fill(); },
  wizard(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#6f5a8c'; c.beginPath(); c.ellipse(0, 0.5, 10, 2, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(-6, 0); c.lineTo(3, -17); c.lineTo(6, 0); c.fill(); c.fillStyle = '#f0c878'; circ(c, 0, -5, 1.2); c.fill(); circ(c, 2, -10, 0.9); c.fill(); c.restore(); },
  wand(c, sp, a) { const s = SHAPES[sp.shape].snout; c.strokeStyle = '#a47a57'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(s[0] + 4, s[1] + 7); c.lineTo(s[0] - 5, s[1] - 2); c.stroke(); c.fillStyle = `rgba(240,200,120,${0.6 + 0.4 * Math.sin(a.t * 9)})`; circ(c, s[0] - 5, s[1] - 2, 2); c.fill(); },
  samurai(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#3a3431'; circ(c, 3, -2, 2.6); c.fill(); c.restore(); const b = SHAPES[sp.shape].body; c.strokeStyle = '#8e8a84'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(b[0] - 4, b[1] - b[3] - 3); c.lineTo(b[0] + b[2] + 4, b[1] - 2); c.stroke(); },
  guitar(c, sp) { const b = SHAPES[sp.shape].body; c.fillStyle = '#c9745b'; c.beginPath(); c.ellipse(b[0] - 2, b[1] + 1, 6, 4.5, 0.3, 0, Math.PI * 2); c.fill(); c.fillStyle = '#5b5550'; c.save(); c.translate(b[0] - 2, b[1] + 1); c.rotate(-0.5); c.fillRect(0, -1, 16, 2); c.restore(); },
  sunglasses(c, sp) { const [x, y] = eyePos(sp); c.fillStyle = '#3a3431'; rr(c, x - 3, y - 1.8, 5.5, 3.6, 1.5); c.fill(); rr(c, x + 3, y - 1.8, 5, 3.6, 1.5); c.fill(); },
  detective(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#a47a57'; c.beginPath(); c.arc(0, 1, 7, Math.PI, 0); c.fill(); c.fillRect(-10, -0.5, 20, 2); c.fillStyle = '#8c6d52'; c.fillRect(-7, -3, 14, 1); c.restore(); },
  pipe(c, sp) { const s = SHAPES[sp.shape].snout; c.fillStyle = '#7a5448'; c.fillRect(s[0] + 1, s[1] + 1.5, 5, 1.4); rr(c, s[0] - 3, s[1] - 1, 4, 4, 1); c.fill(); },
  vampire(c, sp) { const h = SHAPES[sp.shape].head; c.fillStyle = '#3a3431'; c.beginPath(); c.moveTo(h[0] + 2, h[1] + h[3] - 1); c.lineTo(h[0] + 12, h[1] - h[3] - 2); c.lineTo(h[0] + 14, h[1] + h[3] + 6); c.fill(); c.fillStyle = '#b8484a'; c.fillRect(h[0] + 4, h[1] + h[3] - 1, 8, 2); c.fillStyle = '#fff'; c.fillRect(SHAPES[sp.shape].snout[0] + 3, SHAPES[sp.shape].snout[1] + 1.5, 1, 2); },
  santa(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#c9745b'; c.beginPath(); c.moveTo(-6, 1); c.quadraticCurveTo(1, -12, 10, -5); c.lineTo(5, 1); c.fill(); c.fillStyle = '#fbf7ef'; c.fillRect(-7, -0.5, 13, 2.5); circ(c, 10, -5, 2); c.fill(); c.restore(); },
  sack(c, sp) { const b = SHAPES[sp.shape].body; c.fillStyle = '#c9846e'; c.beginPath(); c.ellipse(b[0] + b[2] * 0.4, b[1] - b[3] - 3, 8, 7, 0, 0, Math.PI * 2); c.fill(); },
  bandage(c, sp) { const h = SHAPES[sp.shape].head; c.strokeStyle = '#f3ede2'; c.lineWidth = 2; c.beginPath(); c.moveTo(h[0] - h[2], h[1] - 3); c.lineTo(h[0] + h[2], h[1] + 1); c.stroke(); const b = SHAPES[sp.shape].body; c.beginPath(); c.moveTo(b[0] - 6, b[1] - b[3]); c.lineTo(b[0] + 2, b[1] + b[3]); c.stroke(); },
  // 신화
  crown(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#e6b35a'; c.beginPath(); c.moveTo(-5, 0); c.lineTo(-5, -5); c.lineTo(-2.5, -2); c.lineTo(0, -6); c.lineTo(2.5, -2); c.lineTo(5, -5); c.lineTo(5, 0); c.fill(); c.fillStyle = '#d9786a'; circ(c, 0, -1.5, 1); c.fill(); c.restore(); },
  robe(c, sp) { const b = SHAPES[sp.shape].body; c.fillStyle = '#b8484a'; c.beginPath(); c.ellipse(b[0] + 1, b[1] - 1, b[2] * 0.95, b[3] * 0.95, 0, Math.PI * 1.05, Math.PI * 2.05); c.fill(); c.fillStyle = '#fbf7ef'; c.fillRect(b[0] - b[2] * 0.9, b[1] - 1, b[2] * 1.8, 2); },
  tiara(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#d6dbe0'; c.beginPath(); c.moveTo(-4, 0); c.lineTo(0, -4); c.lineTo(4, 0); c.fill(); c.fillStyle = '#8fb3c7'; circ(c, 0, -1.5, 1); c.fill(); c.restore(); },
  emperor(c, sp) { const b = SHAPES[sp.shape].body; c.fillStyle = '#e6b35a'; c.beginPath(); c.ellipse(b[0], b[1], b[2] * 0.95, b[3] * 0.95, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#c9846e'; c.fillRect(b[0] - b[2] * 0.9, b[1] + 1, b[2] * 1.8, 1.6); c.save(); hatBase(c, sp); c.fillStyle = '#3a3431'; rr(c, -5, -4, 10, 4, 1.5); c.fill(); c.fillRect(-8, -5, 16, 1.5); c.restore(); },
  pharaoh(c, sp) { const h = SHAPES[sp.shape].head; c.fillStyle = '#e6b35a'; c.beginPath(); c.moveTo(h[0] - h[2], h[1] - h[3]); c.lineTo(h[0] + h[2] + 5, h[1] + h[3] + 4); c.lineTo(h[0] + h[2] - 2, h[1] + h[3] + 5); c.lineTo(h[0] - h[2] * 0.3, h[1] + 1); c.fill(); c.fillStyle = '#5b6b84'; for (let i = 0; i < 3; i++) c.fillRect(h[0] - h[2] + i * 5, h[1] - h[3] + 1 + i * 2, 2, 6); },
  knight(c, sp) { const h = SHAPES[sp.shape].head; c.fillStyle = '#b9c3c9'; c.beginPath(); c.ellipse(h[0] + 1, h[1] - 1, h[2] + 1.5, h[3] + 1.5, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#4b4540'; c.fillRect(h[0] - h[2], h[1] - 1.5, h[2] * 1.2, 1.5); c.fillStyle = '#c9745b'; c.beginPath(); c.moveTo(h[0] + 2, h[1] - h[3] - 1); c.quadraticCurveTo(h[0] + 10, h[1] - h[3] - 8, h[0] + 12, h[1] - h[3] + 2); c.fill(); },
  viking(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#b9b1a6'; c.beginPath(); c.arc(0, 1, 7, Math.PI, 0); c.fill(); c.fillStyle = '#f3ede2'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 6, -2); c.quadraticCurveTo(s * 12, -5, s * 11, -12); c.lineTo(s * 8, -3); c.fill(); } c.restore(); },
  turban(c, sp) { c.save(); hatBase(c, sp); c.fillStyle = '#f3ede2'; c.beginPath(); c.ellipse(0, -3, 7.5, 5, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#7fa8bf'; circ(c, -3, -3, 1.6); c.fill(); c.restore(); },
  tutu(c, sp) { const b = SHAPES[sp.shape].body; c.fillStyle = 'rgba(232,163,160,.85)'; c.beginPath(); c.ellipse(b[0], b[1] + b[3] * 0.4, b[2] + 4, 4, 0, 0, Math.PI * 2); c.fill(); },
  spacesuit(c, sp) { const b = SHAPES[sp.shape].body, h = SHAPES[sp.shape].head; c.fillStyle = 'rgba(251,247,239,.92)'; c.beginPath(); c.ellipse(b[0], b[1], b[2] + 1, b[3] + 1, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(200,225,235,.4)'; circ(c, h[0], h[1], h[2] + 4); c.fill(); c.strokeStyle = '#d6dbe0'; c.lineWidth = 1.6; c.stroke(); c.fillStyle = '#d9786a'; c.fillRect(b[0] - 2, b[1] - 2, 3, 3); },
  alien(c, sp) { const [x, y] = eyePos(sp); c.fillStyle = '#2f3b3a'; c.beginPath(); c.ellipse(x, y, 2.8, 3.8, -0.3, 0, Math.PI * 2); c.fill(); c.save(); hatBase(c, sp); c.strokeStyle = '#6f8a6b'; c.lineWidth = 1.2; for (const d of [-3, 3]) { c.beginPath(); c.moveTo(d, 0); c.lineTo(d * 1.8, -8); c.stroke(); c.fillStyle = '#c8f0a8'; circ(c, d * 1.8, -8, 1.6); c.fill(); } c.restore(); },
  robot(c, sp, a) { const h = SHAPES[sp.shape].head; c.fillStyle = '#9fb2bd'; rr(c, h[0] - h[2] - 1, h[1] - h[3] - 1, h[2] * 2 + 2, h[3] * 2 + 2, 2); c.fill(); c.fillStyle = `rgba(143,179,199,${0.7 + 0.3 * Math.sin(a.t * 6)})`; c.fillRect(h[0] - h[2] + 1, h[1] - 2, h[2] * 1.2, 2.5); c.strokeStyle = '#6f8a9e'; c.lineWidth = 1; c.beginPath(); c.moveTo(h[0], h[1] - h[3] - 1); c.lineTo(h[0], h[1] - h[3] - 6); c.stroke(); c.fillStyle = '#d9786a'; circ(c, h[0], h[1] - h[3] - 6, 1.3); c.fill(); },
  dragon(c, sp, a) { const b = SHAPES[sp.shape].body; c.fillStyle = '#8c6fa3'; c.beginPath(); c.moveTo(b[0], b[1] - b[3]); c.lineTo(b[0] + 6, b[1] - b[3] - 12 - Math.sin(a.t * 8) * 3); c.lineTo(b[0] + 12, b[1] - b[3] + 1); c.fill(); for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(b[0] - 6 + i * 5, b[1] - b[3] + 1); c.lineTo(b[0] - 4 + i * 5, b[1] - b[3] - 4); c.lineTo(b[0] - 2 + i * 5, b[1] - b[3] + 1); c.fill(); } },
  halo(c, sp, a) { const [x, y] = hatPos(sp); c.strokeStyle = '#f0c878'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(x, y - 5 + Math.sin(a.t * 3), 5, 1.8, 0, 0, Math.PI * 2); c.stroke(); },
  cosmic(c, sp, a) { for (let i = 0; i < 5; i++) { const ang = a.t * 1.5 + i * 1.26; c.fillStyle = i % 2 ? '#f0c878' : '#cdb4db'; circ(c, Math.cos(ang) * 18, -12 + Math.sin(ang) * 9, 1.4); c.fill(); } },
  sheet(c, sp) { const b = SHAPES[sp.shape].body, h = SHAPES[sp.shape].head; c.fillStyle = 'rgba(251,249,245,.96)'; c.beginPath(); c.moveTo(h[0] - h[2] - 2, 0); c.quadraticCurveTo(h[0] - 4, h[1] - h[3] - 8, b[0] + 2, b[1] - b[3] - 4); c.quadraticCurveTo(b[0] + b[2] + 4, b[1] - 2, b[0] + b[2], 0); c.fill(); c.fillStyle = '#3a3431'; const [x, y] = eyePos(sp); circ(c, x, y, 1.6); c.fill(); circ(c, x + 5, y, 1.6); c.fill(); },
  wings(c, sp, a) { const b = SHAPES[sp.shape].body; c.fillStyle = 'rgba(251,247,239,.95)'; c.save(); c.translate(b[0] + 2, b[1] - b[3]); c.rotate(-0.4 + Math.sin(a.t * 9) * 0.3); c.beginPath(); c.ellipse(6, -6, 9, 4.5, -0.5, 0, Math.PI * 2); c.fill(); c.restore(); },
  dinohood(c, sp) { const b = SHAPES[sp.shape].body, h = SHAPES[sp.shape].head; c.fillStyle = '#8fa98b'; c.beginPath(); c.ellipse(b[0], b[1], b[2] + 1, b[3] + 1, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(h[0] + 1, h[1] - 1, h[2] + 1.5, Math.PI * 0.85, Math.PI * 2.15); c.fill(); c.fillStyle = '#6f8a6b'; for (let i = 0; i < 5; i++) { const x = h[0] + 2 + i * 6; c.beginPath(); c.moveTo(x - 2, b[1] - b[3] + (i ? 0 : -3)); c.lineTo(x, b[1] - b[3] - 5 + (i ? 0 : -3)); c.lineTo(x + 2, b[1] - b[3] + (i ? 0 : -3)); c.fill(); } },
};
