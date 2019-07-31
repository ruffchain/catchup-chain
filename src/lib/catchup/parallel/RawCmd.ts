import { TOKEN_TYPE } from "../../storage/StorageDataBase";
import { pCheckTransferTo } from "./check/pTransferto";
import { pCheckCreateToken } from "./check/pCreatetoken";
import { pCheckTransferTokenTo } from "./check/pTransfertokento";
import { pCheckMortgage } from "./check/pMortgage";
import { pCheckUnmortgage } from "./check/pUnmortgage";
import { pCheckVote } from "./check/pVote";
import { pCheckRegister } from "./check/pRegister";
import { pCheckUnregister } from "./check/pUnregister";
import { pCheckCreateLockBancorToken } from "./check/pCreatebancortoken";
import { pCheckTransferLockBancorTokenTo } from "./check/pTransferbancortokento";
import { pCheckTransferLockBancorTokenToMulti } from "./check/pTransferbancortokentomulti";
import { pCheckSellLockBancorToken } from "./check/pSellbancortoken";
import { pCheckBuyLockBancorToken } from "./check/pBuybancortoken";
import { pCheckRunUserMethod } from "./check/pRunusermethod";
import { pCheckDefaultCommand } from "./check/pSetusercode";

export enum RawCmdType {
    NEED_NOPE_ACCESS = 0,
    NEED_NETWORK_ACCESS = 1,
    NEED_DB_ACCESS = 2
}
export enum ArgsType {
    NAMES_TO_HASH_TABLE = 0,
    HASH_TO_TXADDRESS_TABLE = 1,
    UPDATE_ACCOUNT_TABLE = 2,
    INSERT_TO_TRANSFERTO_TABLE = 3,
    INSERT_TO_TOKEN_TABLE = 4,
    UPDATE_TOKEN_ACCOUNT_TABLE = 5,
    UPDATE_BANCOR_TOKEN_ACCOUNT_TABLE = 6,
    UPDATE_PARAMS_TO_BANCOR_TOKEN_TABLE = 7,
}

export class RawCmd {
    public type: RawCmdType;
    public argsType: ArgsType;
    public args: any;

    constructor(mType: RawCmdType, mArgsType: ArgsType, mArgs: any) {
        this.type = mType;
        this.args = mArgs;
        this.argsType = mArgsType;
    }
}

export function createRawCmds(recet: any): RawCmd[] {
    let tx = recet.tx;

    if (tx.method === 'transferTo') {
        return pCheckTransferTo(recet);
    }
    else if (tx.method === 'createToken') {
        return pCheckCreateToken(recet, TOKEN_TYPE.NORMAL);
    }
    else if (tx.method === 'transferTokenTo') {
        return pCheckTransferTokenTo(recet);
    }
    else if (tx.method === 'mortgage') {
        return pCheckMortgage(recet);
    }
    else if (tx.method === 'unmortgage') {
        return pCheckUnmortgage(recet);
    }
    else if (tx.method === 'vote') {
        return pCheckVote(recet);
    }
    else if (tx.method === 'register') {
        return pCheckRegister(recet);
    }
    else if (tx.method === 'unregister') {
        return pCheckUnregister(recet);
    }
    else if (tx.method === 'createBancorToken') {
        return pCheckCreateLockBancorToken(recet, TOKEN_TYPE.BANCOR);
    }
    else if (tx.method === 'transferBancorTokenTo') {
        return pCheckTransferLockBancorTokenTo(recet, TOKEN_TYPE.BANCOR);
    }
    else if (tx.method === 'transferBancorTokenToMulti') {
        return pCheckTransferLockBancorTokenToMulti(recet, TOKEN_TYPE.BANCOR);
    }
    else if (tx.method === 'sellBancorToken') {
        return pCheckSellLockBancorToken(recet, TOKEN_TYPE.BANCOR);
    }
    else if (tx.method === 'buyBancorToken') {
        return pCheckBuyLockBancorToken(recet, TOKEN_TYPE.BANCOR);
    }
    else if (tx.method === 'runUserMethod') {
        return pCheckRunUserMethod(recet);
    }
    else if (tx.method === 'setUserCode'
        || tx.method === 'getUserCode'
    ) {
        return pCheckDefaultCommand(recet);
    }
    else {
        throw new Error('Unrecognized account and token method:');
    }
}