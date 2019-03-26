import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";



export async function laGetLatestTxCount(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    handle.logger.info('taskGetLatestTxCount');
    let obj: any;
    try {
      obj = JSON.parse(JSON.stringify(args));
      let nFrom = new Date(obj.from).getTime();
      let nTo = new Date(obj.to).getTime();

      let nTxCount = 0;

      let result2 = await handle.pStorageDb.queryTxTableByDatetime(nFrom, nTo);
      if (!result2.err) {
        try {
          nTxCount = parseInt(result2.data.count)

          resolv({
            err: ErrorCode.RESULT_OK,
            data: {
              txCount: nTxCount
            }
          });
          return;
        } catch (e) {
          handle.logger.error('taskGetLatestTxCount get tx count JSON parse fail');
        }
      }
    } catch (e) {
      handle.logger.error('taskGetLatestTxCount input JSON parse fail');
    }
    handle.logger.info('taskGetLatestTxCount failed')
    resolv({ err: ErrorCode.RESULT_SYNC_PARSE_JSON_QUERY_FAILED, data: [] })


  })
}
