import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { SYS_TOKEN } from "../../storage/dbapi/scoop";
import { TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function parseSellLockBancorToken(handler: Synchro, receipt: IfParseReceiptItem, tokenType: string): Promise<IFeedBack> {
    handler.logger.info('parseSellLockBancorToken -->');
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

    feedback = await handler.updateTokenBalances(SYS_TOKEN, [caller]);
    if (feedback.err) {
        return feedback;
    }

    // Still use get from server , we don't the locked token status
    if (receipt.receipt.returnCode === 0) {
        // update caller lockBancortoken account
        let result = await handler.updateLockBancorTokenBalances(tokenName, [{ address: caller }]);
        if (result.err) {
            return result;
        }

        result = await handler.updateBancorTokenParameters(tokenName);
        if (result.err) {
            return result;
        }
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}