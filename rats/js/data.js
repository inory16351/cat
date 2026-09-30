'use strict';
// ───────────────────────── 등급(티어) ─────────────────────────
// 고양이처럼 일반·레어·에픽·유니크·전설·신화.
// 등급은 기본 체급(크기·기본 힘)과 특수 능력의 세기만 정한다. 실제 개성은 종마다 다른 특수 능력(ABILITY) + 종별 스킬 트리.
// w: 탄생 시 기본 확률 가중치 (난동 등급이 오를수록 높은 등급 쪽으로 기움)
//    초반(난동 0)엔 레어 ≈7%, 에픽 ≈1%, 유니크 0.1%, 전설 0.01%, 신화 0.002% 로 윗등급은 거의 안 나옴
// ab: 특수 능력 세기 배율 / cost: 종별 스킬 트리 비용 배율
const TIERS = [
  { name: '일반', col: '#a8a29a', size: 1, dmg: 1, spd: 1, w: 100, ab: 1, cost: 1 },
  { name: '레어', col: '#7fa8bf', size: 1.12, dmg: 2, spd: 1.05, w: 8, ab: 1.3, cost: 3 },
  { name: '에픽', col: '#a58bb8', size: 1.25, dmg: 4, spd: 1.1, w: 1, ab: 1.7, cost: 10 },
  { name: '유니크', col: '#c9846e', size: 1.4, dmg: 8, spd: 1.15, w: 0.1, ab: 2.2, cost: 30 },
  { name: '전설', col: '#d9a441', size: 1.6, dmg: 16, spd: 1.1, w: 0.01, ab: 3, cost: 100 },
  { name: '신화', col: '#d9786a', size: 1.85, dmg: 32, spd: 1.2, w: 0.002, ab: 4, cost: 300 },
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
  // 패러디 쥐 (원작 디자인·이름·실존 인물 이름/외모는 쓰지 않고 비틂): 컴퓨터 마우스 쥐(에픽, 한 장짜리 그림) + 전설·신화 4종(전용 필살기)
  R('pcmouse', 2, 'mouse', '컴퓨터 마우스 쥐', 'grey', [], '얼굴이 없다. 그냥 진짜 마우스인데 혼자 돌아다닌다. 누르면 딸깍, 꼬리는 USB 케이블.', 'a REAL beige office computer mouse that came alive and runs around'),
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
  R('rocker', 4, 'rat', '쥐.D', 'hooded', ['guitar', 'sunglasses'], '하수구 투어 매진, 관객은 전부 쥐다. 무대 위에선 쥐.D, 무대 밖에선 그냥 시궁쥐.', 'a hooded rat rock star in sunglasses with an electric guitar'),
  R('detective', 4, 'rat', '탐정 쥐', 'brown', ['detective', 'pipe'], '범인은 이 안에 있다. 사실 전부 범인이다.', 'a brown rat detective in a deerstalker hat with a pipe'),
  R('vampire', 4, 'rat', '뱀파이어 쥐', 'black', ['vampire'], '피 대신 토마토 주스를 마신다. 가끔 케첩.', 'a black rat vampire with a high-collared cape and tiny fangs'),
  R('santa', 4, 'mouse', '산타 생쥐', 'white', ['santa', 'sack'], '선물 대신 부서진 물건을 나눠준다.', 'a white mouse Santa with a red hat and a gift sack'),
  R('zapham', 4, 'hamster', '찌릿 햄찌 (코스프레)', 'golden', [], '전기 쥐 코스프레 중인 햄스터. 사실 전기는 등에 멘 건전지에서 나온다.', 'a chubby golden hamster wearing a clearly HOMEMADE lumpy yellow fleece costume hood with two floppy felt ears with brown tips, round red circle STICKERS stuck crookedly on its cheeks, a zigzag CARDBOARD tail taped on with visible tape, and a big AA battery strapped to its back with a wire'),
  R('parkrat', 4, 'mouse', '쥐랜드 관광쥐', 'grey', [], '놀이공원 기념품 가게에서 산 동그란 귀 머리띠를 절대 안 벗는다. 자기가 원조라고 우긴다.', 'a grey mouse TOURIST wearing a cheap plastic souvenir headband with two round fuzzy black ears, heart-shaped pink sunglasses, a striped souvenir t-shirt with no text, a fanny pack, and holding a small heart-shaped balloon on a string'),
  R('plaguerat', 4, 'rat', '트위쥐', 'brown', [], '하수구 구석에서 킥킥거리며 나타난다. 석궁은 아이스크림 막대로 만들었다.', 'a sneaky hunched brown sewer rat in a tattered patched hooded rag cloak, one squinting eye and a crooked grin, holding a tiny homemade crossbow made of popsicle sticks and a rubber band, a small bubbling green bottle hanging from its belt'),
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
  R('streamrat', 5, 'rat', '흐에~ 스트리머 쥐', 'brown', [], '24시간 생방송 중인 안경 쥐. 뭘 부숴도 "흐에~~" 하고 웃는다. 도네가 들어오면 어쩔 수 없이 쥐커드를 한다.', 'a cheerful brown rat STREAMER wearing round black glasses and a big glowing gaming headset with a boom microphone, a comfy oversized hoodie, fingerless gloves, a tiny webcam clipped on the hood, holding a small game controller'),
  R('ramjui', 5, 'squirrel', '다람쥐', 'field', [], '도토리를 좋아하는 평범한 다람쥐. 정말 평범하다. …신화 등급인 데는 다 이유가 있겠지?', 'a completely ORDINARY cute red squirrel: warm orange-brown fur, a cream belly, a big bushy tail, small tufted ears, a calm innocent face, NO costume, NO accessories, NO special markings, nothing special at all'),
  R('jwerry', 5, 'mouse', '줴리', 'brown', [], '고양이를 골탕 먹이는 게 취미인 동글동글한 생쥐. 박수만 받으면 뻔뻔하게 허리 숙여 "감사합니다!!"', 'a TINY cheeky classic-cartoon-style mouse with RICH warm orange-brown fur (darker and more saturated, not pale), a big ROUND head with big round ears (pink insides), a cream muzzle and belly, a SLENDER small body (NOT chubby, NOT round-bellied), thin legs, a long thin tail, a smug little grin, NO clothes'),
  R('starchef', 5, 'rat', '슈퍼 요리사 쥐', 'grey', [], '코가 좋은 천재 요리사 쥐. 늘 요리사 등에 올라타 머리카락을 잡고 조종한다. 요리사는 퇴사를 고민 중.', 'a small blue-grey rat head chef. HEAD: blue-grey rat head wearing a tall white chef toque with three tiny gold stars pinned on it. TORSO: a normal HORIZONTAL rat body (longer than tall, like a four-legged rat lying level) dressed in a snug white double-breasted chef jacket that wraps the whole body like a little coat, two rows of small buttons along the side, a red neckerchief tied at the neck end (left end); NO hands, NO paws and NO arms drawn on the torso. FRONT LEG: blue-grey rat leg with a short white chef-jacket sleeve cuff at the top, the small paw holding a tiny wooden spoon. HIND LEG: normal slim rat hind leg, blue-grey fur with a pink foot'),
  R('dino', 5, 'rat', '공룡 잠옷 쥐', 'brown', ['dinohood'], '공룡 잠옷을 입었더니 자기가 공룡인 줄 안다. 크아앙.', 'a rat in a green dinosaur pajama onesie with spikes'),
];
const RSPECIES_BY_ID = Object.fromEntries(RSPECIES.map(s => [s.id, s]));
// 파츠 시트 프롬프트용 체형 설명 덮어쓰기 (dev/gen_parts_group.mjs)
RSPECIES_BY_ID.pcmouse.partsHint = 'it has NO face at all: no eyes, no nose, no mouth, no ears, no whiskers, no fur. HEAD part = the front end of the plastic mouse shell with the two click buttons and a small grey scroll wheel on top. TORSO part = the smooth rounded rear plastic shell. TAIL part = a long grey USB cable ending in a small USB plug. LEGS = tiny stubby grey rubber plastic feet (no paws, no toes). Everything is smooth glossy beige and grey plastic';

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
  ['pcmouse', 'double', '더블 클릭', '🖱️'], ['zapham', 'chain', '건전지 방전', '⚡'], ['parkrat', 'leader', '퍼레이드 인솔', '🎈'], ['streamrat', 'gift', '후원 택배 폭탄', '🎁'], ['starchef', 'chain', '비밀 레시피', '👨‍🍳'], ['ramjui', 'chain', '찌리찌리', '⚡'], ['jwerry', 'crit', '뻔뻔한 한 방', '😏'], ['plaguerat', 'bomb', '역병 플라스크', '🧪'],
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

// ───────────────────────── 연구소 층 (스테이지) ─────────────────────────
// 쥐들은 연구소를 탈출하려고 계속 위층으로 올라간다. 층마다 방 배치가 새로 생기고, 가장 먼 방에는 계단이 확정.
// 계단 방 벽을 부수고 계단에 닿으면 다음 층. BOSS_EVERY 층마다 계단 방에 보스가 버티고 있다.
// ZONES = 층 구간 (이름·바닥 그림·나오는 물건). from: 이 층부터
const ZONES = [
  { name: '지하 비밀 실험실', floor: 'lab', tint: null, from: 1, items: ['flask', 'erlen', 'beaker', 'tuberack', 'petri', 'pillbottle', 'syringe', 'clipboard', 'mug', 'goggles', 'specimen'] },
  { name: '실험동물 사육동', floor: 'corridor', tint: null, from: 5, items: ['flask', 'erlen', 'beaker', 'petri', 'syringe', 'cage', 'stool', 'extinguisher', 'watercooler', 'firstaid', 'microscope', 'biobin', 'specimen'] },
  { name: '약품 연구동', floor: 'lab', tint: 'rgba(157,213,168,.16)', from: 10, items: ['erlen', 'flask', 'pillbottle', 'syringe', 'microscope', 'monitor', 'centrifuge', 'cart', 'gastank', 'drum', 'tuberack', 'biobin'] },
  { name: '전산·관리동', floor: 'corridor', tint: 'rgba(143,179,199,.2)', from: 15, items: ['monitor', 'server', 'cart', 'stool', 'watercooler', 'mug', 'clipboard', 'firstaid', 'extinguisher', 'centrifuge'] },
  { name: '연구소장 층', floor: 'lab', tint: 'rgba(227,196,106,.18)', from: 20, items: ['monitor', 'server', 'drum', 'gastank', 'centrifuge', 'specimen', 'mug', 'cart', 'microscope', 'cage'] },
];
const BOSS_EVERY = 5, BOSS_TIME = 60;
// 보스 (BOSS_EVERY 층마다 자연 등장): 5 경비대장 → 10 광기의 수석 연구원 → 15 연구소장 → 20 거대 메인쿤 → 25 마녀 고양이 → 30 우주 고양이 → 이후 반복(더 강하게)
// cat: 고양이 방치 게임의 파츠 리그로 그리는 고양이 보스 / atk2: 가끔 섞어 쓰는 두 번째 공격
const BOSSES = [
  { id: 'boss_chief', name: '경비대장 강철수', title: '쥐는 한 마리도 못 지나간다!', atk: 'stomp', col: '#8fb3c7' },
  { id: 'boss_mad', name: '광기의 수석 연구원', title: '내 실험체들이 탈출해?!', atk: 'flask', col: '#9dd5a8' },
  { id: 'boss_director', name: '연구소장', title: '예산 삭감이다!!', atk: 'swing', col: '#d9786a' },
  { id: 'boss_cat', cat: 'gym', name: '실험체 제로 (거대 메인쿤)', title: '냐아아아옹!!!', atk: 'pounce', atk2: 'hairball', col: '#e39a5a' },
  // 특별 복장 고양이는 평소엔 거의 안 나오고 보스로 (고양이 방치 게임의 마녀 모자·우주복 고양이)
  { id: 'boss_witchcat', cat: 'fire', name: '대마법사 마녀 고양이', title: '냐브라카다브라!!', atk: 'fireball', atk2: 'pounce', col: '#cdb4db' },
  { id: 'boss_spacecat', cat: 'space', name: '우주 고양이 사령관', title: '이 연구소는 우주 냥국이 접수한다!', atk: 'gravity', atk2: 'pounce', col: '#a9d3dc' },
];
// 일반 사람 (쥐를 보면 기겁하고 도망감, 들이받으면 날아감)
const HUMAN_KINDS = [
  { id: 'researcher', name: '연구원', hp: 3, v: 6, spd: 1, from: 1, lines: ['쥐, 쥐다아아!!', '실험체가 탈출했어!', '꺄아아악!', '내 논문!!'] },
  { id: 'janitor', name: '청소부', hp: 3.5, v: 6, spd: 0.9, from: 1, lines: ['으악 쥐!!', '대걸레 어디 갔지?!', '퇴근할래…'] },
  { id: 'guard', name: '경비원', hp: 5, v: 9, spd: 1.1, from: 3, lines: ['거, 거기 서!', '지원 요청!!', '나 무서운 거 싫어!!'] },
  { id: 'cook', name: '요리사', hp: 4, v: 8, spd: 0.95, from: 2, lines: ['내 주방에 쥐가?!', '위생 점검 망했다!', '으악 쥐다!!', '누가 내 머리 잡아당겨?!'] },
];
const floorZone = f => { let z = ZONES[0]; for (const o of ZONES) if (f >= o.from) z = o; return z; };
const isBossFloor = f => f % BOSS_EVERY === 0;
const bossOf = f => BOSSES[(f / BOSS_EVERY - 1) % BOSSES.length];

// 연구소 물건 (Codex 이미지 assets/rats/fx/item_<id>.png, 서 있는 스프라이트로 그림)
// r: 반지름 · hp/v: 체력·치즈 배율 · big: 큰 물건 · sturdy: 튼튼 · spill: 깨지면 얼룩 · w: 나올 가중치
Object.assign(ITEMS, {
  flask: { r: 14, hp: 1, v: 1, spill: '#9dd5a8', pal: ['#bfe3ea', '#9dd5a8'] },
  erlen: { r: 14, hp: 1, v: 1.1, spill: '#e8a3a0', pal: ['#f2c6d6', '#e8a3a0'] },
  beaker: { r: 14, hp: 1, v: 1, spill: '#8fb3c7', pal: ['#bfe3ea'] },
  tuberack: { r: 16, hp: 1.4, v: 1.4, spill: '#e3c46a', pal: ['#c8a27a', '#9dd5a8'] },
  petri: { r: 13, hp: 0.8, v: 0.9, spill: '#c9dba0', pal: ['#e6efc2', '#c9dba0'] },
  pillbottle: { r: 12, hp: 1.2, v: 1.3, pal: ['#c8844a', '#f3ede2'] },
  syringe: { r: 14, hp: 0.9, v: 1.2, spill: '#8fb3c7', pal: ['#bfe3ea', '#8fb3c7'] },
  clipboard: { r: 14, hp: 0.9, v: 0.8, paper: true, sturdy: true, pal: ['#c8a27a', '#fbf7ef'] },
  mug: { r: 13, hp: 1, v: 1, spill: '#6b3e1f', pal: ['#f3ede2', '#8e8a84'] },
  goggles: { r: 15, hp: 1.3, v: 1.2, paper: true, sturdy: true, pal: ['#9dd5a8', '#c9745b'] },
  specimen: { r: 15, hp: 2, v: 2.4, spill: '#9dd5a8', pal: ['#9dd5a8', '#e8a3a0'] },
  cage: { r: 24, hp: 3.5, v: 2.8, sturdy: true, pal: ['#a9a39a', '#8fb3c7'] },
  stool: { r: 17, hp: 2.2, v: 1.8, sturdy: true, pal: ['#6f6a66', '#a9a39a'] },
  extinguisher: { r: 14, hp: 2, v: 1.8, spill: '#ffffff', pal: ['#c9745b'] },
  watercooler: { r: 18, hp: 3, v: 2.6, spill: '#8fb3c7', pal: ['#bfe3ea', '#f3ede2'] },
  firstaid: { r: 17, hp: 2, v: 2, sturdy: true, pal: ['#f3ede2', '#d9786a'] },
  microscope: { r: 18, hp: 2.5, v: 2.4, sturdy: true, pal: ['#f3ede2', '#6f6a66'] },
  biobin: { r: 18, hp: 2.6, v: 2.2, sturdy: true, spill: '#c9dba0', pal: ['#e3c46a', '#4b4540'] },
  monitor: { r: 22, hp: 3, v: 3, sturdy: true, pal: ['#e6dfd3', '#6f8a9e'] },
  centrifuge: { r: 22, hp: 4, v: 3.6, sturdy: true, pal: ['#f3ede2', '#8fb3c7'] },
  cart: { r: 26, hp: 5, v: 4, sturdy: true, w: 0.6, pal: ['#a9a39a', '#8fb3c7'] },
  gastank: { r: 16, hp: 5, v: 4.5, sturdy: true, w: 0.6, pal: ['#6f8f6a', '#a9a39a'] },
  drum: { r: 28, hp: 9, v: 7, big: true, sturdy: true, w: 0.45, spill: '#e3c46a', pal: ['#e3c46a', '#4b4540'] },
  server: { r: 30, hp: 12, v: 9, big: true, sturdy: true, w: 0.35, pal: ['#4b4f55', '#9dd5a8'] },
});
// 가구: 방마다 테마별로 배치(stage.js furnishRoom), 자동 생성·택배로는 안 나옴. 이미지 f:<img>
// heavy = 무게 (맞아도 거의 안 밀리고, 날아가도 낮고 짧게. 대신 부딪히면 무게만큼 아픔 — flyDmg 무게 항) / drop = 부서지면 쏟아지는 작은 물건
Object.assign(ITEMS, {
  furn_shelf: { r: 40, hp: 22, v: 16, furn: true, img: 'shelf', big: true, heavy: 6, drop: ['flask', 'beaker', 'pillbottle', 'erlen'], pal: ['#a9a39a'] },
  furn_bookshelf: { r: 40, hp: 22, v: 15, furn: true, img: 'bookshelf', big: true, heavy: 6, paper: true, pal: ['#c8844a'] },
  furn_cot: { r: 44, hp: 12, v: 9, furn: true, img: 'cot', big: true, heavy: 3, pal: ['#6f8f6a'] },
  furn_table: { r: 46, hp: 18, v: 12, furn: true, img: 'table', big: true, heavy: 5, pal: ['#e6dfd3'] },
  furn_chair: { r: 20, hp: 8, v: 5, furn: true, img: 'chair', heavy: 2.5, pal: ['#6f8a9e'] },
  furn_desk: { r: 44, hp: 20, v: 14, furn: true, img: 'desk', big: true, heavy: 5, paper: true, pal: ['#d8b98a'] },
  furn_locker: { r: 32, hp: 16, v: 11, furn: true, img: 'locker', big: true, heavy: 5, pal: ['#a9a39a'] },
  furn_cabinet: { r: 26, hp: 14, v: 10, furn: true, img: 'cabinet', heavy: 4, paper: true, pal: ['#e6dfd3'] },
  furn_sofa: { r: 42, hp: 16, v: 11, furn: true, img: 'sofa', big: true, heavy: 4, pal: ['#9db596'] },
  furn_fridge: { r: 30, hp: 18, v: 14, furn: true, img: 'fridge', big: true, heavy: 6, drop: ['specimen', 'petri', 'tuberack'], pal: ['#f3ede2'] },
  furn_vending: { r: 34, hp: 28, v: 22, furn: true, img: 'vending', big: true, heavy: 7, drop: ['mug', 'mug', 'pillbottle'], pal: ['#4b4f55'] },
  furn_plant: { r: 22, hp: 6, v: 4, furn: true, img: 'plant', heavy: 2.5, spill: '#8a6a4a', pal: ['#6f8f6a'] },
});
// 그림이 없는 새 물건의 대체 그림 (이미지가 없을 때만 보임)
for (const k of Object.keys(ITEMS)) if (typeof ITEM_DRAW !== 'undefined' && !ITEM_DRAW[k]) ITEM_DRAW[k] = (c, r, col) => { rr(c, -r * 0.8, -r * 0.8, r * 1.6, r * 1.6, r * 0.35); c.fillStyle = col[0]; c.fill(); rr(c, -r * 0.5, -r * 0.5, r, r * 0.6, r * 0.2); c.fillStyle = col[1] || '#fff'; c.fill(); };

const meteorCool = l => Math.max(6, 22 - 2 * l);          // 치즈 운석 주기(초)
// ───────────────────────── 공용 스킬 트리 (방사형 지도) ─────────────────────────
// 빌즈 머스트 비 페이드 방식: 가운데 '반란의 시작'에서 사방으로 퍼져 나감. 찍으면 옆 노드가 '?' 로 드러나고, 그 너머는 숨김.
// pos: [x, y] 지도 칸 (0,0 = 가운데, y 가 작을수록 위) / req: [선행 스킬, 필요 레벨] / br: 가지(색) / key: 핵심 노드(마름모)
// max 0 = 무한
const RSKILLS = [
  { id: 'core', icon: '🐀', name: '반란의 시작', max: 10, base: 15, grow: 1.9, pos: [0, 0], req: null, br: 'core', key: true,
    desc: l => `모든 쥐의 갉는 힘·치즈 +${l * 5}% → +${(l + 1) * 5}%` },
  // ── 갉기 (위) ──
  { id: 'teeth', icon: '🦷', name: '이빨 강화', max: 0, base: 10, grow: 1.55, pos: [0, -1], req: ['core', 1], br: 'gnaw',
    desc: l => `모든 쥐의 갉는 힘 ×${fx(Math.pow(1.2, l))} → ×${fx(Math.pow(1.2, l + 1))}` },
  { id: 'critc', icon: '🎯', name: '급소 물기', max: 10, base: 150, grow: 1.9, pos: [-1, -2], req: ['teeth', 5], br: 'gnaw',
    desc: l => `크리티컬 확률 ${5 + 2 * l}% → ${5 + 2 * (l + 1)}%` },
  { id: 'gym', icon: '🏋️', name: '쥐 헬스장', max: 10, base: 2000, grow: 2, pos: [0, -2], req: ['teeth', 10], br: 'gnaw',
    desc: l => `등급이 높을수록 더 셈: 등급 한 칸마다 갉는 힘 +${l * 4}% → +${(l + 1) * 4}% (신화 +${l * 20}% → +${(l + 1) * 20}%)` },
  { id: 'zap', icon: '⚡', name: '전기 이빨', max: 10, base: 800, grow: 1.9, pos: [1, -2], req: ['teeth', 5], br: 'gnaw',
    desc: l => `깨물 때 ${l * 3}% → ${(l + 1) * 3}% 확률로 찌릿! 근처 물건 2개에 번개 (갉는 힘의 60%)` },
  { id: 'chainx', icon: '🎳', name: '연쇄 폭발', max: 5, base: 3000, grow: 2.6, pos: [-1, -3], req: ['critc', 3], br: 'gnaw',
    desc: l => `박살난 물건의 폭발 반경 +${l * 20} → +${(l + 1) * 20}, 폭발 피해 ↑` },
  { id: 'furnd', icon: '📦', name: '이삿짐 센터', max: 10, base: 5000, grow: 2, pos: [0, -3], req: ['gym', 3], br: 'gnaw',
    desc: l => `가구에 주는 피해 +${l * 25}% → +${(l + 1) * 25}%, 가구 치즈 +${l * 20}% → +${(l + 1) * 20}%` },
  { id: 'meteor', icon: '☄️', name: '치즈 운석', max: 8, base: 2e4, grow: 2.4, pos: [1, -3], req: ['zap', 3], br: 'gnaw', key: true,
    desc: l => l ? `하늘에서 치즈 운석이 ${meteorCool(l).toFixed(0)}초 → ${meteorCool(l + 1).toFixed(0)}초마다 화면 속 물건에 쿵! (무리 평균 힘 ×${8 + 2 * l} → ×${10 + 2 * l})` : `[해금] 하늘에서 치즈 운석이 ${meteorCool(1).toFixed(0)}초마다 화면 속 물건에 쿵!` },
  { id: 'hitstun', icon: '💥', name: '묵직한 한 방', max: 5, base: 4e4, grow: 2.8, pos: [-1, -4], req: ['chainx', 3], br: 'gnaw',
    desc: l => `날아간 물건끼리 부딪힐 때 보너스 치즈 ×${1 + l} → ×${2 + l}` },
  { id: 'bossd', icon: '👹', name: '보스 사냥꾼', max: 10, base: 4e4, grow: 2.2, pos: [0, -4], req: ['furnd', 3], br: 'gnaw', key: true,
    desc: l => `보스·고양이에게 주는 피해 +${l * 20}% → +${(l + 1) * 20}%` },
  // ── 무리 (오른쪽) ──
  { id: 'speed', icon: '💨', name: '날쌘 발', max: 15, base: 30, grow: 1.6, pos: [1, 0], req: ['core', 1], br: 'pack',
    desc: l => `이동 속도 +${l * 8}% → +${(l + 1) * 8}%` },
  { id: 'nest', icon: '🪹', name: '둥지 확장', max: 40, base: 40, grow: 1.55, pos: [2, 0], req: ['speed', 2], br: 'pack',
    desc: l => `최대 개체 수 ${30 + 10 * l} → ${40 + 10 * l}` },
  { id: 'caffeine', icon: '☕', name: '카페인 중독', max: 10, base: 200, grow: 1.8, pos: [2, -1], req: ['speed', 3], br: 'pack',
    desc: l => `멈칫하는 시간 −${l * 6}% → −${(l + 1) * 6}%, 돌진 속도 +${l * 3}% → +${(l + 1) * 3}% (눈이 벌게짐)` },
  { id: 'breed', icon: '💞', name: '번식력', max: 15, base: 60, grow: 1.7, pos: [3, 0], req: ['nest', 3], br: 'pack',
    desc: l => `번식 쿨타임 ${(4 / (1 + 0.2 * l)).toFixed(1)}초 → ${(4 / (1 + 0.2 * (l + 1))).toFixed(1)}초` },
  { id: 'twins', icon: '🐭', name: '쌍둥이', max: 10, base: 3000, grow: 2.1, pos: [3, -1], req: ['breed', 5], br: 'pack',
    desc: l => `태어날 때 ${l * 3}% → ${(l + 1) * 3}% 확률로 한 마리 더 (최대 인구 안에서)` },
  { id: 'mutate', icon: '🧬', name: '돌연변이 유전자', max: 20, base: 300, grow: 1.8, pos: [4, 0], req: ['breed', 3], br: 'pack',
    desc: l => `태어날 때 윗등급이 나올 확률 +${l * 3}% → +${(l + 1) * 3}%` },
  { id: 'frenzy', icon: '🎉', name: '탄생 축제', max: 5, base: 2e5, grow: 2.6, pos: [5, 0], req: ['mutate', 5], br: 'pack', key: true,
    desc: l => `새끼가 태어나면 그 주변 쥐들이 ${l * 1.5}초 → ${(l + 1) * 1.5}초간 광란 (속도·피해 ×1.5)` },
  // ── 물량·치즈 (아래) ──
  { id: 'cheese', icon: '🧀', name: '치즈 감별사', max: 0, base: 25, grow: 1.6, pos: [0, 1], req: ['core', 1], br: 'loot',
    desc: l => `물건에서 나오는 치즈 ×${fx(Math.pow(1.15, l))} → ×${fx(Math.pow(1.15, l + 1))}` },
  { id: 'spawn', icon: '🧪', name: '실험 재료 반입', max: 20, base: 50, grow: 1.6, pos: [0, 2], req: ['cheese', 2], br: 'loot',
    desc: l => `땅에서 물건이 솟아나는 속도 +${l * 15}% → +${(l + 1) * 15}%, 한 번에 ${1 + Math.floor(l / 3)}개 → ${1 + Math.floor((l + 1) / 3)}개씩` },
  { id: 'combo', icon: '🔥', name: '콤보 장인', max: 10, base: 600, grow: 1.9, pos: [1, 2], req: ['cheese', 5], br: 'loot',
    desc: l => `콤보가 끊기기까지 시간 +${l * 10}% → +${(l + 1) * 10}%` },
  { id: 'stock', icon: '🏚️', name: '물건 사재기', max: 20, base: 200, grow: 1.6, pos: [0, 3], req: ['spawn', 3], br: 'loot',
    desc: l => `화면에 채워지는 물건 수 +${Math.round(l * 12.5)}% → +${Math.round((l + 1) * 12.5)}%` },
  { id: 'truck', icon: '🚀', name: '로켓배송', max: 10, base: 5000, grow: 2.2, pos: [0, 4], req: ['stock', 5], br: 'loot',
    desc: l => `택배 로켓배송 ${Math.max(30, 60 - 3 * l)}초 → ${Math.max(30, 60 - 3 * (l + 1))}초마다 (최소 30초), 한 번에 ${Math.min(45, 15 + 3 * l)}개 → ${Math.min(45, 15 + 3 * (l + 1))}개` },
  { id: 'goldx', icon: '👑', name: '황금 물건', max: 10, base: 3e4, grow: 2.1, pos: [1, 4], req: ['truck', 3], br: 'loot', key: true,
    desc: l => `황금 물건(치즈 ×10) 확률 ${l * 2}% → ${(l + 1) * 2}%` },
  // ── 재롱 (왼쪽) ──
  { id: 'flip', icon: '🤸', name: '백덤블링', max: 5, base: 120, grow: 2.1, pos: [-1, 0], req: ['core', 1], br: 'trick',
    desc: l => `물건에 부딪히면 ${4 + l * 4}% → ${4 + (l + 1) * 4}% 확률로 백덤블링, 착지 충격파` },
  { id: 'axel', icon: '⛸️', name: '트리플 악셀', max: 5, base: 6000, grow: 2.3, pos: [-2, 0], req: ['flip', 3], br: 'trick',
    desc: l => `부딪히면 ${l * 3}% → ${(l + 1) * 3}% 확률로 3회전 점프! 착지 3연속 충격파 + 콤보 +5` },
  { id: 'cannon', icon: '🎱', name: '쥐 대포알', max: 5, base: 2e4, grow: 2.5, pos: [-2, 1], req: ['flip', 1], br: 'trick',
    desc: l => `부딪히면 ${l * 3}% → ${(l + 1) * 3}% 확률로 몸을 말아 핀볼처럼 튕겨다니며 파괴` },
  { id: 'windmill', icon: '🌪️', name: '윈드밀', max: 5, base: 5e4, grow: 2.4, pos: [-3, 0], req: ['axel', 3], br: 'trick', key: true,
    desc: l => `누워서 브레이크댄스! ${l * 3}% → ${(l + 1) * 3}% 확률 (큰 물건이면 3배), 도는 동안 주변 연속 피해` },
  { id: 'tumble', icon: '⚽', name: '헤딩 저글링', max: 5, base: 8e4, grow: 2.5, pos: [-3, 1], req: ['cannon', 2], br: 'trick',
    desc: l => `공중에 뜬 물건을 또 치면 받는 AIR 보너스 ×${1 + 0.5 * l} → ×${1.5 + 0.5 * l}` },
  // ── 탈출 (오른쪽 아래) ──
  { id: 'dig', icon: '⛏️', name: '굴착 본능', max: 20, base: 80, grow: 1.75, pos: [1, 1], req: ['core', 1], br: 'escape',
    desc: l => `벽에 주는 피해 ×${fx(1 + 0.1 * l)} → ×${fx(1 + 0.1 * (l + 1))}` },
  { id: 'trapsafe', icon: '🪤', name: '덫 해체 전문가', max: 10, base: 400, grow: 1.8, pos: [2, 1], req: ['dig', 3], br: 'escape',
    desc: l => `쥐덫 기절 시간 −${l * 8}% → −${(l + 1) * 8}%${l + 1 >= 5 ? `, 밟아도 ${(l + 1 - 4) * 10}% 확률로 치즈만 쏙 빼 먹음` : ' (5레벨부터 치즈만 쏙 빼 먹기)'}` },
  { id: 'rush', icon: '📣', name: '총공격', max: 10, base: 100, grow: 1.9, pos: [2, 2], req: ['dig', 2], br: 'escape',
    desc: l => `클릭 돌진 ${(1.5 + 0.2 * l).toFixed(1)}초 → ${(1.5 + 0.2 * (l + 1)).toFixed(1)}초, 돌진 중 피해 ×${(2 + 0.3 * l).toFixed(1)} → ×${(2 + 0.3 * (l + 1)).toFixed(1)}` },
  { id: 'catnip', icon: '🌿', name: '캣닢 뇌물', max: 10, base: 2500, grow: 1.9, pos: [3, 2], req: ['trapsafe', 3], br: 'escape',
    desc: l => `고양이 체력 −${l * 5}% → −${(l + 1) * 5}%, 고양이에게 겁먹는 시간 −${l * 6}% → −${(l + 1) * 6}%` },
  { id: 'offline', icon: '🌙', name: '야행성', max: 10, base: 500, grow: 2, pos: [3, 3], req: ['rush', 2], br: 'escape',
    desc: l => `꺼둔 동안 수입 ${25 + l * 7.5}% → ${25 + (l + 1) * 7.5}% (최대 12시간)` },
  // ── 특별 (왼쪽 아래) ──
  { id: 'ultcd', icon: '🎬', name: '필살기 연습', max: 5, base: 1e4, grow: 2.5, pos: [-1, 1], req: ['core', 5], br: 'special', key: true,
    desc: l => `필살기가 ${l * 20}% → ${(l + 1) * 20}% 더 자주, 쿨타임 −${l * 6}% → −${(l + 1) * 6}%` },
  { id: 'sjump', icon: '🚀', name: '슈퍼 점프 연습', max: 5, base: 5e4, grow: 2.6, pos: [-2, 2], req: ['ultcd', 2], br: 'special', key: true,
    desc: l => `슈퍼 점프가 ${l * 25}% → ${(l + 1) * 25}% 더 자주` },
];
const RSKILL_BY_ID = Object.fromEntries(RSKILLS.map(s => [s.id, s]));

// ───────────────────────── 종별 스킬 트리 ─────────────────────────
// 공통 뼈대(갉기·다리·재롱·급소·특수 능력·각성) + 종마다 다른 '특수 액션' 가지(act → actPow → actX).
// act/actPow/actX 의 이름·아이콘·설명은 그 종의 ACT(아래 ACT_LIST)에서 가져온다. 비용은 등급 배율(TIERS.cost)만큼 비싸진다.
const RAT_TREE = [
  { id: 'dmg', icon: '⚔️', name: '갉기 훈련', max: 25, base: 40, grow: 1.6, grid: [1, 0], req: null,
    desc: l => `이 종의 갉는 힘 ×${fx(Math.pow(1.25, l))} → ×${fx(Math.pow(1.25, l + 1))}` },
  { id: 'legs', icon: '👟', name: '뒷발 근육', max: 10, base: 150, grow: 1.8, grid: [0, 1], req: ['dmg', 3],
    desc: l => `돌진 속도 +${l * 8}% → +${(l + 1) * 8}%` },
  { id: 'act', icon: '🎬', name: '특수 액션', max: 5, base: 120, grow: 2.2, grid: [2, 1], req: ['dmg', 1], act: 'act', desc: () => '' },
  { id: 'show', icon: '🤹', name: '재롱 본능', max: 5, base: 200, grow: 1.9, grid: [3, 1], req: ['dmg', 3],
    desc: l => `묘기 확률 ×${(1 + 0.4 * l).toFixed(1)} → ×${(1 + 0.4 * (l + 1)).toFixed(1)}` },
  { id: 'crit', icon: '🎯', name: '급소 갉기', max: 5, base: 1000, grow: 2, grid: [0, 2], req: ['legs', 5],
    desc: l => `크리티컬 확률 +${l * 4}% → +${(l + 1) * 4}%` },
  { id: 'actPow', icon: '💥', name: '액션 위력', max: 10, base: 800, grow: 1.9, grid: [2, 2], req: ['act', 1], act: 'pow', desc: () => '' },
  { id: 'special', icon: '✨', name: '특수 강화', max: 5, base: 3000, grow: 2.3, grid: [3, 2], req: ['show', 2], special: true,
    desc: () => '' },
  { id: 'actX', icon: '🌟', name: '액션 각성', max: 1, base: 8e4, grow: 1, grid: [2, 3], req: ['actPow', 3], act: 'x', desc: () => '' },
  { id: 'ult', icon: '🌟', name: '각성', max: 1, base: 5e5, grow: 1, grid: [3, 3], req: ['special', 5],
    desc: () => '갉는 힘 ×3, 특수 능력 세기 ×1.5, 몸에서 빛이 난다' },
];

// ───────────────────────── 특수 액션 (종마다 하나) ─────────────────────────
// 발동 조건(trig) + 액션 종류(type) 조합. 실제 동작은 rats/js/acts.js. 화면에 보이는 쥐만 발동.
// p: 발동 확률 · cd: 주기(초) · n: 기준 수. 해금 레벨이 오를수록 확률 ↑ / 주기 ↓
const ACT_TRIG = {
  drop: (a, k) => `자기가 부순 물건에서 ${pct(a.p * k)} 확률로 ${a.propName || a.prop} 드랍 → 같은 종이 주우면`,
  bump: (a, k) => `물건에 부딪힐 때 ${pct(a.p * k)} 확률로`,
  wall: (a, k) => `벽을 들이받을 때 ${pct(a.p * k)} 확률로`,
  crowd: (a, k) => `주변에 동료가 ${a.n}마리 이상 모이면 (${Math.round(a.cd / k)}초마다)`,
  combo: (a, k) => `${a.n} 콤보 이상일 때 부딪히면 ${pct(a.p * k)} 확률로`,
  birth: (a, k) => `새끼를 낳을 때 ${pct(Math.min(1, a.p * k))} 확률로`,
  sleep: (a, k) => `잠들 때 ${pct(Math.min(1, a.p * k))} 확률로`,
  gold: (a, k) => `황금 물건을 갉으면 ${pct(Math.min(1, a.p * k))} 확률로`,
  wave: (a, k) => `택배 투하 때 화면에 있으면 ${pct(Math.min(1, a.p * k))} 확률로`,
  timer: (a, k) => `${Math.round(a.cd / k)}초마다`,
};
const ACT_TYPES = {
  thunder: { d: P => `두 앞발을 하늘로! 번개 ${4 + Math.floor(P)}줄기가 주변 물건에 꽂힘 (피해 ×${(3 * P).toFixed(1)})`, x: '번개 2배 + 연쇄' },
  gunkata: { d: P => `빙글빙글 돌며 사방으로 총알 난사 (총알 피해 ×${P.toFixed(1)})`, x: '쌍권총: 총알 2배' },
  slam: { d: P => `3번 뛰어올라 쾅! 내려찍기 (반경 ${Math.round(80 + 15 * P)})`, x: '5연속 내려찍기' },
  slash: { d: P => `물건 사이를 4번 순간 돌진하며 일섬 (피해 ×${(3 * P).toFixed(1)})`, x: '7연속 일섬' },
  barrage: { d: P => `주변에 ${4 + Math.floor(P)}개 투척 폭격`, x: '투척 수 2배' },
  sonic: { d: P => `음파 충격파 5번 + 주변 동료 광란 (반경 ${Math.round(140 + 20 * P)})`, x: '음파 범위 1.5배' },
  beam: { d: P => `360° 회전 레이저 (피해 ×${(2 * P).toFixed(1)})`, x: '양방향 레이저' },
  breath: { d: P => `부채꼴로 휘두르는 브레스 (사거리 ${Math.round(170 + 20 * P)})`, x: '한 바퀴 도는 브레스' },
  ball: { d: P => `거대한 공이 되어 3초간 굴러다니며 파괴 (피해 ×${(2 * P).toFixed(1)})`, x: '더 크게, 더 오래' },
  summon: { d: P => `동료 ${2 + Math.floor(P)}마리 소환 (6초 동안 함께 난동)`, x: '소환 수 2배' },
  vortex: { d: P => `주변 물건을 빨아들인 뒤 대폭발 (반경 ${Math.round(200 + 20 * P)})`, x: '흡입 범위 1.5배' },
  meteor: { d: P => `하늘에서 ${4 + Math.floor(P)}개 낙하`, x: '낙하 수 2배' },
  midas: { d: P => `주변 물건을 전부 황금으로 (반경 ${Math.round(160 + 20 * P)}, 치즈 ×10)`, x: '범위 2배' },
  tornado: { d: P => `회오리가 되어 휩쓸고 다님 (피해 ×${P.toFixed(1)})`, x: '더 큰 회오리' },
  dig: { d: P => `땅속으로 파고들어 물건 밑에서 4번 솟구침 (피해 ×${(3 * P).toFixed(1)})`, x: '7번 솟구침' },
  cheer: { d: P => `주변 동료 전원 광란 ${(3 + P).toFixed(1)}초 (속도·피해 ×1.5)`, x: '화면 전체 응원' },
  feast: { d: P => `앞의 물건을 초고속 12연타 (타당 피해 ×${P.toFixed(1)})`, x: '24연타' },
  throw: { d: P => `주변 물건을 번쩍 들어 집어던짐 (충돌 피해 ×${(3 * P).toFixed(1)})`, x: '3개 연속 던지기' },
};
// [종 id, 발동 조건, 조건 값, 액션, 이름, 아이콘, 외침 목록, (드랍 소품)]
const A = (id, trig, v, type, name, icon, lines, prop) => ({ id, trig, type, name, icon, lines, prop, ...v });
const ACT_LIST = [
  A('pcmouse', 'bump', { p: 0.04 }, 'feast', '광클 연타', '🖱️', ['딸깍딸깍딸깍!!', '더블 클릭!', '(마우스 휠 드르륵)']),
  A('ramjui', 'timer', { cd: 14 }, 'thunder', '람쥐썬더', '⚡', ['람쥐썬더!!!', '찌리찌리찌리!!', '점검 끝났다… 람쥐썬더!!', 'Bring me Acorn!']),
  A('zapham', 'timer', { cd: 18 }, 'beam', '건전지 백만 볼트', '⚡', ['찌이이릿!!', '(볼 스티커가 떨어졌다)', '건전지 교체 필요…']),
  A('parkrat', 'crowd', { n: 5, cd: 18 }, 'cheer', '깜짝 퍼레이드', '🎈', ['하하! 꿈과 치즈의 나라!', '퍼레이드 시작!', '사진 찍어 주세요~']),
  A('jwerry', 'crowd', { n: 5, cd: 15 }, 'cheer', '감사합니다!!', '🎩', ['감사합니다!!']),
  A('streamrat', 'crowd', { n: 5, cd: 16 }, 'sonic', '흐에~ 샤우팅', '🎙️', ['흐에~~', '흐에에에에~~!!', '방송 켰습니다~', '구독 좋아요 알림 설정~']),
  A('starchef', 'bump', { p: 0.035 }, 'feast', '다지기 연타', '🔪', ['봉주르!', '다다다닥!', '소스는 치즈로!'], '🔪'),
  A('plaguerat', 'combo', { n: 15, p: 0.08 }, 'barrage', '역병 석궁 난사', '🏹', ['킥킥킥…', '역병을 퍼뜨려라!', '(아이스크림 막대 석궁)']),
  A('brownrat', 'crowd', { n: 6, cd: 20 }, 'summon', '하수구 동창회', '📢', ['얘들아 모여!', '동창회다!']),
  A('mouse', 'wall', { p: 0.12 }, 'slash', '벽 틈 질주', '💨', ['쪼르르르!', '찍찍 질주!']),
  A('labrat', 'bump', { p: 0.03 }, 'slash', '미로 폭주', '🌀', ['출구가 어디야!', '미로 탈출!']),
  A('hooded', 'combo', { n: 10, p: 0.08 }, 'slam', '후드 3단 박치기', '💢', ['박치기다!', '후드 파워!']),
  A('fieldmouse', 'birth', { p: 0.35 }, 'summon', '대가족 상경', '🏡', ['시골 식구들 왔다!', '할머니도 오셨어!']),
  A('hamster', 'drop', { p: 0.04 }, 'ball', '햄스터 볼 폭주', '🔵', ['굴러간다~!', '쳇바퀴 모드!'], '🔵'),
  A('scientist', 'drop', { p: 0.04 }, 'barrage', '플라스크 난사', '⚗️', ['실험 시작!', '유레카!'], '⚗️'),
  A('nerd', 'bump', { p: 0.03 }, 'feast', '연필 난타', '✏️', ['벼락치기!', '계산 끝!']),
  A('builder', 'drop', { p: 0.04 }, 'slam', '오함마 철거', '🔨', ['철거 들어갑니다!', '안전제일!'], '🔨'),
  A('chef', 'bump', { p: 0.03 }, 'feast', '칼질 난무', '🔪', ['다다다다닥!', '오늘의 요리!']),
  A('traveler', 'bump', { p: 0.03 }, 'ball', '배낭 굴리기', '🎒', ['여행은 구르는 거야!', '출발~!']),
  A('mailman', 'timer', { cd: 22 }, 'barrage', '속달 편지 폭격', '✉️', ['속달이요!', '등기 왔습니다!']),
  A('courier', 'wave', { p: 0.6 }, 'meteor', '로켓 배송', '🚀', ['총알 배송!', '하늘에서 배송!']),
  A('party', 'combo', { n: 25, p: 0.1 }, 'cheer', '파티 타임', '🥳', ['파티다!!', '다 같이 춤춰!']),
  A('glowy', 'combo', { n: 15, p: 0.08 }, 'vortex', '방사능 폭주', '☢️', ['폭주한다!', '위험 위험!']),
  A('mutant', 'bump', { p: 0.03 }, 'summon', '세포 분열', '🧬', ['분열!', '나 둘, 나 셋!']),
  A('buff', 'bump', { p: 0.035 }, 'throw', '3대 500 던지기', '🏋️', ['으랴차!', '이것도 가볍지!']),
  A('ninja', 'bump', { p: 0.03 }, 'summon', '그림자 분신술', '🥷', ['분신술!', '닌닌!']),
  A('pandahamster', 'bump', { p: 0.035 }, 'ball', '판다 대왕 구르기', '🐼', ['데굴데굴~', '판다 굴러간다!']),
  A('skater', 'drop', { p: 0.04 }, 'slam', '하프파이프 킥플립', '🛹', ['킥플립!', '360 알리!'], '🛹'),
  A('idol', 'crowd', { n: 5, cd: 18 }, 'sonic', '게릴라 콘서트', '🎤', ['찍찍 사랑해요~!', '앵콜!']),
  A('sleepy', 'sleep', { p: 0.5 }, 'sonic', '지진 코골이', '💤', ['드르렁!!!', 'ZZZ...쿠궁!']),
  A('cyborg', 'timer', { cd: 20 }, 'beam', '360° 레이저', '👁️', ['타겟 전부 포착.', '레이저 풀가동!']),
  A('police', 'combo', { n: 20, p: 0.08 }, 'summon', '지원 요청', '🚓', ['지원 바란다!', '포위해!']),
  A('firefighter', 'drop', { p: 0.04 }, 'breath', '소방 호스 난사', '🧯', ['불 끄러 왔습니다!', '물대포 발사!'], '🧯'),
  A('pirate', 'combo', { n: 15, p: 0.08 }, 'barrage', '대포 일제 사격', '💣', ['발사!!', '해적의 인사다!']),
  A('cowboy', 'bump', { p: 0.03 }, 'vortex', '올가미 끌어오기', '🪢', ['이랴!', '다 끌려와!']),
  A('soldier', 'drop', { p: 0.04, propName: '권총' }, 'gunkata', '건 카타', '🎖️', ['탕탕탕탕!', '건 카타 개시!'], '🔫'),
  A('nurse', 'birth', { p: 0.4 }, 'cheer', '링거 투혼', '💉', ['힘내세요!', '주사 한 방!']),
  A('miner', 'drop', { p: 0.04 }, 'slam', '곡괭이 내려찍기', '⛏️', ['굴착 개시!', '광맥이다!'], '⛏️'),
  A('hero', 'combo', { n: 10, p: 0.08 }, 'slash', '초음속 연속 펀치', '🦸', ['정의의 주먹!', '슈퍼 펀치!']),
  A('wizard', 'drop', { p: 0.04 }, 'meteor', '메테오', '☄️', ['메테오!!', '하늘이여!'], '🪄'),
  A('samurai', 'bump', { p: 0.035 }, 'slash', '발도술 일섬', '⚔️', ['일섬.', '이미 베었다.']),
  A('rocker', 'drop', { p: 0.04 }, 'sonic', '기타 솔로', '🎸', ['헤드뱅잉!!', '록 앤 롤!'], '🎸'),
  A('detective', 'bump', { p: 0.03 }, 'throw', '증거물 투척', '🔍', ['범인은 너다!', '증거 확보!']),
  A('vampire', 'timer', { cd: 22 }, 'vortex', '흡혈 소용돌이', '🦇', ['피가 아니라 치즈!', '다 빨아들인다!']),
  A('santa', 'wave', { p: 0.7 }, 'barrage', '선물 폭격', '🎁', ['메리 쥐스마스!', '선물 받아라!']),
  A('zombie', 'bump', { p: 0.03 }, 'summon', '좀비 떼', '🧟', ['끄어어...', '치즈... 치즈...']),
  A('ratking', 'crowd', { n: 5, cd: 16 }, 'summon', '왕의 군대', '👑', ['짐의 군대여!', '진격하라!']),
  A('ratqueen', 'birth', { p: 0.4 }, 'cheer', '여왕의 축복', '👸', ['모두 힘내렴~', '여왕의 명령이다!']),
  A('emperor', 'crowd', { n: 5, cd: 18 }, 'barrage', '궁수대 일제 사격', '🏹', ['쏘아라!', '황제의 칙령이다!']),
  A('pharaoh', 'gold', { p: 0.5 }, 'midas', '황금의 손', '🏺', ['모두 황금이 되어라!', '파라오의 보물!']),
  A('knight', 'bump', { p: 0.035 }, 'slash', '랜스 차지', '🛡️', ['돌격!!', '기사의 명예를 걸고!']),
  A('viking', 'drop', { p: 0.04 }, 'slam', '대지 가르기', '🪓', ['발할라!!', '약탈이다!'], '🪓'),
  A('sultan', 'timer', { cd: 24 }, 'tornado', '양탄자 회오리', '🧞', ['소원을 말해봐!', '양탄자 출격!']),
  A('ballerina', 'combo', { n: 15, p: 0.1 }, 'tornado', '32회전 그랑 푸에테', '🩰', ['앙 드오르!', '32회전!']),
  A('astro', 'timer', { cd: 22 }, 'meteor', '궤도 폭격', '🛰️', ['궤도 폭격 요청!', '휴스턴, 문제없다!']),
  A('alien', 'timer', { cd: 22 }, 'summon', '외계인 친구들', '🛸', ['삐리삐리!', '친구들 왔다!']),
  A('robot', 'combo', { n: 15, p: 0.08 }, 'barrage', '미사일 폭격', '🤖', ['미사일 발사.', '삐빅, 섬멸!']),
  A('dragon', 'timer', { cd: 20 }, 'breath', '치즈 브레스', '🔥', ['크아아앙!', '치즈 냄새 주의!']),
  A('cosmic', 'combo', { n: 20, p: 0.1 }, 'vortex', '블랙홀', '🌌', ['우주의 섭리!', '다 빨려 들어간다!']),
  A('ghost', 'wall', { p: 0.12 }, 'summon', '유령 분신', '👻', ['우우우~', '나 여기도 있지롱!']),
  A('angel', 'timer', { cd: 24 }, 'cheer', '천상의 합창', '😇', ['할렐루야~', '축복을!']),
  A('dino', 'bump', { p: 0.035 }, 'slam', '공룡 대지진', '🦖', ['크아앙!', '쿵쾅쿵쾅!']),
];
for (const a of ACT_LIST) RSPECIES_BY_ID[a.id].act = a;
const actK = l => 1 + 0.3 * Math.max(0, l - 1);                                    // 해금 레벨 → 확률/빈도 배율
const actPower = (sp, powLv, ult) => TIERS[sp.tier].ab * (1 + 0.3 * powLv) * (ult ? 1.5 : 1);
function actDesc(sp, l, powLv) {
  const a = sp.act;
  return `${ACT_TRIG[a.trig](a, actK(Math.max(1, l)))} → ${a.name}: ${ACT_TYPES[a.type].d(actPower(sp, powLv))}`;
}
// ───────────────────────── 필살기 (전설·신화 전용, 병맛 패러디 상황극) ─────────────────────────
// 고트 시뮬레이터 풍: 물리가 난장판이 되고, 캐릭터가 래그돌처럼 날아다니고, 끝나면 뜬금없는 "🏆 업적 달성".
// 흐름: ① 화면 정지 + 확대 + 필살기 이름 (준비 동작) → ② 병맛 상황 약 3초 (게임은 진행) → 업적 알림.
// 슈퍼 점프보다 자주(화면에 있을 때 초당 ULT_CHANCE, 쿨 ULT_COOL초)지만 약함: 쥐 주변 반경 안만, 벽은 안 부숨. 동작은 rats/js/ults.js.
const ULT_CHANCE = 1 / 200, ULT_COOL = 60;
const ULT_TYPES = {
  recoil: '빔을 쐈더니 반동으로 본인이 날아가며 사방에 난사',
  boulder: '거대 치즈 바퀴가 굴러와 전부 깔아뭉갬 (본인은 도망)',
  knot: '주변 쥐들 꼬리가 엉켜 거대한 쥐 공이 되어 통통 튀어다님',
  zerog: '무중력 구간: 전부 둥둥 떠올랐다가 한꺼번에 추락',
  lemmings: '물건들이 줄지어 천국의 계단을 오르다 꼭대기에서 차례로 투신',
  possess: '물건들에 빙의해서 서로 쫓아다니며 부딪힘',
  flyby: '썰매를 타고 저공비행하며 선물 폭격',
  catapult: '투석기에 자기를 장전해서 발사 → 착지마다 쾅 (세 번)',
  genie: '램프의 지니가 소원 3개를 곡해해서 들어줌',
  tableflip: '물건을 식탁에 모아 티타임 → 밥상 뒤집기',
  mosh: '화면 속 쥐 전원 떼창 헤드뱅잉 → 착지마다 지진',
  glitch: '화면이 버그 남: 물건 복제·순간이동 → 삭제',
  pyramid: '피라미드가 솟아올라 쥐들이 계단에서 치즈 상납 → 뒤집어서 피라미드 팽이',
  split: '칼을 넣는 순간 전부 반으로 쩍',
  excalibur: '바위에 꽂힌 전설의 검을 뽑았더니 바위까지 딸려 나옴 → 그걸로 휘두름',
  abduct: 'UFO 가 물건과 쥐를 납치해 공중에서 투척',
  transform: '자동차로 변신해서 무면허 폭주 → 벽에 박고 분해',
  fondue: '치즈 퐁듀 브레스로 바닥이 미끌미끌',
  meteorself: '대멸종 운석이 자기 머리에 먼저 떨어짐 → 분노의 발구름',
  bigbat: '거대 박쥐로 변신했는데 날개가 너무 커서 조종 불가',
  strings: '물건 사이 음모론 빨간 실 → 실 순서대로 연쇄 폭발',
  fireworks: '불꽃놀이 로켓 난사 (안전 수칙 무시)',
  zombify: '화면 속 쥐 전원 좀비 감염: 흐느적대며 갉음',
  drill: '너무 빨리 돌아서 땅을 뚫고 여기저기서 솟구침',
  overcharge: '건전지를 과충전 → 물건·사람 사이로 번개가 튀어 다님 → 건전지 펑 (본인 아프로 머리)',
  balloonparade: '물건·사람에 하트 풍선을 달아 둥실 퍼레이드 → 풍선이 펑펑 터지며 와르르',
  plaguespray: '투명해져서 킥킥 숨어 다니다가 역병 석궁 난사 → 초록 웅덩이',
  grandcuisine: '주변 물건을 전부 거대 냄비에 넣고 보글보글 요리 → "완성!" 하는 순간 대폭발',
  ramthunder: '하늘이 어두워지고 앞발을 번쩍! 앞발에 번개 → 점프 → 히어로 랜딩(번개 기둥·번개 물결·번개 비) → 초거대 번개 → 다시 평범한 다람쥐',
  thankyou: '한참 뜸 들이며 궁극기를 충전하더니 아재개그 팻말 한 장 → 갑분싸 → 계란·토마토 야유를 맞으면서도 뻔뻔한 90도 인사를 좌우로, 점점 빠르게 (인사할 때마다 물건 펑, 마지막 인사에 전부 폭발)',
  livestream: '방송 중 "쥐커드 해주세요!!" 도네 → 안경 번쩍, 쌍권총 쥐커드 제노사이드 우다다다 → 도네 들어올 때마다 한 번 더 → 리마스터 도네에 360° 탄막 난사',
};
// [종 id, 상황, 이름, 대사, 테마색, 아이콘, 업적 이름, (탈것: sleigh·carpet·boat)]
const U = (id, type, name, line, col, fx, achv, ride) => ({ id, type, name, line, col, fx, achv, ride });
const ULT_LIST = [
  U('hero', 'recoil', '슈퍼 노바 빔', '정의의 빔을 받아라!!', '#e8786a', '💥', '반동은 계산 안 했다'),
  U('wizard', 'boulder', '아마겟돈(치즈)', '하늘이여, 치즈를 내려라!', '#e3c46a', '🧀', '인디아나 치즈'),
  U('samurai', 'split', '천본앵 난무', '…너는 이미 부서져 있다.', '#e8a3a0', '🌸', '이미 부서져 있었다'),
  U('rocker', 'mosh', '앵콜 대폭발', '다 같이 헤드뱅잉!!', '#f0c878', '🎸', '모싱 피트'),
  U('detective', 'strings', '진실은 언제나 하나!', '모든 게… 연결되어 있었어!', '#d9786a', '🔍', '모든 건 연결되어 있다'),
  U('vampire', 'bigbat', '블러드 문 변신', '어둠의 날개여…! 어? 어어어?!', '#d9786a', '🦇', '박쥐 운전면허 탈락'),
  U('santa', 'flyby', '선물 대폭격', '호우호우! 올해 착한 물건은 없다!', '#d9786a', '🎁', '올해의 나쁜 아이', 'sleigh'),
  U('zombie', 'zombify', '좀비 아포칼립스', '치즈으으으…!', '#9dbb8f', '🧟', '감염자 0 → 전원'),
  U('ratking', 'knot', '쥐왕 대결속', '짐과 하나가 되어라!!', '#d9a441', '👑', '실존하는 공포, 쥐왕'),
  U('ratqueen', 'tableflip', '로열 티타임', '호호호~ 차 한잔… 하면서!!', '#f2b8b0', '🫖', '우아한 밥상 뒤집기'),
  U('emperor', 'fireworks', '황제의 대축제', '만세! 만만세!', '#e3c46a', '🎆', '불꽃놀이는 안전하게(안 함)'),
  U('pharaoh', 'pyramid', '파라오의 피라미드', '짐의 피라미드를 받들라!', '#e3c46a', '🔺', '피라미드 팽이 챔피언'),
  U('knight', 'excalibur', '엑스칼리버', '전설의 검이여, 나를 선택하라!', '#bfe3ea', '🗡️', '돌도 검이다'),
  U('viking', 'catapult', '발할라 투석기', '발할라로 날아간다아아!!', '#8fb3c7', '🪓', '인간 대포(쥐)'),
  U('sultan', 'genie', '램프의 지니', '지니야, 소원이 있어!', '#cdb4db', '🧞', '소원은 신중하게'),
  U('ballerina', 'drill', '백조의 호수(지하)', '32회전… 33… 멈출 수가 없어!!', '#f2c6d6', '🩰', '지구 뚫기'),
  U('astro', 'zerog', '무중력 구간', '휴스턴, 중력이 사라졌다.', '#bfe3ea', '🛰️', '무중력은 공짜'),
  U('alien', 'abduct', 'UFO 대납치', '표본 채집을 시작한다. 삐리.', '#9dd5a8', '🛸', '표본 채집 완료'),
  U('robot', 'transform', '트랜스폼', '변신!! 치키치키치키…', '#9fb2bd', '🚗', '무면허 변신'),
  U('dragon', 'fondue', '드래곤 퐁듀', '크아앙… 어라, 치즈가 나오네?', '#f0c878', '🫕', '치즈 퐁듀 대참사'),
  U('cosmic', 'glitch', '빅뱅.exe', '우주를… 재부팅한다.', '#a58bb8', '🌌', '우주.exe 재시작'),
  U('ghost', 'possess', '폴터가이스트', '우우우~ 물건들아 일어나라~', '#e8e0e6', '👻', '빙의 대소동'),
  U('angel', 'lemmings', '천국의 계단', '물건들이여, 계단을 오르라~', '#fff3bf', '😇', '레밍즈'),
  U('ramjui', 'ramthunder', '각성!! 람쥐썬더!!', '빨리 봐라 이거… 람쥐썬더!!!', '#8fd3ff', '⚡', '찌리찌리찌리찌리'),
  U('zapham', 'overcharge', '건전지 과충전 대방전', '백만 볼트…! (건전지는 1.5볼트)', '#f2c94c', '⚡', '감전 주의 (진짜로)'),
  U('parkrat', 'balloonparade', '꿈과 치즈의 풍선 퍼레이드', '다 같이 퍼레이드~! 사진 찍어 주세요!', '#f2b8b0', '🎈', '기념품 풍선은 개당 5만 원'),
  U('plaguerat', 'plaguespray', '역병 대방출', '킥킥킥… 이제 쏜다!', '#9dbb8f', '🏹', '구석에서 킥킥'),
  U('jwerry', 'thankyou', '줴리 감사합니다', '감사합니다.', '#f2c14e', '🎩', '갑분싸 뒤 뻔뻔한 인사'),
  U('streamrat', 'livestream', '쥐커드 제노사이드', '아 진짜요…? 쥐커드 들어갑니다!!', '#cdb4db', '🔫', '치즈 1000개에 쥐커드'),
  U('starchef', 'grandcuisine', '대왕 치즈 요리', '재료는 전부 넣어! 이랴!', '#f0c878', '🍲', '별 셋 (폭발 포함)'),
  U('dino', 'meteorself', '대멸종', '공룡의 운명을 받아라!', '#9dbb8f', '🦖', '셀프 멸종'),
];
for (const u of ULT_LIST) RSPECIES_BY_ID[u.id].ult = u;

const RAT_TREE_BY_ID = Object.fromEntries(RAT_TREE.map(s => [s.id, s]));
const rampNeed = R => Math.floor(15 * Math.pow(1.3, R));      // 난동 등급 R → R+1 에 필요한 파괴 수
const PROMOTE_COST = 10, PROMO_KEEP = 20;   // 일괄 승급은 번식용 20마리를 남김 · 같은 등급 10마리 → 윗등급 랜덤 1마리 (신화는 승급 없음)
function fx(v) { return v < 1000 ? v.toFixed(2) : fmt(v); }

// ───────────────────────── 조각 (종별 자동 강화) ─────────────────────────
// 종이 너무 많아서 종별 트리는 직접 찍지 않는다. 이미 가진 종을 또 얻으면(탄생·승급) 그 종의 조각 +1,
// 조각이 모이면 레벨 업 → RAT_AUTO 순서대로 종별 트리 노드가 자동으로 찍힌다 (스킬 트리 화면은 확인만).
// 높은 등급일수록 조각이 덜 필요하다 (레벨 L → L+1 에 ceil((L+1) × SHARD_K[등급]) 조각).
const SHARD_K = [2, 1.5, 1, 0.8, 0.6, 0.5];
const shardNeed = (tier, L) => Math.ceil((L + 1) * SHARD_K[tier]);
// 앞쪽은 정해진 순서, 이후엔 REPEAT 를 돌며 찍을 수 있는 것부터
const RAT_AUTO = ['dmg', 'act', 'dmg', 'legs', 'show', 'dmg', 'actPow', 'dmg', 'legs', 'special', 'crit', 'actPow', 'show', 'dmg', 'special', 'actPow', 'actX', 'crit', 'special', 'special', 'special', 'ult'];
const RAT_AUTO_REPEAT = ['dmg', 'actPow', 'legs', 'act', 'crit', 'show', 'dmg'];
// 레벨 L 까지 찍힌 종별 트리 (저장값이 아니라 레벨에서 매번 다시 계산)
function autoTree(L) {
  const t = {}, get = id => t[id] || 0, ok = s => (!s.max || get(s.id) < s.max) && (!s.req || get(s.req[0]) >= s.req[1]);
  let n = 0, i = 0, guard = 0;
  while (n < L && guard++ < 5000) {
    const id = i < RAT_AUTO.length ? RAT_AUTO[i] : RAT_AUTO_REPEAT[(i - RAT_AUTO.length) % RAT_AUTO_REPEAT.length];
    i++;
    let s = RAT_TREE_BY_ID[id];
    if (!ok(s)) s = RAT_TREE.find(ok);              // 순서상 못 찍으면 찍을 수 있는 아무거나
    if (!s) break;                                   // 전부 만렙
    t[s.id] = get(s.id) + 1; n++;
  }
  return t;
}
const RAT_MAX_LV = RAT_TREE.reduce((a, s) => a + s.max, 0);
