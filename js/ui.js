'use strict';
const $ = s => document.querySelector(s);

const UI = (() => {
  let selected = 'paw';
  let shownChuru = 0;
  let churuTween = null;

  function show(id) {
    for (const el of document.querySelectorAll('.screen')) el.classList.toggle('hidden', el.id !== id);
  }
  function hideAll() { for (const el of document.querySelectorAll('.screen')) el.classList.add('hidden'); }

  // ───────── 공용: 츄르 카운터 롤링 ─────────
  function tweenChuru() {
    cancelAnimationFrame(churuTween);
    const step = () => {
      const diff = save.churu - shownChuru;
      if (Math.abs(diff) < 1) shownChuru = save.churu;
      else shownChuru += diff * 0.18;
      for (const el of document.querySelectorAll('.churu-val')) el.textContent = fmt(shownChuru);
      if (shownChuru !== save.churu) churuTween = requestAnimationFrame(step);
    };
    step();
  }

  // ───────── 타이틀 ─────────
  function showTitle() {
    G.mode = 'title';
    previewStage(save.stage);
    show('title');
    renderTitle();
    tweenChuru();
  }
  function renderTitle() {
    $('#stageNum').textContent = `${save.stage} · ${mapLayoutFor(save.stage).name}`;
    $('#btnPrev').disabled = save.stage <= 1;
    $('#btnNext').disabled = save.stage >= save.maxStage;
    $('#btnStart').textContent = save.stage === 1 && save.maxStage === 1 ? '게임 시작!' : `스테이지 ${save.stage} 시작!`;
    const best = save.best['s' + save.stage];
    $('#bestLine').textContent = best ? `최고 기록 🐟 ${fmt(best)}` : '아직 기록 없음';
  }
  function previewStage(n) {
    applyStage(n);
    for (const it of G.items) { it.state = 'rest'; it.appear = 1; }
    G.cat = null;
    G.mode = 'title';
  }

  // ───────── 스킬 트리 ─────────
  const cost = s => Math.ceil(s.base * Math.pow(s.grow, lv(s.id)));
  const unlocked = s => !s.req || lv(s.req) >= SKILL_BY_ID[s.req].max;
  const posOf = s => [7 + s.grid[0] * 14.33, 88 - s.grid[1] * 19];

  function showTree() {
    show('tree');
    buildTree();
    tweenChuru();
  }
  function buildTree() {
    const host = $('#treeArea');
    host.innerHTML = '';
    const area = document.createElement('div');
    area.className = 'tree-inner';
    host.appendChild(area);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('links');
    for (const s of SKILLS) {
      if (!s.req) continue;
      const p = SKILL_BY_ID[s.req];
      const [x1, y1] = posOf(p), [x2, y2] = posOf(s);
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1);
      l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      l.setAttribute('class', unlocked(s) ? (lv(s.id) ? 'on' : 'open') : 'off');
      l.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(l);
    }
    area.appendChild(svg);
    for (const s of SKILLS) {
      const b = document.createElement('button');
      const l = lv(s.id), ok = unlocked(s), maxed = l >= s.max, afford = save.churu >= cost(s);
      b.className = 'node' + (ok ? '' : ' locked') + (maxed ? ' maxed' : '') + (ok && !maxed && afford ? ' afford' : '') + (s.id === selected ? ' sel' : '');
      b.style.left = posOf(s)[0] + '%'; b.style.top = posOf(s)[1] + '%';
      b.dataset.id = s.id;
      const tag = s.active ? (s.active.type === 'cd' ? '⏱' : '🔢') : '';
      b.innerHTML = `<span class="nm">${tag}${s.name}</span><span class="ic">${ok ? s.icon : '🔒'}</span><span class="lv">${l}/${s.max}</span>` +
        (ok && !maxed ? `<span class="cost">🐟${fmt(cost(s))}</span>` : '');
      b.addEventListener('click', () => {
        Sfx.resume();
        if (selected === s.id) buy(s);
        else { selected = s.id; Sfx.click(); buildTree(); }
      });
      area.appendChild(b);
    }
    renderDetail();
  }
  function renderDetail() {
    const s = SKILL_BY_ID[selected];
    const l = lv(s.id), ok = unlocked(s), maxed = l >= s.max, c = cost(s);
    $('#dIcon').textContent = s.icon;
    $('#dName').textContent = s.name;
    $('#dLv').textContent = `Lv ${l} / ${s.max}`;
    $('#dDesc').textContent = maxed ? '최대 레벨 달성!' : s.desc(l);
    const btn = $('#dBuy');
    if (!ok) {
      const r = SKILL_BY_ID[s.req];
      btn.textContent = `🔒 ${r.name} MAX 필요 (${lv(r.id)}/${r.max})`; btn.disabled = true;
    } else if (maxed) {
      btn.textContent = '✨ MAX'; btn.disabled = true;
    } else {
      btn.textContent = `🐟 ${fmt(c)} 로 강화`; btn.disabled = save.churu < c;
    }
  }
  function buy(s) {
    const c = cost(s);
    if (!unlocked(s) || lv(s.id) >= s.max || save.churu < c) {
      Sfx.deny();
      const n = document.querySelector(`.node[data-id="${s.id}"]`);
      if (n) { n.classList.remove('shake'); void n.offsetWidth; n.classList.add('shake'); }
      return;
    }
    save.churu -= c;
    save.skills[s.id] = lv(s.id) + 1;
    writeSave();
    Sfx.buy();
    buildTree();
    tweenChuru();
    const n = document.querySelector(`.node[data-id="${s.id}"]`);
    n.classList.add('pop');
    domBurst(n, s.icon);
    const cv = $('#treeChuru'); cv.classList.remove('bump'); void cv.offsetWidth; cv.classList.add('bump');
  }
  function domBurst(el, icon) {
    const r = el.getBoundingClientRect();
    const host = $('#fxLayer');
    const hr = host.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('span');
      p.className = 'fxp';
      p.textContent = i % 3 === 0 ? icon : ['✨', '⭐', '🐟'][i % 3];
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      const d = 60 + Math.random() * 70;
      p.style.left = (r.left - hr.left + r.width / 2) + 'px';
      p.style.top = (r.top - hr.top + r.height / 2) + 'px';
      p.style.setProperty('--dx', Math.cos(a) * d + 'px');
      p.style.setProperty('--dy', Math.sin(a) * d + 'px');
      host.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }
  }

  // ───────── 결과 ─────────
  function showResult(r) {
    show('result');
    const box = $('#resultBox');
    box.className = 'panel ' + (r.cleared ? 'win' : 'lose');
    $('#rTitle').textContent = r.cleared ? `STAGE ${r.stage} CLEAR!` : '들켰다...!';
    $('#rSub').textContent = r.cleared ? (r.nextBigger ? `🏠 다음 무대: ${r.nextBigger}! 집이 더 넓어졌다` : '주인은 아직 모른다 😼') : `물건 ${r.totalItems - r.smashed}개가 멀쩡히 남았다`;
    const stars = r.cleared ? 1 + (r.timeLeft / G.timeMax > 0.25) + (r.timeLeft / G.timeMax > 0.5) : 0;
    $('#rStars').innerHTML = [0, 1, 2].map(i => `<span class="star ${i < stars ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.25}s">★</span>`).join('');
    const rows = [
      ['부순 물건', `${r.smashed} / ${r.totalItems}`],
      ['최대 콤보', `${r.maxCombo}`],
      ['클릭 / 충돌 / 공중타', `${r.clicks} / ${r.collisions} / ${r.airHits}`],
      ['가구 박살', `${r.furnSmashed}`],
      ['점수', fmt(r.score)],
      ['클리어 보너스', r.cleared ? `+${fmt(r.bonus)}  (남은 ${Math.ceil(r.timeLeft)}초)` : '-'],
    ];
    $('#rRows').innerHTML = rows.map(([a, b], i) => `<div class="row" style="animation-delay:${0.2 + i * 0.15}s"><span>${a}</span><b>${b}</b></div>`).join('');
    const tot = $('#rTotal');
    tot.textContent = '0';
    $('#rBest').classList.toggle('hidden', !r.isBest);
    const t0 = performance.now() + 800;
    const dur = 900;
    const tick = now => {
      const k = Math.max(0, Math.min(1, (now - t0) / dur));
      tot.textContent = fmt(r.total * (1 - Math.pow(1 - k, 3)));
      if (k > 0 && k < 1) Sfx.count();
      if (k < 1) requestAnimationFrame(tick); else { tot.classList.add('done'); tweenChuru(); }
    };
    tot.classList.remove('done');
    requestAnimationFrame(tick);
    $('#rNext').textContent = r.cleared ? `다음 스테이지 ▶` : '다시 도전 ↻';
    $('#rNext').onclick = () => { Sfx.click(); hideAll(); startStage(r.cleared ? r.stage + 1 : r.stage); };
  }

  // ───────── 기타 ─────────
  function showHint(on) { $('#hint').classList.toggle('hidden', !on); }
  function syncMute() { $('#btnMute').textContent = save.muted ? '🔇' : '🔊'; }
  function togglePause() {
    G.paused = !G.paused;
    $('#pause').classList.toggle('hidden', !G.paused);
  }

  function init() {
    $('#btnStart').onclick = () => { Sfx.resume(); Sfx.click(); hideAll(); startStage(save.stage); };
    $('#btnPrev').onclick = () => { if (save.stage > 1) { save.stage--; writeSave(); Sfx.click(); previewStage(save.stage); renderTitle(); } };
    $('#btnNext').onclick = () => { if (save.stage < save.maxStage) { save.stage++; writeSave(); Sfx.click(); previewStage(save.stage); renderTitle(); } };
    $('#btnTree').onclick = () => { Sfx.resume(); Sfx.click(); showTree(); };
    $('#btnHelp').onclick = () => { Sfx.click(); $('#help').classList.toggle('hidden'); };
    $('#treeBack').onclick = () => { Sfx.click(); showTitle(); };
    $('#treePlay').onclick = () => { Sfx.click(); hideAll(); startStage(save.stage); };
    $('#dBuy').onclick = () => buy(SKILL_BY_ID[selected]);
    $('#rTree').onclick = () => { Sfx.click(); showTree(); };
    $('#rTitleBtn').onclick = () => { Sfx.click(); showTitle(); };
    $('#btnMute').onclick = () => { save.muted = Sfx.toggle(); writeSave(); syncMute(); };
    $('#pResume').onclick = () => togglePause();
    $('#pQuit').onclick = () => { togglePause(); showTitle(); };
    if (save.muted) Sfx.toggle();
    syncMute();
    shownChuru = save.churu;
  }

  return { init, showTitle, showTree, showResult, showHint, syncMute, togglePause };
})();
