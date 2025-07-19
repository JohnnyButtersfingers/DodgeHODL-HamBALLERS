// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title XPBadge
 * @dev Gas-optimized NFT contract for HamBaller XP achievement badges
 * @notice Mints tiered badges based on XP earned in game runs
 */
contract XPBadge is ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl, Pausable {
    using Counters for Counters.Counter;
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");
    
    // Badge tier definitions (gas-optimized using uint8)
    uint8 public constant PARTICIPATION_TIER = 0; // 1-24 XP
    uint8 public constant COMMON_TIER = 1;        // 25-49 XP  
    uint8 public constant RARE_TIER = 2;          // 50-74 XP
    uint8 public constant EPIC_TIER = 3;          // 75-99 XP
    uint8 public constant LEGENDARY_TIER = 4;     // 100+ XP
    
    // Token ID counter
    Counters.Counter private _tokenIdCounter;
    
    // Mapping from token ID to badge metadata
    struct BadgeMetadata {
        uint8 tier;
        uint16 xpEarned;
        uint32 season;
        uint32 mintedAt;
    }
    mapping(uint256 => BadgeMetadata) public badgeMetadata;
    
    // Player badge tracking (gas-optimized)
    mapping(address => mapping(uint8 => uint256[])) public playerBadgesByTier;
    mapping(address => uint256) public totalBadgesPerPlayer;
    
    // Season tracking
    uint32 public currentSeason = 1;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Events
    event BadgeMinted(
        address indexed player,
        uint256 indexed tokenId,
        uint8 tier,
        uint16 xpEarned,
        uint32 season
    );
    
    event SeasonUpdated(uint32 newSeason);
    event BaseURIUpdated(string newBaseURI);
    
    constructor(string memory name, string memory symbol, string memory baseURI) 
        ERC721(name, symbol) 
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(URI_SETTER_ROLE, msg.sender);
        
        _baseTokenURI = baseURI;
    }
    
    /**
     * @dev Mints a new XP badge to a player
     * @param to Player address to receive the badge
     * @param tier Badge tier (0-4)
     * @param xpEarned XP amount earned for this badge
     * @param season Season in which badge was earned
     * @return tokenId The ID of the newly minted badge
     */
    function mintBadge(
        address to,
        uint8 tier,
        uint16 xpEarned,
        uint32 season
    ) public onlyRole(MINTER_ROLE) whenNotPaused returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(tier <= LEGENDARY_TIER, "Invalid tier");
        require(xpEarned > 0, "XP must be greater than 0");
        require(season > 0 && season <= currentSeason, "Invalid season");
        
        // Validate XP matches tier
        require(_isValidTierForXP(tier, xpEarned), "XP doesn't match tier");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        
        // Store badge metadata (gas-optimized struct packing)
        badgeMetadata[tokenId] = BadgeMetadata({
            tier: tier,
            xpEarned: xpEarned,
            season: season,
            mintedAt: uint32(block.timestamp)
        });
        
        // Update player tracking
        playerBadgesByTier[to][tier].push(tokenId);
        totalBadgesPerPlayer[to]++;
        
        emit BadgeMinted(to, tokenId, tier, xpEarned, season);
        
        return tokenId;
    }
    
    /**
     * @dev Batch mint badges (gas-optimized for multiple mints)
     */
    function batchMintBadges(
        address[] calldata recipients,
        uint8[] calldata tiers,
        uint16[] calldata xpAmounts,
        uint32 season
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(
            recipients.length == tiers.length && 
            tiers.length == xpAmounts.length,
            "Array length mismatch"
        );
        require(recipients.length <= 100, "Batch too large");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            mintBadge(recipients[i], tiers[i], xpAmounts[i], season);
        }
    }
    
    /**
     * @dev Validates that XP amount matches the tier
     */
    function _isValidTierForXP(uint8 tier, uint16 xp) private pure returns (bool) {
        if (tier == PARTICIPATION_TIER) return xp >= 1 && xp <= 24;
        if (tier == COMMON_TIER) return xp >= 25 && xp <= 49;
        if (tier == RARE_TIER) return xp >= 50 && xp <= 74;
        if (tier == EPIC_TIER) return xp >= 75 && xp <= 99;
        if (tier == LEGENDARY_TIER) return xp >= 100;
        return false;
    }
    
    /**
     * @dev Get tier from XP amount
     */
    function getTierFromXP(uint16 xp) public pure returns (uint8) {
        if (xp >= 100) return LEGENDARY_TIER;
        if (xp >= 75) return EPIC_TIER;
        if (xp >= 50) return RARE_TIER;
        if (xp >= 25) return COMMON_TIER;
        return PARTICIPATION_TIER;
    }
    
    /**
     * @dev Get all badges for a player
     */
    function getPlayerBadges(address player) external view returns (uint256[] memory) {
        uint256 total = totalBadgesPerPlayer[player];
        uint256[] memory badges = new uint256[](total);
        uint256 index = 0;
        
        for (uint8 tier = 0; tier <= LEGENDARY_TIER; tier++) {
            uint256[] memory tierBadges = playerBadgesByTier[player][tier];
            for (uint256 i = 0; i < tierBadges.length; i++) {
                badges[index++] = tierBadges[i];
            }
        }
        
        return badges;
    }
    
    /**
     * @dev Get badges by tier for a player
     */
    function getPlayerBadgesByTier(address player, uint8 tier) external view returns (uint256[] memory) {
        return playerBadgesByTier[player][tier];
    }
    
    /**
     * @dev Get badge count by tier for a player
     */
    function getPlayerBadgeCount(address player, uint8 tier) external view returns (uint256) {
        return playerBadgesByTier[player][tier].length;
    }
    
    /**
     * @dev Update current season
     */
    function updateSeason(uint32 newSeason) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newSeason > currentSeason, "New season must be greater");
        currentSeason = newSeason;
        emit SeasonUpdated(newSeason);
    }
    
    /**
     * @dev Set base URI for metadata
     */
    function setBaseURI(string memory baseURI) external onlyRole(URI_SETTER_ROLE) {
        _baseTokenURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }
    
    /**
     * @dev Override _baseURI to return custom base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Generate token URI based on tier
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");
        
        string memory baseURI = _baseURI();
        BadgeMetadata memory metadata = badgeMetadata[tokenId];
        
        // Return tier-specific URI
        return bytes(baseURI).length > 0
            ? string(abi.encodePacked(baseURI, _getTierName(metadata.tier), ".json"))
            : "";
    }
    
    /**
     * @dev Get tier name for URI construction
     */
    function _getTierName(uint8 tier) private pure returns (string memory) {
        if (tier == PARTICIPATION_TIER) return "participation";
        if (tier == COMMON_TIER) return "common";
        if (tier == RARE_TIER) return "rare";
        if (tier == EPIC_TIER) return "epic";
        if (tier == LEGENDARY_TIER) return "legendary";
        return "unknown";
    }
    
    /**
     * @dev Pause token transfers
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    // Required overrides
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
    
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}