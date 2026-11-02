// Password gate for the whole site, applied at the edge before anything is
// served: the page, the sample PDFs and every other file stay behind it.
//
// Visitors without the unlock cookie get a branded password page. A correct
// password sets an HttpOnly cookie for 14 days and returns them to the page
// they asked for.
//
// The password is never stored here. The repository is public, so only
// PBKDF2-SHA256 hashes live in this file:
//   HASH           checks a submitted password.
//   COOKIE_DIGEST  checks the unlock cookie. The cookie value is derived from
//                  the password with a second salt, so it cannot be forged
//                  from anything in this file.
// To change the password, regenerate all four values and redeploy; every
// visitor is then asked for the new password:
//   node -e 'const c=require("crypto"),p=process.argv[1],n=10000,s=c.randomBytes(16),t=c.randomBytes(16),
//     k=c.pbkdf2Sync(p,t,n,32,"sha256").toString("hex");console.log(s.toString("hex"),
//     c.pbkdf2Sync(p,s,n,32,"sha256").toString("hex"),t.toString("hex"),
//     c.createHash("sha256").update(k).digest("hex"))' 'NEW-PASSWORD'
// prints SALT_HEX, HASH_HEX, COOKIE_SALT_HEX and COOKIE_DIGEST_HEX in that order.
//
// Runs after geo-block.ts (inline edge functions run in alphabetical order), so
// blocked jurisdictions still see their 451 notice first.

import type { Config, Context } from "https://edge.netlify.com";

const ITERATIONS = 10_000;
const SALT_HEX = "a76b241953f6109098c9ac0776d5427a";
const HASH_HEX = "282fe3abadeace6065116b12ae178adb5c2e64333bdcef357cc7cb924fe2213d";
const COOKIE_SALT_HEX = "76b9dedae454cd9f075fc8379947180e";
const COOKIE_DIGEST_HEX = "36d523d70b2e5ff5ab743a2400095825fc3f218f3b892837980bf09f29f1aa4d";

const COOKIE = "bk_gate";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days
const UNLOCK_PATH = "/__unlock";

const enc = new TextEncoder();

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(h: string): Uint8Array {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function pbkdf2(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations: ITERATIONS },
    key,
    256,
  );
  return hex(bits);
}

async function cookieIsValid(value: string | undefined): Promise<boolean> {
  if (!value || !/^[0-9a-f]{64}$/.test(value)) return false;
  return safeEqual(hex(await crypto.subtle.digest("SHA-256", enc.encode(value))), COOKIE_DIGEST_HEX);
}

// Only same-site paths, so the redirect after unlocking cannot be pointed elsewhere.
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function page(next: string, error: boolean): Response {
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>BARAKA Invest</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#00348C;font-family:Arial,Helvetica,sans-serif;padding:16px}
  .card{background:#fff;border-radius:10px;padding:44px 36px;width:360px;max-width:100%;
    box-shadow:0 20px 60px rgba(0,31,84,.4);text-align:center}
  h1{font-size:20px;letter-spacing:.12em;color:#00348C;margin:0 0 6px}
  h1 span{color:#0A9DDE}
  p{font-size:14px;color:#8593A6;margin:0 0 24px;line-height:1.5}
  .err{color:#C0392B;font-size:13px;min-height:16px;margin:0 0 10px}
  input{width:100%;padding:13px 14px;font-size:16px;border:1px solid #C7D0DE;border-radius:6px;
    outline:none;margin-bottom:12px}
  input:focus{border-color:#0A9DDE}
  button{width:100%;padding:13px;background:#FED608;color:#00348C;border:none;border-radius:6px;
    font-weight:700;font-size:15px;cursor:pointer}
  button:hover{background:#00348C;color:#fff}
</style>
</head><body>
<form class="card" method="post" action="${UNLOCK_PATH}">
  <h1>BARAKA <span>INVEST</span></h1>
  <p>This site is private.<br>Enter the password to continue.</p>
  <div class="err" role="alert">${error ? "Incorrect password &mdash; please try again." : ""}</div>
  <input type="hidden" name="next" value="${escapeAttr(next)}">
  <input name="password" type="password" placeholder="Password" autocomplete="current-password" required autofocus>
  <button type="submit">Enter</button>
</form>
</body></html>`;
  return new Response(html, {
    status: 401,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  if (url.pathname === UNLOCK_PATH && request.method === "POST") {
    let password = "";
    let next = "/";
    try {
      const form = await request.formData();
      password = String(form.get("password") ?? "");
      next = safeNext(String(form.get("next") ?? "/"));
    } catch {
      return page("/", true);
    }

    if (!safeEqual(await pbkdf2(password, SALT_HEX), HASH_HEX)) return page(next, true);

    const token = await pbkdf2(password, COOKIE_SALT_HEX);
    return new Response(null, {
      status: 303,
      headers: {
        location: next,
        "cache-control": "no-store",
        "set-cookie": `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  if (await cookieIsValid(context.cookies.get(COOKIE))) {
    if (url.pathname === UNLOCK_PATH) return Response.redirect(new URL("/", url), 303);
    return; // unlocked: serve the site as normal
  }

  // Locked. Remember where the visitor was headed, for a GET; anything else
  // (e.g. a form POST) just returns to the home page after unlocking.
  const next = request.method === "GET" && url.pathname !== UNLOCK_PATH ? url.pathname + url.search : "/";
  return page(next, false);
};

// Fail closed: if the gate errors, nothing is served.
export const config: Config = { path: "/*", onError: "fail" };
