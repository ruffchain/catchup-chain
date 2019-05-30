import { Synchro, IName } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { HASH_TYPE, SYS_TOKEN } from "../../storage/StorageDataBase";
import { BANCOR_TOKEN_PRECISION } from "../../storage/dbapi/scoop";

export async function checkCreateLockBancorToken(handler: Synchro, receipt: any, tokenType: string) {
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
      amountAll += parseInt(element.lock_amount);

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
      handler.logger.info('checkCreateLockBancorToken insert token table')
      if (result.err) {
        resolv(result);
        return;
      }

      // update accounts LockBancor token account table
      result = await handler.updateLockBancorTokenBalances(tokenName, nameLst);
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

export async function updatePureALTRow(handler: Synchro, valueObj: any, token: string, type: string, account: IName): Promise<IFeedBack> {
  let amount: string = (valueObj.amount).substr(1);
  let laAmount: number = parseFloat(amount);
  let value: number = parseFloat(laAmount.toFixed(BANCOR_TOKEN_PRECISION));

  let lockAmount: string = (valueObj.amountLock).substr(1);
  let laLockAmount: number = parseFloat(lockAmount);
  let valueLock: number = parseFloat(laLockAmount.toFixed(BANCOR_TOKEN_PRECISION));

  let dueBlock: number = parseInt((valueObj.dueBlock).substr(1));
  let dueTime: number = valueObj.dueTime;

  let amountTotal = laAmount + laLockAmount;

  // save to account table
  handler.logger.info('updatePureALTRow ->\n')
  let result2 = await handler.pStorageDb.updateAccountTable(account.address, token, type, amountTotal.toString(), value + valueLock);
  if (result2.err) { return result2; }

  // save to LBTT table
  result2 = await handler.pStorageDb.updateALTTable(account.address, token, amount, lockAmount, dueBlock, dueTime);
  if (result2.err) { return result2; }

  return { err: ErrorCode.RESULT_OK, data: null }

}
export async function updateShortALTRow(handler: Synchro, valueObj: any, token: string, type: string, account: IName): Promise<IFeedBack> {
  let amount: string = (valueObj.amount).substr(1);
  let laAmount: number = parseFloat(amount);
  let value: number = parseFloat(laAmount.toFixed(BANCOR_TOKEN_PRECISION));

  // save to account table
  handler.logger.info('updateShortALTRow ->\n')
  let result2 = await handler.pStorageDb.updateAccountTable(account.address, token, type, amount, value);
  if (result2.err) { return result2; }

  // save to LBTT table
  result2 = await handler.pStorageDb.updateALTTable(account.address, token, amount, '0', 0, 0);
  if (result2.err) { return result2; }

  return { err: ErrorCode.RESULT_OK, data: null }

}
