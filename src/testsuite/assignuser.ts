// test tps
import { Logger } from "../api/logger";
import { IfSysinfo, IfResult } from "../api/common";
import { User } from "./user";
import { transferTo } from "../api/transferto";
import { setApi } from "../api/setapi";
import * as colors from 'colors';
import { getBalance } from "../api/getbalance";
import * as fs from 'fs';
import { FILE } from "dns";

const SECRET = 'da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba';
const ADDRESS = '1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy'
const HOST = '40.73.35.23'
const PORT = 18089

// shell run
// FILE_NAME="./src/testsuite/data/users0.json" LEVEL=8 node dist/testsuite/assignuser.js

// Create 
let MAX_USERNUM: number;

if (process.env.USERNUM) {
  MAX_USERNUM = parseInt(process.env.USERNUM);
} else {
  MAX_USERNUM = 2;
}

// if (process.env.FILE) {
//   FILE_NAME = process.env.FILE;
// } else {
//   FILE_NAME = './src/testsuite/data/users0.json'
// }

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
// userBoss.setAddress('1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy');
// userBoss.setSecret('da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba');
// let usersBuf: Buffer;
// let users: any[];
// try {
//   usersBuf = fs.readFileSync(FILE_NAME);
//   users = JSON.parse(usersBuf.toString()).users;
// } catch (e) {
//   console.log(colors.red('Error:'), e);
//   throw new Error(e);
// }

// console.log(colors.yellow('users:'), users.length)
// console.log(users);

let SUM = 10000;
let MAX_USER_NUM = 999;
let MAX_LEVEL: number;
let SYS_PER: number = 3;

if (process.env.LEVEL) {
  MAX_LEVEL = parseInt(process.env.LEVEL)
} else {
  MAX_LEVEL = 5;
}

let indexUser = 0;
// let userLst: User[] = [];

// create user objects
// for (let i = 0; i < users.length; i++) {
//   let user = new User('user' + i, SYSINFO, users[i]);
//   userLst.push(user);
// }

async function transferNext(level: number, maxLevel: number, sysQuan: number, userLst: User[]) {

  if (level > maxLevel) {
    console.log(colors.red('End of recursion'))
    return;
  } else {
    console.log(colors.green('\nlevel: '), level)
    console.log(colors.blue('Input :'), sysQuan);
  }
  let len = Math.pow(2, level);
  let index = len - 1;
  let promiseLst: Promise<IfResult>[] = [];
  let sysLeft: number = (sysQuan - SYS_PER * len);
  let sysToPass: number = sysLeft / len;
  let sysForEither: number = sysToPass / 2 - 0.001;

  for (let i = index; i < index + len; i++) {
    console.log(colors.cyan(userLst[i].name + ' keep '), SYS_PER);
    if ((i * 2 + 2) <= MAX_USER_NUM) {
      console.log('Transfer from ', userLst[i].name, ' to ', userLst[i * 2 + 1].name, ' ' + sysForEither);

      let prom = new Promise<IfResult>(async (resolve) => {
        let result = await setApi(userLst[i].ctx, [userLst[i * 2 + 1].getAddress(), sysForEither + '', 0.001 + ''], userLst[i]);

        console.log(result);

        result = await setApi(userLst[i].ctx, [userLst[i * 2 + 2].getAddress(), sysForEither + '', 0.001 + ''], userLst[i]);

        console.log(result);
        resolve({ ret: 200, resp: 'Send over by ' + userLst[i].name });
      });
      promiseLst.push(prom);
    }
  }

  Promise.all(promiseLst).then((result) => {
    console.log(result);
    transferNext(level + 1, maxLevel, sysLeft - len, userLst);
  });
}
let fileLst = [
  './src/testsuite/data/users0.json',
  './src/testsuite/data/users1.json',
  './src/testsuite/data/users2.json',
  './src/testsuite/data/users3.json',
  './src/testsuite/data/users4.json'
]
async function transferMain() {
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

    transferNext(0, MAX_LEVEL, SUM, usersList);

  }
}
async function main() {
  console.log(colors.red('\n************************************\n'))
  // let result = await transferTo(userBoss.ctx, [userLst[0].getAddress(), SUM + '', 0.001 + '']);
  // console.log(colors.green(userLst[0].name))
  // console.log(result);

  // result = await getBalance(userBoss.ctx, [userLst[0].getAddress()]);
  // console.log(colors.green(userLst[0].name))
  // console.log(result);

  // transferNext(0, MAX_LEVEL, SUM);

}

transferMain();
