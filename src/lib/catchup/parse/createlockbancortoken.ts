import { IfParseReceiptItem, Synchro, IName } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { HASH_TYPE, SYS_TOKEN, TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function parseCreateLockBancorToken(handler: Synchro, receipt: IfParseReceiptItem, tokenType: string): Promise<IFeedBack> {
    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let preBalances = receipt.tx.input.preBalances; // array
    let datetime = receipt.block.timestamp;
    let caller = receipt.tx.caller;
    let nameLst: IName[] = [];
    let amountAll: number = 0;
    let addrLst: string[] = [];
    let nonliquidity: number = (receipt.tx.input.nonliquidity !== undefined) ? (parseFloat(receipt.tx.input.nonliquidity)) : (0);
    let factor = parseFloat(receipt.tx.input.factor);
    let reserve = parseFloat(receipt.tx.value)
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.tx.fee);

    preBalances.forEach((element: any) => {
        nameLst.push({ address: element.address });
        amountAll += parseInt(element.amount);
        amountAll += parseInt(element.lock_amount);

        addrLst.push(element.address)
    });
    addrLst.push(caller)

    // put address into hashtable
    let feedback = await handler.pStorageDb.updateNamesToHashTable(addrLst, HASH_TYPE.ADDRESS);
    if (feedback.err) {
        return feedback
    }

    // insert into txaddresstable
    feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, addrLst, time);
    if (feedback.err) {
        return feedback
    }
    // update caller balance
    feedback = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -fee);
    if (feedback.err) {
        return feedback;
    }

    if (receipt.receipt.returnCode === 0) {
        // get add token table
        let result = await handler.pStorageDb.insertTokenTable(tokenName, tokenType, caller, datetime, Buffer.from(JSON.stringify({
            factor: factor,
            supply: amountAll,
            nonliquidity: nonliquidity,
            reserve: reserve
        })));
        handler.logger.info('parseCreateLockBancorToken insert token table')
        if (result.err) {
            return result
        }


        // update accounts token account table
        for (let i = 0; i < preBalances.length; i++) {
            let elem = preBalances[i]
            // Here is some problem about lock token
            result = await handler.laUpdateAccountTable(elem.address, tokenName, tokenType, parseFloat(elem.amount));
            if (result.err) {
                return result
            }
        }

        // put tokenname into hash table
        result = await handler.pStorageDb.updateNameToHashTable(tokenName, HASH_TYPE.TOKEN);
        if (result.err) {
            return result
        }

        // Still use network method
        result = await handler.insertBancorTokenParameters(tokenName);
        if (result.err) {
            return result;
        }

    }

    return { err: ErrorCode.RESULT_OK, data: null }
}