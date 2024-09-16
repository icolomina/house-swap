import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Asset", (m) => {
  const asset = m.contract("HouseAsset", ['House Asset', 'HSA']);
  return { asset };
});