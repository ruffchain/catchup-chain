import { IfParseReceiptItem, Synchro, IName } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { HASH_TYPE, TOKEN_TYPE, SYS_TOKEN } from "../../storage/StorageDataBase";

export async function parseCreateToken(handler: Synchro, receipt: IfParseReceiptItem, tokenType: string): Promise<IFeedBack> {
    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let preBalances = receipt.tx.input.preBalances; // array
    let datetime = receipt.block.timestamp;
    let caller = receipt.tx.caller;
    let nameLst: IName[] = [];
    let addrLst: string[] = [];
    let amountAll: number = 0;
    let precision: number = receipt.tx.input.precision;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let fee = receipt.tx.fee;

    // put it into hash table–––

    preBalances.forEach((element: any) => {
        nameLst.push({
            address: element.address
        })
        addrLst.push(element.address)
        amountAll += parseInt(element.amount);
    });

    addrLst.push(caller);

    handler.logger.info('parseCreateToken, updateNamesToHashTable')
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

    // update caller balance
    let result = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -fee);
    if (result.err) {
        return result
    }

    if (receipt.receipt.returnCode === 0) {
        // add a new token to token table
        result = await handler.pStorageDb.insertTokenTable(tokenName, tokenType, caller, datetime, Buffer.from(JSON.stringify({
            supply: amountAll,
            precision: precision
        })));
        handler.logger.info('createToken insertTokenTable , result:', result)
        if (result.err) {
            return (result);
        }

        // update accounts token account table
        result = await handler.updateTokenBalances(tokenName, nameLst);
        if (result.err) {
            return result
        }
        for (let i = 0; i < preBalances.length; i++) {
            let elem = preBalances[i]
            result = await handler.laUpdateAccountTable(elem.address, tokenName, tokenType, parseInt(elem.amount));
            if (result.err) {
                return result
            }
        }

        // put tokenname into hash table
        result = await handler.pStorageDb.updateNameToHashTable(tokenName, HASH_TYPE.TOKEN);
        if (result.err) {
            return result;
        }

    }

    return { err: ErrorCode.RESULT_OK, data: null }
}