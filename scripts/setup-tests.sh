#!/bin/bash
# Install testing dependencies from a local pnpm store
STORE_DIR="${PNPM_STORE_DIR:-$(dirname "$0")/pnpm-store}"

if [ ! -d "$STORE_DIR" ]; then
  echo "Local pnpm store not found at $STORE_DIR" >&2
  exit 1
fi

cd "$(dirname "$0")/../hamballer-game-starter" || exit 1
pnpm install:all --offline --store-dir="$STORE_DIR"
echo "Testing dependencies installed using offline store at $STORE_DIR"
