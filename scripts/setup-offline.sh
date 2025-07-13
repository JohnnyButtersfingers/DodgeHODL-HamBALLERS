#!/bin/bash
# Helper to install deps using a local pnpm store for offline environments
STORE_DIR="${PNPM_STORE_DIR:-./pnpm-store}"
export PNPM_HOME="$STORE_DIR"

if [ ! -d "$STORE_DIR" ]; then
  echo "Local pnpm store not found at $STORE_DIR" >&2
  echo "Populate this directory from a machine with internet access." >&2
  exit 1
fi

pnpm install:all --offline
echo "Dependencies installed using offline store at $STORE_DIR"
