'use strict';
// ───────────────────────── 쥐들의 반란: UI ─────────────────────────
const $ = id => document.getElementById(id);
const UI = (() => {
  let dexSel = null, ncQueue = [];

  // 쥐 그림 (이미지가 있으면 이미지, 없으면 코드 그림). 모르는 종은 실루엣
  function ratPic(sp, w = 160, h = 120, known = true) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d'), img = IMG['rat_' + sp.id] || IMG['art_r:' + sp.id];
    c.save();
    const rig = RAT_RIGS[sp.id];
    if (rig) { const s = Math.min(w / 72, h / 50) * (RIG_LEN.rat / (RIG_LEN[sp.shape] || 44)) ** 0.5; c.translate(w / 2 - 2 * s, h * 0.86); c.scale(s, s); drawRatRig(rig, 1, { ...RIG_IDLE }, c); }
    else if (img) { const s = Math.min(w / img.width, h / img.height) * 0.9; c.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s); }
    else { const s = Math.min(w / 80, h / 55); c.translate(w / 2 + 4 * s, h * 0.78); c.scale(s, s); drawRodent(c, sp, { t: 0.3, walk: 0, moving: false, bite: 0, sleep: false }); }
    c.restore();
    if (!known) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = '#6b625a'; c.fillRect(0, 0, w, h); }
    return cv;
  }
  const tierCol = t => TIERS[t].col;
  // 설명 "A → B" 에서 다음 레벨 값(→ B)을 지워 지금 효과만 남김
  const curEffect = d => d.replace(/\s*→\s*[^\s,()]+/g, '');

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  // ── HUD ──
  let powGainN = 0;
  function hud() {
    $('cheese').textContent = fmt(S.cheese);
    $('ips').textContent = fmt(S.ips);
    // 🏅 티어 · ⏳ 층 제한시간 (예전 난동 등급 자리). 30초 아래면 빨갛게 깜빡
    const rk = RANKS[rankOf() - 1], tl = Math.max(0, Math.ceil(S.timeLeft || 0)), tmax = S.inRun ? floorTime(S.floor) : 1;
    $('ramp').textContent = `🎖️ 훈장 ${rankOf()} ${rk.name} · ⏳ ${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`;
    $('rampBar').style.width = Math.min(100, (S.timeLeft || 0) / tmax * 100).toFixed(1) + '%';
    $('rampBar').parentElement.classList.toggle('warn', S.inRun && tl <= 30);
    $('ramp').classList.toggle('warn', S.inRun && tl <= 30);
    const w = tierWeights(), sum = w.reduce((a, b) => a + b, 0);
    const hi = TIERS.map((t, i) => [t, w[i] / sum]).filter(([, p], i) => i >= 1 && p >= 0.001).map(([t, p]) => `${t.name} ${oddsPct(p)}`).join(' · ');
    $('rampSub').textContent = `탄생 확률 · ${hi}`;
    $('research').textContent = fmt(S.research || 0);
    // 오른쪽: 지금 등급별 쥐 마릿수 (등급 색 = 쥐 발밑 오라 색)
    const cnt = TIERS.map(() => 0); for (const r of G.rats) if (!r.temp) cnt[r.tier]++;
    const tp = TIERS.map((t, i) => `<div class="tp-row${cnt[i] ? '' : ' zero'}" style="--rc:${t.col}"><i></i><span>${t.name}</span><b>${cnt[i]}</b></div>`).join('');
    if ($('tierPanel').dataset.sig !== tp) { $('tierPanel').dataset.sig = tp; $('tierPanel').innerHTML = `<div class="tp-h">🐀 등급별</div>${tp}`; }
    // 🐭 전투력 게이지 (찍찍!! 아이콘 = FR_IMG.ui_ratface): 눈금(75% 지점) = 이 층 적정 찍찍!! → 넘으면 초록
    if (G.power !== undefined) {
      const need = powNeed(S.floor), k = G.power / need;
      $('pow').textContent = fmt(G.power);
      $('powBar').style.width = Math.min(100, k * 75).toFixed(1) + '%';
      $('powBar').className = k >= 1 ? 'ok' : k >= 0.5 ? 'mid' : 'low';
      $('powSub').textContent = `${isBossFloor(S.floor) ? '👹' : '🪜'} ${S.floor}층 적정 ${fmt(need)} · ${k >= 1 ? '충분!' : Math.floor(k * 100) + '%'}`;
      const g = G.powGain;
      if (g && g.n !== powGainN) { powGainN = g.n; const e = $('powGain'); e.textContent = `+${fmt(g.v)}`; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); $('pow').classList.remove('pop'); void $('pow').offsetWidth; $('pow').classList.add('pop'); }
    }

    // 계단 방은 열리기 전엔 어디인지 알려주지 않음 (벽 체력도 안 보여줌)
    const stairsTxt = isOpen(...STAIRS) ? (G.bossFight ? '👹 보스를 쓰러뜨려라!' : '🪜 계단으로!') : `방 ${OPEN.size}/${LAYOUT.size} · 계단 방을 찾아라`;
    $('zone').textContent = `🏢 ${S.floor}층 ${zoneOf().name} · ${stairsTxt}`;
    const ask = G.climbAsk && !G.trans; $('btnClimb').classList.toggle('hidden', !ask);
    if (ask) $('btnClimb').textContent = `👹 ${S.floor + 1}층 보스 재도전!`;
    const pn = ratCount(), full = pn >= popCap();
    $('popN').textContent = `${pn}/${popCap()}`; $('popN').classList.toggle('full', full);
    $('popSub').textContent = full ? '가득! 승급·둥지로 늘리기' : '';
    $('dexN').textContent = `${Object.keys(S.seen).length}/${RSPECIES.length}`;
    document.querySelectorAll('.cheese-live').forEach(e => (e.textContent = fmt(S.cheese)));
    const na = affordableCount(); $('skBadge').classList.toggle('hidden', !na); $('skBadge').textContent = na;
    $('prBadge').classList.toggle('hidden', !TIERS.some((t, i) => canPromote(i)));
    const nf = Object.keys(S.fresh).length;
    $('dexBadge').classList.toggle('hidden', !nf); $('dexBadge').textContent = nf;
  }
  const canPromote = t => t < TIERS.length - 1 && tierOpen(t + 1) && G.rats.filter(r => r.tier === t && !r.temp).length >= PROMOTE_COST && ratCount() > PROMOTE_COST;

  // ── 스킬 트리 (공용 / 종별) ──
  let treeMode = 'common', selSkill = 'core', amt = 1;
  const picCache = {};
  function picURL(sp) { return picCache[sp.id] || (picCache[sp.id] = ratPic(sp, 96, 72).toDataURL()); }
  function treeCtx(mode = treeMode) {
    if (mode === 'common') return {
      list: RSKILLS, get: s => lv(s.id), set: (s, v) => { S.skills[s.id] = v; }, cost: (s, l) => skillCost(s, l),
      pos: s => [7 + s.grid[0] * 17.2, 88 - s.grid[1] * 19], name: s => s.name, icon: s => s.icon, desc: (s, l) => s.desc(l), cur: (s, l) => curEffect(s.desc(l)),
      reqOk: s => skillUnlocked(s.id) && (!s.req || lv(s.req[0]) >= s.req[1]), reqName: s => RSKILL_BY_ID[s.req[0]].name,
    };
    const sp = RSPECIES_BY_ID[mode];
    return {
      list: RAT_TREE, get: s => rsl(sp.id, s.id), set: (s, v) => { (S.rsk[sp.id] = S.rsk[sp.id] || {})[s.id] = v; }, cost: (s, l) => ratSkillCost(s, sp.id, l),
      pos: s => [31 + s.grid[0] * 19.5, 86 - s.grid[1] * 24], name: s => nodeName(sp, s), icon: s => (s.special ? sp.ab.icon : s.act === 'act' ? sp.act.icon : s.icon),
      desc: (s, l) => (s.special ? `${abDesc(sp, l)} → ${abDesc(sp, l + 1)}` : s.act ? actNodeDesc(sp, s, l) : s.desc(l)), reqOk: s => !s.req || rsl(sp.id, s.req[0]) >= s.req[1],
      cur: (s, l) => (s.special ? abDesc(sp, l) : s.act === 'act' ? actDesc(sp, l, rsl(sp.id, 'actPow')) : s.act === 'pow' ? `${sp.act.name} 위력 ×${actPower(sp, l, rsl(sp.id, 'ult')).toFixed(1)}` : s.act === 'x' ? `각성: ${ACT_TYPES[sp.act.type].x}` : curEffect(s.desc(l))),
      reqName: s => nodeName(sp, RAT_TREE_BY_ID[s.req[0]]),
    };
  }
  // 종별 트리 노드 이름: 특수 능력·특수 액션 노드는 그 종 고유 이름으로
  function nodeName(sp, s) {
    if (s.special) return sp.ab.name;
    if (s.act === 'act') return sp.act.name;
    if (s.act === 'pow') return sp.act.name + ' 위력';
    if (s.act === 'x') return sp.act.name + ' 각성';
    return s.name;
  }
  function actNodeDesc(sp, s, l) {
    const pw = rsl(sp.id, 'actPow'), ult = rsl(sp.id, 'ult');
    if (s.act === 'act') return l ? `${actDesc(sp, l, pw)}\n\n다음 레벨: 발동 확률·빈도 ×${actK(l).toFixed(1)} → ×${actK(l + 1).toFixed(1)}` : `[해금] ${actDesc(sp, 1, pw)}`;
    if (s.act === 'pow') return `${sp.act.name} 위력 ×${actPower(sp, l, ult).toFixed(1)} → ×${actPower(sp, l + 1, ult).toFixed(1)}\n${ACT_TYPES[sp.act.type].d(actPower(sp, l + 1, ult))}`;
    return `각성: ${ACT_TYPES[sp.act.type].x}`;
  }
  const isMax = (T, s) => s.max && T.get(s) >= s.max;
  const herdIds = () => [...new Set(G.rats.map(r => r.sp.id))];
  function affordableCount() {
    let n = 0;
    for (const mode of ['common']) { const T = treeCtx(mode); for (const s of T.list) if (T.reqOk(s) && !isMax(T, s) && S.cheese >= T.cost(s, T.get(s))) n++; }
    return n;
  }
  function buyCount(T, s) {
    if (!T.reqOk(s) || isMax(T, s)) return { n: 0, cost: 0 };
    let n = 0, cost = 0, l = T.get(s);
    const lim = amt === 'max' ? 10000 : amt;
    while (n < lim && (!s.max || l < s.max)) { const c = T.cost(s, l); if (amt === 'max' && cost + c > S.cheese) break; cost += c; n++; l++; }
    return { n, cost };
  }
  function buildTabs() {
    // 지금 무리에 있는 종 (높은 등급 먼저) + 도감에만 있는 종
    const inHerd = new Set(herdIds());
    const list = RSPECIES.filter(s => ratKnown(s.id)).sort((a, b) => (inHerd.has(b.id) - inHerd.has(a.id)) || b.tier - a.tier);
    $('treeTabs').innerHTML = `<button class="tab ${treeMode === 'common' ? 'on' : ''}" data-m="common">🌍 공용</button>` +
      list.map(s => `<button class="tab cat ${treeMode === s.id ? 'on' : ''} ${inHerd.has(s.id) ? '' : 'away'}" data-m="${s.id}" title="${s.name}" style="--rc:${TIERS[s.tier].col}"><img src="${picURL(s)}"><span>${s.name}</span></button>`).join('');
    for (const b of document.querySelectorAll('#treeTabs .tab')) b.onclick = () => { treeMode = b.dataset.m; selSkill = treeMode === 'common' ? 'core' : 'dmg'; Sfx.click(); buildTree(); };
    const on = document.querySelector('#treeTabs .tab.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  // ── 공용 트리: 방사형 지도 (빌즈 머스트 비 페이드 방식) ──
  // 가운데 '반란의 시작'에서 사방으로. 찍을 수 있는 노드 + 그 바로 옆 '?' 만 보이고 나머지는 숨김. 드래그로 둘러보기, 휠로 확대
  const MAP_STEP = 96, MAP_R = 6;
  const BR_COL = { core: '#f0c878', gnaw: '#d9786a', pack: '#8fc98b', loot: '#e6c35a', trick: '#b59ad6', escape: '#8fb3d7', special: '#f09a5a' };
  let mapPan = null, mapZoom = 1, mapDrag = null, mapMoved = false;
  function mapState(s) {
    if (lv(s.id) > 0) return 'own';
    if (!skillUnlocked(s.id)) { const p = s.req && RSKILL_BY_ID[s.req[0]]; return !p || lv(p.id) > 0 ? 'tlock' : 'hide'; }   // 🏅 티어가 모자람
    if (!s.req || lv(s.req[0]) >= s.req[1]) return 'open';
    const p = RSKILL_BY_ID[s.req[0]];
    return lv(p.id) > 0 || !p.req || lv(p.req[0]) >= p.req[1] ? 'hint' : 'hide';
  }
  function applyPan(inner) { inner.style.transform = `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`; }
  function buildMap(T, host) {
    const W = (MAP_R * 2 + 1) * MAP_STEP, C = W / 2, at = s => [C + s.pos[0] * MAP_STEP, C + s.pos[1] * MAP_STEP];
    host.innerHTML = `<div class="tmap"><div class="tmap-in" style="width:${W}px;height:${W}px"></div><div class="tmap-hint">드래그로 둘러보기 · 휠로 확대 · 찍으면 옆 노드가 드러나요</div></div>`;
    const view = host.firstChild, inner = view.firstChild;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', W); svg.setAttribute('height', W); svg.classList.add('mlinks');
    for (const s of T.list) {
      if (!s.req) continue;
      const p = RSKILL_BY_ID[s.req[0]], st = mapState(s), ps = mapState(p);
      if (st === 'hide' || ps === 'hide') continue;
      const [x1, y1] = at(p), [x2, y2] = at(s), l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => l.setAttribute(k, v));
      l.setAttribute('class', st === 'own' ? 'on' : st === 'open' ? 'open' : 'off'); l.style.setProperty('--bc', BR_COL[s.br] || '#fff');
      svg.appendChild(l);
    }
    inner.appendChild(svg);
    for (const s of T.list) {
      const st = mapState(s); if (st === 'hide') continue;
      const b = document.createElement('button'), l = T.get(s), [x, y] = at(s);
      b.className = `node mnode ${st}${s.key ? ' key' : ''}${isMax(T, s) ? ' maxed' : ''}${s.id === selSkill ? ' sel' : ''}`;
      b.dataset.id = s.id; b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.setProperty('--bc', BR_COL[s.br] || '#fff');
      b.innerHTML = st === 'tlock' ? `<span class="ic">🔒</span><span class="nm">🎖️ 훈장 ${SKILL_RANK[s.id]}</span>` : st === 'hint' ? '<span class="ic">?</span>'
        : `<span class="ic">${T.icon(s)}</span><span class="lv">${l}${s.max ? '/' + s.max : ''}</span><span class="nm">${T.name(s)}</span>` + (!isMax(T, s) ? `<span class="cost">🧀${fmt(T.cost(s, l))}</span>` : '');
      b.onclick = () => { if (mapMoved) return; Sfx.resume(); if (st === 'hint') { selSkill = s.id; Sfx.click(); buildTree(); return; } if (selSkill === s.id) buy(); else { selSkill = s.id; Sfx.click(); buildTree(); } };
      inner.appendChild(b);
    }
    // 처음 열면 가운데(반란의 시작)가 화면 가운데
    const vw = host.clientWidth || 800, vh = host.clientHeight || 500;
    if (!mapPan) mapPan = { x: vw / 2 - C * mapZoom, y: vh / 2 - C * mapZoom };
    applyPan(inner);
    // 포인터 캡처는 실제로 드래그가 시작될 때만 (누르자마자 캡처하면 클릭이 노드 버튼이 아니라 지도로 가서 노드가 안 눌렸음)
    view.onpointerdown = e => { mapDrag = { x: e.clientX, y: e.clientY, px: mapPan.x, py: mapPan.y, id: e.pointerId }; mapMoved = false; };
    view.onpointermove = e => { if (!mapDrag) return; const dx = e.clientX - mapDrag.x, dy = e.clientY - mapDrag.y; if (!mapMoved && Math.abs(dx) + Math.abs(dy) > 6) { mapMoved = true; try { view.setPointerCapture(mapDrag.id); } catch (_) {} view.classList.add('drag'); } if (!mapMoved) return; mapPan.x = mapDrag.px + dx; mapPan.y = mapDrag.py + dy; applyPan(inner); };
    view.onpointerup = view.onpointercancel = () => { mapDrag = null; view.classList.remove('drag'); setTimeout(() => { mapMoved = false; }, 0); };
    view.onwheel = e => { e.preventDefault(); const r = view.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, z0 = mapZoom; mapZoom = clamp(mapZoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.5, 1.5); mapPan.x = mx - (mx - mapPan.x) * mapZoom / z0; mapPan.y = my - (my - mapPan.y) * mapZoom / z0; applyPan(inner); };
  }
  function buildTree() {
    buildTabs();
    const T = treeCtx(), host = $('treeArea');
    if (treeMode === 'common') { buildMap(T, host); renderSkillDetail(); refreshTreeAfford(); return; }
    host.innerHTML = '<div class="tree-inner"></div>';
    const area = host.firstChild;
    if (treeMode !== 'common') {
      const sp = RSPECIES_BY_ID[treeMode], t = TIERS[sp.tier], n = G.rats.filter(r => r.sp.id === sp.id).length, sh = shardLevel(sp.id);
      const box = document.createElement('div'); box.className = 'tree-cat';
      box.appendChild(ratPic(sp, 200, 150));
      box.insertAdjacentHTML('beforeend', `<b>${sp.name}</b><small><span class="rar" style="background:${t.col}">${t.name}</span> 무리에 ${n}마리</small><div class="shard"><b>⭐ 조각 강화 Lv ${sh.L}</b><div class="bar"><i style="width:${sh.need ? (sh.have / sh.need * 100).toFixed(1) : 100}%"></i></div><small>${sh.need ? `조각 ${sh.have}/${sh.need} · 같은 쥐를 또 얻으면 +1 · 강화는 로비에서` : '최대 레벨!'}</small></div><div class="ab-card">${sp.ab.icon} <b>${sp.ab.name}</b><small>${abDesc(sp, rsl(sp.id, 'special'))}</small></div>${sp.ult ? `<div class="ab-card ult">${sp.ult.fx} <b>필살기 · ${sp.ult.name}</b><small>가끔 컷씬과 함께 발동: ${ULT_TYPES[sp.ult.type]}</small></div>` : ''}<div class="ab-card act">${sp.act.icon} <b>${sp.act.name}</b><small>${rsl(sp.id, 'act') ? actDesc(sp, rsl(sp.id, 'act'), rsl(sp.id, 'actPow')) : '🔒 조각 강화로 해금 · ' + actDesc(sp, 1, 0)}</small></div>`);
      host.prepend(box);
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.classList.add('links');
    for (const s of T.list) {
      if (!s.req) continue;
      const r = T.list.find(o => o.id === s.req[0]), [x1, y1] = T.pos(r), [x2, y2] = T.pos(s);
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => l.setAttribute(k, v));
      l.setAttribute('class', T.reqOk(s) ? (T.get(s) ? 'on' : 'open') : 'off'); l.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(l);
    }
    area.appendChild(svg);
    for (const s of T.list) {
      const b = document.createElement('button'), ok = T.reqOk(s), l = T.get(s);
      b.className = 'node' + (ok ? '' : ' locked') + (isMax(T, s) ? ' maxed' : '') + (s.id === selSkill ? ' sel' : '') + (s.special ? ' special' : '');
      b.dataset.id = s.id;
      const [px, py] = T.pos(s); b.style.left = px + '%'; b.style.top = py + '%';
      b.innerHTML = `<span class="nm">${T.name(s)}</span><span class="ic">${ok ? T.icon(s) : '🔒'}</span><span class="lv">${l}${s.max ? '/' + s.max : ''}</span>` + (ok && !isMax(T, s) && treeMode === 'common' ? `<span class="cost">🧀${fmt(T.cost(s, l))}</span>` : '');
      if (treeMode !== 'common' && !l) b.classList.add('dim');
      b.onclick = () => { Sfx.resume(); if (selSkill === s.id) buy(); else { selSkill = s.id; Sfx.click(); buildTree(); } };
      area.appendChild(b);
    }
    renderSkillDetail(); refreshTreeAfford();
  }
  function refreshTreeAfford() {
    const T = treeCtx();
    for (const b of document.querySelectorAll('#treeArea .node')) { const s = T.list.find(o => o.id === b.dataset.id); if (s) b.classList.toggle('afford', treeMode === 'common' && T.reqOk(s) && !isMax(T, s) && S.cheese >= T.cost(s, T.get(s))); }
    renderSkillDetail(true);
  }
  function renderSkillDetail(onlyButton) {
    const T = treeCtx(), s = T.list.find(o => o.id === selSkill) || T.list[0], btn = $('dBuy');
    if (treeMode === 'common' && mapState(s) === 'tlock') {
      if (!onlyButton) { $('dIcon').textContent = '🔒'; $('dName').textContent = s.name; $('dLv').textContent = ''; $('dDesc').style.whiteSpace = 'pre-line'; $('dDesc').textContent = `${s.desc(0)}\n\n🎖️ 훈장 ${SKILL_RANK[s.id]} 에서 해금 (아지트 칠판에서 훈장 달기)`; }
      btn.textContent = `🔒 🎖️ 훈장 ${SKILL_RANK[s.id]} 필요`; btn.disabled = true; return;
    }
    if (treeMode === 'common' && mapState(s) === 'hint') {
      if (!onlyButton) { $('dIcon').textContent = '❓'; $('dName').textContent = '???'; $('dLv').textContent = ''; $('dDesc').textContent = `아직 모르는 스킬.\n${RSKILL_BY_ID[s.req[0]].name}을(를) Lv${s.req[1]} 까지 찍으면 드러나요.`; }
      btn.textContent = `🔒 ${RSKILL_BY_ID[s.req[0]].name} Lv${s.req[1]} 필요`; btn.disabled = true; return;
    }
    if (!onlyButton) {
      $('dIcon').textContent = T.icon(s); $('dName').textContent = T.name(s);
      $('dLv').textContent = `Lv ${T.get(s)}${s.max ? ' / ' + s.max : ' (무한)'}`;
      // 찍은 스킬은 지금 효과를, 만렙이면 만렙 효과를 보여줌
      const l = T.get(s); $('dDesc').style.whiteSpace = 'pre-line';
      $('dDesc').textContent = isMax(T, s) ? `✨ 최대 레벨 달성!\n\n현재 효과: ${T.cur(s, l)}` : l ? `현재 효과: ${T.cur(s, l)}\n\n다음 레벨: ${T.desc(s, l)}` : T.desc(s, l);
    }
    document.querySelector('.amt').classList.toggle('hidden', treeMode !== 'common');
    document.querySelector('.d-tip').classList.toggle('hidden', treeMode !== 'common');
    if (treeMode !== 'common') { btn.textContent = T.get(s) ? `✅ 찍힘 Lv ${T.get(s)}` : '⭐ 아지트 쳇바퀴 훈련에서 조각으로 강화'; btn.disabled = true; return; }
    if (!T.reqOk(s)) { btn.textContent = `🔒 ${T.reqName(s)} Lv${s.req[1]} 필요`; btn.disabled = true; return; }
    if (isMax(T, s)) { btn.textContent = '✨ MAX'; btn.disabled = true; return; }
    if (S.inRun) { btn.textContent = '🔒 아지트 치즈 창고에서 (탈출이 끝나면)'; btn.disabled = true; return; }   // 업그레이드는 아웃게임에서만
    const { n, cost } = buyCount(T, s);
    btn.textContent = `🧀 ${fmt(n ? cost : T.cost(s, T.get(s)))} (+${Math.max(1, n)})`;
    btn.disabled = !n || S.cheese < cost;
  }
  function buy() {
    if (treeMode !== 'common' || S.inRun) { Sfx.deny(); return; }   // 종별 트리는 조각으로 자동(보기 전용) · 공용 스킬은 탈출이 끝난 뒤 아지트에서만
    const T = treeCtx(), s = T.list.find(o => o.id === selSkill), { n, cost } = buyCount(T, s);
    if (!n || S.cheese < cost) { Sfx.deny(); return; }
    S.cheese -= cost; T.set(s, T.get(s) + n); Sfx.buy(); writeSave(); buildTree(); hud();
    const node = document.querySelector(`#treeArea .node[data-id="${s.id}"]`);
    if (node) { node.classList.add('pop'); domBurst(node, T.icon(s)); }
  }
  function domBurst(el, icon) {
    const r = el.getBoundingClientRect(), hr = $('fxLayer').getBoundingClientRect();
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('span'); p.className = 'fxp'; p.textContent = i % 3 ? ['✨', '🧀'][i % 2] : icon;
      const a = i / 12 * 6.28, d = 60 + Math.random() * 60;
      p.style.left = (r.left - hr.left + r.width / 2) + 'px'; p.style.top = (r.top - hr.top + r.height / 2) + 'px';
      p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d + 'px');
      $('fxLayer').appendChild(p); setTimeout(() => p.remove(), 800);
    }
  }
  function openTree(mode) { treeMode = mode; selSkill = mode === 'common' ? 'core' : 'dmg'; hide('dex'); hide('promo'); openPanel('tree', buildTree); }

  // ── 스탯 ── (지금 능력치 + 찍은 공용 스킬의 현재/만렙 효과 + 조각 강화 상위 종)
  function renderStats() {
    const row = (k, v) => `<div class="st-row"><span>${k}</span><b>${v}</b></div>`;
    const tiers = TIERS.map((t, i) => [t, G.rats.filter(r => r.tier === i && !r.temp).length]).filter(([, n]) => n).map(([t, n]) => `<span class="rar" style="background:${t.col}">${t.name} ${n}</span>`).join(' ');
    const beat = Object.keys(S.bossBeat || {}).map(Number).sort((a, b) => a - b);
    const sk = RSKILLS.filter(s => lv(s.id)).map(s => { const max = s.max && lv(s.id) >= s.max; return `<div class="st-skill${max ? ' max' : ''}"><span class="ic">${s.icon}</span><div><b>${s.name} <small>Lv ${lv(s.id)}${s.max ? '/' + s.max : ''}${max ? ' ✨MAX' : ''}</small></b><small>${curEffect(s.desc(lv(s.id)))}</small></div></div>`; }).join('') || '<p class="desc">아직 찍은 스킬이 없어요</p>';
    const shards = Object.keys(S.seen).map(id => [RSPECIES_BY_ID[id], shardLevel(id)]).filter(([sp, s]) => sp && s.L).sort((a, b) => b[1].L - a[1].L || b[0].tier - a[0].tier).slice(0, 12)
      .map(([sp, s]) => `<div class="st-row"><span><span style="color:${shade(TIERS[sp.tier].col, -0.25)}">●</span> ${sp.name}</span><b>⭐ Lv ${s.L}</b></div>`).join('') || '<p class="desc">같은 쥐를 또 얻으면 조각이 모여요</p>';
    $('statsBody').innerHTML = `
      <div class="st-col panel"><h3>🏢 탈출 현황</h3>
        ${row('현재 층', `${S.floor}층 · ${zoneOf().name}`)}${row('최고 기록', `${S.maxFloor || 1}층`)}
        ${row('다음 보스', `${Math.ceil((S.floor + 0.01) / BOSS_EVERY) * BOSS_EVERY}층`)}${row('격파한 보스', beat.length ? beat.map(f => f + '층').join(', ') : '-')}
        ${S.bossFail ? row('재도전 대기', `${S.bossFail}층 보스`) : ''}
        <h3>🐀 무리</h3>
        ${row('쥐', `${ratCount()} / ${popCap()}마리${popFull() ? ' (가득 · 탄생 멈춤)' : ''}`)}<div class="st-tiers">${tiers}</div>
        ${row('번식 쿨타임', `${breedCool().toFixed(1)}초`)}${row('번식 확률', `${Math.round(breedChance() * 100)}% (쥐가 많을수록 ↓)`)}${row('이동 속도', `+${Math.round(8 * lv('speed'))}%`)}
        ${row('윗등급 탄생 보정', `🎖️ 훈장 ${rankOf()} ×${rankOddsK().toFixed(2)} · 돌연변이 +${lv('mutate') * 3}%`)}${row('📑 연구자료', `${fmt(S.research || 0)} (이번 판 +${fmt(S.runResearch || 0)})`)}${row('⏳ 남은 시간', `${Math.ceil(S.timeLeft || 0)}초`)}</div>
      <div class="st-col panel"><h3>⚔️ 공격</h3>
        ${row('전투력', `${fmt(ratPower())} 찍찍!!`)}${row('갉는 힘', `×${fx(Math.pow(1.2, lv('teeth')))}`)}${row('벽에 주는 피해', `×${fx(digMult())}`)}
        ${row('크리티컬 확률', `${5 + 2 * lv('critc')}%`)}${row('총공격', `${rushTime().toFixed(1)}초 · 피해 ×${rushMult().toFixed(1)}`)}
        ${row('AIR 저글링 보너스', `×${(1 + 0.5 * lv('tumble')).toFixed(1)} (최대 ${AIR_MAX}회)`)}
        <h3>🧀 수입</h3>
        ${row('초당 치즈', fmt(S.ips))}${row('치즈 배율', `×${fx(Math.pow(1.15, lv('cheese')))}`)}${row('도감 보너스', `×${dexBonus().toFixed(2)}`)}
        ${row('황금 물건', `${lv('goldx') * 2}%`)}${row('물건 솟아남', `${spawnInterval().toFixed(2)}초마다 ${spawnBatch()}개`)}${row('🚀 로켓배송', `${waveCool()}초마다 ${waveSize()}개`)}</div>
      <div class="st-col panel"><h3>🌳 찍은 공용 스킬</h3><div class="st-skills">${sk}</div>
        <h3>⭐ 조각 강화</h3>${shards}</div>`;
  }

  // ── 승급 ──
  // 승급 패널: 줄은 한 번만 만들고, 이후엔 숫자·그림·버튼 상태만 바꾼다 (다시 그리면 클릭이 씹힘)
  let promoRows = null;
  function buildPromo() {
    const L = $('prList'); L.innerHTML = ''; promoRows = [];
    TIERS.forEach((t, i) => {
      const row = document.createElement('div'); row.className = 'row'; row.style.setProperty('--rc', t.col);
      const pics = document.createElement('div'); pics.className = 'pics';
      const tx = document.createElement('div'); tx.className = 'tx';
      tx.innerHTML = `<b style="color:${shade(t.col, -0.25)}">${t.name}</b> <span class="num"></span><small>${i < TIERS.length - 1 ? `${PROMOTE_COST}마리 희생 → <b style="color:${shade(TIERS[i + 1].col, -0.25)}">${TIERS[i + 1].name}</b> 중 무작위 1마리 · 기본 힘 ×${t.dmg} · 능력 세기 ×${t.ab}` : `최고 등급 · 기본 힘 ×${t.dmg} · 능력 세기 ×${t.ab}`}</small>`;
      row.append(pics, tx);
      let b = null;
      if (i < TIERS.length - 1) {
        b = document.createElement('button'); b.className = 'big'; b.textContent = '승급!';
        b.onclick = () => { const sp = promote(i); if (!sp) return Sfx.deny(); toast(sp, `승급 성공! ${TIERS[sp.tier].name}`, sp.name); renderPromo(); hud(); };
        row.appendChild(b);
      }
      L.appendChild(row);
      promoRows.push({ pics, num: tx.querySelector('.num'), b, sig: '' });
    });
  }
  function renderPromo() {
    if (!promoRows) buildPromo();
    const w = tierWeights(), sum = w.reduce((a, b) => a + b, 0);
    const odds = '<span style="--rc:transparent">🍼 지금 태어날 확률</span>' + TIERS.map((t, i) => `<span style="--rc:${t.col}">${t.name} ${oddsPct(w[i] / sum)}</span>`).join('');
    if ($('odds').innerHTML !== odds) $('odds').innerHTML = odds;
    TIERS.forEach((t, i) => {
      const R = promoRows[i], mine = G.rats.filter(r => r.tier === i);
      R.num.textContent = `${mine.length}마리`;
      const sig = mine.slice(0, 6).map(r => r.sp.id).join();
      if (sig !== R.sig) { R.sig = sig; R.pics.innerHTML = ''; for (const r of mine.slice(0, 6)) R.pics.appendChild(ratPic(r.sp, 64, 48)); }
      if (R.b) R.b.disabled = !canPromote(i);
    });
  }

  // ── 도감 ──
  function renderDex() {
    const g = $('dexGrid'); g.innerHTML = '';
    const counts = {}; for (const r of G.rats) counts[r.sp.id] = (counts[r.sp.id] || 0) + 1;
    $('dexSum').textContent = `발견 ${RSPECIES.filter(sp => ratKnown(sp.id)).length}/${RSPECIES.length} · 종마다 치즈 +3%`;
    // 등급별로 묶고, 그 안은 훈장 해금 순 (안 열린 종은 카드 안에 "훈장 N 가면 해금!!"). 데이터 순서가 등급과 달라도 섞이지 않게
    const order = TIERS.flatMap((_, t) => RSPECIES.filter(sp => sp.tier === t).sort((p, q) => (SPECIES_RANK[p.id] || 1) - (SPECIES_RANK[q.id] || 1)));
    let tier = -1;
    for (const sp of order) {
      if (sp.tier !== tier) {
        tier = sp.tier;
        const all = RSPECIES.filter(x => x.tier === tier), found = all.filter(x => ratKnown(x.id)).length, open = all.filter(x => speciesUnlocked(x.id)).length;
        const h = document.createElement('div'); h.className = 'tier-h';
        h.innerHTML = `<span style="color:${shade(tierCol(tier), -0.25)}">●</span> ${TIERS[tier].name} <small>발견 ${found}/${all.length} · 열림 ${open}/${all.length}</small>`;
        g.appendChild(h);
      }
      const known = ratKnown(sp.id);   // 훈장이 모자라면 예전에 만났어도 실루엣(???)
      const c = document.createElement('div'); c.className = 'card' + (dexSel === sp.id ? ' sel' : ''); c.style.setProperty('--rc', tierCol(sp.tier));
      const pic = document.createElement('div'); pic.className = 'pic'; pic.appendChild(ratPic(sp, 160, 120, known));
      c.appendChild(pic);
      if (!speciesUnlocked(sp.id)) c.classList.add('rlock');
      c.insertAdjacentHTML('beforeend', `<div class="nm">${known ? sp.name : '???'}</div>${speciesUnlocked(sp.id) ? '' : `<div class="unlock-tag">🎖️ 훈장 ${SPECIES_RANK[sp.id]} 가면 해금!!</div>`}<div class="lvl">${counts[sp.id] ? '🐀 ×' + counts[sp.id] : '&nbsp;'}</div>${known && S.fresh[sp.id] ? '<span class="new">NEW</span>' : ''}`);
      c.onclick = () => { dexSel = sp.id; delete S.fresh[sp.id]; renderDex(); hud(); };
      g.appendChild(c);
    }
    const d = $('dexDetail'); d.innerHTML = '';
    const sp = RSPECIES_BY_ID[dexSel];
    if (!sp) { d.innerHTML = '<p class="desc">쥐를 눌러 보세요</p>'; return; }
    const known = ratKnown(sp.id), t = TIERS[sp.tier];
    d.appendChild(ratPic(sp, 260, 195, known));
    d.insertAdjacentHTML('beforeend', `<span class="rar" style="background:${t.col}">${t.name}</span><h3>${known ? sp.name : '???'}</h3><p class="desc">${known ? sp.desc : speciesUnlocked(sp.id) ? '아직 만나지 못한 쥐' : `🎖️ 훈장 ${SPECIES_RANK[sp.id]} 을 달면 오는 친구`}</p>
      <div class="ab-card">${known ? sp.ab.icon : '❔'} <b>${known ? sp.ab.name : '???'}</b><small>${known ? abDesc(sp, rsl(sp.id, 'special')) : '만나면 알 수 있어요'}</small></div>
      ${sp.ult ? `<div class="ab-card ult">${known ? sp.ult.fx : '❔'} <b>필살기 · ${known ? sp.ult.name : '???'}</b><small>${known ? '가끔 컷씬과 함께 발동: ' + ULT_TYPES[sp.ult.type] : '전설 이상 쥐의 필살기'}</small></div>` : ''}
      <div class="ab-card act">${known ? sp.act.icon : '❔'} <b>${known ? sp.act.name : '???'}</b><small>${known ? (rsl(sp.id, 'act') ? '' : '🔒 조각 강화로 해금 · ') + actDesc(sp, rsl(sp.id, 'act'), rsl(sp.id, 'actPow')) : '특수 액션'}</small></div>
      <div class="stats"><div>기본 힘<b>×${t.dmg}</b></div><div>크기<b>×${t.size}</b></div><div>⭐ 조각 강화<b>Lv ${shardLevel(sp.id).L}</b></div><div>지금 무리에<b>${counts[sp.id] || 0}마리</b></div></div>`);
    if (known) { const b = document.createElement('button'); b.className = 'big'; b.textContent = '🌳 스킬 트리'; b.onclick = () => openTree(sp.id); d.appendChild(b); }
  }

  // ── 알림 ──
  function toast(sp, title, sub, isNew) {
    const box = $('toasts');
    const el = document.createElement('div'); el.className = 'toast' + (isNew ? ' new' : ''); el.style.setProperty('--rc', tierCol(sp.tier));
    el.appendChild(ratPic(sp, 96, 72));
    const tx = document.createElement('div'); tx.innerHTML = `<b>${title}</b><small>${sub}</small>`; el.appendChild(tx);
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.remove(), 5200);
  }
  function showNew() {
    if (!ncQueue.length || !$('newcat').classList.contains('hidden')) return;
    const sp = ncQueue.shift(), t = TIERS[sp.tier];
    $('ncPic').innerHTML = ''; $('ncPic').appendChild(ratPic(sp, 320, 240));
    $('ncRar').textContent = t.name; $('ncRar').style.background = t.col;
    $('ncName').textContent = sp.name; $('ncDesc').textContent = sp.desc;
    show('newcat'); Sfx.clear();
  }
  function onBirth(sp, isNew, isBirth) {
    if (isNew && sp.tier >= 2) ncQueue.push(sp), showNew();
    else if (isNew) toast(sp, `신종 발견! ${sp.name}`, `${TIERS[sp.tier].name} · ${sp.desc}`, true);
    else if (isBirth && sp.tier >= 2) toast(sp, `${TIERS[sp.tier].name} 탄생!`, sp.name);
  }

  // 일괄 승급: 가능한 등급을 낮은 것부터 반복 (승급으로 생긴 쥐도 다시 모이면 계속).
  // 번식할 쥐는 PROMO_KEEP 마리 남겨둠 (초반에 눌러서 2마리만 남으면 번식이 멈춤 — 시뮬에서 발견)
  // 일괄 승급이 한 번이라도 되나 (버튼이 켜져 있는데 눌러도 안 되는 일이 없게)
  const canPromoteAll = () => ratCount() - PROMOTE_COST + 1 >= PROMO_KEEP && TIERS.some((t, i) => canPromote(i));
  function promoteAll() {
    const got = {}; let n = 0;
    for (let guard = 0; guard < 500; guard++) {
      if (G.rats.filter(r => !r.temp).length - PROMOTE_COST + 1 < PROMO_KEEP) break;
      const t = TIERS.findIndex((_, i) => canPromote(i)); if (t < 0) break;
      const sp = promote(t); if (!sp) break;
      got[sp.tier] = (got[sp.tier] || 0) + 1; n++;
    }
    if (!n) { Sfx.deny(); toast(RSPECIES[0], '⏫ 일괄 승급할 수 없어요', `같은 등급 ${PROMOTE_COST}마리 + 번식용 ${PROMO_KEEP}마리는 남겨둬요`); return; }
    const top = Math.max(...Object.keys(got).map(Number));
    toast(G.rats.find(r => r.tier === top)?.sp || RSPECIES[0], `⏫ 일괄 승급 ${n}회!`, Object.entries(got).map(([t, c]) => `${TIERS[t].name} ${c}마리`).join(' · '));
    renderPromo(); hud(); Sfx.clear();
  }
  function openPanel(id, render) { render(); show(id); Sfx.click(); }
  // 판(런) 화면 켜기: 이어하기면 오프라인 보상도
  function beginPlay(resume) {
    show('hud'); show('dock'); show('hint'); show('tierPanel');
    setTimeout(() => hide('hint'), 9000);
    G.running = true; S.started = true;
    const off = resume && offlineReward();
    if (off) { $('offText').textContent = `${fmtTime(off.away)} 동안 쥐들이 몰래 갉아먹었어요`; $('offGain').textContent = fmt(off.gain); show('offline'); }
    writeSave(); hud();
  }
  function hideGame() { ['hud', 'dock', 'hint', 'tierPanel', 'btnClimb', 'tree', 'promo', 'dex', 'stats', 'ultPick', 'offline'].forEach(hide); }
  function init() {
    $('btnStart').onclick = () => {
      Sfx.resume(); hide('start');
      if (!S.inRun) { LOBBY.open(); return; }             // 진행 중인 판이 없으면 로비(아웃게임)
      beginPlay(true);
    };
    $('offOk').onclick = () => { hide('offline'); Sfx.buy(); };
    $('btnReset').onclick = () => show('resetAsk');
    $('btnReset2').onclick = () => { ['tree', 'promo', 'dex', 'stats'].forEach(hide); show('resetAsk'); Sfx.click(); };
    $('rsNo').onclick = () => hide('resetAsk');
    $('rsYes').onclick = () => { resetting = true; localStorage.removeItem(SAVE_KEY); location.reload(); };
    $('btnSkills').onclick = () => openTree('common');
    document.querySelectorAll('.amt button').forEach(b => (b.onclick = () => { amt = b.dataset.amt === 'max' ? 'max' : +b.dataset.amt; document.querySelectorAll('.amt button').forEach(o => o.classList.toggle('on', o === b)); renderSkillDetail(true); Sfx.click(); }));
    $('dBuy').onclick = buy;
    $('btnPromo').onclick = () => openPanel('promo', renderPromo);
    $('btnPromoAll').onclick = promoteAll;
    $('btnStats').onclick = () => openPanel('stats', renderStats);
    $('btnSave').onclick = () => { writeSave(); toast(RSPECIES[0], '💾 저장했어요', '판 진행·치즈·훈장·훈련이 이 브라우저에 쏙'); Sfx.buy(); };
    // 테스트용: 보스 4종을 차례로 화면 가운데에 소환 (자연 등장은 BOSS_EVERY 층마다)
    // 테스트용: 고양이 품종을 차례로 화면 가운데에 (체력·날리기·품종 스킬 확인)
    $('btnCat').onclick = () => { ['tree', 'promo', 'dex', 'stats'].forEach(hide); if (!testCat()) Sfx.deny(); };
    $('btnBoss').onclick = () => { ['tree', 'promo', 'dex', 'stats'].forEach(hide); if (!testBoss()) Sfx.deny(); };
    $('btnDex').onclick = () => openPanel('dex', renderDex);
    // 테스트용: 화면 가운데 쥐가 슈퍼 점프 강제 발동 (이미 진행 중이면 무시)
    $('btnSJ').onclick = () => { ['tree', 'promo', 'dex'].forEach(hide); if (!startSuperJump(true)) Sfx.deny(); };
    // 테스트용: 전설·신화 필살기 24종을 차례로 강제 발동 (화면에 없는 종은 잠깐 불러옴)
    // 테스트용: 필살기 목록에서 골라서 발동 (그 종이 화면에 없으면 잠깐 불러옴). 패러디 필살기는 맨 위에
    $('btnUlt').onclick = () => {
      ['tree', 'promo', 'dex', 'stats'].forEach(hide);
      const order = ULT_LIST.map((u, i) => i).sort((a, b) => (['zapham', 'parkrat', 'plaguerat', 'streamrat', 'starchef'].includes(ULT_LIST[b].id) - ['zapham', 'parkrat', 'plaguerat', 'streamrat', 'starchef'].includes(ULT_LIST[a].id)));
      $('ultList').innerHTML = order.map(i => { const u = ULT_LIST[i], sp = RSPECIES_BY_ID[u.id]; return `<button class="ult-pick" data-i="${i}" style="--rc:${TIERS[sp.tier].col}"><span class="ic">${u.fx}</span><b>${u.name}</b><small>${sp.name} · ${TIERS[sp.tier].name}</small></button>`; }).join('');
      for (const b of document.querySelectorAll('#ultList .ult-pick')) b.onclick = () => { hide('ultPick'); if (!testUlt(+b.dataset.i)) Sfx.deny(); };
      show('ultPick'); Sfx.click();
    };
    $('btnClimb').onclick = () => { Sfx.resume(); climb(); $('btnClimb').classList.add('hidden'); };
    $('btnMute').onclick = () => { S.muted = Sfx.toggle(); $('btnMute').textContent = S.muted ? '🔇' : '🔊'; };
    if (S.muted) { Sfx.toggle(); $('btnMute').textContent = '🔇'; }
    document.querySelectorAll('.close').forEach(b => (b.onclick = () => { b.closest('.screen').classList.add('hidden'); Sfx.click(); }));
    $('ncOk').onclick = () => { hide('newcat'); setTimeout(showNew, 300); };
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') ['tree', 'promo', 'dex', 'stats', 'ultPick'].forEach(hide);
    });
    // 패널이 열려 있으면 주기적으로 새로고침 (치즈 변동 반영)
    setInterval(() => {
      if (!G.running) return;
      hud();
      if (!$('tree').classList.contains('hidden')) refreshTreeAfford();
      if (!$('promo').classList.contains('hidden')) renderPromo();
      if (!$('stats').classList.contains('hidden')) renderStats();
      $('btnPromoAll').disabled = !canPromoteAll();
    }, 500);
    hud();
  }
  return { init, onBirth, hud, toast, ratPic, beginPlay, hideGame, show, hide, openTree, openDex: () => openPanel('dex', renderDex) };
})();
