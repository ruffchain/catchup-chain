import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";


/**
 * Quicker way to get token price
 * @param handle 
 * @param {string} args - tokenid
 */
export async function laGetTokenPrice(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    // compute token price 
    // Price = R/SF
    // or SF/R, supply.F/reserve, 
    let F: number;
    let S: number;
    let R: number;

    let token: string = args.toUpperCase();

    let result = await handle.pStorageDb.queryBancorTokenTable(token);

    if (result.err) {
      resolv(result);
      return;
    } else {
      F = result.data.factor;
      S = parseFloat(result.data.supply);
      R = parseFloat(result.data.reserve);

      if (F === 1) {
        result.data.price = 1;
      } else {
        result.data.price = S * F / R;
      }
    }
    resolv({ err: ErrorCode.RESULT_OK, data: result.data })
  })
}
