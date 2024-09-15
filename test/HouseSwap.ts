import { expect } from "chai";
import { ethers } from "hardhat";
import { HouseAsset, HouseSwap, HouseTestTokenERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("House Swap Contract", function () {

  let houseSwapContract: HouseSwap;
  let houseAssetContract: HouseAsset;
  let tokenERC20Contract: HouseTestTokenERC20;

  let owner: SignerWithAddress;
  let originOwner: SignerWithAddress;
  let targetOwner: SignerWithAddress;
  let originOwnerAddress: string;
  let targetOwnerAddress: string;
  let amountPayOriginToTarget: number;
  let amountPayTargetToOrigin: number;

  const tokenIdOrigin = 1;
  const tokenIdTarget = 2;
  const tokenUriOrigin = 'https://www.tokenUriOrigin.com';
  const tokenUriTarget = 'https://www.tokenUriTarget.com';
  

  beforeEach(async function() {
    [owner, originOwner, targetOwner] = await ethers.getSigners();
    originOwnerAddress  = await originOwner.getAddress();
    targetOwnerAddress  = await targetOwner.getAddress();
    amountPayOriginToTarget = 0;
    amountPayTargetToOrigin = 0;

    houseAssetContract = await ethers.deployContract("HouseAsset", ['HouseAsset', 'HSA'], owner) as HouseAsset;
    tokenERC20Contract = await ethers.deployContract("HouseTestTokenERC20", ['DollarTest', 'DTS'], owner) as HouseTestTokenERC20;
    await houseAssetContract.connect(owner).assignToken(tokenIdOrigin, tokenUriOrigin, originOwnerAddress);
    await houseAssetContract.connect(owner).assignToken(tokenIdTarget, tokenUriTarget, targetOwnerAddress);

    const houseAssetAddress: string = await houseAssetContract.getAddress();
    const tokenERC20Address: string = await tokenERC20Contract.getAddress();

    houseSwapContract = await ethers.deployContract("HouseSwap", [houseAssetAddress, tokenERC20Address, tokenIdOrigin], owner) as HouseSwap;

  });

  /**
   * Tests the complete flow to make a swap with any payments
   * 
   * @see  {@link _testInitAndAcceptOffer}
   * @see  {@link _testApproveContractToSwapAssets}
   * @see  {@link _testContractFinshedAndSwapDone}
   */
  it("Swap success without payment", async function () {

    await _testInitAndAcceptOffer(false);
    await _testApproveContractToSwapAssets();
    await _testContractFinshedAndSwapDone();

  });

  /**
   * Tests the complete flow to make a swap where origin must pay to target
   * Initialize amountPayOriginToTarget and mint origin owner to satisfy the payment
   * Approve contract address to transfer the "amountPayOriginToTarget" from origin to target
   * 
   * @see  {@link _testInitAndAcceptOffer}
   * @see  {@link _testApproveContractToSwapAssets}
   * @see  {@link _testContractFinshedAndSwapDone}
   */
  it("Swap success with payment from origin to target", async function () {

    amountPayOriginToTarget = 1653;
    await tokenERC20Contract.mint(originOwnerAddress, 2000);

    await _testInitAndAcceptOffer(true);

    // Let's approve the contract address to move tokens from origin to target
    await tokenERC20Contract.connect(originOwner).approve(await houseSwapContract.getAddress(), 1653);
    await houseSwapContract.connect(originOwner).payFromOriginToTarget();
    expect(await houseSwapContract.getStatus()).to.equal(2);

    await _testApproveContractToSwapAssets();
    await _testContractFinshedAndSwapDone();

  });

  /**
   * Tests the complete flow to make a swap where target must pay to origin
   * Initialize amountPayTargetToOrigin and mint target owner to satisfy the payment
   * Approve contract address to transfer the "amountPayTargetToOrigin" from target to origin
   * 
   * @see  {@link _testInitAndAcceptOffer}
   * @see  {@link _testApproveContractToSwapAssets}
   * @see  {@link _testContractFinshedAndSwapDone}
   */
  it("Swap success with payment from target to origin", async function () {

    amountPayTargetToOrigin = 1653;
    await tokenERC20Contract.mint(targetOwnerAddress, 2000);
    await _testInitAndAcceptOffer(true);

    // Let's approve the contract address to move tokens from target to origin
    await tokenERC20Contract.connect(targetOwner).approve(await houseSwapContract.getAddress(), 1653);
    await houseSwapContract.connect(targetOwner).payFromTargetToOrigin();
    expect(await houseSwapContract.getStatus()).to.equal(2);

    await _testApproveContractToSwapAssets();
    await _testContractFinshedAndSwapDone();

  });

  /**
   * Tests decline offer. After an offer it's been declined the swapOffers variable must have been reduced by 1
   */
  it("Decline offer", async function () {
    await houseSwapContract.connect(targetOwner).addOffer(tokenIdTarget, amountPayOriginToTarget, amountPayTargetToOrigin);
    expect(await houseSwapContract.getSwapOffers()).to.equal(1);
    await houseSwapContract.connect(originOwner).declineOffer(tokenIdTarget);
    expect(await houseSwapContract.getSwapOffers()).to.equal(0);
  });

  /**
   * Tests AddOffer must revert when token id sent is 0
   */
  it("AddOffer Token Id must be greater than 0", async function () {
    expect(houseSwapContract.connect(targetOwner).addOffer(0, amountPayOriginToTarget, amountPayTargetToOrigin)).to.be.revertedWith('Target token ID must be greater than 0');
  });

  /**
   * Tests AddOffer must revert when called by the Zero Address
   */
  it("AddOffer sender cannot be address 0", async function () {
    const zeroAddr = await ethers.getSigner(ethers.ZeroAddress);
    expect(houseSwapContract.connect(zeroAddr).addOffer(tokenIdTarget, amountPayOriginToTarget, amountPayTargetToOrigin)).to.be.revertedWith('Cannot be 0 address');
  })

  /**
   * Tests the initial status after the contract is deployed and the status after an offer is accepted
   * @param {bool} hasPayment If contract requires no payment, after the offer is accepted contract status becomes PAID. Otherwise becomes ACCEPTED
   */
  async function _testInitAndAcceptOffer(hasPayment: boolean) 
  {
    const expectedStatus = (hasPayment) ? 1 : 2;
    expect(await houseSwapContract.getStatus()).to.equal(0);

    await expect(houseSwapContract.connect(targetOwner).addOffer(tokenIdTarget, amountPayOriginToTarget, amountPayTargetToOrigin)).to.emit(houseSwapContract, "NewOffer");
    await houseSwapContract.connect(originOwner).acceptOffer(tokenIdTarget);
    expect(await houseSwapContract.getStatus()).to.equal(expectedStatus);
  }

  /**
   * Tests that, after the contract addresshas been approved to change the asset owners, the swap can be done
   */
  async function _testApproveContractToSwapAssets() 
  {
    // Let's approve the contract to swap assets
    await houseAssetContract.connect(originOwner).approve(await houseSwapContract.getAddress(), tokenIdOrigin);
    await houseAssetContract.connect(targetOwner).approve(await houseSwapContract.getAddress(), tokenIdTarget);
    await houseSwapContract.connect(owner).performSwap();
  }

  /**
   * Tests that, after the swap has been done, origin owns target and viceversa
   */
  async function _testContractFinshedAndSwapDone() {

    expect(await houseSwapContract.getStatus()).to.equal(3);
    expect(await houseAssetContract.ownerOf(tokenIdOrigin)).to.equal(targetOwner);
    expect(await houseAssetContract.ownerOf(tokenIdTarget)).to.equal(originOwner);
  }

});
