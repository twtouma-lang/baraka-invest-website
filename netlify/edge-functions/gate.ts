// Site-wide password gate while the site is under construction.
// Remove the [[edge_functions]] entry in netlify.toml (or this file) to unlock.

const PASSWORD = "BARAKAINVEST65";
const COOKIE = "bk_gate=7f3a91c2e8d4; Path=/; Max-Age=1209600; HttpOnly; Secure; SameSite=Lax";
const COOKIE_MATCH = "bk_gate=7f3a91c2e8d4";

const page = (message = "") => `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BARAKA Invest</title>
<style>
  body{margin:0;background:#00348C;font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#3D4756}
  .card{background:#fff;border-radius:10px;padding:44px 36px;width:340px;max-width:88vw;box-shadow:0 20px 60px rgba(0,31,84,.4);text-align:center}
  h1{font-size:20px;letter-spacing:.12em;color:#00348C;margin:0 0 6px}
  h1 span{color:#0A9DDE}
  p{font-size:14px;color:#8593A6;margin:0 0 26px}
  input{width:100%;box-sizing:border-box;padding:13px 14px;font-size:15px;border:1px solid #C7D0DE;border-radius:6px;outline:none;margin-bottom:14px}
  input:focus{border-color:#0A9DDE}
  button{width:100%;padding:13px;background:#FED608;color:#00348C;border:none;border-radius:6px;font-weight:700;font-size:15px;cursor:pointer}
  button:hover{background:#00348C;color:#fff}
  .err{color:#C0392B;font-size:13px;margin:0 0 14px}
</style>
</head><body>
<div class="card">
  <h1>BARAKA <span>INVEST</span></h1>
  <p>This site is not yet public.<br>Enter the password to continue.</p>
  ${message ? `<div class="err">${message}</div>` : ""}
  <form method="POST" action="/__gate">
    <input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password">
    <button type="submit">Enter</button>
  </form>
</div>
</body></html>`;

export default async (request: Request, context: any) => {
  const cookies = request.headers.get("cookie") || "";
  if (cookies.includes(COOKIE_MATCH)) return context.next();

  const url = new URL(request.url);
  if (request.method === "POST" && url.pathname === "/__gate") {
    let submitted = "";
    try {
      const form = await request.formData();
      submitted = String(form.get("password") || "");
    } catch {
      /* fall through to error page */
    }
    if (submitted === PASSWORD) {
      return new Response(null, {
        status: 303,
        headers: { location: "/", "set-cookie": COOKIE },
      });
    }
    return new Response(page("Incorrect password — please try again."), {
      status: 401,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return new Response(page(), {
    status: 401,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
};

export const config = { path: "/*" };
