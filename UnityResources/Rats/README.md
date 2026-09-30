# 쥐들의 반란 — 이미지 리소스 (나중에 유니티 구현용)

Codex(내장 image_gen)로 생성한 원본 이미지를 모아 둔 폴더입니다. 지금 게임은 웹(`rats/`)으로 구현되어 있고,
여기 있는 파일은 **리소스 보관용**입니다. 웹게임은 이 폴더를 직접 읽지 않고 `assets/rats/parts/`의 축소본을 씁니다.

## 폴더 구조

```
UnityResources/Rats/
  Sheets/<종 id>.png          Codex 원본 파츠 시트 (1536×1024, 3열×2행, 투명 배경)
  Parts/<종 id>/head.png      머리   ─┐
  Parts/<종 id>/torso.png     몸통    │ 시트에서 잘라낸 원본 해상도 투명 PNG
  Parts/<종 id>/tail.png      꼬리    │ (한 종의 파츠는 모두 같은 배율)
  Parts/<종 id>/front.png     앞다리  │
  Parts/<종 id>/back.png      뒷다리 ─┘
  Parts/pivots.json           관절(피벗)·몸통 부착 위치·다리 배율
  Props/<소품 id>.png         특수 액션 소품 (권총·망치·기타 등 22종, 1024² 투명)
  FX/<이펙트 id>.png          투척물·낙하물 + 필살기 소품 (치즈 바퀴·UFO·썰매·티테이블·엑스칼리버·자동차·불꽃 로켓·피라미드 …)
  Items/item_<id>.png         연구소 물건 24종 (플라스크·삼각 플라스크·비커·약병·주사기·시험관 꽂이·페트리 접시·표본 병·현미경·클립보드·
                              구급상자·보안경·모니터·원심분리기·약품 드럼·서버 랙·실험 카트·가스통·케이지·정수기·소화기·의료 폐기물통·의자·머그컵)
  Parody/rat_pcmouse.png      컴퓨터 마우스 쥐 (파츠 없는 한 장짜리, 왼쪽을 봄, 꼬리 = USB 케이블)
  Parody/mount_cook*.png      슈퍼 요리사 쥐의 탈것: 네 발로 기는 요리사 전신 프레임 1~4 + 지쳐 뻗은 그림 (게임은 기어가는 동작을 사람 리그로, 뻗은 그림만 사용)
  Parody/ult_*.png            패러디 필살기 소품: balloon(하트 풍선) · battery · bolt(역병 화살) · chat(방송 채팅창) · donation(후원 상자)
  UI/ui_hp_*.png              HP 바: hp_empty(빈 바) · hp_green/yellow/red(꽉 찬 바) — 같은 모양이라 겹쳐서 비율만큼 잘라 씀
  Sheets/group_*.png          쥐 파츠 모음 시트 (한 장에 4종, 5열×4행) → 종별 Sheets/<id>.png 로 재배치
  World/<id>.png              방해꾼·스테이지: cat(걷기)·cat_pounce(덮치기)·mousetrap(장전)·mousetrap_snap(닫힘)·stairs(계단)
  ArtSheets/art_*.png         위 소품들의 Codex 원본 시트 (4열×3행, 한 장에 12개 → 잘라서 씀)
  Sheets/jwerry_concert.png   줴리 필살기 "피아노 콘서트" 무대 소품 시트 (4×2) → FrontRig/jwc_*.png (그랜드 피아노 열림·닫힘, 벤치, 커튼, 상단 장식, 나비넥타이, 빈 공연 카드, 악보)
  Sheets/jwerry_boo.png         줴리 필살기 야유 투척물 시트 (계란·토마토·깨진 것·슬리퍼) + UI/ui_ratface.png (HUD 찍찍!! 아이콘)
  Sheets/front_*.png          필살기 앞모습 리그 시트 (rats/dev/gen_front_rig.mjs, 한 장 5×3). 지금 쓰는 것 = front_rs3.png (람쥐썬더 다람쥐)
  FrontRig/rs_*.png           위 시트에서 자른 앞모습 파츠 원본 (_v1·_v2_cartoon·_v3_painted = 안 쓰게 된 이전 시도)
  Humans/Sheets/sheet_*.png   사람 파츠 원본 시트 (5열×3행, 한 장에 3명)
  Humans/Parts/<사람 id>/head.png · scared.png · torso.png · arm.png · leg.png   잘라낸 원본 해상도 파츠
  Humans/Parts/pivots.json    사람 관절 정보
  Cats/Parts/<고양이 id>/head · torso · tail · front · back.png   고양이 방치 게임에서 가져온 고양이 파츠 (연구소 고양이·고양이 보스)
  Cats/Parts/pivots.json      고양이 관절 정보 (쥐 파츠와 같은 형식)
```

- 게임에서 쓰는 이미지 원본이 전부 여기 있는지는 `rats/dev` 에서 `node sync_unity.mjs` 로 확인 (고양이 파츠는 이 스크립트가 복사).

### 고양이 (고양이 방치 게임 파츠)

| id | 이름 | 게임에서 |
|---|---|---|
| cheese · mackerel · tuxedo · chonk · loaf · ninja · laser · gym | 코리안 숏헤어 · 러시안 블루 · 턱시도 · 페르시안 · 먼치킨 · 벵갈 · 스핑크스 · 메인쿤 | 2층부터 나오는 연구소 고양이 (실제 품종만) |
| fire · space | 마녀 모자 고양이 · 우주복 고양이 | 12층부터 가끔 나오는 특별 고양이 (불덩이 / 무중력 파동) |
| gym (크게) | 실험체 제로 (거대 메인쿤) | 20층 보스 |

- 고양이 조립은 쥐와 달리 **다리 4개가 모두 몸통 뒤**(먼 다리 어둡게) → 꼬리 → 몸통 → 머리 순서.

### 사람 (연구소 직원·보스)

| id | 설명 |
|---|---|
| researcher | 연구원 (흰 가운·동그란 안경) |
| guard | 경비원 (남색 제복·모자) |
| janitor | 청소부 (초록 작업복·고무장갑) |
| boss_chief | 보스: 경비대장 (전술 조끼·선글라스·콧수염) |
| boss_mad | 보스: 광기의 수석 연구원 (삐죽 흰머리·고글·초록 얼룩 가운) |
| boss_director | 보스: 연구소장 (대머리·검은 뿔테·회색 정장) |

- 모두 **왼쪽을 봄**. 파츠: `head`(평소) · `scared`(겁먹은 얼굴 — 도망·비행 때 머리를 통째로 교체) · `torso` · `arm`(한 팔, 아래로) · `leg`(한 다리, 신발이 왼쪽).
- 조립(뒤→앞): 먼 팔(어둡게) → 먼 다리 → 가까운 다리 → 몸통 → 머리 → 가까운 팔. 팔·다리는 윗면 가운데(`pivot.arm/leg`)를 축으로 회전.
- `pivots.json`: `pivot.head/scared`(목 잘린 아랫면), `pivot.arm/leg`(윗면), `anchor.neck/shoulder/hip`(몸통 이미지에서 붙일 자리). `*Unity` 는 좌하단 기준.

- 소품·이펙트 목록과 프롬프트: `rats/dev/art_list.mjs` (`node gen_art.mjs --list` 로 확인).
- 게임에서는 각 이미지가 생기기 전까지 이모지/파츠 리그로 대신 그리고, 생기면 자동으로 이미지로 바뀝니다.

- 모든 캐릭터는 **왼쪽을 봅니다** (오른쪽으로 갈 땐 X 반전).
- 시트 칸 배치: 윗줄 = 머리 · 몸통 · 꼬리, 아랫줄 = 앞다리 · 뒷다리 · (빈칸).
- 종 id 와 이름·등급은 `rats/js/data.js` 의 `RSPECIES` 를 참고하세요.

## pivots.json

| 키 | 뜻 |
|---|---|
| `pivot.head` | 머리 회전축 = 목이 잘린 면 |
| `pivot.tail` | 꼬리 뿌리 |
| `pivot.front` / `pivot.back` | 다리 윗면(어깨/엉덩이 관절) |
| `torsoAnchor.neck/tail/shoulder/hip` | 몸통 이미지에서 머리·꼬리·앞다리·뒷다리를 붙일 자리 |
| `legScale` | 앞발·뒷발이 같은 바닥선에 닿도록 맞춘 다리 배율 (대부분 1 근처) |

- `pivot`, `torsoAnchor`: 이미지 **좌상단** 기준 0~1.
- `pivotUnity`, `torsoAnchorUnity`: 유니티 Sprite Pivot 용 **좌하단** 기준 0~1 (y 를 뒤집은 값).
- 조립 순서(뒤→앞): 먼 쪽 뒷다리 · 먼 쪽 앞다리(어둡게) → 꼬리 → 몸통 → **가까운 쪽 뒷다리 · 앞다리(몸통 위에 겹침)** → 머리.
  다리 관절(`torsoAnchor.shoulder/hip`)은 몸통 안쪽에 있어서 허벅지·어깨가 몸통에 겹쳐 붙는다. 게임용 축소본은 다리 윗면을 살짝 투명하게 풀어 단면 선이 안 보이게 했다(원본은 그대로).
  웹 구현 `rats/js/ratrig.js` 의 `drawRatRig` 가 같은 순서입니다.

## 다시 만들기 / 추가하기

`rats/dev` 에서 (처음 한 번 `npm install`):

```
node gen_parts.mjs                 # 없는 종만 Codex 로 생성 (동시 3개)
node gen_parts.mjs --only ninja --force   # 특정 종 다시 생성
node slice_parts.mjs               # 파츠 자르기 + 관절 분석 → 이 폴더 + 게임 폴더 갱신
node gen_art.mjs                   # 소품·이펙트 생성 + 게임용 후처리
npm run images                     # 위 전부 + 단일 HTML 빌드까지 한 번에
```

## 현황

- 쥐 파츠 시트: 30종 / 54종 완료 (2026-09-29). 나머지 24종은 Codex 사용량 한도로 대기.
- 소품 22 · 이펙트 9 · 필살기 소품 8 = 39장: 목록·프롬프트만 준비됨, 아직 생성 전. (필살기는 컷인 일러스트 없이 게임 화면 안의 액션으로 연출)
- 다음 이미지 작업 때 `rats/dev` 에서 `npm run images` 한 번이면 전부 이어서 생성·정리됩니다.
