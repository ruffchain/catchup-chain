import { RawCmd, RawCmdType, ArgsType } from "../RawCmd";
import { HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";

export function pCheckTransferLockBancorTokenTo(receipt: any, type: string): RawCmd[] {
    let cmdLst: RawCmd[] = [];

    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    let to = receipt.tx.input.to;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;

    // names to table
    cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.NAMES_TO_HASH_TABLE, { address: caller, type: HASH_TYPE.ADDRESS }));

    cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.NAMES_TO_HASH_TABLE, { address: to, type: HASH_TYPE.ADDRESS }));

    // txaddress table
    [caller, to].forEach((addr: string) => {
        cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.HASH_TO_TXADDRESS_TABLE, { hash: hash, address: addr, timestamp: time }));
    })

    // update balance
    cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, { address: caller, tokentype: SYS_TOKEN }));

    if (receipt.receipt.returnCode === 0) {
        [caller, to].forEach((addr: string) => {
            cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_BANCOR_TOKEN_ACCOUNT_TABLE, { tokenname: tokenName, address: addr }));
        })
    }

    return cmdLst;
}