import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";



export async function laGetTokenInfo(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    let token = args.toUpperCase();
    if (token === 'SYS') {
      resolv({ err: ErrorCode.RESULT_OK, data: { name: 'SYS', type: 'SYS Token', address: '-', timestamp: 0 } })
      return;
    }
    let result = await handle.pStorageDb.queryTokenTable(token);
    if (result.err === ErrorCode.RESULT_OK) {
      resolv(result);
    } else {
      resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENINFO_FAILED, data: [] })
    }
  })
}
