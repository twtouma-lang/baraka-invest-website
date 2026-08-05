# Multi-site agent kit

Runs one task across all three sites — **Guffee-website**, **baraka-invest-website**,
**baladac** — from a single instruction, in whichever of the three repos you happen to
be sitting in. The same four files are committed to all three, so it works from any of
them.

## Use it

```
/all-sites add a cookie-consent banner to the footer
/all-sites --only baraka,guffee bump the copyright year to 2026
/all-sites audit every page for broken internal links and report — do not commit
```

The coordinator reads the roster, makes sure all three checkouts exist and are on your
working branch, then dispatches one `site-worker` agent per repo **in parallel**. Each
worker edits, verifies, commits, and pushes its own repo, then reports back. You get one
reconciled summary: per-site status, commits, and any divergences between them.

For a single site, skip the fan-out and use the worker directly — ask for the
`site-worker` agent and name the site.

## Files

| File | What it is |
|---|---|
| `sites.json` | The roster: checkout paths, real on-disk layout, per-repo quirks. Source of truth. |
| `agents/site-worker.md` | The worker. Executes a task in exactly one repo, end to end. |
| `skills/all-sites/SKILL.md` | The coordinator. Scopes the task, fans out, reconciles results. |
| `scripts/sites-sync.sh` | `sites-sync.sh <branch> [site-key…]` — clone/fetch/checkout. Idempotent. |

## Keeping it working

`sites.json` carries the facts the workers rely on, including the places where a repo's
README disagrees with its filesystem (Baraka's assets are flat at the root; Baladac has
no site yet, only a scaffold). When one of those changes — Baraka gets a real `assets/`
tree, Baladac's site lands — update `sites.json` first, or the workers will plan against
a layout that is gone.

Edit any of these four files in one repo and copy the whole `.claude/` directory to the
other two. They are meant to stay identical; a roster that has drifted is worse than no
roster, because the fan-out will trust it.

## Defaults

Workers commit and push to the working branch. They do **not** open pull requests and do
**not** push to `main` — ask explicitly if you want either. A task that does not apply to
a repo produces a reported no-op, not an invented change.
