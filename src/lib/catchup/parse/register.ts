import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode, BigNumber } from "../../../core";
import { HASH_TYPE, SYS_TOKEN, TOKEN_TYPE } from "../../storage/StorageDataBase";
import { DEPOSIT_VALUE } from "../../storage/dbapi/scoop";
import { queryCallerCreator, txFailHandle } from "./common";

export async function parseRegister(handler: Synchro, recept: IfParseReceiptItem): Promise<IFeedBack> {
    let caller = recept.tx.caller;
    let hash = recept.tx.hash;
    let time = recept.block.timestamp;
    let fee = parseFloat(recept.receipt.cost)
    let val = parseFloat(recept.tx.value);
    let creator = recept.block.coinbase;

    handler.logger.info('\n## parseRegister()');

    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller], time);
    if (feedback.err) {
        return (feedback);
    }

    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }

    let [valCaller, valCreator] = [new BigNumber(result.data.valCaller), new BigNumber(result.data.valCreator)];

    handler.logger.info('parseRegister, updateBalances')
    feedback = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
    if (feedback.err) {
        return feedback;
    }

    handler.logger.info('\n## parseRegister() succeed');

    return { err: ErrorCode.RESULT_OK, data: null }
}
export async function parseUnregister(handler: Synchro, recept: IfParseReceiptItem): Promise<IFeedBack> {
    let caller = recept.tx.caller;
    let hash = recept.tx.hash;
    let time = recept.block.timestamp;
    let fee = parseFloat(recept.receipt.cost)
    let val = DEPOSIT_VALUE;
    let creator = recept.block.creator;

    handler.logger.info('\n## parseUnregister()');
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller], time);
    if (feedback.err) {
        return (feedback);
    }

    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }

    let [valCaller, valCreator] = [new BigNumber(result.data.valCaller), new BigNumber(result.data.valCreator)];

    handler.logger.info('parseUnRegister, updateBalances')
    feedback = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
    if (feedback.err) {
        return feedback;
    }
    handler.logger.info('parseUnRegister, fee: ' + (-fee))

    handler.logger.info('\n## parseUnregister() succeed');
    return { err: ErrorCode.RESULT_OK, data: null }
}
