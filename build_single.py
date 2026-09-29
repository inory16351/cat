"""index.html + style.css + js/*.js + assets/*.png 를 HTML 파일 하나로 묶는다.

사용법: python build_single.py  →  dist/nyang-chaos.html
이미지는 WebP 로 압축해 data URI 로 넣는다.
"""
import base64
import io
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent
OUT = ROOT / 'dist' / 'nyang-chaos.html'


def image_data_uri(path: Path) -> str:
    img = Image.open(path).convert('RGB')
    buf = io.BytesIO()
    img.save(buf, 'WEBP', quality=82, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def main() -> None:
    html = (ROOT / 'index.html').read_text(encoding='utf-8')

    css = (ROOT / 'style.css').read_text(encoding='utf-8')
    html = html.replace('<link rel="stylesheet" href="style.css">', f'<style>\n{css}\n</style>')

    uris = {p.name: image_data_uri(p) for p in sorted((ROOT / 'assets').glob('*.png'))}

    def inline_script(m: re.Match) -> str:
        code = (ROOT / m.group(1)).read_text(encoding='utf-8')
        return f'<script>\n{code}\n</script>'

    html = re.sub(r'<script src="(js/[^"]+)"></script>', inline_script, html)

    for name, uri in uris.items():
        html = html.replace(f'assets/{name}', uri)
    leftover = re.findall(r'assets/[\w.-]+', html)
    if leftover:
        raise SystemExit(f'인라인되지 않은 에셋: {leftover}')

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f'{OUT}  ({OUT.stat().st_size / 1024 / 1024:.2f} MB)')


if __name__ == '__main__':
    main()
