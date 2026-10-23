"""Rebuild index.html from src/template.html + src/data.json + src/routes.json.

Run from the repo root: python3 src/build.py
"""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root/'src/data.json').read_text())
routes = json.loads((root/'src/routes.json').read_text())
html = ((root/'src/template.html').read_text()
        .replace('__DATA__', json.dumps(data, ensure_ascii=False, separators=(',', ':')))
        .replace('__ROUTES__', json.dumps(routes, separators=(',', ':'))))
(root/'index.html').write_text(html)
print('wrote index.html')
