import { IFeedBack, ErrorCode } from "../../../core";
import { Synchro } from "../synchro";
import { RawCmd, createRawCmds } from "./RawCmd";


export async function parallelCheckAccountAndToken(handler: Synchro, receiptLst: any[]): Promise<IFeedBack> {

    let rawCmdLst: RawCmd[] = [];

    for (let i = 0; i < receiptLst.length; i++) {
        let lst: RawCmd[] = createRawCmds(receiptLst[i]);
        lst.forEach((item: RawCmd) => {
            rawCmdLst.push(item);
        })
    }


    return { err: ErrorCode.RESULT_OK, data: null };
}