import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";
import { localCache } from "../../catchup/localcache";


/**
 * 
 * @param handle 
 * @param {string} args  - 
 * @returns {{err:number, data:{blockHeight:number, irreversibleBlockHeight:number, txCount:number }}} - 
 */
export async function laGetChainOverview(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    resolv({
      err: ErrorCode.RESULT_OK, data: localCache.getChainOverview
    });
  });
}
