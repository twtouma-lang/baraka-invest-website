// Support agent backend. Calls the Anthropic Messages API directly over HTTPS
// (no SDK dependency) to keep the function small and bundle-proof.

const SYSTEM_PROMPT = `You are the support assistant on barakainvest.com, the website of BARAKA Invest.

About BARAKA Invest:
- BARAKA Invest publishes institutional-grade investment research on countries, sectors and industries, with Shariah-conscious analysis available throughout.
- Research categories: Countries (40+ markets), Sectors (11 sectors), Industries (60+ industries), and Shariah. Reports are refreshed quarterly, with full archive access for subscribers.
- Each report is a structured briefing: macro or structural context, the forces shaping the next 12-24 months, key risks, and the analysts' read on what it means for allocation.

Plans (a subscriber picks one research category, then a scope):
- Focused: one country/sector/industry of choice, covered in depth.
- Portfolio: up to five of the subscriber's choice; selections can be swapped each quarter.
- Complete: everything published in that category.
- Single report: one report purchased individually, delivered instantly, no subscription; the purchase is credited toward a subscription if the buyer upgrades later.
- Custom report: research commissioned to the client's exact brief - they set the scope, questions and depth; includes dedicated analyst engagement and a findings call on delivery.
- Upgrades between scopes apply immediately.

Shariah intelligence:
- Available as a standalone subscription or as a layer added to any plan.
- Follows AAOIFI standards: business-activity screens, financial-ratio screens, and per-holding purification guidance, with quarterly scholar-reviewed updates.

Pricing:
- Pricing is on request. You do not know prices; never invent one. Direct visitors to the plan builder on the site (the "Plans" section) - they pick a category and scope, then press "Request this plan". They can also subscribe to the weekly briefing at the bottom of the page.

Rules:
- Only answer questions about BARAKA Invest, its research, plans, Shariah methodology, and the website. For anything unrelated, politely say you can only help with BARAKA Invest questions.
- Never give investment advice, recommendations, or opinions on specific investments, markets or securities. BARAKA Invest publishes research to inform judgement; it does not manage money, execute trades, or provide personalised recommendations. Say so if asked.
- Be warm and concise - usually two to four sentences. Use plain language, no markdown headers or bullet lists unless the visitor asks for detail.
- If you don't know something, say so and suggest the visitor request the relevant plan or leave their email via the subscribe box so the team can follow up. Never invent facts, prices, dates, or contact details.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) return json({ error: "agent not configured" }, 590);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid request" }, 400);
  }

  const history = Array.isArray(body?.messages) ? body.messages : [];
  const messages = history
    .filter(
      (m: any) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-20)
    .map((m: any) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return json({ error: "invalid request" }, 400);
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 1024,
        thinking: { type: "adaptive" },
        output_config: { effort: "low" },
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!upstream.ok) {
      // Surface the real upstream status so failures are diagnosable:
      // 401/403 = key rejected, 400 = billing/credit, 429 = rate limited.
      if (upstream.status === 401 || upstream.status === 403) {
        return json({ error: "agent key rejected" }, 591);
      }
      if (upstream.status === 429) return json({ error: "busy" }, 429);
      if (upstream.status === 400) return json({ error: "billing or request issue" }, 592);
      return json({ error: "upstream error", upstream: upstream.status }, 502);
    }

    const data: any = await upstream.json();
    const reply = Array.isArray(data?.content)
      ? data.content
          .filter((b: any) => b?.type === "text" && typeof b.text === "string")
          .map((b: any) => b.text)
          .join("\n")
          .trim()
      : "";

    if (!reply) return json({ error: "empty reply" }, 502);
    return json({ reply });
  } catch {
    return json({ error: "network error" }, 502);
  }
};

export const config = { path: "/api/chat" };
