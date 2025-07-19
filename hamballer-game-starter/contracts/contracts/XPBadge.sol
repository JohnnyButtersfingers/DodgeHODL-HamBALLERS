// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title XPBadge
 * @dev ERC1155 contract for XP achievement badges
 */
contract XPBadge is ERC1155, AccessControl, ReentrancyGuard {
    using Strings for uint256;
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");
    
    // Badge information
    struct BadgeInfo {
        uint256 xpRequired;
        uint256 season;
        string name;
        string description;
        bool active;
        uint256 totalMinted;
    }
    
    // Player badge information
    struct PlayerBadge {
        uint256 tokenId;
        uint256 xpEarned;
        uint256 mintTimestamp;
        uint256 season;
    }
    
    // Badge metadata
    mapping(uint256 => BadgeInfo) public badges;
    
    // Player badges tracking
    mapping(address => PlayerBadge[]) public playerBadges;
    mapping(address => mapping(uint256 => bool)) public hasBadge;
    
    // Season tracking
    uint256 public currentSeason;
    
    // Events
    event BadgeCreated(uint256 indexed tokenId, string name, uint256 xpRequired, uint256 season);
    event BadgeMinted(address indexed player, uint256 indexed tokenId, uint256 xpEarned, uint256 season);
    event SeasonUpdated(uint256 oldSeason, uint256 newSeason);
    
    constructor(string memory baseURI) ERC1155(baseURI) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(URI_SETTER_ROLE, msg.sender);
        currentSeason = 1;
        
        // Create initial badges
        _createInitialBadges();
    }
    
    /**
     * @dev Create initial badge types
     */
    function _createInitialBadges() internal {
        // Bronze badges
        _createBadge(1, "Bronze Dodger", "First steps in dodgeball", 100, currentSeason);
        _createBadge(2, "Bronze Striker", "Land your first hits", 250, currentSeason);
        
        // Silver badges  
        _createBadge(10, "Silver Dodger", "Intermediate dodging skills", 500, currentSeason);
        _createBadge(11, "Silver Striker", "Consistent hitting ability", 750, currentSeason);
        
        // Gold badges
        _createBadge(20, "Gold Dodger", "Expert dodging mastery", 1000, currentSeason);
        _createBadge(21, "Gold Striker", "Elite striking precision", 1500, currentSeason);
        
        // Legendary badges
        _createBadge(100, "Legendary Champion", "Ultimate dodgeball mastery", 5000, currentSeason);
        _createBadge(101, "Season Master", "Complete season domination", 10000, currentSeason);
    }
    
    /**
     * @dev Create a new badge type
     */
    function _createBadge(
        uint256 tokenId,
        string memory name,
        string memory description,
        uint256 xpRequired,
        uint256 season
    ) internal {
        badges[tokenId] = BadgeInfo({
            xpRequired: xpRequired,
            season: season,
            name: name,
            description: description,
            active: true,
            totalMinted: 0
        });
        
        emit BadgeCreated(tokenId, name, xpRequired, season);
    }
    
    /**
     * @dev Mint a badge to a player
     * @param to Address to mint to
     * @param tokenId Badge type to mint
     * @param xp Amount of XP the player has earned
     * @param season Current season
     */
    function mintBadge(
        address to,
        uint256 tokenId,
        uint256 xp,
        uint256 season
    ) external onlyRole(MINTER_ROLE) nonReentrant returns (bool) {
        require(to != address(0), "XPBadge: Cannot mint to zero address");
        require(badges[tokenId].active, "XPBadge: Badge not active");
        require(xp >= badges[tokenId].xpRequired, "XPBadge: Insufficient XP");
        require(!hasBadge[to][tokenId], "XPBadge: Player already has this badge");
        
        // Mint the badge
        _mint(to, tokenId, 1, "");
        
        // Update player badge tracking
        playerBadges[to].push(PlayerBadge({
            tokenId: tokenId,
            xpEarned: xp,
            mintTimestamp: block.timestamp,
            season: season
        }));
        
        hasBadge[to][tokenId] = true;
        badges[tokenId].totalMinted++;
        
        emit BadgeMinted(to, tokenId, xp, season);
        
        return true;
    }
    
    /**
     * @dev Get badge information
     */
    function getBadgeInfo(
        address player,
        uint256 tokenId
    ) external view returns (BadgeInfo memory badgeInfo, bool owned, uint256 balance) {
        badgeInfo = badges[tokenId];
        owned = hasBadge[player][tokenId];
        balance = balanceOf(player, tokenId);
    }
    
    /**
     * @dev Get all badges owned by a player
     */
    function getBadgesByPlayer(address player) external view returns (PlayerBadge[] memory) {
        return playerBadges[player];
    }
    
    /**
     * @dev Get total badges count for a player
     */
    function getPlayerBadgeCount(address player) external view returns (uint256) {
        return playerBadges[player].length;
    }
    
    /**
     * @dev Check if player has specific badge
     */
    function hasPlayerBadge(address player, uint256 tokenId) external view returns (bool) {
        return hasBadge[player][tokenId];
    }
    
    /**
     * @dev Create new badge type (admin only)
     */
    function createBadge(
        uint256 tokenId,
        string memory name,
        string memory description,
        uint256 xpRequired,
        uint256 season
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(badges[tokenId].xpRequired == 0, "XPBadge: Badge already exists");
        _createBadge(tokenId, name, description, xpRequired, season);
    }
    
    /**
     * @dev Update badge status (admin only)
     */
    function updateBadgeStatus(uint256 tokenId, bool active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(badges[tokenId].xpRequired > 0, "XPBadge: Badge does not exist");
        badges[tokenId].active = active;
    }
    
    /**
     * @dev Update current season (admin only)
     */
    function updateSeason(uint256 newSeason) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldSeason = currentSeason;
        currentSeason = newSeason;
        emit SeasonUpdated(oldSeason, newSeason);
    }
    
    /**
     * @dev Set URI for all tokens (admin only)
     */
    function setURI(string memory newuri) external onlyRole(URI_SETTER_ROLE) {
        _setURI(newuri);
    }
    
    /**
     * @dev Override URI function to return badge-specific metadata
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        require(badges[tokenId].xpRequired > 0, "XPBadge: Badge does not exist");
        
        string memory baseURI = super.uri(tokenId);
        return bytes(baseURI).length > 0 
            ? string(abi.encodePacked(baseURI, tokenId.toString())) 
            : "";
    }
    
    /**
     * @dev Grant minter role
     */
    function grantMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, account);
    }
    
    /**
     * @dev Revoke minter role
     */
    function revokeMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, account);
    }
    
    /**
     * @dev Support interface
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC1155, AccessControl) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev Batch mint badges to multiple players (admin only)
     */
    function batchMintBadges(
        address[] calldata players,
        uint256[] calldata tokenIds,
        uint256[] calldata xpAmounts,
        uint256 season
    ) external onlyRole(MINTER_ROLE) {
        require(
            players.length == tokenIds.length && 
            tokenIds.length == xpAmounts.length, 
            "XPBadge: Array length mismatch"
        );
        
        for (uint256 i = 0; i < players.length; i++) {
            address player = players[i];
            uint256 tokenId = tokenIds[i];
            uint256 xp = xpAmounts[i];
            
            if (!hasBadge[player][tokenId] && 
                xp >= badges[tokenId].xpRequired &&
                badges[tokenId].active) {
                
                // Mint the badge
                _mint(player, tokenId, 1, "");
                
                // Update player badge tracking
                playerBadges[player].push(PlayerBadge({
                    tokenId: tokenId,
                    xpEarned: xp,
                    mintTimestamp: block.timestamp,
                    season: season
                }));
                
                hasBadge[player][tokenId] = true;
                badges[tokenId].totalMinted++;
                
                emit BadgeMinted(player, tokenId, xp, season);
            }
        }
    }
}