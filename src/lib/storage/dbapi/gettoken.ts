import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";


/**
 * Return token info when created
 * @param handle 
 * @param {string} args - tokenid
 */
export async function laGetToken(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    let token: string = args;
    // getRecord
    let result = await handle.pStorageDb.queryTokenTable(token.toUpperCase());
    if (result.err === ErrorCode.RESULT_OK) {
      resolv(result);
    } else {
      resolv({ err: ErrorCode.RESULT_SYNC_GETTOKEN_FAILED, data: {} })
    }
  })
}
