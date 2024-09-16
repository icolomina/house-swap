import hre from "hardhat";
import Token from "../ignition/modules/Token";
import Asset from "../ignition/modules/Asset";


async function main() {

    /**
     * Deploy Asset and Contract modules using hardhat ignition
     */
    const { asset } = await hre.ignition.deploy(Asset);
    const { token } = await hre.ignition.deploy(Token);

    /**
     * Get token and asset addresses 
     */
    const assetAddress = await asset.getAddress();
    const tokenAddress = await token.getAddress();

    console.log(`Asset deployed to: ${assetAddress}`);
    console.log(`Token deployed to: ${tokenAddress}`);

    /**
     * Get a signer
     * Get the asset contract
     * Assign a tokenID to the addr address using the asset assignToken function
     */
    const [addr] = await hre.ethers.getSigners();
    const assetContract = await hre.ethers.getContractAt('HouseAsset', assetAddress);
    await assetContract.assignToken(1, 'https://www.hasset.com', await addr.getAddress());
    
    /**
     * Deploy the Swap contract using the asset address, te token address and the assigned tokenID (1)
     */
    const contract = await hre.ethers.deployContract('HouseSwap', [assetAddress, tokenAddress, 1])
    const houseSwapAddress = await contract.getAddress();
    console.log(`Swap deployed to: ${houseSwapAddress}`);
}

main().catch(console.error);