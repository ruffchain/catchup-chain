import { RawCmd, RawCmdType, ArgsType } from "../RawCmd";
import { HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";
import { pCheckMortgage } from "./pMortgage";

export function pCheckUnmortgage(recept: any): RawCmd[] {
    // let cmdLst: RawCmd[] = [];
    // let caller = recept.tx.caller;
    // let hash = recept.tx.hash;
    // let time = recept.block.timestamp;

    // // Do I need to put the address into db?
    // // Names to hash table
    // cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.NAMES_TO_HASH_TABLE, { address: caller, type: HASH_TYPE.ADDRESS }));

    // // txaddress table
    // cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.HASH_TO_TXADDRESS_TABLE, { hash: hash, address: caller, timestamp: time }));

    // // update balances
    // cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, { address: caller, tokentype: SYS_TOKEN }));


    return pCheckMortgage(recept);
}