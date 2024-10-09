import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Mortgage, MortgageTokenERC20 } from "../../typechain-types";

describe("Mortgage Contract", function () {

    let mortgageContract: Mortgage;
    let owner: SignerWithAddress;
    let assetPropietary: SignerWithAddress;
    let debtor: SignerWithAddress;
    let tokenERC20: MortgageTokenERC20;

    beforeEach(async function() {
        [owner, assetPropietary, debtor] = await ethers.getSigners();
        const assetPropietaryAddress = await assetPropietary.getAddress();
        const debtorAddress = await debtor.getAddress();

        tokenERC20 = await ethers.deployContract("MortgageTokenERC20", ['DollarTest', 'DTS'], owner) as MortgageTokenERC20;
        await tokenERC20.connect(owner).mint(debtorAddress, 5000);
        const tokenERC20Address = await tokenERC20.getAddress();

        mortgageContract = await ethers.deployContract("Mortgage", 
            [
                'MyMortgag', 
                'MTG',
                1,
                'owmfiunfurruruujnfg',
                assetPropietaryAddress,
                debtorAddress,
                tokenERC20Address,
                150,
                300,
                30,
                1
            ], owner
        ) as Mortgage;

        const mortgageContractAddress = await mortgageContract.getAddress();
        await tokenERC20.connect(debtor).approve(mortgageContractAddress, 5000);
    });
    

    it("Test contract flow", async function () {
    
        // checkUpkeep is true since is the first payment
        const r1 = await mortgageContract.checkUpkeep(new Uint8Array([1, 2, 3, 4]));
        expect(r1[0]).to.be.equal(true);

        // After performing upkeep, checkUpkeep is false since interval is not reached yet
        await mortgageContract.performUpkeep(new Uint8Array([1, 2, 3, 4]));
        const r2 = await mortgageContract.checkUpkeep(new Uint8Array([1, 2, 3, 4]));
        expect(r2[0]).to.be.equal(false);

        // Advance 31 days
        await ethers.provider.send("evm_increaseTime", [31 * 86400]);
        await ethers.provider.send("evm_mine");

        // checkUpkeed should be true again
        const r3 = await mortgageContract.checkUpkeep(new Uint8Array([1, 2, 3, 4]));
        expect(r3[0]).to.be.equal(true);

        // Let's performUpkeep again
        await mortgageContract.performUpkeep(new Uint8Array([1, 2, 3, 4]));

        // Now two months are paid. 298 months left
        const mortgageInfo = await mortgageContract.getMortgageInfo();
        expect(mortgageInfo[0]).to.be.equal(298);

        // Debtor balance has decreased
        const debtorBalance = await tokenERC20.balanceOf(await debtor.getAddress());
        expect(debtorBalance).to.be.equal(4700);
       
        // Asset Propietary balance has increased
        const assetPropietaryBalance = await tokenERC20.balanceOf(await assetPropietary.getAddress());
        expect(assetPropietaryBalance).to.be.equal(300);

        // Mortgage conditions change. We have to set new payment amount 
        // Only tho token owner can change it, not the asset propietary
        expect(mortgageContract.connect(assetPropietary).setMortgagePaymentAmount(110)).to.be.reverted;
        await mortgageContract.connect(owner).setMortgagePaymentAmount(110);

        // Now the payment amount is 110
        const mortgageInfo2 = await mortgageContract.getMortgageInfo();
        expect(mortgageInfo2[1]).to.be.equal(110);
    });

});