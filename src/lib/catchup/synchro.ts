import { Logger } from '../../api/logger';
import winston = require('winston');
import { RPCClient } from '../../client/client/rfc_client';
import { IfSysinfo, IfContext, DelayPromise } from '../../api/common'
import { getLastIrreversibleBlockNumber } from '../../api/getLIBNumber'
import { getBlock } from '../../api/getblock'
import { getReceipt } from '../../api/getreceipt';
import { StatusDataBase } from '../storage/statusdb';
import { StorageDataBase, HASH_TYPE } from '../storage/StorageDataBase';
import { ErrorCode, IFeedBack } from '../../core';
/**
 * This is a client , always syncing with the Chain
 */

interface IfSynchroOptions {
  ip: string;
  port: number;
}

export class Synchro {
  public logger: winston.LoggerInstance;

  private ip: string;
  private port: number;
  private ctx: IfContext;
  private pStatusDb: StatusDataBase;
  private pStorageDb: StorageDataBase;
  private nCurrentLIBHeight: number;

  constructor(options: IfSynchroOptions, logger: winston.LoggerInstance, statusdb: StatusDataBase, storagedb: StorageDataBase) {
    this.ip = options.ip;
    this.port = options.port;
    this.logger = logger;

    let SYSINFO: IfSysinfo = {
      secret: '',
      host: this.ip,
      port: this.port,
      address: '',
      verbose: false
    }

    this.ctx = {
      client: new RPCClient(
        this.ip,
        this.port,
        SYSINFO
      ),
      sysinfo: SYSINFO
    }
    this.pStatusDb = statusdb;
    this.pStorageDb = storagedb;
    this.nCurrentLIBHeight = 0;
  }

  public async start() {
    this.logger.info('Synchro client started ...\n');


    this.loopTask();
  }

  private async loopTask() {
    // get LIBNumber
    this.logger.info('loopTask()\n');
    let result = await this.getLIBNumber()
    if (result.ret == 200) {
      this.nCurrentLIBHeight = parseInt(result.resp!);
    }

    // get currentHeight
    let nCurrentHeight = this.pStatusDb.nCurrentHeight;

    this.logger.info('currentHeight:', nCurrentHeight, ' currentLIB:', this.nCurrentLIBHeight);

    if (nCurrentHeight < this.nCurrentLIBHeight) {
      let result2 = await this.updateBlockRange(nCurrentHeight, this.nCurrentLIBHeight);
      this.logger.info(JSON.stringify(result2));
    } else {
      this.logger.info('height equal \n');
    }
    // delay 10s
    this.logger.info('Delay 10 seconds\n');
    await DelayPromise(10);
    this.loopTask();
  }
  private updateBlockRange(nStart: number, nStop: number): Promise<IFeedBack> {
    return new Promise<IFeedBack>(async (resolv) => {
      for (let i = nStart; i <= nStop; i++) {
        let result = await this.updateBlock(i);
        if (result.err) {
          resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_FAILED, data: i });
          return;
        } else {
          // update statusDB current Height
          let feedback = await this.pStatusDb.setCurrentHeight(i);
          if (feedback.err) {
            resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_RANGE_SAVE_FAILED, data: i });
            return;
          }
          this.pStatusDb.nCurrentHeight = i;
        }
      }
      resolv({ err: ErrorCode.RESULT_OK, data: null });
    });
  }
  // get block
  private async updateBlock(nBlock: number): Promise<IFeedBack> {
    return new Promise<IFeedBack>(async (resolv) => {
      this.logger.info('Get block ' + nBlock + '\n')
      let result = await this.getBlock(nBlock);
      if (result.ret === 200) {
        this.logger.info(result.resp + '\n');
        // save resp to hashtable
        let obj: any;
        try {
          obj = JSON.parse(result.resp + '');
        } catch (e) {
          this.logger.error('updateBlock json parse faile')
          resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_FAILED, data: null })
          return;
        }

        console.log(obj);

        let hash = obj.block.hash;
        let timestamp = obj.block.timestamp;
        let address = obj.block.creator;
        let txno = obj.transactions.length;

        this.logger.info('save block hash to hash table')
        let feedback = await this.pStorageDb.saveToHashTable(hash, HASH_TYPE.BLOCK);

        if (feedback.err) {
          resolv({ err: feedback.err, data: null });
          return;
        }

        if (txno > 0) {
          this.logger.info('save tx hash to hash table')
          feedback = await this.pStorageDb.saveTxToHashTable(obj.transactions);
          if (feedback.err) {
            resolv({ err: feedback.err, data: null });
            return;
          }
        }

        resolv({ err: ErrorCode.RESULT_OK, data: null })

      } else {
        this.logger.info('wrong return value')
        this.logger.info(result.ret + '\n');
        resolv({ err: ErrorCode.RESULT_SYNC_BLOCK_FAILED, data: null })
      }
    });
  }
  private async updateTx() {

  }
  public async getLastestBlock() {
    let result = await getBlock(this.ctx, ['latest', 'true']);
    this.logger.info(result.resp!);
  }
  public async getBlock(num: number) {
    let result = await getBlock(this.ctx, [num + '', 'true']);
    this.logger.info(result.resp!);
    return result;
  }
  public async getLIBNumber() {
    let result = await getLastIrreversibleBlockNumber(this.ctx, []);
    this.logger.info(JSON.stringify(result));
    this.logger.info('LIBNumber', result.resp!);
    return result;
  }
  public async getReceipt(strHash: string) {
    let result = await getReceipt(this.ctx, [strHash]);
    this.logger.info(result.resp!);
  }
}
