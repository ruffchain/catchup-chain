import { IFeedBack, ErrorCode, BigNumber } from "../../../core";
import { WRQueue } from "../queue";
import { NORMAL_TOKEN_PRECISION } from "./scoop";

/**
 * Get BuyTokenCost()
 * @param handle 
 * @param {string[]} args 
 */
export async function laGetTokenBySys(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    // compute token price 
    // Price = R/SF
    // or SF/R, supply.F/reserve, 
    let tokenid: string;
    let num: number;
    try {
      let argsObj = JSON.parse(JSON.stringify(args));
      tokenid = argsObj.tokenid.totoUpperCase();
      num = argsObj.amount;

    } catch (e) {
      resolv({
        err: ErrorCode.RESULT_SYNC_GETBUYTOKENCOST_FAILED,
        data: null
      });
      return;
    }


    let F: BigNumber;
    let S: BigNumber;
    let R: BigNumber;

    let result = await handle.pStorageDb.queryBancorTokenTable(tokenid);

    if (result.err) {
      resolv({ err: ErrorCode.RESULT_DB_RECORD_EMPTY, data: null });
      return;
    } else {
      F = new BigNumber(result.data.factor);
      S = new BigNumber(result.data.supply);
      R = new BigNumber(result.data.reserve);
    }
    // To calculate the cost
    let e = new BigNumber(num);
    let out: BigNumber;

    out = e.dividedBy(R);
    out = out.plus(new BigNumber(1.0));
    let temp1 = out.toNumber();
    console.log('temp1:', temp1);
    console.log('F:', F.toNumber());
    console.log('math.pow:', Math.pow(temp1, F.toNumber()));

    out = new BigNumber(Math.pow(temp1, F.toNumber()));

    out = out.minus(new BigNumber(1));
    out = out.multipliedBy(S);

    console.log('Yang-- supply plus:', out.toString());
    console.log('Yang-- reserve plus:', e.toString());

    resolv({
      err: ErrorCode.RESULT_OK,
      data: out.toNumber()
    })

  })
}
