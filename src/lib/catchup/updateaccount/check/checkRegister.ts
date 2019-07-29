import { Synchro } from "../../synchro";
import { IFeedBack, ErrorCode } from "../../../../core";
import { IfTokenAddressCp } from "../newUpdateTx";
import { SYS_TOKEN, HASH_TYPE } from "../../../storage/StorageDataBase";

export function checkRegister(handler: Synchro, recept: any, lst: IfTokenAddressCp[]): Promise<IFeedBack> {
    return new Promise<IFeedBack>(async (resolv) => {
        let caller = recept.tx.caller;
        let hash = recept.tx.hash;
        let time = recept.block.timestamp;

        let feedback = await updateHashTxAddressTable(handler, [caller], hash, time);
        if (feedback.err) {
            resolv(feedback);
            return;
        }

        handler.logger.info('checkRegister, updateBalances')
        feedback = await handler.updateBalances(SYS_TOKEN, [{ address: caller }]);
        if (feedback.err) {
            resolv(feedback);
            return;
        }

        resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
}

async function updateHashTxAddressTable(handler: Synchro, addresses: string[], hash: string, time: number): Promise<IFeedBack> {
    handler.logger.info('updateHashTxAddressTable');

    let feedback = await handler.pStorageDb.updateNamesToHashTable(addresses, HASH_TYPE.ADDRESS);

    if (feedback.err) {
        return feedback;
    }

    feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, addresses, time);
    if (feedback.err) {
        return feedback;
    }

    return { err: ErrorCode.RESULT_OK, data: null };
}