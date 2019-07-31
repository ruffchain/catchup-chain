import { RawCmd } from "../RawCmd";
import { pCheckRegister } from "./pRegister";

export function pCheckUnregister(recet: any): RawCmd[] {

    return pCheckRegister(recet);
}