// test tps
import { Logger } from "../api/logger";
import { IfSysinfo, IfResult } from "../api/common";
import { User } from "./user";
import { transferTo } from "../api/transferto";
import { setApi } from "../api/setapi";
import * as colors from 'colors';
import * as fs from 'fs';

// run work
// FILE=0 IP=40.73.35.23 node ./dist/testsuite/sendtx.js
// FILE=1 IP=40.73.35.23 node ./dist/testsuite/sendtx.js
// FILE=2 IP=40.73.96.202 node ./dist/testsuite/sendtx.js
// FILE=3 IP=40.73.96.202 node ./dist/testsuite/sendtx.js

// FILE=2 IP=40.73.34.219 node ./dist/testsuite/sendtx.js
// FILE=3 IP=40.73.34.219 node ./dist/testsuite/sendtx.js

// FILE=4 IP=40.73.34.219 node ./dist/testsuite/sendtx.js
// FILE=1 IP=40.73.34.219 node ./dist/testsuite/sendtx.js

const SECRET = 'da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba';
const ADDRESS = '1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy'
let HOST = '40.73.35.23'
const PORT = 18089


// Create 
let FILE_INDEX: number = 0;
let MAX_USERNUM: number;
// let REMOTE_IP: string;

if (process.env.FILE) {
  FILE_INDEX = parseInt(process.env.FILE);
}

if (process.env.IP) {
  HOST = process.env.IP;
}

const logger = Logger.init({
  path: './data/test/'
});


let SYSINFO: IfSysinfo = {
  secret: SECRET,
  host: HOST,
  port: PORT,
  address: ADDRESS,
  verbose: false
}

let userBoss = new User('Boss', SYSINFO, { address: '1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy', secret: 'da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba' });

let fileLst = [
  './src/testsuite/data/users0.json',
  './src/testsuite/data/users1.json',
  './src/testsuite/data/users2.json',
  './src/testsuite/data/users3.json',
  './src/testsuite/data/users4.json'
]

let usersBuf: Buffer;
let users: any[];
try {
  usersBuf = fs.readFileSync(fileLst[FILE_INDEX]);
  users = JSON.parse(usersBuf.toString()).users;
} catch (e) {
  console.log(colors.red('Error:'), e);
  throw new Error(e);
}

let userList: User[] = [];
for (let j = 0; j < users.length; j++) {
  userList.push(new User('user' + j, SYSINFO, users[j]));
}
MAX_USERNUM = userList.length;
console.log('max usernum:', MAX_USERNUM)

async function main() {
  let promiseLst: Promise<IfResult>[] = [];
  // let len = userList.length;
  let sysForEither = 0.01

  for (let i = 0; i < userList.length; i++) {
    console.log(colors.cyan(userList[i].name));

    console.log('Transfer from ', userList[i].name, ' to ', userList[MAX_USERNUM - i - 1].name, ' ' + sysForEither);

    let prom = new Promise<IfResult>(async (resolve) => {
      let result = await setApi(userList[i].ctx, [userList[MAX_USERNUM - i - 1].getAddress(), sysForEither + '', 0.001 + ''], userList[i]);

      console.log(result);
      resolve({ ret: 200, resp: 'Send over by ' + userList[i].name });
    });
    promiseLst.push(prom);
  }
  Promise.all(promiseLst).then((result) => {
    // console.log(result);
    if (result) {
      for (let ele in result) {
        console.log(ele);
      }
    }
  });
}


main();
