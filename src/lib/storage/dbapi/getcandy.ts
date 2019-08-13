import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";

/** @type {number} - Candy to distribute to one address */
const CANDY_AMOUNT: number = 1000;

/**
 * Get Candy, which is SYS token
 * @param handle 
 * @param {{token:string, address:string}} args 
 */
export async function laGetCandy(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    // if it's empty , so it is SYS 
    handle.logger.info('transfer candy task ...')
    // resolv({ err: ErrorCode.RESULT_OK, data: args })

    let obj: any;
    try {
      obj = JSON.parse(JSON.stringify(args));
    } catch (e) {
      handle.logger.error('taskGetCandy parsing failed')
      resolv({ err: ErrorCode.RESULT_SYNC_GETCANDY_PARSING_FAILED, data: { status: 1, hash: '' } })
      return;
    }

    let tokenName = '';
    let addr = obj.address;

    if (obj.token === undefined || obj.token === 's' || obj.token === 'SYS') {
      tokenName = 's'
    }
    handle.logger.info('getCandy:' + tokenName + ' ' + addr);

    let result = await handle.pStatusDb.getCandyTable(addr, tokenName);
    // resolv(result);
    // return;
    handle.logger.info('getCandy: result ->', result);

    if (result.err === ErrorCode.RESULT_SYNC_GETCANDY_FAILED) {
      resolv({ err: ErrorCode.RESULT_OK, data: { status: 1, hash: '' } })
    }
    else if (result.err === ErrorCode.RESULT_SYNC_GETCANDY_ALREADY_DONE) {
      resolv({ err: ErrorCode.RESULT_OK, data: { status: 1, hash: 'Already got' } })
    } else if (result.err === ErrorCode.RESULT_SYNC_GETCANDY_NOT_YET) {
      // result data can not be null,it will stuck the JSON API
      // resolv({ err: ErrorCode.RESULT_OK, data: "Not yet" })
      let result2 = await handle.pStatusDb.insertCandyTable(addr, tokenName, CANDY_AMOUNT, new Date().getTime());
      handle.logger.info('getCandy, result2', result2)

      if (result2.err === ErrorCode.RESULT_OK) {
        // resolv({ err: ErrorCode.RESULT_OK, data: 'Success' })
        handle.logger.info('getCandy: start to transferCandy');
        let result1 = await handle.pSynchro.transferCandy(addr, CANDY_AMOUNT);
        handle.logger.info('getCandy, result:', result1)
        console.log(result);

        if (result1.ret === 0) {
          handle.logger.info('getCandy, transfer candy 1000 succeed')
          let tmpLst: string[] = result1.resp!.split(':');
          console.log(tmpLst)
          resolv({ err: ErrorCode.RESULT_OK, data: { status: 0, hash: tmpLst[1] } });
          return;
        } else {
          // how to do with it? If remove failed
          await handle.pStatusDb.removeCandyTable(addr, tokenName);
          resolv({ err: ErrorCode.RESULT_OK, data: { status: 1, hash: '' } });
          return;
        }
      } else {
        resolv({ err: ErrorCode.RESULT_OK, data: { status: 1, hash: '' } })
        return;
      }
    }
    // if it is not , 
  });
}
