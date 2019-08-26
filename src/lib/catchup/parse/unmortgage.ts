import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode, ValueBlockExecutor } from "../../../core";
import { HASH_TYPE, SYS_TOKEN, TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function parseUnmortgage(handler: Synchro, recept: IfParseReceiptItem): Promise<IFeedBack> {
    let caller = recept.tx.caller;
    let hash = recept.tx.hash;
    let time = recept.block.timestamp;
    let val = parseFloat(recept.tx.input);
    let fee = parseFloat(recept.tx.fee);
    handler.logger.info('\n## parseMortgage()');
    handler.logger.info('parseUnmortgage, updateNamesToHashTable')
    let feedback = await handler.pStorageDb.updateNamesToHashTable([caller], HASH_TYPE.ADDRESS);

    if (feedback.err) {
        return feedback;
    }

    // insert into txaddresstable
    feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller], time);
    if (feedback.err) {
        return feedback
    }

    let valNew = -fee
    if (recept.receipt.returnCode === 0) {
        valNew += val;
    }
    handler.logger.info('parseUnmortgage, updateBalances ' + valNew)
    feedback = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valNew);
    if (feedback.err) {
        return feedback;
    }

    handler.logger.info('\n## parseMortgage() succeed');
    return { err: ErrorCode.RESULT_OK, data: null }
}