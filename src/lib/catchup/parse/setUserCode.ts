import { ErrorCode, IFeedBack, BigNumber } from "../../../core";
import { IfParseReceiptItem, Synchro } from "../synchro";
import { queryCallerCreator, txFailHandle } from "./common";
import { HASH_TYPE } from "../../storage/StorageDataBase";



function getFeeCostForCode(code: string | Buffer): BigNumber {
    let byteCost = new BigNumber(code.length * 204 * 18).div(1000000000);

    return new BigNumber(0.002).plus(byteCost);
}


export async function parseSetUserCode(handler: Synchro, receipt: IfParseReceiptItem): Promise<IFeedBack> {
    let caller = receipt.tx.caller;
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;
    let fee = parseFloat(receipt.receipt.cost)
    let creator = receipt.block.coinbase;

    handler.logger.info('\n## parseSetUserCode()');
    // insert into txaddresstable
    let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller], time);
    if (feedback.err) {
        return (feedback);
    }

    let result = await queryCallerCreator(handler, caller, creator);
    if (result.err) {
        return result;
    }

    let [valCaller, valCreator] = [new BigNumber(result.data.valCaller), new BigNumber(result.data.valCreator)];

    handler.logger.info('parseSetUserCode, updateBalances ' + valCaller + ' ' + valCreator);

    if (receipt.receipt.returnCode !== 0) {
        handler.logger.info('Failed transaction, fee: ' + fee + ' old balance : ' + valCaller)
        let result = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
        if (result.err) {
            handler.logger.error('createToken tx failed.')
            return result;
        }
    } else {
        let result = await txFailHandle(handler, caller, valCaller, creator, valCreator, fee);
        if (result.err) {
            handler.logger.error('createToken tx failed.')
            return result;
        }
    }

    handler.logger.info('\n## End parseSetUserCode() succeed');
    return { err: ErrorCode.RESULT_OK, data: null };
}
