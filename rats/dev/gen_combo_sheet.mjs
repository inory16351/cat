// 토큰 절약용 모음 시트: 새 종의 파츠 행 + 필살기·특수 액션 소품 행을 Codex 한 장(5열)에 같이 그려서 각 파이프라인으로 나눔
// 사용법 (rats/dev 에서):
//   node gen_combo_sheet.mjs --rats ramjui --fx thor_helm,thor_cape,acorn_hammer,bolt_pillar,ground_crack
//   --split-only   생성 없이 이미 있는 모음 시트만 다시 나누기 / --print  프롬프트만 출력
// 흐름
//   UnityResources/Rats/Sheets/combo_<이름>.png           Codex 원본 모음 시트 (보관)
//   쥐 행  → Sheets/group_<id>.png → gen_parts_group --split-only → slice_parts (파츠·parts_meta.js)
//   소품 행 → 칸별로 잘라 UnityResources/Rats/<폴더>/<id>.png (art_list 원본 위치) → gen_art --process-only (게임 이미지·art_manifest.js)
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { codexImage, loadData, SHEETS } from './gen_parts.mjs';
import { artList } from './art_list.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(DIR, '..', '..'), U = path.join(ROOT, 'UnityResources', 'Rats');
const args = process.argv.slice(2), opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const COLS = 5;
const { RSPECIES } = loadData();
const rats = (opt('--rats') || '').split(',').filter(Boolean).map(id => RSPECIES.find(s => s.id === id) || (() => { throw new Error('없는 종: ' + id); })());
const ART = artList(), fx = (opt('--fx') || '').split(',').filter(Boolean).map(id => ART.find(a => a.id === id) || (() => { throw new Error('art_list 에 없는 소품: ' + id); })());
const fxRows = []; for (let i = 0; i < fx.length; i += COLS) fxRows.push(fx.slice(i, i + COLS));
const rows = rats.length + fxRows.length;
const BODY = {
  rat: 'long pointed snout, big round ear; tail = a LONG thin tapering pink tail drawn horizontally',
  mouse: 'short pointed snout, very big round ear; tail = a long thin tapering tail drawn horizontally',
  hamster: 'round chubby face with puffy cheeks; tail = a TINY stubby tail nub',
  gerbil: 'short snout, round ear; tail = a long furry tail with a tuft, drawn horizontally',
  squirrel: 'short cute snout, small tufted pointy ears, big shiny eye; tail = a HUGE fluffy bushy squirrel tail as big as the body, curling UP',
};
const STYLE = 'Flat minimalist illustration in the style of "Untitled Goose Game": simple clean geometric shapes, NO outlines, soft muted pastel palette (warm cream, sage green, dusty terracotta, warm greys, soft blue), flat colors with at most one slightly darker flat shade, clean vector look, charming and quietly funny.';
const prompt = [
  STYLE,
  `Asset: ONE combined game sheet with ${rows} rows. Canvas: landscape 1536x1024. Background: perfectly flat solid pure MAGENTA #FF00FF everywhere between the drawings (no gradient); never use magenta inside the drawings.`,
  `Layout: an invisible grid of ${COLS} columns x ${rows} rows of equal cells. Exactly ONE drawing per cell, centered, with empty margin, never touching other drawings or the cell borders.`,
  ...rats.map((sp, i) => `Row ${i + 1} = cut-out PUPPET PARTS of one small rodent character (paper-doll rig; strict side view facing LEFT; all its parts at the SAME SCALE): ${sp.en}. (${BODY[sp.shape] || BODY.rat}). Columns: 1 HEAD only (clean cut at the neck, lower-right) · 2 TORSO only, one smooth horizontal rounded body, NO head/legs/tail · 3 TAIL only (root on the left is a clean cut) · 4 ONE FRONT LEG standing upright, small paw at the bottom, flat cut at the top · 5 ONE HIND LEG standing upright, foot pointing LEFT, flat cut at the top.`),
  ...fxRows.map((g, i) => `Row ${rats.length + i + 1} = separate game effect / prop sprites, one per cell: ${g.map((a, k) => `(${k + 1}) ${a.desc}`).join(' · ')}${g.length < COLS ? ` · remaining cells EMPTY` : ''}.`),
  'ORIGINAL parody designs only: do not copy any existing movie, comic, game or brand character or logo. No text, no labels, no numbers, no ground shadows, no outlines, no border, no watermark.',
].join('\n');
if (args.includes('--print')) { console.log(prompt); process.exit(0); }
const name = 'combo_' + [...rats.map(s => s.id), ...fx.map(a => a.id)].join('+').slice(0, 120), file = path.join(SHEETS, name + '.png');
mkdirSync(SHEETS, { recursive: true });
if (!args.includes('--split-only') && !(await codexImage(prompt, file, name))) process.exit(1);

const { width: w, height: h } = await sharp(file).metadata(), rh = Math.floor(h / rows);
// 쥐 행 → 종별 모음 시트(한 줄짜리 group_) → 기존 파츠 파이프라인
for (const [i, sp] of rats.entries()) {
  const out = path.join(SHEETS, `group_${sp.id}.png`);
  await sharp(file).extract({ left: 0, top: i * rh, width: w, height: rh }).png().toFile(out);
  console.log(`  ↳ ${path.relative(ROOT, out)}`);
}
if (rats.length) {
  execFileSync(process.execPath, [path.join(DIR, 'gen_parts_group.mjs'), '--only', rats.map(s => s.id).join(','), '--split-only'], { stdio: 'inherit', cwd: DIR });
  execFileSync(process.execPath, [path.join(DIR, 'slice_parts.mjs'), '--only', rats.map(s => s.id).join(',')], { stdio: 'inherit', cwd: DIR });
}
// 소품 행 → 칸별로 (덩어리 중심이 들어간 칸) 잘라 원본 위치에 저장
for (const [ri, g] of fxRows.entries()) {
  const top = (rats.length + ri) * rh, { data, info } = await sharp(file).extract({ left: 0, top, width: w, height: rh }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, cw = W / COLS;
  for (let i = 0; i < data.length; i += 4) { if (data[i + 3] < 255) continue; const m = Math.min(data[i], data[i + 2]) - data[i + 1]; if (m > 150) data[i + 3] = 0; else if (m > 70) data[i + 3] = Math.round(255 * (1 - (m - 70) / 80)); }
  const owner = new Int16Array(W * H).fill(-1), lab = new Uint8Array(W * H), stack = [];
  for (let s0 = 0; s0 < W * H; s0++) {
    if (lab[s0] || data[s0 * 4 + 3] <= 30) continue;
    const comp = []; stack.push(s0); lab[s0] = 1;
    while (stack.length) { const q = stack.pop(); comp.push(q); const x = q % W, y = (q / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = ny * W + nx; if (!lab[k] && data[k * 4 + 3] > 30) { lab[k] = 1; stack.push(k); } } }
    if (comp.length < 25) continue;
    let sx = 0; for (const q of comp) sx += q % W;
    const cell = Math.min(COLS - 1, Math.floor(sx / comp.length / cw)); for (const q of comp) owner[q] = cell;
  }
  for (const [ci, a] of g.entries()) {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let q = 0; q < W * H; q++) if (owner[q] === ci) { const x = q % W, y = (q / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { console.log(`  ⚠ ${a.id}: 비어 있음`); continue; }
    const pw = x1 - x0 + 1, ph = y1 - y0 + 1, out = Buffer.alloc(pw * ph * 4);
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) { const q = (y0 + y) * W + x0 + x; if (owner[q] === ci) data.copy(out, (y * pw + x) * 4, q * 4, q * 4 + 4); }
    const dst = path.join(U, a.folder, a.id + '.png'); mkdirSync(path.dirname(dst), { recursive: true });
    await sharp(out, { raw: { width: pw, height: ph, channels: 4 } }).png().toFile(dst);
    console.log(`  ✂ ${a.id} ${pw}×${ph}`);
  }
}
if (fx.length) execFileSync(process.execPath, [path.join(DIR, 'gen_art.mjs'), '--process-only', '--only', fx.map(a => a.id).join(',')], { stdio: 'inherit', cwd: DIR });
