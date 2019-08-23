import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { HASH_TYPE, SYS_TOKEN, TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function parseVote(handler: Synchro, recept: IfParseReceiptItem): Promise<IFeedBack> {

    let caller = recept.tx.caller;
    let hash = recept.tx.hash;
    let time = recept.block.timestamp;
    let fee = parseFloat(recept.tx.fee)

    handler.logger.info('parseVote, updateNamesToHashTable')
    let feedback = await handler.pStorageDb.updateNamesToHashTable([caller], HASH_TYPE.ADDRESS);

    if (feedback.err) {
        return feedback
    }

    // insert into txaddresstable
    feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller], time);
    if (feedback.err) {
        return feedback
    }

    // update caller balance
    handler.logger.info('parseVote, updateBalances')
    feedback = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -fee);
    if (feedback.err) {
        return feedback;
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}