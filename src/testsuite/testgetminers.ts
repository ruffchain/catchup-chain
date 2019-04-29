// To test chain api
// send command to the chain directly
/**
 * @author Yang O3
 * @version 0.1
 */

import { Logger } from "../api/logger";
import { IfSysinfo } from "../api/common";
import { User } from "./user";
import { transferTo } from "../api/transferto";
import { getBalance } from "../api/getbalance";
import { createToken } from "../api/createtoken";
import { getTokenBalance } from "../api/getTokenBalance";
import { getMiners } from "../api/getminers";
import { getApi } from "../api/getapi";
import * as fs from "fs";

const SECRET = 'da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba';
const ADDRESS = '1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy'
const HOST = '40.73.34.219' // 40.73.34.219 .  40.73.35.23 internal test 40.73.34.219
const PORT = 18089
const MAX_ = 4000000;

let expect = require('chai').expect;

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
function createTokenName() {
  let out = '';

  out = 'TOK';

  out += Math.floor((Math.random() * 1000)).toString();
  out += String.fromCharCode(Math.floor(Math.random() * 10) + 65);
  out += String.fromCharCode(Math.floor(Math.random() * 10) + 75);
  return out;
}

let userBoss = new User('Boss', SYSINFO, {
  address: '1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy',
  secret: 'da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba'
});
// userBoss.setAddress('1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy');
// userBoss.setSecret('da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba');

// setClientUser(userBoss);

let userJohn = new User('John', SYSINFO, null);
let userMary = new User('Mary', SYSINFO, null)
let userAlice = new User('Alice', SYSINFO, null)

userJohn.info(logger.info);
userMary.info(logger.info);
userAlice.info(logger.info);



let faketoken1 = createTokenName();
let faketoken2 = createTokenName();

let strJson = fs.readFileSync("./tmp/test.json").toString()

console.log(strJson.toString())

describe('To test Chain bugs', async function () {
  this.timeout(100000);


  it('getminers', async () => {
    this.timeout(60000);

    let result = await getApi(userBoss.ctx, ['getMiners', strJson]);
    logger.info(result);

    expect(result.ret).to.equal(200);
  })
});
