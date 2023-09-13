pragma solidity ^0.8.16;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";

contract HouseSwap {

    event Received(address, uint);
    event NewOffer(Offer offer);

    address payable owner;
    address payable targetUser;
    Swap swap;
    string status;
    mapping (address => uint256) balances;

    struct SwapExtra {
        uint256 extraPayOriginToTarget;
        uint256 extraPayTargetToOrigin;
    }

    struct Swap {
        House origin;
        House target;
        SwapExtra extra;
    }

    struct House {
        string houseType;
        uint32 value;
        string link;
        address propietary;
    }

    struct Offer {
        House house;
        address targetUser;
        uint256 extraPayOriginToTarget;
        uint256 extraPayTargetToOrigin;
    }


    constructor() payable {
        owner  = payable(msg.sender);
        status = 'P';
    } 

    function initialize(House memory house ) external returns (House memory) {
        swap.origin = house;
        return house;
    }

    function addOffer(address _targetUser, House memory house, SwapExtra memory swapExtra) external {
        require(keccak256(abi.encodePacked(status)) == keccak256(abi.encodePacked('P')), 'An offer has been already accepted');
        Offer memory offer = Offer(house, _targetUser, swapExtra.extraPayOriginToTarget, swapExtra.extraPayTargetToOrigin );
        emit NewOffer(offer);
    }

    function acceptOffer(address payable _targetUser, House memory house, SwapExtra memory swapExtra) external
    {
        targetUser = _targetUser;
        House memory targetHouse = house;
        SwapExtra memory extra   = swapExtra;

        swap.target = targetHouse;
        swap.extra  = extra;
        status = 'A';
    }

    function performSwap(address payable _targetUser) external payable
    {
        require(targetUser == _targetUser, 'Target user should be registered buyer');
        require(keccak256(abi.encodePacked(status)) == keccak256(abi.encodePacked('A')), 'An offer has not been accepted yet');
        
        if(swap.extra.extraPayOriginToTarget > 0) {
            bool success = sendTransfer(owner, swap.extra.extraPayOriginToTarget);
            require(success, "Transfer to target failed.");
        }

        if(swap.extra.extraPayTargetToOrigin > 0) {
            bool success = sendTransfer(targetUser, swap.extra.extraPayTargetToOrigin);
            require(success, "Transfer to owner failed.");
        }

        swap.origin.propietary = targetUser;
        swap.target.propietary = owner;
        status = 'F';
    }

    function getStatus() public view returns (string memory) {
        return status;
    }

    function info() public view returns (Swap memory) {
        return swap;
    }

    function deposit() external payable {
        if(swap.extra.extraPayOriginToTarget > 0){
            require(msg.sender == owner,  'Origin must deposit enougth funds');
        }

        if(swap.extra.extraPayTargetToOrigin > 0){
            require(msg.sender == targetUser,  'Target must deposit enougth funds');
        }

        balances[msg.sender] = msg.value;
    }

    function sendTransfer(address payable addr, uint256 amount ) private returns (bool){
        uint256 etherBalance = balances[addr] / 1 ether;
        require(etherBalance >= amount, 'Deposit has not been sent or is lower than required' );
        (bool success, ) = owner.call{value: swap.extra.extraPayTargetToOrigin}("");
        return success;
    }

}