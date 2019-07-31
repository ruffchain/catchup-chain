import { RawCmd, RawCmdType, ArgsType } from "../RawCmd";
import { SYS_TOKEN } from "../../../storage/dbapi/scoop";

export function pCheckRunUserMethod(receipt: any): RawCmd[] {
    let cmdLst: RawCmd[] = [];

    let caller = receipt.tx.caller;
    let hash = receipt.tx.hash;
    let addrLst = [caller];
    let time = receipt.block.timestamp;

    // into txaddress table
    cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.HASH_TO_TXADDRESS_TABLE, { hash: hash, address: caller, timestamp: time }));

    let cmdLst1: RawCmd[] = [];
    if (receipt.tx.input.action === 'doTransfer') {
        cmdLst1 = pCheckDoTransfer(receipt);
    } else {
        cmdLst1 = pCheckOtherAction(receipt);
    }
    for (let i = 0; i < cmdLst1.length; i++) {
        cmdLst.push(cmdLst1[i]);
    }

    return cmdLst;
}

function pCheckDoTransfer(receipt: any): RawCmd[] {
    let cmdLst: RawCmd[] = [];

    let addrLst: string[] = [receipt.tx.caller, receipt.tx.input.to];
    let mReceipt = receipt.receipt;

    mReceipt.logs.forEach((item: any) => {
        addrLst.push(item.param.from);
        addrLst.push(item.param.to)
    })

    // remove redundant addresses
    let uniqAddrLst: string[] = [];
    addrLst.forEach((item) => {
        if (uniqAddrLst.indexOf(item) === -1) {
            uniqAddrLst.push(item);
        }
    })

    let outAddrLst: string[] = [];
    uniqAddrLst.forEach((item: string) => {
        outAddrLst.push(item);
    })

    // updatebalance
    outAddrLst.forEach((addr: string) => {
        cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, { address: addr, tokentype: SYS_TOKEN }))
    });

    return cmdLst;
}


function pCheckOtherAction(receipt: any): RawCmd[] {
    let cmdLst: RawCmd[] = [];

    let outAddrLst: string[] = [];
    outAddrLst.push(receipt.tx.caller);

    if (receipt.tx.caller !== receipt.tx.input.to) {
        outAddrLst.push(receipt.tx.input.to);
    }

    outAddrLst.forEach((addr: string) => {
        cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, { address: addr, tokentype: SYS_TOKEN }))
    })

    return cmdLst;
}