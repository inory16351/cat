// 쥐 파츠 시트 생성 (Codex CLI + 내장 image_gen, ChatGPT 구독 → API 키 불필요)
// 결과 원본은 유니티에서도 쓸 수 있게 UnityResources/Rats/Sheets/<id>.png 에 모은다.
// 사용법 (rats/dev 에서):
//   node gen_parts.mjs                     없는 종만 전부 생성 (동시 3개)
//   node gen_parts.mjs --only brownrat,ninja [--force]
//   node gen_parts.mjs --par 4             동시 생성 개수
//   node gen_parts.mjs --print brownrat    프롬프트만 출력
// 생성 후: node slice_parts.mjs  (파츠 자르기 + 관절 분석 → 게임/유니티 폴더)
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..', '..');
export const SHEETS = path.join(ROOT, 'UnityResources', 'Rats', 'Sheets');

// data.js 는 브라우저 전역 스크립트라 함수로 감싸서 값만 꺼낸다
export function loadData() {
  globalThis.ITEMS = {}; globalThis.fmt = x => String(x);
  const src = readFileSync(path.join(ROOT, 'rats', 'js', 'data.js'), 'utf8');
  return new Function(src + '\nreturn { RSPECIES, TIERS };')();
}

const STYLE = 'Flat minimalist illustration in the style of "Untitled Goose Game": simple clean geometric shapes, NO outlines, soft muted pastel palette (warm cream, sage green, dusty terracotta, warm greys, soft blue), flat colors with at most one slightly darker flat shade, clean vector look, charming and quietly funny.';

const BODY = {
  rat: { tail: 'a LONG thin tapering pink rat tail, gently S-curved, drawn horizontally', legs: 'short and slender', head: 'long pointed snout, big round ear, small black eye, pink nose, a few whiskers' },
  mouse: { tail: 'a long thin tapering pink mouse tail, gently curved, drawn horizontally', legs: 'short and slender', head: 'short pointed snout, very big round ear, round black eye, pink nose, whiskers' },
  hamster: { tail: 'a TINY short stubby fluffy tail nub (very small)', legs: 'very short and stubby', head: 'round chubby face with puffy cheek pouches, small round ear, black eye, pink nose' },
  gerbil: { tail: 'a long furry tail with a small tuft at the tip, drawn horizontally', legs: 'short front legs, long hind feet', head: 'short snout, round ear, big black eye, pink nose, whiskers' },
};

export function promptFor(sp) {
  const b = BODY[sp.shape] || BODY.rat;
  return [
    STYLE,
    'Asset: a cut-out PUPPET PARTS SHEET for a 2D game character rig (paper-doll style), used to animate the character in code.',
    'Canvas: landscape 1536x1024. Background: perfectly flat solid pure MAGENTA #FF00FF chroma-key color everywhere between parts (no gradient, no texture, no vignette); never use magenta inside the character.',
    'Layout: an invisible grid of 3 columns x 2 rows of equal cells (512x512 each). Each body part is drawn SEPARATELY and ALONE in its own cell, centered, with generous empty margin. Parts never touch each other or the cell borders. All parts are drawn at the SAME SCALE so they assemble into one animal. Strict side view, the animal faces LEFT.',
    `Top-left cell: the HEAD only, side profile facing left (${b.head}). It ends in a clean straight cut at the neck on its lower-right side. The head is modest in size: about 45% of the torso length, whiskers short.`,
    'Top-middle cell: the TORSO only: the body from shoulders to rump as one smooth horizontal rounded shape (realistic rodent proportions, NOT chibi). NO head, NO legs, NO tail on it.',
    `Top-right cell: the TAIL only: ${b.tail}. Its root (the left end) is a clean cut.`,
    `Bottom-left cell: ONE FRONT LEG only, standing upright (${b.legs}), a small pink paw with tiny toes at the bottom, the top end is a clean flat cut.`,
    'Bottom-middle cell: ONE HIND LEG only, standing upright: a rounded thigh at the top narrowing to a longer pink foot at the bottom that points LEFT; the top end is a clean flat cut.',
    'Bottom-right cell: completely EMPTY (only magenta background).',
    'Costume placement rules: hats, helmets, hoods, glasses, goggles, masks, headbands, crowns, halos and antennae belong on the HEAD part; clothing, coats, capes, robes, armor, wings, backpacks and bags belong on the TORSO part; a small handheld prop may be held in the FRONT LEG paw. Costume pieces stay inside their part and do not float separately.',
    `Character: ${sp.en}.`,
    'No text, no labels, no numbers, no ground, no shadows, no outlines, no border, no watermark.',
  ].join('\n');
}

export function codex(prompt) {
  return new Promise((resolve) => {
    const p = spawn(`codex exec --skip-git-repo-check -s workspace-write -C "${ROOT}" -`, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    p.on('close', code => resolve({ code, out }));
    p.stdin.end(prompt);
  });
}

async function generate(sp) { return codexImage(promptFor(sp), path.join(SHEETS, `${sp.id}.png`), sp.id); }
// Codex 내장 image_gen 으로 한 장 만들어 dst 에 저장. 사용량 한도면 e.stop 인 에러
export async function codexImage(spec, dst, label) {
  const prompt = [
    'Use the imagegen skill with the built-in image_gen tool (do NOT use any CLI/API fallback script).',
    'Generate exactly ONE image with this spec:',
    spec,
    `Then copy the final generated PNG to this exact path (create folders if needed): ${dst}`,
    'Do not create or modify any other files. Reply with the saved path only.',
    'If the image_gen tool is unavailable, reply exactly IMAGE_GEN_UNAVAILABLE and stop.',
  ].join('\n\n');
  const t0 = Date.now();
  const { out } = await codex(prompt);
  if (existsSync(dst)) { console.log(`  ✓ ${label} (${Math.round((Date.now() - t0) / 1000)}s)`); return true; }
  if (/usage.limit|rate.limit/i.test(out)) { const e = new Error('사용량 한도 도달: ' + (out.match(/try again[^\n]*/i) || [''])[0]); e.stop = true; throw e; }
  console.log(`  ✗ ${label} 실패\n${out.slice(-800)}`);
  return false;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
  const { RSPECIES } = loadData();
  if (opt('--print')) { console.log(promptFor(RSPECIES.find(s => s.id === opt('--print')))); process.exit(0); }
  const only = opt('--only')?.split(',');
  const force = args.includes('--force');
  const par = Number(opt('--par') || 3);
  mkdirSync(SHEETS, { recursive: true });
  const todo = RSPECIES.filter(s => (!only || only.includes(s.id)) && (force || !existsSync(path.join(SHEETS, `${s.id}.png`))));
  console.log(`생성할 시트 ${todo.length}개 (동시 ${par}개)`);
  let stop = false, ok = 0;
  const worker = async () => {
    while (todo.length && !stop) {
      const sp = todo.shift();
      try { if (await generate(sp)) ok++; } catch (e) { console.log(e.message); stop = true; }
    }
  };
  await Promise.all(Array.from({ length: par }, worker));
  console.log(`완료: ${ok}개 생성`);
}
