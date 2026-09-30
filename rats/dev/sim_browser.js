// 브라우저 콘솔용 밸런스 시뮬레이션 (에이전트 테스트 서버 5179 에서만! 저장을 지움)
// 사용: 이 파일 내용을 콘솔에 붙여넣고 → await __simStart() → __chunk(5) 를 여러 번 (한 번에 5분씩, 1분마다 한 줄 로그)
// 공용 스킬은 가장 싼 것부터 자동 구매, 1분마다 일괄 승급, 보스 재도전 버튼은 2분마다 자동으로 누름.
window.__simStart = async () => {
  if (location.port !== '5179') throw new Error('테스트 서버(5179)에서만 쓰세요');
  if (!window.__upd) {
    window.__upd = update; window.__sj = updateSuperJump; window.__cut = updateUltCut;
    update = () => {}; updateSuperJump = () => {}; updateUltCut = () => {};
  }
  window.__step = dt => { if (G.ult && G.ult.phase === 'cut') __cut(dt); else if (G.sj) __sj(dt); else if (G.hitstop > 0) G.hitstop -= dt; else __upd(dt); };
  window.__log = []; window.__s = 0;
  if (!G.running) document.getElementById('btnStart').click();
};
window.__chunk = mins => {
  const end = __s + mins * 60;
  for (; __s < end; __s++) {
    for (let i = 0; i < 30; i++) __step(1 / 30);
    document.querySelectorAll('.screen:not(.hidden)').forEach(e => { if (e.id !== 'start') e.classList.add('hidden'); });
    for (let k = 0; k < 5; k++) {
      let best = null, bc = Infinity;
      for (const sk of RSKILLS) { if (sk.req && lv(sk.req[0]) < sk.req[1]) continue; if (sk.max && lv(sk.id) >= sk.max) continue; const c = skillCost(sk); if (c < bc) { bc = c; best = sk; } }
      if (best && S.cheese >= bc) { S.cheese -= bc; S.skills[best.id] = lv(best.id) + 1; } else break;
    }
    if (G.climbAsk && __s % 120 === 0) climb();
    if (__s % 60 === 30) for (let g = 0; g < 200; g++) { if (G.rats.filter(r => !r.temp).length - PROMOTE_COST + 1 < PROMO_KEEP) break; const t = TIERS.findIndex((_, i) => i < TIERS.length - 1 && G.rats.filter(r => r.tier === i && !r.temp).length >= PROMOTE_COST && G.rats.length > PROMOTE_COST); if (t < 0 || !promote(t)) break; }   // 일괄 승급
    if (__s % 60 === 0) {
      let m = null; for (const [i, j] of openRooms()) for (const [di, dj] of closedSides(i, j)) { const h = wallHP(i, j, di, dj); if (m === null || h < m) m = h; }
      __log.push(`${__s / 60}분 ${S.floor}층 쥐${G.rats.length}/${popCap()} 방${OPEN.size}/${LAYOUT.size} 치즈${fmt(S.cheese)} 초당${fmt(S.ips)} 벽${m === null ? '-' : fmt(m)} 이빨${lv('teeth')}${G.bossFight ? ` 보스${Math.round(G.boss.hp / G.boss.hpMax * 100)}% ${Math.round(G.bossFight.t)}초` : ''}${S.bossFail ? ' 실패' + S.bossFail : ''}`);
    }
  }
  return __log.slice(-mins).join('\n');
};
