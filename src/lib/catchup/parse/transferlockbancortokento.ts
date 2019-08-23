import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { SYS_TOKEN } from "../../storage/dbapi/scoop";
import { TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function parseTransferLockBancorTokenTo(handler: Synchro, receipt: IfParseReceiptItem, tokenType: string): Promise<IFeedBack> {

    handler.logger.info('parseTransferLockBancorTokenTo -->');

    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    let to = receipt.tx.input.to;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let fee = receipt.tx.fee;
    let amount = parseFloat(receipt.tx.input.amount);

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller, to], time);
    if (feedback.err) {
        return feedback;
    }

    // update caller balance
    feedback = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -fee);
    if (feedback.err) {
        return feedback;
    }

    if (receipt.receipt.returnCode === 0) {

        let result = await handler.laUpdateAccountTable(caller, tokenName, tokenType, -amount);
        if (result.err) {
            handler.logger.error('error laUpdateAccountTable minus caller');
            return result;
        }
        result = await handler.laUpdateAccountTable(to, tokenName, tokenType, amount);
        if (result.err) {
            handler.logger.error('error laUpdateAccountTable plus caller');
            return result;
        }
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}