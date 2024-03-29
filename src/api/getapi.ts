import { RPCClient } from '../client/client/rfc_client';
import { ErrorCode } from "../core";
import { IfResult, IfContext } from './common';

const FUNC_NAME = 'view';

export async function getApi(ctx: IfContext, args: string[]): Promise<IfResult> {
  return new Promise<IfResult>(async (resolve) => {

    // check args

    let params =
    {
      method: args[0],
      params: args[1],
    };
    let cr = await ctx.client.callAsync(FUNC_NAME, params);
    if (ctx.sysinfo.verbose) {
      console.log(cr);
    }

    resolve(cr);
  });
}
export function prnGetMiners(ctx: IfContext, obj: IfResult) {
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
    if (objJson.err === 0) {
      objJson.value.forEach((element: string) => {
        console.log(element.slice(1));
      });
    }
  } catch (e) {
    console.log(e);
  }
}
