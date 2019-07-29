import { Synchro } from "../../synchro";
import { IfTokenAddressCp } from "../newUpdateTx";
import { IFeedBack, ErrorCode } from "../../../../core";
import { HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";



export function checkMortgage(handler: Synchro, recept: any, lst: IfTokenAddressCp[]): Promise<IFeedBack> {
    return new Promise<IFeedBack>(async (resolv) => {

        let caller = recept.tx.caller;
        let hash = recept.tx.hash;
        let time = recept.block.timestamp;

        handler.logger.info('checkMortgage, updateNamesToHashTable')
        let feedback = await handler.pStorageDb.updateNamesToHashTable([caller], HASH_TYPE.ADDRESS);

        if (feedback.err) {
            resolv(feedback);
            return;
        }

        // insert into txaddresstable
        feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller], time);
        if (feedback.err) {
            resolv(feedback);
            return;
        }

        handler.logger.info('checkMortgage, updateBalances')
        feedback = await handler.updateBalances(SYS_TOKEN, [{ address: caller }]);
        if (feedback.err) {
            resolv(feedback);
            return;
        }

        resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
}
