// Country access control, applied at the edge before any page is served.
//
// Two lists, deliberately kept apart:
//   TIER_A  regulatory holds. Each market is removed from this list as counsel
//           clears it. Editing this list must never risk touching sanctions.
//   TIER_B  sanctions. Permanent policy; changed only on an OFAC change.
//
// Blocked visitors get 451 Unavailable For Legal Reasons with a short
// explanation, rather than a silent failure, so a legitimate prospect
// understands why and can still reach us.
//
// Note this restricts browsing, not solicitation, and any visitor using a VPN
// will present another country's address. It is a compliance signal, not a wall.

import type { Context } from "https://edge.netlify.com";

// Regulatory holds — reopened market by market as counsel clears each.
const TIER_A = new Set([
  // Named markets
  "AU", "CA", "SG", "SA", "AE", "GB", "IN", "BR",
  // EU / EEA
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO",
]);

// Sanctions — permanent. Do not edit when reopening a cleared market.
const TIER_B = new Set(["IR", "SY", "KP", "CU", "RU", "SD"]);

const page = (reason: string) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BARAKA Invest</title>
<style>
  :root { color-scheme: light; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #00348C; color: #ffffff; min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    font-family: Georgia, "Times New Roman", serif; padding: 24px;
  }
  .card { max-width: 540px; text-align: center; }
  h1 { font-size: 22px; letter-spacing: 0.18em; font-weight: 400; margin-bottom: 8px; }
  h1 span { color: #FED608; }
  .rule { width: 46px; height: 2px; background: #FED608; margin: 26px auto; }
  h2 { font-size: 19px; font-weight: 400; line-height: 1.45; margin-bottom: 18px; }
  p {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14.5px; line-height: 1.65; color: rgba(255,255,255,.82); margin-bottom: 14px;
  }
  a { color: #FED608; }
</style>
</head><body>
  <div class="card">
    <h1>BARAKA <span>INVEST</span></h1>
    <div class="rule"></div>
    <h2>Our research is not available in your location.</h2>
    <p>${reason}</p>
    <p>If you believe you are seeing this in error, or you are an institution
       enquiring from a jurisdiction we serve, write to
       <a href="mailto:sales@barakainvest.com">sales@barakainvest.com</a>.</p>
  </div>
</body></html>`;

const REGULATORY =
  "BARAKA Invest publishes investment research on a restricted basis. We do not " +
  "currently distribute it into this jurisdiction, and are expanding market by " +
  "market as each is cleared.";

const SANCTIONS =
  "We cannot make this material available in this jurisdiction under applicable " +
  "sanctions law.";

export default async (_request: Request, context: Context) => {
  const country = context.geo?.country?.code?.toUpperCase();

  // Unknown origin is allowed through: failing open avoids turning a missing
  // geo lookup into a blocked customer.
  if (!country) return;

  if (TIER_B.has(country)) {
    return new Response(page(SANCTIONS), {
      status: 451,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }

  if (TIER_A.has(country)) {
    return new Response(page(REGULATORY), {
      status: 451,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }
};

export const config = { path: "/*" };
