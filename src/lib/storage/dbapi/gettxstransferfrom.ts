import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";


/**
 * Get TXs under address
 * @param handle 
 * @param {{address:string, page:number, pageSize:number}} args - index 
 */
export async function laGetTxsTransferFrom(handle: WRQueue, args: any) {
    return new Promise<IFeedBack>(async (resolv) => {

        let result: any;
        let arr: any;
        let argsObj: any;

        if (!args) {
            // getAllRecords()
            result = await handle.pStorageDb.queryLatestTxTransferToTable();
        } else {
            try {
                argsObj = JSON.parse(JSON.stringify(args));
                // result = await handle.pStorageDb.queryTxTableByAddress(argsObj.address,
                //   (argsObj.page > 0) ? (argsObj.page - 1) : 0, argsObj.pageSize);
                handle.logger.info('getTxsTransferFrom ', argsObj)

                result = await handle.pStorageDb.queryTxTransferFromByPage(argsObj.address, (argsObj.page > 0) ? (argsObj.page - 1) : 0, argsObj.pageSize);
                handle.logger.info('getTxsTransferFrom, result:')
                handle.logger.info(result);

            } catch (e) {
                handle.logger.error('Wrong getTransferFrom ARGS');
            }
        }
        if (result.err === ErrorCode.RESULT_OK) {
            try {
                console.log('received result.data')
                console.log(result.data);

                for (let i = 0; i < result.data.length; i++) {
                    result.data[i].content = JSON.parse(result.data[i].content);
                }
                arr = {};
                arr.data = result.data;

                // q
                let result1 = await handle.pStorageDb.queryTxTransferFromTotal(argsObj.address);
                let nTxCount = parseInt(result1.data.count)
                arr.total = nTxCount; // something read from the database

                resolv({ err: ErrorCode.RESULT_OK, data: arr })
                return;

            } catch (e) {
                handle.logger.info('Wrong getTransferFrom result parsing')
            }
        }
        resolv({ err: ErrorCode.RESULT_SYNC_GETTXSTRANSFERFROM_FAILED, data: [] })
    })
}
