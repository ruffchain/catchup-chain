import { IfParseReceiptItem, Synchro, IName } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { HASH_TYPE, TOKEN_TYPE, SYS_TOKEN } from "../../storage/StorageDataBase";
import { NORMAL_TOKEN_PRECISION } from "../../storage/dbapi/scoop";

export async function parseCreateToken(handler: Synchro, receipt: IfParseReceiptItem, tokenType: string): Promise<IFeedBack> {
    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let preBalances = receipt.tx.input.preBalances; // array
    let datetime = receipt.block.timestamp;
    let caller = receipt.tx.caller;
    let nameLst: IName[] = [];
    let addrLst: string[] = [];
    let amountAll: number = 0;
    let precision: number = parseInt(receipt.tx.input.precision);
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.tx.fee);

    // put it into hash table–––
    handler.logger.info('\n## parseCreateToken()');

    preBalances.forEach((element: any) => {
        nameLst.push({
            address: element.address
        })
        addrLst.push(element.address)
        amountAll += parseFloat(parseFloat(element.amount).toPrecision(NORMAL_TOKEN_PRECISION));
    });

    addrLst.push(caller);

    handler.logger.info('updateNamesToHashTable')
    // put address into hash table
    let feedback = await handler.pStorageDb.updateNamesToHashTable(addrLst, HASH_TYPE.ADDRESS);
    if (feedback.err) {
        return feedback;
    }

    // insert into txaddresstable
    feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, addrLst, time);
    if (feedback.err) {
        return feedback
    }

    if (receipt.receipt.returnCode !== 0) {
        handler.logger.debug('Failed transaction, fee: ' + fee)
        // update caller balance
        let result = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -fee);
        if (result.err) {
            return result
        }
    } else {
        // add a new token to token table
        let result = await handler.pStorageDb.insertTokenTable(tokenName, tokenType, caller, datetime, Buffer.from(JSON.stringify({
            supply: amountAll,
            precision: precision
        })));
        handler.logger.info('createToken insertTokenTable , result:', result)
        if (result.err) {
            return (result);
        }

        // put tokenname into hash table
        result = await handler.pStorageDb.updateNameToHashTable(tokenName, HASH_TYPE.TOKEN);
        if (result.err) {
            return result;
        }

        // query caller sys balance
        result = await handler.laQueryAccountTable(caller, SYS_TOKEN);
        if (result.err) {
            return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
        }
        let valCaller = result.data

        // use transaction
        await handler.pStorageDb.execRecord('BEGIN', {})

        result = await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller - fee);
        handler.logger.debug('caller balance: ' + (valCaller - fee))

        // update accounts token account table
        for (let i = 0; i < preBalances.length; i++) {
            let elem = preBalances[i]
            result = await handler.laWriteAccountTable(elem.address, tokenName, tokenType, parseFloat(elem.amount));
        }
        let hret = await handler.pStorageDb.execRecord('COMMIT', {})

        if (hret.err) {
            await handler.pStorageDb.execRecord('ROLLBACK', {})
            return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
        }

        handler.logger.info('\n## parseCreateToken() succeed');

    }

    return { err: ErrorCode.RESULT_OK, data: null }
}