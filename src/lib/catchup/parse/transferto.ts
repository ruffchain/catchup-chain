import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { HASH_TYPE, TOKEN_TYPE } from "../../storage/StorageDataBase";
import { SYS_TOKEN } from "../../storage/dbapi/scoop";

export async function parseTransferTo(handler: Synchro, receipt: IfParseReceiptItem): Promise<IFeedBack> {
    handler.logger.info('parseTransferTo()');
    // console.log(receipt);

    let caller = receipt.tx.caller;
    let to = receipt.tx.input.to;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.tx.fee);

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

    // query caller, sys to balance
    let result = await handler.laQueryAccountTable(caller, SYS_TOKEN);
    if (result.err) {
        return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
    }
    let valCaller = result.data

    // query to sys balance
    result = await handler.laQueryAccountTable(to, SYS_TOKEN);
    if (result.err) {
        return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
    }
    let valTo = result.data

    if (receipt.receipt.returnCode !== 0) {
        let feedback1 = await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller - fee);
        if (feedback1.err) {
            handler.logger.error('error laWriteAccountTable to caller');
            return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: {} }
        }

    } else {
        let val: number = parseFloat(receipt.tx.value);
        // use transaction
        await handler.pStorageDb.execRecord('BEGIN', {})

        // update caller sys balance
        result = await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller - fee - val);
        // udpate to sys balance
        result = await handler.laWriteAccountTable(to, SYS_TOKEN, TOKEN_TYPE.SYS, valTo + val);

        let hret = await handler.pStorageDb.execRecord('COMMIT', {})

        if (hret.err) {
            await handler.pStorageDb.execRecord('ROLLBACK', {})
            return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
        }
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