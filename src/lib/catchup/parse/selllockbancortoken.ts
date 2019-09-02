import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode, BigNumber } from "../../../core";
import { TOKEN_TYPE, SYS_TOKEN } from "../../storage/StorageDataBase";
import { queryCallerCreator, txFailHandle } from "./common";
import { strAmountPrecision, BANCOR_TOKEN_PRECISION } from "../../storage/dbapi/scoop";

export async function parseSellLockBancorToken(handler: Synchro, receipt: IfParseReceiptItem, tokenType: string): Promise<IFeedBack> {
    handler.logger.info('\n## parseSellLockBancorToken()');

    let caller = receipt.tx.caller;
    let tokenName = receipt.tx.input.tokenid;
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.tx.fee)
    let creator = receipt.block.creator;
    let amount = receipt.tx.input.amount

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, addrLst, time);
    if (feedback.err) {
        return feedback;
    }

    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }

    let [valCaller, valCreator] = [new BigNumber(result.data.valCaller), new BigNumber(result.data.valCreator)];


    if (receipt.receipt.returnCode !== 0) {
        handler.logger.info('parseSellLockBancorToken failed, updateBalances ' + (-fee))
        feedback = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
        if (feedback.err) {
            return feedback;
        }
    } else {
        // update caller lockBancortoken account
        // get caller token val
        let result = await handler.laQueryAccountTable(caller, tokenName);
        if (result.err) {
            handler.logger.error('laQueryAccountTable failed')
            return result;
        }

        let valToken = new BigNumber(result.data);
        handler.logger.info('valToken: ' + valToken)

        // get old F, S, R
        result = await handler.pStorageDb.queryBancorTokenTable(tokenName);
        if (result.err) {
            handler.logger.error('pStorageDb queryBancorTokenTable failed');
            return result;
        }
        let F = new BigNumber(result.data.factor);
        let R = new BigNumber(result.data.reserve);
        let S = new BigNumber(result.data.supply);
        handler.logger.debug('F: ' + F)
        handler.logger.debug('R: ', R);
        handler.logger.debug('S: ' + S);

        // compute it :
        let strAmount = strAmountPrecision(amount, BANCOR_TOKEN_PRECISION);
        let e = new BigNumber(strAmount);
        let out: BigNumber;

        // If F=1, not use the formula
        if (F.eq(1)) {
            out = e;
        } else {
            out = e.dividedBy(S);
            out = new BigNumber(1).minus(out);
            let temp1 = out.toNumber();
            out = new BigNumber(Math.pow(temp1, 1 / F.toNumber()));
            out = new BigNumber(1).minus(out);
            out = out.multipliedBy(R);
        }

        // Update system R,S;
        R = R.minus(out);
        S = S.minus(e);

        handler.logger.info('reserve minus:', out.toString());
        handler.logger.info('supply minus:', e.toString());

        // change F, S, R
        result = await handler.pStorageDb.insertBancorTokenTable(tokenName, F.toNumber(), R.toString(), S.toString());
        if (result.err) {
            handler.logger.error('insert bancortokentable params failed')
            return result;
        }

        // udpate caller token
        result = await handler.laWriteAccountTable(caller, tokenName, TOKEN_TYPE.BANCOR, valToken.minus(e).toString());

        // update caller sys
        await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller.minus(new BigNumber(fee)).plus(out).toString());

        await handler.laWriteAccountTable(creator, SYS_TOKEN, TOKEN_TYPE.SYS, valCreator.plus(new BigNumber(fee)).toString());

        handler.logger.info('\n## parseSellLockBancorToken() succeed');
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}