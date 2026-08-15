// Password gate for the whole site.
//
// The password itself is never stored here — only a PBKDF2-SHA256 hash of it.
// The password is a 12-character random string (~60 bits of entropy), so the
// hash below stays safe to publish even though this repository is public.
//
// Setting an AGENT_HQ_PASSWORD environment variable on the Netlify site
// overrides the built-in hash, so the password can be changed without a code
// change (non-secret variables only — Netlify hides secret ones from edge
// functions).

const SALT_HEX = "67773b614320c2708f7c4215bccb3682";
const HASH_HEX = "6c7afba2a66c5bb5136372db1bc2279c76ad471ccf80f8e24b8c21c5cdce48af";
const ITERATIONS = 100_000;

const CHALLENGE = new Response("BARAKA Agent HQ — authentication required.", {
  status: 401,
  headers: {
    "WWW-Authenticate": 'Basic realm="Agent HQ", charset="UTF-8"',
    "Cache-Control": "no-store",
  },
});

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

// Length-independent comparison, so a wrong guess leaks no timing signal.
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function passwordMatches(candidate: string): Promise<boolean> {
  const override = Netlify.env.get("AGENT_HQ_PASSWORD");
  if (override) {
    const enc = new TextEncoder();
    return timingSafeEqual(enc.encode(candidate), enc.encode(override));
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(candidate),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(SALT_HEX), iterations: ITERATIONS },
    key,
    256,
  );
  return timingSafeEqual(new Uint8Array(bits), hexToBytes(HASH_HEX));
}

export default async (request: Request) => {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Basic ")) return CHALLENGE.clone();

  let candidate: string;
  try {
    const decoded = atob(auth.slice(6));
    const separator = decoded.indexOf(":");
    candidate = separator === -1 ? "" : decoded.slice(separator + 1);
  } catch {
    return CHALLENGE.clone();
  }

  if (await passwordMatches(candidate)) return; // continue to the requested asset
  return CHALLENGE.clone();
};

export const config = { path: "/*" };
