#!/bin/bash
# Helper to install deps using a local pnpm store for offline environments
STORE_DIR="${PNPM_STORE_DIR:-$(dirname "$0")/pnpm-store}"

if [ ! -d "$STORE_DIR" ]; then
  echo "Local pnpm store not found at $STORE_DIR" >&2
  echo "Populate this directory from a machine with internet access." >&2
  exit 1
fi

# Run install from the monorepo root
cd "$(dirname "$0")/../hamballer-game-starter" || exit 1
pnpm install:all --offline --store-dir="$STORE_DIR"
echo "Dependencies installed using offline store at $STORE_DIR"

