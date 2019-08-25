import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { SYS_TOKEN } from "../../storage/dbapi/scoop";
import { TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function parseRunUserMethod(handler: Synchro, receipt: IfParseReceiptItem): Promise<IFeedBack> {
    let caller = receipt.tx.caller;
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.receipt.cost);

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
    let addrLst: string[] = [receipt.tx.caller, receipt.tx.input.to];
    let mReceipt = receipt.receipt;
    let fee = parseFloat(receipt.receipt.cost);
    let caller = receipt.tx.caller;

    let feedback = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -fee);
    if (feedback.err) {
        return feedback;
    }

    if (receipt.receipt.returnCode !== 0) {
        return { err: ErrorCode.RESULT_OK, data: null };
    }

    for (let i = 0; i < mReceipt.logs.length; i++) {
        let item = mReceipt.logs[i];
        let from = item.param.from;
        let to = item.param.to;
        let value = parseFloat(item.param.value)

        let feedback = await handler.laUpdateAccountTable(from, SYS_TOKEN, TOKEN_TYPE.SYS, value);
        if (feedback.err) {
            return feedback;
        }

        feedback = await handler.laUpdateAccountTable(to, SYS_TOKEN, TOKEN_TYPE.SYS, value);
        if (feedback.err) {
            return feedback;
        }
    }

    return { err: ErrorCode.RESULT_OK, data: null };
}