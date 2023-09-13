const { expect } = require("chai");

describe("House Swap Contract", function () {

  async function getData() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const targetAddress   = await addr1.getAddress();
    const targetAddress2  = await addr2.getAddress();
    const house = ["semi-detached house", 16698645, "https://example.com", targetAddress];
    const extra = [0, 0];

    return { owner, targetAddress, targetAddress2, house, extra };
  }

  it("Expects initial status to be P", async function () {
    const houseSwapToken = await ethers.deployContract("HouseSwap");
    expect(await houseSwapToken.getStatus()).to.equal('P');
  });

  it("Should emit a 'NewOffer' event afer offer sent", async function() {

    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap");
    await expect(houseSwapToken.addOffer(data.targetAddress, data.house, data.extra)).to.emit(houseSwapToken, "NewOffer");
  });

  it("Should confirm swap and change propietaries", async function() {

    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap");

    houseSwapToken.acceptOffer(data.targetAddress, data.house, data.extra);
    expect(await houseSwapToken.getStatus()).to.equal('A');
    await expect(houseSwapToken.addOffer(data.targetAddress, data.house, data.extra)).to.be.revertedWith('An offer has been already accepted');
    await expect(houseSwapToken.performSwap(data.targetAddress2)).to.be.revertedWith('Target user should be registered buyer');

    await houseSwapToken.confirmOfferAcceptation(data.targetAddress);
    const swap = await houseSwapToken.info();
    const ownerAddress = await data.owner.getAddress();

    expect(await houseSwapToken.getStatus()).to.equal('F');
    expect(swap.origin.propietary).to.equal(data.targetAddress);
    expect(swap.target.propietary).to.equal(ownerAddress);
  });

  it("Should confirm swap, but fails because owner has insuffient balance", async function() {

    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap");

    data.extra = [1, 0];
    await houseSwapToken.acceptOffer(data.targetAddress, data.house, data.extra);
    await houseSwapToken.deposit({ value: ethers.utils.parseEther('0.5') });
    await expect(houseSwapToken.performSwap(data.targetAddress)).to.be.revertedWith('Deposit has not been sent or is lower than required');
  });

  it("Should confirm swap, transfer the funds from origin to target and change status", async function() {
    const data = await getData();
    const houseSwapToken = await ethers.deployContract("HouseSwap", { value: ethers.utils.parseEther("2.0")});

    data.extra = [1, 0];
    await houseSwapToken.acceptOffer(data.targetAddress, data.house, data.extra);
    await houseSwapToken.deposit({ value: ethers.utils.parseEther('1.5') });
    await houseSwapToken.performSwap(data.targetAddress);

    expect(await houseSwapToken.getStatus()).to.equal('F');
  })

});