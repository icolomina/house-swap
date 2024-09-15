import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { HouseAsset } from "../typechain-types/contracts/HouseAsset";

describe("House Asset Contract", function () {

    let houseAssetContract: HouseAsset;
    let owner: SignerWithAddress;
    let nonOwner: SignerWithAddress;
    let addr1: SignerWithAddress;

    beforeEach(async function() {
        [owner, nonOwner, addr1] = await ethers.getSigners();
        houseAssetContract = await ethers.deployContract("HouseAsset", ['MyAsset', 'MYA']) as HouseAsset;
    });

    it("AssignToken assigs tokenId and ", async function () {
        const tokenUri = 'https://www.assetinfo.com';
        const to = await addr1.getAddress();
        await houseAssetContract.connect(owner).assignToken(1, tokenUri, to);
        expect(await houseAssetContract.ownerOf(1)).to.equal(to);
        expect(await houseAssetContract.tokenURI(1)).to.equal(tokenUri);
    });

    it("AssignToken must be called by the owner ", async function () {
        const tokenUri = 'https://www.assetinfo.com';
        const to = await addr1.getAddress();
        await expect( houseAssetContract.connect(nonOwner).assignToken(1, tokenUri, to)).to.be.revertedWith('Ownable: caller is not the owner');
    });

});