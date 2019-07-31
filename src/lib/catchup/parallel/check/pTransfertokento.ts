import { RawCmd, RawCmdType, ArgsType } from "../RawCmd";
import { HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";

export function pCheckTransferTokenTo(receipt: any): RawCmd[] {
    let cmdLst: RawCmd[] = [];

    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    let to = receipt.tx.input.to;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;

    // txaddress table
    cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.HASH_TO_TXADDRESS_TABLE, { hash: hash, address: caller, timestamp: time }));

    cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.HASH_TO_TXADDRESS_TABLE, { hash: hash, address: to, timestamp: time }));

    // update balance
    cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, { address: caller, tokentype: SYS_TOKEN }));

    // update token balances
    if (receipt.receipt.returnCode === 0) {
        cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_TOKEN_ACCOUNT_TABLE, { address: caller, tokenname: tokenName }));

        cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_TOKEN_ACCOUNT_TABLE, { address: to, tokenname: tokenName }));
    }

    return cmdLst;
}