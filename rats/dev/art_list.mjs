// 특수 액션·필살기에 필요한 이미지 목록 (다음 Codex 이미지 작업용)
//   prop : 손에 드는 소품·드랍 소품               → UnityResources/Rats/Props/<id>.png
//   fx   : 투척물·낙하물 + 필살기 준비 동작 이펙트   → UnityResources/Rats/FX/<id>.png
// emoji: 게임이 지금 임시로 쓰는 이모지. 이미지가 생기면 이 이모지 자리를 이미지로 바꿔 그림 (rats/js/art_manifest.js).

export const PROPS = [
  ['gun', '🔫', 'a small dark grey toy-like pistol, side view, barrel pointing LEFT'],
  ['hamsterball', '🔵', 'a clear transparent hamster exercise ball with a light blue tint and air slots'],
  ['flask', '⚗️', 'a round glass lab flask with bubbling green liquid'],
  ['hammer', '🔨', 'a chunky sledgehammer with a wooden handle'],
  ['skateboard', '🛹', 'a small skateboard with sage-green deck and cream wheels, side view'],
  ['extinguisher', '🧯', 'a red fire extinguisher with a black hose'],
  ['pickaxe', '⛏️', 'a miner pickaxe with a wooden handle'],
  ['wand', '🪄', 'a magic wand, dark stick with a glowing star tip'],
  ['guitar', '🎸', 'a small red electric guitar'],
  ['axe', '🪓', 'a viking battle axe with a round steel blade'],
  ['knife', '🔪', 'a chef kitchen knife with a wooden handle'],
  ['pencil', '✏️', 'a yellow pencil with a pink eraser'],
  ['katana', '🗡️', 'a small katana with a dark wrapped handle'],
  ['shield', '🛡️', 'a round knight shield with a cream cross emblem'],
  ['mic', '🎤', 'a pop idol microphone with a pink ribbon'],
  ['dynamite', '🧨', 'a stick of red dynamite with a sparking fuse'],
  ['gift', '🎁', 'a small wrapped gift box with a red ribbon bow'],
  ['letter', '✉️', 'a cream envelope with a red wax seal'],
  ['scroll', '📜', 'a rolled parchment scroll with a red ribbon'],
  ['magnifier', '🔍', 'a detective magnifying glass with a brass rim'],
  ['lasso', '🪢', 'a coiled cowboy rope lasso'],
  ['lamp', '🪔', 'a golden genie oil lamp'],
];
export const FX = [
  ['meteor', '☄️', 'a flaming meteor rock falling diagonally, warm orange trail'],
  ['fireball', '🔥', 'a round fireball with a short flame tail'],
  ['parcel', '📦', 'a cardboard delivery box with tape, slightly tilted'],
  ['satellite', '🛰️', 'a small cartoon satellite with solar panels'],
  ['moneybag', '💰', 'a tied cloth money bag with a gold coin symbol'],
  ['gem', '💎', 'a faceted pastel blue gemstone'],
  ['bomb', '💣', 'a round black cartoon bomb with a lit fuse'],
  ['arrow', '🏹', 'a single wooden arrow with a feather fletching, pointing RIGHT'],
  ['missile', '🚀', 'a small cartoon missile with fins, pointing RIGHT'],
];
// 필살기 병맛 상황극 소품 (emoji 자리에 'ult:키' — ults.js 가 이미지가 있으면 코드 그림 대신 사용)
export const ULT_FX = [
  // 필살기 전용 앞모습 그림 (쥐커드·람쥐썬더) + 총구 섬광: 한 시트에
  ['jk_front','ult:jk_front','FRONT VIEW (facing the viewer) full body of the SAME brown rat streamer character: brown fur, a sage green oversized hoodie with the hood up, a big black gaming headset with glowing blue rings and a boom mic, a tiny webcam clipped on the hood, ROUND BLACK GLASSES, black fingerless gloves, pink tail, standing on hind legs with legs apart, arms crossed in front of the chest each paw holding a black pistol, glasses flashing white, confident smirk, dramatic hero pose'],
  ['jk_spin1','ult:jk_spin1','FRONT VIEW (facing the viewer) full body of the SAME brown rat streamer character: brown fur, a sage green oversized hoodie with the hood up, a big black gaming headset with glowing blue rings and a boom mic, a tiny webcam clipped on the hood, ROUND BLACK GLASSES, black fingerless gloves, pink tail, standing on hind legs, BOTH arms stretched straight out to the LEFT and RIGHT sides (T-pose) each paw firing a black pistol with a small yellow muzzle flash, mouth open shouting'],
  ['jk_spin2','ult:jk_spin2','SIDE VIEW facing LEFT full body of the SAME brown rat streamer character: brown fur, a sage green oversized hoodie with the hood up, a big black gaming headset with glowing blue rings and a boom mic, a tiny webcam clipped on the hood, ROUND BLACK GLASSES, black fingerless gloves, pink tail, standing on hind legs, one arm stretched forward and one backward each paw firing a black pistol with a small muzzle flash (same spinning pose seen from the side)'],
  ['jk_spin3','ult:jk_spin3','BACK VIEW (seen from behind) full body of the SAME brown rat streamer character: brown fur, a sage green oversized hoodie with the hood up, a big black gaming headset with glowing blue rings and a boom mic, a tiny webcam clipped on the hood, ROUND BLACK GLASSES, black fingerless gloves, pink tail, standing on hind legs, both arms stretched out to the LEFT and RIGHT sides holding black pistols, we see the back of the green hoodie, headset band and pink tail'],
  ['jk_twirl','ult:jk_twirl','FRONT VIEW full body of the SAME brown rat streamer character: brown fur, a sage green oversized hoodie with the hood up, a big black gaming headset with glowing blue rings and a boom mic, a tiny webcam clipped on the hood, ROUND BLACK GLASSES, black fingerless gloves, pink tail, standing on hind legs, twirling a black pistol around one finger with motion swirl lines, other pistol pointed up, cool wink'],
  ['muzzle','ult:muzzle','a big comic-style yellow and white gun MUZZLE FLASH burst, star shaped with sharp spikes, pointing RIGHT'],
  ['jk_bow','ult:jk_bow','FRONT VIEW full body of the SAME brown rat streamer character (sage green hoodie, gaming headset with glowing blue rings, round black glasses) bowing politely with both paws together, a smoking black pistol tucked in the hoodie pocket, happy grateful face'],
  ['rs_fried','ult:rs_fried','FRONT VIEW full body of the SAME ordinary cute red squirrel after being struck by lightning: fur puffed up and frizzled in all directions, a bit of smoke on top, dazed swirly eyes, still proudly standing'],
  ['rs_front','ult:rs_front','FRONT VIEW (facing the viewer) full body of the SAME ordinary cute red squirrel: warm orange-brown fur, cream belly, big bushy tail, small tufted ears, sitting upright holding a tiny acorn with both paws, completely innocent blank face'],
  ['rs_thunder','ult:rs_thunder','FRONT VIEW (facing the viewer) full body of the SAME ordinary cute red squirrel: warm orange-brown fur, cream belly, big bushy tail, small tufted ears, standing tall on its hind legs with BOTH front paws raised straight UP to the sky, eyes closed, mouth open shouting, tiny electric sparks around its paws (the famous summoning lightning pose)'],
  ['rs_thor','ult:rs_thor','FRONT VIEW full body of the SAME ordinary cute red squirrel: warm orange-brown fur, cream belly, big bushy tail, small tufted ears wearing a small silver winged viking helmet and a bright red cape, standing heroically on hind legs holding a giant ACORN war hammer raised high above its head with one paw, cape flowing'],
  ['rs_land','ult:rs_land','FRONT VIEW (facing the viewer) of the SAME ordinary cute red squirrel: warm orange-brown fur, cream belly, big bushy tail, small tufted ears wearing a small silver winged viking helmet and a bright red cape in a SUPERHERO LANDING: crouched low on one knee, one front paw punched down into the ground as a fist, the other arm back holding a giant acorn war hammer, head down with fierce eyes, cape spread behind, small cracks under the fist'],
  ['cheese_wheel', 'ult:cheese_wheel', 'a giant round wheel of yellow cheese seen from the side, with holes, like a rolling boulder'],
  ['ufo', 'ult:ufo', 'a classic flying saucer UFO with a glass dome and blinking lights, side view'],
  ['sleigh', 'ult:sleigh', 'a small red Santa sleigh with golden trim and curved runners, side view facing RIGHT, empty seat'],
  ['catapult', 'ult:catapult', 'a small wooden medieval catapult with a spoon-shaped throwing arm, side view facing RIGHT'],
  ['genie', 'ult:genie', 'a friendly pale blue genie emerging from smoke, arms crossed, golden turban, cartoon'],
  ['giant_bat', 'ult:giant_bat', 'a giant dark purple cartoon bat with huge spread wings and tiny fangs, front view'],
  ['tea_table', 'ult:tea_table', 'a small wooden tea table with a white tablecloth, side three-quarter view'],
  ['excalibur', 'ult:excalibur', 'a legendary glowing sword stuck upright in a grey boulder, golden hilt, purple grip'],
  ['car', 'ult:car', 'a chunky toy car seen from directly ABOVE (top-down), steel grey with a red stripe, pointing RIGHT'],
  ['firework', 'ult:firework', 'a small firework rocket with a stick and a spark fuse, pointing up'],
  // 람쥐썬더 다람쥐 필살기 (토르 코스프레 슈퍼히어로 착지): gen_combo_sheet.mjs 로 파츠와 한 장에
  ['thor_helm', 'ult:thor_helm', 'a small shiny silver winged viking helmet with two white feathered wings on the sides, strict side view facing LEFT, sized to sit on a small animal head, open underneath'],
  ['thor_cape', 'ult:thor_cape', 'a flowing bright red superhero cape billowing to the RIGHT as if in strong wind, fastened at the top-left corner with a round silver clasp'],
  ['acorn_hammer', 'ult:acorn_hammer', 'a mighty god-of-thunder style war hammer whose head is a GIANT ACORN wrapped in silver metal bands, a short wooden handle with a leather grip and a wrist strap, drawn upright with the head on top, small electric sparks'],
  ['bolt_pillar', 'ult:bolt_pillar', 'a tall vertical pillar of pale blue and white LIGHTNING crackling from top to bottom with jagged side branches and a soft glow, twice as tall as wide'],
  ['ground_crack', 'ult:ground_crack', 'a round cracked ground crater decal seen from gentle three-quarter above, dark broken floor tiles with jagged cracks glowing electric blue, small debris'],
  ['pyramid', 'ult:pyramid', 'a big ancient Egyptian sandstone step pyramid, gentle three-quarter front view from slightly above, two faces visible (lit face warm sand, shaded face darker ochre), a small golden capstone on top, flat wide base, no sand around it'],
];
// 연구소 탈출 스테이지 소품: 방해꾼(고양이·쥐덫)·계단 (emoji 자리에 'w:키')
export const WORLD = [
  ['cat', 'w:cat', 'a chubby grumpy orange lab cat walking, strict side view facing LEFT, tail up, whole body visible, feet at the bottom'],
  ['cat_pounce', 'w:cat_pounce', 'the same chubby orange cat leaping forward to pounce, strict side view facing LEFT, front paws stretched out, claws out, angry face'],
  ['mousetrap', 'w:mousetrap', 'a classic wooden spring mouse trap seen from a gentle three-quarter top view, OPEN and armed, a small cheese wedge on the trigger'],
  ['mousetrap_snap', 'w:mousetrap_snap', 'the same wooden spring mouse trap seen from a gentle three-quarter top view, SNAPPED shut, the metal bar slammed down'],
  ['stairs', 'w:stairs', 'a concrete emergency staircase going UP, gentle three-quarter front view from above, grey steps with a yellow safety stripe on each edge, a green EXIT-style running figure sign without text above it, handrails'],
];
// 연구소 물건 (부수는 대상, emoji 자리에 'i:키'). 게임에선 서 있는 스프라이트로 그림 (3/4 시점, 바닥 = 이미지 아래쪽)
export const LAB_ITEMS = [
  ['flask', 'i:flask', 'a round-bottom glass flask with bubbling green liquid and a cork'],
  ['erlen', 'i:erlen', 'a conical Erlenmeyer flask with pink liquid'],
  ['pillbottle', 'i:pillbottle', 'an amber medicine pill bottle with a white cap and a label'],
  ['syringe', 'i:syringe', 'a big cartoon syringe lying on its side with blue serum'],
  ['tuberack', 'i:tuberack', 'a small wooden rack holding four test tubes with colorful liquids'],
  ['petri', 'i:petri', 'a stack of three petri dishes with green and yellow mold colonies'],
  ['microscope', 'i:microscope', 'a cream and grey laboratory microscope'],
  ['beaker', 'i:beaker', 'a glass beaker with measurement lines and blue liquid'],
  ['specimen', 'i:specimen', 'a glass specimen jar with a funny pickled tentacle inside'],
  ['clipboard', 'i:clipboard', 'a clipboard with research papers and a pen'],
  ['firstaid', 'i:firstaid', 'a white first aid box with a red cross'],
  ['goggles', 'i:goggles', 'a pair of safety goggles lying on a small stack of lab notebooks'],
  ['monitor', 'i:monitor', 'a chunky beige lab computer monitor with a keyboard in front'],
  ['centrifuge', 'i:centrifuge', 'a round white laboratory centrifuge machine with a lid and buttons'],
  ['drum', 'i:drum', 'a big yellow chemical drum barrel with a hazard symbol (no text)'],
  ['server', 'i:server', 'a tall dark grey server rack cabinet with small blinking lights'],
  ['cart', 'i:cart', 'a steel lab trolley cart with bottles on two shelves'],
  ['gastank', 'i:gastank', 'a tall green gas cylinder with a valve on top, on a small stand'],
  ['cage', 'i:cage', 'an empty lab animal cage with a hamster wheel and an open door'],
  ['watercooler', 'i:watercooler', 'an office water cooler with a blue water bottle on top'],
  ['extinguisher', 'i:extinguisher', 'a red fire extinguisher standing upright'],
  ['biobin', 'i:biobin', 'a yellow biohazard waste bin with a lid (symbol only, no text)'],
  ['stool', 'i:stool', 'a round grey lab stool on wheels'],
  ['mug', 'i:mug', 'a coffee mug with steam, a funny rat doodle on it'],
];
// 연구소 가구 (방마다 배치되는 아주 무거운 물건, emoji 자리에 'f:키'). 12개 = Codex 시트 한 장 (토큰 절약). 3/4 시점, 바닥 = 이미지 아래쪽
export const FURNITURE = [
  ['shelf', 'f:shelf', 'a tall grey metal laboratory storage shelf with four shelves full of bottles, jars and small boxes'],
  ['bookshelf', 'f:bookshelf', 'a tall wooden bookcase full of colorful binders and thick research books'],
  ['cot', 'f:cot', 'a simple folding camp cot bed with a thin striped mattress, a flat pillow and a crumpled blanket (a tired researcher nap bed)'],
  ['table', 'f:table', 'a long sturdy laboratory workbench table with a pale top and grey metal legs, a couple of papers on it'],
  ['chair', 'f:chair', 'a padded office swivel chair on five wheels'],
  ['desk', 'f:desk', 'an office desk with drawers, a small desk lamp and a stack of papers on it'],
  ['locker', 'f:locker', 'a tall double grey metal staff locker with vent slits'],
  ['cabinet', 'f:cabinet', 'a three-drawer beige metal filing cabinet, one drawer slightly open with folders'],
  ['sofa', 'f:sofa', 'a small worn sage green break-room sofa with one sagging cushion'],
  ['fridge', 'f:fridge', 'a white laboratory specimen fridge with a glass door showing sample racks'],
  ['vending', 'f:vending', 'a snack vending machine with rows of colorful snack packs behind glass (no text, no logos)'],
  ['plant', 'f:plant', 'a big potted office ficus plant in a terracotta pot'],
];
// HP 바 (물건·사람 머리 위). 네 개가 완전히 같은 모양·크기여야 겹쳐서 채움 비율만큼 잘라 그릴 수 있음 (emoji 자리에 'u:키')
const HPBAR = 'a flat front-facing game UI health bar: a long thin perfectly horizontal rounded capsule, width exactly 6 times its height, a soft cream outer rim of even thickness, NOT a three-quarter view, no text, no icons';
export const UI_ART = [
  ['hp_empty', 'u:hp_empty', `${HPBAR}; the inside is EMPTY (flat dark warm grey)`],
  ['hp_green', 'u:hp_green', `the SAME health bar, same size and same rim, the inside completely FULL of flat sage green with a thin lighter highlight stripe on top`],
  ['hp_yellow', 'u:hp_yellow', `the SAME health bar, same size and same rim, the inside completely FULL of flat warm mustard yellow with a thin lighter highlight stripe on top`],
  ['hp_red', 'u:hp_red', `the SAME health bar, same size and same rim, the inside completely FULL of flat dusty terracotta red with a thin lighter highlight stripe on top`],
];
// 패러디 쥐: 컴퓨터 마우스 쥐는 파츠 없이 한 장짜리 (r:키 → drawRat 이 쥐 그림 대신 사용) + 패러디 필살기 소품 (ult:키)
export const PARODY_ART = [
  ['rat_pcmouse', 'r:pcmouse', 'a REAL beige office computer mouse, strict side view with the front (click buttons and a small grey scroll wheel) pointing LEFT, NO face, NO eyes, NO legs, NO arms, just the smooth plastic mouse body, its grey USB cable trailing out to the RIGHT in a gentle curve like a tail, ending in a small USB plug'],
  ['ult_balloon', 'ult:balloon', 'a shiny pink heart-shaped party balloon on a thin white string'],
  ['ult_battery', 'ult:battery', 'a big cartoon AA battery, orange and black, with a small lightning mark (no text)'],
  ['ult_bolt', 'ult:bolt', 'a single green crossbow bolt with dripping green goo, pointing RIGHT'],
  ['ult_chat', 'ult:chat', 'a floating live-stream chat window panel: rounded dark purple rectangle with several colorful rounded chat bubbles and tiny heart and laughing emoji icons, NO readable text or letters'],
  ['ult_donation', 'ult:donation', 'a small shiny gift box with a big bow and a golden cheese coin on top, sparkling, like a donation alert'],
];
// 슈퍼 요리사 쥐의 탈것: 네 발로 기어 다니는 요리사 전신 그림 (프레임 애니메이션, m:키). 등 위에 쥐가 탐 → 등은 평평하게, 위에 아무것도 없이
const COOK = 'the SAME big clumsy restaurant cook (white chef jacket, very tall white chef toque, messy brown hair, big round nose, black-and-white checkered trousers, white clogs) CRAWLING ON ALL FOURS like a horse, strict side view facing LEFT, back flat and horizontal, hands and knees on the ground, with a hilariously exhausted funny face: tongue hanging out, dizzy swirly eyes, big sweat drops, NOTHING riding on his back';
export const MOUNT_ART = [
  ['mount_cook1', 'm:cook1', `${COOK}; gallop frame 1: left hand forward, right knee back`],
  ['mount_cook2', 'm:cook2', `${COOK}; gallop frame 2: hands together under the chest, knees together`],
  ['mount_cook3', 'm:cook3', `${COOK}; gallop frame 3: right hand forward, left knee back`],
  ['mount_cook4', 'm:cook4', `${COOK}; gallop frame 4: whole body bouncing slightly up, hands and knees spread`],
  ['mount_cook_tired', 'm:cook_tired', `the SAME cook collapsed flat on his belly on the floor, arms and legs splayed, tongue out, dizzy eyes, puffing steam from ears, side view facing LEFT`],
];
const STYLE = 'Flat minimalist illustration in the style of "Untitled Goose Game": simple clean geometric shapes, NO outlines, soft muted pastel palette (warm cream, sage green, dusty terracotta, warm greys, soft blue), flat colors with at most one slightly darker flat shade, clean vector look, charming and quietly funny.';

export function artList() {
  const list = [];
  for (const [id, emoji, desc] of PROPS) list.push({ kind: 'prop', id, emoji, desc, folder: 'Props', prompt: `${STYLE}\nAsset: a single small game prop sprite: ${desc}. Gentle three-quarter side view, the object alone, centered, filling about 80% of the frame, readable at small size.\nCanvas: square 1024x1024, fully transparent background. No text, no shadow, no border.` });
  for (const [id, emoji, desc] of FX) list.push({ kind: 'fx', id, emoji, desc, folder: 'FX', prompt: `${STYLE}\nAsset: a single small game effect / projectile sprite: ${desc}. The object alone, centered, filling about 80% of the frame, readable at small size.\nCanvas: square 1024x1024, fully transparent background. No text, no shadow, no border.` });
  for (const [id, emoji, desc] of ULT_FX) list.push({ kind: 'fx', id, emoji, desc, folder: 'FX', prompt: `${STYLE}
Asset: a single game visual effect sprite: ${desc}. The effect alone, centered, filling about 85% of the frame.
Canvas: square 1024x1024, fully transparent background. No text, no border.` });
  for (const [id, emoji, desc] of LAB_ITEMS) list.push({ kind: 'fx', id: 'item_' + id, emoji, desc, folder: 'Items', prompt: `${STYLE}
Asset: a single game object sprite: ${desc}. Gentle three-quarter view from slightly above, standing on its base, the object alone, centered.
Canvas: square 1024x1024, fully transparent background. No text, no shadow, no border.` });
  for (const [id, emoji, desc] of MOUNT_ART) list.push({ kind: 'fx', id, emoji, desc, folder: 'Parody', prompt: `${STYLE}
Asset: a single game sprite: ${desc}. Centered.
Canvas: square 1024x1024, fully transparent background. No text, no shadow, no border.` });
  for (const [id, emoji, desc] of PARODY_ART) list.push({ kind: 'fx', id, emoji, desc, folder: 'Parody', prompt: `${STYLE}
Asset: a single game sprite: ${desc}. Centered.
Canvas: square 1024x1024, fully transparent background. No text, no shadow, no border.` });
  for (const [id, emoji, desc] of UI_ART) list.push({ kind: 'fx', id: 'ui_' + id, emoji, desc, folder: 'UI', prompt: `${STYLE}
Asset: ${desc}. Centered.
Canvas: square 1024x1024, fully transparent background.` });
  for (const [id, emoji, desc] of FURNITURE) list.push({ kind: 'fx', id: 'furn_' + id, emoji, desc, folder: 'Furniture', prompt: `${STYLE}
Asset: a single piece of game furniture sprite: ${desc}. Gentle three-quarter view from slightly above, standing on the floor, the whole object visible, alone, centered.
Canvas: square 1024x1024, fully transparent background. No text, no shadow, no border.` });
  for (const [id, emoji, desc] of WORLD) list.push({ kind: 'fx', id, emoji, desc, folder: 'World', prompt: `${STYLE}
Asset: a single game sprite: ${desc}. The object alone, centered, filling about 85% of the frame.
Canvas: square 1024x1024, fully transparent background. No text, no shadow, no border.` });
  return list;
}
