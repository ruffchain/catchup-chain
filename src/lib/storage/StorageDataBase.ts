import { CUDataBase, IfCUDataBaseOptions } from './cudatabase';
import winston = require('winston');
import { ErrorCode, IFeedBack } from '../../core/error_code';
import { subtractBN3, addBN2 } from './computer';

export const HASH_TYPE = {
  ADDRESS: 'addr',
  TOKEN: 'token',
  TX: 'tx',
  BLOCK: 'block',
  HEIGHT: 'block',
  NONE: 'none'
};
export const SYS_TOKEN = 's';

export const TOKEN_TYPE = {
  NORMAL: 'normal',
  BANCOR: 'bancor'
}


export class StorageDataBase extends CUDataBase {
  private hashTable: string;
  private accountTable: string;
  private blockTable: string;
  private txTable: string;
  private tokenTable: string;

  private hashTableSchema: string;
  private accountTableSchema: string;
  private blockTableSchema: string;
  private txTableSchema: string;
  private tokenTableSchema: string;

  constructor(logger: winston.LoggerInstance, options: IfCUDataBaseOptions) {
    super(logger, options);
    this.hashTable = 'hashtable';
    this.accountTable = 'accounttable';
    this.blockTable = 'blocktable';
    this.txTable = 'txtable';
    this.tokenTable = 'tokentable';

    this.hashTableSchema = `("hash" CHAR(64) PRIMARY KEY NOT NULL UNIQUE, "type" CHAR(64) NOT NULL, "verified" TINYINT NOT NULL);`;

    // hash-tokenname, value for search purpose!
    this.accountTableSchema = `("hash" CHAR(64) NOT NULL, "token" CHAR(64) NOT NULL, "amount" TEXT NOT NULL, "value" INTEGER NOT NULL, PRIMARY KEY("hash", "token"));`;

    this.blockTableSchema = `("hash" CHAR(64) PRIMARY KEY NOT NULL UNIQUE,"number" INTEGER NOT NULL, "txs" INTEGER NOT NULL, "address" CHAR(64) NOT NULL, "timestamp" INTEGER NOT NULL);`;

    this.txTableSchema = `("hash" CHAR(64) PRIMARY KEY NOT NULL UNIQUE, "blockhash" CHAR(64) NOT NULL, "address" CHAR(64) NOT NULL, "timestamp" INTEGER NOT NULL, "fee" CHAR(64) NOT NULL);`;

    this.tokenTableSchema = `("name" CHAR(64) PRIMARY KEY NOT NULL UNIQUE, "type" CHAR(64) NOT NULL, "address" CHAR(64) NOT NULL, "timestamp" INTEGER NOT NULL);`;
  }

  public init(): Promise<IFeedBack> {
    return new Promise<IFeedBack>(async (resolv) => {
      let result = await this.createTable(this.hashTable, this.hashTableSchema);
      await this.createTable(this.accountTable, this.accountTableSchema);
      await this.createTable(this.blockTable, this.blockTableSchema);
      await this.createTable(this.txTable, this.txTableSchema);
      result = await this.createTable(this.tokenTable, this.tokenTableSchema);
      this.logger.info('Create storage tables:', result);
      resolv({ err: 0, data: null });
    });
  }

  // access functions
  // hash table, use regex to get hash value ,default is 5 result
  public queryHashTable(s: string, num: number) {
    return this.getAllRecords(`SELECT * FROM ${this.hashTable} WHERE hash LIKE "${s}%" LIMIT ${num};`);
  }
  public queryHashTableFullName(s: string, num: number) {
    return this.getAllRecords(`SELECT * FROM ${this.hashTable} WHERE hash = "${s}" LIMIT ${num};`);
  }

  public insertOrReplaceHashTable(hash: string, type: string) {
    this.logger.info('into insertOrReplaceToHashTable()', hash, '\n')
    return this.insertOrReplaceRecord(`INSERT OR REPLACE INTO ${this.hashTable} (hash, type, verified) VALUES("${hash}", "${type}", 0);`);
  }
  public insertHashTable(hash: string, type: string): Promise<IFeedBack> {
    this.logger.info('into insertHashTable()', hash, '\n')
    return this.insertRecord(`INSERT INTO ${this.hashTable} (hash, type, verified) VALUES("${hash}", "${type}", 0);`);
  }
  public getHashTable(s: string) {
    return this.getRecord(`SELECT * FROM ${this.hashTable} WHERE hash = "${s}";`);
  }

  // public saveToHashTable(hash: string, type: string) {
  //   this.logger.info('into saveToHashTable()', hash, '\n')
  //   return new Promise<IFeedBack>(async (resolv) => {
  //     let feedback = await this.getHashTable(hash);
  //     if (feedback.err) {
  //       // insert
  //       feedback = await this.insertHashTable(hash, HASH_TYPE.BLOCK);
  //     } else {
  //       feedback = await this.insertOrReplaceHashTable(hash, HASH_TYPE.BLOCK);
  //     }

  //     this.logger.info('after insertion ', feedback);

  //     if (feedback.err) {
  //       resolv({ err: feedback.err, data: null })
  //     } else {
  //       resolv({ err: ErrorCode.RESULT_OK, data: null })
  //     }
  //   });
  // }

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
      } else {
        resolv(feedback);
      }
    });
  }

  // account
  public queryAccountTableByAddress(addr: string) {
    return this.getRecord(`SELECT * FROM ${this.accountTable} WHERE hash = "${addr}";`);
  }
  public queryAllAccountTableByAddress(addr: string) {
    return this.getAllRecords(`SELECT * FROM ${this.accountTable} WHERE hash = "${addr}";`);
  }
  public queryLatestAccountTable() {
    return this.getAllRecords(`SELECT * FROM ${this.accountTable} LIMIT 50;`);
  }
  public queryAccountTableByToken(token: string) {

  }
  public queryAccountTableByTokenAndAddress(addr: string, token: string) {
    return this.getRecord(`SELECT * FROM ${this.accountTable} WHERE hash = "${addr}" AND token = "${token}"`);
  }
  private updateAccountTableByTokenAndAddress(addr: string, token: string, amount: string) {
    return this.updateRecord(`UPDATE ${this.accountTable} SET amount = "${amount}" WHERE hash="${addr}" AND token = "${token}"`);
  }
  public insertAccountTable(hash: string, token: string, amount: string, value: number): Promise<IFeedBack> {
    return this.insertRecord(`INSERT INTO ${this.accountTable} (hash, token, amount, value) VALUES("${hash}", "${token}", "${amount}", ${value})`);
  }
  public insertOrReplaceAccountTable(hash: string, token: string, amount: string, value: number): Promise<IFeedBack> {
    return this.insertOrReplaceRecord(`INSERT OR REPLACE INTO ${this.accountTable} (hash, token, amount, value) VALUES("${hash}", "${token}", "${amount}", ${value})`);
  }
  public updateAccountTable(address: string, token: string, amount: string) {
    return new Promise<IFeedBack>(async (resolv) => {
      // if address token is not empty, update it
      let result = await this.queryAccountTableByTokenAndAddress(address, token);

      if (result.err === ErrorCode.RESULT_DB_RECORD_EMPTY) {
        // insert into it
        let result1 = await this.insertAccountTable(address, token, amount, 0);
        resolv(result1);
      } else if (result.err === ErrorCode.RESULT_DB_TABLE_GET_FAILED) {
        resolv(result);
      } else {
        // update it
        let result2 = await this.updateAccountTableByTokenAndAddress(address, token, amount)
        resolv(result2);
      }
    })
  }
  public addToAccountTable(address: string, amount: string) {

  }

  // block table

  public queryBlockTable(num: number) {

  }
  public insertOrReplaceBlockTable(hash: string, height: number, txno: number, address: string, datetime: number) {
    this.logger.info('into insertOrReplaceBlockTable()', hash, '\n')
    return this.insertOrReplaceRecord(`INSERT OR REPLACE INTO ${this.blockTable} (hash, number, txs, address, timestamp) VALUES("${hash}",${height}, ${txno}, "${address}", ${datetime});`);
  }
  public queryLatestBlockTable() {
    return this.getAllRecords(`SELECT * FROM ${this.blockTable} ORDER BY timestamp DESC LIMIT 50;`)
  }

  public queryBlockTableByPage(index: number, size: number) {
    return this.getAllRecords(`SELECT * FROM ${this.blockTable} ORDER BY timestamp DESC LIMIT ${size} OFFSET ${index * size} ;`);
  }

  // tx table
  public queryTxTable(hash: string) {
    return this.getRecord(`SELECT * FROM ${this.txTable} WHERE hash = "${hash}";`)
  }
  public queryTxTableByPage(index: number, size: number) {
    return this.getAllRecords(`SELECT * FROM ${this.txTable} ORDER BY timestamp DESC LIMIT ${size} OFFSET ${index * size} ;`);
  }
  public queryTxTableByDatetime(from: number, to: number) {
    return this.getAllRecords(`SELECT COUNT(*) as count FROM ${this.txTable} WHERE  timestamp >= ${from} AND timestamp < ${to};`);
  }

  public queryTxTableByAddress(address: string) {
    return this.getAllRecords(`SELECT * FROM ${this.txTable} WHERE address = "${address}";`)
  }
  public queryTxTableByBlock(block: string) {
    return this.getAllRecords(`SELECT * FROM ${this.txTable} WHERE blockhash = "${block}";`)
  }
  public insertTxTable(hash: string, blockhash: string, address: string, datetime: number, fee: string) {
    this.logger.info('insertOrREplaceTxTable', hash, '\n');
    return this.insertOrReplaceRecord(`INSERT OR REPLACE INTO ${this.txTable} (hash, blockhash, address,timestamp, fee) VALUES("${hash}", "${blockhash}", "${address}", ${datetime},"${fee}");`);
  }
  public queryLatestTxTable() {
    return this.getAllRecords(`SELECT * FROM ${this.txTable} ORDER BY timestamp DESC LIMIT 50 ;`)
  }

  public queryTxTableCount() {
    return this.getRecord(`SELECT COUNT(*) as count FROM ${this.txTable};`)
  }

  // token table
  public queryTokenTable(name: string) {
    return this.getRecord(`SELECT * FROM ${this.tokenTable} WHERE hash = "${name}";`);
  }
  public insertTokenTable(tokenname: string, type: string, address: string, datetime: number) {
    return this.insertRecord(`INSERT INTO ${this.tokenTable} (name, type, address, timestamp) VALUES("${tokenname}", "${type}", "${address}", ${datetime})`);
  }
}
