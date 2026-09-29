// rats/js/data.js 의 종 목록으로 이미지 생성 프롬프트 파일(rats/PROMPTS.txt)을 만든다.
// 사용법: node rats/dev/make_prompts.js
const fs = require('fs');
const path = require('path');

global.ITEMS = {};
global.fmt = x => String(x);
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
// data.js 는 브라우저용 전역 스크립트라 함수로 감싸서 필요한 값만 꺼낸다
const { RSPECIES, TIERS, ZONES } = new Function(src + '\nreturn { RSPECIES, TIERS, ZONES };')();

const STYLE = `flat minimalist illustration in the style of "Untitled Goose Game" — simple clean geometric shapes, NO outlines, soft muted pastel palette (warm cream, sage green, dusty terracotta, warm greys, soft blue), flat colors with at most one slightly darker flat shade, clean vector look, charming and quietly funny.`;

const SPRITE_RULES = `REALISTIC rodent body proportions (a real rat / mouse / hamster anatomy, NOT chibi, NOT big-headed). Full body, standing on all four legs, side view FACING LEFT, calm neutral pose. Costumes are simple, readable cartoon props that fit the flat style. Centered, fills about 80% of the frame. Pure white #FFFFFF background, no ground, no shadow, no text, no border. Square 1024x1024.`;

const SHAPE = {
  rat: 'rat body: long body, pointed snout, big round ears, long thin tail',
  mouse: 'mouse body: small and slim, big round ears, long thin tail',
  hamster: 'hamster body: round and plump, tiny ears, very short tail',
};

const lines = [];
const hr = t => { lines.push('', '='.repeat(78), t, '='.repeat(78), ''); };

lines.push('쥐들의 반란 — 이미지 생성 프롬프트 모음');
lines.push('ChatGPT(이미지 생성) 또는 Codex 에 블록 단위로 복사해서 붙여넣으세요.');
lines.push('저장 경로(PATH)는 게임이 자동으로 불러오는 위치입니다. (C:\\Project\\cat 기준)');
lines.push('모든 이미지는 같은 화풍이어야 하니, [공통 스타일] 문장을 항상 함께 넣어 주세요.');
lines.push('※ 자동 생성 파일: rats/dev/make_prompts.js 로 다시 만들 수 있어요.');

hr('[공통 스타일] — 모든 프롬프트 앞에 붙이기');
lines.push(STYLE);

hr('1. 메인 컨셉 아트 (타이틀)');
lines.push('PATH: assets/rats/title.png');
lines.push(`${STYLE} 16:9 landscape (1536x864) key art: a secret underground laboratory at night. A crowd of rats and mice in funny costumes (a rat in a lab coat and goggles, a rat in a construction hard hat, a tiny ninja rat, a rat king with a crown and red robe, a rat astronaut, a hamster with a backpack) gleefully chewing through beakers, cages and computers, while a group of them rams a cracked concrete wall that is breaking open to reveal a city skyline beyond. A few glowing test tubes, flying shards, cheese crumbs. Mischievous "rodent uprising" mood, quietly funny, no humans visible. No text.`);

hr('2. 쥐 캐릭터 스프라이트 (종별 1장씩, 총 ' + RSPECIES.length + '종)');
lines.push('각 블록을 그대로 복사하세요. 한 번에 여러 장을 부탁할 때는 [공통 스타일]과 [스프라이트 규칙]을 한 번만 쓰고 목록만 이어 붙여도 됩니다.');
lines.push('');
lines.push('[스프라이트 규칙]');
lines.push(SPRITE_RULES);
let tier = -1;
for (const s of RSPECIES) {
  if (s.tier !== tier) {
    tier = s.tier;
    lines.push('', `── 등급 ${tier}: ${TIERS[tier].name} ──`);
  }
  lines.push('');
  lines.push(`# ${s.name} (${s.id})`);
  lines.push(`PATH: assets/rats/${s.id}.png`);
  lines.push(`${STYLE} ${SPRITE_RULES} Character: ${s.en}. (${SHAPE[s.shape]})`);
}

hr('3. 구역 바닥 (탑다운 배경)');
lines.push('규칙: 16:9 landscape 1536x864, STRICTLY TOP-DOWN orthographic view, EMPTY floor only (no creatures, no loose objects, no furniture, no text), content reaches all four edges.');
const FLOORS = {
  lab: 'a secret laboratory floor: clean white-and-light-grey square tiles, a few painted safety lines and a floor drain, thin concrete walls on all four edges with a cracked section in the middle of the right wall',
  corridor: 'a research facility corridor floor: long pale green linoleum with a darker stripe down the middle, thin walls on the top and bottom edges',
  sewer: 'an underground sewer: dark wet concrete walkways on the top and bottom with a murky blue-green water channel running horizontally through the middle, a few round grates',
};
for (const z of ZONES) {
  if (!z.floor) continue;
  lines.push('');
  lines.push(`# ${z.name}`);
  lines.push(`PATH: assets/rats/bg_${z.floor}.png`);
  lines.push(`${STYLE} 16:9 landscape 1536x864, strictly top-down orthographic view, empty floor only, no creatures, no loose objects, no text, content reaches all edges. Scene: ${FLOORS[z.floor]}.`);
}
lines.push('');
lines.push('(골목길 이후 구역은 고양이 게임의 assets/v2/bg 배경을 그대로 씁니다.)');

hr('4. 연구실 소품 스프라이트 시트');
lines.push('PATH: assets/rats/lab_items.png');
lines.push(`${STYLE} Prop sprite sheet: landscape 1536x1152, pure white background, invisible 4x3 grid of equal 384x384 cells, one object centered per cell with generous margin, gentle three-quarter top-down view, no text. Cells left-to-right, top-to-bottom: glass beaker with green liquid, rack of colorful test tubes, microscope, desktop computer with monitor, small wire animal cage, clipboard with papers, red fire extinguisher, office water cooler, rusty sewer pipe segment, black trash bag, coffee mug, EMPTY.`);

fs.writeFileSync(path.join(__dirname, '..', 'PROMPTS.txt'), lines.join('\n') + '\n', 'utf8');
console.log('rats/PROMPTS.txt', lines.length, 'lines,', RSPECIES.length, 'species');
