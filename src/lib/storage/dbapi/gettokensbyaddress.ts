import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";


/**
 * Query some address's token holding info
 * @param handle 
 * @param {string} args - address
 */
export async function laGetTokensByAddress(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    let arr: any;

    // getRecords()
    let result = await handle.pStorageDb.queryAccountTableByAddress(args);
    if (result.err === ErrorCode.RESULT_OK) {
      arr = result.data;

      for (let i = 0; i < arr.length; i++) {
        arr[i].amount = parseFloat(arr[i].amount)
        if (arr[i].token === 's') {
          arr[i].token = 'SYS'
        }
      }

      resolv({ err: ErrorCode.RESULT_OK, data: arr })
      return;
    }
    resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENBYADDRESS_FAILED, data: [] })
  })
}
