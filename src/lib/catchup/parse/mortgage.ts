import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { HASH_TYPE, SYS_TOKEN, TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function parseMortgage(handler: Synchro, recept: IfParseReceiptItem): Promise<IFeedBack> {

    let caller = recept.tx.caller;
    let hash = recept.tx.hash;
    let time = recept.block.timestamp;
    let fee = parseFloat(recept.tx.fee);
    let val = parseFloat(recept.tx.value);

    handler.logger.info('\n## parseMortgage()');

    // update name to hash table
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

    if (recept.receipt.returnCode !== 0) {
        // update caller balance
        handler.logger.info('caller value change ' + (- fee));
        let result = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -fee);
        if (result.err) {
            return result
        }
    } else {
        handler.logger.info('caller value change ' + (-fee - val));
        let result = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -fee - val);
        if (result.err) {
            return result
        }
    }

    handler.logger.info('\n## parseMortgage() succeed');

    return { err: ErrorCode.RESULT_OK, data: null }
}