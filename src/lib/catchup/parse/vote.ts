import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode, BigNumber } from "../../../core";
import { HASH_TYPE, SYS_TOKEN, TOKEN_TYPE } from "../../storage/StorageDataBase";
import { queryCallerCreator, txFailHandle } from "./common";

export async function parseVote(handler: Synchro, recept: IfParseReceiptItem): Promise<IFeedBack> {

    let caller = recept.tx.caller;
    let hash = recept.tx.hash;
    let time = recept.block.timestamp;
    let fee = parseFloat(recept.receipt.cost)
    let creator = recept.block.coinbase;

    handler.logger.info('\n## parseVote()');

    handler.logger.info('parseVote, updateNamesToHashTable')

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller], time);
    if (feedback.err) {
        return feedback
    }

    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }

    let [valCaller, valCreator] = [new BigNumber(result.data.valCaller), new BigNumber(result.data.valCreator)];

    // update caller balance
    handler.logger.info('parseVote, updateBalances, fee: ' + (-fee))
    feedback = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
    if (feedback.err) {
        return feedback;
    }

    handler.logger.info('\n## parseVote() succeed');

    return { err: ErrorCode.RESULT_OK, data: null }
}