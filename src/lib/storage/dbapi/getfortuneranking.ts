import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";
import { resolve } from "dns";
import { SYS_NAME } from "./scoop";


/**
 * Get token holding ranking list
 * @param handle 
 * @param {string} args - tokenid
 */
export async function laGetFortuneRanking(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {

    // check account table, 
    let result: any;

    if (typeof args === 'string') { // tokenName
      if (args === 's' || args === 'SYS' || args === 'sys' || args === 'ruff' || args === 'Ruff' || args === 'RUFF') {
        args = 's';
      } else {
        args = args.toUpperCase();
      }
      // getAllRecords()
      result = await handle.pStorageDb.queryFortuneRanking(args);

      handle.logger.info('getFortuneRanking 1 string')
      console.log(result);

      if (result.err === ErrorCode.RESULT_OK) {
        for (let i = 0; i < result.data.length; i++) {
          if (result.data[i].token === 's') {
            // result.data[i].token = 'SYS'
            result.data[i].token = SYS_NAME
            break
          }
        }
      }
      handle.logger.info('getFortuneRanking 2 string')
      console.log(result);

    } else if (typeof args === 'object') {

      let tokenName: string;
      let page: number;
      let pageSize: number;

      try {
        tokenName = args.token.toUpperCase();
        page = (args.page > 0) ? (args.page - 1) : 0;
        pageSize = args.pageSize;

      } catch (e) {
        handle.logger.error('taskGetFortuneRanking failed')
        result = { err: ErrorCode.RESULT_SYNC_GETFORTUNERANKING_PARSING_FAILED, data: [] }
        return;
      }

      if (tokenName === 'sys' || tokenName === 'SYS' || tokenName === 'ruff' || tokenName === 'Ruff' || tokenName === 'RUFF') {
        tokenName = 's';
      }
      result = await handle.pStorageDb.queryFortuneRankingByPage(tokenName, page, pageSize);

      if (result.err === ErrorCode.RESULT_OK && tokenName === 's') {
        for (let i = 0; i < result.data.length; i++) {
          if (result.data[i].token === 's') {
            // result.data[i].token = 'SYS'
            result.data[i].token = SYS_NAME
            break
          }
        }
      }

      let result2 = await handle.pStorageDb.queryAccountTotalByToken(tokenName);
      let total = parseInt(result2.data.count);
      let newObj: any = {}
      newObj.total = total;
      newObj.data = result.data;

      resolv({ err: ErrorCode.RESULT_OK, data: newObj });
      return;

    } else {
      result = { err: ErrorCode.RESULT_SYNC_GETFORTUNERANKING_PARSING_FAILED, data: [] }
    }
    resolv(result);
  })

}
