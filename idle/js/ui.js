'use strict';
const $ = s => document.querySelector(s);
// 단일 HTML 빌드에서는 window.__A(내장 이미지)를 먼저 찾음
const PORTRAIT = id => (window.__A && window.__A[`assets/v2/cats/${id}.png`]) || `../assets/v2/cats/${id}.png`;
function portraitHTML(id, style = '') {
  return `<img src="${PORTRAIT(id)}" alt="" style="${style}" onerror="this.outerHTML='<span class=&quot;ph&quot;>🐱</span>'">`;
}

const UI = (() => {
  let treeMode = 'common', selSkill = 'claw', selCat = 'cheese', amt = 1;
  let shown = 0;
  const newQueue = [];

  // ───────── HUD ─────────
  function tickHUD() {
    const diff = S.churu - shown;
    shown = Math.abs(diff) < 1 ? S.churu : shown + diff * 0.2;
    $('#churu').textContent = fmt(shown);
    for (const el of document.querySelectorAll('.churu-live')) el.textContent = fmt(S.churu);
    $('#ips').textContent = fmt(S.ips || 0);
    const need = levelNeed(S.level);
    $('#lvl').textContent = `난동 레벨 ${S.level}`;
    $('#zone').textContent = `반경 ${Math.round(radius())} · 여기는 ${tileAt(camCenter().x, camCenter().y).name}`;
    $('#lvlBar').style.width = Math.min(100, S.prog / need * 100) + '%';
    $('#lvlSub').textContent = `${S.prog} / ${need} 파괴 → 다음 레벨 · 화면 속 물건 ${G.items.length}개 · 에너지 ${G.orbs.length}개`;
    $('#btnUnlock').textContent = S.autoCam ? '🎥 자동 순찰 ON' : '🎥 자동 순찰 OFF';
    $('#btnUnlock').classList.toggle('ready', S.autoCam);
    $('#fieldN').textContent = `${G.cats.length}/${fieldCap()}`;
    const owned = SPECIES.filter(s => S.cats[s.id]).length;
    $('#dexN').textContent = `${owned}/${SPECIES.length}`;
    const tb = $('#treeBadge'), n = affordableCount();
    tb.textContent = n; tb.classList.toggle('hidden', !n);
    const db = $('#dexBadge');
    const ups = SPECIES.filter(s => canUpgrade(s.id)).length;
    const fresh = Object.keys(S.fresh).length;
    db.textContent = fresh ? 'NEW' : ups ? `⬆${ups}` : '';
    db.classList.toggle('hidden', !fresh && !ups);
    if (!$('#tree').classList.contains('hidden')) refreshTreeAfford();
    requestAnimationFrame(tickHUD);
  }

  // ───────── 스킬 트리 (공용 / 종별) ─────────
  function treeCtx(mode = treeMode) {
    if (mode === 'common') return {
      list: SKILLS, get: s => lv(s.id), set: (s, v) => { S.skills[s.id] = v; }, cost: (s, l) => skillCost(s, l),
      pos: s => [7 + s.grid[0] * 17.2, 88 - s.grid[1] * 19], name: s => s.name, icon: s => s.icon, desc: (s, l) => s.desc(l),
      reqOk: s => !s.req || lv(s.req[0]) >= s.req[1], reqName: s => SKILL_BY_ID[s.req[0]].name,
    };
    const id = mode, sp = CAT_SPECIALS[id];
    const byId = Object.fromEntries(CAT_SKILLS.map(s => [s.id, s]));
    return {
      list: CAT_SKILLS, get: s => csl(id, s.id), set: (s, v) => { (S.catSkills[id] = S.catSkills[id] || {})[s.id] = v; }, cost: (s, l) => catSkillCost(s, id, l),
      pos: s => [22 + s.grid[0] * 28, 84 - s.grid[1] * 24], name: s => s.special ? sp.name : s.name, icon: s => s.special ? sp.icon : s.icon,
      desc: (s, l) => s.special ? sp.desc(l) : s.desc(l), reqOk: s => !s.req || csl(id, s.req[0]) >= s.req[1],
      reqName: s => { const r = byId[s.req[0]]; return r.special ? sp.name : r.name; },
    };
  }
  const isMax = (T, s) => s.max && T.get(s) >= s.max;
  function affordableCount() {
    let n = 0;
    for (const mode of ['common', ...SPECIES.filter(s => S.cats[s.id]).map(s => s.id)]) {
      const T = treeCtx(mode);
      for (const s of T.list) if (T.reqOk(s) && !isMax(T, s) && S.churu >= T.cost(s, T.get(s))) n++;
    }
    return n;
  }
  function buyCount(T, s) {
    if (!T.reqOk(s) || isMax(T, s)) return { n: 0, cost: 0 };
    let n = 0, cost = 0, l = T.get(s);
    const lim = amt === 'max' ? 10000 : amt;
    while (n < lim && (!s.max || l < s.max)) {
      const c = T.cost(s, l);
      if (amt === 'max' && cost + c > S.churu) break;
      cost += c; n++; l++;
    }
    return { n, cost };
  }
  function buildTabs() {
    const owned = SPECIES.filter(s => S.cats[s.id]);
    $('#treeTabs').innerHTML = `<button class="tab ${treeMode === 'common' ? 'on' : ''}" data-m="common">🌍 공용</button>` +
      owned.map(s => `<button class="tab cat ${treeMode === s.id ? 'on' : ''}" data-m="${s.id}" title="${s.name}">${portraitHTML(s.id)}<span>${s.name}</span></button>`).join('');
    for (const b of document.querySelectorAll('#treeTabs .tab')) b.onclick = () => {
      treeMode = b.dataset.m; selSkill = treeMode === 'common' ? 'claw' : 'dmg'; Sfx.click(); buildTree();
    };
  }
  function buildTree() {
    buildTabs();
    const T = treeCtx();
    const host = $('#treeArea');
    host.innerHTML = '<div class="tree-inner"></div>';
    const area = host.firstChild;
    if (treeMode !== 'common') {
      const sp = SPECIES_BY_ID[treeMode];
      host.insertAdjacentHTML('afterbegin', `<div class="tree-cat">${portraitHTML(sp.id)}<b>${sp.name}</b><small>Lv ${catLv(sp.id)} · ${RARITY[sp.rar].name} · 비용 ×${CAT_RARITY_COST[sp.rar]}</small></div>`);
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.classList.add('links');
    for (const s of T.list) {
      if (!s.req) continue;
      const r = T.list.find(o => o.id === s.req[0]);
      const [x1, y1] = T.pos(r), [x2, y2] = T.pos(s);
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => l.setAttribute(k, v));
      l.setAttribute('class', T.reqOk(s) ? (T.get(s) ? 'on' : 'open') : 'off');
      l.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(l);
    }
    area.appendChild(svg);
    for (const s of T.list) {
      const b = document.createElement('button');
      const ok = T.reqOk(s), l = T.get(s);
      b.className = 'node' + (ok ? '' : ' locked') + (isMax(T, s) ? ' maxed' : '') + (s.id === selSkill ? ' sel' : '');
      b.dataset.id = s.id;
      const [px, py] = T.pos(s);
      b.style.left = px + '%'; b.style.top = py + '%';
      b.innerHTML = `<span class="nm">${T.name(s)}</span><span class="ic">${ok ? T.icon(s) : '🔒'}</span><span class="lv">${l}${s.max ? '/' + s.max : ''}</span>` +
        (ok && !isMax(T, s) ? `<span class="cost">🐟${fmt(T.cost(s, l))}</span>` : '');
      b.onclick = () => { Sfx.resume(); if (selSkill === s.id) buy(); else { selSkill = s.id; Sfx.click(); buildTree(); } };
      area.appendChild(b);
    }
    renderSkillDetail();
  }
  function refreshTreeAfford() {
    const T = treeCtx();
    for (const b of document.querySelectorAll('#treeArea .node')) {
      const s = T.list.find(o => o.id === b.dataset.id);
      if (s) b.classList.toggle('afford', T.reqOk(s) && !isMax(T, s) && S.churu >= T.cost(s, T.get(s)));
    }
    renderSkillDetail(true);
  }
  function renderSkillDetail(onlyButton) {
    const T = treeCtx();
    const s = T.list.find(o => o.id === selSkill) || T.list[0];
    const btn = $('#dBuy');
    if (!onlyButton) {
      $('#dIcon').textContent = T.icon(s);
      $('#dName').textContent = T.name(s);
      $('#dLv').textContent = `Lv ${T.get(s)}${s.max ? ' / ' + s.max : ' (무한)'}`;
      $('#dDesc').textContent = isMax(T, s) ? '최대 레벨 달성!' : T.desc(s, T.get(s));
    }
    if (!T.reqOk(s)) { btn.textContent = `🔒 ${T.reqName(s)} Lv${s.req[1]} 필요`; btn.disabled = true; return; }
    if (isMax(T, s)) { btn.textContent = '✨ MAX'; btn.disabled = true; return; }
    const { n, cost } = buyCount(T, s);
    btn.textContent = `🐟 ${fmt(n ? cost : T.cost(s, T.get(s)))} (+${Math.max(1, n)})`;
    btn.disabled = !n || S.churu < cost;
  }
  function buy() {
    const T = treeCtx();
    const s = T.list.find(o => o.id === selSkill);
    const { n, cost } = buyCount(T, s);
    if (!n || S.churu < cost) { Sfx.deny(); return; }
    S.churu -= cost;
    T.set(s, T.get(s) + n);
    Sfx.buy();
    if (treeMode === 'common' && s.id === 'tower') syncFieldCats();
    writeSave();
    buildTree();
    const node = document.querySelector(`#treeArea .node[data-id="${s.id}"]`);
    if (node) { node.classList.add('pop'); domBurst(node, T.icon(s)); }
  }
  function domBurst(el, icon) {
    const r = el.getBoundingClientRect(), hr = $('#fxLayer').getBoundingClientRect();
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('span');
      p.className = 'fxp'; p.textContent = i % 3 ? ['✨', '🐟'][i % 2] : icon;
      const a = i / 12 * 6.28, d = 60 + Math.random() * 60;
      p.style.left = (r.left - hr.left + r.width / 2) + 'px'; p.style.top = (r.top - hr.top + r.height / 2) + 'px';
      p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d + 'px');
      $('#fxLayer').appendChild(p); setTimeout(() => p.remove(), 800);
    }
  }

  // ───────── 도감 ─────────
  function buildDex() {
    const owned = SPECIES.filter(s => S.cats[s.id]).length;
    $('#dexSum').textContent = `발견 ${owned}/${SPECIES.length} · 탄생 ${S.births}회`;
    $('#dexGrid').innerHTML = SPECIES.map(sp => {
      const c = S.cats[sp.id];
      const onField = S.field.includes(sp.id);
      const need = c ? upgradeNeed(c.lv) : 1;
      return `<button class="card ${c ? '' : 'unknown'} ${sp.id === selCat ? 'sel' : ''}" data-id="${sp.id}" style="--rc:${RARITY[sp.rar].col}">
        <div class="pic">${portraitHTML(sp.id, c ? '' : 'filter:brightness(0) opacity(.35)')}</div>
        <div class="nm">${c ? sp.name : '???'}</div>
        <div class="lvl">${c ? `Lv ${c.lv} · 조각 ${c.dup}/${need}` : RARITY[sp.rar].name}</div>
        ${c ? `<div class="dupbar"><i style="width:${Math.min(100, c.dup / need * 100)}%"></i></div>` : ''}
        ${S.fresh[sp.id] ? '<span class="new">NEW</span>' : ''}${c && canUpgrade(sp.id) ? '<span class="up">⬆ 가능</span>' : ''}${onField ? '<span class="onfield">🏙️</span>' : ''}
      </button>`;
    }).join('');
    for (const el of document.querySelectorAll('.card')) el.onclick = () => { selCat = el.dataset.id; delete S.fresh[selCat]; Sfx.meow(1.2); buildDex(); };
    renderCat();
  }
  function renderCat() {
    const sp = SPECIES_BY_ID[selCat];
    const c = S.cats[sp.id];
    const r = RARITY[sp.rar];
    if (!c) {
      $('#dexDetail').innerHTML = `${portraitHTML(sp.id, 'filter:brightness(0) opacity(.35)')}
        <span class="rar" style="background:${r.col}">${r.name}</span><h3>???</h3>
        <p class="desc">아직 만나지 못한 고양이.<br>날아가는 고양이 에너지 두 개가 부딪히면 태어나요.</p>
        <div class="stats"><div><span>잘 나오는 곳</span><b>${bestRegions(sp.id)}</b></div></div>`;
      return;
    }
    const onField = S.field.includes(sp.id);
    const need = upgradeNeed(c.lv);
    $('#dexDetail').innerHTML = `${portraitHTML(sp.id)}
      <span class="rar" style="background:${r.col}">${r.name}</span>
      <h3>${sp.name} <small>Lv ${c.lv}</small></h3>
      <p class="desc">${sp.desc}</p>
      <div class="stats">
        <div><span>특성</span><b>${sp.trait}</b></div>
        <div><span>공격력</span><b>${fmt(catDamage(sp))}</b></div>
        <div><span>도감 레벨 보너스</span><b>×${fx(speciesMult(sp.id))}</b></div>
        <div><span>조각</span><b>${c.dup} / ${need} (다음 레벨)</b></div>
        <div><span>잘 나오는 곳</span><b>${bestRegions(sp.id)}</b></div>
        <div><span>상태</span><b>${onField ? '🏙️ 도시에서 난동 중' : '💤 대기 (자리 부족)'}</b></div>
      </div>
      <button class="big upbtn" id="catUp" ${canUpgrade(sp.id) ? '' : 'disabled'}>⬆ 업그레이드 (조각 ${need})</button>
      <div class="row-btns"><button class="mini" id="catTree">🌳 ${sp.name} 스킬</button><button class="mini" id="fieldToggle">${onField ? '대기시키기' : '도시에 투입'}</button></div>`;
    $('#catUp').onclick = () => { if (upgradeSpecies(sp.id)) { Sfx.buy(); domBurst($('#catUp'), '⬆'); buildDex(); } else Sfx.deny(); };
    $('#catTree').onclick = () => { treeMode = sp.id; selSkill = 'dmg'; open('#tree'); };
    $('#fieldToggle').onclick = () => {
      if (onField) { if (S.field.length <= 1) return Sfx.deny(); S.field = S.field.filter(id => id !== sp.id); }
      else {
        if (S.field.length >= fieldCap()) { let wi = 0; S.field.forEach((id, i) => { if (catPower(id) < catPower(S.field[wi])) wi = i; }); S.field.splice(wi, 1); }
        S.field.push(sp.id);
      }
      syncFieldCats(); writeSave(); Sfx.click(); buildDex();
    };
  }

  // 이 종이 가장 잘 나오는 지역 (확률 순)
  function bestRegions(id) {
    return Object.keys(REGION_CATS).map(r => [r, speciesOdds(r)[id]]).sort((a, b) => b[1] - a[1]).slice(0, 2)
      .map(([r, p]) => `${DISTRICTS.find(d => d.id === r).name} ${(p * 100).toFixed(1)}%`).join(' · ');
  }

  // ───────── 탄생 알림 ─────────
  function onBirth(sp, isNew, joined, where) {
    const r = RARITY[sp.rar];
    if (isNew) { newQueue.push(sp); if ($('#newcat').classList.contains('hidden')) showNextNew(); }
    const el = document.createElement('div');
    el.className = 'toast' + (isNew ? ' new' : '');
    el.style.setProperty('--rc', r.col);
    const c = S.cats[sp.id];
    el.innerHTML = `${portraitHTML(sp.id)}<div><b>${isNew ? '🎉 신종 발견!' : '고양이 탄생'} ${sp.name}<span class="tag">${r.name}</span></b><small>📍 ${where || ''}</small>
      <small>${isNew ? (joined ? '도시에 합류!' : '자리 부족, 대기실로') : `조각 +1 (${c.dup}/${upgradeNeed(c.lv)})${canUpgrade(sp.id) ? ' · ⬆ 업그레이드 가능!' : ''}`}</small></div>`;
    $('#toasts').prepend(el);
    while ($('#toasts').children.length > 4) $('#toasts').lastChild.remove();
    setTimeout(() => el.remove(), 5200);
    // 열려 있는 도감은 통째로 다시 그리지 않고 요약만 갱신 (클릭 씹힘 방지)
    if (!$('#dex').classList.contains('hidden')) $('#dexSum').textContent = `발견 ${SPECIES.filter(s => S.cats[s.id]).length}/${SPECIES.length} · 탄생 ${S.births}회 · 새로 보려면 카드를 눌러요`;
  }
  function showNextNew() {
    const sp = newQueue.shift();
    if (!sp) { $('#newcat').classList.add('hidden'); return; }
    const r = RARITY[sp.rar];
    $('#ncPic').innerHTML = portraitHTML(sp.id);
    $('#ncRar').textContent = r.name; $('#ncRar').style.background = r.col;
    $('#ncName').textContent = sp.name;
    $('#ncDesc').textContent = sp.desc;
    $('#ncTrait').textContent = `특성: ${sp.trait}`;
    $('#newcat').classList.remove('hidden');
    const card = $('#newcat .panel'); card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
  }

  function open(id) {
    for (const p of ['#tree', '#dex']) $(p).classList.toggle('hidden', p !== id);
    if (id === '#tree') buildTree();
    if (id === '#dex') buildDex();
    Sfx.click();
  }
  function closeAll() { $('#tree').classList.add('hidden'); $('#dex').classList.add('hidden'); }

  function showOffline(off, text) {
    $('#offText').innerHTML = text;
    $('#offGain').textContent = fmt(off.gain);
    $('#offline').classList.remove('hidden');
    Sfx.clear();
  }
  function start() {
    Sfx.resume();
    $('#start').classList.add('hidden');
    $('#hud').classList.remove('hidden'); $('#dock').classList.remove('hidden');
    if (!S.started) { S.started = true; $('#hint').classList.remove('hidden'); setTimeout(() => $('#hint').classList.add('hidden'), 10000); }
    const off = offlineReward();
    if (off) showOffline(off, `${fmtTime(off.away)} 동안 고양이들이 밤새 난동을 부렸어요.<br><small>(최대 12시간 · 효율 ${Math.round((0.25 + 0.075 * lv('offline')) * 100)}%)</small>`);
    G.running = true;
    Sfx.meow(1.1);
    writeSave();
  }

  function init() {
    $('#btnStart').textContent = S.started ? '이어서 난동!' : '난동 시작!';
    $('#btnStart').onclick = start;
    $('#btnReset').onclick = () => { Sfx.click(); $('#resetAsk').classList.remove('hidden'); };
    $('#rsNo').onclick = () => { Sfx.click(); $('#resetAsk').classList.add('hidden'); };
    $('#rsYes').onclick = () => { G.running = false; resetting = true; try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ } location.reload(); };
    $('#offOk').onclick = () => { $('#offline').classList.add('hidden'); Sfx.buy(); };
    $('#ncOk').onclick = () => { Sfx.meow(1.2); showNextNew(); };
    $('#btnTree').onclick = () => { treeMode = 'common'; selSkill = 'claw'; open('#tree'); };
    $('#btnDex').onclick = () => open('#dex');
    $('#btnUnlock').onclick = () => { S.autoCam = !S.autoCam; G.userCamT = S.autoCam ? -99 : G.t; Sfx.click(); writeSave(); };
    for (const b of document.querySelectorAll('.close')) b.onclick = () => { closeAll(); Sfx.click(); };
    for (const b of document.querySelectorAll('.amt .mini')) b.onclick = () => {
      amt = b.dataset.amt === 'max' ? 'max' : +b.dataset.amt;
      for (const o of document.querySelectorAll('.amt .mini')) o.classList.toggle('on', o === b);
      renderSkillDetail(true); Sfx.click();
    };
    $('#dBuy').onclick = buy;
    $('#btnMute').onclick = () => { S.muted = Sfx.toggle(); $('#btnMute').textContent = S.muted ? '🔇' : '🔊'; };
    if (S.muted) { Sfx.toggle(); $('#btnMute').textContent = '🔇'; }
    window.addEventListener('keydown', e => { if (e.code === 'Escape') closeAll(); });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && G.running) { const off = offlineReward(); if (off) showOffline(off, `${fmtTime(off.away)} 동안 자리를 비웠어요.`); }
    });
    shown = S.churu;
    tickHUD();
  }
  return { init, onBirth };
})();
