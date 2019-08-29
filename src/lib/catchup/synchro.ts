// import { Logger } from '../../api/logger';
import winston = require('winston');
import { RPCClient } from '../../client/client/rfc_client';
import { IfSysinfo, IfContext, DelayPromise, IfResult } from '../../api/common'
import { getLastIrreversibleBlockNumber } from '../../api/getLIBNumber'
import { getBlock } from '../../api/getblock'
import { getReceipt } from '../../api/getreceipt';
import { StatusDataBase } from '../storage/statusdb';
import { StorageDataBase, HASH_TYPE, SYS_TOKEN, TOKEN_TYPE } from '../storage/StorageDataBase';
import { ErrorCode, IFeedBack } from '../../core';
import { getBalance } from '../../api/getbalance';
import { getTokenBalance } from '../../api/getTokenBalance';
import { getBancorTokenBalance } from '../../api/getBancorTokenBalance';
import { getBancorTokenFactor } from '../../api/getBancorTokenFactor';
import { getBancorTokenReserve } from '../../api/getBancorTokenReserve';
import { getBancorTokenSupply } from '../../api/getBancorTokenSupply';
import * as fs from 'fs';
import { transferTo } from '../../api/transferto';
import { SYS_TOKEN_PRECISION, BANCOR_TOKEN_PRECISION, NORMAL_TOKEN_PRECISION, MINE_REWARD } from '../storage/dbapi/scoop';
import { getMiners } from '../../api/getminers';
import { getBalances } from '../../api/getbalances';
import { getTokenBalances } from '../../api/getTokenBalances';
import { getBancorTokenBalances } from '../../api/getBancorTokenBalances';
import { getBancorTokenParams } from '../../api/getBancorTokenParams';
import { getBlocks } from '../../api/getblocks';
import { getLockBancorTokenBalance } from '../../api/getLockBancorTokenBalance';
import { getCandidates } from '../../api/getCandidates';
import { localCache } from './localcache';

import { parseTransferTo } from './parse/transferto';
import { parseCreateToken } from './parse/createtoken';
import { parseTransferTokenTo } from './parse/transfertokento';
import { parseMortgage } from './parse/mortgage';
import { parseVote } from './parse/vote';
import { parseRegister, parseUnregister } from './parse/register';
import { parseUnmortgage } from './parse/unmortgage';
import { parseCreateLockBancorToken, updateShortALTRow, updatePureALTRow } from './parse/createlockbancortoken';
import { parseTransferLockBancorTokenTo } from './parse/transferlockbancortokento';
import { parseTransferLockBancorTokenToMulti } from './parse/transferlockbancortokentomulti';
import { parseSellLockBancorToken } from './parse/selllockbancortoken';
import { parseBuyLockBancorToken } from './parse/buylockbancortoken';
import { parseRunUserMethod } from './parse/runusermethod';
import { parseDefaultCommand } from './parse/defaultcommand';
import { bEnableGetCandy } from '../..';

/**
 * This is a client , always syncing with the Chain
 * 
 */

const PERIOD = 5;
const MAX_BUSY_INDEX = 10;

interface IfSynchroOptions {
  ip: string;
  port: number;
  batch: number;
}
export interface IName {
  address: string;
}
interface IBalance {
  address: string;
  balance: string;
}

interface IBancorTokenParams {
  F: string;
  S: String;
  R: string;
}

interface IfTaskItem {
  id: number;
  tx: any;
  receipt: any;
}
interface IfReceiptItem {
  id: number;
  receipt: any;
}
export interface IfTxTableItem {

  hash: string;
  address: string;
  content: Buffer;

}
export interface IfBlockItem {
  bhash: string;
  nhash: number;
  dtime: number;
  block: any;
  txs: any[];
  receipts: any[];
}

export interface IfParseItem {
  block: any;
  transactions: any[];
  receipts: any[];
}
export interface IfParseReceiptItem {
  block: any;
  tx: any;
  receipt: any;
}

export class Synchro {
  public logger: winston.LoggerInstance;

  private ip: string;
  private port: number;
  private ctx: IfContext;
  private pStatusDb: StatusDataBase;
  public pStorageDb: StorageDataBase;
  private nCurrentLIBHeight: number;
  private nBatch: number;
  private nLatestBlock: number;
  // private latestMinerLst: string[];
  private busyIndex: number;

  constructor(options: IfSynchroOptions, logger: winston.LoggerInstance, statusdb: StatusDataBase, storagedb: StorageDataBase) {
    this.ip = options.ip;
    this.port = options.port;
    this.logger = logger;
    this.nBatch = options.batch;

    // get account secret for distributing candy
    let bossObj: any
    try {
      if (bEnableGetCandy === true) {
        let boss = fs.readFileSync('./secret/boss.json')
        bossObj = JSON.parse(boss.toString());
      } else { // false, not enabled
        bossObj = { address: '', secret: '' }
      }

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
    this.nLatestBlock = 0;
    // this.latestMinerLst = [];
    this.busyIndex = 0;
  }

  public async start() {
    this.logger.info('Synchro client started ...\n');
    this.loopTask();
  }
  private async loopTask() {
    // get LIBNumber
    this.logger.info('loopTask() =========================\n');

    let result = await this.getLatestBlock();
    if (result.ret === 200) {
      let obj = JSON.parse(result.resp!);
      this.nLatestBlock = obj.block.number;
      localCache.getChainOverview.blockHeight = obj.block.number;
    }

    result = await this.getLIBNumber()
    if (result.ret === 200) {
      this.nCurrentLIBHeight = parseInt(result.resp!);
      localCache.getChainOverview.irreversibleBlockHeight = this.nCurrentLIBHeight;
    }

    // get currentHeight, load from database , in statsDb.init()
    let nCurrentHeight = this.pStatusDb.nCurrentHeight;

    this.logger.info('currentHeight:', nCurrentHeight, ' currentLIB:', this.nCurrentLIBHeight);

    let result2: IFeedBack;
    if (nCurrentHeight === 0) {
      result2 = await this.parseBlockRange(0, this.nCurrentLIBHeight);
    }
    else if (this.nCurrentLIBHeight - nCurrentHeight === 1) {
      result2 = await this.parseBlockRange(nCurrentHeight + 1, nCurrentHeight + 1);
    }
    else if (nCurrentHeight < this.nCurrentLIBHeight) {
      result2 = await this.parseBlockRange(nCurrentHeight + 1, this.nCurrentLIBHeight);
    }
    else if (nCurrentHeight > this.nCurrentLIBHeight) {
      throw new Error('Obsolete storage! consider to clean by running: npm run clean && npm run cleandb')
    }
    else {
      this.logger.info('Height equal , no need to update\n');
    }
    this.logger.info(JSON.stringify(result2!));

    await this.updateTxUserCount();

    await this.updateGetTxs();

    await this.updateGetLatestBlocks();

    this.logger.info('-------- end of looptask() -----------\n');
    this.logger.info('Delay ', PERIOD, ' seconds\n');
    await DelayPromise(PERIOD);
    this.loopTask2();
  }
  /**
   * loopTask2(), loopTask() triggered alternately
   */
  // add for miner balance sync
  private async loopTask2() {
    this.logger.info('loopTask2()\n');

    // get candidatesinfo
    let result = await this.laGetCandidates();
    console.log(result);

    if (result.ret === 200) {
      let obj = Object.create(null);
      try {
        obj = JSON.parse(result.resp!);
        localCache.getCandidates = obj.value;
      }
      catch (e) {
        this.logger.error("error");
        console.log(e);
      }

    } else {
      this.logger.error('Can not fetch candidates');
      console.log(result);
    }


    // update miner balance one by one, we won't take time to retry here.
    this.logger.info('-------- end of looptask2() -----------\n');

    let delay = PERIOD * (MAX_BUSY_INDEX - this.busyIndex) / MAX_BUSY_INDEX;
    this.logger.info('Delay ', delay, ' seconds\n');
    await DelayPromise(delay);
    this.loopTask();
  }

  // New way of parsing block
  private async parseBlockRange(start: number, end: number): Promise<IFeedBack> {
    // Choose to use getBlock or getBlocks
    if (start === end) {
      return this.parseBlock(start);
    } else {
      for (let i = start; i <= end; i = i + this.nBatch) {
        let result = await this.parseBlocks(i, ((i + this.nBatch - 1) > end) ? end : (i + this.nBatch - 1));
        if (result.err) {
          return { err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_FAILED, data: null }
        }
      }
    }
    return { err: ErrorCode.RESULT_OK, data: null }
  }
  private async parseBlock(start: number): Promise<IFeedBack> {
    let blockItems: IfParseItem[] = [];
    let hret = await this.laGetBlock(start);
    if (hret.ret !== 200) {
      return { err: ErrorCode.RESULT_SYNC_GETBLOCKS_FAILED, data: {} }
    }
    try {
      let obj = JSON.parse(hret.resp!);
      blockItems.push(obj);
    } catch (e) {
      this.logger.error('parseBlock parsing error');
      return { err: ErrorCode.RESULT_PARSE_ERROR, data: {} }
    }
    return this.parseBlockItems(blockItems);
  }
  private async parseBlocks(start: number, end: number): Promise<IFeedBack> {
    let blockItems: IfParseItem[] = [];
    let hret = await this.laGetBlocks(start, end);
    if (hret.ret !== 200) {
      return { err: ErrorCode.RESULT_SYNC_GETBLOCKS_FAILED, data: {} }
    }
    try {
      let objAll = JSON.parse(hret.resp!);
      for (let i = 0; i < objAll.blocks.length; i++) {
        blockItems.push(objAll.blocks[i])
      }
    } catch (e) {
      this.logger.error('parseBlocks parsing error');
      return { err: ErrorCode.RESULT_PARSE_ERROR, data: {} }
    }
    return this.parseBlockItems(blockItems);
  }
  private async parseBlockItems(items: IfParseItem[]): Promise<IFeedBack> {
    // parse one block itme
    for (let i = 0; i < items.length; i++) {
      let hret = await this.parseBlockItem(items[i]);

      if (hret.err) {
        return { err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_FAILED, data: null }
      }
      let feedback2 = await this.syncHeightAndMineAward(items[i].block.number);
      if (feedback2.err) {
        this.logger.error('Save block ', items[i].block.number, ' to height failedd');
        return { err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_SAVE_FAILED, data: {} }
      }
      this.pStatusDb.nCurrentHeight = items[i].block.number;
    }
    return { err: ErrorCode.RESULT_OK, data: {} }
  }
  private async parseBlockItem(obj: IfParseItem): Promise<IFeedBack> {

    this.logger.debug('parseBlockItem,')
    console.log(obj);

    let hash = obj.block.hash;
    let hashnumber = obj.block.number;
    let timestamp = obj.block.timestamp;
    let creator = obj.block.creator;
    let txno = obj.transactions.length;
    let height = obj.block.number;
    let reward = obj.block.reward;
    let coinbase = obj.block.coinbase;

    // save block hash
    this.logger.info('\nsave block hash to hash table, update block: ' + hashnumber)
    // save to hash table
    let startT = new Date().getTime();
    let feedback = await this.pStorageDb.insertOrReplaceHashTable(hash, HASH_TYPE.BLOCK);
    if (feedback.err) {
      this.logger.error('updateBlock ', hashnumber, ' number indertToHashTable failed')
      return { err: feedback.err, data: null }
    }
    let endT = new Date().getTime();
    this.logger.info('Delta of insert block hash: ' + (endT - startT));

    // save to block table
    this.logger.info('save block to blocktable:' + hashnumber);
    let startT2 = new Date().getTime();
    feedback = await this.pStorageDb.insertOrReplaceBlockTable(hash, height, txno, creator, timestamp);
    if (feedback.err) {
      this.logger.error('updateBlock ', hashnumber, ' put into block table failed')
      return { err: feedback.err, data: null }
    }
    let endT2 = new Date().getTime();
    this.logger.info('Delta of insertOrReplaceBlockTable :' + (endT2 - startT2));

    // update creator balance, getFrom Account table
    feedback = await this.laUpdateAccountTable(coinbase, SYS_TOKEN, TOKEN_TYPE.SYS, reward);
    // add reward 

    if (txno > 0) {
      let startT3 = new Date().getTime();
      this.logger.info('parseTxs --> : [ ' + txno + ' ]')
      feedback = await this.parseTxs(obj);
      if (feedback.err) {
        return { err: feedback.err, data: null }
      }
      let endT3 = new Date().getTime();
      this.logger.info('Delta of parseTxs :' + (endT3 - startT3));
    }

    this.logger.info('End of save block hash to hash table, update block: ' + hashnumber)
    console.log('End of save block hash to hash table, update block: ', hashnumber)
    this.logger.info('ParseBlockItem time:' + (new Date().getTime() - startT));

    return { err: ErrorCode.RESULT_OK, data: {} }
  }

  private async parseTxs(obj: IfParseItem): Promise<IFeedBack> {
    let taskLst1: IfTaskItem[] = [];
    let txs = obj.transactions;
    let bhash = obj.block.hash;
    let nhash = obj.block.number;
    let dtime = obj.block.timestamp;

    for (let j = 0; j < txs.length; j++) {
      taskLst1.push({
        id: j,
        tx: txs[j],
        receipt: {
          block: obj.block,
          tx: txs[j],
          receipt: obj.receipts[j]
        }
      });
    }
    let startT1 = new Date().getTime();
    let feedback = await this.batchInsertTxToHashTable(taskLst1);
    if (feedback.err) {
      this.logger.error('batchInsertTxToHashTable failed');
      return { err: feedback.err, data: null };
    }
    let endT1 = new Date().getTime();
    this.logger.info('Delta of insert all tx to hash table:' + (endT1 - startT1));

    // put it into tx table, insertOrReplace
    feedback = await this.batchInsertTxTable(bhash, nhash, dtime, taskLst1);
    if (feedback.err) {
      this.logger.error('batchInsertTxToHashTable failed');
      return { err: feedback.err, data: null };
    }
    let endT2 = new Date().getTime();
    this.logger.info('Delta of batchInsertTxTable:' + (endT2 - endT1));

    let receptlst: IfParseReceiptItem[] = [];
    for (let i = 0; i < taskLst1.length; i++) {
      receptlst.push(taskLst1[i].receipt);
    }

    feedback = await this.parseAccountAndTokens(receptlst);
    if (feedback.err) {
      this.logger.error('parseAccountAndTokens failed');
      return { err: feedback.err, data: null };
    }
    let endT3 = new Date().getTime();
    this.logger.info('\n##Delta of parse one block:' + (endT3 - endT2) + '\n');

    return { err: ErrorCode.RESULT_OK, data: {} }
  }

  private async parseAccountAndTokens(receiptlst: IfParseReceiptItem[]): Promise<IFeedBack> {
    this.logger.info('parseAccountAndTokens , len: ' + receiptlst.length);
    for (let i = 0; i < receiptlst.length; i++) {
      let feedback = await this.parseAccountAndToken(receiptlst[i])
      if (feedback.err) {
        return { err: ErrorCode.RESULT_ERROR_STATE, data: {} }
      }
    }

    return { err: ErrorCode.RESULT_OK, data: {} }
  }
  private async parseAccountAndToken(recet: IfParseReceiptItem): Promise<IFeedBack> {
    this.logger.info('parseAccountAndToken');
    console.log(recet);

    let tx = recet.tx;

    if (tx.method === 'transferTo') {
      return parseTransferTo(this, recet);
    }
    else if (tx.method === 'createToken') {
      return parseCreateToken(this, recet, TOKEN_TYPE.NORMAL);
    }
    else if (tx.method === 'transferTokenTo') {
      return parseTransferTokenTo(this, recet, TOKEN_TYPE.NORMAL);
    }
    else if (tx.method === 'mortgage') {
      return parseMortgage(this, recet);
    }
    else if (tx.method === 'unmortgage') {
      return parseUnmortgage(this, recet);
    }
    else if (tx.method === 'vote') {
      return parseVote(this, recet);
    }
    else if (tx.method === 'register') {
      return parseRegister(this, recet);
    }
    else if (tx.method === 'unregister') {
      return parseUnregister(this, recet);
    }
    else if (tx.method === 'createBancorToken') {
      return parseCreateLockBancorToken(this, recet, TOKEN_TYPE.BANCOR);
    }
    else if (tx.method === 'transferBancorTokenTo') {
      return parseTransferLockBancorTokenTo(this, recet, TOKEN_TYPE.BANCOR);
    }
    else if (tx.method === 'transferBancorTokenToMulti') {
      return parseTransferLockBancorTokenToMulti(this, recet, TOKEN_TYPE.BANCOR);
    }
    else if (tx.method === 'sellBancorToken') {
      return parseSellLockBancorToken(this, recet, TOKEN_TYPE.BANCOR);
    }
    else if (tx.method === 'buyBancorToken') {
      return parseBuyLockBancorToken(this, recet, TOKEN_TYPE.BANCOR);
    }
    else if (tx.method === 'runUserMethod') {
      return parseRunUserMethod(this, recet);
    }
    else if (tx.method === 'setUserCode'
      || tx.method === 'getUserCode'
    ) {
      this.logger.info('We wont handle tx:', tx.method, '\n')
      return parseDefaultCommand(this, recet);
    }
    else {
      return new Promise<IFeedBack>(async (resolv) => {
        this.logger.error('Unrecognized account and token method:');
        resolv({ err: ErrorCode.RESULT_SYNC_TX_UNKNOWN_METHOD, data: null })
      });
    }
  }

  // private calcBusyIndex(txno: number) {
  //   if (txno === 0) {
  //     return 0;
  //   } else if (txno >= 50) {
  //     return MAX_BUSY_INDEX;
  //   } else {
  //     return MAX_BUSY_INDEX * txno / 50;
  //   }
  // }
  private async updateTxUserCount(): Promise<IFeedBack> {
    let nTxCount = 0;
    // get tx count
    let result2 = await this.pStorageDb.queryTxTableCount();
    if (result2.err) {
      this.logger.error('taskgetchainoverview get tx count fail');
      return ({ err: ErrorCode.RESULT_SYNC_GETCHAINOVERVIEW_FAILED, data: {} });

    }
    try {
      nTxCount = parseInt(result2.data.count)
    } catch (e) {
      this.logger.error('taskgetchainoverview get tx count JSON parse fail');
      return ({ err: ErrorCode.RESULT_SYNC_GETCHAINOVERVIEW_FAILED, data: {} });

    }


    let nUserCount = 0;
    let result3 = await this.pStorageDb.queryUserCount();
    if (result3.err) {
      this.logger.error('taskgetchainoverview get user count fail');
      return ({ err: ErrorCode.RESULT_SYNC_GETCHAINOVERVIEW_FAILED, data: {} });

    }
    try {
      nUserCount = parseInt(result3.data.count)
    } catch (e) {
      this.logger.error('taskgetchainoverview get user count JSON parse fail');
      return ({ err: ErrorCode.RESULT_SYNC_GETCHAINOVERVIEW_FAILED, data: {} });
    }

    localCache.getChainOverview.txCount = nTxCount;
    localCache.getChainOverview.userCount = nUserCount;

    return { err: ErrorCode.RESULT_OK, data: {} }
  }

  private async updateGetTxs(): Promise<IFeedBack> {
    let page = 1;
    let pageSize = localCache.MAX_PAGESIZE;

    try {
      let result = await this.pStorageDb.queryTxTableByPage(
        (page > 0) ? (page - 1) : 0, pageSize);

      if (result.err === ErrorCode.RESULT_OK) {

        for (let i = 0; i < result.data.length; i++) {
          // console.log('getTxs:', i)
          // console.log(JSON.parse(result.data[i].content.toString()))
          result.data[i].content = JSON.parse(result.data[i].content);

        }
        console.log('gettxs:', result.data.length);
        let arr = result.data;
        let result1 = await this.pStorageDb.queryTxTableCount();
        let newObj: any;

        newObj = {};
        newObj.data = result.data;
        newObj.total = parseInt(result1.data.count)

        localCache.getTxs = newObj;
      }
    } catch (e) {
      this.logger.error('Wrong getTxs ARGS');
    }

    return { err: ErrorCode.RESULT_OK, data: [] };
  }

  private async updateGetLatestBlocks(): Promise<IFeedBack> {
    let page = 1;
    let pageSize = localCache.MAX_PAGESIZE;

    let result = await this.pStorageDb.queryBlockTableByPage(
      (page > 0) ? (page - 1) : 0, pageSize);

    if (result.err === ErrorCode.RESULT_OK) {
      // 
      let result1 = await this.pStorageDb.queryBlockTotal();
      let newObj: any;
      newObj = {};
      newObj.data = result.data;
      newObj.total = parseInt(result1.data.count)

      localCache.getLatestBlocks = newObj;

    }
    return { err: ErrorCode.RESULT_OK, data: [] };
  }

  // private updateBlockRangeBatch(nStart: number, nStop: number) {
  //   return new Promise<IFeedBack>(async (resolv) => {
  //     for (let i = nStart; i <= nStop; i = i + this.nBatch) {
  //       let result = await this.updateBlockRangeGroupNew(i, ((i + this.nBatch - 1) > nStop) ? nStop : (i + this.nBatch - 1));
  //       if (result.err !== 0) {
  //         resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_FAILED, data: null })
  //         return;
  //       }
  //     }
  //     resolv({ err: ErrorCode.RESULT_OK, data: null })
  //   });
  // }
  // private updateBlockRangeGroupNew(nStart: number, nStop: number) {
  //   return new Promise<IFeedBack>(async (resolv) => {
  //     this.logger.info('updateBlockRangeGroupNew');
  //     let result = await this.laGetBlocks(nStart, nStop);
  //     if (result.ret === 200) {
  //       try {
  //         let objAll = JSON.parse(result.resp!);
  //         if (objAll.err === 0) {
  //           console.log(objAll.blocks.length, ' blocks');
  //           // for (let i = 0; i < objAll.blocks.length; i++) {
  //           //   console.log('block : ', i)
  //           // }
  //           // let obj = objAll.blocks[i];
  //           // // console.log('\nobj:')
  //           // console.log(obj.block);
  //           // console.log('transactions:', obj.transactions.length)
  //           // if (obj.transactions.length > 0) {
  //           //   console.log(obj.transactions[0])
  //           // }
  //           // console.log('receipts:', obj.receipts.length);
  //           // if (obj.receipts.length > 0) {
  //           //   console.log(obj.receipts[0])
  //           //   console.log(JSON.stringify(obj.receipts[0]))
  //           // }
  //           let length = objAll.blocks.length;
  //           let heightNew = objAll.blocks[length - 1].block.number;

  //           let feedback = await this.syncBlockDataGroup(objAll.blocks);
  //           if (feedback.err) {
  //             resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_FAILED, data: null })
  //             return;
  //           } else {
  //             // update lib
  //             // update statusDB current Height
  //             let feedback2 = await this.syncHeightAndMineAward(heightNew);
  //             if (feedback2.err) {
  //               this.logger.error('Save blocks ', length, ' to db failedd');
  //               resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_SAVE_FAILED, data: length });
  //               return;
  //             }
  //             // this.pStatusDb.nCurrentHeight = obj.block.number;
  //             this.pStatusDb.nCurrentHeight = heightNew;
  //           }

  //           resolv({ err: ErrorCode.RESULT_OK, data: null });
  //           return;
  //         }
  //       } catch (e) {
  //         this.logger.error('udpateBlockRangeBatch parsing error');
  //       }

  //     }
  //     resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_FAILED, data: null })

  //   });
  // }
  // private updateBlockRangeGroup(nStart: number, nStop: number) {
  //   return new Promise<IFeedBack>(async (resolv) => {
  //     this.logger.info('updateBlockRangeGroup');
  //     let result = await this.laGetBlocks(nStart, nStop);
  //     if (result.ret === 200) {
  //       try {
  //         let objAll = JSON.parse(result.resp!);
  //         if (objAll.err === 0) {
  //           console.log(objAll.blocks.length, ' blocks');
  //           for (let i = 0; i < objAll.blocks.length; i++) {
  //             console.log('block : ', i)
  //             let obj = objAll.blocks[i];
  //             // console.log('\nobj:')
  //             console.log(obj.block);
  //             console.log('transactions:', obj.transactions.length)
  //             if (obj.transactions.length > 0) {
  //               console.log(obj.transactions[0])
  //             }
  //             console.log('receipts:', obj.receipts.length);
  //             if (obj.receipts.length > 0) {
  //               console.log(obj.receipts[0])
  //               console.log(JSON.stringify(obj.receipts[0]))
  //             }

  //             let feedback = await this.syncBlockData(obj);
  //             if (feedback.err) {
  //               resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_FAILED, data: null })
  //               return;
  //             } else {
  //               // update lib
  //               // update statusDB current Height
  //               let feedback2 = await this.syncHeightAndMineAward(obj.block.number);
  //               if (feedback2.err) {
  //                 this.logger.error('Save block ', i, ' to db failedd');
  //                 resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_SAVE_FAILED, data: i });
  //                 return;
  //               }
  //               this.pStatusDb.nCurrentHeight = obj.block.number;
  //             }
  //           }
  //           resolv({ err: ErrorCode.RESULT_OK, data: null });
  //           return;
  //         }
  //       } catch (e) {
  //         this.logger.error('udpateBlockRangeBatch parsing error');
  //       }

  //     }
  //     resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_FAILED, data: null })

  //   });
  // }
  // Only update SYS supply, miner balance will not change;
  private async syncHeightAndMineAward(height: number): Promise<IFeedBack> {
    this.logger.info('syncHeightAndMineAward');

    let result = await this.pStorageDb.queryTokenTable('SYS');
    if (result.err === ErrorCode.RESULT_OK) {
      result.data.content = JSON.parse(result.data.content);
    } else {
      return result;
    }
    result.data.content.supply += MINE_REWARD;
    this.logger.info(result.data.content.supply);

    let result2 = await this.pStorageDb.updateTokenTableContent('SYS',
      Buffer.from(JSON.stringify({
        supply: result.data.content.supply,
        precision: SYS_TOKEN_PRECISION
      })));
    if (result2.err) { return result2; }

    let hret = await this.pStatusDb.setCurrentHeight(height);
    return hret;
  }
  // private async syncBlockData(obj: any) {
  //   return new Promise<IFeedBack>(async (resolv) => {
  //     let hash = obj.block.hash;
  //     let hashnumber = obj.block.number;
  //     let timestamp = obj.block.timestamp;
  //     let address = obj.block.creator;
  //     let txno = obj.transactions.length;
  //     let height = obj.block.number;

  //     this.logger.info('save block hash to hash table')
  //     let startSyncBlockDataTime = new Date().getTime();
  //     console.log('Start of syncBlockData', new Date());
  //     // save to hash table
  //     let feedback = await this.pStorageDb.insertOrReplaceHashTable(hash, HASH_TYPE.BLOCK);
  //     if (feedback.err) {
  //       this.logger.error('updateBlock ', hashnumber, ' number indertToHashTable failed')
  //       resolv({ err: feedback.err, data: null });
  //       return;
  //     }

  //     // save to block table
  //     feedback = await this.pStorageDb.insertOrReplaceBlockTable(hash, height, txno, address, timestamp);
  //     if (feedback.err) {
  //       this.logger.error('updateBlock ', hashnumber, ' put into block able failed')
  //       resolv({ err: feedback.err, data: null });
  //       return;
  //     }

  //     // update block-creator's balance
  //     this.logger.info('save to minerLst , let loopTask2 to do it');

  //     let miner1 = this.latestMinerLst.find((item) => {
  //       return item === address;
  //     })
  //     if (!miner1) {
  //       this.latestMinerLst.push(address);
  //     }
  //     this.busyIndex = this.calcBusyIndex(txno);

  //     if (txno > 0) {
  //       this.logger.info('UpdateTx --> :', txno)
  //       let startUpdateTxNew = new Date().getTime();
  //       console.log('Start of updateTexNew', new Date());
  //       feedback = await this.updateTxNew(hash, hashnumber, timestamp, obj.block, obj.transactions, obj.receipts);
  //       console.log('End of updateTexNew', new Date());
  //       console.log('Delta of updateTxNew is:', new Date().getTime() - startUpdateTxNew)
  //       if (feedback.err) {

  //         resolv({ err: feedback.err, data: null });
  //         return;
  //       }
  //     }
  //     console.log('End of syncBlockData', new Date());
  //     console.log('Delta of syncBlockDAta is:', new Date().getTime() - startSyncBlockDataTime)
  //     resolv({ err: ErrorCode.RESULT_OK, data: null })

  //   });
  // }
  // private async syncBlockDataGroup(obj: any[]) {
  //   return new Promise<IFeedBack>(async (resolv) => {
  //     let blkLst: IfBlockItem[] = [];

  //     this.logger.info('save block hash to hash table')
  //     let startSyncBlockDataTime = new Date().getTime();
  //     console.log('Start of syncBlockDataGroup ', new Date());
  //     // save to hash table
  //     for (let i = 0; i < obj.length; i++) {
  //       let hash = obj[i].block.hash;
  //       let hashnumber = obj[i].block.number;
  //       let timestamp = obj[i].block.timestamp;
  //       let address = obj[i].block.creator;
  //       let txno = obj[i].transactions.length;
  //       let height = obj[i].block.number;

  //       let feedback = await this.pStorageDb.insertOrReplaceHashTable(hash, HASH_TYPE.BLOCK);
  //       if (feedback.err) {
  //         this.logger.error('updateBlock ', hashnumber, ' number indertToHashTable failed')
  //         resolv({ err: feedback.err, data: null });
  //         return;
  //       }

  //       // save to block table
  //       feedback = await this.pStorageDb.insertOrReplaceBlockTable(hash, height, txno, address, timestamp);
  //       if (feedback.err) {
  //         this.logger.error('updateBlock ', hashnumber, ' put into block able failed')
  //         resolv({ err: feedback.err, data: null });
  //         return;
  //       }
  //       if (txno > 0) {
  //         blkLst.push({
  //           bhash: hash,
  //           nhash: hashnumber,
  //           dtime: timestamp,
  //           block: obj[i].block,
  //           txs: obj[i].transactions,
  //           receipts: obj[i].receipts
  //         });
  //       }

  //     }

  //     // update block-creator's balance
  //     // this.logger.info('save to minerLst , let loopTask2 to do it');

  //     // let miner1 = this.latestMinerLst.find((item) => {
  //     //   return item === address;
  //     // })
  //     // if (!miner1) {
  //     //   this.latestMinerLst.push(address);
  //     // }
  //     // this.busyIndex = this.calcBusyIndex(txno);

  //     if (blkLst.length > 0) {
  //       this.logger.info('UpdateTx --> :', blkLst.length)
  //       let startUpdateTxNew = new Date().getTime();
  //       console.log('Start of updateTexNew', new Date());
  //       // feedback = await this.updateTxNewGroup(hash, hashnumber, timestamp, obj.block, obj.transactions, obj.receipts);
  //       let feedback = await this.updateTxNewGroup(blkLst);
  //       console.log('End of updateTexNewGroup', new Date());
  //       console.log('Delta of updateTxNewGroup is:', new Date().getTime() - startUpdateTxNew)
  //       if (feedback.err) {

  //         resolv({ err: feedback.err, data: null });
  //         return;
  //       }
  //     }
  //     console.log('End of syncBlockDataGroup', new Date());
  //     console.log('Delta of syncBlockDataGroup is:', new Date().getTime() - startSyncBlockDataTime)
  //     resolv({ err: ErrorCode.RESULT_OK, data: null })
  //   });
  // }
  // private async updateBlockSingle(nBlock: number): Promise<IFeedBack> {
  //   this.logger.info('updateBlockSingle()')
  //   return new Promise<IFeedBack>(async (resolv) => {
  //     this.logger.info('Get block ' + nBlock + '\n')
  //     let result = await this.updateBlock(nBlock);
  //     if (result.err === 0) {
  //       // update 
  //       // 2019-7-9
  //       let feedback = await this.syncHeightAndMineAward(nBlock);
  //       if (feedback.err === 0) {
  //         this.pStatusDb.nCurrentHeight = nBlock;
  //         resolv({ err: ErrorCode.RESULT_OK, data: null })
  //         return;
  //       }
  //     }
  //     this.logger.error('Save block ', nBlock, ' to db failedd');
  //     resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_FAILED, data: nBlock });
  //   });
  // }
  // get block
  // private async updateBlock(nBlock: number): Promise<IFeedBack> {
  //   return new Promise<IFeedBack>(async (resolv) => {
  //     this.logger.info('Get block ' + nBlock + '\n')
  //     let startUpdateBlockTime = new Date().getTime();
  //     console.log('Start of updateBlock', new Date());
  //     let result = await this.laGetBlock(nBlock)
  //     console.log('getBlock finished:', new Date());

  //     if (result.ret === 200) {
  //       // this.logger.info(result.resp + '\n');
  //       // save resp to hashtable
  //       let obj: any;
  //       try {
  //         obj = JSON.parse(result.resp + '');
  //       } catch (e) {
  //         this.logger.error('updateBlock json parse faile')
  //         resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_FAILED, data: null })
  //         return;
  //       }
  //       // 
  //       // this.logger.info('Display block -->');
  //       // console.log(obj);

  //       let hash = obj.block.hash;
  //       let hashnumber = obj.block.number;
  //       let timestamp = obj.block.timestamp;
  //       let address = obj.block.creator;
  //       let txno = obj.transactions.length;
  //       let height = obj.block.number;

  //       this.logger.info('save block hash to hash table, update block')
  //       // save to hash table
  //       let feedback = await this.pStorageDb.insertOrReplaceHashTable(hash, HASH_TYPE.BLOCK);
  //       if (feedback.err) {
  //         this.logger.error('updateBlock ', nBlock, ' number indertToHashTable failed')
  //         resolv({ err: feedback.err, data: null });
  //         return;
  //       }
  //       console.log('insertOrReplaceHashTable finished:', new Date());

  //       // save to block table
  //       feedback = await this.pStorageDb.insertOrReplaceBlockTable(hash, height, txno, address, timestamp);
  //       if (feedback.err) {
  //         this.logger.error('updateBlock ', nBlock, ' put into block able failed')
  //         resolv({ err: feedback.err, data: null });
  //         return;
  //       }
  //       console.log('insertOrReplaceBlockTable finished:', new Date());
  //       // update creator balance

  //       this.logger.info('save to minerLst , let loopTask2 to do it');
  //       let miner1 = this.latestMinerLst.find((item) => {
  //         return item === address;
  //       })
  //       if (!miner1) {
  //         this.latestMinerLst.push(address);
  //       }

  //       this.busyIndex = this.calcBusyIndex(txno);

  //       if (txno > 0) {
  //         this.logger.info('UpdateTx -->:', txno)
  //         let startTxTime = new Date().getTime();
  //         console.log('Start of updateTxNew', new Date());
  //         feedback = await this.updateTxNew(hash, hashnumber, timestamp, obj.block, obj.transactions, obj.receipts);
  //         console.log('End of updateTxNew', new Date());
  //         let endTxTime = new Date().getTime()
  //         console.log('Delta of udpateTxNew is:', endTxTime - startTxTime);
  //         if (feedback.err) {

  //           resolv({ err: feedback.err, data: null });
  //           return;
  //         }
  //       }
  //       console.log('End of updateBlock', new Date());
  //       console.log('Delta of updateBlock:', new Date().getTime() - startUpdateBlockTime)
  //       resolv({ err: ErrorCode.RESULT_OK, data: null })

  //     } else {
  //       this.logger.info('wrong return value')
  //       this.logger.info(result.ret + '\n');
  //       resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_FAILED, data: null })
  //     }
  //   });
  // }
  // private async updateSingleTx(bhash: string, nhash: number, dtime: number, taskitem: IfTaskItem): Promise<IFeedBack> {
  //   let hash = taskitem.tx.hash;
  //   let blockhash = bhash;
  //   let blocknumber = nhash;
  //   let address = taskitem.tx.caller;
  //   let datetime = dtime;

  //   // insertOrReplace it into hash table
  //   console.log('insert to to hashtable,start:', new Date());
  //   let feedback = await this.pStorageDb.insertOrReplaceHashTable(hash, HASH_TYPE.TX);
  //   if (feedback.err) {
  //     return { err: feedback.err, data: null };
  //   }

  //   // get receipt
  //   console.log('To getReceipt:', new Date());
  //   feedback = await this.getReceiptInfo(hash);
  //   if (feedback.err) {
  //     this.logger.error('getReceipt for tx failed')
  //     return { err: feedback.err, data: null };
  //   }
  //   this.logger.info('get receipt for tx ' + taskitem.tx + ' -->\n')
  //   console.log(feedback.data)

  //   // put it into tx table, insertOrReplace
  //   // let fee = txs[j].fee;
  //   let recet: any;
  //   try {
  //     recet = JSON.parse(feedback.data.toString());
  //     taskitem.tx.cost = recet.receipt.cost;
  //   } catch (e) {
  //     this.logger.error('parse receipt failed')
  //     return { err: ErrorCode.RESULT_PARSE_ERROR, data: null };
  //   }
  //   console.log('To insertTxTable:', new Date());
  //   let content: Buffer = Buffer.from(JSON.stringify(taskitem.tx))
  //   feedback = await this.pStorageDb.insertTxTable(hash, blockhash, blocknumber, address, datetime, content);

  //   if (feedback.err) {
  //     this.logger.error('put tx into txtable failed')
  //     return { err: feedback.err, data: null };
  //   }
  //   console.log('updateTx:')
  //   console.log(content);
  //   // console.log(typeof content)

  //   console.log('Begin checkAccountAndToken:', new Date());
  //   let feedback2 = await this.checkAccountAndToken(recet);
  //   if (feedback2.err) {
  //     this.logger.error('checkAccountAndToken() failed.')
  //     return { err: feedback2.err, data: null };
  //   }
  //   console.log('End of udpateSingleTx', new Date());
  //   return { err: ErrorCode.RESULT_OK, data: taskitem.id };
  // }
  // private async  updateMultiTx(bhash: string, nhash: number, dtime: number, taskLst: IfTaskItem[]): Promise<IFeedBack> {
  //   let promiseLst: Promise<IFeedBack>[] = [];

  //   this.logger.info('UpdateTxMulti -- length:', taskLst.length);

  //   // Parallel processing 
  //   for (let i = 0; i < taskLst.length; i++) {
  //     let func = new Promise<IFeedBack>(async (resolve) => {
  //       let task: IfTaskItem = taskLst[i];
  //       let result = await this.updateSingleTx(bhash, nhash, dtime, task);
  //       resolve(result);
  //     });
  //     promiseLst.push(func);
  //   }
  //   let finishedId: number[] = [];
  //   await Promise.all(promiseLst).then((result) => {
  //     for (let item of result) {
  //       this.logger.info('returned:', JSON.stringify(item));
  //       if (item.err === 0) {
  //         // remove item.data id from 
  //         finishedId.push(item.data);
  //       }
  //     }
  //   });
  //   console.log('finishedId:', finishedId);

  //   let newTaskLst: IfTaskItem[] = [];
  //   for (let i = 0; i < taskLst.length; i++) {
  //     let id = taskLst[i].id;
  //     if (finishedId.indexOf(id) === -1) {
  //       newTaskLst.push(taskLst[i]);
  //     }
  //   }
  //   // Check if 
  //   if (newTaskLst.length > 0) {
  //     return await this.updateMultiTx(bhash, nhash, dtime, newTaskLst);
  //   } else {
  //     return { err: ErrorCode.RESULT_OK, data: null }
  //   }
  // }
  // private async getAllReceipt(taskLst: IfTaskItem[]): Promise<IFeedBack> {
  //   let promiseLst: Promise<IFeedBack>[] = [];
  //   this.logger.info('getAllReceipt, num:', taskLst.length);

  //   // Parallel processing 
  //   for (let i = 0; i < taskLst.length; i++) {

  //     let func = new Promise<IFeedBack>(async (resolve) => {
  //       let taskitem: IfTaskItem = taskLst[i];
  //       let hash = taskitem.tx.hash;
  //       let feedback = await this.getReceiptInfo(hash);
  //       if (!feedback.err) {
  //         let recet: any;
  //         try {
  //           recet = JSON.parse(feedback.data.toString());
  //           // Notify!!
  //           // taskitem.task.cost = recet.receipt.cost;
  //         } catch (e) {
  //           this.logger.error('parse receipt failed')
  //           resolve({
  //             err: ErrorCode.RESULT_PARSE_ERROR,
  //             data: {}
  //           });
  //           return;
  //         }
  //         resolve({
  //           err: ErrorCode.RESULT_OK,
  //           data: { id: taskitem.id, receipt: recet }
  //         });
  //         return;
  //       } else {
  //         resolve({
  //           err: ErrorCode.RESULT_NEED_SYNC,
  //           data: {}
  //         });
  //       }
  //     });
  //     promiseLst.push(func);
  //   }

  //   let receiptLst: IfReceiptItem[] = [];
  //   await Promise.all(promiseLst).then((result) => {
  //     for (let item of result) {
  //       this.logger.info('returned:', JSON.stringify(item));
  //       if (item.err === ErrorCode.RESULT_OK) {
  //         // remove item.data id from 
  //         receiptLst.push(item.data);
  //       }
  //     }
  //   });
  //   return { err: ErrorCode.RESULT_OK, data: receiptLst }
  // }
  // In charge of failure of getAllReceipt()
  // private async getAllReceipts(taskLst: IfTaskItem[]): Promise<IFeedBack> {
  //   let result = await this.getAllReceipt(taskLst);

  //   let newTaskLst: IfTaskItem[] = [];

  //   for (let i = 0; i < taskLst.length; i++) {
  //     let id = taskLst[i].id;
  //     let itemFind: IfReceiptItem | undefined = result.data.find((item: IfReceiptItem) => {
  //       return id === item.id;
  //     })
  //     if (itemFind === undefined) {
  //       newTaskLst.push(taskLst[i]);
  //     } else {
  //       taskLst[i].receipt = itemFind.receipt;
  //     }
  //   }
  //   if (newTaskLst.length > 0) {
  //     this.logger.error('Error: new TaskLst error len:', newTaskLst.length);
  //     return await this.getAllReceipts(newTaskLst);
  //   } else {
  //     return { err: ErrorCode.RESULT_OK, data: null }
  //   }
  // }
  // Here task is transaction we get from block structure
  // receipt is a placeholder for receipt we get by tx.hash
  // I will rename task to be tx
  // private async updateTxNew(bhash: string, nhash: number, dtime: number, block: any, txs: any[], receipts: any[]) {
  //   // To store all information to update to local database
  //   let taskLst1: IfTaskItem[] = [];

  //   for (let j = 0; j < txs.length; j++) {
  //     taskLst1.push({
  //       id: j,
  //       tx: txs[j],
  //       receipt: {
  //         block: block,
  //         tx: txs[j],
  //         receipt: receipts[j]
  //       }
  //     });
  //   }
  //   // await this.updateMultiTx(bhash, nhash, dtime, taskLst1);

  //   // get all tx's receipt, change taskLst1 , return until finish fetching all tx receipts
  //   let startTime = new Date().getTime();
  //   console.log('start GetallReceipts:', new Date());

  //   console.log('End of getAllReceipts:', new Date());
  //   let endTime = new Date().getTime();
  //   console.log('Delta of get all receipts:', endTime - startTime)

  //   let feedback = await this.batchInsertTxToHashTable(taskLst1);
  //   if (feedback.err) {
  //     this.logger.error('batchInsertTxToHashTable failed');
  //     return { err: feedback.err, data: null };
  //   }
  //   console.log('Delta of insert all tx to hash table:', new Date().getTime() - endTime)

  //   // put it into tx table, insertOrReplace
  //   feedback = await this.batchInsertTxTable(bhash, nhash, dtime, taskLst1);
  //   if (feedback.err) {
  //     this.logger.error('batchInsertTxToHashTable failed');
  //     return { err: feedback.err, data: null };
  //   }

  //   // console.log('Begin batchcheckAccountAndToken:', new Date());
  //   feedback = await this.batchCheckAccountAndToken(taskLst1);
  //   if (feedback.err) {
  //     this.logger.error('batchCheckAccountAndToken failed');
  //     return { err: feedback.err, data: null };
  //   }

  //   return { err: ErrorCode.RESULT_OK, data: null };
  // }
  // private async updateTxNewGroup(bhash: string, nhash: number, dtime: number, block: any, txs: any[], receipts: any[]) {
  // private async updateTxNewGroup(objs: IfBlockItem[]) {
  //   // To store all information to update to local database
  //   let taskLst: IfTaskItem[] = [];

  //   for (let i = 0; i < objs.length; i++) {
  //     let taskLst1: IfTaskItem[] = [];
  //     for (let j = 0; j < objs[i].txs.length; j++) {
  //       taskLst1.push({
  //         id: j,
  //         tx: objs[i].txs[j],
  //         receipt: {
  //           block: objs[i].block,
  //           tx: objs[i].txs[j],
  //           receipt: objs[i].receipts[j]
  //         }
  //       });
  //       taskLst.push({
  //         id: j,
  //         tx: objs[i].txs[j],
  //         receipt: {
  //           block: objs[i].block,
  //           tx: objs[i].txs[j],
  //           receipt: objs[i].receipts[j]
  //         }
  //       });
  //     }
  //     let endTime = new Date().getTime();
  //     let feedback = await this.batchInsertTxToHashTable(taskLst1);
  //     if (feedback.err) {
  //       this.logger.error('batchInsertTxToHashTable failed');
  //       return { err: feedback.err, data: null };
  //     }
  //     console.log('Delta of insert all tx to hash table:', new Date().getTime() - endTime)

  //     // put it into tx table, insertOrReplace
  //     feedback = await this.batchInsertTxTable(objs[i].bhash, objs[i].nhash, objs[i].dtime, taskLst1);
  //     if (feedback.err) {
  //       this.logger.error('batchInsertTxToHashTable failed');
  //       return { err: feedback.err, data: null };
  //     }
  //   }

  // get all tx's receipt, change taskLst1 , return until finish fetching all tx receipts
  // let startTime = new Date().getTime();
  // console.log('start GetallReceipts:', new Date());

  // console.log('End of getAllReceipts:', new Date());
  // let endTime = new Date().getTime();
  // console.log('Delta of get all receipts:', endTime - startTime)

  // console.log('Begin batchcheckAccountAndToken:', new Date());
  //   let feedback = await this.batchCheckAccountAndToken(taskLst);
  //   if (feedback.err) {
  //     this.logger.error('batchCheckAccountAndToken failed');
  //     return { err: feedback.err, data: null };
  //   }

  //   return { err: ErrorCode.RESULT_OK, data: null };
  // }
  private async batchInsertTxToHashTable(taskLst: IfTaskItem[]): Promise<IFeedBack> {
    let hashLst: string[] = [];
    for (let i = 0; i < taskLst.length; i++) {
      hashLst.push(taskLst[i].tx.hash);
    }
    let feedback = await this.pStorageDb.batchInsertOrReplaceHashTAble(hashLst, HASH_TYPE.TX);
    return feedback;
  }
  private async batchInsertTxTable(bhash: string, nheight: number, dtime: number, taskLst: IfTaskItem[]): Promise<IFeedBack> {
    this.logger.info('batchInsertTxTable run ');
    let contentLst: IfTxTableItem[] = [];
    for (let i = 0; i < taskLst.length; i++) {
      taskLst[i].tx.cost = taskLst[i].receipt.receipt.cost;
      let contentBuf: Buffer = Buffer.from(JSON.stringify(taskLst[i].tx))
      contentLst.push({
        hash: taskLst[i].tx.hash,
        address: taskLst[i].tx.caller,
        content: contentBuf
      });
    }
    let feedback = this.pStorageDb.batchInsertTxTable(bhash, nheight, dtime, contentLst);
    return feedback;

  }
  // Old version, 
  // private async batchCheckAccountAndToken2(taskLst: IfTaskItem[]): Promise<IFeedBack> {
  //   let receiptLst: any[] = [];
  //   this.logger.info('batchCheckAccountAndToken length:', taskLst.length);

  //   for (let i = 0; i < taskLst.length; i++) {

  //     let recet = taskLst[i].receipt;
  //     receiptLst.push(recet);
  //     let feedback2 = await this.checkAccountAndToken(recet);
  //     if (feedback2.err) {
  //       this.logger.error('batchCheckAccountAndToken2() failed.')
  //       return { err: feedback2.err, data: null };
  //     }
  //   }
  //   return { err: ErrorCode.RESULT_OK, data: null };
  // }
  // new version
  // private async batchCheckAccountAndToken(taskLst: IfTaskItem[]): Promise<IFeedBack> {
  //   let receiptLst: any[] = [];
  //   this.logger.info('\nbatchCheckAccountAndToken length: [', taskLst.length, ']');

  //   for (let i = 0; i < taskLst.length; i++) {

  //     let recet = taskLst[i].receipt;
  //     receiptLst.push(recet);
  //   }
  //   let startTime = new Date().getTime();
  //   let feedback2 = await parallelCheckAccountAndToken(this, receiptLst);
  //   if (feedback2.err) {
  //     this.logger.error('parallelCheckAccountAndToken() failed.')
  //     return { err: feedback2.err, data: null };
  //   }
  //   let endTime = new Date().getTime();
  //   console.log('parallelCheckAccountAndToken delta is:', endTime - startTime);

  //   return { err: ErrorCode.RESULT_OK, data: null };
  // }


  // Based on tx method name
  // 1, token table
  // 2, account table
  // 3, hash table
  // private async checkAccountAndToken(receipt: any): Promise<IFeedBack> {
  //   let recet = receipt;
  //   this.logger.info('checkAccountAndToken\n')
  //   // this.logger.info(recet);

  //   let tx = recet.tx;
  //   console.log(tx);

  //   if (tx.method === 'transferTo') {
  //     return this.checkTransferTo(recet);
  //   }
  //   else if (tx.method === 'createToken') {
  //     return checkCreateToken(this, recet, TOKEN_TYPE.NORMAL);
  //   }
  //   else if (tx.method === 'transferTokenTo') {
  //     return this.checkTransferTokenTo(recet);
  //   }
  //   else if (tx.method === 'mortgage') {
  //     return checkMortgage(this, recet);
  //   }
  //   else if (tx.method === 'unmortgage') {
  //     return checkUnmortgage(this, recet);
  //   }
  //   else if (tx.method === 'vote') {
  //     return checkVote(this, recet);
  //   }
  //   else if (tx.method === 'register') {
  //     return checkRegister(this, recet);
  //   }
  //   else if (tx.method === 'unregister') {
  //     return checkUnregister(this, recet);
  //   }
  //   else if (tx.method === 'createBancorToken') {
  //     return checkCreateLockBancorToken(this, recet, TOKEN_TYPE.BANCOR);
  //   }
  //   else if (tx.method === 'transferBancorTokenTo') {
  //     return checkTransferLockBancorTokenTo(this, recet, TOKEN_TYPE.BANCOR);
  //   }
  //   else if (tx.method === 'transferBancorTokenToMulti') {
  //     return checkTransferLockBancorTokenToMulti(this, recet, TOKEN_TYPE.BANCOR);
  //   }
  //   else if (tx.method === 'sellBancorToken') {
  //     return checkSellLockBancorToken(this, recet, TOKEN_TYPE.BANCOR);
  //   }
  //   else if (tx.method === 'buyBancorToken') {
  //     return checkBuyLockBancorToken(this, recet, TOKEN_TYPE.BANCOR);
  //   }
  //   else if (tx.method === 'runUserMethod') {
  //     return checkRunUserMethod(this, recet);
  //   }
  //   else if (tx.method === 'setUserCode'
  //     || tx.method === 'getUserCode'
  //   ) {
  //     this.logger.info('We wont handle tx:', tx.method, '\n')
  //     return this.checkDefaultCommand(recet);
  //   }
  //   else {
  //     return new Promise<IFeedBack>(async (resolv) => {
  //       this.logger.error('Unrecognized account and token method:');
  //       resolv({ err: ErrorCode.RESULT_SYNC_TX_UNKNOWN_METHOD, data: null })
  //     });
  //   }
  // }

  private checkDefaultCommand(receipt: any) {
    return new Promise<IFeedBack>(async (resolv) => {
      // get caller balance
      let caller = receipt.tx.caller;
      let hash = receipt.tx.hash;
      let time = receipt.block.timestamp;
      // 
      // insert into txaddresstable
      let feedback = await this.pStorageDb.updateHashToTxAddressTable(hash, [caller], time);
      if (feedback.err) {
        resolv(feedback);
        return;
      }

      //if (receipt.receipt.returnCode === 0) {
      this.logger.info('checkDefaultCommand');
      feedback = await this.updateBalances(SYS_TOKEN, [{ address: caller }]);
      if (feedback.err) {
        resolv(feedback);
        return;
      }
      //}

      resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
  }

  // Check bancor R, F, S parameters
  // private checkBuyBancorToken(receipt: any) {
  //   return new Promise<IFeedBack>(async (resolv) => {
  //     this.logger.info('checkBuyBancorToken -->\n')
  //     let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
  //     let caller = receipt.tx.caller;
  //     let hash = receipt.tx.hash;
  //     let addrLst = [caller];
  //     let time = receipt.block.timestamp;

  //     // insert into txaddresstable
  //     let feedback = await this.pStorageDb.updateHashToTxAddressTable(hash, addrLst, time);
  //     if (feedback.err) {
  //       resolv(feedback);
  //       return;
  //     }
  //     feedback = await this.updateBalances(SYS_TOKEN, [{ address: caller }]);
  //     if (feedback.err) {
  //       resolv(feedback);
  //       return;
  //     }

  //     if (receipt.receipt.returnCode === 0) {
  //       let result = await this.updateBancorTokenBalance(tokenName, { address: caller });
  //       if (result.err) {
  //         resolv(result);
  //         return;
  //       }
  //       result = await this.updateBancorTokenParameters(tokenName);
  //       if (result.err) {
  //         resolv(result);
  //         return;
  //       }

  //     }
  //     resolv({ err: ErrorCode.RESULT_OK, data: null });
  //   });
  // }
  // private checkTransferTokenTo(receipt: any) {
  //   return new Promise<IFeedBack>(async (resolv) => {

  //     let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
  //     let caller = receipt.tx.caller;
  //     let to = receipt.tx.input.to;
  //     let hash = receipt.tx.hash;
  //     let time = receipt.block.timestamp;

  //     // insert into txaddresstable
  //     let feedback = await this.pStorageDb.updateHashToTxAddressTable(hash, [caller, to], time);
  //     if (feedback.err) {
  //       resolv(feedback);
  //       return;
  //     }

  //     let result = await this.updateBalance(SYS_TOKEN, { address: caller });
  //     if (result.err) {
  //       resolv(result);
  //       return;
  //     }

  //     if (receipt.receipt.returnCode === 0) {
  //       let result = await this.updateTokenBalances(tokenName, [{ address: caller }, { address: to }]);
  //       if (result.err) {
  //         resolv(result);
  //         return;
  //       }

  //     }

  //     resolv({ err: ErrorCode.RESULT_OK, data: null });
  //   });
  // }
  // private checkTransferBancorTokenTo(receipt: any) {
  //   return new Promise<IFeedBack>(async (resolv) => {
  //     this.logger.info('checkTransferBancorTokenTo -->');

  //     let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
  //     let caller = receipt.tx.caller;
  //     let to = receipt.tx.input.to;
  //     let hash = receipt.tx.hash;
  //     let time = receipt.block.timestamp;

  //     // insert into txaddresstable
  //     let feedback = await this.pStorageDb.updateHashToTxAddressTable(hash, [caller, to], time);
  //     if (feedback.err) {
  //       resolv(feedback);
  //       return;
  //     }

  //     let result = await this.updateBalance(SYS_TOKEN, { address: caller });
  //     if (result.err) {
  //       resolv(result);
  //       return;
  //     }

  //     if (receipt.receipt.returnCode === 0) {
  //       let result = await this.updateBancorTokenBalances(tokenName, [{ address: caller }, { address: to }]);
  //       if (result.err) {
  //         resolv(result);
  //         return;
  //       }

  //     }
  //     resolv({ err: ErrorCode.RESULT_OK, data: null });
  //   });
  // }
  // private fetchBancorTokenNumber(tokenName: string, func: (token: string) => Promise<IfResult>) {
  //   return new Promise<IFeedBack>(async (resolv) => {
  //     this.logger.info('fetchBancorTokenNumber')
  //     let result = await func.call(this, tokenName);
  //     if (result.ret === 200) {
  //       let obj = JSON.parse(result.resp!.toString());
  //       let value = obj.value.replace('n', '')
  //       let out: number;
  //       try {
  //         let num = parseFloat(value);
  //         let num1 = parseFloat(num.toFixed(BANCOR_TOKEN_PRECISION));
  //         resolv({ err: ErrorCode.RESULT_OK, data: num1 });
  //         return;
  //       } catch (e) {
  //         this.logger.error('getbancortokeninfo failed:', e);
  //         resolv({ err: ErrorCode.RESULT_SYNC_GETBANCORTOKENINFO_FAILED, data: '' })
  //       }
  //     } else {
  //       this.logger.error('getbancortokeninfo failed:', result)
  //       resolv({ err: ErrorCode.RESULT_SYNC_GETBANCORTOKENINFO_FAILED, data: '' })
  //     }
  //   });
  // }
  // private fetchBancorTokenNumbers(tokenName: string) {
  //   return new Promise<IFeedBack>(async (resolv) => {
  // private fetchBancorTokenNumberSupply(tokenName: string) {
  //   this.logger.info('fetchBancorTokenNumberSupply')
  //   return this.fetchBancorTokenNumber(tokenName, this.getSupply);
  //   // return new Promise<IFeedBack>(async (resolv) => {
  // }
  // private fetchBancorTokenNumberReserve(tokenName: string) {
  //   this.logger.info('fetchBancorTokenNumberReserve')
  //   return this.fetchBancorTokenNumber(tokenName, this.getReserve);

  // }
  // private fetchBancorTokenNumberFactor(tokenName: string) {
  //   this.logger.info('fetchBancorTokenNumberFactor')
  //   return this.fetchBancorTokenNumber(tokenName, this.getFactor)

  // }

  public insertBancorTokenParameters(tokenName: string) {
    this.logger.info('insertBancorTokenParameters, with: ', tokenName)
    return new Promise<IFeedBack>(async (resolv) => {
      this.logger.info('handleBancorTokenParameters')

      let result0 = await this.laGetBancorTokenParams(tokenName);
      if (result0.ret !== 200) {
        this.logger.error("insertBancorTokenParameters, get params failed");
        resolv({ err: ErrorCode.RESULT_DB_TABLE_GET_FAILED, data: null });
        return;
      }
      let F: number = 0;
      let S: number = 0;
      let R: number = 0;
      try {
        let obj = JSON.parse(result0.resp!);
        if (obj.err !== 0) {
          this.logger.error("insertBancorTokenParameters, get params failed");
          resolv({ err: ErrorCode.RESULT_DB_TABLE_GET_FAILED, data: null });
          return;
        } else {
          F = parseFloat(obj.value.F.substring(1));
          S = parseFloat(obj.value.S.substring(1));
          R = parseFloat(obj.value.R.substring(1));
        }
      } catch (e) {
        this.logger.error('updateBancorTokenParams parsing failed:', e);
        resolv({ err: ErrorCode.RESULT_DB_TABLE_GET_FAILED, data: null });
        return;
      }


      let result = await this.pStorageDb.insertBancorTokenTable(tokenName, F, R, S);
      if (result.err) {
        resolv(result);
        return;
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null })
    });
  }
  public updateBancorTokenParameters(tokenName: string) {
    this.logger.info('updateBancorTokenParameters, with:', tokenName)

    return new Promise<IFeedBack>(async (resolv) => {
      this.logger.info('handleBancorTokenParameters')
      let result0 = await this.laGetBancorTokenParams(tokenName);
      if (result0.ret !== 200) {
        this.logger.error("updateBancorTokenParameters, get params failed");
        resolv({ err: ErrorCode.RESULT_DB_TABLE_GET_FAILED, data: null });
        return;
      }
      let F: number = 0;
      let S: number = 0;
      let R: number = 0;
      try {
        let obj = JSON.parse(result0.resp!);
        if (obj.err !== 0) {
          resolv({ err: ErrorCode.RESULT_DB_TABLE_GET_FAILED, data: null });
          return;
        } else {
          F = parseFloat(obj.value.F.substring(1));
          S = parseFloat(obj.value.S.substring(1));
          R = parseFloat(obj.value.R.substring(1));
        }
      } catch (e) {
        this.logger.error('updateBancorTokenParams parsing failed:', e);
        resolv({ err: ErrorCode.RESULT_DB_TABLE_GET_FAILED, data: null });
        return;
      }

      let result = await this.pStorageDb.updateBancorTokenTable(tokenName, F, R, S);
      if (result.err) {
        this.logger.error('updateBancorTokenTable failed:', F, R, S)
        resolv(result);
        return;
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null })
    });
  }

  // check R, S, F parameters
  // private checkSellBancorToken(receipt: any) {
  //   return new Promise<IFeedBack>(async (resolv) => {
  //     let caller = receipt.tx.caller;
  //     let tokenName = receipt.tx.input.tokenid;
  //     let hash = receipt.tx.hash;
  //     let addrLst = [caller];
  //     let time = receipt.block.timestamp;

  //     // insert into txaddresstable
  //     let feedback = await this.pStorageDb.updateHashToTxAddressTable(hash, addrLst, time);

  //     if (feedback.err) {
  //       resolv(feedback);
  //       return;
  //     }

  //     // Should update balance of caller, because fee be costed by Chain
  //     feedback = await this.updateBalances(SYS_TOKEN, [{ address: caller }]);
  //     if (feedback.err) {
  //       resolv(feedback);
  //       return;
  //     }

  //     if (receipt.receipt.returnCode === 0) {
  //       // update caller token account
  //       let result = await this.updateBancorTokenBalance(tokenName, { address: caller });
  //       if (result.err) {
  //         resolv(result);
  //         return;
  //       }

  //       result = await this.updateBancorTokenParameters(tokenName);
  //       if (result.err) {
  //         resolv(result);
  //         return;
  //       }
  //     }
  //     resolv({ err: ErrorCode.RESULT_OK, data: null });
  //   });
  // }
  // private checkTransferTo(receipt: any) {
  //   return new Promise<IFeedBack>(async (resolv) => {
  //     this.logger.info('Print checkTransferTo()');
  //     console.log(receipt);

  //     let caller = receipt.tx.caller;
  //     let to = receipt.tx.input.to;
  //     let hash = receipt.tx.hash;
  //     let time = receipt.block.timestamp;
  //     let cost = receipt.receipt.cost;
  //     // Add Yang Jun 2019-6-24
  //     // let value = receipt.tx.value; // string
  //     // let fee = receipt.tx.fee;
  //     // Add Yang Jun 2019-6-24
  //     let blockhash = receipt.block.hash;
  //     let blocknumber = receipt.block.number;
  //     let datetime = receipt.block.timestamp;
  //     let content = Buffer.from(JSON.stringify(receipt.tx));
  //     let returnCode = receipt.receipt.returnCode;

  //     // update caller, to address to hash table
  //     // this.logger.info('checkTxTransferto, updateNamesToHashTable\n')
  //     // // put address into hashtable
  //     this.logger.info('checkTransferTo, updateNamesToHashTable')
  //     let startTime = 0, endTime = 0;
  //     startTime = new Date().getTime();
  //     let feedback = await this.pStorageDb.updateNamesToHashTable([caller, to], HASH_TYPE.ADDRESS);
  //     endTime = new Date().getTime();
  //     this.logger.info('Used time for updateNamesToHashTable:', endTime - startTime);
  //     if (feedback.err) {
  //       resolv(feedback);
  //       return;
  //     }

  //     // insert into txaddresstable
  //     startTime = new Date().getTime();
  //     feedback = await this.pStorageDb.updateHashToTxAddressTable(hash, [caller, to], time);
  //     endTime = new Date().getTime();
  //     this.logger.info('Used time for updateHashToTxAddressTable:', endTime - startTime);
  //     if (feedback.err) {
  //       resolv(feedback);
  //       return;
  //     }

  //     //if (receipt.receipt.returnCode === 0) {
  //     this.logger.info('checkTranserTo, updateBalances')
  //     startTime = new Date().getTime();
  //     feedback = await this.updateBalances(SYS_TOKEN, [{ address: caller }, { address: to }]);
  //     endTime = new Date().getTime();
  //     this.logger.info('Used time for updateBalances:', endTime - startTime);
  //     if (feedback.err) {
  //       resolv(feedback);
  //       return;
  //     }
  //     //}
  //     // Update txTransferTo txs
  //     // if (receipt.receipt.returnCode === 0) {
  //     this.logger.info('Put it into txTransferToTable')
  //     startTime = new Date().getTime();
  //     feedback = await this.pStorageDb.insertTxTransferToTable(hash, blockhash, blocknumber, caller, datetime, content, to, returnCode);
  //     endTime = new Date().getTime();
  //     this.logger.info('Used time for insertTxTransferToTable:', endTime - startTime);
  //     if (feedback.err) {
  //       this.logger.error('put tx into txtransfertotable failed');
  //       resolv(feedback);
  //       return;
  //     }

  //     resolv({ err: ErrorCode.RESULT_OK, data: null });
  //   });
  // }
  // Yang Jun 2019-4-9
  // private updateBatchBalances(token: string, type: string, accounts: IBalance[]) {
  //   return new Promise<IFeedBack>(async (resolv) => {
  //     for (let i = 0; i < accounts.length; i++) {
  //       let strBalance = accounts[i].balance.replace('n', '');
  //       let result = await this.pStorageDb.updateAccountTable(accounts[i].address.substring(1), token, type, strBalance, parseFloat(strBalance));
  //       if (result.err) {
  //         resolv(result);
  //         return;
  //       }
  //     }
  //     resolv({ err: ErrorCode.RESULT_OK, data: null })
  //   });
  // }
  // Add by Yang Jun 2019-5-30
  private updateLockBancorBalanceBasic(token: string, type: string, account: IName, funcGetBalance: (token1: string, address1: string) => Promise<IfResult>) {
    return new Promise<IFeedBack>(async (resolv) => {
      let result = await funcGetBalance.call(this, token, account.address);

      if (result.ret === 200) {
        let obj = JSON.parse(result.resp!);
        console.log('updateLockBancorBalanceBasic()');
        console.log(obj.value);

        if (obj.err) {
          resolv({ err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null });
          return;
        }
        let hret: IFeedBack;
        if (obj.value.amountLock === undefined) {
          hret = await updateShortALTRow(this, obj.value, token, type, account);
        } else {
          hret = await updatePureALTRow(this, obj.value, token, type, account);
        }

        if (hret.err) { resolv(hret); return; }
      } else {
        resolv({ err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null });
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
        let result2 = await this.pStorageDb.updateAccountTable(account.address, token, type, amount, value);
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
    return this.updateBalanceBasic(token, TOKEN_TYPE.SYS, account, this.getBalanceInfo);
  }
  public async updateBalances(token: string, accounts: IName[]) {
    return this.updateBalancesBasic(SYS_TOKEN, accounts, this.updateBalance);
  }
  //---------------------------------------------------------------
  private async updateTokenBalance(token: string, account: IName) {
    return this.updateBalanceBasic(token, TOKEN_TYPE.NORMAL, account, this.getTokenBalanceInfo);
  }
  public async updateTokenBalances(token: string, accounts: IName[]) {
    return this.updateBalancesBasic(token, accounts, this.updateTokenBalance)
  }
  // -------------------------------------------------------------
  private async updateBancorTokenBalance(token: string, account: IName) {
    return this.updateBalanceBasic(token, TOKEN_TYPE.BANCOR, account, this.getBancorTokenBalanceInfo);
  }
  public async updateBancorTokenBalances(token: string, accounts: IName[]) {
    return this.updateBalancesBasic(token, accounts, this.updateBancorTokenBalance);
  }

  // ---------- 2 -----------
  private async updateLockBancorTokenBalance(token: string, account: IName) {
    return this.updateLockBancorBalanceBasic(token, TOKEN_TYPE.BANCOR, account, this.getLockBancorTokenBalanceInfo);
  }

  public async updateLockBancorTokenBalances(token: string, accounts: IName[]) {
    return this.updateBalancesBasic(token, accounts,
      this.updateLockBancorTokenBalance);
  }

  // ------------ 3 -------------

  // Basic commands 
  public async getLatestBlock() {
    let result = await getBlock(this.ctx, ['latest', 'true', 'false', 'false']);
    this.logger.info(result.resp!);
    return result;
  }
  public async laGetBlock(num: number) {
    let result = await getBlock(this.ctx, [num + '', 'true', 'false', 'true']);
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
      await DelayPromise(Math.random() * 2)

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
    await DelayPromise(Math.random() * 2);

    let result = await getBalance(this.ctx, [strHash]);


    if (result.ret !== 200) {
      this.logger.error('getBalanceInfo wrong result');
      console.log(result)
    } else {
      this.logger.info(JSON.stringify(result));
      this.logger.info('balance:', JSON.parse(result.resp!).value);
    }
    return result;
  }
  // Yang Jun 2019-4-9
  public async laGetBalances(addrs: string[]) {
    let result = await getBalances(this.ctx, [JSON.stringify(addrs)]);
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
  // Yang Jun 2019-4-9
  public async laGetTokenBalances(token: string, addrs: string[]) {
    let result = await getTokenBalances(this.ctx, [token, JSON.stringify(addrs)]);
    return result;
  }
  // Yang Jun 2019-04-10
  public async laGetBancorTokenParams(token: string) {
    let result = await getBancorTokenParams(this.ctx, [token]);
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
  // Yang Jun 2019-5-30
  public async getLockBancorTokenBalanceInfo(token: string, strHash: string) {
    console.log('\ngetLockBancorTokenBalanceInfo', token, ' ', strHash, '\n')
    let result = await getLockBancorTokenBalance(this.ctx, [token, strHash]);
    if (result.ret !== 200) {
      this.logger.error('wrong result', result)
    } else {
      this.logger.info(JSON.stringify(result));
      this.logger.info('lockbancor token balance:', JSON.parse(result.resp!).value);
    }
    return result;
  }
  // Yang Jun 2019-4-9
  public async laGetBancorTokenBalances(token: string, addrs: string[]) {
    let result = await getBancorTokenBalances(this.ctx, [token, JSON.stringify(addrs)]);
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
    let result = await transferTo(this.ctx, [address, value + '', 0.001 + '']);
    return result;
  }

  public async laGetMiners() {
    let result = await getMiners(this.ctx, []);
    return result;
  }

  public async laGetBlocks(min: number, max: number) {
    let result = await getBlocks(this.ctx, [min.toString(), max.toString(), 'true', 'false', 'true']);
    return result;
  }

  public async laGetCandidates() {
    let result = await getCandidates(this.ctx, []);
    return result;
  }
  public async laQueryAccountTable(addr: string, token: string): Promise<IFeedBack> {
    let oldValue = 0;

    let feedback2 = await this.pStorageDb.queryAccountTableByTokenAndAddress(addr, token);
    if (feedback2.err === ErrorCode.RESULT_DB_RECORD_EMPTY) {
      oldValue = 0;
    } else if (feedback2.err === ErrorCode.RESULT_DB_TABLE_GET_FAILED) {
      return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: {} }
    } else {
      oldValue = feedback2.data.value
    }

    return { err: ErrorCode.RESULT_OK, data: oldValue };
  }
  public async laWriteAccountTable(addr: string, token: string, tokenType: string, amount: number): Promise<IFeedBack> {
    let feedback2 = await this.pStorageDb.insertAccountTable(addr, token, tokenType, amount.toString(), amount);

    if (feedback2.err) {
      return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: {} }
    }
    return { err: ErrorCode.RESULT_OK, data: {} }
  }

  // single write command
  public async laUpdateAccountTable(addr: string, token: string, tokenType: string, amount: number): Promise<IFeedBack> {
    let oldValue = 0;
    let feedback2 = await this.pStorageDb.queryAccountTableByTokenAndAddress(addr, token);

    if (feedback2.err === ErrorCode.RESULT_DB_RECORD_EMPTY) {
      oldValue = 0;
    } else if (feedback2.err === ErrorCode.RESULT_DB_TABLE_GET_FAILED) {
      return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: {} }
    } else {
      oldValue = feedback2.data.value
    }
    oldValue += amount;

    feedback2 = await this.pStorageDb.updateAccountTable(addr, token, tokenType, oldValue.toString(), oldValue);

    if (feedback2.err) {
      return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: {} }
    }
    return { err: ErrorCode.RESULT_OK, data: {} }
  }
}
