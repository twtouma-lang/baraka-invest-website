"""Inject responsive (phone) CSS into the bundler export at dist/index.html.

The page content lives JSON-encoded in a <script type="__bundler/template">
block and styles everything inline for desktop. This script decodes the
template, adds a media-query stylesheet to the helmet (using !important so
the rules beat the inline styles), and re-encodes it in place.
"""
import json
import re

MOBILE_CSS = """  <style>
    @media (max-width: 820px) {
      html, body { overflow-x: hidden; }

      /* Nav: keep logo + Subscribe, hide text links */
      nav > div { padding: 0 18px !important; gap: 16px !important; }
      nav > div > div { gap: 16px !important; }
      nav > div > div > a:nth-child(-n+5) { display: none !important; }
      nav a[href="#top"] img { height: 32px !important; }

      /* Hero */
      header#top > div { padding: 64px 20px 72px !important; }
      header#top h1 { font-size: clamp(30px, 9.5vw, 42px) !important; }
      header#top > img { display: none !important; }
      header#top p[style*="font-size:19px"] { font-size: 16px !important; }
      header#top div[style*="margin-top:88px"] { margin-top: 48px !important; gap: 28px 40px !important; }

      /* Section rhythm and headings */
      section { padding: 64px 20px !important; }
      footer { padding: 40px 20px !important; }
      h2 { font-size: clamp(26px, 7.5vw, 32px) !important; }

      /* Stack every multi-column grid */
      div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
      /* ...except the discipline chips, which stay two-up */
      div[style*="repeat(4,1fr)"] { grid-template-columns: repeat(2, 1fr) !important; }

      /* Plans: no sticky card, tighter builder box, closer columns */
      div[style*="top:100px"] { position: static !important; top: auto !important; }
      section#plans div[style*="padding:40px"] { padding: 24px 18px !important; }
      section#shariah > div { gap: 36px !important; }

      /* Newsletter form stacks full-width */
      #contact div[style*="max-width:480px"] { flex-direction: column !important; }
      #contact div[style*="max-width:480px"] > * { width: 100% !important; box-sizing: border-box; }

      /* Footer stacks */
      footer > div { flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
    }
  </style>
"""

path = 'dist/index.html'
src = open(path).read()
m = re.search(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', src, re.S)
tpl = json.loads(m.group(1 + 1))
assert '@media (max-width: 820px)' not in tpl, 'mobile CSS already present'

marker = '</style>\n</helmet>'
assert marker in tpl, 'helmet closing marker not found'
tpl = tpl.replace(marker, '</style>\n' + MOBILE_CSS + '</helmet>')

encoded = json.dumps(tpl).replace('</', '<\\/')
out = src[:m.start(2)] + encoded + src[m.end(2):]
open(path, 'w').write(out)
print('injected mobile CSS; dist/index.html now', len(out), 'bytes')
