// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./DBPToken.sol";
import "./BoostNFT.sol";

/**
 * @title HODLManager
 * @dev Core game logic contract for HamBaller.xyz DODGE & HODL
 * 
 * Features:
 * - Run state management
 * - Chess Puffs (CP) to DBP conversion
 * - Bonus Throw™ mechanics
 * - NFT boost integration
 * - On-chain RNG for fairness
 * - Leaderboard and statistics
 */
contract HODLManager is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant GAME_OPERATOR_ROLE = keccak256("GAME_OPERATOR_ROLE");
    
    DBPToken public immutable dbpToken;
    BoostNFT public immutable boostNFT;
    
    // Game configuration
    uint256 public constant CP_TO_DBP_RATE = 10; // 10 CP = 1 DBP
    uint256 public constant BONUS_THROW_MULTIPLIER = 2;
    uint256 public constant MIN_RUN_DURATION = 30; // 30 seconds minimum
    uint256 public constant MAX_RUN_DURATION = 300; // 5 minutes maximum
    
    // Run states
    enum RunStatus {
        NOT_STARTED,
        IN_PROGRESS, 
        COMPLETED,
        FAILED
    }
    
    // Player run data
    struct GameRun {
        address player;
        uint256 startTime;
        uint256 endTime;
        uint256 cpEarned;
        uint256 dbpMinted;
        RunStatus status;
        bool bonusThrowUsed;
        uint256[] boostsUsed;
        bytes32 seed; // For RNG
    }
    
    // Player statistics
    struct PlayerStats {
        uint256 totalRuns;
        uint256 completedRuns;
        uint256 totalCPEarned;
        uint256 totalDBPEarned;
        uint256 bestRunCP;
        uint256 longestRunTime;
        uint256 currentStreak;
        uint256 bestStreak;
    }
    
    // State variables
    mapping(address => GameRun) public currentRuns;
    mapping(address => PlayerStats) public playerStats;
    mapping(bytes32 => bool) public usedSeeds;
    
    uint256 public totalRuns;
    uint256 public totalCPGenerated;
    uint256 public totalDBPMinted;
    
    // Events
    event RunStarted(address indexed player, bytes32 seed, uint256 timestamp);
    event RunCompleted(address indexed user, uint256 xpEarned);
    event RunFailed(address indexed player, uint256 duration);
    event BonusThrowActivated(address indexed player, uint256 multiplier);
    event BoostUsed(address indexed player, uint256 indexed boostId, uint256 amount);
    event StatsUpdated(address indexed player, uint256 totalRuns, uint256 currentStreak);

    constructor(address _dbpToken, address _boostNFT) {
        require(_dbpToken != address(0), "HODLManager: Invalid DBP token address");
        require(_boostNFT != address(0), "HODLManager: Invalid Boost NFT address");
        
        dbpToken = DBPToken(_dbpToken);
        boostNFT = BoostNFT(_boostNFT);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GAME_OPERATOR_ROLE, msg.sender);
    }

    /**
     * @dev Start a new game run
     */
    function startRun(bytes32 playerSeed) external nonReentrant whenNotPaused {
        require(currentRuns[msg.sender].status == RunStatus.NOT_STARTED || 
                currentRuns[msg.sender].status == RunStatus.COMPLETED ||
                currentRuns[msg.sender].status == RunStatus.FAILED, 
                "HODLManager: Run already in progress");
        
        // Generate unique seed combining player input and block data
        bytes32 gameSeeed = keccak256(abi.encodePacked(
            playerSeed,
            block.timestamp,
            block.difficulty,
            msg.sender,
            totalRuns
        ));
        
        require(!usedSeeds[gameSeeed], "HODLManager: Seed already used");
        usedSeeds[gameSeeed] = true;
        
        // Initialize new run
        currentRuns[msg.sender] = GameRun({
            player: msg.sender,
            startTime: block.timestamp,
            endTime: 0,
            cpEarned: 0,
            dbpMinted: 0,
            status: RunStatus.IN_PROGRESS,
            bonusThrowUsed: false,
            boostsUsed: new uint256[](0),
            seed: gameSeeed
        });
        
        totalRuns++;
        playerStats[msg.sender].totalRuns++;
        
        emit RunStarted(msg.sender, gameSeeed, block.timestamp);
    }

    /**
     * @dev Complete a run and claim rewards
     */
    function completeRun(uint256 cpEarned, bool useBonusThrow) external nonReentrant {
        GameRun storage run = currentRuns[msg.sender];
        require(run.status == RunStatus.IN_PROGRESS, "HODLManager: No active run");
        require(block.timestamp >= run.startTime + MIN_RUN_DURATION, "HODLManager: Run too short");
        require(block.timestamp <= run.startTime + MAX_RUN_DURATION, "HODLManager: Run too long");
        
        uint256 finalCP = cpEarned;
        
        // Apply Bonus Throw™ if requested
        if (useBonusThrow && !run.bonusThrowUsed) {
            finalCP = finalCP * BONUS_THROW_MULTIPLIER;
            run.bonusThrowUsed = true;
            emit BonusThrowActivated(msg.sender, BONUS_THROW_MULTIPLIER);
        }
        
        // Convert CP to DBP and mint tokens
        uint256 dbpToMint = finalCP / CP_TO_DBP_RATE;
        if (dbpToMint > 0) {
            dbpToken.mint(msg.sender, dbpToMint * 10**18); // Convert to wei
        }
        
        // Update run data
        run.endTime = block.timestamp;
        run.cpEarned = finalCP;
        run.dbpMinted = dbpToMint;
        run.status = RunStatus.COMPLETED;
        
        // Update player stats
        _updatePlayerStats(msg.sender, finalCP, dbpToMint, block.timestamp - run.startTime);
        
        // Update global stats
        totalCPGenerated += finalCP;
        totalDBPMinted += dbpToMint;

        uint256 xpEarned = finalCP / CP_TO_DBP_RATE;
        emit RunCompleted(msg.sender, xpEarned);
    }

    /**
     * @dev Fail a run (called by game logic or timeout)
     */
    function failRun(address player) external onlyRole(GAME_OPERATOR_ROLE) {
        GameRun storage run = currentRuns[player];
        require(run.status == RunStatus.IN_PROGRESS, "HODLManager: No active run");
        
        run.endTime = block.timestamp;
        run.status = RunStatus.FAILED;
        
        // Reset streak on failed run
        playerStats[player].currentStreak = 0;
        
        emit RunFailed(player, block.timestamp - run.startTime);
    }

    /**
     * @dev Use a boost during gameplay
     */
    function useBoost(uint256 boostId, uint256 amount) external nonReentrant {
        require(currentRuns[msg.sender].status == RunStatus.IN_PROGRESS, "HODLManager: No active run");
        require(boostNFT.balanceOf(msg.sender, boostId) >= amount, "HODLManager: Insufficient boost balance");
        
        // Burn the boost NFT
        boostNFT.useBoost(boostId, amount);
        
        // Track boost usage
        currentRuns[msg.sender].boostsUsed.push(boostId);
        
        emit BoostUsed(msg.sender, boostId, amount);
    }

    /**
     * @dev Update player statistics
     */
    function _updatePlayerStats(address player, uint256 cpEarned, uint256 dbpEarned, uint256 runDuration) internal {
        PlayerStats storage stats = playerStats[player];
        
        stats.completedRuns++;
        stats.totalCPEarned += cpEarned;
        stats.totalDBPEarned += dbpEarned;
        stats.currentStreak++;
        
        if (cpEarned > stats.bestRunCP) {
            stats.bestRunCP = cpEarned;
        }
        
        if (runDuration > stats.longestRunTime) {
            stats.longestRunTime = runDuration;
        }
        
        if (stats.currentStreak > stats.bestStreak) {
            stats.bestStreak = stats.currentStreak;
        }
        
        emit StatsUpdated(player, stats.totalRuns, stats.currentStreak);
    }

    /**
     * @dev Get current run info for player
     */
    function getCurrentRun(address player) external view returns (GameRun memory) {
        return currentRuns[player];
    }

    /**
     * @dev Get player statistics
     */
    function getPlayerStats(address player) external view returns (PlayerStats memory) {
        return playerStats[player];
    }

    /**
     * @dev Emergency pause (admin only)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause (admin only)
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Generate random number from seed
     */
    function getRandomNumber(address player, uint256 nonce) external view returns (uint256) {
        GameRun memory run = currentRuns[player];
        require(run.status == RunStatus.IN_PROGRESS, "HODLManager: No active run");
        
        return uint256(keccak256(abi.encodePacked(run.seed, nonce, block.timestamp)));
    }
}