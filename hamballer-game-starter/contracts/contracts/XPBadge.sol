// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title XPBadge
 * @dev ERC-1155 contract for minting XP-based achievement badges
 * Players can mint badges when they reach certain XP thresholds
 */
contract XPBadge is ERC1155, Ownable, ReentrancyGuard {

    // Badge structure
    struct Badge {
        string name;
        string description;
        uint256 xpRequired;
        bool isActive;
        string uri;
    }

    // State variables
    uint256 private _badgeIds;
    mapping(uint256 => Badge) public badges;
    mapping(address => uint256[]) public playerBadges;
    mapping(address => mapping(uint256 => bool)) public hasBadge;
    
    // Events
    event BadgeMinted(address indexed player, uint256 indexed badgeId, uint256 tokenId, uint256 xpRequired);
    event BadgeCreated(uint256 indexed badgeId, string name, uint256 xpRequired);
    event BadgeUpdated(uint256 indexed badgeId, string name, uint256 xpRequired, bool isActive);

    // Constructor
    constructor() ERC1155("") Ownable(msg.sender) {
        _createDefaultBadges();
    }

    /**
     * @dev Create default badges on deployment
     */
    function _createDefaultBadges() private {
        _createBadge("Novice HODLer", "Complete your first run", 100);
        _createBadge("Experienced Trader", "Reach 500 XP", 500);
        _createBadge("Master Strategist", "Reach 1000 XP", 1000);
        _createBadge("Legendary HODLer", "Reach 2500 XP", 2500);
        _createBadge("Supreme Champion", "Reach 5000 XP", 5000);
    }

    /**
     * @dev Create a new badge (owner only)
     */
    function createBadge(
        string memory name,
        string memory description,
        uint256 xpRequired
    ) external onlyOwner {
        _createBadge(name, description, xpRequired);
    }

    /**
     * @dev Internal function to create a badge
     */
    function _createBadge(
        string memory name,
        string memory description,
        uint256 xpRequired
    ) private {
        _badgeIds++;
        uint256 badgeId = _badgeIds;
        
        badges[badgeId] = Badge({
            name: name,
            description: description,
            xpRequired: xpRequired,
            isActive: true,
            uri: ""
        });

        emit BadgeCreated(badgeId, name, xpRequired);
    }

    /**
     * @dev Update badge information (owner only)
     */
    function updateBadge(
        uint256 badgeId,
        string memory name,
        string memory description,
        uint256 xpRequired,
        bool isActive
    ) external onlyOwner {
        require(badgeId > 0 && badgeId <= _badgeIds, "Invalid badge ID");
        
        badges[badgeId].name = name;
        badges[badgeId].description = description;
        badges[badgeId].xpRequired = xpRequired;
        badges[badgeId].isActive = isActive;

        emit BadgeUpdated(badgeId, name, xpRequired, isActive);
    }

    /**
     * @dev Mint a badge for a player
     * @param badgeId The ID of the badge to mint
     * @param xpRequired The XP requirement for verification
     */
    function mintBadge(uint256 badgeId, uint256 xpRequired) 
        external 
        nonReentrant 
        returns (uint256) 
    {
        require(badgeId > 0 && badgeId <= _badgeIds, "Invalid badge ID");
        require(badges[badgeId].isActive, "Badge is not active");
        require(badges[badgeId].xpRequired == xpRequired, "XP requirement mismatch");
        require(!hasBadge[msg.sender][badgeId], "Badge already owned");

        // Mint the badge
        _mint(msg.sender, badgeId, 1, "");
        
        // Update player's badge list
        if (!hasBadge[msg.sender][badgeId]) {
            playerBadges[msg.sender].push(badgeId);
            hasBadge[msg.sender][badgeId] = true;
        }

        emit BadgeMinted(msg.sender, badgeId, badgeId, xpRequired);
        return badgeId;
    }

    /**
     * @dev Get badge information
     */
    function getBadgeInfo(uint256 badgeId) 
        external 
        view 
        returns (string memory name, string memory description, uint256 xpRequired, bool isActive) 
    {
        require(badgeId > 0 && badgeId <= _badgeIds, "Invalid badge ID");
        Badge memory badge = badges[badgeId];
        return (badge.name, badge.description, badge.xpRequired, badge.isActive);
    }

    /**
     * @dev Get all badges owned by a player
     */
    function getPlayerBadges(address player) external view returns (uint256[] memory) {
        return playerBadges[player];
    }

    /**
     * @dev Check if a player owns a specific badge
     */
    function hasPlayerBadge(address player, uint256 badgeId) external view returns (bool) {
        return hasBadge[player][badgeId];
    }

    /**
     * @dev Get total number of badges
     */
    function getTotalBadges() external view returns (uint256) {
        return _badgeIds;
    }

    /**
     * @dev Get all available badges for a player based on XP
     */
    function getAvailableBadges(address player, uint256 playerXP) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256 totalBadges = _badgeIds;
        uint256[] memory tempBadges = new uint256[](totalBadges);
        uint256 availableCount = 0;

        for (uint256 i = 1; i <= totalBadges; i++) {
            if (badges[i].isActive && 
                playerXP >= badges[i].xpRequired && 
                !hasBadge[player][i]) {
                tempBadges[availableCount] = i;
                availableCount++;
            }
        }

        uint256[] memory result = new uint256[](availableCount);
        for (uint256 i = 0; i < availableCount; i++) {
            result[i] = tempBadges[i];
        }

        return result;
    }

    /**
     * @dev Override URI function for metadata
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        require(tokenId > 0 && tokenId <= _badgeIds, "Invalid badge ID");
        return badges[tokenId].uri;
    }

    /**
     * @dev Set URI for a badge (owner only)
     */
    function setBadgeURI(uint256 badgeId, string memory uri_) external onlyOwner {
        require(badgeId > 0 && badgeId <= _badgeIds, "Invalid badge ID");
        badges[badgeId].uri = uri_;
    }

    /**
     * @dev Emergency function to pause/unpause badge minting
     */
    function setBadgeActive(uint256 badgeId, bool isActive) external onlyOwner {
        require(badgeId > 0 && badgeId <= _badgeIds, "Invalid badge ID");
        badges[badgeId].isActive = isActive;
    }

    /**
     * @dev Override supportsInterface
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        virtual 
        override(ERC1155) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
} 