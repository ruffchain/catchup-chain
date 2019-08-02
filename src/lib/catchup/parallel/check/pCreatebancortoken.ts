import { RawCmd, RawCmdType, ArgsType, RawCmd_NTHT, RawCmd_TAT, RawCmd_ATS, RawCmd_ITT, RawCmd_ATLBT, RawCmd_BTPRM } from "../RawCmd";
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
        cmdLst.push(new RawCmd_NTHT({ name: addr, type: HASH_TYPE.ADDRESS }));
    })

    // tx address
    addrLst.forEach((addr: string) => {
        cmdLst.push(new RawCmd_TAT({ hash: hash, address: addr, timestamp: time }));
    })

    // update caller balance
    cmdLst.push(new RawCmd_ATS({ address: caller, tokenname: 's' }));

    if (receipt.receipt.returnCode === 0) {
        // inserttoken table 
        cmdLst.push(new RawCmd_ITT({
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
            cmdLst.push(new RawCmd_ATLBT({ address: addr, tokenname: tokenName }))
        });


        // put tokenname into hash table
        cmdLst.push(new RawCmd_NTHT({ name: tokenName, type: HASH_TYPE.TOKEN }));

        // insert bancor token parameters
        cmdLst.push(new RawCmd_BTPRM({ tokenname: tokenName }));

    }
    return cmdLst;
}