// test tps
import { Logger } from "../api/logger";
import { IfSysinfo, IfResult } from "../api/common";
import { User } from "./user";
import { transferTo } from "../api/transferto";
import { setApi } from "../api/setapi";
import * as colors from 'colors';
import { getBalance } from "../api/getbalance";
import * as fs from 'fs';

// How to run?
// 
// shell run
// LEVEL=8 node dist/testsuite/assignuser.js

const SECRET = 'da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba';
const ADDRESS = '1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy'
const HOST = '40.73.35.23' // 127.0.0.1 40.73.35.23
const PORT = 18089

let SUM = 10000;
let MAX_USER_NUM = 999;
let MAX_LEVEL: number;
let SYS_PER: number = 3;

let fileLst = [
  './src/testsuite/data/users0.json',
  './src/testsuite/data/users1.json',
  './src/testsuite/data/users2.json',
  './src/testsuite/data/users3.json',
  './src/testsuite/data/users4.json'
]

let SYSINFO: IfSysinfo = {
  secret: SECRET,
  host: HOST,
  port: PORT,
  address: ADDRESS,
  verbose: false
}

let userBoss = new User('Boss', SYSINFO, { address: '1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy', secret: 'da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba' });

if (process.env.LEVEL) {
  MAX_LEVEL = parseInt(process.env.LEVEL)
} else {
  MAX_LEVEL = 3;
}


function promiseTransfer(level: number, levelMax: number, sum: number, userlist: User[]) {
  return new Promise<IfResult>(async (resolve) => {
    async function transferNext(level: number, maxLevel: number, sysQuanti: number, userLst: User[]) {

      if (level > maxLevel) {
        console.log(colors.red('End of recursion'))
        resolve({ ret: 200, resp: 'OK' })
        return;
      } else {
        console.log(colors.green('\nlevel: '), level)
        console.log(colors.blue('Input :'), sysQuanti);
      }
      let len = Math.pow(2, level);
      let index = len - 1;
      let promiseLst: Promise<IfResult>[] = [];
      let sysLeft: number = (sysQuanti - SYS_PER * len);
      let sysToPass: number = sysLeft / len;
      let sysForEither: number = sysToPass / 2 - 0.001;

      for (let i = index; i < index + len; i++) {
        console.log(colors.cyan(userLst[i].name + ' keep '), SYS_PER);
        if ((i * 2 + 2) < MAX_USER_NUM) {
          console.log('Transfer from ', userLst[i].name, ' to ', userLst[i * 2 + 1].name, ' ' + sysForEither);

          let prom = new Promise<IfResult>(async (resolv) => {
            let result = await setApi(userLst[i].ctx, [userLst[i * 2 + 1].getAddress(), sysForEither + '', 0.001 + ''], userLst[i]);

            console.log(result);

            result = await setApi(userLst[i].ctx, [userLst[i * 2 + 2].getAddress(), sysForEither + '', 0.001 + ''], userLst[i]);

            console.log(result);
            resolv({ ret: 200, resp: 'Send over by ' + userLst[i].name });
          });

          promiseLst.push(prom);
        }
      }

      Promise.all(promiseLst).then((result) => {
        if (result) {
          for (let ele of result) {
            console.log(ele);
          }
        }
        transferNext(level + 1, maxLevel, sysLeft - len, userLst);
      });
    }
    transferNext(level, levelMax, sum, userlist);
  });
}
async function transferMain() {
  // assign to users according to a json file
  for (let i = 0; i < fileLst.length; i++) {

    let usersBuf: Buffer;
    let users: any[];
    try {
      usersBuf = fs.readFileSync(fileLst[i]);
      users = JSON.parse(usersBuf.toString()).users;
    } catch (e) {
      console.log(colors.red('Error:'), e);
      throw new Error(e);
    }

    let usersList: User[] = [];
    for (let j = 0; j < users.length; j++) {
      usersList.push(new User('user' + j, SYSINFO, users[j]));
    }

    console.log(colors.red('\n************************************\n'))
    console.log(colors.red('filename:'), fileLst[i])
    let result = await transferTo(userBoss.ctx, [usersList[0].getAddress(), SUM + '', 0.001 + '']);
    console.log(colors.green(usersList[0].name))
    console.log(result);

    result = await getBalance(userBoss.ctx, [usersList[0].getAddress()]);
    console.log(colors.green(usersList[0].name))
    console.log(result);

    // transferNext(0, MAX_LEVEL, SUM, usersList);
    await promiseTransfer(0, MAX_LEVEL, SUM, usersList)

  }
}
// async function main() {
console.log(colors.red('\n************************************\n'))
// let result = await transferTo(userBoss.ctx, [userLst[0].getAddress(), SUM + '', 0.001 + '']);
// console.log(colors.green(userLst[0].name))
// console.log(result);

// result = await getBalance(userBoss.ctx, [userLst[0].getAddress()]);
// console.log(colors.green(userLst[0].name))
// console.log(result);

// transferNext(0, MAX_LEVEL, SUM);

// }

transferMain();
