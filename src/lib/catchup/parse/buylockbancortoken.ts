import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode, BigNumber } from "../../../core";
import { TOKEN_TYPE, SYS_TOKEN } from "../../storage/StorageDataBase";

export async function parseBuyLockBancorToken(handler: Synchro, receipt: IfParseReceiptItem, tokenType: string): Promise<IFeedBack> {
    handler.logger.info('\n## parseBuyLockBancorToken()');
    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.tx.fee);
    let value = parseFloat(receipt.tx.value);

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

        handler.logger.info('\n## parseBuyLockBancorToken() succeed');
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}