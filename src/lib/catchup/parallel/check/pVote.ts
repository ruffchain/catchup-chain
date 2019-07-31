import { RawCmd } from "../RawCmd";
import { pCheckMortgage } from "./pGetusercode";

export function pCheckVote(recet: any): RawCmd[] {

    return pCheckMortgage(recet);
}