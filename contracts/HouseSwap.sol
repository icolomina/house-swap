pragma solidity ^0.8.16;
pragma experimental ABIEncoderV2;

contract HouseSwap {

    event NewOffer(Offer offer);
    event BalanceUpdated(address, uint256);

    address payable owner;
    address payable targetUser;
    Swap swap;
    Statuses status;
    mapping (address => uint256) balances;

    enum Statuses {
        PENDING,
        INITIALIZED,
        ACCEPTED,
        FINISHED
    }

    struct Swap {
        House origin;
        House target;
        uint256 amountPayOriginToTarget;
        uint256 amountPayTargetToOrigin;
    }

    struct House {
        string houseType;
        uint value;
        string link;
        address propietary;
    }

    struct Offer {
        House house;
        address targetUser;
        uint256 amountPayOriginToTarget;
        uint256 amountPayTargetToOrigin;
    }


    constructor() {
        owner  = payable(msg.sender);
        status = Statuses.PENDING;
    } 

    modifier hasToBeInitialized {
        require(keccak256(abi.encodePacked(status)) == keccak256(abi.encodePacked(Statuses.INITIALIZED)), 'An offer has been already accepted or contract has not been initialized');
        _;
    }

    modifier isOwner {
        require(msg.sender == owner, 'Required contract owner');
        _;
    }

    function initialize(House memory house ) external isOwner {
        house.propietary = owner;
        swap.origin = house;
        status = Statuses.INITIALIZED;
    }

    function addOffer(House memory house, uint256 amountPayOriginToTarget, uint256 amountPayTargetToOrigin) external hasToBeInitialized {
        Offer memory offer = Offer(house, msg.sender, amountPayOriginToTarget, amountPayTargetToOrigin );
        emit NewOffer(offer);
    }

    function acceptOffer(address payable _targetUser, House memory house, uint256 amountPayOriginToTarget, uint256 amountPayTargetToOrigin) external hasToBeInitialized isOwner 
    {
        targetUser = _targetUser;
        House memory targetHouse = house;

        swap.target = targetHouse;
        swap.amountPayOriginToTarget = amountPayOriginToTarget;
        swap.amountPayTargetToOrigin = amountPayTargetToOrigin;
        status = Statuses.ACCEPTED;
    }

    function performSwap() external
    {
        require(targetUser == msg.sender, 'Only target user can confirm swap');
        require(keccak256(abi.encodePacked(status)) == keccak256(abi.encodePacked(Statuses.ACCEPTED)), 'An offer has not been accepted yet');

        if(swap.amountPayOriginToTarget > 0) {
            bool success = sendTransfer(owner, swap.amountPayOriginToTarget);
            require(success, "Transfer to target failed.");
        }

        if(swap.amountPayTargetToOrigin > 0) {
            bool success = sendTransfer(targetUser, swap.amountPayTargetToOrigin);
            require(success, "Transfer to owner failed.");
        }

        swap.origin.propietary = targetUser;
        swap.target.propietary = owner;
        status = Statuses.FINISHED;
    }

    function getStatus() public view returns (Statuses) {
        return status;
    }

    function info() public view hasToBeInitialized returns (Swap memory) {
        return swap;
    }

    function deposit() external payable {
        if(swap.amountPayOriginToTarget > 0){
            require(msg.sender == owner,  'Origin must deposit enougth funds');
        }

        if(swap.amountPayTargetToOrigin > 0){
            require(msg.sender == targetUser,  'Target must deposit enougth funds');
        }

        balances[msg.sender] = msg.value;
        emit BalanceUpdated(msg.sender, msg.value);
    }

    function sendTransfer(address payable addr, uint256 amount ) private returns (bool){
        uint256 etherBalance = balances[addr] / 1 ether;
        require(etherBalance >= amount, 'Deposit has not been sent or is lower than required' );
        (bool success, ) = addr.call{value: amount}("");
        return success;
    }

}