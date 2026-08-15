// Password gate for the whole site. The expected password is read from the
// AGENT_HQ_PASSWORD environment variable set on the Netlify site — it is
// never stored in this repository.
export default async (request: Request) => {
  const expected = Netlify.env.get("AGENT_HQ_PASSWORD");
  if (!expected) {
    return new Response("Access is not configured for this site.", { status: 403 });
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const pass = decoded.includes(":") ? decoded.slice(decoded.indexOf(":") + 1) : "";
      if (pass === expected) return; // continue to the requested asset
    } catch {
      // malformed header — fall through to the challenge
    }
  }

  return new Response("BARAKA Agent HQ — authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Agent HQ", charset="UTF-8"' },
  });
};

export const config = { path: "/*" };
