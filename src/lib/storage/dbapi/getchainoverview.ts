import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";



export async function laGetChainOverview(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {


    let nLib = 0;

    // get latestblock
    let result = await handle.pSynchro.getLIBNumber();
    if (result.ret === 200) {
      nLib = parseInt(result.resp!);
    }

    let nLatest = 0;
    // get lib number
    result = await handle.pSynchro.getLastestBlock();
    if (result.ret === 200) {
      try {
        let obj = JSON.parse(result.resp!);
        nLatest = obj.block.number;
      }
      catch (e) {
        handle.logger.error('taskgetchainoverview get latest block JSON parse fail');
      }
    }

    let nTxCount = 0;
    // get tx count
    let result2 = await handle.pStorageDb.queryTxTableCount();
    if (!result2.err) {
      try {
        nTxCount = parseInt(result2.data.count)
      } catch (e) {
        handle.logger.error('taskgetchainoverview get tx count JSON parse fail');
      }
    }
    resolv({
      err: ErrorCode.RESULT_OK, data: {
        blockHeight: nLatest,
        irreversibleBlockHeight: nLib,
        txCount: nTxCount
      }
    });
  });
}
