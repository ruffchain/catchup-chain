import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";

function transformContent(arr: any[]) {
  for (let i = 0; i < arr.length; i++) {
    arr[i].content = JSON.parse(arr[i].content.toString())
  }
}

export async function laGetTxs(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {

    let result: any;
    let arr: any;

    if (args === "" || args === {} || args === undefined) {
      result = await handle.pStorageDb.queryLatestTxTable();
      if (result.err === ErrorCode.RESULT_OK) {

        for (let i = 0; i < result.data.length; i++) {
          result.data[i].content = JSON.parse(result.data[i].content);
          // console.log(JSON.parse(result.data[i].content))
        }
        arr = result.data;
        resolv({ err: ErrorCode.RESULT_OK, data: arr })
        return;
      }
    } else {
      try {
        let argsObj = JSON.parse(JSON.stringify(args));
        result = await handle.pStorageDb.queryTxTableByPage(
          (argsObj.page > 0) ? (argsObj.page - 1) : 0, argsObj.pageSize);

        if (result.err === ErrorCode.RESULT_OK) {

          for (let i = 0; i < result.data.length; i++) {
            console.log('getTxs:', i)
            // console.log(JSON.parse(result.data[i].content.toString()))
            result.data[i].content = JSON.parse(result.data[i].content);

          }
          arr = result.data;
          resolv({ err: ErrorCode.RESULT_OK, data: arr })
          return;
        }
      } catch (e) {
        handle.logger.error('Wrong getTxs ARGS');
      }
    }
    resolv({ err: ErrorCode.RESULT_SYNC_GETTXS_FAILED, data: [] })
  })
}
