import { IFeedBack, ErrorCode } from "../../../core";
import { Synchro } from "../synchro";
import { SYS_TOKEN, TOKEN_TYPE } from "../../storage/StorageDataBase";

export async function txFailHandle(handler: Synchro, caller: string, valCaller: number, creator: string, valCreator: number, fee: number): Promise<IFeedBack> {

    await handler.pStorageDb.execRecord('BEGIN', {})

    handler.logger.debug('txFailHandle caller balance: ' + (valCaller - fee))
    // udpate caller  sys balance
    let result = await handler.laWriteAccountTable(caller, SYS_TOKEN, TOKEN_TYPE.SYS, valCaller - fee);

    if (result.err) {
        handler.logger.error('WriteAccountTable caller failed')
        await handler.pStorageDb.execRecord('ROLLBACK', {})
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
    }

    // udpate creator sys balance
    result = await handler.laWriteAccountTable(creator, SYS_TOKEN, TOKEN_TYPE.SYS, valCreator + fee);

    if (result.err) {
        handler.logger.error('WriteAccountTable creator failed')
        await handler.pStorageDb.execRecord('ROLLBACK', {})
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
    }

    let hret = await handler.pStorageDb.execRecord('COMMIT', {})

    if (hret.err) {
        await handler.pStorageDb.execRecord('ROLLBACK', {})
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