import { Synchro } from "../../synchro";
import { IfTokenAddressCp } from "../newUpdateTx";
import { IFeedBack, ErrorCode } from "../../../../core";
import { SYS_TOKEN } from "../../../storage/StorageDataBase";



export async function checkSellLockBancorToken(handler: Synchro, receipt: any, tokenType: string, lst: IfTokenAddressCp[]): Promise<IFeedBack> {

    handler.logger.info('checkSellLockBancorToken -->');
    let caller = receipt.tx.caller;
    let tokenName = receipt.tx.input.tokenid;
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, addrLst, time);

    if (feedback.err) {
        return feedback;
    }

    // Should update balance of caller, because fee be costed by Chain
    feedback = await handler.updateBalances(SYS_TOKEN, [{ address: caller }]);
    if (feedback.err) {
        return feedback;
    }

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
    return { err: ErrorCode.RESULT_OK, data: null };
}


