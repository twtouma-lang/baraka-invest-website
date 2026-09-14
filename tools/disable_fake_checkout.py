"""Replace the non-functional card checkout with a real order request.

The shipped page renders a card form and Apple/Google Pay buttons, but no
payment processor is connected: payNow() validates the card number's format
and then calls completePay(), which shows the customer a "payment complete"
screen. No charge is made and no order is recorded anywhere, so a buyer would
be told they had paid when they had not, and the business would never learn
they tried to buy.

Until a real processor is wired up, this:
  1. Hides the card form, the wallet buttons and their divider.
  2. Neutralises payNow()/walletPay() so the false confirmation cannot appear.
  3. Puts an order request in their place -- name, business email, optional
     note -- which posts the cart contents to Netlify Forms, so the order
     reaches the owner and the customer is told the truth: an invoice is
     coming.

Remove this step once checkout goes through a real payment provider.
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

  // The fake confirmation must never be reachable, whatever calls it.
  function neutralise() {
    if (window.payNow && !window.payNow.__bk) {
      window.payNow = function (e) { if (e && e.preventDefault) e.preventDefault(); return false; };
      window.payNow.__bk = 1;
    }
    if (window.walletPay && !window.walletPay.__bk) {
      window.walletPay = function () {};
      window.walletPay.__bk = 1;
    }
  }

  function cart() {
    try {
      if (Array.isArray(window.CART)) return window.CART;
    } catch (e) {}
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
    if (!panel || document.getElementById("bk-order-box")) return;

    // Take out the parts that pretend to take payment.
    var card = panel.querySelector('form[onsubmit*="payNow"]');
    if (card) card.style.display = "none";
    [].forEach.call(panel.querySelectorAll(".pmbtn, .paydiv"), function (el) {
      el.style.display = "none";
    });

    var box = document.createElement("div");
    box.id = "bk-order-box";
    box.style.cssText = "display:flex; flex-direction:column; gap:14px;";
    box.innerHTML =
      '<p style="margin:0; font-size:13.5px; line-height:1.6; color:#4A5A75;">' +
      'Send your order and we will email an invoice with payment instructions. ' +
      'Reports are issued as soon as payment clears.</p>' +
      '<label style="display:flex; flex-direction:column; gap:7px;">' +
      '<span style="font-size:13px; font-weight:700; color:#00348C;">Name</span>' +
      '<input id="bk_o_name" type="text" autocomplete="name"></label>' +
      '<label style="display:flex; flex-direction:column; gap:7px;">' +
      '<span style="font-size:13px; font-weight:700; color:#00348C;">Business email</span>' +
      '<input id="bk_o_email" type="email" autocomplete="email"></label>' +
      '<label style="display:flex; flex-direction:column; gap:7px;">' +
      '<span style="font-size:13px; font-weight:700; color:#00348C;">Notes (optional)</span>' +
      '<textarea id="bk_o_notes" rows="2"></textarea></label>' +
      '<div id="bk_o_msg" style="font-size:13px; font-weight:700; min-height:17px;"></div>' +
      '<button id="bk_o_send" type="button" class="btn-b" ' +
      'style="text-align:center; border:none; cursor:pointer;">Send order</button>';
    panel.appendChild(box);

    document.getElementById("bk_o_send").addEventListener("click", function () {
      var btn = this;
      var msg = document.getElementById("bk_o_msg");
      var name = document.getElementById("bk_o_name").value.trim();
      var email = document.getElementById("bk_o_email").value.trim();

      function say(t, ok) { msg.style.color = ok ? "#1E7F3E" : "#B4231C"; msg.textContent = t; }

      if (!cart().length) { say("Your order is empty.", false); return; }
      if (!name || !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) {
        say("Please add your name and a valid business email.", false); return;
      }

      btn.disabled = true;
      var original = btn.textContent;
      btn.textContent = "Sending\\u2026";
      say("", true);

      var body = new URLSearchParams();
      body.append("form-name", FORM);
      body.append("name", name);
      body.append("email", email);
      body.append("items", describe());
      body.append("total", total());
      body.append("notes", document.getElementById("bk_o_notes").value.trim());
      body.append("submitted_at", new Date().toISOString());

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      }).then(function (r) {
        if (!r.ok) throw new Error("bad status");
        box.innerHTML = '<p style="margin:0; font-size:15px; line-height:1.6; color:#00348C;">' +
          '<strong>Order received.</strong><br>We will email your invoice shortly. ' +
          'No payment has been taken yet.</p>';
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = original;
        say("That did not send. Please email sales@barakainvest.com.", false);
      });
    });
  }

  function tick() { neutralise(); build(); }
  tick();
  setInterval(tick, 500);
})();
</script>
""" % FORM_NAME


def main() -> None:
    path = "dist/index.html"
    src = open(path).read()
    assert MARKER not in src, "order request already present"
    assert "payNow" in src, "no card checkout found -- has the page changed?"
    idx = src.find("<body")
    idx = src.find(">", idx) + 1 if idx != -1 else -1
    assert idx != -1, "body tag not found"
    out = src[:idx] + HIDDEN_FORM + SCRIPT + src[idx:]
    open(path, "w").write(out)
    print("replaced fake checkout with order request;", path, "now", len(out), "bytes")


if __name__ == "__main__":
    main()
