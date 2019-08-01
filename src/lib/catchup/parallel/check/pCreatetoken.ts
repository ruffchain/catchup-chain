import { RawCmd, RawCmdType, ArgsType, RawCmd_NTHT, RawCmd_TAT, RawCmd_ATS, RawCmd_ITT, RawCmd_ATN } from "../RawCmd";
import { TOKEN_TYPE, HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";
import { IName } from "../../synchro";

export function pCheckCreateToken(receipt: any): RawCmd[] {
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


    preBalances.forEach((element: any) => {
        nameLst.push({
            address: element.address
        })
        addrLst.push(element.address)
        amountAll += parseInt(element.amount);
    });
    addrLst.push(caller);

    // names to hash table
    addrLst.forEach((addr: string) => {
        cmdLst.push(new RawCmd_NTHT({ name: addr, type: HASH_TYPE.ADDRESS }));
    })

    // txaddress table
    addrLst.forEach((addr: string) => {
        cmdLst.push(new RawCmd_TAT({ hash: hash, address: addr, timestamp: time }));
    })

    // update balances
    cmdLst.push(new RawCmd_ATS({ address: caller, tokenname: 's' }));

    if (receipt.receipt.returnCode === 0) {
        // to token table
        cmdLst.push(new RawCmd_ITT({
            tokenname: tokenName,
            tokentype: TOKEN_TYPE.NORMAL,
            address: caller,
            datetime: datetime,
            content: Buffer.from(JSON.stringify({
                supply: amountAll,
                precision: precision
            }))
        }));

        // update token account table
        addrLst.forEach((addr: string) => {
            cmdLst.push(new RawCmd_ATN({ address: addr, tokenname: tokenName }));
        })

        // put tokenname into hash table
        cmdLst.push(new RawCmd_NTHT({ name: tokenName, type: HASH_TYPE.TOKEN }));

    }

    return cmdLst;
}