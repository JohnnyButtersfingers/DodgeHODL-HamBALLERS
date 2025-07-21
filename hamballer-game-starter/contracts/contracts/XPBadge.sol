// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title XPBadge
 * @dev NFT contract for HamBaller XP badges
 * Badge tiers: 0=Participation, 1=Common, 2=Rare, 3=Epic, 4=Legendary
 */
contract XPBadge is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    uint256 private _nextTokenId = 1;
    
    string private _baseTokenURI;
    
    // Badge metadata
    struct BadgeInfo {
        uint256 xpEarned;
        uint256 season;
        uint256 runId;
        uint256 mintedAt;
    }
    
    // Mapping from token ID to badge info
    mapping(uint256 => BadgeInfo) public badgeInfo;
    
    // Events
    event BadgeMinted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 xpEarned,
        uint256 season,
        uint256 runId
    );
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) {
        _baseTokenURI = baseTokenURI;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }
    
    /**
     * @dev Mint a new XP badge
     * @param to The address to mint the badge to
     * @param xpEarned The XP amount earned
     * @param season The season number
     * @param runId The run ID that earned this badge
     * @return tokenId The ID of the newly minted badge
     */
    function mintBadge(
        address to,
        uint256 xpEarned,
        uint256 season,
        uint256 runId
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(xpEarned > 0, "XP must be greater than 0");
        
        uint256 newTokenId = _nextTokenId;
        _nextTokenId++;
        
        _safeMint(to, newTokenId);
        
        badgeInfo[newTokenId] = BadgeInfo({
            xpEarned: xpEarned,
            season: season,
            runId: runId,
            mintedAt: block.timestamp
        });
        
        emit BadgeMinted(to, newTokenId, xpEarned, season, runId);
        
        return newTokenId;
    }
    
    /**
     * @dev Get badge tier based on XP earned
     * @param xpEarned The XP amount
     * @return tier The badge tier (0-4)
     */
    function getBadgeTier(uint256 xpEarned) public pure returns (uint256) {
        if (xpEarned >= 100) return 4; // Legendary
        if (xpEarned >= 75) return 3;  // Epic
        if (xpEarned >= 50) return 2;  // Rare
        if (xpEarned >= 25) return 1;  // Common
        return 0; // Participation
    }
    
    /**
     * @dev Get badge info for a token
     * @param tokenId The token ID
     * @return info The badge information
     */
    function getBadgeInfo(uint256 tokenId) external view returns (BadgeInfo memory) {
        require(ownerOf(tokenId) != address(0), "Badge does not exist");
        return badgeInfo[tokenId];
    }
    
    /**
     * @dev Get total number of badges minted
     * @return count The total count
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }
    
    /**
     * @dev Get badges owned by an address
     * @param owner The address to query
     * @return tokenIds Array of token IDs owned
     */
    function getBadgesByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);
        
        uint256 index = 0;
        for (uint256 i = 1; i < _nextTokenId; i++) {
            try this.ownerOf(i) returns (address tokenOwner) {
                if (tokenOwner == owner) {
                    tokenIds[index] = i;
                    index++;
                }
            } catch {
                // Token doesn't exist, skip
            }
        }
        
        return tokenIds;
    }
    
    /**
     * @dev Override base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Set base URI (admin only)
     */
    function setBaseURI(string memory newBaseURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = newBaseURI;
    }
    
    /**
     * @dev Required override for AccessControl
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 