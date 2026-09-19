"""Make the mobile navigation menu open and close smoothly.

The shipped page toggles the full-screen menu with `#mobmenu { display:none }`
-> `#mobmenu.open { display:block }`. `display` is not animatable, so the menu
snaps in and out instantly, which reads as cheap on a phone.

This replaces the display toggle with an animatable one (opacity + a small
upward slide, with visibility so the closed menu is inert), eases the links in
with a short stagger, animates the burger into a close (X) icon, and stops the
page behind the menu from scrolling while it is open.

Everything is pure CSS -- no new listeners, so the existing toggleMenu() and
the delegated link handler keep working unchanged. Under
prefers-reduced-motion: reduce the original instant toggle is left in place.
"""
import json
import re

MARKER = "Mobile menu: smooth open/close"

# Stagger the menu's own children in. Delays only apply while opening, so
# closing collapses everything together and feels quick.
STAGGER = "\n".join(
    "      #mobmenu.open > *:nth-child(%d) { transition-delay: %dms; }" % (i, 40 + (i - 1) * 22)
    for i in range(1, 17)
)

MENU_CSS = """  <style>
    /* --- %s --- */
    @media (prefers-reduced-motion: no-preference) {
      /* `display` cannot animate, so keep the panel laid out at all times and
         drive its visibility with properties that can. It is position:fixed,
         so this costs no layout, and pointer-events/visibility keep it fully
         inert (and out of the tab order) while closed. */
      #mobmenu {
        display: block !important;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transform: translateY(-10px);
        transition: opacity 0.26s cubic-bezier(0.33, 1, 0.68, 1),
                    transform 0.32s cubic-bezier(0.33, 1, 0.68, 1),
                    visibility 0.32s;
      }
      #mobmenu.open {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transform: translateY(0);
      }

      /* Links and section headings ease up in sequence behind the panel. */
      #mobmenu > * {
        opacity: 0;
        transform: translateY(9px);
        transition: opacity 0.28s ease, transform 0.34s cubic-bezier(0.33, 1, 0.68, 1);
      }
      #mobmenu.open > * {
        opacity: 1;
        transform: translateY(0);
      }
%s

      /* The menu sits just before <nav> in the document, so the burger can
         react to the open state without any JavaScript. */
      #burger i {
        transform-origin: center;
        transition: transform 0.3s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.2s ease;
      }
      #mobmenu.open ~ nav #burger i:nth-child(1) { transform: translateY(7px) rotate(45deg); }
      #mobmenu.open ~ nav #burger i:nth-child(2) { opacity: 0; transform: scaleX(0.4); }
      #mobmenu.open ~ nav #burger i:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
    }

    /* Hold the page still behind the open menu instead of letting it scroll. */
    body:has(#mobmenu.open) { overflow: hidden; }
  </style>
""" % (MARKER, STAGGER)


def main() -> None:
    path = "dist/index.html"
    src = open(path).read()
    m = re.search(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', src, re.S)
    assert m, "bundler template not found"
    tpl = json.loads(m.group(2))
    assert MARKER not in tpl, "mobile menu smoothing already present"
    assert "#mobmenu.open" in tpl, "mobile menu markup not found"
    assert "</head>" in tpl, "closing head tag not found"

    tpl = tpl.replace("</head>", MENU_CSS + "</head>", 1)
    encoded = json.dumps(tpl).replace("</", "<\\/")
    out = src[: m.start(2)] + encoded + src[m.end(2) :]
    open(path, "w").write(out)
    print("injected smooth mobile menu; dist/index.html now", len(out), "bytes")


if __name__ == "__main__":
    main()
