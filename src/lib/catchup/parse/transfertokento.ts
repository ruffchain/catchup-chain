import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { SYS_TOKEN } from "../../storage/dbapi/scoop";
import { TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function parseTransferTokenTo(handler: Synchro, receipt: IfParseReceiptItem): Promise<IFeedBack> {

    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    let to = receipt.tx.input.to;
    let amount = parseFloat(receipt.tx.input.amount);
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.tx.fee);

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller, to], time);
    if (feedback.err) {
        return feedback;
    }

    // update caller balance, -fee
    let feedback1 = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -fee);
    if (feedback1.err) {
        handler.logger.error('error laUpdateAccountTable to caller');
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: {} }
    }

    if (receipt.receipt.returnCode !== 0) {
        let feedback1 = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -fee);
        if (feedback1.err) {
            handler.logger.error('error laUpdateAccountTable to caller');
            return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: {} }
        }
    } else {
        // query caller sys balance
        let result = await handler.laQueryAccountTable(caller, SYS_TOKEN);
        if (result.err) {
            return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
        }
        let valCaller = result.data

        // query caller token balance
        result = await handler.laQueryAccountTable(caller, tokenName)
        if (result.err) {
            return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
        }
        let valTokenCaller = result.data

        // query to token balance
        result = await handler.laQueryAccountTable(to, tokenName)
        if (result.err) {
            return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
        }
        let valTokenTo = result.data

        // use transaction
        await handler.pStorageDb.execRecord('BEGIN', {})

        result = await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller - fee);

        await handler.laWriteAccountTable(caller, tokenName, TOKEN_TYPE.NORMAL, valTokenCaller - amount);

        await handler.laWriteAccountTable(to, tokenName, TOKEN_TYPE.NORMAL, valTokenTo + amount);

        let hret = await handler.pStorageDb.execRecord('COMMIT', {})

        if (hret.err) {
            await handler.pStorageDb.execRecord('ROLLBACK', {})
            return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
        }

    }
    return { err: ErrorCode.RESULT_OK, data: null }
}