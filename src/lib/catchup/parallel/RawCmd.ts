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

// To define a cmd format
// RawCmdType | ArgsType (to a defined command) | args

export enum RawCmdType {
    NEED_NOPE_ACCESS = 0,
    NEED_NETWORK_ACCESS = 1,
    NEED_DB_ACCESS = 2
}
/*
nope::
NAME_TO_HASH_TABLE      - {name:, type: HASH_TYPE.ADDRESS}
HASH_TO_TXADDRESS_TABLE -  { hash: , address: , timestamp:  }
INSERT_TO_TRANSFERTO_TABLE -  {
        hash: hash,
        blockhash: blockhash,
        blocknumber: blocknumber,
        address: caller,
        datetime: time,
        content: content,
        toaddress: to,
        returncode: returnCode
    }
INSERT_TO_TOKEN_TABLE   -  {
            tokenname: tokenName,
            tokentype: type,
            address: caller,
            datetime: datetime,
            content: Buffer.from(JSON.stringify({
                supply: amountAll,
                precision: precision
            }))
        }


network::
UPDATE_ACCOUNT_TABLE    -  { address: , tokentype: SYS_TOKEN }

*/
export enum ArgsType {
    NAME_TO_HASH_TABLE = 0,
    HASH_TO_TXADDRESS_TABLE = 1,
    UPDATE_ACCOUNT_TABLE = 2,
    INSERT_TO_TRANSFERTO_TABLE = 3,
    INSERT_TO_TOKEN_TABLE = 4,
    UPDATE_PARAMS_TO_BANCOR_TOKEN_TABLE = 5,
    UPDATE_BANCOR_TOKEN_TABLE = 6,
    // UPDATE_BANCOR_TOKEN_TABLE_ALBTT = 7,
}

export class RawCmd {
    public type: RawCmdType;
    public argsType: ArgsType;
    public args: any;

    constructor(mType: RawCmdType, mArgsType: ArgsType, mArgs: any) {
        this.type = mType;
        this.argsType = mArgsType;
        this.args = mArgs;
    }
    public eq(rawcmd: RawCmd): boolean {
        if (this.type !== rawcmd.type
            || this.argsType !== rawcmd.argsType) {
            return false;
        }
        let keys = Object.keys(this.args);

        for (let key of keys) {
            if (rawcmd.args[key] === undefined ||
                rawcmd.args[key] !== this.args[key]) {
                return false;
            }
        }

        return true;
    }
    public bType(mtype: RawCmdType) {
        return this.type === mtype;
    }
}
// NameToHashTable
export interface IfRawCmd_NTHT {
    name: string;
    type: string;
}

export class RawCmd_NTHT extends RawCmd {
    constructor(args: IfRawCmd_NTHT) {
        super(RawCmdType.NEED_NOPE_ACCESS, ArgsType.NAME_TO_HASH_TABLE, args);
    }
}
// TxAddressTable, TAT
export interface IfRawCmd_TAT {
    hash: string;
    address: string;
    timestamp: number;
}
export class RawCmd_TAT extends RawCmd {
    constructor(args: IfRawCmd_TAT) {
        super(RawCmdType.NEED_NOPE_ACCESS, ArgsType.HASH_TO_TXADDRESS_TABLE, args);
    }
}
export class RawCmdSet {
    public lst: RawCmd[];
    constructor() {
        this.lst = [];
    }
    public add(rcmd: RawCmd): boolean {
        let cmd = this.lst.find((item: RawCmd) => {
            return item.eq(rcmd);
        })
        if (cmd === undefined) {
            this.lst.push(rcmd);
            return true;
        }
        return false;
    }
    public filterByType(mtype: RawCmdType): RawCmd[] {
        let out: RawCmd[] = this.lst.filter((item: RawCmd) => {
            return item.type === mtype;
        })
        return out;
    }
    public len(): number {
        return this.lst.length;
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