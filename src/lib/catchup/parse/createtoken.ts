import { IfParseReceiptItem, Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";

export async function parseCreateToken(handler: Synchro, receipt: IfParseReceiptItem): Promise<IFeedBack> {


    return { err: ErrorCode.RESULT_OK, data: null }
}