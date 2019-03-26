import { WRQueue } from "../queue";
import { IFeedBack, ErrorCode } from "../../../core";

export async function laGetAccounts(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    let result = await handle.pStorageDb.queryLatestAccountTable();
    if (result.err === ErrorCode.RESULT_OK) {
      resolv(result);
    } else {
      resolv({ err: ErrorCode.RESULT_SYNC_GETACCOUNTS_FAILED, data: [] })
    }
  })
}
