import { RPCClient } from '../client/client/rfc_client';
import { ErrorCode } from "../core";
import { IfResult, IfContext, checkAddressArray } from './common';
import * as colors from 'colors';

const FUNC_NAME = 'view';

export async function getBalances(ctx: IfContext, args: string[]): Promise<IfResult> {
  return new Promise<IfResult>(async (resolve) => {
    let params: any;
    // check args
    if (args.length < 1) {
      resolve({
        ret: ErrorCode.RESULT_WRONG_ARG,
        resp: "Wrong args"
      });
      return;
    }
    if (!checkAddressArray(args[0])) {
      resolve({
        ret: ErrorCode.RESULT_WRONG_ARG,
        resp: "Wrong addresses, no space in address array"
      });
      return;
    }
    let addrs = JSON.parse(args[0]);
    // console.log('args[0]:', typeof args[0])
    // console.log(args[0])
    // console.log('addrs:')
    // console.log(addrs);

    params =
      {
        method: 'getBalances',
        params: { addresses: addrs }
      }


    let cr = await ctx.client.callAsync(FUNC_NAME, params);

    if (ctx.sysinfo.verbose) {
      console.log(cr);
    }

    resolve(cr);
  });
}
export function prnGetBalances(ctx: IfContext, obj: IfResult) {
  if (ctx.sysinfo.verbose) {
    console.log(obj);
  }

  console.log('');

  if (!obj.resp) {
    console.log('Wrong result: ');
    return;
  }
  let objJson: any;
  try {
    objJson = JSON.parse(obj.resp);
    // console.log(colors.green(`${sysTokenSym}`), ":", formatNumber(objJson.value))
    console.log(objJson);
  } catch (e) {
    console.log(e);
  }
}
