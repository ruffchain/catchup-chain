import { WRQueue } from "../queue";
import { IFeedBack, ErrorCode } from "../../../core";
import { SYS_NAME } from "./scoop";

/**
 * Get accounts info by an arrary of addresses
 * @param {WRQueue} handle 
 * @param {string[]} args 
 */
export async function laGetAccounts(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    // getAllRecords()
    let result = await handle.pStorageDb.queryLatestAccountTable();
    if (result.err === ErrorCode.RESULT_OK) {
      let arr = result.data;

      for (let i = 0; i < arr.length; i++) {
        arr[i].amount = parseFloat(arr[i].amount);

        if (arr[i].token === 's') {
          // arr[i].token = 'SYS'
          arr[i].token = SYS_NAME
        }
      }

      resolv({ err: ErrorCode.RESULT_OK, data: arr })
    } else {
      resolv({ err: ErrorCode.RESULT_SYNC_GETACCOUNTS_FAILED, data: [] })
    }
  })
}
