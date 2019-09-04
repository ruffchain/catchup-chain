import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode, BigNumber } from "../../../core";
import { TOKEN_TYPE, SYS_TOKEN, HASH_TYPE } from "../../storage/StorageDataBase";
import { queryCallerCreator, txFailHandle } from "./common";

export async function parseRunUserMethod(handler: Synchro, receipt: IfParseReceiptItem): Promise<IFeedBack> {
    let caller = receipt.tx.caller;
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.receipt.cost)
    let creator = receipt.block.coinbase;
    let value = parseFloat(receipt.tx.value)

    handler.logger.info('\n## parseRunUserMethod()');

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, addrLst, time);
    if (feedback.err) {
        return feedback;
    }

    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }

    let [valCaller, valCreator] = [new BigNumber(result.data.valCaller), new BigNumber(result.data.valCreator)];

    if (receipt.tx.input.action === 'doTransfer') {
        return parseDoTransfer(handler, receipt);
    } else {
        feedback = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
        if (feedback.err) {
            return feedback;
        }
    }
    handler.logger.info('\n## parseRunUserMethod() succeed');
    return { err: ErrorCode.RESULT_OK, data: null };
}


// async function checkOtherAction(handler: Synchro, receipt: any): Promise<IFeedBack> {
//     let outAddrLst: { address: string }[] = [];
//     outAddrLst.push({ address: receipt.tx.caller });

//     if (receipt.tx.caller !== receipt.tx.input.to) {
//         outAddrLst.push({ address: receipt.tx.input.to });
//     }

//     let feedback = await handler.updateBalances(SYS_TOKEN, outAddrLst);
//     if (feedback.err) {
//         return feedback;
//     }

//     return { err: ErrorCode.RESULT_OK, data: null };
// }
async function parseDoTransfer(handler: Synchro, receipt: any): Promise<IFeedBack> {
    let mReceipt = receipt.receipt;
    let fee = parseFloat(receipt.receipt.cost);
    let caller = receipt.tx.caller;
    let creator = receipt.block.coinbase;
    let value = parseFloat(receipt.tx.value);

    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }

    let [valCaller, valCreator] = [new BigNumber(result.data.valCaller), new BigNumber(result.data.valCreator)];

    if (receipt.receipt.returnCode !== 0) {
        let feedback = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
        if (feedback.err) {
            return feedback;
        }
        return feedback;
    }

    let receiptLogLst: { from: string, to: string, fromValue: number, toValue: number }[] = [];

    for (let i = 0; i < mReceipt.logs.length; i++) {
        let item = mReceipt.logs[i];
        let from = item.param.from;
        let to = item.param.to;
        let value = parseFloat(item.param.value)
        let fromV = 0;
        let toV = 0

        let feedback = await handler.laQueryAccountTable(from, SYS_TOKEN);
        if (feedback.err) {
            return { err: ErrorCode.RESULT_READ_RECORD_FAILED, data: null }
        }
        fromV = parseFloat(feedback.data);

        feedback = await handler.laQueryAccountTable(to, SYS_TOKEN);
        if (feedback.err) {
            return { err: ErrorCode.RESULT_READ_RECORD_FAILED, data: null }
        }
        toV = parseFloat(feedback.data);

        handler.logger.info('loop :' + i)
        console.log(
            {
                'from': from,
                'to': to,
                'fromValue': fromV - value,
                'toValue': toV + value
            })

        let recept = receiptLogLst[i];
        feedback = await handler.laWriteAccountTable(from, SYS_TOKEN, TOKEN_TYPE.SYS, (fromV - value).toString());
        if (feedback.err) {
            return feedback;
        }

        feedback = await handler.laWriteAccountTable(to, SYS_TOKEN, TOKEN_TYPE.SYS, (toV + value).toString());
        if (feedback.err) {
            return feedback;
        }
    }


    result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }

    let [valCaller1, valCreator1] = [new BigNumber(result.data.valCaller), new BigNumber(result.data.valCreator)];

    // update caller account
    let feedback = await txFailHandle(handler, caller, valCaller1, creator, valCreator1, fee);
    if (feedback.err) {
        return feedback;
    }

    return { err: ErrorCode.RESULT_OK, data: null };

}