import { IfParseReceiptItem, Synchro, IName } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { HASH_TYPE, TOKEN_TYPE, SYS_TOKEN } from "../../storage/StorageDataBase";
import { NORMAL_TOKEN_PRECISION } from "../../storage/dbapi/scoop";
import { queryCallerCreator, txFailHandle } from "./common";

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
    let creator = receipt.block.creator;

    // put it into hash table–––
    handler.logger.info('\n## parseCreateToken()');

    // remove redundant addresses:
    // use the last effective item
    let newPreBalances: { address: string, amount: number }[] = [];
    for (let i = preBalances.length - 1; i >= 0; i--) {
        let item = newPreBalances.find((elem) => {
            return preBalances[i].address === elem.address;
        });
        if (!item) {
            newPreBalances.push(preBalances[i]);
        }
    }

    newPreBalances.forEach((element: any) => {
        nameLst.push({
            address: element.address
        })
        addrLst.push(element.address)
        amountAll += parseFloat(parseFloat(element.amount).toPrecision(precision));
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

    // query caller, sys balance
    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }
    let [valCaller, valCreator] = [result.data.valCaller, result.data.valCreator];

    if (receipt.receipt.returnCode !== 0) {
        handler.logger.debug('Failed transaction, fee: ' + fee)
        // caller -fee
        // creator + fee
        let result = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
        if (result.err) {
            handler.logger.error('createToken tx failed.')
            return result;
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

        // use transaction
        await handler.pStorageDb.execRecord('BEGIN', {})

        result = await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller - fee);
        handler.logger.debug('caller balance: ' + (valCaller - fee))

        await handler.laWriteAccountTable(creator, SYS_TOKEN, TOKEN_TYPE.SYS, valCreator + fee);

        // update accounts token account table
        for (let i = 0; i < preBalances.length; i++) {
            let elem = preBalances[i]
            result = await handler.laWriteAccountTable(elem.address, tokenName, tokenType, parseFloat(parseFloat(elem.amount).toPrecision(precision)));
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