import { RawCmd, RawCmdType, ArgsType, RawCmd_NTHT, RawCmd_TAT, RawCmd_ATS, RawCmd_ATLBT } from "../RawCmd";
import { HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";

export function pCheckTransferLockBancorTokenToMulti(receipt: any, type: string): RawCmd[] {
    let cmdLst: RawCmd[] = [];

    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    // let to = receipt.tx.input.to;
    let to = [];
    let addressArr = [];
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let tos = receipt.tx.input.to;
    for (let i = 0; i < tos.length; i++) {
        to.push(tos[i].address);
        addressArr.push({ address: tos[i].address });
    }
    addressArr.push({ address: caller });

    // update names
    to.push(caller);

    to.forEach((addr: string) => {
        cmdLst.push(new RawCmd_NTHT({ name: addr, type: HASH_TYPE.ADDRESS }));
    })

    // txaddress table
    to.forEach((addr: string) => {
        cmdLst.push(new RawCmd_TAT({ hash: hash, address: addr, timestamp: time }));
    })

    // update caller balance
    cmdLst.push(new RawCmd_ATS({ address: caller, tokenname: 's' }));

    if (receipt.receipt.returnCode === 0) {
        to.forEach((addr: string) => {
            cmdLst.push(new RawCmd_ATLBT({ tokenname: tokenName, address: addr }));
        })
    }

    return cmdLst;
}