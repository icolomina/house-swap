import { expect } from "chai";
import { ethers } from "hardhat";
import { HouseSwap } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("House Swap Contract", function () {

  let houseSwapContract: HouseSwap;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let targetAddress: string;
  let targetAddress2: string;
  let house: HouseSwap.HouseStruct;
  let houseToSwap: HouseSwap.HouseStruct;
  let amountPayOriginToTarget: number;
  let amountPayTargetToOrigin: number;

  beforeEach(async function() {
    [owner, addr1, addr2] = await ethers.getSigners();
    targetAddress   = await addr1.getAddress();
    targetAddress2  = await addr2.getAddress();
    house = {houseType: "semi-detached house", value: 16698645, link: "https://example.com", propietary: targetAddress};
    houseToSwap = {houseType: "duplex", value: 16698645, link: "https://example2.com", propietary: targetAddress}
    amountPayOriginToTarget = 0;
    amountPayTargetToOrigin = 0;

    houseSwapContract = await ethers.deployContract("HouseSwap") as HouseSwap;
  });

  it("Expects initial status to be P", async function () {
    expect(await houseSwapContract.getStatus()).to.equal(0);
  });

  it("Should reject adding a new offer since contract has not initialized", async function() {

    await expect(houseSwapContract.connect(addr1).addOffer(house, amountPayOriginToTarget, amountPayTargetToOrigin)).to.be.revertedWith('An offer has been already accepted or contract has not been initialized');
  });

  it("Should emit a 'NewOffer' event afer offer sent", async function() {

    await houseSwapContract.initialize(house);
    expect(await houseSwapContract.getStatus()).to.equal(1);
    await expect(houseSwapContract.connect(addr1).addOffer(house, amountPayOriginToTarget, amountPayTargetToOrigin)).to.emit(houseSwapContract, "NewOffer");
  });


  it("Should not accept the offer only the owner can accept an offer", async function() {
    await houseSwapContract.initialize(house);
    await expect(houseSwapContract.connect(addr1).addOffer(houseToSwap, amountPayOriginToTarget, amountPayTargetToOrigin)).to.emit(houseSwapContract, "NewOffer");
    await expect(houseSwapContract.connect(addr2).acceptOffer(targetAddress, house, amountPayOriginToTarget, amountPayTargetToOrigin)).to.be.revertedWith('Required contract owner');
  });

  it("Should accept an offer and reject others", async function() {

    await houseSwapContract.initialize(house);
    await expect(houseSwapContract.connect(addr1).addOffer(houseToSwap, amountPayOriginToTarget, amountPayTargetToOrigin)).to.emit(houseSwapContract, "NewOffer");
    houseSwapContract.acceptOffer(targetAddress, houseToSwap, amountPayOriginToTarget, amountPayTargetToOrigin);
    expect(await houseSwapContract.getStatus()).to.equal(2);
    await expect(houseSwapContract.connect(addr1).addOffer(houseToSwap, amountPayOriginToTarget, amountPayTargetToOrigin)).to.be.revertedWith('An offer has been already accepted or contract has not been initialized');
  });

  it("Should not perform swap because sender is not who sent the offer", async function() {
    await houseSwapContract.initialize(house);
    await houseSwapContract.connect(addr1).addOffer(houseToSwap, amountPayOriginToTarget, amountPayTargetToOrigin);
    await houseSwapContract.acceptOffer(targetAddress, houseToSwap, amountPayOriginToTarget, amountPayTargetToOrigin);
    await expect(houseSwapContract.connect(addr2).performSwap()).to.be.revertedWith('Only target user can confirm swap');
  });

  it("Should perform swap without extra transfers", async function() {
    await houseSwapContract.initialize(house);
    await houseSwapContract.connect(addr1).addOffer(houseToSwap, amountPayOriginToTarget, amountPayTargetToOrigin);
    await houseSwapContract.acceptOffer(targetAddress, houseToSwap, amountPayOriginToTarget, amountPayTargetToOrigin);
    await houseSwapContract.connect(addr1).performSwap();

    expect(await houseSwapContract.getStatus()).to.equal(3);
  });

  it("Deposit should fail since owner must send funds", async function() {
    await houseSwapContract.initialize(house);
    await houseSwapContract.connect(addr1).addOffer(houseToSwap, 1, amountPayTargetToOrigin);
    await houseSwapContract.acceptOffer(targetAddress, houseToSwap, 1, amountPayTargetToOrigin);
    await expect(houseSwapContract.connect(addr1).deposit({ value: ethers.utils.parseEther('1') })).to.be.revertedWith("Origin must deposit enougth funds");
  });

  it("Deposit should fail since target must send funds", async function() {

    await houseSwapContract.initialize(house);
    await houseSwapContract.connect(addr1).addOffer(houseToSwap, amountPayOriginToTarget, 1);
    await houseSwapContract.acceptOffer(targetAddress, houseToSwap, amountPayOriginToTarget, 1);
    await expect(houseSwapContract.deposit({ value: ethers.utils.parseEther('1') })).to.be.revertedWith("Target must deposit enougth funds");
  });

  it("Owner deposit should work", async function() {

    await houseSwapContract.initialize(house);
    await houseSwapContract.connect(addr1).addOffer(houseToSwap, 1, amountPayTargetToOrigin);
    await houseSwapContract.acceptOffer(targetAddress, houseToSwap, 1, amountPayTargetToOrigin);
    await expect(houseSwapContract.deposit({ value: ethers.utils.parseEther('1') })).to.emit(houseSwapContract, "BalanceUpdated");
  });

  it("Swap should fail because funds deposited are not enought", async function() {
    await houseSwapContract.initialize(house);
    await houseSwapContract.connect(addr1).addOffer(houseToSwap, 1, amountPayTargetToOrigin);
    await houseSwapContract.acceptOffer(targetAddress, houseToSwap, 1, amountPayTargetToOrigin);
    await houseSwapContract.deposit({ value: ethers.utils.parseEther('0.8') });

    await expect(houseSwapContract.connect(addr1).performSwap()).to.be.revertedWith("Deposit has not been sent or is lower than required")
  });

  it("Swap transferring funds from origin to target should be done", async function() {

    await houseSwapContract.initialize(house);
    await houseSwapContract.connect(addr1).addOffer(houseToSwap, 1, amountPayTargetToOrigin);
    await houseSwapContract.acceptOffer(targetAddress, houseToSwap, 1, amountPayTargetToOrigin);
    await houseSwapContract.deposit({ value: ethers.utils.parseEther('1.05') });

    await houseSwapContract.connect(addr1).performSwap();
    expect(await houseSwapContract.getStatus()).to.equal(3);
  });

});