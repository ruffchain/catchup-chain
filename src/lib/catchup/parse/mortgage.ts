import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { HASH_TYPE, SYS_TOKEN, TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function parseMortgage(handler: Synchro, recept: IfParseReceiptItem): Promise<IFeedBack> {

    let caller = recept.tx.caller;
    let hash = recept.tx.hash;
    let time = recept.block.timestamp;
    let fee = parseFloat(recept.tx.fee);
    let val = parseFloat(recept.tx.value);

    handler.logger.info('parseMortgage, updateNamesToHashTable')
    let feedback = await handler.pStorageDb.updateNamesToHashTable([caller], HASH_TYPE.ADDRESS);

    if (feedback.err) {
        return (feedback);
    }

    // insert into txaddresstable
    feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller], time);
    if (feedback.err) {
        return (feedback);
    }

    handler.logger.info('parseMortgage, updateBalances')
    let valNew = -fee;

    if (recept.receipt.returnCode === 0) {
        valNew -= val;
    }

    // update caller balance
    let result = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valNew);
    if (result.err) {
        return result
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}