// 슈퍼 요리사 쥐의 탈것: 네 발 짐승처럼 뛰는 요리사 전용 파츠 시트 (참고: 겟앰프드 '할머니 태운 기영이' 느낌)
// 한 장(4열×2행)에 8개: 수평 몸통 · 엉덩이 · 허벅지 · 정강이+신발 · 윗팔 · 아래팔+손 · 끙끙 머리 · 우는 머리
// 사용법 (rats/dev 에서):
//   node gen_mount_parts.mjs               시트가 없으면 생성 → 자르기
//   node gen_mount_parts.mjs --force       다시 생성
//   node gen_mount_parts.mjs --slice-only  자르기만
//   node gen_mount_parts.mjs --print       프롬프트 출력
// 출력
//   UnityResources/Rats/Humans/Sheets/sheet_cook_mount.png   Codex 원본
//   UnityResources/Rats/Humans/Parts/cook_mount/<part>.png   원본 해상도 파츠
//   assets/rats/humans/cook_mount/<part>.png                 게임용 축소본
//   rats/js/mount_meta.js                                    크기(원본 px)·관절(좌상단 0~1) MOUNT_PARTS
import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { codexImage } from './gen_parts.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..', '..');
const U = path.join(ROOT, 'UnityResources', 'Rats', 'Humans');
const SHEET = path.join(U, 'Sheets', 'sheet_cook_mount.png');
const U_PARTS = path.join(U, 'Parts', 'cook_mount'), G_PARTS = path.join(ROOT, 'assets', 'rats', 'humans', 'cook_mount');
const GAME_SCALE = 0.35, COLS = 4, ROWS = 2;
// 칸 순서 (왼→오, 위→아래)
const PARTS = ['body', 'butt', 'thigh', 'shin', 'uparm', 'forearm', 'strain', 'cry'];

const COOK = 'a big clumsy restaurant cook in a white double-breasted chef jacket and a VERY tall white chef toque, messy brown hair poking out, a big round nose, black-and-white checkered trousers, white clogs';
export const PROMPT = [
  'Flat minimalist illustration in the style of "Untitled Goose Game": simple clean geometric shapes, NO outlines, soft muted pastel palette, flat colors with at most one slightly darker flat shade, clean vector look. Humans are simple and chunky like the villagers in Untitled Goose Game (rounded shapes, tiny dot eye, simple nose).',
  `Character: ${COOK}. Match the existing parts of this SAME cook exactly (same colors, same style, same scale): UnityResources/Rats/Humans/Parts/cook/head.png, torso.png, arm.png, leg.png (look at them before drawing).`,
  'Purpose: a comedic paper-doll rig where this grown man runs on ALL FOURS like a dog or a horse while a small rat rides on his back (like a grandma giving a piggyback gallop in a silly old game). The parts are rotated and animated in code.',
  'Asset: a cut-out PUPPET PARTS SHEET. Canvas: landscape 1536x1024. Background: perfectly flat solid pure MAGENTA #FF00FF everywhere between parts (no gradient); never use magenta inside the parts.',
  'Layout: an invisible grid of 4 columns x 2 rows of equal cells. Each part is drawn SEPARATELY and ALONE in its own cell, centered, with empty margin; parts never touch each other or the cell borders. ALL parts use the SAME SCALE (the same body). Strict side view, the character faces LEFT.',
  'Cells, left to right, top row then bottom row:',
  '1. BODY lying HORIZONTAL (as if crawling on all fours): the chef jacket torso seen from the side, long and chunky, the broad flat BACK on top (a rider sits there), belly/chest underneath, a flat cut on the LEFT end at the neck and a flat cut on the RIGHT end at the waist. NO head, NO arms, NO legs, NO hips.',
  '2. BUTT: the hips and a big round comical BUTTOCKS in the checkered trousers, seen from the side, sticking out backward to the RIGHT, with the white jacket hem on top; flat cut on the LEFT side (the waist, where the body attaches). NO legs.',
  '3. THIGH: one short thick upper leg in checkered trousers, hanging straight DOWN, rounded hip end on top, rounded knee at the bottom.',
  '4. SHIN: one lower leg in checkered trousers hanging straight DOWN with the white clog at the bottom pointing LEFT, rounded knee on top.',
  '5. UPPER ARM: one short thick upper arm in the white sleeve hanging straight DOWN, rounded shoulder on top, rounded elbow at the bottom.',
  '6. FOREARM: one forearm with the sleeve cuff hanging straight DOWN ending in a big flat mitten HAND at the bottom (palm down like a paw), rounded elbow on top.',
  '7. STRAINING HEAD (with the tall toque): comically agonized from carrying the rider: eyes squeezed shut into tight lines, teeth gritted in a wide grimace, red cheeks, big sweat drops, a vein on the forehead. Side profile facing LEFT, short neck with a flat cut at the bottom.',
  '8. WAILING HEAD (with the tall toque): crying like a baby, mouth wide open, eyes closed with waterfall tears streaming, snot bubble. Side profile facing LEFT, short neck with a flat cut at the bottom.',
  'No text, no labels, no ground, no shadows, no outlines, no border, no watermark.',
].join('\n');

const c8 = v => Math.max(0, Math.min(255, Math.round(v)));
function keyOut(data, n) {
  for (let i = 0; i < n * 4; i += 4) {
    if (data[i + 3] < 255) continue;
    const m = Math.min(data[i], data[i + 2]) - data[i + 1];
    const a = m <= 70 ? 1 : m >= 150 ? 0 : 1 - (m - 70) / 80;
    if (a > 0 && a < 1) { data[i] = c8((data[i] - (1 - a) * 255) / a); data[i + 1] = c8(data[i + 1] / a); data[i + 2] = c8((data[i + 2] - (1 - a) * 255) / a); }
    data[i + 3] = Math.round(a * 255);
  }
}
// 연결 성분 → 중심이 들어간 칸의 파츠 (작은 부스러기 제외) → 잘라서 저장 + 관절
async function slice() {
  const { data, info } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, cw = w / COLS, ch = h / ROWS;
  keyOut(data, w * h);
  const owner = new Int16Array(w * h).fill(-1), lab = new Uint8Array(w * h), stack = [];
  for (let s0 = 0; s0 < w * h; s0++) {
    if (lab[s0] || data[s0 * 4 + 3] <= 30) continue;
    const comp = []; stack.push(s0); lab[s0] = 1;
    while (stack.length) {
      const p = stack.pop(); comp.push(p); const x = p % w, y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const q = ny * w + nx; if (!lab[q] && data[q * 4 + 3] > 30) { lab[q] = 1; stack.push(q); } }
    }
    if (comp.length < 60) continue;
    let sx = 0, sy = 0; for (const p of comp) { sx += p % w; sy += (p / w) | 0; }
    const cell = Math.min(ROWS - 1, Math.floor(sy / comp.length / ch)) * COLS + Math.min(COLS - 1, Math.floor(sx / comp.length / cw));
    for (const p of comp) owner[p] = cell;
  }
  mkdirSync(U_PARTS, { recursive: true }); mkdirSync(G_PARTS, { recursive: true });
  const meta = { size: {}, pivot: {} };
  for (const [ci, part] of PARTS.entries()) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let p = 0; p < w * h; p++) if (owner[p] === ci) { const x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { console.log(`  ⚠ ${part}: 비어 있음`); continue; }
    const pw = x1 - x0 + 1, ph = y1 - y0 + 1, out = Buffer.alloc(pw * ph * 4);
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) { const p = (y0 + y) * w + x0 + x; if (owner[p] === ci) data.copy(out, (y * pw + x) * 4, p * 4, p * 4 + 4); }
    // 관절: 팔다리 = 윗면 가운데, 머리 = 아랫면 가운데(목), 몸통·엉덩이는 게임 코드에서 비율로 맞춤
    const rowMid = yy => { let a = -1, b = -1; for (let x = 0; x < pw; x++) if (out[(yy * pw + x) * 4 + 3] > 128) { if (a < 0) a = x; b = x; } return a < 0 ? pw / 2 : (a + b) / 2; };
    if (part === 'strain' || part === 'cry') meta.pivot[part] = [rowMid(Math.round(ph * 0.97)) / pw, 0.97];
    else if (!['body', 'butt'].includes(part)) meta.pivot[part] = [rowMid(Math.round(ph * 0.04)) / pw, 0.06];
    meta.size[part] = [pw, ph];
    const img = sharp(out, { raw: { width: pw, height: ph, channels: 4 } });
    await img.clone().png().toFile(path.join(U_PARTS, part + '.png'));
    await img.clone().resize(Math.max(1, Math.round(pw * GAME_SCALE)), Math.max(1, Math.round(ph * GAME_SCALE))).png({ compressionLevel: 9 }).toFile(path.join(G_PARTS, part + '.png'));
    console.log(`  ✂ ${part} ${pw}×${ph}`);
  }
  const r3 = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)));
  writeFileSync(path.join(ROOT, 'rats', 'js', 'mount_meta.js'), `// 자동 생성: rats/dev/gen_mount_parts.mjs — 네 발로 뛰는 요리사 파츠 크기(원본 px)·관절(좌상단 0~1)\nconst MOUNT_PARTS = ${JSON.stringify(r3(meta))};\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--print')) { console.log(PROMPT); process.exit(0); }
  mkdirSync(path.dirname(SHEET), { recursive: true });
  if (!args.includes('--slice-only') && (args.includes('--force') || !existsSync(SHEET))) {
    if (!(await codexImage(PROMPT, SHEET, 'sheet_cook_mount'))) process.exit(1);
  }
  await slice();
}
