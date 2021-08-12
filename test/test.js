const { EVM_REVERT, wait } = require('./helpers');

const chai = require("chai");
const { expect } = chai;
chai.use(require('chai-as-promised')).should();

describe("DBank contract", () => {
  const interestPerSecond = 31688087; //(10% APY) for min. deposit (0.01 ETH)

  let ProCodeToken;
  let proCodeToken;
  let owner;
  let addr1;
  let addrs;
  let DBank;
  let dBank;

  beforeEach(async () => {
    ProCodeToken = await ethers.getContractFactory("ProCodeToken");
    [owner, addr1, ...addrs] = await ethers.getSigners();

    proCodeToken = await ProCodeToken.deploy();
    await proCodeToken.deployed();

    DBank = await ethers.getContractFactory("DBank");
    dBank = await DBank.deploy(proCodeToken.address);
    await dBank.deployed();

    await proCodeToken.connect(owner).passMinterRole(dBank.address);
  });

  describe("ProCode Token", () => {
    describe("Success", () => {
      it("Token name should be ProCode Token", async () => {
        expect(await proCodeToken.name()).to.be.eq('ProCode Token');
      });
  
      it("Token symbol should be PCD", async () => {
        expect(await proCodeToken.symbol()).to.be.eq('PCD');
      });
    });

    describe("To Fail", () => {
      it("Passing minter role should be rejected", async () => {
        await proCodeToken.connect(owner).passMinterRole(addr1.address).should.be.rejectedWith(EVM_REVERT);
      });

      it("Token minting should be rejected", async () => {
        await proCodeToken.connect(owner).mint(addr1.address, '1').should.be.rejectedWith(EVM_REVERT) //unauthorized minter
      });
    });
  });

  describe("Deposits", () => {
    describe('Success', () => {
      beforeEach(async () => {
        await dBank.connect(addr1).deposit({value: (10**16).toString()}); //0.01 ETH
      });
      it("Balance should equal to 10**16", async () => {
        expect(Number(await dBank.etherBalanceOf(addr1.address))).to.eq(10**16);
      });
  
      it("Deposit start time should be > 0", async () => {
        expect(Number(await dBank.depositStart(addr1.address))).to.be.above(0);
      });
  
      it("Deposit status should be true", async () => {
        expect(await dBank.isDeposited(addr1.address)).to.eq(true);
      });
    });

    describe("To Fail", () => {
      it("Depositing < 0.01 ETH should be rejected", async () => {
        await dBank.connect(addr1).deposit({value: (10**15).toString()}).should.be.rejectedWith(EVM_REVERT); //to small amount
      });
    });
  });

  describe("Withdrawals", () => {
    let balance;

    describe("Success", () => {
      beforeEach(async () => {
        await dBank.connect(addr1).deposit({ value: (10 ** 16).toString() }); //0.01 ETH

        await wait(2); //accruing interest

        balance = await ethers.provider.getBalance(addr1.address);
        await dBank.connect(addr1).withdraw();
      });

      it("Balances should decrease", async () => {
        expect(Number(await ethers.provider.getBalance(dBank.address))).to.eq(0);
        expect(Number(await dBank.etherBalanceOf(addr1.address))).to.eq(0);
      });

      it("User should receive ether back", async () => {
        expect(Number(await ethers.provider.getBalance(addr1.address))).to.be.above(Number(balance));
      });

      it("User should receive proper amount of interest", async () => {
        //time synchronization problem make us check the 1-3s range for 2s deposit time
        balance = Number(await proCodeToken.balanceOf(addr1.address));
        expect(balance).to.be.above(0);
        expect(balance%interestPerSecond).to.eq(0);
        expect(balance).to.be.below(interestPerSecond * 4);
      });

      it("Depositor data should be reset", async () => {
        expect(Number(await dBank.depositStart(addr1.address))).to.eq(0);
        expect(Number(await dBank.etherBalanceOf(addr1.address))).to.eq(0);
        expect(await dBank.isDeposited(addr1.address)).to.eq(false);
      });
    });

    describe("To Fail", () => {
      it("Withdrawals should be rejected", async () => {
        await dBank.connect(addr1).deposit({value: (10**16).toString()}); // 0.01 ETH
        await wait(2); //accruing interest
        await dBank.connect(owner).withdraw().should.be.rejectedWith(EVM_REVERT); //wrong user
      });
    });
  });

  describe("Borrowing", () => {
    describe("Success", () => {
      beforeEach(async () => {
        await dBank.connect(addr1).borrow({value: (10**16).toString()}); //0.01 ETH
      });

      it("Total token supply should increase", async () => {
        expect(Number(await proCodeToken.totalSupply())).to.eq(5 * (10**15)); //10**16/2
      });

      it("Balance of user should increase", async () => {
        expect(Number(await proCodeToken.balanceOf(addr1.address))).to.eq(5 * (10**15)); //10**16/2
      });

      it("collateralEther should increase", async () => {
        expect(Number(await dBank.collateralEther(addr1.address))).to.eq(10**16); //0.01 ETH
      });

      it("User isBorrowed status should eq true", async () => {
        expect(await dBank.isBorrowed(addr1.address)).to.eq(true);
      });
    });

    describe("To Fail", () => {
      it("Borrowing should be rejected", async () => {
        await dBank.connect(addr1).borrow({value: (10**15).toString()}).should.be.rejectedWith(EVM_REVERT); //to small amount
      });
    });
  });

  describe("Pay off", () => {
    describe("Success", () => {
      beforeEach(async () => {
        await dBank.connect(addr1).borrow({value: (10**16).toString()}); //0.01 ETH
        await proCodeToken.connect(addr1).approve(dBank.address, (5 * (10**15)).toString());
        await dBank.connect(addr1).payOff();
      });

      it("User token balance should be 0", async () => {
        expect(Number(await proCodeToken.balanceOf(addr1.address))).to.eq(0);
      });

      it("dBank ETH balance should receive fee", async () => {
        expect(Number(await ethers.provider.getBalance(dBank.address))).to.eq(10**15); //10% of 0.01 ETH
      });

      it("Borrower data should be reset", async () => {
        expect(Number(await dBank.collateralEther(addr1.address))).to.eq(0);
        expect(await dBank.isBorrowed(addr1.address)).to.eq(false);
      });
    });

    describe("To Fail", () => {
      it("Paying off should be rejected", async () =>{
        await dBank.connect(addr1).borrow({value: (10**16).toString()}); //0.01 ETH
        await proCodeToken.connect(addr1).approve(dBank.address, (5 * (10**15)).toString());
        await dBank.connect(owner).payOff().should.be.rejectedWith(EVM_REVERT); //wrong user
      });
    });
  });
});
