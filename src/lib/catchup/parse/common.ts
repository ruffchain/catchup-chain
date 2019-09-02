import { IFeedBack, ErrorCode, BigNumber } from "../../../core";
import { Synchro } from "../synchro";
import { SYS_TOKEN, TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function txFailHandle(handler: Synchro, caller: string, valCaller: BigNumber, creator: string, valCreator: BigNumber, fee: number): Promise<IFeedBack> {


    handler.logger.debug('txFailHandle caller balance: ' + (valCaller.toNumber() - fee))
    // udpate caller  sys balance
    let result = await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller.minus(new BigNumber(fee)).toString());

    if (result.err) {
        handler.logger.error('WriteAccountTable caller failed')
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
    }

    // udpate creator sys balance
    result = await handler.laWriteAccountTable(creator, SYS_TOKEN, TOKEN_TYPE.SYS, valCreator.plus(new BigNumber(fee)).toString());

    if (result.err) {
        handler.logger.error('WriteAccountTable creator failed')
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
    }

    return { err: ErrorCode.RESULT_OK, data: null }
}
/**
 * 
 * @param handler 
 * @param caller 
 * @param creator 
 * 
 * { valCreator:number, valCaller: number}
 */

export async function queryCallerCreator(handler: Synchro, caller: string, creator: string): Promise<IFeedBack> {

    let result = await handler.laQueryAccountTable(caller, SYS_TOKEN);
    if (result.err) {
        return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
    }
    let valCaller = result.data

    result = await handler.laQueryAccountTable(creator, SYS_TOKEN);
    if (result.err) {
        return { err: ErrorCode.RESULT_SYNC_GETBALANCE_FAILED, data: null }
    }
    let valCreator = result.data
    return {
        err: ErrorCode.RESULT_OK,
        data: {
            valCaller: valCaller,
            valCreator: valCreator
        }
    }
}