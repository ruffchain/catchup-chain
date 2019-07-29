import { Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { IfTokenAddressCp } from "./newUpdateTx";

export async function handleAccountAndToken(handler: Synchro, lst: IfTokenAddressCp[]): Promise<IFeedBack> {

    return { err: ErrorCode.RESULT_OK, data: null };
}