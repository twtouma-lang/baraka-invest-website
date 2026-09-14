"""Send the "Schedule a call" request to a real endpoint, not a mailto.

The shipped calendar hands the booking to the visitor's own mail client via
window.location.href = "mailto:...". Many visitors have no mail client set up
-- most phones, and corporate machines on webmail -- so the click does nothing
and the booking is silently lost. The page even tells the visitor "Your
request is sent to support@barakainvest.com", which is not true for them.

This injects:
  1. A hidden static form in the OUTER document body, so Netlify's deploy-time
     parser detects it (it cannot see inside the encoded bundler template).
  2. A capture-phase click handler on the confirm button that suppresses the
     inline mailto handler, validates the slot and contact details, and posts
     the booking to Netlify Forms. If the post fails it falls back to the
     original mailto, so a booking is never lost outright.
"""

FORM_NAME = "call-requests"

HIDDEN_FORM = """
<form name="%s" netlify netlify-honeypot="bot-field" hidden>
  <input type="text" name="name">
  <input type="email" name="email">
  <input type="text" name="organization">
  <input type="text" name="phone">
  <input type="text" name="requested_slot">
  <input type="text" name="topic">
  <input type="text" name="submitted_at">
  <input type="text" name="bot-field">
</form>
""" % FORM_NAME

SCRIPT = """
<script id="bk-call-wire">
(function () {
  var FORM = "%s";
  var FALLBACK = "support@barakainvest.com";
  var busy = false;

  function val(id) {
    var el = document.getElementById(id);
    return el && el.value ? el.value.trim() : "";
  }

  function say(text, ok) {
    var msg = document.getElementById("calPick");
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = ok ? "#1E7F3E" : "#B4231C";
    msg.style.fontWeight = "700";
  }

  function slotLabel() {
    try {
      if (typeof window.calLabel === "function") return window.calLabel();
    } catch (e) {}
    try {
      return (window.CAL && window.CAL.date ? window.CAL.date : "") +
             " " + (window.CAL && window.CAL.slot ? window.CAL.slot : "");
    } catch (e) { return ""; }
  }

  function hasSlot() {
    try { return !!(window.CAL && window.CAL.date && window.CAL.slot); }
    catch (e) { return false; }
  }

  function mailtoFallback(d) {
    var body = "Call request \\u2014 BARAKA Invest\\r\\n\\r\\n" +
      "Requested slot: " + d.slot + " (Gulf Standard Time, GMT+4)\\r\\n" +
      "Duration: 30 minutes\\r\\n\\r\\n" +
      "Name: " + d.name + "\\r\\nBusiness email: " + d.email +
      "\\r\\nOrganization: " + (d.organization || "\\u2014") +
      "\\r\\nPhone: " + (d.phone || "\\u2014") +
      "\\r\\n\\r\\nTopic:\\r\\n" + (d.topic || "\\u2014");
    window.location.href = "mailto:" + FALLBACK +
      "?subject=" + encodeURIComponent("Call request \\u2014 " + d.slot + " \\u2014 " + d.name) +
      "&body=" + encodeURIComponent(body);
  }

  function submit(btn) {
    if (busy) return;

    if (!hasSlot()) { say("Please select a date and a time.", false); return; }

    var d = {
      name: val("cal_name"),
      email: val("cal_email"),
      organization: val("cal_org"),
      phone: val("cal_phone"),
      topic: val("cal_topic"),
      slot: slotLabel()
    };
    if (!d.name || !d.email) {
      say("Please add your name and business email.", false); return;
    }
    if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(d.email)) {
      say("That email address doesn't look right \\u2014 please check it.", false); return;
    }

    busy = true;
    var original = btn.textContent;
    btn.textContent = "Sending\\u2026";
    say("", true);

    var body = new URLSearchParams();
    body.append("form-name", FORM);
    body.append("name", d.name);
    body.append("email", d.email);
    body.append("organization", d.organization);
    body.append("phone", d.phone);
    body.append("topic", d.topic);
    body.append("requested_slot", d.slot);
    body.append("submitted_at", new Date().toISOString());

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    }).then(function (r) {
      if (!r.ok) throw new Error("bad status");
      btn.textContent = "Request sent \\u2713";
      say("Thank you \\u2014 we'll confirm " + d.slot + " by email within one business day.", true);
    }).catch(function () {
      // Never lose a booking: hand off to the visitor's mail client.
      btn.textContent = original;
      say("Opening your email app to send this request\\u2026", true);
      mailtoFallback(d);
    }).finally(function () { busy = false; });
  }

  // Capture phase: runs before the button's inline mailto handler and stops
  // the event reaching it, so we replace that behaviour cleanly.
  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest ? e.target.closest("#calBtn") : null;
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
    assert 'name="%s"' % FORM_NAME not in src, "call form already wired"
    assert "calBtn" in src, "call button not found in page"
    idx = src.find("<body")
    idx = src.find(">", idx) + 1 if idx != -1 else -1
    assert idx != -1, "body tag not found"
    out = src[:idx] + HIDDEN_FORM + SCRIPT + src[idx:]
    open(path, "w").write(out)
    print("wired call form; dist/index.html now", len(out), "bytes")


if __name__ == "__main__":
    main()
