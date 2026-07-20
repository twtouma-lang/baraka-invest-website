"""Inject an in-page password gate into dist/index.html.

Used when the site is deployed via the direct design-import path (which does
not carry the Netlify edge function). Covers the page with a branded password
overlay until the correct password is entered; unlock is remembered for two
weeks. Self-heals against the page loader rewriting the DOM.

Note: a client-side gate keeps casual visitors out but is not a substitute for
server-side protection for truly sensitive content. To remove it, delete this
injection / re-run the build without it.
"""

MARKER = "bk-gate-js"
PASSWORD = "BARAKAINVEST65"

WIDGET = """
<script id="bk-gate-js">
(function () {
  var PW = "%PW%";
  var KEY = "bk_gate_ok_v1";
  var TTL = 1209600000; // 14 days
  function unlocked() {
    try {
      var v = localStorage.getItem(KEY);
      if (!v) return false;
      if (Date.now() - parseInt(v, 10) > TTL) { localStorage.removeItem(KEY); return false; }
      return true;
    } catch (e) { return false; }
  }
  var CSS = [
    "#bk-gate{position:fixed;inset:0;z-index:2147483647;background:#00348C;",
    "font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center}",
    "#bk-gate .bkc{background:#fff;border-radius:10px;padding:44px 36px;width:340px;max-width:88vw;",
    "box-shadow:0 20px 60px rgba(0,31,84,.4);text-align:center}",
    "#bk-gate h1{font-size:20px;letter-spacing:.12em;color:#00348C;margin:0 0 6px}",
    "#bk-gate h1 span{color:#0A9DDE}",
    "#bk-gate p{font-size:14px;color:#8593A6;margin:0 0 24px}",
    "#bk-gate input{width:100%;box-sizing:border-box;padding:13px 14px;font-size:15px;",
    "border:1px solid #C7D0DE;border-radius:6px;outline:none;margin-bottom:12px}",
    "#bk-gate input:focus{border-color:#0A9DDE}",
    "#bk-gate button{width:100%;padding:13px;background:#FED608;color:#00348C;border:none;",
    "border-radius:6px;font-weight:700;font-size:15px;cursor:pointer}",
    "#bk-gate button:hover{background:#00348C;color:#fff}",
    "#bk-gate .bke{color:#C0392B;font-size:13px;min-height:16px;margin:0 0 10px}"
  ].join("");
  function build() {
    if (unlocked() || document.getElementById("bk-gate")) return;
    var g = document.createElement("div");
    g.id = "bk-gate";
    var st = document.createElement("style"); st.textContent = CSS; g.appendChild(st);
    var c = document.createElement("div"); c.className = "bkc";
    c.innerHTML = "<h1>BARAKA <span>INVEST</span></h1>" +
      "<p>This site is not yet public.<br>Enter the password to continue.</p>" +
      "<div class=\\"bke\\" id=\\"bk-err\\"></div>" +
      "<input id=\\"bk-pw\\" type=\\"password\\" placeholder=\\"Password\\" autocomplete=\\"current-password\\">" +
      "<button id=\\"bk-go\\" type=\\"button\\">Enter</button>";
    g.appendChild(c);
    (document.body || document.documentElement).appendChild(g);
    function tryUnlock() {
      var inp = document.getElementById("bk-pw");
      if (inp && inp.value === PW) {
        try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
        g.parentNode && g.parentNode.removeChild(g);
      } else {
        var er = document.getElementById("bk-err");
        if (er) er.textContent = "Incorrect password - please try again.";
        if (inp) { inp.value = ""; inp.focus(); }
      }
    }
    document.getElementById("bk-go").addEventListener("click", tryUnlock);
    document.getElementById("bk-pw").addEventListener("keydown", function (e) {
      if (e.key === "Enter") tryUnlock();
    });
    document.getElementById("bk-pw").focus();
  }
  build();
  // Re-assert in case the page loader rewrites the DOM after boot.
  var t = setInterval(function () {
    if (unlocked()) { clearInterval(t); var g = document.getElementById("bk-gate"); if (g) g.remove(); return; }
    build();
  }, 400);
})();
</script>
""".replace("%PW%", PASSWORD)


def main() -> None:
    path = "dist/index.html"
    src = open(path).read()
    assert MARKER not in src, "password gate already present"
    idx = src.find("<body")
    idx = src.find(">", idx) + 1 if idx != -1 else -1
    assert idx != -1, "body tag not found"
    out = src[:idx] + WIDGET + src[idx:]
    open(path, "w").write(out)
    print("injected in-page password gate;", path, "now", len(out), "bytes")


if __name__ == "__main__":
    main()
