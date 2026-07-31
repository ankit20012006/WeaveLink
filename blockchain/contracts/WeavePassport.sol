// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title WeavePassport
/// @notice ERC-721 evidence records for artisan-approved handloom passports.
/// @dev The token proves that a record hash was anchored. It does not itself
///      establish legal ownership, GI authorization, or physical authenticity.
contract WeavePassport is ERC721URIStorage, Ownable {
    uint256 public nextTokenId = 1;

    mapping(bytes32 recordHash => uint256 tokenId) public tokenByRecordHash;
    mapping(string passportId => uint256 tokenId) public tokenByPassportId;

    event PassportMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        bytes32 indexed recordHash,
        string passportId,
        string tokenUri
    );

    error EmptyPassportId();
    error EmptyRecordHash();
    error PassportAlreadyMinted(string passportId);
    error RecordAlreadyMinted(bytes32 recordHash);

    constructor(address initialOwner)
        ERC721("WeaveLink Artisan Passport", "WEAVE")
        Ownable(initialOwner)
    {}

    function mintPassport(
        address recipient,
        string calldata passportId,
        bytes32 recordHash,
        string calldata tokenUri
    ) external onlyOwner returns (uint256 tokenId) {
        if (bytes(passportId).length == 0) revert EmptyPassportId();
        if (recordHash == bytes32(0)) revert EmptyRecordHash();
        if (tokenByPassportId[passportId] != 0) {
            revert PassportAlreadyMinted(passportId);
        }
        if (tokenByRecordHash[recordHash] != 0) {
            revert RecordAlreadyMinted(recordHash);
        }

        tokenId = nextTokenId++;
        tokenByPassportId[passportId] = tokenId;
        tokenByRecordHash[recordHash] = tokenId;

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, tokenUri);

        emit PassportMinted(
            tokenId,
            recipient,
            recordHash,
            passportId,
            tokenUri
        );
    }
}
