'use strict';
// ───────────────────────── 고양이 도감 ─────────────────────────
// rar: 0 일반 · 1 레어 · 2 에픽 · 3 전설 · 4 ???
// dmg/atk/spd: 공격력·공격속도·이동속도 배율 / sp: 특수 능력
const RARITY = [
  { name: '일반', col: '#a8a29a', w: 62 },
  { name: '레어', col: '#7fa8bf', w: 25 },
  { name: '에픽', col: '#a58bb8', w: 9 },
  { name: '전설', col: '#d9a441', w: 3.3 },
  { name: '???', col: '#c9745b', w: 0.7 },
];

const SPECIES = [
  { id: 'cheese', name: '코리안 숏헤어', rar: 0, dmg: 1, atk: 1, spd: 1,
    pal: { body: '#f4a340', stripe: '#d9771e', belly: '#fff0d6', ear: '#ff9eb5' },
    trait: '균형형', desc: '동네 어디에나 있는 치즈 태비. 평범하게 부수고, 평범하게 귀엽다.' },
  { id: 'mackerel', name: '러시안 블루', rar: 0, dmg: 0.8, atk: 1.6, spd: 1.1,
    pal: { body: '#9aa5b1', stripe: '#5c6670', belly: '#f1f3f5', ear: '#ffb3c1' },
    trait: '공격 속도 ×1.6', desc: '조용하고 우아하게… 그리고 아주 빠르게 컵을 민다.' },
  { id: 'tuxedo', name: '턱시도', rar: 0, dmg: 1.1, atk: 1, spd: 1, crit: 0.2,
    pal: { body: '#2b2d42', stripe: '#1b1c2a', belly: '#ffffff', ear: '#ffb3c1' },
    trait: '크리티컬 +20%', desc: '태어날 때부터 정장 차림. 급소만 골라 친다.' },
  { id: 'chonk', name: '페르시안', rar: 1, dmg: 2.2, atk: 0.7, spd: 0.6, sp: 'slam', scale: 1.4,
    pal: { body: '#f6e3c5', stripe: '#e8cfa6', belly: '#fffaf0', ear: '#ffc9d3' },
    trait: '3타마다 깔아뭉개기(범위)', desc: '털이 너무 많아서 움직이기 싫다. 대신 앉으면 다 부서진다.' },
  { id: 'loaf', name: '먼치킨', rar: 1, dmg: 0.9, atk: 1, spd: 1.7, sp: 'roll',
    pal: { body: '#d9a45b', stripe: '#b07a3a', belly: '#f7e1b5', ear: '#ffb3c1' },
    trait: '굴러다니며 닿는 모든 걸 부숨', desc: '다리가 짧아서 걷는 것보다 구르는 게 빠르다.' },
  { id: 'ninja', name: '벵갈', rar: 1, dmg: 1.3, atk: 1.4, spd: 1.2, sp: 'teleport',
    pal: { body: '#212529', stripe: '#000000', belly: '#495057', ear: '#e03131' },
    trait: '목표 옆으로 순간이동', desc: '야생의 피가 흐른다. 눈 깜짝할 새 옆에 와 있다.' },
  { id: 'laser', name: '스핑크스', rar: 2, dmg: 1.4, atk: 1, spd: 0.8, sp: 'laser', reach: 260,
    pal: { body: '#f8f9fa', stripe: '#dee2e6', belly: '#ffffff', ear: '#ffa8a8' },
    trait: '원거리 레이저', desc: '털이 없는 대신 눈빛이 너무 강렬해서 물건이 깨진다.' },
  { id: 'gym', name: '메인쿤', rar: 2, dmg: 5, atk: 0.5, spd: 0.9, sp: 'flex', scale: 1.2,
    pal: { body: '#e8590c', stripe: '#c2410c', belly: '#ffd8a8', ear: '#ffa8a8' },
    trait: '공격력 ×5, 느린 공격', desc: '고양이계의 헤비급. 앞발 한 번이면 식탁이 흔들린다.' },
  { id: 'box', name: '스코티시 폴드', rar: 2, dmg: 1.8, atk: 1, spd: 1, sp: 'push',
    pal: { body: '#868e96', stripe: '#495057', belly: '#dee2e6', ear: '#ffb3c1' },
    trait: '몸통 박치기 (엄청난 넉백)', desc: '귀는 접혀 있지만 성격은 접히지 않았다. 온몸으로 들이받아 물건을 멀리 날려버린다.' },
  { id: 'space', name: '우주복 고양이', rar: 3, dmg: 2, atk: 1.1, spd: 1, sp: 'gravity',
    pal: { body: '#e599f7', stripe: '#be4bdb', belly: '#fff0f6', ear: '#ffdeeb' },
    trait: '에너지를 끌어당김 → 합체 증가', desc: '어디서 우주복을 구했는지는 아무도 모른다. 무중력으로 에너지를 모은다.' },
  { id: 'liquid', name: '랙돌', rar: 3, dmg: 1.2, atk: 1, spd: 1.2, sp: 'puddle',
    pal: { body: '#ffa94d', stripe: '#fd7e14', belly: '#fff4e6', ear: '#ffb3c1' },
    trait: '주변에 지속 피해', desc: '안기면 흐물흐물 녹는다. 고양이는 액체라는 살아있는 증거.' },
  { id: 'fire', name: '마녀 모자 고양이', rar: 3, dmg: 2.5, atk: 1, spd: 1, sp: 'fire',
    pal: { body: '#ff6b6b', stripe: '#e03131', belly: '#ffe3e3', ear: '#ffc9c9' },
    trait: '부채꼴 마법 불꽃', desc: '할로윈 모자를 쓰더니 진짜로 마법을 쓰기 시작했다.' },
  { id: 'tower', name: '왕관 고양이', rar: 4, dmg: 2, atk: 1.2, spd: 0.8, sp: 'multi',
    pal: { body: '#f4a340', stripe: '#d9771e', belly: '#fff0d6', ear: '#ff9eb5' },
    trait: '동시에 여러 개 공격', desc: '이 동네의 진짜 주인. 신하 없이 혼자서 다 부순다.' },
  { id: 'duck', name: '공룡 옷 고양이', rar: 4, dmg: 3, atk: 1, spd: 1.1, sp: 'quack',
    pal: { body: '#ffd43b', stripe: '#fab005', belly: '#fff9db', ear: '#ffd43b' },
    trait: '크아앙! 포효 충격파', desc: '공룡 잠옷을 입혔더니 자기가 공룡인 줄 안다. 크아앙.' },
];
const SPECIES_BY_ID = Object.fromEntries(SPECIES.map(s => [s.id, s]));

// ───────────────────────── 물건 ─────────────────────────
// r: 반지름 / hp·v: 기본 체력·가치 배율 / spill: 바닥 흔적 / paper: 종잇조각 / sturdy: 파편 대신 잔해
const ITEMS = {
  mug: { r: 13, hp: 1, v: 1, spill: '#6b3e1f', pal: ['#ff8fa3', '#8ecae6', '#ffd166', '#b8e0a8', '#ffffff'] },
  glass: { r: 10, hp: 0.7, v: 0.8, spill: '#7cc4ff', pal: ['#bde0fe'] },
  plate: { r: 17, hp: 1.2, v: 1.1, pal: ['#ffffff', '#e0fbfc', '#ffe5ec'] },
  books: { r: 17, hp: 1.5, v: 1.2, sturdy: true, paper: true, pal: ['#e63946', '#457b9d', '#2a9d8f', '#f4a261', '#6d597a'] },
  remote: { r: 12, hp: 1, v: 1, sturdy: true, pal: ['#333333', '#5c5c5c'] },
  plant: { r: 16, hp: 1.8, v: 1.6, spill: 'dirt', pal: ['#e07a5f', '#c9ada7', '#81b29a'] },
  tp: { r: 13, hp: 0.8, v: 0.7, sturdy: true, paper: true, pal: ['#ffffff'] },
  vase: { r: 14, hp: 2, v: 2, spill: '#7cc4ff', pal: ['#4361ee', '#f72585', '#4cc9f0', '#ffb703'] },
  bottle: { r: 11, hp: 1.4, v: 1.3, spill: '#9d0208', pal: ['#2d6a4f', '#9d0208', '#6a4c93'] },
  bowl: { r: 16, hp: 1.3, v: 1.2, spill: '#f4a261', pal: ['#f1faee', '#ffafcc', '#a8dadc'] },
  teacup: { r: 11, hp: 1, v: 1.3, spill: '#c08457', pal: ['#ffffff', '#ffd6e0'] },
  clock: { r: 15, hp: 2.5, v: 2.2, pal: ['#ef476f', '#118ab2', '#ffd166'] },
  yarn: { r: 13, hp: 1.2, v: 1.2, sturdy: true, pal: ['#ff70a6', '#70d6ff', '#ffd670'] },
  trash: { r: 18, hp: 2.2, v: 1.4, sturdy: true, paper: true, pal: ['#adb5bd', '#90be6d'] },
  lamp: { r: 17, hp: 3, v: 2.8, pal: ['#ffe8a3', '#caffbf', '#ffc6ff'] },
  floorplant: { r: 24, hp: 4, v: 3.2, spill: 'dirt', pal: ['#bc6c25', '#e9edc9'] },
  duck: { r: 12, hp: 1.5, v: 1.7, sturdy: true, pal: ['#ffd60a'] },
  cake: { r: 18, hp: 3, v: 3.5, spill: '#ffc8dd', sturdy: true, pal: ['#ffc8dd', '#fff1e6'] },
  phone: { r: 12, hp: 3, v: 5, pal: ['#222222'] },
  fishbowl: { r: 19, hp: 5, v: 6, spill: '#7cc4ff', pal: ['#a2d2ff'] },
  laptop: { r: 22, hp: 8, v: 10, pal: ['#adb5bd'] },
  wine: { r: 10, hp: 3, v: 8, spill: '#7b1e3a', pal: ['#f1e3e4'] },
  trophy: { r: 14, hp: 7, v: 9, sturdy: true, pal: ['#ffd700'] },
  teapot: { r: 17, hp: 6, v: 10, spill: '#c08457', pal: ['#f8f9fa', '#cdb4db'] },
  candle: { r: 16, hp: 6, v: 10, sturdy: true, pal: ['#d4af37'] },
  bust: { r: 22, hp: 14, v: 22, w: 0.5, pal: ['#e9ecef'] },
  bigvase: { r: 26, hp: 18, v: 28, w: 0.5, spill: '#7cc4ff', pal: ['#1d3557', '#9d0208'] },
  // 큰 가구형 물건 (드물게, 튼튼하고 비쌈)
  tv: { r: 34, hp: 16, v: 18, big: true, w: 0.4, pal: ['#6f8a9e', '#8fb3c7'] },
  fridge: { r: 32, hp: 22, v: 22, big: true, sturdy: true, w: 0.35, pal: ['#f3ede2', '#dfe7e0'] },
  sofa: { r: 36, hp: 20, v: 20, big: true, sturdy: true, w: 0.35, pal: ['#8fa98b', '#c9846e', '#8fb3c7'] },
  bookcase: { r: 34, hp: 18, v: 16, big: true, sturdy: true, paper: true, w: 0.4, pal: ['#a47a57'] },
  washer: { r: 30, hp: 18, v: 17, big: true, sturdy: true, w: 0.35, pal: ['#f3ede2'] },
  dresser: { r: 34, hp: 18, v: 18, big: true, sturdy: true, w: 0.4, pal: ['#c8a27a', '#a47a57'] },
  // 도시 물건
  cone: { r: 14, hp: 1.5, v: 1.4, sturdy: true, pal: ['#ff922b'] },
  hydrant: { r: 15, hp: 5, v: 4, spill: '#7cc4ff', pal: ['#e03131'] },
  bench: { r: 20, hp: 7, v: 6, w: 0.5, sturdy: true, pal: ['#c08552', '#8ecae6'] },
  vending: { r: 24, hp: 12, v: 12, w: 0.35, spill: '#ffd43b', pal: ['#e03131', '#1c7ed6', '#2f9e44'] },
  bike: { r: 20, hp: 5, v: 5, sturdy: true, pal: ['#1c7ed6', '#e03131', '#f59f00'] },
  car: { r: 40, hp: 40, v: 45, sturdy: true, big: true, w: 0.08, pal: ['#c9745b', '#8fb3c7', '#e6b35a', '#f3ede2', '#8fa98b'] },
  crate: { r: 18, hp: 3, v: 3, spill: '#ff8787', pal: ['#ff6b6b', '#ffa94d', '#8ce99a'] },
  mailbox: { r: 14, hp: 4, v: 3.5, paper: true, sturdy: true, pal: ['#e03131'] },
  flowerpot: { r: 17, hp: 2.5, v: 2.2, spill: 'dirt', pal: ['#ff8fab', '#ffd43b', '#b197fc'] },
  umbrella: { r: 26, hp: 4, v: 4, sturdy: true, pal: ['#e03131', '#1c7ed6', '#40c057'] },
  scooter: { r: 18, hp: 6, v: 6, sturdy: true, pal: ['#63e6be', '#ff8787', '#fcc419'] },
  pizza: { r: 15, hp: 1.5, v: 2, sturdy: true, pal: ['#e9c46a'] },
  balloon: { r: 20, hp: 1, v: 3, pal: ['#ff6b6b', '#ffd43b', '#74c0fc', '#b197fc', '#8ce99a'] },
  sign: { r: 18, hp: 6, v: 5, sturdy: true, pal: ['#1c7ed6', '#2f9e44'] },
};

// ───────────────────────── 도시 구역 ─────────────────────────
// grid: 3×3 도시 격자 위치 / tier: 물건 체력·가치 단계 / cost: 확장 비용
// 새 구역을 추가하려면 여기에 한 줄 + 배경 이미지만 넣으면 된다.
const DISTRICTS = [
  { id: 'home', name: '우리 집', img: 'home', grid: [1, 1], tier: 0, cost: 0, indoor: true,
    items: ['mug', 'glass', 'plate', 'books', 'remote', 'plant', 'tp', 'vase', 'bottle', 'bowl', 'tv', 'sofa', 'bookcase', 'floorplant'] },
  { id: 'alley', name: '골목길', img: 'alley', grid: [2, 1], tier: 1, cost: 400,
    items: ['trash', 'cone', 'flowerpot', 'mailbox', 'bike', 'yarn', 'tp', 'bottle', 'washer', 'fridge', 'sofa'] },
  { id: 'store', name: '편의점 앞', img: 'store', grid: [2, 0], tier: 2, cost: 12000,
    items: ['vending', 'cone', 'crate', 'umbrella', 'bottle', 'scooter', 'pizza', 'trash', 'fridge'] },
  { id: 'park', name: '공원', img: 'park', grid: [1, 0], tier: 3, cost: 4e5,
    items: ['bench', 'floorplant', 'balloon', 'hydrant', 'bike', 'duck', 'trash', 'flowerpot'] },
  { id: 'market', name: '시장 거리', img: 'market', grid: [0, 0], tier: 4, cost: 1.5e7,
    items: ['crate', 'umbrella', 'bowl', 'cake', 'scooter', 'car', 'crate', 'fishbowl'] },
  { id: 'cafe', name: '카페 거리', img: 'cafe', grid: [0, 1], tier: 5, cost: 6e8,
    items: ['umbrella', 'teacup', 'cake', 'laptop', 'phone', 'bike', 'lamp', 'mug', 'sofa', 'bookcase'] },
  { id: 'plaza', name: '분수 광장', img: 'plaza', grid: [0, 2], tier: 6, cost: 3e10,
    items: ['bust', 'bigvase', 'balloon', 'bench', 'hydrant', 'car', 'flowerpot'] },
  { id: 'downtown', name: '도심 사거리', img: 'downtown', grid: [1, 2], tier: 7, cost: 1.5e12,
    items: ['car', 'cone', 'cone', 'vending', 'hydrant', 'scooter', 'sign', 'bike'] },
  { id: 'mansion', name: '재벌 저택', img: 'mansion', grid: [2, 2], tier: 8, cost: 1e14, indoor: true,
    items: ['wine', 'candle', 'teapot', 'bust', 'bigvase', 'trophy', 'fishbowl', 'laptop', 'dresser', 'bookcase', 'tv', 'sofa'] },
];
const DW = 1600, DH = 900;       // 구역 하나의 크기
const CITY_COLS = 3, CITY_ROWS = 3;

// ───────────────────────── 스킬 트리 ─────────────────────────
// max 0 = 무한 / req: [선행 스킬, 필요 레벨] / grid: [열, 행(0=아래)]
const SKILLS = [
  // 공격
  { id: 'claw', icon: '🐾', name: '날카로운 발톱', max: 0, base: 10, grow: 1.6, grid: [0, 0], req: null,
    desc: l => `모든 고양이 공격력 ×${fx(Math.pow(1.15, l))} → ×${fx(Math.pow(1.15, l + 1))}` },
  { id: 'haste', icon: '☕', name: '캣닢 커피', max: 20, base: 80, grow: 1.7, grid: [0, 1], req: ['claw', 5],
    desc: l => `공격 속도 +${l * 5}% → +${(l + 1) * 5}%` },
  { id: 'crit', icon: '💥', name: '급소 찾기', max: 10, base: 2000, grow: 1.9, grid: [0, 2], req: ['haste', 10],
    desc: l => `크리티컬 확률 +${l * 3}% → +${(l + 1) * 3}%` },
  { id: 'critDmg', icon: '🗡️', name: '치명적인 냥펀치', max: 10, base: 1e5, grow: 2, grid: [0, 3], req: ['crit', 10],
    desc: l => `크리티컬 피해 ×${(2 + 0.5 * l).toFixed(1)} → ×${(2 + 0.5 * (l + 1)).toFixed(1)}` },
  { id: 'chain', icon: '🎳', name: '연쇄 폭발', max: 5, base: 5e7, grow: 3, grid: [0, 4], req: ['critDmg', 5],
    desc: l => `박살난 물건이 폭발해 주변에 피해 (반경 ${l ? 50 + 20 * l : 0} → ${50 + 20 * (l + 1)})` },
  // 고양이
  { id: 'move', icon: '💨', name: '우다다', max: 15, base: 25, grow: 1.6, grid: [1, 0], req: null,
    desc: l => `이동 속도 +${l * 10}% → +${(l + 1) * 10}%` },
  { id: 'tower', icon: '🏰', name: '캣타워 증축', max: 29, base: 150, grow: 2.15, grid: [1, 1], req: ['move', 3],
    desc: l => `도시에서 활동하는 고양이 최대 ${1 + l}마리 → ${2 + l}마리` },
  { id: 'coffee', icon: '😴', name: '낮잠 금지령', max: 5, base: 3000, grow: 2.3, grid: [1, 2], req: ['tower', 3],
    desc: l => `고양이가 낮잠 잘 확률 -${l * 18}% → -${(l + 1) * 18}%` },
  { id: 'bond', icon: '💞', name: '합사 효과', max: 10, base: 5e4, grow: 2.1, grid: [1, 3], req: ['coffee', 5],
    desc: l => `도감 레벨 1당 공격력 +${50 + l * 10}% → +${50 + (l + 1) * 10}% (도감 레벨은 보유 수 1·2·4·8·16…마다 상승)` },
  { id: 'rally', icon: '📣', name: '집사의 부름', max: 5, base: 2e4, grow: 2.2, grid: [1, 4], req: ['bond', 3],
    desc: l => `클릭 지점으로 달려가는 시간 ${3 + l}초 → ${4 + l}초, 이동 속도 ×${(1.8 + 0.3 * l).toFixed(1)} → ×${(1.8 + 0.3 * (l + 1)).toFixed(1)}` },
  // 에너지
  { id: 'energy', icon: '✨', name: '고양이 에너지', max: 10, base: 60, grow: 1.8, grid: [2, 0], req: null,
    desc: l => `에너지 등장 확률 ${(5 + 1.2 * l).toFixed(1)}% → ${(5 + 1.2 * (l + 1)).toFixed(1)}%, 등장 간격 ${(8 / (1 + 0.15 * l)).toFixed(1)}초 → ${(8 / (1 + 0.15 * (l + 1))).toFixed(1)}초` },
  { id: 'bouncy', icon: '🏀', name: '에너지 조준', max: 8, base: 1500, grow: 2, grid: [2, 1], req: ['energy', 4],
    desc: l => `고양이가 에너지를 다른 에너지 쪽으로 쳐낼 확률 ${25 + l * 10}% → ${25 + (l + 1) * 10}%` },
  { id: 'sturdy', icon: '🛡️', name: '튼튼 에너지', max: 5, base: 3e4, grow: 2.4, grid: [2, 2], req: ['bouncy', 8],
    desc: l => `에너지가 깨지기 전까지 버티는 충돌 ${3 + l}번 → ${4 + l}번` },
  { id: 'luck', icon: '🍀', name: '냥운', max: 10, base: 3e5, grow: 2, grid: [2, 3], req: ['sturdy', 5],
    desc: l => `희귀한 고양이가 태어날 확률 +${l * 15}% → +${(l + 1) * 15}%` },
  { id: 'fever', icon: '🎉', name: '탄생 축제', max: 3, base: 1e9, grow: 4, grid: [2, 4], req: ['luck', 10],
    desc: l => `고양이가 태어나면 모든 고양이 ${l * 3}초 → ${(l + 1) * 3}초간 광란(공속 ×2)` },
  // 경제 (물량이 폭발적으로 늘어나는 축)
  { id: 'value', icon: '💎', name: '비싼 물건 취향', max: 0, base: 30, grow: 1.7, grid: [3, 0], req: null,
    desc: l => `물건 가치 ×${fx(Math.pow(1.12, l))} → ×${fx(Math.pow(1.12, l + 1))}` },
  { id: 'spawn', icon: '📦', name: '택배 폭주', max: 0, base: 50, grow: 1.6, grid: [3, 1], req: ['value', 2],
    desc: l => `배송 속도 +${l * 15}% → +${(l + 1) * 15}%, 한 번에 ${1 + Math.floor(l / 3)}개 → ${1 + Math.floor((l + 1) / 3)}개씩` },
  { id: 'storage', icon: '🏚️', name: '물건 사재기', max: 0, base: 200, grow: 1.55, grid: [3, 2], req: ['spawn', 3],
    desc: l => `화면에 쌓이는 물건 최대 ${18 + 4 * l}개 → ${18 + 4 * (l + 1)}개 (난동 레벨이 오르면 더 늘어남)` },
  { id: 'truck', icon: '🚚', name: '택배 트럭', max: 10, base: 2e4, grow: 2.2, grid: [3, 3], req: ['storage', 8],
    desc: l => `${l ? 60 - 3 * l : '-'}초마다 트럭이 물건 ${l ? 20 + 15 * l : 0}개를 쏟아부음 → ${60 - 3 * (l + 1)}초 · ${20 + 15 * (l + 1)}개` },
  { id: 'rush', icon: '🌋', name: '블랙 프라이데이', max: 5, base: 5e9, grow: 3, grid: [3, 4], req: ['truck', 10],
    desc: l => `트럭이 올 때 모든 구역에 동시에 쏟아부음 · 물건 가치 ×${1 + l} → ×${2 + l} (트럭 물건만)` },
  // 황금 / 방치
  { id: 'offline', icon: '🌙', name: '밤샘 난동', max: 10, base: 500, grow: 2, grid: [4, 0], req: null,
    desc: l => `게임을 꺼둔 동안 수입 ${25 + l * 7.5}% → ${25 + (l + 1) * 7.5}% (최대 12시간)` },
  { id: 'territory', icon: '🧭', name: '영역 넓히기', max: 0, base: 120, grow: 1.9, grid: [4, 1], req: null,
    desc: l => `카메라가 갈 수 있는 원형 영역 반경 +${l * 50} → +${(l + 1) * 50} (지역마다 물건·고양이가 달라요)` },
  { id: 'gold', icon: '👑', name: '황금 물건', max: 10, base: 2e5, grow: 2, grid: [4, 2], req: ['value', 10],
    desc: l => `황금 물건(가치 ×10) 확률 ${l * 3}% → ${(l + 1) * 3}%` },
  // 재롱 (웃긴 묘기): 배워야 고양이들이 한다
  { id: 'flip', icon: '🤸', name: '공중제비', max: 5, base: 150, grow: 2.1, grid: [5, 0], req: null,
    desc: l => `물건을 부순 뒤 ${l * 6}% → ${(l + 1) * 6}% 확률로 공중제비, 착지 충격파(반경 ${60 + 15 * (l + 1)})` },
  { id: 'moonwalk', icon: '🕺', name: '문워크', max: 3, base: 1200, grow: 2.4, grid: [5, 1], req: ['flip', 1],
    desc: l => `산책 중 가끔 문워크! 뒤로 미끄러지며 밟는 물건을 부숨 (발동률 Lv${l} → Lv${l + 1})` },
  { id: 'axel', icon: '⛸️', name: '트리플 악셀', max: 5, base: 8000, grow: 2.3, grid: [5, 2], req: ['flip', 3],
    desc: l => `부순 뒤 ${l * 4}% → ${(l + 1) * 4}% 확률로 3회전 점프! 착지 3연속 충격파(피해 ×3) + 콤보 +5` },
  { id: 'spin', icon: '🌀', name: '꼬리잡기', max: 3, base: 20000, grow: 2.5, grid: [5, 3], req: ['moonwalk', 2],
    desc: l => `제 꼬리를 쫓아 빙글빙글, 주변 에너지를 빨아들여 합체를 도움 (반경 ${250 + 60 * l} → ${250 + 60 * (l + 1)})` },
  { id: 'windmill', icon: '🌪️', name: '윈드밀', max: 5, base: 3e5, grow: 2.4, grid: [5, 4], req: ['axel', 3],
    desc: l => `누워서 브레이크댄스! ${l * 3}% → ${(l + 1) * 3}% 확률 (큰 물건 부수면 확정), 도는 동안 주변 연속 피해` },
  { id: 'jackpot', icon: '🎰', name: '황금 잭팟', max: 5, base: 5e8, grow: 2.6, grid: [4, 3], req: ['gold', 10],
    desc: l => `황금 물건이 부서지면 에너지 ${l}개 → ${l + 1}개 추가로 튀어나옴` },
];
const SKILL_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));

function fx(v) { return v < 1000 ? v.toFixed(2) : fmt(v); }

const NAP_LINES = ['Zzz...', '냥...', '5분만...', '(식빵 굽는 중)', '츄르 꿈...'];
const KILL_LINES = ['냥!', '와장창!', '헤헷', '또 사면 되지', '내 탓 아님', '꾹꾹', '이 동네 내가 접수'];
const WANDER_LINES = ['산책 중~', '냥냥', '여긴 내 구역', '(킁킁)', '저건 뭐지?'];

// ───────────────────────── 고양이 종별 스킬 트리 ─────────────────────────
// 모든 종이 같은 뼈대(공격 → 속도/이동 → 급소)를 쓰고, '특수 강화'와 '각성'만 종마다 다르다.
// 비용은 희귀도 배율(CAT_RARITY_COST)만큼 비싸진다.
const CAT_RARITY_COST = [1, 3, 10, 30, 100];
const CAT_SPECIALS = {
  cheese: { name: '동네 인싸', icon: '🧡', desc: l => `이 고양이가 부순 물건에서 에너지 확률 +${l * 2}% → +${(l + 1) * 2}%` },
  mackerel: { name: '푸른 연타', icon: '💙', desc: l => `공격이 한 번 더 들어갈 확률 ${l * 12}% → ${(l + 1) * 12}%` },
  tuxedo: { name: '신사의 일격', icon: '🎩', desc: l => `크리티컬 피해 +${l * 50}% → +${(l + 1) * 50}%` },
  chonk: { name: '털뭉치 압박', icon: '☁️', desc: l => `깔아뭉개기 범위 +${l * 20} → +${(l + 1) * 20}, ${l >= 4 ? '2타' : '3타'}마다 → ${l + 1 >= 4 ? '2타' : '3타'}마다` },
  loaf: { name: '짧은 다리 롤링', icon: '🌀', desc: l => `굴러가며 주는 피해 +${l * 30}% → +${(l + 1) * 30}%` },
  ninja: { name: '정글의 그림자', icon: '🐆', desc: l => `순간이동 쿨타임 ${(1.6 - 0.25 * l).toFixed(2)}초 → ${(1.6 - 0.25 * (l + 1)).toFixed(2)}초` },
  laser: { name: '관통 눈빛', icon: '👁️', desc: l => `레이저가 뒤에 있는 물건 ${l}개 → ${l + 1}개까지 관통` },
  gym: { name: '헤비급 펀치', icon: '🥊', desc: l => `추가 공격력 +${l * 30}% → +${(l + 1) * 30}%` },
  box: { name: '박치기 달인', icon: '💢', desc: l => `날려보내는 힘 +${l * 25}% → +${(l + 1) * 25}%` },
  space: { name: '블랙홀', icon: '🕳️', desc: l => `에너지 끌어당기기 반경 +${l * 80} → +${(l + 1) * 80}, 주기 -${l * 0.5}초 → -${(l + 1) * 0.5}초` },
  liquid: { name: '흐물흐물 대홍수', icon: '🌊', desc: l => `지속 피해 범위 +${l * 15} → +${(l + 1) * 15}` },
  fire: { name: '대마법', icon: '🔮', desc: l => `화염 사거리 +${l * 25} → +${(l + 1) * 25}` },
  tower: { name: '왕의 명령', icon: '👑', desc: l => `동시에 공격하는 수 ${3 + l}개 → ${4 + l}개` },
  duck: { name: '초음파 포효', icon: '🦖', desc: l => `포효 충격파 범위 +${l * 25} → +${(l + 1) * 25}` },
};
const CAT_SKILLS = [
  { id: 'dmg', icon: '⚔️', name: '공격 훈련', max: 20, base: 50, grow: 1.6, grid: [1, 0], req: null,
    desc: l => `이 고양이 공격력 ×${fx(Math.pow(1.25, l))} → ×${fx(Math.pow(1.25, l + 1))}` },
  { id: 'spd', icon: '⚡', name: '순발력', max: 10, base: 200, grow: 1.8, grid: [0, 1], req: ['dmg', 3],
    desc: l => `공격 속도 +${l * 8}% → +${(l + 1) * 8}%` },
  { id: 'move', icon: '👟', name: '발놀림', max: 5, base: 150, grow: 1.7, grid: [2, 1], req: ['dmg', 3],
    desc: l => `이동 속도 +${l * 12}% → +${(l + 1) * 12}%` },
  { id: 'crit', icon: '🎯', name: '급소 노리기', max: 5, base: 1000, grow: 2, grid: [0, 2], req: ['spd', 5],
    desc: l => `크리티컬 확률 +${l * 4}% → +${(l + 1) * 4}%` },
  { id: 'special', icon: '✨', name: '특수 강화', max: 5, base: 5000, grow: 2.2, grid: [2, 2], req: ['move', 3], special: true,
    desc: () => '' },
  { id: 'ult', icon: '🌟', name: '각성', max: 1, base: 1e6, grow: 1, grid: [1, 3], req: ['special', 5],
    desc: () => '공격력 ×3, 몸에서 빛이 난다 (아무튼 멋있음)' },
];

// ───────────────────────── 끝없이 넓어지는 도시 ─────────────────────────
// 5×5 타일. 가운데가 우리 집, 바깥으로 갈수록 물건이 단단하고 비싸진다.
// 물건을 부술수록 활동 영역이 넓어지고 카메라 화각도 따라 넓어진다.
const CITY_N = 7;
// 가운데는 우리 집, 모서리는 재벌 저택, 나머지는 도시 구역을 고르게 섞음 (항상 같은 배치)
const TILE_MAP = (() => {
  const pool = ['alley', 'store', 'park', 'market', 'cafe', 'plaza', 'downtown'];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const m = [];
  for (let r = 0; r < CITY_N; r++) {
    m.push([]);
    for (let c = 0; c < CITY_N; c++) {
      const corner = (r === 0 || r === CITY_N - 1) && (c === 0 || c === CITY_N - 1);
      m[r].push(r === 3 && c === 3 ? 'home' : corner ? 'mansion' : pool[(rnd() * pool.length) | 0]);
    }
  }
  return m;
})();
const EXPAND_MAX = 20;
const expandNeed = E => Math.floor(20 * Math.pow(1.45, E));  // 다음 확장까지 부숴야 하는 물건 수
let TILT = 0.85;   // 3/4 탑다운: 바닥은 거의 위에서, 고양이·물건은 세워서 그림 (0.62~1.0 비교 후 결정)

// 지역마다 태어나는 고양이 종이 다르다 (에너지가 합쳐진 장소 기준)
const REGION_CATS = {
  home: ['cheese', 'mackerel', 'tuxedo', 'chonk'],
  alley: ['mackerel', 'tuxedo', 'box', 'ninja', 'duck'],
  store: ['cheese', 'box', 'loaf', 'laser'],
  park: ['cheese', 'loaf', 'chonk', 'space', 'duck'],
  market: ['mackerel', 'gym', 'fire', 'tower'],
  cafe: ['tuxedo', 'loaf', 'liquid', 'space'],
  plaza: ['cheese', 'gym', 'laser', 'duck', 'tower'],
  downtown: ['ninja', 'box', 'laser', 'fire'],
  mansion: ['tuxedo', 'chonk', 'space', 'liquid', 'tower'],
};
// 난동 레벨: 물건을 부술수록 오르고(= 플레이 시간), 물건 체력·가치·배송량·영역이 함께 커진다
const levelNeed = L => Math.floor(25 * Math.pow(1.2, L - 1));
