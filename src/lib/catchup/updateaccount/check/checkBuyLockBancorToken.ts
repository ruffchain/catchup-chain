import { Synchro } from "../../synchro";
import { IfTokenAddressCp } from "../newUpdateTx";
import { IFeedBack, ErrorCode } from "../../../../core";
import { SYS_TOKEN } from "../../../storage/StorageDataBase";



export async function checkBuyLockBancorToken(handler: Synchro, receipt: any, tokenType: string, lst: IfTokenAddressCp[]): Promise<IFeedBack> {
    handler.logger.info('checkBuyLockBancorToken -->\n')
    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, addrLst, time);
    if (feedback.err) {
        return feedback;
    }
    feedback = await handler.updateBalances(SYS_TOKEN, [{ address: caller }]);
    if (feedback.err) {
        return feedback;
    }

    if (receipt.receipt.returnCode === 0) {
        let result = await handler.updateLockBancorTokenBalances(tokenName, [{ address: caller }]);
        if (result.err) {
            return result;
        }
        result = await handler.updateBancorTokenParameters(tokenName);
        if (result.err) {
            return result;
        }
    }
    return { err: ErrorCode.RESULT_OK, data: null };

}
