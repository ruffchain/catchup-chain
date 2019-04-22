// To test chain api
// send command to the chain directly
/**
 * @author Yang O3
 * @version 0.1
 */

import { Logger } from "../api/logger";
import { IfSysinfo } from "../api/common";
import { RPCClient } from "../client/client/rfc_client";
import { getBlock } from "../api/getblock";
import { User } from "./user";
import { transferTo } from "../api/transferto";
import { getBalance } from "../api/getbalance";

const SECRET = 'da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba';
const ADDRESS = '1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy'
const HOST = '40.73.35.23'
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

// let ctx: any;

// function createContext(si: IfSysinfo) {
//   return {
//     client: new RPCClient(
//       HOST,
//       PORT,
//       si
//     ),
//     sysinfo: si
//   };
// }
// function setClientUser(user: User) {
//   SYSINFO.secret = user.getSecret();
//   SYSINFO.address = user.getAddress();

//   ctx = createContext(SYSINFO);
// }
// async function main() {
//   let result = await getBlock(ctx, ['latest', 'true']);
//   logger.info(result);
// }

// main();
let userBoss = new User('Boss', SYSINFO);
userBoss.setAddress('da6feae3ca249c359200487934216f45dd1c2159116c3eecc348a74a3c7d16ba');
userBoss.setSecret('1KNjtioDXuALgFD2eLonZvLxv3VsyQcBjy');

// setClientUser(userBoss);

let userJohn = new User('John', SYSINFO);
// userJohn.setAddress('1E6YG96FtWqtpxtX3TVsGxkPPBjQqhkx8k');
// userJohn.setSecret('b01874098f97ee1a281c6915cb0fc55a1f5a6a0ac1d8b7afe685959e88336450');
let userMary = new User('Mary', SYSINFO)
let userAlice = new User('Alice', SYSINFO)

userJohn.info(logger.info);
userMary.info(logger.info);
userAlice.info(logger.info);



describe('To test Chain JSON API', async function () {
  this.timeout(100000);

  // let result = await getBlock(userBoss.ctx, ['1']);
  // logger.info(result);

  it('boss transfer 1000 SYS to John', async () => {
    this.timeout(60000);

    let result = await transferTo(userBoss.ctx, [userJohn.getAddress(), 1000 + '', 0.001 + '']);
    logger.info(result);

    expect(result.ret).to.equal(0);
  })
  it('check  John\'s balance be 1000', async () => {
    this.timeout(6000);

    let result = await getBalance(userBoss.ctx, [userJohn.getAddress()]);
    logger.info(result);
    let resp = JSON.parse(result.resp!)

    expect(resp.value).to.equal("n1000");
  })
  // it('boss transfer 1000 SYS to Mary', async () => {
  //   this.timeout(3000);

  //   let result = await transferTo(userBoss.ctx, [userMary.getAddress(), 1000 + '', 0.001 + '']);

  //   expect(result.ret).to.equal(200);
  // })
  // it('boss transfer 1000 SYS to Alice', async () => {
  //   this.timeout(3000);

  //   let result = await transferTo(userBoss.ctx, [userAlice.getAddress(), 1000 + '', 0.001 + '']);

  //   expect(result.ret).to.equal(200);
  // })
});
