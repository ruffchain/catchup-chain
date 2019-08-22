import { TOKEN_TYPE, SYS_TOKEN } from "../../storage/StorageDataBase";
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
import { SingleCmd, SingleTableType, SingleOperationtype, newSingleCmdAccountTable, newSingleCmdTxAddressTable, newSingleCmdHashTable, newSingleCmdLBTT, newSingleCmdTTTT, newSingleCmdTokenTable, newSingleCmdBancorTokenTAble } from "./SingleCmd";
import { Synchro } from "../synchro";
import { IFeedBack, ErrorCode } from "../../../core";
import { SYS_TOKEN_PRECISION, NORMAL_TOKEN_PRECISION, BANCOR_TOKEN_PRECISION } from "../../storage/dbapi/scoop";
import { DelayPromise } from "../../../api/common";

// To define a cmd format
// RawCmdType | ArgsType (to a defined command) | args

export enum RawCmdType {
    NEED_NOPE_ACCESS = 0,
    NEED_NETWORK_ACCESS = 1,
    // NEED_DB_ACCESS = 2
}

export enum ArgsType {
    NAME_TO_HASH_TABLE = 0,
    HASH_TO_TXADDRESS_TABLE = 1,
    UPDATE_ACCOUNT_TABLE = 2,
    INSERT_TO_TRANSFERTO_TABLE = 3,
    INSERT_TO_TOKEN_TABLE = 4,
    UPDATE_BANCOR_TOKEN_PARAMS = 5, // operate on double tables
    // UPDATE_BANCOR_TOKEN_TABLE = 6,
    // UPDATE_BANCOR_TOKEN_TABLE_ALBTT = 7,
}

export abstract class RawCmd {
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
        // Judge args type if both are equal
        if (this.argsType === ArgsType.NAME_TO_HASH_TABLE) {
            return this.args.name === rawcmd.args.name && this.args.type === rawcmd.args.type;
        } else if (this.argsType === ArgsType.HASH_TO_TXADDRESS_TABLE) {
            return this.args.hash === rawcmd.args.hash && this.args.address === rawcmd.args.address;

        } else if (this.argsType === ArgsType.UPDATE_ACCOUNT_TABLE) {
            return this.args.address === rawcmd.args.address && this.args.tokenname === rawcmd.args.tokenname;

        } else if (this.argsType === ArgsType.INSERT_TO_TRANSFERTO_TABLE) {
            return this.args.hash === rawcmd.args.hash;

        } else if (this.argsType === ArgsType.INSERT_TO_TOKEN_TABLE) {
            return this.args.tokenname === rawcmd.args.tokenname;

        } else if (this.argsType === ArgsType.UPDATE_BANCOR_TOKEN_PARAMS) {
            return this.args.tokenname === rawcmd.args.tokenname;
        } else {
            throw new Error('Unrecognized args type');
        }

        return true;
    }
    public bType(mtype: RawCmdType) {
        return this.type === mtype;
    }
    // create SingleCmds list from Raw Command
    // use network access command by Synchro, or 
    public abstract createSingleCmds(synchro: Synchro): Promise<IFeedBack>;
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
    public async createSingleCmds(synchro: Synchro): Promise<IFeedBack> {
        let cmdLst: SingleCmd[] = [];
        let arg = this.args as IfRawCmd_NTHT;
        cmdLst.push(newSingleCmdHashTable({
            hash: arg.name,
            type: arg.type
        }));

        return { err: ErrorCode.RESULT_OK, data: cmdLst };
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
    public async createSingleCmds(synchro: Synchro): Promise<IFeedBack> {
        let cmdLst: SingleCmd[] = [];
        let arg = this.args as IfRawCmd_TAT;

        cmdLst.push(newSingleCmdTxAddressTable({
            hash: arg.hash,
            address: arg.address,
            datetime: arg.timestamp
        }));
        return { err: ErrorCode.RESULT_OK, data: cmdLst };
    }
}
// AccountTable SYS_TOKEN tokentype, 
export interface IfRawCmd_ATS {
    address: string;
    tokenname: string;

}
export class RawCmd_ATS extends RawCmd {
    constructor(args: IfRawCmd_ATS) {
        super(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, args);
    }
    public async createSingleCmds(synchro: Synchro): Promise<IFeedBack> {
        let cmdLst: SingleCmd[] = [];

        // get from network, 
        let result = await synchro.getBalanceInfo(SYS_TOKEN, (this.args as IfRawCmd_ATS).address);

        if (result.ret === 200) {
            let amount: string = JSON.parse(result.resp!).value.replace('n', '');
            let laAmount: number = parseFloat(amount);
            let value: number = 0;
            value = parseFloat(parseFloat(amount).toFixed(SYS_TOKEN_PRECISION));
            amount = laAmount.toFixed(SYS_TOKEN_PRECISION)

            let arg = this.args as IfRawCmd_ATS;
            cmdLst.push(newSingleCmdAccountTable({
                hash: arg.address,
                token: SYS_TOKEN,
                tokentype: TOKEN_TYPE.SYS,
                amount: amount,
                value: value
            }));

            return { err: ErrorCode.RESULT_OK, data: cmdLst };
        }

        return { err: ErrorCode.RESULT_PARSE_ERROR, data: cmdLst };
    }
}
// AccountTable Normal token, ATN
export interface IfRawCmd_ATN {
    address: string,
    tokenname: string
}
export class RawCmd_ATN extends RawCmd {
    constructor(args: IfRawCmd_ATN) {
        super(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, args);
    }

    public async createSingleCmds(synchro: Synchro): Promise<IFeedBack> {
        let cmdLst: SingleCmd[] = [];
        let arg = this.args as IfRawCmd_ATN;

        // get from network, 
        let result = await synchro.getTokenBalanceInfo(arg.tokenname, arg.address);

        if (result.ret === 200) {
            let amount: string = JSON.parse(result.resp!).value.replace('n', '');
            let laAmount: number = parseFloat(amount);

            let value: number = 0;

            value = parseFloat(parseFloat(amount).toFixed(NORMAL_TOKEN_PRECISION));
            amount = laAmount.toFixed(NORMAL_TOKEN_PRECISION);

            cmdLst.push(newSingleCmdAccountTable({
                hash: arg.address,
                token: arg.tokenname,
                tokentype: TOKEN_TYPE.NORMAL,
                amount: amount,
                value: value
            }));
            return { err: ErrorCode.RESULT_OK, data: cmdLst };
        }

        return { err: ErrorCode.RESULT_PARSE_ERROR, data: cmdLst };
    }
}
// Accountable and LBTT Table, ATLBT table
export interface IfRawCmd_ATLBT {
    address: string,
    tokenname: string
}
export class RawCmd_ATLBT extends RawCmd {
    constructor(args: IfRawCmd_ATLBT) {
        super(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, args);
    }
    public async createSingleCmds(synchro: Synchro): Promise<IFeedBack> {
        let cmdLst: SingleCmd[] = [];
        let arg = this.args as IfRawCmd_ATLBT;

        // get from network, 
        let result = await synchro.getLockBancorTokenBalanceInfo(arg.tokenname, arg.address);

        try {
            if (result.ret === 200) {

                let obj = JSON.parse(result.resp!);
                let valueObj = obj.value;

                let amount: string = (valueObj.amount).substr(1);
                let laAmount: number = parseFloat(amount);
                let value: number = parseFloat(laAmount.toFixed(BANCOR_TOKEN_PRECISION));

                if (obj.value.amountLock === undefined) {
                    cmdLst.push(newSingleCmdAccountTable({
                        hash: arg.address,
                        token: arg.tokenname,
                        tokentype: TOKEN_TYPE.BANCOR,
                        amount: amount,
                        value: value
                    }));
                    cmdLst.push(newSingleCmdLBTT({
                        address: arg.address,
                        token: arg.tokenname,
                        amount: amount,
                        dueAmount: '0',
                        dueBlock: 0,
                        dueTime: 0
                    }));

                } else {

                    let lockAmount: string = (valueObj.amountLock).substr(1);
                    let laLockAmount: number = parseFloat(lockAmount);
                    let valueLock: number = parseFloat(laLockAmount.toFixed(BANCOR_TOKEN_PRECISION));

                    let dueBlock: number = parseInt((valueObj.dueBlock).substr(1));
                    let dueTime: number = valueObj.dueTime;

                    let amountTotal = laAmount + laLockAmount;

                    cmdLst.push(newSingleCmdAccountTable({
                        hash: arg.address,
                        token: arg.tokenname,
                        tokentype: TOKEN_TYPE.BANCOR,
                        amount: amountTotal.toString(),
                        value: value + valueLock
                    }));
                    cmdLst.push(newSingleCmdLBTT({
                        address: arg.address,
                        token: arg.tokenname,
                        amount: amount,
                        dueAmount: lockAmount,
                        dueBlock: dueBlock,
                        dueTime: dueTime
                    }));
                }

            } else {
                return { err: ErrorCode.RESULT_PARSE_ERROR, data: cmdLst };
            }

        } catch (e) {
            synchro.logger.error('Parse RawCmd_ATLBT createSingleCmd failed');
        }

        return { err: ErrorCode.RESULT_OK, data: cmdLst };
    }
}
// TxTransferTo Table, TTTT
export interface IfRawCmd_TTTT {
    hash: string,
    blockhash: string,
    blocknumber: number,
    address: string,
    datetime: number,
    content: Buffer,
    toaddress: string,
    returncode: number
}
export class RawCmd_TTTT extends RawCmd {
    constructor(args: IfRawCmd_TTTT) {
        super(RawCmdType.NEED_NOPE_ACCESS, ArgsType.INSERT_TO_TRANSFERTO_TABLE, args);
    }
    public async createSingleCmds(synchro: Synchro): Promise<IFeedBack> {
        let cmdLst: SingleCmd[] = [];
        let arg = this.args as IfRawCmd_TTTT;

        cmdLst.push(newSingleCmdTTTT({
            hash: arg.hash,
            blockhash: arg.blockhash,
            blocknumber: arg.blocknumber,
            address: arg.address,
            datetime: arg.datetime,
            content: arg.content,
            toaddress: arg.toaddress,
            returncode: arg.returncode
        }));

        return { err: ErrorCode.RESULT_OK, data: cmdLst };
    }
}
// Insert Token Table,  
export interface IfRawCmd_ITT {
    tokenname: string,
    tokentype: string,
    address: string,
    datetime: number,
    content: Buffer
}
export class RawCmd_ITT extends RawCmd {
    constructor(args: IfRawCmd_ITT) {
        super(RawCmdType.NEED_NOPE_ACCESS, ArgsType.INSERT_TO_TOKEN_TABLE, args);
    }
    public async createSingleCmds(synchro: Synchro): Promise<IFeedBack> {
        let cmdLst: SingleCmd[] = [];
        let arg = this.args as IfRawCmd_ITT;

        cmdLst.push(newSingleCmdTokenTable({
            tokenname: arg.tokenname,
            type: arg.tokentype,
            address: arg.address,
            datetime: arg.datetime,
            content: arg.content
        }));

        return { err: ErrorCode.RESULT_OK, data: cmdLst };
    }
}
// update bancor token  params table
export interface IfRawCmd_BTPRM {
    tokenname: string;
}
export class RawCmd_BTPRM extends RawCmd {
    constructor(args: IfRawCmd_BTPRM) {
        super(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_BANCOR_TOKEN_PARAMS, args);
    }

    public async createSingleCmds(synchro: Synchro): Promise<IFeedBack> {
        let cmdLst: SingleCmd[] = [];
        let arg = this.args as IfRawCmd_BTPRM;

        let result0 = await synchro.laGetBancorTokenParams(arg.tokenname);
        if (result0.ret !== 200) {
            synchro.logger.error("laGetBancorTokenParams, get params failed");
            return ({ err: ErrorCode.RESULT_DB_TABLE_GET_FAILED, data: null });
        }

        let F: number = 0;
        let S: number = 0;
        let R: number = 0;
        try {
            let obj = JSON.parse(result0.resp!);
            if (obj.err !== 0) {
                synchro.logger.error("laGetBancorTokenParams, parse failed");
                throw new Error('parse JSON ');
            } else {
                F = parseFloat(obj.value.F.substring(1));
                S = parseFloat(obj.value.S.substring(1));
                R = parseFloat(obj.value.R.substring(1));
            }
        } catch (e) {
            synchro.logger.error('laGetBancorTokenParams parsing failed:', e);
            return { err: ErrorCode.RESULT_DB_TABLE_GET_FAILED, data: null }
        }

        cmdLst.push(newSingleCmdBancorTokenTAble({
            tokenname: arg.tokenname,
            factor: F,
            reserve: R,
            supply: S
        }));

        return { err: ErrorCode.RESULT_OK, data: cmdLst };
    }
}



export class RawCmdSet {
    public lst: RawCmd[];
    constructor() {
        this.lst = [];
    }
    // Will not have duplicate RawCmds
    public add(rcmd: RawCmd): boolean {
        let cmd = this.lst.find((item: RawCmd) => {
            return item.eq(rcmd);
        })
        if (cmd === undefined) {
            this.lst.push(rcmd);
            return true;
        }
        console.log('RawCmdSet add already exist')
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
    public get(num: number): RawCmd {
        if (num >= this.lst.length || num < 0) {
            throw new Error('out of RawCmdSet range limit');
        }
        return this.lst[num];
    }
}

export function createRawCmds(recet: any): RawCmd[] {
    let tx = recet.tx;

    console.log('createRawCmd method:', tx.method)

    if (tx.method === 'transferTo') {
        return pCheckTransferTo(recet);
    }
    else if (tx.method === 'createToken') {
        return pCheckCreateToken(recet);
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