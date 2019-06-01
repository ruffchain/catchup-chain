import { Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { SYS_TOKEN } from "../../storage/StorageDataBase";


export async function checkTransferLockBancorTokenToMulti(handler: Synchro, receipt: any, tokenType: string): Promise<IFeedBack> {

  handler.logger.info('checkTransferLockBancorTokenToMulti -->');

  let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
  let caller = receipt.tx.caller;
  // let to = receipt.tx.input.to;
  let to = [];
  let addressArr = [];
  let hash = receipt.tx.hash;
  let time = receipt.block.timestamp;
  let tos = receipt.tx.input.to;
  for (let i = 0; i < tos.length; i++) {
    to.push(tos[i].address);
    addressArr.push({ address: tos[i].address });
  }
  addressArr.push({ address: caller });

  // insert into txaddresstable
  let feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, [caller].concat(to), time);
  if (feedback.err) {
    return feedback;
  }

  let result = await handler.updateBalance(SYS_TOKEN, { address: caller });
  if (result.err) {
    return result;
  }



  if (receipt.receipt.returnCode === 0) {
    let result = await handler.updateLockBancorTokenBalances(tokenName, addressArr);
    if (result.err) {
      return result;
    }

  }
  return { err: ErrorCode.RESULT_OK, data: null };

}
