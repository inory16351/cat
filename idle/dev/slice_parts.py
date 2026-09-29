"""assets/v2/parts/<id>.png (3×2 파츠 시트) → assets/v2/parts/<id>/<part>.png + parts_meta.js

1) 칸마다 흰 배경을 지우고 여백을 잘라 같은 배율로 저장 (한 시트 안에서 파츠 크기가 맞게)
2) 파츠의 알파 마스크를 분석해서 관절 위치를 자동으로 찾음 (고정 비율로 붙이면 종마다 어긋나서)
   - 다리: 윗면 중앙 = 어깨/엉덩이 관절, 불투명 높이 = 다리 길이
   - 머리: 가장 아래쪽 가장자리(목이 잘린 면)의 중심 = 목 관절
   - 꼬리: 가장 왼쪽 끝부분의 중심 = 꼬리 뿌리
   - 몸통: 윤곽에서 목·꼬리·어깨·엉덩이 붙을 자리 (어깨·엉덩이는 배 윤곽 바로 안쪽)
사용법: python idle/dev/slice_parts.py
"""
import glob
import json
import os

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'v2', 'parts')
CELLS = {'head': (0, 0), 'torso': (1, 0), 'tail': (2, 0), 'front': (0, 1), 'back': (1, 1)}
SCALE = 0.42
MARK = (255, 0, 255, 255)
# 종별 다리 길이 (몸통 높이 대비 보이는 다리 길이)
LEG_RATIO = {'default': 0.95, 'loaf': 0.5, 'chonk': 0.55, 'gym': 0.85}


def clear_white(im):
    w, h = im.size
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        px = im.getpixel(seed)
        if px[:3] != MARK[:3] and min(px[:3]) > 222:
            ImageDraw.floodfill(im, seed, MARK, thresh=45)
    d = im.load()
    for y in range(h):
        for x in range(w):
            if d[x, y] == MARK:
                d[x, y] = (255, 255, 255, 0)
    return im


def mask(im):
    a = im.split()[3].load()
    w, h = im.size
    return [[a[x, y] > 40 for x in range(w)] for y in range(h)]


def rows_cols(m):
    h, w = len(m), len(m[0])
    return h, w


def centroid(m, pred):
    sx = sy = n = 0
    h, w = rows_cols(m)
    for y in range(h):
        for x in range(w):
            if m[y][x] and pred(x, y):
                sx += x; sy += y; n += 1
    return (sx / n, sy / n) if n else None


def leg_joint(m):
    h, w = rows_cols(m)
    top = next(y for y in range(h) if any(m[y]))
    xs = [x for x in range(w) if any(m[yy][x] for yy in range(top, min(h, top + 6)))]
    return [(min(xs) + max(xs)) / 2 / w, (top + h * 0.05) / h], (h - top) / h


def head_joint(m):
    # 목이 잘린 면: 아래쪽 15% 에 있는 픽셀 중 오른쪽 절반의 중심
    h, w = rows_cols(m)
    c = centroid(m, lambda x, y: y > h * 0.8 and x > w * 0.45) or centroid(m, lambda x, y: y > h * 0.8)
    return [c[0] / w, min(0.95, c[1] / h)]


def tail_joint(m):
    h, w = rows_cols(m)
    c = centroid(m, lambda x, y: x < w * 0.12)
    return [c[0] / w, c[1] / h]


def torso_anchors(m):
    h, w = rows_cols(m)
    bottom = []
    for x in range(w):
        ys = [y for y in range(h) if m[y][x]]
        bottom.append(max(ys) if ys else None)
    top = []
    for x in range(w):
        ys = [y for y in range(h) if m[y][x]]
        top.append(min(ys) if ys else None)
    xs = [x for x in range(w) if bottom[x] is not None]
    x0, x1 = min(xs), max(xs)
    span = x1 - x0

    def under(fx, inset):
        x = int(x0 + span * fx)
        return [x / w, (bottom[x] - h * inset) / h]

    def col_mid(fx, bias):
        x = int(x0 + span * fx)
        return [x / w, (top[x] + (bottom[x] - top[x]) * bias) / h]

    return {
        'neck': col_mid(0.06, 0.35),        # 앞쪽 위: 목
        'tail': col_mid(0.95, 0.3),          # 뒤쪽 위: 꼬리 뿌리
        'shoulder': under(0.2, 0.22),        # 앞쪽 배 윤곽 안쪽
        'hip': under(0.8, 0.22),             # 뒤쪽 배 윤곽 안쪽
    }


meta = {}
for sheet in sorted(glob.glob(os.path.join(ROOT, '*.png'))):
    sid = os.path.splitext(os.path.basename(sheet))[0]
    im = Image.open(sheet).convert('RGBA')
    cw, ch = im.width // 3, im.height // 2
    out = os.path.join(ROOT, sid)
    os.makedirs(out, exist_ok=True)
    info = {'size': {}, 'pivot': {}}
    masks = {}
    for part, (cx, cy) in CELLS.items():
        cell = clear_white(im.crop((cx * cw, cy * ch, (cx + 1) * cw, (cy + 1) * ch)))
        box = cell.getbbox()
        if not box:
            continue
        cell = cell.crop(box)
        cell = cell.resize((max(1, round(cell.width * SCALE)), max(1, round(cell.height * SCALE))), Image.LANCZOS)
        cell.save(os.path.join(out, part + '.png'), optimize=True)
        info['size'][part] = [cell.width, cell.height]
        masks[part] = mask(cell)
    if 'torso' not in masks:
        continue
    info['anchor'] = torso_anchors(masks['torso'])
    if 'head' in masks: info['pivot']['head'] = head_joint(masks['head'])
    if 'tail' in masks: info['pivot']['tail'] = tail_joint(masks['tail'])
    th = info['size']['torso'][1]
    for leg in ('front', 'back'):
        if leg in masks:
            piv, _ = leg_joint(masks[leg])
            info['pivot'][leg] = piv
            # 보이는 다리 길이 = 몸통 높이 × 비율 이 되도록 다리 배율 계산
            hidden = th * (1 - info['anchor']['shoulder' if leg == 'front' else 'hip'][1])
            want = th * LEG_RATIO.get(sid, LEG_RATIO['default']) + hidden
            info.setdefault('legScale', {})[leg] = round(want / (info['size'][leg][1] * (1 - piv[1])), 3)
    meta[sid] = info
    print(sid, json.dumps(info, ensure_ascii=False))

with open(os.path.join(ROOT, 'parts_meta.js'), 'w', encoding='utf-8') as f:
    f.write('// 자동 생성: idle/dev/slice_parts.py (관절 위치는 파츠 이미지 분석 결과)\nconst PARTS_META = ' + json.dumps(meta, ensure_ascii=False) + ';\n')
