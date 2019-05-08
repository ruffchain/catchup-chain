import { addressFromSecretKey } from "../core/address";
import { sha256 } from "../core/lib/digest";
import * as util from "util"
const secp256k1 = require('secp256k1');

const msg = 'abc';
let msgBuf = Buffer.from(msg);
console.log(msg);

let SECRET = 'da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba';
const ADDRESS = '1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy'

let secretBuf = Buffer.from(SECRET, 'hex')

console.log('secret:')
console.log(secretBuf);


const pubKey = secp256k1.publicKeyCreate(secretBuf, true);//根据私钥生成公钥
console.log('\npubkey:')
console.log(pubKey);

console.log('\naddress:')
let addr = addressFromSecretKey(secretBuf);
console.log(addr);

console.log('\n 1st hash')
console.log(sha256(msgBuf));
// // sign the message
let msgHash = sha256(sha256(msgBuf));
console.log('\nmsg hash:')
console.log(msgHash);
console.log('\nsecretBuf');
console.log(secretBuf);
const sigObj = secp256k1.sign(msgHash, secretBuf);//然后进行签名
console.log('\nsignature:', sigObj.signature.length)
console.log(sigObj);

let sigNormalize = secp256k1.signatureNormalize(sigObj.signature)
console.log('\nsignature normalized:')
console.log(util.inspect(sigNormalize.toString('hex'), { showHidden: true, depth: null }));


