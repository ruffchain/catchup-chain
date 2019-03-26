import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";



export async function laGetToken(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    let token = args;
    let result = await handle.pStorageDb.queryTokenTable(token);
    if (result.err === ErrorCode.RESULT_OK) {
      resolv(result);
    } else {
      resolv({ err: ErrorCode.RESULT_SYNC_GETTOKEN_FAILED, data: [] })
    }
  })
}
