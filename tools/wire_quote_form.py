"""Wire the "Get a quote" form to a real submission endpoint.

The shipped page collects quote details then hands them to the visitor's own
mail client via a mailto: link. That loses leads: many visitors (especially on
mobile and on corporate machines with webmail) have no mail client configured,
so the click does nothing and the enquiry is never sent. The page's own note
says to wire it to a form processor before launch.

This injects:
  1. A hidden static form in the OUTER document body, so Netlify's deploy-time
     parser detects it (it cannot see inside the encoded bundler template).
  2. A capture-phase click handler on the quote button that suppresses the
     inline mailto handler, validates, and posts the enquiry to Netlify Forms.
     If the post fails, it falls back to the original mailto so an enquiry is
     never silently lost.
"""

FORM_NAME = "quote-requests"

HIDDEN_FORM = """
<form name="%s" netlify netlify-honeypot="bot-field" hidden>
  <input type="text" name="name">
  <input type="email" name="email">
  <input type="text" name="organization">
  <input type="text" name="companies">
  <input type="text" name="notes">
  <input type="text" name="submitted_at">
  <input type="text" name="bot-field">
</form>
""" % FORM_NAME

SCRIPT = """
<script id="bk-quote-wire">
(function () {
  var FORM = "%s";
  var FALLBACK = "sales@barakainvest.com";
  var busy = false;

  function val(id) {
    var el = document.getElementById(id);
    return el && el.value ? el.value.trim() : "";
  }

  function say(btn, msg, ok) {
    var note = document.getElementById("bk-quote-msg");
    if (!note) {
      note = document.createElement("p");
      note.id = "bk-quote-msg";
      note.style.cssText = "margin:10px 0 0; font-size:13.5px; line-height:1.5;";
      btn.parentNode.appendChild(note);
    }
    note.style.color = ok ? "#1E7F3E" : "#C0392B";
    note.textContent = msg;
  }

  function mailtoFallback(d) {
    var body = "Name: " + d.name + "\\r\\nEmail: " + d.email +
               "\\r\\nOrganization: " + d.organization +
               "\\r\\n\\r\\nCompanies:\\r\\n" + d.companies +
               "\\r\\n\\r\\nNotes:\\r\\n" + d.notes;
    window.location.href = "mailto:" + FALLBACK +
      "?subject=" + encodeURIComponent("Quote request \\u2014 " + (d.organization || d.name || "BARAKA Invest")) +
      "&body=" + encodeURIComponent(body);
  }

  function submit(btn) {
    if (busy) return;
    var d = {
      name: val("f_name"),
      email: val("f_email"),
      organization: val("f_org"),
      companies: val("f_companies"),
      notes: val("f_notes")
    };
    if (!d.name || !d.email) {
      say(btn, "Please add your name and business email so we can reply.", false);
      return;
    }
    if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(d.email)) {
      say(btn, "That email address doesn't look right \\u2014 please check it.", false);
      return;
    }

    busy = true;
    var original = btn.textContent;
    btn.textContent = "Sending\\u2026";
    say(btn, "", true);

    var body = new URLSearchParams();
    body.append("form-name", FORM);
    Object.keys(d).forEach(function (k) { body.append(k, d[k]); });
    body.append("submitted_at", new Date().toISOString());

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    }).then(function (r) {
      if (!r.ok) throw new Error("bad status");
      btn.textContent = "Request sent \\u2713";
      say(btn, "Thank you \\u2014 we'll be in touch within one business day.", true);
      ["f_name","f_email","f_org","f_companies","f_notes"].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.value = "";
      });
    }).catch(function () {
      // Never lose an enquiry: hand off to the visitor's mail client.
      btn.textContent = original;
      say(btn, "Opening your email app to send this request\\u2026", true);
      mailtoFallback(d);
    }).finally(function () { busy = false; });
  }

  // Capture phase: runs before the element's inline mailto handler and
  // stops the event reaching it, so we replace that behaviour cleanly.
  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest ? e.target.closest("#quoteBtn") : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    submit(btn);
  }, true);
})();
</script>
""" % FORM_NAME


def main() -> None:
    path = "dist/index.html"
    src = open(path).read()
    assert 'name="%s"' % FORM_NAME not in src, "quote form already wired"
    assert "quoteBtn" in src, "quote button not found in page"

    idx = src.find("<body")
    idx = src.find(">", idx) + 1 if idx != -1 else -1
    assert idx != -1, "body tag not found"
    out = src[:idx] + HIDDEN_FORM + SCRIPT + src[idx:]
    open(path, "w").write(out)
    print("wired quote form; dist/index.html now", len(out), "bytes")


if __name__ == "__main__":
    main()
