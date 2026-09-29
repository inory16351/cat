'use strict';
// 화풍 통일: 방치 모드에서는 외곽선을 얇고 옅게 (평면 파스텔 스타일)
fillStroke = function (c, fill, lw = 2.5) { c.fillStyle = fill; c.fill(); c.lineWidth = lw * 0.5; c.strokeStyle = 'rgba(74,52,38,.35)'; c.stroke(); };
// 도시 물건 (탑뷰). ITEM_DRAW 에 합쳐서 기존 drawItem 으로 그린다.
Object.assign(ITEM_DRAW, {
  cone(c, r) {
    rr(c, -r, -r, r * 2, r * 2, 4); fillStroke(c, '#343a40', 2);
    circ(c, 0, 0, r * 0.8); fillStroke(c, '#ff922b');
    circ(c, 0, 0, r * 0.52); c.fillStyle = '#fff'; c.fill();
    circ(c, 0, 0, r * 0.3); fillStroke(c, '#ff922b', 1.5);
  },
  hydrant(c, r) {
    for (const [x, y] of [[-r, 0], [r, 0], [0, r]]) { circ(c, x * 0.8, y * 0.8, r * 0.32); fillStroke(c, '#c92a2a', 2); }
    circ(c, 0, 0, r * 0.75); fillStroke(c, '#e03131');
    circ(c, 0, 0, r * 0.4); fillStroke(c, '#ffd43b', 2);
  },
  bench(c, r, col) {
    rr(c, -r * 1.6, -r * 0.55, r * 3.2, r * 1.1, 4); fillStroke(c, '#495057', 2.5);
    for (let i = 0; i < 3; i++) { rr(c, -r * 1.5, -r * 0.45 + i * r * 0.33, r * 3, r * 0.26, 2); fillStroke(c, col[0], 1.5); }
  },
  vending(c, r, col) {
    rr(c, -r, -r * 0.8, r * 2, r * 1.6, 5); fillStroke(c, col[0], 3);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-r * 0.8, -r * 0.6, r * 1.1, r * 1.2);
    c.fillStyle = '#ffd43b'; for (let i = 0; i < 3; i++) { circ(c, r * 0.6, -r * 0.4 + i * r * 0.4, r * 0.12); c.fill(); }
    c.fillStyle = '#fff'; c.fillRect(-r * 0.7, -r * 0.5, r * 0.25, r * 0.25); c.fillRect(-r * 0.35, -r * 0.5, r * 0.25, r * 0.25);
  },
  bike(c, r, col) {
    c.lineWidth = 4; c.strokeStyle = INK;
    for (const x of [-r, r]) { c.beginPath(); c.moveTo(x - r * 0.35, 0); c.lineTo(x + r * 0.35, 0); c.stroke(); }
    c.strokeStyle = col[0]; c.lineWidth = 4; c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.stroke();
    c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(r * 0.8, -r * 0.5); c.lineTo(r * 0.8, r * 0.5); c.stroke();
    rr(c, -r * 0.4, -r * 0.18, r * 0.5, r * 0.36, 3); fillStroke(c, '#343a40', 1.5);
  },
  car(c, r, col) {
    rr(c, -r * 1.5, -r * 0.8, r * 3, r * 1.6, r * 0.35); fillStroke(c, col[0], 3);
    c.fillStyle = '#212529'; for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rr(c, x * r * 0.9 - r * 0.25, y * r * 0.82 - r * 0.1, r * 0.5, r * 0.2, 3), c.fill();
    rr(c, -r * 0.7, -r * 0.62, r * 1.5, r * 1.24, r * 0.25); fillStroke(c, shade(col[0], -0.15), 2);
    c.fillStyle = 'rgba(160,210,255,.9)'; rr(c, r * 0.45, -r * 0.55, r * 0.35, r * 1.1, 4); c.fill(); rr(c, -r * 0.85, -r * 0.5, r * 0.25, r, 4); c.fill();
    c.fillStyle = '#fff3bf'; circ(c, r * 1.4, -r * 0.5, r * 0.12); c.fill(); circ(c, r * 1.4, r * 0.5, r * 0.12); c.fill();
  },
  crate(c, r, col) {
    rr(c, -r, -r * 0.8, r * 2, r * 1.6, 3); fillStroke(c, '#c08552', 2.5);
    const fruit = { '#ff6b6b': '#ff6b6b', '#ffa94d': '#ffa94d', '#8ce99a': '#8ce99a' };
    for (let i = 0; i < 6; i++) { c.fillStyle = col[i % col.length] || fruit['#ff6b6b']; circ(c, -r * 0.6 + (i % 3) * r * 0.6, -r * 0.3 + Math.floor(i / 3) * r * 0.6, r * 0.28); c.fill(); c.lineWidth = 1.2; c.strokeStyle = INK; c.stroke(); }
  },
  mailbox(c, r) {
    rr(c, -r * 0.7, -r, r * 1.4, r * 2, r * 0.7); fillStroke(c, '#e03131');
    c.fillStyle = '#212529'; c.fillRect(-r * 0.4, -r * 0.3, r * 0.8, r * 0.15);
    c.fillStyle = '#fff'; c.fillRect(-r * 0.3, r * 0.2, r * 0.6, r * 0.3);
  },
  flowerpot(c, r, col) {
    circ(c, 0, 0, r); fillStroke(c, '#b5651d');
    circ(c, 0, 0, r * 0.78); c.fillStyle = '#6b4423'; c.fill();
    for (let i = 0; i < 6; i++) { const a = i * 1.05; c.fillStyle = col[i % col.length]; circ(c, Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.25); c.fill(); }
    c.fillStyle = '#ffd43b'; circ(c, 0, 0, r * 0.2); c.fill();
  },
  umbrella(c, r, col) {
    for (let i = 0; i < 8; i++) {
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, i * Math.PI / 4, (i + 1) * Math.PI / 4); c.closePath();
      c.fillStyle = i % 2 ? '#fff' : col[0]; c.fill();
    }
    circ(c, 0, 0, r); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
    circ(c, 0, 0, r * 0.12); fillStroke(c, '#adb5bd', 1.5);
  },
  scooter(c, r, col) {
    rr(c, -r * 1.2, -r * 0.3, r * 2.4, r * 0.6, r * 0.3); fillStroke(c, col[0], 2.5);
    c.lineWidth = 3; c.strokeStyle = INK; c.beginPath(); c.moveTo(r * 1.1, -r * 0.7); c.lineTo(r * 1.1, r * 0.7); c.stroke();
    circ(c, -r * 0.3, 0, r * 0.25); fillStroke(c, '#343a40', 1.5);
  },
  pizza(c, r) {
    rr(c, -r, -r, r * 2, r * 2, 3); fillStroke(c, '#e9c46a', 2.5);
    circ(c, 0, 0, r * 0.8); fillStroke(c, '#f4a261', 2);
    c.fillStyle = '#e63946'; for (let i = 0; i < 6; i++) { const a = i * 1.05; circ(c, Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.14); c.fill(); }
  },
  balloon(c, r, col) {
    c.strokeStyle = INK; c.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const a = i * 1.26; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); c.stroke(); }
    for (let i = 0; i < 5; i++) { const a = i * 1.26; circ(c, Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65, r * 0.38); fillStroke(c, col[i % col.length], 1.8); c.fillStyle = 'rgba(255,255,255,.5)'; circ(c, Math.cos(a) * r * 0.65 - 3, Math.sin(a) * r * 0.65 - 3, r * 0.1); c.fill(); }
  },
  sign(c, r, col) {
    rr(c, -r * 1.3, -r * 0.45, r * 2.6, r * 0.9, 4); fillStroke(c, col[0], 2.5);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(r * 0.9, 0); c.lineTo(r * 0.3, -r * 0.3); c.lineTo(r * 0.3, r * 0.3); c.fill();
    c.fillRect(-r * 0.9, -r * 0.1, r * 1.2, r * 0.2);
  },
});

// 큰 가구형 물건 (평면 파스텔)
Object.assign(ITEM_DRAW, {
  tv(c, r, col) {
    rr(c, -r, -r * 0.6, r * 2, r * 1.2, r * 0.12); fillStroke(c, '#5b5550');
    rr(c, -r * 0.88, -r * 0.5, r * 1.76, r * 1.0, r * 0.08); c.fillStyle = col[0]; c.fill();
    c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(-r * 0.8, -r * 0.45); c.lineTo(-r * 0.2, -r * 0.45); c.lineTo(-r * 0.6, r * 0.4); c.lineTo(-r * 0.85, r * 0.4); c.fill();
    rr(c, -r * 0.3, r * 0.6, r * 0.6, r * 0.25, 3); c.fillStyle = '#7d746b'; c.fill();
  },
  fridge(c, r, col) {
    rr(c, -r * 0.75, -r, r * 1.5, r * 2, r * 0.18); fillStroke(c, col[0]);
    c.fillStyle = 'rgba(75,69,64,.18)'; c.fillRect(-r * 0.75, -r * 0.25, r * 1.5, r * 0.06);
    c.fillStyle = '#b9b1a6'; rr(c, r * 0.45, -r * 0.8, r * 0.1, r * 0.4, 3); c.fill(); rr(c, r * 0.45, -r * 0.1, r * 0.1, r * 0.6, 3); c.fill();
    c.fillStyle = '#e6b35a'; circ(c, -r * 0.3, -r * 0.6, r * 0.12); c.fill(); c.fillStyle = '#c9745b'; circ(c, -r * 0.05, -r * 0.55, r * 0.1); c.fill();
  },
  sofa(c, r, col) {
    rr(c, -r * 1.3, -r * 0.7, r * 2.6, r * 1.4, r * 0.35); fillStroke(c, col[0]);
    c.fillStyle = shade(col[0], -0.12); rr(c, -r * 1.25, -r * 0.7, r * 2.5, r * 0.45, r * 0.25); c.fill();
    rr(c, -r * 1.3, -r * 0.5, r * 0.35, r * 1.2, r * 0.18); c.fill(); rr(c, r * 0.95, -r * 0.5, r * 0.35, r * 1.2, r * 0.18); c.fill();
    c.fillStyle = shade(col[0], 0.12); rr(c, -r * 0.9, -r * 0.2, r * 0.85, r * 0.75, r * 0.15); c.fill(); rr(c, r * 0.05, -r * 0.2, r * 0.85, r * 0.75, r * 0.15); c.fill();
  },
  bookcase(c, r, col) {
    rr(c, -r * 1.1, -r * 0.7, r * 2.2, r * 1.4, r * 0.1); fillStroke(c, '#a47a57');
    const spines = ['#c9745b', '#8fa98b', '#8fb3c7', '#e6b35a', '#a58bb8', '#f3ede2'];
    for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) {
      c.fillStyle = spines[(i * 3 + row) % spines.length];
      c.fillRect(-r * 1.0 + i * r * 0.22, -r * 0.6 + row * r * 0.65, r * 0.18, r * 0.55);
    }
  },
  washer(c, r) {
    rr(c, -r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.18); fillStroke(c, '#f3ede2');
    c.fillStyle = '#b9b1a6'; c.fillRect(-r * 0.85, -r * 0.85, r * 1.7, r * 0.3);
    circ(c, 0, r * 0.12, r * 0.55); c.fillStyle = '#9fb7c2'; c.fill();
    circ(c, 0, r * 0.12, r * 0.38); c.fillStyle = '#c9dbe2'; c.fill();
  },
  dresser(c, r, col) {
    rr(c, -r * 1.1, -r * 0.75, r * 2.2, r * 1.5, r * 0.12); fillStroke(c, col[0]);
    c.fillStyle = shade(col[0], -0.12);
    for (let i = 0; i < 3; i++) rr(c, -r * 0.98, -r * 0.62 + i * r * 0.46, r * 1.96, r * 0.38, r * 0.06), c.fill();
    c.fillStyle = '#e6b35a'; for (let i = 0; i < 3; i++) { circ(c, -r * 0.4, -r * 0.43 + i * r * 0.46, r * 0.07); c.fill(); circ(c, r * 0.4, -r * 0.43 + i * r * 0.46, r * 0.07); c.fill(); }
  },
});
