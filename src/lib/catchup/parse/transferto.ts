import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { HASH_TYPE, TOKEN_TYPE, SYS_TOKEN } from "../../storage/StorageDataBase";
import { queryCallerCreator, txFailHandle } from "./common";

export async function parseTransferTo(handler: Synchro, receipt: IfParseReceiptItem): Promise<IFeedBack> {
    handler.logger.info('\n## parseTransferTo()');
    // console.log(receipt);

    let caller = receipt.tx.caller;
    let to = receipt.tx.input.to;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.tx.fee);
    let creator = receipt.block.creator;

    let blockhash = receipt.block.hash;
    let blocknumber = receipt.block.number;
    let datetime = receipt.block.timestamp;
    let content = Buffer.from(JSON.stringify(receipt.tx));
    let returnCode = receipt.receipt.returnCode;

    // update name to hash table
    let startT = new Date().getTime();
    let feedback = await handler.pStorageDb.updateNamesToHashTable([caller, to], HASH_TYPE.ADDRESS);
    let endT = new Date().getTime();
    handler.logger.info('Used time for updateNamesToHashTable:' + (endT - startT));
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

    // query caller, sys balance
    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }

    let [valCaller, valCreator] = [result.data.valCaller, result.data.valCreator];

    result = await handler.laQueryAccountTable(to, SYS_TOKEN)
    if (result.err) {
        return result;
    }
    let valTo = result.data;


    if (receipt.receipt.returnCode !== 0) {
        handler.logger.debug('Failed transaction, fee: ' + fee + ' old balance : ' + valCaller)
        let result = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
        if (result.err) {
            handler.logger.error('createToken tx failed.')
            return result;
        }

    } else {
        let val: number = parseFloat(receipt.tx.value);
        // use transaction
        await handler.pStorageDb.execRecord('BEGIN', {})

        // update caller sys balance
        result = await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller - fee - val);

        handler.logger.debug('caller balance: ' + (valCaller - fee - val))
        // udpate to sys balance
        result = await handler.laWriteAccountTable(to, SYS_TOKEN, TOKEN_TYPE.SYS, valTo + val);

        handler.logger.debug('to balance: ' + (valTo + val))

        await handler.laWriteAccountTable(creator, SYS_TOKEN, TOKEN_TYPE.SYS, valCreator + fee);

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

    handler.logger.info('\n## parseTransferTo() succeed');

    return { err: ErrorCode.RESULT_OK, data: null }
}