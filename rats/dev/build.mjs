// 쥐들의 반란(rats/)을 HTML 파일 하나로 묶는다 (build_rats.py 의 Node 버전 — 파이썬 없는 PC용)
// 사용법 (rats/dev 에서): node build.mjs  →  dist/rat-uprising.html
// - CSS·JS 인라인, 도시 배경(assets/v2/bg)과 assets/rats/ 아래 이미지(파츠 포함)는 WebP data URI 로 window.__A 에 담는다.
// - <img>.src 설정을 가로채서 경로 대신 내장 데이터를 쓰고, 없는 이미지(assets/…)는 요청하지 않고 조용히 실패시킨다.
import sharp from 'sharp';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RATS = path.join(ROOT, 'rats');
const OUT = path.join(ROOT, 'dist', 'rat-uprising.html');

async function webpUri(file, maxSide) {
  const buf = await sharp(file).resize(maxSide, maxSide, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toBuffer();
  return 'data:image/webp;base64,' + buf.toString('base64');
}
function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) { const p = path.join(dir, f); if (statSync(p).isDirectory()) out.push(...walk(p)); else if (f.endsWith('.png')) out.push(p); }
  return out;
}
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');

const assets = {};
// 이미지 ~700장 WebP 변환: 한 장씩 하면 몇 분 걸려서 8개씩 동시에
const jobs = [];
const data = readFileSync(path.join(RATS, 'js', 'data.js'), 'utf8');
for (const name of [...new Set([...data.matchAll(/img: '([a-z_]+)'/g)].map(m => m[1]))].sort()) {
  const p = path.join(ROOT, 'assets', 'v2', 'bg', name + '.png');
  if (existsSync(p)) jobs.push([p, 1536]);
}
// 고양이 방치 게임의 고양이 파츠 (연구소 고양이·고양이 보스)
const catParts = path.join(ROOT, 'assets', 'v2', 'parts');
if (existsSync(catParts)) for (const p of walk(catParts).sort()) jobs.push([p, 360]);
const ratsDir = path.join(ROOT, 'assets', 'rats');
if (existsSync(ratsDir)) for (const p of walk(ratsDir).sort()) {
  const stem = path.basename(p, '.png');
  jobs.push([p, /^lobby_bg/.test(stem) ? 1600 : /^(bg_|title)/.test(stem) ? 1280 : 360]);
}
const uris = new Array(jobs.length);
let next = 0;
await Promise.all(Array.from({ length: 8 }, async () => { while (next < jobs.length) { const i = next++; uris[i] = await webpUri(...jobs[i]); } }));
jobs.forEach(([p], i) => { assets[rel(p)] = uris[i]; });

const LOADER = `<script>
// 단일 HTML 빌드: 이미지 경로를 내장 데이터로 바꿔치기 (없는 이미지는 요청하지 않음)
window.__A = ${JSON.stringify(assets)};
(() => {
  const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    get() { return d.get.call(this); },
    set(v) {
      const s = String(v);
      if (s.startsWith('data:')) return d.set.call(this, s);
      const k = s.replace(/^(\\.\\.\\/)+/, '').split('?')[0];
      if (window.__A[k]) return d.set.call(this, window.__A[k]);
      if (k.startsWith('assets/')) { setTimeout(() => this.onerror && this.onerror(), 0); return; }
      d.set.call(this, s);
    },
  });
})();
</script>`;

let html = readFileSync(path.join(RATS, 'index.html'), 'utf8');
// CSS 의 url(../assets/…png) 도 내장 데이터로 (로비 판자·압정·테이프 등)
const css = readFileSync(path.join(RATS, 'style.css'), 'utf8').replace(/url\((?:\.\.\/)+(assets\/[^)'"]+\.png)\)/g, (m, k) => (assets[k] ? `url(${assets[k]})` : m));
html = html.replace(/<link rel="stylesheet" href="style\.css[^"]*">/, () => `<style>\n${css}\n</style>`);
const title = assets['assets/rats/title.png'];
html = html.replace(/<img id="titleArt" src="[^"]*"/, () => (title ? `<img id="titleArt" src="${title}"` : '<img id="titleArt" style="display:none"'));
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => `<script>\n${readFileSync(path.resolve(RATS, src.split('?')[0]), 'utf8')}\n</script>`);
html = html.replace('<body>', () => '<body>\n' + LOADER);
if (/<script src=|href="style/.test(html)) throw new Error('인라인되지 않은 리소스가 있음');
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, html, 'utf8');
console.log(`${OUT}  (${(statSync(OUT).size / 1024 / 1024).toFixed(2)} MB, 이미지 ${Object.keys(assets).length}개)`);
