import { Logger } from './api/logger';
import { StatusDataBase } from './lib/storage/statusdb';
import { StorageDataBase, SYS_TOKEN, HASH_TYPE } from './lib/storage/StorageDataBase';
import { IFeedBack } from './core';
import winston = require('winston');
import * as fs from 'fs';
import { Synchro } from './lib/catchup/synchro';
import { Inquiro } from './lib/catchup/inquiro';
import { WRQueue } from './lib/storage/queue';

interface IPreBalance {
  address: string;
  amount: number;
}

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

let queue = new WRQueue(logger, statusDB, storageDB);

let client = new Synchro({
  ip: '139.219.184.44',
  port: 18089
}, logger, statusDB, storageDB);

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

    for (let i = 0; i < arrPreBalances.length; i++) {
      let preBalance = arrPreBalances[i];
      assert(await storageDB.insertAccountTable(preBalance.address, SYS_TOKEN, preBalance.amount.toString(), 0), 'add to account table ', logger);

      assert(await storageDB.insertHashTable(preBalance.address, HASH_TYPE.ADDRESS), 'add to nameHash table ' + preBalance.address, logger);
    }
    assert(await statusDB.setLoadGenesisFileBool(1), 'set load genesis bool to :' + 1, logger);
  }

  // let result = await storageDB.queryHashTable("15", 5);
  // logger.info(result.data.length);


  client.start();

  server.start();

}

main();

// const db = new DataBase(logger, {
//   name: 'testdb',
//   path: './data/',
// });
// let tab = 'Tiger'
// db.serialize(() => {
//   db.run(`CREATE TABLE IF NOT EXISTS "${tab}" ("name" TEXT NOT NULL UNIQUE)`);
//   db.run('INSERT INTO Tiger (name) VALUES ( $value )', { $value: "mosuse" });
//   db.run('INSERT INTO Tiger (name) VALUES ( $value )', { $value: "horse" });
//   db.each('SELECT rowid AS id , name from Tiger', (err: any, row: any) => {
//     console.log(row.id + ':' + row.name)
//   })
// });
// db.initTable((err: any) => {
//   if (err) {
//     throw new Error('');
//   }
//   db.info('db table initialized');
// });
// // console.log(logger)
// db.error('database closed');
// db.close();
