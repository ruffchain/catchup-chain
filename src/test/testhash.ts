import { sha256 } from '../core/lib/digest';
import { publicKeyFromSecretKey, addressFromSecretKey, sign } from '../core/address';
import { ValueTransaction, BigNumber } from '../core';

let SECRET = 'da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba';
const ADDRESS = '1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy'

let msg = 'abc';
let publicKey = publicKeyFromSecretKey(SECRET);

console.log(sha256(Buffer.from('abc')));
console.log('address:')
console.log(addressFromSecretKey(SECRET));
console.log('publicKey')
console.log(publicKeyFromSecretKey(SECRET));

// hash to 
console.log('hash:')
let hashVal = sha256(sha256(Buffer.from(msg)))
console.log(hashVal);
console.log('\ndigest')
let signature = sign(hashVal, SECRET);
console.log(signature)
console.log('signature length: ', signature.length)

// test transaction
let tx = new ValueTransaction();
tx.method = 'createToken';
tx.fee = new BigNumber(1);
tx.input = { tokenid: "ABC" };
tx.nonce = 1;
tx.sign(SECRET);
console.log('\ntransaction:')
console.log(tx)
