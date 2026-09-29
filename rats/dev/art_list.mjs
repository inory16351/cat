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
];
const STYLE = 'Flat minimalist illustration in the style of "Untitled Goose Game": simple clean geometric shapes, NO outlines, soft muted pastel palette (warm cream, sage green, dusty terracotta, warm greys, soft blue), flat colors with at most one slightly darker flat shade, clean vector look, charming and quietly funny.';

export function artList() {
  const list = [];
  for (const [id, emoji, desc] of PROPS) list.push({ kind: 'prop', id, emoji, folder: 'Props', prompt: `${STYLE}\nAsset: a single small game prop sprite: ${desc}. Gentle three-quarter side view, the object alone, centered, filling about 80% of the frame, readable at small size.\nCanvas: square 1024x1024, fully transparent background. No text, no shadow, no border.` });
  for (const [id, emoji, desc] of FX) list.push({ kind: 'fx', id, emoji, folder: 'FX', prompt: `${STYLE}\nAsset: a single small game effect / projectile sprite: ${desc}. The object alone, centered, filling about 80% of the frame, readable at small size.\nCanvas: square 1024x1024, fully transparent background. No text, no shadow, no border.` });
  for (const [id, emoji, desc] of ULT_FX) list.push({ kind: 'fx', id, emoji, folder: 'FX', prompt: `${STYLE}
Asset: a single game visual effect sprite: ${desc}. The effect alone, centered, filling about 85% of the frame.
Canvas: square 1024x1024, fully transparent background. No text, no border.` });
  return list;
}
