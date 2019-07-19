import { Logger } from "../api/logger";
import { RPCClient } from "../client/client/rfc_client";
import { IfSysinfo } from "../api/common";
import { StatusDataBase } from "../lib/storage/statusdb";
import { StorageDataBase } from "../lib/storage/StorageDataBase";
import { Synchro } from "../lib/catchup/synchro";
import { WRQueue } from "../lib/storage/queue";
// import * as SqlString from 'sqlstring';

import { describe, it } from 'mocha';
// import { BlockExecutorExternParamCreator } from "../core";
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

// Operation on RuffChain
let synchro = new Synchro({
  ip: '40.73.96.202',  // '127.0.0.1'    '139.219.184.44' 40.73.100.56  40.73.34.219, 40.73.1.241
  port: 18089,
  batch: 10
}, logger, statusDB, storageDB);


let SYSINFO: IfSysinfo = {
  secret: '',
  host: '40.73.96.202', // ,     '40.73.1.241'    '127.0.0.1' 40.73.100.56 40.73.34.219  40.73.35.23 
  port: 18080,
  address: '',
  verbose: true
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



  // it('getCandidates', async () => {
  //   this.timeout(3000);
  //   let cr = await client.callAsync('getCandidates', '')
  //   logger.info(cr);
  //   logger.info(cr.resp)

  //   let obj = JSON.parse(cr.resp!);
  //   expect(1).to.equal(1);
  // })

  it('getChainOverview', async () => {
    this.timeout(3000);
    let cr = await client.callAsync('getChainOverview', '')
    logger.info(cr);
    logger.info(cr.resp)

    let obj = JSON.parse(cr.resp!);
    expect(1).to.equal(1);
  })
  it('getLatestBlocks', async () => {
    this.timeout(33000);
    let cr = await client.callAsync('getLatestBlocks', { page: 1, pageSize: 5 })
    // logger.info(cr);
    logger.info(cr.resp)
    let obj = JSON.parse(cr.resp!)
    expect(1).to.equal(1);
  })

  it('getCandy', async () => {
    this.timeout(33000);
    let cr = await client.callAsync('getCandy', { token: 'SYS', address: '159ueJXY2cBK78pjrsJXwhPGsWfJTJeik1' })
    // logger.info(cr);
    logger.info(cr.resp)
    let obj = JSON.parse(cr.resp!)
    expect(1).to.equal(1);
  })

  /*

    it('getName', async () => {
    this.timeout(3000);
    let cr = await client.callAsync('getName', "159ueJXY2cBK78pjrsJXwhPGsWfJTJeik1")
    logger.info(cr);
    logger.info(cr.resp)

    let obj = JSON.parse(cr.resp!);
    expect(1).to.equal(1);
  })


it('getTokenInfo sys', async () => {
  this.timeout(3000);
  let cr = await client.callAsync('getTokenInfo', "SYS")
  logger.info(cr);
  logger.info(cr.resp)

  let obj = JSON.parse(cr.resp!);
  expect(1).to.equal(1);
})


it('getTxsTransferTo ', async () => {
  this.timeout(30000);
  let cr = await client.callAsync('getTxsTransferTo', { address: '159ueJXY2cBK78pjrsJXwhPGsWfJTJeik1', page: 1, pageSize: 10 })
  //logger.info(cr);
  logger.info(cr.resp)

  let obj = JSON.parse(cr.resp!);
  expect(1).to.equal(1);
})
it('getTxsTransferFrom ', async () => {
  this.timeout(30000);
  let cr = await client.callAsync('getTxsTransferFrom', { address: '154bdF5WH3FXGo4v24F4dYwXnR8br8rc2r', page: 1, pageSize: 10 })
  //logger.info(cr);
  logger.info(cr.resp)

  let obj = JSON.parse(cr.resp!);
  expect(1).to.equal(1);
})



it('getCandy', async () => {
  this.timeout(33000);
  let cr = await client.callAsync('getCandy', { token: 'SYS', address: '1Bbruv7E4nP62ZD4cJqxiGrUD43psK5E2J' })
  // logger.info(cr);
  logger.info(cr.resp)
  let obj = JSON.parse(cr.resp!)
  expect(1).to.equal(1);
})
it('getCandy', async () => {
  this.timeout(33000);
  let cr = await client.callAsync('getCandy', { token: 'SYS', address: '159ueJXY2cBK78pjrsJXwhPGsWfJTJeik1' })
  // logger.info(cr);
  logger.info(cr.resp)
  let obj = JSON.parse(cr.resp!)
  expect(1).to.equal(1);
})

it('getCandy', async () => {
  this.timeout(33000);
  let cr = await client.callAsync('getCandy', { token: 'SYS', address: '1HSUrBRrR477nA2eTqz7c4UsxPDyf9thr5' })
  // logger.info(cr);
  logger.info(cr.resp)
  let obj = JSON.parse(cr.resp!)
  expect(1).to.equal(1);
})
it('getCandy', async () => {
  this.timeout(33000);
  let cr = await client.callAsync('getCandy', { token: 'SYS', address: '1JGmcNM1bTySwk1diKw346ic6R59uiMKHX' })
  // logger.info(cr);
  logger.info(cr.resp)
  let obj = JSON.parse(cr.resp!)
  expect(1).to.equal(1);
})

it('getCandy', async () => {
  this.timeout(33000);
  let cr = await client.callAsync('getCandy', { token: 'SYS', address: '1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy' })
  // logger.info(cr);
  logger.info(cr.resp)
  let obj = JSON.parse(cr.resp!)
  expect(obj.status).to.equal(0);
})

it('getBancorTokenParams SMTOKEN', async () => {
  this.timeout(3000);
  let cr = await client.callAsync('getBancorTokenParams', "TOKEN90")
  logger.info(cr);
  logger.info(cr.resp)

  let obj = JSON.parse(cr.resp!);
  expect(1).to.equal(1);
})

it('getTokenInfo language', async () => {
  this.timeout(3000);
  let cr = await client.callAsync('getTokenInfo', "TOKEN90")
  logger.info(cr);
  logger.info(cr.resp)

  let obj = JSON.parse(cr.resp!);
  expect(1).to.equal(1);
})

it('getsysbyToken ', async () => {
  this.timeout(3000);
  let cr = await client.callAsync('getSysByToken', { tokenid: "TOKEN90", amount: 2 })
  logger.info(cr);
  logger.info(cr.resp)

  let obj = JSON.parse(cr.resp!);
  expect(1).to.equal(1);
})



it('getTxsByAddress ', async () => {
this.timeout(3000);
let cr = await client.callAsync('getTxsByAddress', { address: '1A3FVyxnENWa5w62xvHJ84RPFJT7N8u7vq', page: 1, pageSize: 10 })
//logger.info(cr);
logger.info(cr.resp)

let obj = JSON.parse(cr.resp!);
expect(1).to.equal(1);
})

 
it('getTokenInfo sys', async () => {
  this.timeout(3000);
  let cr = await client.callAsync('getTokenInfo', "reality")
  //logger.info(cr);
  logger.info(cr.resp)
 
  let obj = JSON.parse(cr.resp!);
  expect(1).to.equal(1);
})
it('getTokenInfo token3', async () => {
  this.timeout(3000);
  let cr = await client.callAsync('getTokenInfo', "virtual")
  //logger.info(cr);
  logger.info(cr.resp)
 
  let obj = JSON.parse(cr.resp!);
  expect(1).to.equal(1);
})
it('getTokenInfo smarttoken tokens', async () => {
  this.timeout(3000);
  let cr = await client.callAsync('getTokenInfo', "sys")
  //logger.info(cr);
  logger.info(cr.resp)
 
  let obj = JSON.parse(cr.resp!);
  expect(1).to.equal(1);
})
it('getTxsByAddress ', async () => {
  this.timeout(3000);
  let cr = await client.callAsync('getTxsByAddress', { address: '1GHzPAoYxzuT2aTwpwHx2z2rcaSo16pyUy', page: 1, pageSize: 10 })
  //logger.info(cr);
  logger.info(cr.resp)
 
  let obj = JSON.parse(cr.resp!);
  expect(1).to.equal(1);
})
it('getTxsByAddress ', async () => {
  this.timeout(3000);
  let cr = await client.callAsync('getTxsByAddress', { address: '154bdF5WH3FXGo4v24F4dYwXnR8br8rc2r', page: 1, pageSize: 10 })
  //logger.info(cr);
  logger.info(cr.resp)
 
  let obj = JSON.parse(cr.resp!);
  expect(1).to.equal(1);
})
it('getTokensByAddress ', async () => {
  this.timeout(3000);
  let cr = await client.callAsync('getTokensByAddress', '1GHzPAoYxzuT2aTwpwHx2z2rcaSo16pyUy')
  //logger.info(cr);
  logger.info(cr.resp)
 
  let obj = JSON.parse(cr.resp!);
  expect(1).to.equal(1);
}) */

  // it('getName', async () => {
  //   this.timeout(3000);
  //   let cr = await client.callAsync('getName', "13")
  //   //logger.info(cr);
  //   logger.info(cr.resp)

  //   let obj = JSON.parse(cr.resp!);
  //   expect(1).to.equal(1);
  // })
  // it('getName', async () => {
  //   this.timeout(3000);
  //   let cr = await client.callAsync('getName', "1EYLLvMtXGeiBJ7AZ6KJRP2BdAQ2Bof79")
  //   //logger.info(cr);
  //   logger.info(cr.resp)

  //   let obj = JSON.parse(cr.resp!);
  //   expect(1).to.equal(1);
  // })

  // it('getAccount', async () => {
  //   this.timeout(3000);
  //   let cr = await client.callAsync('getAccount', "1EYLLvMtXGeiBJ7AZ6KJRP2BdAQ2Bof79")
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(obj[0].hash).to.equal("1EYLLvMtXGeiBJ7AZ6KJRP2BdAQ2Bof79");
  // })
  // it('getAccounts', async () => {
  //   this.timeout(3000);
  //   let cr = await client.callAsync('getAccounts', "")
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(cr.ret).to.equal(200);
  // })
  // it('getToken', async () => {
  //   this.timeout(3000);
  //   let cr = await client.callAsync('getToken', "hdba")
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(obj.name).to.equal("hdba");
  // })
  // it('getTokenInfo sys', async () => {
  //   this.timeout(3000);
  //   let cr = await client.callAsync('getTokenInfo', "sys")
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getTokenPrice virtual', async () => {
  //   this.timeout(3000);
  //   let cr = await client.callAsync('getTokenPrice', "virtual")
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getTokenInfo ssss', async () => {
  //   this.timeout(3000);
  //   let cr = await client.callAsync('getTokenInfo', "ssss")
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getTokenInfo ss', async () => {
  //   this.timeout(3000);
  //   let cr = await client.callAsync('getTokenInfo', "ss")
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getTokenInfo sys', async () => {
  //   this.timeout(3000);
  //   let cr = await client.callAsync('getTokenInfo', "sys")
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getTokenPrice', async () => {
  //   this.timeout(33000);
  //   let cr = await client.callAsync('getTokenPrice', "hdba")
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // // it('getTokenPrice', async () => {
  // //   this.timeout(33000);
  // //   let cr = await client.callAsync('getTokenPrice', "ss")
  // //   // logger.info(cr);
  // //   logger.info(cr.resp)
  // //   let obj = JSON.parse(cr.resp!)
  // //   expect(1).to.equal(1);
  // // })
  // it('getTokenPrice', async () => {
  //   this.timeout(33000);
  //   let cr = await client.callAsync('getTokenPrice', "ssss")
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getFortuneRanking', async () => {
  //   this.timeout(33000);
  //   let cr = await client.callAsync('getFortuneRanking', "sys")
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getFortuneRanking', async () => {
  //   this.timeout(33000);
  //   let cr = await client.callAsync('getFortuneRanking', { token: 'sys', page: 1, pageSize: 2 })
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getTokensByAddress', async () => {
  //   this.timeout(33000);
  //   let cr = await client.callAsync('getTokensByAddress', "154bdF5WH3FXGo4v24F4dYwXnR8br8rc2r")
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getTxsByAddress', async () => {
  //   this.timeout(33000);
  //   let cr = await client.callAsync('getTxsByAddress', "")
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getTxsByAddress', async () => {
  //   this.timeout(33000);
  //   let cr = await client.callAsync('getTxsByAddress', { address: "12nP8vFGBJd4MBu6uAD5YckZLXDyPCbcbC", page: 1, pageSize: 2 })
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getTxs', async () => {
  //   this.timeout(33000);
  //   let cr = await client.callAsync('getLatestTxs', "")
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getTxs', async () => {
  //   this.timeout(33000);
  //   let cr = await client.callAsync('getLatestTxs', { page: 1, pageSize: 1 })
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // // it('getTxsByBlock', async () => {
  // //   this.timeout(33000);
  // //   let cr = await client.callAsync('getTxsByBlock', 'a5988bf51969d78615132e0102587486ab934010228cc476d9753608ec2768c5')
  // //   // logger.info(cr);
  // //   logger.info(cr.resp)
  // //   let obj = JSON.parse(cr.resp!)
  // //   expect(1).to.equal(1);
  // // })
  // // it('getTx', async () => {
  // //   this.timeout(33000);
  // //   let cr = await client.callAsync('getTx', '2a286411a7c6b5c016e29d4780d50cee6832acefde165987621fbb68e85192e2')
  // //   // logger.info(cr);
  // //   logger.info(cr.resp)
  // //   let obj = JSON.parse(cr.resp!)
  // //   expect(1).to.equal(1);
  // // })
  // // it('getBlocks', async () => {
  // //   this.timeout(33000);
  // //   let cr = await client.callAsync('getBlocks', '')
  // //   // logger.info(cr);
  // //   logger.info(cr.resp)
  // //   let obj = JSON.parse(cr.resp!)
  // //   expect(1).to.equal(1);
  // // })
  // it('getLatestBlocks', async () => {
  //   this.timeout(33000);
  //   let cr = await client.callAsync('getLatestBlocks', '')
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getLatestBlocks', async () => {
  //   this.timeout(33000);
  //   let cr = await client.callAsync('getLatestBlocks', { page: 1, pageSize: 2 })
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getChainOverview', async () => {
  //   this.timeout(33000);
  //   let cr = await client.callAsync('getChainOverview', {})
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })
  // it('getLatestTxCount', async () => {
  //   this.timeout(33000);
  //   let cr = await client.callAsync('getLatestTxCount', { from: '1970-01-12T14:42:49.476Z', to: '1970-01-18T23:29:29.476Z' })
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })

  // it('default', async () => {
  //   this.timeout(33000);
  //   let cr = await client.callAsync('default', {})
  //   // logger.info(cr);
  //   logger.info(cr.resp)
  //   let obj = JSON.parse(cr.resp!)
  //   expect(1).to.equal(1);
  // })

});

