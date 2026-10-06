// 타이틀 그림 (시작 화면 #titleArt): 원본 UnityResources/Rats/UI/title.png → 게임용 assets/rats/title.png (가로 1200px)
// 사용법 (rats/dev 에서): node gen_title.mjs [--process-only]
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { codexImage } from './gen_parts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'UnityResources', 'Rats', 'UI', 'title.png'), OUT = path.join(ROOT, 'assets', 'rats', 'title.png');
const prompt = [
  'Flat minimalist illustration in the style of "Untitled Goose Game": simple clean geometric shapes, NO outlines, soft muted pastel palette (warm cream, sage green, dusty terracotta, warm greys, soft blue), flat colors with at most one slightly darker flat shade, clean vector look, charming and quietly funny.',
  'Asset: the TITLE KEY ART for a game about lab rats escaping an underground research facility.',
  'Canvas: landscape 1536x1024, full opaque scene (no transparency).',
  'Scene: a cheerful horde of many small cute lab rats (white lab rats, brown rats, a hamster, a gerbil, one rat wearing tiny goggles) bursting out of an opened metal cage and running toward a concrete emergency staircase going UP at the right, one rat holding a stolen paper document overhead, a cheese wedge, broken test tubes and flying papers, a red alarm light glowing on the wall, a surprised researcher in a white coat in the background at the left and a chubby orange cat peeking from behind a lab desk. Lab tiles floor, warm soft light, slight three-quarter view from above.',
  'Leave the composition balanced with a calm empty area at the top for a logo. ORIGINAL characters only. No text, no letters, no logo, no watermark, no border.',
].join('\n');
const BG = process.argv.includes('--bg');
const BG_SRC = path.join(ROOT, 'UnityResources', 'Rats', 'UI', 'title_bg.png'), BG_OUT = path.join(ROOT, 'assets', 'rats', 'title_bg.png');
const bgPrompt = [
  'Edit the attached reference image (the title art of the game). Recreate the SAME scene with the same composition, camera angle, art style, palette and lighting, but REMOVE ALL RATS, MICE AND HAMSTERS completely (no rodents anywhere, not even in the cage).',
  'Keep: the open metal cage on the left-center with scattered bedding, the surprised researcher in a white coat, the orange cat peeking behind the lab desk, the test tubes, the red alarm light on the wall, the concrete staircase with yellow handrails on the right, a few broken glass pieces. Keep only 3 or 4 flying papers. Leave a clear empty floor path from the cage to the bottom of the staircase (rats will be animated on top of it in code).',
  'Canvas: landscape 1536x1024, full opaque scene. No text, no letters, no logo, no watermark, no border.',
].join('\n');
if (BG) {
  mkdirSync(path.dirname(BG_SRC), { recursive: true });
  if (!process.argv.includes('--process-only') && !(await codexImage(bgPrompt, BG_SRC, 'title_bg', [SRC]))) process.exit(1);
  await sharp(BG_SRC).resize({ width: 1200 }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(BG_OUT);
  console.log('  ↳ assets/rats/title_bg.png'); process.exit(0);
}
mkdirSync(path.dirname(SRC), { recursive: true });
if (!process.argv.includes('--process-only') && !(await codexImage(prompt, SRC, 'title'))) process.exit(1);
await sharp(SRC).resize({ width: 1200 }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(OUT);
console.log('  ↳ assets/rats/title.png');

// ── 배경판 (쥐 없음): 시작 화면에서 게임 리그 쥐들이 이 위를 뛰어감 (rats/js/title.js) ──
//   node gen_title.mjs --bg [--process-only]  → 원본 UnityResources/Rats/UI/title_bg.png → assets/rats/title_bg.png
