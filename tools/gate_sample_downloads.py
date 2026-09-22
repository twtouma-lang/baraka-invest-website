"""Ask for a name and business email before handing over a sample report.

The sample cards download immediately, so the reports go out to people the
business never learns the identity of -- the most valuable signal on the site
walks away anonymous. This puts a short form in front of the file: name and
business email, then the report downloads.

It replaces tools/add_download_tracking.py rather than running alongside it,
so each download produces one record carrying both the report and the person,
instead of two records carrying half the story each.

Deliberate choices:
  - The visitor is remembered for 90 days, so someone reading four samples
    fills the form once, and later downloads still record which report they
    took.
  - If the submission fails, the download proceeds anyway. Losing a lead is
    better than refusing a prospect the report they asked for.
  - The form asks, it does not verify. Anyone can type a false address; this
    captures the many who do not, which is the point of a lead magnet.
"""

MARKER = "bk-dl-gate"
FORM_NAME = "sample-downloads"

HIDDEN_FORM = """
<form name="%s" netlify netlify-honeypot="bot-field" hidden>
  <input type="text" name="name">
  <input type="email" name="email">
  <input type="text" name="organization">
  <input type="text" name="report">
  <input type="text" name="edition">
  <input type="text" name="downloaded_at">
  <input type="text" name="referrer">
  <input type="text" name="device">
  <input type="text" name="bot-field">
</form>
""" % FORM_NAME

SCRIPT = """
<script id="bk-dl-gate">
(function () {
  var FORM = "__FORM__";
  var KEY = "bk_sample_id_v1";
  var TTL = 7776000000; // 90 days

  function known() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!v || !v.email || Date.now() - v.at > TTL) return null;
      return v;
    } catch (e) { return null; }
  }

  function remember(name, email, org) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        name: name, email: email, org: org, at: Date.now()
      }));
    } catch (e) {}
  }

  function label(a) {
    var n = a.getAttribute("download") || a.textContent || "sample";
    return String(n).replace(/\\.pdf$/i, "").trim().slice(0, 200);
  }

  function record(a, who) {
    var name = label(a);
    var body = new URLSearchParams();
    body.append("form-name", FORM);
    body.append("name", who.name || "");
    body.append("email", who.email || "");
    body.append("organization", who.org || "");
    body.append("report", name);
    body.append("edition", /shariah/i.test(name) ? "Shariah" : "Conventional");
    body.append("downloaded_at", new Date().toISOString());
    body.append("referrer", document.referrer || "direct");
    body.append("device", (window.innerWidth < 820 ? "mobile" : "desktop") +
                          " / " + window.innerWidth + "px");
    return fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      keepalive: true
    });
  }

  function deliver(a) {
    // The page rewrites each sample href to an embedded copy, so this is the
    // same file the card would have handed over unaided.
    var t = document.createElement("a");
    t.href = a.getAttribute("href");
    t.setAttribute("download", a.getAttribute("download") || "");
    t.style.display = "none";
    document.body.appendChild(t);
    t.click();
    setTimeout(function () { t.remove(); }, 1000);
  }

  var CSS = [
    "#bk-dlg{position:fixed;inset:0;z-index:2147483600;background:rgba(0,26,64,.55);",
    "display:flex;align-items:center;justify-content:center;padding:20px}",
    "#bk-dlg .bx{background:#fff;border-radius:8px;padding:30px 28px;width:400px;max-width:100%;",
    "box-shadow:0 24px 60px rgba(0,31,84,.35);font-family:'Lato',-apple-system,sans-serif}",
    "#bk-dlg h3{font-family:'Cinzel',Georgia,serif;font-size:20px;color:#00348C;margin:0 0 6px;font-weight:400}",
    "#bk-dlg p{font-size:13.5px;line-height:1.6;color:#3D4756;margin:0 0 18px}",
    "#bk-dlg label{display:block;font-size:13px;font-weight:700;color:#00348C;margin:0 0 6px}",
    "#bk-dlg input{width:100%;box-sizing:border-box;padding:11px 12px;font-size:15px;border:1px solid #C7D0DE;",
    "border-radius:4px;margin:0 0 14px;outline:none;font-family:inherit}",
    "#bk-dlg input:focus{border-color:#0A9DDE}",
    "#bk-dlg .er{color:#B4231C;font-size:12.5px;font-weight:700;min-height:16px;margin:0 0 8px}",
    "#bk-dlg .go{width:100%;padding:13px;background:#00348C;color:#fff;border:none;border-radius:4px;",
    "font-weight:700;font-size:15px;cursor:pointer;font-family:inherit}",
    "#bk-dlg .go:hover{background:#0A9DDE}",
    "#bk-dlg .no{display:block;width:100%;margin-top:12px;background:none;border:none;color:#8593A6;",
    "font-size:12.5px;cursor:pointer;font-family:inherit}"
  ].join("");

  function ask(a) {
    if (document.getElementById("bk-dlg")) return;
    var wrap = document.createElement("div");
    wrap.id = "bk-dlg";
    var st = document.createElement("style"); st.textContent = CSS; wrap.appendChild(st);
    var box = document.createElement("div"); box.className = "bx";
    box.innerHTML =
      "<h3>Read the sample report</h3>" +
      "<p>Tell us where to reach you and the report downloads straight away. " +
      "We use this to follow up on coverage questions \\u2014 nothing else.</p>" +
      "<label for='bk_dl_name'>Name</label><input id='bk_dl_name' type='text' autocomplete='name'>" +
      "<label for='bk_dl_email'>Business email</label><input id='bk_dl_email' type='email' autocomplete='email'>" +
      "<label for='bk_dl_org'>Organization (optional)</label><input id='bk_dl_org' type='text' autocomplete='organization'>" +
      "<div class='er' id='bk_dl_err'></div>" +
      "<button type='button' class='go' id='bk_dl_go'>Download the report</button>" +
      "<button type='button' class='no' id='bk_dl_no'>Not now</button>";
    wrap.appendChild(box);
    document.body.appendChild(wrap);

    function close() { wrap.remove(); }
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
    document.getElementById("bk_dl_no").addEventListener("click", close);

    document.getElementById("bk_dl_go").addEventListener("click", function () {
      var btn = this;
      var name = document.getElementById("bk_dl_name").value.trim();
      var email = document.getElementById("bk_dl_email").value.trim();
      var org = document.getElementById("bk_dl_org").value.trim();
      var err = document.getElementById("bk_dl_err");

      if (!name) { err.textContent = "Please add your name."; return; }
      if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) {
        err.textContent = "Please add a valid business email."; return;
      }

      btn.disabled = true;
      btn.textContent = "Preparing\\u2026";
      remember(name, email, org);
      var who = { name: name, email: email, org: org };

      // Deliver whatever happens: a failed record must not cost the prospect
      // the report they asked for.
      record(a, who).catch(function () {}).finally(function () {
        close();
        deliver(a);
      });
    });

    setTimeout(function () {
      var f = document.getElementById("bk_dl_name"); if (f) f.focus();
    }, 50);
  }

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[download]") : null;
    if (!a) return;
    // Only the sample cards. The anchor deliver() mints has no id, so this
    // also stops the delivery click being recorded a second time.
    if (!a.id || a.id.indexOf("sample") !== 0) return;

    var who = known();
    if (who) {
      // Already identified: record silently and let the click through.
      try { record(a, who).catch(function () {}); } catch (err) {}
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    ask(a);
  }, true);
})();
</script>
""".replace("__FORM__", FORM_NAME)


def main() -> None:
    path = "dist/index.html"
    src = open(path).read()
    assert MARKER not in src, "download gate already present"
    assert "bk-dl-track" not in src, (
        "add_download_tracking.py is applied; this replaces it -- run the gate instead"
    )
    idx = src.find("<body")
    idx = src.find(">", idx) + 1 if idx != -1 else -1
    assert idx != -1, "body tag not found"
    out = src[:idx] + HIDDEN_FORM + SCRIPT + src[idx:]
    open(path, "w").write(out)
    print("gated sample downloads;", path, "now", len(out), "bytes")


if __name__ == "__main__":
    main()
