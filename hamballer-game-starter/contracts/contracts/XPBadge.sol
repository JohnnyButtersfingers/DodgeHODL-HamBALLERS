pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title XPBadge
 * @dev Simple ERC721 NFT that represents XP achievements. Supports basic
 *      composability with child tokens (ERC-998 subset).
 */
contract XPBadge is ERC721, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct BadgeInfo {
        uint256 xpValue;
        uint256 seasonId;
    }

    Counters.Counter private _tokenIdCounter;
    mapping(uint256 => BadgeInfo) public badgeInfo;
    mapping(uint256 => mapping(address => bool)) private _minted;

    struct ChildToken {
        address contractAddress;
        uint256 tokenId;
    }

    mapping(uint256 => ChildToken[]) private _children;

    event ChildAdded(uint256 indexed parentId, address childContract, uint256 childId);

    constructor() ERC721("XP Badge", "XPB") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mintBadge(address to, uint256 xpValue, uint256 seasonId) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(!_minted[seasonId][to], "XPBadge: already minted");
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(to, tokenId);
        badgeInfo[tokenId] = BadgeInfo({xpValue: xpValue, seasonId: seasonId});
        _minted[seasonId][to] = true;
        return tokenId;
    }

    function hasMinted(address user, uint256 seasonId) external view returns (bool) {
        return _minted[seasonId][user];
    }

    // Basic child composition support (ERC-998 lite)
    function addChild(uint256 parentId, address childContract, uint256 childId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_exists(parentId), "XPBadge: parent does not exist");
        _children[parentId].push(ChildToken({contractAddress: childContract, tokenId: childId}));
        emit ChildAdded(parentId, childContract, childId);
    }

    function getChildren(uint256 parentId) external view returns (ChildToken[] memory) {
        return _children[parentId];
    }
}


