// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";

/**
 * @title DBPToken
 * @dev Dodge Ball Points - ERC-20 token for HamBaller.xyz
 * 
 * Features:
 * - Mintable by authorized contracts (HODLManager)
 * - Burnable for game mechanics
 * - Pausable for emergency situations
 * - Role-based access control
 * - Optional transfer restrictions for game balance
 */
contract DBPToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // Game mechanics state
    bool public transfersEnabled = true;
    mapping(address => bool) public gameContracts;
    
    // Events
    event TransfersToggled(bool enabled);
    event GameContractAdded(address indexed contractAddress);
    event GameContractRemoved(address indexed contractAddress);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Mint tokens to address (only MINTER_ROLE)
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Pause token transfers (only PAUSER_ROLE)
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause token transfers (only PAUSER_ROLE)
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Toggle transfer restrictions for game balance
     */
    function toggleTransfers() public onlyRole(DEFAULT_ADMIN_ROLE) {
        transfersEnabled = !transfersEnabled;
        emit TransfersToggled(transfersEnabled);
    }

    /**
     * @dev Add authorized game contract
     */
    function addGameContract(address contractAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        gameContracts[contractAddress] = true;
        emit GameContractAdded(contractAddress);
    }

    /**
     * @dev Remove authorized game contract
     */
    function removeGameContract(address contractAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        gameContracts[contractAddress] = false;
        emit GameContractRemoved(contractAddress);
    }

    /**
     * @dev Override _update to check restrictions and handle pausable functionality
     */
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
        
        // Allow minting/burning and game contract interactions
        if (from == address(0) || to == address(0) || gameContracts[msg.sender]) {
            return;
        }
        
        require(transfersEnabled, "DBP: Transfers are currently disabled");
    }

    /**
     * @dev Required override for AccessControl
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
