"""Rebuild index.html from src/template.html + src/data.json.  Run from repo root: python3 src/build.py"""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root/'src/data.json').read_text())
html = (root/'src/template.html').read_text().replace('__DATA__', json.dumps(data, ensure_ascii=False))
(root/'index.html').write_text(html)
print('wrote index.html')
