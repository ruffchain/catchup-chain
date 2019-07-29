import { IFeedBack, ErrorCode, Receipt } from "../../../core";
import { Synchro } from "../synchro";
import { HASH_TYPE, TOKEN_TYPE } from "../../storage/StorageDataBase";
import { handleAccountAndToken } from "./handleUpdateTx";
import { checkTransferTo } from "./check/checkTransferTo";
import { checkCreateToken } from "./check/checkCreateToken";
import { checkTransferTokenTo } from "./check/checkTransferTokenTo";
import { checkMortgage } from "./check/checkMortgage";
import { checkUnmortgage } from "./check/checkUnmortgage";
import { checkVote } from "./check/checkVote";
import { checkRegister } from "./check/checkRegister";
import { checkUnregister } from "./check/checkUnregister";
import { checkCreateLockBancorToken } from "./check/checkCreateBancorToken";
import { checkTransferLockBancorTokenTo } from "./check/checkTransferLockBancorTokenTo";
import { checkTransferLockBancorTokenToMulti } from "./check/checkTransferLockBancorTokenToMulti";
import { checkSellLockBancorToken } from "./check/checkSellLockBancorToken";
import { checkBuyLockBancorToken } from "./check/checkBuyLockBancorToken";
import { checkRunUserMethod } from "./check/checkRunUserMethod";
import { checkDefaultCommand } from "./check/checkDefaultCommand";

export interface IfTokenAddressCp {
    token: string;
    type: string;
    addresses: string[];
}


export async function updateTx(handler: Synchro, bhash: string, nhash: number, dtime: number, txs: any[]) {
    return new Promise<IFeedBack>(async (resolv) => {
        // 
        let tokenAddressLst: IfTokenAddressCp[] = [];

        for (let j = 0; j < txs.length; j++) {
            let hash = txs[j].hash;
            let blockhash = bhash;
            let blocknumber = nhash;
            let address = txs[j].caller;
            let datetime = dtime;

            // insertOrReplace it into hash table
            let feedback = await handler.pStorageDb.insertOrReplaceHashTable(hash, HASH_TYPE.TX);
            if (feedback.err) {
                resolv({ err: feedback.err, data: null });
                return;
            }

            // get receipt
            feedback = await handler.getReceiptInfo(hash);
            if (feedback.err) {
                handler.logger.error('getReceipt for tx failed')
                resolv({ err: feedback.err, data: null });
                return;
            }
            handler.logger.info('get receipt for tx -->\n')
            console.log(feedback.data)

            // 
            // add cost to tx object
            let recet: any;
            try {
                recet = JSON.parse(feedback.data.toString());
                txs[j].cost = recet.receipt.cost;
            } catch (e) {
                handler.logger.error('parse receipt failed')
                resolv({ err: ErrorCode.RESULT_PARSE_ERROR, data: null });
                return;
            }

            let content: Buffer = Buffer.from(JSON.stringify(txs[j]))
            feedback = await handler.pStorageDb.insertTxTable(hash, blockhash, blocknumber, address, datetime, content);

            if (feedback.err) {
                handler.logger.error('put tx into txtable failed')
                resolv({ err: feedback.err, data: null });
                return;
            }
            console.log('updateTx:')
            console.log(content);

            let tokenAddressLst: IfTokenAddressCp[] = [];
            let feedback2 = await checkAccountAndToken(handler, recet, tokenAddressLst);
            if (feedback2.err) {
                handler.logger.error('checkAccountAndToken() failed.')
                resolv({ err: feedback2.err, data: null });
                return;
            }

        }

        let feedback = await handleAccountAndToken(handler, tokenAddressLst);
        if (feedback.err) {
            resolv(feedback);
            return;
        }

        resolv({ err: ErrorCode.RESULT_OK, data: null })
    });
}

async function checkAccountAndToken(handler: Synchro, receipt: any, lst: IfTokenAddressCp[]): Promise<IFeedBack> {

    let recet = receipt;
    handler.logger.info('checkAccountAndToken\n')

    let tx = recet.tx;
    console.log(tx);

    if (tx.method === 'transferTo') {
        return checkTransferTo(handler, recet, lst);
    }
    else if (tx.method === 'createToken') {
        return checkCreateToken(handler, recet, TOKEN_TYPE.NORMAL, lst);
    }
    else if (tx.method === 'transferTokenTo') {
        return checkTransferTokenTo(handler, recet, lst);
    }
    else if (tx.method === 'mortgage') {
        return checkMortgage(handler, recet, lst);
    }
    else if (tx.method === 'unmortgage') {
        return checkUnmortgage(handler, recet, lst);
    }
    else if (tx.method === 'vote') {
        return checkVote(handler, recet, lst);
    }
    else if (tx.method === 'register') {
        return checkRegister(handler, recet, lst);
    }
    else if (tx.method === 'unregister') {
        return checkUnregister(handler, recet, lst);
    }
    else if (tx.method === 'createBancorToken') {
        return checkCreateLockBancorToken(handler, recet, TOKEN_TYPE.BANCOR, lst);
    }
    else if (tx.method === 'transferBancorTokenTo') {
        return checkTransferLockBancorTokenTo(handler, recet, TOKEN_TYPE.BANCOR, lst);
    }
    else if (tx.method === 'transferBancorTokenToMulti') {
        return checkTransferLockBancorTokenToMulti(handler, recet, TOKEN_TYPE.BANCOR, lst);
    }
    else if (tx.method === 'sellBancorToken') {
        return checkSellLockBancorToken(handler, recet, TOKEN_TYPE.BANCOR, lst);
    }
    else if (tx.method === 'buyBancorToken') {
        return checkBuyLockBancorToken(handler, recet, TOKEN_TYPE.BANCOR, lst);
    }
    else if (tx.method === 'runUserMethod') {
        return checkRunUserMethod(handler, recet, lst);
    }
    else if (tx.method === 'setUserCode'
        || tx.method === 'getUserCode'
    ) {
        handler.logger.info('We wont handle tx:', tx.method, '\n')
        return checkDefaultCommand(handler, recet, lst);
    }
    else {
        return new Promise<IFeedBack>(async (resolv) => {
            handler.logger.error('Unrecognized account and token method:', tx.method);
            resolv({ err: ErrorCode.RESULT_SYNC_TX_UNKNOWN_METHOD, data: null })
        });
    }
}
