import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { SYS_TOKEN } from "../../storage/dbapi/scoop";
import { TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function parseRunUserMethod(handler: Synchro, receipt: IfParseReceiptItem): Promise<IFeedBack> {
    let caller = receipt.tx.caller;
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;
    let fee = receipt.tx.fee;

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


async function checkOtherAction(handler: Synchro, receipt: any): Promise<IFeedBack> {
    let outAddrLst: { address: string }[] = [];
    outAddrLst.push({ address: receipt.tx.caller });

    if (receipt.tx.caller !== receipt.tx.input.to) {
        outAddrLst.push({ address: receipt.tx.input.to });
    }

    let feedback = await handler.updateBalances(SYS_TOKEN, outAddrLst);
    if (feedback.err) {
        return feedback;
    }

    return { err: ErrorCode.RESULT_OK, data: null };
}
async function checkDoTransfer(handler: Synchro, receipt: any): Promise<IFeedBack> {
    let addrLst: string[] = [receipt.tx.caller, receipt.tx.input.to];
    let mReceipt = receipt.receipt;

    mReceipt.logs.forEach((item: any) => {
        addrLst.push(item.param.from);
        addrLst.push(item.param.to)
    })

    // remove redundant addresses
    let uniqAddrLst: string[] = [];
    addrLst.forEach((item) => {
        if (uniqAddrLst.indexOf(item) === -1) {
            uniqAddrLst.push(item);
        }
    })

    let outAddrLst: { address: string }[] = [];
    uniqAddrLst.forEach((item: string) => {
        outAddrLst.push({ address: item });
    })

    let feedback = await handler.updateBalances(SYS_TOKEN, outAddrLst);
    if (feedback.err) {
        return feedback;
    }

    return { err: ErrorCode.RESULT_OK, data: null };
}