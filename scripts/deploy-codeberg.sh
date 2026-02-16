#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/_site"
TARGET_DIR="${1:-${PUBLISH_DIR:-$ROOT_DIR/_site}}"
EXPECTED_REMOTE="${EXPECTED_REMOTE:-codeberg.org/baudouin/11ty-site.git}"

if ! command -v npm >/dev/null 2>&1; then
  printf "Error: npm is required.\n" >&2
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  printf "Error: rsync is required.\n" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  printf "Error: git is required.\n" >&2
  exit 1
fi

printf "Building Eleventy site...\n"
npm --prefix "$ROOT_DIR" run build

if [[ ! -d "$TARGET_DIR" ]]; then
  printf "Error: publish repo directory not found: %s\n" "$TARGET_DIR" >&2
  printf "Create/clone it first, or pass a path: npm run deploy:codeberg -- /absolute/path/to/repo\n" >&2
  exit 1
fi

if [[ ! -d "$TARGET_DIR/.git" ]]; then
  printf "Error: target is not a git repository: %s\n" "$TARGET_DIR" >&2
  exit 1
fi

REMOTE_URL="$(git -C "$TARGET_DIR" remote get-url origin 2>/dev/null || true)"
if [[ -n "$REMOTE_URL" && "$REMOTE_URL" != *"$EXPECTED_REMOTE"* ]]; then
  printf "Warning: target origin does not match expected remote.\n"
  printf "  expected contains: %s\n" "$EXPECTED_REMOTE"
  printf "  actual: %s\n" "$REMOTE_URL"
fi

printf "Syncing _site to %s...\n" "$TARGET_DIR"
BUILD_REAL="$(cd "$BUILD_DIR" && pwd)"
TARGET_REAL="$(cd "$TARGET_DIR" && pwd)"

if [[ "$BUILD_REAL" == "$TARGET_REAL" ]]; then
  printf "Build output is the publish repo (%s), skipping sync.\n" "$TARGET_DIR"
else
  rsync -a --delete "$BUILD_DIR"/ "$TARGET_DIR"/
fi

for stale_dir in "notes/_site" "notes/logseq" "notes/_publish"; do
  if [[ -e "$TARGET_DIR/$stale_dir" ]]; then
    rm -rf "$TARGET_DIR/$stale_dir"
    printf "Removed stale path: %s\n" "$stale_dir"
  fi
done

if git -C "$TARGET_DIR" diff --quiet && git -C "$TARGET_DIR" diff --cached --quiet; then
  printf "No changes to deploy.\n"
  exit 0
fi

SOURCE_SHA="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || printf "unknown")"
DEPLOY_MESSAGE="${DEPLOY_MESSAGE:-deploy: jndjs.dev ${SOURCE_SHA}}"
TARGET_BRANCH="$(git -C "$TARGET_DIR" rev-parse --abbrev-ref HEAD)"

printf "Committing in publish repo...\n"
git -C "$TARGET_DIR" add -A
git -C "$TARGET_DIR" commit -m "$DEPLOY_MESSAGE"

printf "Pushing to origin/%s...\n" "$TARGET_BRANCH"
git -C "$TARGET_DIR" push origin "$TARGET_BRANCH"

printf "Deploy pushed successfully.\n"
