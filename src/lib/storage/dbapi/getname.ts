import { WRQueue } from "../queue";
import { IFeedBack, ErrorCode, isValidAddress } from "../../../core";
import { HASH_TYPE } from "../StorageDataBase";

function isANumber(args: string) {
  // only contain numbers
  let lst = args.split('');

  for (let i = 0; i < lst.length; i++) {
    // this.logger.info('test:', lst[i])
    console.log(parseInt(lst[i]))

    if (isNaN(parseInt(lst[i]))) {
      return false;
    }
  }
  return true;
}

/**
 * 
 * @param handle 
 * @param {number | string} args 
 * @returns {HASH_TYPE}
 */
export async function laGetName(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    let arr: any;
    arr = [];

    if (!isANumber(args)) {
      handle.logger.info('getName: not a number:', args)
      // if it is sys
      let queryName: string;

      if (args === 'sys' || args === 'SYS') {
        resolv({ err: ErrorCode.RESULT_OK, data: [{ hash: 'SYS', type: HASH_TYPE.TOKEN, verified: 0 }] });
        return;
      } else if (args.toString().length > 20) {
        queryName = args.toString();
      }
      else {
        queryName = args.toString().toUpperCase();
      }
      // it is a token name, getAllRecords()
      let result = await handle.pStorageDb.queryHashTableFullName(queryName, 2);
      if (result.data) {
        result.data.forEach((item: any) => {
          arr.push({ type: item.type });
        });
        resolv({ err: ErrorCode.RESULT_OK, data: arr });
      } else {
        resolv({ err: ErrorCode.RESULT_OK, data: [] })
      }

      return;
    } else {
      // if it is a number
      let num = parseInt(args);
      handle.logger.info('getName: num:', num)
      if (num >= 0 && num < handle.pStorageDb.nCurrentHeight) {
        resolv({ err: ErrorCode.RESULT_OK, data: [{ hash: args, type: HASH_TYPE.HEIGHT, verified: 0 }] });
      }
      else {
        resolv({ err: ErrorCode.RESULT_OK, data: [] });
      }
    }
  });
}
