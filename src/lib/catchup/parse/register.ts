import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { HASH_TYPE, SYS_TOKEN, TOKEN_TYPE } from "../../storage/StorageDataBase";
import { DEPOSIT_VALUE } from "../../storage/dbapi/scoop";

export async function parseRegister(handler: Synchro, recept: IfParseReceiptItem): Promise<IFeedBack> {
    let caller = recept.tx.caller;
    let hash = recept.tx.hash;
    let time = recept.block.timestamp;
    let fee = parseFloat(recept.tx.fee)
    let val = parseFloat(recept.tx.value);

    handler.logger.info('parseRegister')
    let feedback = await updateHashTxAddressTable(handler, [caller], hash, time);
    if (feedback.err) {
        return feedback;
    }

    handler.logger.info('parseRegister, updateBalances')
    feedback = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -val - fee);
    if (feedback.err) {
        return feedback;
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}
export async function parseUnregister(handler: Synchro, recept: IfParseReceiptItem): Promise<IFeedBack> {
    let caller = recept.tx.caller;
    let hash = recept.tx.hash;
    let time = recept.block.timestamp;
    let fee = parseFloat(recept.tx.fee)
    let val = DEPOSIT_VALUE;
    handler.logger.info('parseUnRegister')
    let feedback = await updateHashTxAddressTable(handler, [caller], hash, time);
    if (feedback.err) {
        return feedback
    }

    handler.logger.info('parseUnRegister, updateBalances')
    feedback = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, val - fee);
    if (feedback.err) {
        return feedback;
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}
async function updateHashTxAddressTable(handler: Synchro, addresses: string[], hash: string, time: number): Promise<IFeedBack> {
    handler.logger.info('updateHashTxAddressTable');

    let feedback = await handler.pStorageDb.updateNamesToHashTable(addresses, HASH_TYPE.ADDRESS);

    if (feedback.err) {
        return feedback;
    }

    feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, addresses, time);
    if (feedback.err) {
        return feedback;
    }

    return { err: ErrorCode.RESULT_OK, data: null };
}