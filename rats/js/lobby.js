'use strict';
// ───────────────────────── 아웃게임 (탈출 준비실) · 게임 오버 화면 ─────────────────────────
// 아지트(시작 화면, lobbyscene.js)에서 버튼 → 여기. 상단 탭으로 페이지를 오감:
//   🚪 탈출 준비(시작 층 고르고 출발) · 🏅 티어(연구자료 + 조건으로 강화) · ⭐ 쥐 강화(조각, 개별·일괄) · 🌳 공용 스킬(트리 창) · 📖 도감(도감 창) · 💾 기록(통계·저장·백업)
// 판(런) 진행 중에도 볼 수 있지만, 티어·쥐 강화는 판이 끝난 뒤에만 (인게임은 승급만)
// 판이 끝나면(meta.js updateGameOver → UI.showGameOver) "잡혀버리고 말았다…" → 아지트로
const LOBBY = (() => {
  let startFloor = 1, ratSel = null, ratFilter = -1, rankSel = 0, page = 'run';
  const $l = id => document.getElementById(id);
  const art = k => (typeof RAT_ART !== 'undefined' && RAT_ART.prop[k] ? `../assets/rats/${RAT_ART.prop[k]}.png` : null);
  const ico = (k, emo, cls = 'og-ico') => (art(k) ? `<img class="${cls}" src="${art(k)}" alt="">` : `<span class="${cls} emo">${emo}</span>`);
  const PAGES = [
    ['run', 'lb:map', '🗺️', '작전 회의'], ['rank', 'rk:1', '🎖️', '찍찍!! 훈장'], ['rats', 'lb:dumbbell', '⭐', '쳇바퀴 훈련'],
    ['skill', 'lb:skill', '🧀', '치즈 창고'], ['dex', 'lb:dex', '📖', '친구들!!'], ['rec', 'lb:save', '💤', '낮잠 침대'],
  ];
  const locked = () => S.inRun;                   // 판 진행 중엔 아웃게임 강화 잠금

  function inject() {
    const wrap = document.getElementById('wrap');
    wrap.insertAdjacentHTML('beforeend', `
  <div id="lobby" class="screen hidden">
    <div class="og-bg"></div>
    <div class="og-top">
      <button id="ogHome" class="og-home">🏠 <span>아지트로 쪼르르</span></button>
      <div class="og-tabs">${PAGES.map(([id, k, e, n]) => `<button class="og-tab" data-p="${id}">${ico(k, e)}<span>${n}</span><i class="dot"></i></button>`).join('')}</div>
      <div class="og-money"><span title="치즈">🧀 <b id="lbCheese">0</b></span><span title="연구자료">📑 <b id="lbRes">0</b></span></div>
    </div>
    <div class="og-body">
      <section class="og-page" id="pg-run"></section>
      <section class="og-page" id="pg-rank"></section>
      <section class="og-page" id="pg-rats">
        <div class="og-card og-rats-main">
          <div class="og-rats-h">
            <h3>⭐ 쳇바퀴 훈련 <small>같은 친구를 또 만나면 조각 +1 · 조각을 모아 근육 업!</small></h3>
            <div class="og-filter" id="ogFilter"></div>
            <button id="lbUpAll" class="big og-plank">⏫ 다 같이 훈련</button>
          </div>
          <div id="lbRatList" class="og-rat-grid"></div>
        </div>
        <div class="og-card og-rat-detail" id="ogRatDetail"></div>
      </section>
      <section class="og-page" id="pg-skill"><div class="og-card og-reopen"><h3>🧀 치즈 창고</h3><p class="desc">모은 치즈로 다 같이 강해져요 (탈출이 끝난 뒤에)</p><button class="big og-plank" data-reopen="skill">🧀 창고 문 열기</button></div></section>
      <section class="og-page" id="pg-dex"><div class="og-card og-reopen"><h3>📖 친구들!!</h3><p class="desc">지금까지 만난 친구들 사진첩</p><button class="big og-plank" data-reopen="dex">📖 사진첩 펼치기</button></div></section>
      <section class="og-page" id="pg-rec"></section>
      <input id="lbFile" type="file" accept=".json" hidden>
    </div>
  </div>
  <div id="gameover" class="screen hidden">
    <div class="panel pop go-card">
      <div class="go-top">🚨 일망타진 🚨</div>
      <h2>잡혀버리고 말았다…</h2>
      <p id="goWhy"></p>
      <div id="goSum" class="go-sum"></div>
      <p class="go-keep">🧀 치즈 · 📑 연구자료 · 🌳 공용 스킬 · 🎖️ 훈장 · ⭐ 쳇바퀴 훈련은 그대로!<br>쥐들과 올라간 층은 처음부터 다시…</p>
      <button id="goOk" class="big">🏠 아지트로 쪼르르 도망</button>
    </div>
  </div>`);
    for (const b of document.querySelectorAll('.og-tab')) b.onclick = () => { Sfx.click(); setPage(b.dataset.p); };
    $l('ogHome').onclick = () => { Sfx.click(); home(); };
    $l('lbFile').onchange = importSave;
    for (const b of document.querySelectorAll('[data-reopen]')) b.onclick = () => { Sfx.click(); b.dataset.reopen === 'skill' ? UI.openTree('common') : UI.openDex(); };
    $l('lbUpAll').onclick = () => {
      if (locked()) return lockedToast();
      const n = upgradeAllRats(); if (!n) { Sfx.deny(); UI.toast(RSPECIES[0], '⏫ 훈련할 친구가 없어요', '조각을 더 모아 와요, 찍!'); return; }
      Sfx.clear(); writeSave(); UI.toast(RSPECIES[0], `⏫ 다 같이 훈련 ${n}번!`, '모은 조각으로 올릴 수 있는 만큼 전부 근육 업!'); render();
    };
    $l('goOk').onclick = () => { UI.hide('gameover'); endRun(); home(); };
    // 인게임 ESC = "정말 포기하고 돌아갈까요? 찍!!?" → 찍!(네) 이면 이번 판을 포기하고 아지트로 (치즈·연구 자료·훈장은 그대로)
    document.getElementById('wrap').insertAdjacentHTML('beforeend', `
  <div id="quitAsk" class="screen hidden">
    <div class="panel pop quit-card">
      <div class="quit-ic">🐀💦</div>
      <h2>정말 포기하고 돌아갈까요? 찍!!?</h2>
      <p class="desc">이번 판의 쥐들과 올라온 층은 사라져요<br>🧀 치즈 · 📑 연구 자료 · 🎖️ 훈장 · ⭐ 훈련은 그대로!</p>
      <div class="quit-btns"><button id="quitYes" class="big danger">찍! (네)</button><button id="quitNo" class="big">찍찍!! (아니오)</button></div>
    </div>
  </div>`);
    const quitClose = () => { UI.hide('quitAsk'); if (S.inRun) G.running = true; };
    $l('quitNo').onclick = () => { Sfx.click(); quitClose(); };
    $l('quitYes').onclick = () => { Sfx.deny(); UI.hide('quitAsk'); G.running = false; endRun(); writeSave(); home(); };
    const PANELS = ['tree', 'promo', 'dex', 'stats', 'ultPick', 'offline', 'newcat', 'resetAsk'];
    window.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !$l('lobby').classList.contains('hidden') || !$l('start').classList.contains('hidden')) return;
      if (!$l('quitAsk').classList.contains('hidden')) { e.stopImmediatePropagation(); quitClose(); return; }
      if (PANELS.some(id => $l(id) && !$l(id).classList.contains('hidden'))) return;   // 열린 창이 있으면 그 창만 닫힘 (ui.js)
      if (!S.inRun || G.go || G.heist || G.trans || G.sj || G.ult) return;               // 연출 중엔 무시
      e.stopImmediatePropagation(); Sfx.click(); G.running = false; UI.show('quitAsk');
    }, true);
    // 아웃게임에서 ESC = 아지트로 (예전엔 ESC 가 스킬·도감 창만 닫아서 '다시 열기' 페이지에 갇힘)
    window.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || $l('lobby').classList.contains('hidden') || !$l('gameover').classList.contains('hidden')) return;
      if (!$l('resetAsk').classList.contains('hidden')) { UI.hide('resetAsk'); e.stopImmediatePropagation(); return; }
      if (page === 'rats' && !$l('tree').classList.contains('hidden')) { e.stopImmediatePropagation(); UI.hide('tree'); Sfx.click(); return; }   // 쳇바퀴 훈련에서 연 상세 트리 → ESC 면 훈련 페이지로
      e.stopImmediatePropagation(); e.preventDefault(); Sfx.click(); home();
    }, true);
  }
  const lockedToast = () => { Sfx.deny(); UI.toast(RSPECIES[0], '🔒 지금은 탈출 중이에요', '아지트에 돌아오면 할 수 있어요, 찍!'); };

  // ── 백업: 저장 데이터를 파일로 / 파일에서 ──
  function exportSave() {
    writeSave();
    const blob = new Blob([localStorage.getItem(SAVE_KEY) || '{}'], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `rat-uprising-save-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function importSave(e) {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => { JSON.parse(t); resetting = true; localStorage.setItem(SAVE_KEY, t); location.reload(); }).catch(() => { Sfx.deny(); UI.toast(RSPECIES[0], '📥 불러오기 실패', '이 게임의 백업 파일이 아니에요'); });
    e.target.value = '';
  }

  // ── 🚪 탈출 준비 ──
  const floorRooms = f => Math.min(9, 3 + Math.floor(f * 0.6)) + (isBossFloor(f) ? 1 : 0);
  const planTime = f => Math.round(190 + 35 * floorRooms(f) + (isBossFloor(f) ? BOSS_TIME + 30 : 0));
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function oddsBars() {
    const w = tierWeights(), sum = w.reduce((a, b) => a + b, 0);
    return TIERS.map((t, i) => {
      const p = w[i] / sum, open = tierAvailable(i);
      return `<div class="og-odd${open ? '' : ' lock'}" style="--rc:${t.col}"><span>${t.name}</span><div class="og-odd-bar"><i style="width:${open ? Math.max(1.5, p * 100).toFixed(1) : 0}%"></i></div><b>${open ? oddsPct(p) : '🔒'}</b></div>`;
    }).join('');
  }
  function renderRun() {
    const el = $l('pg-run');
    if (S.inRun) {
      el.innerHTML = `<div class="og-card og-run-live"><div class="og-pin"></div>
        <h3>🐀 찍찍! 지금 탈출 중!</h3>
        <div class="og-big-num">${S.floor}<small>층</small></div>
        <p class="desc">${floorZone(S.floor).name} · 쥐 ${ratCount()}마리 · ⏳ 남은 시간 ${mmss(Math.max(0, Math.ceil(S.timeLeft || 0)))}</p>
        <button id="ogResume" class="big og-plank og-go">▶ 계속 도망가기</button>
        <p class="desc og-note">🔒 훈장·쳇바퀴 훈련·치즈 창고는 탈출이 끝나고 아지트에 돌아와야 할 수 있어요 (구경은 OK)</p></div>`;
      $l('ogResume').onclick = resume;
      return;
    }
    const cap = startFloorCap(); startFloor = clamp(startFloor, 1, cap);
    const f = startFloor, z = floorZone(f);
    const tiles = Array.from({ length: Math.max(cap, Math.min(cap + 3, (S.maxFloor || 1) + 2)) }, (_, i) => i + 1).map(n => {
      const can = n <= cap;
      return `<button class="og-floor${n === f ? ' on' : ''}${isBossFloor(n) ? ' boss' : ''}${can ? '' : ' lock'}" data-f="${n}" ${can ? '' : 'disabled'}><b>${n}</b><small>${isBossFloor(n) ? '👹 보스' : can ? floorZone(n).name.split(' ').pop() : '🔒'}</small></button>`;
    }).join('<i class="og-step"></i>');
    const n = startCount();
    el.innerHTML = `
      <div class="og-card og-plan"><div class="og-pin"></div>
        <h3>🗺️ 탈출 작전 회의 <small>찍! 어느 층부터 털어볼까? (훈장이 높을수록 더 높은 층에서)</small></h3>
        <div class="og-floor-path">${tiles}</div>
        <div class="og-floor-info">
          <div class="og-fi"><span>구역</span><b>${z.name}</b></div>
          <div class="og-fi"><span>⏳ 제한시간</span><b>${mmss(planTime(f))}</b></div>
          <div class="og-fi"><span>🚪 방</span><b>${floorRooms(f)}개</b></div>
          <div class="og-fi"><span>📑 클리어 보상</span><b>+${fmt(researchFor(f))}</b></div>
          ${isBossFloor(f) ? '<div class="og-fi boss"><span>👹</span><b>보스 층! 쓰러뜨려야 계단이 열려요</b></div>' : ''}
        </div>
        ${art('lb:map') ? `<img class="og-plan-map" src="${art('lb:map')}" alt="">` : ''}
        <p class="desc og-rules">⏳ 시간 안에 계단 방을 찾아 쪼르르! 늦으면 고양이랑 경비원이 우르르 몰려와요<br>📑 층을 깨면 연구 자료를 슬쩍 (높은 층·보스 층일수록 듬뿍)</p>
      </div>
      <div class="og-card og-crew"><div class="og-pin r"></div>
        <h3>🐀 출동 멤버</h3>
        <div class="og-crew-n">${Array.from({ length: Math.min(n, 15) }, () => '<i></i>').join('')}<b>${n}마리</b></div>
        <p class="desc">누가 나올지는 두근두근 뽑기! 훈장이 높을수록 귀한 친구가 나와요</p>
        <div class="og-odds">${oddsBars()}</div>
        <div class="og-stats"><div><span>최고 기록</span><b>${S.maxFloor || 1}층</b></div><div><span>탈출 시도</span><b>${S.runs || 0}번</b></div></div>
        <button id="lbGo" class="big og-plank og-go">🐀 ${f}층으로 쪼르르 출발!</button>
      </div>`;
    for (const b of el.querySelectorAll('.og-floor:not(.lock)')) b.onclick = () => { startFloor = +b.dataset.f; Sfx.click(); renderRun(); };
    $l('lbGo').onclick = go;
  }

  // ── 🏅 티어 ── 위: 8단계 사다리 (누르면 그 티어 정보) / 아래: 조건·해금·효과
  function renderRank() {
    const r = rankOf(); if (!rankSel) rankSel = Math.min(RANK_MAX, r + 1);
    const ladder = RANKS.map((k, i) => {
      const n = i + 1, st = n < r ? 'done' : n === r ? 'cur' : 'next';
      return `<button class="og-rk ${st}${n === rankSel ? ' sel' : ''}" data-r="${n}">${rankBadge(n, 'og-rk-img')}<b>${n}</b><small>${k.name}</small></button>`;
    }).join('<i class="og-rk-line"></i>');
    const s = rankSel, sk = RANKS[s - 1], un = rankUnlocks(s);
    const eff = (a, b) => (a === b ? `<em><b>${a}</b></em>` : `<em><b>${a}</b> → <b class="up">${b}</b></em>`);
    let side;
    if (s <= r) side = `<p class="og-done">✅ 이미 단 훈장이에요</p>`;
    else if (s > r + 1) side = `<p class="og-done">🔒 훈장 ${s - 1} 을 먼저 달아야 해요</p>`;
    else {
      const q = rankReqs(), ok = q.every(x => x.ok);
      side = `<div class="og-reqs">${q.map(x => { const p = clamp(x.have / Math.max(1, x.need), 0, 1); return `<div class="og-req${x.ok ? ' ok' : ''}"><div class="og-req-t"><span>${x.ok ? '✅' : '⬜'} ${x.label}</span><b>${fmt(x.have)} / ${fmt(x.need)}${x.unit || ''}</b></div><div class="og-req-bar"><i style="width:${(p * 100).toFixed(1)}%"></i></div></div>`; }).join('')}</div>
        <button id="lbRankUp" class="big og-plank og-go" ${ok && !locked() ? '' : 'disabled'}>${locked() ? '🔒 아지트에 돌아오면 달 수 있어요' : `🎖️ 훈장 달기 (📑 ${fmt(sk.cost)})`}</button>`;
    }
    $l('pg-rank').innerHTML = `
      <div class="og-card og-ladder"><div class="og-pin"></div><h3>🎖️ 찍찍!! 훈장 <small>훔친 연구 자료로 훈장을 달면 새 친구·새 비법이 열리고 귀한 친구가 더 잘 나와요</small></h3><div class="og-rk-row">${ladder}</div></div>
      <div class="og-card og-rk-info"><div class="og-pin"></div>
        <div class="og-rk-head">${rankBadge(s, 'og-rk-big')}<div><h3>훈장 ${s} · ${sk.name}</h3><small>${s === r ? '지금 단 훈장' : s < r ? '이미 달았어요' : '다음 목표!'}</small></div></div>
        <div class="og-rk-eff">
          <div><span>🐀 시작 쥐</span>${eff(startCount(r), startCount(Math.max(r, s)))}</div>
          <div><span>🏢 시작 층 최대</span>${eff(startFloorCap(r) + '층', startFloorCap(Math.max(r, s)) + '층')}</div>
          <div><span>🍀 윗등급 배율</span>${eff('×' + rankOddsK(r).toFixed(2), '×' + rankOddsK(Math.max(r, s)).toFixed(2))}</div>
        </div>
        ${side}
      </div>
      <div class="og-card og-rk-unlock"><div class="og-pin r"></div><h3>🔓 훈장 ${s} 에 오는 친구들</h3>
        <div class="og-un-sp">${un.species.map(sp => `<div class="og-un" style="--rc:${TIERS[sp.tier].col}" data-sp="${sp.id}"></div>`).join('') || '<p class="desc">새 친구는 없어요</p>'}</div>
        <div class="og-un-sk">${un.skills.map(x => `<span class="og-chip">${x.icon} ${x.name}</span>`).join('')}</div>
      </div>`;
    for (const c of document.querySelectorAll('#pg-rank .og-un')) { const sp = RSPECIES_BY_ID[c.dataset.sp], known = ratKnown(sp.id); c.appendChild(UI.ratPic(sp, 96, 72, known)); c.insertAdjacentHTML('beforeend', `<b>${known ? sp.name : '???'}</b><small>${TIERS[sp.tier].name}</small>`); }
    for (const b of document.querySelectorAll('#pg-rank .og-rk')) b.onclick = () => { rankSel = +b.dataset.r; Sfx.click(); renderRank(); };
    if ($l('lbRankUp')) $l('lbRankUp').onclick = () => {
      if (locked()) return lockedToast();
      if (!rankUp()) return Sfx.deny();
      Sfx.clear(); writeSave(); UI.toast(RSPECIES[0], `🎖️ 찍찍!! 훈장 ${rankOf()} · ${RANKS[rankOf() - 1].name}!`, '새 친구·새 비법이 열렸어요, 찍찍!');
      rankSel = Math.min(RANK_MAX, rankOf() + 1); startFloor = Math.min(startFloor, startFloorCap()); render();
      if (typeof HOME !== 'undefined') HOME.refresh();
    };
  }

  // ── ⭐ 쥐 강화 ── 왼쪽: 등급 필터 + 카드 / 오른쪽: 고른 쥐 자세히 (리스트는 한 번 만들고 숫자만 갱신 → 클릭이 씹히지 않게)
  function renderRats() {
    const seen = RSPECIES.filter(sp => ratKnown(sp.id));            // 해금 + 만난 쥐만 (잠긴 쥐의 조각·레벨은 그대로 남아 있다가 해금되면 다시 보임)
    $l('ogFilter').innerHTML = [-1, ...TIERS.map((_, i) => i)].map(t => {
      const n = t < 0 ? seen.length : seen.filter(sp => sp.tier === t).length, up = (t < 0 ? seen : seen.filter(sp => sp.tier === t)).filter(sp => canUpgradeRat(sp.id)).length;
      return `<button class="og-fchip${ratFilter === t ? ' on' : ''}" data-t="${t}" style="--rc:${t < 0 ? '#8a7f74' : TIERS[t].col}" ${n ? '' : 'disabled'}>${t < 0 ? '전체' : TIERS[t].name} ${n}${up ? `<i>${up}</i>` : ''}</button>`;
    }).join('');
    for (const b of document.querySelectorAll('#ogFilter .og-fchip')) b.onclick = () => { ratFilter = +b.dataset.t; Sfx.click(); renderRats(); };
    const list = seen.filter(sp => ratFilter < 0 || sp.tier === ratFilter).sort((a, b) => canUpgradeRat(b.id) - canUpgradeRat(a.id) || b.tier - a.tier);
    const L = $l('lbRatList'), sig = list.map(s => s.id).join();
    if (L.dataset.sig !== sig) {
      L.dataset.sig = sig; L.innerHTML = '';
      for (const sp of list) {
        const c = document.createElement('div'); c.className = 'og-rat'; c.dataset.id = sp.id; c.style.setProperty('--rc', TIERS[sp.tier].col);
        c.appendChild(UI.ratPic(sp, 120, 90));
        c.insertAdjacentHTML('beforeend', `<b class="nm">${sp.name}</b><small class="lv"></small><div class="bar"><i></i></div><button class="mini up">훈련</button>`);
        c.onclick = e => { if (e.target.closest('.up')) return; ratSel = sp.id; Sfx.click(); renderRats(); };
        c.querySelector('.up').onclick = () => { if (locked()) return lockedToast(); if (!upgradeRat(sp.id)) return Sfx.deny(); ratSel = sp.id; Sfx.buy(); writeSave(); render(); };
        L.appendChild(c);
      }
      if (!list.length) L.innerHTML = '<p class="desc">아직 만난 친구가 없어요</p>';
    }
    for (const c of L.querySelectorAll('.og-rat')) {
      const id = c.dataset.id, sh = shardLevel(id), can = canUpgradeRat(id) && !locked();
      c.querySelector('.lv').textContent = sh.need ? `⭐ Lv ${sh.L} · 조각 ${Math.max(0, sh.have)}/${sh.need}` : `⭐ Lv ${sh.L} · 만렙!`;
      c.querySelector('.bar i').style.width = (sh.need ? clamp(sh.have / sh.need, 0, 1) * 100 : 100).toFixed(0) + '%';
      c.querySelector('.up').disabled = !can; c.classList.toggle('can', can); c.classList.toggle('sel', id === ratSel);
    }
    const n = upgradableCount();
    $l('lbUpAll').disabled = !n || locked(); $l('lbUpAll').textContent = locked() ? '🔒 탈출 중' : `⏫ 다 같이 훈련${n ? ` (${n})` : ''}`;
    renderRatDetail(list.length ? list : seen);
  }
  function renderRatDetail(seen) {
    const D = $l('ogRatDetail');
    if (!ratSel || !ratKnown(ratSel)) ratSel = (seen[0] || {}).id;
    const sp = RSPECIES_BY_ID[ratSel];
    if (!sp) { D.innerHTML = '<p class="desc">친구를 고르면 자세히 보여요</p>'; return; }
    const sh = shardLevel(sp.id), t = TIERS[sp.tier];
    D.innerHTML = `<div class="og-pin"></div><div class="og-rd-pic" style="--rc:${t.col}"></div>
      <h3>${sp.name}</h3><span class="rar" style="background:${t.col}">${t.name}</span>
      <p class="desc">${sp.desc}</p>
      <div class="og-rd-lv"><b>⭐ Lv ${sh.L}</b><span>${sh.need ? `다음 레벨까지 조각 ${Math.max(0, sh.have)}/${sh.need}` : '최대 레벨!'}</span><div class="bar"><i style="width:${(sh.need ? clamp(sh.have / sh.need, 0, 1) * 100 : 100).toFixed(0)}%"></i></div></div>
      <div class="ab-card">${sp.ab.icon} <b>${sp.ab.name}</b><small>${abDesc(sp, rsl(sp.id, 'special'))}</small></div>
      <div class="ab-card act">${sp.act.icon} <b>${sp.act.name}</b><small>${rsl(sp.id, 'act') ? actDesc(sp, rsl(sp.id, 'act'), rsl(sp.id, 'actPow')) : '🔒 훈련하면 해금 · ' + actDesc(sp, 1, 0)}</small></div>
      ${sp.ult ? `<div class="ab-card ult">${sp.ult.fx} <b>필살기 · ${sp.ult.name}</b><small>${ULT_TYPES[sp.ult.type]}</small></div>` : ''}
      <button id="ogRdTree" class="big og-plank">🌳 상세 스킬 트리 보기</button>`;   // 개별 훈련은 왼쪽 카드의 '훈련' 버튼
    D.querySelector('.og-rd-pic').appendChild(UI.ratPic(sp, 240, 180));
    // 그 쥐의 종별 스킬 트리 창(#tree)을 탭 아래에 띄움 — 레벨마다 어떤 노드가 찍히는지 · 특수 능력·특수 액션·필살기. 닫기 = 탭 다시 누르기 / ESC
    $l('ogRdTree').onclick = () => { Sfx.click(); document.getElementById('wrap').classList.add('og-sub'); UI.openTree(sp.id); };   // og-sub: 이때만 트리 ✕ 보임 (✕ = 훈련 페이지로)
  }

  // ── 💾 기록 ──
  function renderRec() {
    const seen = RSPECIES.filter(sp => ratKnown(sp.id)).length, lvSum = Object.values(S.rlv || {}).reduce((a, b) => a + b, 0);
    const row = (k, v) => `<div class="og-fi"><span>${k}</span><b>${v}</b></div>`;
    $l('pg-rec').innerHTML = `
      <div class="og-card og-rec"><div class="og-pin"></div><h3>📊 탈출 일지</h3>
        ${row('🎖️ 훈장', `${rankOf()} · ${RANKS[rankOf() - 1].name}`)}${row('🏢 최고 기록', `${S.maxFloor || 1}층`)}${row('🐀 탈출 시도', `${S.runs || 0}번`)}
        ${row('📖 만난 친구', `${seen} / ${RSPECIES.length}종`)}${row('⭐ 쳇바퀴 훈련 합계', `Lv ${lvSum}`)}${row('🧀 치즈 창고 비법 합계', `Lv ${skillSum()}`)}
        ${row('🧀 치즈', fmt(S.cheese))}${row('📑 연구자료', fmt(S.research || 0))}</div>
      <div class="og-card og-save"><div class="og-pin r"></div><h3>💤 낮잠 침대 <small>저장하고 쿨쿨</small></h3>
        <p class="desc">아지트는 이 브라우저에 알아서 저장돼요. 다른 PC로 이사 가거나 혹시 몰라 숨겨 두려면 백업 파일로!</p>
        <button id="lbSave" class="big og-plank">💾 지금 저장하고 쿨쿨</button>
        <button id="lbExport" class="big og-plank">📤 백업 치즈 상자 받기</button>
        <button id="lbImport" class="big og-plank">📥 백업 치즈 상자 열기</button>
        <button id="lbReset" class="mini og-reset">🗑️ 아지트 싹 비우고 처음부터 (초기화)</button></div>`;
    $l('lbSave').onclick = () => { writeSave(); UI.toast(RSPECIES[0], '💤 저장했어요, 쿨쿨', '치즈·훈장·훈련이 이 브라우저에 쏙'); Sfx.buy(); };
    $l('lbExport').onclick = exportSave;
    $l('lbImport').onclick = () => $l('lbFile').click();
    $l('lbReset').onclick = () => { UI.show('resetAsk'); Sfx.click(); };
  }

  // ── 페이지 전환 ── 공용 스킬·도감은 기존 창(#tree·#dex)을 탭 아래에 띄움
  function setPage(p) {
    page = p; document.getElementById('wrap').classList.remove('og-sub');
    for (const b of document.querySelectorAll('.og-tab')) b.classList.toggle('on', b.dataset.p === p);
    for (const s of document.querySelectorAll('.og-page')) s.classList.toggle('on', s.id === 'pg-' + p);
    UI.hide('tree'); UI.hide('dex');
    if (p === 'skill') UI.openTree('common');
    else if (p === 'dex') UI.openDex();
    render();
  }
  function render() {
    $l('lbCheese').textContent = fmt(S.cheese); $l('lbRes').textContent = fmt(S.research || 0);
    // 탭 알림 점: 강화 가능한 것
    const dots = { rats: !locked() && upgradableCount() > 0, rank: !locked() && rankOf() < RANK_MAX && rankReqs().every(x => x.ok) };
    for (const b of document.querySelectorAll('.og-tab')) b.classList.toggle('alert', !!dots[b.dataset.p]);
    if (page === 'run') renderRun(); else if (page === 'rank') renderRank(); else if (page === 'rats') renderRats(); else if (page === 'rec') renderRec();
  }
  function open(p = 'run') {
    if (!S.inRun) UI.hideGame();
    UI.hide('start'); G.running = false; document.getElementById('wrap').classList.add('og-open');
    UI.show('lobby'); setPage(p);
  }
  function close() { UI.hide('lobby'); UI.hide('tree'); UI.hide('dex'); document.getElementById('wrap').classList.remove('og-open', 'og-sub'); }
  function home() { close(); if (typeof HOME !== 'undefined') HOME.open(); else UI.show('start'); }
  function go() {
    Sfx.resume(); close();
    S.runs = (S.runs || 0) + 1;
    startRun(startFloor);
    UI.beginPlay(false);
    Sfx.comboWord();
  }
  function resume() { Sfx.resume(); close(); if (typeof HOME !== 'undefined') HOME.close(); UI.beginPlay(true); }
  // 게임 오버 결과
  function showGameOver(why) {
    $l('goWhy').textContent = why === 'boss' ? '👹 보스를 끝내 쓰러뜨리지 못했다…' : '⏰ 제한시간 안에 계단 방을 찾지 못했다…';
    const row = (k, v) => `<div class="lb-stat"><span>${k}</span><b>${v}</b></div>`;
    $l('goSum').innerHTML = row('도달한 층', `${S.floor}층 (시작 ${S.runStart || 1}층)`) + row('이번 판 📑 연구자료', `+${fmt(S.runResearch || 0)}`) + row('최고 기록', `${S.maxFloor || 1}층`) + row('잡힌 쥐', `${ratCount()}마리`);
    setTimeout(() => { UI.show('gameover'); Sfx.deny(); }, 600);
  }
  return { inject, open, close, render, resume, showGameOver, get page() { return page; } };
})();
LOBBY.inject();
UI.showGameOver = LOBBY.showGameOver;
setInterval(() => { if (!document.getElementById('lobby').classList.contains('hidden')) { document.getElementById('lbCheese').textContent = fmt(S.cheese); document.getElementById('lbRes').textContent = fmt(S.research || 0); } }, 1000);
