// 로그라이크 밸런스 시뮬레이션 (브라우저 콘솔용, 테스트 서버 5179·5181·5182 에서만)
// 새 세이브로 판을 계속 돌림: 탈출(클릭 없이 쥐들만 자동으로) → 게임 오버 → 아지트에서 가장 싼 공용 스킬부터 자동 구매·일괄 훈련·훈장 → 다음 판
// 사용: 이 파일 내용을 콘솔에 붙여넣고 → __rsStart() → __rsRun(초) 를 여러 번 → __rsLog 확인 → __rsRestore() 로 원래 세이브 복구
// taps: 초당 클릭 수 (플레이어 흉내: 아무 쥐 근처를 눌러 총공격). 0 이면 완전 방치
window.__rsStart = (taps = 1) => {
  if (!['5179', '5181', '5182'].includes(location.port)) throw new Error('테스트 서버에서만');
  if (!window.__rsBak) window.__rsBak = localStorage.getItem(SAVE_KEY);
  window.writeSave = () => {};                                           // 원래 세이브를 덮지 않게
  if (!window.__upd) { window.__upd = update; window.__sj = updateSuperJump; window.__cut = updateUltCut; update = () => {}; updateSuperJump = () => {}; updateUltCut = () => {}; }
  window.__step = dt => { if (G.ult && G.ult.phase === 'cut') __cut(dt); else if (G.sj) __sj(dt); else if (G.hitstop > 0) G.hitstop -= dt; else __upd(dt); };
  // 새 세이브 상태로
  Object.assign(S, { cheese: 0, research: 0, rank: 1, rlv: {}, shard: {}, seen: {}, skills: {}, rsk: {}, maxFloor: 1, runs: 0, inRun: false, floor: 1 });
  window.__rsLog = []; window.__rsT = 0; window.__rsTaps = taps; window.__rsRunT = 0; window.__rsFloorT = 0;
  __rsBegin();
};
window.__rsBegin = () => {
  S.runs++; startRun(startFloorCap()); UI.beginPlay(false);
  document.querySelectorAll('.screen:not(.hidden)').forEach(e => e.classList.add('hidden'));
  __rsRunT = 0; __rsFloorT = 0; window.__rsFloor0 = S.floor;
};
// 판 사이: 가장 싼 공용 스킬부터 · 일괄 훈련 · 훈장
window.__rsShop = () => {
  for (let k = 0; k < 400; k++) {
    let best = null, bc = Infinity;
    for (const sk of RSKILLS) { if (!skillUnlocked(sk.id)) continue; if (sk.req && lv(sk.req[0]) < sk.req[1]) continue; if (sk.max && lv(sk.id) >= sk.max) continue; const c = skillCost(sk); if (c < bc) { bc = c; best = sk; } }
    if (best && S.cheese >= bc) { S.cheese -= bc; S.skills[best.id] = lv(best.id) + 1; } else break;
  }
  upgradeAllRats();
  let up = 0; while (rankUp()) up++;
  return up;
};
window.__rsRun = secs => {
  const end = __rsT + secs;
  for (; __rsT < end; __rsT++) {
    const f0 = S.floor; if (window.__rsLimF !== f0) { window.__rsLimF = f0; window.__rsLim = floorTime(f0); }
    for (let i = 0; i < 30; i++) {
      __step(1 / 30);
      if (__rsTaps && !G.go && !G.heist && Math.random() < __rsTaps / 30) { const r = pick(G.rats.filter(x => !x.temp)), near = r && G.items.filter(it => Math.hypot(it.x - r.x, it.y - r.y) < 300), it = near && near.length ? pick(near) : null; if (it) onTap((it.x - G.cam.x) * G.cam.z, (it.y * TILT - G.cam.y) * G.cam.z); }   // 플레이어 흉내: 쥐 근처 물건을 콕
    }
    document.querySelectorAll('.screen:not(.hidden)').forEach(e => e.classList.add('hidden'));
    __rsRunT++; __rsFloorT++;
    if (S.floor !== f0) { __rsLog.push(`  ${f0}층 클리어 ${__rsFloorT}초 (제한 ${__rsLim}초) 쥐${ratCount()} 치즈${fmt(S.cheese)}`); __rsFloorT = 0; }
    if (G.go && G.go.shown) {
      const fl = S.floor, res = S.runResearch || 0;
      endRun(); const up = __rsShop();
      __rsLog.push(`판${S.runs}: ${__rsFloor0}→${fl}층에서 잡힘 (${__rsRunT}초) 📑+${res} → 📑${S.research} 🧀${fmt(S.cheese)} 스킬Lv${skillSum()} 조각Lv${shardSum()} 훈장${rankOf()}${up ? ' ⬆' + up : ''}`);
      __rsBegin();
    }
  }
  return __rsLog.slice(-12).join('\n');
};
window.__rsRestore = () => { if (window.__rsBak) localStorage.setItem(SAVE_KEY, __rsBak); window.onbeforeunload = null; location.reload(); };
