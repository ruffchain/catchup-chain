import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { TOKEN_TYPE, SYS_TOKEN, HASH_TYPE } from "../../storage/StorageDataBase";

export async function parseDefaultCommand(handler: Synchro, receipt: IfParseReceiptItem): Promise<IFeedBack> {
    let caller = receipt.tx.caller;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.tx.fee)

    handler.logger.info('\n## parseDefaultCommand()');

    let feedback = await handler.pStorageDb.updateNamesToHashTable([caller], HASH_TYPE.ADDRESS);
    if (feedback.err) {
        return feedback
    }

    // insert into txaddresstable
    feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller], time);
    if (feedback.err) {
        return feedback
    }

    feedback = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, - fee);
    if (feedback.err) {
        return feedback;
    }

    handler.logger.info('\n## parseDefaultCommand() succeed');
    return { err: ErrorCode.RESULT_OK, data: null }
}