// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol"; 


contract HouseAsset is ERC721URIStorage, Ownable {

    constructor(string memory _name, string memory _symbol) 
        ERC721(_name, _symbol)
        Ownable(msg.sender)
    { }

    function assignToken(uint256 tokenId, string memory _tokenURI, address to) public onlyOwner {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }
}