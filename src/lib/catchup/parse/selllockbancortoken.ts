import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { TOKEN_TYPE, SYS_TOKEN } from "../../storage/StorageDataBase";

export async function parseSellLockBancorToken(handler: Synchro, receipt: IfParseReceiptItem, tokenType: string): Promise<IFeedBack> {
    handler.logger.info('\n## parseSellLockBancorToken()');

    let caller = receipt.tx.caller;
    let tokenName = receipt.tx.input.tokenid;
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.tx.fee)

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, addrLst, time);

    if (feedback.err) {
        return feedback;
    }


    if (receipt.receipt.returnCode !== 0) {
        feedback = await handler.laQueryAccountTable(caller, SYS_TOKEN);
        if (feedback.err) {
            return feedback;
        }
        let valCaller = feedback.data - fee;
        feedback = await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller);
        if (feedback.err) {
            return feedback
        }
    } else {
        // update caller lockBancortoken account
        let result = await handler.updateLockBancorTokenBalances(tokenName, [{ address: caller }]);
        if (result.err) {
            return result;
        }

        result = await handler.updateBancorTokenParameters(tokenName);
        if (result.err) {
            return result;
        }

        result = await handler.updateBalances(SYS_TOKEN, [{ address: caller }]);
        if (result.err) {
            return result
        }
        handler.logger.info('\n## parseSellLockBancorToken() succeed');
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}