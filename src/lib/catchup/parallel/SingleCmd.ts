import { RawCmd } from "./RawCmd";
import { IfTokenAddressCp } from "../updateaccount/newUpdateTx";
import { IFeedBack, ErrorCode } from "../../../core";
import { Synchro } from "../synchro";


// to operate with database directly

// categorized by table name
export enum SingleTableType {
    BLOCK_TABLE = 1,
    TX_TABLE = 2,
    HASH_TABLE = 10,
    TXADDRESS_TABLE = 11,
    ACCOUNT_TABLE = 12,
    TX_TRANSFERTO_TABLE = 13,
    TOKEN_TABLE = 14,
    BANCORTOKEN_TABLE = 15,
    ACCOUNT_LBTT_TABLE = 16,
}
function table2Str(table: SingleTableType): string {
    if (table === SingleTableType.HASH_TABLE) {
        return 'HASH_TABLE'
    } else if (table === SingleTableType.TXADDRESS_TABLE) {
        return 'TXADDRESS_TABLE'
    } else if (table === SingleTableType.ACCOUNT_TABLE) {
        return 'ACCOUNT_TABLE'
    } else if (table === SingleTableType.TX_TRANSFERTO_TABLE) {
        return 'TX_TRANSFERTO_TABLE'
    } else if (table === SingleTableType.TOKEN_TABLE) {
        return 'TOKEN_TABLE'
    } else if (table === SingleTableType.BANCORTOKEN_TABLE) {
        return 'BANCORTOKEN_TABLE'
    } else if (table === SingleTableType.ACCOUNT_LBTT_TABLE) {
        return 'ACCOUNT_LBTT_TABLE'
    } else {
        return 'Unknown'
    }
}
export enum SingleOperationtype {
    UPDATE = 100,
}

export class SingleCmd {
    public table: SingleTableType;
    public operation: SingleOperationtype;
    public args: any;

    constructor(mtable: SingleTableType, moper: SingleOperationtype, margs: any) {
        this.table = mtable;
        this.operation = moper;
        this.args = margs;
    }
    public eq(scmd: SingleCmd): boolean {
        if (this.table !== scmd.table || this.operation !== scmd.operation) {
            return false;
        }

        let keys = Object.keys(this.args);

        for (let key of keys) {
            if (scmd.args[key] === undefined ||
                scmd.args[key] !== this.args[key]) {
                return false;
            }
        }
        return true;
    }
}
// Hash table
export interface IfHashTableArgs {
    hash: string, type: string
}
export function newSingleCmdHashTable(args: IfHashTableArgs) {
    return new SingleCmd(SingleTableType.HASH_TABLE, SingleOperationtype.UPDATE, args)
}
function eqCmdHashTable(cmd1: SingleCmd, cmd2: SingleCmd): boolean {
    let arg1 = cmd1.args as IfHashTableArgs;
    let arg2 = cmd2.args as IfHashTableArgs;

    return arg1.hash === arg2.hash && arg1.type === arg2.type;
}
// TxAddress table
export interface IfTxAddressTableArgs {
    hash: string, address: string, datetime: number
}
export function newSingleCmdTxAddressTable(args: IfTxAddressTableArgs) {
    return new SingleCmd(SingleTableType.TXADDRESS_TABLE, SingleOperationtype.UPDATE, args);
}
function eqCmdTxAddressTable(cmd1: SingleCmd, cmd2: SingleCmd): boolean {
    let arg1 = cmd1.args as IfTxAddressTableArgs;
    let arg2 = cmd2.args as IfTxAddressTableArgs;

    return false; // I think every tx has a differnet hash, it's not a state
}
// account table
export interface IfAccountTableArgs {
    hash: string, token: string, tokentype: string, amount: string, value: number
}
export function newSingleCmdAccountTable(args: IfAccountTableArgs) {
    return new SingleCmd(SingleTableType.ACCOUNT_TABLE, SingleOperationtype.UPDATE, args);
}
function eqCmdAccountTable(cmd1: SingleCmd, cmd2: SingleCmd): boolean {
    let arg1 = cmd1.args as IfAccountTableArgs;
    let arg2 = cmd2.args as IfAccountTableArgs;

    return arg1.hash === arg2.hash && arg1.token === arg2.token;
}
// LBTT table
export interface IfLBTTTArgs {
    address: string, token: string, amount: string, dueAmount: string, dueBlock: number, dueTime: number
}
export function newSingleCmdLBTT(args: IfLBTTTArgs) {
    return new SingleCmd(SingleTableType.ACCOUNT_LBTT_TABLE, SingleOperationtype.UPDATE, args);
}
function eqCmdLBTT(cmd1: SingleCmd, cmd2: SingleCmd): boolean {
    let arg1 = cmd1.args as IfLBTTTArgs;
    let arg2 = cmd2.args as IfLBTTTArgs;

    return arg1.address === arg2.address && arg1.token === arg2.token;

}
// TTTT, TxTransferTo
export interface IfTTTTArgs {
    hash: string, blockhash: string, blocknumber: number, address: string, datetime: number, content: Buffer, toaddress: string, returncode: number
}
export function newSingleCmdTTTT(args: IfTTTTArgs) {
    return new SingleCmd(SingleTableType.TX_TRANSFERTO_TABLE, SingleOperationtype.UPDATE, args);
}
function eqCmdTTTT(cmd1: SingleCmd, cmd2: SingleCmd): boolean {
    let arg1 = cmd1.args as IfTTTTArgs;
    let arg2 = cmd2.args as IfTTTTArgs;

    return arg1.hash === arg2.hash;
}
// Insert Token Table
export interface IfTokenTableArgs {
    tokenname: string, type: string, address: string, datetime: number, content: Buffer
}
export function newSingleCmdTokenTable(args: IfTokenTableArgs) {
    return new SingleCmd(SingleTableType.TOKEN_TABLE, SingleOperationtype.UPDATE, args);
}
function eqCmdTokenTable(cmd1: SingleCmd, cmd2: SingleCmd): boolean {
    let arg1 = cmd1.args as IfTokenTableArgs;
    let arg2 = cmd2.args as IfTokenTableArgs;

    return arg1.tokenname === arg2.tokenname;
}
// bancor token table
export interface IfBancorTokenTableArgs {
    tokenname: string, factor: number, reserve: number, supply: number
}
export function newSingleCmdBancorTokenTAble(args: IfBancorTokenTableArgs) {
    return new SingleCmd(SingleTableType.BANCORTOKEN_TABLE, SingleOperationtype.UPDATE, args);
}
function eqCmdBancorTokenTable(cmd1: SingleCmd, cmd2: SingleCmd): boolean {
    let arg1 = cmd1.args as IfBancorTokenTableArgs;
    let arg2 = cmd2.args as IfBancorTokenTableArgs;

    return arg1.tokenname === arg2.tokenname;
}

export class SingleCmdSet {
    public lst: SingleCmd[];

    constructor() {
        this.lst = [];
    }
    // reduce 
    private reduce() {
        for (let i = 0; i < this.lst.length; i++) {

        }
    }
    private filter(mtable: SingleTableType): SingleCmd[] {
        let tmpLst = this.lst.filter((cmd: SingleCmd) => {
            return cmd.table === mtable;
        })

        // remove redundant 
        return tmpLst;
    }
    private removeRedundant(cmds: SingleCmd[], func: (cmd1: SingleCmd, cmd2: SingleCmd) => boolean): SingleCmd[] {
        let cmdLst: SingleCmd[] = [];
        for (let i = 0; i < cmds.length; i++) {
            let mcmd = cmdLst.find((item: SingleCmd) => {
                return func(item, cmds[i]);
            })
            if (mcmd === undefined) {
                cmdLst.push(cmds[i]);
            }
        }
        return cmdLst;
    }
    public addSingle(rcmd: SingleCmd): boolean {

        this.lst.push(rcmd);
        return false;
    }
    public addCmds(cmds: SingleCmd[]): boolean {
        cmds.forEach((item: SingleCmd) => {
            this.addSingle(item);
        })
        return true;
    }
    public len() {
        return this.lst.length;
    }
    public print() {
        for (let i = 0; i < this.lst.length; i++) {
            console.log(i, table2Str(this.lst[i].table));
        }
    }
    public get(num: number): SingleCmd {
        return this.lst[num];
    }
    public async exec(synchro: Synchro): Promise<IFeedBack> {
        // operation on every tables
        let hashTableLst = this.filter(SingleTableType.HASH_TABLE);
        hashTableLst = this.removeRedundant(hashTableLst, eqCmdHashTable);
        // batch operation on hash table
        if (hashTableLst.length > 0) {
            let result = await synchro.pStorageDb.singleCmdInsertHashTable(hashTableLst);
            if (result.err) { return result; }
        }

        let txAddressLst = this.filter(SingleTableType.TXADDRESS_TABLE);
        txAddressLst = this.removeRedundant(txAddressLst, eqCmdTxAddressTable);
        if (txAddressLst.length > 0) {
            let result = await synchro.pStorageDb.singleCmdInsertTxAddress(txAddressLst);
            if (result.err) { return result; }
        }

        let accountTableLst = this.filter(SingleTableType.ACCOUNT_TABLE);
        accountTableLst = this.removeRedundant(accountTableLst, eqCmdAccountTable);
        if (accountTableLst.length > 0) {
            let result = await synchro.pStorageDb.singleCmdInsertAccountTable(accountTableLst);
            if (result.err) { return result; }
        }

        let transferToLst = this.filter(SingleTableType.TX_TRANSFERTO_TABLE);
        transferToLst = this.removeRedundant(transferToLst, eqCmdTTTT);
        if (transferToLst.length > 0) {
            let result = await synchro.pStorageDb.singleCmdInsertTransferToTable(transferToLst);
            if (result.err) { return result; }
        }


        let tokenTableLst = this.filter(SingleTableType.TOKEN_TABLE);
        tokenTableLst = this.removeRedundant(tokenTableLst, eqCmdTokenTable);
        if (tokenTableLst.length > 0) {
            let result = await synchro.pStorageDb.singleCmdInsertTokenTable(tokenTableLst);
            if (result.err) { return result; }
        }


        let bancorTokenLst = this.filter(SingleTableType.BANCORTOKEN_TABLE);
        bancorTokenLst = this.removeRedundant(bancorTokenLst, eqCmdBancorTokenTable);
        if (bancorTokenLst.length > 0) {
            let result = await synchro.pStorageDb.singleCmdInsertBancorTokenTable(bancorTokenLst);
            if (result.err) { return result; }
        }


        let lbttLst = this.filter(SingleTableType.ACCOUNT_LBTT_TABLE);
        lbttLst = this.removeRedundant(lbttLst, eqCmdLBTT);
        if (lbttLst.length > 0) {
            let result = await synchro.pStorageDb.singleCmdInsertLBTT(lbttLst);
            if (result.err) { return result; }
        }

        return { err: ErrorCode.RESULT_OK, data: null };
    }

}

// export function createSingleCmds(rawcmds: RawCmd[]): SingleCmd[] {

// }