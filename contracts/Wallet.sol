pragma solidity 0.6.0;
pragma experimental ABIEncoderV2;

contract Wallet {
    address[] public approvers;
    uint public quorum;

    struct Transfer {
        uint id;
        uint amount;
        address payable to;
        uint approvals;
        bool sent;
    }
    //mapping(uint => Transfer) public transfers;
    //uint nextId;
    Transfer[] public transfers;
    mapping(address => mapping(uint => bool)) public approvals;
    
    constructor(address[] memory _approvers, uint _quorum) public {
        require(_quorum >= 2, "You need a quorum of 2");
        require(
            _approvers.length >= _quorum,
            "You cannot require more approvers than you have provided in the constructor"
        );
        approvers = _approvers;
        quorum = _quorum;
    
    }
    
    function getApprovers() external view returns(address[] memory) {
        return approvers;
    }
    
    function createTransfer(uint ethAmount, address payable to) external onlyApprover {
        transfers.push(Transfer(
            transfers.length,
            ethAmount,
            to,
            0,
            false
        ));
    }
    
    function getTransfers() public view returns(Transfer[] memory) {
        return transfers;
    }
    
    function approveTransfer(uint transferId) external onlyApprover returns(bool) {
        require(transfers[transferId].sent == false, 'Transfer has already been sent');
        require(approvals[msg.sender][transferId] == false, 'Cannot sign twice from same address');
        
        transfers[transferId].approvals++;
        approvals[msg.sender][transferId] = true;

        if(transfers[transferId].approvals >= quorum) {
            // Send money
            address payable to = transfers[transferId].to;
            uint amount = transfers[transferId].amount;
            to.transfer(amount);
            transfers[transferId].sent = true;
        }
        
        return transfers[transferId].sent;
    }
    
    receive() external payable {}
    
    modifier onlyApprover {
        bool allowed = false;
        for(uint i = 0; i < approvers.length; i++) {
            if(approvers[i] == msg.sender) {
                allowed = true;
                break;
            }
        }
        require(allowed == true, "You are not an approver");
        _;
    }
    
}












