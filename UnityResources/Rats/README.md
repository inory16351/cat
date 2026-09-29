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
  FX/<이펙트 id>.png          투척물·낙하물 9종 + 필살기 소품 8종 (치즈 바퀴·UFO·썰매·롱보트·양탄자·티테이블·바게트·불꽃 로켓), 1024² 투명
```

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
