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
// export async function laGetChainOverview(handle: WRQueue, args: any) {
//   return new Promise<IFeedBack>(async (resolv) => {
//     let nLib = 0;

//     // get latestblock
//     let result = await handle.pSynchro.getLIBNumber();
//     if (result.ret === 200) {
//       nLib = parseInt(result.resp!);
//     }

//     let nLatest = 0;
//     // get lib number
//     result = await handle.pSynchro.getLastestBlock();
//     if (result.ret === 200) {
//       try {
//         let obj = JSON.parse(result.resp!);
//         nLatest = obj.block.number;
//       }
//       catch (e) {
//         handle.logger.error('taskgetchainoverview get latest block JSON parse fail');
//         resolv({ err: ErrorCode.RESULT_SYNC_GETCHAINOVERVIEW_FAILED, data: {} });
//         return;
//       }
//     }

//     let nTxCount = 0;
//     // get tx count
//     let result2 = await handle.pStorageDb.queryTxTableCount();
//     if (result2.err) {
//       handle.logger.error('taskgetchainoverview get tx count fail');
//       resolv({ err: ErrorCode.RESULT_SYNC_GETCHAINOVERVIEW_FAILED, data: {} });
//       return;
//     }
//     try {
//       nTxCount = parseInt(result2.data.count)
//     } catch (e) {
//       handle.logger.error('taskgetchainoverview get tx count JSON parse fail');
//       resolv({ err: ErrorCode.RESULT_SYNC_GETCHAINOVERVIEW_FAILED, data: {} });
//       return;
//     }


//     let nUserCount = 0;
//     let result3 = await handle.pStorageDb.queryUserCount();
//     if (result3.err) {
//       handle.logger.error('taskgetchainoverview get user count fail');
//       resolv({ err: ErrorCode.RESULT_SYNC_GETCHAINOVERVIEW_FAILED, data: {} });
//       return;
//     }
//     try {
//       nUserCount = parseInt(result3.data.count)
//     } catch (e) {
//       handle.logger.error('taskgetchainoverview get user count JSON parse fail');
//       resolv({ err: ErrorCode.RESULT_SYNC_GETCHAINOVERVIEW_FAILED, data: {} });
//       return;
//     }

//     resolv({
//       err: ErrorCode.RESULT_OK, data: {
//         blockHeight: nLatest,
//         irreversibleBlockHeight: nLib,
//         txCount: nTxCount,
//         userCount: nUserCount,
//       }
//     });
//   });
// }
