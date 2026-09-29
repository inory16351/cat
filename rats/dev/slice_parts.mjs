// UnityResources/Rats/Sheets/<id>.png (3×2 파츠 시트, 마젠타 배경) → 파츠 PNG + 관절 정보
//
// 출력
//   UnityResources/Rats/Parts/<id>/<part>.png   원본 해상도 투명 PNG (유니티용)
//   UnityResources/Rats/Parts/pivots.json       관절/앵커 (좌상단 기준 0~1, 유니티용 pivotUnity 는 좌하단 기준)
//   assets/rats/parts/<id>/<part>.png           게임용 축소본
//   rats/js/parts_meta.js                       게임용 관절 정보 (RAT_PARTS)
//
// 관절 찾기는 고양이 방치 게임(idle/dev/slice_parts.py)과 같은 방식:
//   다리: 윗면 중앙 = 어깨/엉덩이 / 머리: 아래쪽 오른편(목 잘린 면) 중심 / 꼬리: 왼쪽 끝 중심
//   몸통: 윤곽에서 목·꼬리·어깨·엉덩이 자리
// 사용법 (rats/dev 에서): node slice_parts.mjs [--only id,id]
import sharp from 'sharp';
import { readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..', '..');
const SHEETS = path.join(ROOT, 'UnityResources', 'Rats', 'Sheets');
const U_PARTS = path.join(ROOT, 'UnityResources', 'Rats', 'Parts');
const G_PARTS = path.join(ROOT, 'assets', 'rats', 'parts');
const CELLS = { head: [0, 0], torso: [1, 0], tail: [2, 0], front: [0, 1], back: [1, 1] };
const GAME_SCALE = 0.4;
// 배 아래로 보이는 다리 길이 / 몸통 높이 (쥐는 다리가 짧고 배가 바닥 가까이)
const LEG_VIS = { rat: 0.3, mouse: 0.32, gerbil: 0.3, hamster: 0.15 };

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;

// 종 → 체형
globalThis.ITEMS = {}; globalThis.fmt = String;
const { readFileSync } = await import('node:fs');
const { RSPECIES_BY_ID } = new Function(readFileSync(path.join(ROOT, 'rats', 'js', 'data.js'), 'utf8') + '\nreturn { RSPECIES_BY_ID };')();

// 마젠타 크로마키: m = min(r,b) - g 가 클수록 배경. 경계는 반투명 + 배경색 빼기(despill)
function keyOut(data, w, h) {
  const LO = 70, HI = 150;
  for (let i = 0; i < w * h * 4; i += 4) {
    if (data[i + 3] < 255) continue;             // Codex 가 이미 투명 처리한 곳은 그대로
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const m = Math.min(r, b) - g;
    let a = m <= LO ? 1 : m >= HI ? 0 : 1 - (m - LO) / (HI - LO);
    if (a < 1 && a > 0) {
      // c = a*fg + (1-a)*key  →  fg = (c - (1-a)*key) / a
      data[i] = clamp8((r - (1 - a) * 255) / a); data[i + 1] = clamp8(g / a); data[i + 2] = clamp8((b - (1 - a) * 255) / a);
    }
    data[i + 3] = Math.round(a * 255);
  }
}
const clamp8 = v => Math.max(0, Math.min(255, Math.round(v)));

// 작은 부스러기(떨어진 점) 지우기: 4방향 연결 성분 중 minArea 미만 제거
function dropSpecks(data, w, h, minArea) {
  const seen = new Uint8Array(w * h), stack = [];
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || data[s * 4 + 3] < 40) continue;
    const comp = []; stack.push(s); seen[s] = 1;
    while (stack.length) {
      const p = stack.pop(); comp.push(p);
      const x = p % w, y = (p / w) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && !seen[q] && data[q * 4 + 3] >= 40) { seen[q] = 1; stack.push(q); }
      }
    }
    if (comp.length < minArea) for (const p of comp) data[p * 4 + 3] = 0;
  }
}

// 8방향 연결 성분 → 칸(파츠 번호). 작은 부스러기는 버리고, 반투명 가장자리는 옆 픽셀 주인을 따라감
function segment(data, w, h, cw, ch) {
  const N = w * h, lab = new Int32Array(N).fill(-1), owner = new Int8Array(N).fill(-1), stack = [];
  const cellPart = {}; Object.values(CELLS).forEach(([cx, cy], i) => (cellPart[cx + ',' + cy] = i));
  let id = 0;
  for (let s = 0; s < N; s++) {
    if (lab[s] >= 0 || data[s * 4 + 3] <= 40) continue;
    const comp = []; stack.push(s); lab[s] = id;
    while (stack.length) {
      const p = stack.pop(); comp.push(p);
      const x = p % w, y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx; if (lab[q] < 0 && data[q * 4 + 3] > 40) { lab[q] = id; stack.push(q); }
      }
    }
    id++;
    if (comp.length < 80) continue;
    let sx = 0, sy = 0; for (const p of comp) { sx += p % w; sy += (p / w) | 0; }
    const part = cellPart[Math.min(2, Math.floor(sx / comp.length / cw)) + ',' + Math.min(1, Math.floor(sy / comp.length / ch))];
    if (part === undefined) continue;
    for (const p of comp) owner[p] = part;
  }
  for (let p = 0; p < N; p++) {
    if (owner[p] >= 0 || data[p * 4 + 3] === 0) continue;
    const x = p % w, y = (p / w) | 0;
    for (const q of [p - 1, p + 1, p - w, p + w]) if (q >= 0 && q < N && Math.abs((q % w) - x) <= 1 && owner[q] >= 0) { owner[p] = owner[q]; break; }
  }
  return owner;
}

function bbox(data, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

// 마스크(2차원 bool) 분석
const maskOf = (data, w, h) => ({ w, h, at: (x, y) => data[(y * w + x) * 4 + 3] > 40 });
function centroid(M, pred) {
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) if (M.at(x, y) && pred(x, y)) { sx += x; sy += y; n++; }
  return n ? [sx / n, sy / n] : null;
}
function legJoint(M) {
  let top = 0; while (top < M.h && ![...Array(M.w).keys()].some(x => M.at(x, top))) top++;
  const xs = [];
  for (let x = 0; x < M.w; x++) for (let y = top; y < Math.min(M.h, top + 6); y++) if (M.at(x, y)) { xs.push(x); break; }
  return [(Math.min(...xs) + Math.max(...xs)) / 2 / M.w, (top + M.h * 0.05) / M.h];
}
function headJoint(M) {
  const c = centroid(M, (x, y) => y > M.h * 0.78 && x > M.w * 0.45) || centroid(M, (x, y) => y > M.h * 0.78);
  return [c[0] / M.w, Math.min(0.95, c[1] / M.h)];
}
function tailJoint(M) { const c = centroid(M, x => x < M.w * 0.1); return [c[0] / M.w, c[1] / M.h]; }
function torsoAnchors(M) {
  const top = [], bot = [];
  for (let x = 0; x < M.w; x++) {
    let t = null, b = null;
    for (let y = 0; y < M.h; y++) if (M.at(x, y)) { if (t === null) t = y; b = y; }
    top.push(t); bot.push(b);
  }
  const xs = top.map((t, x) => (t === null ? null : x)).filter(x => x !== null);
  const x0 = xs[0], x1 = xs[xs.length - 1], span = x1 - x0;
  const col = fx => { let x = Math.round(x0 + span * fx); while (top[x] === null) x++; return x; };
  const under = (fx, inset) => { const x = col(fx); return [x / M.w, (bot[x] - M.h * inset) / M.h]; };
  const mid = (fx, bias) => { const x = col(fx); return [x / M.w, (top[x] + (bot[x] - top[x]) * bias) / M.h]; };
  return { neck: mid(0.07, 0.4), tail: mid(0.95, 0.4), top, bot, col };
}
const r3 = v => Math.round(v * 1000) / 1000;
const rr = a => a.map(r3);

const meta = {}, unity = {};
const files = readdirSync(SHEETS).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)).filter(id => !only || only.includes(id));
for (const id of files) {
  const sp = RSPECIES_BY_ID[id];
  if (!sp) { console.log('  (알 수 없는 종)', id); continue; }
  const src = sharp(path.join(SHEETS, id + '.png')).ensureAlpha();
  const { data: full, info } = await src.raw().toBuffer({ resolveWithObject: true });
  keyOut(full, info.width, info.height);
  const cw = Math.floor(info.width / 3), ch = Math.floor(info.height / 2);
  const out = { size: {}, pivot: {} }, masks = {}, warn = [];
  mkdirSync(path.join(U_PARTS, id), { recursive: true });
  mkdirSync(path.join(G_PARTS, id), { recursive: true });
  // 칸으로 자르지 않고, 덩어리(연결 성분)의 중심이 어느 칸에 있는지로 파츠를 나눈다 → 칸 경계를 살짝 넘어도 안 잘림
  const owner = segment(full, info.width, info.height, cw, ch);
  const names = Object.keys(CELLS);
  for (const [pi, part] of names.entries()) {
    const cell = Buffer.alloc(info.width * info.height * 4);
    for (let p = 0; p < owner.length; p++) if (owner[p] === pi) full.copy(cell, p * 4, p * 4, p * 4 + 4);
    const bb = bbox(cell, info.width, info.height);
    if (!bb) { warn.push(part + ' 없음'); continue; }
    const pw = bb.x1 - bb.x0 + 1, ph = bb.y1 - bb.y0 + 1;
    const img = sharp(cell, { raw: { width: info.width, height: info.height, channels: 4 } }).extract({ left: bb.x0, top: bb.y0, width: pw, height: ph });
    const buf = await img.png().toBuffer();
    writeFileSync(path.join(U_PARTS, id, part + '.png'), buf);
    const gw = Math.max(1, Math.round(pw * GAME_SCALE)), gh = Math.max(1, Math.round(ph * GAME_SCALE));
    const small = await sharp(buf).resize(gw, gh, { kernel: 'lanczos3' }).raw().toBuffer();
    // 게임용 다리: 몸통 위에 겹쳐 그리므로 잘린 윗면이 선으로 보이지 않게 위쪽을 부드럽게 투명 처리 (유니티용 원본은 그대로)
    if (part === 'front' || part === 'back') {
      let top = 0; while (top < gh && ![...Array(gw).keys()].some(x => small[(top * gw + x) * 4 + 3] > 40)) top++;
      const fade = Math.max(3, Math.round(gh * 0.16));
      for (let y = top; y < Math.min(gh, top + fade); y++) {
        const k = (y - top) / fade, m = k * k * (3 - 2 * k);
        for (let x = 0; x < gw; x++) small[(y * gw + x) * 4 + 3] = Math.round(small[(y * gw + x) * 4 + 3] * m);
      }
    }
    await sharp(small, { raw: { width: gw, height: gh, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(G_PARTS, id, part + '.png'));
    out.size[part] = [gw, gh];
    masks[part] = maskOf(small, gw, gh);
  }
  if (!masks.torso) { console.log('  ✗', id, '몸통 없음', warn); continue; }
  const TA = torsoAnchors(masks.torso);
  out.anchor = { neck: rr(TA.neck), tail: rr(TA.tail) };
  if (masks.head) out.pivot.head = rr(headJoint(masks.head));
  if (masks.tail) out.pivot.tail = rr(tailJoint(masks.tail));
  // 다리: 가까운 쪽 다리는 몸통 위에 겹쳐 그리므로 관절(다리 윗면)을 몸통 안쪽 어깨/엉덩이 자리에 둔다.
  //  - 앞발·뒷발이 같은 바닥선 G(배 아래 + 몸통 높이 × LEG_VIS)에 닿게
  //  - 다리는 원본 비율(배율 1)을 최대한 유지하고, 관절이 몸통 밖으로 나가면 그때만 배율 조정
  const tw = out.size.torso[0], th = out.size.torso[1], vis = LEG_VIS[sp.shape] ?? 0.3;
  const X = { front: TA.col(0.24), back: TA.col(0.74) };
  const G = Math.max(TA.bot[X.front], TA.bot[X.back]) + th * vis;
  for (const leg of ['front', 'back']) {
    if (!masks[leg]) continue;
    const piv = legJoint(masks[leg]);
    out.pivot[leg] = rr(piv);
    const x = X[leg], t = TA.top[x], b = TA.bot[x], nat = out.size[leg][1] * (1 - piv[1]);
    const joint = Math.max(t + (b - t) * (leg === 'back' ? 0.3 : 0.4), Math.min(b - (b - t) * 0.3, G - nat));
    out.anchor[leg === 'front' ? 'shoulder' : 'hip'] = rr([x / tw, joint / th]);
    (out.legScale ||= {})[leg] = r3((G - joint) / nat);
  }
  meta[id] = out;
  unity[id] = {
    parts: Object.keys(out.size).map(p => `Parts/${id}/${p}.png`),
    pivot: out.pivot, pivotUnity: Object.fromEntries(Object.entries(out.pivot).map(([k, [x, y]]) => [k, [x, r3(1 - y)]])),
    torsoAnchor: out.anchor, torsoAnchorUnity: Object.fromEntries(Object.entries(out.anchor).map(([k, [x, y]]) => [k, [x, r3(1 - y)]])),
    legScale: out.legScale,
  };
  console.log(`  ✓ ${id}${warn.length ? '  ⚠ ' + warn.join(', ') : ''}`);
}

// 기존 결과와 합치기 (--only 로 일부만 다시 자를 때)
const metaPath = path.join(ROOT, 'rats', 'js', 'parts_meta.js'), uPath = path.join(U_PARTS, 'pivots.json');
let oldMeta = {}, oldU = {};
if (existsSync(metaPath)) { try { oldMeta = new Function(readFileSync(metaPath, 'utf8') + '\nreturn RAT_PARTS;')(); } catch { /* 새로 */ } }
if (existsSync(uPath)) { try { oldU = JSON.parse(readFileSync(uPath, 'utf8')).species || {}; } catch { /* 새로 */ } }
const allMeta = { ...oldMeta, ...meta }, allU = { ...oldU, ...unity };
writeFileSync(metaPath, '// 자동 생성: rats/dev/slice_parts.mjs (관절 위치는 파츠 이미지 분석 결과)\nconst RAT_PARTS = ' + JSON.stringify(allMeta) + ';\n');
writeFileSync(uPath, JSON.stringify({
  note: 'pivot/torsoAnchor: 이미지 좌상단 기준 0~1. pivotUnity/torsoAnchorUnity: 유니티 Sprite pivot 용 좌하단 기준 0~1. 모든 파츠는 같은 배율(원본 시트 해상도). 캐릭터는 왼쪽을 봄.',
  species: allU,
}, null, 1));
console.log(`파츠 ${Object.keys(meta).length}종 처리 (누적 ${Object.keys(allMeta).length}종)`);
