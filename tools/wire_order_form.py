"""Make the invoice order reach us, instead of depending on a mail client.

The checkout's invoice button runs:

    window.location.href = coMail.href;   // a mailto: link
    completePay('Invoice - bank transfer');

Two problems. Most phones and any corporate machine on webmail have no mail
client configured, so the mailto does nothing -- and completePay() then shows
the customer a confirmation anyway, so they believe the order was sent when it
was not. The panel also collects no name or email, so even a successful order
arrives without a way to invoice the buyer.

This injects an order request into the checkout panel -- name, business email,
optional note -- and intercepts the invoice button so the order posts to
Netlify Forms with the cart contents. The mailto stays as a fallback if the
post fails, so an order is never lost outright.

Replace this step once card billing launches and checkout goes through a real
payment provider.
"""

MARKER = "bk-order-request"
FORM_NAME = "orders"

HIDDEN_FORM = """
<form name="%s" netlify netlify-honeypot="bot-field" hidden>
  <input type="text" name="name">
  <input type="email" name="email">
  <input type="text" name="items">
  <input type="text" name="total">
  <input type="text" name="notes">
  <input type="text" name="submitted_at">
  <input type="text" name="bot-field">
</form>
""" % FORM_NAME

SCRIPT = """
<script id="bk-order-request">
(function () {
  var FORM = "%s";

  function cart() {
    try { if (Array.isArray(window.CART)) return window.CART; } catch (e) {}
    return [];
  }

  function describe() {
    return cart().map(function (it) {
      return [it.title, it.target ? "(" + it.target + ")" : "",
              it.billingLabel || "", it.qty > 1 ? "x" + it.qty : ""]
             .filter(Boolean).join(" ");
    }).join(" | ");
  }

  function total() {
    var el = document.getElementById("coTotal");
    return el ? el.textContent.trim() : "";
  }

  function build() {
    var panel = document.getElementById("payPanel");
    var go = document.getElementById("invoiceGo");
    if (!panel || !go || document.getElementById("bk-order-box")) return;

    var box = document.createElement("div");
    box.id = "bk-order-box";
    box.style.cssText = "display:flex; flex-direction:column; gap:12px; margin-bottom:16px;";
    box.innerHTML =
      '<label style="display:flex; flex-direction:column; gap:6px;">' +
      '<span class="flabel" style="font-size:13px;">Name</span>' +
      '<input id="bk_o_name" type="text" autocomplete="name"></label>' +
      '<label style="display:flex; flex-direction:column; gap:6px;">' +
      '<span class="flabel" style="font-size:13px;">Business email</span>' +
      '<input id="bk_o_email" type="email" autocomplete="email"></label>' +
      '<label style="display:flex; flex-direction:column; gap:6px;">' +
      '<span class="flabel" style="font-size:13px;">Notes (optional)</span>' +
      '<textarea id="bk_o_notes" rows="2"></textarea></label>' +
      '<div id="bk_o_msg" style="font-size:13px; font-weight:700; min-height:17px;"></div>';
    go.parentNode.insertBefore(box, go);
  }

  function say(text, ok) {
    var m = document.getElementById("bk_o_msg");
    if (!m) return;
    m.style.color = ok ? "#1E7F3E" : "#B4231C";
    m.textContent = text;
  }

  function val(id) {
    var el = document.getElementById(id);
    return el && el.value ? el.value.trim() : "";
  }

  var busy = false;

  function submit(go) {
    if (busy) return;
    if (!cart().length) { say("Your order is empty.", false); return; }

    var name = val("bk_o_name"), email = val("bk_o_email");
    if (!name || !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) {
      say("Please add your name and a valid business email so we can invoice you.", false);
      return;
    }

    busy = true;
    var original = go.textContent;
    go.textContent = "Sending\\u2026";
    say("", true);

    var body = new URLSearchParams();
    body.append("form-name", FORM);
    body.append("name", name);
    body.append("email", email);
    body.append("items", describe());
    body.append("total", total());
    body.append("notes", val("bk_o_notes"));
    body.append("submitted_at", new Date().toISOString());

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    }).then(function (r) {
      if (!r.ok) throw new Error("bad status");
      go.textContent = original;
      if (typeof window.completePay === "function") {
        window.completePay("Invoice \\u2014 bank transfer");
      }
    }).catch(function () {
      // Never lose an order: hand off to the visitor's mail client.
      go.textContent = original;
      say("Opening your email app to send this order\\u2026", true);
      var m = document.getElementById("coMail");
      if (m) window.location.href = m.href;
      if (typeof window.completePay === "function") {
        window.completePay("Invoice \\u2014 bank transfer");
      }
    }).finally(function () { busy = false; });
  }

  // Capture phase: runs before the link's inline handler and stops the event
  // reaching it, so the mailto only happens as our fallback.
  document.addEventListener("click", function (e) {
    var go = e.target && e.target.closest ? e.target.closest("#invoiceGo") : null;
    if (!go) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    submit(go);
  }, true);

  build();
  setInterval(build, 500);
})();
</script>
""" % FORM_NAME


def main() -> None:
    path = "dist/index.html"
    src = open(path).read()
    assert MARKER not in src, "order request already present"
    assert "invoiceGo" in src, "invoice button not found -- has the checkout changed?"
    idx = src.find("<body")
    idx = src.find(">", idx) + 1 if idx != -1 else -1
    assert idx != -1, "body tag not found"
    out = src[:idx] + HIDDEN_FORM + SCRIPT + src[idx:]
    open(path, "w").write(out)
    print("wired order form;", path, "now", len(out), "bytes")


if __name__ == "__main__":
    main()
