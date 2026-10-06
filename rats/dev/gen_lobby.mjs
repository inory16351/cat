// 로비(쥐들의 비밀 아지트) 배경판: 쥐 없음. 게임 리그 쥐들이 이 위에서 생활 (rats/js/lobbyscene.js)
// 사용법 (rats/dev 에서): node gen_lobby.mjs [--process-only]
// 원본 UnityResources/Rats/UI/lobby_bg.png → 게임용 assets/rats/lobby_bg.png (가로 1600px)
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { codexImage } from './gen_parts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'UnityResources', 'Rats', 'UI', 'lobby_bg.png'), OUT = path.join(ROOT, 'assets', 'rats', 'lobby_bg.png');
const prompt = [
  'Flat minimalist illustration in the style of "Untitled Goose Game": simple clean geometric shapes, NO outlines, soft muted pastel palette (warm cream, sage green, dusty terracotta, warm greys, soft blue), flat colors with at most one slightly darker flat shade, clean vector look, charming, cozy and quietly funny.',
  'Asset: the LOBBY BACKGROUND of a management game: a cozy SECRET HIDEOUT of escaped lab rats built inside the wall cavity of a research lab, seen as a strict SIDE-VIEW CROSS-SECTION (like a dollhouse cut open), everything made of scavenged human objects at rat scale.',
  'Canvas: landscape 1536x1024, full opaque scene. Keep all important things inside the middle horizontal band (top 8% and bottom 8% may be cropped).',
  'Composition, left to right, all standing on ONE flat wooden floorboard line at about 80% of the image height (the floor is a long clear empty strip so small characters can walk on it):',
  '- far left: a cozy sleeping corner: a matchbox bed with a tissue blanket on the floor, a cotton ball pillow; above it on the wall a small round mouse hole showing the bright white lab outside.',
  '- center-left: a war-room: a tuna can used as a round table, and on the wall behind it a small chalkboard with chalk doodles of stairs, arrows and a cheese (no letters), plus pinned polaroid photos and a hand-drawn map with red string.',
  '- center: OPEN EMPTY FLOOR SPACE (nothing on the floor here, it is where characters gather), with warm string fairy lights hanging across the top.',
  '- center-right: a pile of stolen research paper folders and a desk lamp made from a bent paperclip and a bottle cap, and an EMPTY area on the floor about 20% of the image width for a hamster wheel that is added later.',
  '- far right: a cheese storage pantry: shelves made of rulers and erasers stacked with cheese wedges and cheese wheels, a crate made of a sugar cube box.',
  'Background wall: warm plaster wall cavity with copper pipes and wooden beams, soft cozy warm lighting.',
  'Absolutely NO rats, mice, hamsters or any characters. ORIGINAL design. No text, no letters, no logo, no watermark, no border.',
].join('\n');
mkdirSync(path.dirname(SRC), { recursive: true });
if (!process.argv.includes('--process-only') && !(await codexImage(prompt, SRC, 'lobby_bg'))) process.exit(1);
await sharp(SRC).resize({ width: 1600 }).png({ compressionLevel: 9, palette: true, quality: 92 }).toFile(OUT);
console.log('  ↳ assets/rats/lobby_bg.png');
