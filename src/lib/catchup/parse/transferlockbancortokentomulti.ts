import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { SYS_TOKEN } from "../../storage/dbapi/scoop";
import { TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function parseTransferLockBancorTokenToMulti(handler: Synchro, receipt: IfParseReceiptItem, tokenType: string): Promise<IFeedBack> {
    handler.logger.info('parseTransferLockBancorTokenToMulti -->');

    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    // let to = receipt.tx.input.to;
    let to = [];
    let addressArr = [];
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let tos = receipt.tx.input.to;
    let fee = receipt.tx.fee;
    let amountAll: number = 0;

    for (let i = 0; i < tos.length; i++) {
        to.push(tos[i].address);
        addressArr.push({ address: tos[i].address });
        amountAll += parseFloat(tos[i].amount);
    }
    addressArr.push({ address: caller });

    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller].concat(to), time);
    if (feedback.err) {
        return feedback;
    }

    if (receipt.receipt.returnCode !== 0) {
        // update caller balance
        feedback = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -fee);
        if (feedback.err) {
            return feedback;
        }
    } else {
        // query caller SYS balance
        let result = await handler.laQueryAccountTable(caller, SYS_TOKEN);
        if (result.err) {
            return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
        }
        let valCaller = result.data

        // query caller token balance
        result = await handler.laQueryAccountTable(caller, tokenName)
        if (result.err) {
            return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
        }
        let valTokenCaller = result.data

        // query tos token balance
        let tosTokenLst: { address: string, amount: number }[] = [];
        for (let i = 0; i < tos.length; i++) {
            let hres = await handler.laQueryAccountTable(tos[i].address, tokenName);
            if (hres.err) {
                return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
            }
            tosTokenLst.push({ address: tos[i].address, amount: hres.data + tos[i].amount })
        }

        // use transaction
        await handler.pStorageDb.execRecord('BEGIN', {})
        // update caller SYS balance
        await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller - fee);

        // update caller token balance
        result = await handler.laWriteAccountTable(caller, tokenName, tokenType, valTokenCaller - amountAll);

        // update tos token balance
        for (let i = 0; i < tosTokenLst.length; i++) {
            await handler.laWriteAccountTable(tosTokenLst[i].address, tokenName, tokenType, tosTokenLst[i].amount)
        }
        let hret = await handler.pStorageDb.execRecord('COMMIT', {})
        if (hret.err) {
            await handler.pStorageDb.execRecord('ROLLBACK', {})
            return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
        }
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}