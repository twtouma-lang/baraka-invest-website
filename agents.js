/* ══════════════════════════════════════════════════════════════
   BARAKA Invest — Agent HQ
   One orchestrator (AMANA) + 8 specialist agents.
   You talk to AMANA; it routes each task to the right specialist.

   Live mode : direct browser → Anthropic API calls (your key,
               stored only in localStorage on this machine).
   Demo mode : no key set → simulated routing + canned replies.
   ══════════════════════════════════════════════════════════════ */
"use strict";

/* ──────────────────────────────────────────────
   1. BRAND CONTEXT (shared by every agent)
   ────────────────────────────────────────────── */
const BRAND = `
COMPANY CONTEXT — BARAKA INVEST
BARAKA Invest sells subscription investment research: institutional-grade reports
on countries, sectors and industries. Every report can carry a Shariah layer —
business-activity screens, financial-ratio screens and purification guidance
reviewed against AAOIFI standards. Plans are built from a research discipline
(Country / Sector / Industry / Shariah) plus a coverage scope, billed monthly.
Tagline: "Knowledge, amplified. Decisions, sharpened."
Audience: values-driven private investors, family offices, Islamic banks, wealth
managers and asset managers seeking Shariah-conscious intelligence.
Brand voice: premium, precise, principled. Colors: deep navy #00348C, cyan
#0A9DDE, gold #FED608. Fonts: Cinzel (display), Lato (body).
Business goal: grow recurring subscription revenue and market reach — ethically.
Never recommend interest-based (riba) financing or tactics that conflict with
the brand's Shariah-conscious positioning.`;

const STYLE = `
Keep responses focused and concrete. Use markdown headings and bullet lists.
Deliver work the user can use immediately (drafts, numbers, checklists, copy),
not descriptions of work. End with one short suggested next step.`;

/* ──────────────────────────────────────────────
   2. AGENT ROSTER
   ────────────────────────────────────────────── */
const AGENTS = {
  bayan: {
    name: "BAYAN", role: "Marketing Strategist", color: "#F59E0B",
    icon: "M4 15l6-6 4 4 6-8 M20 5h-5 M20 5v5",
    desc: "positioning, campaigns, offers, go-to-market",
    system: `You are BAYAN, the marketing strategist of BARAKA Invest.${BRAND}
You own positioning, campaign architecture, offers, pricing experiments, launch
plans and go-to-market strategy. Think like a growth-stage CMO: every plan names
the audience segment, the channel, the message, the offer, the budget tier and
the success metric. Prefer plans that can start this week with near-zero budget,
then scale.${STYLE}`,
    demo: `**Campaign sketch — "Four Lenses" launch (demo)**\n\n- **Audience:** values-driven investors + Islamic-finance professionals on LinkedIn\n- **Offer:** first month of one Country plan at 50% + free Shariah screen sample\n- **Channels:** LinkedIn thought-leadership (3×/wk), email nurture (5-part), 2 partner newsletters\n- **Metric:** 200 trial subscriptions in 30 days\n\n*Next step: ask QALAM to draft the announcement post and email #1.*`
  },
  qalam: {
    name: "QALAM", role: "Copy & Content", color: "#14B8A6",
    icon: "M12 19l7-7 3 3-7 7-3-3z M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z M2 2l7.586 7.586 M11 11a2 2 0 1 0 0.001-3.999A2 2 0 0 0 11 11z",
    desc: "landing copy, emails, articles, ad copy",
    system: `You are QALAM, the copywriter and content lead of BARAKA Invest.${BRAND}
You write landing pages, emails, ads, LinkedIn posts, and research-note articles
in the brand voice: premium, precise, principled — never hype-y. Deliver finished
copy, ready to paste, with headline options and subject-line variants where
relevant. Match tone to channel; keep claims honest and verifiable.${STYLE}`,
    demo: `**LinkedIn post draft (demo)**\n\n> Most research makes you choose between insight and principle.\n> Ours doesn't.\n>\n> Every BARAKA Invest report — country, sector or industry — can carry a full Shariah layer: activity screens, ratio screens, purification guidance. Reviewed against AAOIFI standards.\n>\n> Knowledge, amplified. Decisions, sharpened.\n> → barakainvest.com\n\n*Next step: want 3 subject-line variants for the launch email?*`
  },
  sada: {
    name: "SADA", role: "Social Media", color: "#EC4899",
    icon: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
    desc: "calendars, hooks, platform strategy",
    system: `You are SADA, the social media manager of BARAKA Invest.${BRAND}
You own the content calendar, platform strategy (LinkedIn first, then X and
Instagram), hooks, hashtags, engagement tactics and community building. Turn the
firm's research themes into scroll-stopping, credible posts. Deliver calendars
as tables (day / platform / format / hook / CTA). No engagement-bait; authority
and trust are the currency.${STYLE}`,
    demo: `**7-day starter calendar (demo)**\n\n- **Mon · LinkedIn:** carousel — "4 lenses we run on every market"\n- **Wed · LinkedIn:** text post — one surprising stat from a country report\n- **Thu · X:** thread — "How Shariah screening actually works (AAOIFI, simply)"\n- **Fri · LinkedIn:** founder note — why principle and performance aren't a trade-off\n- **Sun · IG:** quote card — tagline + navy/gold visual\n\n*Next step: ask QALAM to write the Monday carousel copy.*`
  },
  nujum: {
    name: "NUJUM", role: "SEO & Growth", color: "#8B5CF6",
    icon: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35 M8 11h6 M11 8v6",
    desc: "keywords, funnels, CRO, analytics",
    system: `You are NUJUM, the SEO and growth engineer of BARAKA Invest.${BRAND}
You own organic growth: keyword strategy (e.g. "halal investing research",
"shariah compliant stocks screening"), content clusters, on-page and technical
SEO, conversion-rate optimization of the plan builder, referral loops and
analytics. Recommendations must be specific: exact keywords, page titles, meta
descriptions, internal links, experiment designs with hypotheses.${STYLE}`,
    demo: `**Quick SEO wins (demo)**\n\n1. Target cluster: *"halal investing research"* (head) + long-tails: "AAOIFI stock screening explained", "shariah compliant sector analysis".\n2. Publish 4 pillar articles from existing report intros — each links to the plan builder.\n3. Add FAQ schema to the FAQ section for rich results.\n4. CRO test: move the plan builder CTA above the fold on mobile.\n\n*Next step: want the full 90-day content cluster map?*`
  },
  mizan: {
    name: "MIZAN", role: "Bookkeeping", color: "#22C55E",
    icon: "M12 3v18 M5 7h14 M7 7l-3 6a3.5 3.5 0 0 0 6 0l-3-6z M17 7l-3 6a3.5 3.5 0 0 0 6 0l-3-6z",
    desc: "ledgers, invoicing, monthly close",
    system: `You are MIZAN, the bookkeeping and accounting agent of BARAKA Invest.${BRAND}
You handle the books of a subscription-research business: chart of accounts,
transaction categorization, invoicing, deferred-revenue treatment of annual
subscriptions, expense policy, monthly close checklists, and zakat-aware record
keeping. Be rigorous and conservative. You are not a licensed accountant: label
outputs as drafts for review, and say clearly when a licensed professional or
local tax adviser is required.${STYLE}`,
    demo: `**Monthly close checklist — draft (demo)**\n\n1. Reconcile bank + Stripe payouts to the ledger\n2. Recognize the month's portion of deferred subscription revenue\n3. Categorize expenses (research tools, hosting, marketing, contractors)\n4. Review AR: unpaid invoices > 15 days → RABT follow-up\n5. Snapshot MRR, churn, cash on hand for HISAB\n\n*Draft for review — confirm treatment with a licensed accountant. Next step: want a starter chart of accounts?*`
  },
  hisab: {
    name: "HISAB", role: "Finance & CFO", color: "#EAB308",
    icon: "M4 4h16v16H4z M8 8h8 M8 12h4 M14 12h2 M8 16h2 M12 16h4",
    desc: "forecasts, pricing, unit economics",
    system: `You are HISAB, the finance and CFO agent of BARAKA Invest.${BRAND}
You own forecasts, unit economics (CAC, LTV, churn, payback), pricing models,
runway planning, and investor-grade reporting for a subscription business.
Show your arithmetic in small tables, state assumptions explicitly, and give a
base / upside / downside view where useful. You are not a licensed financial
adviser; frame outputs as analysis drafts for review.${STYLE}`,
    demo: `**Unit-economics frame (demo)**\n\nAssume: plan price $49/mo, gross margin 88%, monthly churn 4%.\n\n- **LTV** ≈ 49 × 0.88 ÷ 0.04 ≈ **$1,078**\n- Healthy CAC ceiling (LTV:CAC ≥ 3) ≈ **$359**\n- At $120 CAC → payback ≈ **2.8 months**\n\n*Analysis draft — replace assumptions with real numbers. Next step: share actual price points and I'll build the 12-month forecast.*`
  },
  rabt: {
    name: "RABT", role: "Sales & Outreach", color: "#0EA5E9",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    desc: "lead gen, sequences, partnerships",
    system: `You are RABT, the sales and outreach agent of BARAKA Invest.${BRAND}
You own lead generation, outreach sequences (email + LinkedIn), proposal drafts,
partnership pitches (Islamic banks, wealth platforms, fintechs), and follow-up
cadences. Write sequences ready to send: subject, body, timing, and the one
clear CTA. Qualify leads by segment (individual / family office / institution)
and tailor the pitch to each. Respectful persistence, never spam.${STYLE}`,
    demo: `**Cold outreach — Islamic bank partnerships (demo)**\n\n**Email 1 (day 0)** — subj: *Research your clients will actually trust*\nShort intro, one insight from a recent report, ask for 20 minutes.\n\n**Email 2 (day 4)** — subj: *The Shariah layer, done properly*\nAAOIFI-aligned screening angle + white-label option.\n\n**Email 3 (day 10)** — breakup note, leave a sample report.\n\n*Next step: tell me the target institution and I'll personalize the sequence.*`
  },
  rasid: {
    name: "RASID", role: "Market Intelligence", color: "#EF4444",
    icon: "M12 2a10 10 0 1 0 10 10 M12 8a4 4 0 1 0 4 4 M12 12l7-7 M17 5h2.5 M19 3v2.5",
    desc: "competitor scans, trends, sizing",
    system: `You are RASID, the market-intelligence agent of BARAKA Invest.${BRAND}
You scan the competitive landscape (Islamic-finance research providers, halal
stock screeners, conventional research houses), spot trends, size opportunities
and produce SWOTs and battle cards. Structure findings as: landscape → gaps →
implications → recommended moves. Be candid about uncertainty and about what
would need first-hand verification.${STYLE}`,
    demo: `**Landscape snapshot (demo)**\n\n- **Halal screener apps:** strong retail reach, thin analysis → gap: depth\n- **Conventional research houses:** deep analysis, no Shariah layer → gap: principle\n- **BARAKA wedge:** institutional-grade depth **plus** AAOIFI-reviewed screening — few sit in that corner\n\n**Implication:** lead marketing with the "both/and" wedge; price above screeners, below big houses.\n\n*Next step: name 2–3 competitors you watch and I'll build battle cards.*`
  }
};

const ORCHESTRATOR = {
  name: "AMANA", color: "#38d7ff",
  system: `You are AMANA, the orchestrator and chief of staff of BARAKA Invest's
agent team.${BRAND}
Your team (route with the "delegate" tool):
- bayan — marketing strategy, campaigns, offers, go-to-market
- qalam — copywriting: landing pages, emails, ads, articles, posts
- sada  — social media calendars, hooks, platform strategy
- nujum — SEO, growth loops, funnels, CRO, analytics
- mizan — bookkeeping, invoicing, categorization, monthly close
- hisab — finance: forecasts, pricing models, unit economics, runway
- rabt  — sales, outreach sequences, proposals, partnerships
- rasid — market intelligence, competitor scans, trend research

Decide per message:
1. If the request clearly belongs to one specialist, call the delegate tool
   ONCE with a complete, self-contained brief (include any needed context from
   the conversation — the specialist sees the chat history but your brief is
   the task spec).
2. If it spans several specialists, delegate to the single best one for the
   FIRST concrete deliverable and say what to ask next.
3. Answer directly (no tool) only for greetings, questions about the team or
   company, or when coordinating/summarizing across past work.
Keep direct answers short. The conversation history may contain specialist
replies; treat them as your team's prior work.`
};

/* Routing tool given to AMANA */
const DELEGATE_TOOL = {
  name: "delegate",
  description: "Route the user's request to the best specialist agent on the Baraka Invest team. Call at most once per user message.",
  input_schema: {
    type: "object",
    properties: {
      agent: { type: "string", enum: Object.keys(AGENTS), description: "The specialist to hand this task to" },
      brief: { type: "string", description: "A complete, self-contained task brief for the specialist, folding in relevant context from the conversation" },
      note:  { type: "string", description: "One short sentence, shown to the user, on why this specialist" }
    },
    required: ["agent", "brief"]
  }
};

/* Suggested missions (bottom cards) */
const MISSIONS = [
  { icon: "🚀", title: "Launch Campaign", agent: "bayan",
    prompt: "Design a 30-day launch campaign for our Country coverage subscription plan, with near-zero budget to start." },
  { icon: "📚", title: "Content Engine", agent: "sada",
    prompt: "Build me a 2-week social media calendar that turns our research themes into LinkedIn-first content." },
  { icon: "📒", title: "Monthly Close", agent: "mizan",
    prompt: "Set up a monthly bookkeeping close process for our subscription business, including deferred revenue." },
  { icon: "📡", title: "Competitor Scan", agent: "rasid",
    prompt: "Map the competitive landscape for Shariah-conscious investment research and tell me where our wedge is." }
];

/* ──────────────────────────────────────────────
   3. STATE + SETTINGS
   ────────────────────────────────────────────── */
const LS_KEY = "baraka_agents_key";
const LS_MODEL = "baraka_agents_model";
const state = {
  history: [],          // [{role:"user"|"assistant", content:string}]
  busy: false,
  missions: 0,
  apiKey: localStorage.getItem(LS_KEY) || "",
  model: localStorage.getItem(LS_MODEL) || "claude-opus-5"
};

/* ──────────────────────────────────────────────
   4. DOM BUILD — nodes, links, cards
   ────────────────────────────────────────────── */
const stage = document.getElementById("stage");
const linksSvg = document.getElementById("links");
const coreEl = document.getElementById("core");
const chatEl = document.getElementById("chat");
const logEl = document.getElementById("chat-log");
const busyEl = document.getElementById("busyline");
const inputEl = document.getElementById("command-input");
const sendBtn = document.getElementById("command-send");

const nodeEls = {};
const linkEls = {};

function buildNodes() {
  const ids = Object.keys(AGENTS);
  ids.forEach((id) => {
    const a = AGENTS[id];
    const el = document.createElement("div");
    el.className = "agent";
    el.id = "agent-" + id;
    el.title = `${a.name} — ${a.desc}`;
    el.innerHTML = `
      <div class="agent-hex" style="background:linear-gradient(160deg, ${a.color}, ${shade(a.color, -35)})">
        <svg viewBox="0 0 24 24"><path d="${a.icon}"/></svg>
      </div>
      <div class="agent-glow" style="background:${a.color}"></div>
      <div class="agent-name">${a.name}</div>
      <div class="agent-role">${a.role}</div>
      <div class="agent-status" id="status-${id}">◌ idle</div>`;
    el.addEventListener("click", () => {
      inputEl.value = `Ask ${a.name} (${a.role.toLowerCase()}): `;
      inputEl.focus();
    });
    stage.appendChild(el);
    nodeEls[id] = el;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    linksSvg.appendChild(line);
    linkEls[id] = line;
  });
}

function layout() {
  const w = window.innerWidth, h = window.innerHeight;
  const mobile = w < 760;
  const cx = w / 2, cy = h / 2 - (mobile ? 60 : 40);
  const r = Math.min(w, h) * (mobile ? 0.40 : 0.33);
  const vf = mobile ? 1.0 : 0.68;                             // ellipse on desktop keeps bottom node above the dock
  const ids = Object.keys(AGENTS);
  ids.forEach((id, i) => {
    const ang = (i / ids.length) * Math.PI * 2 - Math.PI / 2; // start at top
    const x = cx + r * Math.cos(ang);
    const y = cy + r * Math.sin(ang) * vf;
    nodeEls[id].style.left = x + "px";
    nodeEls[id].style.top = y + "px";
    const line = linkEls[id];
    line.setAttribute("x1", cx); line.setAttribute("y1", cy);
    line.setAttribute("x2", x);  line.setAttribute("y2", y - 8);
  });
}

function buildMissions() {
  const wrap = document.getElementById("taskcards");
  MISSIONS.forEach((m) => {
    const a = AGENTS[m.agent];
    const card = document.createElement("button");
    card.type = "button";
    card.className = "taskcard";
    card.innerHTML = `<b><i>${m.icon}</i>${m.title}</b><span>${m.prompt}</span><em style="color:${a.color}">→ ${a.name}</em>`;
    card.addEventListener("click", () => { if (!state.busy) submit(m.prompt); });
    wrap.appendChild(card);
  });
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

/* ──────────────────────────────────────────────
   5. STARFIELD
   ────────────────────────────────────────────── */
function starfield() {
  const cv = document.getElementById("stars");
  const ctx = cv.getContext("2d");
  let stars = [];
  function reset() {
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    const n = Math.floor((cv.width * cv.height) / 9000);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * cv.width, y: Math.random() * cv.height,
      r: Math.random() * 1.2 + 0.2, p: Math.random() * Math.PI * 2,
      s: 0.4 + Math.random() * 1.2
    }));
  }
  function tick(t) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const st of stars) {
      const a = 0.25 + 0.55 * Math.abs(Math.sin(t / 1600 * st.s + st.p));
      ctx.fillStyle = `rgba(190,215,255,${a})`;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", () => { reset(); layout(); });
  reset();
  requestAnimationFrame(tick);
}

/* ──────────────────────────────────────────────
   6. UI HELPERS — chat log, status, markdown
   ────────────────────────────────────────────── */
function openChat() { chatEl.classList.remove("chat-hidden"); }

function addMsg(kind, who, color, html) {
  const div = document.createElement("div");
  div.className = "msg " + kind;
  div.innerHTML = `
    <div class="msg-meta"><span class="msg-dot" style="background:${color}"></span>
    <span class="msg-who">${who}</span></div>
    <div class="msg-body">${html}</div>`;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
  return div.querySelector(".msg-body");
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* tiny markdown renderer: headings, bold, italics, code, lists, quotes */
function md(src) {
  const codeBlocks = [];
  let s = esc(src).replace(/```([\s\S]*?)```/g, (_, c) => {
    codeBlocks.push(`<pre><code>${c.replace(/^\w*\n/, "")}</code></pre>`);
    return `@@CB${codeBlocks.length - 1}@@`;
  });
  s = s
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, "$1<em>$2</em>");
  const lines = s.split("\n");
  let out = "", inUl = false, inOl = false, inQ = false;
  const close = () => {
    if (inUl) { out += "</ul>"; inUl = false; }
    if (inOl) { out += "</ol>"; inOl = false; }
    if (inQ)  { out += "</blockquote>"; inQ = false; }
  };
  for (const ln of lines) {
    const h = ln.match(/^(#{1,3})\s+(.*)/);
    const ul = ln.match(/^\s*[-•]\s+(.*)/);
    const ol = ln.match(/^\s*\d+[.)]\s+(.*)/);
    const q  = ln.match(/^\s*&gt;\s?(.*)/);
    if (h) { close(); out += `<h${h[1].length + 1}>${h[2]}</h${h[1].length + 1}>`; }
    else if (ul) { if (inOl) { out += "</ol>"; inOl = false; } if (inQ) { out += "</blockquote>"; inQ = false; } if (!inUl) { out += "<ul>"; inUl = true; } out += `<li>${ul[1]}</li>`; }
    else if (ol) { if (inUl) { out += "</ul>"; inUl = false; } if (inQ) { out += "</blockquote>"; inQ = false; } if (!inOl) { out += "<ol>"; inOl = true; } out += `<li>${ol[1]}</li>`; }
    else if (q)  { if (inUl) { out += "</ul>"; inUl = false; } if (inOl) { out += "</ol>"; inOl = false; } if (!inQ) { out += "<blockquote>"; inQ = true; } out += `${q[1]}<br>`; }
    else if (ln.trim() === "") { close(); }
    else { close(); out += `<p>${ln}</p>`; }
  }
  close();
  return out.replace(/@@CB(\d+)@@/g, (_, i) => codeBlocks[+i]);
}

function setAgentActive(id, on) {
  const el = nodeEls[id];
  if (!el) return;
  el.classList.toggle("agent-active", on);
  linkEls[id].classList.toggle("link-active", on);
  document.getElementById("status-" + id).textContent = on ? "● working" : "◌ idle";
  refreshStats();
}

function setCoreBusy(on, label) {
  coreEl.classList.toggle("core-busy", on);
  document.getElementById("core-status").textContent =
    label || (on ? "orchestrating…" : "orchestrator · online");
}

function setBusy(on, text) {
  state.busy = on;
  sendBtn.disabled = on;
  busyEl.classList.toggle("busy-hidden", !on);
  busyEl.textContent = text || "";
}

function refreshStats() {
  document.getElementById("stat-missions").textContent = state.missions;
  document.getElementById("stat-active").textContent =
    document.querySelectorAll(".agent-active").length;
  const live = !!state.apiKey;
  document.getElementById("stat-mode").textContent = live ? "LIVE" : "DEMO";
  document.getElementById("stat-model").textContent = live ? state.model : "no api key";
}

/* ──────────────────────────────────────────────
   7. ANTHROPIC API CLIENT (raw fetch — static site, no build step)
   ────────────────────────────────────────────── */
const API_URL = "https://api.anthropic.com/v1/messages";

function apiHeaders() {
  return {
    "content-type": "application/json",
    "x-api-key": state.apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  };
}

async function apiError(res) {
  let msg = `API error ${res.status}`;
  try {
    const j = await res.json();
    if (j.error && j.error.message) msg += ` — ${j.error.message}`;
  } catch (_) { /* keep default */ }
  if (res.status === 401) msg += " (check your API key in ⚙ Settings)";
  if (res.status === 429) msg += " (rate limited — wait a moment and retry)";
  return new Error(msg);
}

/* Orchestrator turn: non-streaming, with the delegate tool.
   Returns {kind:"delegate", agent, brief, note} or {kind:"answer", text}. */
async function callOrchestrator() {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({
      model: state.model,
      max_tokens: 6000, // thinking + text share this cap on Claude Opus 5
      system: ORCHESTRATOR.system,
      tools: [DELEGATE_TOOL],
      messages: state.history
    })
  });
  if (!res.ok) throw await apiError(res);
  const data = await res.json();
  if (data.stop_reason === "refusal") {
    return { kind: "answer", text: "I can't help with that request." };
  }
  const tool = (data.content || []).find((b) => b.type === "tool_use" && b.name === "delegate");
  if (tool && tool.input && AGENTS[tool.input.agent]) {
    return { kind: "delegate", agent: tool.input.agent, brief: tool.input.brief || "", note: tool.input.note || "" };
  }
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  return { kind: "answer", text: text || "…" };
}

/* Specialist turn: streaming SSE into the chat bubble. Returns full text. */
async function callSpecialist(id, brief, bodyEl) {
  const a = AGENTS[id];
  const messages = state.history.slice();
  if (brief) messages.push({ role: "user", content: `Task brief from AMANA (orchestrator): ${brief}` });

  const res = await fetch(API_URL, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({
      model: state.model,
      max_tokens: 16000,
      stream: true,
      system: a.system,
      messages
    })
  });
  if (!res.ok) throw await apiError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "", full = "", stop = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop();
    for (const part of parts) {
      const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      let ev;
      try { ev = JSON.parse(dataLine.slice(5)); } catch (_) { continue; }
      if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") {
        full += ev.delta.text;
        bodyEl.innerHTML = md(full) + '<span class="msg-cursor"></span>';
        logEl.scrollTop = logEl.scrollHeight;
      } else if (ev.type === "message_delta" && ev.delta && ev.delta.stop_reason) {
        stop = ev.delta.stop_reason;
      } else if (ev.type === "error") {
        throw new Error(ev.error && ev.error.message ? ev.error.message : "stream error");
      }
    }
  }
  if (stop === "refusal" && !full) full = "I can't help with that request.";
  if (stop === "max_tokens") full += "\n\n*(response reached the length limit)*";
  bodyEl.innerHTML = md(full || "…");
  return full;
}

/* ──────────────────────────────────────────────
   8. DEMO MODE (no API key)
   ────────────────────────────────────────────── */
const DEMO_ROUTES = [
  { agent: "mizan", words: ["bookkeep", "invoice", "ledger", "expense", "close", "reconcil", "account", "categoriz"] },
  { agent: "hisab", words: ["forecast", "pricing", "price", "unit econ", "cac", "ltv", "runway", "budget", "mrr", "revenue model", "cash"] },
  { agent: "qalam", words: ["copy", "write", "email", "landing", "article", "headline", "post draft", "blog", "ad "] },
  { agent: "sada",  words: ["social", "calendar", "linkedin", "instagram", "tiktok", "twitter", "hashtag", "content plan"] },
  { agent: "nujum", words: ["seo", "keyword", "google", "traffic", "funnel", "conversion", "analytics", "growth"] },
  { agent: "rabt",  words: ["sales", "outreach", "lead", "proposal", "partner", "pitch", "follow-up", "prospect"] },
  { agent: "rasid", words: ["competitor", "market research", "landscape", "trend", "swot", "intel", "scan"] },
  { agent: "bayan", words: ["campaign", "launch", "marketing", "strategy", "brand", "offer", "go-to-market", "gtm", "positioning"] }
];

function demoRoute(text) {
  const t = text.toLowerCase();
  for (const r of DEMO_ROUTES) {
    if (r.words.some((w) => t.includes(w))) return r.agent;
  }
  return null;
}

function typeInto(bodyEl, text, done) {
  let i = 0;
  const step = () => {
    i = Math.min(text.length, i + 3 + Math.floor(Math.random() * 4));
    bodyEl.innerHTML = md(text.slice(0, i)) + (i < text.length ? '<span class="msg-cursor"></span>' : "");
    logEl.scrollTop = logEl.scrollHeight;
    if (i < text.length) setTimeout(step, 12);
    else done();
  };
  step();
}

/* ──────────────────────────────────────────────
   9. MAIN FLOW
   ────────────────────────────────────────────── */
async function submit(text) {
  text = (text || "").trim();
  if (!text || state.busy) return;
  inputEl.value = "";
  openChat();
  addMsg("msg-user", "You", "#9db6ff", md(text));
  state.history.push({ role: "user", content: text });
  if (state.history.length > 24) state.history = state.history.slice(-24);

  setBusy(true, "AMANA is routing…");
  setCoreBusy(true);

  try {
    if (state.apiKey) await liveTurn(text);
    else await demoTurn(text);
    state.missions++;
  } catch (err) {
    addMsg("msg-error", "SYSTEM", "#ff7b7b", esc(err.message || String(err)));
  } finally {
    Object.keys(AGENTS).forEach((id) => setAgentActive(id, false));
    setCoreBusy(false);
    setBusy(false);
    refreshStats();
    inputEl.focus();
  }
}

async function liveTurn() {
  const decision = await callOrchestrator();

  if (decision.kind === "answer") {
    addMsg("", "AMANA", ORCHESTRATOR.color, md(decision.text));
    state.history.push({ role: "assistant", content: decision.text });
    return;
  }

  const a = AGENTS[decision.agent];
  const note = decision.note || `Routing to ${a.name} — ${a.role.toLowerCase()}.`;
  addMsg("msg-note", "AMANA → " + a.name, ORCHESTRATOR.color, esc(note));
  setCoreBusy(true, `routing → ${a.name}`);
  setAgentActive(decision.agent, true);
  setBusy(true, `${a.name} is working…`);

  const bodyEl = addMsg("", a.name, a.color, '<span class="msg-cursor"></span>');
  const text = await callSpecialist(decision.agent, decision.brief, bodyEl);
  state.history.push({ role: "assistant", content: `[${a.name} · ${a.role}] ${text}` });
}

async function demoTurn(text) {
  await wait(700);
  const routed = demoRoute(text);

  if (!routed) {
    const reply = `**AMANA here.** I coordinate the Baraka Invest agent team — marketing (BAYAN, QALAM, SADA, NUJUM), finance (MIZAN, HISAB) and growth (RABT, RASID).\n\nAsk for something concrete — a campaign, copy, a forecast, a bookkeeping process — and I'll route it to the right specialist.\n\n*Demo mode: add your Anthropic API key in ⚙ Settings for real answers.*`;
    const bodyEl = addMsg("", "AMANA", ORCHESTRATOR.color, "");
    await new Promise((r) => typeInto(bodyEl, reply, r));
    state.history.push({ role: "assistant", content: reply });
    return;
  }

  const a = AGENTS[routed];
  addMsg("msg-note", "AMANA → " + a.name, ORCHESTRATOR.color,
    esc(`This one's for ${a.name} — ${a.role.toLowerCase()}.`));
  setCoreBusy(true, `routing → ${a.name}`);
  setAgentActive(routed, true);
  setBusy(true, `${a.name} is working… (demo)`);
  await wait(900);

  const reply = a.demo + `\n\n*Demo mode — add your API key in ⚙ Settings for tailored, real output.*`;
  const bodyEl = addMsg("", a.name, a.color, "");
  await new Promise((r) => typeInto(bodyEl, reply, r));
  state.history.push({ role: "assistant", content: `[${a.name} · ${a.role}] ${a.demo}` });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ──────────────────────────────────────────────
   10. SETTINGS + WIRING
   ────────────────────────────────────────────── */
function wire() {
  document.getElementById("commandbar").addEventListener("submit", (e) => {
    e.preventDefault();
    submit(inputEl.value);
  });
  document.getElementById("btn-chat").addEventListener("click", () =>
    chatEl.classList.toggle("chat-hidden"));
  document.getElementById("btn-chat-close").addEventListener("click", () =>
    chatEl.classList.add("chat-hidden"));

  const modal = document.getElementById("modal");
  const inKey = document.getElementById("in-key");
  const inModel = document.getElementById("in-model");
  document.getElementById("btn-settings").addEventListener("click", () => {
    inKey.value = state.apiKey;
    inModel.value = state.model;
    modal.classList.remove("modal-hidden");
  });
  document.getElementById("btn-modal-save").addEventListener("click", () => {
    state.apiKey = inKey.value.trim();
    state.model = inModel.value;
    if (state.apiKey) localStorage.setItem(LS_KEY, state.apiKey);
    else localStorage.removeItem(LS_KEY);
    localStorage.setItem(LS_MODEL, state.model);
    modal.classList.add("modal-hidden");
    refreshStats();
  });
  document.getElementById("btn-key-clear").addEventListener("click", () => {
    inKey.value = "";
    state.apiKey = "";
    localStorage.removeItem(LS_KEY);
    refreshStats();
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("modal-hidden");
  });

  coreEl.addEventListener("click", () => {
    openChat();
    if (!logEl.children.length) {
      addMsg("", "AMANA", ORCHESTRATOR.color, md(
        `**Assalamu alaikum — AMANA online.** I run your agent team:\n\n- **Marketing:** BAYAN · QALAM · SADA · NUJUM\n- **Finance:** MIZAN · HISAB\n- **Growth:** RABT · RASID\n\nTell me what you need — I'll route it to the right specialist.`));
    }
  });
}

/* ──────────────────────────────────────────────
   11. BOOT
   ────────────────────────────────────────────── */
buildNodes();
layout();
buildMissions();
starfield();
wire();
refreshStats();
inputEl.focus();
