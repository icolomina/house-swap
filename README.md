# HouseSwap Smart Contract
==========================

## Overview
HouseSwap is an smart-contract built on Solidity and Hardhat, which allows users to swap their houses in a secure and trustless manner. This smart contract enables users to create, manage, and execute house swaps, ensuring a seamless and transparent experience.

## Features

- **House Swap**: Enables users to swap their houses with other users.
- **Offer Management**: Allows users to create, accept, and decline offers for house swaps.
- **Payment Management**: Facilitates secure payment transfers between users.
- **Contract Status**: Tracks the status of the swap contract, ensuring a smooth execution process.

## Technical Details

- **Blockchain**: Built for the Ethereum blockchain, utilizing Solidity as the programming language.
- **Token Standard**: Utilizes the ERC20 token standard for payment transfers and ERC721 token standard to represent house assets.

## Usage

### Prerequisites

- **Ethereum Wallet**: The contract can be used in a dapp. It only requires a compatible wallet (e.g., MetaMask) to interact with the contract. 
- **ERC20 Token**: The contract utilizes an ERC20 token for payment transfers.
- **ERC721 Token**: The contract utilizes an ERC721 contract to represent the house assets.

### Deployment
This project uses [Hardhat](https://hardhat.org/) as a development enviroment. To deploy de contract follow the next steps:

#### Install dependencies using npm: 

```shell
npm install
```

#### Compile the contracts

```shell
npx hardhat compile
```

### Test the contracts

```shell
npx hardhat test
``



