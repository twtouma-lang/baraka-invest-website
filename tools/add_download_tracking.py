"""Notify the site owner whenever a visitor downloads a sample report.

The sample reports are embedded as data: URLs and download straight from the
browser, so no server request happens naturally. This injects:

  1. A hidden static form in the OUTER document body. It must live in real
     static HTML (not inside the JSON-encoded bundler template) because
     Netlify detects forms by parsing the deployed HTML at deploy time.
  2. A click listener that posts to that form whenever a visitor activates a
     sample download link, recording which report was taken, plus timestamp,
     referrer and screen type.

Submissions land in Netlify's Forms dashboard, which emails the address
configured under Project configuration -> Notifications.
"""
import json
import re

FORM_NAME = "sample-downloads"

# Real static HTML so Netlify's deploy-time form parser can see it.
HIDDEN_FORM = """
<form name="%s" netlify netlify-honeypot="bot-field" hidden>
  <input type="text" name="report">
  <input type="text" name="edition">
  <input type="text" name="downloaded_at">
  <input type="text" name="referrer">
  <input type="text" name="device">
  <input type="text" name="bot-field">
</form>
""" % FORM_NAME

TRACKER = """
<script id="bk-dl-track">
(function () {
  var FORM = "%s";
  var sent = {};

  function label(a) {
    var n = a.getAttribute("download") || a.textContent || "sample";
    return String(n).replace(/\\.pdf$/i, "").trim().slice(0, 200);
  }

  function edition(name) {
    return /shariah/i.test(name) ? "Shariah" : "Conventional";
  }

  function report(a) {
    // Prefer the card's own heading if present, else the filename.
    var h = a.querySelector("h3, h4, strong, b");
    var t = h && h.textContent ? h.textContent.trim() : "";
    return (t || label(a)).slice(0, 200);
  }

  function notify(a) {
    var name = label(a);
    // Don't double-count rapid repeat clicks on the same file.
    if (sent[name] && Date.now() - sent[name] < 60000) return;
    sent[name] = Date.now();

    var body = new URLSearchParams();
    body.append("form-name", FORM);
    body.append("report", report(a));
    body.append("edition", edition(name));
    body.append("downloaded_at", new Date().toISOString());
    body.append("referrer", document.referrer || "direct");
    body.append("device", (window.innerWidth < 820 ? "mobile" : "desktop") +
                          " / " + window.innerWidth + "px");

    // Fire-and-forget: never block or break the actual download.
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/", body);
      } else {
        fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
          keepalive: true
        }).catch(function () {});
      }
    } catch (e) { /* downloads must still work if tracking fails */ }
  }

  // Delegated listener survives the page loader re-rendering the DOM.
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[download]") : null;
    if (a) notify(a);
  }, true);
})();
</script>
""" % FORM_NAME


def main() -> None:
    path = "dist/index.html"
    src = open(path).read()
    assert 'name="%s"' % FORM_NAME not in src, "download tracking already present"

    idx = src.find("<body")
    idx = src.find(">", idx) + 1 if idx != -1 else -1
    assert idx != -1, "body tag not found"
    out = src[:idx] + HIDDEN_FORM + TRACKER + src[idx:]
    open(path, "w").write(out)
    print("injected download tracking; dist/index.html now", len(out), "bytes")


if __name__ == "__main__":
    main()
