#!/usr/bin/env bash
# Ensure all three Touma site repos are checked out under the workspace root and
# sitting on the requested working branch. Idempotent — safe to re-run.
#
#   usage: .claude/scripts/sites-sync.sh <branch> [site-key ...]
#
# With no site keys, all sites in .claude/sites.json are synced. A repo that fails
# to clone or fetch is reported and skipped; the script keeps going and exits 1 at
# the end so the caller can see something went wrong without losing the other repos.

set -uo pipefail

BRANCH="${1:-}"
if [[ -z "$BRANCH" ]]; then
  echo "usage: $0 <branch> [site-key ...]" >&2
  exit 2
fi
shift
WANTED=("$@")

ROSTER="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/sites.json"
if [[ ! -f "$ROSTER" ]]; then
  echo "roster not found: $ROSTER" >&2
  exit 2
fi

command -v jq >/dev/null 2>&1 || { echo "jq is required" >&2; exit 2; }

ROOT="$(jq -r '.workspace_root' "$ROSTER")"
mkdir -p "$ROOT"
FAILED=0

# Retry a git command with 2s/4s/8s/16s backoff — these repos are remote and the
# proxy occasionally drops a connection.
retry_git() {
  local delay=2 attempt
  for attempt in 1 2 3 4 5; do
    if "$@"; then return 0; fi
    if [[ $attempt -eq 5 ]]; then return 1; fi
    echo "  retry $attempt failed, waiting ${delay}s…" >&2
    sleep "$delay"
    delay=$((delay * 2))
  done
}

wanted() {
  [[ ${#WANTED[@]} -eq 0 ]] && return 0
  local k
  for k in "${WANTED[@]}"; do [[ "$k" == "$1" ]] && return 0; done
  return 1
}

while IFS=$'\t' read -r KEY REPO URL DEFAULT PATH_; do
  wanted "$KEY" || continue
  echo "== $KEY ($REPO)"

  if [[ ! -d "$PATH_/.git" ]]; then
    echo "  cloning…"
    if ! retry_git git clone "$URL" "$PATH_"; then
      echo "  CLONE FAILED — skipping $KEY" >&2
      FAILED=1
      continue
    fi
  fi

  if ! retry_git git -C "$PATH_" fetch origin; then
    echo "  fetch failed — working from the local copy" >&2
    FAILED=1
  fi

  if git -C "$PATH_" rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
    git -C "$PATH_" checkout "$BRANCH" >/dev/null 2>&1
  elif git -C "$PATH_" rev-parse --verify "origin/$BRANCH" >/dev/null 2>&1; then
    git -C "$PATH_" checkout -b "$BRANCH" "origin/$BRANCH" >/dev/null 2>&1
  else
    git -C "$PATH_" checkout -b "$BRANCH" "origin/$DEFAULT" >/dev/null 2>&1 \
      || git -C "$PATH_" checkout -b "$BRANCH" >/dev/null 2>&1
  fi

  echo "  on $(git -C "$PATH_" rev-parse --abbrev-ref HEAD) @ $(git -C "$PATH_" rev-parse --short HEAD)"
done < <(jq -r '.sites[] | [.key, .repo, .clone_url, .default_branch, .checkout_path] | @tsv' "$ROSTER")

exit $FAILED
