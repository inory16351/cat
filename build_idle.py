"""방치 모드(idle/)를 HTML 파일 하나로 묶는다.

사용법: python build_idle.py  →  dist/nyang-idle.html

- CSS·JS 는 인라인으로 넣는다.
- 게임이 불러오는 이미지(assets/v2 전체 + 타이틀)는 WebP data URI 로 window.__A 에 담고,
  <img>.src 설정을 가로채서 경로 대신 내장 데이터를 쓰게 한다. (코드가 경로를 조립해서 불러오기 때문)
"""
import base64
import io
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent
IDLE = ROOT / 'idle'
OUT = ROOT / 'dist' / 'nyang-idle.html'


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
    v2 = ROOT / 'assets' / 'v2'
    for p in sorted((v2 / 'bg').glob('*.png')):
        assets[f'assets/v2/bg/{p.name}'] = webp_uri(p, 1536)
    for p in sorted((v2 / 'cats').glob('*.png')):
        assets[f'assets/v2/cats/{p.name}'] = webp_uri(p, 360)
    for p in sorted((v2 / 'parts').glob('*/*.png')):
        assets[f'assets/v2/parts/{p.parent.name}/{p.name}'] = webp_uri(p, 400)
    assets['assets/v2/title.png'] = webp_uri(v2 / 'title.png', 1280)
    return assets


LOADER = """<script>
// 단일 HTML 빌드: 이미지 경로를 내장 데이터로 바꿔치기
window.__A = %s;
(() => {
  const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    get() { return d.get.call(this); },
    set(v) { const k = String(v).replace(/^(\\.\\.\\/)+/, '').split('?')[0]; d.set.call(this, window.__A[k] || v); },
  });
})();
</script>"""


def main() -> None:
    html = (IDLE / 'index.html').read_text(encoding='utf-8')
    css = (IDLE / 'style.css').read_text(encoding='utf-8')
    html = re.sub(r'<link rel="stylesheet" href="style\.css[^"]*">', lambda m: f'<style>\n{css}\n</style>', html)

    assets = collect_assets()
    html = html.replace('src="../assets/v2/title.png"', f'src="{assets["assets/v2/title.png"]}"')

    def inline_script(m: re.Match) -> str:
        src = m.group(1).split('?')[0]
        path = (IDLE / src).resolve()
        return f'<script>\n{path.read_text(encoding="utf-8")}\n</script>'

    html = re.sub(r'<script src="([^"]+)"></script>', inline_script, html)
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
