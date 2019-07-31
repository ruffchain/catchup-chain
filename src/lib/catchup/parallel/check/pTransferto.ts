import { RawCmd, RawCmdType, ArgsType } from "../RawCmd";
import { HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";

export function pCheckTransferTo(receipt: any): RawCmd[] {
    let cmdLst: RawCmd[] = [];

    let caller = receipt.tx.caller;
    let to = receipt.tx.input.to;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;
    let blockhash = receipt.block.hash;
    let blocknumber = receipt.block.number;
    let datetime = receipt.block.timestamp;
    let content = Buffer.from(JSON.stringify(receipt.tx));
    let returnCode = receipt.receipt.returnCode;

    // hash table
    cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.NAMES_TO_HASH_TABLE, { address: caller, type: HASH_TYPE.ADDRESS }));

    cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.NAMES_TO_HASH_TABLE, { address: to, type: HASH_TYPE.ADDRESS }));

    // tx address table
    cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.HASH_TO_TXADDRESS_TABLE, { hash: hash, address: caller, timestamp: time }));

    cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.HASH_TO_TXADDRESS_TABLE, { hash: hash, address: to, timestamp: time }));

    // udpateBalances
    cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, { address: caller, tokentype: SYS_TOKEN }));

    cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, { address: to, tokentype: SYS_TOKEN }));

    // txTransferTo table
    cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.INSERT_TO_TRANSFERTO_TABLE, {
        hash: hash,
        blockhash: blockhash,
        blocknumber: blocknumber,
        address: caller,
        datetime: time,
        content: content,
        toaddress: to,
        returncode: returnCode
    }));

    return cmdLst;
}