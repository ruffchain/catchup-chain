import { WRQueue } from "../queue";
import { IFeedBack, ErrorCode } from "../../../core";

export async function laGetAccount(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    let result = await handle.pStorageDb.queryAllAccountTableByAddress(args);
    if (result.err === ErrorCode.RESULT_OK) {
      resolv(result);
    } else {
      resolv({ err: ErrorCode.RESULT_SYNC_GETACCOUNT_FAILED, data: [] })
    }
  })
}
