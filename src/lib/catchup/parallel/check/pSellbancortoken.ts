import { RawCmd, RawCmdType, ArgsType } from "../RawCmd";
import { HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";

export function pCheckSellLockBancorToken(receipt: any, type: string): RawCmd[] {
    let cmdLst: RawCmd[] = [];

    let caller = receipt.tx.caller;
    let tokenName = receipt.tx.input.tokenid.toUpperCase();
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;

    // update names

    cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.NAMES_TO_HASH_TABLE, { address: caller, type: HASH_TYPE.ADDRESS }));


    // txaddress table

    cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.HASH_TO_TXADDRESS_TABLE, { hash: hash, address: caller, timestamp: time }));


    // update caller balance
    cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, { address: caller, tokentype: SYS_TOKEN }));

    if (receipt.receipt.returnCode === 0) {
        // lockbancortoken balance
        cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_BANCOR_TOKEN_TABLE, { tokenname: tokenName, address: caller }));

        cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_PARAMS_TO_BANCOR_TOKEN_TABLE, { tokenname: tokenName, tokeytype: type }));

    }

    return cmdLst;
}