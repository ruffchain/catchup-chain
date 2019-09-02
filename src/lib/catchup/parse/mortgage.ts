import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { HASH_TYPE, SYS_TOKEN, TOKEN_TYPE } from "../../storage/StorageDataBase";
import { queryCallerCreator, txFailHandle } from "./common";

export async function parseMortgage(handler: Synchro, recept: IfParseReceiptItem): Promise<IFeedBack> {

    let caller = recept.tx.caller;
    let hash = recept.tx.hash;
    let time = recept.block.timestamp;
    let fee = parseFloat(recept.tx.fee);
    let val = parseFloat(recept.tx.value);
    let creator = recept.block.creator;

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

    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }

    let [valCaller, valCreator] = [result.data.valCaller, result.data.valCreator];

    handler.logger.info('parseMortgage, updateBalances ' + valCaller + ' ' + valCreator);

    handler.logger.info('caller value change ' + (- fee));
    result = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
    if (result.err) {
        return result
    }

    handler.logger.info('\n## parseMortgage() succeed');

    return { err: ErrorCode.RESULT_OK, data: null }
}