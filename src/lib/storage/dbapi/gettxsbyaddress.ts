import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";



export async function laGetTxsByAddress(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {

    let result: any;
    let arr: any;
    let argsObj: any;

    if (!args) {
      result = await handle.pStorageDb.queryLatestTxTable();
    } else {
      try {
        argsObj = JSON.parse(JSON.stringify(args));
        result = await handle.pStorageDb.queryTxTableByAddress(argsObj.address,
          (argsObj.page > 0) ? (argsObj.page - 1) : 0, argsObj.pageSize);
      } catch (e) {
        handle.logger.error('Wrong getLatestTxs ARGS');
      }
    }

    if (result.err === ErrorCode.RESULT_OK) {
      try {
        console.log('received result.data')
        console.log(result.data);
        for (let i = 0; i < result.data.length; i++) {
          result.data[i].content = JSON.parse(result.data[i].content);
        }
        arr = {};
        arr.data = result.data;

        let result1 = await handle.pStorageDb.queryTxTableByAddressTotal(argsObj.address);
        let nTxCount = parseInt(result1.data.count)
        arr.total = nTxCount; // something read from the database

        resolv({ err: ErrorCode.RESULT_OK, data: arr })
        return;

      } catch (e) {
        handle.logger.info('Wrong getLatestTxs result parsing')
      }
    }
    resolv({ err: ErrorCode.RESULT_SYNC_GETTXSBYADDRESS_FAILED, data: [] })
  })
}
