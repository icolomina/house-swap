// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./HouseAsset.sol";

contract HouseSwap {

    HouseAsset houseAsset;
    IERC20 paymentToken;

    address payable originOwner;
    address contractOwner;
    address payable targetOwner;

    uint256 originTokenId;
    uint256 targetTokenId;
    uint256 amountPayOriginToTarget;
    uint256 amountPayTargetToOrigin;

    bool originApprovedContractOwner = false;
    bool targetApprovedContractOwner = false;

    event NewOffer(Offer offer);
    event BalanceUpdated(address, uint256);
    
    Statuses status;
    mapping (uint256 => Offer) swapOffers;
    uint256 swapOffersSize;

    enum Statuses {
        INITIALIZED,
        ACCEPTED,
        PAID,
        SWAPPED
    }

    struct Offer {
        uint256 tokenId;
        string tokenUri;
        uint256 amountPayOriginToTarget;
        uint256 amountPayTargetToOrigin;
    }

    constructor(address _houseAsset, address _paymentToken, uint256 tokenId) {
        houseAsset     = HouseAsset(_houseAsset);
        paymentToken   = IERC20(_paymentToken);
        originTokenId  = tokenId;
        originOwner    = payable(houseAsset.ownerOf(originTokenId));
        contractOwner  = msg.sender;
        swapOffersSize = 0;
        status         = Statuses.INITIALIZED;
    }

    /**
     * Check whether the contract has been initialized
     */
    modifier hasToBeInStatus(Statuses _status) {
        require(status == _status, 'Offer status must be xx');
        _;
    }

    /**
     * Check whether the caller is the contract owner
     */
    modifier isContractOwner {
        require(msg.sender == contractOwner, 'Required contract owner');
        _;
    }

    /**
     * Check whether the caller is the original owner (The address which deploys its house to swap)
     */
    modifier isOriginOwner() {
        require(msg.sender == originOwner, 'Required origin owner');
        _;
    }

    /**
     * Check whether the caller is the target owner (The address which offers a house to swap)
     */
    modifier isTargetOwner() {
        require(msg.sender == targetOwner, 'Required origin owner');
        _;
    }

    /**
     * If target must pay to origin, it checks target holds enough balance in the contract
     */
    modifier targetCanPay() {
        require(amountPayTargetToOrigin > 0, 'Amount target to origin must be greater than 0');
        _;
    }

    /**
     * If origin must pay to target, it checks origin holds enough balance in the contract
     */
    modifier originMustPay() {
        require(amountPayOriginToTarget > 0, 'Amount origin to target must be greater than 0');
        _;
    }

    /**
     * Che cks wheter the payment has been completed. From origin to target or vice versa
     */
    modifier paymentMustBeCompleted() {
        require(
            (amountPayOriginToTarget <= 0 || ( amountPayOriginToTarget > 0 && status == Statuses.PAID))
            && (amountPayTargetToOrigin <= 0 || ( amountPayTargetToOrigin > 0 && status == Statuses.PAID)),
            'Payment not completed' 
        );
        _;
    }

    /** 
     * Adds a new offer. 
     *   - The contract status must be INITIALIZED
     *   - The tokenId received must be greather than 0 and different of the originalTokenId
     *
     * If those rules are correct, the function creates a new Offer, sets it int the swapOffers mapping and emits a NewOffer event
     */
    function addOffer(uint256 _targetTokenId, uint256 _amountPayOriginToTarget, uint256 _amountPayTargetToOrigin) external hasToBeInStatus(Statuses.INITIALIZED) {
        require(_targetTokenId > 0 && _targetTokenId != originTokenId, "Target token ID must be greater than 0");
        require(msg.sender != address(0), "Cannot be 0 address");

        string memory offerUri = houseAsset.tokenURI(_targetTokenId);
        Offer memory offer = Offer(
            targetTokenId,
            offerUri,
            _amountPayOriginToTarget,
            _amountPayTargetToOrigin
        );

        swapOffers[_targetTokenId] = offer;
        swapOffersSize += 1;
        emit NewOffer(offer);
    }

    /**
     * It declines an offer deleting if from the swapOffers mapping. Only the originalOwner can call this function
     */
    function declineOffer(uint256 tokenId) external hasToBeInStatus(Statuses.INITIALIZED) isOriginOwner {
        require(tokenId > 0, "Target token ID must be greater than 0");
        delete swapOffers[tokenId];
        swapOffersSize -= 1;
    }

    /**
     * It accepts an offer Only the originalOwner can call this function:
     *   - Gets the accepted offer info from the swapOffers mapping by using the received tokenId as a key
     *   - Initialize the accepted offer contract variables
     *   - Change contract status to accepted
     */
    function acceptOffer(uint256 tokenId) external hasToBeInStatus(Statuses.INITIALIZED) isOriginOwner
    {
        require(tokenId > 0 && tokenId != originTokenId, "Target token ID must be greater than 0");
        Offer memory offer = swapOffers[tokenId];

        amountPayOriginToTarget = offer.amountPayOriginToTarget;
        amountPayTargetToOrigin = offer.amountPayTargetToOrigin;
        targetOwner = payable(houseAsset.ownerOf(tokenId));
        targetTokenId = tokenId;

        if(amountPayOriginToTarget <= 0 && amountPayTargetToOrigin <= 0 ) {
            status = Statuses.PAID;
        }
        else{
            status = Statuses.ACCEPTED; 
        }
        
    }
    

    /**
     * If target must pay to origin, transfers the funds from the contract address to the origin and decrease the target balance
     *    - Must be called by the targetOwner
     *    - Contract status mut be ACCEPTED
     *    - Also see targetCanPay modifier
     */
    function payFromTargetToOrigin() external isTargetOwner targetCanPay hasToBeInStatus(Statuses.ACCEPTED){
        bool success = paymentToken.transferFrom(targetOwner, originOwner, amountPayTargetToOrigin);
        require(success, "Transfer from target to origin sent.");
        status = Statuses.PAID;
    }

    /**
     * If origin must pay to target, transfers the funds from the contract address to the target and decrease the origin balance
     *    - Must be called by the targetOwner
     *    - Contract status mut be ACCEPTED
     *    - Also see originCanPay modifier
     */
    function payFromOriginToTarget() external isOriginOwner originMustPay hasToBeInStatus(Statuses.ACCEPTED) {
        bool success = paymentToken.transferFrom(originOwner, targetOwner, amountPayOriginToTarget);
        require(success, "Transfer from origin to target sent.");
        status = Statuses.PAID;
    }

 
    /**
     * Performs swap (Origin owner becomer target owner and vice-versa)
     * Change contract status to FINISHED
     *    - Only can be executed by the contract owner
     *    - The Payment must have been completed (if required)
     *    - The approvals must be done
     *    - The contract status must be accepted  
     */
    function performSwap() external isContractOwner paymentMustBeCompleted hasToBeInStatus(Statuses.PAID)
    {
        houseAsset.safeTransferFrom(originOwner, targetOwner, originTokenId);
        houseAsset.safeTransferFrom(targetOwner, originOwner, targetTokenId);
        status = Statuses.SWAPPED;
    }

    /**
     * Gets the contract status
     */
    function getStatus() public view returns (Statuses) {
        return status;
    }

    function getSwapOffers() public view returns (uint256) {
        return swapOffersSize;
    }
}
