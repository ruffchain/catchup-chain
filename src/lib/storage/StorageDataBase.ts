import { CUDataBase, IfCUDataBaseOptions } from './cudatabase';
import winston = require('winston');
import { ErrorCode, IFeedBack } from '../../core/error_code';
//import { subtractBN3, addBN2 } from './computer';
import * as SqlString from 'sqlstring';
import { IfTxTableItem } from '../catchup/synchro';
import { SingleCmd, IfHashTableArgs, IfTxAddressTableArgs, IfAccountTableArgs, IfTTTTArgs, IfTokenTableArgs, IfBancorTokenTableArgs, IfLBTTTArgs } from '../catchup/parallel/SingleCmd';


export const HASH_TYPE = {
  ADDRESS: 'addr',
  TOKEN: 'token',
  TX: 'tx',
  BLOCK: 'block',
  HEIGHT: 'block',
  NONE: 'none'
};
// Token symbol, 
export const SYS_TOKEN = 's';
export const SYS_TOKEN_SYMBOL = 'SYS';

export const TOKEN_TYPE = {
  NORMAL: 'normal',
  BANCOR: 'bancor',
  SYS: 'sys',
  // LOCKBANCOR: 'lockbancor'
}

export class StorageDataBase extends CUDataBase {
  private hashTable: string;
  private accountTable: string;
  private blockTable: string;
  private txTable: string;
  private tokenTable: string;
  private bancorTokenTable: string;
  // Add by Yang Jun 2019-5-30
  private accountLockBancorTokenTable: string;
  // Add by Yang Jun 2019-6-24
  private txTransferToTable: string;

  private hashTableSchema: string;
  private accountTableSchema: string;
  private blockTableSchema: string;
  private txTableSchema: string;
  private tokenTableSchema: string;
  private bancorTokenTableSchema: string;
  // Add by Yang Jun 2019-5-30
  private accountLockBancorTokenTableSchema: string;
  // Add by Yang Jun 2019-6-24
  private txTransferToTableSchema: string;

  private txAddressTable: string;
  private txAddressTableSchema: string;

  constructor(logger: winston.LoggerInstance, options: IfCUDataBaseOptions) {
    super(logger, options);
    this.hashTable = 'hashtable';
    this.accountTable = 'accounttable';
    this.blockTable = 'blocktable';
    this.txTable = 'txtable';
    this.tokenTable = 'tokentable';
    this.bancorTokenTable = 'bancortokentable';
    this.txAddressTable = 'txaddresstable';
    this.accountLockBancorTokenTable = 'albttable';
    this.txTransferToTable = 'txtransfertotable';

    // Token is of uppercase, hash| tokenname - type 
    this.hashTableSchema = `("hash" CHAR(64) PRIMARY KEY NOT NULL UNIQUE, "type" CHAR(64) NOT NULL, "verified" TINYINT NOT NULL);`;

    // account hash-tokenname (UpperCase), value for search purpose!
    this.accountTableSchema = `("hash" CHAR(64) NOT NULL, "token" CHAR(64) NOT NULL, "tokentype" CHAR(64) NOT NULL , "amount" TEXT NOT NULL, "value" INTEGER NOT NULL, PRIMARY KEY("hash", "token"));`;

    // block-height-txs num-address related -timestamp
    this.blockTableSchema = `("hash" CHAR(64) PRIMARY KEY NOT NULL UNIQUE,"number" INTEGER NOT NULL, "txs" INTEGER NOT NULL, "address" CHAR(64) NOT NULL, "timestamp" INTEGER NOT NULL);`;

    // txhash-block hash-blocknumber-address-timestamp- content
    this.txTableSchema = `("hash" CHAR(64) PRIMARY KEY NOT NULL UNIQUE, "blockhash" CHAR(64) NOT NULL, "blocknumber" INTEGER NOT NULL, "address" CHAR(64) NOT NULL, "timestamp" INTEGER NOT NULL, "content" BLOB NOT NULL);`;

    // name is UpperCase, tokenname-type-address-timestamp-content
    this.tokenTableSchema = `("name" CHAR(64) PRIMARY KEY NOT NULL UNIQUE, "type" CHAR(64) NOT NULL, "address" CHAR(64) NOT NULL, "timestamp" INTEGER NOT NULL, "content" BLOB NOT NULL);`;

    // This is the real-time parameter, name is UpperCase
    // for bancor token parameters, tokenname-factor-reserve-supply
    this.bancorTokenTableSchema = `("name" CHAR(64) PRIMARY KEY NOT NULL UNIQUE, "factor" INTEGER NOT NULL, "reserve" INTEGER NOT NULL,"supply" INTEGER NOT NULL);`;

    // tx-address table - address
    this.txAddressTableSchema = `("hash" CHAR(64) NOT NULL ,"address" CHAR(64) NOT NULL, "timestamp" INTEGER NOT NULL, PRIMARY KEY("hash", "address"));`;

    // account, LockBancorToken table, LBTT table, amount in BigNumber
    this.accountLockBancorTokenTableSchema = `("hash" CHAR(64)  NOT NULL , "token" CHAR(64) NOT NULL,"amount" TEXT NOT NULL,"dueamount" TEXT NOT NULL, "dueblock" INTEGER NOT NULL, "duetime" INTEGER NOT NULL, PRIMARY KEY("hash", "token"));`;

    // txTransferToTable

    this.txTransferToTableSchema = `("hash" CHAR(64) PRIMARY KEY NOT NULL UNIQUE, "blockhash" CHAR(64) NOT NULL, "blocknumber" INTEGER NOT NULL, "address" CHAR(64) NOT NULL, "timestamp" INTEGER NOT NULL, "content" BLOB NOT NULL, "toaddress" CHAR(64) NOT NULL, "returncode" INTEGER NOT NULL);`;
  }

  public init(): Promise<IFeedBack> {
    return new Promise<IFeedBack>(async (resolv) => {
      // await this.setWALMode();

      let result = await this.createTable(this.hashTable, this.hashTableSchema);

      let hret = await this.createTable(this.accountTable, this.accountTableSchema);
      if (hret.err) { throw new Error() };

      hret = await this.createTable(this.blockTable, this.blockTableSchema);
      if (hret.err) { throw new Error() };

      // create index
      hret = await this.execRecord(`create unique index IF NOT EXISTS timestamp_index on ${this.blockTable}(timestamp);`, {});
      if (hret.err) { throw new Error(); }


      hret = await this.createTable(this.txTable, this.txTableSchema);
      if (hret.err) { throw new Error() };

      // create index
      hret = await this.execRecord(`create unique index IF NOT EXISTS timestamp_index on ${this.txTable}(timestamp);`, {});
      if (hret.err) { throw new Error(); }

      hret = await this.createTable(this.bancorTokenTable,
        this.bancorTokenTableSchema);
      if (hret.err) { throw new Error() };

      hret = await this.createTable(this.txAddressTable, this.txAddressTableSchema);
      if (hret.err) { throw new Error() };

      hret = await this.createTable(this.tokenTable, this.tokenTableSchema);
      if (hret.err) { throw new Error() };

      // Add by Yang Jun 2019-5-30
      hret = await this.createTable(this.accountLockBancorTokenTable, this.accountLockBancorTokenTableSchema);
      if (hret.err) { throw new Error() };

      // Add by Yang Jun 2019-6-24
      hret = await this.createTable(this.txTransferToTable, this.txTransferToTableSchema);
      if (hret.err) { throw new Error() };

      // add index 
      hret = await this.execRecord(`create unique index IF NOT EXISTS address_timestamp_index on ${this.txTransferToTable}(address, timestamp);`, {});
      if (hret.err) { throw new Error(); }
      hret = await this.execRecord(`create unique index IF NOT EXISTS toaddress_timestamp_index on ${this.txTransferToTable}(toaddress, timestamp);`, {});
      if (hret.err) { throw new Error(); }

      this.logger.info('Create storage tables:', result);
      resolv({ err: 0, data: null });
    });
  }

  // access functions


  // hash table, use regex to get hash value ,default is 5 result
  // public queryHashTable(s: string, num: number) {
  //   let sql = SqlString.format('SELECT * FROM ? WHERE hash LIKE "?%" LIMIT ?;', [this.hashTable, s, num])
  //   return this.getAllRecords(sql);
  // }
  public async singleCmdInsertHashTable(cmdsHashTable: SingleCmd[]): Promise<IFeedBack> {
    this.logger.info('into singleCmdInsertHashTable')
    await this.execRecord('BEGIN;', {});
    for (let i = 0; i < cmdsHashTable.length; i++) {
      try {
        let args = cmdsHashTable[i].args as IfHashTableArgs;
        let sql = SqlString.format('INSERT OR REPLACE INTO ? (hash, type, verified) VALUES(?, ?, 0);', [this.hashTable, args.hash, args.type])
        let result = await this.execRecord(sql, {});
        if (result.err) {
          throw new Error("execRecord");
        }
      } catch (e) {
        this.logger.err('run insert fail, batchInsertOrReplaceHashTAble');
        await this.db.run('ROLLBACK;');
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null };
      }
    }

    await this.execRecord('COMMIT;', {});
    return { err: ErrorCode.RESULT_OK, data: null };
  }
  public queryHashTableFullName(s: string, num: number) {
    let sql = SqlString.format('SELECT * FROM ? WHERE hash = ? LIMIT ?;', [this.hashTable, s, num])
    return this.getAllRecords(sql);
  }
  public async batchInsertOrReplaceHashTAble(hashLst: string[], type: string): Promise<IFeedBack> {
    this.logger.debug('into batchInsertOrReplaceHashTAble()');

    await this.execRecord('BEGIN;', {});
    for (let i = 0; i < hashLst.length; i++) {
      try {
        let sql = SqlString.format('INSERT OR REPLACE INTO ? (hash, type, verified) VALUES(?, ?, 0);', [this.hashTable, hashLst[i], type])
        let result = await this.execRecord(sql, {});
        if (result.err) {
          throw new Error("execRecord");
        }
      } catch (e) {
        this.logger.err('run insert fail, batchInsertOrReplaceHashTAble');
        await this.db.run('ROLLBACK;');
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null };
      }
    }
    await this.execRecord('COMMIT;', {});
    return { err: ErrorCode.RESULT_OK, data: null };
  }

  public insertOrReplaceHashTable(hash: string, type: string) {
    this.logger.info('into insertOrReplaceToHashTable()', hash, '\n')
    let sql = SqlString.format('INSERT OR REPLACE INTO ? (hash, type, verified) VALUES(?, ?, 0);', [this.hashTable, hash, type])
    return this.insertOrReplaceRecord(sql, {});
  }
  public insertHashTable(hash: string, type: string): Promise<IFeedBack> {
    this.logger.info('into insertHashTable()', hash, '\n')
    let sql = SqlString.format('INSERT INTO ? (hash, type, verified) VALUES(?, ?, 0);', [this.hashTable, hash, type])
    return this.insertRecord(sql, {});
  }
  public getHashTable(s: string) {
    let sql = SqlString.format('SELECT * FROM ? WHERE hash = ?;', [this.hashTable, s])
    return this.getRecord(sql);
  }

  public saveTxToHashTable(txs: any[]) {
    return new Promise<IFeedBack>(async (resolv) => {
      for (let j = 0; j < txs.length; j++) {
        this.logger.info('saveTxToHashTable()\n');
        let feedback = await this.insertOrReplaceHashTable(txs[j].hash, HASH_TYPE.TX);
        if (feedback.err) {
          resolv({ err: feedback.err, data: null })
          return;
        }
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null })
    });
  }
  public async updateNamesToHashTable(names: string[], type: string) {
    return new Promise<IFeedBack>(async (resolv) => {
      for (let j = 0; j < names.length; j++) {
        let result = await this.updateNameToHashTable(names[j], type);
        if (result.err) {
          resolv(result)
          return;
        }
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
  }
  public async updateNameToHashTable(name: string, type: string) {
    return new Promise<IFeedBack>(async (resolv) => {
      this.logger.info('\n')
      this.logger.info('updateNameToHashTable()\n');
      let feedback = await this.getHashTable(name);
      console.log('\nfeedback is ->')
      console.log(feedback)
      if (feedback.err === ErrorCode.RESULT_DB_RECORD_EMPTY) {
        let result = await this.insertOrReplaceHashTable(name, type);
        resolv(result);
      } else { // failed or OK
        resolv(feedback);
      }
      // let result = await this.insertOrReplaceHashTable(name, type);
      // resolv(result);
    });
  }

  public async queryUserCount() {
    let sql = SqlString.format('SELECT COUNT(*) as count FROM ? WHERE type = ?;', [this.hashTable, HASH_TYPE.ADDRESS]);
    return this.getRecord(sql)
  }

  // account table
  // Add 2019-7-8, SYS will have a name 's', 
  public querySumOfToken(token: string) {
    let sql = SqlString.format('SELECT SUM(value) as nsum FROM ? WHERE token = ?;', [this.accountTable, token]);
    return this.getRecord(sql)
  }
  public queryFortuneRanking(token: string) {
    let sql = SqlString.format('SELECT * FROM ? WHERE token = ? ORDER BY value DESC LIMIT 50;', [this.accountTable, token]);
    return this.getAllRecords(sql);
  }
  public queryFortuneRankingByPage(token: string, index: number, size: number) {
    let sql = SqlString.format('SELECT * FROM ? WHERE token = ?  ORDER BY value DESC LIMIT ? OFFSET ?;', [this.accountTable, token, size, index * size]);
    return this.getAllRecords(sql);
  }
  public queryAccountTotalByToken(token: string) {
    let sql = SqlString.format('SELECT COUNT(*) as count FROM ? WHERE token = ?;', [this.accountTable, token]);
    return this.getRecord(sql)
  }
  public queryAccountTableByAddress(addr: string) {
    let sql = SqlString.format('SELECT * FROM ? WHERE hash = ?;', [this.accountTable, addr]);
    return this.getAllRecords(sql);
  }
  public queryAllAccountTableByAddress(addr: string) {
    let sql = SqlString.format('SELECT * FROM ? WHERE hash = ?;', [this.accountTable, addr])
    return this.getAllRecords(sql);
  }
  public queryLatestAccountTable() {
    let sql = SqlString.format('SELECT * FROM ? LIMIT 50;', [this.accountTable])
    return this.getAllRecords(sql);
  }

  public queryAccountTableByTokenAndAddress(addr: string, token: string) {
    let sql = SqlString.format('SELECT * FROM ? WHERE hash = ? AND token = ?;', [this.accountTable, addr, token])
    return this.getRecord(sql);
  }

  public async singleCmdInsertAccountTable(cmds: SingleCmd[]): Promise<IFeedBack> {
    this.logger.info('into singleCmdInsertAccountTable')
    await this.execRecord('BEGIN;', {});
    for (let i = 0; i < cmds.length; i++) {
      try {
        let args = cmds[i].args as IfAccountTableArgs;
        let sql = SqlString.format('INSERT OR REPLACE INTO ? (hash, token, tokentype, amount, value) VALUES(?, ?, ?, ?, ?);', [this.accountTable, args.hash, args.token, args.tokentype, args.amount, args.value]);
        let result = await this.execRecord(sql, {});
        if (result.err) {
          throw new Error("execRecord");
        }
      } catch (e) {
        this.logger.err('run insert fail, singleCmdInsertAccountTable');
        await this.db.run('ROLLBACK;');
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null };
      }
    }

    await this.execRecord('COMMIT;', {});
    return { err: ErrorCode.RESULT_OK, data: null };
  }

  public insertAccountTable(hash: string, token: string, tokentype: string, amount: string, value: number): Promise<IFeedBack> {
    let sql = SqlString.format('INSERT OR REPLACE INTO ? (hash, token, tokentype, amount, value) VALUES(?, ?, ?, ?, ?);', [this.accountTable, hash, token, tokentype, amount, value]);
    return this.insertRecord(sql, {});
  }

  private updateAccountTableByTokenAndAddress(addr: string, token: string, amount: string, value: number) {
    let sql = SqlString.format('UPDATE ? SET amount = ? , value = ? WHERE hash=? AND token = ? ;', [this.accountTable, amount, value, addr, token])
    return this.updateRecord(sql, {});
  }
  public updateAccountTable(address: string, token: string, tokentype: string, amount: string, value: number) {
    return new Promise<IFeedBack>(async (resolv) => {
      // if address token is not empty, update it
      let result = await this.queryAccountTableByTokenAndAddress(address, token);
      //console.log('updateAccountTable result:', result)
      if (result.err === ErrorCode.RESULT_DB_RECORD_EMPTY) {
        // insert into it
        let result1 = await this.insertAccountTable(address, token, tokentype, amount, value);
        //console.log('updateAccountTable result1:', result1)
        resolv(result1);
      } else if (result.err === ErrorCode.RESULT_DB_TABLE_GET_FAILED) {
        resolv(result);
      } else {
        // update it
        let result2 = await this.updateAccountTableByTokenAndAddress(address, token, amount, value)
        //console.log('updateAccountTable result2: ', result2)
        resolv(result2);
      }
    })
  }


  // block table

  public insertOrReplaceBlockTable(hash: string, height: number, txno: number, address: string, datetime: number) {
    this.logger.info('into insertOrReplaceBlockTable()', hash, '\n')
    let sql = SqlString.format('INSERT OR REPLACE INTO ? (hash, number, txs, address, timestamp) VALUES(?,?, ?, ?, ?);', [this.blockTable, hash, height, txno, address, datetime])
    return this.insertOrReplaceRecord(sql, {});
  }
  public queryLatestBlockTable() {
    let sql = SqlString.format('SELECT * FROM ? ORDER BY timestamp DESC LIMIT 50;', [this.blockTable])
    return this.getAllRecords(sql)
  }

  public queryBlockTableByPage(index: number, size: number) {
    let sql = SqlString.format('SELECT * FROM ? ORDER BY timestamp DESC LIMIT ? OFFSET ?;', [this.blockTable, size, index * size])
    return this.getAllRecords(sql);
  }

  public queryBlockTotal() {
    let sql = SqlString.format('SELECT COUNT(*) as count FROM ?;', [this.blockTable]);
    return this.getRecord(sql)
  }

  // tx table
  public queryTxTable(hash: string) {
    let sql = SqlString.format('SELECT * FROM ? WHERE hash = ?;', [this.txTable, hash]);
    return this.getRecord(sql);
  }
  public queryTxTableByPage(index: number, size: number) {
    let sql = SqlString.format('SELECT * FROM ? ORDER BY timestamp DESC LIMIT ? OFFSET ?;', [this.txTable, size, index * size]);
    return this.getAllRecords(sql);
  }
  public queryTxTableByPageTotal() {
    let sql = SqlString.format('SELECT COUNT(*) as count FROM ?;', [this.txTable]);
    return this.getRecord(sql)
  }

  public queryTxTableByDatetime(from: number, to: number) {
    let sql = SqlString.format('SELECT COUNT(*) as count FROM ? WHERE  timestamp >= ? AND timestamp < ?;', [this.txTable, from, to])
    return this.getRecord(sql);
  }

  public queryTxTableByAddress(address: string, index: number, size: number) {
    let sql = SqlString.format('SELECT * FROM ? WHERE address = ?  ORDER BY timestamp DESC LIMIT ? OFFSET ?;', [this.txTable, address, size, index * size]);
    return this.getAllRecords(sql)
  }
  public queryTxTableByBlock(block: string) {
    let sql = SqlString.format('SELECT * FROM ? WHERE blockhash = ?;', [this.txTable, block]);

    return this.getAllRecords(sql)
  }
  public queryLatestTxTable() {
    let sql = SqlString.format('SELECT * FROM ? ORDER BY timestamp DESC LIMIT 15;', [this.txTable])
    return this.getAllRecords(sql)
  }
  public queryTxTableByAddressTotal(address: string) {
    let sql = SqlString.format('SELECT COUNT(*) as count FROM ? WHERE address = ? ;', [this.txTable, address]);
    return this.getRecord(sql)
  }
  public queryTxTableCount() {
    let sql = SqlString.format('SELECT COUNT(*) as count FROM ?;', [this.txTable]);
    return this.getRecord(sql)
  }
  public insertTxTable(hash: string, blockhash: string, blocknumber: number, address: string, datetime: number, content1: Buffer) {
    this.logger.info('insertOrREplaceTxTable', hash, '\n');
    let sql = SqlString.format('INSERT OR REPLACE INTO ? (hash, blockhash, blocknumber, address, timestamp, content) VALUES($hash, $blockhash, $blocknumber ,$address, $datetime, $content1);', [this.txTable]);

    return this.insertOrReplaceRecord(sql, {
      $hash: SqlString.escape(hash).replace(/\'/g, ''),
      $blockhash: SqlString.escape(blockhash).replace(/\'/g, ''),
      $blocknumber: SqlString.escape(blocknumber),
      $address: SqlString.escape(address).replace(/\'/g, ''),
      $datetime: SqlString.escape(datetime),
      $content1: content1
    });
  }

  public async batchInsertTxTable(blockhash: string, blocknumber: number, datetime: number, contentLst: IfTxTableItem[]) {
    this.logger.info('batchInsertTxTable');
    console.log(new Date())

    await this.execRecord('BEGIN;', {});

    try {

      for (let i = 0; i < contentLst.length; i++) {
        let sql = SqlString.format('INSERT OR REPLACE INTO ? (hash, blockhash, blocknumber, address, timestamp, content) VALUES($hash, $blockhash, $blocknumber ,$address, $datetime, $content1);', [this.txTable]);

        let result = await this.execRecord(sql, {
          $hash: SqlString.escape(contentLst[i].hash).replace(/\'/g, ''),
          $blockhash: SqlString.escape(blockhash).replace(/\'/g, ''),
          $blocknumber: SqlString.escape(blocknumber),
          $address: SqlString.escape(contentLst[i].address).replace(/\'/g, ''),
          $datetime: SqlString.escape(datetime),
          $content1: contentLst[i].content
        });
        if (result.err) {
          throw new Error('execRecord');
        }
      }

    } catch (e) {
      this.logger.err('run insert fail, batchInsertTxTable');
      await this.db.run('ROLLBACK;');
      return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null };
    }

    await this.execRecord('COMMIT;', {});
    this.logger.info('End of batchInsertTxTable');
    console.log(new Date())
    return { err: ErrorCode.RESULT_OK, data: null };
  }


  // token table
  public queryTokenTable(name: string) {
    let sql = SqlString.format('SELECT * FROM ? WHERE name = ?;', [this.tokenTable, name])
    return this.getRecord(sql);
  }

  public async singleCmdInsertTokenTable(cmds: SingleCmd[]): Promise<IFeedBack> {
    this.logger.info('into singleCmdInsertTokenTable')
    await this.execRecord('BEGIN;', {});
    for (let i = 0; i < cmds.length; i++) {
      try {
        let args = cmds[i].args as IfTokenTableArgs;
        let sql = SqlString.format('INSERT OR REPLACE INTO ? (name, type, address, timestamp, content) VALUES(?, ?, ?, ?, $content);', [this.tokenTable, args.tokenname, args.type, args.address, args.datetime]);
        let result = await this.execRecord(sql, { $content: args.content });
        if (result.err) {
          throw new Error("execRecord");
        }
      } catch (e) {
        this.logger.err('run insert fail, singleCmdInsertTokenTable');
        await this.db.run('ROLLBACK;');
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null };
      }
    }

    await this.execRecord('COMMIT;', {});
    return { err: ErrorCode.RESULT_OK, data: null };
  }


  public insertTokenTable(tokenname: string, type: string, address: string, datetime: number, content: Buffer) {
    let sql = SqlString.format('INSERT OR REPLACE INTO ? (name, type, address, timestamp, content) VALUES(?, ?, ?, ?, $content);', [this.tokenTable, tokenname, type, address, datetime])
    return this.insertRecord(sql, { $content: content });
  }
  public updateTokenTableContent(token: string, content: Buffer) {
    let sql = SqlString.format('UPDATE ? SET content=$content WHERE name= ?;', [this.tokenTable, token])
    return this.updateRecord(sql, { $content: content });
  }


  // bancorTokenTable, for token price query 
  public queryBancorTokenTable(name: string) {
    let sql = SqlString.format('SELECT * FROM ? WHERE name = ?;', [this.bancorTokenTable, name])
    return this.getRecord(sql);
  }
  public async singleCmdInsertBancorTokenTable(cmds: SingleCmd[]): Promise<IFeedBack> {
    this.logger.info('into singleCmdInsertBancorTokenTable')
    await this.execRecord('BEGIN;', {});
    for (let i = 0; i < cmds.length; i++) {
      try {
        let args = cmds[i].args as IfBancorTokenTableArgs;
        let sql = SqlString.format('INSERT OR REPLACE INTO ? (name, factor, reserve, supply) VALUES(?, ?, ?, ?);', [this.bancorTokenTable, args.tokenname, args.factor, args.reserve, args.supply])
        let result = await this.execRecord(sql, {});
        if (result.err) {
          throw new Error("execRecord");
        }
      } catch (e) {
        this.logger.err('run insert fail, singleCmdInsertBancorTokenTable');
        await this.db.run('ROLLBACK;');
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null };
      }
    }

    await this.execRecord('COMMIT;', {});
    return { err: ErrorCode.RESULT_OK, data: null };
  }

  public insertBancorTokenTable(tokenname: string, factor: number, reserve: number, supply: number) {
    let sql = SqlString.format('INSERT OR REPLACE INTO ? (name, factor, reserve, supply) VALUES(?, ?, ?, ?);', [this.bancorTokenTable, tokenname, factor, reserve, supply])
    return this.insertRecord(sql, {});
  }
  public updateBancorTokenByName(tokenname: string, factor: number, reserve: number, supply: number) {
    let sql = SqlString.format('UPDATE ? SET reserve = ? , supply = ? WHERE name =?;', [this.bancorTokenTable, reserve, supply, tokenname])
    return this.updateRecord(sql, {});
  }
  public updateBancorTokenTable(tokenname: string, factor: number, reserve: number, supply: number) {
    return new Promise<IFeedBack>(async (resolv) => {
      let result = await this.queryBancorTokenTable(tokenname)

      if (result.err === ErrorCode.RESULT_DB_RECORD_EMPTY) {
        // insert into it
        let result1 = await this.insertBancorTokenTable(tokenname, factor, reserve, supply);
        //console.log('updateAccountTable result1:', result1)
        resolv(result1);
      } else if (result.err === ErrorCode.RESULT_DB_TABLE_GET_FAILED) {
        resolv(result);
      } else {
        console.log('ERROR: updateBancorTokenTable result2: ', tokenname, ' already exist in db!')
        let result2 = await this.updateBancorTokenByName(tokenname, factor, reserve, supply);
        resolv(result2);
      }
    });
  }
  //////////////////////
  // txaddress table
  //////////////////////
  public async singleCmdInsertTxAddress(cmds: SingleCmd[]): Promise<IFeedBack> {
    this.logger.info('into singleCmdInsertTxAddress')
    await this.execRecord('BEGIN;', {});

    for (let i = 0; i < cmds.length; i++) {
      try {
        let args = cmds[i].args as IfTxAddressTableArgs;
        let sql = SqlString.format('INSERT OR REPLACE INTO ? (hash, address, timestamp) VALUES(?, ?, ?);', [this.txAddressTable, args.hash, args.address, args.datetime]);
        let result = await this.execRecord(sql, {});
        if (result.err) {
          throw new Error("execRecord");
        }
      } catch (e) {
        this.logger.err('run insert fail, singleCmdInsertTxAddress');
        await this.db.run('ROLLBACK;');
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null };
      }
    }

    await this.execRecord('COMMIT;', {});
    return { err: ErrorCode.RESULT_OK, data: null };
  }
  public async queryHashTxAddressTable(addr: string): Promise<IFeedBack> {
    let sql = SqlString.format('SELECT * FROM ? WHERE address = ? ;', [this.txAddressTable, addr]);

    return this.getAllRecords(sql);
  }
  public async queryHashFromTx(hash: string, addr: string): Promise<IFeedBack> {
    let sql = SqlString.format('SELECT * FROM ? WHERE address = ? AND hash = ? ;', [this.txAddressTable, addr, hash]);

    return this.getRecord(sql);
  }
  public async insertTxAddressTable(hash: string, address: string, datetime: number) {
    this.logger.info('insertTxAddressTable');
    let sql = SqlString.format('INSERT OR REPLACE INTO ? (hash, address, timestamp) VALUES(?, ?, ?);', [this.txAddressTable, hash, address, datetime]);
    return this.insertOrReplaceRecord(sql, {});
  }
  public async updateTxAddressTable(hash: string, address: string, datetime: number) {
    return new Promise<IFeedBack>(async (resolv) => {
      let result = await this.insertTxAddressTable(hash, address, datetime);
      resolv(result);
    });
  }
  // Query 2 tables
  public async queryHashFromTxAddressTable(addr: string, index: number, size: number): Promise<IFeedBack> {

    this.logger.info('queryHansFromTxAddressTable:', 'size:', size, ' index:', index)
    let sql = SqlString.format('SELECT * FROM ? WHERE hash IN ( SELECT hash FROM ? WHERE address = ? ORDER BY timestamp DESC LIMIT ? OFFSET ? ) ORDER BY timestamp DESC;', [this.txTable, this.txAddressTable, addr, size, index * size]);
    // SELECT hash FROM ? WHERE address = ? ORDER BY timestamp DESC LIMIT ? OFFSET ? ;
    // "ad9d2f16ec9c0014b9036f7df3029ae783ba6a7e7cf5ba273c286eba36280c80" , "644d22c72f647fc79d02ce36e3b291154c02ad80c18713b0588cc679ba50ff7f"
    //let sql = SqlString.format('SELECT hash FROM ? WHERE address = ? ORDER BY timestamp DESC LIMIT ? OFFSET ? ;', [this.txAddressTable, addr, size, index * size]);
    return this.getAllRecords(sql);
  }

  public async queryHashFromTxAddressTableTotal(addr: string) {
    let sql = SqlString.format('SELECT COUNT(*) as count FROM ? WHERE address = ? ;', [this.txAddressTable, addr]);
    return this.getRecord(sql)
  }

  public async updateHashToTxAddressTable(strHash: string, addrs: string[], timestamp: number) {
    return new Promise<IFeedBack>(async (resolv) => {
      this.logger.info('updateHashToTxAddressTable()')
      for (let j = 0; j < addrs.length; j++) {
        let result = await this.updateTxAddressTable(strHash, addrs[j], timestamp);
        if (result.err) {
          resolv(result);
          return;
        }
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
  }
  /////////////////////////////////////////////////////////////////////
  // Lock Bancor Token Table , LBTT
  /////////////////////////////////////////////////////////////////////
  public queryALTTableByAddressToken(addr: string, token: string): Promise<IFeedBack> {
    let sql = SqlString.format('SELECT * FROM ? WHERE hash = ? AND token=?;', [this.accountLockBancorTokenTable, addr, token]);
    return this.getAllRecords(sql);
  }

  public removeALTTableByAddressToken(address: string, token: string): Promise<IFeedBack> {
    let sql = SqlString.format('DELETE FROM ? WHERE hash=? AND token=?;', [this.accountLockBancorTokenTable, address, token]);

    return this.removeRecord(sql, {});

  }

  public async singleCmdInsertLBTT(cmds: SingleCmd[]): Promise<IFeedBack> {
    this.logger.info('into singleCmdInsertLBTT')
    await this.execRecord('BEGIN;', {});
    for (let i = 0; i < cmds.length; i++) {
      try {
        let args = cmds[i].args as IfLBTTTArgs;
        let sql = SqlString.format('REPLACE INTO ? (hash, token, amount, dueamount, dueblock, duetime) VALUES (?,?,?,?,?,?);', [this.accountLockBancorTokenTable, args.address, args.token, args.amount, args.dueAmount, args.dueBlock, args.dueTime]);
        let result = await this.execRecord(sql, {});
        if (result.err) {
          throw new Error("execRecord");
        }
      } catch (e) {
        this.logger.err('run insert fail, singleCmdInsertLBTT');
        await this.db.run('ROLLBACK;');
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null };
      }
    }

    await this.execRecord('COMMIT;', {});
    return { err: ErrorCode.RESULT_OK, data: null };
  }

  public updateALTTable(address: string, token: string, amount: string, dueAmount: string, dueBlock: number, dueTime: number): Promise<IFeedBack> {

    // update new one
    // REPLACE INTO '${this.fullName}' (name, field, value) VALUES (?, ?, ?)`, key, field, json
    let sql = SqlString.format('REPLACE INTO ? (hash, token, amount, dueamount, dueblock, duetime) VALUES (?,?,?,?,?,?);', [this.accountLockBancorTokenTable, address, token, amount, dueAmount, dueBlock, dueTime]);
    return this.execRecord(sql, {});

  }

  ////////////////////////////////////
  // txTransferTo table
  ////////////////////////////////////
  public async singleCmdInsertTransferToTable(cmds: SingleCmd[]): Promise<IFeedBack> {
    this.logger.info('into singleCmdInsertTransferToTable')
    await this.execRecord('BEGIN;', {});
    for (let i = 0; i < cmds.length; i++) {
      try {
        let args = cmds[i].args as IfTTTTArgs;
        let sql = SqlString.format('INSERT OR REPLACE INTO ? (hash, blockhash, blocknumber, address, timestamp, content, toaddress, returncode) VALUES($hash, $blockhash, $blocknumber ,$address, $datetime, $content1, $toaddress, $returncode);', [this.txTransferToTable]);

        let result = await this.execRecord(sql, {
          $hash: SqlString.escape(args.hash).replace(/\'/g, ''),
          $blockhash: SqlString.escape(args.blockhash).replace(/\'/g, ''),
          $blocknumber: SqlString.escape(args.blocknumber),
          $address: SqlString.escape(args.address).replace(/\'/g, ''),
          $datetime: SqlString.escape(args.datetime),
          $content1: args.content,
          $toaddress: args.toaddress,
          $returncode: args.returncode
        });
        if (result.err) {
          throw new Error("execRecord");
        }
      } catch (e) {
        this.logger.err('run insert fail, singleCmdInsertTransferToTable');
        await this.db.run('ROLLBACK;');
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null };
      }
    }

    await this.execRecord('COMMIT;', {});
    return { err: ErrorCode.RESULT_OK, data: null };
  }


  public insertTxTransferToTable(hash: string, blockhash: string, blocknumber: number, address: string, datetime: number, content1: Buffer, toaddr: string, returncode: number) {
    this.logger.info('insertOrREplaceTxTransferTable', hash, '\n');
    let sql = SqlString.format('INSERT OR REPLACE INTO ? (hash, blockhash, blocknumber, address, timestamp, content, toaddress, returncode) VALUES($hash, $blockhash, $blocknumber ,$address, $datetime, $content1, $toaddress, $returncode);', [this.txTransferToTable]);

    return this.insertOrReplaceRecord(sql, {
      $hash: SqlString.escape(hash).replace(/\'/g, ''),
      $blockhash: SqlString.escape(blockhash).replace(/\'/g, ''),
      $blocknumber: SqlString.escape(blocknumber),
      $address: SqlString.escape(address).replace(/\'/g, ''),
      $datetime: SqlString.escape(datetime),
      $content1: content1,
      $toaddress: toaddr,
      $returncode: returncode
    });
  }
  public queryTxTransferToByPage(to: string, index: number, size: number) {
    let sql = SqlString.format('SELECT * FROM ? WHERE toaddress = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?;', [this.txTransferToTable, to, size, index * size]);
    return this.getAllRecords(sql);
  }
  public async queryTxTransferToTotal(addr: string) {
    let sql = SqlString.format('SELECT COUNT(*) as count FROM ? WHERE toaddress = ? ;', [this.txTransferToTable, addr]);
    return this.getRecord(sql)
  }
  public queryTxTransferFromByPage(addr: string, index: number, size: number) {
    let sql = SqlString.format('SELECT * FROM ? WHERE address = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?;', [this.txTransferToTable, addr, size, index * size]);
    return this.getAllRecords(sql);
  }

  public async queryTxTransferFromTotal(addr: string) {
    let sql = SqlString.format('SELECT COUNT(*) as count FROM ? WHERE address = ? ;', [this.txTransferToTable, addr]);
    return this.getRecord(sql)
  }

  public queryLatestTxTransferToTable() {
    let sql = SqlString.format('SELECT * FROM ? ORDER BY timestamp DESC LIMIT 15;', [this.txTransferToTable])
    return this.getAllRecords(sql)
  }
}
