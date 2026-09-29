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

if (!args.includes('--process-only')) {
  const todo = list.filter(a => force || !existsSync(src(a)));
  console.log(`생성할 이미지 ${todo.length}개 (동시 ${par}개)`);
  let stop = false;
  await Promise.all(Array.from({ length: par }, async () => {
    while (todo.length && !stop) {
      const a = todo.shift();
      mkdirSync(path.dirname(src(a)), { recursive: true });
      try { await codexImage(a.prompt, src(a), `${a.kind}/${a.id}`); } catch (e) { console.log(e.message); stop = true; }
    }
  }));
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
