import { Logger } from "../api/logger";
import { Synchro } from "../lib/catchup/synchro";
import { StatusDataBase } from "../lib/storage/statusdb";
import { StorageDataBase, TOKEN_TYPE, SYS_TOKEN } from "../lib/storage/StorageDataBase";
import { subtractBN3 } from "../lib/storage/compute";


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
  ip: '139.217.133.187', // '139.219.184.44'   '127.0.0.1'
  port: 18089
}, logger, statusDB, storageDB);

// synchro.getLastestBlock();

const txLst = [
  '9ee8c58857aa090a2b4b030437240863b09b49be56d16caa0c33333f834527d3',
  '646b3eced21970bbe214f7a763f55fd1a92d9387a85f179bd50195a9f160a872',
  '955c8770a5aace7470581279a18e740e1637c74ff8954d3e7779992e82908f88',
  '9f79c2c42708c59e4f7c575d5d65b03dd6b1ea68cee79eacdd1ef2591b8688dd',
  '31d871d23ffca4ec3b4fc23535d75bbc90ca312a86fba6f30fb5d20c28daa7af',
  'e2caae56f052f4b72f03e62d51846fe31558f5f72109f12e2ccfb0fc96387f29',
  'cab7c0bf55cafaa59b78de1e4d972d66c36a264b4cea7e3543613fb6fbb46c04',
  'f653d42ad4e0e90435b1f322e534c3780b0e9d68dd020d974a304b79826f188c',
  'c0d13307054f1c940a8681e7517d5e493d71fa2899a4a6a14448cd201aa8ae4f',
  'd3f975a1724296842c8f7547f0a2a52e62c823832a6a3ff6816e63c68dc7df84',
  '00453f4938dc8440f7a536d5bcd20c20e31dbffc81a421b2d347a4fc16dac3e8',
  'b78b87dd0f97b99ffd08cb9ca9155efbdf6fabba8452acfc5757199fa3216c06',
  '009a35189510d3b412181cad6841c0f590f64fc72150c58490fbf29440b913cb',
  'd607f04bc63c1b2f8d91d727f336f6986cdf1f28546fb496b51f1de2ee1f8049',
  'ac0e679a832a37348d7fb5ea4425d42ecc7ec663ae54d3005f4f6732725256ab',
  'dbdf63bb51618ddc9038d47c547e6a16610b6af871ebbe2c6206e4c27d3cf837',
  '5991833ea0294448afde9046a8e1f23080c1f08305e8d4ae781dc8a10517e4f5',
  '8f7e1755d1af03f45255cc0ee86383c2ef04df18053b11e4f775ef5881fa99f3',
  'fe0159c893de9ea450be3558597b8861af9addada88fc7be94fd2302851972fc',
  '400df0c597e74e6c4a71db4316c246b0ee1fe8f0da1da143e9ee36841cb4f267',
  '9cc823c0cb00c2ef45a2c6310c13cbdeddf74d62f6d33815cb9d1ce7e2a746ee',
  '5f43c60e23adbce9ba56063ad2469ac07223b9cbd0b6d8b0919a451c3e9004b6',
  'a4740203b46149b9ba14ada7929250c7bd95d87fcbe3f52118fe2615118ea759',
  'b68f277468e83731699f250f5baac581450b19abf2370bec19f8956f63caae17',
  '11c7dd488b677a289534998f7cf1736a87631d3b81a5f0d484e1f5758d052ec8',
  '7464679c44c3c2a920bf68b9fe17a8619f9acef207aa47997201cd82643f2fa6',
  '7b9ae9be839ee114dce2152d645ce767cd4e84b21b6eb2944ec730baed808376',
  '2a286411a7c6b5c016e29d4780d50cee6832acefde165987621fbb68e85192e2'

]
// synchro.getBlock(0);
async function main() {
  // let result = await synchro.getLIBNumber();
  // logger.info(result);
  // let result = await synchro.getFactor('chromesmart');
  // logger.info(result);
  // let obj = JSON.parse(result.resp!.toString());
  // logger.info(obj.value.replace('n', ''));
  // logger.info('\n')

  // result = await synchro.getReserve('chromesmart');
  // logger.info(result);
  // obj = JSON.parse(result.resp!.toString());
  // logger.info(obj.value.replace('n', ''));
  // logger.info('\n')

  // result = await synchro.getSupply('chromesmart');
  // logger.info(result);
  // obj = JSON.parse(result.resp!.toString());
  // logger.info(obj.value.replace('n', ''));
  // logger.info('\n')

  // result = await synchro.transferCandy('1NsES7YKm8ZbRE4K5LaPGKeSELVtAwzoTw', 1000);
  // logger.info(result)

  // let result = await synchro.getLIBNumber()
  // logger.info(result);
  // logger.info('libnumber:', parseInt(result.resp!))
  // logger.info('\n')

  // let result = await synchro.getLastestBlock();
  // logger.info(result);
  // logger.info('latest block:', parseInt(result.resp!));
  // let obj = JSON.parse(result.resp!)
  // logger.info(obj.block.number);

  // let result = await synchro.getBalanceInfo(SYS_TOKEN, '154bdF5WH3FXGo4v24F4dYwXnR8br8rc2r')
  // logger.info(result);
  // let obj = JSON.parse(result.resp!);
  // logger.info('libnumber:', obj.value, '\n')

  // result = await synchro.getTokenBalanceInfo('hdbahsdga', '1Lj2e7BEf17FSJ5tL4h4qS1yX9yfMMiW4a')
  // logger.info(result);
  // obj = JSON.parse(result.resp!);
  // logger.info('libnumber:', obj.value, '\n')

  // result = await synchro.getBancorTokenBalanceInfo('token90', '1EYLLvMtXGeiBJ7AZ6KJRP2BdAQ2Bof79')
  // logger.info(result);
  // obj = JSON.parse(result.resp!);
  // logger.info('bancortoken balance:', obj.value, '\n')

  // let result2 = await synchro.getReceiptInfo('d3f975a1724296842c8f7547f0a2a52e62c823832a6a3ff6816e63c68dc7df84');
  // logger.info(result2);

  // for (let i = 0; i < txLst.length; i++) {
  //   logger.info(i + 1 + '\n')
  //   let result = await synchro.getReceiptInfo(txLst[i]);
  //   logger.info(result.data);
  //   logger.info('\n')
  // }

  // logger.info('\n')
  // let result2 = await synchro.getBlock(134);
  // logger.info(result2);

  await statusDB.open();
  await storageDB.open();

  let result2 = await storageDB.queryHashFromTxAddressTable(
    '1GHzPAoYxzuT2aTwpwHx2z2rcaSo16pyUy', 1, 2);

  console.log(result2);
  logger.info('\n')

  result2 = await storageDB.queryHashTxAddressTable(
    '1GHzPAoYxzuT2aTwpwHx2z2rcaSo16pyUy'
  );

  logger.info(result2)

  // let result2 = await storageDB.queryTxTable('cf1217c575fa683d5d5b952e37991b546611d194a8d448898a3d84c925bc1ee4');
  // console.log(result2)
  // console.log(result2.data.content);
  // let data = result2.data.content;
  // const myobj = JSON.parse(data.toString())
  // console.log('\n')
  // console.log(myobj)
  // console.log('\n')
  // result2.data.content = myobj;
  // console.log(result2.data)

  // let result2 = await storageDB.queryAccountTableByAddress('1Lj2e7BEf17FSJ5tL4h4qS1yX9yfMMiW4a');
  // let result2 = await storageDB.queryLatestTxTable();
  // console.log(result2);

  // let result2 = await storageDB.queryTokenTable('hdba');
  // console.log(result2);
  // let result2 = await storageDB.queryFortuneRanking('hdba');
  // console.log(result2);
  // console.log(result2.data.count!)

  // logger.info('\n')
  // result2 = await storageDB.queryTxTableByPage(1, 10);
  // logger.info(result2);
  // console.log(result2)
  // console.log(result2.data.count!)

  // 1552962146, 1552963616,
  // result2 = await storageDB.queryTxTableByDatetime(1552962146, 1552963616);
  // logger.info(result2);
  // console.log(result2)
  // console.log(result2.data.count!)

  // let result3 = await storageDB.queryAccountTableByAddress('154bdF5WH3FXGo4v24F4dYwXnR8br8rc2r');
  // logger.info(result3);

  // logger.info('test BN\n')
  // logger.info(subtractBN3("1000", "100", "1"))

  statusDB.close();
  storageDB.close();
}
function formatToJsonObj(str: any) {
  console.log(str);
  logger.info(typeof str);
  let obj = Object.create({});

  let lst = str.split(',');
  for (let i = 0; i < lst.length; i++) {
    let lstItem = lst[i].split('=')
    obj['' + lstItem[0]] = lstItem[1];
  }
  return obj;
}
main();

