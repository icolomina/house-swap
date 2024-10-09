// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol';
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol"; 

/**
 * This ERC 721 Token represents a unique mortgage. This means that, once deployed, the owner, debtor and token are assigned and no extra mints are allowed.
 * - mortgageOwner: Mortgage propietary
 * - debtor: Mortgage debtor
 * - mortgagePayment: Mortgage Payment to be paid every specified interval
 * - months: Number of months
 * - daysInterval: Payment interval in days 
 * - lastTransferTime: Las Timestamp payment (once deployed -> 0)
 * - paymentToken: ERC20 token to transfer mortgage payments
 * - mortgageId: Identifier for the safeMint function. Assigns the id to the address
 * - mortgageUri: Mortgage Uri. This must store all te mortgage information. Could be stored using IPFS
 * - The asset owner is assigned by the Ownable contract
 */
contract Mortgage is ERC721URIStorage, Ownable, AutomationCompatible {

    address mortgageOwner;    
    address debtor;
    uint256 mortgagePaymentAmount;
    uint16  months;
    uint256 daysInterval;
    uint256 lastTransferTime;
    uint256 mortgageId;
    
    IRateType iRateType;
    IERC20  paymentToken;

    struct MortgageInfo {
        uint16 remainingMonths;
        uint256 mortgagePayment;
        uint256 daysInterval;
        address paymentToken;
    }

    enum IRateType {
        Fixed,
        Variable
    }

    constructor(string memory _name, string memory _symbol, uint256 _mortgageId, string memory mortgageUri, address _mortgageOwner, address _debtor, address _paymentToken, 
    uint256 _mortgagePaymentAmount, uint16 _months, uint16 _daysInterval, IRateType _iRateType) ERC721(_name, _symbol) Ownable(msg.sender) { 
        
        debtor = _debtor;
        mortgagePaymentAmount = _mortgagePaymentAmount;
        mortgageId = _mortgageId;
        months = _months;
        daysInterval = _daysInterval;
        paymentToken = IERC20(_paymentToken);
        lastTransferTime = 0;
        iRateType = _iRateType;

        _safeMint(_mortgageOwner, mortgageId);
        _setTokenURI(mortgageId, mortgageUri);
    }

    /** 
     * Function used to change the payment interval. Only allowed for the admin 
     */
    function setInterval(uint16 _daysInterval) external onlyOwner {
        require(_daysInterval > 0, 'Interval days must be greater that 0');
        daysInterval = _daysInterval;
    }

    /** 
     * Function used to change the mortgage payment amount. Only allowed for the admin
     * This can be useful for variable-rate mortgages or for situations where the debtor may make a partial cancellation.
     */
    function setMortgagePaymentAmount(uint256 _mortgagePaymentAmount) external onlyOwner {
        require(_mortgagePaymentAmount > 0, 'Mortgage payment amount must be greater than 0');
        require( iRateType == IRateType.Variable, 'Only Variable rate mortgages can change the payment amount');
        mortgagePaymentAmount = _mortgagePaymentAmount;
    }

    /**
     * Function to change the number of months. Only allowed for the admin
     * It can be useful when conditions change. The debtor may make a partial cancellation.
     */
    function setMonths(uint16 _months) external onlyOwner {
        require(_months > 0, 'Months must be greater that 0');
        months = _months;
    }

    /** 
     * Gets mortgage information
     */
    function getMortgageInfo() external view returns(MortgageInfo memory info) {
        return  MortgageInfo (
            months,
            mortgagePaymentAmount,
            daysInterval,
            address(paymentToken)
        );
    }

    /**
     * Interval function to transfer the payment from debtor to owner. 
     * Debtor must approve contract address to transfer its tokens
     */
    function _transferMortgagePayment() internal {

        address assetPropietaryAddress = payable(ownerOf(mortgageId));
        bool success = paymentToken.transferFrom(debtor, assetPropietaryAddress, mortgagePaymentAmount);
        require(success, "Transfer from debtor to owner fails.");
    }

    /** 
     * Chainlink AutomationCompatible contract function. It checks whether the regular payment must be transferred based on:
     * - It's been {daysInterval} days since the last payment
     * - Debtor holds enought balance
     * - There are still payments to transfer (months > 0)
     */
    function checkUpkeep(bytes memory /* checkData */) external view override returns (bool upkeepNeeded, bytes memory /* performData */) {

        uint256 intervalSeconds = daysInterval * 86400;
        bool timePassed = lastTransferTime == 0 || (block.timestamp - lastTransferTime) >= intervalSeconds;
        bool enoughtBalance = paymentToken.balanceOf(debtor) >= mortgagePaymentAmount;

        upkeepNeeded = timePassed && enoughtBalance && months > 0;
        return (upkeepNeeded, bytes(""));
    }

    /**
     * Chainlink AutomationCompatible contract function. If upkeepNeeded == true, performUpkeep is executed:
     * - Trasfer the payment
     * - Decreases 1 month
     * - updated lastTransferTime
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        _transferMortgagePayment();
        months -= 1;
        lastTransferTime = block.timestamp;
    }


}
