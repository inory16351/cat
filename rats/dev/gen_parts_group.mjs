// 토큰 절약판 쥐 파츠 시트: 한 장(5열 × 4행)에 4종을 모아 그린 뒤, 종별 3×2 시트로 재배치 → slice_parts.mjs 로 자르기
// 사용법 (rats/dev 에서):
//   node gen_parts_group.mjs --only pcmouse,zapham,parkrat,streamrat     (4종씩 묶어서 생성, 동시 --par 장)
//   node gen_parts_group.mjs                                             시트가 없는 종 전부 (4종씩)
//   node gen_parts_group.mjs --split-only                                생성 없이 모음 시트 → 종별 시트만 다시 만들기
// 원본 모음 시트: UnityResources/Rats/Sheets/group_<id+id+…>.png / 종별 시트: UnityResources/Rats/Sheets/<id>.png (slice_parts 입력)
import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { codexImage, loadData, SHEETS } from './gen_parts.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PER = 4, COLS = 5, PARTS = ['head', 'torso', 'tail', 'front', 'back'];
const STYLE = 'Flat minimalist illustration in the style of "Untitled Goose Game": simple clean geometric shapes, NO outlines, soft muted pastel palette (warm cream, sage green, dusty terracotta, warm greys, soft blue), flat colors with at most one slightly darker flat shade, clean vector look, charming and quietly funny.';
const BODY = {
  rat: 'long pointed snout, big round ear; tail = a LONG thin tapering pink tail drawn horizontally',
  mouse: 'short pointed snout, very big round ear; tail = a long thin tapering tail drawn horizontally',
  hamster: 'round chubby face with puffy cheeks; tail = a TINY stubby tail nub',
  gerbil: 'short snout, round ear; tail = a long furry tail with a tuft, drawn horizontally',
  squirrel: 'short cute snout, small tufted pointy ears, big shiny eye; tail = a HUGE fluffy bushy squirrel tail as big as the body, curling UP',
};
function groupPrompt(g) {
  return [
    STYLE,
    `Asset: a cut-out PUPPET PARTS SHEET for ${g.length} different small rodent characters (paper-doll rigs animated in code).`,
    'Canvas: landscape 1536x1024. Background: perfectly flat solid pure MAGENTA #FF00FF everywhere between parts; never use magenta inside the characters.',
    `Layout: an invisible grid of ${COLS} columns x ${g.length} rows of equal cells. Each ROW is ONE character; each part is drawn SEPARATELY and ALONE in its own cell, centered, with empty margin, never touching other parts or the cell borders. All parts of one character use the SAME SCALE. Strict side view, facing LEFT.`,
    'Columns in every row, left to right:',
    '1. HEAD only (hats, hoods, headbands, glasses belong here), side profile facing left, modest size (about 45% of the torso length), clean straight cut at the neck on its lower-right side.',
    '2. TORSO only: shoulders to rump as one smooth horizontal rounded shape (clothing, capes, backpacks, batteries belong here). NO head, NO legs, NO tail.',
    '3. TAIL only, root (left end) is a clean cut.',
    '4. ONE FRONT LEG only, standing upright, small paw at the bottom (a small handheld prop may be held in this paw), flat cut at the top.',
    '5. ONE HIND LEG only, standing upright, rounded thigh at top, foot pointing LEFT at the bottom, flat cut at the top.',
    'Rows, top to bottom:',
    ...g.map((sp, i) => `Row ${i + 1}: ${sp.en}. (${sp.partsHint || BODY[sp.shape] || BODY.rat})`),
    'These are ORIGINAL parody characters: do NOT copy any existing cartoon, game or brand character, logo or trademark. No text, no labels, no numbers, no shadows, no outlines, no border, no watermark.',
  ].join('\n');
}
const nameOf = g => 'group_' + g.map(s => s.id).join('+');
// 모음 시트 → 종별 3×2 시트 (slice_parts 입력: 윗줄 머리·몸통·꼬리 / 아랫줄 앞다리·뒷다리·빈칸)
// Codex 가 칸을 정확히 안 지키므로 칸 경계로 자르지 않고, 연결 성분(덩어리)의 중심이 들어간 칸의 파츠로 통째로 옮긴다.
// 한 종의 파츠는 모두 같은 배율로 키워서(관절 비율 유지) 512칸 가운데에 놓는다.
async function splitGroup(file, g, keep) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, cw = w / COLS, ch = h / g.length;
  for (let i = 0; i < data.length; i += 4) { if (data[i + 3] < 255) continue; const m = Math.min(data[i], data[i + 2]) - data[i + 1]; if (m > 150) data[i + 3] = 0; else if (m > 70) data[i + 3] = Math.round(255 * (1 - (m - 70) / 80)); }
  const owner = new Int16Array(w * h).fill(-1), lab = new Uint8Array(w * h), stack = [];
  for (let s0 = 0; s0 < w * h; s0++) {
    if (lab[s0] || data[s0 * 4 + 3] <= 30) continue;
    const comp = []; stack.push(s0); lab[s0] = 1;
    while (stack.length) { const q = stack.pop(); comp.push(q); const x = q % w, y = (q / w) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const k = ny * w + nx; if (!lab[k] && data[k * 4 + 3] > 30) { lab[k] = 1; stack.push(k); } } }
    if (comp.length < 40) continue;
    let sx = 0, sy = 0; for (const q of comp) { sx += q % w; sy += (q / w) | 0; }
    const cell = Math.min(g.length - 1, Math.floor(sy / comp.length / ch)) * COLS + Math.min(COLS - 1, Math.floor(sx / comp.length / cw));
    for (const q of comp) owner[q] = cell;
  }
  const PLACE = { head: [0, 0], torso: [1, 0], tail: [2, 0], front: [0, 1], back: [1, 1] };
  for (const [row, sp] of g.entries()) {
    if (keep && !keep.includes(sp.id)) continue;             // --only 로 고른 종만 다시 만들기
    const parts = [];
    for (const [col, part] of PARTS.entries()) {
      const ci = row * COLS + col; let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let q = 0; q < w * h; q++) if (owner[q] === ci) { const x = q % w, y = (q / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) { console.log(`  ⚠ ${sp.id}/${part} 비어 있음`); continue; }
      const pw = x1 - x0 + 1, ph = y1 - y0 + 1, out = Buffer.alloc(pw * ph * 4);
      for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) { const q = (y0 + y) * w + x0 + x; if (owner[q] === ci) data.copy(out, (y * pw + x) * 4, q * 4, q * 4 + 4); }
      parts.push({ part, pw, ph, out });
    }
    const sc = Math.min(1.6, ...parts.map(p => 470 / Math.max(p.pw, p.ph)));
    const comp = [];
    for (const p of parts) {
      const W2 = Math.max(1, Math.round(p.pw * sc)), H2 = Math.max(1, Math.round(p.ph * sc)), [cx, cy] = PLACE[p.part];
      comp.push({ input: await sharp(p.out, { raw: { width: p.pw, height: p.ph, channels: 4 } }).resize(W2, H2).png().toBuffer(), left: cx * 512 + Math.round((512 - W2) / 2), top: cy * 512 + Math.round((512 - H2) / 2) });
    }
    await sharp({ create: { width: 1536, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comp).png().toFile(path.join(SHEETS, sp.id + '.png'));
    console.log(`  ↳ ${sp.id}.png (3×2, ×${sc.toFixed(2)})`);
  }
}

const args = process.argv.slice(2), opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const { RSPECIES } = loadData(), only = opt('--only')?.split(','), par = Number(opt('--par') || 2);
mkdirSync(SHEETS, { recursive: true });
const pool = RSPECIES.filter(s => (only ? only.includes(s.id) : !existsSync(path.join(SHEETS, s.id + '.png'))));
const groups = []; for (let i = 0; i < pool.length; i += PER) groups.push(pool.slice(i, i + PER));
if (!args.includes('--split-only')) {
  console.log(`모음 시트 ${groups.length}장 (한 장에 ${PER}종, 동시 ${par}장)`);
  let stop = false;
  const todo = [...groups];
  await Promise.all(Array.from({ length: par }, async () => {
    while (todo.length && !stop) {
      const g = todo.shift(), file = path.join(SHEETS, nameOf(g) + '.png');
      try { if (await codexImage(groupPrompt(g), file, nameOf(g))) await splitGroup(file, g); } catch (e) { console.log(e.message); stop = true; }
    }
  }));
} else {
  for (const f of readdirSync(SHEETS)) if (f.startsWith('group_')) { const ids = f.slice(6, -4).split('+'); await splitGroup(path.join(SHEETS, f), ids.map(id => RSPECIES.find(s => s.id === id)).filter(Boolean), only); }
}
// 종별 시트가 생긴 종만 자르기 + 관절 분석
const ids = pool.filter(s => existsSync(path.join(SHEETS, s.id + '.png'))).map(s => s.id);
if (ids.length) execFileSync(process.execPath, [path.join(DIR, 'slice_parts.mjs'), '--only', ids.join(',')], { stdio: 'inherit' });
