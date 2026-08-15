# BARAKA Invest — Website

Marketing site for BARAKA Invest: institutional-grade research on countries,
sectors and industries, with Shariah-conscious analysis.

## What's in here

```
baraka-invest-website/
├── index.html          ← the whole page lives here
├── assets/
│   ├── img/            ← logo / graphics
│   ├── fonts/          ← the web fonts the site uses
│   └── js/             ← scripts powering the interactive bits
└── README.md
```

## Agent HQ (`agent-hq/` — standalone & private)

A separate mission-control app, deliberately **not linked from the website**.
It deploys to its own password-protected Netlify site, for the owner only.
A central orchestrator agent (**AMANA**) routes your requests to 8 specialist
AI agents arranged around it, all briefed on BARAKA Invest:

| Agent | Specialty |
|---|---|
| BAYAN | Marketing strategy, campaigns, go-to-market |
| QALAM | Copywriting: landing pages, emails, ads, articles |
| SADA  | Social media calendars and platform strategy |
| NUJUM | SEO, growth loops, funnels, CRO |
| MIZAN | Bookkeeping: ledgers, invoicing, monthly close |
| HISAB | Finance/CFO: forecasts, pricing, unit economics |
| RABT  | Sales, outreach sequences, partnerships |
| RASID | Market intelligence, competitor scans |

You type one message to AMANA; it either answers or delegates to the right
specialist (you'll see the routing animate on the map).

**Live mode** — open ⚙ Settings on the page and paste your Anthropic API key
(get one at https://platform.claude.com). The key is stored only in your
browser's localStorage and calls go straight from your browser to the Claude
API. Keep the site password-protected and the key to yourself.

**Demo mode** — with no key set, the HQ simulates routing with canned replies
so you can see how it works.

**Access** — every request is challenged for a password by the edge function
in `agent-hq/netlify/edge-functions/auth.ts`. It stores only a PBKDF2-SHA256
hash of the password, never the password itself, so the hash is safe to keep
in this public repository. To change the password, either set a (non-secret)
`AGENT_HQ_PASSWORD` variable on the Netlify site, which overrides the hash,
or replace `SALT_HEX`/`HASH_HEX` with a new derivation:

```shell
python3 -c "import getpass,hashlib,secrets,binascii; p=getpass.getpass(); s=secrets.token_bytes(16); print('SALT_HEX', binascii.hexlify(s).decode()); print('HASH_HEX', binascii.hexlify(hashlib.pbkdf2_hmac('sha256', p.encode(), s, 100000, 32)).decode())"
```

Pick a long random password — a short or guessable one can be recovered from
a published hash.

Files: `agent-hq/index.html`, `agent-hq/agents.css`, `agent-hq/agents.js`
(agent prompts and the roster live at the top of `agents.js` — edit them
there to tune or add agents). Deployment: `.github/workflows/netlify-deploy.yml`
copies the site fonts into `agent-hq/`, uploads that folder to Netlify, then
checks that the live site still refuses anonymous visitors.

## Sections on the page

- Hero — "Knowledge, amplified. Decisions, sharpened."
- Coverage — the four research disciplines
- Shariah Intelligence — screening and purification guidance
- How it works — subscription to conviction
- Subscriptions — the plan builder (discipline + scope)
- Testimonials
- FAQ

## How to view it locally

Serving the folder is more reliable than double-clicking `index.html`, because
the page loads fonts and scripts. From inside this folder, run:

```bash
python3 -m http.server 8000
```

Then open **http://localhost:8000** in your browser.

## Ideas for making it more complex

- Turn the plan builder into a real quote/checkout flow
- Add a working "Request this plan" form that emails the team
- Build out the report catalogue as its own browsable page
- Add a subscriber login area for delivered reports
- Split the single page into multiple routes (Coverage, Shariah, Pricing, FAQ)
- Add a blog or research-notes section

## Deploying it live (free options)

- **GitHub Pages** — Settings → Pages, from the `main` branch
- **Netlify** or **Vercel** — connect this repo for automatic deploys
