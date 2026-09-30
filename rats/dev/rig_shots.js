// 브라우저 콘솔용: 슈퍼 요리사 쥐(탈것 리그)를 프레임별로 크게 캡처해서 화면 위에 격자로 띄움 (테스트 서버에서만)
// 사용: eval(await (await fetch('/rats/dev/rig_shots.js')).text()); await __rigSetup(); __rigShots(); / __rigOne(k, moving)
// 창을 닫으려면 document.getElementById('__ov').remove()
window.__rigSetup = async () => {
  if (!G.running) document.getElementById('btnStart').click();
  await new Promise(r => setTimeout(r, 500));
  document.querySelectorAll('.screen:not(.hidden)').forEach(e => e.classList.add('hidden'));
  const r = makeRat('starchef', 500, 400); G.rats.push(r); window.__A = r;
  for (let i = 0; i < 90; i++) update(1 / 60);     // born·sq 등 초기화 (미리보기 패널에선 rAF 가 멈춰 있을 수 있음)
};
const __rigDraw = (g, k, moving, t, Z, W0, H0, dx, dy, label, yank = 0) => {
  const r = __A;
  r.x = 500; r.y = 400; r.z = 0; r.face = 1; r.say = null; r.speed = moving ? 120 : 0; r.born = 1; r.stun = 0; r.trick = null; r.pose = null;
  if (r.mount) { r.mount.walk = k - 0.35; r.mount.sq = 1; r.mount.face = 1; r.mount.gallop = moving; r.mount.yank = yank + 0.05; }
  G.t = t;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#eee9df'; ctx.fillRect(0, 0, W0, H0);
  ctx.setTransform(Z, 0, 0, Z, W0 / 2 - r.x * Z, H0 * 0.9 - r.y * TILT * Z); drawRat(r); ctx.restore();
  g.drawImage(canvas, 0, 0, W0, H0, dx, dy, W0 - 6, H0);
  if (label) { g.fillStyle = '#333'; g.font = '24px sans-serif'; g.fillText(label, dx + 8, dy - 6); }
  G.popups = [];
};
const __rigOverlay = (w, h, css) => {
  let ov = document.getElementById('__ov'); if (ov) ov.remove();
  ov = document.createElement('canvas'); ov.id = '__ov'; ov.width = w; ov.height = h; ov.style.cssText = 'position:fixed;left:0;top:0;background:#f3efe6;z-index:9999;' + css;
  document.body.appendChild(ov); return ov.getContext('2d');
};
// 달리기 8프레임 + 멈춤 2프레임
window.__rigShots = (Z = 1.6) => {
  const W0 = 420, H0 = 330, g = __rigOverlay(W0 * 4, (H0 + 30) * 3, 'width:100vw'), T = 2 * Math.PI / 0.9;
  for (let i = 0; i < 8; i++) __rigDraw(g, i * T / 8, true, 1, Z, W0, H0, (i % 4) * W0, Math.floor(i / 4) * (H0 + 30) + 30, '달리기 ' + (i + 1) + '/8');
  __rigDraw(g, 0, false, 1, Z, W0, H0, 0, 2 * (H0 + 30) + 30, '멈춤');
  __rigDraw(g, 0, false, 1.25, Z, W0, H0, W0, 2 * (H0 + 30) + 30, '멈춤 (씰룩)');
  __rigDraw(g, 0, true, 1, Z, W0, H0, 2 * W0, 2 * (H0 + 30) + 30, '머리카락 당기기!', 1);
};
// 한 프레임 크게 (k = 걸음 위상)
window.__rigOne = (k = 0, moving = false, Z = 3.2, yank = 0) => {
  const W0 = 700, H0 = 560, g = __rigOverlay(W0, H0, 'height:95vh');
  __rigDraw(g, k, moving, 1, Z, W0, H0, 0, 0, '', yank);
};
