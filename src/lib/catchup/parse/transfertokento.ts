import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { SYS_TOKEN } from "../../storage/dbapi/scoop";
import { TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function parseTransferTokenTo(handler: Synchro, receipt: IfParseReceiptItem): Promise<IFeedBack> {

    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    let to = receipt.tx.input.to;
    let amount = parseFloat(receipt.tx.input.amount);
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.tx.fee);

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller, to], time);
    if (feedback.err) {
        return feedback;
    }

    // update caller balance, -fee
    let feedback1 = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -fee);
    if (feedback1.err) {
        handler.logger.error('error laUpdateAccountTable to caller');
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: {} }
    }

    if (receipt.receipt.returnCode === 0) {
        let result = await handler.laUpdateAccountTable(caller, tokenName, TOKEN_TYPE.NORMAL, -amount);
        if (result.err) {
            handler.logger.error('error laUpdateAccountTable minus caller');
            return result;
        }
        result = await handler.laUpdateAccountTable(to, tokenName, TOKEN_TYPE.NORMAL, amount);
        if (result.err) {
            handler.logger.error('error laUpdateAccountTable plus caller');
            return result;
        }

    }
    return { err: ErrorCode.RESULT_OK, data: null }
}