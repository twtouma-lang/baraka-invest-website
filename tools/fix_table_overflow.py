"""Make the track-record table usable on phones.

The performance table is a 4-column grid inside a fixed-width card. On a phone
the right-hand benchmark column is clipped, so the outperformance figures --
the point of the table -- are unreadable. This makes the table container
scroll horizontally on small screens and gives the rows a sensible minimum
width, so columns stay aligned and legible and the visitor can swipe across.
A subtle hint line tells them it scrolls. The page itself never scrolls
sideways.
"""
import json
import re

TABLE_CSS = """  <style>
    /* --- Mobile: make the wide track-record table swipeable --- */
    @media (max-width: 900px) {
      #performance div[style*="border:1px solid #E4EAF4"] {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
      }
      #performance div[style*="border:1px solid #E4EAF4"] > div {
        min-width: 660px;
      }
      #performance div[style*="border:1px solid #E4EAF4"]::after {
        content: "Swipe across to see benchmarks \\2192";
        display: block;
        position: sticky;
        left: 0;
        padding: 8px 14px 10px;
        font-size: 11.5px;
        letter-spacing: 0.04em;
        color: #8593A6;
        background: #ffffff;
      }
      /* Never let the page itself scroll sideways. */
      html, body { overflow-x: hidden; }
    }
  </style>
"""

path = "dist/index.html"
src = open(path).read()
m = re.search(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', src, re.S)
tpl = json.loads(m.group(2))
assert "make the wide track-record table swipeable" not in tpl, "table fix already present"

marker = "</head>"
assert marker in tpl, "closing head tag not found"
tpl = tpl.replace(marker, TABLE_CSS + marker, 1)

encoded = json.dumps(tpl).replace("</", "<\\/")
out = src[: m.start(2)] + encoded + src[m.end(2) :]
open(path, "w").write(out)
print("injected table overflow fix; dist/index.html now", len(out), "bytes")
