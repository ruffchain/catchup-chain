import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { HASH_TYPE, TOKEN_TYPE } from "../../storage/StorageDataBase";
import { SYS_TOKEN } from "../../storage/dbapi/scoop";

export async function parseTransferTo(handler: Synchro, receipt: IfParseReceiptItem): Promise<IFeedBack> {
    handler.logger.info('parseTransferTo()');
    console.log(receipt);

    let caller = receipt.tx.caller;
    let to = receipt.tx.input.to;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let fee = receipt.tx.fee;

    let blockhash = receipt.block.hash;
    let blocknumber = receipt.block.number;
    let datetime = receipt.block.timestamp;
    let content = Buffer.from(JSON.stringify(receipt.tx));
    let returnCode = receipt.receipt.returnCode;

    let startT = new Date().getTime();
    let feedback = await handler.pStorageDb.updateNamesToHashTable([caller, to], HASH_TYPE.ADDRESS);
    let endT = new Date().getTime();
    handler.logger.info('Used time for updateNamesToHashTable:', endT - startT);
    if (feedback.err) {
        handler.logger.error('error updateNamesToHashTable');
        return feedback
    }

    // insert into txaddresstable
    let startT2 = new Date().getTime();
    feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller, to], time);
    let endT2 = new Date().getTime();
    handler.logger.info('Used time for updateHashToTxAddressTable:', endT2 - startT2);
    if (feedback.err) {
        handler.logger.error('error updateHashToTxAddressTable');
        return feedback
    }

    // update caller, to balance
    let valCaller: number = -fee;

    if (receipt.receipt.returnCode === 0) {
        let valTo: number = receipt.tx.value;
        valCaller -= receipt.tx.value;

        let feedback = await handler.laUpdateAccountTable(to, SYS_TOKEN, TOKEN_TYPE.SYS, valTo);
        if (feedback.err) {
            handler.logger.error('error laUpdateAccountTable to to');
            return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: {} }
        }

    }

    let feedback1 = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller);
    if (feedback1.err) {
        handler.logger.error('error laUpdateAccountTable to caller');
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: {} }
    }

    // update to txTransferToTable
    handler.logger.info('Put it into txTransferToTable')
    let startT3 = new Date().getTime();
    feedback = await handler.pStorageDb.insertTxTransferToTable(hash, blockhash, blocknumber, caller, datetime, content, to, returnCode);
    let endT3 = new Date().getTime();
    handler.logger.info('Used time for insertTxTransferToTable:', endT3 - startT3);

    if (feedback.err) {
        handler.logger.error('put tx into txtransfertotable failed');
        return feedback
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}