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
