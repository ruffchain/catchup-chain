import { Logger } from '../../api/logger';
import { EventEmitter } from 'events';
import { CUDataBase, IfCUDataBaseOptions } from './cudatabase';
import winston = require('winston');
import { StatusDataBase } from './statusdb';
import { StorageDataBase, HASH_TYPE } from './StorageDataBase';
import { IfReq } from '../catchup/inquiro'
import { ErrorCode, IFeedBack } from '../../core/error_code';
import { isNumber } from 'util';

export interface IfTask {
  maxRetry: number;
  times: number;
  timeout: number;
  request: IfReq; // request from inquiro
  callback: (res: IFeedBack) => void;
}

export function createTask(req: IfReq, cb: (res: IFeedBack) => void): IfTask {
  return {
    maxRetry: 1,
    times: 0,
    timeout: 3000,
    request: req,
    callback: cb
  }
}

export class WRQueue extends EventEmitter {
  // First In First Out
  private queueWrite: IfTask[];
  private queueRead: IfTask[];
  private logger: any;
  private pStatusDb: StatusDataBase;
  private pStorageDb: StorageDataBase;
  // private db: CUDataBase;
  // private dbOptions: IfCUDataBaseOptions;

  constructor(loggerpath: winston.LoggerInstance, statusdb: StatusDataBase, storagedb: StorageDataBase) {
    super();
    this.queueWrite = [];
    this.queueRead = [];
    this.logger = loggerpath;
    // this.db = new CUDataBase(loggerpath, options);
    // this.dbOptions = options;
    this.pStatusDb = statusdb;
    this.pStorageDb = storagedb;

    // only one write can happen at one time
    this.on('write', (data: IfTask) => {
      this.queueWrite.push(data);
      if (this.queueWrite.length === 1) {
        this.emit('execWrite');
      }
    });

    this.on('execWrite', () => {
      if (this.queueWrite.length < 1) {
        this.logger.info('empty write queue\n');
        return;
      }
      this.logger.info('execWrite');
      this.execQueueWrite(this.queueWrite);
    });

    // I dont know about parallel read
    // Hope it will be fast
    this.on('read', (data: IfTask) => {
      this.logger.info('WRQueue receives "read" event\n');
      this.queueRead.push(data);
      if (this.queueRead.length === 1) {
        this.emit('execRead');
      }
    });

    this.on('execRead', () => {
      if (this.queueRead.length < 1) {
        this.logger.info('empty read queue\n');
        return;
      }
      this.logger.info('execRead');
      this.execQueueRead(this.queueRead);
    });
  }

  public async execQueueRead(que: IfTask[]) {
    const task = que[0];

    task.times++;

    // Exceed maximum retry times
    if (task.times > task.maxRetry) {
      task.callback({ err: ErrorCode.RESULT_QUEUE_OVER_MAXTIMES, data: [] });
      que.shift();
      this.emit('execRead');
      return;
    }

    let arr: any;
    arr = [];

    if (task.request.funName === 'getName') {
      let result = await this.taskGetName(task.request.args, 6);
      arr = result.data;
    }
    else {
      arr.push({ error: 'unknown name' })
    }

    task.callback({ err: ErrorCode.RESULT_OK, data: arr })
    que.shift();
    this.emit('execRead');
    return;
  }
  // getName
  private async taskGetName(args: string, num: number) {
    return new Promise<IFeedBack>(async (resolv) => {
      let arr: any;
      arr = [];
      if (!this.isANumber(args)) {
        // it is a token name
        let result = await this.pStorageDb.queryHashTableFullName(args, 6);
        if (result.data) {
          result.data.forEach((item: any) => {
            arr.push({ type: item.type });
          });
          resolv({ err: ErrorCode.RESULT_OK, data: arr });
        } else {
          resolv({ err: ErrorCode.RESULT_OK, data: [] })
        }

        return;
      } else {
        // if it is a number
        let num = parseInt(args);
        if (num >= 0 && num < this.pStatusDb.nCurrentHeight) {
          resolv({ err: ErrorCode.RESULT_OK, data: [{ type: HASH_TYPE.HEIGHT }] });
        }
        else {
          resolv({ err: ErrorCode.RESULT_OK, data: [] });
        }
      }

    })
  }
  private isTokenOrAddress(args: string) {
    if (args.length >= 20) {
      return true;
    }
    if (this.isANumber(args)) {
      return false;
    }
    return true;
  }
  public isANumber(args: string) {
    // only contain numbers
    let lst = args.split('');

    for (let i = 0; i < lst.length; i++) {
      // this.logger.info('test:', lst[i])
      console.log(parseInt(lst[i]))
      if (isNaN(parseInt(lst[i]))) {
        return false;
      }
    }
    return true;
  }
  public async execQueueWrite(que: IfTask[]) {

  }
}
