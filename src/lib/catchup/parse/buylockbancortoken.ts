import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode, BigNumber } from "../../../core";
import { SYS_TOKEN, BANCOR_TOKEN_PRECISION } from "../../storage/dbapi/scoop";
import { TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function parseBuyLockBancorToken(handler: Synchro, receipt: IfParseReceiptItem, tokenType: string): Promise<IFeedBack> {
    handler.logger.info('parseBuyLockBancorToken -->\n')
    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;
    let fee = receipt.tx.fee;
    let value = receipt.tx.value;

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, addrLst, time);
    if (feedback.err) {
        return feedback;
    }
    if (receipt.receipt.returnCode !== 0) {
        feedback = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, - fee);
        if (feedback.err) {
            return feedback;
        }
    }
    else {
        // query caller SYS
        let result = await handler.laQueryAccountTable(caller, tokenName);
        if (result.err) {
            return result;
        }
        let valCaller = result.data;
        valCaller -= value;
        valCaller -= fee;

        // query F,S,R
        let result0 = await handler.laGetBancorTokenParams(tokenName);
        if (result0.ret !== 200) {
            handler.logger.error("laGetBancorTokenParams, get params failed");
            return { err: ErrorCode.RESULT_DB_TABLE_GET_FAILED, data: null }
        }
        let F: number = 0;
        let S: number = 0;
        let R: number = 0;
        try {
            let obj = JSON.parse(result0.resp!);
            F = parseFloat(obj.value.F.substring(1));
            S = parseFloat(obj.value.S.substring(1));
            R = parseFloat(obj.value.R.substring(1));

        } catch (e) {
            handler.logger.error('laGetBancorTokenParams parsing failed:', e);
            return { err: ErrorCode.RESULT_DB_TABLE_GET_FAILED, data: null }
        }

        // query caller token balance
        let hres = await handler.getLockBancorTokenBalanceInfo(tokenName, caller);
        if (hres.ret !== 200) {
            return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
        }
        let amountBancor: string = JSON.parse(hres.resp!).value.amount.substr(1);
        let laAmount: number = parseFloat(amountBancor);
        let valueBancor: number = parseFloat(parseFloat(amountBancor).toFixed(BANCOR_TOKEN_PRECISION));
        amountBancor = laAmount.toFixed(BANCOR_TOKEN_PRECISION);

        // use transaction
        await handler.pStorageDb.execRecord('BEGIN', {});

        // update caller SYS ballance
        result = await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller);

        // update F,S,R
        // update token params
        result = await handler.pStorageDb.insertBancorTokenTable(tokenName, F, R, S);

        // update caller token balance
        result = await handler.laWriteAccountTable(caller, tokenName, TOKEN_TYPE.BANCOR, valueBancor);

        let hret = await handler.pStorageDb.execRecord('COMMIT', {})
        if (hret.err) {
            await handler.pStorageDb.execRecord('ROLLBACK', {})
            return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
        }
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}