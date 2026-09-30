// 게임에서 쓰는 이미지 중 UnityResources/Rats 에 원본이 없는 것을 모아 둠 (rats/dev 에서: node sync_unity.mjs)
//   고양이 방치 게임에서 가져온 고양이 파츠 → UnityResources/Rats/Cats/Parts/<id>/<part>.png + pivots.json
//   나머지(쥐 파츠·소품·이펙트·연구소 물건·방해꾼·사람)는 생성 스크립트가 이미 원본을 UnityResources 에 저장함 → 빠진 게 있으면 목록만 출력
import { readFileSync, readdirSync, existsSync, mkdirSync, copyFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const U = path.join(ROOT, 'UnityResources', 'Rats');
const CAT_SRC = path.join(ROOT, 'assets', 'v2', 'parts'), CAT_DST = path.join(U, 'Cats', 'Parts');
let n = 0;
for (const id of readdirSync(CAT_SRC)) {
  const d = path.join(CAT_SRC, id); if (!statSync(d).isDirectory()) continue;
  mkdirSync(path.join(CAT_DST, id), { recursive: true });
  for (const f of readdirSync(d)) if (f.endsWith('.png')) { copyFileSync(path.join(d, f), path.join(CAT_DST, id, f)); n++; }
}
const PARTS_META = new Function(readFileSync(path.join(CAT_SRC, 'parts_meta.js'), 'utf8') + '\nreturn PARTS_META;')();
const flipY = ([x, y]) => [x, Math.round((1 - y) * 1000) / 1000];
const unity = Object.fromEntries(Object.entries(PARTS_META).map(([id, m]) => [id, { ...m,
  pivotUnity: Object.fromEntries(Object.entries(m.pivot).map(([k, v]) => [k, flipY(v)])), anchorUnity: Object.fromEntries(Object.entries(m.anchor || {}).map(([k, v]) => [k, flipY(v)])) }]));
writeFileSync(path.join(CAT_DST, 'pivots.json'), JSON.stringify(unity, null, 2));
console.log(`고양이 파츠 ${n}장 → ${path.relative(ROOT, CAT_DST)}`);

// 게임용 이미지(assets/rats/**)마다 UnityResources 에 같은 이름의 원본이 있는지 확인
const names = new Set();
const walk = d => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith('.png')) names.add(path.relative(ROOT, p).replace(/\\/g, '/')); } };
walk(U);
const have = new Set([...names].map(p => p.split('/').slice(-2).join('/'))), haveBase = new Set([...names].map(p => path.basename(p)));
const missing = [];
const gw = d => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) gw(p); else if (f.endsWith('.png')) { const r = path.relative(ROOT, p).replace(/\\/g, '/'), two = r.split('/').slice(-2).join('/'); if (!have.has(two) && !haveBase.has(f)) missing.push(r); } } };
gw(path.join(ROOT, 'assets', 'rats'));
console.log(missing.length ? `원본이 없는 게임 이미지 ${missing.length}장:\n  ${missing.join('\n  ')}` : '게임 이미지 원본 전부 UnityResources 에 있음');
