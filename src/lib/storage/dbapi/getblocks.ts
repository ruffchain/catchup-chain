import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";



export async function laGetBlocks(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    // GetAllRecords()
    let result = await handle.pStorageDb.queryLatestBlockTable();
    if (result.err === ErrorCode.RESULT_OK) {
      resolv(result);
    }
    else {
      resolv({ err: ErrorCode.RESULT_SYNC_GETBLOCKS_FAILED, data: [] })
    }
  })
}
