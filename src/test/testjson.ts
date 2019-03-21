import { Logger } from "../api/logger";
import { RPCClient } from "../client/client/rfc_client";
import { IfSysinfo } from "../api/common";
import { mapInstance } from "../core/net/static_peerid_ip";

const logger = Logger.init({
  path: './data/log/'
});

let SYSINFO: IfSysinfo = {
  secret: '',
  host: '139.219.141.143', // '127.0.0.1',
  port: 18080,
  address: '',
  verbose: false
}

let client = new RPCClient(
  '139.219.141.143',// '127.0.0.1',
  18080,
  SYSINFO
);

async function maine() {
  let cr = await client.callAsync('getName', "13")
  logger.info(cr);
  // logger.info(cr.resp)
}

maine();
