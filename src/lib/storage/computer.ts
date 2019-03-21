import { BigNumber } from 'bignumber.js';


export function subtractBN3(num1: string, num2: string, num3: string): string {
  let N1 = new BigNumber(num1);
  N1 = N1.minus(new BigNumber(num2));
  N1 = N1.minus(new BigNumber(num3))
  return N1.toString();

}
export function addBN2(num: string, delt: string) {
  let N1 = new BigNumber(num);
  N1 = N1.plus(new BigNumber(delt));
  return N1.toString();
}
