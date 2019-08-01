import { RawCmd, RawCmd_NTHT, RawCmd_TAT, RawCmd_ATS } from "../RawCmd";
import { HASH_TYPE } from "../../../storage/StorageDataBase";

export function pCheckMortgage(recept: any): RawCmd[] {
    let cmdLst: RawCmd[] = [];


    let caller = recept.tx.caller;
    let hash = recept.tx.hash;
    let time = recept.block.timestamp;

    // update names to hash table
    cmdLst.push(new RawCmd_NTHT({ name: caller, type: HASH_TYPE.ADDRESS }));

    // txaddress table
    cmdLst.push(new RawCmd_TAT({ hash: hash, address: caller, timestamp: time }));

    // update balances
    cmdLst.push(new RawCmd_ATS({ address: caller, tokenname: 's' }));

    return cmdLst;
}