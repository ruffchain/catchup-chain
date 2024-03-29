import { Logger } from './api/logger';
import { StatusDataBase } from './lib/storage/statusdb';
import { StorageDataBase, SYS_TOKEN, HASH_TYPE, TOKEN_TYPE } from './lib/storage/StorageDataBase';
import { IFeedBack, BigNumber } from './core';
import winston = require('winston');
import * as fs from 'fs-extra';
import { Synchro } from './lib/catchup/synchro';
import { Inquiro } from './lib/catchup/inquiro';
import { WRQueue } from './lib/storage/queue';
import { SYS_TOKEN_PRECISION, SYS_NAME } from './lib/storage/dbapi/scoop';


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

function getPreBalances(filename: string): IPreBalance[] {
  console.log('open prebalance file:', filename)
  let buf = fs.readFileSync(filename);

  let obj: any;
  try {
    obj = JSON.parse(buf.toString());
  } catch (e) {
    throw new Error('Wrong open ' + filename);
  }
  return obj.preBalances as IPreBalance[];
}
function getMiners(filename: string): string[] {
  let buf = fs.readFileSync(filename);

  let obj: any;
  try {
    obj = JSON.parse(buf.toString());
  } catch (e) {
    throw new Error('Wrong open ' + filename);
  }
  return obj.miners as string[];
}
function getCoinbase(filename: string): string {
  let buf = fs.readFileSync(filename);

  let obj: any;
  try {
    obj = JSON.parse(buf.toString());
  } catch (e) {
    throw new Error('Wrong open ' + filename);
  }
  return obj.coinbase as string;
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

let serverObj = fs.readJsonSync('./config/server.json');

console.log("server.json:")
console.log(serverObj);

// You need privileged account to send candy, default is false
export const bEnableGetCandy = serverObj.enableGetCandy

let client = new Synchro({

  ip: serverObj.ip,
  port: serverObj.port,
  batch: 20
}, logger, statusDB, storageDB, bEnableGetCandy);


const genesisFile = serverObj.genesisFile;



let queue = new WRQueue(logger, statusDB, storageDB, client);

let server = new Inquiro({
  ip: '0.0.0.0',
  port: serverObj.localPort,
}, logger, queue);

let coinbase = getCoinbase(genesisFile);

// main entry function
async function main() {

  assert(await statusDB.open(), 'statusDB open', logger)

  assert(await statusDB.init(), 'statusDB init tables', logger);

  assert(await storageDB.open(), 'storageDB open', logger);

  assert(await storageDB.init(), 'storageDB init tables', logger);

  if (statusDB.nLoadGenesisFile === 0) {
    logger.info('\nShould load address into account table, hash table')
    let arrPreBalances = getPreBalances(genesisFile);

    assert(await storageDB.insertHashTable(SYS_NAME, HASH_TYPE.TOKEN), 'add to nameHash table' + SYS_NAME, logger);

    let amountAll: BigNumber = new BigNumber(0);
    for (let i = 0; i < arrPreBalances.length; i++) {
      let preBalance = arrPreBalances[i];
      logger.info(preBalance);

      amountAll = amountAll.plus(new BigNumber(preBalance.amount)); // add it up
      let newAmount: BigNumber = new BigNumber(preBalance.amount);

      assert(await storageDB.insertAccountTable(preBalance.address, SYS_TOKEN, TOKEN_TYPE.SYS, new BigNumber(newAmount).toString(), newAmount.toNumber()), 'add to account table ', logger);

      assert(await storageDB.insertHashTable(preBalance.address, HASH_TYPE.ADDRESS), 'add to nameHash table ' + preBalance.address, logger);

    }


    assert(await storageDB.insertTokenTable(SYS_NAME, TOKEN_TYPE.SYS, '-', 0, Buffer.from(JSON.stringify({
      supply: amountAll.toNumber(),
      precision: SYS_TOKEN_PRECISION
    }))), 'save SYS to token table', logger)

    assert(await statusDB.setLoadGenesisFileBool(1), 'set load genesis bool to :' + 1, logger);
  }

  client.start();

  server.start();

}

main();
