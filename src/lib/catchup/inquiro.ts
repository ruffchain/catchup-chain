import winston = require('winston');
import { RPCServer } from '../../client/client/rfc_server';
import { WRQueue, createTask } from '../storage/queue';
import { getFunc } from '../storage/dbapi';

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

      let result = Object.create(null);
      let task = createTask(obj, () => { });

      result = await getFunc(obj.funName)(this.queue, task.request.args);

      this.logger.info('send out ->');
      let strFb = JSON.stringify(result.data);
      this.logger.info(strFb, '\n');
      resp.write(strFb);
      resp.end();
    });
  }
}
