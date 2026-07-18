import base64, pathlib, re

root = pathlib.Path('/home/user/baraka-invest-website')
html = (root / 'index.html').read_text()

# Inline the runtime script
js = (root / 'script-01.js').read_text()
html = html.replace('<script src="./script-01.js"></script>',
                    '<script>\n' + js + '\n</script>')

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
