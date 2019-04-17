import { WRQueue } from "../queue";
import { IFeedBack, ErrorCode } from "../../../core";

/**
 * Default function place-holder
 * @param handle 
 * @param args 
 */
export async function laDefault(handle: WRQueue, args: any) {
  return new Promise<IFeedBack>(async (resolv) => {
    resolv({ err: ErrorCode.RESULT_OK, data: 'Unknown funName' })
  });
}
