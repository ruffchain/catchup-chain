import { RawCmd, RawCmdType, ArgsType, RawCmd_TAT, RawCmd_ATS } from "../RawCmd";
import { SYS_TOKEN } from "../../../storage/dbapi/scoop";

export function pCheckDefaultCommand(receipt: any): RawCmd[] {

    let cmdLst: RawCmd[] = [];

    let caller = receipt.tx.caller;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;

    //  txaddress table
    cmdLst.push(new RawCmd_TAT({ hash: hash, address: caller, timestamp: time }));

    // check balances
    cmdLst.push(new RawCmd_ATS({ address: caller, tokenname: 's' }))

    return cmdLst;
}