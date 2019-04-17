import { BigNumber } from 'bignumber.js';

/**
 * Minus num1 from 2 BigNumber values
 * @param num1 {string} - num1
 * @param num2 {string} - num2
 * @param num3 {string} - num3 
 * @returns {string} - return num1 - num2 - num3
 */
export function subtractBN3(num1: string, num2: string, num3: string): string {
  let N1 = new BigNumber(num1);
  N1 = N1.minus(new BigNumber(num2));
  N1 = N1.minus(new BigNumber(num3))
  return N1.toString();

}
/**
 * Add 2 BigNumber string
 * @param num {string} - num1
 * @param delt {string} - num2
 * @returns {string} - num1 + num2
 */
export function addBN2(num1: string, num2: string) {
  let N1 = new BigNumber(num1);
  N1 = N1.plus(new BigNumber(num2));
  return N1.toString();
}
