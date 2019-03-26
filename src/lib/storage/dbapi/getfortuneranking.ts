import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";



export async function laGetFortuneRanking(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {

    // check account table, 
    let result: any;
    if (typeof args === 'string') { // tokenName
      if (args === 's' || args === 'SYS' || args === "sys") {
        args = "s";
      }
      result = await handle.pStorageDb.queryFortuneRanking(args);
    } else if (typeof args === 'object') {
      try {
        let tokenName: string = args.token;
        let page: number = (args.page > 0) ? (args.page - 1) : 0;
        let pageSize: number = args.pageSize;
        result = await handle.pStorageDb.queryFortuneRankingByPage(tokenName, page, pageSize);

        let result2 = await handle.pStorageDb.queryAccountTotalByToken(tokenName);
        let total = parseInt(result2.data.count);
        let newObj: any = {}
        newObj.total = total;
        newObj.data = result.data;

        resolv({ err: ErrorCode.RESULT_OK, data: newObj });
        return;
      } catch (e) {
        handle.logger.error('taskGetFortuneRanking failed')
        result = { err: ErrorCode.RESULT_SYNC_GETFORTUNERANKING_PARSING_FAILED, data: [] }
      }
    } else {
      result = { err: ErrorCode.RESULT_SYNC_GETFORTUNERANKING_PARSING_FAILED, data: [] }
    }

    resolv(result);
  })
}
