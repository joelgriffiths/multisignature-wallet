const Wallet = artifacts.require("Wallet");

// Approvers and number of approvers
module.exports = async function (deployer, _network, accounts) {
  await deployer.deploy(Wallet, [accounts[0], accounts[1], accounts[2]], 2);

  // Need to send some ETH to Smart Contract
  const wallet = await Wallet.deployed();
  web3.eth.sendTransaction({from: accounts[0], to: wallet.address, value: 10000});
};