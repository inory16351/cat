'use strict';
// ───────────────────────── 방해꾼: 연구소 고양이 · 쥐덫 ─────────────────────────
// 고양이: 2층부터 가끔 화면 안에 나타남. 주변 쥐들은 기겁하고 도망(r.flee), 잡히면 날아가서 잠깐 기절.
//         총공격(클릭 돌진) 중인 쥐들이 여러 번 들이받으면 "냐아앙?!" 하고 날아가서 도망감.
// 쥐덫: 2층부터 방마다 0~2개. 밟은 쥐는 3초 기절, 덫은 8초 뒤 다시 장전.
// 고양이 그림: 고양이 방치 게임의 파츠 리그(assets/v2/parts/<id>, PARTS_META)를 그대로 가져와 조립. 없으면 Codex 고양이 이미지(w:cat)
// 품종: 실제로 존재하는 고양이만 (2층~, 품종마다 스킬 LABCAT_SKILLS). 특별 복장(마녀 모자·우주복)은 아주 후반(SPECIAL_CAT_FROM층~)에 가끔 + 보스.
// 체력(hp)이 있어서 들이받거나 물건을 맞혀 0 이 되면 날아감(통통) → 삐져서 도망.
const CAT_R = 30, CAT_LIFE = 16, CAT_FEAR = 330, CAT_LEN = 115, SPECIAL_CAT_FROM = 25;   // 특별 복장 고양이는 아주 후반(25층~)에만, 아니면 보스로
const REAL_CATS = ['cheese', 'mackerel', 'tuxedo', 'chonk', 'loaf', 'ninja', 'laser', 'gym'];
const SPECIAL_CATS = { fire: { name: '마녀 모자 고양이', skill: 'fireball', line: '냐브라카다브라!' }, space: { name: '우주복 고양이', skill: 'gravity', line: '무중력 냥!' } };
const catName = id => (SPECIAL_CATS[id] && SPECIAL_CATS[id].name) || (typeof SPECIES_BY_ID !== 'undefined' && SPECIES_BY_ID[id] ? SPECIES_BY_ID[id].name : '고양이');
const CAT_RIGS = {};
function loadCatRigs() {
  if (typeof PARTS_META === 'undefined') return;
  for (const id of Object.keys(PARTS_META)) {
    const names = Object.keys(PARTS_META[id].size), imgs = {};
    let left = names.length;
    for (const n of names) { const im = new Image(); im.onload = () => { imgs[n] = im; if (--left === 0) buildCatRig(id, imgs); }; im.src = `../assets/v2/parts/${id}/${n}.png`; }
  }
}
// idle/js/rig.js 의 buildRig 와 같은 조립 (발끝 = 원점)
function buildCatRig(id, imgs) {
  const M = PARTS_META[id]; if (!imgs.torso || !M.anchor) return;
  const T = imgs.torso, at = k => [M.anchor[k][0] * T.width, M.anchor[k][1] * T.height], ls = M.legScale || { front: 1, back: 1 };
  const legLen = leg => (imgs[leg] ? imgs[leg].height * (1 - M.pivot[leg][1]) * ls[leg] : 0);
  const torsoX = -T.width * 0.5, torsoY = -(at('shoulder')[1] + legLen('front')), place = k => { const [x, y] = at(k); return [torsoX + x, torsoY + y]; };
  const hs = id === 'chonk' ? 0.72 : 1;
  CAT_RIGS[id] = { imgs, pivot: M.pivot, legScale: ls, headScale: hs, farFront: imgs.front && darkerCopy(imgs.front, 0.2), farBack: imgs.back && darkerCopy(imgs.back, 0.2),
    torso: [torsoX, torsoY], neck: place('neck'), tail: place('tail'), shoulder: place('shoulder'), hip: place('hip'), len: T.width + (imgs.head ? imgs.head.width * 0.55 * hs : 0) };
}
// idle/js/rig.js 의 drawRig 와 같은 그리기 (다리는 전부 몸통 뒤). len 월드 단위 길이로 맞춤
function drawCatRig(rig, len, p, g = ctx) {
  const I = rig.imgs, P = rig.pivot, L = rig.legScale, s = len / rig.len;
  const part = (img, anchor, pivot, ang, dx = 0, sc = 1) => { if (!img) return; g.save(); g.translate(anchor[0] + dx, anchor[1]); g.rotate(ang); g.scale(sc, sc); g.drawImage(img, -pivot[0] * img.width, -pivot[1] * img.height); g.restore(); };
  g.save(); g.scale(s, s); g.translate(0, p.bob || 0);
  g.translate(rig.hip[0], rig.hip[1]); g.rotate(-(p.tilt || 0)); g.translate(-rig.hip[0], -rig.hip[1]);
  const gap = I.torso.width * 0.06;
  part(rig.farBack, rig.hip, P.back, p.farBack, gap, L.back);
  part(rig.farFront, rig.shoulder, P.front, p.farFront, gap, L.front);
  part(I.tail, rig.tail, P.tail, -p.tail);
  part(I.back, rig.hip, P.back, p.back, 0, L.back);
  const raised = Math.abs(p.front) > 0.8;
  if (!raised) part(I.front, rig.shoulder, P.front, p.front, 0, L.front);
  g.drawImage(I.torso, rig.torso[0], rig.torso[1]);
  if (raised) part(I.front, rig.shoulder, P.front, p.front, 0, L.front);
  part(I.head, rig.neck, P.head, -p.head, 0, rig.headScale);
  g.restore();
}
// 고양이 자세: walk(대각선 보행) · pounce(덮치기) · flung(허우적) · cast(특수 능력)
function catPose(c, mode) {
  const w = c.walk, t = G.t, p = { head: Math.sin(t * 1.6) * 0.06, tail: 0.1 + Math.sin(t * 3) * 0.25, front: 0, back: 0, farFront: 0, farBack: 0, bob: 0, tilt: 0 };
  if (mode === 'pounce') Object.assign(p, { front: 1.3, farFront: 1.1, back: -1.1, farBack: -0.9, tilt: -0.25, tail: 1, head: -0.15 });
  else if (mode === 'crouch') Object.assign(p, { front: 0.3, farFront: 0.3, back: 0.4, farBack: 0.4, tilt: 0.12, bob: 6, tail: 0.9 + Math.sin(t * 20) * 0.2 });
  else if (mode === 'flung') Object.assign(p, { front: Math.sin(t * 30) * 1.4, farFront: Math.cos(t * 27) * 1.4, back: Math.sin(t * 28) * 1.2, farBack: Math.cos(t * 25) * 1.2, tail: Math.sin(t * 20), head: Math.sin(t * 15) * 0.4 });
  else if (mode === 'cast') Object.assign(p, { front: 2.1, farFront: 0.5, tilt: -0.3, head: -0.2, tail: 1.1 });
  else if (Math.hypot(c.vx, c.vy) > 20) { const s = Math.sin(w), s2 = -s; p.front = s * 0.5; p.farBack = s * 0.45; p.farFront = s2 * 0.5; p.back = s2 * 0.45; p.bob = -Math.abs(Math.cos(w)) * 2.5; p.tail = Math.sin(w * 0.5) * 0.3 + 0.1; }
  return p;
}
loadCatRigs();
const TRAP_R = 28, TRAP_W = 84;          // 쥐덫 발동 반경 · 그림 크기 (예전엔 작아서 잘 안 밟히고 눈에도 안 띄었음)
function spawnTraps(i, j, n) {
  for (let m = 0; m < n; m++) {
    const x = (i + 0.5) * RW + rand(-RW * 0.35, RW * 0.35), y = (j + 0.5) * RH + rand(-RH * 0.3, RH * 0.3);
    G.traps.push({ x, y, armed: true, t: 0, snapT: 0, victim: null });
  }
}
// 품종별 스킬 (고양이 방치 게임의 품종 특기를 방해꾼용으로): 4~6초마다
const LABCAT_SKILLS = {
  cheese: { name: '하악질', icon: '😾' },          // 코숏: 공포 범위 확 넓어짐
  mackerel: { name: '더블 냥펀치', icon: '👊' },   // 러시안 블루: 다음 덮치기 2연속
  tuxedo: { name: '신사의 일격', icon: '🎩' },     // 턱시도: 다음 덮치기 크리티컬(오래 기절)
  chonk: { name: '털뭉치 프레스', icon: '☁️' },   // 페르시안: 뛰어올라 깔아뭉개기
  loaf: { name: '식빵 굴리기', icon: '🍞' },       // 먼치킨: 몸을 말고 데굴데굴 돌진
  ninja: { name: '그림자 순간이동', icon: '🐆' },  // 벵갈: 쥐 떼 옆으로 순간이동 → 덮치기
  laser: { name: '레이저 눈빛', icon: '👁️' },      // 스핑크스: 레이저 한 줄
  gym: { name: '근육 과시', icon: '💪' },          // 메인쿤: 포효로 사방 쥐를 날려버림
  fire: { name: '불덩이 마법', icon: '🔥' },
  space: { name: '무중력 파동', icon: '🌌' },
};
// 고양이 체력: 층별 적정 전투력(powNeed = 쥐 무리 전체 한 방 합) × CAT_POW 와 예전 공식(사람의 4배) 중 큰 쪽. 캣닢 뇌물: 체력 ↓
// (예전 공식은 물건처럼 ×3.6/층이라 쥐 무리 전투력이 커지면 순식간에 녹았음)
const CAT_POW = 1.2;
const catHP = () => Math.max(12 * Math.pow(ITEM_GROW, S.floor - 1) * 3 * 4, powNeed(S.floor) * CAT_POW) * (1 - 0.05 * lv('catnip'));
// 테스트: 🐈 버튼 → 품종을 차례로 화면 가운데에 (특별 고양이 포함)
function testCat() {
  if (G.trans || G.sj || (G.ult && G.ult.phase === 'cut')) return false;
  const kinds = [...REAL_CATS, ...Object.keys(SPECIAL_CATS)];
  G.catTestN = ((G.catTestN ?? -1) + 1) % kinds.length;
  G.cat = null; spawnCat(kinds[G.catTestN]);
  if (!G.cat) return false;
  const cx = G.cam.x + viewW() / 2, cy = (G.cam.y + viewH() / 2) / TILT; G.cat.x = cx; G.cat.y = cy; confine(G.cat, CAT_R, cx, cy, 0, null); G.cat.skillT = 1.5;
  return true;
}
function spawnCat(force) {
  const vr = viewRect(80), rooms = visibleRooms().filter(([i, j]) => !isStairsRoom(i, j));
  if (!rooms.length) return;
  const [i, j] = pick(rooms), x = clamp(rand(vr.x0, vr.x1), i * RW + 80, (i + 1) * RW - 80), y = clamp(rand(vr.y0, vr.y1), j * RH + 80, (j + 1) * RH - 80);
  // 평소엔 실제 품종만. 특별 복장 고양이는 아주 후반(SPECIAL_CAT_FROM층~)에 가끔, 아니면 보스로
  const special = force ? (SPECIAL_CATS[force] ? force : null) : S.floor >= SPECIAL_CAT_FROM && Math.random() < 0.25 ? pick(Object.keys(SPECIAL_CATS)) : null;
  const kind = force || special || pick(REAL_CATS), hp = catHP() * (special ? 2 : kind === 'gym' || kind === 'chonk' ? 1.5 : 1);
  G.cat = { kind, special: special && SPECIAL_CATS[special], x, y, z: 0, vx: 0, vy: 0, vz: 0, face: 1, t: 0, life: CAT_LIFE + (special ? 6 : 0), hp, hpMax: hp,
    value: 3 * Math.pow(VALUE_GROW, S.floor - 1) * 30 * Math.pow(1.15, lv('cheese')) * dexBonus(), state: 'prowl', pounceT: 0, cd: 1.5, skillT: rand(2.5, 4), castT: 0, walk: 0, alpha: 0, rot: 0, jit: 0, bounces: 0 };
  smoke(x, y);
  const sk = LABCAT_SKILLS[kind];
  bigBanner(special ? `✨ 특별 고양이: ${catName(kind)}!` : `🐈 ${catName(kind)} 출현!`, `${sk.icon} ${sk.name} · 들이받아서 날려버려요!`, special ? '#cdb4db' : '#e39a5a');
  Sfx.comboWord();
}
// 쥐가 겁먹음: 도망 + 도망치다 부딪혀도 번식 안 함 (벽에 몰려서 번식 폭발하던 문제)
function scareRat(o, x, y, t = 1.3) {
  if (o.ultOn) return;
  t *= 1 - 0.06 * lv('catnip');                                        // 캣닢 뇌물: 덜 겁먹음
  if (!(o.flee > 0) && onScreen(o.x, o.y) && Math.random() < 0.08) o.say = { text: pick(['찍?!', '고양이다!!', '찌익!!']), t: 0.8 };
  o.flee = Math.max(o.flee || 0, t); o.fleeX = x; o.fleeY = y; o.noBreed = Math.max(o.noBreed, t + RUSH_NO_BREED);
}
function catPounceHit(c, R, stun) {
  let n = 0;
  for (const o of G.rats) if (Math.hypot(o.x - c.x, o.y - c.y) < R && !o.ultOn) { stunRat(o, stun); ragdoll(o, Math.atan2(o.y - c.y, o.x - c.x), 460, 380); n++; }
  return n;
}
function updateHazards(dt) {
  // 쥐덫
  for (const tp of G.traps || []) {
    tp.snapT = Math.max(0, tp.snapT - dt);
    if (!tp.armed) {
      tp.t -= dt;
      if (tp.victim) { const r = tp.victim; if (r.stun > 0) { r.x = tp.x; r.y = tp.y; } else tp.victim = null; }
      if (tp.t <= 0) { tp.armed = true; tp.victim = null; }
      continue;
    }
    near(ratGrid, tp.x, tp.y, r => {
      if (!tp.armed || r.z > 4 || r.ultOn || r.stun > 0 || r.temp || Math.hypot(r.x - tp.x, r.y - tp.y) > TRAP_R + ratR(r) * 0.6) return;
      tp.armed = false; tp.t = 8; tp.snapT = 0.3;
      const ts = lv('trapsafe');                                          // 덫 해체 전문가: 5레벨부터 치즈만 쏙
      if (ts >= 5 && Math.random() < (ts - 4) * 0.1) { const g = itemValue({ v: 3 }, S.floor - 1); earn(g); if (onScreen(tp.x, tp.y)) popup(tp.x, tp.y, `치즈만 쏙! +${fmt(g)}`, '#f2c14e', 18, 0.9, 40); return; }
      tp.victim = r;
      stunRat(r, 3 * (1 - 0.08 * ts)); r.trick = null; r.vx = r.vy = 0; r.sq = 0.45;
      if (onScreen(tp.x, tp.y)) { popup(tp.x, tp.y, '딸깍!! 😵', '#fff', 22, 0.9, 40); ring(tp.x, tp.y, 40, '#fff', 0.2, 6); addShake(0.08); Sfx.knock(); Sfx.thump(0.7); }
    });
  }
  // 고양이
  if (S.floor >= 2 && !G.bossFight && !G.ult && !G.sj) { G.catT = (G.catT ?? 45) - dt; if (!G.cat && G.catT <= 0) { G.catT = rand(55, 85); spawnCat(); } }
  const c = G.cat; if (!c) return;
  const px = c.x, py = c.y;
  c.t += dt; c.life -= dt; c.cd -= dt; c.alpha = Math.min(1, c.alpha + dt * 3); c.jit = Math.max(0, c.jit - dt * 12);
  if (c.state === 'flung') {
    // 날아감: 빙글빙글 → 땅에 통통 2번 → 도망
    c.vz -= 1500 * dt; c.z += c.vz * dt; c.rot += dt * 14; c.x += c.vx * dt; c.y += c.vy * dt; confine(c, CAT_R, px, py, 0.5, null);
    if (c.z <= 0 && c.vz < 0) {
      c.z = 0;
      if (c.bounces++ < 2) { c.vz = Math.max(300, -c.vz * 0.6); c.vx *= 0.8; c.vy *= 0.8; if (onScreen(c.x, c.y)) { dust(c.x, c.y, 4, 1); popup(c.x, c.y, pick(['냥!', '먀!', '캭!']), '#fff', 18, 0.5, 40); Sfx.thump(0.6); } }
      else { c.state = 'leave'; c.life = 1.6; c.rot = 0; const a = rand(0, 6.28); c.vx = Math.cos(a) * 420; c.vy = Math.sin(a) * 420; if (onScreen(c.x, c.y)) popup(c.x, c.y, '(삐짐)', '#fff', 16, 1, 60); }
    }
  } else if (c.state === 'leave') {
    c.alpha = Math.min(c.alpha, c.life / 1.6); c.x += c.vx * dt; c.y += c.vy * dt; c.walk += dt * 24;
    if (c.life <= 0) { G.cat = null; return; }
  } else if (c.state === 'roll') {
    // 먼치킨 식빵 굴리기: 몸 말고 직선 돌진, 닿는 쥐 나뒹굴기
    c.rollT -= dt; c.rot += dt * 16 * c.face;
    const hit = confine(c, CAT_R, px, py, 1, null); c.x += c.vx * dt; c.y += c.vy * dt; if (hit) addShake(0.05);
    for (const o of G.rats) if (!o.ultOn && !o.trick && Math.hypot(o.x - c.x, o.y - c.y) < CAT_R + ratR(o) + 6) { stunRat(o, 1); ragdoll(o, Math.atan2(o.y - c.y, o.x - c.x), 480, 360); }
    if (Math.random() < 0.5) dust(c.x, c.y, 1, 0.6);
    if (c.rollT <= 0) { c.state = 'prowl'; c.rot = 0; c.vx *= 0.2; c.vy *= 0.2; c.cd = 0.8; }
  } else {
    // 사냥: 가까운 쥐 쪽으로 살금살금 → 가까우면 달려들기 (+ 품종 스킬)
    const r = nearestRat(c.x, c.y, 900);
    c.castT = Math.max(0, c.castT - dt);
    if ((c.skillT -= dt) <= 0 && c.state !== 'pounce') { c.skillT = rand(4, 6); catSkill(c, r); }
    if (c.state === 'pounce') {
      c.pounceT -= dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.pounceT <= 0) {
        const crit = c.critNext; c.critNext = false;
        const n = catPounceHit(c, crit ? 105 : 70, crit ? 3 : 1.4);
        if (n && onScreen(c.x, c.y)) { popup(c.x, c.y, crit ? '신사의 일격!! 크리티컬!' : '냥냥펀치!!', crit ? '#f2c14e' : '#e39a5a', crit ? 28 : 24, 0.8, 70); addShake(crit ? 0.25 : 0.12); Sfx.thump(0.8); }
        if (c.doubleNext && r) { c.doubleNext = false; const dx = r.x - c.x, dy = r.y - c.y, d = Math.hypot(dx, dy) || 1; c.pounceT = 0.3; c.vx = dx / d * 640; c.vy = dy / d * 640; c.vz = 240; if (onScreen(c.x, c.y)) popup(c.x, c.y, '한 번 더!!', '#a9d3dc', 22, 0.6, 90); }
        else { c.state = 'prowl'; c.cd = rand(0.9, 1.6); c.vx *= 0.2; c.vy *= 0.2; }
      }
    } else if (r) {
      const dx = r.x - c.x, dy = r.y - c.y, d = Math.hypot(dx, dy), s = d < 320 ? 330 : 150;
      c.vx += (dx / d * s - c.vx) * Math.min(1, dt * 4); c.vy += (dy / d * s - c.vy) * Math.min(1, dt * 4);
      if (d < 130 && c.cd <= 0) { c.state = 'pounce'; c.pounceT = 0.35; c.vx = dx / d * 620; c.vy = dy / d * 620; c.vz = 260; if (onScreen(c.x, c.y)) Sfx.jump(); }
    }
    if (c.z > 0 || c.vz > 0) { c.vz -= 1600 * dt; c.z = Math.max(0, c.z + c.vz * dt); if (c.z <= 0) { c.vz = 0; if (c.slamming) catSlamLand(c); } }
    c.x += c.vx * dt; c.y += c.vy * dt;
    confine(c, CAT_R, px, py, 0.5, null);
    if (c.life <= 0) { c.state = 'leave'; c.life = 1.6; const a = rand(0, 6.28); c.vx = Math.cos(a) * 300; c.vy = Math.sin(a) * 300; }
    // 겁먹은 쥐들 (도망치다 부딪혀도 번식 안 함)
    const fear = CAT_FEAR * (c.hissT > G.t ? 1.6 : 1);
    for (const o of G.rats) if (Math.hypot(o.x - c.x, o.y - c.y) < fear) scareRat(o, c.x, c.y);
    if (Math.random() < dt * 0.5 && onScreen(c.x, c.y)) popup(c.x, c.y, pick(['냐옹~', '냥?', '크르릉…']), '#fff', 16, 0.8, 80);
  }
  if (Math.abs(c.vx) > 10 && c.state !== 'roll') c.face = c.vx > 0 ? 1 : -1;
  c.walk += dt * Math.hypot(c.vx, c.vy) / 12;
}
function catSlamLand(c) {
  c.slamming = false;
  const n = catPounceHit(c, 170, 1.8);
  for (const it of itemsIn(c.x, c.y, 170)) launch(it, Math.atan2(it.y - c.y, it.x - c.x), 380, false);
  if (onScreen(c.x, c.y)) { ring(c.x, c.y, 170, '#f3ede2', 0.4, 10); dust(c.x, c.y, 12, 1.6); addShake(0.3); Sfx.boom(0.9); popup(c.x, c.y, n ? '털뭉치 프레스!!' : '뭉개기!', '#fff', 26, 0.8, 60); }
}
// 품종 스킬 발동
function catSkill(c, r) {
  const sk = LABCAT_SKILLS[c.kind]; if (!sk) return;
  c.castT = 0.5;
  const vis = onScreen(c.x, c.y);
  if (vis) popup(c.x, c.y, `${sk.icon} ${sk.name}!`, c.special ? '#cdb4db' : '#fff3bf', 20, 1, 100);
  switch (c.kind) {
    case 'cheese': c.hissT = G.t + 3; if (vis) { ring(c.x, c.y, CAT_FEAR * 1.6, 'rgba(232,120,106,.7)', 0.6, 8); Sfx.deny(); } break;
    case 'mackerel': c.doubleNext = true; c.cd = 0; break;
    case 'tuxedo': c.critNext = true; c.cd = 0; break;
    case 'chonk': c.slamming = true; c.vz = 700; if (r) { c.vx = (r.x - c.x) * 0.9; c.vy = (r.y - c.y) * 0.9; } Sfx.jump(); break;
    case 'loaf': if (r) { const a = Math.atan2(r.y - c.y, r.x - c.x); c.state = 'roll'; c.rollT = 1.3; c.vx = Math.cos(a) * 560; c.vy = Math.sin(a) * 560; c.face = Math.cos(a) >= 0 ? 1 : -1; Sfx.dash(); } break;
    case 'ninja': {
      // 쥐가 제일 많은 곳 옆으로 순간이동 → 바로 덮치기
      let best = r, bn = 0; for (const o of G.rats) { const n = G.rats.filter(q => Math.hypot(q.x - o.x, q.y - o.y) < 120).length; if (n > bn && onScreen(o.x, o.y)) { bn = n; best = o; } }
      if (best) { smoke(c.x, c.y); c.x = best.x + rand(-60, 60); c.y = best.y + rand(-40, 40); confine(c, CAT_R, best.x, best.y, 0, null); smoke(c.x, c.y); c.cd = 0; Sfx.dash(); }
      break;
    }
    case 'laser': if (r) {
      const a = Math.atan2(r.y - c.y, r.x - c.x), L = 460, ux = Math.cos(a), uy = Math.sin(a);
      G.beams.push({ x1: c.x, y1: c.y - 30, x2: c.x + ux * L, y2: c.y + uy * L - 30, life: 0.3, max: 0.3, col: '#e8786a' });
      for (const o of G.rats) { const px = o.x - c.x, py = o.y - c.y, al = px * ux + py * uy; if (al > 0 && al < L && Math.abs(px * uy - py * ux) < 22 && !o.ultOn) stunRat(o, 1.5); }
      Sfx.laser();
    } break;
    case 'gym': {
      const R = 280;
      for (const o of G.rats) { const d = Math.hypot(o.x - c.x, o.y - c.y); if (d < R && !o.ultOn) ragdoll(o, Math.atan2(o.y - c.y, o.x - c.x), 560, 420); }
      for (const it of itemsIn(c.x, c.y, R)) launch(it, Math.atan2(it.y - c.y, it.x - c.x), 360, false);
      if (vis) { ring(c.x, c.y, R, '#e39a5a', 0.5, 12); ring(c.x, c.y, R * 0.6, '#fff', 0.35, 8); addShake(0.3); Sfx.boom(0.8); popup(c.x, c.y, '크아아앙!!', '#fff', 30, 0.8, 110); }
      break;
    }
    case 'fire':
      for (let n = 0; n < 3; n++) later(0.15 + n * 0.2, () => { if (G.cat !== c) return; const t = pick(G.rats.filter(o => Math.hypot(o.x - c.x, o.y - c.y) < 600)); if (t) G.bossShots.push({ x: c.x, y: c.y, z: 60, vx: (t.x - c.x) / 0.6, vy: (t.y - c.y) / 0.6, vz: 380, t: 0, rot: 0, fire: true }); });
      Sfx.laser(); break;
    case 'space': {
      const R = 260;
      for (const o of G.rats) if (!o.ultOn && Math.hypot(o.x - c.x, o.y - c.y) < R) { o.vz = rand(500, 750); stunRat(o, 1.4); }
      if (vis) { ring(c.x, c.y, R, '#cdb4db', 0.6, 10); ring(c.x, c.y, R * 0.6, '#fff', 0.4, 6); burst(c.x, c.y, 16, { colors: ['#cdb4db', '#fff'], type: 'star', min: 100, max: 300, s0: 3, s1: 6, z: 40 }); Sfx.boom(0.6); }
      break;
    }
  }
}
// 고양이 피해 → 체력 0 이면 날려버림
function damageCat(c, dmg, ang, by) {
  if (!c || c.state === 'flung' || c.state === 'leave' || c.alpha < 0.8) return false;
  c.hp -= dmg * (1 + 0.2 * lv('bossd')); c.jit = 3; c.hitT = G.t;   // 보스 사냥꾼: 고양이에게도
  if (c.hp <= 0) { catFlung(c, ang); return true; }
  if (onScreen(c.x, c.y) && Math.random() < 0.25) popup(c.x, c.y, pick(['냥!', '캬악!', '냐?!', '하악!']), '#fff', 18, 0.6, 60);
  return true;
}
function catFlung(c, a) {
  if (c.state === 'flung' || c.state === 'leave') return;
  c.hp = 0; c.state = 'flung'; c.vx = Math.cos(a) * 560; c.vy = Math.sin(a) * 560; c.vz = 760; c.bounces = 0; c.life = 4;
  for (const o of G.rats) o.flee = 0;
  const gain = (c.value || 0) * comboMult(); earn(gain); addRamp(5 + S.floor); G.combo += 3; G.comboT = 1.6; G.comboBump = 1;
  if (onScreen(c.x, c.y)) { popup(c.x, c.y, '냐아아앙?!', '#fff3bf', 30, 1.2, 100); if (gain) popup(c.x, c.y, '🧀+' + fmt(gain), '#f0c878', 26, 1.2, 60); burst(c.x, c.y, 16, { colors: ['#e39a5a', '#fff'], type: 'star', min: 200, max: 500, s0: 3, s1: 7, z: 40 }); addShake(0.2); G.hitstop = Math.max(G.hitstop, 0.06); Sfx.boom(0.8); }
  bigBanner('🐈 고양이 날려버림!', `${catName(c.kind)} 퇴치 · 쥐의 힘을 보여줬다`, '#f0c878');
}
// 쥐가 고양이를 들이받음 (game.js moveRat 에서 호출): 평소엔 약하게, 총공격이면 세게
function ratBumpCat(r, rushing) {
  const c = G.cat; if (!c || c.state === 'flung' || c.state === 'leave') return;
  const d = Math.hypot(r.x - c.x, r.y - c.y); if (d > ratR(r) + CAT_R) return;
  const nx = (r.x - c.x) / (d || 1), ny = (r.y - c.y) / (d || 1);
  r.x = c.x + nx * (ratR(r) + CAT_R + 1); r.y = c.y + ny * (ratR(r) + CAT_R + 1);
  r.vx = nx * 300; r.vy = ny * 300;
  if ((r.catCD || 0) > G.t) return;
  r.catCD = G.t + 0.25;
  damageCat(c, ratDamage(r) * (rushing ? rushMult() * 2 : 0.6), Math.atan2(-ny, -nx), r);
  if (onScreen(c.x, c.y)) ring(c.x, c.y, 40, '#fff', 0.2, 5);
}
// 날아가는 물건에 맞음 (game.js updateItems 에서 호출)
function itemHitsCat(it) {
  const c = G.cat; if (!c || c.state === 'flung' || c.state === 'leave' || it.hitSet.has(c)) return;
  if (Math.hypot(it.x - c.x, it.y - c.y) > it.r + CAT_R || it.z > 80) return;
  it.hitSet.add(c);
  damageCat(c, flyDmg(it) * 2, Math.atan2(it.vy, it.vx), it.by);
  if (onScreen(c.x, c.y)) popup(c.x, c.y, '퍽!', '#fff', 20, 0.5, 60);
}
function hazardsSorted(list) {
  for (const tp of G.traps || []) if (onScreen(tp.x, tp.y, 60)) list.push({ y: tp.y - 8, f: () => drawTrap(tp) });
  const c = G.cat; if (c && onScreen(c.x, c.y, 80)) list.push({ y: c.y, f: () => drawCat(c) });
}
function drawTrap(tp) {
  ctx.save(); ctx.translate(tp.x, tp.y * TILT + 14);
  if (tp.snapT > 0) ctx.scale(1.1, 0.9);
  if (!drawArt(ctx, tp.armed ? 'w:mousetrap' : 'w:mousetrap_snap', TRAP_W)) { ctx.fillStyle = '#c8a27a'; ctx.fillRect(-28, -22, 56, 22); ctx.strokeStyle = '#6f6a66'; ctx.lineWidth = 3; ctx.strokeRect(-20, tp.armed ? -40 : -20, 40, tp.armed ? 18 : 2); }
  ctx.restore();
}
function drawCat(c) {
  ctx.save(); ctx.globalAlpha = c.alpha;
  ctx.fillStyle = 'rgba(30,15,5,.2)'; ctx.beginPath(); ctx.ellipse(c.x, c.y * TILT, 46, 14, 0, 0, 6.28); ctx.fill();
  ctx.translate(c.x + (c.jit ? rand(-c.jit, c.jit) : 0), c.y * TILT - c.z - Math.abs(Math.sin(c.walk)) * 4);
  if (c.state === 'flung' || c.state === 'roll') { ctx.translate(0, -30); ctx.rotate(c.rot); ctx.translate(0, 30); }
  ctx.scale(-c.face, 1);
  const rig = CAT_RIGS[c.kind];
  const mode = c.state === 'pounce' ? 'pounce' : c.state === 'flung' ? 'flung' : c.state === 'roll' ? 'crouch' : c.castT > 0 ? 'cast' : (c.state === 'prowl' && c.cd > 0 && c.cd < 0.4) ? 'crouch' : 'walk';
  if (rig) drawCatRig(rig, CAT_LEN * (c.special ? 1.15 : c.kind === 'gym' || c.kind === 'chonk' ? 1.12 : 1), catPose(c, mode));
  else if (!drawArt(ctx, c.state === 'pounce' ? 'w:cat_pounce' : 'w:cat', 120)) { ctx.fillStyle = '#e39a5a'; rr(ctx, -45, -50, 90, 40, 18); ctx.fill(); circ(ctx, -46, -58, 20); ctx.fill(); }
  ctx.restore();
  if (c.special && c.alpha > 0.5) { ctx.save(); ctx.globalAlpha = 0.35 + 0.2 * Math.sin(G.t * 6); ctx.strokeStyle = '#cdb4db'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(c.x, c.y * TILT, 60, 20, 0, 0, 6.28); ctx.stroke(); ctx.restore(); }
}
