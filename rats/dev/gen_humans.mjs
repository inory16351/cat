// 연구소 사람들(연구원·경비·청소부) + 보스의 파츠 시트 생성 (Codex CLI 내장 image_gen) → 자르기 → 게임/유니티 폴더
// 사용법 (rats/dev 에서):
//   node gen_humans.mjs                  없는 시트만 생성(동시 3개) → 전부 자르기
//   node gen_humans.mjs --only guard     id 골라서 (--force 로 다시 생성)
//   node gen_humans.mjs --slice-only     생성 없이 자르기만
//   node gen_humans.mjs --print          첫 시트 프롬프트 출력
// 토큰 절약: 시트 한 장에 3명씩 그려서 자름 (6명 → 2장)
// 출력
//   UnityResources/Rats/Humans/Sheets/sheet_<id+id+id>.png  Codex 원본 시트 (5열×3행, 마젠타/투명 배경)
//   UnityResources/Rats/Humans/Parts/<id>/<part>.png  원본 해상도 투명 파츠 (유니티용)
//   UnityResources/Rats/Humans/Parts/pivots.json      관절(피벗) 정보 (좌상단 0~1, pivotUnity 는 좌하단)
//   assets/rats/humans/<id>/<part>.png                게임용 축소본
//   rats/js/human_meta.js                             게임용 크기·관절 (HUMAN_PARTS)
import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { codexImage } from './gen_parts.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..', '..');
const U = path.join(ROOT, 'UnityResources', 'Rats', 'Humans');
const SHEETS = path.join(U, 'Sheets'), U_PARTS = path.join(U, 'Parts');
const G_PARTS = path.join(ROOT, 'assets', 'rats', 'humans');
const GAME_SCALE = 0.35;

// 사람 종류: 일반 3종 + 보스 3종 (id, 영문 묘사)
export const HUMANS = [
  ['researcher', 'a nervous lab researcher in a long white lab coat over a pale blue shirt, round glasses, messy brown hair, grey trousers, white sneakers'],
  ['guard', 'a chubby lab security guard in a navy blue uniform with a cap and a small badge, dark trousers, black boots'],
  ['janitor', 'a lanky lab janitor in sage green overalls with a cream cap, rubber gloves, rubber boots'],
  ['boss_chief', 'BOSS: a huge burly security chief, very broad shoulders, navy tactical vest, black cap, sunglasses, big moustache, heavy black boots'],
  ['boss_mad', 'BOSS: a mad chief scientist with wild spiky white hair, big goggles on the forehead, a long lab coat stained with green goo, rubber gloves, lab boots'],
  ['boss_director', 'BOSS: the stern lab director, bald with grey side hair, thick black glasses, a dark grey business suit with a red tie, shiny black shoes'],
  ['cook', 'a big clumsy restaurant cook in a white double-breasted chef jacket and a VERY tall white chef toque, messy brown hair poking out, a big round nose, black-and-white checkered trousers, white clogs'],
];
const STYLE = 'Flat minimalist illustration in the style of "Untitled Goose Game": simple clean geometric shapes, NO outlines, soft muted pastel palette (warm cream, sage green, dusty terracotta, warm greys, soft blue), flat colors with at most one slightly darker flat shade, clean vector look, charming and quietly funny. Humans are simple and chunky like the villagers in Untitled Goose Game (rounded shapes, tiny dot eye, simple nose).';

// 토큰 절약: 시트 한 장에 3명 (행 = 사람, 열 = 머리 · 겁먹은 머리 · 몸통 · 팔 · 다리)
export const PER = 3;
export function humanPrompt(group) {
  return [
    STYLE,
    `Asset: a cut-out PUPPET PARTS SHEET for ${group.length} different 2D game HUMAN characters (paper-doll rigs, animated in code).`,
    'Canvas: landscape 1536x1024. Background: perfectly flat solid pure MAGENTA #FF00FF chroma-key color everywhere between parts (no gradient, no texture); never use magenta inside the characters.',
    `Layout: an invisible grid of 5 columns x ${group.length} rows of equal cells. Each ROW is ONE character; each part is drawn SEPARATELY and ALONE in its own cell, centered, with empty margin. Parts never touch each other or the cell borders. All parts of all characters use the SAME SCALE. Strict side view, every character faces LEFT.`,
    'Columns in every row, left to right:',
    '1. the HEAD only (with hair/hat/glasses), side profile facing left, calm expression, a short neck with a clean straight horizontal cut at the bottom.',
    '2. the SAME HEAD comically TERRIFIED: eye bulging, mouth wide open screaming, hair standing up, sweat drops touching the head. Same size and neck cut.',
    '3. the TORSO only, upright, shoulders to hips, with the clothing. NO head, NO arms, NO legs. Flat cut at the top (neck) and bottom (hips).',
    '4. ONE ARM only, hanging straight DOWN, rounded shoulder at the top to a simple mitten hand at the bottom, with the sleeve.',
    '5. ONE LEG only, straight DOWN, flat cut at the hip on top to the shoe at the bottom; the shoe points LEFT.',
    'Rows, top to bottom:',
    ...group.map(([, desc], i) => `Row ${i + 1}: ${desc}.`),
    'No text, no labels, no numbers, no ground, no shadows, no outlines, no border, no watermark.',
  ].join('\n');
}
const sheetName = g => 'sheet_' + g.map(h => h[0]).join('+');
const groups = () => { const out = []; for (let i = 0; i < HUMANS.length; i += PER) out.push(HUMANS.slice(i, i + PER)); return out; };

// ── 자르기 ──
const COLS = 5, PARTS = ['head', 'scared', 'torso', 'arm', 'leg'];
function keyOut(data, n) {
  for (let i = 0; i < n * 4; i += 4) {
    if (data[i + 3] < 255) continue;
    const m = Math.min(data[i], data[i + 2]) - data[i + 1];
    const a = m <= 70 ? 1 : m >= 150 ? 0 : 1 - (m - 70) / 80;
    if (a > 0 && a < 1) { data[i] = c8((data[i] - (1 - a) * 255) / a); data[i + 1] = c8(data[i + 1] / a); data[i + 2] = c8((data[i + 2] - (1 - a) * 255) / a); }
    data[i + 3] = Math.round(a * 255);
  }
}
const c8 = v => Math.max(0, Math.min(255, Math.round(v)));
async function sliceSheet(file, group) {
  const ROWS = group.length, res = {};
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, cw = w / COLS, ch = h / ROWS;
  keyOut(data, w * h);
  // 연결 성분 → 중심이 들어간 칸의 파츠 (작은 부스러기 제외)
  const owner = new Int16Array(w * h).fill(-1), lab = new Uint8Array(w * h), stack = [];
  for (let s0 = 0; s0 < w * h; s0++) {
    if (lab[s0] || data[s0 * 4 + 3] <= 30) continue;
    const comp = []; stack.push(s0); lab[s0] = 1;
    while (stack.length) {
      const p = stack.pop(); comp.push(p); const x = p % w, y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const q = ny * w + nx; if (!lab[q] && data[q * 4 + 3] > 30) { lab[q] = 1; stack.push(q); } }
    }
    if (comp.length < 60) { for (const p of comp) data[p * 4 + 3] = 0; continue; }
    let sx = 0, sy = 0; for (const p of comp) { sx += p % w; sy += (p / w) | 0; }
    const cell = Math.min(ROWS - 1, Math.floor(sy / comp.length / ch)) * COLS + Math.min(COLS - 1, Math.floor(sx / comp.length / cw));
    for (const p of comp) owner[p] = cell;
  }
  for (const [row, [id]] of group.entries()) {
  const meta = res[id] = { size: {}, pivot: {}, anchor: {} };
  for (const [col, part] of PARTS.entries()) {
    const ci = row * COLS + col;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let p = 0; p < w * h; p++) if (owner[p] === ci) { const x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { console.log(`  ⚠ ${id}/${part}: 비어 있음`); continue; }
    const pw = x1 - x0 + 1, ph = y1 - y0 + 1, out = Buffer.alloc(pw * ph * 4);
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) { const p = (y0 + y) * w + x0 + x; if (owner[p] === ci) data.copy(out, (y * pw + x) * 4, p * 4, p * 4 + 4); }
    // 관절: 윗면(팔·다리·몸통) / 아랫면(머리) 에서 불투명한 가로 구간의 가운데
    const rowMid = yy => { let a = -1, b = -1; for (let x = 0; x < pw; x++) if (out[(yy * pw + x) * 4 + 3] > 128) { if (a < 0) a = x; b = x; } return a < 0 ? pw / 2 : (a + b) / 2; };
    const top = Math.min(ph - 1, Math.round(ph * 0.03)), bot = Math.max(0, Math.round(ph * 0.97));
    if (part === 'head' || part === 'scared') meta.pivot[part] = [rowMid(bot) / pw, 0.97];
    else if (part === 'arm' || part === 'leg') meta.pivot[part] = [rowMid(top) / pw, 0.04];
    else { meta.anchor.neck = [rowMid(top) / pw, 0.03]; meta.anchor.shoulder = [rowMid(Math.round(ph * 0.12)) / pw, 0.12]; meta.anchor.hip = [rowMid(bot) / pw, 0.95]; }
    meta.size[part] = [pw, ph];
    const ud = path.join(U_PARTS, id), gd = path.join(G_PARTS, id);
    mkdirSync(ud, { recursive: true }); mkdirSync(gd, { recursive: true });
    const img = sharp(out, { raw: { width: pw, height: ph, channels: 4 } });
    await img.clone().png().toFile(path.join(ud, part + '.png'));
    await img.clone().resize(Math.max(1, Math.round(pw * GAME_SCALE)), Math.max(1, Math.round(ph * GAME_SCALE))).png({ compressionLevel: 9 }).toFile(path.join(gd, part + '.png'));
  }
  }
  return res;
}

const round = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
  if (args.includes('--print')) { console.log(humanPrompt(groups()[0])); process.exit(0); }
  const only = opt('--only')?.split(','), force = args.includes('--force'), par = Number(opt('--par') || 3);
  mkdirSync(SHEETS, { recursive: true });
  const G = groups().filter(g => !only || g.some(([id]) => only.includes(id)));
  if (!args.includes('--slice-only')) {
    const todo = G.filter(g => force || !existsSync(path.join(SHEETS, sheetName(g) + '.png')));
    console.log(`생성할 사람 시트 ${todo.length}장 (한 장에 ${PER}명, 동시 ${par}장)`);
    let stop = false;
    await Promise.all(Array.from({ length: par }, async () => {
      while (todo.length && !stop) {
        const g = todo.shift();
        try { await codexImage(humanPrompt(g), path.join(SHEETS, sheetName(g) + '.png'), 'human/' + sheetName(g)); } catch (e) { console.log(e.message); stop = true; }
      }
    }));
  }
  const all = {};
  for (const g of groups()) { const f = path.join(SHEETS, sheetName(g) + '.png'); if (existsSync(f)) { try { Object.assign(all, round(await sliceSheet(f, g))); console.log(`  ✂ ${sheetName(g)}`); } catch (e) { console.log(`  ✗ ${sheetName(g)}: ${e.message}`); } } }
  const flipY = ([x, y]) => [x, Math.round((1 - y) * 1000) / 1000];
  const unity = Object.fromEntries(Object.entries(all).map(([id, m]) => [id, { ...m, pivotUnity: Object.fromEntries(Object.entries(m.pivot).map(([k, v]) => [k, flipY(v)])), anchorUnity: Object.fromEntries(Object.entries(m.anchor).map(([k, v]) => [k, flipY(v)])) }]));
  writeFileSync(path.join(U_PARTS, 'pivots.json'), JSON.stringify(unity, null, 2));
  writeFileSync(path.join(ROOT, 'rats', 'js', 'human_meta.js'), `// 자동 생성: rats/dev/gen_humans.mjs — 사람 파츠 크기(원본 px)·관절(좌상단 0~1)\nconst HUMAN_PARTS = ${JSON.stringify(all)};\n`);
  console.log(`사람 파츠: ${Object.keys(all).length}명`);
}
