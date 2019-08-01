import { RawCmd } from "../RawCmd";
import { pCheckSellLockBancorToken } from "./pSellbancortoken";

export function pCheckBuyLockBancorToken(recet: any, type: string): RawCmd[] {

    return pCheckSellLockBancorToken(recet, type);
}