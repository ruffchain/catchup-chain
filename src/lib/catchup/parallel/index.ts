import { IFeedBack, ErrorCode } from "../../../core";
import { Synchro } from "../synchro";
import { RawCmd, createRawCmds, RawCmdSet, RawCmdType } from "./RawCmd";


export async function parallelCheckAccountAndToken(handler: Synchro, receiptLst: any[]): Promise<IFeedBack> {

    let rawCmdSet: RawCmdSet = new RawCmdSet();

    for (let i = 0; i < receiptLst.length; i++) {
        let lst: RawCmd[] = createRawCmds(receiptLst[i]);
        lst.forEach((item: RawCmd) => {
            rawCmdSet.add(item);
        })
    }
    handler.logger.info('rawCmdSet:', rawCmdSet.len());

    let cmdNopeAccessLst = rawCmdSet.filterByType(RawCmdType.NEED_NOPE_ACCESS);

    let cmdNetworkAccessLst = rawCmdSet.filterByType(RawCmdType.NEED_NETWORK_ACCESS);


    return { err: ErrorCode.RESULT_OK, data: null };
}