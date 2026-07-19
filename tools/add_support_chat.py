"""Inject the AI support chat widget into dist/index.html.

The widget is appended to the outer document (not the bundler template) and
periodically re-attaches itself, because the page's loader rebuilds the DOM
after boot. It adds a floating chat bubble, a chat panel styled to the brand,
and rewires nav links named "Support" to open the panel. Messages go to the
Netlify function at /api/chat.
"""

MARKER = "bk-chat-root"

WIDGET = r"""
<script id="bk-chat-js">
(function () {
  var API = "/api/chat";
  var GREETING = "Hi! I'm the BARAKA Invest assistant. Ask me anything about our research, plans or Shariah methodology.";
  var OFFLINE = "The support assistant isn't available right now. Please try again shortly, or leave your email in the subscribe box below and our team will follow up.";
  var history = [];  // survives page-loader rewrites (JS context persists)
  var open = false, busy = false;

  var CSS = [
    "#bk-chat-root{position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:'Lato',Arial,sans-serif}",
    "#bk-chat-btn{width:58px;height:58px;border-radius:50%;background:#00348C;color:#fff;border:none;cursor:pointer;box-shadow:0 6px 20px rgba(0,31,84,.35);font-size:26px;line-height:1;display:flex;align-items:center;justify-content:center}",
    "#bk-chat-btn:hover{background:#0A9DDE}",
    "#bk-chat-panel{display:none;position:fixed;right:20px;bottom:90px;width:360px;max-width:calc(100vw - 24px);height:520px;max-height:calc(100vh - 120px);background:#fff;border:1px solid #E4EAF4;border-radius:10px;box-shadow:0 18px 50px rgba(0,31,84,.3);flex-direction:column;overflow:hidden}",
    "#bk-chat-panel.bk-open{display:flex}",
    "#bk-chat-head{background:#00348C;color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}",
    "#bk-chat-head b{font-size:15px;letter-spacing:.04em}",
    "#bk-chat-head small{display:block;color:#C9D5EA;font-size:11.5px;margin-top:2px;font-weight:400}",
    "#bk-chat-close{background:none;border:none;color:#C9D5EA;font-size:20px;cursor:pointer;padding:2px 6px}",
    "#bk-chat-close:hover{color:#fff}",
    "#bk-chat-msgs{flex:1;overflow-y:auto;padding:14px;background:#F7F9FC}",
    ".bk-msg{max-width:85%;margin-bottom:10px;padding:10px 13px;border-radius:10px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word}",
    ".bk-msg.bk-user{background:#00348C;color:#fff;margin-left:auto;border-bottom-right-radius:3px}",
    ".bk-msg.bk-bot{background:#fff;border:1px solid #E4EAF4;color:#3D4756;border-bottom-left-radius:3px}",
    ".bk-msg.bk-typing{color:#8593A6;font-style:italic}",
    "#bk-chat-form{display:flex;gap:8px;padding:12px;border-top:1px solid #E4EAF4;background:#fff}",
    "#bk-chat-in{flex:1;border:1px solid #C7D0DE;border-radius:6px;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;color:#3D4756}",
    "#bk-chat-in:focus{border-color:#0A9DDE}",
    "#bk-chat-send{background:#FED608;color:#00348C;border:none;border-radius:6px;padding:0 16px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit}",
    "#bk-chat-send:disabled{opacity:.6;cursor:default}",
    "#bk-chat-note{font-size:10.5px;color:#8593A6;text-align:center;padding:0 12px 8px;background:#fff}",
    "@media (max-width:480px){#bk-chat-panel{right:8px;left:8px;width:auto;bottom:84px}}"
  ].join("\n");

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }

  function addMsg(role, text, typing) {
    var msgs = document.getElementById("bk-chat-msgs");
    if (!msgs) return null;
    var m = el("div", { "class": "bk-msg " + (role === "user" ? "bk-user" : "bk-bot") + (typing ? " bk-typing" : "") }, text);
    msgs.appendChild(m);
    msgs.scrollTop = msgs.scrollHeight;
    return m;
  }

  function renderHistory() {
    var msgs = document.getElementById("bk-chat-msgs");
    if (!msgs) return;
    msgs.textContent = "";
    addMsg("assistant", GREETING);
    for (var i = 0; i < history.length; i++) addMsg(history[i].role, history[i].content);
  }

  function setOpen(v) {
    open = v;
    var p = document.getElementById("bk-chat-panel");
    if (p) {
      p.className = v ? "bk-open" : "";
      if (v) {
        renderHistory();
        var inp = document.getElementById("bk-chat-in");
        if (inp) inp.focus();
      }
    }
  }

  function send() {
    if (busy) return;
    var inp = document.getElementById("bk-chat-in");
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;
    inp.value = "";
    history.push({ role: "user", content: text });
    addMsg("user", text);
    busy = true;
    var sendBtn = document.getElementById("bk-chat-send");
    if (sendBtn) sendBtn.disabled = true;
    var typing = addMsg("assistant", "…", true);
    fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: history }) })
      .then(function (r) { if (!r.ok) throw new Error("bad status " + r.status); return r.json(); })
      .then(function (d) {
        if (typing) typing.remove();
        if (d && typeof d.reply === "string" && d.reply) {
          history.push({ role: "assistant", content: d.reply });
          addMsg("assistant", d.reply);
        } else { throw new Error("no reply"); }
      })
      .catch(function () {
        if (typing) typing.remove();
        addMsg("assistant", OFFLINE);
      })
      .finally(function () {
        busy = false;
        var b = document.getElementById("bk-chat-send");
        if (b) b.disabled = false;
      });
  }

  function build() {
    var root = el("div", { id: "bk-chat-root" });
    var style = el("style", { id: "bk-chat-css" });
    style.textContent = CSS;
    root.appendChild(style);

    var panel = el("div", { id: "bk-chat-panel" });
    var head = el("div", { id: "bk-chat-head" });
    var title = el("div", {});
    title.appendChild(el("b", {}, "BARAKA Invest Support"));
    title.appendChild(el("small", {}, "AI assistant · typically replies in seconds"));
    head.appendChild(title);
    var close = el("button", { id: "bk-chat-close", type: "button", "aria-label": "Close chat" }, "×");
    close.onclick = function () { setOpen(false); };
    head.appendChild(close);
    panel.appendChild(head);
    panel.appendChild(el("div", { id: "bk-chat-msgs" }));

    var form = el("form", { id: "bk-chat-form" });
    var inp = el("input", { id: "bk-chat-in", type: "text", placeholder: "Ask a question…", maxlength: "1000", autocomplete: "off" });
    var sendBtn = el("button", { id: "bk-chat-send", type: "submit" }, "Send");
    form.appendChild(inp);
    form.appendChild(sendBtn);
    form.onsubmit = function (e) { e.preventDefault(); send(); };
    panel.appendChild(form);
    panel.appendChild(el("div", { id: "bk-chat-note" }, "AI-generated answers · research, not investment advice"));
    root.appendChild(panel);

    var btn = el("button", { id: "bk-chat-btn", type: "button", "aria-label": "Open support chat" }, "💬");
    btn.onclick = function () { setOpen(!open); };
    root.appendChild(btn);
    document.body.appendChild(root);
    if (open) setOpen(true);
  }

  function ensure() {
    if (!document.body) return;
    if (!document.getElementById("bk-chat-root")) build();
    // Rewire nav "Support" links to open the chat (the app re-renders the nav,
    // so this is reapplied on every tick).
    var links = document.querySelectorAll("nav a");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (/^\s*support\s*$/i.test(a.textContent || "") && !a.__bkBound) {
        a.__bkBound = true;
        a.addEventListener("click", function (e) { e.preventDefault(); setOpen(true); });
      }
    }
  }

  ensure();
  setInterval(ensure, 1000);
})();
</script>
"""


def main() -> None:
    path = "dist/index.html"
    src = open(path).read()
    assert MARKER not in src, "support chat widget already present"
    idx = src.rfind("</body>")
    assert idx != -1, "closing body tag not found"
    out = src[:idx] + WIDGET + "\n" + src[idx:]
    open(path, "w").write(out)
    print("injected support chat widget;", path, "now", len(out), "bytes")


if __name__ == "__main__":
    main()
