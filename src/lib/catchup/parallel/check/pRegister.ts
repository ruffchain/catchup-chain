import { RawCmd, RawCmd_TAT, RawCmd_ATS } from "../RawCmd";

export function pCheckRegister(recept: any): RawCmd[] {
    let cmdLst: RawCmd[] = [];

    let caller = recept.tx.caller;
    let hash = recept.tx.hash;
    let time = recept.block.timestamp;

    // txaddress table
    cmdLst.push(new RawCmd_TAT({ hash: hash, address: caller, timestamp: time }));

    // update balances
    cmdLst.push(new RawCmd_ATS({ address: caller, tokenname: 's' }));

    return cmdLst;
}