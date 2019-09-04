import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode, BigNumber } from "../../../core";
import { TOKEN_TYPE, SYS_TOKEN, HASH_TYPE } from "../../storage/StorageDataBase";
import { queryCallerCreator, txFailHandle } from "./common";

export async function parseBuyLockBancorToken(handler: Synchro, receipt: IfParseReceiptItem, tokenType: string): Promise<IFeedBack> {
    handler.logger.info('\n## parseBuyLockBancorToken()');
    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.receipt.cost);
    let value = parseFloat(receipt.tx.value);
    let creator = receipt.block.coinbase;

    let feedback = await handler.pStorageDb.updateNamesToHashTable([hash], HASH_TYPE.TX);
    if (feedback.err) {
        handler.logger.error('error updateNamesToHashTable');
        return feedback
    }

    // insert into txaddresstable
    feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, addrLst, time);
    if (feedback.err) {
        return feedback;
    }

    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }

    let [valCaller, valCreator] = [new BigNumber(result.data.valCaller), new BigNumber(result.data.valCreator)];

    if (receipt.receipt.returnCode !== 0) {
        feedback = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
        if (feedback.err) {
            handler.logger.info('parseBuyLockBancorToken failed, updateBalances ' + (-fee))
            return feedback;
        }
    }
    else {
        // update caller lockBancortoken account
        let result = await handler.laQueryAccountTable(caller, tokenName);
        if (result.err) {
            handler.logger.error('laQueryAccountTable failed')
            return result;
        }

        let valToken: BigNumber = new BigNumber(result.data);
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
        handler.logger.info('F: ' + F)
        handler.logger.info('R: ', R);
        handler.logger.info('S: ' + S);

        // compute it
        let e = new BigNumber(value);
        let out: BigNumber;

        // If F=1, not use the formula
        if (F.eq(1)) {
            out = e;
        } else {
            out = e.dividedBy(R);
            out = out.plus(new BigNumber(1.0));

            let temp1 = out.toNumber();
            handler.logger.info('temp1:', temp1);
            handler.logger.info('F:', F.toNumber());
            handler.logger.info('math.pow:', Math.pow(temp1, F.toNumber()));
            out = new BigNumber(Math.pow(temp1, F.toNumber()));
            out = out.minus(new BigNumber(1));
            out = out.multipliedBy(S);
        }

        handler.logger.info('supply plus:', out.toString());
        handler.logger.info('reserve plus:', e.toString());

        // Update system R,S; Update User account
        R = R.plus(e);
        S = S.plus(out);


        // change F, S, R
        result = await handler.pStorageDb.insertBancorTokenTable(tokenName, F.toNumber(), R.toString(), S.toString());
        if (result.err) {
            handler.logger.error('insert bancortokentable params failed')
            return result;
        }

        // update caller token balance
        result = await handler.laWriteAccountTable(caller, tokenName, TOKEN_TYPE.BANCOR, (new BigNumber(valToken).plus(out)).toString());

        // udpate caller sys balance
        await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller.minus(new BigNumber(fee + value)).toString());

        // update creator balance
        await handler.laWriteAccountTable(creator, SYS_TOKEN, TOKEN_TYPE.SYS, valCreator.plus(new BigNumber(fee)).toString());


        handler.logger.info('\n## parseBuyLockBancorToken() succeed');
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}