import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";


/**
 * @param {WRQue} handle - 
 * @param {string |{page:number, pageIndex:number}} args - blocks index
 */
export async function laLatestBlocks(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {

    let result: any;
    if (!args) {
      // getAllRecords()
      result = await handle.pStorageDb.queryLatestBlockTable();
      if (result.err === ErrorCode.RESULT_OK) {

        let result1 = await handle.pStorageDb.queryBlockTotal();
        let newObj: any;
        newObj = {};
        newObj.data = result.data;
        newObj.total = parseInt(result1.data.count)
        resolv({ err: ErrorCode.RESULT_OK, data: newObj });
        return;
      }
    } else {
      try {
        let argsObj = JSON.parse(JSON.stringify(args));
        result = await handle.pStorageDb.queryBlockTableByPage(
          (argsObj.page > 0) ? (argsObj.page - 1) : 0, argsObj.pageSize);

        if (result.err === ErrorCode.RESULT_OK) {
          // 
          let result1 = await handle.pStorageDb.queryBlockTotal();
          let newObj: any;
          newObj = {};
          newObj.data = result.data;
          newObj.total = parseInt(result1.data.count)
          resolv({ err: ErrorCode.RESULT_OK, data: newObj });
          return;
        }
      } catch (e) {
        handle.logger.error('Wrong getLatestBlocks ARGS');
      }
    }
    resolv({ err: ErrorCode.RESULT_SYNC_GETLATESTBLOCK_FAILED, data: [] })
  })
}
