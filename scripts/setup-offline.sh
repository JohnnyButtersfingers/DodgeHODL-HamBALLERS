#!/bin/bash
# Helper to install deps using a local pnpm store for offline environments

# Get the absolute path to the scripts directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../hamballer-game-starter"
STORE_DIR="${PNPM_STORE_DIR:-$SCRIPT_DIR/pnpm-store}"

echo "Using pnpm store at: $STORE_DIR"

if [ ! -d "$STORE_DIR" ]; then
  echo "Local pnpm store not found at $STORE_DIR" >&2
  echo "Populate this directory from a machine with internet access:" >&2
  echo "  cd $PROJECT_DIR" >&2
  echo "  pnpm install:all" >&2
  echo "  cp -r \$(pnpm store path)/* $SCRIPT_DIR/pnpm-store/" >&2
  exit 1
fi

# Set the store directory for pnpm
export PNPM_STORE_DIR="$STORE_DIR"

echo "Installing dependencies offline..."
cd "$PROJECT_DIR"
pnpm install:all --offline
echo "Dependencies installed using offline store at $STORE_DIR"
