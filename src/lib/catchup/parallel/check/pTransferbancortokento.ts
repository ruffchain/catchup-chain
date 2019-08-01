import { RawCmd, RawCmdType, ArgsType, RawCmd_NTHT, RawCmd_TAT, RawCmd_ATS, RawCmd_ATLBT } from "../RawCmd";
import { HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";

export function pCheckTransferLockBancorTokenTo(receipt: any, type: string): RawCmd[] {
    let cmdLst: RawCmd[] = [];

    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    let to = receipt.tx.input.to;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;

    // names to table
    cmdLst.push(new RawCmd_NTHT({ name: caller, type: HASH_TYPE.ADDRESS }));

    cmdLst.push(new RawCmd_NTHT({ name: to, type: HASH_TYPE.ADDRESS }));

    // txaddress table
    [caller, to].forEach((addr: string) => {
        cmdLst.push(new RawCmd_TAT({ hash: hash, address: addr, timestamp: time }));
    })

    // update balance
    cmdLst.push(new RawCmd_ATS({ address: caller, tokenname: 's' }));

    if (receipt.receipt.returnCode === 0) {
        [caller, to].forEach((addr: string) => {
            cmdLst.push(new RawCmd_ATLBT({ tokenname: tokenName, address: addr }));
        })
    }

    return cmdLst;
}