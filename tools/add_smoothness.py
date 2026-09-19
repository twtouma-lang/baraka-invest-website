"""Inject subtle, professional smoothness into the bundler export.

Adds a global stylesheet to the helmet: smooth anchor scrolling, iOS momentum
scrolling, and gentle eased transitions on interactive elements (the pricing
configurator chips, plan/edition options, buttons and links) so selections and
hovers ease between states instead of snapping. Motion is deliberately small
and quick, and fully disabled under prefers-reduced-motion.
"""
import json
import re

SMOOTH_CSS = """  <style>
    /* --- Smoothness (professional, subtle) --- */
    html { scroll-behavior: smooth; }
    body { -webkit-overflow-scrolling: touch; }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
    }

    @media (prefers-reduced-motion: no-preference) {
      /* Ease colour/border/shadow changes on anything interactive so the
         pricing selections and plan card update gracefully. */
      a, button, [style*="cursor:pointer"] {
        transition: background-color 0.28s ease, color 0.2s ease,
                    border-color 0.28s ease, box-shadow 0.28s ease,
                    transform 0.16s ease;
      }
      /* Ease the cards/panels in the pricing area as their state changes. */
      [style*="border:1px solid"], [style*="border-top:3px"] {
        transition: background-color 0.28s ease, border-color 0.28s ease,
                    box-shadow 0.28s ease, transform 0.16s ease;
      }
      /* Quiet tactile feedback on press (works on tap too). */
      a:active, button:active, [style*="cursor:pointer"]:active {
        transform: scale(0.99);
      }
    }

    /* Gentle lift on hover for pointer devices only (no effect on touch). */
    @media (hover: hover) and (prefers-reduced-motion: no-preference) {
      a[style*="border-radius"]:hover, button:hover {
        transform: translateY(-1px);
      }
    }
  </style>
"""

path = 'dist/index.html'
src = open(path).read()
m = re.search(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', src, re.S)
tpl = json.loads(m.group(2))
assert 'Smoothness (professional, subtle)' not in tpl, 'smoothness CSS already present'

marker = '</style>\n</helmet>'
assert marker in tpl, 'helmet closing marker not found'
tpl = tpl.replace(marker, '</style>\n' + SMOOTH_CSS + '</helmet>', 1)

encoded = json.dumps(tpl).replace('</', '<\\/')
out = src[:m.start(2)] + encoded + src[m.end(2):]
open(path, 'w').write(out)
print('injected smoothness CSS; dist/index.html now', len(out), 'bytes')
