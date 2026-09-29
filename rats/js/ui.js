'use strict';
// ───────────────────────── 쥐들의 반란: UI ─────────────────────────
const $ = id => document.getElementById(id);
const UI = (() => {
  let dexSel = null, ncQueue = [];

  // 쥐 그림 (이미지가 있으면 이미지, 없으면 코드 그림). 모르는 종은 실루엣
  function ratPic(sp, w = 160, h = 120, known = true) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d'), img = IMG['rat_' + sp.id];
    c.save();
    if (img) { const s = Math.min(w / img.width, h / img.height) * 0.9; c.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s); }
    else { const s = Math.min(w / 80, h / 55); c.translate(w / 2 + 4 * s, h * 0.78); c.scale(s, s); drawRodent(c, sp, { t: 0.3, walk: 0, moving: false, bite: 0, sleep: false }); }
    c.restore();
    if (!known) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = '#6b625a'; c.fillRect(0, 0, w, h); }
    return cv;
  }
  const tierCol = t => TIERS[t].col;

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  // ── HUD ──
  function hud() {
    $('cheese').textContent = fmt(S.cheese);
    $('ips').textContent = fmt(S.ips);
    $('ramp').textContent = `🔥 난동 등급 ${S.ramp}`;
    $('rampBar').style.width = (S.rampProg / rampNeed(S.ramp) * 100).toFixed(1) + '%';
    const w = tierWeights(), sum = w.reduce((a, b) => a + b, 0);
    const hi = TIERS.map((t, i) => [t, w[i] / sum]).filter(([, p], i) => i >= 1 && p >= 0.001).map(([t, p]) => `${t.name} ${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`).join(' · ');
    $('rampSub').textContent = `탄생 확률 · ${hi}`;
    const ww = weakestWall();
    $('zone').textContent = `방 ${OPEN.size}개` + (ww ? ` · 가장 약한 벽 🧱${fmt(Math.max(0, ww.hp))} (→ ${ww.zone.name})` : '');
    $('popN').textContent = `${G.rats.length}/${popCap()}`;
    $('dexN').textContent = `${Object.keys(S.seen).length}/${RSPECIES.length}`;
    document.querySelectorAll('.cheese-live').forEach(e => (e.textContent = fmt(S.cheese)));
    const na = affordableCount(); $('skBadge').classList.toggle('hidden', !na); $('skBadge').textContent = na;
    $('prBadge').classList.toggle('hidden', !TIERS.some((t, i) => canPromote(i)));
    const nf = Object.keys(S.fresh).length;
    $('dexBadge').classList.toggle('hidden', !nf); $('dexBadge').textContent = nf;
  }
  const canPromote = t => t < TIERS.length - 1 && G.rats.filter(r => r.tier === t).length >= PROMOTE_COST && G.rats.length > PROMOTE_COST;

  // ── 스킬 트리 (공용 / 종별) ──
  let treeMode = 'common', selSkill = 'teeth', amt = 1;
  const picCache = {};
  function picURL(sp) { return picCache[sp.id] || (picCache[sp.id] = ratPic(sp, 96, 72).toDataURL()); }
  function treeCtx(mode = treeMode) {
    if (mode === 'common') return {
      list: RSKILLS, get: s => lv(s.id), set: (s, v) => { S.skills[s.id] = v; }, cost: (s, l) => skillCost(s, l),
      pos: s => [7 + s.grid[0] * 17.2, 88 - s.grid[1] * 19], name: s => s.name, icon: s => s.icon, desc: (s, l) => s.desc(l),
      reqOk: s => !s.req || lv(s.req[0]) >= s.req[1], reqName: s => RSKILL_BY_ID[s.req[0]].name,
    };
    const sp = RSPECIES_BY_ID[mode];
    return {
      list: RAT_TREE, get: s => rsl(sp.id, s.id), set: (s, v) => { (S.rsk[sp.id] = S.rsk[sp.id] || {})[s.id] = v; }, cost: (s, l) => ratSkillCost(s, sp.id, l),
      pos: s => [30 + s.grid[0] * 26, 86 - s.grid[1] * 24], name: s => s.special ? sp.ab.name : s.name, icon: s => s.special ? sp.ab.icon : s.icon,
      desc: (s, l) => s.special ? `${abDesc(sp, l)} → ${abDesc(sp, l + 1)}` : s.desc(l), reqOk: s => !s.req || rsl(sp.id, s.req[0]) >= s.req[1],
      reqName: s => { const r = RAT_TREE_BY_ID[s.req[0]]; return r.special ? sp.ab.name : r.name; },
    };
  }
  const isMax = (T, s) => s.max && T.get(s) >= s.max;
  const herdIds = () => [...new Set(G.rats.map(r => r.sp.id))];
  function affordableCount() {
    let n = 0;
    for (const mode of ['common', ...herdIds()]) { const T = treeCtx(mode); for (const s of T.list) if (T.reqOk(s) && !isMax(T, s) && S.cheese >= T.cost(s, T.get(s))) n++; }
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
    const list = RSPECIES.filter(s => S.seen[s.id]).sort((a, b) => (inHerd.has(b.id) - inHerd.has(a.id)) || b.tier - a.tier);
    $('treeTabs').innerHTML = `<button class="tab ${treeMode === 'common' ? 'on' : ''}" data-m="common">🌍 공용</button>` +
      list.map(s => `<button class="tab cat ${treeMode === s.id ? 'on' : ''} ${inHerd.has(s.id) ? '' : 'away'}" data-m="${s.id}" title="${s.name}" style="--rc:${TIERS[s.tier].col}"><img src="${picURL(s)}"><span>${s.name}</span></button>`).join('');
    for (const b of document.querySelectorAll('#treeTabs .tab')) b.onclick = () => { treeMode = b.dataset.m; selSkill = treeMode === 'common' ? 'teeth' : 'dmg'; Sfx.click(); buildTree(); };
    const on = document.querySelector('#treeTabs .tab.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function buildTree() {
    buildTabs();
    const T = treeCtx(), host = $('treeArea');
    host.innerHTML = '<div class="tree-inner"></div>';
    const area = host.firstChild;
    if (treeMode !== 'common') {
      const sp = RSPECIES_BY_ID[treeMode], t = TIERS[sp.tier], n = G.rats.filter(r => r.sp.id === sp.id).length;
      const box = document.createElement('div'); box.className = 'tree-cat';
      box.appendChild(ratPic(sp, 200, 150));
      box.insertAdjacentHTML('beforeend', `<b>${sp.name}</b><small><span class="rar" style="background:${t.col}">${t.name}</span> 무리에 ${n}마리 · 비용 ×${t.cost}</small><div class="ab-card">${sp.ab.icon} <b>${sp.ab.name}</b><small>${abDesc(sp, rsl(sp.id, 'special'))}</small></div>`);
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
      b.innerHTML = `<span class="nm">${T.name(s)}</span><span class="ic">${ok ? T.icon(s) : '🔒'}</span><span class="lv">${l}${s.max ? '/' + s.max : ''}</span>` + (ok && !isMax(T, s) ? `<span class="cost">🧀${fmt(T.cost(s, l))}</span>` : '');
      b.onclick = () => { Sfx.resume(); if (selSkill === s.id) buy(); else { selSkill = s.id; Sfx.click(); buildTree(); } };
      area.appendChild(b);
    }
    renderSkillDetail(); refreshTreeAfford();
  }
  function refreshTreeAfford() {
    const T = treeCtx();
    for (const b of document.querySelectorAll('#treeArea .node')) { const s = T.list.find(o => o.id === b.dataset.id); if (s) b.classList.toggle('afford', T.reqOk(s) && !isMax(T, s) && S.cheese >= T.cost(s, T.get(s))); }
    renderSkillDetail(true);
  }
  function renderSkillDetail(onlyButton) {
    const T = treeCtx(), s = T.list.find(o => o.id === selSkill) || T.list[0], btn = $('dBuy');
    if (!onlyButton) {
      $('dIcon').textContent = T.icon(s); $('dName').textContent = T.name(s);
      $('dLv').textContent = `Lv ${T.get(s)}${s.max ? ' / ' + s.max : ' (무한)'}`;
      $('dDesc').textContent = isMax(T, s) ? '최대 레벨 달성!' : T.desc(s, T.get(s));
    }
    if (!T.reqOk(s)) { btn.textContent = `🔒 ${T.reqName(s)} Lv${s.req[1]} 필요`; btn.disabled = true; return; }
    if (isMax(T, s)) { btn.textContent = '✨ MAX'; btn.disabled = true; return; }
    const { n, cost } = buyCount(T, s);
    btn.textContent = `🧀 ${fmt(n ? cost : T.cost(s, T.get(s)))} (+${Math.max(1, n)})`;
    btn.disabled = !n || S.cheese < cost;
  }
  function buy() {
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
  function openTree(mode) { treeMode = mode; selSkill = mode === 'common' ? 'teeth' : 'dmg'; hide('dex'); hide('promo'); openPanel('tree', buildTree); }

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
    const odds = '<span style="--rc:transparent">🍼 지금 태어날 확률</span>' + TIERS.map((t, i) => `<span style="--rc:${t.col}">${t.name} ${(w[i] / sum * 100).toFixed(w[i] / sum < 0.01 ? 2 : 1)}%</span>`).join('');
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
    $('dexSum').textContent = `발견 ${Object.keys(S.seen).length}/${RSPECIES.length} · 종마다 치즈 +3%`;
    let tier = -1;
    for (const sp of RSPECIES) {
      if (sp.tier !== tier) { tier = sp.tier; const h = document.createElement('div'); h.className = 'tier-h'; h.innerHTML = `<span style="color:${shade(tierCol(tier), -0.25)}">●</span> ${TIERS[tier].name}`; g.appendChild(h); }
      const known = !!S.seen[sp.id];
      const c = document.createElement('div'); c.className = 'card' + (dexSel === sp.id ? ' sel' : ''); c.style.setProperty('--rc', tierCol(sp.tier));
      const pic = document.createElement('div'); pic.className = 'pic'; pic.appendChild(ratPic(sp, 160, 120, known));
      c.appendChild(pic);
      c.insertAdjacentHTML('beforeend', `<div class="nm">${known ? sp.name : '???'}</div><div class="lvl">${counts[sp.id] ? '🐀 ×' + counts[sp.id] : '&nbsp;'}</div>${S.fresh[sp.id] ? '<span class="new">NEW</span>' : ''}`);
      c.onclick = () => { dexSel = sp.id; delete S.fresh[sp.id]; renderDex(); hud(); };
      g.appendChild(c);
    }
    const d = $('dexDetail'); d.innerHTML = '';
    const sp = RSPECIES_BY_ID[dexSel];
    if (!sp) { d.innerHTML = '<p class="desc">쥐를 눌러 보세요</p>'; return; }
    const known = !!S.seen[sp.id], t = TIERS[sp.tier];
    d.appendChild(ratPic(sp, 260, 195, known));
    d.insertAdjacentHTML('beforeend', `<span class="rar" style="background:${t.col}">${t.name}</span><h3>${known ? sp.name : '???'}</h3><p class="desc">${known ? sp.desc : '아직 만나지 못한 쥐'}</p>
      <div class="ab-card">${known ? sp.ab.icon : '❔'} <b>${known ? sp.ab.name : '???'}</b><small>${known ? abDesc(sp, rsl(sp.id, 'special')) : '만나면 알 수 있어요'}</small></div>
      <div class="stats"><div>기본 힘<b>×${t.dmg}</b></div><div>크기<b>×${t.size}</b></div><div>스킬 레벨<b>${RAT_TREE.reduce((a, s) => a + rsl(sp.id, s.id), 0)}</b></div><div>지금 무리에<b>${counts[sp.id] || 0}마리</b></div></div>`);
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

  function openPanel(id, render) { render(); show(id); Sfx.click(); }
  function init() {
    $('btnStart').onclick = () => {
      Sfx.resume(); hide('start'); show('hud'); show('dock'); show('hint');
      setTimeout(() => hide('hint'), 9000);
      G.running = true; S.started = true;
      const off = offlineReward();
      if (off) { $('offText').textContent = `${fmtTime(off.away)} 동안 쥐들이 몰래 갉아먹었어요`; $('offGain').textContent = fmt(off.gain); show('offline'); }
      writeSave();
    };
    $('offOk').onclick = () => { hide('offline'); Sfx.buy(); };
    $('btnReset').onclick = () => show('resetAsk');
    $('btnReset2').onclick = () => { ['tree', 'promo', 'dex'].forEach(hide); show('resetAsk'); Sfx.click(); };
    $('rsNo').onclick = () => hide('resetAsk');
    $('rsYes').onclick = () => { resetting = true; localStorage.removeItem(SAVE_KEY); location.reload(); };
    $('btnSkills').onclick = () => openTree('common');
    document.querySelectorAll('.amt button').forEach(b => (b.onclick = () => { amt = b.dataset.amt === 'max' ? 'max' : +b.dataset.amt; document.querySelectorAll('.amt button').forEach(o => o.classList.toggle('on', o === b)); renderSkillDetail(true); Sfx.click(); }));
    $('dBuy').onclick = buy;
    $('btnPromo').onclick = () => openPanel('promo', renderPromo);
    $('btnDex').onclick = () => openPanel('dex', renderDex);
    $('btnMute').onclick = () => { S.muted = Sfx.toggle(); $('btnMute').textContent = S.muted ? '🔇' : '🔊'; };
    if (S.muted) { Sfx.toggle(); $('btnMute').textContent = '🔇'; }
    document.querySelectorAll('.close').forEach(b => (b.onclick = () => { b.closest('.screen').classList.add('hidden'); Sfx.click(); }));
    $('ncOk').onclick = () => { hide('newcat'); setTimeout(showNew, 300); };
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') ['tree', 'promo', 'dex'].forEach(hide);
    });
    // 패널이 열려 있으면 주기적으로 새로고침 (치즈 변동 반영)
    setInterval(() => {
      if (!G.running) return;
      hud();
      if (!$('tree').classList.contains('hidden')) refreshTreeAfford();
      if (!$('promo').classList.contains('hidden')) renderPromo();
    }, 500);
    hud();
  }
  return { init, onBirth, hud, toast };
})();
