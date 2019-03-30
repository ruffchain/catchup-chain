import { Logger } from '../../api/logger';
import winston = require('winston');
import { RPCClient } from '../../client/client/rfc_client';
import { IfSysinfo, IfContext, DelayPromise, IfResult } from '../../api/common'
import { getLastIrreversibleBlockNumber } from '../../api/getLIBNumber'
import { getBlock } from '../../api/getblock'
import { getReceipt } from '../../api/getreceipt';
import { StatusDataBase } from '../storage/statusdb';
import { StorageDataBase, HASH_TYPE, SYS_TOKEN, TOKEN_TYPE } from '../storage/StorageDataBase';
import { ErrorCode, IFeedBack } from '../../core';
import { type } from 'os';
import { getBalance } from '../../api/getbalance';
import { getTokenBalance } from '../../api/getTokenBalance';
import { getBancorTokenBalance } from '../../api/getBancorTokenBalance';
import { getBancorTokenFactor } from '../../api/getBancorTokenFactor';
import { getBancorTokenReserve } from '../../api/getBancorTokenReserve';
import { getBancorTokenSupply } from '../../api/getBancorTokenSupply';
import * as fs from 'fs';
import { transferTo } from '../../api/transferto';
import { SYS_TOKEN_PRECISION, BANCOR_TOKEN_PRECISION, NORMAL_TOKEN_PRECISION } from '../storage/dbapi/scoop';

/**
 * This is a client , always syncing with the Chain
 */

interface IfSynchroOptions {
  ip: string;
  port: number;
}
interface IName {
  address: string;
}

export class Synchro {
  public logger: winston.LoggerInstance;

  private ip: string;
  private port: number;
  private ctx: IfContext;
  private pStatusDb: StatusDataBase;
  private pStorageDb: StorageDataBase;
  private nCurrentLIBHeight: number;

  constructor(options: IfSynchroOptions, logger: winston.LoggerInstance, statusdb: StatusDataBase, storagedb: StorageDataBase) {
    this.ip = options.ip;
    this.port = options.port;
    this.logger = logger;

    // get account secret for distributing candy
    let boss = fs.readFileSync('./secret/boss.json')

    let bossObj: any
    try {
      bossObj = JSON.parse(boss.toString());
    } catch (e) {
      throw new Error('Can not open secret json file')
    }

    let SYSINFO: IfSysinfo = {
      secret: bossObj.secret,
      host: this.ip,
      port: this.port,
      address: bossObj.address,
      verbose: false
    }

    this.ctx = {
      client: new RPCClient(
        this.ip,
        this.port,
        SYSINFO
      ),
      sysinfo: SYSINFO
    }
    this.pStatusDb = statusdb;
    this.pStorageDb = storagedb;
    this.nCurrentLIBHeight = 0;
  }

  public async start() {
    this.logger.info('Synchro client started ...\n');


    this.loopTask();
  }

  private async loopTask() {
    // get LIBNumber
    this.logger.info('loopTask()\n');
    let result = await this.getLIBNumber()
    if (result.ret == 200) {
      this.nCurrentLIBHeight = parseInt(result.resp!);
    }

    // get currentHeight
    let nCurrentHeight = this.pStatusDb.nCurrentHeight;

    this.logger.info('currentHeight:', nCurrentHeight, ' currentLIB:', this.nCurrentLIBHeight);

    if (nCurrentHeight < this.nCurrentLIBHeight) {
      let result2 = await this.updateBlockRange(nCurrentHeight, this.nCurrentLIBHeight);
      this.logger.info(JSON.stringify(result2));
    }
    else if (nCurrentHeight > this.nCurrentLIBHeight) {
      throw new Error('Obsolete storage! consider to clean by running: npm run clean && npm run cleandb')
    }
    else {
      this.logger.info('height equal \n');
    }
    // delay 10s
    this.logger.info('Delay 10 seconds\n');
    await DelayPromise(10);
    this.loopTask();
  }
  // main task
  private updateBlockRange(nStart: number, nStop: number): Promise<IFeedBack> {
    return new Promise<IFeedBack>(async (resolv) => {
      for (let i = nStart; i <= nStop; i++) {
        // update database by block, one by one
        let result = await this.updateBlock(i);
        if (result.err) {
          this.logger.error('UpdataeBlockRange block ', i, ' failed');
          resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_FAILED, data: i });
          return;
        } else {
          // update statusDB current Height
          let feedback = await this.pStatusDb.setCurrentHeight(i);
          if (feedback.err) {
            this.logger.error('Save block ', i, ' to db failedd');
            resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_SAVE_FAILED, data: i });
            return;
          }
          this.pStatusDb.nCurrentHeight = i;
        }
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
  }
  // get block
  private async updateBlock(nBlock: number): Promise<IFeedBack> {
    return new Promise<IFeedBack>(async (resolv) => {
      this.logger.info('Get block ' + nBlock + '\n')
      let result = await this.getBlock(nBlock)

      if (result.ret === 200) {
        // this.logger.info(result.resp + '\n');
        // save resp to hashtable
        let obj: any;
        try {
          obj = JSON.parse(result.resp + '');
        } catch (e) {
          this.logger.error('updateBlock json parse faile')
          resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_FAILED, data: null })
          return;
        }
        // 
        this.logger.info('Display block -->');
        console.log(obj);

        let hash = obj.block.hash;
        let hashnumber = obj.block.number;
        let timestamp = obj.block.timestamp;
        let address = obj.block.creator;
        let txno = obj.transactions.length;
        let height = obj.block.number;

        this.logger.info('save block hash to hash table')
        // save to hash table
        let feedback = await this.pStorageDb.insertOrReplaceHashTable(hash, HASH_TYPE.BLOCK);
        if (feedback.err) {
          this.logger.error('updateBlock ', nBlock, ' number indertToHashTable failed')
          resolv({ err: feedback.err, data: null });
          return;
        }

        // save to block table
        feedback = await this.pStorageDb.insertOrReplaceBlockTable(hash, height, txno, address, timestamp);
        if (feedback.err) {
          this.logger.error('updateBlock ', nBlock, ' put into block able failed')
          resolv({ err: feedback.err, data: null });
          return;
        }

        if (txno > 0) {
          this.logger.info('UpdateTx -->')
          feedback = await this.updateTx(hash, hashnumber, timestamp, obj.transactions);
          if (feedback.err) {

            resolv({ err: feedback.err, data: null });
            return;
          }
        }

        resolv({ err: ErrorCode.RESULT_OK, data: null })

      } else {
        this.logger.info('wrong return value')
        this.logger.info(result.ret + '\n');
        resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_FAILED, data: null })
      }
    });
  }
  // Need to check if address is already in hash table here, 
  // Because information is got from tx
  private async updateTx(bhash: string, nhash: number, dtime: number, txs: any[]) {
    return new Promise<IFeedBack>(async (resolv) => {
      for (let j = 0; j < txs.length; j++) {

        let hash = txs[j].hash;
        let blockhash = bhash;
        let blocknumber = nhash;
        let address = txs[j].caller;
        let datetime = dtime;
        // let fee = txs[j].fee;
        let content: Buffer = Buffer.from(JSON.stringify(txs[j]))
        // console.log('updateTx:')
        // console.log(content);
        // console.log(typeof content)

        // put it into tx table, insertOrReplace
        let feedback = await this.pStorageDb.insertTxTable(hash, blockhash, blocknumber, address, datetime, content);
        if (feedback.err) {
          this.logger.error('put tx into txtable failed')
          resolv({ err: feedback.err, data: null });
          return;
        }

        // insertOrReplace it into hash table
        feedback = await this.pStorageDb.insertOrReplaceHashTable(hash, HASH_TYPE.TX);
        if (feedback.err) {
          resolv({ err: feedback.err, data: null });
          return;
        }

        // get receipt
        feedback = await this.getReceiptInfo(hash);
        if (feedback.err) {
          this.logger.error('getReceipt for tx failed')
          resolv({ err: feedback.err, data: null });
          return;
        }
        this.logger.info('get receipt for tx -->\n')
        console.log(feedback.data)

        let feedback2 = await this.checkAccountAndToken(feedback.data);
        if (feedback2.err) {
          this.logger.error('checkAccountAndToken() failed.')
          resolv({ err: feedback2.err, data: null });
          return;
        }
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null })
    });
  }
  // Based on tx method name
  // 1, token table
  // 2, account table
  // 3, hash table
  private async checkAccountAndToken(receipt: any): Promise<IFeedBack> {
    let recet = JSON.parse(receipt.toString());
    this.logger.info('checkAccountAndToken\n')
    // this.logger.info(recet);

    let tx = recet.tx;
    console.log(tx);

    if (tx.method === 'transferTo') {
      return this.checkTransferTo(recet);
    }
    else if (tx.method === 'createToken') {
      return this.checkCreateToken(recet, TOKEN_TYPE.NORMAL);
    }
    else if (tx.method === 'createBancorToken') {
      return this.checkCreateBancorToken(recet, TOKEN_TYPE.BANCOR);
    }
    else if (tx.method === 'sellBancorToken') {
      return this.checkSellBancorToken(recet);
    }
    else if (tx.method === 'buyBancorToken') {
      return this.checkBuyBancorToken(recet);
    }
    else if (tx.method === 'transferTokenTo') {
      return this.checkTransferTokenTo(recet);
    }
    else if (tx.method === 'transferBancorTokenTo') {
      return this.checkTransferBancorTokenTo(recet);
    }
    else if (tx.method === 'vote'
      || tx.method === 'mortgage'
      || tx.method === 'unmortgage'
      || tx.method === 'register'
      || tx.method === 'setUserCode'
      || tx.method === 'getUserCode'
      || tx.method === 'runUserMethod'
    ) {
      this.logger.info('We wont handle tx:', tx.method, '\n')
      return this.checkDefaultCommand(recet);
    }
    else {
      return new Promise<IFeedBack>(async (resolv) => {
        this.logger.error('Unrecognized account and token method:');
        resolv({ err: ErrorCode.RESULT_SYNC_TX_UNKNOWN_METHOD, data: null })
      });
    }
  }
  private checkDefaultCommand(receipt: any) {
    return new Promise<IFeedBack>(async (resolv) => {
      // get caller balance
      let caller = receipt.tx.caller;
      // 
      if (receipt.receipt.returnCode === 0) {
        this.logger.info('checkTranserTo, updateBalances')
        let feedback = await this.updateBalances(SYS_TOKEN, [{ address: caller }]);
        if (feedback.err) {
          resolv(feedback);
          return;
        }
      }


      resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
  }
  private checkCreateToken(receipt: any, tokenType: string) {
    return new Promise<IFeedBack>(async (resolv) => {
      // 
      let tokenName = receipt.tx.input.tokenid;
      let preBalances = receipt.tx.input.preBalances; // array
      let datetime = receipt.block.timestamp;
      let caller = receipt.tx.caller;
      let nameLst: IName[] = [];
      let addrLst: string[] = [];
      // let amountAll: number = 0;
      // put it into hash table–––

      preBalances.forEach((element: any) => {
        nameLst.push({
          address: element.address
        })
        addrLst.push(element.address)
        // amountAll += parseInt(element.amount);
      });

      addrLst.push(caller);

      this.logger.info('checkCreateToken, updateNamesToHashTable')
      // put address into hash table
      let feedback = await this.pStorageDb.updateNamesToHashTable(addrLst, HASH_TYPE.ADDRESS);
      if (feedback.err) {
        resolv(feedback);
        return;
      }

      if (receipt.receipt.returnCode === 0) {
        // update caller balance
        let result = await this.updateBalance(SYS_TOKEN, { address: caller });
        if (result.err) {
          resolv(result);
          return;
        }

        // add a new token to token table
        result = await this.pStorageDb.insertTokenTable(tokenName, tokenType, caller, datetime);
        this.logger.info('createToken insertTokenTable , result:', result)
        if (result.err) {
          resolv(result);
          return;
        }

        // update accounts token account table
        result = await this.updateTokenBalances(tokenName, nameLst);
        if (result.err) {
          resolv(result);
          return;
        }

        // put tokenname into hash table
        result = await this.pStorageDb.updateNameToHashTable(tokenName, HASH_TYPE.TOKEN);
        if (result.err) {
          resolv(result);
          return;
        }
      }

      resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
  }
  // Check bancor R, F, S parameters
  private checkBuyBancorToken(receipt: any) {
    return new Promise<IFeedBack>(async (resolv) => {
      this.logger.info('checkBuyBancorToken -->\n')
      let tokenName = receipt.tx.input.tokenid;
      let caller = receipt.tx.caller;

      if (receipt.receipt.returnCode === 0) {
        let result = await this.updateBancorTokenBalance(tokenName, { address: caller });
        if (result.err) {
          resolv(result);
          return;
        }
        result = await this.updateBancorTokenParameters(tokenName);
        if (result.err) {
          resolv(result);
          return;
        }
        let feedback = await this.updateBalances(SYS_TOKEN, [{ address: caller }]);
        if (feedback.err) {
          resolv(feedback);
          return;
        }
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
  }
  private checkTransferTokenTo(receipt: any) {
    return new Promise<IFeedBack>(async (resolv) => {

      let tokenName = receipt.tx.input.tokenid;
      let caller = receipt.tx.caller;
      let to = receipt.tx.input.to;

      if (receipt.receipt.returnCode === 0) {
        let result = await this.updateTokenBalances(tokenName, [{ address: caller }, { address: to }]);
        if (result.err) {
          resolv(result);
          return;
        }
        result = await this.updateBalance(SYS_TOKEN, { address: caller });
        if (result.err) {
          resolv(result);
          return;
        }
      }

      resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
  }
  private checkTransferBancorTokenTo(receipt: any) {
    return new Promise<IFeedBack>(async (resolv) => {
      this.logger.info('checkTransferBancorTokenTo -->');

      let tokenName = receipt.tx.input.tokenid;
      let caller = receipt.tx.caller;
      let to = receipt.tx.input.to;

      if (receipt.receipt.returnCode === 0) {
        let result = await this.updateBancorTokenBalances(tokenName, [{ address: caller }, { address: to }]);
        if (result.err) {
          resolv(result);
          return;
        }
        result = await this.updateBalance(SYS_TOKEN, { address: caller });
        if (result.err) {
          resolv(result);
          return;
        }
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
  }
  private fetchBancorTokenNumber(tokenName: string, func: (token: string) => Promise<IfResult>) {
    return new Promise<IFeedBack>(async (resolv) => {
      this.logger.info('fetchBancorTokenNumber')
      let result = await func.call(this, tokenName);
      if (result.ret === 200) {
        let obj = JSON.parse(result.resp!.toString());
        let value = obj.value.replace('n', '')
        let out: number;
        try {
          let num = parseFloat(value);
          let num1 = parseFloat(num.toFixed(BANCOR_TOKEN_PRECISION));
          resolv({ err: ErrorCode.RESULT_OK, data: num1 });
          return;
        } catch (e) {
          this.logger.error('getbancortokeninfo failed:', e);
          resolv({ err: ErrorCode.RESULT_SYNC_GETBANCORTOKENINFO_FAILED, data: '' })
        }
      } else {
        this.logger.error('getbancortokeninfo failed:', result)
        resolv({ err: ErrorCode.RESULT_SYNC_GETBANCORTOKENINFO_FAILED, data: '' })
      }
    });
  }
  // private fetchBancorTokenNumbers(tokenName: string) {
  //   return new Promise<IFeedBack>(async (resolv) => {
  private fetchBancorTokenNumberSupply(tokenName: string) {
    this.logger.info('fetchBancorTokenNumberSupply')
    return this.fetchBancorTokenNumber(tokenName, this.getSupply);
    // return new Promise<IFeedBack>(async (resolv) => {
  }
  private fetchBancorTokenNumberReserve(tokenName: string) {
    this.logger.info('fetchBancorTokenNumberReserve')
    return this.fetchBancorTokenNumber(tokenName, this.getReserve);
    // return new Promise<IFeedBack>(async (resolv) => {
  }
  private fetchBancorTokenNumberFactor(tokenName: string) {
    this.logger.info('fetchBancorTokenNumberFactor')
    return this.fetchBancorTokenNumber(tokenName, this.getFactor)
    //return new Promise<IFeedBack>(async (resolv) => {
  }

  //   });
  // }
  // get R, S, F parameters
  private handleBancorTokenParameters(tokenName: string, func: (token: string, f: number, r: number, s: number) => Promise<IFeedBack>) {
    return new Promise<IFeedBack>(async (resolv) => {
      this.logger.info('handleBancorTokenParameters')
      let result = await this.fetchBancorTokenNumberFactor(tokenName);
      if (result.err) {
        resolv(result);
        return;
      }
      let F = result.data;

      result = await this.fetchBancorTokenNumberSupply(tokenName);
      if (result.err) {
        resolv(result);
        return;
      }
      let S = result.data;

      result = await this.fetchBancorTokenNumberReserve(tokenName);
      if (result.err) {
        resolv(result);
        return;
      }
      let R: number = result.data;

      result = await func.call(this, tokenName, F, R, S);
      if (result.err) {
        resolv(result);
        return;
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null })
    });
  }
  private insertBancorTokenParameters(tokenName: string) {
    this.logger.info('insertBancorTokenParameters, with: ', tokenName)
    // return this.handleBancorTokenParameters(tokenName, this.pStorageDb.insertBancorTokenTable);
    return new Promise<IFeedBack>(async (resolv) => {
      this.logger.info('handleBancorTokenParameters')
      let result = await this.fetchBancorTokenNumberFactor(tokenName);
      if (result.err) {
        resolv(result);
        return;
      }
      let F = result.data;

      result = await this.fetchBancorTokenNumberSupply(tokenName);
      if (result.err) {
        resolv(result);
        return;
      }
      let S = result.data;

      result = await this.fetchBancorTokenNumberReserve(tokenName);
      if (result.err) {
        resolv(result);
        return;
      }
      let R: number = result.data;

      result = await this.pStorageDb.insertBancorTokenTable(tokenName, F, R, S);
      if (result.err) {
        resolv(result);
        return;
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null })
    });
  }
  private updateBancorTokenParameters(tokenName: string) {
    this.logger.info('updateBancorTokenParameters, with:', tokenName)

    return new Promise<IFeedBack>(async (resolv) => {
      this.logger.info('handleBancorTokenParameters')
      let result = await this.fetchBancorTokenNumberFactor(tokenName);
      if (result.err) {
        resolv(result);
        return;
      }
      let F = result.data;

      result = await this.fetchBancorTokenNumberSupply(tokenName);
      if (result.err) {
        resolv(result);
        return;
      }
      let S = result.data;

      result = await this.fetchBancorTokenNumberReserve(tokenName);
      if (result.err) {
        resolv(result);
        return;
      }
      let R: number = result.data;

      result = await this.pStorageDb.updateBancorTokenTable(tokenName, F, R, S);
      if (result.err) {
        this.logger.error('updateBancorTokenTable failed:', F, R, R)
        resolv(result);
        return;
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null })
    });
  }
  // it will record the R, S, F参数
  private checkCreateBancorToken(receipt: any, tokenType: string) {
    return new Promise<IFeedBack>(async (resolv) => {
      let tokenName = receipt.tx.input.tokenid;
      let preBalances = receipt.tx.input.preBalances; // array
      let datetime = receipt.block.timestamp;
      let caller = receipt.tx.caller;
      let nameLst: IName[] = [];
      // let amountAll: number = 0;
      let addrLst: string[] = [];

      // add it into hash table

      preBalances.forEach((element: any) => {
        nameLst.push({ address: element.address });
        // amountAll += parseInt(element.amount);
        addrLst.push(element.address)
      });
      addrLst.push(caller)

      // put address into hashtable
      let feedback = await this.pStorageDb.updateNamesToHashTable(addrLst, HASH_TYPE.ADDRESS);
      if (feedback.err) {
        resolv(feedback);
        return;
      }

      if (receipt.receipt.returnCode === 0) {

        // update caller balance
        let result = await this.updateBalance(SYS_TOKEN, { address: caller });
        if (result.err) {
          resolv(result);
          return;
        }

        // get add token table
        result = await this.pStorageDb.insertTokenTable(tokenName, tokenType, caller, datetime);
        this.logger.info('checkCreateBancorToken insert token table')
        if (result.err) {
          resolv(result);
          return;
        }

        // update accounts token account table
        result = await this.updateBancorTokenBalances(tokenName, nameLst);
        if (result.err) {
          resolv(result);
          return;
        }

        // put tokenname into hash table
        result = await this.pStorageDb.updateNameToHashTable(tokenName, HASH_TYPE.TOKEN);
        if (result.err) {
          resolv(result);
          return;
        }

        result = await this.insertBancorTokenParameters(tokenName);
        if (result.err) {
          resolv(result);
          return;
        }
      }

      resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
  }
  // check R, S, F parameters
  private checkSellBancorToken(receipt: any) {
    return new Promise<IFeedBack>(async (resolv) => {
      let caller = receipt.tx.caller;
      let tokenName = receipt.tx.input.tokenid;

      if (receipt.receipt.returnCode === 0) {
        // update caller token account
        let result = await this.updateBancorTokenBalance(tokenName, { address: caller });
        if (result.err) {
          resolv(result);
          return;
        }
        result = await this.updateBancorTokenParameters(tokenName);
        if (result.err) {
          resolv(result);
          return;
        }

        let feedback = await this.updateBalances(SYS_TOKEN, [{ address: caller }]);
        if (feedback.err) {
          resolv(feedback);
          return;
        }
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
  }
  private checkTransferTo(receipt: any) {
    return new Promise<IFeedBack>(async (resolv) => {
      let caller = receipt.tx.caller;
      let to = receipt.tx.input.to;

      // let value = receipt.tx.value; // string
      // let fee = receipt.tx.fee;

      // update caller, to address to hash table
      // this.logger.info('checkTxTransferto, updateNamesToHashTable\n')
      // // put address into hashtable
      this.logger.info('checkTransferTo, updateNamesToHashTable')
      let feedback = await this.pStorageDb.updateNamesToHashTable([caller, to], HASH_TYPE.ADDRESS);
      if (feedback.err) {
        resolv(feedback);
        return;
      }
      if (receipt.receipt.returnCode === 0) {
        this.logger.info('checkTranserTo, updateBalances')
        feedback = await this.updateBalances(SYS_TOKEN, [{ address: caller }, { address: to }]);
        if (feedback.err) {
          resolv(feedback);
          return;
        }
      }

      resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
  }
  private updateBalanceBasic(token: string, type: string, account: IName, funcGetBalance: (token1: string, address1: string) => Promise<IfResult>) {
    return new Promise<IFeedBack>(async (resolv) => {
      let result = await funcGetBalance.call(this, token, account.address);

      if (result.ret === 200) {
        let amount: string = JSON.parse(result.resp!).value.replace('n', '');
        let laAmount: number = parseFloat(amount);

        let value: number = 0;

        if (type === TOKEN_TYPE.NORMAL) {
          value = parseFloat(parseFloat(amount).toFixed(NORMAL_TOKEN_PRECISION));
          amount = laAmount.toFixed(NORMAL_TOKEN_PRECISION);
        } else if (type === TOKEN_TYPE.BANCOR) {
          value = parseFloat(parseFloat(amount).toFixed(BANCOR_TOKEN_PRECISION));
          amount = laAmount.toFixed(BANCOR_TOKEN_PRECISION);
        } else if (type === TOKEN_TYPE.SYS) {
          value = parseFloat(parseFloat(amount).toFixed(SYS_TOKEN_PRECISION));
          amount = laAmount.toFixed(SYS_TOKEN_PRECISION)
        } else {
          resolv({ err: ErrorCode.RESULT_SYNC_UPDATEBALANCE_BASIC_FAILED, data: null });
        }

        this.logger.info('updateAccountTable ->\n')
        console.log("value:", value);
        let result2 = await this.pStorageDb.updateAccountTable(account.address, token, amount, value);
        resolv(result2);
      } else {
        resolv({ err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null });
      }
    });
  }
  private updateBalancesBasic(token: string, accounts: IName[], funcUpdate: (token1: string, account1: IName) => Promise<IFeedBack>) {
    return new Promise<IFeedBack>(async (resolv) => {
      for (let i = 0; i < accounts.length; i++) {
        let result = await funcUpdate.call(this, token, accounts[i]);
        if (result.err) {
          resolv(result);
          return;
        }
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null });
    })
  }
  // ---------- 1 -----------
  public async updateBalance(token: string, account: IName) {
    return this.updateBalanceBasic(token, TOKEN_TYPE.NORMAL, account, this.getBalanceInfo);
  }
  private async updateBalances(token: string, accounts: IName[]) {
    return this.updateBalancesBasic(SYS_TOKEN, accounts, this.updateBalance);
  }
  //---------------------------------------------------------------
  private async updateTokenBalance(token: string, account: IName) {
    return this.updateBalanceBasic(token, TOKEN_TYPE.NORMAL, account, this.getTokenBalanceInfo);
  }
  private async updateTokenBalances(token: string, accounts: IName[]) {
    return this.updateBalancesBasic(token, accounts, this.updateTokenBalance)
  }
  // -------------------------------------------------------------
  private async updateBancorTokenBalance(token: string, account: IName) {
    return this.updateBalanceBasic(token, TOKEN_TYPE.BANCOR, account, this.getBancorTokenBalanceInfo);
  }
  private async updateBancorTokenBalances(token: string, accounts: IName[]) {
    return this.updateBalancesBasic(token, accounts, this.updateBancorTokenBalance);
  }


  // Basic commands 
  public async getLastestBlock() {
    let result = await getBlock(this.ctx, ['latest', 'true']);
    this.logger.info(result.resp!);
    return result;
  }
  public async getBlock(num: number) {
    let result = await getBlock(this.ctx, [num + '', 'true']);
    this.logger.info(result.resp!);
    return result;
  }
  public async getLIBNumber() {
    let result = await getLastIrreversibleBlockNumber(this.ctx, []);
    this.logger.info(JSON.stringify(result));
    this.logger.info('LIBNumber', result.resp!);
    return result;
  }
  public async getReceiptInfo(strHash: string) {
    return new Promise<IFeedBack>(async (resolv) => {
      this.logger.info('getReceiptInfo\n')
      let result = await getReceipt(this.ctx, [strHash]);
      // console.log(result.resp);
      // console.log(typeof result.resp)

      if (result.ret === 200) {
        resolv({ err: ErrorCode.RESULT_OK, data: result.resp });
      } else {
        resolv({ err: ErrorCode.RESULT_FAILED, data: null })
      }
    })
  }
  public async getBalanceInfo(token: string, strHash: string) {
    console.log('\ngetBalanceInfo', token, ' ', strHash, '\n')
    let result = await getBalance(this.ctx, [strHash]);
    if (result.ret === 10001) {

    }
    if (result.ret !== 200) {
      this.logger.error('wrong result', result)
    } else {
      this.logger.info(JSON.stringify(result));
      this.logger.info('balance:', JSON.parse(result.resp!).value);
    }
    return result;
  }
  public async getTokenBalanceInfo(token: string, strHash: string) {
    console.log('\ngetTokenBalanceInfo', token, ' ', strHash, '\n')
    let result = await getTokenBalance(this.ctx, [token, strHash]);
    if (result.ret !== 200) {
      this.logger.error('wrong result', result)
    } else {
      this.logger.info(JSON.stringify(result));
      this.logger.info('token balance:', JSON.parse(result.resp!).value);
    }

    return result;
  }
  public async getBancorTokenBalanceInfo(token: string, strHash: string) {
    console.log('\ngetBancorTokenBalanceInfo', token, ' ', strHash, '\n')
    let result = await getBancorTokenBalance(this.ctx, [token, strHash]);
    if (result.ret !== 200) {
      this.logger.error('wrong result', result)
    } else {
      this.logger.info(JSON.stringify(result));
      this.logger.info('bancor token balance:', JSON.parse(result.resp!).value);
    }
    return result;
  }
  public async getFactor(token: string) {
    this.logger.info('getFactor of bankor token');
    let result = await getBancorTokenFactor(this.ctx, [token])
    return result
  }
  public async getReserve(token: string) {
    this.logger.info('getReserve of bankor token');
    let result = await getBancorTokenReserve(this.ctx, [token])
    return result
  }
  public async getSupply(token: string) {
    this.logger.info('getSupply of bankor token');
    let result = await getBancorTokenSupply(this.ctx, [token])
    return result
  }
  public async transferCandy(address: string, value: number) {
    let result = await transferTo(this.ctx, [address, value + '', 0.1 + '']);
    return result;
  }
}
