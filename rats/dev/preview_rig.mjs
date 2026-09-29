// 파츠 리그 미리보기: rats/js/ratrig.js 의 buildRatRig/drawRatRig 와 같은 계산으로 조립해서 PNG 로 저장
// (브라우저 없이 다리·머리가 제대로 붙었는지 확인용)
// 사용법 (rats/dev 에서): node preview_rig.mjs out.png brownrat,labrat [pose]
//   pose: idle(기본) | run | air   · 빨간 선 = 바닥(발끝이 닿아야 함), 파란 점 = 관절
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAT_PARTS = new Function(readFileSync(path.join(ROOT, 'rats', 'js', 'parts_meta.js'), 'utf8') + '\nreturn RAT_PARTS;')();
const [out = 'rig_preview.png', idsArg, poseName = 'idle'] = process.argv.slice(2);
const ids = idsArg ? idsArg.split(',') : Object.keys(RAT_PARTS);
const POSES = {
  idle: { head: 0, tail: 0.2, front: 0.05, back: -0.05, farFront: -0.1, farBack: 0.1 },
  run: { head: -0.05, tail: 0.1, front: 0.9, back: -0.9, farFront: 0.6, farBack: -0.6 },
  air: { head: -0.3, tail: 1.2, front: 1.3, back: -1.3, farFront: 1.0, farBack: -1.0 },
};
const pose = POSES[poseName];
const S = 1.6, CW = 520, CH = 360;

// 한 파츠를 (anchor 에 pivot 이 오도록) 회전·배율 적용해서 놓기
async function place(file, anchor, pivot, ang, sc, dark) {
  let img = sharp(file);
  const m = await img.metadata();
  const w = Math.round(m.width * sc), h = Math.round(m.height * sc);
  img = sharp(await sharp(file).resize(w, h).toBuffer());
  if (dark) img = sharp(await img.composite([{ input: { create: { width: w, height: h, channels: 4, background: { r: 40, g: 25, b: 30, alpha: 0.22 } } }, blend: 'atop' }]).png().toBuffer());
  const buf = await img.rotate(ang * 180 / Math.PI, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const rm = await sharp(buf).metadata();
  // 회전 후 pivot 위치
  const px = pivot[0] * w - w / 2, py = pivot[1] * h - h / 2;
  const rx = px * Math.cos(ang) - py * Math.sin(ang) + rm.width / 2, ry = px * Math.sin(ang) + py * Math.cos(ang) + rm.height / 2;
  return { input: buf, left: Math.round(anchor[0] - rx), top: Math.round(anchor[1] - ry) };
}

const tiles = [];
for (const id of ids) {
  const M = RAT_PARTS[id]; if (!M) continue;
  const dir = path.join(ROOT, 'assets', 'rats', 'parts', id), f = n => path.join(dir, n + '.png');
  const T = M.size.torso, ls = M.legScale || { front: 1, back: 1 };
  const k = S;   // 미리보기 배율
  const at = key => [M.anchor[key][0] * T[0], M.anchor[key][1] * T[1]];
  const legLen = leg => M.size[leg][1] * (1 - M.pivot[leg][1]) * ls[leg];
  const headScale = Math.min(1, 0.62 * T[0] / M.size.head[0]);
  const ox = CW / 2, oy = CH - 50;      // 발끝 원점
  const torsoX = -T[0] * 0.5, torsoY = -(at('shoulder')[1] + legLen('front'));
  const P = key => { const [x, y] = at(key); return [ox + (torsoX + x) * k, oy + (torsoY + y) * k]; };
  const gap = T[0] * 0.07 * k;
  const layers = [
    await place(f('back'), [P('hip')[0] + gap, P('hip')[1]], M.pivot.back, pose.farBack, ls.back * k, true),
    await place(f('front'), [P('shoulder')[0] + gap, P('shoulder')[1]], M.pivot.front, pose.farFront, ls.front * k, true),
    await place(f('tail'), P('tail'), M.pivot.tail, -pose.tail, k),
    { input: await sharp(f('torso')).resize(Math.round(T[0] * k), Math.round(T[1] * k)).toBuffer(), left: Math.round(ox + torsoX * k), top: Math.round(oy + torsoY * k) },
    await place(f('back'), P('hip'), M.pivot.back, pose.back, ls.back * k),
    await place(f('front'), P('shoulder'), M.pivot.front, pose.front, ls.front * k),
    await place(f('head'), P('neck'), M.pivot.head, -pose.head, headScale * k),
  ];
  const dot = (x, y) => ({ input: { create: { width: 6, height: 6, channels: 4, background: '#2060ff' } }, left: Math.round(x) - 3, top: Math.round(y) - 3 });
  const floor = { input: { create: { width: CW - 40, height: 2, channels: 4, background: '#d02020' } }, left: 20, top: oy };
  const label = { input: Buffer.from(`<svg width="300" height="30"><text x="4" y="22" font-size="20" font-family="sans-serif" fill="#333">${id} (${poseName})</text></svg>`), left: 10, top: 6 };
  // 캔버스 밖으로 나간 레이어는 잘라서 합성
  const safe = [];
  for (const L of [...layers, floor, dot(...P('shoulder')), dot(...P('hip')), dot(...P('neck')), label]) {
    const m = await sharp(L.input.create ? { create: L.input.create } : L.input).metadata();
    const w = L.input.create ? L.input.create.width : m.width, h = L.input.create ? L.input.create.height : m.height;
    const x0 = Math.max(0, L.left), y0 = Math.max(0, L.top), x1 = Math.min(CW, L.left + w), y1 = Math.min(CH, L.top + h);
    if (x1 <= x0 || y1 <= y0) continue;
    if (x0 === L.left && y0 === L.top && x1 === L.left + w && y1 === L.top + h) { safe.push(L); continue; }
    const src = L.input.create ? await sharp({ create: L.input.create }).png().toBuffer() : L.input;
    safe.push({ input: await sharp(src).extract({ left: x0 - L.left, top: y0 - L.top, width: x1 - x0, height: y1 - y0 }).toBuffer(), left: x0, top: y0 });
  }
  tiles.push(await sharp({ create: { width: CW, height: CH, channels: 4, background: '#eef0ec' } }).composite(safe).png().toBuffer());
}
const cols = Math.min(3, tiles.length), rows = Math.ceil(tiles.length / cols);
await sharp({ create: { width: cols * CW, height: rows * CH, channels: 4, background: '#ffffff' } })
  .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * CW, top: Math.floor(i / cols) * CH }))).png().toFile(out);
console.log('saved', out, tiles.length);
