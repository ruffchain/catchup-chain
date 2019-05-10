import { IFeedBack, ErrorCode, BigNumber } from "../../../core";
import { WRQueue } from "../queue";
import { NORMAL_TOKEN_PRECISION } from "./scoop";

/**
 * Get BancorToken parameters, Factor, Supply, Reserve, latest value
 * @param handle 
 * @param {string[]} args 
 */
export async function laGetSysByToken(handle: WRQueue, args: any) {
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
      console.log('args:', argsObj);

    } catch (e) {
      console.log('args parsing wrong :', e);
      resolv({
        err: ErrorCode.RESULT_SYNC_GETSELLTOKENGAIN_FAILED,
        data: null
      });
      return;
    }

    console.log('Yang laGetsysbytoken:', tokenid, ' and ', num);


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
      // To make the displayed Reserve value to be fixed 
      R = new BigNumber(result.data.reserve);
      // result.data.price = S * F / R;
    }

    let e = new BigNumber(num);
    let out: BigNumber;

    out = e.dividedBy(S);
    out = new BigNumber(1).minus(out);
    let temp1 = out.toNumber();
    out = new BigNumber(Math.pow(temp1, 1 / F.toNumber()));
    out = new BigNumber(1).minus(out);
    out = out.multipliedBy(R);

    console.log('Yang-- reserve minus:', out.toString());
    console.log('Yang-- supply minus:', e.toString());

    resolv({
      err: ErrorCode.RESULT_OK,
      data: out.toNumber()
    })

  })
}
