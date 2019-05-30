import { IFeedBack, ErrorCode } from "../../../core";
import { IName, Synchro } from "../synchro";
import { HASH_TYPE, SYS_TOKEN } from "../../storage/StorageDataBase";

// it will record the R, S, F参数
export async function checkCreateBancorToken(handler: Synchro, receipt: any, tokenType: string) {
  return new Promise<IFeedBack>(async (resolv) => {
    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let preBalances = receipt.tx.input.preBalances; // array
    let datetime = receipt.block.timestamp;
    let caller = receipt.tx.caller;
    let nameLst: IName[] = [];
    let amountAll: number = 0;
    let addrLst: string[] = [];
    let nonliquidity: number = (receipt.tx.input.nonliquidity !== undefined) ? (parseFloat(receipt.tx.input.nonliquidity)) : (0);
    let factor = parseFloat(receipt.tx.input.factor);
    let reserve = parseFloat(receipt.tx.value)
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    // add it into hash table

    preBalances.forEach((element: any) => {
      nameLst.push({ address: element.address });
      amountAll += parseInt(element.amount);
      addrLst.push(element.address)
    });
    addrLst.push(caller)

    // put address into hashtable
    let feedback = await handler.pStorageDb.updateNamesToHashTable(addrLst, HASH_TYPE.ADDRESS);
    if (feedback.err) {
      resolv(feedback);
      return;
    }

    // insert into txaddresstable
    feedback = await handler.pStorageDb.updateHashToTxAddressTable(hash, addrLst, time);
    if (feedback.err) {
      resolv(feedback);
      return;
    }

    // update caller balance
    let result = await handler.updateBalance(SYS_TOKEN, { address: caller });
    if (result.err) {
      resolv(result);
      return;
    }

    if (receipt.receipt.returnCode === 0) {
      // get add token table
      result = await handler.pStorageDb.insertTokenTable(tokenName, tokenType, caller, datetime, Buffer.from(JSON.stringify({
        factor: factor,
        supply: amountAll,
        nonliquidity: nonliquidity,
        reserve: reserve
      })));
      handler.logger.info('checkCreateBancorToken insert token table')
      if (result.err) {
        resolv(result);
        return;
      }

      // update accounts token account table
      result = await handler.updateBancorTokenBalances(tokenName, nameLst);
      if (result.err) {
        resolv(result);
        return;
      }

      // put tokenname into hash table
      result = await handler.pStorageDb.updateNameToHashTable(tokenName, HASH_TYPE.TOKEN);
      if (result.err) {
        resolv(result);
        return;
      }

      result = await handler.insertBancorTokenParameters(tokenName);
      if (result.err) {
        resolv(result);
        return;
      }
    }

    resolv({ err: ErrorCode.RESULT_OK, data: null });
  });
}
