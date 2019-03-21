import { Logger } from "../api/logger";
import { RPCClient } from "../client/client/rfc_client";
import { IfSysinfo } from "../api/common";
import { mapInstance } from "../core/net/static_peerid_ip";
import { StatusDataBase } from "../lib/storage/statusdb";
import { StorageDataBase } from "../lib/storage/StorageDataBase";
import { Synchro } from "../lib/catchup/synchro";
import { WRQueue } from "../lib/storage/queue";

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


let SYSINFO: IfSysinfo = {
  secret: '',
  host: '127.0.0.1', // ,'40.73.1.241' '127.0.0.1'
  port: 18080,
  address: '',
  verbose: false
}

let client = new RPCClient(
  SYSINFO.host,// '127.0.0.1',
  SYSINFO.port,
  SYSINFO
);

let queue = new WRQueue(logger, statusDB, storageDB);

logger.info(queue.isANumber("1B"));

async function maine() {
  let cr = await client.callAsync('getName', "1Bbruv7E4nP62ZD4cJqxiGrUD43psK5E2J")
  logger.info(cr);
  // logger.info(cr.resp)
}

maine();
