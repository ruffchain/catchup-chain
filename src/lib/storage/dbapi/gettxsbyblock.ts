import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";



export async function laGetTxsByBlock(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    // getAllRecords()
    let result = await handle.pStorageDb.queryTxTableByBlock(args);
    let arr: any;
    if (result.err === ErrorCode.RESULT_OK) {
      // console.log(result.data)
      try {
        for (let i = 0; i < result.data.length; i++) {
          result.data[i].content = JSON.parse(result.data[i].content);
        }
        arr = result.data;
      } catch (e) {
        handle.logger.info('Wrong getTxsBlock result parsing')
        resolv({ err: ErrorCode.RESULT_SYNC_GETTXSBYBLOCK_FAILED, data: [] })
        return;
      }
      resolv({ err: ErrorCode.RESULT_OK, data: arr })
      return;
    }
    resolv({ err: ErrorCode.RESULT_SYNC_GETTXSBYBLOCK_FAILED, data: [] })
  })
}
