import { Logger } from "../api/logger";
import { StatusDataBase } from "../lib/storage/statusdb";
import { StorageDataBase } from "../lib/storage/StorageDataBase";

// testqueue.ts
// This is a test of data flow from front to sqlite3 db through the queue

const logger = Logger.init({
  path: './data/log/'
});
logger.info('Start testqueue ...');

// init database
let statusDB = new StatusDataBase(logger, {
  name: 'status.db',
  path: './data/db/'
});

// int the other database for all the table
let otherDB = new StorageDataBase(logger, {
  name: 'storage.db',
  path: './data/db/'
})

async function main() {
  let result = await statusDB.open();

  if (result.err) {
    throw new Error('Wrong open statusdb');
  }

  logger.info('init tables')
  result = await statusDB.init();
  logger.info(result);


  logger.info('get current height');
  result = await otherDB.getCurrentHeight();
  logger.info(result);

  logger.warn('set author')
  result = await statusDB.setAuthor('spike');
  logger.info(result)

  logger.warn('update author')
  result = await statusDB.updateAuthor('John', 100);
  logger.info(result);

  logger.warn('open storage database')
  result = await otherDB.open();
  result = await otherDB.init();
  logger.info(result);

}

main();
