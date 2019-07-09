import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";
import { SYS_TOKEN_PRECISION } from "./scoop";
import { checkAmount } from "../../../api/common";

/**
 * It's the same with getToken()
 * @param handle 
 * @param {string} args - tokenid
 */
export async function laGetTokenInfo(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    let token: string = args.toUpperCase();

    let result = await handle.pStorageDb.queryTokenTable(token);
    if (result.err === ErrorCode.RESULT_OK) {
      result.data.content = JSON.parse(result.data.content);

      // if (token === 'SYS') {
      //   let result2 = await handle.pStorageDb.querySumOfToken('s');
      //   if (result2.err === 0) {
      //     result.data.content = {
      //       supply: parseFloat(result2.data.nsum),
      //       precision: SYS_TOKEN_PRECISION
      //     }
      //   }
      // }

      resolv(result);
    } else {
      resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENINFO_FAILED, data: {} })
    }
  })
}

/**
 * assert(await storageDB.insertTokenTable('SYS', TOKEN_TYPE.SYS, '-', 0, Buffer.from(JSON.stringify({
      supply: amountAll,
      precision: SYS_TOKEN_PRECISION
    }))), 'save SYS to token table', logger)

 */