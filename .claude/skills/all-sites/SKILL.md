---
name: all-sites
description: Run one task across all three Touma marketing-site repos at once (Guffee-website, baraka-invest-website, baladac) — fans the task out to a site-worker agent per repo in parallel, then reports a per-site summary. Use when the user asks for a change, audit, or check "on all the sites", "across the repos", "everywhere", or names two or more of the three. Also invoked directly as /all-sites <task>.
---

# Run a task across all three sites

You are the coordinator. You do not edit files yourself — you dispatch one `site-worker`
agent per repo, in parallel, and then reconcile what they report.

## 1. Read the roster

Read `.claude/sites.json` (in the repo you are running from). It lists all three sites:
checkout path, clone URL, where the site root actually is, and per-repo quirks. Never
hardcode the roster from memory — the file is the source of truth.

## 2. Make sure the checkouts exist

Run `.claude/scripts/sites-sync.sh <branch>`. It clones any missing repo into
`/home/user`, fetches, and puts each one on `<branch>` (created from the default branch
if it does not exist yet). Use the session's designated working branch; if none was
given, use `claude/all-sites-<short-task-slug>`.

If a repo cannot be cloned, do not stop — run the task on the ones you have and report
the missing one as blocked.

## 3. Scope the fan-out

Default is all three. Honor a narrower scope when the user gives one:
`/all-sites --only baraka,guffee <task>` runs against that subset. If the user names
sites in prose ("update the two live sites"), resolve it and say which you picked.

## 4. Decide whether the task is actually uniform

Before dispatching, check the task against each site's `notes` in the roster. Three
cases, and picking the wrong one is the main way this goes bad:

- **Uniform** — same change, same shape, everywhere. Dispatch identical prompts.
- **Per-site adaptation** — same intent, different execution (a footer edit lands in
  `guffee-website/index.html` for one and `index.html` for another). Dispatch with the
  per-site specifics spelled out in each prompt.
- **Doesn't apply everywhere** — baladac has no site yet, so most content tasks have
  nothing to land on. Still dispatch, and let the worker report "not applicable"; do
  not silently drop a repo from the run without saying so in your summary.

If the task is ambiguous in a way that would produce three *different* interpretations,
ask the user once, before dispatching — three divergent commits are expensive to unpick.

## 5. Dispatch

One `Agent` call per site, `subagent_type: "site-worker"`, **all in a single block** so
they run in parallel. Each prompt must be self-contained — the worker starts cold and
sees none of this conversation. Give it:

- the site key and its checkout path
- the task, stated in full, with any per-site specifics resolved
- the branch to work on
- whether to commit and push (default yes) and whether to open a PR (default **no**)
- anything the user said that constrains the work

## 6. Reconcile and report

When the workers return, do not just concatenate their reports. Read them against each
other and give the user:

- A per-site table: site, status, files changed, commit SHA.
- **Divergences** — where the same task produced materially different results, and
  whether that is expected (different layouts) or a symptom (one worker misread the task).
- **Flags** — anything a worker raised: missing facts, cross-site inconsistencies,
  skipped work.
- One line on what is left, if anything.

If a worker reports partial or blocked, say so plainly at the top. Never report a run as
clean when a site was skipped, was not applicable, or failed to push — the whole value of
fanning out is knowing the true state of all three afterward.
