// test tps
import { Logger } from "../api/logger";
import { IfSysinfo, IfResult } from "../api/common";
import { User } from "./user";
import * as fs from 'fs';

const SECRET = 'da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba';
const ADDRESS = '1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy'
const HOST = '40.73.35.23'
const PORT = 18089


// Create 
let MAX_USERNUM: number;

if (process.env.USERNUM) {
  MAX_USERNUM = parseInt(process.env.USERNUM);
} else {
  MAX_USERNUM = 2;
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
// userBoss.setAddress('1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy');
// userBoss.setSecret('da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba');

let userLst: User[] = [];
let usersJson: any = Object.create({});
usersJson.users = [];

async function main() {
  for (let i = 0; i < MAX_USERNUM; i++) {
    console.log('Transfer to ', i, ' user')
    let user = new User('User' + i, SYSINFO, null);
    userLst.push(user);
    // let result = await transferTo(userBoss.ctx, [user.getAddress(), 10 + '', 0.001 + '']);
    // logger.info(result);
    usersJson.users.push({ address: user.getAddress(), secret: user.getSecret() });
  }

  let result = fs.writeFileSync('./src/testsuite/data/users55.json', JSON.stringify(usersJson));
  console.log(result);
}

main();
