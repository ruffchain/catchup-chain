import { Logger } from '../../api/logger';
import { EventEmitter } from 'events';
// import { CUDataBase, IfCUDataBaseOptions } from './cudatabase';
import winston = require('winston');
import { StatusDataBase } from './statusdb';
import { StorageDataBase,/*  HASH_TYPE, SYS_TOKEN, SYS_TOKEN_SYMBOL  */ } from './StorageDataBase';
import { IfReq } from '../catchup/inquiro'
import { ErrorCode, IFeedBack } from '../../core/error_code';
import { Synchro } from '../catchup/synchro';
import { getFunc } from './dbapi';
import { DLList } from './dl_list';

const CANDY_AMOUNT = 1000;
let global_counter = 1;

export interface IfTask {
  id: number;
  running: boolean;
  finished: boolean;
  maxRetry: number;
  times: number;
  timeout: number;
  request: IfReq; // request from inquiro
  callback: (res: IFeedBack) => void;
}

export function createTask(req: IfReq, cb: (res: IFeedBack) => void): IfTask {
  if (global_counter++ > 10000000000) {
    global_counter = 1;
  }
  return {
    id: global_counter,
    running: false,
    finished: false,
    maxRetry: 1,
    times: 0,
    timeout: 3000,
    request: req,
    callback: cb
  }
}

export class WRQueue extends EventEmitter {
  // First In First Out
  private queueWrite: DLList;
  private queueRead: DLList;
  public logger: any;
  public pStatusDb: StatusDataBase;
  public pStorageDb: StorageDataBase;
  public pSynchro: Synchro;
  // private db: CUDataBase;
  // private dbOptions: IfCUDataBaseOptions;

  constructor(loggerpath: winston.LoggerInstance, statusdb: StatusDataBase, storagedb: StorageDataBase, synchro: Synchro) {
    super();
    this.queueWrite = new DLList(loggerpath);
    this.queueRead = new DLList(loggerpath);
    this.logger = loggerpath;
    this.pStatusDb = statusdb;
    this.pStorageDb = storagedb;
    this.pSynchro = synchro;

    // only one write can happen at one time
    this.on('write', (data: IfTask) => {
      this.logger.info('WRQueue receives "write" event\n');
      this.queueWrite.push(data);
      if (this.queueWrite.length() !== 1) {
        this.emit('execWrite');
      }
    });

    // I dont know about parallel read
    // Hope it will be fast
    this.on('read', (data: IfTask) => {
      this.logger.info('WRQueue receives "read" event\n');
      this.queueRead.push(data);

      if (this.queueRead.length() !== 1) {
        this.emit('execRead');
      }
    });
    // remove 
    this.on('removeRead', (task) => {
      this.logger.info('WRQueue receives removeRead event\n');
      if (this.queueRead.length() < 1) {
        this.logger.info('empty read queue\n');
        return;
      }
      // let tmp: IfTask[] = []
      // this.queueRead.forEach((task) => {
      //   if (task.finished == false) {
      //     tmp.push(task);
      //   }
      // })
      // this.queueRead = tmp;
      let item = this.queueRead.searchItem(task);
      if (item !== null) {
        this.queueRead.deleteItem(item);
      }
    });
    this.on('removeWrite', (task) => {
      this.logger.info('WRQueue receives removeWrite event\n');
      if (this.queueWrite.length() < 1) {
        this.logger.info('empty write queue\n');
        return;
      }
      // let tmp: IfTask[] = []
      // this.queueWrite.forEach((task) => {
      //   if (task.finished == false) {
      //     tmp.push(task);
      //   }
      // })
      // this.queueWrite = tmp;
      let item = this.queueWrite.searchItem(task);
      if (item !== null) {
        this.queueRead.deleteItem(item);
      }
    });

    this.on('execRead', () => {
      if (this.queueRead.length() < 1) {
        this.logger.info('empty read queue\n');
        return;
      }
      this.logger.info('execRead');
      // this.execQueueRead(this.queueRead);
      // iterate the list to execute 
      // for (let i = 0; i < this.queueRead.length; i++) {
      //   let task = this.queueRead[i]
      //   if (task.running === false) {
      //     this.execRead(task);
      //   }
      // } 
      // let item = this.queueRead.next(null);
      // while (item !== null) {
      //   let task = item.task;
      //   if (task!.running === false) {
      //     this.execRead(task!);
      //   }
      // }
      let tasks = this.queueRead.getTasks();
      tasks.forEach((task) => {
        if (task.running === false) {
          this.execRead(task);
        }
      })

    });
    this.on('execWrite', () => {
      if (this.queueWrite.length() < 1) {
        this.logger.info('empty write queue\n');
        return;
      }
      this.logger.info('execWrite');
      // this.execQueueRead(this.queueRead);
      // for (let i = 0; i < this.queueWrite.length; i++) {
      //   let task = this.queueWrite[i]
      //   if (task.running === false) {
      //     this.execWrite(task);
      //   }
      // }
      let tasks = this.queueWrite.getTasks();
      tasks.forEach((task) => {
        if (task.running === false) {
          this.execWrite(task);
        }
      })
    });
  }

  private async execRead(task: IfTask) {
    task.running = true;

    console.log('Yang-- execRead');
    console.log(task.request);
    console.log('funName:', task.request.funName);
    console.log('args:', task.request.args);

    // console.log('func:', getFunc(task.request.funName));
    let result = await getFunc(task.request.funName)(this, task.request.args);

    task.callback({ err: ErrorCode.RESULT_OK, data: result.data })
    task.finished = true;

    this.emit('removeRead', task);
    this.emit('execRead');
  }


  private async execWrite(task: IfTask) {
    task.running = true;

    let result = await getFunc(task.request.funName)(this, task.request.args);

    task.callback({ err: ErrorCode.RESULT_OK, data: result.data })
    task.finished = true;

    this.emit('removeWrite', task);
    this.emit('execWrite');
  }

}

