import { RawCmd, RawCmdType, ArgsType } from "../RawCmd";
import { SYS_TOKEN } from "../../../storage/dbapi/scoop";

export function pCheckRegister(recept: any): RawCmd[] {
    let cmdLst: RawCmd[] = [];

    let caller = recept.tx.caller;
    let hash = recept.tx.hash;
    let time = recept.block.timestamp;

    // txaddress table
    cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.HASH_TO_TXADDRESS_TABLE, { hash: hash, address: caller, timestamp: time }));

    // update balances
    cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, { address: caller, tokentype: SYS_TOKEN }));

    return cmdLst;
}