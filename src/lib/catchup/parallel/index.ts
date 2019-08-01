import { IFeedBack, ErrorCode } from "../../../core";
import { Synchro } from "../synchro";
import { RawCmd, createRawCmds, RawCmdSet, RawCmdType } from "./RawCmd";
import { SingleCmdSet, SingleCmd } from "./SingleCmd";


export async function parallelCheckAccountAndToken(handler: Synchro, receiptLst: any[]): Promise<IFeedBack> {

    let rawCmdSet: RawCmdSet = new RawCmdSet();

    for (let i = 0; i < receiptLst.length; i++) {
        let lst: RawCmd[] = createRawCmds(receiptLst[i]);
        lst.forEach((item: RawCmd) => {
            rawCmdSet.add(item);
        })
    }
    handler.logger.info('rawCmdSet len:', rawCmdSet.len());

    let singleCmdSet = new SingleCmdSet();
    // use parallel method to get singleCmd
    let promiseLst: Promise<IFeedBack>[] = [];
    for (let i = 0; i < rawCmdSet.len(); i++) {
        let rawcmd = rawCmdSet.get(i);
        let func = new Promise<IFeedBack>(async (resolv) => {
            let feedback: IFeedBack = await rawcmd.createSingleCmds(handler);
            resolv(feedback);
        });
        promiseLst.push(func);
    }
    let faultCounter = 0;
    await Promise.all(promiseLst).then((result) => {
        for (let item of result) {
            if (item.err === ErrorCode.RESULT_OK) {
                singleCmdSet.addCmds(item.data);
            } else {
                faultCounter++;
            }
        }
    });
    if (faultCounter > 0) {
        return { err: ErrorCode.RESULT_EXECUTE_ERROR, data: null }
    }

    handler.logger.info('singleCmdSet len:', singleCmdSet.len());

    let feedback = await singleCmdSet.exec(handler);
    if (feedback.err) {
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
    }

    return { err: ErrorCode.RESULT_OK, data: null };
}