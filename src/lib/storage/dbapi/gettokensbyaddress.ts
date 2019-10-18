import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";
import { SYS_NAME } from "./scoop";


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

      let arr2: any[] = [];

      for (let i = 0; i < arr.length; i++) {
        arr[i].amount = parseFloat(arr[i].amount)
        if (arr[i].token === 's') {
          // arr[i].token = 'SYS'
          arr[i].token = SYS_NAME
          arr2.push(arr[i]);
        }
      }

      for (let i = 0; i < arr.length; i++) {
        if (arr[i].token !== SYS_NAME) {
          arr2.push(arr[i]);
        }
      }

      resolv({ err: ErrorCode.RESULT_OK, data: arr2 })
      return;
    }
    resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENBYADDRESS_FAILED, data: [] })
  })
}
