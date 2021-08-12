// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const ProCodeToken = await hre.ethers.getContractFactory("ProCodeToken");
  const proCodeToken = await ProCodeToken.deploy();
  await proCodeToken.deployed();
  console.log("ProCode Token deployed to:", proCodeToken.address);

  const DBank = await hre.ethers.getContractFactory("DBank");
  const dBank = await DBank.deploy(proCodeToken.address);
  await dBank.deployed();
  console.log("DBank deployed to:", dBank.address);
  await proCodeToken.connect(deployer).passMinterRole(dBank.address);
  console.log("Minter role passed to:", dBank.address);

  let config = `
  export const dBankAddress = "${dBank.address}";
  export const tokenAddress = "${proCodeToken.address}";
  `

  let data = JSON.stringify(config);
  fs.writeFileSync('./src/config.js', JSON.parse(data));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
