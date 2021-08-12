require("@nomiclabs/hardhat-waffle");
const fs = require("fs");
const privateKey = fs.readFileSync(".secret").toString().trim();
const infuraProjectId = fs.readFileSync(".infuraid").toString().trim();

// task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
//   const accounts = await hre.ethers.getSigners();

//   for (const account of accounts) {
//     console.log(account.address);
//   }
// });

module.exports = {
  solidity: "0.8.4",
  paths: {
    artifacts: "./src/artifacts",
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${infuraProjectId}`,
      accounts: [privateKey],
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${infuraProjectId}`,
      accounts: [privateKey],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${infuraProjectId}`,
      accounts: [privateKey],
    },
  },
};
