import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";

/**
 * It's the same with getToken()
 * @param handle 
 * @param {string} args - tokenid
 */
export async function laGetTokenInfo(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    let token: string = args.toUpperCase();

    let result = await handle.pStorageDb.queryTokenTable(token);
    if (result.err === ErrorCode.RESULT_OK) {
      result.data.content = JSON.parse(result.data.content);
      resolv(result);
    } else {
      resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENINFO_FAILED, data: {} })
    }
  })
}
