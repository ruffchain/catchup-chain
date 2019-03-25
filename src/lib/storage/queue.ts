import { Logger } from '../../api/logger';
import { EventEmitter } from 'events';
import { CUDataBase, IfCUDataBaseOptions } from './cudatabase';
import winston = require('winston');
import { StatusDataBase } from './statusdb';
import { StorageDataBase, HASH_TYPE, SYS_TOKEN, SYS_TOKEN_SYMBOL } from './StorageDataBase';
import { IfReq } from '../catchup/inquiro'
import { ErrorCode, IFeedBack } from '../../core/error_code';
import { isNumber } from 'util';
import { Synchro } from '../catchup/synchro';

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
  private pSynchro: Synchro;
  // private db: CUDataBase;
  // private dbOptions: IfCUDataBaseOptions;

  constructor(loggerpath: winston.LoggerInstance, statusdb: StatusDataBase, storagedb: StorageDataBase, synchro: Synchro) {
    super();
    this.queueWrite = [];
    this.queueRead = [];
    this.logger = loggerpath;
    // this.db = new CUDataBase(loggerpath, options);
    // this.dbOptions = options;
    this.pStatusDb = statusdb;
    this.pStorageDb = storagedb;
    this.pSynchro = synchro;

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
    else if (task.request.funName === 'getAccount') {
      let result = await this.taskGetAccount(task.request.args);
      if (result.err === ErrorCode.RESULT_OK) {
        arr = result.data;
      }
    }
    else if (task.request.funName === 'getAccounts') {
      let result = await this.pStorageDb.queryLatestAccountTable();
      if (result.err === ErrorCode.RESULT_OK) {
        arr = result.data;
      }
    }
    else if (task.request.funName === 'getToken') {
      let result = await this.taskGetToken(task.request.args);
      if (result.err === ErrorCode.RESULT_OK) {
        arr = result.data;
      }
    }
    else if (task.request.funName === 'getTokensByAddress') {
      let result = await this.pStorageDb.queryAccountTableByAddress(task.request.args);
      if (result.err === ErrorCode.RESULT_OK) {
        // for (let i = 0; i < result.data.length; i++) {
        //   if (result.data[i].token === "s") {
        //     result.data[i].token = SYS_TOKEN_SYMBOL;
        //   }
        // }
        arr = result.data;
      }
    }
    else if (task.request.funName === 'getLatestTxs' || task.request.funName === 'getTxsByAddress') {
      let result: any;
      if (!task.request.args) {
        result = await this.pStorageDb.queryLatestTxTable();
      } else {
        try {
          let argsObj = JSON.parse(JSON.stringify(task.request.args));
          result = await this.pStorageDb.queryTxTableByPage(
            (argsObj.page > 0) ? (argsObj.page - 1) : 0, argsObj.pageSize);
        } catch (e) {
          this.logger.error('Wrong getLatestTxs ARGS');
        }
      }

      if (result.err === ErrorCode.RESULT_OK) {
        try {
          console.log('received result.data')
          console.log(result.data);
          for (let i = 0; i < result.data.length; i++) {
            result.data[i].content = JSON.parse(result.data[i].content);
          }
          arr = result.data;
        } catch (e) {
          this.logger.info('Wrong getLatestTxs result parsing')
        }
      }
    }
    else if (task.request.funName === 'getTxs') {
      let result: any;
      if (!task.request.args) {
        result = await this.pStorageDb.queryLatestTxTable();
        if (result.err === ErrorCode.RESULT_OK) {
          arr = result.data;
        }
      } else {
        try {
          let argsObj = JSON.parse(JSON.stringify(task.request.args));
          result = await this.pStorageDb.queryTxTableByPage(
            (argsObj.page > 0) ? (argsObj.page - 1) : 0, argsObj.pageSize);

          if (result.err === ErrorCode.RESULT_OK) {
            arr = result.data;
          }
        } catch (e) {
          this.logger.error('Wrong getTxs ARGS');
        }
      }
    }
    else if (task.request.funName === 'getTxsByBlock') {
      let result = await this.pStorageDb.queryTxTableByBlock(task.request.args);
      if (result.err === ErrorCode.RESULT_OK) {
        // console.log(result.data)
        try {
          for (let i = 0; i < result.data.length; i++) {
            result.data[i].content = JSON.parse(result.data[i].content);
          }
          arr = result.data;
        } catch (e) {
          this.logger.info('Wrong getTxsBlock result parsing')
        }
      }
    }
    else if (task.request.funName === 'getTx') {
      let result = await this.pStorageDb.queryTxTable(task.request.args);
      if (result.err === ErrorCode.RESULT_OK) {
        try {
          result.data.content = JSON.parse(result.data.content.toString())
          arr = result.data;
        } catch (e) {
          this.logger.info('Wrong getTx result parsing')
        }
      }
    }
    else if (task.request.funName === 'getBlocks') {
      let result = await this.pStorageDb.queryLatestBlockTable();
      if (result.err === ErrorCode.RESULT_OK) {
        arr = result.data;
      }
    }
    else if (task.request.funName === 'getLatestBlocks') {
      let result: any;
      if (!task.request.args) {
        result = await this.pStorageDb.queryLatestBlockTable();
        if (result.err === ErrorCode.RESULT_OK) {
          arr = result.data;
        }
      } else {
        try {
          let argsObj = JSON.parse(JSON.stringify(task.request.args));
          result = await this.pStorageDb.queryBlockTableByPage(
            (argsObj.page > 0) ? (argsObj.page - 1) : 0, argsObj.pageSize);

          if (result.err === ErrorCode.RESULT_OK) {
            arr = result.data;
          }
        } catch (e) {
          this.logger.error('Wrong getLatestBlocks ARGS');
        }
      }
    }
    else if (task.request.funName === 'getChainOverview') {
      let result = await this.taskGetChainOverview();
      if (result.err === ErrorCode.RESULT_OK) {
        arr = result.data;
      }
    }
    else if (task.request.funName === 'getLatestTxCount') {
      let result = await this.taskGetLatestTxCount(task.request.args);
      if (result.err === ErrorCode.RESULT_OK) {
        arr = result.data;
      }
    }
    else {
      // arr.push({ error: 'unknown name' })
      this.logger.error('unknown name method:', task.request.funName);
    }

    task.callback({ err: ErrorCode.RESULT_OK, data: arr })
    que.shift();
    this.emit('execRead');
    return;
  }
  // commands
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
  // get account all balances
  private async taskGetAccount(address: string) {
    return new Promise<IFeedBack>(async (resolv) => {
      // check account table, 
      let result = await this.pStorageDb.queryAllAccountTableByAddress(address);
      resolv(result);
    });
  }

  private async taskGetToken(token: string) {
    return new Promise<IFeedBack>(async (resolv) => {
      // check account table, 
      let result = await this.pStorageDb.queryTokenTable(token);
      resolv(result);
    });
  }
  // getLatestTxCount
  private async taskGetLatestTxCount(args: any) {
    return new Promise<IFeedBack>(async (resolv) => {
      let obj: any;
      try {
        obj = JSON.parse(JSON.stringify(args));
        let nFrom = new Date(obj.from).getTime();
        let nTo = new Date(obj.to).getTime();

        let nTxCount = 0;

        let result2 = await this.pStorageDb.queryTxTableByDatetime(nFrom, nTo);
        if (!result2.err) {
          try {
            nTxCount = parseInt(result2.data.count)

            resolv({
              err: ErrorCode.RESULT_OK,
              data: {
                txCount: nTxCount
              }
            });
            return;
          } catch (e) {
            this.logger.error('taskGetLatestTxCount get tx count JSON parse fail');
          }
        }
      } catch (e) {
        this.logger.error('taskGetLatestTxCount input JSON parse fail');
      }
      resolv({ err: ErrorCode.RESULT_SYNC_PARSE_JSON_QUERY_FAILED, data: [] })

    });
  }
  private async taskGetChainOverview() {
    return new Promise<IFeedBack>(async (resolv) => {

      let nLib = 0;

      // get latestblock
      let result = await this.pSynchro.getLIBNumber();
      if (result.ret === 200) {
        nLib = parseInt(result.resp!);
      }

      let nLatest = 0;
      // get lib number
      result = await this.pSynchro.getLastestBlock();
      if (result.ret === 200) {
        try {
          let obj = JSON.parse(result.resp!);
          nLatest = obj.block.number;
        }
        catch (e) {
          this.logger.error('taskgetchainoverview get latest block JSON parse fail');
        }
      }

      let nTxCount = 0;
      // get tx count
      let result2 = await this.pStorageDb.queryTxTableCount();
      if (!result2.err) {
        try {
          nTxCount = parseInt(result2.data.count)
        } catch (e) {
          this.logger.error('taskgetchainoverview get tx count JSON parse fail');
        }
      }
      resolv({
        err: ErrorCode.RESULT_OK, data: {
          blockHeight: nLatest,
          irreversibleBlockHeight: nLib,
          txCount: nTxCount
        }
      });
    });
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
