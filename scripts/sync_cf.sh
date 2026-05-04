#!/bin/bash

# sync_cf.sh - Sync .env variables to Cloudflare Pages
#
# Downloads and runs cf-pages-sync-env.sh from the workflows repo.
#
# Usage:
#   ./sync_cf.sh                    # Sync to both production and preview
#   ./sync_cf.sh --production-only  # Sync to production only
#   ./sync_cf.sh --preview-only     # Sync to preview only

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

PROJECT="PROJECT"
ENV_FILE="$BASE_DIR/.env"

# Source reusable script: prefer local workflows repo, fall back to GitHub
LOCAL_SCRIPT="$(cd "$BASE_DIR" && pwd)/../workflows/scripts/cf-pages-sync-env.sh"
if [ -f "$LOCAL_SCRIPT" ]; then
    bash "$LOCAL_SCRIPT" "$PROJECT" "$ENV_FILE" "$@"
else
    SYNC_SCRIPT=$(mktemp)
    trap "rm -f $SYNC_SCRIPT" EXIT
    if ! curl -fsSL "https://raw.githubusercontent.com/johnqh/workflows/main/scripts/cf-pages-sync-env.sh" -o "$SYNC_SCRIPT"; then
        echo "Error: Failed to download cf-pages-sync-env.sh from GitHub"
        exit 1
    fi
    bash "$SYNC_SCRIPT" "$PROJECT" "$ENV_FILE" "$@"
fi
