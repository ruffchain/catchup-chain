// test tps
import { Logger } from "../api/logger";
import { IfSysinfo, IfResult } from "../api/common";
import { User } from "./user";
import { transferTo } from "../api/transferto";
import { setApi } from "../api/setapi";
import * as colors from 'colors';
import { getBalance } from "../api/getbalance";

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

let userBoss = new User('Boss', SYSINFO, {
  address: '1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy',
  secret: 'da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba'
});
// userBoss.setAddress('1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy');
// userBoss.setSecret('da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba');

let userDeputy = new User('Deputy', SYSINFO, null);


console.log('Create users , number: ', MAX_USERNUM);
let userLst: User[] = [];

function doWork() {
  return new Promise(async (resolve) => {
    console.log(colors.red('\n************************************\n'))
    let result = await transferTo(userBoss.ctx, [userDeputy.getAddress(), 1000 + '', 0.001 + '']);
    console.log(colors.green(userDeputy.name))
    console.log(result);

    result = await getBalance(userDeputy.ctx, [userDeputy.getAddress()]);
    console.log(colors.green(userDeputy.name))
    console.log(result);

    for (let i = 0; i < MAX_USERNUM; i++) {
      console.log('\nTransfer to ', i, ' user')
      let user = new User('User' + i, SYSINFO, null);
      userLst.push(user);
      let result = await setApi(userDeputy.ctx, [user.getAddress(), 10 + '', 0.001 + ''], userDeputy);
      logger.info(result);
    }
    result = await getBalance(userDeputy.ctx, [userDeputy.getAddress()]);
    console.log(colors.green(userDeputy.name))
    console.log(result);

    console.log(colors.red('\n************************************\n'))
    console.log('Transfer back to deputy:');

    let promiseLst: Promise<IfResult>[] = [];
    for (let i = 0; i < userLst.length; i++) {
      let user = userLst[i];
      promiseLst.push(setApi(user.ctx, [userDeputy.getAddress(), 1 + '', 0.001 + ''], user))
    }

    Promise.all(promiseLst).then((result) => {
      console.log(result);
      resolve('OK')
    });
  });

}

async function main() {

  let feedback = await doWork();
  console.log(feedback);

  let result = await getBalance(userDeputy.ctx, [userDeputy.getAddress()]);
  console.log(colors.green(userDeputy.name))
  console.log(result);
}

main();



