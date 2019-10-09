import { WRQueue } from "../queue";
import { IFeedBack, ErrorCode } from "../../../core";
import { SYS_NAME } from "./scoop";

/**
 * Get Account info, tokens in hand
 * @param {WRQueue} handle 
 * @param  {string} args - account address
 */
export async function laGetAccount(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    // getAllRecords()
    let result = await handle.pStorageDb.queryAllAccountTableByAddress(args);
    if (result.err === ErrorCode.RESULT_OK) {
      let arr = result.data;

      for (let i = 0; i < arr.length; i++) {
        // Yang Jun 2019-9-3
        arr[i].amount = parseFloat(arr[i].amount);

        if (arr[i].token === 's') {
          // arr[i].token = 'SYS'
          // 2019-10-09
          arr[i].token = SYS_NAME;
        }
      }

      resolv({ err: ErrorCode.RESULT_OK, data: arr });
    } else {
      resolv({ err: ErrorCode.RESULT_SYNC_GETACCOUNT_FAILED, data: [] })
    }
  })
}
