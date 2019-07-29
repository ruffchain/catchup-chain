import { Synchro } from "../../synchro";
import { IfTokenAddressCp } from "../newUpdateTx";
import { IFeedBack, ErrorCode } from "../../../../core";
import { SYS_TOKEN } from "../../../storage/StorageDataBase";


export function checkDefaultCommand(handler: Synchro, receipt: any, lst: IfTokenAddressCp[]) {
    return new Promise<IFeedBack>(async (resolv) => {
        // get caller balance
        let caller = receipt.tx.caller;
        let hash = receipt.tx.hash;
        let time = receipt.block.timestamp;
        // 
        // insert into txaddresstable
        let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller], time);
        if (feedback.err) {
            resolv(feedback);
            return;
        }

        //if (receipt.receipt.returnCode === 0) {
        handler.logger.info('checkDefaultCommand');
        feedback = await handler.updateBalances(SYS_TOKEN, [{ address: caller }]);
        if (feedback.err) {
            resolv(feedback);
            return;
        }
        //}

        resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
}