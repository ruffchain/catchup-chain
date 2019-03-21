import { Logger } from "../api/logger";
import { RPCClient } from "../client/client/rfc_client";
import { IfSysinfo } from "../api/common";
import { mapInstance } from "../core/net/static_peerid_ip";

const logger = Logger.init({
  path: './data/log/'
});

let SYSINFO: IfSysinfo = {
  secret: '',
  host: '40.73.1.241', // '127.0.0.1',
  port: 18080,
  address: '',
  verbose: false
}

let client = new RPCClient(
  SYSINFO.host,// '127.0.0.1',
  SYSINFO.port,
  SYSINFO
);

async function maine() {
  let cr = await client.callAsync('getName', "1")
  logger.info(cr);
  // logger.info(cr.resp)
}

maine();
