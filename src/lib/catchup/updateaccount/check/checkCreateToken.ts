import { IFeedBack, ErrorCode, Receipt } from "../../../../core";
import { Synchro, IName } from "../../synchro";
import { IfTokenAddressCp } from "../newUpdateTx";
import { HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";


export function checkCreateToken(handler: Synchro, receipt: any, tokenType: string, lst: IfTokenAddressCp[]) {
    return new Promise<IFeedBack>(async (resolv) => {
        // 
        let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
        let preBalances = receipt.tx.input.preBalances; // array
        let datetime = receipt.block.timestamp;
        let caller = receipt.tx.caller;
        let nameLst: IName[] = [];
        let addrLst: string[] = [];
        let amountAll: number = 0;
        let precision: number = receipt.tx.input.precision;
        let hash = receipt.tx.hash;
        let time = receipt.block.timestamp;

        // put it into hash table–––

        preBalances.forEach((element: any) => {
            nameLst.push({
                address: element.address
            })
            addrLst.push(element.address)
            amountAll += parseInt(element.amount);
        });

        addrLst.push(caller);

        handler.logger.info('checkCreateToken, updateNamesToHashTable')
        // put address into hash table
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

            // add a new token to token table
            result = await handler.pStorageDb.insertTokenTable(tokenName, tokenType, caller, datetime, Buffer.from(JSON.stringify({
                supply: amountAll,
                precision: precision
            })));
            handler.logger.info('createToken insertTokenTable , result:', result)
            if (result.err) {
                resolv(result);
                return;
            }

            // update accounts token account table
            result = await handler.updateTokenBalances(tokenName, nameLst);
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
        }

        resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
}
