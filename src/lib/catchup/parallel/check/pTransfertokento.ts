import { RawCmd, RawCmd_TAT, RawCmd_ATS, RawCmd_ATN } from "../RawCmd";

export function pCheckTransferTokenTo(receipt: any): RawCmd[] {
    let cmdLst: RawCmd[] = [];

    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let caller = receipt.tx.caller;
    let to = receipt.tx.input.to;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;

    // txaddress table
    cmdLst.push(new RawCmd_TAT({ hash: hash, address: caller, timestamp: time }));

    cmdLst.push(new RawCmd_TAT({ hash: hash, address: to, timestamp: time }));

    // update balance
    cmdLst.push(new RawCmd_ATS({ address: caller, tokenname: 's' }));

    // update token balances
    if (receipt.receipt.returnCode === 0) {
        cmdLst.push(new RawCmd_ATN({ address: caller, tokenname: tokenName }));

        cmdLst.push(new RawCmd_ATN({ address: to, tokenname: tokenName }));
    }

    return cmdLst;
}