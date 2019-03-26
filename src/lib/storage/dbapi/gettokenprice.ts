import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";



export async function laGetTokenPrice(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    // compute token price 
    // Price = R/SF
    // or SF/R, supply.F/reserve, 
    let F: number;
    let S: number;
    let R: number;

    let token = args;

    try {
      let result = await handle.pSynchro.getFactor(token);
      if (result.ret !== 200) {
        resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENPRICE_PARSING_FAILED, data: [] });
        return;
      }
      // logger.info(result);
      let obj = JSON.parse(result.resp!.toString());
      //logger.info(obj.value);
      F = parseFloat(obj.value.replace('n', ''))
      // logger.info('\n')

      result = await handle.pSynchro.getReserve(token);
      if (result.ret !== 200) {
        resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENPRICE_PARSING_FAILED, data: [] });
        return;
      }
      obj = JSON.parse(result.resp!.toString());
      R = parseFloat(obj.value.replace('n', ''))


      result = await handle.pSynchro.getSupply(token);
      if (result.ret !== 200) {
        resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENPRICE_PARSING_FAILED, data: [] });
        return;
      }
      obj = JSON.parse(result.resp!.toString());
      S = parseFloat(obj.value.replace('n', ''))

      let price: number = S * F / R;

      resolv({ err: ErrorCode.RESULT_OK, data: price.toFixed(6) });
      return;

    } catch (e) {
      handle.logger.error('')
    }
    resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENPRICE_PARSING_FAILED, data: [] });

  })
}
