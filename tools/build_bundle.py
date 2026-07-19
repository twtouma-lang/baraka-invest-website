import base64, pathlib, re

root = pathlib.Path('/home/user/baraka-invest-website')
html = (root / 'index.html').read_text()

# Embed the runtime script as a base64 data URI. It must NOT be inlined as
# readable text: the runtime scans the page source for the first "<x-dc"
# marker, and its own code contains that string, so inlining it makes the
# runtime render its own source instead of the page.
js_b64 = base64.b64encode((root / 'script-01.js').read_bytes()).decode()
html = html.replace('<script src="./script-01.js"></script>',
                    f'<script src="data:text/javascript;charset=utf-8;base64,{js_b64}"></script>')

# Inline fonts as data URIs
for f in sorted(root.glob('font-*.woff2')):
    b64 = base64.b64encode(f.read_bytes()).decode()
    html = html.replace(f'url("./{f.name}")', f'url(data:font/woff2;base64,{b64})')

# Inline the SVG logo
svg = (root / 'image-01.svg').read_bytes()
svg64 = base64.b64encode(svg).decode()
html = html.replace('src="./image-01.svg"', f'src="data:image/svg+xml;base64,{svg64}"')

leftover = re.findall(r'\./(?:font|image|script)-\d+\.\w+', html)
assert not leftover, f'unresolved local refs: {leftover}'

out = root / 'dist'
out.mkdir(exist_ok=True)
(out / 'index.html').write_text(html)
print('wrote', out / 'index.html', len(html), 'bytes')
