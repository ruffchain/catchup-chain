import { RawCmd, RawCmdType, ArgsType } from "../RawCmd";
import { IName } from "../../synchro";
import { HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";

export function pCheckCreateLockBancorToken(receipt: any, type: string): RawCmd[] {

    let cmdLst: RawCmd[] = [];

    let tokenName: string = receipt.tx.input.tokenid.toUpperCase();
    let preBalances = receipt.tx.input.preBalances; // array
    let datetime = receipt.block.timestamp;
    let caller = receipt.tx.caller;
    let nameLst: IName[] = [];
    let amountAll: number = 0;
    let addrLst: string[] = [];
    let nonliquidity: number = (receipt.tx.input.nonliquidity !== undefined) ? (parseFloat(receipt.tx.input.nonliquidity)) : (0);
    let factor = parseFloat(receipt.tx.input.factor);
    let reserve = parseFloat(receipt.tx.value)
    let hash = receipt.tx.hash;
    let time = receipt.block.timestamp;

    preBalances.forEach((element: any) => {
        nameLst.push({ address: element.address });
        amountAll += parseInt(element.amount);
        amountAll += parseInt(element.lock_amount);

        addrLst.push(element.address)
    });
    addrLst.push(caller)

    // name to hash table
    addrLst.forEach((addr: string) => {
        cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.NAMES_TO_HASH_TABLE, { address: addr, type: HASH_TYPE.ADDRESS }));
    })

    // tx address
    addrLst.forEach((addr: string) => {
        cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.HASH_TO_TXADDRESS_TABLE, { hash: hash, address: addr, timestamp: time }));
    })

    // update caller balance
    cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_ACCOUNT_TABLE, { address: caller, tokentype: SYS_TOKEN }));

    if (receipt.receipt.returnCode === 0) {
        // get add token table
        // inserttoken table 
        cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.INSERT_TO_TOKEN_TABLE, {
            tokenname: tokenName,
            tokentype: type,
            address: caller,
            datetime: datetime,
            content: Buffer.from(JSON.stringify({
                factor: factor,
                supply: amountAll,
                nonliquidity: nonliquidity,
                reserve: reserve
            }))
        }));

        // update accounts LockBancor token account table
        addrLst.forEach((addr: string) => {
            cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_BANCOR_TOKEN_ACCOUNT_TABLE, { address: addr, tokenname: tokenName, tokeytype: type }));
        })
        // updateLockBancorBalanceBasic
        // To use updateShortALTRow
        // updatePureALTRow
        // Lock Bancor Token Table, 
        // a lot of work to do! Why I need this table?


        // put tokenname into hash table
        cmdLst.push(new RawCmd(RawCmdType.NEED_NOPE_ACCESS, ArgsType.NAMES_TO_HASH_TABLE, { tokenname: tokenName, type: HASH_TYPE.TOKEN }));

        // insert bancor token parameters
        // parameters
        cmdLst.push(new RawCmd(RawCmdType.NEED_NETWORK_ACCESS, ArgsType.UPDATE_PARAMS_TO_BANCOR_TOKEN_TABLE, { tokenname: tokenName, tokeytype: type }));

    }
    return cmdLst;
}