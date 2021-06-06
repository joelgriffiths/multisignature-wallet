
const { expectRevert } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

const Wallet = artifacts.require('Wallet')

// accounts is needed to show accounts
contract('Wallet', (accounts) => {
    let wallet;
    beforeEach(async () => {
        wallet = await Wallet.new([accounts[0],accounts[1],accounts[2]], 2);
        await web3.eth.sendTransaction({from: accounts[0], to: wallet.address, value: 1000});
    });

    it('test invalid quorum values', async () => {
        await expectRevert(
            Wallet.new([accounts[0],accounts[1],accounts[2]], 5),
            'You cannot require more approvers than you have provided in the constructor'
        );

        await expectRevert(
            Wallet.new([accounts[0],accounts[1],accounts[2]], 1),
            'You need a quorum of 2'
        );

        // This relies on the other two tests working.
        // Making sure the constructor has at least one account
        await expectRevert(
            Wallet.new([accounts[0]], 2),
            'You cannot require more approvers than you have provided in the constructor'
        );
    });

    it('should have correct approvers and quorum', async () => {
        const approvers = await wallet.getApprovers();
        const quorum = await wallet.quorum();
        assert(approvers.length === 3);
        assert(approvers[0] === accounts[0]);
        assert(approvers[1] === accounts[1]);
        assert(approvers[2] === accounts[2]);
        assert(quorum.toString() === "2");
    });

    it('should create transfer', async () => {
        const send_amount = 100;
        await wallet.createTransfer(send_amount, accounts[5], {from: accounts[0]});
        const transfers = await wallet.getTransfers();
        assert(transfers.length === 1);

        assert(transfers[0].id === '0');
        assert(transfers[0].amount === '100');
        assert(transfers[0].approvals === '0');
        assert(transfers[0].to === accounts[5]);
        assert(transfers[0].sent === false);
    });

    it('should NOT create transfer for unapproved sender', async () => {
        const send_amount = 100;

        await expectRevert(
            wallet.createTransfer(send_amount, accounts[5], {from: accounts[3]}),
            'You are not an approver'
        );
        const transfers = await wallet.getTransfers();
        assert(transfers.length === 0);
    });

    it('should NOT approve transfer already sent', async () => {
        await wallet.createTransfer(100, accounts[6], {from: accounts[0]});
        await wallet.approveTransfer(0, {from: accounts[1]});
        await wallet.approveTransfer(0, {from: accounts[2]});

        await expectRevert(
            wallet.approveTransfer(0, {from: accounts[0]}),
            'Transfer has already been sent'
        );
    });

    it('Is quroum set properly', async () => {
        const quorum = await wallet.quorum();
        assert(quorum.toNumber() === 2, "Quorum must be 2")
    });

    it('should increment approvals', async () => {
        await wallet.createTransfer(100, accounts[5], {from: accounts[0]});

        let transfers = await wallet.getTransfers();

        // First approval
        await wallet.approveTransfer(0, {from: accounts[1]});
        transfers = await wallet.getTransfers();
        assert(transfers[0].approvals === '1');
        assert(transfers[0].sent === false);


        // Just a quick check of double signing from the same address
        await expectRevert(
            wallet.approveTransfer(transfers[0].id, {from: accounts[1]}),
            'Cannot sign twice from same address'
        );

        // Second approval
        await wallet.approveTransfer(transfers[0].id, {from: accounts[2]});
        transfers = await wallet.getTransfers();
        assert(transfers[0].approvals === '2');
        assert(transfers[0].sent === true);

        const balance = await web3.eth.getBalance(wallet.address);
        assert(balance === '900', "Balance should be 900 now");
    });

    it('sends transfer when quorum reached', async () => {
        const initial_receiver_balance = web3.utils.toBN(await web3.eth.getBalance(accounts[6]));

        await wallet.createTransfer(100, accounts[6], {from: accounts[0]});
        await wallet.approveTransfer(0, {from: accounts[1]});
        await wallet.approveTransfer(0, {from: accounts[2]});

        const final_receiver_balance = web3.utils.toBN(await web3.eth.getBalance(accounts[6]));

        let balance_diff = final_receiver_balance.sub(initial_receiver_balance).toNumber();
        assert(balance_diff === 100, "Balance didn't increase")
    });

});
