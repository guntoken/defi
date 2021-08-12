import { ethers } from 'ethers';
import Web3Modal from "web3modal";
import React, { Component } from 'react';
import { Tabs, Tab } from 'react-bootstrap';

import dBankLogo from './dbank.png';
import './App.css';
import {
  tokenAddress, dBankAddress
} from './config';

import Token from './artifacts/contracts/ProCodeToken.sol/ProCodeToken.json';
import DBank from './artifacts/contracts/DBank.sol/DBank.json';

class App extends Component {
  async componentWillMount() {
    await this.loadBlockchainData(this.props.dispatch)
  }

  async loadBlockchainData(dispatch) {
    if(typeof window.ethereum !== 'undefined') {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      console.log(address);

      if (typeof address !== 'undefined') {
        const balance = await provider.getBalance(address);
        this.setState({signer: signer, account: address, balance: balance.toString(), provider: provider});
      } else {
        window.alert('Please login with MetaMask');
      }

      // load contracts
      try {
        const token = new ethers.Contract(tokenAddress, Token.abi, provider);
        const dBank = new ethers.Contract(dBankAddress, DBank.abi, provider);
        this.setState({token: token, dBank: dBank, dBankAddress: dBankAddress});
      } catch (e) {
        console.log('Error', e)
        window.alert('Contracts not deployed to the current network');
      }
    } else {
      window.alert('Please install MetaMask');
    }
  }

  async deposit(amount) {
    if(this.state.dBank !== 'undefined'){
      try {
        await this.state.dBank.connect(this.state.signer).deposit({value: amount.toString()});
        // await this.state.dBank.deposit().send({value: amount.toString(), from: this.state.account})
      } catch (e) {
        console.log('Error, deposit: ', e);
      }
    }
  }

  async withdraw(e) {
    e.preventDefault()
    if(this.state.dBank !== 'undefined'){
      try{
        await this.state.dBank.connect(this.state.signer).withdraw();
      } catch(e) {
        console.log('Error, withdraw: ', e);
      }
    }
  }

  async borrow(amount) {
    if (this.state.dBank !== 'undefined') {
      try {
        await this.state.dBank.connect(this.state.signer).borrow({value: amount.toString()});
      } catch (e) {
        console.log('Error, borrow: ', e);
      }
    }
  }

  async payOff(e) {
    e.preventDefault()
    if (this.state.dBank !== 'undefined') {
      try {
        // const collateralEther = await this.state.dbank.methods.collateralEther(this.state.account).call({from: this.state.account})
        const collateralEther = await this.state.dBank.connect(this.state.signer).collateralEther(this.state.account);
        const tokenBorrowed = collateralEther / 2;
        await this.state.token.connect(this.state.signer).approve(this.state.dBankAddress, tokenBorrowed.toString());
        
        await this.state.dBank.connect(this.state.signer).payOff();
      } catch(e) {
        console.log('Error, pay off: ', e);
      }
    }
  }

  constructor(props) {
    super(props)
    this.state = {
      signer: null,
      account: '',
      token: null,
      dBank: null,
      balance: 0,
      dBankAddress: null
    }
  }

  render() {
    return (
      <div className='text-monospace'>
        <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
          <a
            className="navbar-brand col-sm-3 col-md-2 mr-0"
            href="http://www.dappuniversity.com/bootcamp"
            target="_blank"
            rel="noopener noreferrer"
          >
        <img src={dBankLogo} className="App-logo" alt="logo" height="32"/>
          <b>d₿ank</b>
        </a>
        </nav>
        <div className="container-fluid mt-5 text-center">
        <br></br>
          <h1>Welcome to d₿ank</h1>
          <h2>{this.state.account}</h2>
          <br></br>
          <div className="row">
            <main role="main" className="col-lg-12 d-flex text-center">
              <div className="content mr-auto ml-auto">
              <Tabs defaultActiveKey="profile" id="uncontrolled-tab-example">
                <Tab eventKey="deposit" title="Deposit">
                  <div>
                  <br></br>
                    How much do you want to deposit?
                    <br></br>
                    (min. amount is 0.01 ETH)
                    <br></br>
                    (1 deposit is possible at the time)
                    <br></br>
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      let amount = this.depositAmount.value
                      amount = amount * 10**18 //convert to wei
                      this.deposit(amount)
                    }}>
                      <div className='form-group mr-sm-2'>
                      <br></br>
                        <input
                          id='depositAmount'
                          step="0.01"
                          type='number'
                          ref={(input) => { this.depositAmount = input }}
                          className="form-control form-control-md"
                          placeholder='amount...'
                          required />
                      </div>
                      <button type='submit' className='btn btn-primary'>DEPOSIT</button>
                    </form>

                  </div>
                </Tab>
                <Tab eventKey="withdraw" title="Withdraw">
                  <br></br>
                    Do you want to withdraw + take interest?
                    <br></br>
                    <br></br>
                  <div>
                    <button type='submit' className='btn btn-primary' onClick={(e) => this.withdraw(e)}>WITHDRAW</button>
                  </div>
                </Tab>
                <Tab eventKey="borrow" title="Borrow">
                  <div>

                  <br></br>
                    Do you want to borrow tokens?
                    <br></br>
                    (You'll get 50% of collateral, in Tokens)
                    <br></br>
                    Type collateral amount (in ETH)
                    <br></br>
                    <br></br>
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      let amount = this.borrowAmount.value
                      amount = amount * 10**18 //convert to wei
                      this.borrow(amount)
                    }}>
                      <div className='form-group mr-sm-2'>
                      <br></br>
                        <input
                          id='borrowAmount'
                          step="0.01"
                          type='number'
                          ref={(input) => { this.borrowAmount = input }}
                          className="form-control form-control-md"
                          placeholder='amount...'
                          required />
                      </div>
                      <button type='submit' className='btn btn-primary'>BORROW</button>
                    </form>
                  </div>
                </Tab>
                <Tab eventKey="payOff" title="Payoff">
                  <div>

                  <br></br>
                    Do you want to payoff the loan?
                    <br></br>
                    (You'll receive your collateral - fee)
                    <br></br>
                    <br></br>
                    <button type='submit' className='btn btn-primary' onClick={(e) => this.payOff(e)}>PAYOFF</button>
                  </div>
                </Tab>
              </Tabs>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;