'use strict';
// ───────────────────────── 등급(티어) ─────────────────────────
// 고양이처럼 일반·레어·에픽·유니크·전설·신화.
// 등급은 기본 체급(크기·기본 힘)과 특수 능력의 세기만 정한다. 실제 개성은 종마다 다른 특수 능력(ABILITY) + 종별 스킬 트리.
// w: 탄생 시 기본 확률 가중치 (난동 등급이 오를수록 높은 등급 쪽으로 기움)
// ab: 특수 능력 세기 배율 / cost: 종별 스킬 트리 비용 배율
const TIERS = [
  { name: '일반', col: '#a8a29a', size: 1, dmg: 1, spd: 1, w: 62, ab: 1, cost: 1 },
  { name: '레어', col: '#7fa8bf', size: 1.12, dmg: 2, spd: 1.05, w: 25, ab: 1.3, cost: 3 },
  { name: '에픽', col: '#a58bb8', size: 1.25, dmg: 4, spd: 1.1, w: 9, ab: 1.7, cost: 10 },
  { name: '유니크', col: '#c9846e', size: 1.4, dmg: 8, spd: 1.15, w: 3, ab: 2.2, cost: 30 },
  { name: '전설', col: '#d9a441', size: 1.6, dmg: 16, spd: 1.1, w: 0.8, ab: 3, cost: 100 },
  { name: '신화', col: '#d9786a', size: 1.85, dmg: 32, spd: 1.2, w: 0.2, ab: 4, cost: 300 },
];

// 털색 프리셋 (실제 쥐·설치류)
const FUR = {
  brown: { body: '#8c7a6b', belly: '#cbbba8', ear: '#d9a9a0' },                 // 시궁쥐
  grey: { body: '#9a958d', belly: '#d6d1c8', ear: '#e0b8b0' },                  // 생쥐
  white: { body: '#f3ede2', belly: '#ffffff', ear: '#f2b8b0', eye: '#c9504a' }, // 흰 실험쥐 (빨간 눈)
  hooded: { body: '#f3ede2', belly: '#ffffff', ear: '#e0b8b0', hood: '#5b5550' }, // 후디드 래트
  field: { body: '#b38b63', belly: '#ecdcc4', ear: '#e0b0a0' },                 // 들쥐
  black: { body: '#4f4a45', belly: '#7d746b', ear: '#c9a9a0' },
  golden: { body: '#e3a867', belly: '#f6e3c5', ear: '#e8b0a4' },                // 골든 햄스터
  djungarian: { body: '#b9b1a6', belly: '#f3ede2', ear: '#e0b8b0', stripe: '#6f6861' },
  gerbil: { body: '#c9a27e', belly: '#f3e6d4', ear: '#e0b0a0' },
  chinchilla: { body: '#b8bcc0', belly: '#eef0f2', ear: '#d8c8cc' },
  green: { body: '#9dbb8f', belly: '#d5e6c9', ear: '#c6dcb5' },
  neon: { body: '#e6d36a', belly: '#f7f0b8', ear: '#f0dc9a' },
  steel: { body: '#9fb2bd', belly: '#d7e1e6', ear: '#b9d3dc' },
  purple: { body: '#a58bb8', belly: '#dccde6', ear: '#cdb4db' },
  ghost: { body: '#f6f3ee', belly: '#ffffff', ear: '#e8e0e6' },
};

// ───────────────────────── 종 (54종) ─────────────────────────
// 메인은 쥐. 햄스터·저빌·친칠라 같은 설치류가 몇 종 섞여 있다.
// 평범 등급만 맨몸이고, 나머지는 전부 코스튬 버전.
// shape: 'rat'(긴 몸·뾰족 주둥이·긴 꼬리) · 'mouse'(작고 날렵) · 'hamster'(동글·짧은 꼬리)
// acc: 코스튬 목록 (그리기는 game.js 의 ACC) / 이미지는 assets/rats/<id>.png 가 생기면 그걸 씀
// en: 이미지 생성 프롬프트용 영문 묘사 (rats/PROMPTS.txt 와 같은 내용)
const R = (id, tier, shape, name, fur, acc, desc, en) => ({ id, tier, shape, name, fur, acc, desc, en });
const RSPECIES = [
  // 0 평범: 실제 쥐들 (맨몸)
  R('brownrat', 0, 'rat', '시궁쥐', 'brown', [], '하수구 출신의 정통파. 숫자가 곧 힘이다.', 'a brown rat (Rattus norvegicus)'),
  R('mouse', 0, 'mouse', '생쥐', 'grey', [], '작고 재빠르다. 벽 틈이면 어디든 들어간다.', 'a small grey house mouse'),
  R('labrat', 0, 'rat', '흰 실험쥐', 'white', [], '빨간 눈의 연구소 토박이. 미로는 이제 지겹다.', 'a white laboratory rat with red eyes'),
  R('hooded', 0, 'rat', '후디드 래트', 'hooded', [], '머리만 까만 후드를 쓴 것처럼 생겼다. 본인은 멋있다고 생각한다.', 'a hooded rat: white body with a dark grey head and shoulders'),
  R('fieldmouse', 0, 'mouse', '들쥐', 'field', [], '시골에서 올라왔다. 도시는 처음이다.', 'a tan field mouse'),
  R('hamster', 0, 'hamster', '골든 햄스터', 'golden', [], '쥐들의 먼 사촌. 볼에 해바라기씨를 잔뜩 넣고 따라왔다.', 'a golden hamster with full cheek pouches'),
  // 1 직장인: 일상 코스튬
  R('scientist', 1, 'rat', '연구원 쥐', 'white', ['labcoat', 'goggles'], '실험 대상이었는데 어느새 연구원 행세를 하고 있다.', 'a white rat wearing a tiny lab coat and safety goggles'),
  R('nerd', 1, 'rat', '안경 쥐', 'grey', ['glasses', 'pencil'], '탈출 경로를 계산 중. 계산은 틀렸다.', 'a grey rat with round glasses and a pencil behind its ear'),
  R('builder', 1, 'rat', '공사장 쥐', 'brown', ['hardhat'], '벽 부수기 전문. 안전모는 폼이다.', 'a brown rat wearing a yellow construction hard hat'),
  R('chef', 1, 'rat', '요리사 쥐', 'grey', ['chefhat', 'scarf'], '어디선가 본 것 같은 요리사. 치즈 요리만 18가지.', 'a grey rat in a tall white chef hat and a small red neck scarf'),
  R('traveler', 1, 'hamster', '배낭여행 햄스터', 'golden', ['backpack', 'cap'], '해바라기씨를 챙겨서 쥐들을 따라나섰다.', 'a golden hamster with a little backpack and a baseball cap'),
  R('mailman', 1, 'mouse', '집배원 생쥐', 'field', ['mailcap', 'mailbag'], '편지는 배달 안 하고 봉투만 갉는다.', 'a field mouse mail carrier with a cap and a shoulder mail bag'),
  R('courier', 1, 'rat', '택배 기사 쥐', 'brown', ['cap', 'parcel'], '배송 완료. 상자는 이미 갉아먹었다.', 'a brown rat delivery courier in a cap carrying a cardboard parcel'),
  R('party', 1, 'mouse', '파티 생쥐', 'grey', ['partyhat', 'confetti'], '매일이 파티다. 오늘도 뭔가 부서졌으니까.', 'a grey mouse in a striped party cone hat with confetti around'),
  // 2 돌연변이·취미
  R('glowy', 2, 'rat', '형광 쥐', 'neon', ['glow'], '실험 약품을 쏟았다. 밤에도 잘 보인다.', 'a glowing neon-yellow mutant rat with a soft aura'),
  R('mutant', 2, 'rat', '더듬이 돌연변이', 'green', ['glow', 'antenna'], '더듬이가 났다. 와이파이도 잡힌다.', 'a pale green mutant rat with two little antennae'),
  R('buff', 2, 'rat', '근육 쥐', 'brown', ['headband', 'muscle'], '쳇바퀴를 3만 바퀴 돌았다. 3대 500.', 'an absurdly muscular brown rat with a sweatband, flexing'),
  R('ninja', 2, 'rat', '닌자 쥐', 'black', ['ninja'], '하수구에서 무술을 배웠다. 피자를 좋아한다.', 'a black rat ninja with a red headband mask'),
  R('pandahamster', 2, 'hamster', '판다 잠옷 정글리안', 'djungarian', ['pandahood', 'bamboo'], '판다 잠옷을 입은 햄스터. 쥐들의 마스코트.', 'a Djungarian hamster in a panda pajama hood holding a bamboo stick'),
  R('skater', 2, 'mouse', '스케이터 생쥐', 'grey', ['beanie', 'skateboard'], '보드 타고 벽에 들이받는 게 취미.', 'a grey mouse in a beanie riding a small skateboard'),
  R('idol', 2, 'mouse', '아이돌 생쥐', 'white', ['bow', 'mic'], '찍찍! 오늘도 팬들(쥐)에게 둘러싸였다.', 'a white mouse pop idol with a big hair bow holding a microphone'),
  R('sleepy', 2, 'rat', '잠옷 쥐', 'grey', ['nightcap', 'pillow'], '자다가 끌려나왔다. 눈은 감고 갉는다.', 'a sleepy grey rat in a striped nightcap hugging a tiny pillow'),
  // 3 특수부대
  R('cyborg', 3, 'rat', '사이보그 쥐', 'steel', ['cyber'], '연구소가 만든 최종 병기… 였는데 탈주했다.', 'a cyborg rat with metal plates and a glowing red eye lens'),
  R('police', 3, 'rat', '경찰 쥐', 'grey', ['policecap', 'badge'], '자기 자신을 체포하려다 포기했다.', 'a grey rat police officer with a navy cap and a gold badge'),
  R('firefighter', 3, 'rat', '소방관 쥐', 'brown', ['firehelmet'], '불은 끄고, 벽은 부순다.', 'a brown rat firefighter in a red helmet'),
  R('pirate', 3, 'rat', '해적 쥐', 'brown', ['pirate', 'eyepatch'], '하수구를 항해하는 무법자. 보물은 치즈.', 'a brown rat pirate with a tricorn hat and an eye patch'),
  R('cowboy', 3, 'mouse', '카우보이 생쥐', 'field', ['cowboy', 'scarf'], '이 동네는 둘이 쓰기엔 너무 좁군.', 'a field mouse cowboy with a wide brown hat and a red bandana'),
  R('soldier', 3, 'rat', '특공대 쥐', 'green', ['armyhelmet', 'camo'], '위장 완료. 근데 쥐는 원래 잘 안 보인다.', 'a rat commando in a green army helmet and camouflage vest'),
  R('nurse', 3, 'mouse', '간호사 생쥐', 'white', ['nursecap'], '다친 쥐를 돌본다. 물건은 안 돌본다.', 'a white mouse nurse with a small nurse cap'),
  R('miner', 3, 'gerbil', '광부 저빌', 'gerbil', ['minerlamp'], '벽을 파는 게 본업. 헤드랜턴이 자랑.', 'a gerbil miner with a helmet headlamp'),
  // 4 전설: 판타지·대중문화
  R('hero', 4, 'mouse', '슈퍼 생쥐', 'grey', ['cape', 'mask'], '망토를 두르면 하늘을 난다고 믿는다. 못 난다.', 'a grey mouse superhero with a red cape and a domino mask'),
  R('wizard', 4, 'rat', '마법사 쥐', 'purple', ['wizard', 'wand'], '치즈를 금으로 바꾸는 주문을 연구 중이다. 반대로 됐다.', 'a rat wizard in a starry purple pointed hat holding a wand'),
  R('samurai', 4, 'rat', '사무라이 쥐', 'black', ['samurai'], '해바라기씨를 반으로 가르는 검술의 달인.', 'a black rat samurai with a topknot and a tiny katana'),
  R('rocker', 4, 'rat', '록스타 쥐', 'hooded', ['guitar', 'sunglasses'], '하수구 투어 매진. 관객은 전부 쥐다.', 'a hooded rat rock star in sunglasses with an electric guitar'),
  R('detective', 4, 'rat', '탐정 쥐', 'brown', ['detective', 'pipe'], '범인은 이 안에 있다. 사실 전부 범인이다.', 'a brown rat detective in a deerstalker hat with a pipe'),
  R('vampire', 4, 'rat', '뱀파이어 쥐', 'black', ['vampire'], '피 대신 토마토 주스를 마신다. 가끔 케첩.', 'a black rat vampire with a high-collared cape and tiny fangs'),
  R('santa', 4, 'mouse', '산타 생쥐', 'white', ['santa', 'sack'], '선물 대신 부서진 물건을 나눠준다.', 'a white mouse Santa with a red hat and a gift sack'),
  R('zombie', 4, 'rat', '좀비 쥐', 'green', ['bandage'], '뇌… 가 아니라 치즈…', 'a pale green zombie rat with bandages, arms forward'),
  // 5 신화: 왕족
  R('ratking', 5, 'rat', '쥐왕', 'brown', ['crown', 'robe'], '모든 쥐의 왕. 인간 세상 정복을 선언했다.', 'a brown rat king with a gold crown and a red royal robe'),
  R('ratqueen', 5, 'rat', '쥐 여왕', 'white', ['tiara', 'robe'], '우아하게, 그러나 확실하게 갉는다.', 'a white rat queen with a tiara and a red royal robe'),
  R('emperor', 5, 'rat', '쥐 황제', 'grey', ['emperor'], '하수구 제국의 황제. 영토는 맨홀 뚜껑 세 개.', 'a grey rat emperor in a yellow embroidered imperial robe and hat'),
  R('pharaoh', 5, 'mouse', '파라오 생쥐', 'field', ['pharaoh'], '피라미드 대신 치즈 더미를 쌓았다.', 'a mouse pharaoh with a blue-and-gold striped nemes headdress'),
  R('knight', 5, 'rat', '기사 쥐', 'steel', ['knight'], '갑옷이 너무 무겁다. 그래도 들이받는다.', 'a rat knight in shiny armor with a helmet plume'),
  R('viking', 5, 'rat', '바이킹 쥐', 'brown', ['viking'], '뿔 투구를 쓰고 하수구를 약탈한다.', 'a brown rat viking with a horned helmet and a round shield'),
  R('sultan', 5, 'hamster', '술탄 햄스터', 'golden', ['turban'], '해바라기씨 궁전의 주인. 볼주머니에 보물이 가득.', 'a golden hamster sultan with a jeweled turban'),
  R('ballerina', 5, 'mouse', '프리마 발레리나 생쥐', 'white', ['tutu', 'tiara'], '백조의 호수 대신 하수구의 호수.', 'a white mouse prima ballerina in a pink tutu and tiara'),
  // 5 신화: 우주·저세상
  R('astro', 5, 'rat', '우주비행사 쥐', 'white', ['spacesuit'], '다음 목표는 달. 달은 치즈라고 들었다.', 'a rat astronaut in a white space suit with a round glass helmet'),
  R('alien', 5, 'mouse', '외계인 생쥐', 'green', ['alien'], '지구를 정복하러 왔는데 생쥐가 되어버렸다.', 'a green alien mouse with big black eyes and two antennae'),
  R('robot', 5, 'rat', '로봇 쥐', 'steel', ['robot'], '100% 기계. 가끔 치즈를 연료로 넣는다.', 'a boxy retro robot rat made of steel plates'),
  R('dragon', 5, 'rat', '드래곤 쥐', 'purple', ['dragon'], '입에서 불 대신 치즈 냄새가 난다.', 'a rat in a purple dragon costume with wings and spikes'),
  R('cosmic', 5, 'hamster', '우주 친칠라', 'chinchilla', ['halo', 'cosmic'], '쳇바퀴를 너무 빨리 돌려서 시공간을 넘어버린 친칠라.', 'a cosmic chinchilla with a golden halo and tiny stars around'),
  R('ghost', 5, 'rat', '유령 쥐', 'ghost', ['sheet'], '이불을 뒤집어쓰고 벽을 통과… 하려다 부쉈다.', 'a rat under a white bedsheet ghost costume with eye holes, tail sticking out'),
  R('angel', 5, 'mouse', '천사 생쥐', 'white', ['wings', 'halo'], '쥐 천국에서 내려왔다. 천국에도 치즈는 없었다.', 'a white mouse angel with feathered wings and a halo'),
  R('dino', 5, 'rat', '공룡 잠옷 쥐', 'brown', ['dinohood'], '공룡 잠옷을 입었더니 자기가 공룡인 줄 안다. 크아앙.', 'a rat in a green dinosaur pajama onesie with spikes'),
];
const RSPECIES_BY_ID = Object.fromEntries(RSPECIES.map(s => [s.id, s]));

// ───────────────────────── 특수 능력 ─────────────────────────
// 종마다 하나씩. 세기 P = 등급 배율(TIERS.ab) × (1 + 0.35 × 특수 강화 레벨). 실제 동작은 game.js 의 abilities 부분.
const pct = v => Math.round(v * 100) + '%';
const AB_TYPES = {
  pack: P => `주변 쥐 1마리당 피해 +${pct(0.06 * P)} (최대 10마리)`,
  wall: P => `벽에 주는 피해 ×${(1 + 2 * P).toFixed(1)}`,
  dash: P => `돌진 속도 ×${(1 + 0.15 * P).toFixed(2)}, 돌진 박치기 피해 ×${(1 + 0.2 * P).toFixed(2)}`,
  knock: P => `물건을 ×${(1 + 0.3 * P).toFixed(1)} 세게 날림 (날아간 물건 충돌 피해도 ↑)`,
  breed: P => `번식 쿨타임 ÷${(1 + 0.5 * P).toFixed(1)}, 새끼가 윗등급일 확률 ↑`,
  loot: P => `이 쥐가 부순 물건 치즈 ×${(1 + 0.4 * P).toFixed(1)}`,
  crit: P => `크리티컬 확률 +${pct(Math.min(0.55, 0.08 * P))}, 크리티컬 ×${(3 + 0.5 * P).toFixed(1)}`,
  double: P => `한 번 더 갉을 확률 ${pct(Math.min(0.9, 0.2 * P))}`,
  bomb: P => `들이받을 때 ${pct(Math.min(0.6, 0.15 * P))} 확률로 폭탄 투척 (반경 ${Math.round(70 + 10 * P)})`,
  gift: P => `택배가 떨어질 때 화면에 있으면 자기 주변에 ${1 + Math.floor(P / 2)}개 추가 배달`,
  trick: P => `부딪힐 때 ${pct(Math.min(0.6, 0.08 * P))} 확률로 전매특허 묘기`,
  aura: P => `주변(반경 ${Math.round(50 + 12 * P)})에 계속 방사능 피해`,
  chain: P => `이 쥐가 부순 물건은 크게 폭발 (반경 +${Math.round(25 * P)})`,
  teleport: P => `${(2.5 / (1 + 0.25 * P)).toFixed(1)}초마다 순간이동해서 물건을 급습 (피해 ×2)`,
  cannon: P => `부딪힐 때 ${pct(Math.min(0.5, 0.07 * P))} 확률로 몸을 말아 대포알처럼 튕겨다님`,
  leader: P => `반경 180 안의 동료 쥐 피해·속도 +${pct(0.1 * P)}`,
  snore: P => `자주 잠듦. 자는 동안 코골이 충격파 (반경 ${Math.round(60 + 15 * P)})`,
  laser: P => `${(3 / (1 + 0.25 * P)).toFixed(1)}초마다 레이저 발사, 물건 ${1 + Math.floor(P)}개 관통`,
  pierce: P => `돌진할 때 멈추지 않고 물건을 뚫고 지나감 (피해 ×${(1 + 0.2 * P).toFixed(2)})`,
  gold: P => `갉은 물건이 ${pct(Math.min(0.4, 0.04 * P))} 확률로 황금으로 변함 (치즈 ×10)`,
  fire: P => `${(2.5 / (1 + 0.2 * P)).toFixed(1)}초마다 앞쪽으로 불꽃 (사거리 ${Math.round(110 + 20 * P)})`,
  slam: P => `부딪힐 때마다 쿵! 착지 충격파 (반경 ${Math.round(40 + 10 * P)})`,
};
// [종 id, 능력 종류, 이름, 아이콘, (trick 종류)]
const AB_LIST = [
  ['brownrat', 'pack', '떼거리 근성', '🐀'], ['mouse', 'wall', '벽 틈 갉기', '🧱'], ['labrat', 'dash', '미로 질주', '🌀'],
  ['hooded', 'knock', '후드 박치기', '💢'], ['fieldmouse', 'breed', '시골 다산', '💞'], ['hamster', 'loot', '볼주머니', '🌻'],
  ['scientist', 'bomb', '플라스크 투척', '⚗️'], ['nerd', 'crit', '약점 계산', '🤓'], ['builder', 'wall', '해체 작업', '⛏️'],
  ['chef', 'double', '칼질 연타', '🔪'], ['traveler', 'loot', '여행 가방', '🎒'], ['mailman', 'gift', '등기 배달', '✉️'],
  ['courier', 'gift', '총알 배송', '📦'], ['party', 'trick', '파티 브레이크', '🎉', 'windmill'],
  ['glowy', 'aura', '형광 오라', '☢️'], ['mutant', 'chain', '불안정 세포', '🧬'], ['buff', 'knock', '3대 500', '💪'],
  ['ninja', 'teleport', '그림자 이동', '🥷'], ['pandahamster', 'cannon', '판다 구르기', '🐼'], ['skater', 'trick', '킥플립', '🛹', 'flip'],
  ['idol', 'leader', '팬서비스', '🎤'], ['sleepy', 'snore', '천둥 코골이', '😴'],
  ['cyborg', 'laser', '눈빛 레이저', '👁️'], ['police', 'crit', '현행범 체포', '🚨'], ['firefighter', 'wall', '도끼 돌파', '🪓'],
  ['pirate', 'loot', '약탈', '🏴‍☠️'], ['cowboy', 'knock', '올가미 던지기', '🤠'], ['soldier', 'bomb', '수류탄', '💣'],
  ['nurse', 'breed', '산후조리', '💉'], ['miner', 'wall', '갱도 굴착', '⛏️'],
  ['hero', 'pierce', '초음속 돌파', '🦸'], ['wizard', 'gold', '연금술', '🔮'], ['samurai', 'pierce', '발도술', '⚔️'],
  ['rocker', 'leader', '헤드뱅잉', '🎸'], ['detective', 'crit', '추리 완료', '🔍'], ['vampire', 'chain', '피의 폭발', '🦇'],
  ['santa', 'gift', '선물 폭탄', '🎁'], ['zombie', 'double', '끝없는 식욕', '🧟'],
  ['ratking', 'leader', '왕의 호령', '👑'], ['ratqueen', 'breed', '여왕의 산란', '👸'], ['emperor', 'leader', '황제의 칙령', '📜'],
  ['pharaoh', 'loot', '피라미드 보물', '🏺'], ['knight', 'pierce', '기사 돌격', '🛡️'], ['viking', 'knock', '광전사', '🪓'],
  ['sultan', 'gold', '술탄의 보물고', '💎'], ['ballerina', 'trick', '그랑 푸에테', '🩰', 'axel'], ['astro', 'cannon', '무중력 튕기기', '🚀'],
  ['alien', 'laser', '광선총', '🛸'], ['robot', 'laser', '레이저 포', '🤖'], ['dragon', 'fire', '치즈 브레스', '🔥'],
  ['cosmic', 'aura', '우주 에너지', '🌌'], ['ghost', 'pierce', '벽 통과(실패)', '👻'], ['angel', 'breed', '축복', '😇'],
  ['dino', 'slam', '공룡 쿵쾅', '🦖'],
];
for (const [id, type, name, icon, trick] of AB_LIST) RSPECIES_BY_ID[id].ab = { type, name, icon, trick };
const abPower = (sp, l) => TIERS[sp.tier].ab * (1 + 0.35 * l);
const abDesc = (sp, l) => AB_TYPES[sp.ab.type](abPower(sp, l));

// ───────────────────────── 구역 (벽을 부수며 탈출) ─────────────────────────
// floor: 코드로 그리는 바닥 / img: 도시 배경 이미지 / wallHP: 다음 구역으로 가는 벽 체력
const ZONES = [
  { name: '비밀 연구실', floor: 'lab', items: ['beaker', 'tube', 'microscope', 'computer', 'cage', 'clipboard', 'mug'], wallHP: 600 },
  { name: '연구소 복도', floor: 'corridor', items: ['extinguisher', 'watercooler', 'trash', 'plant', 'computer', 'books', 'mug'], wallHP: 2.5e4 },
  { name: '하수구', floor: 'sewer', items: ['pipe', 'trashbag', 'bottle', 'crate', 'tp', 'yarn'], wallHP: 8e5 },
  { name: '골목길', img: 'alley', items: ['trash', 'cone', 'mailbox', 'bike', 'flowerpot', 'washer', 'trashbag'], wallHP: 3e7 },
  { name: '편의점 앞', img: 'store', items: ['vending', 'crate', 'umbrella', 'pizza', 'bottle', 'fridge'], wallHP: 1e9 },
  { name: '도심 사거리', img: 'downtown', items: ['car', 'cone', 'hydrant', 'sign', 'scooter', 'vending'], wallHP: 4e10 },
  { name: '시청 광장', img: 'plaza', items: ['bust', 'bigvase', 'bench', 'balloon', 'hydrant', 'car'], wallHP: Infinity },
];

// 연구실 소품 (기존 도시 물건 목록에 추가)
Object.assign(ITEMS, {
  beaker: { r: 14, hp: 1, v: 1, spill: '#9dd5a8', pal: ['#bfe3ea'] },
  tube: { r: 13, hp: 0.8, v: 0.9, spill: '#e8a3a0', pal: ['#e8a3a0', '#9dd5a8', '#8fb3c7'] },
  microscope: { r: 18, hp: 2.5, v: 2.4, sturdy: true, pal: ['#f3ede2'] },
  computer: { r: 22, hp: 3, v: 3, sturdy: true, pal: ['#b9b1a6'] },
  cage: { r: 24, hp: 3.5, v: 2.8, sturdy: true, pal: ['#a9a39a'] },
  clipboard: { r: 14, hp: 0.9, v: 0.8, paper: true, sturdy: true, pal: ['#c8a27a'] },
  extinguisher: { r: 14, hp: 2, v: 1.8, spill: '#ffffff', pal: ['#c9745b'] },
  watercooler: { r: 18, hp: 3, v: 2.6, spill: '#8fb3c7', pal: ['#bfe3ea'] },
  pipe: { r: 22, hp: 4, v: 3, sturdy: true, pal: ['#8e8a84'] },
  trashbag: { r: 18, hp: 1.5, v: 1.2, paper: true, sturdy: true, pal: ['#5b5550'] },
});

// ───────────────────────── 공용 스킬 트리 ─────────────────────────
// max 0 = 무한 / grid: [열, 행] (행 0 이 아래) / req: [선행 스킬, 필요 레벨]
const RSKILLS = [
  // 갉기
  { id: 'teeth', icon: '🦷', name: '이빨 강화', max: 0, base: 10, grow: 1.55, grid: [0, 0], req: null,
    desc: l => `모든 쥐의 갉는 힘 ×${fx(Math.pow(1.2, l))} → ×${fx(Math.pow(1.2, l + 1))}` },
  { id: 'critc', icon: '🎯', name: '급소 물기', max: 10, base: 150, grow: 1.9, grid: [0, 1], req: ['teeth', 5],
    desc: l => `크리티컬 확률 ${5 + 2 * l}% → ${5 + 2 * (l + 1)}%` },
  { id: 'chainx', icon: '🎳', name: '연쇄 폭발', max: 5, base: 3000, grow: 2.6, grid: [0, 2], req: ['critc', 3],
    desc: l => `박살난 물건의 폭발 반경 +${l * 20} → +${(l + 1) * 20}, 폭발 피해 ↑` },
  { id: 'hitstun', icon: '💥', name: '묵직한 한 방', max: 5, base: 4e4, grow: 2.8, grid: [0, 3], req: ['chainx', 3],
    desc: l => `날아간 물건끼리 부딪힐 때 보너스 치즈 ×${1 + l} → ×${2 + l}` },
  // 무리
  { id: 'speed', icon: '💨', name: '날쌘 발', max: 15, base: 30, grow: 1.6, grid: [1, 0], req: null,
    desc: l => `이동 속도 +${l * 8}% → +${(l + 1) * 8}%` },
  { id: 'nest', icon: '🪹', name: '둥지 확장', max: 40, base: 40, grow: 1.45, grid: [1, 1], req: ['speed', 2],
    desc: l => `최대 개체 수 ${30 + 10 * l} → ${40 + 10 * l}` },
  { id: 'breed', icon: '💞', name: '번식력', max: 15, base: 60, grow: 1.7, grid: [1, 2], req: ['nest', 3],
    desc: l => `번식 쿨타임 ${(4 / (1 + 0.2 * l)).toFixed(1)}초 → ${(4 / (1 + 0.2 * (l + 1))).toFixed(1)}초` },
  { id: 'mutate', icon: '🧬', name: '돌연변이 유전자', max: 20, base: 300, grow: 1.8, grid: [1, 3], req: ['breed', 3],
    desc: l => `태어날 때 윗등급이 나올 확률 +${l * 3}% → +${(l + 1) * 3}%` },
  { id: 'frenzy', icon: '🎉', name: '탄생 축제', max: 5, base: 2e5, grow: 2.6, grid: [1, 4], req: ['mutate', 5],
    desc: l => `새끼가 태어나면 그 주변 쥐들이 ${l * 1.5}초 → ${(l + 1) * 1.5}초간 광란 (속도·피해 ×1.5)` },
  // 탈출
  { id: 'dig', icon: '⛏️', name: '굴착 본능', max: 0, base: 80, grow: 1.6, grid: [2, 0], req: null,
    desc: l => `벽에 주는 피해 ×${fx(Math.pow(1.3, l))} → ×${fx(Math.pow(1.3, l + 1))}` },
  { id: 'rush', icon: '📣', name: '총공격', max: 10, base: 100, grow: 1.9, grid: [2, 1], req: ['dig', 2],
    desc: l => `클릭 돌진 ${(1.5 + 0.2 * l).toFixed(1)}초 → ${(1.5 + 0.2 * (l + 1)).toFixed(1)}초, 돌진 중 피해 ×${(2 + 0.3 * l).toFixed(1)} → ×${(2 + 0.3 * (l + 1)).toFixed(1)}` },
  { id: 'offline', icon: '🌙', name: '야행성', max: 10, base: 500, grow: 2, grid: [2, 2], req: ['rush', 2],
    desc: l => `꺼둔 동안 수입 ${25 + l * 7.5}% → ${25 + (l + 1) * 7.5}% (최대 12시간)` },
  // 물량
  { id: 'cheese', icon: '🧀', name: '치즈 감별사', max: 0, base: 25, grow: 1.6, grid: [3, 0], req: null,
    desc: l => `물건에서 나오는 치즈 ×${fx(Math.pow(1.15, l))} → ×${fx(Math.pow(1.15, l + 1))}` },
  { id: 'spawn', icon: '🧪', name: '실험 재료 반입', max: 20, base: 50, grow: 1.6, grid: [3, 1], req: ['cheese', 2],
    desc: l => `물건 자동 배송 속도 +${l * 15}% → +${(l + 1) * 15}%, 한 번에 ${1 + Math.floor(l / 3)}개 → ${1 + Math.floor((l + 1) / 3)}개씩` },
  { id: 'stock', icon: '🏚️', name: '물건 사재기', max: 20, base: 200, grow: 1.6, grid: [3, 2], req: ['spawn', 3],
    desc: l => `화면에 채워지는 물건 수 +${Math.round(l * 12.5)}% → +${Math.round((l + 1) * 12.5)}%` },
  { id: 'truck', icon: '🚚', name: '실험 재료 트럭', max: 10, base: 5000, grow: 2.2, grid: [3, 3], req: ['stock', 5],
    desc: l => `택배 투하 ${Math.max(30, 60 - 3 * l)}초 → ${Math.max(30, 60 - 3 * (l + 1))}초마다 (최소 30초), 한 번에 ${Math.min(45, 15 + 3 * l)}개 → ${Math.min(45, 15 + 3 * (l + 1))}개` },
  { id: 'goldx', icon: '👑', name: '황금 물건', max: 10, base: 3e4, grow: 2.1, grid: [3, 4], req: ['truck', 3],
    desc: l => `황금 물건(치즈 ×10) 확률 ${l * 2}% → ${(l + 1) * 2}%` },
  // 재롱 (물건과 부딪히면 우스꽝스러운 묘기)
  { id: 'flip', icon: '🤸', name: '백덤블링', max: 5, base: 120, grow: 2.1, grid: [4, 0], req: null,
    desc: l => `물건에 부딪히면 ${4 + l * 4}% → ${4 + (l + 1) * 4}% 확률로 백덤블링, 착지 충격파` },
  { id: 'axel', icon: '⛸️', name: '트리플 악셀', max: 5, base: 6000, grow: 2.3, grid: [4, 2], req: ['flip', 3],
    desc: l => `부딪히면 ${l * 3}% → ${(l + 1) * 3}% 확률로 3회전 점프! 착지 3연속 충격파 + 콤보 +5` },
  { id: 'windmill', icon: '🌪️', name: '윈드밀', max: 5, base: 5e4, grow: 2.4, grid: [4, 3], req: ['axel', 3],
    desc: l => `누워서 브레이크댄스! ${l * 3}% → ${(l + 1) * 3}% 확률 (큰 물건이면 3배), 도는 동안 주변 연속 피해` },
  { id: 'cannon', icon: '🎱', name: '쥐 대포알', max: 5, base: 2e4, grow: 2.5, grid: [5, 1], req: ['flip', 1],
    desc: l => `부딪히면 ${l * 3}% → ${(l + 1) * 3}% 확률로 몸을 말아 핀볼처럼 튕겨다니며 파괴` },
  { id: 'tumble', icon: '⚽', name: '헤딩 저글링', max: 5, base: 8e4, grow: 2.5, grid: [5, 3], req: ['cannon', 2],
    desc: l => `공중에 뜬 물건을 또 치면 받는 AIR 보너스 ×${1 + l} → ×${2 + l}` },
];
const RSKILL_BY_ID = Object.fromEntries(RSKILLS.map(s => [s.id, s]));

// ───────────────────────── 종별 스킬 트리 ─────────────────────────
// 모든 종이 같은 뼈대를 쓰고, '특수 능력'만 종마다 다르다. 비용은 등급 배율(TIERS.cost)만큼 비싸진다.
const RAT_TREE = [
  { id: 'dmg', icon: '⚔️', name: '갉기 훈련', max: 25, base: 40, grow: 1.6, grid: [1, 0], req: null,
    desc: l => `이 종의 갉는 힘 ×${fx(Math.pow(1.25, l))} → ×${fx(Math.pow(1.25, l + 1))}` },
  { id: 'legs', icon: '👟', name: '뒷발 근육', max: 10, base: 150, grow: 1.8, grid: [0, 1], req: ['dmg', 3],
    desc: l => `돌진 속도 +${l * 8}% → +${(l + 1) * 8}%` },
  { id: 'show', icon: '🤹', name: '재롱 본능', max: 5, base: 200, grow: 1.9, grid: [2, 1], req: ['dmg', 3],
    desc: l => `묘기 확률 ×${(1 + 0.4 * l).toFixed(1)} → ×${(1 + 0.4 * (l + 1)).toFixed(1)}` },
  { id: 'crit', icon: '🎯', name: '급소 갉기', max: 5, base: 1000, grow: 2, grid: [0, 2], req: ['legs', 5],
    desc: l => `크리티컬 확률 +${l * 4}% → +${(l + 1) * 4}%` },
  { id: 'special', icon: '✨', name: '특수 강화', max: 5, base: 3000, grow: 2.3, grid: [2, 2], req: ['show', 2], special: true,
    desc: () => '' },
  { id: 'ult', icon: '🌟', name: '각성', max: 1, base: 5e5, grow: 1, grid: [1, 3], req: ['special', 5],
    desc: () => '갉는 힘 ×3, 특수 능력 세기 ×1.5, 몸에서 빛이 난다' },
];
const RAT_TREE_BY_ID = Object.fromEntries(RAT_TREE.map(s => [s.id, s]));
const rampNeed = R => Math.floor(15 * Math.pow(1.3, R));      // 난동 등급 R → R+1 에 필요한 파괴 수
const PROMOTE_COST = 10;                                       // 같은 등급 10마리 → 윗등급 랜덤 1마리 (신화는 승급 없음)
function fx(v) { return v < 1000 ? v.toFixed(2) : fmt(v); }
