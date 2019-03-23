import { CUDataBase, IfCUDataBaseOptions } from './cudatabase';
import winston = require('winston');
import { ErrorCode, IFeedBack } from '../../core/error_code';

// for statu db , which store current state information
export class StatusDataBase extends CUDataBase {
  private statusTableName: string;
  private statusTableSchema: string;
  private nameCurrentHeight: string;
  private nameLoadGenesisFile: string;

  public nCurrentHeight: number; // 
  public nLoadGenesisFile: number;

  constructor(logger: winston.LoggerInstance, options: IfCUDataBaseOptions) {
    super(logger, options);
    this.statusTableName = 'statustable';
    this.statusTableSchema = '("name" TEXT NOT NULL UNIQUE ,"value" INTEGER  NOT NULL, "timestamp" INTEGER NOT NULL);';
    this.nameCurrentHeight = 'currentheight';
    this.nameLoadGenesisFile = 'loadedgenesis';
    this.nCurrentHeight = 0;
    this.nLoadGenesisFile = 0;

  }
  public getLoadGenesisFileBool(): Promise<IFeedBack> {
    return this.getSomeStatus(this.nameLoadGenesisFile, async (resolv: (a: IFeedBack) => void) => {
      this.logger.info('insert records from ', this.nameLoadGenesisFile);
      let result = await this.insertRecord(`INSERT INTO ${this.statusTableName} (name, value, timestamp) VALUES("${this.nameLoadGenesisFile}", 0, 0)`, {});
      if (result.err) {
        resolv(result);
      } else {
        resolv({ err: 0, data: { value: 0 } })
      }
    })
  }
  private setSomeStatus(name: string, value: number) {
    return this.updateRecord(`UPDATE ${this.statusTableName} SET value=${value} WHERE name="${name}";`);
  }
  private getSomeStatus(name: string, failCB: (res: () => void) => void): Promise<IFeedBack> {
    return new Promise<IFeedBack>(async (resolv) => {
      let result = await this.getRecord(`SELECT value, timestamp FROM ${this.statusTableName} WHERE name = "${name}"`);

      if (!result.err) {
        this.logger.info('-- get ', name, ' ok');
        resolv(result);
        return;
      }
      failCB(resolv);
    });
  }
  public setLoadGenesisFileBool(value: number) {
    return this.setSomeStatus(this.nameLoadGenesisFile, value);
  }
  // empty record will also return err=0
  public getCurrentHeight(): Promise<IFeedBack> {
    return new Promise<IFeedBack>(async (resolv) => {
      // read current height if fail
      let result = await this.getRecord(`SELECT value, timestamp FROM ${this.statusTableName} WHERE name = "${this.nameCurrentHeight}"`);

      if (!result.err) {
        this.logger.info('-- get height ok')
        resolv(result);
      } else {
        this.logger.info('Insert into statustable now');
        // insert default height = 0 into the table
        result = await this.insertRecord(`INSERT INTO ${this.statusTableName} (name, value, timestamp) VALUES("${this.nameCurrentHeight}", 0, 0)`, {});
        if (result.err) {
          resolv(result);
        }
        else {
          resolv({ err: 0, data: { value: 0 } })
        }
      }
    });
  }
  public setCurrentHeight(height: number) {
    return this.updateRecord(`UPDATE ${this.statusTableName} SET value=${height} WHERE name="${this.nameCurrentHeight}";`);
  }
  // test purpose
  public setAuthor(author: string) {
    return this.insertRecord(`INSERT INTO ${this.statusTableName} (name, value, timestamp) VALUES("${author}", 10, 0)`, {});
  }
  public updateAuthor(author: string, value: number) {
    return this.updateRecord(`UPDATE ${this.statusTableName} SET value=${value} WHERE name="${author}";`);
  }
  // open or create the table
  public init(): Promise<IFeedBack> {
    return new Promise<IFeedBack>(async (resolv) => {
      let result = await this.createTable(this.statusTableName, this.statusTableSchema);

      if (result.err) {
        resolv({ err: ErrorCode.RESULT_DB_TABLE_FAILED, data: result.err });
        return;
      }

      result = await this.getCurrentHeight();

      if (result.err) {
        resolv({ err: ErrorCode.RESULT_READ_RECORD_FAILED, data: result.err });
        return;
      }

      this.nCurrentHeight = result.data.value;

      result = await this.getLoadGenesisFileBool();

      this.nLoadGenesisFile = result.data.value;

      resolv({ err: 0, data: 0 })

    });

  }
}
