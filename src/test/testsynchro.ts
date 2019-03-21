import { Logger } from "../api/logger";
import { Synchro } from "../lib/catchup/synchro";
import { StatusDataBase } from "../lib/storage/statusdb";
import { StorageDataBase } from "../lib/storage/StorageDataBase";


const logger = Logger.init({
  path: './data/log/'
});

let statusDB = new StatusDataBase(logger, {
  name: 'status.db',
  path: './data/db/'
});

let storageDB = new StorageDataBase(logger, {
  name: 'storage.db',
  path: './data/db/'
})

let synchro = new Synchro({
  ip: '139.219.184.44',
  port: 18089
}, logger, statusDB, storageDB);

// synchro.getLastestBlock();


// synchro.getBlock(0);
async function main() {
  // let result = await synchro.getLIBNumber()
  // logger.info(result);
  // logger.info('libnumber:', parseInt(result.resp!))

  // let result = await synchro.getReceiptInfo('cf1217c575fa683d5d5b952e37991b546611d194a8d448898a3d84c925bc1ee4');
  // logger.info(result.data);

  // let result2 = await synchro.getBlock(134);
  // logger.info(result2);

  await statusDB.open();
  await storageDB.open();

  let result3 = await storageDB.queryAccountTableByAddress('154bdF5WH3FXGo4v24F4dYwXnR8br8rc2r');
  logger.info(result3);

}

main();

