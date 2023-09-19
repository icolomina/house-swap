const { expect } = require("chai");

describe("House Swap Contract", function () {

  async function getData() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const targetAddress   = await addr1.getAddress();
    const targetAddress2  = await addr2.getAddress();
    const house = ["semi-detached house", 16698645, "https://example.com", targetAddress];
    const houseToSwap = ["duplex", 16698645, "https://example2.com", targetAddress]
    const amountPayOriginToTarget = 0;
    const amountPayTargetToOrigin = 0;

    return { owner, targetAddress, targetAddress2, house, houseToSwap, amountPayOriginToTarget, amountPayTargetToOrigin, addr2, addr1  };
  }

  it("Expects initial status to be P", async function () {
    const houseSwapToken = await ethers.deployContract("HouseSwap");
    expect(await houseSwapToken.getStatus()).to.equal(0);
  });

  it("Should reject adding a new offer since contract has not initialized", async function() {

    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap");
    await expect(houseSwapToken.connect(data.addr1).addOffer(data.house, data.amountPayOriginToTarget, data.amountPayTargetToOrigin)).to.be.revertedWith('An offer has been already accepted or contract has not been initialized');
  });

  it("Should emit a 'NewOffer' event afer offer sent", async function() {

    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap");
    await houseSwapToken.initialize(data.house);
    expect(await houseSwapToken.getStatus()).to.equal(1);
    await expect(houseSwapToken.connect(data.addr1).addOffer(data.house, data.amountPayOriginToTarget, data.amountPayTargetToOrigin)).to.emit(houseSwapToken, "NewOffer");
  });


  it("Should not accept the offer only the owner can accept an offer", async function() {
    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap");
    await houseSwapToken.initialize(data.house);
    await expect(houseSwapToken.connect(data.addr1).addOffer(data.houseToSwap, data.amountPayOriginToTarget, data.amountPayTargetToOrigin)).to.emit(houseSwapToken, "NewOffer");
    await expect(houseSwapToken.connect(data.addr2).acceptOffer(data.targetAddress, data.house, data.amountPayOriginToTarget, data.amountPayTargetToOrigin)).to.be.revertedWith('Required contract owner');
  });

  it("Should accept an offer and reject others", async function() {

    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap");

    await houseSwapToken.initialize(data.house);
    await expect(houseSwapToken.connect(data.addr1).addOffer(data.houseToSwap, data.amountPayOriginToTarget, data.amountPayTargetToOrigin)).to.emit(houseSwapToken, "NewOffer");
    houseSwapToken.acceptOffer(data.targetAddress, data.houseToSwap, data.amountPayOriginToTarget, data.amountPayTargetToOrigin);
    expect(await houseSwapToken.getStatus()).to.equal(2);
    await expect(houseSwapToken.connect(data.addr1).addOffer(data.houseToSwap, data.amountPayOriginToTarget, data.amountPayTargetToOrigin)).to.be.revertedWith('An offer has been already accepted or contract has not been initialized');
  });

  it("Should not perform swap because sender is not who sent the offer", async function() {
    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap");
    await houseSwapToken.initialize(data.house);
    await houseSwapToken.connect(data.addr1).addOffer(data.houseToSwap, data.amountPayOriginToTarget, data.amountPayTargetToOrigin);
    await houseSwapToken.acceptOffer(data.targetAddress, data.houseToSwap, data.amountPayOriginToTarget, data.amountPayTargetToOrigin);
    await expect(houseSwapToken.connect(data.addr2).performSwap()).to.be.revertedWith('Only target user can confirm swap');
  });

  it("Should perform swap without extra transfers", async function() {
    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap");
    await houseSwapToken.initialize(data.house);
    await houseSwapToken.connect(data.addr1).addOffer(data.houseToSwap, data.amountPayOriginToTarget, data.amountPayTargetToOrigin);
    await houseSwapToken.acceptOffer(data.targetAddress, data.houseToSwap, data.amountPayOriginToTarget, data.amountPayTargetToOrigin);
    await houseSwapToken.connect(data.addr1).performSwap();

    expect(await houseSwapToken.getStatus()).to.equal(3);
  });

  it("Deposit should fail since owner must send funds", async function() {

    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap");

    await houseSwapToken.initialize(data.house);
    await houseSwapToken.connect(data.addr1).addOffer(data.houseToSwap, 1, data.amountPayTargetToOrigin);
    await houseSwapToken.acceptOffer(data.targetAddress, data.houseToSwap, 1, data.amountPayTargetToOrigin);
    await expect(houseSwapToken.connect(data.addr1).deposit({ value: ethers.utils.parseEther('1') })).to.be.revertedWith("Origin must deposit enougth funds");
  });

  it("Deposit should fail since target must send funds", async function() {

    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap");

    await houseSwapToken.initialize(data.house);
    await houseSwapToken.connect(data.addr1).addOffer(data.houseToSwap, data.amountPayOriginToTarget, 1);
    await houseSwapToken.acceptOffer(data.targetAddress, data.houseToSwap, data.amountPayOriginToTarget, 1);
    await expect(houseSwapToken.deposit({ value: ethers.utils.parseEther('1') })).to.be.revertedWith("Target must deposit enougth funds");
  });

  it("Owner deposit should work", async function() {

    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap");

    await houseSwapToken.initialize(data.house);
    await houseSwapToken.connect(data.addr1).addOffer(data.houseToSwap, 1, data.amountPayTargetToOrigin);
    await houseSwapToken.acceptOffer(data.targetAddress, data.houseToSwap, 1, data.amountPayTargetToOrigin);
    await expect(houseSwapToken.deposit({ value: ethers.utils.parseEther('1') })).to.emit(houseSwapToken, "BalanceUpdated");
  });

  it("Swap should fail because funds deposited are not enought", async function() {

    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap");

    await houseSwapToken.initialize(data.house);
    await houseSwapToken.connect(data.addr1).addOffer(data.houseToSwap, 1, data.amountPayTargetToOrigin);
    await houseSwapToken.acceptOffer(data.targetAddress, data.houseToSwap, 1, data.amountPayTargetToOrigin);
    await houseSwapToken.deposit({ value: ethers.utils.parseEther('0.8') });

    await expect(houseSwapToken.connect(data.addr1).performSwap()).to.be.revertedWith("Deposit has not been sent or is lower than required")
  });

  it("Swap transferring funds from origin to target should be done", async function() {

    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap");

    await houseSwapToken.initialize(data.house);
    await houseSwapToken.connect(data.addr1).addOffer(data.houseToSwap, 1, data.amountPayTargetToOrigin);
    await houseSwapToken.acceptOffer(data.targetAddress, data.houseToSwap, 1, data.amountPayTargetToOrigin);
    await houseSwapToken.deposit({ value: ethers.utils.parseEther('1.05') });

    await houseSwapToken.connect(data.addr1).performSwap();
    expect(await houseSwapToken.getStatus()).to.equal(3);
  });

});