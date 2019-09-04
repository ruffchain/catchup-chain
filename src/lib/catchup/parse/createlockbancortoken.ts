import { IfParseReceiptItem, Synchro, IName } from "../synchro";
import { IFeedBack, ErrorCode, BigNumber } from "../../../core";
import { HASH_TYPE, SYS_TOKEN, TOKEN_TYPE } from "../../storage/StorageDataBase";
import { BANCOR_TOKEN_PRECISION } from "../../storage/dbapi/scoop";
import { queryCallerCreator, txFailHandle } from "./common";

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
    let fee = parseFloat(receipt.receipt.cost);
    let creator = receipt.block.coinbase;

    handler.logger.info('\n## parseCreateLockBancorToken()');

    preBalances.forEach((element: any) => {
        nameLst.push({ address: element.address });

        amountAll += parseFloat(element.amount);
        if (element.lock_amount) {
            amountAll += parseFloat(element.lock_amount);
        }

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

    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }

    let [valCaller, valCreator] = [new BigNumber(result.data.valCaller), new BigNumber(result.data.valCreator)];

    if (receipt.receipt.returnCode !== 0) {
        // update caller balance
        feedback = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
        if (feedback.err) {
            return feedback;
        }
    }
    else { // === 0
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

        // put tokenname into hash table
        result = await handler.pStorageDb.updateNameToHashTable(tokenName, HASH_TYPE.TOKEN);
        if (result.err) {
            return result
        }

        // Use transaction
        let F = factor;
        let R = reserve;
        let S = amountAll;

        await handler.laWriteAccountTable(creator, SYS_TOKEN, TOKEN_TYPE.SYS, valCreator.plus(new BigNumber(fee)).toString());

        await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller.minus(new BigNumber(fee + reserve)).toString());
        // Still use network method
        result = await handler.pStorageDb.insertBancorTokenTable(tokenName, F, new BigNumber(R).toString(), new BigNumber(S).toString());

        // update accounts token account table
        for (let i = 0; i < preBalances.length; i++) {
            let elem = preBalances[i]
            // Here is some problem about lock token
            if (elem.lock_amount) {
                let sum: number = parseFloat(elem.amount) + parseFloat(elem.lock_amount);
                result = await handler.laWriteAccountTable(elem.address, tokenName, tokenType, sum.toString());
            } else {
                result = await handler.laWriteAccountTable(elem.address, tokenName, tokenType, elem.amount);
            }
        }
    }

    handler.logger.info('\n## parseCreateLockBancorToken() succeed');

    return { err: ErrorCode.RESULT_OK, data: null }
}


export async function updatePureALTRow(handler: Synchro, valueObj: any, token: string, type: string, account: IName): Promise<IFeedBack> {
    let amount: string = (valueObj.amount).substr(1);
    let laAmount: number = parseFloat(amount);
    let value: number = parseFloat(laAmount.toFixed(BANCOR_TOKEN_PRECISION));

    let lockAmount: string = (valueObj.amountLock).substr(1);
    let laLockAmount: number = parseFloat(lockAmount);
    let valueLock: number = parseFloat(laLockAmount.toFixed(BANCOR_TOKEN_PRECISION));

    let dueBlock: number = parseInt((valueObj.dueBlock).substr(1));
    let dueTime: number = valueObj.dueTime;

    let amountTotal = laAmount + laLockAmount;

    // save to account table
    handler.logger.info('updatePureALTRow ->\n')
    let result2 = await handler.pStorageDb.updateAccountTable(account.address, token, type, amountTotal.toString(), value + valueLock);
    if (result2.err) { return result2; }

    // save to LBTT table
    result2 = await handler.pStorageDb.updateALTTable(account.address, token, amount, lockAmount, dueBlock, dueTime);
    if (result2.err) { return result2; }

    return { err: ErrorCode.RESULT_OK, data: null }

}
export async function updateShortALTRow(handler: Synchro, valueObj: any, token: string, type: string, account: IName): Promise<IFeedBack> {
    let amount: string = (valueObj.amount).substr(1);
    let laAmount: number = parseFloat(amount);
    let value: number = parseFloat(laAmount.toFixed(BANCOR_TOKEN_PRECISION));

    // save to account table
    handler.logger.info('updateShortALTRow ->\n')
    let result2 = await handler.pStorageDb.updateAccountTable(account.address, token, type, amount, value);
    if (result2.err) { return result2; }

    // save to LBTT table
    result2 = await handler.pStorageDb.updateALTTable(account.address, token, amount, '0', 0, 0);
    if (result2.err) { return result2; }

    return { err: ErrorCode.RESULT_OK, data: null }

}
