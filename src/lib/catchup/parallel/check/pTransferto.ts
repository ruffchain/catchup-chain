import { RawCmd, RawCmdType, ArgsType, RawCmd_NTHT, RawCmd_TAT, RawCmd_ATS, RawCmd_TTTT } from "../RawCmd";
import { HASH_TYPE, } from "../../../storage/StorageDataBase";

export function pCheckTransferTo(receipt: any): RawCmd[] {
    console.log('pCheckTransferTo')
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

    // name to hash table
    cmdLst.push(new RawCmd_NTHT({ name: caller, type: HASH_TYPE.ADDRESS }));

    cmdLst.push(new RawCmd_NTHT({ name: to, type: HASH_TYPE.ADDRESS }));

    // tx address table
    cmdLst.push(new RawCmd_TAT({ hash: hash, address: caller, timestamp: time }));

    cmdLst.push(new RawCmd_TAT({ hash: hash, address: to, timestamp: time }));

    // udpateBalances
    cmdLst.push(new RawCmd_ATS({ address: caller, tokenname: 's' }));

    cmdLst.push(new RawCmd_ATS({ address: to, tokenname: 's' }));

    // txTransferTo table
    cmdLst.push(new RawCmd_TTTT({
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