import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";

export async function parseRunUserMethod(handler: Synchro, receipt: IfParseReceiptItem): Promise<IFeedBack> {


    return { err: ErrorCode.RESULT_OK, data: null }
}