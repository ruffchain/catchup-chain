// import { Logger } from '../../api/logger';
import winston = require('winston');
import { RPCClient } from '../../client/client/rfc_client';
import { IfSysinfo, IfContext, DelayPromise, IfResult } from '../../api/common'
import { getLastIrreversibleBlockNumber } from '../../api/getLIBNumber'
import { getBlock } from '../../api/getblock'
import { getReceipt } from '../../api/getreceipt';
import { StatusDataBase } from '../storage/statusdb';
import { StorageDataBase, HASH_TYPE, SYS_TOKEN, TOKEN_TYPE } from '../storage/StorageDataBase';
import { ErrorCode, IFeedBack, BigNumber } from '../../core';
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

interface IfTaskItem {
  id: number;
  tx: any;
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
    this.nCurrentLIBHeight = -1;
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
    this.logger.info('\nloopTask() =========================');

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
    let nCurrentHeight = this.pStorageDb.nCurrentHeight;

    this.logger.info('currentHeight:', nCurrentHeight, ' currentLIB:', this.nCurrentLIBHeight);

    let result2: IFeedBack;
    if (nCurrentHeight === 0 && this.nCurrentLIBHeight === 0) {
      result2 = await this.parseBlockRange(0, 0);
    }
    else if (nCurrentHeight === 0) {
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

    // getMiners
    let miners: string[] = [];
    result = await this.laGetMiners();
    if (result.ret === 200) {
      let objJson = JSON.parse(result.resp!);
      if (objJson.err === 0) {
        objJson.value.forEach((element: string) => {
          miners.push(element.slice(1))
        });
      }
    }

    // randomly choose one miner to get it's SYS balance
    if (miners.length > 0) {
      this.logger.info('Miners:');
      console.log(miners);
      // let miner: string = miners[Math.floor(Math.random() * miners.length)]
      // this.logger.info('update miner balance: ' + miner)
      // await this.updateBalances(SYS_TOKEN, [{ address: miner }]);
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
    this.logger.info('parseBlock')
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
    this.logger.info('parseBlocks');

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
      this.logger.info('parseBlockItem ' + i);
      await this.pStorageDb.execRecord('BEGIN;', {});

      let hret = await this.parseBlockItem(items[i]);

      if (hret.err) {
        await this.pStorageDb.execRecord('ROLLBACK;', {})
        return { err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_FAILED, data: null }
      }
      let feedback2 = await this.syncHeightAndMineAward(items[i].block.number);
      if (feedback2.err) {
        await this.pStorageDb.execRecord('ROLLBACK;', {})
        this.logger.error('Save block ', items[i].block.number, ' to height failed');
        return { err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_SAVE_FAILED, data: {} }
      }

      let oldHeight = this.pStorageDb.nCurrentHeight;
      this.pStorageDb.nCurrentHeight = items[i].block.number;

      hret = await this.pStorageDb.execRecord('COMMIT;', {})

      if (hret.err) {
        await this.pStorageDb.execRecord('ROLLBACK;', {})
        this.pStorageDb.nCurrentHeight = oldHeight;
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
      }

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
    this.logger.info('\nupdate reward: ' + coinbase)
    feedback = await this.laUpdateAccountTable(coinbase, SYS_TOKEN, TOKEN_TYPE.SYS, reward);
    if (feedback.err) { return feedback; }

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

    this.logger.info('\nEnd of save block hash to hash table, update block: ' + hashnumber)
    console.log('End of save block hash to hash table, update block: ', hashnumber)
    this.logger.info('ParseBlockItem time:' + (new Date().getTime() - startT) + '\n');

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

  // Only update SYS supply, miner balance will not change;
  private async syncHeightAndMineAward(height: number): Promise<IFeedBack> {
    this.logger.info('\nsyncHeightAndMineAward');

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

    let hret = await this.pStorageDb.setCurrentHeight(height);
    return hret;
  }

  private async batchInsertTxToHashTable(taskLst: IfTaskItem[]): Promise<IFeedBack> {

    for (let i = 0; i < taskLst.length; i++) {

      let feedback = await this.pStorageDb.insertOrReplaceHashTable(taskLst[i].tx.hash, HASH_TYPE.TX);
      if (feedback.err) {
        return feedback;
      }
    }

    return { err: ErrorCode.RESULT_OK, data: {} };
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


      let result = await this.pStorageDb.insertBancorTokenTable(tokenName, F, R.toString(), S.toString());
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

      let result = await this.pStorageDb.updateBancorTokenTable(tokenName, F, R.toString(), S.toString());
      if (result.err) {
        this.logger.error('updateBancorTokenTable failed:', F, R, S)
        resolv(result);
        return;
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null })
    });
  }

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
    let oldValue = '';

    let feedback2 = await this.pStorageDb.queryAccountTableByTokenAndAddress(addr, token);
    if (feedback2.err === ErrorCode.RESULT_DB_RECORD_EMPTY) {
      oldValue = '0';
    } else if (feedback2.err === ErrorCode.RESULT_DB_TABLE_GET_FAILED) {
      return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: {} }
    } else {
      oldValue = feedback2.data.amount  // string
    }

    return { err: ErrorCode.RESULT_OK, data: oldValue };
  }
  public async laWriteAccountTable(addr: string, token: string, tokenType: string, amount: string): Promise<IFeedBack> {
    let feedback2 = await this.pStorageDb.insertAccountTable(addr, token, tokenType, amount, new BigNumber(amount).toNumber());

    if (feedback2.err) {
      return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: {} }
    }
    return { err: ErrorCode.RESULT_OK, data: {} }
  }

  // single write command
  public async laUpdateAccountTable(addr: string, token: string, tokenType: string, amount: string): Promise<IFeedBack> {
    let oldValue: BigNumber = new BigNumber(0);
    let feedback2 = await this.pStorageDb.queryAccountTableByTokenAndAddress(addr, token);

    if (feedback2.err === ErrorCode.RESULT_DB_RECORD_EMPTY) {
      oldValue = new BigNumber('0');
    } else if (feedback2.err === ErrorCode.RESULT_DB_TABLE_GET_FAILED) {
      return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: {} }
    } else {
      oldValue = new BigNumber(feedback2.data.amount);
    };
    oldValue = oldValue.plus(new BigNumber(amount));


    feedback2 = await this.pStorageDb.updateAccountTable(addr, token, tokenType, oldValue.toString(), oldValue.toNumber());

    if (feedback2.err) {
      return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: {} }
    }
    return { err: ErrorCode.RESULT_OK, data: {} }
  }
}
