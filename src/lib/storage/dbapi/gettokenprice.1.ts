import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";


/**
 * Abandoned API.
 * @param handle 
 * @param args 
 */
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
        resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENPRICE_PARSING_FAILED, data: '' });
        return;
      } else {
        handle.logger.info(token, 'getTokenPrice F:', result)
      }
      // logger.info(result);
      let obj = JSON.parse(result.resp!.toString());
      //logger.info(obj.value);
      F = parseFloat(obj.value.replace('n', ''))
      // logger.info('\n')
      if (F === 0) {
        resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENPRICE_PARSING_FAILED, data: '' });
        return;
      }

      result = await handle.pSynchro.getReserve(token);
      if (result.ret !== 200) {
        resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENPRICE_PARSING_FAILED, data: '' });
        return;
      } else {
        handle.logger.info('getTokenPrice R:', result)
      }
      obj = JSON.parse(result.resp!.toString());
      R = parseFloat(obj.value.replace('n', ''))


      result = await handle.pSynchro.getSupply(token);
      if (result.ret !== 200) {
        resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENPRICE_PARSING_FAILED, data: '' });
        return;
      } else {
        handle.logger.info('getTokenPrice S:', result)
      }

      obj = JSON.parse(result.resp!.toString());
      S = parseFloat(obj.value.replace('n', ''))

      let price: number = S * F / R;

      handle.logger.info('getTokenPrice price:', price)

      resolv({ err: ErrorCode.RESULT_OK, data: price.toFixed(6) });
      return;

    } catch (e) {
      handle.logger.error('getTokenPrice  error caught', e)
      resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENPRICE_PARSING_FAILED, data: '' });
    }

  })
}
