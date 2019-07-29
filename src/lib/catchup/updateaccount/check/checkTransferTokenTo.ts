import { Synchro } from "../../synchro";
import { IfTokenAddressCp } from "../newUpdateTx";
import { IFeedBack, ErrorCode } from "../../../../core";
import { SYS_TOKEN } from "../../../storage/StorageDataBase";


export function checkTransferTokenTo(handler: Synchro, receipt: any, lst: IfTokenAddressCp[]) {
    return new Promise<IFeedBack>(async (resolv) => {

        let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
        let caller = receipt.tx.caller;
        let to = receipt.tx.input.to;
        let hash = receipt.tx.hash;
        let time = receipt.block.timestamp;

        // insert into txaddresstable
        let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller, to], time);
        if (feedback.err) {
            resolv(feedback);
            return;
        }

        let result = await handler.updateBalance(SYS_TOKEN, { address: caller });
        if (result.err) {
            resolv(result);
            return;
        }

        if (receipt.receipt.returnCode === 0) {
            let result = await handler.updateTokenBalances(tokenName, [{ address: caller }, { address: to }]);
            if (result.err) {
                resolv(result);
                return;
            }

        }

        resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
}