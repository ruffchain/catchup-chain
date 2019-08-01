import { RawCmd, RawCmdType, ArgsType, RawCmd_NTHT, RawCmd_TAT, RawCmd_ATS, RawCmd_ATLBT, RawCmd_BTPRM } from "../RawCmd";
import { HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";

export function pCheckSellLockBancorToken(receipt: any, type: string): RawCmd[] {
    let cmdLst: RawCmd[] = [];

    let caller = receipt.tx.caller;
    let tokenName = receipt.tx.input.tokenid.toUpperCase();
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;

    // update names

    cmdLst.push(new RawCmd_NTHT({ name: caller, type: HASH_TYPE.ADDRESS }));

    // txaddress table
    cmdLst.push(new RawCmd_TAT({ hash: hash, address: caller, timestamp: time }));

    // update caller balance
    cmdLst.push(new RawCmd_ATS({ address: caller, tokenname: 's' }));

    if (receipt.receipt.returnCode === 0) {
        // lockbancortoken balance
        cmdLst.push(new RawCmd_ATLBT({ tokenname: tokenName, address: caller }));

        cmdLst.push(new RawCmd_BTPRM({ tokenname: tokenName }));
    }

    return cmdLst;
}