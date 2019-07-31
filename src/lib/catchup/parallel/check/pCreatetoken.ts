import { RawCmd, RawCmdType, ArgsType } from "../RawCmd";
import { TOKEN_TYPE, HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";
import { IName } from "../../synchro";

export function pCheckCreateToken(receipt: any, type: string): RawCmd[] {
    let cmdLst: RawCmd[] = [];

    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let preBalances = receipt.tx.input.preBalances; // array
    let datetime = receipt.block.timestamp;
    let caller = receipt.tx.caller;
    let nameLst: IName[] = [];
    let addrLst: string[] = [];
    let amountAll: number = 0;
    let precision: number = receipt.tx.input.precision;
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;

    // names to hash table

    preBalances.forEach((element: any) => {
        nameLst.push({
            address: element.address
        })
        addrLst.push(element.address)
        amountAll += parseInt(element.amount);
    });
    addrLst.push(caller);

    addrLst.forEach((addr: string) => {
        cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.NAME_TO_HASH_TABLE, { address: addr, type: HASH_TYPE.ADDRESS }));
    })

    // txaddress table
    addrLst.forEach((addr: string) => {
        cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.HASH_TO_TXADDRESS_TABLE, { hash: hash, address: addr, timestamp: time }));
    })

    // update balances

    cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, { address: caller, tokentype: SYS_TOKEN }));


    if (receipt.receipt.returnCode === 0) {
        // to token table
        cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.INSERT_TO_TOKEN_TABLE, {
            tokenname: tokenName,
            tokentype: type,
            address: caller,
            datetime: datetime,
            content: Buffer.from(JSON.stringify({
                supply: amountAll,
                precision: precision
            }))
        }));

        // update token account table
        addrLst.forEach((addr: string) => {
            cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, { address: addr, tokenname: tokenName, tokeytype: type }));
        })

        // put tokenname into hash table
        cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.NAMES_TO_HASH_TABLE, { tokenname: tokenName, type: HASH_TYPE.TOKEN }));


    }


    return cmdLst;
}