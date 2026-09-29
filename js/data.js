'use strict';
// ───────────────────────── 스킬 정의 ─────────────────────────
// 클리커: 모든 스킬은 '클릭'을 계기로 발동한다.
// grid: [열, 행(0=맨 아래)] / req: 선행 스킬 id (그 스킬을 MAX 까지 올려야 해금)
// active.type: 'cd' = ⏱ 충전형(충전되면 다음 클릭에 자동 발동), 'count' = 🔢 연타형(N번째 클릭마다 발동)
const SKILLS = [
  // ── 발바닥 계열 ──
  { id: 'paw', icon: '🐾', name: '냥냥펀치', max: 5, base: 20, grow: 1.8, grid: [0, 0], req: null,
    desc: l => `클릭 펀치의 힘 +${l * 25}% → +${(l + 1) * 25}%` },
  { id: 'reach', icon: '🖐️', name: '왕발바닥', max: 5, base: 250, grow: 1.8, grid: [0, 1], req: 'paw',
    desc: l => `펀치 범위 +${l * 15}% → +${(l + 1) * 15}%` },
  { id: 'multi', icon: '👐', name: '분신 발바닥', max: 4, base: 3000, grow: 2, grid: [0, 2], req: 'reach',
    desc: l => `클릭할 때 주변에 추가 발바닥 ${l}개 → ${l + 1}개` },
  { id: 'echo', icon: '📣', name: '메아리 펀치', max: 3, base: 40000, grow: 2.2, grid: [0, 3], req: 'multi',
    desc: l => `같은 자리에 잠시 후 한 번 더 쾅! (${l}회 → ${l + 1}회)` },
  { id: 'godpaw', icon: '🦁', name: '신의 앞발', max: 3, base: 600000, grow: 3, grid: [0, 4], req: 'echo',
    active: { type: 'count', val: l => [60, 45, 30][Math.max(0, l - 1)] },
    desc: l => `[🔢 연타형] ${l ? [60, 45, 30][l - 1] : '-'}번 → ${[60, 45, 30][l]}번 클릭마다 거대한 앞발이 화면을 쓸어버림` },
  // ── 크리티컬 계열 ──
  { id: 'crit', icon: '💥', name: '크리티컬', max: 5, base: 300, grow: 1.9, grid: [1, 1], req: 'paw',
    desc: l => `크리티컬 확률 ${l * 2}% → ${(l + 1) * 2}% (힘 2배, 점수 배수)` },
  { id: 'critDmg', icon: '🗡️', name: '급소 공략', max: 3, base: 4000, grow: 2.2, grid: [1, 2], req: 'crit',
    desc: l => `크리티컬 점수 ×${3 + l} → ×${4 + l}` },
  { id: 'critBoom', icon: '💣', name: '크리티컬 폭발', max: 3, base: 50000, grow: 2.4, grid: [1, 3], req: 'critDmg',
    desc: l => `크리티컬 시 대폭발 (반경 ${l ? 110 + 30 * l : 0} → ${110 + 30 * (l + 1)})` },
  { id: 'laser', icon: '🔴', name: '레이저 눈빛', max: 4, base: 700000, grow: 2.4, grid: [1, 4], req: 'critBoom',
    active: { type: 'cd', val: l => 10 - 1.5 * l },
    desc: l => `[⏱ 충전형] ${l ? (10 - 1.5 * l).toFixed(1) : '-'}초 → ${(10 - 1.5 * (l + 1)).toFixed(1)}초마다 충전, 다음 클릭 방향으로 레이저` },
  // ── 콤보 계열 ──
  { id: 'frenzy', icon: '😾', name: '광란', max: 5, base: 40, grow: 1.8, grid: [2, 0], req: null,
    desc: l => `콤보 1당 펀치 힘 +${l}% → +${l + 1}%` },
  { id: 'combo', icon: '🔥', name: '콤보 장인', max: 5, base: 500, grow: 1.9, grid: [2, 1], req: 'frenzy',
    desc: l => `콤보 유지시간 +${(l * 0.3).toFixed(1)}초 · 콤보 배율 +${l * 25}% → +${(l + 1) * 25}%` },
  { id: 'mega', icon: '👊', name: '메가 펀치', max: 4, base: 6000, grow: 2.1, grid: [2, 2], req: 'combo',
    active: { type: 'count', val: l => 13 - 2 * l },
    desc: l => `[🔢 연타형] ${l ? 13 - 2 * l : '-'}번 → ${13 - 2 * (l + 1)}번 클릭마다 거대 펀치 (범위 ×3)` },
  { id: 'quake', icon: '🌋', name: '여진', max: 3, base: 80000, grow: 2.4, grid: [2, 3], req: 'mega',
    desc: l => `메가 펀치 후 여진 ${l}회 → ${l + 1}회` },
  // ── 물리/연쇄 계열 ──
  { id: 'bounce', icon: '🏀', name: '탱탱볼', max: 4, base: 60, grow: 1.9, grid: [3, 0], req: null,
    desc: l => `충돌·공중타 보너스 +${l * 50}% → +${(l + 1) * 50}%` },
  { id: 'chain', icon: '🎳', name: '연쇄 폭발', max: 5, base: 800, grow: 2, grid: [3, 1], req: 'bounce',
    desc: l => `박살난 물건이 폭발해 주변을 날림 (반경 ${l ? 45 + 18 * l : 0} → ${45 + 18 * (l + 1)})` },
  { id: 'hairball', icon: '🧶', name: '헤어볼 폭격', max: 4, base: 12000, grow: 2.2, grid: [3, 2], req: 'chain',
    active: { type: 'cd', val: l => 12 - 1.5 * l },
    desc: l => `[⏱ 충전형] ${l ? (12 - 1.5 * l).toFixed(1) : '-'}초 → ${(12 - 1.5 * (l + 1)).toFixed(1)}초마다 충전, 클릭 지점에 헤어볼 5발 폭격` },
  { id: 'dash', icon: '⚡', name: '우다다 돌진', max: 4, base: 150000, grow: 2.3, grid: [3, 3], req: 'hairball',
    active: { type: 'cd', val: l => 12 - 1.5 * l },
    desc: l => `[⏱ 충전형] ${l ? (12 - 1.5 * l).toFixed(1) : '-'}초 → ${(12 - 1.5 * (l + 1)).toFixed(1)}초마다 충전, 클릭 방향으로 벽까지 폭주` },
  // ── 괴력 (가구 날리기) ──
  { id: 'muscle', icon: '💪', name: '괴력', max: 5, base: 2000, grow: 2.6, grid: [4, 1], req: 'bounce',
    desc: l => `날릴 수 있는 가구: ${['없음', '의자·협탁·티테이블', '+식탁·책상', '+소파·안락의자', '+선반·조리대·만찬 테이블', '+침대·피아노'][l]} → ${['의자·협탁·티테이블', '+식탁·책상', '+소파·안락의자', '+선반·조리대·만찬 테이블', '+침대·피아노'][l]}` },
  { id: 'furnBoom', icon: '🧨', name: '가구 폭탄', max: 3, base: 60000, grow: 2.4, grid: [4, 2], req: 'muscle',
    desc: l => `날아간 가구가 떨어지면 대폭발 (반경 ${l ? 120 + 40 * l : 0} → ${120 + 40 * (l + 1)})` },
  { id: 'wreck', icon: '🏚️', name: '철거 전문가', max: 3, base: 500000, grow: 2.5, grid: [4, 3], req: 'furnBoom',
    desc: l => `가구 박살 점수 ×${1 + l} → ×${2 + l}, 가구 내구도 -${l * 20}% → -${(l + 1) * 20}%` },
  // ── 경제 ──
  { id: 'time', icon: '⏰', name: '주인 산책 연장', max: 5, base: 30, grow: 2, grid: [5, 0], req: null,
    desc: l => `제한시간 +${l * 4}초 → +${(l + 1) * 4}초` },
  { id: 'gold', icon: '👑', name: '황금 물건', max: 5, base: 1500, grow: 2.1, grid: [5, 1], req: 'time',
    desc: l => `물건이 황금(점수 ×10)일 확률 ${l * 3}% → ${(l + 1) * 3}%` },
  { id: 'jackpot', icon: '🎰', name: '황금 잭팟', max: 3, base: 30000, grow: 2.4, grid: [5, 2], req: 'gold',
    desc: l => `황금 물건이 박살나면 츄르 소나기 (추가 점수 ×${l * 3} → ×${(l + 1) * 3})` },
  { id: 'catastrophe', icon: '☄️', name: '대참사 모드', max: 1, base: 2000000, grow: 1, grid: [5, 3], req: 'jackpot',
    desc: () => '모든 파편이 무지개로 빛나고, 박살날 때마다 점수 ×2' },
  { id: 'value', icon: '💎', name: '비싼 물건 취향', max: 40, base: 50, grow: 1.6, grid: [6, 0], req: null,
    desc: l => `모든 점수 ×${Math.pow(1.3, l).toFixed(2)} → ×${Math.pow(1.3, l + 1).toFixed(2)}` },
];
const SKILL_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));

// ───────────────────────── 물건 정의 (탑뷰) ─────────────────────────
// r: 반지름 / v: 기본 점수 / spill: 바닥 흔적 / floor: 바닥에 놓이는 물건 / theme: 해당 방에서만
const ITEM_TYPES = [
  { k: 'mug', r: 13, v: 10, spill: '#6b3e1f', from: 1, pal: ['#ff8fa3', '#8ecae6', '#ffd166', '#b8e0a8', '#ffffff'] },
  { k: 'glass', r: 10, v: 8, spill: '#7cc4ff', from: 1, pal: ['#bde0fe'] },
  { k: 'plate', r: 17, v: 12, from: 1, pal: ['#ffffff', '#e0fbfc', '#ffe5ec'] },
  { k: 'books', r: 17, v: 12, paper: true, sturdy: true, from: 1, pal: ['#e63946', '#457b9d', '#2a9d8f', '#f4a261', '#6d597a'] },
  { k: 'plant', r: 16, v: 18, spill: 'dirt', from: 1, pal: ['#e07a5f', '#c9ada7', '#81b29a'] },
  { k: 'remote', r: 12, v: 9, sturdy: true, from: 1, pal: ['#333333', '#5c5c5c'] },
  { k: 'tp', r: 13, v: 8, floor: true, paper: true, sturdy: true, from: 1, pal: ['#ffffff'] },
  { k: 'vase', r: 14, v: 25, spill: '#7cc4ff', from: 2, pal: ['#4361ee', '#f72585', '#4cc9f0', '#ffb703'] },
  { k: 'bottle', r: 11, v: 14, spill: '#9d0208', from: 2, pal: ['#2d6a4f', '#9d0208', '#6a4c93'] },
  { k: 'bowl', r: 16, v: 12, spill: '#f4a261', from: 2, pal: ['#f1faee', '#ffafcc', '#a8dadc'] },
  { k: 'trash', r: 18, v: 10, floor: true, paper: true, sturdy: true, from: 2, pal: ['#adb5bd', '#90be6d'] },
  { k: 'clock', r: 15, v: 22, from: 3, pal: ['#ef476f', '#118ab2', '#ffd166'] },
  { k: 'lamp', r: 17, v: 30, from: 3, pal: ['#ffe8a3', '#caffbf', '#ffc6ff'] },
  { k: 'teacup', r: 11, v: 16, spill: '#c08457', from: 3, pal: ['#ffffff', '#ffd6e0'] },
  { k: 'floorplant', r: 24, v: 35, floor: true, spill: 'dirt', from: 3, pal: ['#bc6c25', '#e9edc9'] },
  { k: 'duck', r: 12, v: 16, sturdy: true, from: 4, pal: ['#ffd60a'] },
  { k: 'cake', r: 18, v: 40, spill: '#ffc8dd', sturdy: true, from: 4, pal: ['#ffc8dd', '#fff1e6'] },
  { k: 'yarn', r: 13, v: 12, sturdy: true, floor: true, from: 4, pal: ['#ff70a6', '#70d6ff', '#ffd670'] },
  { k: 'phone', r: 12, v: 60, from: 5, pal: ['#222222'] },
  { k: 'fishbowl', r: 19, v: 70, spill: '#7cc4ff', from: 5, pal: ['#a2d2ff'] },
  { k: 'laptop', r: 22, v: 120, from: 6, pal: ['#adb5bd'] },
  { k: 'trophy', r: 14, v: 90, sturdy: true, from: 7, pal: ['#ffd700'] },
  // 저택 전용
  { k: 'wine', r: 10, v: 110, spill: '#7b1e3a', from: 10, theme: 'hall', pal: ['#f1e3e4'] },
  { k: 'candle', r: 16, v: 150, sturdy: true, from: 10, theme: 'hall', pal: ['#d4af37'] },
  { k: 'teapot', r: 17, v: 140, spill: '#c08457', from: 10, theme: 'hall', pal: ['#f8f9fa', '#cdb4db'] },
  { k: 'bust', r: 22, v: 260, from: 11, theme: 'hall', floor: true, pal: ['#e9ecef'] },
  { k: 'bigvase', r: 26, v: 320, spill: '#7cc4ff', from: 11, theme: 'hall', floor: true, pal: ['#1d3557', '#9d0208'] },
];

// ───────────────────────── 가구 정의 (탑뷰) ─────────────────────────
// z: 윗면 높이 / tier: 날리려면 필요한 '괴력' 레벨 / wall: 벽에 붙는 가구 / rooms: 등장하는 방 종류
const FURNITURE_TYPES = [
  { k: 'chair', tier: 1, w: [50, 56], h: [50, 56], z: 30, rooms: ['living', 'kitchen', 'hall'] },
  { k: 'nightstand', tier: 1, w: [70, 80], h: [70, 80], z: 40, rooms: ['bed', 'living', 'hall'] },
  { k: 'coffee', tier: 1, w: [140, 190], h: [80, 100], z: 28, rooms: ['living', 'bed'] },
  { k: 'table', tier: 2, w: [170, 240], h: [110, 150], z: 45, rooms: ['living', 'kitchen', 'bed'] },
  { k: 'round', tier: 2, w: [130, 160], h: [130, 160], z: 45, round: true, rooms: ['living', 'kitchen', 'hall'] },
  { k: 'desk', tier: 2, w: [200, 250], h: [90, 110], z: 48, rooms: ['bed', 'living'] },
  { k: 'sofa', tier: 3, w: [220, 260], h: [90, 100], z: 25, rooms: ['living', 'hall'] },
  { k: 'armchair', tier: 3, w: [90, 100], h: [90, 100], z: 25, rooms: ['hall', 'living'] },
  { k: 'shelf', tier: 4, w: [220, 320], h: [55, 65], z: 70, wall: true, rooms: ['living', 'bed', 'kitchen', 'hall'] },
  { k: 'counter', tier: 4, w: [280, 380], h: [70, 80], z: 55, wall: true, rooms: ['kitchen'] },
  { k: 'dining', tier: 4, w: [340, 420], h: [120, 140], z: 50, rooms: ['hall', 'kitchen'] },
  { k: 'bed', tier: 5, w: [210, 240], h: [260, 290], z: 30, wall: true, rooms: ['bed'] },
  { k: 'piano', tier: 5, w: [200, 220], h: [130, 150], z: 60, rooms: ['hall'] },
];

// 방 종류 → 배경 이미지
const ROOM_IMG = { living: 'home', bed: 'home', kitchen: 'kitchen', hall: 'mansion' };

// 스테이지별 맵 구성 (cols × rows 개의 방, 각 방은 1280×720)
function mapLayoutFor(n) {
  if (n <= 3) return { cols: 1, rows: 1, name: '원룸', roles: ['living'] };
  if (n <= 6) return { cols: 2, rows: 1, name: '투룸', roles: ['bed', 'living'] };
  if (n <= 9) return { cols: 2, rows: 2, name: '아파트', roles: ['bed', 'living', 'kitchen', 'living'] };
  if (n <= 13) return { cols: 3, rows: 2, name: '저택', roles: ['hall', 'kitchen', 'hall', 'bed', 'hall', 'hall'] };
  return { cols: 3, rows: 3, name: '대저택', roles: ['hall', 'hall', 'hall', 'kitchen', 'hall', 'hall', 'bed', 'hall', 'hall'] };
}

const COMBO_WORDS = [
  [10, 'NICE!', '#7bdff2'], [25, 'GREAT!', '#b2f7ef'], [50, 'AWESOME!!', '#ffd166'],
  [80, 'CHAOS!!', '#ff9f1c'], [120, 'MEOWHEM!!!', '#ff4d6d'], [180, '냥아포칼립스!!!', '#c77dff'], [260, '우주 대참사!!!!', '#80ffdb'],
];

const OWNER_LINES_START = ['착하게 있어~ 금방 올게!', '아무것도 건드리면 안 돼~', '편의점 다녀올게!', '오늘은 얌전히 있자?', '새로 산 물건이야, 조심해!'];
const OWNER_LINES_CAUGHT = ['야옹이...?!', '이게 다 뭐야!!!', '...진짜 너...', '아이고 내 컵...!', '내 피아노...!!'];
const OWNER_LINES_CLEAN = ['어머, 착하게 있었네?', '...뭔가 수상한데?'];
