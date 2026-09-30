// 토큰 절약: 쥐 파츠 행 + 사람 파츠 행을 한 장(5열 × N행)에 같이 그려서 각각의 파이프라인으로 넘김
//   쥐 행   → UnityResources/Rats/Sheets/group_<id>.png  → gen_parts_group.mjs --split-only (→ slice_parts)
//   사람 행 → UnityResources/Rats/Humans/Sheets/sheet_<id>.png → gen_humans.mjs --slice-only
// 사용법 (rats/dev 에서): node gen_mixed.mjs --rats starchef --humans cook
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { codexImage, loadData, SHEETS } from './gen_parts.mjs';
import { HUMANS } from './gen_humans.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(DIR, '..', '..');
const H_SHEETS = path.join(ROOT, 'UnityResources', 'Rats', 'Humans', 'Sheets'), MIX = path.join(ROOT, 'UnityResources', 'Rats', 'Sheets');
const args = process.argv.slice(2), opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const { RSPECIES } = loadData();
const rats = (opt('--rats') || '').split(',').filter(Boolean).map(id => RSPECIES.find(s => s.id === id));
const humans = (opt('--humans') || '').split(',').filter(Boolean).map(id => HUMANS.find(h => h[0] === id));
const rows = [...rats.map(sp => ({ kind: 'rat', sp })), ...humans.map(h => ({ kind: 'human', id: h[0], desc: h[1] }))];
const STYLE = 'Flat minimalist illustration in the style of "Untitled Goose Game": simple clean geometric shapes, NO outlines, soft muted pastel palette (warm cream, sage green, dusty terracotta, warm greys, soft blue), flat colors with at most one slightly darker flat shade, clean vector look, charming and quietly funny. Humans are simple and chunky like the villagers in Untitled Goose Game.';
const prompt = [
  STYLE,
  `Asset: a cut-out PUPPET PARTS SHEET (paper-doll rigs animated in code) with ${rows.length} rows. Canvas: landscape 1536x1024. Background: perfectly flat solid pure MAGENTA #FF00FF everywhere between parts; never use magenta inside the characters.`,
  `Layout: an invisible grid of 5 columns x ${rows.length} rows of equal cells. Each ROW is ONE character; each part is drawn SEPARATELY and ALONE in its own cell, centered, never touching other parts or cell borders. All parts of one character use the SAME SCALE. Strict side view, facing LEFT.`,
  ...rows.map((r, i) => r.kind === 'rat'
    ? `Row ${i + 1} (a small rodent): ${r.sp.en}. Columns: 1 HEAD only (hat belongs here, modest size, clean neck cut lower-right) · 2 TORSO only (clothes here, no head/legs/tail) · 3 TAIL only (root = clean cut on the left) · 4 ONE FRONT LEG standing upright, small paw at bottom · 5 ONE HIND LEG standing upright, foot pointing LEFT.`
    : `Row ${i + 1} (a human): ${r.desc}. Columns: 1 HEAD only (hat/hair here), calm, short neck with a flat cut · 2 the SAME HEAD comically TERRIFIED (eye bulging, mouth wide open, hair up, sweat drops) · 3 TORSO only, shoulders to hips, no head/arms/legs · 4 ONE ARM hanging straight down, mitten hand at the bottom · 5 ONE LEG straight down, shoe pointing LEFT.`),
  'ORIGINAL parody characters only: do not copy any existing movie, cartoon or brand character or logo. No text, no labels, no shadows, no outlines, no border, no watermark.',
].join('\n');
if (args.includes('--print')) { console.log(prompt); process.exit(0); }
mkdirSync(MIX, { recursive: true }); mkdirSync(H_SHEETS, { recursive: true });
const name = 'mixed_' + rows.map(r => r.kind === 'rat' ? r.sp.id : r.id).join('+'), file = path.join(MIX, name + '.png');
if (!args.includes('--split-only') && !(await codexImage(prompt, file, name))) process.exit(1);
// 행별로 잘라서 각 파이프라인 입력 시트로 저장
const { width: w, height: h } = await sharp(file).metadata(), rh = Math.floor(h / rows.length);
for (const [i, r] of rows.entries()) {
  const out = r.kind === 'rat' ? path.join(MIX, `group_${r.sp.id}.png`) : path.join(H_SHEETS, `sheet_${r.id}.png`);
  await sharp(file).extract({ left: 0, top: i * rh, width: w, height: rh }).png().toFile(out);
  console.log(`  ↳ ${path.relative(ROOT, out)}`);
}
if (rats.length) execFileSync(process.execPath, [path.join(DIR, 'gen_parts_group.mjs'), '--only', rats.map(s => s.id).join(','), '--split-only'], { stdio: 'inherit' });
if (humans.length) execFileSync(process.execPath, [path.join(DIR, 'gen_humans.mjs'), '--slice-only'], { stdio: 'inherit' });
