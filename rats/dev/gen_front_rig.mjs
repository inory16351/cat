// 필살기용 앞모습 리그 파츠: 스트리머 쥐(쥐커드) + 다람쥐(람쥐썬더) 앞모습 파츠·표정·소품을 Codex 한 장(6열×4행 = 24칸)에 몰아 그리고 잘라 씀 (토큰 절약)
// 사용법 (rats/dev 에서):
//   node gen_front_rig.mjs --set rs   다람쥐만 (5열×3행 = 15칸, 기존 옆모습 파츠 이미지를 Codex 에 첨부(-i)해 그림체를 맞춤)
//   node gen_front_rig.mjs --set all  쥐커드+다람쥐 첫 버전 (6열×4행) — 둥근 치비 만화체라 게임과 안 맞았고, 쥐커드는 이제 옆모습 리그(트리플 악셀)라 안 씀
//   --split-only   생성 없이 이미 있는 시트만 다시 자르기 / --print  프롬프트만 출력
// 흐름
//   UnityResources/Rats/Sheets/front_<세트>.png        Codex 원본 시트 (보관, 다시 만들면 예전 것은 _v<N>.png 로 옮김. 첫 버전 = front_rig.png)
//   UnityResources/Rats/FrontRig/<파츠>.png            잘라낸 원본 파츠 (보관)
//   assets/rats/front/<파츠>.png                       게임용 (최대 360px)
//   rats/js/front_meta.js                              크기·관절(피벗) — 알파 분석값
import sharp from 'sharp';
import { mkdirSync, existsSync, renameSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { codexImage, SHEETS } from './gen_parts.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(DIR, '..', '..');
const U = path.join(ROOT, 'UnityResources', 'Rats'), OUT_U = path.join(U, 'FrontRig'), OUT_G = path.join(ROOT, 'assets', 'rats', 'front');
const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : null), SET = opt('--set') || 'rs';
// [id, 종류, 설명]  종류: head(피벗 아래) · limb(피벗 위) · torso(관절 계산) · tail(피벗 아래) · prop
const SR = 'the streamer rat (brown rat, green hoodie with hood up, black gaming headset with glowing blue ear rings, small webcam on top of the head, round black glasses, pink ears/nose/paws)';
const SQ = 'the red squirrel (orange-red fur, cream belly and muzzle, small tufted ears, dot eyes)';
const ALL_CELLS = [
  // 1행: 스트리머 쥐 앞모습 파츠
  ['jk_head', 'head', `${SR} HEAD ONLY, FRONT VIEW facing the viewer, smug confident grin, round glasses, headset and webcam; clean flat cut at the neck at the bottom`],
  ['jk_head_back', 'head', `${SR} HEAD ONLY seen from BEHIND (back of the green hood, headset band, webcam, ears); clean flat cut at the neck at the bottom`],
  ['jk_torso', 'torso', `${SR} TORSO ONLY, FRONT VIEW: green hoodie body with a front pocket and two drawstrings, NO head, NO arms, NO legs, NO tail (flat cuts where they attach)`],
  ['jk_torso_back', 'torso', `${SR} TORSO ONLY seen from BEHIND: plain back of the green hoodie, NO head, NO arms, NO legs`],
  ['jk_arm', 'limb', `${SR} ONE ARM ONLY hanging straight DOWN: green hoodie sleeve, pink paw at the bottom; flat cut at the top (shoulder)`],
  ['jk_leg', 'limb', `${SR} ONE LEG ONLY standing straight: short brown leg with a pink foot at the bottom pointing at the viewer; flat cut at the top (hip)`],
  // 2행: 스트리머 쥐 표정·꼬리·소품
  ['jk_head_wink', 'head', `${SR} HEAD ONLY, FRONT VIEW, cheeky WINK with one eye closed and a big happy smile (for a bow); clean flat cut at the neck`],
  ['jk_head_shout', 'head', `${SR} HEAD ONLY, FRONT VIEW, wide open mouth shouting with excitement, glasses flashing white; clean flat cut at the neck`],
  ['jk_tail', 'tail', `${SR} TAIL ONLY: long thin pink rat tail curving up in an S shape; root at the BOTTOM is a clean cut`],
  ['jk_pistol', 'prop', 'a simple black cartoon pistol, side view, barrel pointing RIGHT, grip at the bottom-left'],
  ['jk_muzzle', 'prop', 'a flat yellow-orange cartoon muzzle flash star burst pointing RIGHT (flat shapes, no glow)'],
  ['jk_casing', 'prop', 'a tiny golden bullet casing'],
  // 3행: 다람쥐 앞모습 파츠
  ['rs_head', 'head', `${SQ} HEAD ONLY, FRONT VIEW, innocent cute face; clean flat cut at the neck at the bottom`],
  ['rs_head_angry', 'head', `${SQ} HEAD ONLY, FRONT VIEW, fierce heroic angry frown, determined eyes; clean flat cut at the neck`],
  ['rs_head_shout', 'head', `${SQ} HEAD ONLY, FRONT VIEW, eyes squeezed shut, mouth wide open screaming a battle cry; clean flat cut at the neck`],
  ['rs_torso', 'torso', `${SQ} TORSO ONLY, FRONT VIEW: round body with a cream belly, NO head, NO arms, NO legs, NO tail`],
  ['rs_arm', 'limb', `${SQ} ONE ARM ONLY hanging straight DOWN, small paw at the bottom; flat cut at the top (shoulder)`],
  ['rs_leg', 'limb', `${SQ} ONE LEG ONLY standing, big foot at the bottom pointing at the viewer; flat cut at the top (hip)`],
  // 4행: 다람쥐 꼬리·표정·토르 코스프레 소품
  ['rs_tail', 'tail', `${SQ} HUGE bushy fluffy squirrel TAIL ONLY seen from the front, standing UP behind the body and curling at the top; root at the BOTTOM`],
  ['rs_head_fried', 'head', `${SQ} HEAD ONLY, FRONT VIEW, electrocuted: fur sticking out in spikes, dizzy spiral eyes, tiny smoke puffs; clean flat cut at the neck`],
  ['rs_helm', 'prop', 'a small round silver viking-style helmet with two small white wings, FRONT VIEW (original design)'],
  ['rs_cape', 'prop', 'a red hero cape seen from the FRONT hanging behind a character: wide at the bottom, narrow at the top with a gold clasp'],
  ['rs_hammer', 'prop', 'a cartoon hammer whose head is a giant acorn, wooden handle pointing DOWN, acorn head at the top'],
  ['rs_paw_bolt', 'prop', 'a small flat yellow zig-zag lightning bolt pointing UP (flat shapes, no glow)'],
];
// 다람쥐 전용 (2차): 첫 버전이 둥근 치비 만화체라 게임(반실사 비율·뾰족한 털 끝·눈 하이라이트)과 달랐음 → 기존 파츠를 첨부해 다시
const RS2 = 'the SAME red squirrel as in the attached reference images (orange-red fur, cream muzzle/chin/belly, tufted pointy ears with pink inside), drawn from the FRONT';
const RS_CELLS = [
  ['rs_head', 'head', `${RS2}: HEAD ONLY, innocent calm face; clean flat cut at the neck at the bottom`],
  ['rs_head_angry', 'head', `${RS2}: HEAD ONLY, fierce heroic frown, narrowed determined eyes; clean flat cut at the neck`],
  ['rs_head_shout', 'head', `${RS2}: HEAD ONLY, eyes squeezed shut, mouth wide open screaming; clean flat cut at the neck`],
  ['rs_head_fried', 'head', `${RS2}: HEAD ONLY, electrocuted: all fur standing up in spiky tufts, dazed spiral eyes, small smoke puffs; clean flat cut at the neck`],
  ['rs_torso', 'torso', `${RS2}: TORSO ONLY, upright body seen from the front with the cream belly in the middle, NO head, NO arms, NO legs, NO tail (flat cuts)`],
  ['rs_arm', 'limb', `${RS2}: ONE ARM ONLY hanging straight down, small open paw at the bottom; flat cut at the top (shoulder)`],
  ['rs_arm_fist', 'limb', `${RS2}: ONE ARM ONLY hanging straight down ending in a tight clenched FIST at the bottom; flat cut at the top`],
  ['rs_leg', 'limb', `${RS2}: ONE LEG ONLY standing straight, long hind foot at the bottom facing the viewer; flat cut at the top (hip)`],
  ['rs_leg_bent', 'limb', `${RS2}: ONE LEG ONLY bent deeply at the knee (crouching, knee pointing sideways), foot at the bottom; flat cut at the top`],
  ['rs_tail', 'tail', `${RS2}: its HUGE bushy tail ONLY, standing UP and curling over at the top, same jagged fur edges as the reference tail; root at the BOTTOM`],
  ['rs_helm', 'prop', 'a small round silver viking-style helmet with two small white feathered wings, FRONT VIEW (original design, same painted style)'],
  ['rs_cape', 'prop', 'a red hero cape seen from the FRONT hanging behind a character: wide at the bottom, narrow at the top with a round gold clasp'],
  ['rs_hammer', 'prop', 'a hammer whose head is a giant acorn (brown cap, tan nut), wooden handle pointing DOWN'],
  ['rs_paw_bolt', 'prop', 'a small yellow zig-zag lightning bolt pointing UP (flat, no glow)'],
  ['rs_acorn', 'prop', 'one small acorn'],
];
// 다람쥐 3차 (실사): 람쥐썬더 밈 원본 = 실제 다람쥐 사진에 번개를 대충 합성한 짤. 만화 표정 없이 '진짜 다람쥐'여야 웃김
// → 리그 파츠가 아니라 한 장짜리 사진풍 스프라이트(발끝 = 아래 가운데). 표정 연기 없음, 움직임은 코드(흔들림·찌부·번개)로
const PH = 'a PHOTOREALISTIC wildlife photo cut-out of the same real Eurasian red squirrel (natural orange-red fur, white belly, ear tufts, real animal face with NO cartoon expression)';
const RSP_CELLS = [
  ['rsp_idle', 'sprite', `${PH}, sitting upright on its hind legs nibbling an acorn held in both front paws, seen from the front`],
  ['rsp_thunder', 'sprite', `${PH}, standing upright on its hind legs facing the camera with BOTH front paws raised high above its head (the classic meme pose), body stiff`],
  ['rsp_thunder2', 'sprite', `${PH}, the same pose (standing upright, both front paws raised high) but body turned slightly and paws spread a bit wider`],
  ['rsp_thor', 'sprite', `${PH}, standing upright holding a tiny hammer whose head is an acorn raised in one front paw, wearing a tiny winged viking helmet and a small red cape, looking like a cheap funny meme photoshop edit`],
  ['rsp_leap', 'sprite', `${PH}, leaping mid-air upward with all four legs stretched out and the bushy tail streaming behind, with the tiny winged helmet and red cape`],
  ['rsp_land', 'sprite', `${PH}, SUPERHERO LANDING pose: crouched low, one front paw planted on the ground, the other front arm stretched back, head down looking forward, with the tiny winged helmet and red cape (cheap meme photoshop look)`],
  ['rsp_fried', 'sprite', `${PH}, just got electrocuted: ALL its fur puffed out and frizzled like a ball, standing stiff, a few faint wisps of smoke, face still a normal real squirrel face`],
  ['rsp_sit', 'sprite', `${PH}, sitting calmly on its hind legs, front paws together at the chest, staring blankly at the camera`],
  ['rsp_alert', 'sprite', `${PH}, standing tall on its hind legs in an alert pose, front paws tucked against the chest, looking at the camera`],
  ['rsp_arc', 'prop', 'a small crackling electric arc of bright white-blue lightning (like a cheap meme photoshop lightning effect), pointing UP, on its own'],
];
// 다람쥐 4차 (확정 방향): 그림체는 게임 파츠 그대로 + 몸·자세·얼굴은 실사 사진(front_rsp) 같은 '진짜 다람쥐' (만화 표정 없음) → 리그로 액션
const RS3 = 'the SAME squirrel as the attached game parts, drawn from the FRONT with REAL red-squirrel anatomy (slender upright body, white belly, thin front legs with small hands, big haunches and long hind feet, neutral real-animal face with NO cartoon expression)';
const RS3_CELLS = [
  ['rs_head', 'head', `${RS3}: HEAD ONLY, neutral wild-animal face looking at the viewer; clean flat cut at the neck at the bottom`],
  ['rs_head_down', 'head', `${RS3}: HEAD ONLY, tilted DOWN looking at the ground in front (seen from the front, forehead and ears visible), neutral face; clean flat cut at the neck`],
  ['rs_head_fried', 'head', `${RS3}: HEAD ONLY, all head fur and ear tufts puffed out in spikes after an electric shock, face still neutral; clean flat cut at the neck`],
  ['rs_torso', 'torso', `${RS3}: TORSO ONLY, tall slender upright body with the white belly in the middle, NO head, NO arms, NO legs, NO tail (flat cuts)`],
  ['rs_torso_fried', 'torso', `${RS3}: the same TORSO ONLY but every fur tuft puffed out and frizzled after an electric shock (flat cuts, no head/limbs/tail)`],
  ['rs_arm', 'limb', `${RS3}: ONE thin FRONT LEG ONLY hanging straight down, small hand with fingers at the bottom; flat cut at the top (shoulder)`],
  ['rs_arm_open', 'limb', `${RS3}: ONE thin FRONT LEG ONLY hanging straight down ending in an OPEN hand with the fingers spread wide (palm facing the viewer); flat cut at the top`],
  ['rs_leg', 'limb', `${RS3}: ONE HIND LEG ONLY standing straight (thigh, then a LONG foot at the bottom pointing at the viewer); flat cut at the top (hip)`],
  ['rs_leg_bent', 'limb', `${RS3}: ONE HIND LEG ONLY folded in a crouch (big haunch with the knee pointing sideways, long foot flat at the bottom); flat cut at the top`],
  ['rs_tail', 'tail', `${RS3}: its big bushy tail ONLY standing UP and curling over at the top, same jagged fur edges as the reference tail; root at the BOTTOM`],
  ['rs_tail_fried', 'tail', `${RS3}: the same tail ONLY but puffed out and frizzled after an electric shock; root at the BOTTOM`],
  ['rs_helm', 'prop', 'a small round silver viking-style helmet with two small white feathered wings, FRONT VIEW, same painted style as the game parts'],
  ['rs_cape', 'prop', 'a red hero cape seen from the FRONT hanging behind a character: wide at the bottom, narrow at the top with a round gold clasp, same painted style'],
  ['rs_hammer', 'prop', 'a hammer whose head is a giant acorn (brown cap, tan nut), wooden handle pointing DOWN, same painted style'],
  ['rs_acorn', 'prop', 'one small acorn, same painted style'],
];
// 다람쥐 5차 (추가 파츠): 사용자 레퍼런스 = ① 람쥐썬더 원본(옆·반측면, 몸을 웅크려 비틀고 한 앞발을 팔꿈치 굽혀 머리 위로, 통나무 위)
// ② 슈퍼히어로 착지(정면 로우앵글, 상반신 푹 숙여 머리가 카메라 쪽, 한 앞발로 땅 짚음, 뒷다리 양옆으로). 기존 파츠로 안 되는 것만 추가
const SIDE = 'the SAME squirrel as the attached SIDE-VIEW game parts, strict SIDE VIEW facing LEFT, at EXACTLY the same scale as those parts';
const FRONT = 'the SAME squirrel as the attached FRONT-VIEW part sheet (front_rs3), FRONT VIEW, at EXACTLY the same scale as the parts on that sheet';
const RS4_CELLS = [
  ['rss_arm_up', 'head', `${SIDE}: ONE FRONT LEG raised straight UP above the head (elbow slightly bent, open paw with the little fingers spread at the TOP); the flat shoulder cut is at the BOTTOM`],
  ['rss_arm_up2', 'head', `${SIDE}: the same raised FRONT LEG but the elbow bent more and the paw tilted forward (second frame of a trembling pose); flat shoulder cut at the BOTTOM`],
  ['rss_leg_crouch', 'limb', `${SIDE}: ONE HIND LEG folded in a deep crouch (big round haunch, long foot flat on the ground pointing LEFT); flat hip cut at the TOP`],
  ['rss_log', 'prop', 'a short mossy fallen log lying sideways (a squirrel will stand on top of it), same simple painted style'],
  ['rs_arm_plant', 'limb', `${FRONT}: ONE FRONT LEG reaching down and slightly forward with the paw pressed flat on the ground (fingers spread on the floor); flat shoulder cut at the TOP`],
  ['rs_leg_splay', 'limb', `${FRONT}: ONE HIND LEG crouched and splayed OUTWARD to the RIGHT (knee pointing right, long foot flat on the ground pointing right); flat hip cut at the TOP`],
  ['rs_head_up', 'head', `${FRONT}: HEAD ONLY from a low camera angle, chin slightly up, staring intently straight into the camera, neutral real-animal face; clean flat neck cut at the bottom`],
  ['rs_torso_bow', 'torso', `${FRONT}: TORSO ONLY bent FORWARD toward the viewer (hunched back, shoulders and upper chest coming at the camera, foreshortened, shorter than the upright torso), NO head/arms/legs/tail (flat cuts)`],
];
// 다람쥐 6차: 서 있는 몸통 한 장을 찌그러뜨려 숙이는 건 한계 → 몸통을 상반신·하반신 두 파츠로 + 히어로 랜딩(3점 착지) 자세 전용 파츠
// 히어로 랜딩 = 한쪽 무릎·다른 발바닥·한 손(주먹/손바닥)으로 땅을 딛고 상체를 앞으로 숙임, 반대 팔은 대각선 위 뒤로
const F6 = 'the SAME squirrel as the attached FRONT-VIEW part sheet (front_rs3), FRONT VIEW, EXACTLY the same scale and style as the parts on that sheet';
const RS5_CELLS = [
  ['rs_up', 'upper', `${F6}: UPPER TORSO ONLY (chest and shoulders, upright), flat neck cut at the TOP, flat waist cut at the BOTTOM, NO head, NO arms`],
  ['rs_up_bow', 'upper', `${F6}: UPPER TORSO ONLY bent FORWARD toward the viewer in a hero landing (hunched shoulders coming at the camera, foreshortened, chest seen from above), flat neck cut at the TOP, flat waist cut at the BOTTOM, NO head, NO arms`],
  ['rs_low', 'lower', `${F6}: LOWER TORSO ONLY (belly and hips, upright), flat waist cut at the TOP, NO legs, NO tail`],
  ['rs_low_crouch', 'lower', `${F6}: LOWER TORSO ONLY in a deep crouch (hips low and wide, belly seen from the front), flat waist cut at the TOP, NO legs, NO tail`],
  ['rs_leg_kneel', 'limb', `${F6}: ONE HIND LEG KNEELING, seen from the front: the thigh goes down to the KNEE touching the ground, the shin and foot fold away BEHIND (only a bit of the foot visible); flat hip cut at the TOP`],
  ['rs_leg_kneeup', 'limb', `${F6}: ONE HIND LEG with the KNEE UP and the long foot flat on the ground (thigh forward to the raised knee, shin straight down to the foot), seen from the front; flat hip cut at the TOP`],
  ['rs_arm_reach', 'limb', `${F6}: ONE FRONT LEG reaching straight DOWN with the open paw pressed FLAT on the ground at the bottom, as long as from the shoulder of a crouching squirrel to the floor; flat shoulder cut at the TOP`],
  ['rs_arm_punch', 'limb', `${F6}: ONE FRONT LEG punched straight DOWN with a clenched FIST hitting the ground at the bottom (small cracks under the fist); flat shoulder cut at the TOP`],
  ['rs_arm_back', 'limb', `${F6}: ONE FRONT LEG stretched out diagonally UP and BACK for balance, open paw at the end; flat shoulder cut at the TOP-LEFT end`],
  ['rs_head_fwd', 'head', `${F6}: HEAD ONLY tilted forward and down but the eyes looking UP straight at the camera (intense stare), neutral real-animal face; clean flat neck cut at the bottom`],
  ['rs_tail_sweep', 'tail', `${F6}: its bushy tail ONLY swept up and flaring behind after a landing impact; root at the BOTTOM`],
  ['rs_cape_flare', 'prop', 'a red hero cape seen from the FRONT flaring UP and out behind the shoulders after a landing impact (gold clasp at the bottom center), same painted style'],
];
// 다람쥐 7차: 종이 인형 몸통(세로로 긴 두 조각)으로는 앞으로 숙인 원근이 안 나와 서 있는 것처럼 보임
// → 히어로 랜딩 몸통은 자세 그대로 한 덩어리로 그리고, 움직일 부분(숙인 얼굴·뒤로 뻗은 팔)만 따로
const F7 = 'the SAME squirrel as the attached FRONT-VIEW part sheet (front_rs3), EXACTLY the same style and scale';
const RS6_CELLS = [
  ['rs_land_body', 'landbody', `${F7}: HERO LANDING (three-point landing) BODY seen from the front: crouched very low, RIGHT knee on the ground, LEFT knee up with the foot flat, RIGHT front paw punched into the ground as a FIST, upper body leaning far FORWARD with the hunched shoulders toward the camera. WITHOUT the head (flat neck cut at the top center), WITHOUT the left front leg (flat round shoulder cut on the upper LEFT side), WITHOUT the tail`],
  ['rs_land_body2', 'landbody', `${F7}: the SAME hero landing body at the instant of impact: squashed even LOWER and wider, same parts missing (no head, no left front leg, no tail), same neck cut and left shoulder cut`],
  ['rs_head_bow', 'head', `${F7}: HEAD ONLY bowed FORWARD (we see the top of the head and both ears toward the camera), the eyes looking UP intensely from under the brow, plain real-animal face; flat neck cut at the bottom`],
  ['rs_head_bow2', 'head', `${F7}: HEAD ONLY bowed forward and DOWN looking at the ground (mostly the top of the head and ears visible, eyes half hidden), plain real-animal face; flat neck cut at the bottom`],
  ['rs_arm_up_back', 'head', `${F7}: ONE FRONT LEG stretched out diagonally UP and to the LEFT (back for balance), open paw with spread fingers at the upper-left end; the flat shoulder cut is at the lower RIGHT end`],
  ['rs_arm_up_back2', 'head', `${F7}: the same stretched FRONT LEG but slightly higher and the paw clenched (second frame for trembling); flat shoulder cut at the lower RIGHT end`],
];
// 줴리 (제리 패러디, 원작 디자인은 안 베낌): 1행 = 일반 게임 파츠(gen_combo_sheet 쥐 행과 같은 형식 → group_jwerry → 파츠 파이프라인)
// 2~3행 = 필살기 "감사합니다" 전용 턱시도 리그(옆·반측면, 왼쪽을 봄). 연결 위치는 그림 보고 js/jwrig.js JW_RIG 에서 지정
// 3차: 2차 턱시도가 사람 비율이라 밈 느낌이 안 났음 → 밈처럼 2등신(머리 ≈ 몸 전체). 일반 파츠도 더 작고 날씬하고 진한 주황빛 갈색으로
// (1행 = 일반 파츠, 다른 쥐와 같은 가로 몸통 규격 / 2~3행 = 2등신 턱시도. 악기·장미는 2차 것 그대로)
const JW = 'the SAME cheeky classic-cartoon-style mouse "Jwerry": RICH warm orange-brown fur (darker and more saturated), a big ROUND head with big round ears (pink insides), cream muzzle and belly, long thin tail, smug little grin';
const JWT = `${JW}, drawn with CHIBI 2-HEADS-TALL proportions (the head is as tall as the whole rest of the body: a tiny short torso and short stubby legs), wearing a black TUXEDO (tailcoat with tails, white shirt front, small black bow tie, black trousers), 3/4 SIDE VIEW facing LEFT. All tuxedo parts at the SAME scale`;
const JW_CELLS = [
  ['jwp_head', 'skip', `${JW}, strict side view facing LEFT: HEAD only (clean cut at the neck, lower-right)`],
  ['jwp_torso', 'skip', `${JW}, strict side view facing LEFT: TORSO only, one smooth HORIZONTAL SLENDER body (like a running mouse, NOT chubby, NOT round-bellied), NO head/legs/tail`],
  ['jwp_tail', 'skip', `${JW}, strict side view: TAIL only (root on the left is a clean cut), long thin tail drawn horizontally`],
  ['jwp_front', 'skip', `${JW}, strict side view: ONE THIN FRONT LEG standing upright, tiny paw at the bottom, flat cut at the top`],
  ['jwp_back', 'skip', `${JW}, strict side view: ONE THIN HIND LEG standing upright, small foot pointing LEFT, flat cut at the top`],
  ['jw_head_smug', 'prop', `${JWT}: the BIG HEAD ONLY, eyes CLOSED in a smug self-satisfied grin (the famous shameless bow face); flat neck cut at the BOTTOM`],
  ['jw_head_grin', 'prop', `${JWT}: the BIG HEAD ONLY, eyes open with a cheeky sideways glance at the viewer and a big smug grin; flat neck cut at the BOTTOM`],
  ['jw_up', 'prop', `${JWT}: the tiny UPPER TORSO ONLY (short tuxedo jacket chest, white shirt front, black bow tie), flat neck cut at the TOP, flat waist cut at the BOTTOM, NO head, NO arms`],
  ['jw_low', 'prop', `${JWT}: the tiny LOWER TORSO ONLY (short black trousers hips with the tailcoat tails hanging at the back/right), flat waist cut at the TOP, NO legs, NO tail`],
  ['jw_arm', 'prop', `${JWT}: ONE short ARM ONLY hanging down (tuxedo sleeve, white cuff, small paw), flat shoulder cut at the TOP`],
  ['jw_arm_belly', 'prop', `${JWT}: ONE short ARM ONLY bent with the paw resting on the belly (polite bow gesture), flat shoulder cut at the TOP`],
  ['jw_arm_out', 'prop', `${JWT}: ONE short ARM ONLY stretched out to the side in a grand flourish, open paw, flat shoulder cut at the RIGHT end`],
  ['jw_leg', 'prop', `${JWT}: ONE short stubby LEG ONLY (black trouser leg, small bare mouse foot pointing LEFT), flat hip cut at the TOP`],
  ['jw_head_wink', 'prop', `${JWT}: the BIG HEAD ONLY with one eye winking and a smug grin; flat neck cut at the BOTTOM`],
  ['jw_arm_wave', 'prop', `${JWT}: ONE short ARM ONLY raised UP waving to the audience, open paw at the top, flat shoulder cut at the BOTTOM`],
];
// 줴리 필살기 "피아노 콘서트 무임승차" 무대 소품 (한 장 4×2 = 8칸). 기존 무대 악기(jw_piano·jw_rose)를 첨부해 그림체를 맞춤
const JWC_CELLS = [
  ['jwc_grand', 'prop', 'a large elegant BLACK concert GRAND PIANO in strict SIDE VIEW, the KEYBOARD end on the LEFT (white and black keys visible along the left end), the lid propped wide OPEN on its stick, three curved legs, NO bench, NO floor'],
  ['jwc_grand_shut', 'prop', 'the SAME black grand piano in the SAME strict side view and SAME size, but the lid SLAMMED SHUT flat (closed), keyboard cover also closed'],
  ['jwc_bench', 'prop', 'a small black padded piano bench stool, strict SIDE VIEW'],
  ['jwc_curtain', 'prop', 'ONE tall red velvet theatre stage curtain panel hanging straight down in soft folds, gathered at the bottom-outer corner with a gold rope tassel (the LEFT-side curtain of a pair), tall narrow shape'],
  ['jwc_valance', 'prop', 'a wide horizontal red velvet stage curtain valance (the swag border across the top of a stage) with a gold fringe along the bottom edge, very wide and short'],
  ['jwc_bowtie', 'prop', 'a small black formal bow tie, front view'],
  ['jwc_card', 'prop', 'a BLANK cream concert programme card in a thin gold ornamental border, landscape, completely EMPTY inside (no text, no letters, no symbols)'],
  ['jwc_sheet', 'prop', 'a single loose sheet of piano sheet-music paper fluttering slightly curled, with staff lines and simple note heads only (NO letters, NO words)'],
];
// 줴리 필살기 야유 투척물 + HUD 찍찍!! 아이콘 (한 장에 모아 뽑고 자름)
const JWB_CELLS = [
  ['ui_ratface', 'prop', 'a small cute ROUND grey-brown RAT FACE icon in FRONT VIEW (just the head: two big round ears with pink insides, two dot eyes, a pink nose, a few short whiskers, cheeky little buck teeth), like a simple app icon, fills the cell'],
  ['jwb_egg', 'prop', 'one whole plain white-cream chicken EGG, slightly tilted'],
  ['jwb_egg_splat', 'prop', 'a SPLATTERED broken raw egg seen from above: irregular clear-white splash shape with a round yellow yolk in the middle and two small jagged cracked shell pieces'],
  ['jwb_tomato', 'prop', 'one whole ripe red TOMATO with a small green stem and leaves, side view'],
  ['jwb_tomato_splat', 'prop', 'a SQUASHED tomato splat seen from above: irregular red splash shape with a few seeds and a green stem bit'],
  ['jwb_slipper', 'prop', 'one worn light-blue house SLIPPER (flip-flop style bathroom slipper), side-top view'],
];
const SETS = {
  jwb: { cols: 3, rows: 2, cells: JWB_CELLS, file: 'jwerry_boo', refs: [], extra: [path.join(U, 'FrontRig', 'jw_rose.png'), path.join(U, 'FrontRig', 'jw_trumpet.png')] },
  jwc:{ cols: 4, rows: 2, cells: JWC_CELLS, file: 'jwerry_concert', refs: [], extra: [path.join(U, 'FrontRig', 'jw_piano.png'), path.join(U, 'FrontRig', 'jw_rose.png')] },
  jw: { cols: 5, rows: 3, cells: JW_CELLS, file: 'jwerry_sheet', refs: ['streamrat'] },
  rs6: { cols: 3, rows: 2, cells: RS6_CELLS, file: 'front_rs6', refs: ['ramjui'], extra: [path.join(U, 'Sheets', 'front_rs3.png')] },
  rs5: { cols: 4, rows: 3, cells: RS5_CELLS, file: 'front_rs5', refs: ['ramjui'], extra: [path.join(U, 'Sheets', 'front_rs3.png')] },
  rs4: { cols: 4, rows: 2, cells: RS4_CELLS, file: 'front_rs4', refs: ['ramjui'], extra: [path.join(U, 'Sheets', 'front_rs3.png')] },
  rs3: { cols: 5, rows: 3, cells: RS3_CELLS, file: 'front_rs3', refs: ['ramjui'] },
  rsp: { cols: 5, rows: 2, cells: RSP_CELLS, file: 'front_rsp', refs: [] },
  all: { cols: 6, rows: 4, cells: ALL_CELLS, file: 'front_rig', refs: ['streamrat', 'ramjui'] },
  rs: { cols: 5, rows: 3, cells: RS_CELLS, file: 'front_rs', refs: ['ramjui'] },
};
const { cols: COLS, rows: ROWS, cells: CELLS, file: SHEET } = SETS[SET];
const REFS = SETS[SET].refs.flatMap(id => ['head', 'torso', 'front', 'back', 'tail'].map(n => path.join(U, 'Parts', id, n + '.png')));
const EXTRA = SETS[SET].extra || [];
const STYLE = SET === 'jwc' || SET === 'jwb'
  ? 'ART STYLE = EXACTLY the attached game stage props (the small piano and the rose): flat minimalist illustration in the style of "Untitled Goose Game", simple clean shapes, NO outlines, soft muted palette, flat colors with at most one slightly darker flat shade. These are stage PROPS for a comedy concert scene.'
  : SET === 'jw'
  ?'ART STYLE = EXACTLY the attached game rat parts: flat minimalist illustration in the style of "Untitled Goose Game", simple clean shapes, NO outlines, soft muted palette, flat colors with at most one slightly darker flat shade, the same eye and face style as the reference head. ORIGINAL parody character: do NOT copy any existing cartoon character design.'
  : SET === 'rsp'
  ? 'PHOTOREALISTIC: every squirrel must look like a real photograph of a real animal (real fur detail, natural lighting, sharp focus), NOT an illustration, NOT a cartoon, NOT cute stylised. All cells show the SAME individual squirrel at the SAME scale, lit the same way, full body visible, cleanly cut out.'
  : SET === 'rs3' || SET === 'rs4' || SET === 'rs5' || SET === 'rs6'
  // 2026-09-30: 사진을 같이 첨부했더니 털을 한 올씩 그린 세밀화가 나와 게임(ramjui 파츠)과 달랐음 → 게임 파츠만 첨부 + 단순함을 글로 못박음
  ? 'ART STYLE = EXACTLY the attached game parts, which are SIMPLE: large areas of almost FLAT orange fill (#D0683A-ish) with only a very soft subtle shade, cream (#F3D2A8-ish) areas whose border with the orange is a few jagged pointed tufts, and the outer silhouette has only a FEW small sharp tufts. ABSOLUTELY NO individual hair strands, NO fur texture lines, NO whiskers, NO painterly brush detail, NO outlines. Paws = simple shapes with 2-3 short dark toe lines. Eyes like the reference head: one big glossy dark-brown eye with a white highlight and a cream ring. Keep the same low level of detail as the references everywhere. ANATOMY and FEEL: a real red squirrel (small head, slender upright body, thin front legs, big haunches, long hind feet) with a plain neutral animal face — NO smile, NO eyebrows, NO expressions.'
  : SET === 'rs'
  ? 'MATCH THE ATTACHED REFERENCE IMAGES EXACTLY — they are the existing side-view parts of this squirrel in the game. Same painted storybook look: semi-realistic proportions (NOT chibi, NOT big-headed, NOT a round cute cartoon), fur silhouettes with small sharp pointed tufts along the edges, cream areas separated from the orange by a jagged tufted edge, glossy dark-brown eyes with a white highlight and a thin cream eye ring, small dark nose, soft subtle shading, no outlines. The front-view head is narrow and slightly pointed with big tufted ears, the same size relative to the torso as in the references.'
  : 'Flat minimalist illustration in the style of "Untitled Goose Game": simple clean geometric shapes, NO outlines, soft muted pastel palette, flat colors with at most one slightly darker flat shade, clean vector look. ABSOLUTELY NO fur texture, NO gradients, NO glow, NO soft shading, NO rim light; eyes are simple dark dots (plus glasses where stated).';
const prompt = [
  REFS.length && `STYLE REFERENCE (MANDATORY): the attached images (also on disk: ${REFS.join(', ')}) are existing game parts. Match their exact art style, colours and level of detail (they are side views; you draw the same character from the front).`,
  ['rs4', 'rs5', 'rs6'].includes(SET) && `The attached front_rs3 sheet (${EXTRA.join(', ')}) is the existing FRONT-VIEW part sheet of this squirrel in the SAME game style: FRONT-VIEW cells must match it exactly in style and scale; SIDE-VIEW cells must match the attached side parts.`,
  (SET === 'jwc' || SET === 'jwb') && `STYLE REFERENCE (MANDATORY): the attached images (${EXTRA.join(', ')}) are existing props from the same scene — match their art style, colours and level of detail exactly.`,
  !['rs4', 'rs5', 'rs6', 'jwc', 'jwb'].includes(SET) && EXTRA.length && `POSE / ANATOMY REFERENCE: the attached photo sheet (${EXTRA.join(', ')}) shows how the real squirrel looks and stands — use it for body shape and the animal feel only, not for the rendering style.`,
  STYLE,
  `Asset: ONE game sheet. Canvas: landscape 1536x1024. Background: perfectly flat solid pure MAGENTA #FF00FF everywhere between the drawings (no gradient); never use magenta inside the drawings.`,
  `Layout: an invisible grid of ${COLS} columns x ${ROWS} rows of equal cells (each ${1536 / COLS | 0}x${1024 / ROWS | 0}). Exactly ONE drawing per cell, centered, with a clear empty margin, never touching other drawings or the cell borders.${SET === 'jwc' || SET === 'jwb' ? ' Each prop fills about 80% of its cell.' : SET === 'rsp' ? ' Each squirrel fills most of its cell height, feet at the bottom of the drawing.' : ' These are cut-out PUPPET PARTS for a paper-doll rig: all body parts at the SAME SCALE (the head about as wide as the torso, arms/legs about as long as the torso is tall).'}`,
  ...Array.from({ length: ROWS }, (_, r) => `Row ${r + 1}: ${CELLS.slice(r * COLS, r * COLS + COLS).map((c, k) => `(column ${k + 1}) ${c[2]}`).join(' · ')}.`),
  'ORIGINAL designs only: do not copy any existing movie, comic, game or brand character or logo. No text, no labels, no numbers, no ground shadows, no border, no watermark.',
].filter(Boolean).join('\n');
if (args.includes('--print')) { console.log(prompt); process.exit(0); }
const file = path.join(SHEETS, SHEET + '.png');
mkdirSync(SHEETS, { recursive: true }); mkdirSync(OUT_U, { recursive: true }); mkdirSync(OUT_G, { recursive: true });
if (!args.includes('--split-only')) {
  if (existsSync(file)) { let n = 1; while (existsSync(path.join(SHEETS, `${SHEET}_v${n}.png`))) n++; renameSync(file, path.join(SHEETS, `${SHEET}_v${n}.png`)); }
  if (!(await codexImage(prompt, file, SHEET, [...REFS, ...EXTRA]))) process.exit(1);
}

// 마젠타 → 투명, 덩어리(연결 성분) 중심이 들어간 칸에 배정 (칸 밖으로 삐져나와도 한 덩어리로)
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, cw = W / COLS, ch = H / ROWS;
for (let i = 0; i < data.length; i += 4) {
  const m = Math.min(data[i], data[i + 2]) - data[i + 1];
  if (SET !== 'rsp' && SET !== 'rs3' && SET !== 'rs4' && SET !== 'rs5' && SET !== 'rs6') { if (m > 150) data[i + 3] = 0; else if (m > 70) data[i + 3] = Math.min(data[i + 3], Math.round(255 * (1 - (m - 70) / 80))); continue; }
  // 실사 털: 가장자리가 배경과 섞여 분홍으로 남음 → 관측색 = a·털색 + (1−a)·마젠타 로 보고 털색을 역산 (언믹스)
  if (m <= 8) continue;
  const a = Math.max(0, Math.min(1, 1 - (m - 8) / 130));
  if (a < 0.06) { data[i + 3] = 0; continue; }
  data[i] = Math.max(0, Math.min(255, (data[i] - (1 - a) * 255) / a));
  data[i + 1] = Math.max(0, Math.min(255, data[i + 1] / a, data[i] + 6));     // 털색은 빨강 ≥ 초록 (가장자리 초록 끼 방지)
  data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - (1 - a) * 255) / a));
  data[i + 3] = Math.round(data[i + 3] * a);
}
const owner = new Int16Array(W * H).fill(-1), lab = new Uint8Array(W * H), stack = [];
for (let s0 = 0; s0 < W * H; s0++) {
  if (lab[s0] || data[s0 * 4 + 3] <= 30) continue;
  const comp = []; stack.push(s0); lab[s0] = 1;
  while (stack.length) { const q = stack.pop(); comp.push(q); const x = q % W, y = (q / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = ny * W + nx; if (!lab[k] && data[k * 4 + 3] > 30) { lab[k] = 1; stack.push(k); } } }
  if (comp.length < 20) continue;
  let sx = 0, sy = 0; for (const q of comp) { sx += q % W; sy += (q / W) | 0; }
  const cell = Math.min(ROWS - 1, Math.floor(sy / comp.length / ch)) * COLS + Math.min(COLS - 1, Math.floor(sx / comp.length / cw));
  for (const q of comp) owner[q] = cell;
}
// 알파 분석: 줄(y 비율)에서 불투명 픽셀의 x 범위·평균
const rowSpan = (a, w, h, fy) => {
  const y0 = Math.max(0, Math.floor(h * fy) - 2), y1 = Math.min(h - 1, Math.floor(h * fy) + 2);
  let x0 = w, x1 = -1, sx = 0, n = 0;
  for (let y = y0; y <= y1; y++) for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 100) { if (x < x0) x0 = x; if (x > x1) x1 = x; sx += x; n++; }
  return n ? { x0: x0 / w, x1: x1 / w, mid: sx / n / w } : { x0: 0.2, x1: 0.8, mid: 0.5 };
};
const r3 = v => Math.round(v * 1000) / 1000;
const metaFile = path.join(ROOT, 'rats', 'js', 'front_meta.js');
// 다른 세트 파츠는 그대로 두고 이번 세트만 덮어씀
const META = existsSync(metaFile) ? JSON.parse((readFileSync(metaFile, 'utf8').match(/FRONT_PARTS = (\{.*\});/) || [0, '{}'])[1]) : {};
for (const [ci, [id, kind]] of CELLS.entries()) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let q = 0; q < W * H; q++) if (owner[q] === ci) { const x = q % W, y = (q / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { console.log(`  ⚠ ${id}: 비어 있음`); continue; }
  const pw = x1 - x0 + 1, ph = y1 - y0 + 1, out = Buffer.alloc(pw * ph * 4);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) { const q = (y0 + y) * W + x0 + x; if (owner[q] === ci) data.copy(out, (y * pw + x) * 4, q * 4, q * 4 + 4); }
  const png = sharp(out, { raw: { width: pw, height: ph, channels: 4 } }).png();
  await png.clone().toFile(path.join(OUT_U, id + '.png'));
  if (kind === 'skip') { console.log(`  ✂ ${id} ${pw}×${ph} (보관만)`); continue; }
  await png.clone().resize(360, 360, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(path.join(OUT_G, id + '.png'));
  const m = { kind, size: [pw, ph] };
  if (kind === 'head' || kind === 'tail') m.pivot = [r3(rowSpan(out, pw, ph, 0.96).mid), 0.95];
  if (kind === 'sprite') m.pivot = [r3(rowSpan(out, pw, ph, 0.97).mid), 1];     // 발끝 = 아래 가운데
  if (kind === 'limb') m.pivot = [r3(rowSpan(out, pw, ph, 0.04).mid), 0.06];
  if (kind === 'landbody') {     // 한 덩어리 자세 몸통: 원점 = 아래 가운데(땅), 목 = 맨 윗줄 가운데. 왼어깨는 그림 보고 코드(frontrig.js FR_LAND)에서 지정
    const bot = rowSpan(out, pw, ph, 0.98), top = rowSpan(out, pw, ph, 0.02);
    m.pivot = [r3(bot.mid), 1]; m.neck = [r3(top.mid), 0.02];
  }
  if (kind === 'upper') {        // 상반신: 목(위 가운데)·어깨(위쪽 좌우)·허리(아래 가운데)
    const top = rowSpan(out, pw, ph, 0.05), sh = rowSpan(out, pw, ph, 0.22), bot = rowSpan(out, pw, ph, 0.95);
    m.neck = [r3(top.mid), 0.04]; m.shoulderL = [r3(sh.x0 + 0.1), 0.22]; m.shoulderR = [r3(sh.x1 - 0.1), 0.22]; m.waist = [r3(bot.mid), 0.95];
  }
  if (kind === 'lower') {        // 하반신: 허리(위 가운데)·엉덩이 관절(아래쪽 좌우)·꼬리
    const top = rowSpan(out, pw, ph, 0.05), hip = rowSpan(out, pw, ph, 0.78);
    m.waist = [r3(top.mid), 0.05]; m.hipL = [r3(hip.mid - (hip.x1 - hip.x0) * 0.26), 0.78]; m.hipR = [r3(hip.mid + (hip.x1 - hip.x0) * 0.26), 0.78]; m.tail = [r3(hip.mid), 0.6];
  }
  if (kind === 'torso') {
    const top = rowSpan(out, pw, ph, 0.06), sh = rowSpan(out, pw, ph, 0.22), hip = rowSpan(out, pw, ph, 0.9);
    m.neck = [r3(top.mid), 0.05];
    m.shoulderL = [r3(sh.x0 + 0.1), 0.22]; m.shoulderR = [r3(sh.x1 - 0.1), 0.22];
    m.hipL = [r3(hip.mid - (hip.x1 - hip.x0) * 0.24), 0.88]; m.hipR = [r3(hip.mid + (hip.x1 - hip.x0) * 0.24), 0.88];
    m.tail = [r3(hip.mid), 0.8];
  }
  META[id] = m;
  console.log(`  ✂ ${id} ${pw}×${ph}`);
}
writeFileSync(metaFile, `'use strict';\n// 자동 생성: rats/dev/gen_front_rig.mjs — 필살기 앞모습 리그 파츠 크기·관절(0~1 비율)\nconst FRONT_PARTS = ${JSON.stringify(META)};\n`);
console.log(`front_meta.js: ${Object.keys(META).length}개`);
