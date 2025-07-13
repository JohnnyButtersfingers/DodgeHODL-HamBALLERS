# DodgeHODL-HamBALLERS
Dodge &amp; HODL is a Web3-native, high-stakes dodgeball survival game 
# my-hamballer-game
HamBaller.xyz is a Web3-native gaming hub built on the Abstract Blockchain, designed to connect players through skill-based, token-incentivized gameplay. Our flagship title, DODGE & HODL, is a fast-paced dodgeball survival game that blends risk-reward decisions, randomness (RNG), and crypto mechanics for fair, engaging, and monetizable experiences.Players dodge challenges on "Slipmodes" (floating platforms), make defensive moves (Dodge/Jump/Dive), and decide to HODL rewards at checkpoints. The game supports on-chain resolution, dual currencies, NFTs for boosts and proofs, leaderboards, replays, and anti-bot measures. It's browser-playable, targeting 18-35 year-old crypto-savvy gamers comfortable with wallets and GameFi.The project validates player engagement, economy viability, and system integrity before expanding to multi-game support under the HamBaller brand. Built with a deflationary tokenomics model to promote scarcity and value.

FeaturesMust-Have (MVP Critical)Web3-Native Gameplay: Browser-based loop on Abstract Chain, supporting 1,000+ unique wallet users.
On-Chain Resolution: Wallet-signed moves + verifiable RNG (blockhash or Chainlink VRF) for fair outcomes.
Dual Reward Economy:Chess Puffs (CP): Off-chain soft currency for cosmetic progression.
Dodge Ball Points (DBP): On-chain ERC-20 token with mint/burn logic (10% fee for deflation).

Slipmodes Progression: Player choices + RNG; HODL mechanic for CP-to-DBP conversion (100:1 ratio) at checkpoints.
Leaderboards & Entry: Daily free entry, starter pack claims, real-time rankings.
Smart Contracts: DBPToken (ERC-20), BoostNFT (ERC-1155), HODLManager (run tracking, RNG, rewards).
Player History & Proofs: Explorer-integrated with Dodgeproof NFTs for fair-play verification.
Anti-Bot Measures: Signed moves, time-limited reactions, optional CAPTCHA on entry/Bonus Throw.

Should-HaveBonus Throw System: From Slipmode 4+ with loot multipliers.
Cosmetic Store & Boosts: NFT-based unlocks and power-ups (e.g., Reflex/Jump Stickers, burnable).
Replay Exports: Text/image logs for sharing and analysis.

Could-Have (Post-MVP)XP/Badge system for tracking.
Multi-game support.
A/B testing for odds/multipliers.

Won't-Have (MVP)Jackpot Vault/Elite Wager Modes.
Full DAO governance (stubs only).
Multi-chain deployment.

TokenomicsCP: Earned every round for progression; convertible to DBP.
DBP: Scarce ERC-20 (no infinite mints); earned via bonuses/HODL; 10% transaction fee for burn/buyback.
Deflationary Design: Focus on earned rewards, not airdrops/speculation.
NFT Utility: Boosts (burnable power-ups), Dodgeproof (anti-bot/proof-of-human), DAF Avatars (narrative perks, gameplay bonuses).

Lore & NarrativeSet in the Abstract Arena post-Minting Wars, players are HamBaller plush fighters evolved from meme codes. Themes of risk-taking, redemption, and ownership unfold through seasonal arcs, quests, and DAO-voted story branches (e.g., Echo vs. Codeline forks).Tech StackFrontend: React 18 + Vite, Tailwind CSS, RainbowKit (wallet connect), components for UI (Move Selector, Replay Viewer).
Backend: Node.js + Express, WebSockets (real-time), Supabase/PostgreSQL (player profiles, runs, replays, leaderboards).
Smart Contracts: Solidity (Hardhat/Thirdweb); DBPToken.sol (ERC-20), BoostNFT.sol (ERC-1155), HODLManager.sol.
Integrations: ethers.js/Web3.js for contracts, webhook/cron for syncing, Abstract Explorer for verification.
Deployment: Abstract Testnet (RPC: https://rpc.abstract.xyz), Vercel (frontend), Heroku/AWS (backend).
Monitoring: Google Analytics/PostHog (engagement), PostgreSQL dashboards (stats), replay logs (behavior).
Security: On-chain randomness, signed transactions, audits via DAO treasury.

InstallationClone the Repository:

git clone https://github.com/yourusername/hamballer-xyz.git
cd hamballer-xyz

Install Dependencies:Frontend: cd frontend && npm install
Backend: cd backend && npm install
Contracts: cd contracts && npm install

Environment Setup:Copy .env.example to .env in each directory.
Fill in: ABSTRACT_RPC_URL=https://rpc.abstract.xyz, PRIVATE_KEY=your_wallet_key, SUPABASE_URL=your_supabase_url, SUPABASE_KEY=your_key.

Database Setup:Use Supabase or local PostgreSQL: Run the schema scripts from backend/db/schema.sql (players, runs, replays, leaderboards tables).

Smart Contracts:Test locally: npx hardhat test
Deploy to Testnet: npx hardhat run scripts/deploy.js --network abstractTestnet
Verify on Explorer: Use Hardhat verify task.

UsageRun Locally:Contracts: npx hardhat node (local blockchain).
Backend: cd backend && npm start (starts Express server).
Frontend: cd frontend && npm run dev (Vite dev server).

Play the Game:Connect wallet via RainbowKit.
Claim starter pack, enter daily free run.
Select moves in Slipmodes, HODL at checkpoints, export replays.

API Endpoints (Backend):POST /run/start: Initiate game session.
POST /run/move: Submit signed move + resolve on-chain.
GET /leaderboard: Fetch top players.
GET /player/:wallet: Player profile.
GET /replay/:runId: Replay data.

Testing:Frontend: npm test (Jest).
Contracts: Hardhat tests for RNG, minting, burning.

Roadmap (2025+)Preseason (MVP): Core loop, rewards, NFT packs; goal: 10K wallets.
Phase 1: Dodgeproof launch, mascot reveals, replay tools, anti-bot enhancements.
Phase 2: Vaults, ladders, DAO funding, expansions (e.g., multi-game, mobile PWA).
Long-Term: Cross-chain, community meme integrations, A/B testing for engagement.

Marketing Focus: Community-driven (X lore memes, AMAs, replays contests); avoid hype.ContributingWe welcome contributions! Fork the repo, create a branch, and submit a PR. Follow the code of conduct (CODE_OF_CONDUCT.md). Areas to help: Bug fixes, UI improvements, contract audits, lore expansions.LicenseThis project is licensed under the MIT License - see the LICENSE file for details.Disclaimer: This is experimental software. No financial advice; use at your own risk. Assets subject to regulatory compliance.



