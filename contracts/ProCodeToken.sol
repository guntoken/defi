// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ProCodeToken is ERC20, Ownable {
    event MinterChanged(address indexed from, address to);

    constructor() ERC20("ProCode Token", "PCD") {}

    function passMinterRole(address dBank) public onlyOwner returns (bool) {
        transferOwnership(dBank);
        
        emit MinterChanged(msg.sender, dBank);
        return true;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
