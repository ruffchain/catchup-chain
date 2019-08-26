import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { TOKEN_TYPE, SYS_TOKEN } from "../../storage/StorageDataBase";

export async function parseRunUserMethod(handler: Synchro, receipt: IfParseReceiptItem): Promise<IFeedBack> {
    let caller = receipt.tx.caller;
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.receipt.cost);

    handler.logger.info('\n## parseRunUserMethod()');

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, addrLst, time);
    if (feedback.err) {
        return feedback;
    }

    if (receipt.tx.input.action === 'doTransfer') {
        return checkDoTransfer(handler, receipt);
    } else {
        feedback = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, - fee);
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
async function checkDoTransfer(handler: Synchro, receipt: any): Promise<IFeedBack> {
    let mReceipt = receipt.receipt;
    let fee = parseFloat(receipt.receipt.cost);
    let caller = receipt.tx.caller;

    if (receipt.receipt.returnCode !== 0) {
        let feedback = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -fee);
        if (feedback.err) {
            return feedback;
        }
        return feedback;
    }
    // return code === 0
    let feedback = await handler.laQueryAccountTable(caller, SYS_TOKEN);
    if (feedback.err) {
        handler.logger.error('query account table fail');
        return feedback;
    }
    let valCaller = feedback.data;

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
        fromV = feedback.data;

        feedback = await handler.laQueryAccountTable(to, SYS_TOKEN);
        if (feedback.err) {
            return { err: ErrorCode.RESULT_READ_RECORD_FAILED, data: null }
        }
        toV = feedback.data;

        receiptLogLst.push(
            {
                'from': from,
                'to': to,
                'fromValue': fromV - value,
                'toValue': toV + value
            })
    }


    await handler.pStorageDb.execRecord('BEGIN', {});

    await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller - fee);

    for (let i = 0; i < receiptLogLst.length; i++) {
        let recept = receiptLogLst[i];
        let feedback = await handler.laWriteAccountTable(recept.from, SYS_TOKEN, TOKEN_TYPE.SYS, recept.fromValue);

        feedback = await handler.laWriteAccountTable(recept.to, SYS_TOKEN, TOKEN_TYPE.SYS, recept.toValue);
    }
    // update caller account
    await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller - fee);

    let hret = await handler.pStorageDb.execRecord('COMMIT', {})

    if (hret.err) {
        await handler.pStorageDb.execRecord('ROLLBACK', {})
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
    } else {
        return { err: ErrorCode.RESULT_OK, data: null };
    }

}