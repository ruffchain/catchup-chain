import { RawCmd, RawCmdType, ArgsType } from "../RawCmd";
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
        cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.NAMES_TO_HASH_TABLE, { address: addr, type: HASH_TYPE.ADDRESS }));
    })

    // txaddress table
    to.forEach((addr: string) => {
        cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.HASH_TO_TXADDRESS_TABLE, { hash: hash, address: addr, timestamp: time }));
    })

    // update caller balance
    cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, { address: caller, tokentype: SYS_TOKEN }));

    if (receipt.receipt.returnCode === 0) {
        to.forEach((addr: string) => {
            cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_BANCOR_TOKEN_ACCOUNT_TABLE, { tokenname: tokenName, address: addr }));
        })
    }

    return cmdLst;
}