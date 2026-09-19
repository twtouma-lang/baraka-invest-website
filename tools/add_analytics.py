"""Add privacy-conscious visitor analytics to dist/index.html.

The site records sample downloads and quote requests, but nothing counts
visitors or measures how long they stay. This injects a single analytics
snippet into the OUTER document body (not the encoded bundler template) so it
loads regardless of how the page runtime rewrites the DOM.

Usage:
    python3 tools/add_analytics.py cloudflare <beacon-token>
    python3 tools/add_analytics.py ga4 <G-XXXXXXXXXX>

Cloudflare is the default recommendation: no cookies, so no consent banner is
required, and it does not consume the site's form-submission quota.
"""
import sys

MARKER = "bk-analytics"

CLOUDFLARE = """
<!-- Cloudflare Web Analytics: cookieless, no consent banner required -->
<script defer src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon='{"token": "%s"}' id="bk-analytics"></script>
"""

GA4 = """
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=%s" id="bk-analytics"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '%s', { anonymize_ip: true });
</script>
"""


def main() -> None:
    if len(sys.argv) != 3 or sys.argv[1] not in ("cloudflare", "ga4"):
        sys.exit(__doc__)
    provider, ident = sys.argv[1], sys.argv[2]

    if provider == "ga4" and not ident.startswith("G-"):
        sys.exit("GA4 measurement IDs look like G-XXXXXXXXXX")

    snippet = CLOUDFLARE % ident if provider == "cloudflare" else GA4 % (ident, ident)

    path = "dist/index.html"
    src = open(path).read()
    assert MARKER not in src, "analytics already present"
    idx = src.find("<body")
    idx = src.find(">", idx) + 1 if idx != -1 else -1
    assert idx != -1, "body tag not found"
    out = src[:idx] + snippet + src[idx:]
    open(path, "w").write(out)
    print("injected %s analytics; %s now %d bytes" % (provider, path, len(out)))


if __name__ == "__main__":
    main()
