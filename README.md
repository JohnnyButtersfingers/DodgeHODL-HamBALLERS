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

Required Backend Environment Variables
ABSTRACT_RPC_URL: used in backend to connect to the Abstract testnet RPC
HODL_MANAGER_ADDRESS: the deployed contract address used by the backend listener

## Testing
Run tests from the starter package:
```bash
cd hamballer-game-starter
pnpm test:all
```
These tests rely on **Jest**, **Vitest**, and **Hardhat**. Ensure these tools are installed before running.

If dependencies fail to install (for example in offline environments), run:

```
scripts/setup-offline.sh
```
This script installs packages from a cached pnpm store.

## Contributing
Use feature branches and open PRs. Lint before pushing. See checklist below.

### Contributor Checklist
- [ ] Clone repo
- [ ] Copy `.env.example` to `.env` in each package
- [ ] Run `pnpm install:all`
- [ ] Start contracts, backend, and frontend dev servers
- [ ] Run `pnpm test` for validation
