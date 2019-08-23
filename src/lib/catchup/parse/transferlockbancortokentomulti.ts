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

    // update caller balance
    feedback = await handler.laUpdateAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, -fee);
    if (feedback.err) {
        return feedback;
    }
    if (receipt.receipt.returnCode === 0) {

        let result = await handler.laUpdateAccountTable(caller, tokenName, tokenType, -amountAll);

        if (result.err) {
            handler.logger.error('error laUpdateAccountTable minus caller');
            return result;
        }
        for (let i = 0; i < tos.length; i++) {
            let result = await handler.laUpdateAccountTable(tos[i].address, tokenName, tokenType, parseFloat(tos[i].amount));

            if (result.err) {
                handler.logger.error('error laUpdateAccountTable add to address');
                return result;
            }
        }
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}