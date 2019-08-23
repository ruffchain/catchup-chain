import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { SYS_TOKEN } from "../../storage/dbapi/scoop";
import { TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function parseDefaultCommand(handler: Synchro, receipt: IfParseReceiptItem): Promise<IFeedBack> {
    let caller = receipt.tx.caller;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let fee = receipt.tx.fee

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller], time);
    if (feedback.err) {
        return feedback
    }

    feedback = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, - fee);
    if (feedback.err) {
        return feedback;
    }
    return { err: ErrorCode.RESULT_OK, data: null }
}