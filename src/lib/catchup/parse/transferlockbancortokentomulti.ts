import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { TOKEN_TYPE, SYS_TOKEN, HASH_TYPE } from "../../storage/StorageDataBase";
import { queryCallerCreator, txFailHandle } from "./common";

export async function parseTransferLockBancorTokenToMulti(handler: Synchro, receipt: IfParseReceiptItem, tokenType: string): Promise<IFeedBack> {
    handler.logger.info('\n## parseTransferLockBancorTokenToMulti()');

    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    // let to = receipt.tx.input.to;
    let to: string[] = [];
    let addressArr = [];
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let tos = receipt.tx.input.to;
    let fee = parseFloat(receipt.tx.fee);
    let amountAll: number = 0;
    let creator = receipt.block.creator;

    let newTos: { address: string, amount: string }[] = [];

    for (let i = 0; i < tos.length; i++) {
        to.push(tos[i].address);
        addressArr.push({ address: tos[i].address });
        amountAll += parseFloat(tos[i].amount);

        let item = newTos.find((elem) => {
            return tos[i].address === elem.address;
        })
        if (!item) {
            newTos.push(tos[i]);
        } else {
            item.amount = (parseFloat(tos[i].amount) + parseFloat(item.amount)).toString();
        }
    }
    addressArr.push({ address: caller });

    let feedback = await handler.pStorageDb.updateNamesToHashTable(to, HASH_TYPE.ADDRESS);

    if (feedback.err) {
        return feedback;
    }

    // insert into txaddresstable
    feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller].concat(to), time);
    if (feedback.err) {
        return feedback;
    }


    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }

    let [valCaller, valCreator] = [result.data.valCaller, result.data.valCreator];

    if (receipt.receipt.returnCode !== 0) {
        // update caller balance
        feedback = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
        if (feedback.err) {
            return feedback;
        }
    } else {
        // query caller SYS balance

        // query caller token balance
        result = await handler.laQueryAccountTable(caller, tokenName)
        if (result.err) {
            return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
        }
        let valTokenCaller = result.data

        // query tos token balance
        let tosTokenLst: { address: string, amount: number }[] = [];
        for (let i = 0; i < newTos.length; i++) {
            let hres = await handler.laQueryAccountTable(newTos[i].address, tokenName);
            if (hres.err) {
                return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
            }
            tosTokenLst.push({ address: newTos[i].address, amount: hres.data + parseFloat(newTos[i].amount) })
        }

        // use transaction
        await handler.pStorageDb.execRecord('BEGIN', {})
        // update caller SYS balance
        await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller - fee);

        await handler.laWriteAccountTable(creator, SYS_TOKEN, TOKEN_TYPE.SYS, valCreator + fee);

        // update caller token balance
        result = await handler.laWriteAccountTable(caller, tokenName, tokenType, valTokenCaller - amountAll);

        // update tos token balance
        for (let i = 0; i < tosTokenLst.length; i++) {
            handler.logger.info('update ' + tosTokenLst[i].address + ' val: ' + tosTokenLst[i].amount);
            await handler.laWriteAccountTable(tosTokenLst[i].address, tokenName, tokenType, tosTokenLst[i].amount)
        }
        let hret = await handler.pStorageDb.execRecord('COMMIT', {})
        if (hret.err) {
            await handler.pStorageDb.execRecord('ROLLBACK', {})
            return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
        }
    }
    handler.logger.info('\n## parseTransferLockBancorTokenToMulti() succeed');
    return { err: ErrorCode.RESULT_OK, data: null }
}