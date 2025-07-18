# Dodge & HODL

## Overview
Web3 dodgeball survival game. [Demo](https://hamballers.xyz)

## Monorepo Structure
- **contracts/** – Solidity smart contracts
- **backend/** – Express REST and WebSocket API
- **frontend/** – React client powered by Vite

## Quick Start
```bash
pnpm install:all
pnpm dev:contracts
pnpm dev:backend
pnpm dev:frontend
```

## Environment
Copy `.env.example` to `.env` in each package. See `scripts/setup-offline.sh` for offline installs.

## Testing
Run `pnpm test` in any package or `pnpm test:all` from the repo root.

**Note**: Jest only detects test files with `.test.js` or `.spec.js` extensions.

## 🔧 Offline Development

For environments without internet access, you can set up dependencies using a local pnpm store:

### Prerequisites
- OpenZeppelin contracts v5.3.0 (already configured)
- pnpm v8.10.0+ (v10+ recommended for better offline support)

### Setup Instructions
```bash
# On a machine with internet access:
cd hamballer-game-starter
pnpm install:all
cp -r $(pnpm store path)/* ../scripts/pnpm-store/

# Transfer project to offline environment, then:
./scripts/setup-offline.sh

# After offline setup, always rerun:
pnpm install:all
```

**Important**: After running the offline setup script, always run `pnpm install:all` again to ensure all dependencies are properly linked.

## Contributing
Use feature branches and open PRs. Lint before pushing. See checklist below.

### Contributor Checklist
- [ ] Clone repo
- [ ] Copy `.env.example` to `.env` in each package
- [ ] Run `pnpm install:all`
- [ ] Start contracts, backend, and frontend dev servers
- [ ] Run `pnpm test` for validation
