import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";
import { localCache } from "../../catchup/localcache";

// function transformContent(arr: any[]) {
//   for (let i = 0; i < arr.length; i++) {
//     arr[i].content = JSON.parse(arr[i].content.toString())
//   }
// }

/**
 * Query multiple tx at a time
 * @param handle 
 * @param {{page:number, pageSize:number}| null}args 
 */
export async function laGetTxs(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {

    let result: any;
    let arr: any;

    if (args === "" || args === {} || args === undefined) {
      // getAllRecords()
      result = await handle.pStorageDb.queryLatestTxTable();
      if (result.err === ErrorCode.RESULT_OK) {

        for (let i = 0; i < result.data.length; i++) {
          result.data[i].content = JSON.parse(result.data[i].content);
          // console.log(JSON.parse(result.data[i].content))
        }
        arr = result.data;
        let result1 = await handle.pStorageDb.queryTxTableCount();
        let newObj: any;
        newObj = {};
        newObj.data = result.data;
        newObj.total = parseInt(result1.data.count)

        resolv({ err: ErrorCode.RESULT_OK, data: newObj })
        return;
      }
    } else {
      try {
        let argsObj = JSON.parse(JSON.stringify(args));

        // if it can be read from localCache
        if (argsObj.page === 1 && argsObj.pageSize < localCache.MAX_PAGESIZE) {
          let mData = {
            data: localCache.getTxs.data.slice(0, argsObj.pageSize),
            total: localCache.getTxs.total
          }
          resolv({
            err: ErrorCode.RESULT_OK,
            data: mData
          });
          return;
        }
        //////////////////////////////////

        result = await handle.pStorageDb.queryTxTableByPage(
          (argsObj.page > 0) ? (argsObj.page - 1) : 0, argsObj.pageSize);

        if (result.err === ErrorCode.RESULT_OK) {

          for (let i = 0; i < result.data.length; i++) {
            handle.logger.info('getTxs:', i)
            // console.log(JSON.parse(result.data[i].content.toString()))
            result.data[i].content = JSON.parse(result.data[i].content);

          }
          arr = result.data;
          let result1 = await handle.pStorageDb.queryTxTableCount();
          let newObj: any;
          newObj = {};
          newObj.data = result.data;
          newObj.total = parseInt(result1.data.count)

          resolv({ err: ErrorCode.RESULT_OK, data: newObj })
          return;
        }
      } catch (e) {
        handle.logger.error('Wrong getTxs ARGS');
      }
    }
    resolv({ err: ErrorCode.RESULT_SYNC_GETTXS_FAILED, data: [] })
  })
}
