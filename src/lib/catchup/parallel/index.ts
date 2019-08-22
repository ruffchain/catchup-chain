import { IFeedBack, ErrorCode } from "../../../core";
import { Synchro } from "../synchro";
import { RawCmd, createRawCmds, RawCmdSet, RawCmdType } from "./RawCmd";
import { SingleCmdSet } from "./SingleCmd";
import { DelayPromise } from "../../../api/common";

function computeDelay(len: number) {
    if (len > 6000) {
        return 11
    }
    if (len > 5000) {
        return 10
    }
    if (len > 4000) {
        return 9
    }
    if (len > 3000) {
        return 8
    }
    if (len > 2000) {
        return 2
    }
    if (len > 1000) {
        return 1.5
    }
    if (len > 800) {
        return 0.5
    }
    if (len > 600) {
        return 0.5
    }
    if (len > 400) {
        return 0.5
    }
    if (len > 200) {
        return 0.5
    }
    if (len > 100) {
        return 0.2;
    }
    // if (len > 50) {
    //     return 0.5;
    // }
    // if (len > 25) {
    //     return 0.4
    // }
    // if (len > 10) {
    //     return 0.2;
    // }

    return 0;

}

export async function parallelCheckAccountAndToken(handler: Synchro, receiptLst: any[]): Promise<IFeedBack> {

    let rawCmdSet: RawCmdSet = new RawCmdSet();
    let startCreateRawCmds = new Date().getTime();
    for (let i = 0; i < receiptLst.length; i++) {
        let lst: RawCmd[] = createRawCmds(receiptLst[i]);
        lst.forEach((item: RawCmd) => {
            rawCmdSet.add(item);
        })
    }
    let endCreateRawCmds = new Date().getTime();
    console.log('createRawCmds delta is:', endCreateRawCmds - startCreateRawCmds);
    handler.logger.info('rawCmdSet len:', rawCmdSet.len());

    let singleCmdSet = new SingleCmdSet();
    // use parallel method to get singleCmd

    let randDelay = computeDelay(rawCmdSet.len());

    let promiseLst: Promise<IFeedBack>[] = [];
    for (let i = 0; i < rawCmdSet.len(); i++) {
        let rawcmd = rawCmdSet.get(i);
        let func = new Promise<IFeedBack>(async (resolv) => {
            // Add by Yang Jun
            await DelayPromise(randDelay * Math.random());

            let feedback: IFeedBack = await rawcmd.createSingleCmds(handler);
            resolv(feedback);
        });
        promiseLst.push(func);
    }
    let faultCounter = 0;
    let startTime = new Date().getTime();

    await Promise.all(promiseLst).then((result) => {
        for (let item of result) {
            if (item.err === ErrorCode.RESULT_OK) {
                singleCmdSet.addCmds(item.data);
            } else {
                faultCounter++;
            }
        }
    });
    let endTime = new Date().getTime();
    console.log('Delta of promise.all: ', endTime - startTime);

    if (faultCounter > 0) {
        return { err: ErrorCode.RESULT_EXECUTE_ERROR, data: null }
    }

    handler.logger.info('\nsingleCmdSet len:', singleCmdSet.len());
    singleCmdSet.print();

    let feedback = await singleCmdSet.exec(handler);
    if (feedback.err) {
        return { err: ErrorCode.RESULT_DB_TABLE_FAILED, data: null }
    }
    console.log('Delata of exec is:', new Date().getTime() - endTime);

    return { err: ErrorCode.RESULT_OK, data: null };
}