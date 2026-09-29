'use strict';
// 탑뷰 렌더링: 캐릭터/물건/가구 모두 캔버스로 직접 그림
const INK = '#4a3426';

function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }
function fillStroke(c, fill, lw = 2.5) {
  c.fillStyle = fill; c.fill();
  c.lineWidth = lw; c.strokeStyle = INK; c.stroke();
}
function shade(hex, amt) {
  if (hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + ((1 << 24) | (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}
function easeOutBack(x) { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }

// ───────────────────────── 물건 (원점 중심, 반지름 r) ─────────────────────────
const ITEM_DRAW = {
  mug(c, r, col) {
    rr(c, r * 0.7, -r * 0.25, r * 0.6, r * 0.5, 3); fillStroke(c, col[0], 2);
    circ(c, 0, 0, r); fillStroke(c, col[0]);
    circ(c, 0, 0, r * 0.68); c.fillStyle = '#6b3e1f'; c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; circ(c, -r * 0.2, -r * 0.2, r * 0.18); c.fill();
  },
  glass(c, r) {
    circ(c, 0, 0, r); c.fillStyle = 'rgba(200,230,255,.6)'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
    circ(c, 0, 0, r * 0.7); c.fillStyle = 'rgba(90,170,240,.55)'; c.fill();
    c.fillStyle = 'rgba(255,255,255,.9)'; circ(c, -r * 0.35, -r * 0.35, r * 0.2); c.fill();
  },
  plate(c, r, col) {
    circ(c, 0, 0, r); fillStroke(c, col[0]);
    circ(c, 0, 0, r * 0.68); c.strokeStyle = 'rgba(74,52,38,.25)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#e76f51'; circ(c, -3, -2, r * 0.25); c.fill();
    c.fillStyle = '#90be6d'; circ(c, 4, 3, r * 0.2); c.fill();
  },
  books(c, r, col) {
    c.save(); c.rotate(0.25);
    rr(c, -r * 0.95, -r * 0.7, r * 1.9, r * 1.4, 3); fillStroke(c, col[1]);
    c.restore();
    rr(c, -r, -r * 0.7, r * 2, r * 1.4, 3); fillStroke(c, col[0]);
    c.fillStyle = '#fff8e7'; c.fillRect(r * 0.7, -r * 0.6, r * 0.22, r * 1.2);
    c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-r * 0.7, -r * 0.1, r * 1.1, 3);
  },
  plant(c, r, col) {
    circ(c, 0, 0, r * 0.8); fillStroke(c, col[0]);
    c.fillStyle = '#5a3b1f'; circ(c, 0, 0, r * 0.6); c.fill();
    c.fillStyle = '#5aa05a'; c.strokeStyle = INK; c.lineWidth = 1.8;
    for (let i = 0; i < 6; i++) {
      c.save(); c.rotate(i * Math.PI / 3 + 0.3); c.beginPath(); c.ellipse(r * 0.55, 0, r * 0.55, r * 0.26, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore();
    }
  },
  remote(c, r, col) {
    rr(c, -r * 0.4, -r, r * 0.8, r * 2, 5); fillStroke(c, col[0]);
    c.fillStyle = '#e63946'; circ(c, 0, -r * 0.6, 2.5); c.fill();
    c.fillStyle = '#ccc'; for (let i = 0; i < 3; i++) { circ(c, -3, -r * 0.1 + i * 6, 1.6); c.fill(); circ(c, 3, -r * 0.1 + i * 6, 1.6); c.fill(); }
  },
  vase(c, r, col) {
    circ(c, 0, 0, r); fillStroke(c, col[0]);
    circ(c, 0, 0, r * 0.45); fillStroke(c, shade(col[0], -0.35), 2);
    const fl = ['#ff595e', '#ffca3a', '#ff99c8'];
    for (let i = 0; i < 3; i++) { const a = i * 2.1; c.fillStyle = fl[i]; circ(c, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.3); c.fill(); c.lineWidth = 1.5; c.stroke(); }
  },
  bottle(c, r, col) {
    circ(c, 0, 0, r); fillStroke(c, col[0]);
    c.fillStyle = 'rgba(255,255,255,.3)'; circ(c, -r * 0.35, -r * 0.35, r * 0.25); c.fill();
    circ(c, 0, 0, r * 0.4); fillStroke(c, '#d4af37', 2);
  },
  bowl(c, r, col) {
    circ(c, 0, 0, r); fillStroke(c, col[0]);
    const fr = [['#e63946', -4, -3], ['#ffb703', 4, -2], ['#8ac926', 0, 5], ['#e63946', 6, 5]];
    for (const [f, x, y] of fr) { c.fillStyle = f; circ(c, x * r / 16, y * r / 16, r * 0.3); c.fill(); c.lineWidth = 1.2; c.stroke(); }
  },
  tp(c, r) {
    circ(c, 0, 0, r); fillStroke(c, '#ffffff');
    circ(c, 0, 0, r * 0.62); c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 1; c.stroke();
    circ(c, 0, 0, r * 0.35); fillStroke(c, '#c8a27a', 2);
  },
  trash(c, r, col) {
    circ(c, 0, 0, r); fillStroke(c, col[0]);
    circ(c, 0, 0, r * 0.82); c.fillStyle = '#495057'; c.fill();
    c.fillStyle = '#f8f9fa'; for (const [x, y] of [[-4, -3], [5, 2], [-2, 6]]) { circ(c, x, y, r * 0.3); c.fill(); c.lineWidth = 1; c.stroke(); }
  },
  clock(c, r, col) {
    circ(c, 0, 0, r); fillStroke(c, col[0]);
    circ(c, 0, 0, r * 0.75); fillStroke(c, '#fffdf5', 2);
    c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -r * 0.5); c.moveTo(0, 0); c.lineTo(r * 0.4, 0); c.stroke();
  },
  lamp(c, r, col) {
    c.fillStyle = 'rgba(255,240,170,.35)'; circ(c, 0, 0, r * 1.6); c.fill();
    circ(c, 0, 0, r); fillStroke(c, col[0]);
    circ(c, 0, 0, r * 0.35); fillStroke(c, '#fff6b0', 2);
  },
  teacup(c, r, col) {
    circ(c, 0, 0, r * 1.25); fillStroke(c, col[0], 2);
    circ(c, 0, 0, r * 0.8); fillStroke(c, col[0], 2);
    circ(c, 0, 0, r * 0.55); c.fillStyle = '#c08457'; c.fill();
  },
  floorplant(c, r, col) {
    circ(c, 0, 0, r * 0.6); fillStroke(c, col[0]);
    c.fillStyle = '#4f9d4f'; c.strokeStyle = INK; c.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      c.save(); c.rotate(i * Math.PI * 2 / 7); c.beginPath(); c.ellipse(r * 0.6, 0, r * 0.62, r * 0.25, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(r * 0.1, 0); c.lineTo(r * 1.1, 0); c.stroke(); c.strokeStyle = INK; c.restore();
    }
  },
  duck(c, r, col) {
    c.beginPath(); c.ellipse(-r * 0.2, 0, r, r * 0.7, 0, 0, Math.PI * 2); fillStroke(c, col[0]);
    circ(c, r * 0.6, 0, r * 0.5); fillStroke(c, col[0]);
    c.beginPath(); c.ellipse(r * 1.1, 0, r * 0.3, r * 0.18, 0, 0, Math.PI * 2); fillStroke(c, '#fb8500', 1.5);
  },
  cake(c, r, col) {
    circ(c, 0, 0, r); fillStroke(c, col[0]);
    circ(c, 0, 0, r * 0.7); c.fillStyle = col[1]; c.fill();
    c.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; circ(c, Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, 3); c.fill(); }
    circ(c, 0, 0, 5); fillStroke(c, '#d62828', 2);
  },
  yarn(c, r, col) {
    circ(c, 0, 0, r); fillStroke(c, col[0]);
    c.strokeStyle = shade(col[0], -0.3); c.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0, 0, r * (0.3 + i * 0.17), i, i + 3.5); c.stroke(); }
  },
  phone(c, r) {
    rr(c, -r * 0.55, -r, r * 1.1, r * 2, 4); fillStroke(c, '#222');
    c.fillStyle = '#3a86ff'; c.fillRect(-r * 0.4, -r * 0.8, r * 0.8, r * 1.5);
    c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(-r * 0.3, -r * 0.7, 3, r * 0.6);
  },
  fishbowl(c, r) {
    circ(c, 0, 0, r); c.fillStyle = 'rgba(160,210,255,.65)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
    c.fillStyle = '#ff8c42'; c.beginPath(); c.ellipse(-2, 2, 6, 4, 0.4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(3, 5); c.lineTo(9, 3); c.lineTo(7, 10); c.fill();
    c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(-r * 0.45, -r * 0.4, 3, 6, 0.6, 0, Math.PI * 2); c.fill();
  },
  laptop(c, r) {
    rr(c, -r, -r * 0.7, r * 2, r * 1.4, 4); fillStroke(c, '#adb5bd');
    c.fillStyle = '#6c757d';
    for (let y = 0; y < 3; y++) for (let x = 0; x < 6; x++) c.fillRect(-r * 0.8 + x * r * 0.28, -r * 0.5 + y * r * 0.25, r * 0.2, r * 0.16);
    rr(c, -r * 0.3, r * 0.3, r * 0.6, r * 0.3, 2); c.fillStyle = '#ced4da'; c.fill();
    rr(c, -r, -r * 0.95, r * 2, r * 0.25, 3); fillStroke(c, '#343a40', 2);
  },
  wine(c, r, col) {
    circ(c, 0, 0, r * 1.1); c.fillStyle = 'rgba(240,230,235,.5)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
    circ(c, 0, 0, r * 0.8); fillStroke(c, 'rgba(255,255,255,.6)', 2);
    circ(c, 0, 0, r * 0.55); c.fillStyle = '#7b1e3a'; c.fill();
    c.fillStyle = 'rgba(255,255,255,.8)'; circ(c, -r * 0.3, -r * 0.3, r * 0.15); c.fill();
  },
  candle(c, r, col) {
    circ(c, 0, 0, r * 0.55); fillStroke(c, col[0]);
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3 - Math.PI / 2;
      c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); c.stroke();
      c.strokeStyle = col[0]; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); c.stroke();
      circ(c, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.28); fillStroke(c, '#fffdf0', 2);
      c.fillStyle = '#ffb703'; circ(c, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.12); c.fill();
    }
  },
  teapot(c, r, col) {
    c.lineWidth = 5; c.strokeStyle = INK; c.beginPath(); c.moveTo(r * 0.7, 0); c.lineTo(r * 1.3, -r * 0.3); c.stroke();
    c.lineWidth = 2.5; c.strokeStyle = col[0]; c.beginPath(); c.moveTo(r * 0.7, 0); c.lineTo(r * 1.3, -r * 0.3); c.stroke();
    rr(c, -r * 1.25, -r * 0.2, r * 0.5, r * 0.4, 3); fillStroke(c, col[0], 2);
    circ(c, 0, 0, r * 0.9); fillStroke(c, col[0]);
    c.strokeStyle = '#6a4c93'; c.lineWidth = 2; circ(c, 0, 0, r * 0.62); c.stroke();
    circ(c, 0, 0, r * 0.25); fillStroke(c, '#d4af37', 2);
  },
  bust(c, r, col) {
    rr(c, -r, -r, r * 2, r * 2, 4); fillStroke(c, '#adb5bd');
    c.beginPath(); c.ellipse(0, r * 0.25, r * 0.85, r * 0.5, 0, 0, Math.PI * 2); fillStroke(c, col[0]);
    circ(c, 0, -r * 0.2, r * 0.5); fillStroke(c, col[0]);
    c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 2; for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(i * r * 0.15, -r * 0.35, r * 0.25, 0.5, 2.5); c.stroke(); }
  },
  bigvase(c, r, col) {
    circ(c, 0, 0, r); fillStroke(c, col[0]);
    c.strokeStyle = '#f8f9fa'; c.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.arc(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, r * 0.18, 0, Math.PI * 2); c.stroke(); }
    circ(c, 0, 0, r * 0.42); fillStroke(c, shade(col[0], -0.5), 2);
    c.fillStyle = '#d4af37'; c.beginPath(); c.arc(0, 0, r * 0.48, 0, Math.PI * 2); c.lineWidth = 2; c.strokeStyle = '#d4af37'; c.stroke();
  },
  trophy(c, r, col) {
    c.lineWidth = 4; c.strokeStyle = INK; circ(c, -r, 0, r * 0.4); c.stroke(); circ(c, r, 0, r * 0.4); c.stroke();
    c.lineWidth = 2; c.strokeStyle = col[0]; circ(c, -r, 0, r * 0.4); c.stroke(); circ(c, r, 0, r * 0.4); c.stroke();
    circ(c, 0, 0, r); fillStroke(c, col[0]);
    circ(c, 0, 0, r * 0.6); c.fillStyle = shade(col[0], -0.25); c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; circ(c, -r * 0.35, -r * 0.35, r * 0.2); c.fill();
  },
};
const GOLD_PAL = ['#ffd23f', '#ffe680', '#f9c74f'];

function drawItemShape(c, it) {
  ITEM_DRAW[it.type.k](c, it.r, it.gold ? GOLD_PAL : it.col);
}

// 공중에 뜬 높이(z)에 따라 그림자 + 크기 변화
function drawItem(c, it, t) {
  const s = it.appear < 1 ? easeOutBack(Math.max(0, it.appear)) : 1;
  if (s <= 0.01) return;
  const lift = Math.max(0, it.z - it.baseZ);
  if (lift > 1 || it.state === 'fly') {
    c.fillStyle = `rgba(40,20,10,${Math.max(0.08, 0.28 - it.z * 0.0012)})`;
    c.beginPath(); c.ellipse(it.x + it.z * 0.25, it.y + it.z * 0.35, it.r * (1 - Math.min(0.4, it.z / 600)), it.r * 0.8 * (1 - Math.min(0.4, it.z / 600)), 0, 0, Math.PI * 2); c.fill();
  }
  c.save();
  c.translate(it.x, it.y);
  const k = s * (1 + it.z * 0.0035);
  const wob = it.state === 'rest' ? Math.sin(t * 30 + it.seed) * 0.25 * it.wob : 0;
  c.rotate(it.rot + wob);
  c.scale(k * it.sq, k / it.sq);
  if (it.gold) { c.shadowColor = 'rgba(255,215,0,.95)'; c.shadowBlur = 12 + Math.sin(t * 6 + it.seed) * 6; }
  drawItemShape(c, it);
  c.restore();
}

// ───────────────────────── 가구 ─────────────────────────
const WOOD = '#c08552', WOOD_D = '#8b5a33', WOOD_L = '#dda36b';
function drawFurnitureShadow(c, f) {
  const o = f.z * 0.22;
  c.fillStyle = 'rgba(60,30,10,.22)';
  if (f.round) { c.beginPath(); c.ellipse(f.x + f.w / 2 + o, f.y + f.h / 2 + o * 1.3, f.w / 2, f.h / 2, 0, 0, Math.PI * 2); c.fill(); }
  else { rr(c, f.x + o, f.y + o * 1.3, f.w, f.h, 10); c.fill(); }
}
function drawFurniture(c, f) {
  const { x, y, w, h } = f;
  c.save();
  switch (f.k) {
    case 'table': case 'desk': case 'coffee': case 'nightstand': {
      const base = f.k === 'coffee' ? '#9c6644' : f.k === 'desk' ? '#d4a373' : WOOD;
      rr(c, x, y, w, h, 8); fillStroke(c, base, 3);
      c.save(); rr(c, x, y, w, h, 8); c.clip();
      c.strokeStyle = shade(base, -0.15); c.lineWidth = 1.5;
      for (let py = y + 18; py < y + h; py += 22) { c.beginPath(); c.moveTo(x, py); c.lineTo(x + w, py); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(x, y, w, 6);
      c.restore();
      rr(c, x + 5, y + 5, w - 10, h - 10, 6); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; c.stroke();
      break;
    }
    case 'round': {
      c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); fillStroke(c, WOOD_L, 3);
      c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2 - 10, h / 2 - 10, 0, 0, Math.PI * 2); c.strokeStyle = 'rgba(139,90,51,.35)'; c.lineWidth = 2; c.stroke();
      break;
    }
    case 'shelf': {
      rr(c, x, y, w, h, 5); fillStroke(c, WOOD_D, 3);
      c.fillStyle = WOOD; c.fillRect(x + 5, y + 5, w - 10, h - 10);
      c.strokeStyle = WOOD_D; c.lineWidth = 3;
      if (w >= h) for (let px = x + 90; px < x + w - 20; px += 90) { c.beginPath(); c.moveTo(px, y + 4); c.lineTo(px, y + h - 4); c.stroke(); }
      else for (let py = y + 90; py < y + h - 20; py += 90) { c.beginPath(); c.moveTo(x + 4, py); c.lineTo(x + w - 4, py); c.stroke(); }
      break;
    }
    case 'counter': {
      rr(c, x, y, w, h, 6); fillStroke(c, '#e9ecef', 3);
      c.strokeStyle = 'rgba(120,120,140,.25)'; c.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(x + (i * 67) % w, y + 4); c.quadraticCurveTo(x + (i * 67) % w + 30, y + h / 2, x + (i * 67 + 20) % w, y + h - 4); c.stroke(); }
      break;
    }
    case 'sofa': {
      rr(c, x, y, w, h, 18); fillStroke(c, f.color || '#6d9dc5', 3);
      rr(c, x + 6, y + 4, w - 12, 22, 10); fillStroke(c, shade(f.color || '#6d9dc5', -0.18), 2);
      rr(c, x + 4, y + 22, 26, h - 26, 10); fillStroke(c, shade(f.color || '#6d9dc5', -0.12), 2);
      rr(c, x + w - 30, y + 22, 26, h - 26, 10); fillStroke(c, shade(f.color || '#6d9dc5', -0.12), 2);
      const cw = (w - 64) / 2;
      for (let i = 0; i < 2; i++) { rr(c, x + 32 + i * cw, y + 28, cw - 4, h - 34, 8); fillStroke(c, shade(f.color || '#6d9dc5', 0.1), 2); }
      break;
    }
    case 'chair': {
      rr(c, x, y, w, h, 8); fillStroke(c, WOOD, 3);
      rr(c, x + 4, y + 4, w - 8, 12, 4); fillStroke(c, WOOD_D, 2);
      rr(c, x + 8, y + 20, w - 16, h - 28, 5); fillStroke(c, f.color || '#e9c46a', 2);
      break;
    }
    case 'armchair': {
      const col = f.color || '#9d0208';
      rr(c, x, y, w, h, 16); fillStroke(c, shade(col, -0.2), 3);
      rr(c, x + 4, y + 4, w - 8, 24, 10); fillStroke(c, shade(col, -0.3), 2);
      rr(c, x + 16, y + 26, w - 32, h - 34, 10); fillStroke(c, col, 2);
      c.fillStyle = '#d4af37'; for (let i = 0; i < 3; i++) { circ(c, x + 26 + i * (w - 52) / 2, y + 16, 2.5); c.fill(); }
      break;
    }
    case 'dining': {
      rr(c, x, y, w, h, 12); fillStroke(c, '#6f3b22', 3);
      rr(c, x + 8, y + 8, w - 16, h - 16, 8); c.strokeStyle = '#d4af37'; c.lineWidth = 2; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.85)'; rr(c, x + w * 0.1, y + h / 2 - 14, w * 0.8, 28, 6); c.fill();
      c.strokeStyle = '#b5838d'; c.lineWidth = 1.5; c.stroke();
      break;
    }
    case 'piano': {
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * 0.55, y); c.quadraticCurveTo(x + w, y + h * 0.1, x + w, y + h * 0.55);
      c.quadraticCurveTo(x + w, y + h, x + w * 0.6, y + h); c.lineTo(x, y + h); c.closePath(); fillStroke(c, '#1b1b1f', 3);
      c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.ellipse(x + w * 0.5, y + h * 0.4, w * 0.3, h * 0.15, -0.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.fillRect(x + 4, y + 8, 22, h - 16);
      c.fillStyle = '#111'; for (let ky = y + 12; ky < y + h - 12; ky += 9) c.fillRect(x + 4, ky, 13, 4);
      c.strokeStyle = '#d4af37'; c.lineWidth = 2; c.strokeRect(x + 30, y + 10, 6, h - 20);
      break;
    }
    case 'bed': {
      rr(c, x, y, w, h, 12); fillStroke(c, WOOD_D, 3);
      rr(c, x + 8, y + 8, w - 16, h - 16, 10); fillStroke(c, '#fdfcdc', 2);
      rr(c, x + 18, y + 16, w / 2 - 26, 46, 14); fillStroke(c, '#ffffff', 2);
      rr(c, x + w / 2 + 8, y + 16, w / 2 - 26, 46, 14); fillStroke(c, '#ffffff', 2);
      rr(c, x + 8, y + 80, w - 16, h - 88, 10); fillStroke(c, f.color || '#f4acb7', 2);
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2;
      for (let py = y + 100; py < y + h - 20; py += 24) { c.beginPath(); c.moveTo(x + 14, py); c.lineTo(x + w - 14, py); c.stroke(); }
      break;
    }
  }
  c.restore();
}

// ───────────────────────── 고양이 (탑뷰) ─────────────────────────
const CAT = { body: '#f4a340', stripe: '#d9771e', belly: '#fff0d6', ear: '#ff9eb5' };
function drawCat(c, cat, t, scaleMul = 1, palette = CAT) {
  const z = cat.z || 0;
  // 그림자
  c.fillStyle = `rgba(40,20,10,${0.25 - Math.min(0.15, z * 0.001)})`;
  c.beginPath(); c.ellipse(cat.x + z * 0.25, cat.y + z * 0.35 + 4, 34 * scaleMul, 20 * scaleMul, cat.ang, 0, Math.PI * 2); c.fill();

  c.save();
  c.translate(cat.x, cat.y);
  c.rotate(cat.ang);
  const s = scaleMul * (1 + z * 0.004);
  c.scale(s * cat.sq, s / cat.sq);
  const moving = cat.speed > 30;
  const wt = cat.walkT;
  // 꼬리
  const sw = Math.sin(t * (moving ? 12 : 3)) * (moving ? 0.6 : 0.4);
  c.lineCap = 'round';
  const tail = () => { c.beginPath(); c.moveTo(-26, 0); c.bezierCurveTo(-44, sw * 10, -50, -sw * 22, -62, sw * 26); };
  c.strokeStyle = INK; c.lineWidth = 11; tail(); c.stroke();
  c.strokeStyle = palette.body; c.lineWidth = 6.5; tail(); c.stroke();
  // 다리
  for (const [lx, side, ph] of [[16, -1, 0], [16, 1, Math.PI], [-16, -1, Math.PI], [-16, 1, 0]]) {
    const dx = moving ? Math.sin(wt + ph) * 7 : 0;
    c.beginPath(); c.ellipse(lx + dx, side * 16, 7, 5, 0, 0, Math.PI * 2); fillStroke(c, palette.belly, 2.2);
  }
  // 냥펀치 앞발
  if (cat.swipeT > 0) {
    const k = Math.sin(Math.PI * (1 - cat.swipeT / 0.16));
    const a = cat.swipeAng - cat.ang;
    const side = Math.sin(a) >= 0 ? 1 : -1;
    const px = 20 + Math.cos(a) * k * 26, py = side * 10 + Math.sin(a) * k * 26;
    c.strokeStyle = INK; c.lineWidth = 11;
    c.beginPath(); c.moveTo(14, side * 10); c.lineTo(px, py); c.stroke();
    c.strokeStyle = palette.body; c.lineWidth = 6.5;
    c.beginPath(); c.moveTo(14, side * 10); c.lineTo(px, py); c.stroke();
    circ(c, px, py, 6.5); fillStroke(c, palette.belly, 2);
  }
  // 몸통
  c.beginPath(); c.ellipse(0, 0, 30, 18, 0, 0, Math.PI * 2); fillStroke(c, palette.body, 2.6);
  c.strokeStyle = palette.stripe; c.lineWidth = 4;
  for (const sx of [-14, -4, 6]) { c.beginPath(); c.moveTo(sx, -15); c.quadraticCurveTo(sx - 4, 0, sx, 15); c.stroke(); }
  // 머리
  const hx = 28;
  for (const ey of [-9, 9]) {
    c.beginPath(); c.moveTo(hx - 4, ey - 7 * Math.sign(ey) * -0.2 - 6); c.lineTo(hx + 2, ey * 2.1); c.lineTo(hx + 8, ey - 2); c.closePath();
    fillStroke(c, palette.body, 2.2);
    c.fillStyle = palette.ear; c.beginPath(); c.moveTo(hx, ey * 1.2); c.lineTo(hx + 2, ey * 1.8); c.lineTo(hx + 5, ey * 1.1); c.fill();
  }
  circ(c, hx, 0, 15); fillStroke(c, palette.body, 2.6);
  c.strokeStyle = palette.stripe; c.lineWidth = 3;
  c.beginPath(); c.moveTo(hx - 12, -4); c.lineTo(hx - 5, -3); c.moveTo(hx - 12, 4); c.lineTo(hx - 5, 3); c.stroke();
  // 눈 / 코
  const blink = (t % 3.3) < 0.12;
  if (cat.mood === 'happy' || blink) {
    c.strokeStyle = INK; c.lineWidth = 2.2;
    for (const ey of [-6, 6]) { c.beginPath(); c.arc(hx + 6, ey, 3, Math.PI * 0.6, Math.PI * 1.4, true); c.stroke(); }
  } else {
    for (const ey of [-6, 6]) {
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(hx + 7, ey, 4, 4.5, 0, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke();
      c.fillStyle = '#222'; c.beginPath(); c.ellipse(hx + 8.5, ey, 2.4, cat.mood === 'evil' ? 1.2 : 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; circ(c, hx + 9.2, ey - 1.3, 1); c.fill();
    }
  }
  c.fillStyle = '#ff7b9c'; c.beginPath(); c.moveTo(hx + 13, -2.5); c.lineTo(hx + 13, 2.5); c.lineTo(hx + 15.5, 0); c.fill();
  c.strokeStyle = INK; c.lineWidth = 1.1;
  c.beginPath();
  for (const s2 of [-1, 1]) { c.moveTo(hx + 11, s2 * 4); c.lineTo(hx + 19, s2 * 12); c.moveTo(hx + 11, s2 * 5); c.lineTo(hx + 16, s2 * 15); }
  c.stroke();
  c.restore();
}

// ───────────────────────── 주인 (탑뷰) ─────────────────────────
function drawOwner(c, o, t) {
  c.fillStyle = 'rgba(40,20,10,.25)';
  c.beginPath(); c.ellipse(o.x + 8, o.y + 12, 58, 38, o.ang, 0, Math.PI * 2); c.fill();
  c.save();
  c.translate(o.x, o.y);
  c.rotate(o.ang);
  const sw = o.walking ? Math.sin(o.walkT) : 0;
  // 발
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(sw * s * 16 + 6, s * 16, 16, 9, 0, 0, Math.PI * 2); fillStroke(c, '#2b2d42', 2.5); }
  // 팔
  for (const s of [-1, 1]) {
    const ax = o.carry ? 30 : -sw * s * 14;
    c.beginPath(); c.ellipse(ax + 2, s * 44, 22, 11, 0, 0, Math.PI * 2); fillStroke(c, o.shirt, 2.5);
    circ(c, ax + 24, s * 44, 9); fillStroke(c, '#ffd7b5', 2.5);
  }
  if (o.carry) { rr(c, 30, -40, 56, 80, 6); fillStroke(c, '#d4a373', 3); c.strokeStyle = '#a47148'; c.lineWidth = 3; c.beginPath(); c.moveTo(58, -40); c.lineTo(58, 40); c.stroke(); }
  // 어깨
  c.beginPath(); c.ellipse(0, 0, 26, 50, 0, 0, Math.PI * 2); fillStroke(c, o.shirt, 3);
  // 머리
  circ(c, 4, 0, 26); fillStroke(c, '#3b2418', 3);
  c.beginPath(); c.ellipse(26, 0, 6, 10, 0, 0, Math.PI * 2); fillStroke(c, '#ffd7b5', 2);
  c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(-2, -8, 12, 7, 0.5, 0, Math.PI * 2); c.fill();
  c.restore();
}
