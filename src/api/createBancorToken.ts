import { ErrorCode } from "../core/error_code";
import { IfResult, IfContext, checkReceipt, checkFee, checkTokenid, checkTokenFactor, checkTokenNonliquidity, checkCost } from './common';
import { BigNumber } from 'bignumber.js';
import { ValueTransaction } from '../core/value_chain/transaction'

export async function createBancorToken(ctx: IfContext, args: string[]): Promise<IfResult> {
    return new Promise<IfResult>(async (resolve) => {

        if (args.length !== 6 && args.length !== 5) {
            resolve({
                ret: ErrorCode.RESULT_WRONG_ARG,
                resp: "Wrong args number"
            });
            return;
        }
        if (!checkTokenid(args[0])) {
            resolve({
                ret: ErrorCode.RESULT_WRONG_ARG,
                resp: "Wrong token id length [3-12]"
            });
            return;
        }

        try {
            let objPrebalances = JSON.parse(args[1]);
            console.log(objPrebalances);
        } catch (e) {
            console.log(e);
            resolve({
                ret: ErrorCode.RESULT_WRONG_ARG,
                resp: "Wrong preBanlances"
            });
            return;
        }

        if (!checkTokenFactor(args[2])) {
            resolve({
                ret: ErrorCode.RESULT_WRONG_ARG,
                resp: "Wrong factor"
            });
            return;
        }

        // let nonliquidity = undefined;
        // let preBanlances = JSON.parse(args[1]);
        // let cost:

        // no nonliquidity
        if (args.length === 6 && !checkTokenNonliquidity(args[3])) {
            resolve({
                ret: ErrorCode.RESULT_WRONG_ARG,
                resp: "Wrong nonliquidity"
            });
            return;
        }

        // check cost
        if ((args.length === 6 && !checkCost(args[4])) || (args.length === 5 && !checkCost(args[3]))) {
            resolve({
                ret: ErrorCode.RESULT_WRONG_ARG,
                resp: "Wrong cost value"
            });
            return;
        }

        // check fee
        if ((args.length === 6 && !checkFee(args[5])) || (args.length === 5 && !checkFee(args[4]))) {
            resolve({
                ret: ErrorCode.RESULT_WRONG_ARG,
                resp: "Wrong fee value"
            });
            return;
        }

        let tokenid = args[0];
        if (ctx.sysinfo.verbose) {
            console.log(args[1]);
            console.log(typeof args[1]);
        }
        let preBalances = JSON.parse(args[1]);
        let factor = args[2];

        let nonliquidity: string = "";
        if (args.length === 6) {
            nonliquidity = args[3];
        }

        let tx = new ValueTransaction();
        tx.method = 'createBancorToken';

        if (args.length === 5) {
            tx.value = new BigNumber(args[3]);
            tx.fee = new BigNumber(args[4]);
            tx.input = { tokenid, preBalances, factor };
        } else {
            tx.value = new BigNumber(args[4]);
            tx.fee = new BigNumber(args[5]);
            tx.input = { tokenid, preBalances, factor, nonliquidity };
        }

        let { err, nonce } = await ctx.client.getNonce({ address: ctx.sysinfo.address });
        if (err) {
            console.error(`transferTo getNonce failed for ${err}`);
            resolve({
                ret: ErrorCode.RESULT_FAILED,
                resp: `transferTo getNonce failed for ${err}`
            });
            return;
        }

        tx.nonce = nonce! + 1;
        tx.sign(ctx.sysinfo.secret);

        let sendRet = await ctx.client.sendTransaction({ tx });
        if (sendRet.err) {
            console.error(`transferTo failed for ${sendRet.err}`);
            resolve({
                ret: ErrorCode.RESULT_FAILED,
                resp: `transferTo failed for ${sendRet.err}`
            });
            return;
        }

        console.log(`send transferTo tx: ${tx.hash}`);

        // 需要查找receipt若干次，直到收到回执若干次，才确认发送成功, 否则是失败
        let receiptResult = await checkReceipt(ctx, tx.hash);

        resolve(receiptResult); // {resp, ret}
    });
}

export function prnCreateBancorToken(ctx: IfContext, obj: IfResult) {
    console.log(obj.resp);
}
