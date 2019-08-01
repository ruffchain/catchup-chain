import { RawCmd, RawCmdType, ArgsType } from "../RawCmd";
import { HASH_TYPE, SYS_TOKEN } from "../../../storage/StorageDataBase";
import { pCheckMortgage } from "./pMortgage";

export function pCheckUnmortgage(recept: any): RawCmd[] {
    return pCheckMortgage(recept);
}