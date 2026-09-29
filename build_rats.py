"""쥐들의 반란(rats/)을 HTML 파일 하나로 묶는다.

사용법: python build_rats.py  →  dist/rat-uprising.html

- CSS·JS 는 인라인으로 넣는다. (../js, ../idle/js 공용 스크립트 포함)
- 도시 구역 배경(assets/v2/bg)과 assets/rats/ 에 있는 이미지는 WebP data URI 로 window.__A 에 담고,
  <img>.src 설정을 가로채서 경로 대신 내장 데이터를 쓰게 한다.
- 아직 없는 이미지(assets/rats/<종>.png 등)는 요청하지 않고 조용히 실패시킨다 → 코드 그림으로 대체.
"""
import base64
import io
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent
RATS = ROOT / 'rats'
OUT = ROOT / 'dist' / 'rat-uprising.html'


def webp_uri(path: Path, max_side: int) -> str:
    im = Image.open(path)
    im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
    if max(im.size) > max_side:
        im.thumbnail((max_side, max_side), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=80, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def collect_assets() -> dict:
    assets = {}
    # game.js 의 ZONES[].img 가 쓰는 도시 배경만
    data = (RATS / 'js' / 'data.js').read_text(encoding='utf-8')
    for name in sorted(set(re.findall(r"img: '([a-z_]+)'", data))):
        p = ROOT / 'assets' / 'v2' / 'bg' / f'{name}.png'
        if p.exists():
            assets[f'assets/v2/bg/{name}.png'] = webp_uri(p, 1536)
    rats_dir = ROOT / 'assets' / 'rats'
    if rats_dir.exists():
        for p in sorted(rats_dir.glob('*.png')):
            assets[f'assets/rats/{p.name}'] = webp_uri(p, 1280 if p.stem.startswith(('bg_', 'title')) else 360)
    return assets


LOADER = """<script>
// 단일 HTML 빌드: 이미지 경로를 내장 데이터로 바꿔치기 (없는 이미지는 요청하지 않음)
window.__A = %s;
(() => {
  const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    get() { return d.get.call(this); },
    set(v) {
      const s = String(v);
      if (s.startsWith('data:')) return d.set.call(this, s);
      const k = s.replace(/^(\\.\\.\\/)+/, '').split('?')[0];
      if (window.__A[k]) return d.set.call(this, window.__A[k]);
      if (k.startsWith('assets/')) { setTimeout(() => this.onerror && this.onerror(), 0); return; }
      d.set.call(this, s);
    },
  });
})();
</script>"""


def main() -> None:
    html = (RATS / 'index.html').read_text(encoding='utf-8')
    css = (RATS / 'style.css').read_text(encoding='utf-8')
    html = re.sub(r'<link rel="stylesheet" href="style\.css[^"]*">', lambda m: f'<style>\n{css}\n</style>', html)

    assets = collect_assets()
    title = assets.get('assets/rats/title.png')
    html = re.sub(r'<img id="titleArt" src="[^"]*"', f'<img id="titleArt" src="{title}"' if title else '<img id="titleArt" style="display:none"', html)

    def inline_script(m: re.Match) -> str:
        src = m.group(1).split('?')[0]
        path = (RATS / src).resolve()
        return f'<script>\n{path.read_text(encoding="utf-8")}\n</script>'

    html = re.sub(r'<script src="([^"]+)"></script>', lambda m: inline_script(m), html)
    # 이미지 로더는 다른 스크립트보다 먼저
    html = html.replace('<body>', '<body>\n' + LOADER % json.dumps(assets), 1)

    leftover = re.findall(r'<script src=|href="style', html)
    if leftover:
        raise SystemExit(f'인라인되지 않은 리소스: {leftover}')
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f'{OUT}  ({OUT.stat().st_size / 1024 / 1024:.2f} MB, 이미지 {len(assets)}개)')


if __name__ == '__main__':
    main()
