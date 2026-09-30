// 특수 액션·필살기 이미지 생성 + 후처리 (목록은 art_list.mjs)
// 사용법 (rats/dev 에서):
//   node gen_art.mjs                  없는 것만 Codex 로 생성(동시 3개) → 후처리
//   node gen_art.mjs --only fx        종류(prop|fx) 또는 id 로 골라서 (--only gun,meteor)
//   node gen_art.mjs --force          다시 생성
//   node gen_art.mjs --process-only   생성 없이 후처리만
//   node gen_art.mjs --list           목록·프롬프트 출력
// 원본: UnityResources/Rats/{Props,FX}/<id>.png (유니티용 보관)
// 게임용: assets/rats/{props,fx}/<id>.png (여백 잘라 축소) + rats/js/art_manifest.js (있는 이미지 목록)
import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { artList } from './art_list.mjs';
import { codexImage } from './gen_parts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const U = path.join(ROOT, 'UnityResources', 'Rats');
const OUT = path.join(ROOT, 'assets', 'rats');
const GAME_DIR = { prop: 'props', fx: 'fx' }, GAME_MAX = { prop: 128, fx: 256 };
const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const only = opt('--only')?.split(','), force = args.includes('--force'), par = Number(opt('--par') || 3);
const list = artList().filter(a => !only || only.includes(a.kind) || only.includes(a.id));
const src = a => path.join(U, a.folder, a.id + '.png');

if (args.includes('--list')) { for (const a of list) console.log(`\n# [${a.kind}] ${a.id} ${a.emoji || ''}\n${a.prompt}`); process.exit(0); }

// 기본: Codex 사용량을 아끼려고 한 장(4×3 = 12칸)에 모아서 뽑은 뒤 칸별로 잘라 씀. --single 이면 예전처럼 한 장씩.
const COLS = 4, ROWS = 3, PER = COLS * ROWS;
const SHEET_DIR = path.join(U, 'ArtSheets');
function sheetPrompt(items) {
  const STYLE = 'Flat minimalist illustration in the style of "Untitled Goose Game": simple clean geometric shapes, NO outlines, soft muted pastel palette (warm cream, sage green, dusty terracotta, warm greys, soft blue), flat colors with at most one slightly darker flat shade, clean vector look, charming and quietly funny.';
  return [
    STYLE,
    `Asset: a game SPRITE SHEET of ${items.length} separate small objects. Canvas: landscape 1536x1024, fully transparent background.`,
    `Layout: an invisible grid of ${COLS} columns x ${ROWS} rows of equal cells (384x341 each). Exactly ONE object per cell, centered, filling about 70% of its cell, with generous empty margin. Objects never touch each other or the cell borders. Same art style and lighting for all. Unless a cell says otherwise, draw the object in a gentle three-quarter view from slightly above, standing on its base.`,
    'Cells in reading order (left to right, top to bottom):',
    ...items.map((a, i) => `${i + 1}. ${a.desc}`),
    ...(items.length < PER ? [`Cells ${items.length + 1} to ${PER}: completely EMPTY.`] : []),
    'No text, no numbers, no labels, no grid lines, no shadows, no border, no watermark.',
  ].join('\n');
}
// 시트 → 칸별 이미지: 덩어리(연결 성분)의 중심이 들어간 칸으로 나눈다 (칸 경계를 살짝 넘어도 안 잘림)
async function sliceSheet(file, items) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, cw = w / COLS, ch = h / ROWS;
  for (let i = 0; i < data.length; i += 4) { if (data[i + 3] < 255) continue; const m = Math.min(data[i], data[i + 2]) - data[i + 1]; if (m > 150) data[i + 3] = 0; }
  const lab = new Int32Array(w * h).fill(-1), owner = new Int16Array(w * h).fill(-1), stack = [];
  for (let s0 = 0; s0 < w * h; s0++) {
    if (lab[s0] >= 0 || data[s0 * 4 + 3] <= 30) continue;
    const comp = []; stack.push(s0); lab[s0] = 1;
    while (stack.length) {
      const p = stack.pop(); comp.push(p); const x = p % w, y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const q = ny * w + nx; if (lab[q] < 0 && data[q * 4 + 3] > 30) { lab[q] = 1; stack.push(q); } }
    }
    if (comp.length < 25) continue;
    let sx = 0, sy = 0; for (const p of comp) { sx += p % w; sy += (p / w) | 0; }
    const cell = Math.min(ROWS - 1, Math.floor(sy / comp.length / ch)) * COLS + Math.min(COLS - 1, Math.floor(sx / comp.length / cw));
    for (const p of comp) owner[p] = cell;
  }
  let ok = 0;
  for (const [ci, a] of items.entries()) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let p = 0; p < w * h; p++) if (owner[p] === ci) { const x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { console.log(`  ⚠ ${a.id}: 칸 ${ci + 1} 이 비어 있음`); continue; }
    const cw2 = x1 - x0 + 1, ch2 = y1 - y0 + 1, out = Buffer.alloc(cw2 * ch2 * 4);
    for (let y = 0; y < ch2; y++) for (let x = 0; x < cw2; x++) { const p = (y0 + y) * w + x0 + x; if (owner[p] === ci || (owner[p] < 0 && data[p * 4 + 3] <= 30)) data.copy(out, (y * cw2 + x) * 4, p * 4, p * 4 + 4); }
    mkdirSync(path.dirname(src(a)), { recursive: true });
    await sharp(out, { raw: { width: cw2, height: ch2, channels: 4 } }).png().toFile(src(a));
    ok++;
  }
  return ok;
}
if (!args.includes('--process-only')) {
  const todo = list.filter(a => force || !existsSync(src(a)));
  if (args.includes('--single')) {
    console.log(`생성할 이미지 ${todo.length}개 (한 장씩, 동시 ${par}개)`);
    let stop = false;
    await Promise.all(Array.from({ length: par }, async () => {
      while (todo.length && !stop) {
        const a = todo.shift();
        mkdirSync(path.dirname(src(a)), { recursive: true });
        try { await codexImage(a.prompt, src(a), `${a.kind}/${a.id}`); } catch (e) { console.log(e.message); stop = true; }
      }
    }));
  } else {
    const groups = []; for (let i = 0; i < todo.length; i += PER) groups.push(todo.slice(i, i + PER));
    console.log(`생성할 이미지 ${todo.length}개 → 시트 ${groups.length}장 (${COLS}×${ROWS}, 동시 ${par}장)`);
    mkdirSync(SHEET_DIR, { recursive: true });
    let stop = false, n = 0;
    await Promise.all(Array.from({ length: Math.min(par, groups.length) }, async () => {
      while (groups.length && !stop) {
        const items = groups.shift(), file = path.join(SHEET_DIR, `art_${String(++n).padStart(2, '0')}_${items[0].id}.png`);
        try {
          if (await codexImage(sheetPrompt(items), file, `시트 ${items.map(a => a.id).join(',')}`)) console.log(`  → ${await sliceSheet(file, items)}/${items.length}개 잘라냄`);
        } catch (e) { console.log(e.message); stop = true; }
      }
    }));
  }
}

// 후처리: 마젠타가 섞여 오면 지우고(가끔 불투명 배경으로 옴), 여백 자르고, 게임 크기로 축소
async function processOne(a) {
  const { data, info } = await sharp(src(a)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 255) continue;
    const m = Math.min(data[i], data[i + 2]) - data[i + 1];
    if (m > 150) data[i + 3] = 0; else if (m > 70) data[i + 3] = Math.round(255 * (1 - (m - 70) / 80));
  }
  const buf = await sharp(data, { raw: info }).png().toBuffer();
  const trimmed = await sharp(buf).trim({ threshold: 1 }).toBuffer();
  const dst = path.join(OUT, GAME_DIR[a.kind], a.id + '.png');
  mkdirSync(path.dirname(dst), { recursive: true });
  await sharp(trimmed).resize(GAME_MAX[a.kind], GAME_MAX[a.kind], { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(dst);
}
const manifest = { prop: {} };
for (const a of artList()) {
  if (!existsSync(src(a))) continue;
  if (!only || only.includes(a.kind) || only.includes(a.id) || !existsSync(path.join(OUT, GAME_DIR[a.kind], a.id + '.png'))) await processOne(a);
  manifest.prop[a.emoji] = `${GAME_DIR[a.kind]}/${a.id}`;
}
writeFileSync(path.join(ROOT, 'rats', 'js', 'art_manifest.js'),
  '// 자동 생성: rats/dev/gen_art.mjs — 실제로 있는 특수 액션·필살기 이미지 목록 (없으면 이모지/코드 그림으로 대체)\n' +
  `const RAT_ART = ${JSON.stringify(manifest)};\n`);
console.log(`게임 이미지: 소품·이펙트 ${Object.keys(manifest.prop).length}개`);
