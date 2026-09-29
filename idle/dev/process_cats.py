"""assets/v2/cats/*.png: 흰 배경 제거 → 여백 자르기 → 최대 360px 로 축소.
원본은 assets/v2/cats/src/ 에 보관하고, 항상 원본에서 다시 만들어서 여러 번 실행해도 안전하다.
사용법: python idle/dev/process_cats.py
"""
import glob
import os
import shutil

from PIL import Image, ImageDraw

DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'v2', 'cats')
SRC = os.path.join(DIR, 'src')
os.makedirs(SRC, exist_ok=True)
MARK = (255, 0, 255, 255)

for path in sorted(glob.glob(os.path.join(DIR, '*.png'))):
    name = os.path.basename(path)
    src = os.path.join(SRC, name)
    if not os.path.exists(src):
        shutil.copy(path, src)
    im = Image.open(src).convert('RGBA')
    w, h = im.size
    # 가장자리에서 흰 배경만 flood fill 로 지움 (몸 안쪽의 흰 털은 보존)
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        px = im.getpixel(seed)
        if px[:3] != MARK[:3] and min(px[:3]) > 222:
            ImageDraw.floodfill(im, seed, MARK, thresh=45)
    data = im.load()
    for y in range(h):
        for x in range(w):
            if data[x, y] == MARK:
                data[x, y] = (255, 255, 255, 0)
    im = im.crop(im.getbbox())
    im.thumbnail((360, 360), Image.LANCZOS)
    im.save(path, optimize=True)
    print(name, im.size)
