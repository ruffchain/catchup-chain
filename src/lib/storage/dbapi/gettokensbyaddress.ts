import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";



export async function laGetTokensByAddress(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    let arr: any;

    let result = await handle.pStorageDb.queryAccountTableByAddress(args);
    if (result.err === ErrorCode.RESULT_OK) {
      arr = result.data;
      resolv({ err: ErrorCode.RESULT_OK, data: arr })
      return;
    }
    resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENBYADDRESS_FAILED, data: [] })
  })
}
