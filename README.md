# Dodge & HODL

## Overview
Web3 dodgeball survival game. [Demo](https://hamballers.xyz)

## Monorepo Structure
- **contracts/** – Solidity smart contracts
- **backend/** – Express REST and WebSocket API
- **frontend/** – React client powered by Vite

## Quick Start
```bash
cd hamballer-game-starter
pnpm install:all
pnpm dev:contracts
pnpm dev:backend
pnpm dev:frontend
```

## Environment
Copy `.env.example` to `.env` in each package. See `scripts/setup-offline.sh` for offline installs.

## Testing
Run tests from the starter package:
```bash
cd hamballer-game-starter
pnpm test:all
```

## Contributing
Use feature branches and open PRs. Lint before pushing. See checklist below.

### Contributor Checklist
- [ ] Clone repo
- [ ] Copy `.env.example` to `.env` in each package
- [ ] Run `pnpm install:all`
- [ ] Start contracts, backend, and frontend dev servers
- [ ] Run `pnpm test` for validation
