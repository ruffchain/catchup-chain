import { Logger } from '../../api/logger';
import winston = require('winston');
import { RPCServer } from '../../client/client/rfc_server';
import { ErrorCode, IFeedBack } from '../../core';
import { WRQueue, createTask } from '../storage/queue';

/**
 * This is for a server , provide information to users
 */

interface IfInquiroOptions {
  ip: string;
  port: number;
}

export interface IfReq {
  funName: string;
  args: any;
}
interface IfResp {
  funName: string;
  args: any;
}
interface IBundle {
  name: string;
  nameResp: string;
  func: (msg: IfReq) => IfResp;
}

/**
 * getName
 * args:'s'
 */

let lst: any;
lst = [];

export class Inquiro {
  public logger: winston.LoggerInstance;

  private ip: string;
  private port: number;

  private server: RPCServer;
  private queue: WRQueue;

  constructor(options: IfInquiroOptions, logger: winston.LoggerInstance, q: WRQueue) {
    this.ip = options.ip;
    this.port = options.port;
    this.logger = logger;

    this.server = new RPCServer(this.ip, this.port);
    this.queue = q;
  }

  public start() {
    this.logger.info('Inquiro server started ... \n');
    this.server.start();

    this.server.on('message', async (reqobj, resp) => {
      let obj = reqobj as IfReq;
      this.logger.info('\nreceive msg req:', reqobj, '\n');



      resp.writeHead(200, { 'Content-Type': 'application/json' });
      let result = await this.handle(obj);

      this.logger.info('send out');
      let strFb = JSON.stringify(result.data);
      this.logger.info(strFb, '\n');
      resp.write(strFb);
      resp.end();
    });
  }
  private handleMessageAsync(msg: IfReq): Promise<IFeedBack> {
    return new Promise<IFeedBack>((resolv) => {
      if (['getCandy'].indexOf(msg.funName) !== -1) {
        this.queue.emit('write', createTask(msg, resolv))
      } else {
        this.queue.emit('read', createTask(msg, resolv));
      }

    })
  }

  private async handle(msg: IfReq): Promise<IFeedBack> {
    return new Promise<IFeedBack>(async (resolv) => {
      this.logger.info('handleMessageAsync\n')
      // this.testAsync();
      let result = await this.handleMessageAsync(msg);

      resolv({ err: ErrorCode.RESULT_OK, data: result.data });

    });
  }

}
