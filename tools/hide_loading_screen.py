"""Stop the navy logo splash showing before the page appears.

The bundler wraps the page in a full-screen loading overlay
(#__bundler_thumbnail: fixed, inset 0, navy, z-index 9999) holding a large
logo, plus a navy body background behind it and a small "loading" pill in the
corner. A visitor arriving from search sees the splash first and the site
second, which reads as a slow or broken page rather than a considered one.

This hides all three and sets the body background to the page's own off-white,
so the site simply appears. The overlay elements are hidden rather than
removed, since the bundler runtime manages them itself.
"""

MARKER = "bk-no-splash"

CSS = """
<style id="bk-no-splash">
  /* Show the page, not the loader: no navy splash, no logo, no corner pill. */
  #__bundler_thumbnail,
  #__bundler_loading,
  #__bundler_placeholder { display: none !important; }
  body { background: #ffffff !important; }
</style>
"""


def main() -> None:
    path = "dist/index.html"
    src = open(path).read()
    assert MARKER not in src, "splash already hidden"
    assert "__bundler_thumbnail" in src, "loading overlay not found -- has the bundler changed?"

    marker = "</head>"
    idx = src.find(marker)
    assert idx != -1, "closing head tag not found"
    out = src[:idx] + CSS + src[idx:]
    open(path, "w").write(out)
    print("hid loading splash;", path, "now", len(out), "bytes")


if __name__ == "__main__":
    main()
