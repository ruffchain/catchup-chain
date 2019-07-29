import { Synchro } from "../../synchro";
import { IFeedBack, ErrorCode } from "../../../../core";
import { HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";
import { IfTokenAddressCp } from "../newUpdateTx";


export function checkTransferTo(handler: Synchro, receipt: any, lst: IfTokenAddressCp[]) {
    return new Promise<IFeedBack>(async (resolv) => {
        handler.logger.info('Print checkTransferTo()');
        console.log(receipt);

        let caller = receipt.tx.caller;
        let to = receipt.tx.input.to;
        let hash = receipt.tx.hash;
        let time = receipt.block.timestamp;
        let cost = receipt.receipt.cost;
        // Add Yang Jun 2019-6-24
        // let value = receipt.tx.value; // string
        // let fee = receipt.tx.fee;
        // Add Yang Jun 2019-6-24
        let blockhash = receipt.block.hash;
        let blocknumber = receipt.block.number;
        let datetime = receipt.block.timestamp;
        let content = Buffer.from(JSON.stringify(receipt.tx));
        let returnCode = receipt.receipt.returnCode;

        // update caller, to address to hash table
        // this.logger.info('checkTxTransferto, updateNamesToHashTable\n')
        // // put address into hashtable
        handler.logger.info('checkTransferTo, updateNamesToHashTable')
        let feedback = await handler.pStorageDb.updateNamesToHashTable([caller, to], HASH_TYPE.ADDRESS);
        if (feedback.err) {
            resolv(feedback);
            return;
        }

        // insert into txaddresstable
        feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller, to], time);
        if (feedback.err) {
            resolv(feedback);
            return;
        }

        //if (receipt.receipt.returnCode === 0) {
        handler.logger.info('checkTranserTo, updateBalances')
        feedback = await handler.updateBalances(SYS_TOKEN, [{ address: caller }, { address: to }]);
        if (feedback.err) {
            resolv(feedback);
            return;
        }
        //}
        // Update txTransferTo txs
        // if (receipt.receipt.returnCode === 0) {
        handler.logger.info('Put it into txTransferToTable')
        feedback = await handler.pStorageDb.insertTxTransferToTable(hash, blockhash, blocknumber, caller, datetime, content, to, returnCode);
        if (feedback.err) {
            handler.logger.error('put tx into txtransfertotable failed');
            resolv(feedback);
            return;
        }
        // }

        // Update txTransferTo txs
        // if (receipt.receipt.returnCode === 0) {
        handler.logger.info('Put it into txTransferToTable')
        feedback = await handler.pStorageDb.insertTxTransferToTable(hash, blockhash, blocknumber, caller, datetime, content, to, returnCode);
        if (feedback.err) {
            handler.logger.error('put tx into txtransfertotable failed');
            resolv(feedback);
            return;
        }

        resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
}