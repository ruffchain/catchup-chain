import { Logger } from './api/logger';
import { StatusDataBase } from './lib/storage/statusdb';
import { StorageDataBase, SYS_TOKEN, HASH_TYPE, TOKEN_TYPE } from './lib/storage/StorageDataBase';
import { IFeedBack } from './core';
import winston = require('winston');
import * as fs from 'fs';
import { Synchro } from './lib/catchup/synchro';
import { Inquiro } from './lib/catchup/inquiro';
import { WRQueue } from './lib/storage/queue';
import { SYS_TOKEN_PRECISION } from './lib/storage/dbapi/scoop';

interface IPreBalance {
  address: string;
  amount: number;
}

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled rejection：', p, '原因：', reason);
  throw new Error('unhandled rejection')
  // 记录日志、抛出错误、或其他逻辑。
});

function assert(flag: IFeedBack, infoLog: string, log: winston.LoggerInstance) {
  if (flag.err) {
    throw new Error(infoLog);
  }
  if (log) {
    log.info('[ OK ]: ', infoLog, ' : ', flag.data, '\n');
  }
}

function getPreBanaces(filename: string): IPreBalance[] {
  let buf = fs.readFileSync(filename);

  let obj: any;
  try {
    obj = JSON.parse(buf.toString());
  } catch (e) {
    throw new Error('Wrong open ' + filename);
  }
  return obj.preBalances as IPreBalance[];
}

const logger = Logger.init({
  path: './data/log/'
});
logger.info('info log output');

let statusDB = new StatusDataBase(logger, {
  name: 'status.db',
  path: './data/db/'
});

let storageDB = new StorageDataBase(logger, {
  name: 'storage.db',
  path: './data/db/'
})

// let queue = new WRQueue(logger, statusDB, storageDB);

let client = new Synchro({

  ip: '40.73.35.23', // '127.0.0.1'   '139.219.184.44', 40.73.35.23 , newpeer 40.73.1.241
  port: 18089,
  batch: 20
}, logger, statusDB, storageDB);


let queue = new WRQueue(logger, statusDB, storageDB, client);

let server = new Inquiro({
  ip: '0.0.0.0',
  port: 18080
}, logger, queue);







// main entry function
async function main() {
  assert(await statusDB.open(), 'statusDB open', logger)

  assert(await statusDB.init(), 'statusDB init tables', logger);

  // assert(await statusDB.getCurrentHeight(), 'query current block height', logger);

  assert(await storageDB.open(), 'storageDB open', logger);

  assert(await storageDB.init(), 'storageDB init tables', logger);

  if (statusDB.nLoadGenesisFile === 0) {
    logger.info('\nShould load address into account table, hash table')
    let arrPreBalances = getPreBanaces('./config/genesis.json');

    assert(await storageDB.insertHashTable('SYS', HASH_TYPE.TOKEN), 'add to nameHash table' + 'SYS', logger);

    let amountAll = 0;
    for (let i = 0; i < arrPreBalances.length; i++) {
      let preBalance = arrPreBalances[i];
      logger.info(preBalance);

      amountAll += preBalance.amount; // add it up
      assert(await storageDB.insertAccountTable(preBalance.address, SYS_TOKEN, TOKEN_TYPE.SYS, preBalance.amount.toString(), preBalance.amount), 'add to account table ', logger);

      assert(await storageDB.insertHashTable(preBalance.address, HASH_TYPE.ADDRESS), 'add to nameHash table ' + preBalance.address, logger);


    }
    assert(await storageDB.insertTokenTable('SYS', TOKEN_TYPE.SYS, '-', 0, Buffer.from(JSON.stringify({
      supply: amountAll,
      precision: SYS_TOKEN_PRECISION
    }))), 'save SYS to token table', logger)

    assert(await statusDB.setLoadGenesisFileBool(1), 'set load genesis bool to :' + 1, logger);
  }

  // let result = await storageDB.queryHashTable("15", 5);
  // logger.info(result.data.length);


  client.start();

  server.start();

}

main();
