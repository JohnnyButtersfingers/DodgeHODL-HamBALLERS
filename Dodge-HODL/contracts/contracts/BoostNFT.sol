// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

/**
 * @title BoostNFT
 * @dev ERC-1155 NFT collection for HamBaller.xyz game boosts
 * 
 * Features:
 * - One-time use boost mechanics
 * - Multiple boost types with different rarities
 * - Burnable on use for scarcity
 * - Role-based minting for game rewards
 * - Supply tracking for economics
 */
contract BoostNFT is ERC1155, AccessControl, ERC1155Burnable, ERC1155Supply {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // Boost types and their properties
    enum BoostType {
        SPEED_BOOST,      // ID: 1 - Faster movement
        SHIELD_BOOST,     // ID: 2 - Temporary invincibility  
        DOUBLE_POINTS,    // ID: 3 - 2x CP rewards
        LUCKY_DODGE,      // ID: 4 - Higher dodge chance
        BONUS_THROW       // ID: 5 - Extra Bonus Throw™
    }
    
    // Boost metadata
    struct BoostInfo {
        string name;
        string description;
        uint256 rarity;      // 1-5 (5 being rarest)
        uint256 maxSupply;   // Max tokens that can exist
        bool isActive;       // Can this boost be minted/used
    }
    
    mapping(uint256 => BoostInfo) public boostInfo;
    mapping(address => mapping(uint256 => uint256)) public playerBoostUsage;
    
    // Events
    event BoostCreated(uint256 indexed tokenId, string name, uint256 rarity, uint256 maxSupply);
    event BoostUsed(address indexed player, uint256 indexed tokenId, uint256 amount);
    event BoostActivated(uint256 indexed tokenId);
    event BoostDeactivated(uint256 indexed tokenId);

    constructor(string memory baseURI) ERC1155(baseURI) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        
        // Initialize boost types
        _createBoostType(1, "Speed Boost", "Increases movement speed for one run", 3, 1000);
        _createBoostType(2, "Shield Boost", "Temporary invincibility shield", 4, 500);  
        _createBoostType(3, "Double Points", "2x Chess Puffs reward", 2, 2000);
        _createBoostType(4, "Lucky Dodge", "Higher dodge chance", 3, 800);
        _createBoostType(5, "Bonus Throw", "Extra Bonus Throw opportunity", 5, 200);
    }

    /**
     * @dev Create a new boost type (admin only)
     */
    function _createBoostType(
        uint256 tokenId,
        string memory name,
        string memory description,
        uint256 rarity,
        uint256 maxSupply
    ) internal {
        boostInfo[tokenId] = BoostInfo({
            name: name,
            description: description,
            rarity: rarity,
            maxSupply: maxSupply,
            isActive: true
        });
        
        emit BoostCreated(tokenId, name, rarity, maxSupply);
    }

    /**
     * @dev Mint boost tokens to address (only MINTER_ROLE)
     */
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) {
        require(boostInfo[id].isActive, "BoostNFT: Boost type not active");
        require(
            totalSupply(id) + amount <= boostInfo[id].maxSupply,
            "BoostNFT: Exceeds max supply"
        );
        
        _mint(to, id, amount, data);
    }

    /**
     * @dev Batch mint multiple boost types
     */
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) {
        for (uint256 i = 0; i < ids.length; i++) {
            require(boostInfo[ids[i]].isActive, "BoostNFT: Boost type not active");
            require(
                totalSupply(ids[i]) + amounts[i] <= boostInfo[ids[i]].maxSupply,
                "BoostNFT: Exceeds max supply"
            );
        }
        
        _mintBatch(to, ids, amounts, data);
    }

    /**
     * @dev Use a boost (burns the token)
     */
    function useBoost(uint256 id, uint256 amount) public {
        require(balanceOf(msg.sender, id) >= amount, "BoostNFT: Insufficient balance");
        require(boostInfo[id].isActive, "BoostNFT: Boost type not active");
        
        burn(msg.sender, id, amount);
        playerBoostUsage[msg.sender][id] += amount;
        
        emit BoostUsed(msg.sender, id, amount);
    }

    /**
     * @dev Get boost information
     */
    function getBoostInfo(uint256 id) public view returns (BoostInfo memory) {
        return boostInfo[id];
    }

    /**
     * @dev Get player's boost usage stats
     */
    function getPlayerBoostUsage(address player, uint256 id) public view returns (uint256) {
        return playerBoostUsage[player][id];
    }

    /**
     * @dev Toggle boost active status (admin only)
     */
    function toggleBoostActive(uint256 id) public onlyRole(DEFAULT_ADMIN_ROLE) {
        boostInfo[id].isActive = !boostInfo[id].isActive;
        
        if (boostInfo[id].isActive) {
            emit BoostActivated(id);
        } else {
            emit BoostDeactivated(id);
        }
    }

    /**
     * @dev Update base URI (admin only)
     */
    function setURI(string memory newURI) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newURI);
    }

    /**
     * @dev Required override for _update function
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}