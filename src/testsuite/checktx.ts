// test tps
import { Logger } from "../api/logger";
import { IfSysinfo, IfResult } from "../api/common";
import { User } from "./user";
import { transferTo } from "../api/transferto";
import { setApi } from "../api/setapi";
import * as colors from 'colors';
import { getBalance } from "../api/getbalance";
import { StatusDataBase } from "../lib/storage/statusdb";
import { StorageDataBase } from "../lib/storage/StorageDataBase";
import { Synchro } from "../lib/catchup/synchro";
import { getBlock } from "../api/getblock";

// START=1 node ./dist/testsuite/checktx.js

const SECRET = 'da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba';
const ADDRESS = '1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy'
const HOST = '40.73.35.23'
const PORT = 18089


let startHeight: number;
let endHeight: number;

if (process.env.START) {
  startHeight = parseInt(process.env.START)
} else {
  throw new Error('No START env ');
}
if (process.env.END) {
  endHeight = parseInt(process.env.END)
}
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
  ip: HOST, // '139.219.184.44'   '127.0.0.1'
  port: 18089,
  batch: 10
}, logger, statusDB, storageDB);

async function main() {
  // get current height
  if (!endHeight) {
    let result = await synchro.getLIBNumber()
    if (result.ret == 200) {
      console.log(colors.red('\nlib number:'), parseInt(result.resp!))
      endHeight = parseInt(result.resp!)
    }
  }
  console.log('To read block from ', startHeight, ' to ', endHeight);

  // get number of txs during current-height, start height

  let numTx: number = 0;

  for (let i = startHeight; i < endHeight; i++) {
    let result = await synchro.laGetBlock(i);
    if (result.ret === 200) {
      try {
        let obj = JSON.parse(result.resp!);
        if (obj.transactions.length !== 0) {
          console.log('Block ', colors.yellow(i + ': '), obj.transactions.length)
          numTx += obj.transactions.length;
        }
      } catch (e) {
        console.log(colors.red('parse fail'))
        console.log(e);
      }
    }
  }
  console.log('\n===============================')
  console.log(colors.yellow('tx number:'), numTx)
  console.log('')
}

main();
