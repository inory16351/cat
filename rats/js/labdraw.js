'use strict';
// 연구실·하수구 소품 (평면 파스텔, 원점 중심 · 반지름 r)
Object.assign(ITEM_DRAW, {
  beaker(c, r) {
    rr(c, -r * 0.7, -r * 0.9, r * 1.4, r * 1.8, r * 0.25); c.fillStyle = 'rgba(215,235,240,.8)'; c.fill();
    rr(c, -r * 0.62, -r * 0.1, r * 1.24, r * 0.92, r * 0.2); c.fillStyle = '#9dd5a8'; c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-r * 0.45, -r * 0.7, r * 0.15, r * 1.2);
    c.fillStyle = '#c9dbe2'; c.fillRect(-r * 0.8, -r * 0.95, r * 1.6, r * 0.15);
  },
  tube(c, r, col) {
    rr(c, -r, r * 0.15, r * 2, r * 0.5, 3); c.fillStyle = '#c8a27a'; c.fill();
    for (let i = 0; i < 3; i++) {
      const x = -r * 0.6 + i * r * 0.6;
      rr(c, x - r * 0.18, -r * 0.9, r * 0.36, r * 1.3, r * 0.18); c.fillStyle = 'rgba(230,240,242,.9)'; c.fill();
      rr(c, x - r * 0.15, -r * 0.2, r * 0.3, r * 0.55, r * 0.15); c.fillStyle = col[i % col.length] || col[0]; c.fill();
    }
  },
  microscope(c, r) {
    rr(c, -r * 0.8, r * 0.4, r * 1.6, r * 0.45, 4); c.fillStyle = '#b9b1a6'; c.fill();
    c.save(); c.rotate(-0.4); rr(c, -r * 0.2, -r * 0.95, r * 0.4, r * 1.2, r * 0.18); c.fillStyle = '#f3ede2'; c.fill(); c.restore();
    circ(c, -r * 0.25, -r * 0.2, r * 0.22); c.fillStyle = '#8fb3c7'; c.fill();
    rr(c, r * 0.1, -r * 0.4, r * 0.25, r * 0.9, 3); c.fillStyle = '#e6dfd3'; c.fill();
  },
  computer(c, r) {
    rr(c, -r, -r * 0.8, r * 2, r * 1.3, r * 0.1); c.fillStyle = '#b9b1a6'; c.fill();
    rr(c, -r * 0.85, -r * 0.68, r * 1.7, r * 1.05, r * 0.06); c.fillStyle = '#6f8a9e'; c.fill();
    c.fillStyle = '#9dd5a8'; for (let i = 0; i < 3; i++) c.fillRect(-r * 0.7, -r * 0.5 + i * r * 0.25, r * (0.5 + (i % 2) * 0.6), r * 0.08);
    rr(c, -r * 0.25, r * 0.5, r * 0.5, r * 0.35, 3); c.fillStyle = '#a9a39a'; c.fill();
  },
  cage(c, r) {
    rr(c, -r, -r * 0.8, r * 2, r * 1.6, r * 0.3); c.fillStyle = 'rgba(169,163,154,.35)'; c.fill();
    c.strokeStyle = '#8c857b'; c.lineWidth = 2;
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * r * 0.28, -r * 0.8); c.lineTo(i * r * 0.28, r * 0.8); c.stroke(); }
    rr(c, -r, r * 0.55, r * 2, r * 0.25, 3); c.fillStyle = '#c8a27a'; c.fill();
    circ(c, r * 0.3, r * 0.1, r * 0.35); c.strokeStyle = '#c9745b'; c.lineWidth = 3; c.stroke();   // 쳇바퀴
  },
  clipboard(c, r) {
    rr(c, -r * 0.7, -r * 0.9, r * 1.4, r * 1.8, 3); c.fillStyle = '#c8a27a'; c.fill();
    rr(c, -r * 0.55, -r * 0.65, r * 1.1, r * 1.4, 2); c.fillStyle = '#fbf7ef'; c.fill();
    c.fillStyle = '#b9b1a6'; for (let i = 0; i < 4; i++) c.fillRect(-r * 0.4, -r * 0.45 + i * r * 0.3, r * 0.8, r * 0.07);
  },
  extinguisher(c, r) {
    rr(c, -r * 0.45, -r * 0.8, r * 0.9, r * 1.8, r * 0.4); c.fillStyle = '#c9745b'; c.fill();
    c.fillStyle = '#4b4540'; c.fillRect(-r * 0.2, -r * 1.05, r * 0.4, r * 0.3);
    c.fillStyle = '#fbf7ef'; c.fillRect(-r * 0.3, -r * 0.1, r * 0.6, r * 0.35);
  },
  watercooler(c, r) {
    rr(c, -r * 0.6, -r * 0.1, r * 1.2, r * 1.1, 4); c.fillStyle = '#f3ede2'; c.fill();
    rr(c, -r * 0.5, -r * 1.0, r * 1.0, r * 0.95, r * 0.4); c.fillStyle = 'rgba(143,179,199,.8)'; c.fill();
    c.fillStyle = '#c9745b'; c.fillRect(-r * 0.25, r * 0.15, r * 0.12, r * 0.15); c.fillStyle = '#8fb3c7'; c.fillRect(r * 0.12, r * 0.15, r * 0.12, r * 0.15);
  },
  pipe(c, r) {
    rr(c, -r, -r * 0.35, r * 2, r * 0.7, r * 0.3); c.fillStyle = '#8e8a84'; c.fill();
    c.fillStyle = '#a9a39a'; rr(c, -r * 1.05, -r * 0.45, r * 0.3, r * 0.9, 3); c.fill(); rr(c, r * 0.75, -r * 0.45, r * 0.3, r * 0.9, 3); c.fill();
    c.fillStyle = 'rgba(201,132,110,.5)'; circ(c, r * 0.1, 0, r * 0.18); c.fill();
  },
  trashbag(c, r) {
    c.beginPath(); c.ellipse(0, r * 0.1, r * 0.9, r * 0.8, 0, 0, Math.PI * 2); c.fillStyle = '#5b5550'; c.fill();
    c.beginPath(); c.moveTo(-r * 0.25, -r * 0.6); c.lineTo(0, -r * 0.95); c.lineTo(r * 0.25, -r * 0.6); c.fill();
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.1, r * 0.15, r * 0.35, 0.3, 0, Math.PI * 2); c.fill();
  },
});
