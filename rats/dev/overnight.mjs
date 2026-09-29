// 밤새 이미지 생성: Codex 사용량 한도가 풀리는 시각에 맞춰 시작하고, 한도에 또 걸리면 풀릴 때까지 기다렸다가 이어서.
// 순서: 쥐 파츠 시트(gen_parts) → 소품·이펙트(gen_art) → 파츠 자르기(slice_parts) → 게임용 후처리 → 단일 HTML 빌드
// 사용법 (rats/dev 에서): node overnight.mjs [시작시각 HH:MM, 기본 지금]   로그: rats/dev/overnight.log
// 백그라운드 실행 중 PC 가 절전으로 들어가지 않게 이 프로세스가 도는 동안만 절전 방지를 요청한다(끝나면 자동 해제).
import { spawn, execFile } from 'node:child_process';
import { appendFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { artList } from './art_list.mjs';
import { loadData } from './gen_parts.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..', '..');
const LOG = path.join(DIR, 'overnight.log');
const log = m => { const line = `[${new Date().toLocaleString('ko-KR')}] ${m}`; console.log(line); appendFileSync(LOG, line + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DEADLINE = Date.now() + 36 * 3600e3;          // 최대 36시간까지만 기다림

function run(script, args = []) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, [script, ...args], { cwd: DIR });
    let out = '';
    p.stdout.on('data', d => { out += d; process.stdout.write(d); });
    p.stderr.on('data', d => { out += d; process.stdout.write(d); });
    p.on('close', code => resolve({ code, out }));
  });
}
// "try again at Sep 30th, 2026 1:38 AM" → Date
function resetTime(out) {
  const m = /try again at\s+([A-Za-z]+)\s+(\d+)\w*,?\s+(\d{4})\s+(\d+):(\d+)\s*(AM|PM)/i.exec(out);
  if (!m) return null;
  const mon = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[1].slice(0, 3).toLowerCase());
  let h = Number(m[4]) % 12; if (/pm/i.test(m[6])) h += 12;
  return new Date(Number(m[3]), mon, Number(m[2]), h, Number(m[5]));
}
function remaining() {
  const { RSPECIES } = loadData();
  const sheets = RSPECIES.filter(s => !existsSync(path.join(ROOT, 'UnityResources', 'Rats', 'Sheets', s.id + '.png'))).length;
  const art = artList().filter(a => !existsSync(path.join(ROOT, 'UnityResources', 'Rats', a.folder, a.id + '.png'))).length;
  return { sheets, art };
}
// 절전 방지 (이 스크립트가 끝나면 PowerShell 도 같이 종료)
function keepAwake() {
  const ps = `$s='[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint e);'; $t=Add-Type -MemberDefinition $s -Name P -Namespace W -PassThru; while (Get-Process -Id ${process.pid} -ErrorAction SilentlyContinue) { $t::SetThreadExecutionState(0x80000001) | Out-Null; Start-Sleep -Seconds 30 }; $t::SetThreadExecutionState(0x80000000) | Out-Null`;
  execFile('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', ps], () => {});
}

const start = process.argv[2];
keepAwake();
log(`야간 이미지 작업 시작 (남은 것: ${JSON.stringify(remaining())})`);
if (start) {
  const [h, mi] = start.split(':').map(Number), t = new Date(); t.setHours(h, mi, 0, 0); if (t < Date.now()) t.setDate(t.getDate() + 1);
  log(`${t.toLocaleString('ko-KR')} 까지 대기`); await sleep(t - Date.now());
}
while (Date.now() < DEADLINE) {
  let limited = null;
  for (const [script, key] of [['gen_parts.mjs', 'sheets'], ['gen_art.mjs', 'art']]) {
    if (!remaining()[key]) continue;
    log(`${script} 실행`);
    const { out } = await run(script, script === 'gen_art.mjs' ? [] : ['--par', '3']);
    if (/사용량 한도/.test(out)) { limited = resetTime(out) || new Date(Date.now() + 3600e3); break; }
  }
  const left = remaining();
  log(`남은 것: 시트 ${left.sheets}장, 소품·이펙트 ${left.art}장`);
  if (!left.sheets && !left.art) break;
  const until = limited ? limited.getTime() + 5 * 60e3 : Date.now() + 10 * 60e3;   // 한도면 풀리는 시각 +5분, 그냥 실패면 10분 뒤 재시도
  log(`${limited ? '사용량 한도' : '일부 실패'} → ${new Date(until).toLocaleString('ko-KR')} 에 다시 시도`);
  await sleep(Math.max(60e3, until - Date.now()));
}
log('파츠 자르기 + 게임용 후처리 + 빌드');
await run('slice_parts.mjs');
await run('gen_art.mjs', ['--process-only']);
await run('build.mjs');
const done = remaining();
log(`끝! 시트 ${readdirSync(path.join(ROOT, 'UnityResources', 'Rats', 'Sheets')).length}장 · 남은 것 ${JSON.stringify(done)}`);
// 결과를 현재 브랜치에 커밋 (push 는 안 함)
const git = args => new Promise(res => execFile('git', args, { cwd: ROOT }, (e, out, err) => res({ ok: !e, out: out + err })));
await git(['add', '-A']);
const msg = `쥐들의 반란: 야간 Codex 이미지 생성 (쥐 파츠 시트·특수 액션 소품·필살기 소품)\n\n남은 것: 시트 ${done.sheets}장, 소품·이펙트 ${done.art}장\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
const c = await git(['commit', '-m', msg]);
log(c.ok ? '커밋 완료' : `커밋 안 됨: ${c.out.trim().split('\n').pop()}`);
// 현재 브랜치를 원격에 push (로그인 창이 뜨지 않게, 실패하면 로그만 남김)
process.env.GIT_TERMINAL_PROMPT = '0';
const br = (await git(['rev-parse', '--abbrev-ref', 'HEAD'])).out.trim();
const p = await git(['push', 'origin', br]);
log(p.ok ? `push 완료 (origin/${br})` : `push 실패 — 아침에 직접 push 해 주세요: ${p.out.trim().split('\n').pop()}`);
process.exit(0);
