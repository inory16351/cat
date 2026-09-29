# 쥐들의 반란 — 작업 인수인계

> 다음 에이전트가 이어서 작업하기 위한 문서. (최종 갱신: 2026-09-29 저녁 — 파츠 리그·슈퍼 점프·등급 밸런스)
> 같은 저장소에 고양이 게임 2개(루트 클리커 `index.html`, 방치형 `idle/`)가 있고, 이 게임은 방치형 엔진을 가져와 변형한 것.
> 타격 모델은 사용자가 준 참고작 "찍찍 대번식"(`nyang-breed.html`)의 방식을 가져왔다.

## 1. 게임 컨셉 (사용자 요구사항 — 반드시 지킬 것)

- **반자동 방치형**: 쥐들이 알아서 뛰어다니며 물건을 부숴 치즈(🧀)를 번다.
- **바퀴벌레 무빙**: 아무 방향(360°)으로 **직선** 돌진 → 딱 멈춤 → 다시 다른 방향. 곡선/자유 배회 금지.
- **번식**: 쥐끼리 자연스럽게 겹치면(충돌) 그 자리에서 새 개체 탄생.
  - **플레이어 클릭 돌진(총공격) 중에 생긴 충돌로는 절대 번식하지 않음.**
- **시작**: 비밀 연구실에 쥐 3마리.
- **맵 확장**: 방을 둘러싼 벽마다 체력이 있고, 부수면 그쪽 방이 열린다. 연구실에서 멀어질수록 연구소 복도 → 하수구 → 골목길 → 편의점 앞 → 도심 사거리 → 시청 광장(인간 세상 정복).
- **등급**: 일반 / 레어 / 에픽 / 유니크 / 전설 / 신화 (고양이 게임과 동일한 이름).
  - 탄생 시 등급 확률은 **난동 등급**에 비례해서 오른다. **초반엔 윗등급이 매우매우 낮은 확률**(난동 0: 레어 7%·에픽 0.9%·유니크 0.09%·전설 0.009%·신화 0.002%). `TIERS.w` 가 등급마다 약 1/10, `tierWeights` 의 k = 1 + 0.1·난동.
  - **등급 ≠ 공격력만**: 등급은 기본 체급(`TIERS.dmg` 1·2·4·8·16·32)과 능력 세기(`TIERS.ab`)만 정함. 개성은 **종별 특수 능력 + 종별 스킬 트리**.
- **승급**: 같은 등급 `PROMOTE_COST`(현재 **10**)마리 희생 → **한 단계 위 등급 중 무작위 1종**.
- **종류**: 메인은 쥐. 생쥐·햄스터 등은 일부만. **코스튬 버전을 많이**(현재 54종).
- **액션/물체 물리 유지 필수**: 물건이 맞으면 밀리다 날아감, 날아간 물건끼리/정지 물건과 충돌, 공중 저글링(AIR), 연쇄 폭발, 역경직(hitstop), 콤보 배율, 멀티킬, 파편·얼룩, 치즈가 HUD로 날아가는 연출.
- **병맛 묘기**(물건 충돌 시): 백덤블링 · 트리플 악셀 · 윈드밀 · 쥐 대포알. (**문워크는 사용자가 싫어해서 삭제함 — 다시 넣지 말 것**)
- **쥐는 절대 스턴되지 않게**: 날아온 물건에 맞아도 멈추지 않고 헤딩으로 받아침. "쥐들이 맞아서 아무것도 못 하는" 상황은 사용자가 명시적으로 싫어함.
- **클릭**: 클릭 순간 **화면에 보이는 쥐만** 클릭 지점으로 돌진(피해 배율↑, 쥐별 `rushT`). 벽 쪽을 클릭하면 몰려가서 들이받음.
- **카메라 자유**: 쥐들은 맵 전체(열린 방 전부)로 퍼진다. 카메라는 무리를 따라가지 않고, 화면에 쥐가 0마리일 때만 가장 붐비는 방으로 이동.
- **물건 공급 (고양이 방치 게임 방식)**: ① 화면 안 자동 생성(조금씩 계속) ② 택배 투하(한꺼번에, 쿨타임 **최소 30초**). 둘 다 **카메라 화면 안에만**.
- **그림체**: 언타이틀드 구스 게임 풍(평면 파스텔, 외곽선 없음). **Codex 로 만든 파츠 시트를 리그로 조립**(고양이 방치 게임 방식). 파츠가 아직 없는 종은 예전 코드 그림(rodent.js)으로 자동 대체.
- **슈퍼 점프**: 아주 낮은 확률(화면에 쥐가 있을 때 초당 1/480, 쿨타임 2분, 시작 1분 후부터, 창이 열려 있으면 보류). 동시에 두 번은 안 됨.
  컷인(화면 정지·만화 칸·집중선·"슈퍼 점프!!!") → 기 모으기(줌인·부들부들·기 흡수) → 하늘 끝까지 슈웅(리신 버그) → 반짝☆ → 머리부터 내리꽂힘 → "쿠과과광!!!"
  → 화면 속 쥐·물건 전부 둥실 → 물건과 **화면에 걸친 벽까지 한꺼번에 파괴** → 쥐들 착지. 하단 도크 🚀 **슈퍼점프** 버튼 = 테스트용 강제 발동.
- **종별 특수 액션**(data.js `ACT_LIST` 54종, 동작 js/acts.js): 발동 조건 10종(drop 소품 드랍→같은 종이 주우면 · bump · wall · crowd · combo · birth · sleep · gold · wave · timer) × 액션 17종(건카타·내려찍기·일섬·투척·음파·360°레이저·브레스·거대 공·소환·흡입 폭발·메테오·황금 손·회오리·땅굴·응원·연타·집어던지기). 예) 특공대 쥐: 부순 물건에서 권총 드랍 → 주우면 건 카타.
  종별 트리에 `act`(해금·확률) → `actPow`(위력) → `actX`(각성: 액션별 변형) 가지. 화면에 보이는 쥐만 발동, 화면 안 동시 3개까지, 쥐마다 6초 쿨. 소환된 쥐는 `r.temp`(6초, 저장·승급·번식 제외).
- **필살기**(전설·신화 24종, data.js `ULT_LIST`, 동작 js/ults.js): **고트 시뮬레이터 풍 병맛 패러디 상황극**. 컷인 일러스트 없이 슈퍼 점프처럼: 화면 정지 + 확대 + 부들부들 + 이름 UI(1.4초) → 상황극 약 3초(게임 진행) → '🏆 업적 달성' 알림.
  상황 24종(`ULT_ENG`, 종마다 전부 다름): 빔 반동으로 본인이 날아감 · 치즈 바퀴 인디아나 존스 · 쥐왕(꼬리 엉킨 쥐 공이 통통 튐) · 무중력 · 빙의 · 산타 썰매 폭격 · 바이킹 셀프 투석기 · 램프의 지니(소원 곡해) · 천국의 계단(레밍즈) · 거대 박쥐 변신(조종 불가) · 밥상 뒤집기 · 떼창 헤드뱅잉 · 화면 버그(가짜 '우주.exe 응답 없음' 창) · 콩가 춤 · "너는 이미 부서져 있다" · 엑스칼리버(바위까지 딸려 나와 그걸로 휘두름) · UFO 납치 · 로봇 자동차 변신 무면허 폭주 · 치즈 퐁듀 · 셀프 멸종 · 음모론 빨간 실 · 밤하늘 불꽃놀이(불꽃 꽃 → 불똥 비) · 좀비 감염(7초, 힘 2배) · 땅 뚫는 발레.
  반경 `ULT_R` 560. 연출상 괜찮은 것(퐁듀·바게트·좀비·불꽃놀이·탐정·무중력·공룡·유령)은 `ultWalk` 로 걸어다니며 사용. 필살기 중엔 택배 투하·콤보 배너 보류.
  붙잡은 쥐(`r.ultOn`)·물건(state 'held')은 `ultRelease` 가 끝날 때 반드시 풀어줌 — 새 상황을 만들 땐 `grabRat/grabItem/dropItem` 을 쓸 것.
  화면에 전설 이상이 있을 때 초당 `ULT_CHANCE`(1/200, 평균 약 3분), 쿨 `ULT_COOL`(60초). 반경 `ULT_R`(560) 안만 — 벽은 안 부숨(슈퍼 점프보다 약하게). 슈퍼 점프와 동시 발동 없음.
  하단 도크 🎬 **필살기** = 테스트 버튼(누를 때마다 다음 종, 화면에 없으면 15초짜리 임시 쥐로 불러옴).
- **개그 모션(파츠 리그)**: 깡충 달리기·급정거 브레이크·킁킁·목 쭉 빼는 박치기·총공격 때 꼬리 번쩍·공중 대자 뻗기 + 묘기(백덤블링·트리플 악셀·윈드밀·대포알) + 새 묘기 **배치기 슬라이딩**(belly)·**날아차기**(kick, 피해 4배). 두 새 묘기는 스킬 없이도 부딪힐 때 2~2.5% 확률.

## 2. 실행 / 테스트

- 개발 서버: `.claude/launch.json`
  - `cat-game` (5178) → http://localhost:5178/rats/ — 사용자 쪽에서 쓰는 서버일 수 있음
  - `rat-game` (5179) → http://localhost:5179/rats/ — 에이전트 테스트용. origin 이 달라 **저장이 따로**라서 사용자 저장을 건드리지 않음
- 단일 HTML: `cd rats/dev && node build.mjs` (파이썬 없는 PC) 또는 `python build_rats.py` → `dist/rat-uprising.html` (JS/CSS 인라인 + 도시 배경·`assets/rats/**.png`(파츠 포함) WebP 내장, 없는 이미지는 요청 안 함). **코드 수정 후 다시 빌드해야 반영됨.**
- 브라우저 패널에서 rAF 가 거의 안 돌 때 슈퍼 점프 확인: `startSuperJump(true)` 후 `for(...) updateSuperJump(1/60); render();` 로 직접 진행.
- 캐시: 스크립트 태그에 `?v=N` 쿼리. 수정 후 `rats/index.html` 의 `v=` 숫자를 올린다.
- 저장: `localStorage['rat-uprising-v1']`. 초기화 버튼은 시작 화면 + 게임 중 하단 도크 🗑️(`btnReset2`) → 확인 창.
- **주의(브라우저 패널)**: 미리보기 패널이 숨겨져 있으면 `requestAnimationFrame` 이 멈춰 게임이 진행되지 않는다.
  - `tabs_select` 로 탭을 앞으로 가져오거나, JS 로 직접 시뮬레이션: `for (...) update(1/60); render();`
- 사용자 저장 데이터를 함부로 초기화/변경하지 말 것.

## 3. 파일 구조

```
build_rats.py       단일 HTML 빌드
rats/
  index.html        화면 구조 + 스크립트 로드 순서 + 부트스트랩(loadSave → fit → initWorld → UI.init → rAF)
  style.css         idle/style.css 복사본 + 하단에 "쥐들의 반란 전용" 스타일
  js/data.js        TIERS, FUR, RSPECIES(54종), 특수 능력(AB_TYPES/AB_LIST), ZONES(7구역), 연구실 ITEMS,
                    공용 트리 RSKILLS, 종별 트리 RAT_TREE, rampNeed, PROMOTE_COST
  js/labdraw.js     연구실/하수구 소품 그림(ITEM_DRAW 에 추가)
  js/rodent.js      쥐 코드 그림 drawRodent() + 체형 SHAPES(rat/mouse/hamster/gerbil) + 코스튬 ACC (파츠 없는 종의 대체 그림)
  js/parts_meta.js  자동 생성(slice_parts.mjs): 종별 파츠 크기·관절(RAT_PARTS)
  js/ratrig.js      파츠 리그(그리는 순서: 먼 다리·꼬리 → 몸통 → 가까운 다리 → 머리. 가까운 다리를 몸통 뒤로 보내면 막대처럼 삐져나와 보임): loadRatParts/buildRatRig → RAT_RIGS, 자세 ratPose(r), 조립 drawRatRig. r.pose 로 연출이 자세를 직접 지정
  js/acts.js        종별 특수 액션: 발동 판정(actTrigger/actTick), 진행(actStep), 총알·베기·드랍 소품(updateActs), 자세(actPose), 소품 그림(drawProp)
  js/ults.js        필살기: 발동(tryUlt/testUlt), 준비(updateUltCut), 상황극 엔진 ULT_ENG(start/step/end/draw/ui/beats), 자막 ucap, 업적 G.achv, UI(drawUltCut)
  js/art_manifest.js 자동 생성(gen_art.mjs): 실제로 있는 소품·이펙트 이미지 목록 RAT_ART (없으면 이모지·코드 그림)
  js/superjump.js   슈퍼 점프 전체(발동·단계 진행·만화 연출). game.js 다음에 로드
  js/ratdraw.js     예전 초안. 로드하지 않음(삭제해도 됨)
  js/game.js        엔진 전체(아래 4절)
  js/ui.js          HUD, 스킬 트리, 승급, 도감, 신종 카드, 토스트, 오프라인 보상, 시작/초기화
  dev/make_prompts.js  PROMPTS.txt(이미지 생성 프롬프트) 생성: `node rats/dev/make_prompts.js`
  dev/gen_parts.mjs    Codex CLI 로 종별 파츠 시트 생성 → UnityResources/Rats/Sheets (`npm install` 먼저, sharp 사용)
  dev/slice_parts.mjs  시트 → 파츠 자르기(연결 성분 기준) + 관절 분석 → assets/rats/parts, js/parts_meta.js, UnityResources/Rats/Parts
  dev/preview_rig.mjs  리그 조립 미리보기 PNG (`node preview_rig.mjs out.png brownrat,ninja run`) — 브라우저 캡처가 안 될 때 확인용
  dev/art_list.mjs     소품·이펙트·필살기 소품 이미지 목록과 프롬프트 (39장)
  dev/gen_art.mjs      위 목록을 Codex 로 생성 → UnityResources/Rats/{Props,FX} + 게임용 assets/rats/{props,fx} + art_manifest.js
  dev/build.mjs        단일 HTML 빌드 (Node 버전)
  `npm run images`     파츠 시트 → 슬라이스 → 소품·이펙트 → 빌드 한 번에
  dev/overnight.mjs    야간 자동 실행: 한도에 걸리면 Codex 가 알려준 풀리는 시각까지 기다렸다가 재시도, 다 되면 자르기·후처리·빌드. 로그 dev/overnight.log
UnityResources/Rats/   Codex 원본 이미지 보관(나중에 유니티용, 지금은 웹만 구현). README.md 참고
  PROMPTS.txt       종별 스프라이트/바닥/소품 시트 프롬프트 (파츠 시트 프롬프트는 아직 없음)
```

**스크립트 로드 순서(전역 공유, 모듈 아님)**:
`../js/audio.js`(Sfx) → `../js/draw.js`(rr, circ, shade, easeOutBack, ITEM_DRAW, drawItemShape) → `../idle/js/data.js`(ITEMS, `let TILT` 등) → `../idle/js/citydraw.js` → `js/data.js` → `js/labdraw.js` → `js/rodent.js` → `js/parts_meta.js` → `js/art_manifest.js` → `js/ratrig.js` → `js/game.js` → `js/superjump.js` → `js/acts.js` → `js/ults.js` → `js/ui.js`

**전역 이름 충돌 주의**:
- `idle/js/data.js` 가 `let TILT`, `SKILLS`, `SPECIES`, `RARITY`, `DW/DH`, `fx` 등을 선언한다. game.js 는 `TILT = 0.85` 로 **재할당만** 한다.
- 쥐 게임 쪽 이름은 `RSPECIES`, `RSKILLS`, `RAT_TREE`, `ZONES`, `TIERS`, `TRICKS` 로 구분. 새 `const/let` 추가 시 겹치지 않는지 확인.
- 새 체형(`shape`)을 쓰는 종을 추가하면 `rodent.js` 의 `SHAPES` 에도 넣을 것 (없으면 렌더가 매 프레임 터짐 — 저빌에서 실제로 났던 버그).

## 4. game.js 구조

| 영역 | 핵심 함수/값 |
|---|---|
| 저장 `S` | `cheese, lifetime, skills{}, rsk{종:{스킬:lv}}, ramp, rampProg, open[], walls{}, maxD, herd[], seen{}, fresh{}, births, smashed, ips...` |
| 런타임 `G` | `rats, items, parcels, bombs, beams, particles, popups, rings, coins, cam, rush, spawnT, waveT, mess{}, wallShake{}, combo...` |
| 수치 공식 | `popCap, breedCool, ratDamage(등급·이빨·종별 dmg·각성·리더 버프·떼거리·광란), itemHP/itemValue(zi=방 거리), zoneCap, spawnInterval, spawnBatch, viewCap, waveCool, waveSize, rushTime, rushMult` |
| 방 격자 | 방 크기 `RW=1280, RH=800`. 구역 = `ZONES[min(|i|+|j|, 6)]`. `OPEN`(Set) / `isOpen` / `roomOf` / `zoneOf` / `visibleRooms` |
| 벽 | `wallKey`, `wallMax`, `S.walls[key]`(남은 체력). `hitWall` / `damageWall` / `breakWall`(새 방은 즉시 반쯤 채움) |
| 가두기 | `confine(o, rad, px, py, bounce, onWall)` |
| 쥐 AI | `newDash`(직선 돌진: 35% 근처 물건, 12% 열린 옆방으로 이사, 15% 막힌 벽), `stopDash` + `stomp`(멈칫할 때 발 구르기), `moveRat`(이동·충돌·갉기), `updateRats` |
| 번식 | 쥐-쥐 충돌: 둘 다 `noBreed<=0 && breedCD<=0`, 묘기 중 아님, 개체 수 < cap → `birth(x, y, bonus)`. 아니면 반대 방향으로 직선 튕김 |
| 총공격 | `onTap` → 화면 안 쥐에게만 `rushT`, `noBreed = rushTime()+0.4` (**번식 금지 보장 지점**) |
| 등급/승급 | `tierWeights(bonus)`, `rollTier`, `promote(tier)` |
| 물건 | `makeItem` → `damageItem`(체력↓ + 밀림, 0이면 `launch`) → `updateItems`(밀림 마찰·비행·정지 물건 충돌·공중 충돌·벽 충돌·쥐 헤딩) → `smashItem`(치즈, 콤보, 멀티킬, 연쇄 폭발, 파편) / 공중 재타격 `juggle` |
| 생성 | `updateSpawns`: 자동 생성 `dropInView` + 택배 투하 웨이브. `spawnInRoom(i,j,instant,c,h)`, `spawnNear` |
| 렌더 | `render`: 바닥 → 벽 너머 방 어둡게 → 그림자 → 벽 → 물건/쥐 y정렬 → 폭탄·레이저 → 파티클 → 벽 체력바 → 팝업 → HUD 오버레이 |
| 쥐 그림 | `drawRat`: 이미지(`IMG['rat_'+id]`) 우선, 없으면 `ratSprite` 캐시. 묘기 자세 변환도 여기. 그림은 왼쪽을 봄 → 오른쪽 이동 시 x 뒤집기 |
| 카메라 | 3/4 탑다운(`화면Y = y*TILT - z`). 자유 이동(드래그 16px 이상), 휠 줌 0.45~1.3 |
| 저장 이전 | `loadSave`: 예전 `zones` 저장 → `open[]` 변환, 문워크 레벨 → 치즈 환불 |

## 4-1. 능력 · 스킬 트리 · 묘기

- `data.js`: `AB_TYPES`(22종 능력 설명) + `AB_LIST`(54종에 능력 배정 → `sp.ab`), `abPower(sp, l)` = 등급 배율 × (1 + 0.35·특수강화Lv). 각성 시 ×1.5.
- 공용 트리 `RSKILLS`(grid/req, 열: 갉기·무리·탈출·물량·재롱·재롱2), 종별 트리 `RAT_TREE`(갉기 훈련·뒷발 근육·재롱 본능·급소·특수 강화·각성). 종별 비용 × `TIERS.cost`.
- `game.js`: `updateAuras`(리더 버프·떼거리), `ratAbility`(주기형: aura·teleport·laser·fire), `ratBump`(충돌형: crit·double·bomb·slam·gold + `rollTrick`), `it.by`로 마지막에 친 쥐 기록 → loot·chain·knock 적용. gift 는 택배 투하 때 발동.
- 묘기: `TRICKS`(flip·axel·windmill·cannon, tumble 은 코드만 남고 발동 안 함), `doTrick`, `trickStep`. 묘기 텍스트는 `trickText`로 0.35초에 하나만.

## 4-2. 타격 모델 (찍찍 대번식 방식)

- 물건은 체력이 있다. 맞을 때마다 `it.pvx/pvy`로 **조금씩 밀리고**(큰 물건 ÷1.8, 튼튼한 물건 ÷1.3), **체력이 0이 되면 날아감**(`launch`).
- 공중에 뜬 물건을 쥐가 또 치면 `juggle` → AIR xN 보너스 치즈 (`tumble` 스킬 = 헤딩 저글링으로 보너스 ↑). 크리로 날아간 물건은 부서질 때 치즈 ×2.
- 날아온 물건에 맞은 쥐: 통 튀어오르며(`r.vz`) 받아침. 멈추지 않음.

## 4-3. 물건 공급

- ① **자동 생성**: 카메라 화면 안으로 `spawnInterval()`(1.2초, spawn 스킬로 감소)마다 `spawnBatch()`개씩 택배가 떨어짐. 화면 목표치 `viewCap()`까지.
- ② **택배 투하**: `waveCool()`(60초, truck 스킬 −3초/레벨, **최소 30초**)마다 화면 안에 `waveSize()`개(15~45) 한꺼번에 + 배너. 첫 투하는 시작 20초 후.
- 화면 밖 방은 새로 채워지지 않는다(기존 물건만 남음).

## 4-4. 성능

- 쥐 그림은 `ratSprite`(종 × 걷기 8프레임/정지/잠)로 캔버스 캐시 후 `drawImage`.
- 캔버스 해상도 `SF_CAP` 1.75, 평균 28fps 미만이 이어지면 0.25씩 자동으로 낮춤. 파티클 900개·팝업 36개 상한.
- 렌더 에러 시 `ctx.reset()`으로 save 스택 누적 방지.
- 참고 수치: 쥐 200마리·방 13개에서 update ≈0.7ms, render ≈5~9ms.

## 5. ui.js 메모

- 패널 버튼은 **다시 만들지 말고 상태만 갱신**할 것 (`refreshTreeAfford()`, `renderPromo()` 참고).
- 스킬 트리: 고양이 게임 `idle/js/ui.js` 구조 그대로(`treeCtx` 공용/종별, 탭 = 도감에 있는 종, 무리에 없는 종은 흐리게). 도감 상세에서 "🌳 스킬 트리" 버튼으로 바로 이동. ×1/×10/MAX 구매.
- `ratPic(sp, w, h, known)`: 도감/토스트/카드용 캔버스 그림. 모르는 종은 실루엣.
- `UI.onBirth`: 신종 에픽↑ 모달 / 신종 그 아래 토스트 / 기존 종 에픽↑ 탄생 토스트.

## 6. 남은 작업 / TODO

1. **이미지 생성(Codex CLI)** — 파츠 시트 **30/54종 완료**(2026-09-29), 소품·이펙트 39장은 목록만 준비. 한도가 풀리면 `cd rats/dev && npm run images` 로 전부 이어서 생성·정리·빌드.
   - Codex 는 대부분 투명 배경으로 저장해 줌. 가끔 마젠타 배경으로 오면 slice_parts 의 크로마키가 처리.
   - (예전 메모) 경로: `C=$(ls -t /c/Users/user/AppData/Local/OpenAI/Codex/bin/*/codex.exe | head -1); "$C" exec -s workspace-write --skip-git-repo-check "..." < /dev/null`
   - 쥐 54종 전신 스프라이트 → `assets/rats/<id>.png`. 흰 배경 제거와 트림은 `idle/dev/process_cats.py` 참고.
   - **파츠 시트**(몸통/머리/앞다리/뒷다리/마디 꼬리)로 리그 애니메이션: `idle/dev/slice_parts.py`, `idle/js/rig.js`, `assets/v2/parts/parts_meta.js` 참고.
   - 바닥 `assets/rats/bg_lab|corridor|sewer.png`, 연구실 소품 시트. 프롬프트는 `rats/PROMPTS.txt`. 방은 16:10.
2. **밸런스** (실제 플레이로 조정 필요)
   - 등급 기본 힘을 낮춘 뒤(신화 260→32배) 초반 속도, 자동 생성 속도 대비 쥐 수(쥐가 많으면 화면이 금방 빔), 택배 투하 30초 이상 쿨타임 동안의 공백.
   - 헤드리스 시뮬(`idle/dev/sim.js` 참고)을 쥐 버전으로 만들면 좋다.
3. 쥐 이미지가 생기면 `ratSprite` 캐시 대신 이미지/리그 경로로.
4. `rats/js/ratdraw.js`(미사용 초안) 정리.

## 7. 사용자 작업 스타일

- 한국어로 소통. 요청은 짧고 구어체. 결과는 **직접 브라우저에서 확인한 뒤** 보고.
- "원본 게임의 타격감/액션"을 매우 중시한다. 연출을 줄이는 변경은 조심할 것.
- 다만 너무 정신없는 것(과한 크리티컬/플래시/텍스트, 화면을 뒤덮는 택배)은 싫어한다.
- 이미지 관련 요청은 "언타이틀드 구스 게임 풍 + 파츠 분리로 액션이 이상하지 않게"가 기준.
- 변경하면 단일 HTML(`dist/rat-uprising.html`)도 다시 빌드해서 전달하는 흐름.
