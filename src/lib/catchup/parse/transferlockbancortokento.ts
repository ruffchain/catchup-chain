import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { TOKEN_TYPE, SYS_TOKEN } from "../../storage/StorageDataBase";
import { queryCallerCreator, txFailHandle } from "./common";

export async function parseTransferLockBancorTokenTo(handler: Synchro, receipt: IfParseReceiptItem, tokenType: string): Promise<IFeedBack> {

    handler.logger.info('\n## parseTransferLockBancorTokenTo()');

    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    let to = receipt.tx.input.to;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.tx.fee);
    let amount = parseFloat(receipt.tx.input.amount);
    let creator = receipt.block.creator;

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller, to], time);
    if (feedback.err) {
        return feedback;
    }

    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }

    let [valCaller, valCreator] = [result.data.valCaller, result.data.valCreator];

    if (receipt.receipt.returnCode !== 0) {
        // update caller balance
        feedback = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
        if (feedback.err) {
            return feedback;
        }
    }
    else {
        // query caller balance

        // query caller token balance
        result = await handler.laQueryAccountTable(caller, tokenName)
        if (result.err) {
            return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
        }
        let valTokenCaller = result.data

        //query to token balance
        result = await handler.laQueryAccountTable(to, tokenName)
        if (result.err) {
            return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
        }
        let valTokenTo = result.data

        // use transaction
        await handler.pStorageDb.execRecord('BEGIN', {})

        await handler.laWriteAccountTable(creator, SYS_TOKEN, TOKEN_TYPE.SYS, valCreator + fee);

        await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller - fee);

        await handler.laWriteAccountTable(caller, tokenName, tokenType, valTokenCaller - amount);

        await handler.laWriteAccountTable(to, tokenName, tokenType, valTokenTo + amount);

        let hret = await handler.pStorageDb.execRecord('COMMIT', {})
        if (hret.err) {
            await handler.pStorageDb.execRecord('ROLLBACK', {})
            return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
        }
        handler.logger.info('\n## parseTransferLockBancorTokenTo() succeed');
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}