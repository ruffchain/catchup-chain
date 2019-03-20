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
  let result = await synchro.getLIBNumber()
  logger.info(result);
  logger.info('libnumber:', parseInt(result.resp!))


}

main();

