import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode, BigNumber } from "../../../core";
import { TOKEN_TYPE, SYS_TOKEN, HASH_TYPE } from "../../storage/StorageDataBase";
import { queryCallerCreator, txFailHandle } from "./common";

export async function parseTransferTokenTo(handler: Synchro, receipt: IfParseReceiptItem, tokenType: string): Promise<IFeedBack> {

    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    let to = receipt.tx.input.to;
    let amount = parseFloat(receipt.tx.input.amount);
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.receipt.cost);
    let creator = receipt.block.coinbase;

    handler.logger.info('\n## parseTransferTokenTo()');

    // update names
    let feedback = await handler.pStorageDb.updateNamesToHashTable([to], HASH_TYPE.ADDRESS);
    if (feedback.err) {
        return feedback
    }

    // insert into txaddresstable
    feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller, to], time);
    if (feedback.err) {
        return feedback;
    }

    // query caller, sys balance
    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        handler.logger.error('queryCallercreator fail')
        return result;
    }

    let [valCaller, valCreator] = [new BigNumber(result.data.valCaller), new BigNumber(result.data.valCreator)];

    if (receipt.receipt.returnCode !== 0) {
        handler.logger.debug('Failed transaction, fee: ' + fee)
        let result = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
        if (result.err) {
            handler.logger.error('transferTokenTo tx failed.')
            return result;
        }
    } else {
        // query to token balance
        result = await handler.laQueryAccountTable(to, tokenName)
        if (result.err) {
            return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
        }
        let valTokenTo = new BigNumber(result.data)

        result = await handler.laQueryAccountTable(caller, tokenName)
        if (result.err) {
            return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
        }
        let valTokenCaller = new BigNumber(result.data)

        if (caller === to) {
            handler.logger.info('caller eq to address')
        } else {
            await handler.laWriteAccountTable(caller, tokenName, tokenType, valTokenCaller.minus(new BigNumber(amount)).toString());

            await handler.laWriteAccountTable(to, tokenName, tokenType, valTokenTo.plus(new BigNumber(amount)).toString());
        }


        result = await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller.minus(new BigNumber(fee)).toString());

        await handler.laWriteAccountTable(creator, SYS_TOKEN, TOKEN_TYPE.SYS, valCreator.plus(new BigNumber(fee)).toString());

        handler.logger.info('\n## parseTransferTokenTo() succeed');
    }
    return { err: ErrorCode.RESULT_OK, data: null }
}