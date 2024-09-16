import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Asset", (m) => {
  const token = m.contract("HouseTestTokenERC20", ['My Token', 'MTY']);
  return { token };
});