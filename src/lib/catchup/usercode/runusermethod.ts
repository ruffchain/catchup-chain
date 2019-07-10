import { Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { SYS_TOKEN } from "../../storage/StorageDataBase";

export async function checkRunUserMethod(handler: Synchro, receipt: any): Promise<IFeedBack> {

    let caller = receipt.tx.caller;
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;

    // if(receipt.tx.method)

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, addrLst, time);
    if (feedback.err) {
        return feedback;
    }

    if (receipt.tx.input.action === 'doTransfer') {
        return checkDoTransfer(handler, receipt);
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