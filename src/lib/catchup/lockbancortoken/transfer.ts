import { Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { SYS_TOKEN } from "../../storage/StorageDataBase";


export async function checkTransferLockBancorTokenTo(handler: Synchro, receipt: any, tokenType: string): Promise<IFeedBack> {

  handler.logger.info('checkTransferLockBancorTokenTo -->');

  let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
  let caller = receipt.tx.caller;
  let to = receipt.tx.input.to;
  let hash = receipt.tx.hash;
  let time = receipt.block.timestamp;

  // insert into txaddresstable
  let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller, to], time);
  if (feedback.err) {
    return feedback;
  }

  let result = await handler.updateBalance(SYS_TOKEN, { address: caller });
  if (result.err) {
    return result;
  }

  if (receipt.receipt.returnCode === 0) {
    let result = await handler.updateLockBancorTokenBalances(tokenName, [{ address: caller }, { address: to }]);
    if (result.err) {
      return result;
    }

  }
  return { err: ErrorCode.RESULT_OK, data: null };

}
