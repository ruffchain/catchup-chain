import { Logger } from "../api/logger";
import { RPCClient } from "../client/client/rfc_client";
import { IfSysinfo } from "../api/common";
import { StatusDataBase } from "../lib/storage/statusdb";
import { StorageDataBase } from "../lib/storage/StorageDataBase";
import { Synchro } from "../lib/catchup/synchro";
import { WRQueue } from "../lib/storage/queue";
import * as SqlString from 'sqlstring';

import { describe, it } from 'mocha';
import { BlockExecutorExternParamCreator } from "../core";
// var assert = require('assert');
let expect = require('chai').expect;

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
  host: '127.0.0.1', // ,     '40.73.1.241'    '127.0.0.1'
  port: 18080,
  address: '',
  verbose: false
}

let client = new RPCClient(
  SYSINFO.host,// '127.0.0.1',
  SYSINFO.port,
  SYSINFO
);

let queue = new WRQueue(logger, statusDB, storageDB, synchro);

// logger.info(queue.isANumber("1B"));

describe('To test Catchup v1.0.2 JSON API', async function () {
  this.timeout(100000);
  it('getName', async () => {
    this.timeout(3000);
    let cr = await client.callAsync('getName', "hdba")
    //logger.info(cr);
    logger.info(cr.resp)

    let obj = JSON.parse(cr.resp!);
    expect(obj[0].type).to.equal("token");
  })
  it('getAccount', async () => {
    this.timeout(3000);
    let cr = await client.callAsync('getAccount', "1EYLLvMtXGeiBJ7AZ6KJRP2BdAQ2Bof79")
    // logger.info(cr);
    logger.info(cr.resp)
    let obj = JSON.parse(cr.resp!)
    expect(obj[0].hash).to.equal("1EYLLvMtXGeiBJ7AZ6KJRP2BdAQ2Bof79");
  })
  it('getAccounts', async () => {
    this.timeout(3000);
    let cr = await client.callAsync('getAccounts', "")
    // logger.info(cr);
    logger.info(cr.resp)
    let obj = JSON.parse(cr.resp!)
    expect(cr.ret).to.equal(200);
  })
  it('getToken', async () => {
    this.timeout(3000);
    let cr = await client.callAsync('getToken', "hdba")
    // logger.info(cr);
    logger.info(cr.resp)
    let obj = JSON.parse(cr.resp!)
    expect(obj.name).to.equal("hdba");
  })
  it('getTokenInfo', async () => {
    this.timeout(3000);
    let cr = await client.callAsync('getTokenInfo', "hdba")
    // logger.info(cr);
    logger.info(cr.resp)
    let obj = JSON.parse(cr.resp!)
    expect(1).to.equal(1);
  })
  it('getTokenPrice', async () => {
    this.timeout(33000);
    let cr = await client.callAsync('getTokenPrice', "hdba")
    // logger.info(cr);
    logger.info(cr.resp)
    let obj = JSON.parse(cr.resp!)
    expect(1).to.equal(1);
  })
  it('getFortuneRanking', async () => {
    this.timeout(33000);
    let cr = await client.callAsync('getFortuneRanking', "sys")
    // logger.info(cr);
    logger.info(cr.resp)
    let obj = JSON.parse(cr.resp!)
    expect(1).to.equal(1);
  })

});


async function maine() {
  let cr = await client.callAsync('getName', "hdba")
  logger.info(cr);
  logger.info(cr.resp)

  // cr = await client.callAsync('getTxsByAddress', {
  //   address: '154bdF5WH3FXGo4v24F4dYwXnR8br8rc2r',
  //   page: 1,
  //   pageSize: 3
  // });
  logger.info('\n')
  // logger.info(cr);

  cr = await client.callAsync('getTx', 'cf1217c575fa683d5d5b952e37991b546611d194a8d448898a3d84c925bc1ee4')
  logger.info('\n')
  logger.info(cr);


  // cr = await client.callAsync('getTxsByBlock', '83cc99a0f3d9f3558f6f6e4d53f978d7e796a2e9aca580ca7f853adf57f66c31')
  // logger.info('\n')
  // logger.info(cr);
  // cr = await client.callAsync('getTxByAddress', {
  //   address: '1Lj2e7BEf17FSJ5tL4h4qS1yX9yfMMiW4a',
  //   page: 1,
  //   pageSize: 20
  // }
  // )
  // console.log(cr);
  // logger.info('\n');
  //cr = await client.callAsync('getTxsByAddress', { page: 1, pageSize: 2 });
  // // cr = await client.callAsync('getLatestTxs', { page: 1, pageSize: 3 });
  // cr = await client.callAsync('getTokensByAddress', "1Lj2e7BEf17FSJ5tL4h4qS1yX9yfMMiW4a");
  // logger.info('\n')
  // logger.info(cr);

  // let tempStr = SqlString.escape('hello').replace(/\'/g, '');
  // console.log(tempStr);
  // console.log(typeof tempStr)

  // cr = await client.callAsync('getFortuneRanking', { token: "s", page: 1, pageSize: 2 });
  // logger.info('\n')
  // logger.info(cr);
  // cr = await client.callAsync('getTokenInfo', "hdba");
  // logger.info('\n')
  // logger.info(cr);
  // cr = await client.callAsync('getLatestBlocks', { page: 1, pageSize: 2 });
  // logger.info('\n')
  // logger.info(cr);

  // logger.info('To getTokenPrice()');
  // cr = await client.callAsync('getTokenPrice', 'hdba');
  // logger.info('\n')
  // logger.info(cr);

  // cr = await client.callAsync('getTokenPrice', 'hdba');
  // logger.info('\n')
  // logger.info(cr);

  // cr = await client.callAsync('getTokenPrice', 'hdba');
  // logger.info('\n')
  // logger.info(cr);

  // cr = await client.callAsync('getLatestTxCount', { from: , to: });
  // logger.info('\n')
  // logger.info(cr);

  // logger.info('To getCandy()');
  // cr = await client.callAsync('getCandy', { address: '1NAbrmtA3yDr2CsRMKmav8aLLyqhnjobU1', token: 'SYS' });
  // logger.info('\n')
  // logger.info(cr);
}



