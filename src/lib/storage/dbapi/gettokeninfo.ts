import { IFeedBack, ErrorCode } from "../../../core";
import { WRQueue } from "../queue";
// import { TOKEN_TYPE } from "../StorageDataBase";



export async function laGetTokenInfo(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    let token: string = args.toUpperCase();
    // if (token === 'SYS') {
    // resolv({ err: ErrorCode.RESULT_OK, data: { name: 'SYS', type: TOKEN_TYPE.SYS, address: '-', timestamp: 0 } })
    // return;
    // token === 'sys';
    // }
    // getRecord()
    let result = await handle.pStorageDb.queryTokenTable(token);
    if (result.err === ErrorCode.RESULT_OK) {
      result.data.content = JSON.parse(result.data.content);
      resolv(result);
    } else {
      resolv({ err: ErrorCode.RESULT_SYNC_GETTOKENINFO_FAILED, data: {} })
    }
  })
}
