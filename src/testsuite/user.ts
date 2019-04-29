import { createKeyPair, addressFromSecretKey } from '../core';
import { IfSysinfo } from '../api/common';
import { RPCClient } from '../client/client/rfc_client';



export class User {
  public name: string;
  public sys: number;
  public ctx: any;

  private address: string;
  private secret: string;


  constructor(name: string, sysinfo: IfSysinfo, option: { address: string, secret: string } | undefined | null) {
    if (name) {
      this.name = name;
    } else {
      throw new Error("User must has a name")
    }

    this.sys = 0;

    if (option) {
      this.address = option.address;
      this.secret = option.secret;
    } else {
      let [publicKey, pk] = createKeyPair();
      this.address = addressFromSecretKey(pk)!;
      this.secret = pk.toString('hex');
    }


    let userSysinfo = {
      secret: this.secret,
      host: sysinfo.host,
      port: sysinfo.port,
      address: this.address,
      verbose: sysinfo.verbose
    };

    this.ctx = { client: new RPCClient(sysinfo.host, sysinfo.port, userSysinfo), sysinfo: userSysinfo };
  }

  info(handle: any) {
    handle("Addr: ", this.getAddress())
    handle("Sec:  ", this.getSecret())
    handle("Name: ", this.name);
    handle("SYS:  ", this.sys, "\n");
  }

  private setAddress(addr: string) {
    this.address = addr;
  }
  getAddress() { return this.address; }
  private setSecret(sec: string) {
    this.secret = sec;
  }
  getSecret() { return this.secret; }
}
